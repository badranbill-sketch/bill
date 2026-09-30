#!/usr/bin/env python3
"""F02 contract set 1.0: the single validation harness (A0 delegate, F02 integrator).

What it checks (read-only; it writes nothing and uses no network):
  S1  the README index: version line, one row per contract, every file under contracts/ indexed,
      sha256 of every contract file (the values the F02 handoff binds to)
  S2  the seven JSON Schemas and the two registry schemas: draft 2020-12, $id .../1.0, closed shapes, and
      ECMA-262 pattern semantics (A6D2-04): every schema pattern is translated before use, see ecma_translate
  S3  every example: valid examples pass schema + harness; invalid examples fail for the exact
      reason in their .why.txt (the three lane dialects are normalised, see README XL-07)
  S4  the two registries (email-eligibility, data-flow-register) against their registry schemas
  S5  every workshop fixture: input valid (schema + XF-04..XF-06, re-implemented here), output shape
      of workshop-math.md s12, index consistency, clip precedence and media states re-derived here
  S6  the cross-contract invariants CX-01..CX-31 listed in README.md (CX-28 is checked in S1, CX-29 in S7b)
  S7  the open cross-lane items listed in README.md s5.1: each must still reproduce exactly as
      described (KNOWN); if one no longer reproduces the run fails until README is updated.
      The items resolved by the lanes' repair attempt 2 (README s5.2) are checked the other way:
      each must stay resolved (PASS), and a regression fails the run.
  S8  negative controls NC-1..NC-14: injected defects must be caught by the checks above (non-vacuity)
  S9  handoffs/*.json against worker-handoff 1.0

Usage (from anywhere; paths are resolved from this file):
  VENV=/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/venv-f02
  "$VENV/bin/python" .orchestration/contracts/validate.py
  "$VENV/bin/python" .orchestration/contracts/validate.py --contracts-dir <mutated copy>   # negative control
  "$VENV/bin/python" .orchestration/contracts/validate.py --handoff .orchestration/handoffs/F02.json
Dependencies: Python >= 3.10 standard library and jsonschema (Draft202012Validator).
Exit status: 0 = every result as expected; 1 = at least one unexpected result; 2 = setup error.
"""
from __future__ import annotations

import argparse
import copy
import datetime as dt
import hashlib
import json
import re
import subprocess
import sys
from collections import Counter, OrderedDict
from pathlib import Path

try:
    from importlib.metadata import version as pkg_version

    from jsonschema import Draft202012Validator
    from jsonschema import ValidationError as JsValidationError
    from jsonschema import validators as js_validators
except ImportError as exc:  # pragma: no cover
    print(f"setup error: jsonschema is required ({exc}). See README.md 'How to run validate.py'.")
    sys.exit(2)


# ----------------------------------------------------------------------------------------------
# ECMA-262 pattern semantics (A6D2-04). JSON Schema patterns are ECMA-262 regular expressions, but jsonschema
# runs them with Python `re`, where `$` also matches before a final "\n", `.` also matches "\r", U+2028 and
# U+2029, and `\s` uses Python's whitespace set. Every schema pattern is translated before use, so the harness
# accepts exactly what an ECMA-262 validator (Ajv, zod) accepts for the constructs the contracts use.
# ----------------------------------------------------------------------------------------------
_ECMA_WS = r"\t\n\x0b\x0c\r \xa0  -     　﻿"
_ECMA_DOT = r"[^\n\r  ]"
_ECMA_SAFE_ESCAPES = set(".-/\\^$|?*+()[]{}ntrfv")


def ecma_translate(pattern: str) -> str:
    """Translate an ECMA-262 pattern (no flags) into a Python pattern with the same meaning.
    `$` becomes `\\Z` (end of input only); `.` excludes the four ECMA line terminators; `\\s` and `\\S` use the
    ECMA whitespace set. Any other backslash class (`\\d`, `\\w`, `\\b`, `\\p`, ...) and ECMA named groups are
    refused with ValueError, so a construct this translator does not know cannot silently change meaning."""
    out, i, in_cls = [], 0, False
    if "(?<" in pattern.replace("(?<=", "").replace("(?<!", ""):
        raise ValueError("ECMA named group (?<name>...) is not supported")
    while i < len(pattern):
        c = pattern[i]
        if c == "\\":
            nxt = pattern[i + 1:i + 2]
            if nxt == "s":
                out.append(_ECMA_WS if in_cls else "[" + _ECMA_WS + "]")
            elif nxt == "S":
                if in_cls:
                    raise ValueError("\\S inside a character class is not supported")
                out.append("[^" + _ECMA_WS + "]")
            elif nxt and nxt in _ECMA_SAFE_ESCAPES:
                out.append(c + nxt)
            else:
                raise ValueError(f"unsupported escape \\{nxt} in {pattern!r}")
            i += 2
            continue
        if in_cls:
            if c == "]":
                in_cls = False
            out.append(c)
        elif c == "[":
            in_cls = True
            out.append(c)
            if pattern[i + 1:i + 2] == "^":
                out.append("^")
                i += 1
        elif c == "$":
            out.append(r"\Z")
        elif c == ".":
            out.append(_ECMA_DOT)
        else:
            out.append(c)
        i += 1
    return "".join(out)


_ECMA_CACHE: dict = {}


def ecma_re(pattern: str) -> "re.Pattern":
    rx = _ECMA_CACHE.get(pattern)
    if rx is None:
        rx = _ECMA_CACHE[pattern] = re.compile(ecma_translate(pattern))
    return rx


def _kw_pattern_ecma(validator, patrn, instance, schema):
    # same message as jsonschema's own `pattern` keyword, so .why.txt expectations are unchanged
    if validator.is_type(instance, "string") and not ecma_re(patrn).search(instance):
        yield JsValidationError(f"{instance!r} does not match {patrn!r}")


EcmaValidator = js_validators.extend(Draft202012Validator, {"pattern": _kw_pattern_ecma})

SET_VERSION = "1.0"
FROZEN_ON = "2026-09-30"
DRAFT = "https://json-schema.org/draft/2020-12/schema"
ID_BASE = "https://bill.contracts.local/"
HUMAN_ROLES = {"arnaud", "bill", "firm_reviewer", "privacy_owner", "account_owner"}
AGENT_ROLES = {"A0", "A1", "A2", "A3", "A4", "A5", "A6", "operator"}
GATES = ["G0", "G1", "G2", "G3", "G4", "G5", "G6"]
TEMPLATES = ["e%02d" % i for i in range(1, 17)]
OFFERS = ["guide-pdf", "intro-15", "book-bundle", "continued-work"]
MEETING_TYPES = {"intro-15": ("intro-15", 15), "book-consultation-30": ("book-bundle", 30)}
EXISTING_ROUTE_KEYS = ["home", "retirement", "investments", "about", "resources", "meeting", "fees", "privacy", "legal"]
CONSENT_TYPES = {"marketing.opted_in", "marketing.withdrawn", "workshop.completed"}
CONSENT_PURPOSES = {"nurture", "workshop-followup"}
CLIP_BRANCH = ["W06", "W07", "W08", "W09", "W10"]
CROCKFORD = "[0-9a-hjkmnp-tv-z]"
RESERVED_EMAIL_DOMAINS = ("example.com", "example.org", "example.net", "example.invalid")
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")

SCHEMAS = OrderedDict([
    ("event-envelope", "event-envelope.schema.json"),
    ("delivery-job", "delivery-job.schema.json"),
    ("feature-flags", "feature-flags.json"),
    ("offer-matrix", "offer-matrix.json"),
    ("asset-manifest", "asset-manifest.schema.json"),
    ("worker-handoff", "worker-handoff.schema.json"),
    ("workshop-inputs", "workshop-inputs.schema.json"),
])
REGISTRIES = OrderedDict([("email-eligibility", "email-eligibility.json"), ("data-flow-register", "data-flow-register.json")])
LANE_LOGS = [".orchestration/evidence/F02/data/validation.log", ".orchestration/evidence/F02/math/validation.log",
             ".orchestration/evidence/F02/offers/validation.log"]
WHY_KEYS = {"rule", "layer", "breaks", "expect_keyword", "expect_path", "expect_validator_value", "expect_message_contains",
            "expect_rule", "also_schema_keyword", "also_schema_path"}


# ----------------------------------------------------------------------------------------------
# reporting
# ----------------------------------------------------------------------------------------------
class Report:
    def __init__(self):
        self.n = Counter()
        self.fails: list[str] = []

    def ok(self, msg):
        self.n["pass"] += 1
        print("PASS  " + msg)

    def bad(self, msg):
        self.n["fail"] += 1
        self.fails.append(msg)
        print("FAIL  " + msg)

    def known(self, msg):
        self.n["known"] += 1
        print("KNOWN " + msg)

    def info(self, msg):
        self.n["info"] += 1
        print("INFO  " + msg)

    def check(self, cond, msg, detail=None):
        if cond:
            self.ok(msg)
        else:
            self.bad(msg + (f" :: {detail}" if detail not in (None, "", [], {}, set()) else ""))
        return bool(cond)

    def section(self, title):
        print(f"\n## {title}")


R = Report()


# ----------------------------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------------------------
def sha256_file(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def _reject_constant(tok):
    raise ValueError(f"non-standard JSON constant {tok}")


def strict_loads(text: str):
    return json.loads(text, parse_constant=_reject_constant)


def strict_load(p: Path):
    return strict_loads(p.read_text(encoding="utf-8"))


def ptr(err) -> str:
    return "".join("/" + str(x) for x in err.absolute_path)


def flat_errors(validator, inst):
    out = []

    def walk(e):
        out.append(e)
        for sub in e.context or []:
            walk(sub)

    for e in validator.iter_errors(inst):
        walk(e)
    return out


def top_errors(validator, inst):
    return sorted(validator.iter_errors(inst), key=lambda e: (ptr(e), str(e.validator)))


def norm_path(p) -> str:
    p = (p or "").strip()
    if p in ("", "/"):
        return ""
    return p if p.startswith("/") else "/" + p


def attributable(path: str, expected: str) -> bool:
    if expected == "":
        return path == ""
    return path == expected or path.startswith(expected + "/")


def parse_why(p: Path) -> dict:
    d = {}
    for line in p.read_text(encoding="utf-8").splitlines():
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        k = k.strip()
        if k in WHY_KEYS and k not in d:
            d[k] = v.strip()
    return d


def why_dialect(w: dict) -> str:
    if "layer" in w:
        return "math"
    if "breaks" in w:
        return "offers"
    return "data"


def section_text(md: str, start_heading_re: str, end_heading_re: str | None = None) -> str:
    m = re.search(start_heading_re, md, re.M)
    if not m:
        return ""
    rest = md[m.end():]
    if end_heading_re:
        e = re.search(end_heading_re, rest, re.M)
        if e:
            rest = rest[:e.start()]
    return rest


def table_rows(text: str):
    """Yield the cells of every markdown table row (header and separator rows removed)."""
    for line in text.splitlines():
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if all(re.fullmatch(r":?-{2,}:?", c) for c in cells if c):
            continue
        yield cells


def backticked(s: str):
    return re.findall(r"`([^`]+)`", s)


def e_range(text: str):
    out = set()
    for a, b in re.findall(r"E(\d\d)\s*[–-]\s*E(\d\d)", text):
        out |= {"e%02d" % i for i in range(int(a), int(b) + 1)}
    for a in re.findall(r"E(\d\d)", text):
        out.add("e" + a)
    return out


def walk_json(o, path=()):
    """Yield (path tuple, key-or-None, value) for every node."""
    if isinstance(o, dict):
        for k, v in o.items():
            yield path + (k,), k, v
            yield from walk_json(v, path + (k,))
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield path + (i,), None, v
            yield from walk_json(v, path + (i,))


def schema_property_names(schema) -> set:
    names = set()
    for _, k, v in walk_json(schema):
        if k == "properties" and isinstance(v, dict):
            names |= set(v)
    return names


def closed_shape_audit(schema, where="#"):
    open_ = []
    if isinstance(schema, dict):
        if "properties" in schema and schema.get("type") == "object" and schema.get("additionalProperties") is not False:
            open_.append(where)
        for k, v in schema.items():
            if k in ("then", "else", "if", "not", "contains"):
                continue
            if k == "properties" and isinstance(v, dict):
                for pk, pv in v.items():
                    open_ += closed_shape_audit(pv, f"{where}/properties/{pk}")
            elif isinstance(v, dict):
                open_ += closed_shape_audit(v, f"{where}/{k}")
            elif isinstance(v, list):
                for i, item in enumerate(v):
                    open_ += closed_shape_audit(item, f"{where}/{k}/{i}")
    return open_


def ts(s: str) -> dt.datetime:
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))


def git(repo: Path, *args) -> tuple[int, str]:
    p = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True)
    return p.returncode, p.stdout


# ----------------------------------------------------------------------------------------------
# per-contract harness rules (what JSON Schema cannot express), re-implemented independently
# ----------------------------------------------------------------------------------------------
def harness_delivery_job(j):
    """JS-KEY-1 and the time/attempt ordering rules of job-state-machine.md s5, s7."""
    out = []
    exp = "pk1:%s:%s:%s:%s" % (j.get("contact_id"), j.get("trigger_event_id"), j.get("template_id"), j.get("template_version"))
    if j.get("purpose_key") != exp:
        out.append(("semantic:purpose_key", "", "purpose_key components differ from the job fields"))
    if ts(j["due_at"]) >= ts(j["expires_at"]):
        out.append(("semantic:due_before_expiry", "", "expires_at is not after due_at"))
    if "next_attempt_at" in j and ts(j["next_attempt_at"]) >= ts(j["expires_at"]):
        out.append(("semantic:retry_before_expiry", "", "next_attempt_at is not before expires_at"))
    if j["attempt_count"] > j["max_attempts"]:
        out.append(("semantic:attempt_cap", "", "attempt_count above max_attempts"))
    if "lease" in j and ts(j["lease"]["leased_at"]) >= ts(j["lease"]["leased_until"]):
        out.append(("semantic:lease_bounds", "", "lease ends before it starts"))
    if "sent_at" in j and "send_started_at" in j and ts(j["send_started_at"]) > ts(j["sent_at"]):
        out.append(("semantic:send_order", "", "send_started_at after sent_at"))
    if ts(j["created_at"]) > ts(j["updated_at"]):
        out.append(("semantic:created_before_updated", "", "created_at after updated_at"))
    return out


def harness_offer_matrix(doc):
    """OM-REF-1, OM-REF-2, OM-HARN-2, OM-HARN-3 (offer-matrix.md s7)."""
    out = []
    recs = doc.get("gate_records", [])
    by_id = {r["record_id"]: r for r in recs}
    for rid, n in Counter(r["record_id"] for r in recs).items():
        if n > 1:
            out.append(("OM-HARN-3", "/gate_records", f"record_id {rid} repeats"))
    for path, k, v in walk_json(doc.get("offers", {}), ("offers",)):
        if k == "approvals" and isinstance(v, list):
            for i, a in enumerate(v):
                if isinstance(a, dict) and "record_id" in a:
                    p = "/" + "/".join(str(x) for x in path) + f"/{i}/record_id"
                    rec = by_id.get(a["record_id"])
                    if rec is None:
                        out.append(("OM-REF-1", p, "approval cites a missing gate record"))
                    elif rec.get("gate") != a.get("gate"):
                        out.append(("OM-REF-2", p, "approval gate differs from its record"))
    offers = doc.get("offers", {})
    for p, eds in (("/offers/guide-pdf/approved_editions", offers.get("guide-pdf", {}).get("approved_editions", [])),
                   ("/offers/book-bundle/approved_print_editions", offers.get("book-bundle", {}).get("approved_print_editions", []))):
        if len({e.get("locale") for e in eds}) != len(eds):
            out.append(("OM-HARN-2", p, "two editions for one locale"))
    return out


def harness_asset_manifest(doc):
    """AM-HARN-1, AM-HARN-2, AM-HARN-3 (asset-manifest.md s4)."""
    out, seen = [], {}
    assets = doc.get("assets", [])
    for i, a in enumerate(assets):
        key = (a.get("asset_id"), a.get("locale"), a.get("version"))
        if key in seen:
            out.append(("AM-HARN-2", f"/assets/{i}", "duplicate (asset_id, locale, version)"))
        seen[key] = i
        if a.get("status") == "published" and a.get("published_content_sha256") != (a.get("review_hash") or {}).get("sha256"):
            out.append(("AM-HARN-1", f"/assets/{i}/published_content_sha256", "published hash differs from review hash"))
        if a.get("language_availability") == "captions_only":
            src = a.get("captions_source_locale")
            if not any(b.get("asset_id") == a.get("asset_id") and b.get("locale") == src
                       and b.get("language_availability") == "language_recorded" for b in assets):
                out.append(("AM-HARN-3", f"/assets/{i}/captions_source_locale", "captions_only without a recorded sibling"))
    return out


def _qty(q):
    if q is None or q.get("status") == "unknown":
        return False, None
    if q["status"] == "zero":
        return True, 0
    return True, q["value"]


def harness_workshop(doc):
    """XF-04, XF-05, XF-06 (workshop-inputs.md s6, layer 2). Independent of workshop_reference.py."""
    out = []
    timing = doc["chapters"]["timing"]
    seen = {}
    for idx, s in enumerate(doc["chapters"]["income"]["sources"]):
        base = f"/chapters/income/sources/{idx}"
        if s["id"] in seen:
            out.append(("XF-06", base + "/id", f"source id {s['id']} repeats index {seen[s['id']]}"))
        else:
            seen[s["id"]] = idx
        if s["owner"] == "partner":
            hh = timing.get("household")
            o_known, o_age = _qty(hh["partner_current_age"]) if hh else (False, None)
        else:
            o_known, o_age = _qty(timing["current_age"])

        def resolve(pt):
            if pt["reference"] == "already_receiving":
                return 0
            k, v = _qty(pt.get("point"))
            if not k:
                return None
            if pt["reference"] == "year_index":
                return v
            return (v - o_age) if o_known else None

        st = s["start"]
        if st["reference"] == "age":
            k, a = _qty(st.get("point"))
            if k and o_known and a < o_age:
                out.append(("XF-04", base + "/start/point/value", f"start age {a} before owner age {o_age}"))
        if "end" in s:
            si, ei = resolve(st), resolve(s["end"])
            if si is not None and ei is not None and ei <= si:
                out.append(("XF-05", base + "/end", f"end index {ei} not after start index {si}"))
    return out


