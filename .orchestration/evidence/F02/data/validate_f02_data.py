#!/usr/bin/env python3
"""F02 data lane validation harness (contract version 1.0).

Checks, in order:
  1. The three contract schemas and the two registry harness schemas are valid draft 2020-12 schemas,
     with the required $schema/$id and a closed root.
  2. The event type enum equals the 20 types listed in source/04 §3.
  3. Every valid example passes (schema + semantic checks); every invalid example fails, and fails for
     the reason in its sibling .why.txt (an error with the stated keyword at the stated instance path,
     or the stated semantic rule for cross-field rules JSON Schema cannot express).
  4. email-eligibility.json and data-flow-register.json match their harness schemas and are consistent
     with the event, job and flag contracts.
  5. A reference scan of the valid event/job fixtures for forbidden keys and e-mail-shaped values
     (PB-SCAN rules in privacy-boundary.md).
  6. Rule traceability and the data-model column scan.
  7. Repair attempt 2 (reviews/F02-design.md A6D-01, 02, 03, 05, 06, 07): reference implementations of the runtime
     rules the schemas cannot express (FF-RUN-1/2 runtime gate, PB-ID-5 registry membership) run against the examples,
     plus drift checks between files that must stay equal (PB-SCAN-1 lists, asset-manifest asset_id alternation,
     FF-INV-1 waiver vs runtime substitute, flag controls).
  8. Repair attempt 3 (reviews/F02-design-attempt2.md A6D2-01, A6D2-02): the reviewer's withdrawal/leased-job race is
     rejected by the schema and every contract text states one rule; a reference model of the booking-to-contact join
     (AM-BOOK-3 to AM-BOOK-6, PB-CAL-3, FL-29) runs on fictional fixtures; negative controls show both checks bite.
Exit code 0 only if everything passes.
"""
import copy
import datetime
import glob
import hashlib
import importlib.metadata
import json
import os
import re
import subprocess
import sys

from jsonschema import Draft202012Validator

REPO = "/home/user/bill"
C = os.path.join(REPO, ".orchestration/contracts")
H = os.path.join(REPO, ".orchestration/evidence/F02/data")
SRC04 = os.path.join(REPO, ".orchestration/source/04_CONTRACTS_AND_TESTS.md")
SCHEMAS = {
    "event-envelope": os.path.join(C, "event-envelope.schema.json"),
    "delivery-job": os.path.join(C, "delivery-job.schema.json"),
    "feature-flags": os.path.join(C, "feature-flags.json"),
}
REGISTRY_FIXTURE = os.path.join(H, "fixture-resource-registry.json")
ASSET_MANIFEST = os.path.join(C, "asset-manifest.schema.json")  # offers lane; read only
REGISTRY_SCHEMAS = {
    "email-eligibility": os.path.join(H, "registry-schemas/email-eligibility.registry.schema.json"),
    "data-flow-register": os.path.join(H, "registry-schemas/data-flow-register.registry.schema.json"),
}
failures = []
counts = {"pass": 0, "fail": 0}


def ok(msg):
    counts["pass"] += 1
    print("PASS  " + msg)


def bad(msg):
    counts["fail"] += 1
    failures.append(msg)
    print("FAIL  " + msg)


def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def sha(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()


def flat(errors):
    for e in errors:
        yield e
        yield from flat(e.context or [])


def path_of(e):
    p = "/".join(str(x) for x in e.absolute_path)
    return p if p else "/"


def ts(s):
    return datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))


def job_semantics(j):
    errs = []
    exp = "pk1:%s:%s:%s:%s" % (j.get("contact_id"), j.get("trigger_event_id"), j.get("template_id"), j.get("template_version"))
    if j.get("purpose_key") != exp:
        errs.append("semantic:purpose_key")
    if ts(j["due_at"]) >= ts(j["expires_at"]):
        errs.append("semantic:due_before_expiry")
    if "next_attempt_at" in j and ts(j["next_attempt_at"]) >= ts(j["expires_at"]):
        errs.append("semantic:retry_before_expiry")
    if j["attempt_count"] > j["max_attempts"]:
        errs.append("semantic:attempt_cap")
    if "lease" in j and ts(j["lease"]["leased_at"]) >= ts(j["lease"]["leased_until"]):
        errs.append("semantic:lease_bounds")
    if "sent_at" in j and "send_started_at" in j and ts(j["send_started_at"]) > ts(j["sent_at"]):
        errs.append("semantic:send_order")
    if ts(j["created_at"]) > ts(j["updated_at"]):
        errs.append("semantic:created_before_updated")
    return errs


SEMANTICS = {"delivery-job": job_semantics}


