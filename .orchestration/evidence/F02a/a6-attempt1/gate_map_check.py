import re, sys
def check(path):
    txt = open(path).read()
    titles = {}
    for m in re.finditer(r"^\*\*(HB-\d+)\. [^*]*\*\* \(([^)]*)\)", txt, re.M):
        titles[m.group(1)] = set(re.findall(r"G\d", m.group(2)))
    rows = {}
    for m in re.finditer(r"^\| (G\d) \| [^|]* \| ([^|]*) \|", txt, re.M):
        rows[m.group(1)] = set(re.findall(r"HB-\d+", m.group(2)))
    mism = []
    for hb, gs in sorted(titles.items()):
        mapped = {g for g, hbs in rows.items() if hb in hbs}
        if gs != mapped:
            mism.append((hb, sorted(gs), sorted(mapped)))
    print(f"{path}: {len(titles)} HB titles, {len(rows)} gate rows; mismatches (title gates vs mapping): {mism or 'none'}")
    for kw in ("least-privilege", "least privilege", "live-test", "live calendar", "Per-action test scopes"):
        print(f"   grep -c '{kw}': {txt.count(kw)}")
for p in sys.argv[1:]:
    check(p)
