"""Validates the workshop-inputs contract 1.0 artifacts (F02, math lane).

Checks, in order:
  1. schema compiles against the JSON Schema 2020-12 metaschema; builder reproduces it
  2. every valid example: strict JSON parse, 0 schema errors, 0 semantic errors
  3. every invalid example fails for the rule named in its .why.txt, and ONLY for
     errors attributable to that rule's location (single-mutation isolation)
  4. every fixture input (math fixtures, clip truth table, supplementary) is valid
  5. every fixture's expected block equals a fresh recomputation by the reference
     model, and the generator's own --check reproduces the files byte for byte
  6. negative controls: injected implementation faults (rounding, float64, unknown read
     as zero on every unknown path of workshop-math.md s6, the s4 precedence, the s4
     code sets, C_R valuation date and display eligibility) are each caught by the
     fixture(s) written for them

Exit status 0 only if every check passes.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

from jsonschema import Draft202012Validator

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import workshop_reference as ref  # noqa: E402

ROOT = HERE.parents[2]  # .orchestration
C = ROOT / "contracts"
SCHEMA = C / "workshop-inputs.schema.json"
VALID = C / "examples" / "valid" / "workshop-inputs"
INVALID = C / "examples" / "invalid" / "workshop-inputs"
FIX = C / "fixtures" / "workshop"

FAIL = []
PASS = [0]


def ok(msg):
    PASS[0] += 1
    print(f"PASS {msg}")


def bad(msg):
    FAIL.append(msg)
    print(f"FAIL {msg}")


def strict_load(text):
    def reject(tok):
        raise ValueError(f"non-standard JSON constant {tok}")
    return json.loads(text, parse_constant=reject)


def pointer(err):
    return "".join(f"/{p}" for p in err.absolute_path)


def flatten(errors):
    for e in errors:
        yield e
        if e.context:
            yield from flatten(e.context)


def attributable(path, expected):
    if expected == "":
        return path == ""
    return path == expected or path.startswith(expected + "/")


def parse_why(path):
    out = {}
    for line in path.read_text().splitlines():
        if ": " in line:
            k, v = line.split(": ", 1)
            out[k.strip()] = v
    return out


def main():
    print(f"python {sys.version.split()[0]}; jsonschema "
          f"{__import__('importlib.metadata').metadata.version('jsonschema')}")
    schema = strict_load(SCHEMA.read_text())
    print("== 1. schema")
    try:
        Draft202012Validator.check_schema(schema)
        ok("workshop-inputs.schema.json is a valid JSON Schema 2020-12 document")
    except Exception as exc:  # noqa: BLE001
        bad(f"metaschema: {exc}")
    for key, want in (("$schema", "https://json-schema.org/draft/2020-12/schema"),
                      ("$id", "https://bill.contracts.local/workshop-inputs/1.0")):
        (ok if schema.get(key) == want else bad)(f"{key} = {want}")
    rc = subprocess.run([sys.executable, str(HERE / "build_schema.py"), "--check"],
                        capture_output=True, text=True)
    (ok if rc.returncode == 0 else bad)(f"build_schema.py --check: {rc.stdout.strip()}")
    v = Draft202012Validator(schema)

    print("== 2. valid examples")
    for p in sorted(VALID.glob("*.json")):
        try:
            d = strict_load(p.read_text())
        except Exception as exc:  # noqa: BLE001
            bad(f"{p.name}: strict parse failed: {exc}")
            continue
        errs = list(v.iter_errors(d))
        sem = ref.semantic_errors(d) if not errs else []
        if errs or sem:
            bad(f"{p.name}: schema errors {[(e.validator, pointer(e)) for e in errs]} semantic {sem}")
            continue
        out = ref.compute(d)
        ok(f"{p.name}: valid (schema + semantic); model state={out['completeness']['state']} "
           f"clip={out['clip']['selected']}")

    print("== 3. invalid examples")
    jsons = sorted(INVALID.glob("*.json"))
    whys = sorted(INVALID.glob("*.why.txt"))
    (ok if len(jsons) == len(whys) else bad)(f"{len(jsons)} invalid examples, {len(whys)} .why.txt files")
    for p in jsons:
        why_p = p.with_name(p.stem + ".why.txt")
        if not why_p.exists():
            bad(f"{p.name}: missing .why.txt")
            continue
        w = parse_why(why_p)
        layer = w.get("layer")
        text = p.read_text()
        label = f"{p.name} [{w.get('rule')}]"
        if layer == "json-parse":
            try:
                strict_load(text)
                bad(f"{label}: strict parse unexpectedly succeeded")
                continue
            except ValueError as exc:
                strict_msg = str(exc)
            lenient = json.loads(text)
            errs = list(flatten(v.iter_errors(lenient)))
            hit = [e for e in errs if e.validator == w["also_schema_keyword"] and pointer(e) == w["also_schema_path"]]
            stray = [e for e in errs if not attributable(pointer(e), w["also_schema_path"])]
            if hit and not stray:
                ok(f"{label}: strict parse rejected ({strict_msg}); lenient parse -> schema "
                   f"'{w['also_schema_keyword']}' at {w['also_schema_path']}")
            else:
                bad(f"{label}: lenient schema errors {[(e.validator, pointer(e)) for e in errs]}")
            continue
        try:
            d = strict_load(text)
        except Exception as exc:  # noqa: BLE001
            bad(f"{label}: strict parse failed unexpectedly: {exc}")
            continue
        errs = list(flatten(v.iter_errors(d)))
        if layer == "schema":
            want_v = json.loads(w["expect_validator_value"]) if "expect_validator_value" in w else None
            hit = [e for e in errs if e.validator == w["expect_keyword"] and pointer(e) == w["expect_path"]
                   and (want_v is None or e.validator_value == want_v)
                   and w.get("expect_message_contains", "") in e.message]
            stray = [e for e in errs if not attributable(pointer(e), w["expect_path"])]
            if hit and not stray:
                ok(f"{label}: schema '{w['expect_keyword']}' at {w['expect_path'] or '(root)'}"
                   + (f" (validator value {want_v})" if want_v is not None else "")
                   + f" - {hit[0].message[:90]}")
            else:
                bad(f"{label}: got {[(e.validator, pointer(e), e.validator_value) for e in errs][:6]}")
        elif layer == "semantic":
            sem = ref.semantic_errors(d)
            hit = [s for s in sem if s[0] == w["expect_rule"] and s[1] == w["expect_path"]]
            if not errs and hit and len(sem) == len(hit):
                ok(f"{label}: schema-valid, semantic rule {hit[0][0]} at {hit[0][1]} - {hit[0][2]}")
            else:
                bad(f"{label}: schema errors {[(e.validator, pointer(e)) for e in errs]} semantic {sem}")
        else:
            bad(f"{label}: unknown layer {layer}")

    print("== 4/5. fixtures")
    index = strict_load((FIX / "index.json").read_text())
    for entry in index["fixtures"]:
        fp = FIX / entry["file"]
        data = strict_load(fp.read_text())
        if entry["file"] == "clip-rules.json":
            n_rows = n_possible = 0
            for row in data["truth_table"]:
                n_rows += 1
                if not row["possible"]:
                    continue
                n_possible += 1
                errs = list(v.iter_errors(row["input"]))
                sem = ref.semantic_errors(row["input"])
                out = ref.compute(row["input"])
                if errs or sem or out["clip"]["predicates"] != row["predicates"] \
                        or out["clip"]["selected"] != row["expected"]["selected"] \
                        or row["expected"]["selected"] != row["selected_by_precedence"]:
                    bad(f"clip row {row['row']}: mismatch")
            ok(f"clip-rules.json truth table: {n_rows} rows, {n_possible} possible rows valid and "
               f"recomputed, {n_rows - n_possible} impossible rows documented")
            for case in data["supplementary_cases"]:
                out = ref.compute(case["input"])
                good = (not list(v.iter_errors(case["input"])) and not ref.semantic_errors(case["input"])
                        and out["clip"]["selected"] == case["expected"]["selected"])
                (ok if good else bad)(f"clip-rules {case['case']}: {case['title']} -> {case['expected']['selected']}")
            for case in data["media_state_cases"]:
                got = ref.media_render_state(case["selected"], case["locale"], case["availability"], case["build"])
                (ok if got == case["expected"] else bad)(
                    f"clip-rules {case['case']}: {case['title']} -> {got['render_state']} (release {got['release_check']})")
            continue
        d = data["input"]
        errs = list(v.iter_errors(d))
        sem = ref.semantic_errors(d)
        recomputed = json.loads(json.dumps(ref.compute(d)))
        if errs or sem:
            bad(f"{entry['file']}: input invalid {[(e.validator, pointer(e)) for e in errs]} {sem}")
        elif recomputed != data["expected"]:
            bad(f"{entry['file']}: expected block differs from recomputation")
        else:
            ok(f"{entry['file']}: input valid; expected == recomputation "
               f"(state={data['expected']['completeness']['state']}, clip={data['expected']['clip']['selected']})")
    rc = subprocess.run([sys.executable, str(HERE / "compute_fixtures.py"), "--check"],
                        capture_output=True, text=True)
    tail = [ln for ln in rc.stdout.splitlines() if ln.startswith("== check") or ln.startswith("  info")]
    (ok if rc.returncode == 0 else bad)("compute_fixtures.py --check: " + " | ".join(tail))

    print("== 6. negative controls: injected implementation errors must be caught by the fixtures")
    import copy
    from fractions import Fraction as Fr

    def load(name):
        return strict_load((FIX / name).read_text())

    def differs(name, transform_input=None):
        data = load(name)
        d = copy.deepcopy(data["input"])
        if transform_input:
            transform_input(d)
        return json.loads(json.dumps(ref.compute(d))) != data["expected"]

    orig_round, orig_growth, orig_prec = ref.round_half_even, ref.growth, ref.CLIP_PRECEDENCE
    try:
        ref.round_half_even = lambda x: (x + Fr(1, 2)).__floor__()
        (ok if differs("WM17-rounding-half-even.json") else bad)(
            "half-up rounding (JS Math.round behaviour) is caught by WM17")
    finally:
        ref.round_half_even = orig_round
    try:
        def float_growth(bp, n):
            x = 1.0
            for _ in range(n):
                x *= 1 + bp / 10000
            return Fr(x)
        ref.growth = float_growth
        (ok if differs("WM24-rounding-float-trap.json") else bad)(
            "float64 growth factors are caught by WM24")
    finally:
        ref.growth = orig_growth

    def unknown_as_zero(d):
        d["chapters"]["income"]["coverage"] = "no_planned_income"
    (ok if differs("WM07-unknown-income-not-answered.json", unknown_as_zero) else bad)(
        "treating unanswered income as zero is caught by WM07")

    def gross_as_net(d):
        for s in d["chapters"]["income"]["sources"]:
            s["tax_basis"] = "net"
    (ok if differs("WM09-gross-net-mismatch.json", gross_as_net) else bad)(
        "subtracting gross income from after-tax spending is caught by WM09")

    def today_as_start(d):
        for s in d["chapters"]["income"]["sources"]:
            s["price_basis"] = "start_year_dollars"
    (ok if differs("WM04-price-basis-today-vs-start-year.json", today_as_start) else bad)(
        "ignoring the today-dollar price basis (real/nominal confusion) is caught by WM04")

    def home_spendable(d):
        d["chapters"]["income"]["sources"].append({
            "id": "src-9", "kind": "other", "owner": "self", "amount": {"status": "estimated", "value": 90000000},
            "period": "annual", "tax_basis": "net", "price_basis": "start_year_dollars",
            "start": {"reference": "already_receiving"}, "escalation_bp": {"status": "zero", "value": 0},
            "dependability": "scheduled"})
    (ok if differs("WM10-housing-only-wealth.json", home_spendable) else bad)(
        "counting the home as spendable money is caught by WM10")
    try:
        ref.CLIP_PRECEDENCE = tuple(sorted(orig_prec, key=lambda r: r[0] != "F"))
        (ok if differs("WM08-unknown-amount-later-start.json") else bad)(
            "a confident gap outranking missing income (F before M) is caught by WM08")
        ref.CLIP_PRECEDENCE = tuple(r for r in orig_prec if r[0] != "H") + tuple(r for r in orig_prec if r[0] == "H")
        (ok if differs("WM21-household-timing.json") else bad)(
            "household timing ranked after the funding gap is caught by WM21")
    finally:
        ref.CLIP_PRECEDENCE = orig_prec

    # Fault matrix (repair 2, F02-MATH-P2-1/P2-2 and P3-1): each injected fault must be caught
    # by the fixture(s) written for it. A catch means the full output record differs from expected.
    wm_entries = [e for e in index["fixtures"] if e["file"] != "clip-rules.json"]

    def catching(faults=frozenset(), transform=None):
        hits = []
        for e in wm_entries:
            data = load(e["file"])
            d = copy.deepcopy(data["input"])
            if transform:
                transform(d)
            if json.loads(json.dumps(ref.compute(d, faults))) != data["expected"]:
                hits.append(e["fixture_id"])
        return hits

    def partial_as_complete(d):
        if d["chapters"]["income"]["coverage"] == "some_sources_may_be_missing":
            d["chapters"]["income"]["coverage"] = "all_known_sources_listed"

    matrix = [
        ("unknown_spending_zero_rows", None, {"WM25"}, "unknown spending read as 0 in the year rows only"),
        ("start_unknown_as_not_paying", None, {"WM26", "WM33"}, "start point with status unknown read as 'not paying'"),
        ("start_unknown_as_already_receiving", None, {"WM26", "WM33"}, "start point with status unknown read as already receiving (s_j = 0)"),
        ("start_unresolvable_as_not_paying", None, {"WM29"}, "partner-owned age start (partner age unknown, window known) read as 'not paying'"),
        ("unresolved_end_as_open", None, {"WM27", "WM28"}, "unknown or unresolvable end read as 'no end'"),
        ("unknown_first", None, {"WM32", "WM33"}, "s4 read with 'unresolved start' before 't >= e_j' (the other literal reading)"),
        ("first_code_only", None, {"WM34"}, "only the first unresolved input reported per (j, t)"),
        ("retirement_unknown_blocks_age_starts", None, {"WM31"}, "R unknown treated as making self age starts unresolvable"),
        ("cr_discount_to_base", None, {"WM35"}, "C_R discounted to t = 0 instead of the start of year t_R"),
        ("ignore_no_positive_gap", None, {"WM36"}, "C_R = 0 treated as display-eligible"),
        ("incomplete_coverage_groups_as_listed", None, {"WM07", "WM30"},
         "income not answered shown as 0 income, or a partial list's subtotal shown as the year's income, in the display groups"),
        (None, partial_as_complete, {"WM30"}, "a partial source list read as complete"),
    ]
    (ok if set(f for f, *_ in matrix if f) == set(ref.FAULTS) else bad)(
        f"fault matrix covers every fault hook in workshop_reference.FAULTS ({len(ref.FAULTS)})")
    for fault, transform, want, label in matrix:
        hits = catching(frozenset({fault}) if fault else frozenset(), transform)
        name = fault or "partial_list_as_complete (input transform)"
        (ok if want <= set(hits) else bad)(
            f"{name}: {label} -> caught by {','.join(hits) or 'none'} (required: {','.join(sorted(want))})")

    # F02-MATH2-P2-1: a known zero (WM06) and an unknown (WM07) must differ in the income display fields
    # themselves, not only in status/reasons/gap.
    inc_keys = ("income_net_cents", "income_gross_cents", "income_unknown_basis_cents")
    w6 = [tuple(r[k] for k in inc_keys) for r in load("WM06-zero-income-declared.json")["expected"]["years"]]
    w7 = [tuple(r[k] for k in inc_keys) for r in load("WM07-unknown-income-not-answered.json")["expected"]["years"]]
    w30 = [tuple(r[k] for k in inc_keys) for r in load("WM30-income-list-partial.json")["expected"]["years"]]
    (ok if w6 == [(0, 0, 0)] * len(w6) and w7 == [(None, None, None)] * len(w7) else bad)(
        f"income display groups: WM06 (no planned income) {w6[0]} vs WM07 (not answered) {w7[0]} in every row")
    (ok if w30 == [(None, None, None)] * len(w30) else bad)(
        f"income display groups: WM30 (partial list) {w30[0]} in every row, never the listed subtotal")

    data = load("WM12-surplus-years.json")
    netted = sum(r["gap_cents"] - r["surplus_cents"] for r in data["expected"]["years"])
    (ok if netted != data["expected"]["capital_illustration"]["reference_if_enabled"]["C_R_cents"] else bad)(
        f"netting surpluses against gaps (would give {netted} at r=0) is caught by WM12 (expects "
        f"{data['expected']['capital_illustration']['reference_if_enabled']['C_R_cents']})")
    bogus = strict_load((VALID / "complete-single.json").read_text())
    stray_hits = 0
    for why_p in whys:
        w = parse_why(why_p)
        if w.get("layer") != "schema":
            continue
        errs = list(flatten(v.iter_errors(bogus)))
        stray_hits += len([e for e in errs if e.validator == w["expect_keyword"] and pointer(e) == w["expect_path"]])
    (ok if stray_hits == 0 else bad)("matcher is not vacuous: no invalid-example rule matches the valid base instance")

    print("== artifact hashes (sha256) for approval binding")
    paths = [SCHEMA] + [C / n for n in ("workshop-inputs.md", "workshop-math.md", "workshop-clip-rules.md")] \
        + sorted(FIX.glob("*.json"))
    for p in paths:
        if p.exists():
            print(f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(ROOT.parent)}")
        else:
            print(f"(missing)  {p.relative_to(ROOT.parent)}")

    print(f"== summary: {PASS[0]} passed, {len(FAIL)} failed")
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