HARNESS = {
    "event-envelope": lambda d: [],
    "delivery-job": harness_delivery_job,
    "feature-flags": lambda d: [],
    "offer-matrix": harness_offer_matrix,
    "asset-manifest": harness_asset_manifest,
    "worker-handoff": lambda d: [],
    "workshop-inputs": harness_workshop,
}


# ----------------------------------------------------------------------------------------------
# context: everything loaded once, so negative controls can re-run checks on mutated copies
# ----------------------------------------------------------------------------------------------
class Ctx:
    def __init__(self, repo: Path, contracts: Path):
        self.repo = repo
        self.C = contracts
        self.orch = repo / ".orchestration"
        self.md = {p.name: p.read_text(encoding="utf-8") for p in sorted(contracts.glob("*.md"))}
        self.schemas = {n: strict_load(contracts / f) for n, f in SCHEMAS.items()}
        self.validators = {n: EcmaValidator(s) for n, s in self.schemas.items()}
        self.reg = {n: strict_load(contracts / f) for n, f in REGISTRIES.items()}
        self.fix_dir = contracts / "fixtures" / "workshop"
        self.catalog_ids = {c["id"] for c in strict_load(self.orch / "acceptance_catalog.json")["checks"]}
        self.task_ids = {t["id"] for t in strict_load(self.orch / "tasks.json")["tasks"]}
        self.decisions = (self.orch / "decisions.md").read_text(encoding="utf-8")
        self.blockers = (self.orch / "blockers.md").read_text(encoding="utf-8")
        self.src04 = (self.orch / "source" / "04_CONTRACTS_AND_TESTS.md").read_text(encoding="utf-8")
        self.examples = {}
        for kind in ("valid", "invalid"):
            base = contracts / "examples" / kind
            for d in sorted(base.iterdir()) if base.is_dir() else []:
                if d.is_dir():
                    self.examples[(kind, d.name)] = sorted(d.glob("*.json"))

    def rel(self, p: Path) -> str:
        try:
            return str(p.relative_to(self.C))
        except ValueError:
            return str(p)

    def resolve_logged(self, p: str) -> Path:
        if p.startswith(".orchestration/contracts/"):
            return self.C / p[len(".orchestration/contracts/"):]
        if p.startswith(".orchestration/"):
            return self.repo / p
        if p.startswith("evidence/"):
            return self.orch / p
        return self.C / p

    def valid_docs(self, name):
        # negative controls may substitute an in-memory document for one file (never written to disk)
        ov = getattr(self, "doc_overrides", {})
        return [(f, ov[f] if f in ov else strict_load(f)) for f in self.examples.get(("valid", name), [])]

    def fixture_docs(self):
        """WM fixture documents by file name; negative controls may substitute an in-memory set."""
        ov = getattr(self, "fixture_override", None)
        if ov is not None:
            return ov
        return {p.name: strict_load(p) for p in sorted(self.fix_dir.glob("WM*.json"))}


# ----------------------------------------------------------------------------------------------
# S1 index and inventory
# ----------------------------------------------------------------------------------------------
def parse_readme_index(readme: str):
    sec = section_text(readme, r"^## (?:\d+\. )?Contract index", r"^## ")
    rows = []
    for cells in table_rows(sec):
        if len(cells) < 5 or cells[0] in ("#", "No."):
            continue
        rows.append({"no": cells[0], "name": cells[1], "files": backticked(cells[2]), "owner": cells[3],
                     "consumers": cells[4], "status": cells[5] if len(cells) > 5 else ""})
    return rows


def s1_index(ctx: Ctx):
    R.section("S1. README index and contract inventory")
    readme_p = ctx.C / "README.md"
    if not readme_p.exists():
        R.bad("README.md missing")
        return
    readme = readme_p.read_text(encoding="utf-8")
    m_v = re.search(r"^contract_set_version:\s*(\S+)\s*$", readme, re.M)
    m_d = re.search(r"^frozen_for_build_on:\s*(\S+)\s*$", readme, re.M)
    R.check(m_v and m_v.group(1) == SET_VERSION, f"README declares contract_set_version {SET_VERSION}", m_v and m_v.group(1))
    R.check(m_d and m_d.group(1) == FROZEN_ON, f"README declares frozen_for_build_on {FROZEN_ON}", m_d and m_d.group(1))
    rows = parse_readme_index(readme)
    R.check(len(rows) >= 16, f"README index has one row per contract ({len(rows)} rows)")
    missing, covered_dirs, covered_files = [], [], set()
    for r in rows:
        for f in r["files"]:
            base = (ctx.repo / ".orchestration" / "contracts") if f.startswith("../") else ctx.C
            p = (base / f).resolve()
            if not p.exists():
                missing.append(f)
            elif f.endswith("/"):
                covered_dirs.append(p)
            else:
                covered_files.add(p)
        if not r["status"].startswith("frozen-for-build"):
            R.bad(f"README row {r['no']} status does not start with 'frozen-for-build': {r['status'][:60]}")
        if not re.search(r"\b[FDPWCUNRHLO]\d\d\b|every task|all 62 tasks", r["consumers"]):
            R.bad(f"README row {r['no']} names no consuming task")
    R.check(not missing, "every path in the README index exists", missing)
    all_files = sorted(p for p in ctx.C.rglob("*") if p.is_file() and "__pycache__" not in p.parts)
    unindexed = [ctx.rel(p) for p in all_files
                 if p.resolve() not in covered_files and not any(d in p.resolve().parents for d in covered_dirs)]
    R.check(not unindexed, f"every file under contracts/ is covered by the README index ({len(all_files)} files)", unindexed[:10])
    print(f"inventory: {len(all_files)} files under {ctx.C} (sha256, path relative to contracts/)")
    for p in all_files:
        print(f"  {sha256_file(p)}  {ctx.rel(p)}")
    # text hygiene (approval-scopes 4.2 file-sha256-v1: UTF-8, LF, no BOM)
    bad_text = []
    for p in all_files:
        b = p.read_bytes()
        if b.startswith(b"\xef\xbb\xbf") or b"\r\n" in b:
            bad_text.append(ctx.rel(p))
        try:
            b.decode("utf-8")
        except UnicodeDecodeError:
            bad_text.append(ctx.rel(p))
    R.check(not bad_text, "CX-28 every contract file is UTF-8, LF line endings, no BOM", bad_text)
    ctx.readme = readme
    ctx.readme_rows = rows


# ----------------------------------------------------------------------------------------------
# S2 schemas
# ----------------------------------------------------------------------------------------------
def s2_schemas(ctx: Ctx):
    R.section("S2. Schemas (draft 2020-12, $id, closed shapes)")
    for name, fname in SCHEMAS.items():
        s = ctx.schemas[name]
        try:
            Draft202012Validator.check_schema(s)
            R.ok(f"{fname} is a valid draft 2020-12 schema")
        except Exception as exc:  # noqa: BLE001
            R.bad(f"{fname} meta-validation: {exc}")
        R.check(s.get("$schema") == DRAFT, f"{fname} declares $schema draft 2020-12")
        R.check(s.get("$id") == f"{ID_BASE}{name}/{SET_VERSION}", f"{fname} $id = {ID_BASE}{name}/{SET_VERSION}", s.get("$id"))
        R.check(s.get("additionalProperties") is False, f"{fname} root is closed")
        open_ = closed_shape_audit(s)
        R.check(not open_, f"{fname} closed-shape audit: no open object schema", open_[:5])
    ctx.reg_validators = {}
    for name, doc in ctx.reg.items():
        rs_path = ctx.repo / doc.get("registry_schema", "")
        if not rs_path.is_file():
            R.bad(f"{name}: registry_schema {doc.get('registry_schema')} not found")
            continue
        rs = strict_load(rs_path)
        try:
            Draft202012Validator.check_schema(rs)
            R.ok(f"{rs_path.name} is a valid draft 2020-12 schema")
        except Exception as exc:  # noqa: BLE001
            R.bad(f"{rs_path.name} meta-validation: {exc}")
        R.check(rs.get("$id", "").startswith(ID_BASE) and rs.get("$id", "").endswith("/" + SET_VERSION),
                f"{rs_path.name} $id is versioned {SET_VERSION}", rs.get("$id"))
        open_ = closed_shape_audit(rs)
        if open_:
            R.info(f"{rs_path.name} (evidence-located registry schema) has {len(open_)} open object schemas: {open_}")
        ctx.reg_validators[name] = EcmaValidator(rs)
        ctx.reg_schema_docs = getattr(ctx, "reg_schema_docs", {})
        ctx.reg_schema_docs[name] = rs
    # A6D2-04: every pattern must translate to ECMA-262 semantics, and no keyword may run a pattern outside the
    # translated `pattern` keyword (patternProperties and unevaluatedProperties would use Python `re` directly)
    n_pat, untranslatable, bypass = 0, [], []
    for where, doc in list(ctx.schemas.items()) + list(getattr(ctx, "reg_schema_docs", {}).items()):
        for path, k, v in walk_json(doc):
            if k == "pattern" and isinstance(v, str):
                n_pat += 1
                try:
                    ecma_re(v)
                except (ValueError, re.error) as exc:
                    untranslatable.append(f"{where}:{'/'.join(map(str, path))}: {exc}")
            elif k in ("patternProperties", "unevaluatedProperties"):
                bypass.append(f"{where}:{'/'.join(map(str, path))}")
    R.check(not untranslatable and not bypass,
            f"A6D2-04 ECMA-262 pattern semantics: {n_pat} schema patterns translated ($ = end of input only); "
            "no patternProperties or unevaluatedProperties", untranslatable + bypass)


# ----------------------------------------------------------------------------------------------
# S3 examples
# ----------------------------------------------------------------------------------------------
def s3_examples(ctx: Ctx):
    R.section("S3. Examples (valid pass; invalid fail for the stated reason)")
    ex_root = ctx.C / "examples"
    for kind in ("valid", "invalid"):
        for d in sorted((ex_root / kind).iterdir()):
            if d.is_dir() and d.name not in SCHEMAS:
                R.bad(f"examples/{kind}/{d.name}/ has no schema in this contract set")
    dialects = Counter()
    rules_by_schema = {}
    for name in SCHEMAS:
        v, harness = ctx.validators[name], HARNESS[name]
        vfiles = ctx.examples.get(("valid", name), [])
        ifiles = ctx.examples.get(("invalid", name), [])
        R.check(vfiles and ifiles, f"{name}: {len(vfiles)} valid and {len(ifiles)} invalid examples present")
        for f in vfiles:
            try:
                doc = strict_load(f)
            except Exception as exc:  # noqa: BLE001
                R.bad(f"valid {ctx.rel(f)}: strict JSON parse failed: {exc}")
                continue
            errs = top_errors(v, doc)
            hx = harness(doc) if not errs else []
            if errs or hx:
                R.bad(f"valid {ctx.rel(f)} rejected: " + "; ".join(
                    [f"{e.validator}@{ptr(e) or '/'}: {e.message[:100]}" for e in errs[:4]] + [f"{h[0]}@{h[1]}: {h[2]}" for h in hx]))
            else:
                R.ok(f"valid   {ctx.rel(f)}")
        rules = set()
        for f in ifiles:
            wp = f.with_name(f.name[:-5] + ".why.txt")
            if not wp.exists():
                R.bad(f"invalid {ctx.rel(f)}: no .why.txt")
                continue
            w = parse_why(wp)
            dialects[why_dialect(w)] += 1
            rule = (w.get("rule") or "").split(" ")[0]
            rules.add(rule)
            layer, kw, path = w.get("layer"), w.get("expect_keyword", ""), norm_path(w.get("expect_path"))
            label = f"invalid {ctx.rel(f)} [{rule}]"
            text = f.read_text(encoding="utf-8")
            if layer == "json-parse":
                try:
                    strict_loads(text)
                    R.bad(f"{label}: strict parse unexpectedly succeeded")
                    continue
                except ValueError as exc:
                    strict_msg = str(exc)
                doc = json.loads(text)
                errs = flat_errors(v, doc)
                ap = norm_path(w.get("also_schema_path"))
                hit = [e for e in errs if e.validator == w.get("also_schema_keyword") and ptr(e) == ap]
                stray = [e for e in errs if not attributable(ptr(e), ap)]
                R.check(hit and not stray, f"{label}: strict parse rejected ({strict_msg}); lenient parse fails "
                        f"{w.get('also_schema_keyword')} at {ap}", [f"{e.validator}@{ptr(e)}" for e in errs][:6])
                continue
            try:
                doc = strict_loads(text)
            except Exception as exc:  # noqa: BLE001
                R.bad(f"{label}: strict parse failed unexpectedly: {exc}")
                continue
            errs = flat_errors(v, doc)
            if kw.startswith("semantic:") or kw.startswith("harness:") or layer == "semantic":
                if errs:
                    R.bad(f"{label}: must be schema-valid so only the harness rule catches it; schema errors "
                          + "; ".join(f"{e.validator}@{ptr(e)}" for e in errs[:5]))
                    continue
                hx = harness(doc)
                if kw.startswith("semantic:"):
                    hit = [h for h in hx if h[0] == kw]
                    extra_ok = True
                elif kw.startswith("harness:"):
                    hid = kw.split(":", 1)[1]
                    hit = [h for h in hx if h[0] == hid and h[1] == path]
                    extra_ok = True
                else:
                    hit = [h for h in hx if h[0] == w.get("expect_rule") and h[1] == path]
                    extra_ok = len(hit) == len(hx)
                R.check(hit and extra_ok, f"{label}: schema-valid, rejected by harness "
                        f"{hit[0][0] if hit else kw or w.get('expect_rule')} at {path or '/'}", hx)
                continue
            if not errs:
                R.bad(f"{label}: unexpectedly ACCEPTED by the schema")
                continue
            want_v = json.loads(w["expect_validator_value"]) if "expect_validator_value" in w else None
            contains = w.get("expect_message_contains", "")
            hit = [e for e in errs if e.validator == kw and ptr(e) == path
                   and (want_v is None or e.validator_value == want_v) and contains in e.message]
            stray = [e for e in errs if not attributable(ptr(e), path)] if name == "workshop-inputs" else []
            R.check(hit and not stray, f"{label}: fails {kw} at {path or '/'}"
                    + (f" (value {want_v})" if want_v is not None else ""),
                    [f"{e.validator}@{ptr(e)}" for e in (stray or errs)][:6])
        for wp in sorted((ex_root / "invalid" / name).glob("*.why.txt")) if (ex_root / "invalid" / name).is_dir() else []:
            if not wp.with_name(wp.name[:-8] + ".json").exists():
                R.bad(f"orphan {ctx.rel(wp)}")
        rules_by_schema[name] = rules
    ctx.why_dialects = dialects
    ctx.why_rules = rules_by_schema
    print(f"  .why.txt dialects seen: {dict(dialects)}")
    # set-level harness rules on valid examples
    evs = ctx.valid_docs("event-envelope")
    ids = [d["event_id"] for _, d in evs]
    keys = [d["idempotency_key"] for _, d in evs]
    R.check(len(set(ids)) == len(ids) and len(set(keys)) == len(keys),
            "valid event-envelope examples: event_id and idempotency_key unique across the set")
    for name, kind_field in (("offer-matrix", "document_kind"), ("asset-manifest", "manifest_kind")):
        auth = [(f, d) for f, d in ctx.valid_docs(name) if d.get(kind_field) == "authoritative"]
        R.check(len(auth) == 1, f"{name}: exactly one authoritative instance among the valid examples",
                [ctx.rel(f) for f, _ in auth])


# ----------------------------------------------------------------------------------------------
# S4 registries
# ----------------------------------------------------------------------------------------------
def s4_registries(ctx: Ctx):
    R.section("S4. Registries against their registry schemas")
    for name, doc in ctx.reg.items():
        v = getattr(ctx, "reg_validators", {}).get(name)
        if v is None:
            R.bad(f"{name}: no registry validator")
            continue
        errs = top_errors(v, doc)
        R.check(not errs, f"{REGISTRIES[name]} matches {Path(doc['registry_schema']).name}",
                [f"{e.validator}@{ptr(e)}: {e.message[:90]}" for e in errs[:5]])
        R.check(doc.get("contract_version") == SET_VERSION and doc.get("contract_id", "").endswith("/" + SET_VERSION),
                f"{REGISTRIES[name]} contract_version and contract_id are {SET_VERSION}")


# ----------------------------------------------------------------------------------------------
# S5 workshop fixtures
# ----------------------------------------------------------------------------------------------
def parse_math_vocab(ctx: Ctx):
    math = ctx.md.get("workshop-math.md", "")
    states = re.findall(r"^\d\. `([a-z_]+)`:", section_text(math, r"^## 7\.", r"^## 8\."), re.M)
    flags = [backticked(c[0])[0] for c in table_rows(section_text(math, r"^## 8\.", r"^## 9\.")) if backticked(c[0])]
    clip_md = ctx.md.get("workshop-clip-rules.md", "")
    prec = [(p, c, r) for p, c, r in re.findall(r"^\d\. \*\*([CMXHF]) → (W\d\d)\*\*, reason `([a-z_]+)`", clip_md, re.M)]
    fb = re.search(r"None of the above → \*\*(W\d\d)\*\*, reason `([a-z_]+)`", clip_md)
    return states, flags, prec, (fb.group(1), fb.group(2)) if fb else None


def select_clip(pred: dict, prec, fallback):
    for p, clip, reason in prec:
        if pred.get(p):
            return clip, reason
    return fallback


