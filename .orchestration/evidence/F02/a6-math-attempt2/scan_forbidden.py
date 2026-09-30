"""Scan every output record (fixture `expected`, clip-rules expectations, and this model's outputs on
fixtures + 2,000 random inputs) for keys or string values that would be a forbidden output (§13)."""
import glob, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from model import model, semantic_errors
from gen import valid_docs
FIX = "/home/user/bill/.orchestration/contracts/fixtures/workshop"
PAT = re.compile(r"(can'?t? retire|you can|on[ _]track|be fine|\bready\b|readiness|\bscore|traffic|(?:^|_)red(?:$|_)|green|amber|run[ _]out|"
                 r"deplet|lasts?[ _]until|safe|withdraw|4 ?%|optimal|recommend|monte|probab|percentile|success|"
                 r"shortfall|enough|required[ _]savings|(?:^|_| )needs?(?:$|_| )|life[ _]?expect|longevity_age|reviewed|personal|advice|"
                 r"verdict|pass_fail|sufficien|(?:^|_)target)", re.I)
ALLOW = {"release_check", "fail_test_media_referenced", "pass"}   # build-check fields of media cases (not participant-facing)
hits = []
def walk(o, where):
    if isinstance(o, dict):
        for k, v in o.items():
            if k not in ALLOW and PAT.search(k): hits.append((where, "key", k))
            walk(v, where + "/" + k)
    elif isinstance(o, list):
        for i, v in enumerate(o): walk(v, where)
    elif isinstance(o, str):
        if o not in ALLOW and PAT.search(o): hits.append((where, "value", o))
n = 0
for f in sorted(glob.glob(f"{FIX}/WM*.json")):
    d = json.load(open(f)); walk(d["expected"], os.path.basename(f)); walk(model(d["input"]), "model:" + os.path.basename(f)); n += 2
cr = json.load(open(f"{FIX}/clip-rules.json"))
for r in cr["truth_table"]:
    if r.get("expected"): walk(r["expected"], f"TT{r['row']}"); n += 1
for c in cr["supplementary_cases"]: walk(c["expected"], c["case"]); n += 1
for m in cr["media_state_cases"]: walk(m["expected"], m["case"]); n += 1
docs, _ = valid_docs(2000, 4242, semantic_errors, 0.2)
for i, d in enumerate(docs): walk(model(d), f"random{i}"); n += 1
print(f"records scanned: {n}")
vocab = set()
for d in docs:
    o = model(d); vocab |= set(o["flags"]) | {o["completeness"]["state"], o["clip"]["selection_reason"]} | {r.split(':')[0] for r in o["completeness"]["reasons"]}
print("output vocabulary observed:", sorted(vocab))
print("forbidden-pattern hits:", hits[:20] if hits else "none")
sys.exit(1 if hits else 0)
