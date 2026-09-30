/**
 * Pure helpers of tests/baseline/run.mjs (F03), kept apart so tests/baseline/runner.test.mjs can check them
 * without running the suite: argument parsing, the "is node_modules the lockfile's install" check, prerequisite
 * resolution, the browser-run classifier and the overall result.
 *
 * Exit codes of run.mjs (see EXIT):
 *   0  no step failed and every requested step ran (blocked and expected_fail_by_design steps are allowed)
 *   1  at least one step is "fail"
 *   2  usage error (unknown step id, flag without a value); nothing was run
 *   3  incomplete: no step failed, but a requested step could not run (its prerequisite was excluded and could
 *      not be verified from the working tree, or did not pass), or no step was selected at all
 */
import fs from "node:fs";
import path from "node:path";

export const EXIT = { ok: 0, fail: 1, usage: 2, incomplete: 3 };

const VALUE_FLAGS = ["out", "python", "only", "skip"];

/**
 * Parses the run.mjs command line strictly. A value flag without a value (or followed by another flag) and an
 * unknown step id in --only/--skip are usage errors, never a silent fallback to the defaults.
 */
export function parseArgs(argv, stepIds) {
  const errors = [];
  const values = {};
  const known = new Set([...VALUE_FLAGS.map((f) => `--${f}`), "--list"]);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      errors.push(`unexpected argument "${a}"`);
      continue;
    }
    if (!known.has(a)) {
      errors.push(`unknown option ${a}`);
      continue;
    }
    const name = a.slice(2);
    if (name === "list") {
      values.list = true;
      continue;
    }
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) {
      errors.push(`${a} needs a value`);
      continue;
    }
    if (name in values) errors.push(`${a} given more than once`);
    values[name] = v;
    i++;
  }
  const ids = (flag) => {
    if (values[flag] === undefined) return null;
    const list = values[flag]
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (!list.length) errors.push(`--${flag} needs at least one step id`);
    const unknown = list.filter((x) => !stepIds.includes(x));
    if (unknown.length)
      errors.push(
        `unknown step id(s) in --${flag}: ${unknown.join(", ")} (known: ${stepIds.join(", ")})`,
      );
    return list;
  };
  return {
    out: values.out ?? null,
    python: values.python ?? null,
    only: ids("only"),
    skip: ids("skip") ?? [],
    list: Boolean(values.list),
    errors,
  };
}

const sortedJson = (o) =>
  JSON.stringify(
    Object.keys(o ?? {})
      .sort()
      .map((k) => [k, o[k]]),
  );

/**
 * Whether ROOT/node_modules is exactly what `npm ci` installs from ROOT/package-lock.json. Used only when the
 * npm_ci step was excluded with --only/--skip, to decide whether the node steps may still run. Checks:
 * - package.json's dependency fields equal the lockfile root entry (npm ci refuses a drifted lockfile);
 * - node_modules/.package-lock.json (written by npm ci/install) lists the same version and integrity for every
 *   lockfile package, and nothing else; lockfile packages marked optional may be absent (platform builds);
 * - every package it lists is on disk with that version in its package.json.
 */
export function installState(root) {
  const lockFile = path.join(root, "package-lock.json");
  const hiddenFile = path.join(root, "node_modules", ".package-lock.json");
  if (!fs.existsSync(lockFile))
    return { ok: false, detail: "package-lock.json does not exist" };
  if (!fs.existsSync(path.join(root, "node_modules")))
    return { ok: false, detail: "node_modules/ does not exist" };
  if (!fs.existsSync(hiddenFile))
    return {
      ok: false,
      detail:
        "node_modules/.package-lock.json does not exist (not an npm ci/install tree)",
    };
  let pkg, lock, hidden;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    lock = JSON.parse(fs.readFileSync(lockFile, "utf8")).packages ?? {};
    hidden = JSON.parse(fs.readFileSync(hiddenFile, "utf8")).packages ?? {};
  } catch (e) {
    return { ok: false, detail: `unreadable manifest: ${e.message}` };
  }
  const problems = [];
  for (const f of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ])
    if (sortedJson(pkg[f]) !== sortedJson(lock[""]?.[f]))
      problems.push(`package.json ${f} differ from package-lock.json`);
  let optionalAbsent = 0;
  let checked = 0;
  for (const [k, v] of Object.entries(lock)) {
    if (!k) continue;
    const h = hidden[k];
    if (!h) {
      if (v.optional) optionalAbsent++;
      else problems.push(`${k} not installed`);
      continue;
    }
    if (h.version !== v.version)
      problems.push(`${k} installed ${h.version}, lockfile ${v.version}`);
    else if (v.integrity && h.integrity && v.integrity !== h.integrity)
      problems.push(`${k} integrity differs from lockfile`);
  }
  for (const [k, h] of Object.entries(hidden)) {
    if (!k) continue;
    if (!(k in lock)) problems.push(`${k} installed but not in lockfile`);
    if (h.link) continue;
    checked++;
    try {
      const v = JSON.parse(
        fs.readFileSync(path.join(root, k, "package.json"), "utf8"),
      ).version;
      if (v !== h.version)
        problems.push(`${k} on disk is ${v}, npm recorded ${h.version}`);
    } catch {
      problems.push(`${k} missing on disk`);
    }
  }
  if (problems.length)
    return {
      ok: false,
      detail: `node_modules does not match package-lock.json: ${problems.slice(0, 5).join("; ")}${problems.length > 5 ? `; +${problems.length - 5} more` : ""}`,
    };
  return {
    ok: true,
    detail: `node_modules matches package-lock.json (${checked} installed packages checked on disk, ${optionalAbsent} optional platform packages absent)`,
  };
}

