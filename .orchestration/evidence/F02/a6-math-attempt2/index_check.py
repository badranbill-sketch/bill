"""index.json lists every WM fixture with the same id, title, covers, selected clip and state."""
import json, os, sys
FIX = "/home/user/bill/.orchestration/contracts/fixtures/workshop"
idx = json.load(open(f"{FIX}/index.json")); bad = 0; listed = set()
files = {f for f in os.listdir(FIX) if f.startswith("WM")}
for e in idx["fixtures"]:
    if e["fixture_id"] == "CLIP":
        continue
    d = json.load(open(f"{FIX}/{e['file']}")); listed.add(e["file"])
    ok = (d["fixture_id"] == e["fixture_id"] and d["expected"]["clip"]["selected"] == e["selected_clip"]
          and d["expected"]["completeness"]["state"] == e["completeness_state"] and d["covers"] == e["covers"] and d["title"] == e["title"])
    bad += not ok
    if not ok: print("  MISMATCH", e["fixture_id"])
print(f"  index WM entries {len(listed)}; WM files {len(files)}; unlisted {sorted(files - listed)}; mismatches {bad}")
sys.exit(1 if bad or files - listed else 0)