def media_state(case):
    """workshop-clip-rules.md s7, re-derived."""
    sel, loc, av, build = case["selected"], case["locale"], case["availability"], case["build"]
    other = "en" if loc == "fr" else "fr"
    here = av.get(sel, {}).get(loc)
    if here == "available":
        state = "play"
    elif here == "test_media" and build != "production":
        state = "play_test_media_labelled"
    elif av.get(sel, {}).get(other) == "available":
        state = "other_locale_only"
    else:
        state = "unavailable"
    test_ref = any(x == "test_media" for per in av.values() for x in per.values())
    release = "fail_test_media_referenced" if build == "production" and test_ref else "pass"
    return state, release


EXPECTED_KEYS = {"contract_version", "assumptions_echo", "window", "completeness", "years", "flags", "savings_summary",
                 "capital_illustration", "clip"}
YEAR_KEYS = {"t", "calendar_year", "age", "spending_cents", "income_by_source_cents", "income_net_cents", "income_gross_cents",
             "income_unknown_basis_cents", "status", "reasons", "gap_cents", "surplus_cents", "gap_today_dollars_cents",
             "surplus_today_dollars_cents", "exact"}
WINDOW_KEYS = {"t_R", "first_t", "last_t", "first_calendar_year", "last_calendar_year", "first_age", "last_age"}
FIXTURE_KEYS = {"fixture_id", "title", "contract_version", "covers", "purpose", "input", "expected", "independent_checks", "tolerance"}


def fixture_problems(ctx: Ctx, doc: dict, index_entry: dict | None, vocab) -> list[str]:
    states, flags, prec, fb = vocab
    probs = []
    if set(doc) != FIXTURE_KEYS:
        probs.append(f"top-level keys {sorted(set(doc) ^ FIXTURE_KEYS)}")
        return probs
    if doc["contract_version"] != SET_VERSION:
        probs.append("contract_version")
    errs = top_errors(ctx.validators["workshop-inputs"], doc["input"])
    if errs:
        probs.append("input schema errors " + ", ".join(f"{e.validator}@{ptr(e)}" for e in errs[:4]))
    elif harness_workshop(doc["input"]):
        probs.append(f"input semantic errors {harness_workshop(doc['input'])}")
    if not set(doc["covers"]) <= ctx.catalog_ids:
        probs.append(f"covers not in catalog {set(doc['covers']) - ctx.catalog_ids}")
    ex = doc["expected"]
    if set(ex) != EXPECTED_KEYS:
        probs.append(f"expected keys differ from workshop-math.md s12: {sorted(set(ex) ^ EXPECTED_KEYS)}")
        return probs
    if ex["contract_version"] != SET_VERSION:
        probs.append("expected.contract_version")
    st = ex["completeness"]["state"]
    if st not in states:
        probs.append(f"completeness state {st} not in workshop-math.md s7")
    if not set(ex["flags"]) <= set(flags):
        probs.append(f"flags {set(ex['flags']) - set(flags)} not in workshop-math.md s8")
    win = ex["window"]
    if (win is None) != (st == "incomplete_unknown_timing"):
        probs.append("window null iff incomplete_unknown_timing")
    if win is not None:
        if set(win) != WINDOW_KEYS:
            probs.append(f"window keys {sorted(set(win) ^ WINDOW_KEYS)}")
        ts_ = [y["t"] for y in ex["years"]]
        if ts_ != list(range(win["first_t"], win["last_t"] + 1)):
            probs.append("years do not cover the window contiguously")
    elif ex["years"]:
        probs.append("rows without a window")
    for y in ex["years"]:
        extra = set(y) - YEAR_KEYS - {"partner_age"}
        if not YEAR_KEYS <= set(y) or extra:
            probs.append(f"year t={y.get('t')} keys {sorted((YEAR_KEYS - set(y)) | extra)}")
            continue
        for k, val in list(y.items()) + [("income_by_source_cents." + s, c) for s, c in y["income_by_source_cents"].items()]:
            if (k.endswith("_cents") or k.startswith("income_by_source_cents.")) and not isinstance(y.get(k, 0), dict):
                if val is not None and (isinstance(val, bool) or not isinstance(val, int)):
                    probs.append(f"year t={y['t']} {k} is not integer cents or null")
        if y["status"] == "computed":
            g, s = y["gap_cents"], y["surplus_cents"]
            if not (isinstance(g, int) and isinstance(s, int)) or g < 0 or s < 0 or (g > 0 and s > 0):
                probs.append(f"year t={y['t']} computed but gap/surplus invalid ({g}, {s})")
        elif y["status"] == "not_computable":
            if y["gap_cents"] is not None or y["surplus_cents"] is not None:
                probs.append(f"year t={y['t']} not_computable but gap/surplus not null (unknown must never be 0)")
            if not y["reasons"]:
                probs.append(f"year t={y['t']} not_computable without a reason code")
        else:
            probs.append(f"year t={y['t']} status {y['status']}")
    ci = ex["capital_illustration"]
    if (ci.get("feature_flag"), ci.get("displayed"), ci.get("state")) != ("off", False, "disabled_by_flag"):
        probs.append(f"capital illustration must be off in the pilot: {ci.get('feature_flag')}/{ci.get('displayed')}/{ci.get('state')}")
    if ex["savings_summary"].get("totals_computed") is not False:
        probs.append("savings totals computed")
    clip = ex["clip"]
    pred = clip.get("predicates", {})
    if set(pred) != set("CMXHF") or not all(isinstance(x, bool) for x in pred.values()):
        probs.append("clip predicates are not the five booleans C, M, X, H, F")
    elif prec and fb:
        want = select_clip(pred, prec, fb)
        if (clip.get("selected"), clip.get("selection_reason")) != want:
            probs.append(f"clip {clip.get('selected')}/{clip.get('selection_reason')} but precedence gives {want[0]}/{want[1]}")
    if clip.get("selected") not in CLIP_BRANCH:
        probs.append(f"selected clip {clip.get('selected')} not a branch clip")
    if index_entry is not None:
        if index_entry.get("selected_clip") != clip.get("selected") or index_entry.get("completeness_state") != st:
            probs.append("index.json selected_clip/completeness_state differ from the fixture")
        if index_entry.get("fixture_id") != doc["fixture_id"] or index_entry.get("covers") != doc["covers"]:
            probs.append("index.json fixture_id/covers differ from the fixture")
    return probs


def clip_rules_problems(ctx: Ctx, cr: dict, vocab) -> list[str]:
    states, flags, prec, fb = vocab
    probs = []
    md_prec = [{"predicate": p, "clip": c, "selection_reason": r} for p, c, r in prec]
    if fb:
        md_prec.append({"predicate": "none", "clip": fb[0], "selection_reason": fb[1]})
    if cr.get("precedence") != md_prec:
        probs.append("clip-rules.json precedence differs from workshop-clip-rules.md s3")
    tt = cr.get("truth_table", [])
    combos = {tuple(r["predicates"][k] for k in "CMXHF") for r in tt}
    if len(tt) != 32 or len(combos) != 32:
        probs.append(f"truth table has {len(tt)} rows / {len(combos)} distinct combinations (need 32)")
    for r in tt:
        p = r["predicates"]
        possible = not (p["C"] and p["F"])
        if r["possible"] != possible:
            probs.append(f"row {r['row']}: possible={r['possible']} but C excludes F gives {possible}")
        want = select_clip(p, prec, fb)[0]
        if r["selected_by_precedence"] != want:
            probs.append(f"row {r['row']}: selected_by_precedence {r['selected_by_precedence']} != {want}")
        if possible:
            inp = r.get("input")
            if inp is None or top_errors(ctx.validators["workshop-inputs"], inp) or harness_workshop(inp):
                probs.append(f"row {r['row']}: input missing or invalid")
            if (r.get("expected") or {}).get("selected") != want:
                probs.append(f"row {r['row']}: expected.selected differs from precedence")
        elif r.get("input") is not None or r.get("expected") is not None:
            probs.append(f"row {r['row']}: impossible row carries an input or expectation")
    for c in cr.get("supplementary_cases", []):
        inp = c.get("input")
        if inp is None or top_errors(ctx.validators["workshop-inputs"], inp) or harness_workshop(inp):
            probs.append(f"{c.get('case')}: input invalid")
        if c.get("expected", {}).get("selected") not in CLIP_BRANCH:
            probs.append(f"{c.get('case')}: selected not a branch clip")
    for c in cr.get("media_state_cases", []):
        state, release = media_state(c)
        e = c.get("expected", {})
        if (e.get("render_state"), e.get("release_check")) != (state, release):
            probs.append(f"{c.get('case')}: expected {e.get('render_state')}/{e.get('release_check')}, rules give {state}/{release}")
        if e.get("disclosure_shown") is not True:
            probs.append(f"{c.get('case')}: disclosure not shown (required in every media state)")
        if e.get("substitute_clip") is not None:
            probs.append(f"{c.get('case')}: substitutes a clip")
    md_en = re.search(r'- EN \(required meaning\): "([^"]+)"', ctx.md.get("workshop-clip-rules.md", ""))
    if not md_en or cr.get("disclosure", {}).get("en") != md_en.group(1):
        probs.append("clip-rules.json disclosure.en differs from workshop-clip-rules.md s5")
    return probs


def s5_fixtures(ctx: Ctx):
    R.section("S5. Workshop fixtures (shape, inputs, index, clip precedence, media states)")
    vocab = parse_math_vocab(ctx)
    states, flags, prec, fb = vocab
    R.check(len(states) == 6 and len(flags) == 9 and len(prec) == 5 and fb,
            f"workshop vocabulary parsed from the md files ({len(states)} states, {len(flags)} flags, {len(prec)} precedence rules)")
    idx = strict_load(ctx.fix_dir / "index.json")
    R.check(idx.get("contract_version") == SET_VERSION, "fixtures/workshop/index.json contract_version 1.0")
    listed = {e["file"]: e for e in idx["fixtures"]}
    on_disk = {p.name for p in ctx.fix_dir.glob("*.json")} - {"index.json"}
    R.check(set(listed) == on_disk, "index.json lists exactly the fixture files on disk", sorted(set(listed) ^ on_disk))
    for fname in sorted(on_disk):
        doc = strict_load(ctx.fix_dir / fname)
        if fname == "clip-rules.json":
            probs = clip_rules_problems(ctx, doc, vocab)
            R.check(not probs, f"clip-rules.json: 32-row truth table, {len(doc.get('supplementary_cases', []))} supplementary "
                    f"and {len(doc.get('media_state_cases', []))} media cases re-derived", probs[:6])
            continue
        probs = fixture_problems(ctx, doc, listed.get(fname), vocab)
        if not fname.startswith(doc.get("fixture_id", "?")):
            probs.append("file name does not start with fixture_id")
        R.check(not probs, f"{fname}: input valid; output shape of workshop-math.md s12; clip "
                f"{doc.get('expected', {}).get('clip', {}).get('selected')}", probs[:6])
    ctx.math_vocab = vocab


# ----------------------------------------------------------------------------------------------
# S6 cross-contract invariants
# ----------------------------------------------------------------------------------------------
def env_rules(ctx: Ctx):
    env = ctx.schemas["event-envelope"]
    out = {}
    for rule in env["allOf"]:
        t = rule["if"]["properties"]["type"]["const"]
        th = rule["then"]
        props = th.get("properties", {})
        cr = props.get("consent_reference", {})
        out[t] = {
            "subject": props.get("subject_id", {}).get("$ref", "").rsplit("/", 1)[-1],
            "resource": props.get("resource_id", {}).get("$ref", "").rsplit("/", 1)[-1],
            "sources": set(props.get("source", {}).get("enum", [])),
            "consent": "required" if "consent_reference" in th.get("required", []) else ("forbidden" if cr.get("not") == {} else "open"),
        }
    return out


def job_template_rules(job):
    cls, res = {}, {}
    for r in job["allOf"]:
        cond = r["if"]["properties"]
        if "template_id" not in cond:
            continue
        tpls = cond["template_id"]["enum"]
        props = r["then"].get("properties", {})
        mc = props.get("message_class", {}).get("const")
        for t in tpls:
            if mc:
                cls[t] = mc
            rr = props.get("resource_ref", {})
            if "pattern" in rr:
                res[t] = rr["pattern"][1:4]
            elif rr.get("not") == {}:
                res[t] = None
    return cls, res


def ff_consts(ctx: Ctx):
    ff = ctx.schemas["feature-flags"]
    flags = {}
    for k, v in ff["properties"]["flags"]["properties"].items():
        p = v.get("properties", {})
        flags[k] = {"env_var": p.get("env_var", {}).get("const"), "controls": p.get("controls", {}).get("const"),
                    "enable_gates": p.get("enable_gates", {}).get("const")}
    caps = {}
    for k, v in ff["properties"]["capabilities"]["properties"].items():
        p = v.get("properties", {})
        caps[k] = {"controlling_flags": p.get("controlling_flags", {}).get("const"), "templates": p.get("templates", {}).get("const"),
                   "provider_required": p.get("provider_required", {}).get("const"), "enable_gates": p.get("enable_gates", {}).get("const")}
    return flags, caps


def pb_scan_lists(ctx: Ctx):
    pb = ctx.md.get("privacy-boundary.md", "")
    sec = section_text(pb, r"^## 5\.", r"^## 6\.")
    toks = set()
    for label in ("Financial", "Age and health", "Derived selections", "Identity and device"):
        m = re.search(r"^- " + label + r": `([^`]+)`", sec, re.M)
        if m:
            toks |= set(m.group(1).split())
    m2 = re.search(r"\*\*PB-SCAN-2: forbidden whole keys\.\*\* `([^`]+)`, plus the sibling workshop-inputs names the tokens miss: `([^`]+)`", sec)
    whole = set(m2.group(1).split()) if m2 else set()
    ws = set(m2.group(2).split()) if m2 else set()
    return toks, whole, ws


def key_tokens(k: str) -> set:
    k = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", k)
    return {t for t in re.split(r"[_\-\s]+", k.lower()) if t}


def pb_hits(doc, toks, whole, exceptions=("provider_message_id",)):
    hits = []
    for path, k, v in walk_json(doc):
        if k is not None and k not in exceptions:
            if key_tokens(k) & toks or k.lower() in whole:
                hits.append("/" + "/".join(map(str, path)))
        if isinstance(v, str) and (path and path[-1] not in exceptions):
            if EMAIL_RE.search(v) or re.search(r"[$€£]", v):
                hits.append("/" + "/".join(map(str, path)) + " (value)")
    return hits


