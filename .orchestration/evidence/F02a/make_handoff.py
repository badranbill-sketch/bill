"""F02a: build .orchestration/handoffs/F02a.json from what is on disk.

Every sha256 is computed from the file; every exit code is read from the "[exit N]" line of the log named as the
test's evidence (a missing log means the test is left out, never guessed). Run from anywhere:
  python make_handoff.py
"""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
E = ".orchestration/evidence/F02a"
FIXD = ".orchestration/contracts/fixtures/workshop"
VENV = "/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/venv-f02"
A6RUN = "/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/f02a-a6run"
ENV = "local build container (Python 3.11.15, jsonschema 4.26.0, Node v22.22.2, ajv 8.20.0); fixture evidence only, no browser, no network, no provider"
NEW = ["WM37-today-dollar-pre-start-factor.json", "WM38-joint-owner-participant-age.json",
       "WM39-group-total-from-exact-values.json", "WM40-today-dollar-display-from-exact-gap.json"]


def sha(rel):
    return hashlib.sha256((REPO / rel).read_bytes()).hexdigest()


def exit_code(log_rel, which=-1):
    p = REPO / log_rel
    if not p.is_file():
        return None
    codes = re.findall(r"^\[exit (\d+)\]", p.read_text(), re.M)
    return int(codes[which]) if codes else None


TESTS = [
    ("F02A-before-validate", f"cd /home/user/bill && {VENV}/bin/python .orchestration/contracts/validate.py   # BEFORE F02a",
     f"{E}/before-contracts-validate.log"),
    ("F02A-before-lane", f"cd /home/user/bill && {VENV}/bin/python .orchestration/evidence/F02/math/validate.py   # BEFORE F02a",
     f"{E}/before-lane-validate.log"),
    ("F02A-before-A6faults", f"cd {A6RUN} && node faults_run.mjs   # BEFORE F02a; unmodified A6 attempt-3 harness copy",
     f"{E}/before-a6-faults_run.log"),
    ("WK02-F02a-generate", f"cd /home/user/bill && {VENV}/bin/python {E}/compute_f02a_fixtures.py && {VENV}/bin/python {E}/compute_f02a_fixtures.py --check",
     f"{E}/generate.log"),
    ("WK02-F02a-generate-check", f"cd /home/user/bill && {VENV}/bin/python {E}/compute_f02a_fixtures.py --check",
     f"{E}/after-generate-check.log"),
    ("WK02-F02a-mutation", f"cd /home/user/bill && {VENV}/bin/python {E}/mutation_check.py --json {E}/mutation_check.json",
     f"{E}/mutation_check.log"),
    ("WK02-A6-faults-after", f"cd {A6RUN} && node faults_run.mjs   # AFTER F02a; unmodified A6 attempt-3 harness copy",
     f"{E}/after-a6-faults_run.log"),
    ("WK02-A6-fixtures-after", f"cd {A6RUN} && node run_fixtures.mjs   # AFTER F02a; independent BigInt model",
     f"{E}/after-a6-run_fixtures.log"),
    ("WK02-lane-validate-after", f"cd /home/user/bill && {VENV}/bin/python .orchestration/evidence/F02/math/validate.py   # AFTER F02a",
     f"{E}/after-lane-validate.log"),
    ("F02A-validate-after", f"cd /home/user/bill && {VENV}/bin/python .orchestration/contracts/validate.py   # AFTER F02a fixtures, before the handoff existed",
     f"{E}/after-contracts-validate.log"),
    ("F02A-R2-validate", f"cd /home/user/bill && {VENV}/bin/python .orchestration/contracts/validate.py   # repair attempt 2, before the handoff was regenerated",
     f"{E}/attempt2-contracts-validate.log"),
    ("F02A-R3-hashes", f"cd /home/user/bill && grep -E '^[0-9a-f]{{64}}  ' {E}/after-hashes.log | sha256sum -c   # repair attempt 3: 6 no-change contract files + 42 fixture files vs attempt-1 values",
     f"{E}/attempt3-hashes.log"),
    ("F02A-R3-contracts-diff", "cd /home/user/bill && git diff --numstat HEAD -- .orchestration/contracts && git status --short -- .orchestration/contracts   # repair attempt 3",
     f"{E}/attempt3-contracts-diff.log"),
    ("F02A-R3-generate-check", f"cd /home/user/bill && {VENV}/bin/python {E}/compute_f02a_fixtures.py --check   # repair attempt 3",
     f"{E}/attempt3-generate-check.log"),
    ("F02A-R3-mutation", f"cd /home/user/bill && {VENV}/bin/python {E}/mutation_check.py   # repair attempt 3 (no --json)",
     f"{E}/attempt3-mutation.log"),
    ("F02A-R3-lane-validate", f"cd /home/user/bill && {VENV}/bin/python .orchestration/evidence/F02/math/validate.py   # repair attempt 3; exit 1 is F02A-A6R2-P2-1",
     f"{E}/attempt3-lane-validate.log"),
    ("F02A-R3-validate", f"cd /home/user/bill && {VENV}/bin/python .orchestration/contracts/validate.py   # repair attempt 3, before the handoff was regenerated",
     f"{E}/attempt3-contracts-validate.log"),
    ("F02A-handoff-check", f"cd /home/user/bill && {VENV}/bin/python {E}/check_handoff.py .orchestration/handoffs/F02a.json",
     f"{E}/handoff-check.log"),
    ("F02A-handoff-validate", f"cd /home/user/bill && {VENV}/bin/python .orchestration/contracts/validate.py --handoff .orchestration/handoffs/F02a.json",
     f"{E}/handoff-validate.log"),
    ("F02A-validate-final", f"cd /home/user/bill && {VENV}/bin/python .orchestration/contracts/validate.py   # final, with handoffs/F02a.json present",
     f"{E}/final-contracts-validate.log"),
]