def header():
    print("# F02 data lane validation")
    print("utc_now: " + datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    print("python: " + sys.version.split()[0] + "  jsonschema: " + importlib.metadata.version("jsonschema"))
    try:
        head = subprocess.run(["git", "-C", REPO, "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
        br = subprocess.run(["git", "-C", REPO, "branch", "--show-current"], capture_output=True, text=True).stdout.strip()
        print("repo: %s  branch: %s  HEAD: %s" % (REPO, br, head))
    except Exception as ex:  # noqa: BLE001
        print("repo: git unavailable (%s)" % ex)
    print("contract files (sha256):")
    for name in ["event-envelope.schema.json", "delivery-job.schema.json", "feature-flags.json", "email-eligibility.json",
                 "data-flow-register.json", "privacy-boundary.md", "authority-matrix.md", "event-envelope.md",
                 "operational-data-model.md", "job-state-machine.md", "feature-flags.md"]:
        p = os.path.join(C, name)
        print("  %s  %s" % (sha(p) if os.path.exists(p) else "MISSING", name))
    for name, p in REGISTRY_SCHEMAS.items():
        print("  %s  evidence/F02/data/registry-schemas/%s" % (sha(p), os.path.basename(p)))
    for rel in ("fixture-resource-registry.json", "gen_contracts.py", "validate_f02_data.py"):
        print("  %s  evidence/F02/data/%s" % (sha(os.path.join(H, rel)), rel))
    print()


def check_schemas():
    print("## 1. Schema meta-validation")
    out = {}
    for name, p in list(SCHEMAS.items()) + list(REGISTRY_SCHEMAS.items()):
        s = load(p)
        try:
            Draft202012Validator.check_schema(s)
            ok("%s is a valid draft 2020-12 schema" % name)
        except Exception as ex:  # noqa: BLE001
            bad("%s meta-validation: %s" % (name, ex))
        if s.get("$schema") == "https://json-schema.org/draft/2020-12/schema":
            ok("%s declares $schema draft 2020-12" % name)
        else:
            bad("%s $schema" % name)
        if re.fullmatch(r"https://bill\.contracts\.local/[a-z-]+/1\.0", s.get("$id", "")):
            ok("%s $id = %s" % (name, s["$id"]))
        else:
            bad("%s $id %r" % (name, s.get("$id")))
        if s.get("additionalProperties") is False:
            ok("%s root is closed (additionalProperties false)" % name)
        else:
            bad("%s root not closed" % name)
        out[name] = s
    print()
    return out


def check_event_types(schemas):
    print("## 2. Event types versus source/04 §3")
    text = open(SRC04, encoding="utf-8").read()
    m = re.search(r"Event types include: (.+?)\.\n", text)
    src = [t.strip() for t in m.group(1).split(",")] if m else []
    enum = schemas["event-envelope"]["$defs"]["event_type"]["enum"]
    if len(src) == 20 and src == enum:
        ok("envelope enum equals the 20 types of 04 §3, same order")
    else:
        bad("envelope enum %s differs from 04 §3 %s" % (enum, src))
    branches = [b["if"]["properties"]["type"]["const"] for b in schemas["event-envelope"]["allOf"]]
    if branches == enum:
        ok("every event type has exactly one per-type rule (allOf if/then)")
    else:
        bad("per-type rules do not cover the enum exactly")
    print()


def parse_why(p):
    d = {}
    for line in open(p, encoding="utf-8"):
        if ":" in line and line.split(":", 1)[0] in ("rule", "expect_path", "expect_keyword"):
            k, v = line.split(":", 1)
            d[k] = v.strip()
    return d


def check_examples(schemas):
    print("## 3. Examples")
    for name, schema in SCHEMAS.items():
        v = Draft202012Validator(load(schema))
        sem = SEMANTICS.get(name, lambda x: [])
        vfiles = sorted(glob.glob(os.path.join(C, "examples/valid", name, "*.json")))
        ifiles = sorted(glob.glob(os.path.join(C, "examples/invalid", name, "*.json")))
        print("### %s: %d valid, %d invalid" % (name, len(vfiles), len(ifiles)))
        if not vfiles or not ifiles:
            bad("%s has no valid or no invalid examples" % name)
        seen_ids, seen_keys = set(), set()
        for f in vfiles:
            inst = load(f)
            errs = list(v.iter_errors(inst))
            serrs = sem(inst) if not errs else []
            rel = os.path.relpath(f, C)
            if errs or serrs:
                bad("valid %s rejected: %s" % (rel, [(path_of(e), e.validator, e.message[:120]) for e in errs] + serrs))
            else:
                ok("valid   %s" % rel)
            if name == "event-envelope":
                if inst["event_id"] in seen_ids or inst["idempotency_key"] in seen_keys:
                    bad("duplicate event_id or idempotency_key in valid fixtures: %s" % rel)
                seen_ids.add(inst["event_id"])
                seen_keys.add(inst["idempotency_key"])
        for f in ifiles:
            rel = os.path.relpath(f, C)
            wp = f[:-5] + ".why.txt"
            if not os.path.exists(wp):
                bad("invalid %s has no .why.txt" % rel)
                continue
            why = parse_why(wp)
            inst = load(f)
            errs = list(flat(v.iter_errors(inst)))
            kw, ep = why.get("expect_keyword", ""), why.get("expect_path", "")
            if kw.startswith("semantic:"):
                serrs = sem(inst)
                if errs:
                    bad("invalid %s: expected schema-valid with semantic %s, got schema errors %s" % (rel, kw, [(path_of(e), e.validator) for e in errs]))
                elif kw in serrs:
                    ok("invalid %s -> rejected by %s  [%s]" % (rel, kw, why.get("rule", "")[:70]))
                else:
                    bad("invalid %s: semantic %s did not fire (got %s)" % (rel, kw, serrs))
                continue
            if not errs:
                bad("invalid %s was ACCEPTED by the schema" % rel)
                continue
            hit = [e for e in errs if e.validator == kw and path_of(e) == ep]
            if hit:
                ok("invalid %s -> %s at %s: %s  [%s]" % (rel, kw, ep, hit[0].message[:80].replace("\n", " "), why.get("rule", "")[:60]))
            else:
                bad("invalid %s rejected, but not for the stated reason (%s at %s); errors: %s" % (rel, kw, ep, [(path_of(e), e.validator) for e in errs][:8]))
        for wp in sorted(glob.glob(os.path.join(C, "examples/invalid", name, "*.why.txt"))):
            if not os.path.exists(wp[:-8] + ".json"):
                bad("orphan .why.txt %s" % os.path.relpath(wp, C))
    print()


def job_template_rules(job_schema):
    cls, res = {}, {}
    for r in job_schema["allOf"]:
        cond = r["if"]["properties"]
        if "template_id" in cond:
            tpls = cond["template_id"]["enum"]
            then = r["then"]
            mc = then.get("properties", {}).get("message_class", {}).get("const")
            if mc:
                for t in tpls:
                    cls[t] = mc
            rr = then.get("properties", {}).get("resource_ref", {})
            if "pattern" in rr:
                for t in tpls:
                    res[t] = rr["pattern"][1:4]
            elif rr.get("not") == {}:
                for t in tpls:
                    res[t] = None
    return cls, res


def check_registries(schemas):
    print("## 4. Registries and cross-contract consistency")
    ev_enum = set(schemas["event-envelope"]["$defs"]["event_type"]["enum"])
    job = schemas["delivery-job"]
    ff = schemas["feature-flags"]
    caps = {k: v["properties"] for k, v in ff["properties"]["capabilities"]["properties"].items()}
    flags = {k: v["properties"] for k, v in ff["properties"]["flags"]["properties"].items()}
    supp_enum = set(job["properties"]["suppression_reason"]["enum"])
    tcls, tres = job_template_rules(job)

    ee = load(os.path.join(C, "email-eligibility.json"))
    errs = list(Draft202012Validator(load(REGISTRY_SCHEMAS["email-eligibility"])).iter_errors(ee))
    if errs:
        bad("email-eligibility.json vs harness schema: %s" % [(path_of(e), e.validator, e.message[:100]) for e in errs][:10])
    else:
        ok("email-eligibility.json matches its harness schema (16 templates)")
    ids = [t["id"] for t in ee["templates"]]
    ok("E01-E16 present in order") if ids == ["E%02d" % i for i in range(1, 17)] else bad("template ids %s" % ids)
    union = []
    for c, p in caps.items():
        union += p["templates"]["const"]
    if sorted(union) == ["e%02d" % i for i in range(1, 17)] and len(union) == 16:
        ok("every template belongs to exactly one feature-flags capability")
    else:
        bad("capability template union %s" % sorted(union))
    if set(ee["suppression_codes"]) == supp_enum:
        ok("suppression codes equal delivery-job suppression_reason enum (%d)" % len(supp_enum))
    else:
        bad("suppression codes differ: %s" % (set(ee["suppression_codes"]) ^ supp_enum))
    for t in ee["templates"]:
        tid, e = t["template_id"], []
        if tid != t["id"].lower():
            e.append("template_id")
        if not set(t["trigger_event_types"]) <= ev_enum:
            e.append("trigger types not in envelope enum")
        cap = caps.get(t["capability"])
        if not cap or tid not in cap["templates"]["const"]:
            e.append("capability/template mismatch")
        elif t["controlling_flags"] != cap["controlling_flags"]["const"]:
            e.append("controlling_flags differ from feature-flags capability")
        if not set(t["suppressions"]) <= supp_enum:
            e.append("unknown suppression %s" % (set(t["suppressions"]) - supp_enum))
        expected_cls = tcls.get(tid)
        if expected_cls and t["proposed_class"] != expected_cls:
            e.append("class %s but delivery-job binds %s" % (t["proposed_class"], expected_cls))
        if tid not in tcls and "alternate_class" not in t:
            e.append("template with either class must document alternate_class")
        if tres.get(tid, "unset") != t["resource_ref"]:
            e.append("resource_ref %s but delivery-job requires %s" % (t["resource_ref"], tres.get(tid, "unset")))
        if t["consent"]["required"] and t["consent"]["purpose"] is None:
            e.append("consent required without purpose")
        (bad if e else ok)("%s %s" % (t["id"], "; ".join(e) if e else "consistent (class %s, priority %d, triggers %s)" % (t["proposed_class"], t["priority"], ",".join(t["trigger_event_types"]))))
    b = ee["budget"]
    q, hs, sb, orr, pm = (b["provider_daily_quota"]["value"], b["hard_stop"]["value"], b["soft_daily_budget"]["value"],
                          b["operational_reserved"]["value"], b["promotional_max"]["value"])
    if orr < sb < hs < q and pm == sb - orr:
        ok("budget: reserved %d < soft %d < hard stop %d < provider quota %d; promotional_max %d = soft - reserved" % (orr, sb, hs, q, pm))
    else:
        bad("budget ordering %s" % [q, hs, sb, orr, pm])
    op = [t["priority"] for t in ee["templates"] if t["proposed_class"] == "operational"]
    pr = [t["priority"] for t in ee["templates"] if t["proposed_class"] == "promotional"]
    ok("every operational priority (max %d) precedes every promotional priority (min %d)" % (max(op), min(pr))) if max(op) < min(pr) else bad("priority overlap")

    dfr = load(os.path.join(C, "data-flow-register.json"))
    errs = list(Draft202012Validator(load(REGISTRY_SCHEMAS["data-flow-register"])).iter_errors(dfr))
    if errs:
        bad("data-flow-register.json vs harness schema: %s" % [(path_of(e), e.validator, e.message[:100]) for e in errs][:10])
    else:
        ok("data-flow-register.json matches its harness schema (%d classes, %d sinks, %d flows)" % (len(dfr["data_classes"]), len(dfr["sinks"]), len(dfr["flows"])))
    classes = {d["id"]: d for d in dfr["data_classes"]}
    sinks = {s["id"] for s in dfr["sinks"]}
    browser = {"browser_memory", "browser_storage_optin", "browser_local_export"}
    persistent = {"supabase", "n8n", "brevo", "backups_offhost", "app_logs", "operator_view", "alert_channel", "mailbox", "resend", "scheduler", "google_workspace", "stripe"}
    fl_ids = [f["id"] for f in dfr["flows"]]
    ok("flow ids unique") if len(set(fl_ids)) == len(fl_ids) else bad("duplicate flow ids")
    for d in classes.values():
        if not set(d["allowed_sinks"]) <= sinks:
            bad("%s allowed_sinks not declared: %s" % (d["id"], set(d["allowed_sinks"]) - sinks))
    for f in dfr["flows"]:
        e = []
        d = classes.get(f["data_class"])
        if not d:
            e.append("unknown data class")
        if not set(f["sinks"]) <= sinks:
            e.append("unknown sinks %s" % (set(f["sinks"]) - sinks))
        if d and f["status"] != "forbidden" and not set(f["sinks"]) <= set(d["allowed_sinks"]):
            e.append("non-forbidden flow to a sink outside allowed_sinks: %s" % (set(f["sinks"]) - set(d["allowed_sinks"])))
        if d and f["status"] == "forbidden" and set(f["sinks"]) & set(d["allowed_sinks"]):
            e.append("forbidden flow names an allowed sink")
        if f["status"] != "forbidden" and set(f["sinks"]) & persistent and "pending_G5" not in f["retention"] and f["data_class"] not in ("DC-CARD", "DC-CONTENT", "DC-SECRET"):
            e.append("stored personal data without pending_G5 retention")
        (bad if e else ok)("%s %s -> %s: %s" % (f["id"], f["data_class"], ",".join(f["sinks"])[:60], "; ".join(e) if e else f["status"]))
    for cid in ("DC-FIN-INPUT", "DC-FIN-DERIVED"):
        forbidden = set()
        for f in dfr["flows"]:
            if f["data_class"] == cid and f["status"] == "forbidden":
                forbidden |= set(f["sinks"])
        missing = sinks - browser - forbidden - {"secret_store"}
        if classes[cid]["tier"] == "browser_only" and set(classes[cid]["allowed_sinks"]) <= browser and not missing:
            ok("%s: browser-only; every non-browser sink has an explicit forbidden flow" % cid)
        else:
            bad("%s: sinks without an explicit forbidden flow: %s" % (cid, sorted(missing)))
    print()


EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
# PB-SCAN-1: forbidden key tokens (privacy-boundary.md). Keys are split on '_', '-', spaces and camelCase.
FORBIDDEN_TOKENS = {
    # financial
    "amount", "balance", "balances", "income", "revenue", "salary", "spend", "spending", "budget", "savings", "asset",
    "assets", "networth", "net", "gross", "wealth", "pension", "rrsp", "reer", "tfsa", "celi", "rrif", "ferr", "lira",
    "cri", "gap", "surplus", "shortfall", "deficit", "capital", "horizon", "inflation", "escalation", "return", "bp",
    "currency", "mortgage", "debt", "tax", "marginal",
    # age, dates of life, health
    "age", "birth", "dob", "birthdate", "retirement", "health", "medical",
    # derived selections
    "clip", "branch", "risk", "warning", "segment", "score", "verdict", "diagnosis",
    # identity and device
    "email", "phone", "address", "street", "postal", "name", "firstname", "lastname", "ip", "useragent",
    "fingerprint", "device",
}
# PB-SCAN-2: forbidden whole keys: free text, raw form content, and workshop-inputs field names the tokens miss
FORBIDDEN_KEYS = {
    "message", "body", "form", "question", "questions", "notes", "note", "comment", "comments", "text", "payload",
    "data", "answers", "responses", "reply", "value",
    "non_registered", "home_value", "business_value", "pension_value", "lifestyle_focus", "also_entered_as_income",
    "excluded_from_spendable", "dependability", "tax_basis", "price_basis", "coverage", "chapters", "household",
    "accounts",
}
KEY_EXCEPTIONS = {"provider_message_id"}


def key_tokens(k):
    k = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", k)
    return {t for t in re.split(r"[_\-\s]+", k.lower()) if t}


def keys_and_strings(o, path=""):
    if isinstance(o, dict):
        for k, v in o.items():
            yield ("key", path + "/" + k, k)
            yield from keys_and_strings(v, path + "/" + k)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from keys_and_strings(v, "%s/%d" % (path, i))
    elif isinstance(o, str):
        yield ("str", path, o)


def check_scan():
    print("## 5. Reference PB-SCAN over valid event and job fixtures")
    for name in ("event-envelope", "delivery-job"):
        for f in sorted(glob.glob(os.path.join(C, "examples/valid", name, "*.json"))):
            hits = []
            for kind, p, val in keys_and_strings(load(f)):
                if kind == "key":
                    toks = key_tokens(val)
                    if toks & FORBIDDEN_TOKENS:
                        hits.append("forbidden key token %s in %s" % (toks & FORBIDDEN_TOKENS, p))
                    if val.lower() in FORBIDDEN_KEYS:
                        hits.append("forbidden free-text key %s" % p)
                else:
                    leaf = p.rsplit("/", 1)[-1]
                    if leaf not in KEY_EXCEPTIONS and EMAIL.search(val):
                        hits.append("email-shaped value at %s" % p)
                    if re.search(r"[$€£]", val):
                        hits.append("currency symbol at %s" % p)
            rel = os.path.relpath(f, C)
            (bad if hits else ok)("scan %s%s" % (rel, (": " + "; ".join(hits)) if hits else ""))
    # the scan must actually catch the negative fixtures that carry PII or figures
    for rel in ["examples/invalid/event-envelope/financial-amount-field.json", "examples/invalid/event-envelope/email-in-idempotency-key.json",
                "examples/invalid/event-envelope/extra-property-form-body.json", "examples/invalid/event-envelope/workshop-completed-with-gap.json",
                "examples/invalid/delivery-job/recipient-email-field.json", "examples/invalid/delivery-job/financial-field-in-job.json"]:
        inst = load(os.path.join(C, rel))
        caught = any((k == "key" and (key_tokens(v) & FORBIDDEN_TOKENS or v.lower() in FORBIDDEN_KEYS))
                     or (k == "str" and EMAIL.search(v)) for k, p, v in keys_and_strings(inst))
        (ok if caught else bad)("scan catches %s" % rel)
    print()


def check_traceability_and_columns():
    print("## 6. Rule traceability and data-model column scan")
    mds = ["privacy-boundary.md", "authority-matrix.md", "event-envelope.md", "operational-data-model.md",
           "job-state-machine.md", "feature-flags.md"]
    text = ""
    for m in mds:
        p = os.path.join(C, m)
        if os.path.exists(p):
            text += open(p, encoding="utf-8").read()
            ok("present: %s" % m)
        else:
            bad("missing: %s" % m)
    ids = set()
    for name in SCHEMAS:
        for wp in glob.glob(os.path.join(C, "examples/invalid", name, "*.why.txt")):
            rid_ = parse_why(wp).get("rule", "").split(" ")[0]
            if rid_:
                ids.add(rid_)
    undefined = sorted(i for i in ids if i not in text)
    if undefined:
        bad("rule IDs cited by .why.txt but not defined in the lane's .md files: %s" % undefined)
    else:
        ok("all %d rule IDs cited by .why.txt files are defined in the lane's .md files" % len(ids))
    md = open(os.path.join(C, "operational-data-model.md"), encoding="utf-8").read()
    block = md.split("```sql", 1)[1].split("```", 1)[0]
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
    tables = sorted({t for t, _ in cols})
    hits = [(t, c) for t, c in cols if (t, c) not in allowed and (key_tokens(c) & FORBIDDEN_TOKENS or c in FORBIDDEN_KEYS)]
    if len(tables) == 10 and not hits:
        ok("data-model sketch: %d tables, %d columns, no forbidden column (exceptions: contacts.email_normalized, email_hmac, first_name)" % (len(tables), len(cols)))
    else:
        bad("data-model sketch tables %s; forbidden columns %s" % (tables, hits))
    jobcols = {c for t, c in cols if t == "delivery_jobs"}
    jprops = set(load(SCHEMAS["delivery-job"])["properties"]) - {"schema_version", "lease", "last_error"}
    missing = sorted(p for p in jprops if p not in jobcols)
    ok("delivery_jobs columns cover the delivery-job schema fields") if not missing else bad("delivery_jobs sketch lacks %s" % missing)
    print()


# ---------------------------------------------------------------- section 7 (repair attempt 2)
def ff_consts(ff):
    caps = {k: {kk: vv.get("const") for kk, vv in v["properties"].items() if isinstance(vv, dict) and "const" in vv}
            for k, v in ff["properties"]["capabilities"]["properties"].items()}
    flags = {k: {kk: vv.get("const") for kk, vv in v["properties"].items() if isinstance(vv, dict) and "const" in vv}
             for k, v in ff["properties"]["flags"]["properties"].items()}
    return flags, caps


def schema_nonprod_required(ff):
    """Per capability: the controlling flags the schema still requires for `enabled` outside production (FF-INV-1)."""
    out = {}
    for inv in ff["allOf"]:
        cond = inv.get("if", {}).get("properties", {}).get("capabilities", {}).get("properties", {})
        if len(cond) != 1:
            continue
        cap, c = next(iter(cond.items()))
        if "enabled" not in c.get("properties", {}):
            continue
        req = set()
        for part in inv["then"].get("allOf", []):
            env = part.get("if", {}).get("properties", {}).get("environment", {})
            if env.get("enum") == ["development", "staging"]:
                req |= set(part["then"]["properties"]["flags"]["properties"])
        out[cap] = req
    return out


def runtime_gate(doc, cap, msg_class, env, caps_c, rg, running=None):
    """Reference FF-RUN-1 + FF-RUN-2 (feature-flags.md section 5.1). Returns the list of reasons the gate is closed.
    `running` holds the flag values of the running configuration (environment variables); by default they equal the
    approved document. A mismatch closes the gate for every capability that uses the flag (section 6)."""
    reasons = []
    run = {f: doc["flags"][f]["value"] for f in doc["flags"]}
    run.update(running or {})
    if not doc["capabilities"][cap]["enabled"]["value"]:
        reasons.append("%s not enabled" % cap)
    for f in set(caps_c[cap]["controlling_flags"]) | set(rg["class_flags"][msg_class]):
        if run[f] != doc["flags"][f]["value"]:
            reasons.append("running %s differs from the approved document (section 6 mismatch)" % f)
    prod = doc["environment"] == "production"
    subs = rg["nonproduction_substitutes"]
    for f in caps_c[cap]["controlling_flags"]:
        if not prod and f in subs:
            if not env.get("reviewer_only"):
                reasons.append("substitute for %s: access not reviewer-only" % f)
            if not env.get("recipient_allowlisted"):
                reasons.append("substitute for %s: recipient not allowlisted (not_allowlisted)" % f)
            if f == "checkout_live" and env.get("stripe_mode") != "test":
                reasons.append("substitute for checkout_live: Stripe not in test mode")
        elif not run[f]:
            reasons.append("controlling flag %s is false" % f)
    for f in rg["class_flags"][msg_class]:
        if not run[f]:
            reasons.append("class flag %s is false (FF-RUN-2)" % f)
    return reasons


def old_runtime_rule(doc, cap, caps_c):
    """The attempt-1 wording ('enabled and all controlling flags true'), kept only to show what A6D-01 changed."""
    return doc["capabilities"][cap]["enabled"]["value"] and all(doc["flags"][f]["value"] for f in caps_c[cap]["controlling_flags"])


def _set(doc, cap, state, by="A0", gates=None):
    st = doc["capabilities"][cap][state]
    st.update(value=True, evidence_ref="fixture:harness/%s-%s.md" % (cap, state), recorded_at="2026-10-01T12:00:00Z", recorded_by=by)
    if state == "approved":
        st.update(recorded_by="arnaud", gate_refs=gates or ["G3"], scope_hashes=["0" * 63 + "1"])


def _ready(doc, cap, caps_c, enabled=True):
    _set(doc, cap, "code_ready")
    if caps_c[cap]["provider_required"]:
        _set(doc, cap, "provider_tested", by="A6")
    _set(doc, cap, "approved", gates=caps_c[cap]["enable_gates"])
    if enabled:
        _set(doc, cap, "enabled", by="operator")


def check_repair2(schemas):
    print("## 7. Repair attempt 2: runtime-rule reference checks and drift checks")
    ff = schemas["feature-flags"]
    env_s = schemas["event-envelope"]
    ffv, envv = Draft202012Validator(ff), Draft202012Validator(env_s)
    flags_c, caps_c = ff_consts(ff)
    ee = load(os.path.join(C, "email-eligibility.json"))
    rg = ee["runtime_gate"]
    V = lambda n: load(os.path.join(C, "examples/valid/feature-flags", n + ".json"))  # noqa: E731

    print("### 7a. A6D-01: one rule for the non-production waiver (FF-INV-1 = FF-RUN-1)")
    nonprod_req = schema_nonprod_required(ff)
    subs = set(rg["nonproduction_substitutes"])
    mism = {c: (sorted(set(caps_c[c]["controlling_flags"]) - nonprod_req.get(c, set())), sorted(set(caps_c[c]["controlling_flags"]) & subs))
            for c in caps_c if set(caps_c[c]["controlling_flags"]) - nonprod_req.get(c, set()) != set(caps_c[c]["controlling_flags"]) & subs}
    (bad if mism or len(nonprod_req) != len(caps_c) else ok)(
        "schema FF-INV-1 waives exactly the runtime_gate substitutes %s for every one of %d capabilities%s" % (sorted(subs), len(nonprod_req), (": %s" % mism) if mism else ""))
    good_env = {"reviewer_only": True, "recipient_allowlisted": True, "stripe_mode": "test"}
    stg = V("staging-guide-delivery-allowlist-test")
    r = runtime_gate(stg, "guide_request_delivery", "operational", good_env, caps_c, rg)
    (ok if not r and not old_runtime_rule(stg, "guide_request_delivery", caps_c) else bad)(
        "R1 staging example, E01 to an allowlisted inbox: FF-RUN-1 open %s; the attempt-1 rule would have blocked it (public_launch false)" % (r or ""))
    r = runtime_gate(stg, "guide_request_delivery", "operational", dict(good_env, recipient_allowlisted=False), caps_c, rg)
    (ok if r and any("not_allowlisted" in x for x in r) else bad)("R2 same, recipient not allowlisted: closed %s" % r)
    d = copy.deepcopy(stg)
    _ready(d, "book_checkout", caps_c)
    ve = list(ffv.iter_errors(d))
    r1 = runtime_gate(d, "book_checkout", "operational", good_env, caps_c, rg)
    r2 = runtime_gate(d, "book_checkout", "operational", dict(good_env, stripe_mode="live"), caps_c, rg)
    (ok if not ve and not r1 and r2 else bad)("R3 staging book_checkout enabled (schema-valid: %s): Stripe test mode open %s; live key closed %s" % (not ve, r1 or "", r2))
    all_open = []
    for f in sorted(glob.glob(os.path.join(C, "examples/valid/feature-flags/*.json"))):
        doc = load(f)
        for cap in caps_c:
            if doc["capabilities"][cap]["enabled"]["value"]:
                rr = runtime_gate(doc, cap, "operational", good_env, caps_c, rg)
                all_open.append((os.path.basename(f), cap, rr))
    closed = [x for x in all_open if x[2]]
    (bad if closed else ok)("R4 every capability enabled in a valid flags example passes FF-RUN-1 (%d checked): a document that validates can act as it states%s" % (len(all_open), (": %s" % closed) if closed else ""))

    print("### 7b. A6D-07: marketing_dispatch stops every promotional send")
    e09 = next(t for t in ee["templates"] if t["id"] == "E09")
    alt = e09.get("alternate_class", {})
    (ok if set(rg["class_flags"]["promotional"]) <= set(alt.get("additional_controlling_flags", [])) else bad)(
        "E09 alternate_class lists runtime_gate.class_flags.promotional %s" % alt.get("additional_controlling_flags"))
    promo = [t["id"] for t in ee["templates"] if t["proposed_class"] == "promotional"]
    lacking = [t["id"] for t in ee["templates"] if t["proposed_class"] == "promotional" and not set(rg["class_flags"]["promotional"]) <= set(t["controlling_flags"])]
    (bad if lacking else ok)("every promotional template %s also lists marketing_dispatch among its capability's flags%s" % (promo, lacking or ""))
    miss = {f: sorted({c for c, v in caps_c.items() if f in v["controlling_flags"]} - set(flags_c[f]["controls"]))
            for f in flags_c if f != "public_launch"}
    miss = {k: v for k, v in miss.items() if v}
    (bad if miss else ok)("FF-GATE-2 every flag except public_launch controls each capability that names it%s" % ((": %s" % miss) if miss else ""))
    (ok if "workshop_followup" in flags_c["marketing_dispatch"]["controls"] else bad)(
        "marketing_dispatch.controls = %s (FF-INV-3 now checks workshop_followup readiness)" % flags_c["marketing_dispatch"]["controls"])
    d = copy.deepcopy(V("production-public-guide-step-fictional"))
    _ready(d, "event_lifecycle", caps_c)
    ve = list(ffv.iter_errors(d))
    job = load(os.path.join(C, "examples/valid/delivery-job/pending-e09-replay-promotional-variant.json"))
    r_op = runtime_gate(d, "event_lifecycle", "operational", good_env, caps_c, rg)
    r_pr = runtime_gate(d, "event_lifecycle", job["message_class"], good_env, caps_c, rg)
    r_e02 = runtime_gate(d, "marketing_nurture", "operational", good_env, caps_c, rg)
    (ok if not ve and not r_op and r_pr and r_e02 and job["template_id"] == "e09" else bad)(
        "R5 production, public_launch true, marketing_dispatch false (schema-valid: %s): operational E09 open; promotional E09 job example closed %s; operational E02 closed %s" % (not ve, r_pr, r_e02))
    d = copy.deepcopy(V("production-marketing-dispatch-fictional"))
    _ready(d, "event_lifecycle", caps_c)
    ve = list(ffv.iter_errors(d))
    r_pr = runtime_gate(d, "event_lifecycle", "promotional", good_env, caps_c, rg)
    r_e11 = runtime_gate(d, "workshop_followup", "promotional", good_env, caps_c, rg)
    (ok if not ve and not r_pr and not r_e11 else bad)("R6 same with marketing_dispatch true (schema-valid: %s): promotional E09 and E11 open %s" % (not ve, (r_pr + r_e11) or ""))
    closed = {c: runtime_gate(d, c, "promotional", good_env, caps_c, rg, running={"marketing_dispatch": False})
              for c in ("marketing_nurture", "workshop_followup", "event_lifecycle")}
    op_e02 = runtime_gate(d, "marketing_nurture", "operational", good_env, caps_c, rg, running={"marketing_dispatch": False})
    (ok if all(closed.values()) and op_e02 else bad)(
        "R7a kill switch thrown in the running configuration before the document is updated (FF-RUN-3): every promotional path closed %s; operational E02 closed" % sorted(k for k, v in closed.items() if v))
    d["flags"]["marketing_dispatch"].update(value=False, enable_evidence_ref=None)
    for c in ("marketing_nurture", "workshop_followup"):
        for st in ("enabled", "live_verified"):
            d["capabilities"][c][st] = {"value": False, "evidence_ref": None, "recorded_at": None, "recorded_by": None}
    ve_off = list(ffv.iter_errors(d))
    closed = {c: runtime_gate(d, c, "promotional", good_env, caps_c, rg) for c in ("marketing_nurture", "workshop_followup", "event_lifecycle")}
    op_e09 = runtime_gate(d, "event_lifecycle", "operational", good_env, caps_c, rg)
    (ok if not ve_off and all(closed.values()) and not op_e09 else bad)(
        "R7b kill-switch document recorded (flag false, nurture and follow-up not enabled; schema-valid: %s): every promotional path closed %s, operational E09 still open" % (not ve_off, sorted(k for k, v in closed.items() if v)))

    print("### 7c. A6D-03: resource codes on contact-subject events")
    base = load(os.path.join(C, "examples/valid/event-envelope/workshop-completed.json"))
    gbase = load(os.path.join(C, "examples/valid/event-envelope/guide-requested.json"))
    adv = [("ADV-5a", base, "workshop.eight-hundred-fifty-thousand.h" + "a" * 12), ("ADV-5b", base, "workshop.shortfall-large-warning.h" + "a" * 12),
           ("ADV-5c", gbase, "guide.retirement-guide.v65"), ("ADV-5d", gbase, "guide.jean-tremblay.h" + "a" * 12),
           ("key+v", base, "workshop.retirement-workshop.v62"), ("consent-v", load(os.path.join(C, "examples/valid/event-envelope/marketing-opted_in.json")), "consent.nurture.v1")]
    for label, b, code in adv:
        e = dict(b, resource_id=code)
        (bad if envv.is_valid(e) else ok)("%s %s rejected by the schema" % (label, code))
    reg = load(REGISTRY_FIXTURE)
    members = {x["resource_id"] for x in reg["entries"]}
    codes = []
    for f in sorted(glob.glob(os.path.join(C, "examples/valid/event-envelope/*.json"))):
        rid_ = load(f)["resource_id"]
        if "." in rid_:
            codes.append(rid_)
    nonmember = sorted(set(codes) - members)
    (bad if nonmember or not reg.get("fixture") else ok)("PB-ID-5 reference: all %d registry codes in valid event examples are fixture-registry members%s" % (len(set(codes)), nonmember or ""))
    hex_encoded = dict(base, resource_id="workshop.retirement-workshop.h850000000000")
    (ok if envv.is_valid(hex_encoded) and hex_encoded["resource_id"] not in members else bad)(
        "PB-ID-5 reference: workshop.retirement-workshop.h850000000000 is schema-valid (hex cannot be told from a hash) and rejected by registry membership")
    envmd = open(os.path.join(C, "event-envelope.md"), encoding="utf-8").read()
    keys_md = set(re.findall(r"guide `([a-z-]+)`, workshop `([a-z-]+)`", envmd)[0]) if re.search(r"guide `([a-z-]+)`, workshop `([a-z-]+)`", envmd) else set()
    keys_schema = set(re.findall(r"\\\.\(\?:([a-z|-]+)\)\\\.h", env_s["$defs"]["resource_guide_version"]["pattern"] + env_s["$defs"]["resource_workshop_version"]["pattern"]))
    (ok if keys_md and keys_md == keys_schema else bad)("closed guide/workshop keys in event-envelope.md %s = schema %s" % (sorted(keys_md), sorted(keys_schema)))
    pb = open(os.path.join(C, "privacy-boundary.md"), encoding="utf-8").read()
    for rid_ in ("PB-ID-5", "PB-ID-6"):
        (ok if re.search(r"^\| %s \|" % rid_, pb, re.M) else bad)("%s defined in privacy-boundary.md" % rid_)
    row = next((ln for ln in pb.splitlines() if ln.startswith("| AUTH05 |")), "")
    (ok if "PB-ID-5" in row else bad)("privacy-boundary.md section 6 AUTH05 row asserts PB-ID-5")

    print("### 7d. A6D-06: every asset-manifest asset_id can emit content events")
    am = load(ASSET_MANIFEST)
    am_pat = am["$defs"]["entry"]["properties"]["asset_id"]["pattern"]
    env_pat = env_s["$defs"]["resource_content_version"]["pattern"]
    am_core = am_pat[len("^(?:"):-len(")$")]
    env_core = env_pat[len("^(?:"):env_pat.index(")\\.(?:v")]
    (ok if am_core == env_core else bad)("envelope content-version ID alternation is byte-identical to asset-manifest asset_id")
    cre = re.compile(env_pat)
    samples = ["capsule.s01", "companion.s18", "clip.w00", "case.c10", "ink.a08", "template.e16", "ad.ad06", "ad.rt03",
               "article.key", "page.key", "guide.key", "book.key", "event.key", "copy.key"]
    rej = [x for x in samples if not cre.search(x + ".v1") or not cre.search(x + ".h" + "b" * 12)]
    (bad if rej else ok)("content events accept all 13 asset-manifest kinds (%d samples, v and h versions)%s" % (len(samples), rej or ""))

    print("### 7e. A6D-05: PB-SCAN lists identical in privacy-boundary.md, operational-data-model.md and this harness")
    odm = open(os.path.join(C, "operational-data-model.md"), encoding="utf-8").read()
    sec5 = pb.split("## 5.", 1)[1].split("## 6.", 1)[0]
    rule1 = odm.split("## 3.", 1)[1].split("## 4.", 1)[0]
    for label, odm_label in (("Financial", "financial"), ("Age and health", "age and health"), ("Derived selections", "derived selections"),
                             ("Identity and device", "identity and device")):
        a = set(re.search(r"^- " + label + r": `([^`]+)`", sec5, re.M).group(1).split())
        b = set(re.search(odm_label + r" \(`([^`]+)`\)", rule1).group(1).split())
        (ok if a == b else bad)("PB-SCAN-1 %s: privacy-boundary.md = operational-data-model.md (%d tokens)%s" % (label, len(a), ("" if a == b else " diff %s" % sorted(a ^ b))))
    toks = set()
    for label in ("Financial", "Age and health", "Derived selections", "Identity and device"):
        toks |= set(re.search(r"^- " + label + r": `([^`]+)`", sec5, re.M).group(1).split())
    (ok if toks == FORBIDDEN_TOKENS else bad)("PB-SCAN-1 in privacy-boundary.md = harness FORBIDDEN_TOKENS (%d)%s" % (len(toks), "" if toks == FORBIDDEN_TOKENS else " diff %s" % sorted(toks ^ FORBIDDEN_TOKENS)))
    m2 = re.search(r"\*\*PB-SCAN-2: forbidden whole keys\.\*\* `([^`]+)`, plus the sibling workshop-inputs names the tokens miss: `([^`]+)`", sec5)
    whole = set(m2.group(1).split()) | set(m2.group(2).split())
    (ok if whole == FORBIDDEN_KEYS else bad)("PB-SCAN-2 in privacy-boundary.md = harness FORBIDDEN_KEYS (%d)" % len(whole))

    print("### 7f. A6D-02 and A6D-01: the controlling texts carry the rules downstream tests must assert")
    wk = next((ln for ln in pb.splitlines() if ln.startswith("| WK04 |")), "")
    fin5 = next((ln for ln in pb.splitlines() if ln.startswith("| PB-FIN-5 |")), "")
    (ok if re.search(r"^\| PB-MEDIA-4 \|", pb, re.M) and "PB-MEDIA-1 to 4" in wk and "PB-MEDIA-4" in fin5 and "WK04 media procedure" in pb else bad)(
        "PB-MEDIA-4 defined, PB-FIN-5 subject to it, WK04 row asserts PB-MEDIA-1 to 4, media procedure present")
    ffmd = open(os.path.join(C, "feature-flags.md"), encoding="utf-8").read()
    jsm = open(os.path.join(C, "job-state-machine.md"), encoding="utf-8").read()
    psc3 = next(x for x in ee["common_pre_send_checks"] if x.startswith("PSC-3"))
    step2 = jsm.split("## 6.", 1)[1].split("\n3. ", 1)[0]
    defined = all(re.search(r"^\| %s \|" % r, ffmd, re.M) for r in ("FF-RUN-1", "FF-RUN-2", "FF-RUN-3"))
    (ok if defined and all(x in psc3 for x in ("FF-RUN-1", "FF-RUN-2")) and all(x in step2 for x in ("FF-RUN-1", "FF-RUN-2")) and "Runtime rule for downstream code" not in ffmd else bad)(
        "FF-RUN-1..3 defined in feature-flags.md; PSC-3 and job-state-machine.md section 6 step 2 cite FF-RUN-1 and FF-RUN-2; the attempt-1 runtime sentence is gone")

    print("### 7g. Negative controls: the section 7 checks catch the defects the review reported")
    d5 = copy.deepcopy(V("production-public-guide-step-fictional"))
    _ready(d5, "event_lifecycle", caps_c)
    rg_bad = copy.deepcopy(rg)
    rg_bad["class_flags"]["promotional"] = []
    (ok if not runtime_gate(d5, "event_lifecycle", "promotional", good_env, caps_c, rg_bad) else bad)(
        "NC-A without runtime_gate.class_flags a promotional E09 passes with marketing_dispatch false (the A6D-07 defect), so R5 depends on FF-RUN-2")
    ff_bad = copy.deepcopy(ff)
    for inv in ff_bad["allOf"]:
        cond = inv.get("if", {}).get("properties", {}).get("capabilities", {}).get("properties", {})
        if list(cond) == ["marketing_nurture"] and "enabled" in cond["marketing_nurture"].get("properties", {}):
            for part in inv["then"]["allOf"]:
                if part.get("if", {}).get("properties", {}).get("environment", {}).get("enum") == ["development", "staging"]:
                    part["then"]["properties"]["flags"]["properties"].pop("marketing_dispatch")
    req_bad = schema_nonprod_required(ff_bad)
    waived_bad = set(caps_c["marketing_nurture"]["controlling_flags"]) - req_bad["marketing_nurture"]
    (ok if waived_bad != set(caps_c["marketing_nurture"]["controlling_flags"]) & subs else bad)(
        "NC-B a schema that also waived marketing_dispatch outside production would differ from the runtime substitutes (7a catches it)")
    attempt1_fin = set("amount balance income revenue salary spend spending budget savings asset networth net gross wealth pension rrsp reer tfsa celi rrif ferr lira cri gap surplus shortfall deficit capital horizon inflation escalation return bp currency mortgage debt tax marginal".split())
    pb_fin = set(re.search(r"^- Financial: `([^`]+)`", sec5, re.M).group(1).split())
    (ok if pb_fin - attempt1_fin == {"balances", "assets"} else bad)("NC-C the attempt-1 data-model list differs from privacy-boundary.md by %s (7e catches it)" % sorted(pb_fin - attempt1_fin))
    attempt1_core = "(?:article|page|guide)\\.[a-z]+(?:-[a-z]+){0,7}|capsule\\.s(?:0[1-9]|1[0-8])|clip\\.w(?:0[0-9]|1[01])|case\\.c(?:0[1-9]|10)|template\\.e(?:0[1-9]|1[0-6])|ad\\.(?:ad0[1-6]|rt0[1-3])"
    (ok if attempt1_core != am_core else bad)("NC-D the attempt-1 content-version alternation differs from asset-manifest asset_id (7d catches it)")
    (ok if "workshop.retirement-workshop.h" + "0" * 12 not in members else bad)("NC-E a well-formed code missing from the registry fixture is not a member (PB-ID-5 reference is not vacuous)")
    print()


# ---------------------------------------------------------------- section 8 (repair attempt 3)
CROCK_ = "0123456789abcdefghjkmnpqrstvwxyz"


def did_(prefix, label):
    d = hashlib.sha256(("fixture-id|" + label).encode()).digest()
    return prefix + "_" + "".join(CROCK_[b % 32] for b in d[:26])


def ref_normalize(addr):
    import unicodedata
    return unicodedata.normalize("NFC", addr.strip().lower())


def ref_hmac(addr):
    # stand-in for the contacts.email_hmac key (name still open, README section 6); fixture only
    import hmac
    return hmac.new(b"fixture-contacts-key", ref_normalize(addr).encode(), hashlib.sha256).hexdigest()


def ref_accept_booking(contacts, jobs, delivery, env_template):
    """Reference model of op_accept_event for a booking delivery (AM-BOOK-3 to AM-BOOK-5). The adapter hands over only
    the HMAC of the invitee address; the operation returns the stored booking row, the envelope (or None) and the jobs
    it suppressed. Nothing here is P02's implementation."""
    h = ref_hmac(delivery["invitee_address"])          # computed in adapter memory; the address goes no further
    change = {k: v for k, v in delivery.items() if k != "invitee_address"}
    change["email_hmac"] = h
    match = next((c for c in contacts if c["email_hmac"] == change["email_hmac"] and c["lifecycle_state"] in ("active", "suppressed")), None)
    row = {"booking_id": change["booking_id"], "provider": "calendly", "provider_event_id": change["provider_event_id"],
           "offer_id": change["offer_id"], "mode": change["mode"], "starts_at": change["starts_at"], "status": "confirmed",
           "evidence_origin": "provider_event", "contact_id": match["contact_id"] if match else None,
           "contact_match": "booking_sync" if match else "unmatched"}
    if not match:
        return row, None, [], {"envelope": None, "reconciliation_state": "pending"}
    env = copy.deepcopy(env_template)
    env.update(subject_id=match["contact_id"], resource_id=change["booking_id"],
               idempotency_key="ik1_" + hashlib.sha256(("fixture|meeting.confirmed|" + change["provider_event_id"]).encode()).hexdigest())
    swept = []
    for j in jobs:
        if j["contact_id"] == match["contact_id"] and j["template_id"] in ("e05", "e11") and j["status"] in ("pending", "retry_due"):
            j.update(status="suppressed", suppression_reason="already_booked")
            for k in ("next_attempt_at", "defer_reason"):
                j.pop(k, None)
            swept.append(j["job_id"])
    return row, env, swept, {"envelope": env, "reconciliation_state": "none"}


def check_repair3(schemas):
    print("## 8. Repair attempt 3: A6D2-01 (withdrawal vs leased job) and A6D2-02 (booking-to-contact join)")
    jv = Draft202012Validator(schemas["delivery-job"])
    envv = Draft202012Validator(schemas["event-envelope"])
    read = lambda n: open(os.path.join(C, n), encoding="utf-8").read()  # noqa: E731
    jsm, odm, am, pb, evmd = (read(n) for n in ("job-state-machine.md", "operational-data-model.md", "authority-matrix.md",
                                                 "privacy-boundary.md", "event-envelope.md"))
    ee = load(os.path.join(C, "email-eligibility.json"))
    dfr = load(os.path.join(C, "data-flow-register.json"))
    VJ = lambda n: load(os.path.join(C, "examples/valid/delivery-job", n + ".json"))  # noqa: E731

    print("### 8a. A6D2-01: the reviewer's race record is rejected, and every text states one rule")
    base = VJ("retry-due-e04-deferred-daily-budget")
    race = copy.deepcopy(base)
    for k in ("lease", "provider_message_id", "sent_at", "completed_at", "delivery_status", "next_attempt_at", "defer_reason", "last_error"):
        race.pop(k, None)
    race.update(status="suppressed", suppression_reason="consent_withdrawn", send_started_at=race["updated_at"], attempt_count=1)
    errs = list(flat(jv.iter_errors(race)))
    (ok if any(e.validator == "not" and path_of(e) == "send_started_at" for e in errs) else bad)(
        "reviewer reproduction (withdrawal_leased_race.py): suppressed + consent_withdrawn + send_started_at + attempt_count 1 is rejected (JS-SUPP-1): %s" % [(path_of(e), e.validator) for e in errs])
    s2 = copy.deepcopy(race)
    s2.pop("send_started_at")
    s2["sent_at"] = s2["updated_at"]
    (ok if any(e.validator == "not" and path_of(e) == "sent_at" for e in flat(jv.iter_errors(s2))) else bad)("a suppressed job with sent_at is rejected (JS-SUPP-1)")
    s3 = copy.deepcopy(race)
    s3.pop("send_started_at")
    (ok if not list(jv.iter_errors(s3)) else bad)("the same job without the send marker (a T5 stop after an earlier known failure, attempt_count 1) is valid")
    sup = [f for f in sorted(glob.glob(os.path.join(C, "examples/valid/delivery-job", "*.json"))) if load(f)["status"] == "suppressed"]
    (ok if sup and all("send_started_at" not in load(f) and "sent_at" not in load(f) for f in sup) else bad)(
        "valid suppressed examples carry no send marker and no send time (%d)" % len(sup))
    lane = {"job-state-machine.md": jsm, "operational-data-model.md": odm, "authority-matrix.md": am, "privacy-boundary.md": pb,
            "event-envelope.md": evmd, "email-eligibility.json": read("email-eligibility.json"),
            "feature-flags.md": read("feature-flags.md"), "data-flow-register.json": read("data-flow-register.json")}
    stale = [n for n, t in lane.items() if re.search(r"pending and leased|leased promotional job", t)]
    (ok if not stale else bad)("no lane file says a sweep suppresses leased jobs ('pending and leased' / 'leased promotional job'): %s" % stale)
    row = next((ln for ln in odm.splitlines() if ln.startswith("| `op_record_withdrawal(")), "")
    (ok if "`pending` and `retry_due`" in row and "never changes a `leased` job" in row and "(T5)" in row else bad)(
        "operational-data-model.md op_record_withdrawal: pending and retry_due only; a leased job is stopped at T5")
    am2 = am.split("**AM-CONSENT-2.**", 1)[1].split("**AM-CONSENT-3.**", 1)[0]
    (ok if "`pending` and `retry_due`" in am2 and "(T5)" in am2 and "never marked suppressed" in am2 else bad)(
        "authority-matrix.md AM-CONSENT-2: pending and retry_due swept, leased stopped at T5, a started call never marked suppressed")
    t3 = next((ln for ln in jsm.splitlines() if ln.startswith("| T3 ")), "")
    t5 = next((ln for ln in jsm.splitlines() if ln.startswith("| T5 ")), "")
    t16 = next((ln for ln in jsm.splitlines() if ln.startswith("| T16 ")), "")
    (ok if "pending / retry_due" in t3 and "never changes a `leased` job" in t3 and "`send_started_at` is null" in t5
     and "clears `send_started_at`" in t16 else bad)("job-state-machine.md T3 (pending/retry_due only), T5 (before the marker), T16 (clears the marker)")
    defined = all(("**%s " % r) in jsm or ("**%s." % r) in jsm for r in ("JS-SUPP-1", "JS-SUPP-2", "JS-SUPP-3"))
    (ok if defined and "`leased` → `suppressed` by anyone except the job's own pre-send check (T5)" in jsm else bad)(
        "JS-SUPP-1 to 3 defined; the forbidden list names leased -> suppressed outside T5")
    ev_row = next((ln for ln in evmd.splitlines() if ln.startswith("| `marketing.withdrawn` |")), "")
    (ok if "`pending` and `retry_due`" in ev_row and "(T5" in ev_row else bad)("event-envelope.md marketing.withdrawn row: pending and retry_due, leased at T5")

    print("### 8b. A6D2-02: the booking-to-contact join is named, private and complete")
    rules = {r: bool(re.search(r"\*\*%s\. " % re.escape(r), am)) for r in ("AM-BOOK-3", "AM-BOOK-4", "AM-BOOK-5", "AM-BOOK-6")}
    (ok if all(rules.values()) else bad)("authority-matrix.md defines AM-BOOK-3 to AM-BOOK-6: %s" % rules)
    (ok if re.search(r"^\| PB-CAL-3 \|", pb, re.M) and "EV-BOOK-1" in evmd and re.search(r"^- \*\*EV-BOOK-1\.\*\*", evmd, re.M) else bad)(
        "privacy-boundary.md PB-CAL-3 and event-envelope.md EV-BOOK-1 (section 6 consumer rule) defined")
    fl29 = next((f for f in dfr["flows"] if f["id"] == "FL-29"), None)
    intake = next(d for d in dfr["data_classes"] if d["id"] == "DC-BOOKING-INTAKE")
    contact = next(d for d in dfr["data_classes"] if d["id"] == "DC-CONTACT")
    (ok if fl29 and fl29["data_class"] == "DC-CONTACT" and set(fl29["sinks"]) == {"app_server", "supabase"}
     and set(fl29["sinks"]) <= set(contact["allowed_sinks"]) and "never written" in fl29["retention"] and "AM-BOOK-3" in fl29["purpose"] else bad)(
        "register FL-29: DC-CONTACT to app_server and supabase only, the address never written, cites AM-BOOK-3")
    (ok if intake["allowed_sinks"] == ["scheduler", "google_workspace"] and "FL-29" in intake["examples"] else bad)(
        "register DC-BOOKING-INTAKE keeps allowed_sinks scheduler and google_workspace; its examples point to FL-29 for the transient key")
    sql = odm.split("```sql", 1)[1].split("```", 1)[0]
    bk = sql.split("create table bookings", 1)[1].split("create table", 1)[0]
    (ok if re.search(r"^\s+contact_match\s+text not null default 'unmatched',\s+-- 'unmatched' \| 'booking_sync' \| 'operator_reconciliation'", bk, re.M)
     and "(contact_match = 'unmatched') = (contact_id is null)" in bk and "null until matched" not in odm else bad)(
        "bookings sketch: contact_match with three values tied to contact_id; the attempt-2 comment 'null until matched' is gone")
    (ok if "right_id is null or (offer_id = 'book-consultation-30' and contact_id is not null)" in bk
     and "(offer_id = 'book-consultation-30') = (right_id is not null)" not in bk else bad)(
        "bookings sketch: an unmatched consultation booking can be stored without a right (a booking gap), a right only on a joined consultation booking")
    acc = next((ln for ln in odm.splitlines() if ln.startswith("| `op_accept_event(")), "")
    (ok if all(x in acc for x in ("`email_hmac`", "The address itself is never passed", "`envelope` null", "creates no contact")) else bad)(
        "operational-data-model.md op_accept_event describes the join by email_hmac and the unmatched outcome")
    (ok if "A booking never creates a contact in 1.0" in odm else bad)("operational-data-model.md principle 2: a booking never creates a contact")
    ab = ee["suppression_codes"]["already_booked"]
    tm = {t["id"]: t for t in ee["templates"]}
    (ok if "AM-BOOK-3" in ab and "AM-BOOK-3" in tm["E15"]["notes"] and "AM-BOOK-3" in tm["E16"]["notes"] and "AM-BOOK-3" in tm["E05"]["pre_send_checks"][0] else bad)(
        "email-eligibility.json: already_booked, E05 pre-send check, E15 and E16 count joined bookings only")
    # reference model on fictional fixtures
    contacts = [
        {"contact_id": did_("con", "r3-alice"), "email_hmac": ref_hmac("alice.fixture@example.com"), "lifecycle_state": "active"},
        {"contact_id": did_("con", "r3-erased"), "email_hmac": ref_hmac("erased.fixture@example.com"), "lifecycle_state": "erased"},
    ]
    jobs = [{"job_id": did_("job", "r3-e05"), "contact_id": contacts[0]["contact_id"], "template_id": "e05", "status": "pending"},
            {"job_id": did_("job", "r3-e11"), "contact_id": contacts[0]["contact_id"], "template_id": "e11", "status": "leased"}]
    tmpl = load(os.path.join(C, "examples/valid/event-envelope/meeting-confirmed.json"))

    def delivery(label, addr):
        return {"booking_id": did_("bkg", label), "provider_event_id": "fixture-evt-" + label, "offer_id": "intro-15",
                "mode": "online", "starts_at": "2026-10-09T15:00:00Z", "invitee_address": addr}
    cases = [("matched", "alice.fixture@example.com", True), ("case-and-space", "  Alice.Fixture@EXAMPLE.com ", True),
             ("plus-tag", "alice.fixture+book@example.com", False), ("other-domain", "alice.fixture@example.org", False),
             ("erased-contact", "erased.fixture@example.com", False), ("unknown", "bob.fixture@example.com", False)]
    for label, addr, want in cases:
        jj = copy.deepcopy(jobs)
        row, env, swept, ie = ref_accept_booking(contacts, jj, delivery(label, addr), tmpl)
        leak = [x for x in (row, env, ie) if x is not None and EMAIL.search(json.dumps(x))]
        if want:
            e_ok = env is not None and not list(envv.iter_errors(env)) and env["subject_id"] == contacts[0]["contact_id"]
            good = e_ok and row["contact_match"] == "booking_sync" and swept == [jobs[0]["job_id"]] and jj[1]["status"] == "leased" and not leak
            (ok if good else bad)("join %-15s -> contact joined, meeting.confirmed schema-valid with the con_ subject, pending E05 swept, leased E11 left to its pre-send check (T5), no address stored" % label)
        else:
            good = env is None and row["contact_id"] is None and row["contact_match"] == "unmatched" and not swept and ie["envelope"] is None \
                and ie["reconciliation_state"] == "pending" and len(contacts) == 2 and not leak
            (ok if good else bad)("join %-15s -> unmatched: no envelope, no job swept, no contact created, delivery pending reconciliation, no address stored" % label)

    print("### 8c. Negative controls: the section 8 checks catch the attempt-2 defects")
    old = copy.deepcopy(schemas["delivery-job"])
    for r in old["allOf"]:
        if r.get("if", {}).get("properties", {}).get("status", {}).get("const") == "suppressed":
            r["then"]["properties"].pop("send_started_at", None)
            r["then"]["properties"].pop("sent_at", None)
    (ok if not list(Draft202012Validator(old).iter_errors(race)) else bad)(
        "NC-F the attempt-2 suppressed branch (no send_started_at rule) accepts the race record, so 8a is not vacuous")
    old_row = "| `op_record_withdrawal(contact_id, purpose, source, evidence)` | Appends a revoked consent row and suppresses pending and leased promotional jobs in the same transaction. |"
    (ok if re.search(r"pending and leased|leased promotional job", old_row) else bad)("NC-G the attempt-2 op_record_withdrawal wording is caught by the stale-text search")
    jj = copy.deepcopy(jobs)
    contacts_nohmac = [dict(c, email_hmac="0" * 64) for c in contacts]
    row, env, swept, ie = ref_accept_booking(contacts_nohmac, jj, delivery("matched", "alice.fixture@example.com"), tmpl)
    (ok if env is None and row["contact_match"] == "unmatched" else bad)("NC-H with no matching email_hmac the reference join joins nothing (the join is not vacuous)")
    print()


if __name__ == "__main__":
    header()
    s = check_schemas()
    check_event_types(s)
    check_examples(s)
    check_registries(s)
    check_scan()
    check_traceability_and_columns()
    check_repair2(s)
    check_repair3(s)
    print("## Result: %d passed, %d failed" % (counts["pass"], counts["fail"]))
    if failures:
        print("Failures:")
        for f in failures:
            print("  - " + f)
    sys.exit(1 if failures else 0)
