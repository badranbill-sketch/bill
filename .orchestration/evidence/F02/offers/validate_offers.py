#!/usr/bin/env python3
"""F02 offers lane validation.

1. Meta-validates the three schemas (draft 2020-12), checks $schema/$id and closed shapes.
2. Valid examples must pass the schema and the harness rules.
3. Invalid examples must fail, and fail for the rule named in their .why.txt
   (expect_keyword at expect_path, searched through nested anyOf/oneOf contexts;
   'harness:<ID>' rules are checked by the harness below, and those examples must be
   schema-valid so that only the harness rule catches them).
4. Validates .orchestration/handoffs/F00.json against worker-handoff 1.0 and reports every
   mismatch (informational; F00.json is not edited).
5. Cross-checks names against the repository (route keys in lib/routes.ts on main and codex,
   bookings.offer_id values in operational-data-model.md, event-envelope resource-code
   compatibility of asset IDs).

Exit code 0 only when every check in 1-3 and 5 behaves as expected.
"""
from __future__ import annotations

import hashlib
import json
import pathlib
import re
import subprocess
import sys
from collections import Counter
from datetime import datetime, timezone
from importlib.metadata import version

from jsonschema import Draft202012Validator

ROOT = pathlib.Path(__file__).resolve().parents[4]
ORCH = ROOT / ".orchestration"
C = ORCH / "contracts"
EX = C / "examples"

CONTRACTS = {
    "offer-matrix": ("offer-matrix.json", "https://bill.contracts.local/offer-matrix/1.0"),
    "asset-manifest": ("asset-manifest.schema.json", "https://bill.contracts.local/asset-manifest/1.0"),
    "worker-handoff": ("worker-handoff.schema.json", "https://bill.contracts.local/worker-handoff/1.0"),
}

failures: list[str] = []
counts = Counter()


def ok(msg):
    counts["pass"] += 1
    print(f"PASS  {msg}")


def bad(msg):
    counts["fail"] += 1
    failures.append(msg)
    print(f"FAIL  {msg}")


def ptr(path) -> str:
    return "".join("/" + str(p) for p in path)


def all_errors(validator, instance):
    """Every error, including nested anyOf/oneOf context errors, as (keyword, pointer, message)."""
    out = []

    def walk(err):
        out.append((err.validator, ptr(err.absolute_path), err.message))
        for sub in err.context or []:
            walk(sub)

    for e in validator.iter_errors(instance):
        walk(e)
    return out


def top_errors(validator, instance):
    return sorted(validator.iter_errors(instance), key=lambda e: (ptr(e.absolute_path), e.validator))


# ----------------------------------------------------------------------------
# Harness rules (checks JSON Schema cannot express; runtime owners named in the .md files)
# ----------------------------------------------------------------------------
def harness_offer_matrix(doc):
    """OM-REF-1, OM-REF-2, OM-HARN-2, OM-HARN-3. Returns list of (rule, pointer)."""
    found = []
    records = {r["record_id"]: r for r in doc.get("gate_records", [])}
    ids = [r["record_id"] for r in doc.get("gate_records", [])]
    for rid, n in Counter(ids).items():
        if n > 1:
            found.append(("OM-HARN-3", "/gate_records"))

    def walk(node, path):
        if isinstance(node, dict):
            for k, v in node.items():
                if k in ("approvals",) and isinstance(v, list):
                    for i, a in enumerate(v):
                        if isinstance(a, dict) and "record_id" in a:
                            p = f"{path}/{k}/{i}/record_id"
                            rec = records.get(a["record_id"])
                            if rec is None:
                                found.append(("OM-REF-1", p))
                            elif rec["gate"] != a.get("gate"):
                                found.append(("OM-REF-2", p))
                walk(v, f"{path}/{k}")
        elif isinstance(node, list):
            for i, v in enumerate(node):
                walk(v, f"{path}/{i}")

    walk(doc.get("offers", {}), "/offers")
    for key in ("approved_editions",):
        eds = doc.get("offers", {}).get("guide-pdf", {}).get(key, [])
        if len({e["locale"] for e in eds}) != len(eds):
            found.append(("OM-HARN-2", f"/offers/guide-pdf/{key}"))
    eds = doc.get("offers", {}).get("book-bundle", {}).get("approved_print_editions", [])
    if len({e["locale"] for e in eds}) != len(eds):
        found.append(("OM-HARN-2", "/offers/book-bundle/approved_print_editions"))
    return found