def cx_checks(ctx: Ctx):
    """Each entry: (id, title, function returning a list of problems)."""
    env = ctx.schemas["event-envelope"]
    job = ctx.schemas["delivery-job"]
    om = ctx.schemas["offer-matrix"]
    am = ctx.schemas["asset-manifest"]
    wh = ctx.schemas["worker-handoff"]
    ws = ctx.schemas["workshop-inputs"]
    ee, dfr = ctx.reg["email-eligibility"], ctx.reg["data-flow-register"]
    types = env["$defs"]["event_type"]["enum"]
    sources = env["$defs"]["source"]["enum"]
    rules = env_rules(ctx)
    flags, caps = ff_consts(ctx)
    am_entry = am["$defs"]["entry"]["properties"]
    am_appr = next(b for b in am_entry["approval"]["anyOf"] if b.get("type") == "object")["properties"]
    md = ctx.md

    def cx01():
        p = []
        for n, s in ctx.schemas.items():
            if not s.get("$id", "").endswith("/" + SET_VERSION):
                p.append(f"{n} $id")
        for n in ("event-envelope", "delivery-job", "feature-flags"):
            if ctx.schemas[n]["properties"].get("schema_version", {}).get("const") != SET_VERSION:
                p.append(f"{n} schema_version const")
        for n in ("offer-matrix", "asset-manifest", "workshop-inputs"):
            if ctx.schemas[n]["properties"].get("contract_version", {}).get("const") != SET_VERSION:
                p.append(f"{n} contract_version const")
        if not ecma_re(wh["properties"]["contract_version"]["pattern"]).fullmatch(SET_VERSION):
            p.append("worker-handoff contract_version pattern rejects 1.0")
        for n, d in ctx.reg.items():
            if d.get("contract_version") != SET_VERSION:
                p.append(f"{n} contract_version")
        return p

    def cx02():
        p = []
        sets = {
            "offer-matrix $defs.human_role": set(om["$defs"]["human_role"]["enum"]),
            "asset-manifest approval.approved_by_roles": set(am_appr["approved_by_roles"]["items"]["enum"]),
            "feature-flags approved.recorded_by": set(x for x in ctx.schemas["feature-flags"]["$defs"]["approved_state"]["properties"]["recorded_by"]["enum"] if x),
        }
        for k, s in sets.items():
            if s != HUMAN_ROLES:
                p.append(f"{k} = {sorted(s)}")
            if s & AGENT_ROLES:
                p.append(f"{k} admits an agent role {s & AGENT_ROLES}")
        line = next((ln for ln in md.get("approval-scopes.md", "").splitlines() if ln.startswith("- **AS-WRITE-1.**")), "")
        if not HUMAN_ROLES <= set(backticked(line)):
            p.append("approval-scopes.md AS-WRITE-1 does not name the same five roles")
        return p

    def cx03():
        p = []
        ffs = ctx.schemas["feature-flags"]
        enums = {"offer-matrix $defs.gate": om["$defs"]["gate"]["enum"],
                 "asset-manifest approval.gates": am_appr["gates"]["items"]["enum"],
                 "feature-flags approved.gate_refs": ffs["$defs"]["approved_state"]["properties"]["gate_refs"]["items"]["enum"]}
        for k, e in enums.items():
            if list(e) != GATES:
                p.append(f"{k} = {e}")
        for k, f in flags.items():
            if not set(f["enable_gates"] or []) <= set(GATES):
                p.append(f"flag {k} gates")
        for k, c in caps.items():
            if not set(c["enable_gates"] or []) <= set(GATES):
                p.append(f"capability {k} gates")
        for fl in dfr["flows"]:
            if not set(fl.get("gates", [])) <= set(GATES):
                p.append(f"{fl['id']} gates")
        pat = ecma_re(wh["properties"]["human_approvals_required"]["items"]["allOf"][0]["pattern"])
        if not pat.search("G3: exact hash") or pat.search("G7: x"):
            p.append("worker-handoff human_approvals_required pattern is not G0-G6")
        return p

    def cx04():
        p = []
        if env["properties"]["locale"].get("enum") != ["fr", "en"]:
            p.append("event-envelope locale")
        if job["properties"]["locale"].get("enum") != ["fr", "en"]:
            p.append("delivery-job locale")
        if set(am_entry["locale"]["enum"]) - {"zxx"} != {"fr", "en"}:
            p.append("asset-manifest locale")
        if set(am_entry["captions_source_locale"]["enum"]) != {"fr", "en", None}:
            p.append("asset-manifest captions_source_locale")
        cr = strict_load(ctx.fix_dir / "clip-rules.json")
        for c in cr["media_state_cases"]:
            if c["locale"] not in ("fr", "en") or any(set(v) != {"fr", "en"} for v in c["availability"].values()):
                p.append(f"clip-rules {c['case']} locales")
        return p

    def cx05():
        p = []
        m = re.search(r"Event types include: (.+?)\.\n", ctx.src04)
        src = [t.strip() for t in m.group(1).split(",")] if m else []
        if src != types or len(types) != 20:
            p.append("event_type enum differs from source 04 s3 (same order)")
        if [r["if"]["properties"]["type"]["const"] for r in env["allOf"]] != types:
            p.append("per-type rules do not cover the enum exactly once, in order")
        sec = section_text(md.get("event-envelope.md", ""), r"^## 3\.", r"^## 4\.")
        md_rows = {backticked(c[0])[0]: c for c in table_rows(sec) if c and backticked(c[0]) and backticked(c[0])[0] in types}
        if list(md_rows) != types:
            p.append(f"event-envelope.md s3 table types differ: {sorted(set(types) ^ set(md_rows))}")
        created = {t: set() for t in types}
        for t in ee["templates"]:
            for ty in t["trigger_event_types"]:
                if ty not in types:
                    p.append(f"{t['id']} trigger {ty} not an event type")
                else:
                    created[ty].add(t["template_id"])
        supp_code = {"webinar.cancelled": "registration_cancelled", "book.refunded": "order_refunded",
                     "meeting.confirmed": "already_booked", "meeting.cancelled": "booking_cancelled"}
        tmap = {t["template_id"]: t for t in ee["templates"]}
        for ty, cells in md_rows.items():
            jobs = cells[6] if len(cells) > 6 else ""
            before = jobs.split("suppresses")[0].strip()
            md_created = set() if before.startswith(("selects", "none")) else e_range(before)
            if md_created != created[ty]:
                p.append(f"{ty}: md jobs {sorted(md_created)} vs registry triggers {sorted(created[ty])}")
            if "suppresses" in jobs:
                after = jobs.split("suppresses", 1)[1]
                for tid in e_range(after):
                    code = supp_code.get(ty)
                    if code is None:
                        p.append(f"{ty}: suppression without a mapped code")
                    elif code not in tmap[tid]["suppressions"]:
                        p.append(f"{ty} suppresses {tid.upper()} but {tid.upper()} lacks {code}")
        for t in ee["templates"]:
            if t["proposed_class"] == "promotional" and "consent_withdrawn" not in t["suppressions"]:
                p.append(f"{t['id']} promotional without consent_withdrawn (marketing.withdrawn must suppress it)")
        return p, f"{len(md_rows)} md rows, {sum(len(v) for v in created.values())} trigger links"

    def cx06():
        p = []
        sec = section_text(md.get("event-envelope.md", ""), r"^## 3\.", r"^## 4\.")
        subj = {"con": "subject_contact", "cnt": "subject_content_item", "job": "subject_job"}
        res_map = [("guide.", "resource_guide_version"), ("consent.", "resource_consent_wording"), ("wev_", "resource_webinar_event"),
                   ("workshop.", "resource_workshop_version"), ("ord_", "resource_book_order"), ("rgt_", "resource_consultation_right"),
                   ("bkg_", "resource_booking"), ("content version", "resource_content_version"), ("template.", "resource_template_version")]
        for c in table_rows(sec):
            if not c or not backticked(c[0]) or backticked(c[0])[0] not in types:
                continue
            ty = backticked(c[0])[0]
            r = rules[ty]
            if subj.get(c[1]) != r["subject"]:
                p.append(f"{ty}: md subject {c[1]} vs schema {r['subject']}")
            res_txt = c[2].replace("`", "")
            want = next((d for pre, d in res_map if res_txt.startswith(pre)), None)
            if want != r["resource"]:
                p.append(f"{ty}: md resource {res_txt} vs schema {r['resource']}")
            md_src = {s.strip() for s in c[3].split(",")}
            if md_src != r["sources"]:
                p.append(f"{ty}: md sources {sorted(md_src)} vs schema {sorted(r['sources'])}")
            if c[4] != r["consent"]:
                p.append(f"{ty}: md consent {c[4]} vs schema {r['consent']}")
        used = set().union(*(r["sources"] for r in rules.values()))
        if set(sources) != used:
            p.append(f"sources never allowed by any type: {sorted(set(sources) - used)}")
        authority = {
            "book.payment_confirmed": {"provider.stripe_webhook"}, "book.refunded": {"provider.stripe_webhook"},
            "meeting.confirmed": {"provider.booking_sync", "operator.reconciliation"},
            "meeting.cancelled": {"provider.booking_sync", "operator.reconciliation"},
            "consultation.redeemed": {"provider.booking_sync", "operator.reconciliation"},
            "meeting.held": {"operator.reconciliation"},
            "webinar.attendance_verified": {"provider.meet_attendance", "operator.reconciliation"},
            "webinar.join_clicked": {"site.join_redirect"},
            "content.approved": {"editorial.approval_ledger"}, "content.published": {"editorial.publication_handoff"},
        }
        for ty, want in authority.items():
            if rules[ty]["sources"] != want:
                p.append(f"authority: {ty} sources {sorted(rules[ty]['sources'])} != {sorted(want)}")
        for ty, r in rules.items():
            if ty != "webinar.join_clicked" and "site.join_redirect" in r["sources"]:
                p.append(f"a click source asserts {ty}")
        n_tok = 0
        for name, text in list(md.items()) + [(f, (ctx.C / f).read_text(encoding="utf-8")) for f in REGISTRIES.values()]:
            for tok in re.findall(r"(?<![\w.])((?:site|provider|operator|editorial|system)\.[a-z_]+)(?![\w.-])", text):
                n_tok += 1
                if tok not in sources:
                    p.append(f"{name} names source {tok} outside the enum")
        n_rows = sum(1 for c in table_rows(sec) if c and backticked(c[0]) and backticked(c[0])[0] in types)
        return p, f"{n_rows} md rows, {len(authority)} authority rules, {n_tok} source mentions scanned"

    def cx07():
        p = []
        req = {t for t, r in rules.items() if r["consent"] == "required"}
        if req != CONSENT_TYPES:
            p.append(f"consent_reference required on {sorted(req)}")
        if any(r["consent"] == "open" for r in rules.values()):
            p.append("a type leaves consent_reference neither required nor forbidden")
        cls, _ = job_template_rules(job)
        promo_schema = {t for t, c in cls.items() if c == "promotional"}
        promo_reg = {t["template_id"] for t in ee["templates"] if t["proposed_class"] == "promotional"}
        consent_reg = {t["template_id"] for t in ee["templates"] if t["consent"]["required"]}
        if promo_schema != promo_reg:
            p.append(f"promotional templates: delivery-job {sorted(promo_schema)} vs registry {sorted(promo_reg)}")
        if not promo_reg <= consent_reg:
            p.append("a promotional template does not require consent")
        purposes = {t["consent"]["purpose"] for t in ee["templates"] if t["consent"]["purpose"]}
        if not purposes <= CONSENT_PURPOSES:
            p.append(f"registry consent purposes {purposes}")
        pat = env["$defs"]["resource_consent_wording"]["pattern"]
        m = re.search(r"\(\?:([a-z|-]+)\)", pat)
        if not m or set(m.group(1).split("|")) != CONSENT_PURPOSES:
            p.append(f"envelope consent wording purposes {m and m.group(1)}")
        odm = md.get("operational-data-model.md", "")
        m2 = re.search(r"purpose\s+text not null,\s+-- ([^\n]+)", odm)
        if not m2 or set(re.findall(r"'([a-z-]+)'", m2.group(1))) != CONSENT_PURPOSES:
            p.append("operational-data-model consent_events.purpose values differ")
        return p, f"promotional {sorted(promo_reg)}; purposes {sorted(purposes)}"

    def cx08():
        p = []
        if job["properties"]["template_id"]["enum"] != TEMPLATES:
            p.append("delivery-job template enum")
        if [t["template_id"] for t in ee["templates"]] != TEMPLATES or [t["id"] for t in ee["templates"]] != [x.upper() for x in TEMPLATES]:
            p.append("registry template ids")
        union = [t for c in caps.values() for t in (c["templates"] or [])]
        if sorted(union) != TEMPLATES or len(union) != 16:
            p.append(f"capability templates union {sorted(union)} (each template exactly once)")
        tv = ecma_re(env["$defs"]["resource_template_version"]["pattern"])
        aid = ecma_re(am_entry["asset_id"]["pattern"])
        for t in TEMPLATES:
            if not tv.search(f"template.{t}.v1") or not aid.search(f"template.{t}"):
                p.append(f"template.{t} rejected by envelope or asset-manifest")
        if tv.search("template.e17.v1") or aid.search("template.e17"):
            p.append("template.e17 accepted")
        cls, res = job_template_rules(job)
        for t in ee["templates"]:
            tid = t["template_id"]
            cap = caps.get(t["capability"])
            if not cap or tid not in (cap["templates"] or []):
                p.append(f"{t['id']} capability {t['capability']} does not own it")
            elif t["controlling_flags"] != cap["controlling_flags"]:
                p.append(f"{t['id']} controlling_flags differ from feature-flags")
            if tid in cls and t["proposed_class"] != cls[tid]:
                p.append(f"{t['id']} class {t['proposed_class']} vs delivery-job {cls[tid]}")
            if tid not in cls and "alternate_class" not in t:
                p.append(f"{t['id']} has no fixed class and no alternate_class")
            if res.get(tid, "unset") != t["resource_ref"]:
                p.append(f"{t['id']} resource_ref {t['resource_ref']} vs delivery-job {res.get(tid, 'unset')}")
            if not (0 <= t["priority"] <= 3 if t["proposed_class"] == "operational" else 5 <= t["priority"] <= 9):
                p.append(f"{t['id']} priority {t['priority']} outside its class band")
        return p

    def cx09():
        p = []
        if sorted(flags) != sorted(["public_launch", "checkout_live", "marketing_dispatch", "automatic_publication", "paid_ads", "third_party_tracking"]):
            p.append(f"flags {sorted(flags)}")
        if len(caps) != 17:
            p.append(f"{len(caps)} capabilities")
        ffm = md.get("feature-flags.md", "")
        seen = set()
        for c in table_rows(section_text(ffm, r"^## 2\.", r"^## 3\.")):
            b = backticked(c[0]) if c else []
            if not b or b[0] not in flags:
                if b and re.fullmatch(r"[a-z]+(?:_[a-z]+)+", b[0]):
                    p.append(f"feature-flags.md s2 names unknown flag {b[0]}")
                continue
            f = flags[b[0]]
            seen.add(b[0])
            env_md = backticked(c[1])[0] if backticked(c[1]) else None
            ctl = [x for x in backticked(c[3])]
            gates = re.findall(r"G\d", c[4])
            if env_md != f["env_var"] or ctl != f["controls"] or gates != f["enable_gates"]:
                p.append(f"feature-flags.md s2 row {b[0]} differs from JSON ({env_md}, {ctl}, {gates})")
        if seen != set(flags):
            p.append(f"feature-flags.md s2 misses {sorted(set(flags) - seen)}")
        seen = set()
        for c in table_rows(section_text(ffm, r"^## 4\.", r"^## 5\.")):
            b = backticked(c[0]) if c else []
            if not b or b[0] not in caps:
                continue
            seen.add(b[0])
            cf = [x for x in re.findall(r"[a-z]+(?:_[a-z]+)+", c[1])]
            tp = sorted(e_range(c[2]))
            prov = c[3].startswith("yes")
            gates = re.findall(r"G\d", c[4])
            k = caps[b[0]]
            if cf != k["controlling_flags"] or tp != sorted(k["templates"]) or prov != k["provider_required"] or gates != k["enable_gates"]:
                p.append(f"feature-flags.md s4 row {b[0]} differs from JSON ({cf}, {tp}, {prov}, {gates})")
        if seen != set(caps):
            p.append(f"feature-flags.md s4 misses {sorted(set(caps) - seen)}")
        for k, f in flags.items():
            if not set(f["controls"]) <= set(caps):
                p.append(f"flag {k} controls unknown capability")
        for k, c in caps.items():
            if not set(c["controlling_flags"]) <= set(flags):
                p.append(f"capability {k} controlled by unknown flag")
        n_s4 = len(seen)
        for t in ee["templates"]:
            if not set(t["controlling_flags"]) <= set(flags):
                p.append(f"{t['id']} controlling flag unknown")
        non_flags = {"meta_ads", "reference_if_enabled", "workshop_capital_illustration"}
        for name, text in md.items():
            for tok in re.findall(r"`([a-z]+(?:_[a-z]+)+)`", text):
                if re.search(r"_(launch|live|dispatch|publication|ads|tracking|illustration|enabled)$", tok) and tok not in flags and tok not in non_flags:
                    p.append(f"{name} names flag-like {tok} outside feature-flags.json")
        return p, f"md s2 rows {len(flags)}, md s4 rows {n_s4}"

    def cx10():
        p = []
        supp = job["properties"]["suppression_reason"]["enum"]
        defer = job["properties"]["defer_reason"]["enum"]
        errc = job["properties"]["last_error"]["properties"]["code"]["enum"]
        status = job["properties"]["status"]["enum"]
        if set(ee["suppression_codes"]) != set(supp):
            p.append("registry suppression_codes differ from delivery-job suppression_reason")
        for t in ee["templates"]:
            if not set(t["suppressions"]) <= set(supp):
                p.append(f"{t['id']} unknown suppression")
        jsm = md.get("job-state-machine.md", "")
        md_states = [backticked(c[0])[0] for c in table_rows(section_text(jsm, r"^## 2\.", r"^## 3\.")) if c and backticked(c[0])]
        if md_states != status:
            p.append(f"job-state-machine.md s2 states {md_states} vs schema {status}")
        md_codes = set()
        for c in table_rows(section_text(jsm, r"^## 8\.", r"^## 9\.")):
            if len(c) > 1:
                md_codes |= set(backticked(c[1]))
        if md_codes != set(errc):
            p.append(f"job-state-machine.md s8 codes differ: {sorted(md_codes ^ set(errc))}")
        md_tokens = set(backticked(jsm))
        if not set(defer) <= md_tokens:
            p.append(f"defer reasons missing from job-state-machine.md: {sorted(set(defer) - md_tokens)}")
        for tok in md_tokens:
            if re.fullmatch(r"[a-z]+(?:_[a-z]+)+", tok) and (tok.endswith(("_withdrawn", "_missing", "_blocklist", "_suppressed", "_flag", "_reply", "_allowlisted"))) and tok not in supp:
                p.append(f"job-state-machine.md code {tok} not in suppression_reason")
        odm = md.get("operational-data-model.md", "")
        defined_ops = set(re.findall(r"`(op_[a-z_]+)\(", odm))
        for name, text in md.items():
            for op in set(re.findall(r"\b(op_[a-z_]+)", text)):
                if op not in defined_ops:
                    p.append(f"{name} names {op}, not defined in operational-data-model.md s4")
        line = next((ln for ln in odm.splitlines() if ln.startswith("`audit_events.action` values:")), "")
        actions = set(backticked(line.split("values:", 1)[1])) if line else set()
        for a in set(re.findall(r"`(job\.[a-z]+)`", jsm)):
            if a not in actions:
                p.append(f"job-state-machine.md audit action {a} not in audit_events.action")
        return p, f"{len(md_states)} states, {len(md_codes)} error codes, {len(defined_ops)} ops, {len(actions)} audit actions"

    def cx11():
        p = []
        if list(om["properties"]["offers"]["properties"]) != OFFERS:
            p.append("offer-matrix offers")
        if set(am_entry["offer_refs"]["items"]["enum"]) != set(OFFERS):
            p.append("asset-manifest offer_refs")
        offer_ctas = {c for c in am_entry["cta"]["enum"] if c in ("intro-15", "guide-pdf", "book-bundle", "continued-work")}
        if not offer_ctas <= set(OFFERS):
            p.append("asset-manifest cta offers")
        mt = om["properties"]["meeting_types"]["properties"]
        for k, (offer, mins) in MEETING_TYPES.items():
            pp = mt.get(k, {}).get("properties", {})
            if pp.get("offer_id", {}).get("const") != offer or pp.get("duration_minutes", {}).get("const") != mins:
                p.append(f"meeting type {k} not {offer}/{mins} min")
        if set(mt) != set(MEETING_TYPES):
            p.append(f"meeting types {sorted(mt)}")
        offers_p = om["properties"]["offers"]["properties"]
        if offers_p["intro-15"]["properties"]["duration_minutes"].get("const") != 15:
            p.append("intro-15 duration const")
        if offers_p["book-bundle"]["properties"]["included_consultation"]["properties"]["duration_minutes"].get("const") != 30:
            p.append("book consultation duration const")
        for n, s in ctx.schemas.items():
            for path, k, v in walk_json(s):
                if k and ("minute" in k or "duration" in k) and isinstance(v, dict) and v.get("const") == 60:
                    p.append(f"{n} {'/'.join(map(str, path))} const 60")
        odm = md.get("operational-data-model.md", "")
        if set(re.findall(r"'(intro-15|book-consultation-30)'", odm)) != set(MEETING_TYPES):
            p.append("operational-data-model bookings.offer_id values")
        if "offer_id <> 'intro-15' or ends_at - starts_at = interval '15 minutes'" not in odm or \
           "offer_id <> 'book-consultation-30' or ends_at - starts_at = interval '30 minutes'" not in odm or \
           "check duration_minutes = 30" not in odm:
            p.append("operational-data-model duration checks are not 15 / 30 / 30")
        return p

    def cx12():
        p = []
        key_re = re.compile(r"^\s+([a-zA-Z]+): \{ fr: \"([^\"]*)\", en: \"([^\"]*)\" \},?$", re.M)
        maps = {}
        for ref in ("origin/main", "origin/codex/desktop-iphone-unified", "origin/claude/bill-centered-homepage"):
            rc, out = git(ctx.repo, "show", f"{ref}:lib/routes.ts")
            if rc != 0:
                p.append(f"git show {ref}:lib/routes.ts failed")
                continue
            maps[ref] = {m.group(1): (m.group(2), m.group(3)) for m in key_re.finditer(out)}
        main = maps.get("origin/main", {})
        if list(main) != EXISTING_ROUTE_KEYS:
            p.append(f"origin/main route keys {list(main)}")
        if maps.get("origin/codex/desktop-iphone-unified") != main:
            p.append("codex route map differs from main")
        if set(maps.get("origin/claude/bill-centered-homepage", {})) - set(main) != {"ask"}:
            p.append("homepage branch route keys")
        routes_md = md.get("routes.md", "")
        proposed = {m.group(1): (m.group(2), m.group(3)) for m in re.finditer(
            r"^\| [^|]+ \| `(\w+)` \| `([^`]+)` \| `([^`]+)` \| proposed", routes_md, re.M)}
        am_keys = [k for k in am_entry["intended_route_key"]["enum"] if k is not None]
        want = EXISTING_ROUTE_KEYS + ["ask"] + list(proposed)
        if sorted(am_keys) != sorted(want):
            p.append(f"asset-manifest route keys vs routes.md: {sorted(set(am_keys) ^ set(want))}")
        slug_ok = re.compile(r"^[a-z0-9-]+(?:/[a-z0-9-]+)*$")
        for i, lang in enumerate(("fr", "en")):
            existing = {v[i] for mp in maps.values() for v in mp.values()}
            res_prefix = main.get("resources", ("", ""))[i] + "/"
            for k, sl in proposed.items():
                s = sl[i]
                if s in existing or not slug_ok.match(s) or s.startswith(res_prefix) or s.split("/")[0] in ("revision", "api", "assets", "_next", "operations"):
                    p.append(f"{lang} slug {s} for {k} breaks RT-SLUG-1/2")
        nm = om["properties"]["rules"]["properties"]["no_mandatory_funnel_staircase"]["properties"]
        must = nm["must_link_to_meeting"]["const"]
        exempt = nm["exempt_from_meeting_link"]["const"]
        if set(must) & set(exempt):
            p.append(f"must_link and exempt overlap {set(must) & set(exempt)}")
        route_keys = set(EXISTING_ROUTE_KEYS) | set(proposed)
        if (set(must) | set(exempt)) - {"articles"} != route_keys:
            p.append(f"must_link+exempt vs route keys: {sorted(((set(must) | set(exempt)) - {'articles'}) ^ route_keys)}")
        for f, d in ctx.valid_docs("offer-matrix"):
            for path, k, v in walk_json(d):
                if k in ("primary_route", "booking_route") and isinstance(v, dict):
                    rk, stt = v.get("route_key"), v.get("route_status")
                    if rk not in route_keys or (stt == "existing") != (rk in EXISTING_ROUTE_KEYS):
                        p.append(f"{ctx.rel(f)} {'/'.join(map(str, path))} route {rk}/{stt}")
        return p, f"{len(main)} existing + {len(proposed)} proposed keys; must_link {len(must)}, exempt {len(exempt)}"

    def cx13():
        """Resource codes cannot carry an age, amount, name or diagnosis where the schema claims so (A6D-03).
        (a) content registry keys: no digit; (b) contact-subject codes (guide, workshop, consent): closed key
        set = PB-ID-3 and hash-only version; (c) what the schema cannot see is a numbered runtime rule
        (PB-ID-5 registry membership) mapped to AUTH05 and WK04."""
        p = []
        aid = ecma_re(am_entry["asset_id"]["pattern"])
        env_c = ecma_re(env["$defs"]["resource_content_version"]["pattern"])
        for bad in ("article.retire-at-62", "guide.age-65"):
            if aid.search(bad) or env_c.search(bad + ".v1"):
                p.append(f"a digit is accepted in registry key {bad}")
        pb = md.get("privacy-boundary.md", "")
        line3 = next((ln for ln in pb.splitlines() if ln.startswith("| PB-ID-3 |")), "")
        m_keys = re.search(r"guide keys are `([a-z-]+)`.*?workshop keys are `([a-z-]+)`.*?consent purposes are `([a-z-]+)` and `([a-z-]+)`", line3)
        if not m_keys:
            return p + ["PB-ID-3 closed key sets not found in privacy-boundary.md"]
        want = {"resource_guide_version": ("guide", {m_keys.group(1)}),
                "resource_workshop_version": ("workshop", {m_keys.group(2)}),
                "resource_consent_wording": ("consent", {m_keys.group(3), m_keys.group(4)})}
        h12 = "h" + "0123456789ab"
        for d, (kind, keys) in want.items():
            pat = env["$defs"].get(d, {}).get("pattern", "")
            alt = re.search(r"\\\.\(\?:([a-z|-]+)\)\\\.", pat)
            got = set(alt.group(1).split("|")) if alt else set()
            if got != keys:
                p.append(f"{d} key set {sorted(got)} != PB-ID-3 {sorted(keys)}")
            rx = ecma_re(pat) if pat else None
            for k in keys:
                if not (rx and rx.search(f"{kind}.{k}.{h12}")):
                    p.append(f"{d} rejects the valid code {kind}.{k}.{h12}")
                if rx and rx.search(f"{kind}.{k}.v65"):
                    p.append(f"{d} accepts a readable v-number version ({kind}.{k}.v65)")
            for word in ("eight-hundred-fifty-thousand", "shortfall-large-warning", "jean-tremblay", "before-you-retire"):
                if rx and rx.search(f"{kind}.{word}.{h12}"):
                    p.append(f"{d} accepts a free-word key {word}")
        if not re.search(r"^\| PB-ID-5 \|.*AUTH05", pb, re.M):
            p.append("PB-ID-5 (registry membership) missing or not mapped to AUTH05")
        auth05 = next((ln for ln in pb.splitlines() if ln.startswith("| AUTH05 |")), "")
        wk04 = next((ln for ln in pb.splitlines() if ln.startswith("| WK04 |")), "")
        if "PB-ID-5" not in auth05 or "PB-ID-3 to 6" not in wk04:
            p.append("privacy-boundary.md s6: AUTH05 must cite PB-ID-5 and WK04 must cite PB-ID-3 to 6")
        return p, f"closed keys guide {sorted(want['resource_guide_version'][1])}, workshop {sorted(want['resource_workshop_version'][1])}, consent {sorted(want['resource_consent_wording'][1])}; h-form only"

    def cx14():
        p = []
        pb_line = next((ln for ln in md.get("privacy-boundary.md", "").splitlines() if ln.startswith("| PB-ID-1 |")), "")
        pb = {t[:-1] for t in backticked(pb_line) if t.endswith("_")}
        env_line = next((ln for ln in md.get("event-envelope.md", "").splitlines() if "Prefixes:" in ln), "")
        envp = {t for t in backticked(env_line.split("Prefixes:", 1)[1]) if re.fullmatch(r"[a-z]{3}", t)} if env_line else set()
        if not pb or pb != envp:
            p.append(f"PB-ID-1 prefixes {sorted(pb)} vs event-envelope.md s4.1 {sorted(envp)}")
        used = set()
        for n, s in ctx.schemas.items():
            for _, k, v in walk_json(s):
                if k == "pattern" and isinstance(v, str):
                    for pre, cls in re.findall(r"([a-z]{3})_(\[[^\]]+\])\{26\}", v):
                        used.add(pre)
                        if cls != CROCKFORD:
                            p.append(f"{n} pattern for {pre}_ uses alphabet {cls}")
                    for group, cls in re.findall(r"\(\?:([a-z|]+)\)_(\[[^\]]+\])\{26\}", v):
                        used |= set(group.split("|"))
                        if cls != CROCKFORD:
                            p.append(f"{n} pattern alphabet {cls}")
        if not used <= pb:
            p.append(f"schemas use undeclared prefixes {sorted(used - pb)}")
        odm_pre = set(re.findall(r"-- ([a-z]{3})_ \+ 26", md.get("operational-data-model.md", "")))
        if not odm_pre <= pb:
            p.append(f"operational-data-model uses undeclared prefixes {sorted(odm_pre - pb)}")
        note = f"declared {sorted(pb)}; schemas use {sorted(used)}"
        pk = ecma_re(job["properties"]["purpose_key"]["pattern"])
        tvp = ecma_re(job["properties"]["template_version"]["pattern"])
        base = "pk1:con_" + "0" * 26 + ":00000000-0000-4000-8000-000000000000:e01:"
        for tv in ("h" + "a" * 12, "h" + "a" * 64, "h" + "a" * 11, "v1"):
            if bool(pk.search(base + tv)) != bool(tvp.search(tv)):
                p.append(f"purpose_key and template_version disagree on {tv[:14]}")
        return p, note

    def cx15():
        sec = section_text(md.get("approval-scopes.md", ""), r"^### 4\.2", r"^### 4\.3")
        methods = [backticked(c[0])[0] for c in table_rows(sec) if c and backticked(c[0])]
        enum = next(b for b in am_entry["review_hash"]["anyOf"] if b.get("type") == "object")["properties"]["method"]["enum"]
        return [] if set(methods) == set(enum) and len(methods) == 5 else [f"approval-scopes 4.2 {methods} vs asset-manifest {enum}"]

    def cx16():
        p = []
        for rel in ("examples/invalid/offer-matrix/fixture-ref-in-authoritative.json",
                    "examples/invalid/asset-manifest/fixture-ref-in-authoritative.json",
                    "examples/invalid/asset-manifest/fixture-publication-id-in-authoritative.json",
                    "examples/invalid/offer-matrix/agent-recorded-gate.json",
                    "examples/invalid/asset-manifest/agent-role-approval.json",
                    "examples/invalid/feature-flags/agent-recorded-approval.json"):
            if not (ctx.C / rel).exists():
                p.append(f"missing negative example {rel}")
        d_ids = set(re.findall(r"\bD-(\d{3}[a-z]?)\b", ctx.decisions))
        # A6D-13: a cited decision must be a recorded human answer for that gate, not merely an existing row.
        status_block = section_text(ctx.decisions, r"^\*\*Status values\*\*", r"^---")
        not_recorded = set(re.findall(r"^- `([a-zA-Z0-9-]+)`:", status_block, re.M))

        def decision_row(did):
            for ln in ctx.decisions.splitlines():
                if ln.startswith(f"| D-{did} |") or ln.startswith(f"**D-{did} "):
                    return ln
            return ""

        def gate_record_problems(fname, rec):
            m = re.fullmatch(r"\.orchestration/decisions\.md#D-(\d{3}[a-z]?)", rec.get("record_ref", ""))
            if not m or m.group(1) not in d_ids:
                return []
            row, gate, out = decision_row(m.group(1)), rec.get("gate", ""), []
            cells = [c.strip().strip("*").strip() for c in row.split("|")]
            st = [s for s in not_recorded if any(c == s or c.startswith(s + " ") for c in cells) or f"({s})" in row]
            if not not_recorded:
                out.append("decisions.md status vocabulary not found")
            if st:
                out.append(f"{fname} gate record {rec.get('record_id')} cites D-{m.group(1)}, whose status {sorted(st)} is not a recorded answer")
            if not re.search(r"\b" + re.escape(gate) + r"\b", row):
                out.append(f"{fname} gate record {rec.get('record_id')} cites D-{m.group(1)}, which does not name {gate}")
            if not re.search(r"\b20\d\d-\d\d-\d\d\b", row):
                out.append(f"{fname} gate record {rec.get('record_id')} cites D-{m.group(1)}, which carries no answer date")
            return out

        for name, kind_field in (("offer-matrix", "document_kind"), ("asset-manifest", "manifest_kind")):
            for f, d in ctx.valid_docs(name):
                if d.get(kind_field) != "authoritative":
                    continue
                for rec in d.get("gate_records", []) if name == "offer-matrix" else []:
                    p.extend(gate_record_problems(ctx.rel(f), rec))
                for path, k, v in walk_json(d):
                    if k in ("record_ref", "consent_ref", "evidence_ref", "master_ref", "publication_id") and isinstance(v, str):
                        m = re.fullmatch(r"\.orchestration/decisions\.md#D-(\d{3}[a-z]?)", v)
                        if v.startswith("fixture:"):
                            p.append(f"{ctx.rel(f)} cites {v}")
                        elif m and m.group(1) not in d_ids:
                            p.append(f"{ctx.rel(f)} cites missing {v}")
                        elif v.startswith(".orchestration/approval-packets/") and not (ctx.repo / v.split("#")[0]).exists():
                            p.append(f"{ctx.rel(f)} cites missing packet {v}")
                if name == "offer-matrix":
                    pend = [pth for pth, k, v in walk_json(d) if isinstance(v, dict) and v.get("status") in ("pending", "recorded") and "approvals" in v]
                    rec = [pth for pth, k, v in walk_json(d) if isinstance(v, dict) and v.get("status") == "recorded" and "approvals" in v]
                    print(f"    authoritative offer matrix: {len(pend)} gated fields, {len(rec)} recorded, {len(d['gate_records'])} gate records")
                    if rec and not d["gate_records"]:
                        p.append("recorded value without gate records")
                else:
                    print(f"    authoritative asset manifest: {len(d['assets'])} entries")
        return p

    def cx17():
        p = []
        toks, whole, wsn = pb_scan_lists(ctx)
        if len(toks) < 60 or len(whole) < 15 or len(wsn) < 10:
            p.append("PB-SCAN lists not parsed from privacy-boundary.md s5")
            return p
        props = schema_property_names(ws)
        if not wsn <= props:
            p.append(f"PB-SCAN-2 names not in workshop-inputs: {sorted(wsn - props)}")
        for n in ("event-envelope", "delivery-job"):
            for k in schema_property_names(ctx.schemas[n]) - {"provider_message_id"}:
                if key_tokens(k) & toks or k.lower() in whole | wsn:
                    p.append(f"{n} property {k} hits PB-SCAN")
            for f, d in ctx.valid_docs(n):
                h = pb_hits(d, toks, whole | wsn)
                if h:
                    p.append(f"{ctx.rel(f)} PB-SCAN hits {h[:3]}")
        docs = [(ctx.rel(f), d) for f, d in ctx.valid_docs("workshop-inputs")]
        for fp in sorted(ctx.fix_dir.glob("WM*.json")):
            docs.append((ctx.rel(fp), strict_load(fp)["input"]))
        for rel, d in docs:
            if not pb_hits(d, toks, whole | wsn):
                p.append(f"{rel}: a serialized workshop state passes PB-SCAN")
        for rel in ("examples/invalid/event-envelope/financial-amount-field.json", "examples/invalid/event-envelope/workshop-completed-with-gap.json",
                    "examples/invalid/delivery-job/recipient-email-field.json", "examples/invalid/delivery-job/financial-field-in-job.json"):
            if not pb_hits(strict_load(ctx.C / rel), toks, whole | wsn):
                p.append(f"PB-SCAN misses {rel}")
        odm = md.get("operational-data-model.md", "")
        block = odm.split("```sql", 1)[1].split("```", 1)[0] if "```sql" in odm else ""
        table, cols = None, []
        for line in block.splitlines():
            m = re.match(r"\s*create table ([a-z_]+) \(", line)
            if m:
                table = m.group(1)
                continue
            m = re.match(r"\s{2}([a-z_]+)\s+(text|uuid|integer|smallint|boolean|timestamptz|jsonb)\b", line)
            if m and table:
                cols.append((table, m.group(1)))
        allowed = {("contacts", "email_normalized"), ("contacts", "email_hmac"), ("contacts", "first_name")}
        hits = [f"{t}.{c}" for t, c in cols if (t, c) not in allowed and (key_tokens(c) & toks or c in whole | wsn)]
        if len({t for t, _ in cols}) != 10 or hits:
            p.append(f"data-model columns: {len({t for t, _ in cols})} tables, forbidden {hits}")
        classes = {d["id"]: d for d in dfr["data_classes"]}
        sinks = {s["id"] for s in dfr["sinks"]}
        browser = {"browser_memory", "browser_storage_optin", "browser_local_export"}
        for cid in ("DC-FIN-INPUT", "DC-FIN-DERIVED"):
            forb = set().union(*[set(f["sinks"]) for f in dfr["flows"] if f["data_class"] == cid and f["status"] == "forbidden"])
            if not set(classes[cid]["allowed_sinks"]) <= browser or (sinks - browser - forb - {"secret_store"}):
                p.append(f"{cid} not browser-only with explicit forbidden flows")
        for f in dfr["flows"]:
            if f["status"] != "forbidden" and not set(f["sinks"]) <= set(classes[f["data_class"]]["allowed_sinks"]):
                p.append(f"{f['id']} permits a sink outside its class")
        n_addr = 0
        for base in ("examples", "fixtures"):
            for fp in (ctx.C / base).rglob("*.json"):
                for addr in EMAIL_RE.findall(fp.read_text(encoding="utf-8")):
                    n_addr += 1
                    if not addr.lower().endswith(RESERVED_EMAIL_DOMAINS):
                        p.append(f"{ctx.rel(fp)} uses non-reserved address domain")
        return p, (f"{len(toks)} tokens, {len(whole)}+{len(wsn)} whole keys; {len(docs)} workshop states caught; "
                   f"{len(cols)} columns; {n_addr} addresses all on reserved domains")

    def cx18():
        p = []
        for f in dfr["flows"]:
            if not set(f.get("tests", [])) <= ctx.catalog_ids:
                p.append(f"{f['id']} tests {set(f['tests']) - ctx.catalog_ids}")
        idx = strict_load(ctx.fix_dir / "index.json")
        for e in idx["fixtures"]:
            if not set(e.get("covers", [])) <= ctx.catalog_ids:
                p.append(f"fixture {e['file']} covers unknown check")
        cand = {a + "%02d" % i for a in "ABCDEFGHIJKLMNOPQRSTUVWXYZ" for i in range(100)}
        pat = ecma_re(wh["properties"]["task_id"]["pattern"])
        accepted = {c for c in cand if pat.fullmatch(c)}
        if accepted != ctx.task_ids:
            p.append(f"worker-handoff task_id pattern vs tasks.json: {sorted(accepted ^ ctx.task_ids)}")
        return p, f"task_id pattern accepts exactly {len(accepted)} IDs"

    def cx19():
        p = []
        check_re = re.compile(r"\b((?:BASE|AUTH|INF|WK|UX|MED|EV|MAIL|AUTO|PAY|BOOK|CNT|SEO|ADS|OPS|REL|GROW|HAND)\d\d)\b")
        d_ids = set(re.findall(r"\bD-(\d{3}[a-z]?)\b", ctx.decisions))
        hb = set(re.findall(r"\bHB-(\d{2})", ctx.blockers))
        tb = set(re.findall(r"\bTB-(\d{2})", ctx.blockers))
        clip_ids = {"W%02d" % i for i in range(5, 12)}
        texts = dict(md)
        for f in REGISTRIES.values():
            texts[f] = (ctx.C / f).read_text(encoding="utf-8")
        texts["README.md"] = getattr(ctx, "readme", "")
        n_refs = 0
        for name, t in texts.items():
            for c in set(check_re.findall(t)) - ctx.catalog_ids:
                p.append(f"{name}: check {c} not in acceptance_catalog.json")
            for d in set(re.findall(r"\bD-(\d{3}[a-z]?)\b", t)) - d_ids:
                p.append(f"{name}: D-{d} not in decisions.md")
            for h in set(re.findall(r"\bHB-(\d{2})", t)) - hb:
                p.append(f"{name}: HB-{h} not in blockers.md")
            for h in set(re.findall(r"\bTB-(\d{2})", t)) - tb:
                p.append(f"{name}: TB-{h} not in blockers.md")
            for tk in set(re.findall(r"\b([FDPWCUNRHLO]\d\d)\b", t)) - ctx.task_ids - clip_ids:
                p.append(f"{name}: task {tk} not in tasks.json")
            n_refs += len(set(check_re.findall(t))) + len(set(re.findall(r"\bD-\d{3}", t))) + len(set(re.findall(r"\b(?:HB|TB)-\d{2}", t)))
        return p, f"{len(texts)} files, {n_refs} distinct check/decision/blocker references resolved"

    def cx20():
        p = []
        b = ee["budget"]
        q, hs, sb, orr, pm = (b["provider_daily_quota"]["value"], b["hard_stop"]["value"], b["soft_daily_budget"]["value"],
                              b["operational_reserved"]["value"], b["promotional_max"]["value"])
        if not (orr < sb < hs < q == 300 and pm == sb - orr):
            p.append(f"budget ordering {[orr, sb, hs, q, pm]}")
        op = [t["priority"] for t in ee["templates"] if t["proposed_class"] == "operational"]
        pr = [t["priority"] for t in ee["templates"] if t["proposed_class"] == "promotional"]
        if not max(op) < min(pr):
            p.append("operational and promotional priorities overlap")
        return p

    def cx21():
        p = []
        pats = [(r"`examples/(valid|invalid)/([a-z-]+)/`\s*\((?:[^)\d]*?)(\d+)", None),
                (r"`examples/(valid|invalid)/([a-z-]+)/`\s*holds (\d+) files", None)]
        n_stated = 0
        for name, text in md.items():
            for pat, _ in pats:
                for kind, sch, n in re.findall(pat, text):
                    n_stated += 1
                    actual = len(ctx.examples.get((kind, sch), []))
                    if int(n) != actual:
                        p.append(f"{name} says examples/{kind}/{sch}/ has {n}, found {actual}")
        m = re.search(r"(\d+) math fixtures \(WM01", md.get("workshop-math.md", ""))
        nwm = len(list(ctx.fix_dir.glob("WM*.json")))
        if not m or int(m.group(1)) != nwm:
            p.append(f"workshop-math.md fixture count vs {nwm}")
        cr = strict_load(ctx.fix_dir / "clip-rules.json")
        m = re.search(r"(\d+)-row truth table, (\d+) supplementary cases and (\d+) media-state cases", md.get("workshop-clip-rules.md", ""))
        got = (len(cr["truth_table"]), len(cr["supplementary_cases"]), len(cr["media_state_cases"]))
        if not m or tuple(map(int, m.groups())) != got:
            p.append(f"workshop-clip-rules.md counts vs {got}")
        return p, f"{n_stated} stated example counts + fixture and clip counts"

    def cx22():
        p = []
        am_clip = ecma_re(am_entry["asset_id"]["pattern"])
        env_c = ecma_re(env["$defs"]["resource_content_version"]["pattern"])
        for c in CLIP_BRANCH + ["W00", "W11"]:
            if not am_clip.search("clip." + c.lower()) or not env_c.search("clip." + c.lower() + ".v1"):
                p.append(f"clip.{c.lower()} not accepted by asset-manifest and envelope")
        if am_clip.search("clip.w12"):
            p.append("clip.w12 accepted")
        return p

    def cx23():
        p = []
        pats = {"stripe secret": r"\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{8,}", "stripe webhook secret": r"\bwhsec_[A-Za-z0-9]{8,}",
                "brevo key": r"\bxkeysib-[A-Za-z0-9-]{8,}", "github token": r"\b(?:ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{12,}",
                "private key": r"-----BEGIN [A-Z ]*PRIVATE KEY-----", "aws key": r"\bAKIA[0-9A-Z]{16}\b",
                "supabase service jwt": r"\beyJhbGciOi[A-Za-z0-9_-]{20,}"}
        n_files = 0
        for fp in sorted(ctx.C.rglob("*")):
            if fp.is_file() and fp.name != "validate.py":
                n_files += 1
                t = fp.read_text(encoding="utf-8", errors="replace")
                for label, pat in pats.items():
                    if re.search(pat, t):
                        p.append(f"{ctx.rel(fp)} contains a {label}-shaped string")
        return p, f"{n_files} files scanned"

    def cx24():
        """Frozen offers and forbidden stack: every prose mention of a forbidden duration/tool is a prohibition."""
        p = []
        bad_re = re.compile(r"(60[- ]minute|sixty[- ]minute|one-hour|\bzoom\b|n8n cloud|vercel hobby|custom video platform|live customer-facing llm)", re.I)
        neg_re = re.compile(r"\b(never|not|no|cannot|forbidden|forbid|refused|refuse|impossible|defect|excluded|without)\b", re.I)
        for name, text in md.items():
            for ln in text.splitlines():
                prose = re.sub(r"`[^`]*`", "", ln)
                if bad_re.search(prose) and not neg_re.search(prose):
                    p.append(f"{name}: '{prose.strip()[:90]}'")
        json_files = [ctx.C / f for f in list(SCHEMAS.values()) + list(REGISTRIES.values())]
        json_files += [f for (kind, _), fs in ctx.examples.items() if kind == "valid" for f in fs]
        for fp in json_files:
            for path, k, v in walk_json(strict_load(fp)):
                if isinstance(v, str) and bad_re.search(v) and not neg_re.search(v) and not ({"forbidden", "never_from", "not_included", "not"} & set(map(str, path))):
                    p.append(f"{ctx.rel(fp)} {'/'.join(map(str, path))}: '{v[:80]}'")
        return p

    def cx25():
        p = []
        rows = getattr(ctx, "readme_rows", [])
        readme = getattr(ctx, "readme", "")
        cx_ids = set(re.findall(r"\bCX-\d\d\b", readme))
        xl_ids = set(re.findall(r"\bXL-\d\d\b", readme))
        want_cx = {c[0] for c in CX_LIST}
        want_xl = {k[0] for k in (KNOWN_LIST or known_list(ctx))} | {k[0] for k in resolved_list(ctx)}
        if cx_ids != want_cx:
            p.append(f"README CX ids vs validate.py: {sorted(cx_ids ^ want_cx)}")
        if xl_ids != want_xl:
            p.append(f"README XL ids vs validate.py: {sorted(xl_ids ^ want_xl)}")
        if not rows:
            p.append("README index not parsed")
        return p

    def cx26():
        """Every normative md file names a status and records no approval by itself."""
        p = []
        for name, text in md.items():
            if name == "README.md":
                continue
            head = "\n".join(text.splitlines()[:12]).lower()
            if "proposed" not in head:
                p.append(f"{name}: status 'proposed' not stated in its header")
        return p

    def cx27():
        """The derived clip availability (README) is expressible in asset-manifest 1.0."""
        p = []
        needed = {"approved", "published"} <= set(am_entry["status"]["enum"])
        la = set(am_entry["language_availability"]["enum"])
        if not needed or not {"language_recorded", "captions_only"} <= la:
            p.append("asset-manifest cannot express 'available' (approved/published + language_recorded)")
        return p

    def cx30():
        """Unknown-path coverage (math review P2-1): every reason code of workshop-math.md s7 is pinned by a WM
        fixture; codes that act inside a known window are pinned with a window, a not_computable year and null
        gap and surplus (so unknown-read-as-zero is caught by the fixtures); every fixture named in s6 exists."""
        p = []
        math = md.get("workshop-math.md", "")
        s7 = section_text(math, r"^## 7\.", r"^## 8\.")
        g = re.search(r"either global \(([^)]*)\)", s7)
        global_codes = set(backticked(g.group(1))) if g else set()
        item3 = re.search(r"^3\. `incomplete_unknown_income`:(.*)$", s7, re.M)
        src_codes = set(backticked(item3.group(1))) - {"incomplete_unknown_income"} if item3 else set()
        for n in (4, 5):
            mm = re.search(rf"^{n}\. `[a-z_]+`: [^`]*`([a-z_]+)`", s7, re.M)
            if mm:
                src_codes.add(mm.group(1))
        codes = global_codes | src_codes
        if len(global_codes) < 5 or len(src_codes) < 8:
            p.append(f"workshop-math.md s7 reason codes not parsed (global {sorted(global_codes)}, source {sorted(src_codes)})")
        no_window = {"current_age_unknown", "retirement_age_unknown"}
        fx = ctx.fixture_docs()
        pinned = {}
        for fname, d in fx.items():
            ex = d.get("expected", {})
            for c in codes:
                hit = lambda r: r == c or r.startswith(c + ":")  # noqa: E731
                if c in no_window:
                    ok = ex.get("window") is None and any(hit(r) for r in ex.get("completeness", {}).get("reasons", []))
                else:
                    ok = ex.get("window") is not None and any(
                        y.get("status") == "not_computable" and y.get("gap_cents") is None and y.get("surplus_cents") is None
                        and any(hit(r) for r in y.get("reasons", [])) for y in ex.get("years", []))
                if ok:
                    pinned.setdefault(c, []).append(d.get("fixture_id", fname[:4]))
        for c in sorted(codes - set(pinned)):
            p.append(f"reason code {c} is pinned by no WM fixture " + ("(window null, code in completeness.reasons)" if c in no_window
                     else "(known window, a not_computable year with null gap and surplus carrying the code)"))
        s6 = section_text(math, r"^## 6\.", r"^## 7\.")
        cr = strict_load(ctx.fix_dir / "clip-rules.json")
        cs_ids = {c.get("case") for c in cr.get("supplementary_cases", [])}
        wm_ids = {d.get("fixture_id") for d in fx.values()}
        n_rows = 0
        for cells in table_rows(s6):
            if len(cells) < 3 or cells[0] in ("Unknown input",):
                continue
            n_rows += 1
            for ref in re.findall(r"\b(WM\d\d|CS\d\d)\b", cells[2]):
                if ref not in (wm_ids if ref.startswith("WM") else cs_ids):
                    p.append(f"workshop-math.md s6 row '{cells[0][:30]}' names {ref}, which does not exist")
            if not re.search(r"\b(WM\d\d|CS\d\d)\b", cells[2]):
                p.append(f"workshop-math.md s6 row '{cells[0][:30]}' names no pinning fixture")
        return p, f"{len(codes)} reason codes pinned; s6 rows {n_rows}; " + ", ".join(f"{c}:{'/'.join(v[:3])}" for c, v in sorted(pinned.items()) if c in {
            "spending_unknown", "start_unknown", "start_unresolvable", "end_unknown", "end_unresolvable", "income_list_partial", "retirement_age_unknown"})

    # README s2a activation gates (A6D2-09). Baseline for every workflow export: approval-scopes.md s2, row "Code,
    # workflow exports, migrations" = A6 technical verification, G2 to connect credentials, G6 to activate.
    # A row adds the production gates (feature-flags 1.0 enable_gates) of every capability it names, plus the
    # extra gates below, each of which the row must justify with the citation given.
    WF_BASELINE_GATES = {"G2", "G6"}
    WF_EXTRA_GATES = {"WF11": ({"G5"}, "operational-data-model.md §5")}
    RULE_ID_SKIP = {"D", "HB", "TB", "A6D", "A6D2", "XL", "CX", "NC"}  # decisions and blockers: CX-19; review and index IDs

    def md_sections(text):
        """{section number: (heading, body)} for the '## N.' headings of a contract md file."""
        out = {}
        for m in re.finditer(r"^## (\d+)\.\s*([^\n]*)\n(.*?)(?=^## |\Z)", text, re.M | re.S):
            out[m.group(1)] = (m.group(2), m.group(3))
        return out

    def section_citations(cell):
        """(file, section, label) for every 'x.md §N [label]' in a cell. A bare §N continues the file named earlier
        in the same ';' clause. The label is a parenthesis right after §N, or the lowercase words that follow it."""
        found = []
        for clause in cell.split(";"):
            cur = None
            for m in re.finditer(r"([a-z][a-z-]*\.md)|§(\d+)(?:\s*\(([^)]*)\)|((?:\s+(?!to\b|and\b|or\b)[a-z][a-z_-]*)+))?", clause):
                if m.group(1):
                    cur = m.group(1)
                elif cur:
                    found.append((cur, m.group(2), (m.group(3) or m.group(4) or "").strip()))
        return found

    def rule_ids(cell):
        """Every hyphenated rule ID in a cell, with 'X-1 to 3', 'X-1 to X-3' and 'X-1 and 2' expanded."""
        ids = []
        rx = r"\b([A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*)-(\d+)\b(?:\s+(to|and)\s+(?:\1-)?(\d+)\b)?"
        for m in re.finditer(rx, cell):
            pre, a = m.group(1), int(m.group(2))
            if pre in RULE_ID_SKIP:
                continue
            b = int(m.group(4)) if m.group(4) else a
            nums = range(a, b + 1) if m.group(3) == "to" else sorted({a, b})
            ids += [f"{pre}-{n}" for n in nums]
        return ids

    def cx31():
        """Workflow trace (A6D-12, A6D2-09): README s2a names exactly the 14 workflows of 04 s5, in order; every task,
        event type, template, capability, flag, operation, rule ID and check it cites exists; every 'x.md §N' citation
        names an existing section whose text holds the label cited with it; every row gives an activation gate equal to
        the approval-scopes.md s2 baseline plus the production gates of its capabilities; every event type, template
        and operation is traced by at least one workflow."""
        p = []
        readme = getattr(ctx, "readme", "")
        sec = section_text(readme, r"^## 2a\. Workflow trace", r"^## ")
        want = re.findall(r"^\| (WF\d\d|SM\d\d) — ", ctx.src04, re.M)
        rows = [c for c in table_rows(sec) if c and re.match(r"(WF\d\d|SM\d\d)\b", c[0])]
        got = [re.match(r"(WF\d\d|SM\d\d)", c[0]).group(1) for c in rows]
        if len(want) != 14 or got != want:
            p.append(f"workflow rows {got} != 04 s5 {want}")
        odm_ops = set(re.findall(r"`(op_[a-z_]+)\(", section_text(md.get("operational-data-model.md", ""), r"^## 4\.", r"^## 5\.")))
        tpl_ids = {t["id"] for t in ee["templates"]}
        corpus = "\n".join(v for k, v in md.items() if k != "README.md")
        corpus += "\n".join((ctx.C / f).read_text(encoding="utf-8") for f in list(REGISTRIES.values()) + list(SCHEMAS.values()))
        secs = {f: md_sections(t) for f, t in md.items()}
        seen_types, seen_tpl, seen_ops, n_cit, n_rid = set(), set(), set(), 0, 0
        for c in rows:
            if len(c) < 9:
                p.append(f"{c[0][:4]}: expected 9 cells, found {len(c)}")
                continue
            wf, task, ev, tpl, capc, ops, gate, rules_c, checks = c[:9]
            wid = wf[:4]
            for tk in re.findall(r"\b([FDPWCUNRHLO]\d\d)\b", task):
                if tk not in ctx.task_ids:
                    p.append(f"{wid}: task {tk} not in tasks.json")
            if not re.search(r"\b[FDPWCUNRHLO]\d\d\b", task):
                p.append(f"{wid}: no owning task")
            for t in backticked(ev):
                if t in types:
                    seen_types.add(t)
                elif re.fullmatch(r"[a-z]+\.[a-z_]+", t) and t not in sources:
                    p.append(f"{wid}: event type {t} not in event-envelope 1.0")
            for e in e_range(tpl):
                if e.upper() not in tpl_ids:
                    p.append(f"{wid}: template {e.upper()} not in email-eligibility.json")
                seen_tpl.add(e.upper())
            row_caps = []
            for t in backticked(capc):
                if t in caps:
                    row_caps.append(t)
                elif t not in flags:
                    p.append(f"{wid}: {t} is neither a capability nor a flag of feature-flags 1.0")
            for o in re.findall(r"`(op_[a-z_]+)`", ops):
                if o not in odm_ops:
                    p.append(f"{wid}: operation {o} not defined in operational-data-model.md s4")
                seen_ops.add(o)
            # activation gate (A6D2-09)
            extra, cite = WF_EXTRA_GATES.get(wid, (set(), ""))
            want_g = set(WF_BASELINE_GATES) | extra
            for cap in row_caps:
                want_g |= set(caps[cap]["enable_gates"] or [])
            got_g = set(re.findall(r"\bG[0-6]\b", gate))
            if "A6" not in gate or got_g != want_g:
                p.append(f"{wid}: activation gate {sorted(got_g)} (A6 named: {'A6' in gate}) != baseline G2, G6 + capability "
                         f"gates + extras = {sorted(want_g)}")
            if cite and cite not in gate:
                p.append(f"{wid}: activation gate adds {sorted(extra)} without citing {cite}")
            # section citations and rule IDs, in every cell of the row
            for cell in (ev, tpl, capc, ops, gate, rules_c):
                for f, n, label in section_citations(cell):
                    n_cit += 1
                    if f not in secs:
                        p.append(f"{wid}: cites {f} §{n}, but {f} is not a contract file")
                        continue
                    if n not in secs[f]:
                        p.append(f"{wid}: cites {f} §{n}, which does not exist")
                        continue
                    head, body = secs[f][n]
                    text = (head + " " + body).lower()
                    stems = [w[:5] for w in re.findall(r"[a-z]{4,}", label.lower())]
                    missing = [w for w in stems if w not in text]
                    if missing:
                        p.append(f"{wid}: cites {f} §{n} for '{label}', but §{n} ('{head}') does not hold it")
                for rid in rule_ids(cell):
                    n_rid += 1
                    if not re.search(r"(?<![A-Za-z0-9-])" + re.escape(rid) + r"(?![0-9])", corpus):
                        p.append(f"{wid}: rule ID {rid} is not defined in any contract file")
            for ck in re.findall(r"\b([A-Z]{2,4}\d\d)\b", checks):
                if ck not in ctx.catalog_ids:
                    p.append(f"{wid}: check {ck} not in acceptance_catalog.json")
        if set(types) - seen_types:
            p.append(f"event types traced by no workflow: {sorted(set(types) - seen_types)}")
        if tpl_ids - seen_tpl:
            p.append(f"templates traced by no workflow: {sorted(tpl_ids - seen_tpl)}")
        if odm_ops - seen_ops:
            p.append(f"operations traced by no workflow: {sorted(odm_ops - seen_ops)}")
        return p, (f"{len(rows)} workflows; {len(seen_types)} event types, {len(seen_tpl)} templates, {len(seen_ops)} operations "
                   f"traced; {n_cit} section citations and {n_rid} rule IDs resolved; activation gates checked")

    global CX_LIST
    CX_LIST = [
        ("CX-01", "one contract version 1.0 across schemas, registries and fixtures", cx01),
        ("CX-02", "the same five human approver roles everywhere; no agent role can approve", cx02),
        ("CX-03", "one gate vocabulary G0-G6", cx03),
        ("CX-04", "locales are fr or en (asset-manifest adds zxx, see XL-02)", cx04),
        ("CX-05", "event types = 04 s3; md job map = registry triggers; suppressions follow their events", cx05),
        ("CX-06", "per-type subject, resource, sources and consent: md = schema; authority sources fixed", cx06),
        ("CX-07", "consent binding: consent types, promotional templates and purposes agree", cx07),
        ("CX-08", "templates e01-e16: job enum = registry = capability union = envelope = asset IDs", cx08),
        ("CX-09", "six flags and seventeen capabilities: feature-flags.md tables = JSON consts; no stray flag", cx09),
        ("CX-10", "job states, error, defer and suppression codes, op_* names and audit actions agree", cx10),
        ("CX-11", "four offers; meeting types 15 and 30 minutes everywhere; no 60-minute const", cx11),
        ("CX-12", "route keys: lib/routes.ts = routes.md = asset-manifest = offer-matrix meeting-link lists", cx12),
        ("CX-13", "resource codes: no digit in registry keys; contact-subject codes closed (PB-ID-3) and hash-only; PB-ID-5 mapped to tests", cx13),
        ("CX-14", "internal ID prefixes and alphabet agree; purpose_key embeds the template_version form", cx14),
        ("CX-15", "review-hash methods: asset-manifest enum = approval-scopes s4.2", cx15),
        ("CX-16", "authoritative instances cite only real, recorded human answers for the named gate; fixtures only fixture: refs", cx16),
        ("CX-17", "no-financial-data boundary: PB-SCAN lists, schemas, examples, fixtures, data model, register", cx17),
        ("CX-18", "check IDs, fixture coverage and the handoff task_id pattern match the catalog and tasks.json", cx18),
        ("CX-19", "every cited check, decision, blocker and task ID exists", cx19),
        ("CX-20", "Brevo budget ordering and priority bands", cx20),
        ("CX-21", "example and fixture counts stated in the md files match the files", cx21),
        ("CX-22", "workshop clip IDs are expressible in asset-manifest and envelope", cx22),
        ("CX-23", "no credential-shaped string in any contract file", cx23),
        ("CX-24", "frozen offers and forbidden stack appear only as prohibitions", cx24),
        ("CX-25", "README lists exactly the CX and XL ids this harness implements", cx25),
        ("CX-26", "every normative md file states it is proposed", cx26),
        ("CX-27", "clip availability can be derived from asset-manifest 1.0", cx27),
        ("CX-28", "text hygiene: UTF-8, LF, no BOM (checked in S1)", None),
        ("CX-29", "the three lane validation logs still describe the current bytes (checked in S7b)", None),
        ("CX-30", "every workshop reason code is pinned by a fixture with null values, never 0; s6 fixture references exist", cx30),
        ("CX-31", "README workflow trace: the 14 workflows of 04 s5, every cited name exists, every event, template and operation traced", cx31),
    ]
    return CX_LIST