# Files whose content is final before the handoff is written. The handoff-check, handoff-validate and
# final-validate logs are regenerated after it, so they are evidence paths only, not hashed artifacts.
ARTIFACTS = [f"{FIXD}/{n}" for n in NEW] + [f"{FIXD}/index.json"] + [
    f"{E}/{n}" for n in (
        "compute_f02a_fixtures.py", "mutation_check.py", "check_handoff.py", "make_handoff.py", "run_f02a.sh",
        "mutation_check.json", "before-hashes.log", "before-contracts-validate.log", "before-lane-validate.log",
        "before-a6-faults_run.log", "before-a6-run_fixtures.log", "generate.log", "index-append-diff.log",
        "after-generate-check.log", "mutation_check.log", "after-a6-copy-integrity.log", "after-a6-faults_run.log",
        "after-a6-run_fixtures.log", "after-lane-validate.log", "after-contracts-validate.log", "after-hashes.log",
        "before-after.diff.log", "attempt2-contracts-validate.log", "run_attempt3.sh", "attempt3-hashes.log",
        "attempt3-contracts-diff.log", "attempt3-generate-check.log", "attempt3-mutation.log",
        "attempt3-lane-validate.log", "attempt3-contracts-validate.log")]

ASSUMPTIONS = [
    "Contract semantics unchanged. workshop-math.md, workshop-inputs.md, workshop-inputs.schema.json, workshop-clip-rules.md, contracts/validate.py and worker-handoff.schema.json have the same sha256 before and after F02a (before-hashes.log vs after-hashes.log); WM01-WM36 and clip-rules.json are byte-identical and still regenerate byte for byte from compute_fixtures.render_all() (after-generate-check.log). No contract text was judged wrong, so nothing was stopped and reported on that ground.",
    "WM37 pins F02-MATH3-P2-1: three net today-dollar sources with q_j != i (q=0 starting at t_R=10; q=3% starting at t=12 inside the window; q=1% starting at t=5 before t_R), i=2%, A=55, R=65, H=5. WM38 pins F02-MATH3-P2-2: two joint sources with an age start (65 -> t=5) and an age end (64 -> e=4), participant 60, partner 55, same retirement year (H false). WM39 and WM40 are the optional P3-1 pins (group total rounded once from exact values; today-dollar gap deflated from the exact gap).",
    "Expected values come from the math lane's exact-rational reference model (workshop_reference.compute, imported read-only) and are written only if the hand closed forms in compute_f02a_fixtures.py agree (independent helpers compute_fixtures.g/rhe and literal hand values). A third, independent implementation (A6 attempt-3 BigInt model, run_fixtures.mjs, unmodified) reproduces all 40 WM fixtures with 0 differences (after-a6-run_fixtures.log).",
    "Faulty runtimes were exercised two independent ways: (a) A6's own unmodified faults_run.mjs/model_faults.mjs, run from a scratch copy whose .mjs files match the A6 MANIFEST.sha256 (after-a6-copy-integrity.log), which reads every WM*.json in contracts/fixtures/workshop; (b) mutation_check.py, which injects each reading into workshop_reference in memory. Both report today_dollars_uses_q caught by WM37, joint_uses_partner caught by WM38, group_from_rounded_rows caught by WM37,WM39 and deflate_rounded_gap caught by WM40, with 0 baseline mismatches; mutation_check.py also shows each of these four is missed by WM01-WM36 alone. faults_run.mjs always exits 0: its result is the CAUGHT/MISSED lines, not the exit code.",
    "The generator is a sibling script (evidence/F02a/compute_f02a_fixtures.py) that imports compute_fixtures.py for the builders instead of editing it, because F02a owns only evidence/F02a/. index.json was rewritten append-only: the 37 lane-generated entries are byte-identical and the 4 new entries follow the CLIP entry (index-append-diff.log: 0 removed lines; pre-F02a hash e2c690ff... reproduced by compute_fixtures.render_all()).",
    "contracts/validate.py enumerates fixtures by glob (WM*.json and index.json), not by name, so it was not edited. Its three failures after F02a are CX-18 (present before F02a: tasks.json has F02a but the worker-handoff task_id pattern does not), CX-21 (workshop-math.md s10 still says '36 math fixtures (WM01' while 40 exist) and CX-29 (evidence/F02/math/validation.log records the pre-F02a index.json hash). The final run adds S9 for handoffs/F02a.json (task_id pattern). All four need A0 or integrator action outside F02a's paths (blocked_checks).",
    "Informative, not required: mutation_check.py shows that resolving a joint source against the OLDER of the two ages is missed by every fixture, because in WM38 the partner is younger (older = participant = contract reading). Pinning it needs a joint age bound with an older partner; no fixture slot for that was assigned to F02a. The four P3-2 readings of the review (horizon_flag_known_amount_only, uncertain_flag_any, R_code_only_if_A_known, no_global_codes_without_window) remain missed, as before; F02a did not address P3-2 or P3-3.",
    "Repair attempt 2 (reviews/F02a.md). Both P2 findings name A0 as owner, and both need edits outside F02a's write scope. F02A-A6-P2-1 needs the fold-in of compute_f02a_fixtures.py into evidence/F02/math/compute_fixtures.py, the 4 fault hooks in workshop_reference.FAULTS and the lane validate.py fault matrix, workshop-math.md s10 (count, table, negative-control list), README.md row 14, and a regenerated evidence/F02/math/validation.log. F02A-A6-P2-2 needs worker-handoff 1.1 or an A0 decision, which touches worker-handoff.schema.json, offers gen_offers.py, contracts/validate.py CX-18 and S9, and README CX-18. The review asks for no change to WM37-WM40, index.json or evidence/F02a, and none was made: the fixture and index.json sha256 values are unchanged from attempt 1. The only additions are attempt2-contracts-validate.log and this regenerated handoff (make_handoff.py gained the new test, artifact and assumption). The attempt-2 run reproduces the reviewer's result: 352 pass, 4 fail (CX-18, CX-21, CX-29, S9), all four in blocked_checks.",
    "Repair attempt 3 (reviews/F02a-attempt2.md). Its two P2 findings, F02A-A6R2-P2-1 and F02A-A6R2-P2-2, are the attempt-1 items carried unchanged; the reviewer names A0 as owner of both, states that another worker repair cannot close them (both need edits outside F02a's write scope) and escalates to A0 under 03 s A0 ('Escalate after two repairs'). The review requests no change to WM37-WM40, index.json or the F02a evidence, and none was made. Attempt 3 re-ran the checks on the live tree (run_attempt3.sh): all 48 sha256 values in after-hashes.log still match (6 no-change contract files, WM01-WM40, clip-rules.json, index.json); the contract directory differs from HEAD only by index.json +42/-0 and the 4 untracked fixtures; compute_f02a_fixtures.py --check and mutation_check.py still exit 0 with the same CAUGHT/MISSED lines; the lane validator still reports 116 pass, 1 fail (step 5, P2-1); contracts/validate.py reports 353 pass, 4 fail (CX-18, CX-21, CX-29, S9), which is the reviewer's out/06 result exactly. The attempt-3 additions are run_attempt3.sh, the six attempt3-*.log files and this regenerated handoff (make_handoff.py gained the tests, artifacts and this assumption; blocked_checks now carry the R2 IDs).",
    "During attempt 3 the worker also started a trial of the A0-side edits for P2-1 in a local clone under the session scratchpad. No repository file outside F02a's paths was written. The trial was stopped when the permission system denied a review command. Its draft patch was deleted from evidence/F02a, and no result from the trial is claimed here or used as evidence.",
    "evidence/F02a/a6-attempt1/ and evidence/F02a/a6-attempt2/ are A6's verification evidence for reviews/F02a.md and reviews/F02a-attempt2.md. They sit inside the changed_paths directory entry, but F02a did not write them, and none of their files is listed as an F02a artifact.",
    "base_commit is the current HEAD of /home/user/bill (branch claude/orchestration-foundation); all F02a files are uncommitted working-tree files, so result_commit is null. The A6 harness node_modules (ajv 8.20.0) were copied from an earlier scratch copy (a6m3-clean); no package was installed and no network was used.",
]