def harness_asset_manifest(doc):
    """AM-HARN-1 (published hash = review hash), AM-HARN-2 (unique key),
    AM-HARN-3 (captions_only has a language_recorded sibling in the source locale)."""
    found = []
    seen = {}
    assets = doc.get("assets", [])
    for i, a in enumerate(assets):
        key = (a.get("asset_id"), a.get("locale"), a.get("version"))
        if key in seen:
            found.append(("AM-HARN-2", f"/assets/{i}"))
        seen[key] = i
        if a.get("status") == "published":
            rh = (a.get("review_hash") or {}).get("sha256")
            if a.get("published_content_sha256") != rh:
                found.append(("AM-HARN-1", f"/assets/{i}/published_content_sha256"))
        if a.get("language_availability") == "captions_only":
            src = a.get("captions_source_locale")
            if not any(b.get("asset_id") == a.get("asset_id") and b.get("locale") == src
                       and b.get("language_availability") == "language_recorded" for b in assets):
                found.append(("AM-HARN-3", f"/assets/{i}/captions_source_locale"))
    return found


def harness_worker_handoff(doc):
    return []


HARNESS = {"offer-matrix": harness_offer_matrix, "asset-manifest": harness_asset_manifest,
           "worker-handoff": harness_worker_handoff}


def parse_why(path: pathlib.Path):
    fields = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            fields[k.strip()] = v.strip()
    return fields


def closed_shape_audit(schema, where="#"):
    """List object schemas that declare properties but are not closed."""
    open_ = []
    if isinstance(schema, dict):
        if "properties" in schema and schema.get("type") == "object" and schema.get("additionalProperties") is not False:
            open_.append(where)
        for k, v in schema.items():
            if k in ("then", "else", "if", "not", "contains"):
                continue  # constraint fragments, not shapes
            if k == "properties" and isinstance(v, dict):
                for pk, pv in v.items():
                    open_ += closed_shape_audit(pv, f"{where}/properties/{pk}")
            elif isinstance(v, dict):
                open_ += closed_shape_audit(v, f"{where}/{k}")
            elif isinstance(v, list):
                for i, item in enumerate(v):
                    open_ += closed_shape_audit(item, f"{where}/{k}/{i}")
    return open_


def git_show(ref_path: str) -> str:
    return subprocess.run(["git", "-C", str(ROOT), "show", ref_path], check=True,
                          capture_output=True, text=True).stdout