CX_LIST: list = []


def s6_invariants(ctx: Ctx):
    R.section("S6. Cross-contract invariants (README 'Cross-contract invariants')")
    for cid, title, fn in cx_checks(ctx):
        if fn is None:
            continue
        note = ""
        try:
            res = fn()
            probs, note = res if isinstance(res, tuple) else (res, "")
        except Exception as exc:  # noqa: BLE001
            probs = [f"check crashed: {type(exc).__name__}: {exc}"]
        R.check(not probs, f"{cid} {title}" + (f" [{note}]" if note else ""), probs[:8])


# ----------------------------------------------------------------------------------------------
# S7 known cross-lane items: must reproduce exactly; if one no longer does, README is stale
# ----------------------------------------------------------------------------------------------
def known_list(ctx: Ctx):
    env = ctx.schemas["event-envelope"]
    am_entry = ctx.schemas["asset-manifest"]["$defs"]["entry"]["properties"]
    flags, caps = ff_consts(ctx)
    ee = ctx.reg["email-eligibility"]
    md = ctx.md

    def xl02():
        return "zxx" in am_entry["locale"]["enum"] and "zxx" not in env["properties"]["locale"]["enum"], "asset locale zxx has no envelope locale"

    def xl03():
        mentioned = any("workshop_capital_illustration" in md.get(f, "") for f in ("workshop-math.md", "workshop-inputs.md"))
        return mentioned and "workshop_capital_illustration" not in flags, "workshop_capital_illustration is named but not a flag"

    def xl04():
        names = {k for s in ctx.schemas.values() for k in ("schema_version", "contract_version") if k in s["properties"]}
        return names == {"schema_version", "contract_version"}, f"version field names {sorted(names)}"

    def xl05():
        both = all("$schema" in ctx.schemas[n] for n in ("offer-matrix", "feature-flags"))
        auth = (ctx.C / "examples/valid/offer-matrix/authoritative-2026-09-30.json").exists()
        return both and auth, "offer-matrix.json/feature-flags.json are schemas; authoritative instance under examples/valid/"

    def xl06():
        return all(d.get("registry_schema", "").startswith(".orchestration/evidence/") for d in ctx.reg.values()), "registry schemas under evidence/"

    def xl07():
        d = getattr(ctx, "why_dialects", Counter())
        return set(d) == {"data", "offers", "math"}, f".why dialects {dict(d)}"

    def xl08():
        return "W01/W05" in md.get("workshop-inputs.md", "") and "W05" not in ctx.task_ids, "workshop-inputs.md cites task W05, which does not exist"

    def xl10():
        return ("belongs to W03/C10" in md.get("workshop-clip-rules.md", "")
                and "should use the same schema" in md.get("asset-manifest.md", "")), "two owners for the media manifest shape"

    def xl12():
        nm = ctx.schemas["offer-matrix"]["properties"]["rules"]["properties"]["no_mandatory_funnel_staircase"]["properties"]
        lists = set(nm["must_link_to_meeting"]["const"]) | set(nm["exempt_from_meeting_link"]["const"])
        return "articles" in lists and "ask" not in lists and "ask" in am_entry["intended_route_key"]["enum"], "pseudo-key 'articles'; 'ask' unlisted"

    def xl13():
        pb = md.get("privacy-boundary.md", "")
        row = next((c for c in table_rows(section_text(pb, r"^## 3\.", r"^## 4\.")) if c and c[0] == "Stripe"), None)
        dfr = ctx.reg["data-flow-register"]
        contact = next(d for d in dfr["data_classes"] if d["id"] == "DC-CONTACT")
        return bool(row) and row[2] == "C" and "stripe" not in contact["allowed_sinks"], "sink matrix C vs register allowed_sinks for DC-CONTACT/Stripe"

    def xl14():
        f00 = ctx.orch / "handoffs" / "F00.json"
        if not f00.exists():
            return False, "F00.json missing"
        errs = top_errors(ctx.validators["worker-handoff"], strict_load(f00))
        return len(errs) == 6, f"F00.json has {len(errs)} top-level errors against worker-handoff 1.0"

    def xl15():
        text = "".join(v for k, v in md.items() if k != "README.md")
        labels = {r for r in getattr(ctx, "why_rules", {}).get("workshop-inputs", set()) if r not in text}
        return labels == {"ASSET", "ASSUMPTION", "BASIS", "LABEL", "NONFINITE", "PRIVACY", "RANGE", "START", "UNITS"}, f"undefined rule labels {sorted(labels)}"

    def xl16():
        tv = ecma_re(env["$defs"]["resource_template_version"]["pattern"])
        jv = ecma_re(ctx.schemas["delivery-job"]["properties"]["template_version"]["pattern"])
        return bool(tv.search("template.e01.v1")) and not jv.search("v1"), "delivery.failed may cite a v-form template version jobs never hold"

    def xl18():
        """04 s4 (truthful queued/accepted state, no false success when storage is down) and 04 s5 (one dispatcher,
        no per-person Wait node, model work never blocks payment or email) are restated in no contract."""
        text = "\n".join(v for k, v in md.items() if k != "README.md")
        text += "\n".join((ctx.C / f).read_text(encoding="utf-8") for f in REGISTRIES.values())
        s4 = re.search(r"false success|truthful (?:queued|accepted)", text, re.I)
        s5 = re.search(r"wait node|one dispatcher|single dispatcher|block(?:s)? (?:the )?payment", text, re.I)
        return not s4 and not s5, "04 s4 truthful-state rule and 04 s5 dispatcher rules appear in no contract file"

    def xl19():
        """PB-ID-3 closes the guide key set; asset manifest 1.0 accepts any guide key and names none."""
        pb3 = next((ln for ln in md.get("privacy-boundary.md", "").splitlines() if ln.startswith("| PB-ID-3 |")), "")
        closed = "`retirement-guide`" in pb3
        aid = ecma_re(am_entry["asset_id"]["pattern"])
        am_text = md.get("asset-manifest.md", "") + (ctx.C / "asset-manifest.schema.json").read_text(encoding="utf-8")
        return (closed and bool(aid.search("guide.pre-retirement-guide")) and "retirement-guide" not in am_text,
                "PB-ID-3 guide key retirement-guide is closed; asset-manifest accepts guide.pre-retirement-guide and names no guide key")

    def xl20():
        """bookings.offer_id holds offer-matrix meeting-type IDs, and book-consultation-30 is not an offer ID."""
        odm = md.get("operational-data-model.md", "")
        m = re.search(r"^\s*offer_id\s+text[^\n]*--\s*([^\n]+)$", section_text(odm, r"^## 2\.", r"^## 3\."), re.M)
        vals = set(re.findall(r"'([a-z0-9-]+)'", m.group(1))) if m else set()
        om = ctx.schemas["offer-matrix"]
        offer_ids = set(om["properties"]["offers"].get("required", [])) or set(OFFERS)
        mt_ids = set(om["properties"]["meeting_types"].get("required", [])) or set(MEETING_TYPES)
        return (bool(vals) and vals <= mt_ids and not vals <= offer_ids,
                f"bookings.offer_id values {sorted(vals)}; not offer IDs: {sorted(vals - offer_ids)}")

    global KNOWN_LIST
    KNOWN_LIST = [
        ("XL-02", "asset-manifest locale zxx has no event-envelope locale", xl02),
        ("XL-03", "workshop_capital_illustration flag is named but absent from feature-flags 1.0", xl03),
        ("XL-04", "version field is schema_version in three schemas, contract_version in the others", xl04),
        ("XL-05", "offer-matrix.json and feature-flags.json are schemas; the authoritative offer matrix is under examples/valid/", xl05),
        ("XL-06", "registry schemas live under evidence/, not contracts/", xl06),
        ("XL-07", "three .why.txt dialects", xl07),
        ("XL-08", "Wnn clip IDs collide with Wnn task IDs; workshop-inputs.md cites a non-existent task W05", xl08),
        ("XL-10", "media-manifest shape has two proposed owners (W03/C10 vs asset-manifest 1.0)", xl10),
        ("XL-12", "offer-matrix meeting-link lists use pseudo-key 'articles' and omit 'ask'", xl12),
        ("XL-13", "privacy sink matrix and data-flow register draw the DC-CONTACT/Stripe boundary differently", xl13),
        ("XL-14", "handoffs/F00.json does not conform to worker-handoff 1.0 (6 errors)", xl14),
        ("XL-15", "math-lane .why.txt rule labels are not defined as rule IDs in workshop-inputs.md", xl15),
        ("XL-16", "delivery.failed resource may carry a v-form template version; jobs only hold h-form", xl16),
        ("XL-18", "04 s4 and s5 runtime rules (truthful queued state; one dispatcher, no per-person Wait node) restated in no contract", xl18),
        ("XL-19", "guide key closed by PB-ID-3 but free and unnamed in asset manifest 1.0", xl19),
        ("XL-20", "the data model's bookings.offer_id holds offer-matrix meeting-type IDs, not offer IDs", xl20),
    ]
    return KNOWN_LIST