BLOCKED = [
    {"check": "F02A-A6R2-P2-1 (= F02A-A6-P2-1): contracts/validate.py CX-21: workshop-math.md s10 fixture count ('36 math fixtures (WM01') vs 40 WM files",
     "status": "blocked",
     "reason": "Fixing it means editing workshop-math.md s10 (count sentence, fixture table, negative-control list) and README.md row 14 (which names WM01-WM36), which F02a may not touch. README s3 rule 6 says the integrator updates row 14 and CX-21 in the same round as an additive fixture. Any byte change to workshop-math.md changes its approval hash, so it needs a validate.py run and an A6 look (rule 6, third bullet).",
     "owner": "A0 (F02 integrator)"},
    {"check": "F02A-A6R2-P2-1 (= F02A-A6-P2-1): contracts/validate.py CX-29: evidence/F02/math/validation.log recorded hash of fixtures/workshop/index.json",
     "status": "blocked",
     "reason": "The math lane approval log records the pre-F02a index.json hash (e2c690ff...) and no WM37-WM40 hash. Regenerating it (evidence/F02/math/run_validation.sh) writes outside F02a's paths. It should run last, after the fold-in and the workshop-math.md s10 edit, because the s10 edit also changes the workshop-math.md hash that the log records.",
     "owner": "A0 / math lane"},
    {"check": "F02A-A6R2-P2-1 (= F02A-A6-P2-1): evidence/F02/math/validate.py step 5 (compute_fixtures.py --check) and step 6 (fault matrix vs workshop_reference.FAULTS)",
     "status": "blocked",
     "reason": "The lane generator does not know WM37-WM40, so --check reports them as unexpected files and index.json as differing (after-lane-validate.log). Every other lane check passes, including recomputation of WM37-WM40. Resolution: fold compute_f02a_fixtures.py into compute_fixtures.py (same builders and format; the 4 index entries must stay after CLIP so index.json regenerates byte for byte). Also add today_dollars_uses_q, joint_uses_partner, group_from_rounded_rows and deflate_rounded_gap to workshop_reference.FAULTS and to the lane fault matrix (required catchers WM37, WM38, WM39, WM40; mutation_check.py holds the reference readings). All of these edit evidence/F02/math/, outside F02a's paths. Still reproduces in repair attempt 3 (attempt3-lane-validate.log: 116 pass, 1 fail).",
     "owner": "A0 / math lane"},
    {"check": "F02A-A6R2-P2-2 (= F02A-A6-P2-2): handoffs/F02a.json against worker-handoff 1.0 (task_id pattern); contracts/validate.py CX-18 and S9",
     "status": "blocked",
     "reason": "The task_id pattern accepts only the 62 original task IDs and says a split task needs a contract minor version (WH-ID-1), while D-072 keeps 1.0. 'F02a' is therefore rejected; this handoff is otherwise schema-valid (handoff-check.log: 0 errors with task_id replaced in memory, all hashes, paths and evidence verified). CX-18 already failed on this before F02a started (before-contracts-validate.log). CX-18 only enumerates letter+2-digit candidates, so admitting F02a also needs a validate.py change, not only a new pattern. The ID cannot be changed on the worker side without misstating the task. Still reproduces in repair attempt 3 (attempt3-contracts-validate.log; the post-handoff runs handoff-validate.log and final-contracts-validate.log).",
     "owner": "A0"},
    {"check": "A6 re-verification of the attempt-3 handoff",
     "status": "not_run",
     "reason": "reviews/F02a.md and reviews/F02a-attempt2.md already verified WM37-WM40 and the mutation evidence independently (fixtures correct; both target faults pinned only by the new fixtures). Attempt 3 changed no fixture or index byte, so only the regenerated handoff and the attempt3-*.log files are new. The worker is not the verifier.",
     "owner": "A6"},
]


