"""P2 demo: an unanswered income section is output as numeric 0 income in the display groups,
indistinguishable (in those fields) from a declared 'no planned income'."""
import json
FIX = "/home/user/bill/.orchestration/contracts/fixtures/workshop"
k = ("income_by_source_cents", "income_net_cents", "income_gross_cents", "income_unknown_basis_cents")
for f in ("WM06-zero-income-declared.json", "WM07-unknown-income-not-answered.json", "WM30-income-list-partial.json"):
    d = json.load(open(f"{FIX}/{f}"))
    y = d["expected"]["years"][0]
    print(f"{f}: coverage={d['input']['chapters']['income']['coverage']}")
    print("   " + ", ".join(f"{x}={json.dumps(y[x])}" for x in k) + f", spending_cents={y['spending_cents']}, gap_cents={y['gap_cents']}, status={y['status']}, reasons={y['reasons']}")
w6 = json.load(open(f"{FIX}/WM06-zero-income-declared.json"))["expected"]["years"]
w7 = json.load(open(f"{FIX}/WM07-unknown-income-not-answered.json"))["expected"]["years"]
same = all(all(a[x] == b[x] for x in k) for a, b in zip(w6, w7))
print(f"income display fields identical for 'no planned income' (known 0) and 'not answered' (unknown): {same}")
cr = json.load(open(f"{FIX}/clip-rules.json"))
for c in cr["supplementary_cases"]:
    if c["case"] == "CS03":
        print("CS03 coverage:", c["input"]["chapters"]["income"]["coverage"], "sources:", len(c["input"]["chapters"]["income"]["sources"]))