KNOWN_LIST: list = []


def resolved_list(ctx: Ctx):
    """README s5.2: items fixed by the lanes' repair attempt 2. Each probe returns (still_resolved, detail)."""
    env = ctx.schemas["event-envelope"]
    am_entry = ctx.schemas["asset-manifest"]["$defs"]["entry"]["properties"]
    flags, caps = ff_consts(ctx)
    ee = ctx.reg["email-eligibility"]
    md = ctx.md

    def r01():
        env_pat = env["$defs"]["resource_content_version"]["pattern"]
        am_pat = am_entry["asset_id"]["pattern"]
        env_c = ecma_re(env_pat)
        samples = ["capsule.s01", "companion.s18", "clip.w11", "case.c10", "ink.a08", "template.e16", "ad.rt03", "article.key",
                   "page.key", "guide.key", "book.key", "event.key", "copy.key"]
        gap = [s for s in samples if not env_c.search(s + ".v1")]
        copy_ok = am_pat.endswith("$") and env_pat.startswith(am_pat[:-1] + "\\.")
        return not gap and copy_ok, f"content kinds rejected {gap}; envelope ID alternation copies asset_id pattern: {copy_ok}"

    def r09():
        am = md.get("authority-matrix.md", "")
        am4 = next((ln for ln in am.splitlines() if "AM-CONSENT-4" in ln), "")
        psc = [c for c in ee["common_pre_send_checks"] if re.match(r"PSC-\d:", c)]
        a = "job-state-machine.md PSC" not in am and "PSC-1 to PSC-7" in am4 and len(psc) == 7
        odm = md.get("operational-data-model.md", "")
        rem = next((ln for ln in odm.splitlines() if ln.strip().startswith("remade_as")), "")
        jsm5 = section_text(md.get("job-state-machine.md", ""), r"^## 5\.", r"^## 6\.")
        b = "job-state-machine.md §5" in rem and "Remade events" in jsm5
        return a and b, f"AM-CONSENT-4 cites PSC-1 to PSC-7 ({len(psc)} defined): {a}; remade_as cites job-state-machine.md §5: {b}"

    def r11():
        a = "workshop_followup" in flags["marketing_dispatch"]["controls"]
        gate2 = [f"{fl}:{c}" for c, v in caps.items() for fl in (v["controlling_flags"] or [])
                 if fl != "public_launch" and c not in (flags[fl]["controls"] or [])]
        row = next((ln for ln in md.get("feature-flags.md", "").splitlines() if ln.startswith("| `marketing_dispatch` |")), "")
        b = "E02" in row and "promotional E09" in row
        e09 = next(t for t in ee["templates"] if t["id"] == "E09")
        psc3 = next((c for c in ee["common_pre_send_checks"] if c.startswith("PSC-3:")), "")
        c = ("marketing_dispatch" in (e09.get("alternate_class") or {}).get("additional_controlling_flags", [])
             and "every promotional job" in psc3 and "marketing_dispatch" in psc3)
        return a and not gate2 and b and c, (f"marketing_dispatch controls workshop_followup: {a}; FF-GATE-2 gaps {gate2}; "
                                             f"E02 and promotional E09 documented in the flag row: {b}; E09 alternate class and PSC-3 carry marketing_dispatch: {c}")

    def r17():
        odm = md.get("operational-data-model.md", "")
        pb = section_text(md.get("privacy-boundary.md", ""), r"^## 5\.", r"^## 6\.")
        diffs = []
        for odm_label, pb_label in (("financial", "Financial"), ("age and health", "Age and health"),
                                    ("derived selections", "Derived selections"), ("identity and device", "Identity and device")):
            mo = re.search(re.escape(odm_label) + r" \(`([^`]+)`\)", odm)
            mp = re.search(r"^- " + pb_label + r": `([^`]+)`", pb, re.M)
            if not mo or not mp or set(mo.group(1).split()) != set(mp.group(1).split()):
                diffs.append(odm_label)
        return not diffs, f"PB-SCAN-1 lists differing between operational-data-model.md s3 and privacy-boundary.md s5: {diffs}"

    return [
        ("XL-01", "envelope resource_content_version accepts every asset-manifest 1.0 asset ID (data lane, A6D-06)", r01),
        ("XL-09", "AM-CONSENT-4 and the data model's remade_as comment cite the right places (data lane)", r09),
        ("XL-11", "marketing_dispatch controls workshop_followup and stops every promotional job, E09 included (data lane, A6D-07)", r11),
        ("XL-17", "the data model's PB-SCAN-1 lists equal privacy-boundary.md s5 (data lane, A6D-05)", r17),
    ]