/**
 * Prerequisites of a step. A prerequisite is met when its step passed. When it was excluded with --only/--skip,
 * `stateCheck(id)` may show that the working tree already holds its result ({ok, detail}); null means that cannot
 * be verified (a production build cannot be matched to the working tree), so the prerequisite stays unmet.
 */
export function resolveNeeds(needs, byId, stateCheck) {
  const unmet = [];
  const fromState = [];
  for (const d of needs ?? []) {
    const rec = byId.get(d);
    if (rec?.classification === "pass") continue;
    if (rec?.excluded) {
      const s = stateCheck(d);
      if (s?.ok) fromState.push({ id: d, detail: s.detail });
      else
        unmet.push(
          `${d} excluded by --only/--skip and ${s ? s.detail : "its result cannot be verified from the working tree (include it in the run)"}`,
        );
      continue;
    }
    unmet.push(`${d}=${rec?.classification ?? "absent"}`);
  }
  return { unmet, fromState };
}

const count = (log, re) => {
  const m = log.match(re);
  return m ? Number(m[1]) : null;
};

/** Playwright list-reporter failure blocks ("  1) tests/…" up to the next block or the summary). */
export function failureBlocks(log) {
  const lines = log.split("\n");
  const blocks = [];
  let cur = null;
  for (const l of lines) {
    if (/^ {2}\d+\) \S/.test(l)) {
      cur = { title: l.trim(), text: "" };
      blocks.push(cur);
    } else if (/^ {2}\d+ (failed|passed|flaky|skipped|did not run)/.test(l)) {
      cur = null;
    } else if (cur) cur.text += `${l}\n`;
  }
  return blocks;
}

export const LAUNCH_ERROR =
  /Executable doesn't exist|browserType\.launch: .*(ENOENT|not found)/;

/**
 * Classifies a Playwright run. "blocked" only when the browser could not be launched for every failing test:
 * the summary's failed count equals the number of failure blocks and each block carries the launch error.
 * Any other failure (for example an API test that needs no browser) keeps the step "fail".
 */
export function classifyBrowserRun({ code, log }, label) {
  const parts = ["passed", "failed", "flaky", "skipped", "did not run"]
    .map((k) => [k, count(log, new RegExp(`^\\s*(\\d+) ${k}`, "m"))])
    .filter(([, n]) => n !== null)
    .map(([k, n]) => `${n} ${k}`);
  const note = [parts.length ? `playwright: ${parts.join(", ")}` : null, label]
    .filter(Boolean)
    .join("; ");
  if (code === 0) return { classification: "pass", note };
  const failed = count(log, /^\s*(\d+) failed/m);
  const blocks = failureBlocks(log);
  const launch = blocks.filter((b) => LAUNCH_ERROR.test(b.text));
  if (failed && blocks.length === failed && launch.length === failed)
    return {
      classification: "blocked",
      reason: `Playwright browser build not installed: all ${failed} failing test(s) failed to launch the browser (set PLAYWRIGHT_CHROMIUM_EXECUTABLE or run npx playwright install chromium)`,
      note,
    };
  if (launch.length)
    return {
      classification: "fail",
      reason: `${launch.length} of ${failed ?? "?"} failing test(s) could not launch the browser, but ${blocks.length - launch.length} failed for another reason`,
      note,
    };
  return { classification: "fail", note };
}

/**
 * Overall result. A step record carries `excluded: true` when --only/--skip left it out; any other not_run step
 * was requested and could not run.
 */
export function summarize(steps) {
  const tally = {};
  for (const s of steps)
    tally[s.classification] = (tally[s.classification] ?? 0) + 1;
  const requestedNotRun = steps
    .filter((s) => s.classification === "not_run" && !s.excluded)
    .map((s) => s.id);
  const ran = steps.filter((s) => s.classification !== "not_run").length;
  const incomplete = requestedNotRun.length > 0 || ran === 0;
  const overall = tally.fail
    ? "fail"
    : incomplete
      ? "incomplete"
      : Object.keys(tally).some((k) => k !== "pass")
        ? "pass_with_exceptions"
        : "pass";
  return {
    summary: tally,
    requested_not_run: requestedNotRun,
    overall,
    exit_code: tally.fail ? EXIT.fail : incomplete ? EXIT.incomplete : EXIT.ok,
  };
}