def main():
    head = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    branch = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "--abbrev-ref", "HEAD"], capture_output=True, text=True).stdout.strip()
    print("# F02 offers lane validation")
    print("utc_now:", datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    print("python:", sys.version.split()[0], " jsonschema:", version("jsonschema"))
    print("repo:", ROOT, " branch:", branch, " HEAD:", head)
    print("contract files (sha256):")
    for name, (fname, _) in CONTRACTS.items():
        print("  " + hashlib.sha256((C / fname).read_bytes()).hexdigest() + "  " + fname)
    for md in ("offer-matrix.md", "routes.md", "approval-scopes.md", "asset-manifest.md"):
        p = C / md
        print("  " + (hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else "(missing)") + "  " + md)

    schemas = {}
    print("\n## 1. Schema meta-validation")
    for name, (fname, sid) in CONTRACTS.items():
        s = json.loads((C / fname).read_text(encoding="utf-8"))
        schemas[name] = s
        try:
            Draft202012Validator.check_schema(s)
            ok(f"{name} is a valid draft 2020-12 schema")
        except Exception as e:  # noqa: BLE001
            bad(f"{name} meta-validation: {e}")
        (ok if s.get("$schema") == "https://json-schema.org/draft/2020-12/schema" else bad)(f"{name} declares $schema draft 2020-12")
        (ok if s.get("$id") == sid else bad)(f"{name} $id = {sid}")
        (ok if s.get("additionalProperties") is False else bad)(f"{name} root is closed (additionalProperties false)")
        open_shapes = closed_shape_audit(s)
        (ok if not open_shapes else bad)(f"{name} closed-shape audit: {len(open_shapes)} open object schemas {open_shapes[:5]}")

    validators = {n: Draft202012Validator(s) for n, s in schemas.items()}

    print("\n## 2. Valid examples (must pass schema and harness)")
    for name in CONTRACTS:
        files = sorted((EX / "valid" / name).glob("*.json"))
        if not files:
            bad(f"{name}: no valid examples")
        for f in files:
            doc = json.loads(f.read_text(encoding="utf-8"))
            errs = top_errors(validators[name], doc)
            h = HARNESS[name](doc)
            if not errs and not h:
                ok(f"valid/{name}/{f.name}")
            else:
                bad(f"valid/{name}/{f.name}: {len(errs)} schema errors, harness {h}; first: "
                    + (f"{errs[0].validator} at {ptr(errs[0].absolute_path)}: {errs[0].message[:160]}" if errs else ""))

    print("\n## 3. Invalid examples (must fail for the stated rule)")
    rules_seen = Counter()
    for name in CONTRACTS:
        files = sorted((EX / "invalid" / name).glob("*.json"))
        if not files:
            bad(f"{name}: no invalid examples")
        for f in files:
            why = f.with_suffix(".why.txt")
            if not why.exists():
                bad(f"invalid/{name}/{f.name}: missing .why.txt")
                continue
            w = parse_why(why)
            rule, kw, path = w.get("rule"), w.get("expect_keyword"), w.get("expect_path", "")
            rules_seen[rule] += 1
            doc = json.loads(f.read_text(encoding="utf-8"))
            errs = all_errors(validators[name], doc)
            if kw.startswith("harness:"):
                hid = kw.split(":", 1)[1]
                h = HARNESS[name](doc)
                if errs:
                    bad(f"invalid/{name}/{f.name} [{rule}]: expected schema-valid (harness-only) but got {len(errs)} schema errors: {errs[0]}")
                elif (hid, path) in h:
                    ok(f"invalid/{name}/{f.name} [{rule}] rejected by harness {hid} at {path}")
                else:
                    bad(f"invalid/{name}/{f.name} [{rule}]: harness did not report {hid} at {path}; got {h}")
                continue
            if not errs:
                bad(f"invalid/{name}/{f.name} [{rule}]: unexpectedly VALID")
                continue
            hit = [e for e in errs if e[0] == kw and e[1] == path]
            if hit:
                n_top = sum(1 for _ in validators[name].iter_errors(doc))
                ok(f"invalid/{name}/{f.name} [{rule}] fails: {kw} at {path or '(root)'} "
                   f"({n_top} top-level error(s)); message: {hit[0][2][:140]}")
            else:
                bad(f"invalid/{name}/{f.name} [{rule}]: fails, but not with {kw} at {path}; errors: "
                    + "; ".join(f"{k}@{p}" for k, p, _ in errs[:8]))
    dup = [r for r, n in rules_seen.items() if n > 1]
    print(f"rules covered: {len(rules_seen)} distinct rule IDs; duplicated IDs: {dup or 'none'}")

    print("\n## 4. .orchestration/handoffs/F00.json against worker-handoff 1.0 (informational; file not edited)")
    f00p = ORCH / "handoffs" / "F00.json"
    f00 = json.loads(f00p.read_text(encoding="utf-8"))
    print("F00.json sha256:", hashlib.sha256(f00p.read_bytes()).hexdigest())
    errs = top_errors(validators["worker-handoff"], f00)
    print(f"result: {'CONFORMS' if not errs else 'DOES NOT CONFORM'} ({len(errs)} top-level errors)")
    grouped = Counter()
    for e in errs:
        p = ptr(e.absolute_path)
        gp = re.sub(r"/\d+", "/*", p)
        grouped[(gp, e.validator)] += 1
        inst = json.dumps(e.instance, ensure_ascii=False)
        print(f"  MISMATCH {e.validator} at {p}: value {inst[:150]}")
    print("  summary by field:")
    for (gp, kw), n in sorted(grouped.items()):
        print(f"    {n} x {kw} at {gp}")

    print("\n## 5. Cross-checks against the repository and sibling contracts")
    key_re = re.compile(r"^\s+([a-zA-Z]+): \{ fr: \"([^\"]*)\", en: \"([^\"]*)\" \},?$", re.M)
    route_sets = {}
    for ref in ("origin/main", "origin/codex/desktop-iphone-unified", "origin/claude/bill-centered-homepage"):
        src = git_show(f"{ref}:lib/routes.ts")
        route_sets[ref] = {m.group(1): (m.group(2), m.group(3)) for m in key_re.finditer(src)}
        print(f"  {ref}:lib/routes.ts keys = {list(route_sets[ref])}")
    ex = ["home", "retirement", "investments", "about", "resources", "meeting", "fees", "privacy", "legal"]
    (ok if list(route_sets["origin/main"]) == ex else bad)("existing route keys in contracts = keys on origin/main")
    (ok if route_sets["origin/main"] == route_sets["origin/codex/desktop-iphone-unified"] else bad)(
        "lib/routes.ts identical key/slug map on main and codex")
    extra = set(route_sets["origin/claude/bill-centered-homepage"]) - set(route_sets["origin/main"])
    (ok if extra == {"ask"} else bad)(f"homepage branch adds only {sorted(extra)}")
    am_keys = schemas["asset-manifest"]["$defs"]["entry"]["properties"]["intended_route_key"]["enum"]
    proposed = [k for k in am_keys if k is not None and k not in ex and k != "ask"]
    existing_slugs = {lang: {v[i] for ref in route_sets for v in route_sets[ref].values()} for i, lang in enumerate(("fr", "en"))}
    proposed_slugs = {  # must match routes.md table
        "workshop": ("atelier-retraite", "retirement-workshop"),
        "crossroads": ("carrefour-retraite", "retirement-crossroads"),
        "crossroadsConfirmed": ("carrefour-retraite/inscription-confirmee", "retirement-crossroads/registered"),
        "crossroadsJoin": ("carrefour-retraite/rejoindre", "retirement-crossroads/join"),
        "crossroadsReplay": ("carrefour-retraite/rediffusion", "retirement-crossroads/replay"),
        "book": ("livre-imprime", "printed-book"),
        "bookOrderStatus": ("livre-imprime/commande", "printed-book/order"),
        "bookConsultation": ("livre-imprime/consultation", "printed-book/consultation"),
        "emailPreferences": ("preferences-courriel", "email-preferences"),
        "unsubscribe": ("desabonnement", "unsubscribe"),
    }
    (ok if sorted(proposed) == sorted(proposed_slugs) else bad)(
        f"asset-manifest proposed route keys match the routes.md proposal ({len(proposed)})")
    routes_md = (C / "routes.md").read_text(encoding="utf-8")
    md_rows = {m.group(1): (m.group(2), m.group(3)) for m in re.finditer(
        r"^\| [^|]+ \| `(\w+)` \| `([^`]+)` \| `([^`]+)` \| proposed", routes_md, re.M)}
    (ok if md_rows == proposed_slugs else bad)(
        f"routes.md §3.1 proposed rows (key, FR slug, EN slug) = checked slug table ({len(md_rows)} rows)")
    slug_re = re.compile(r"^[a-z0-9-]+(?:/[a-z0-9-]+)*$")
    for i, lang in enumerate(("fr", "en")):
        resources_prefix = route_sets["origin/main"]["resources"][i] + "/"
        mine = [v[i] for v in proposed_slugs.values()]
        collide = [s for s in mine if s in existing_slugs[lang]]
        shadow = [s for s in mine if s.startswith(resources_prefix) or s.split("/")[0] in ("revision", "api", "assets", "_next")]
        malformed = [s for s in mine if not slug_re.match(s)]
        dupe = [s for s, n in Counter(mine).items() if n > 1]
        (ok if not (collide or shadow or malformed or dupe) else bad)(
            f"{lang} proposed slugs: no collision with existing slugs on main/codex/homepage, no article/revision/api shadowing, ASCII, unique "
            f"(collide={collide}, shadow={shadow}, malformed={malformed}, dupe={dupe})")
    odm = (C / "operational-data-model.md").read_text(encoding="utf-8")
    offer_ids_odm = set(re.findall(r"'(intro-15|book-consultation-30)'", odm))
    om_types = set(schemas["offer-matrix"]["properties"]["meeting_types"]["properties"])
    (ok if offer_ids_odm == om_types else bad)(
        f"offer-matrix meeting_types {sorted(om_types)} = bookings.offer_id values in operational-data-model.md {sorted(offer_ids_odm)}")
    env = json.loads((C / "event-envelope.schema.json").read_text(encoding="utf-8"))
    content_re = re.compile(env["$defs"]["resource_content_version"]["pattern"])
    samples = {"capsule": "capsule.s01", "companion": "companion.s01", "clip": "clip.w00", "case": "case.c01",
               "ink": "ink.a01", "template": "template.e01", "ad": "ad.ad01", "article": "article.sample-key",
               "page": "page.sample-key", "guide": "guide.sample-key", "book": "book.sample-key",
               "event": "event.sample-key", "copy": "copy.sample-key"}
    covered = [k for k, v in samples.items() if content_re.search(v + ".v1")]
    not_covered = [k for k in samples if k not in covered]
    am_re = re.compile(schemas["asset-manifest"]["$defs"]["entry"]["properties"]["asset_id"]["pattern"])
    (ok if all(am_re.search(v) for v in samples.values()) else bad)("asset-manifest accepts one sample ID of every kind")
    print(f"  INFO event-envelope resource_content_version accepts kinds {covered}; "
          f"not yet: {not_covered} (cross-lane reconciliation item for A0, not a failure of this lane)")

    print(f"\n## Summary\npass: {counts['pass']}  fail: {counts['fail']}")
    if failures:
        print("failures:")
        for f in failures:
            print("  - " + f)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