def s7_known(ctx: Ctx):
    R.section("S7. Cross-lane items (README s5): open items must still reproduce; resolved items must stay resolved")
    for kid, title, fn in known_list(ctx):
        try:
            still, detail = fn()
        except Exception as exc:  # noqa: BLE001
            still, detail = False, f"probe crashed: {type(exc).__name__}: {exc}"
        if still:
            R.known(f"{kid} {title} ({detail})")
        else:
            R.bad(f"{kid} no longer reproduces as described ({detail}): update README.md and validate.py KNOWN_LIST")
    for kid, title, fn in resolved_list(ctx):
        try:
            ok, detail = fn()
        except Exception as exc:  # noqa: BLE001
            ok, detail = False, f"probe crashed: {type(exc).__name__}: {exc}"
        R.check(ok, f"{kid} resolved and still resolved: {title} ({detail})", None if ok else f"{kid} regressed; see README s5.2")


# ----------------------------------------------------------------------------------------------
# lane evidence drift (part of S7 output)
# ----------------------------------------------------------------------------------------------
def s7b_drift(ctx: Ctx):
    R.section("S7b. Lane evidence drift: sha256 recorded in the three lane logs vs current bytes")
    for log in LANE_LOGS:
        p = ctx.repo / log
        if not p.exists():
            R.bad(f"{log} missing")
            continue
        entries = re.findall(r"^\s*([0-9a-f]{64})\s+(\S+)\s*$", p.read_text(encoding="utf-8"), re.M)
        drift, missing = [], []
        for h, rel in entries:
            q = ctx.resolve_logged(rel)
            if not q.exists():
                missing.append(rel)
            elif sha256_file(q) != h:
                drift.append(rel)
        R.check(entries and not drift and not missing, f"CX-29 {log}: {len(entries)} recorded hashes match current files",
                (drift + missing)[:8])