def main():
    head = subprocess.run(["git", "-C", str(REPO), "rev-parse", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
    tests = []
    for tid, cmd, ev in TESTS:
        code = exit_code(ev)
        if code is None:
            continue
        tests.append({"id": tid, "command": cmd, "exit_code": code, "evidence": ev, "environment": ENV})
    h = {
        "task_id": "F02a",
        "base_commit": head,
        "result_commit": None,
        "contract_version": "1.0",
        "changed_paths": [f"{FIXD}/{n}" for n in NEW] + [f"{FIXD}/index.json", f"{E}/", ".orchestration/handoffs/F02a.json"],
        "artifacts": [{"path": p, "sha256": sha(p)} for p in ARTIFACTS],
        "tests": tests,
        "assumptions": ASSUMPTIONS,
        "blocked_checks": BLOCKED,
        "human_approvals_required": [
            "G3: the calculation bundle hashes changed (WM37-WM40 added, index.json appended); per README s3 rule 5 any G3/HB-26 approval of the workshop math must name the new fixture and index.json sha256 values after A6 re-verifies them.",
        ],
        "external_actions_taken": [],
        "metered_cost": {"amount": None, "currency": None, "status": "unavailable-not-estimated"},
        "status": "submitted",
    }
    out = REPO / ".orchestration" / "handoffs" / "F02a.json"
    out.write_text(json.dumps(h, indent=2, ensure_ascii=False) + "\n")
    summary = ", ".join("%s=%s" % (t["id"], t["exit_code"]) for t in tests)
    print(f"wrote {out.relative_to(REPO)}: {len(h['artifacts'])} artifacts, {len(tests)} tests ({summary})")


if __name__ == "__main__":
    main()