# ----------------------------------------------------------------------------------------------
# S8 negative controls: prove the checks are not vacuous
# ----------------------------------------------------------------------------------------------
def run_cx(ctx: Ctx, cid: str) -> list:
    res = next(c for c in cx_checks(ctx) if c[0] == cid)[2]()
    return res[0] if isinstance(res, tuple) else res


def s8_negative_controls(ctx: Ctx):
    R.section("S8. Negative controls (injected defects must be caught)")
    om_v = ctx.validators["offer-matrix"]
    auth = strict_load(ctx.C / "examples/valid/offer-matrix/authoritative-2026-09-30.json")
    m = copy.deepcopy(auth)
    m["meeting_types"]["book-consultation-30"]["duration_minutes"] = 60
    R.check(bool(top_errors(om_v, m)), "NC-1 a 60-minute book consultation is rejected by offer-matrix 1.0")
    m = copy.deepcopy(auth)
    m["offers"]["book-bundle"]["price"] = {"model": "paid", "status": "pending", "value": {"amount_minor": 2500, "currency": "CAD"}, "approvals": []}
    R.check(bool(top_errors(om_v, m)), "NC-2 an invented price while pending is rejected (OM-PRICE-1)")
    saved = ctx.reg["email-eligibility"]
    ctx.reg["email-eligibility"] = copy.deepcopy(saved)
    e05 = next(t for t in ctx.reg["email-eligibility"]["templates"] if t["id"] == "E05")
    if "already_booked" in e05["suppressions"]:
        e05["suppressions"].remove("already_booked")
    R.check(any("E05 lacks already_booked" in x for x in run_cx(ctx, "CX-05")), "NC-3 dropping already_booked from E05 is caught by CX-05")
    ctx.reg["email-eligibility"] = saved
    vocab = getattr(ctx, "math_vocab", parse_math_vocab(ctx))
    wm = strict_load(ctx.fix_dir / "WM08-unknown-amount-later-start.json")
    wm["expected"]["clip"]["selected"] = "W07"
    R.check(any("precedence gives" in x for x in fixture_problems(ctx, wm, None, vocab)),
            "NC-4 a fixture whose clip ignores precedence (W07 over W06) is caught")
    wm = strict_load(ctx.fix_dir / "WM07-unknown-income-not-answered.json")
    for y in wm["expected"]["years"]:
        y["gap_cents"] = 0
    R.check(any("unknown must never be 0" in x for x in fixture_problems(ctx, wm, None, vocab)),
            "NC-5 an unknown gap written as 0 is caught")
    ev = strict_load(ctx.C / "examples/valid/event-envelope/workshop-completed.json")
    ev["gap"] = 120000
    toks, whole, wsn = pb_scan_lists(ctx)
    R.check(bool(top_errors(ctx.validators["event-envelope"], ev)) and bool(pb_hits(ev, toks, whole | wsn)),
            "NC-6 a workshop.completed carrying a gap is rejected by the schema and caught by PB-SCAN")
    saved_s = ctx.schemas["feature-flags"]
    ctx.schemas["feature-flags"] = copy.deepcopy(saved_s)
    ctx.schemas["feature-flags"]["properties"]["flags"]["properties"]["marketing_dispatch"]["properties"]["env_var"]["const"] = "NEWSLETTER"
    R.check(any("feature-flags.md s2 row marketing_dispatch" in x for x in run_cx(ctx, "CX-09")),
            "NC-7 a flag env_var differing from feature-flags.md is caught by CX-09")
    ctx.schemas["feature-flags"] = saved_s
    h = strict_load(ctx.C / "examples/valid/worker-handoff/normalized-f00-subset.json")
    h["status"] = "accepted"
    R.check(bool(top_errors(ctx.validators["worker-handoff"], h)), "NC-8 a handoff that marks itself accepted is rejected")
    # NC-9 (A6D-13): an invented price citing a real but unrelated decision row, and one citing a missing row
    auth_p = ctx.C / "examples/valid/offer-matrix/authoritative-2026-09-30.json"
    hits = []
    for did, want in (("D-032", "is not a recorded answer"), ("D-099", "cites missing")):
        m = copy.deepcopy(auth)
        m["gate_records"] = [{"record_id": "gr-01", "gate": "G0", "covers": "price",
                              "record_ref": f".orchestration/decisions.md#{did}", "recorded_by_role": "bill", "recorded_on": "2026-09-30"}]
        m["offers"]["book-bundle"]["price"].update(status="recorded", value={"amount_minor": 4995, "currency": "CAD"},
                                                   approvals=[{"gate": "G0", "record_id": "gr-01"}])
        ctx.doc_overrides = {auth_p: m}
        hits.append(any(want in x for x in run_cx(ctx, "CX-16")))
        ctx.doc_overrides = {}
    R.check(all(hits), "NC-9 a recorded price citing D-032 (a pending row) or a missing D-099 is caught by CX-16, without relying on CX-29",
            hits)
    # NC-10 (math review P2-1): a fixture suite that no longer pins an unknown start with null values is caught
    fx = copy.deepcopy(ctx.fixture_docs())
    for d in fx.values():
        for y in d["expected"]["years"]:
            if any(r.startswith("start_unknown") for r in y["reasons"]):
                y["gap_cents"], y["surplus_cents"] = 0, 0
    ctx.fixture_override = fx
    R.check(any("start_unknown" in x for x in run_cx(ctx, "CX-30")),
            "NC-10 an unknown start written as a gap of 0 in every fixture is caught by CX-30 (coverage lost)")
    ctx.fixture_override = None
    # NC-11 (A6D-12): a workflow row citing an undefined operation and a missing workflow are caught
    saved_readme = getattr(ctx, "readme", "")
    ctx.readme = saved_readme.replace("`op_prepare_send`", "`op_prepare_sendx`").replace("| SM02 ", "| SM99 ")
    probs = run_cx(ctx, "CX-31")
    R.check(any("op_prepare_sendx" in x for x in probs) and any("SM99" in x or "!= 04 s5" in x for x in probs),
            "NC-11 a workflow row with an undefined operation and a renamed workflow are caught by CX-31")
    ctx.readme = saved_readme
    # NC-12 (A6D-03): readable numbers and free words in contact-subject resource codes are rejected by the schema
    ev_v = ctx.validators["event-envelope"]
    g = strict_load(ctx.C / "examples/valid/event-envelope/guide-requested.json")
    wc = strict_load(ctx.C / "examples/valid/event-envelope/workshop-completed.json")
    g1, g2, w1 = copy.deepcopy(g), copy.deepcopy(g), copy.deepcopy(wc)
    g1["resource_id"] = "guide.retirement-guide.v65"
    g2["resource_id"] = "guide.jean-tremblay.h0123456789ab"
    w1["resource_id"] = "workshop.eight-hundred-fifty-thousand.h0123456789ab"
    R.check(all(bool(top_errors(ev_v, x)) for x in (g1, g2, w1)),
            "NC-12 an age in the guide version, a name as guide key and an amount in words as workshop key are rejected by event-envelope 1.0")
    # NC-13 (A6D2-04): a trailing newline passes Python `re` but not ECMA-262; the harness must reject it
    wr = strict_load(ctx.C / "examples/valid/event-envelope/webinar-registered.json")
    n1, n2, n3 = copy.deepcopy(g), copy.deepcopy(g), copy.deepcopy(wr)
    n1["resource_id"] += "\n"
    n2["occurred_at"] += "\n"
    n3["resource_id"] += "\n"
    plain = Draft202012Validator(ctx.schemas["event-envelope"])
    plain_accepts = [not top_errors(plain, x) for x in (n1, n2, n3)]
    harness_rejects = [bool(top_errors(ev_v, x)) for x in (n1, n2, n3)]
    R.check(all(harness_rejects),
            "NC-13 a trailing newline in resource_id (guide, wev_) or occurred_at is rejected under ECMA-262 semantics "
            f"(plain jsonschema accepts: {plain_accepts})", harness_rejects)
    # NC-14 (A6D2-09): a workflow row citing a section that does not hold the named rule, a rule ID that no contract
    # defines, and an activation gate cell that drops G6 are caught by CX-31
    ctx.readme = (saved_readme.replace("operational-data-model.md §5 retention classes", "operational-data-model.md §6 retention classes")
                  .replace("PB-CAL-1 to 3", "PB-CAL-1 to 9"))
    ctx.readme = re.sub(r"^(\| WF09 [^\n]*?\| A6; )G2, G3, G6( \|)", r"\1G2, G3\2", ctx.readme, flags=re.M)
    probs = run_cx(ctx, "CX-31")
    R.check(any("§6" in x and "retention" in x for x in probs) and any("PB-CAL-9" in x for x in probs)
            and any("WF09" in x and "activation gate" in x for x in probs),
            "NC-14 a wrong section citation (retention in data model §6), an undefined rule ID (PB-CAL-9) and an activation gate "
            "without G6 are caught by CX-31", probs[:6])
    ctx.readme = saved_readme
    cx_checks(ctx)  # restore CX_LIST bound to the original data


# ----------------------------------------------------------------------------------------------
# S9 handoffs
# ----------------------------------------------------------------------------------------------
def handoff_problems(ctx: Ctx, path: Path, deep: bool) -> list[str]:
    probs = []
    try:
        h = strict_load(path)
    except Exception as exc:  # noqa: BLE001
        return [f"strict parse: {exc}"]
    errs = top_errors(ctx.validators["worker-handoff"], h)
    probs += [f"schema {e.validator}@{ptr(e)}: {e.message[:100]}" for e in errs]
    if errs or not deep:
        return probs
    rc, head = git(ctx.repo, "rev-parse", "HEAD")
    if rc != 0 or h["base_commit"] != head.strip():
        probs.append(f"base_commit {h['base_commit']} != HEAD {head.strip()}")
    if h["task_id"] not in ctx.task_ids:
        probs.append("task_id not in tasks.json")
    if h["contract_version"] != SET_VERSION:
        probs.append("contract_version")
    for a in h["artifacts"]:
        p = ctx.repo / a["path"]
        if not p.is_file():
            probs.append(f"artifact missing {a['path']}")
        elif sha256_file(p) != a["sha256"]:
            probs.append(f"artifact hash differs {a['path']}")
    for cp in h["changed_paths"]:
        if not (ctx.repo / cp).exists():
            probs.append(f"changed path missing {cp}")
    for t in h["tests"]:
        if not (ctx.repo / t["evidence"]).exists():
            probs.append(f"evidence missing {t['evidence']}")
    if h["task_id"] == "F02":
        listed = {a["path"] for a in h["artifacts"]}
        contracts_rel = ctx.C.relative_to(ctx.repo) if ctx.repo in ctx.C.parents else None
        if contracts_rel is not None:
            for p in ctx.C.rglob("*"):
                if p.is_file() and "__pycache__" not in p.parts and str(p.relative_to(ctx.repo)) not in listed:
                    probs.append(f"contract file not listed as artifact: {p.relative_to(ctx.repo)}")
    return probs


def s9_handoffs(ctx: Ctx):
    R.section("S9. Handoffs against worker-handoff 1.0")
    for p in sorted((ctx.orch / "handoffs").glob("*.json")):
        if p.name == "F00.json":
            R.info("F00.json is tracked as XL-14 (written before worker-handoff 1.0 existed)")
            continue
        probs = handoff_problems(ctx, p, deep=False)
        R.check(not probs, f"handoffs/{p.name} conforms to worker-handoff 1.0 (schema only; --handoff for hashes)", probs[:6])


# ----------------------------------------------------------------------------------------------
# main
# ----------------------------------------------------------------------------------------------
def header(ctx: Ctx):
    rc, head = git(ctx.repo, "rev-parse", "HEAD")
    _, br = git(ctx.repo, "branch", "--show-current")
    print("# F02 contract set validation (validate.py)")
    print(f"utc_now: {dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}")
    print(f"python: {sys.version.split()[0]}  jsonschema: {pkg_version('jsonschema')}")
    print(f"repo: {ctx.repo}  branch: {br.strip()}  HEAD: {head.strip() if rc == 0 else 'unavailable'}")
    print(f"contracts dir: {ctx.C}")
    print(f"contract set version: {SET_VERSION}  frozen for build on: {FROZEN_ON}")
    print("environment: local container; fixture evidence only (no browser, no network, no provider)")


def main(argv=None) -> int:
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser(description="Validate the F02 contract set 1.0.")
    ap.add_argument("--repo", type=Path, default=here.parent.parent, help="repository root (default: two levels above this file)")
    ap.add_argument("--contracts-dir", type=Path, default=here, help="contracts directory to validate (default: this file's directory)")
    ap.add_argument("--handoff", type=Path, help="validate one handoff JSON deeply (schema, HEAD, artifact hashes, evidence paths) and exit")
    args = ap.parse_args(argv)
    repo, cdir = args.repo.resolve(), args.contracts_dir.resolve()
    if not (repo / ".orchestration").is_dir() or not cdir.is_dir():
        print(f"setup error: repo {repo} or contracts dir {cdir} not found")
        return 2
    try:
        ctx = Ctx(repo, cdir)
    except Exception as exc:  # noqa: BLE001
        print(f"setup error: could not load the contract set: {type(exc).__name__}: {exc}")
        return 2
    header(ctx)
    if args.handoff:
        hp = args.handoff if args.handoff.is_absolute() else (Path.cwd() / args.handoff)
        R.section(f"Handoff check: {hp}")
        probs = handoff_problems(ctx, hp.resolve(), deep=True)
        h = strict_load(hp) if hp.exists() else {}
        R.check(not probs, f"{hp.name}: schema-valid; base_commit = HEAD; {len(h.get('artifacts', []))} artifact hashes match; "
                f"changed paths and {len(h.get('tests', []))} evidence paths exist", probs[:12])
    else:
        for fn in (s1_index, s2_schemas, s3_examples, s4_registries, s5_fixtures, s6_invariants, s7_known, s7b_drift,
                   s8_negative_controls, s9_handoffs):
            try:
                fn(ctx)
            except Exception as exc:  # noqa: BLE001
                R.bad(f"{fn.__name__} crashed: {type(exc).__name__}: {exc}")
    print(f"\n## Summary\npass: {R.n['pass']}  fail: {R.n['fail']}  known: {R.n['known']}  info: {R.n['info']}")
    if R.fails:
        print("unexpected results:")
        for f in R.fails:
            print("  - " + f[:300])
    code = 1 if R.fails else 0
    print(f"exit_code={code}")
    return code


if __name__ == "__main__":
    sys.exit(main())
