/**
 * Self-test of the baseline runner (F03): `node --test tests/baseline/runner.test.mjs`. No dependencies beyond
 * Node. Covers argument parsing, the node_modules/lockfile check used when npm_ci is excluded, prerequisite
 * resolution, the Playwright classifier, the overall result, and the run.mjs command line for partial runs
 * (a requested step that cannot run must never end in exit 0).
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  classifyBrowserRun,
  EXIT,
  failureBlocks,
  installState,
  parseArgs,
  resolveNeeds,
  summarize,
} from "./runner-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..", "..");
const RUN = path.join(here, "run.mjs");
const IDS = [
  "npm_ci",
  "lint",
  "test",
  "typecheck",
  "build",
  "typecheck_after_build",
  "protections_check",
  "launch_check",
  "verify_publication",
  "test_e2e",
  "contracts_ajv",
  "contracts_validate_py",
  "build_graph_check",
  "base02_capture",
  "runner_selftest",
];
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "bill-runner-test-"));

// ---------------------------------------------------------------- parseArgs

test("parseArgs accepts the documented forms", () => {
  const a = parseArgs(["--only", "lint,test", "--out", "/tmp/x"], IDS);
  assert.deepEqual(a.errors, []);
  assert.deepEqual(a.only, ["lint", "test"]);
  assert.equal(a.out, "/tmp/x");
  const b = parseArgs(["--skip", "test_e2e,base02_capture"], IDS);
  assert.deepEqual(b.errors, []);
  assert.equal(b.only, null);
  assert.deepEqual(b.skip, ["test_e2e", "base02_capture"]);
  assert.equal(parseArgs(["--list"], IDS).list, true);
});

test("parseArgs refuses unknown ids, missing values and unknown options", () => {
  const cases = [
    [["--only", "lnt"], /unknown step id\(s\) in --only: lnt/],
    [["--skip", "npm-ci"], /unknown step id\(s\) in --skip: npm-ci/],
    [["--only"], /--only needs a value/],
    [["--only", "--skip", "lint"], /--only needs a value/],
    [["--only", ","], /--only needs at least one step id/],
    [["--out"], /--out needs a value/],
    [["--python"], /--python needs a value/],
    [["--onyl", "lint"], /unknown option --onyl/],
    [["lint"], /unexpected argument "lint"/],
    [["--only", "lint", "--only", "test"], /given more than once/],
  ];
  for (const [argv, re] of cases) {
    const r = parseArgs(argv, IDS);
    assert.ok(
      r.errors.some((e) => re.test(e)),
      `${argv.join(" ")} -> ${JSON.stringify(r.errors)}`,
    );
  }
});

// ---------------------------------------------------------------- installState

function fakeInstall({
  deps = { a: "1.0.0" },
  lockDeps = deps,
  lock = {
    "node_modules/a": { version: "1.0.0", integrity: "sha512-A" },
    "node_modules/@x/opt-linux": { version: "2.0.0", optional: true },
  },
  hidden = { "node_modules/a": { version: "1.0.0", integrity: "sha512-A" } },
  disk = { "node_modules/a": "1.0.0" },
  noHidden = false,
  noModules = false,
} = {}) {
  const root = tmp();
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "t", devDependencies: deps }),
  );
  fs.writeFileSync(
    path.join(root, "package-lock.json"),
    JSON.stringify({
      lockfileVersion: 3,
      packages: { "": { name: "t", devDependencies: lockDeps }, ...lock },
    }),
  );
  if (noModules) return root;
  fs.mkdirSync(path.join(root, "node_modules"));
  if (!noHidden)
    fs.writeFileSync(
      path.join(root, "node_modules", ".package-lock.json"),
      JSON.stringify({ lockfileVersion: 3, packages: hidden }),
    );
  for (const [k, v] of Object.entries(disk)) {
    fs.mkdirSync(path.join(root, k), { recursive: true });
    fs.writeFileSync(
      path.join(root, k, "package.json"),
      JSON.stringify({ version: v }),
    );
  }
  return root;
}

test("installState accepts an install that matches the lockfile", () => {
  const s = installState(fakeInstall());
  assert.equal(s.ok, true, s.detail);
  assert.match(s.detail, /1 installed packages checked on disk, 1 optional/);
});

test("installState refuses a missing, stale or drifted install", () => {
  const cases = [
    [{ noModules: true }, /node_modules\/ does not exist/],
    [{ noHidden: true }, /\.package-lock\.json does not exist/],
    [{ disk: {} }, /node_modules\/a missing on disk/],
    [{ disk: { "node_modules/a": "0.9.0" } }, /on disk is 0\.9\.0/],
    [
      {
        hidden: {
          "node_modules/a": { version: "1.0.1", integrity: "sha512-A" },
        },
        disk: { "node_modules/a": "1.0.1" },
      },
      /installed 1\.0\.1, lockfile 1\.0\.0/,
    ],
    [
      {
        hidden: {
          "node_modules/a": { version: "1.0.0", integrity: "sha512-B" },
        },
      },
      /integrity differs/,
    ],
    [
      {
        hidden: {
          "node_modules/a": { version: "1.0.0", integrity: "sha512-A" },
          "node_modules/b": { version: "3.0.0" },
        },
        disk: { "node_modules/a": "1.0.0", "node_modules/b": "3.0.0" },
      },
      /node_modules\/b installed but not in lockfile/,
    ],
    [{ hidden: {}, disk: {} }, /node_modules\/a not installed/],
    [
      { deps: { a: "1.0.0", c: "1.0.0" }, lockDeps: { a: "1.0.0" } },
      /devDependencies differ/,
    ],
  ];
  for (const [opts, re] of cases) {
    const s = installState(fakeInstall(opts));
    assert.equal(s.ok, false, JSON.stringify(opts));
    assert.match(s.detail, re);
  }
});

// ---------------------------------------------------------------- resolveNeeds

test("resolveNeeds: an excluded npm_ci counts only when the install is verified", () => {
  const byId = new Map([
    ["npm_ci", { classification: "not_run", excluded: true }],
  ]);
  const ok = resolveNeeds(["npm_ci"], byId, () => ({
    ok: true,
    detail: "matches",
  }));
  assert.deepEqual(ok.unmet, []);
  assert.deepEqual(ok.fromState, [{ id: "npm_ci", detail: "matches" }]);
  const bad = resolveNeeds(["npm_ci"], byId, () => ({
    ok: false,
    detail: "node_modules/ does not exist",
  }));
  assert.equal(bad.unmet.length, 1);
  assert.match(
    bad.unmet[0],
    /npm_ci excluded .* node_modules\/ does not exist/,
  );
});

test("resolveNeeds: an excluded build is never assumed; a failed prerequisite is unmet", () => {
  const byId = new Map([
    ["build", { classification: "not_run", excluded: true }],
    ["npm_ci", { classification: "fail" }],
  ]);
  const b = resolveNeeds(["build"], byId, () => null);
  assert.match(b.unmet[0], /build excluded .*cannot be verified/);
  const n = resolveNeeds(["npm_ci"], byId, () => ({ ok: true, detail: "" }));
  assert.deepEqual(n.unmet, ["npm_ci=fail"]);
  assert.deepEqual(
    resolveNeeds(["npm_ci"], new Map([["npm_ci", { classification: "pass" }]]))
      .unmet,
    [],
  );
});

// ---------------------------------------------------------------- classifyBrowserRun

const launchBlock = (n, title) => `
  ${n}) tests/browser/site.spec.ts:${n}:1 › ${title} ───────

    Error: browserType.launch: Executable doesn't exist at /opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell
`;
const otherBlock = (n, title) => `
  ${n}) tests/browser/site.spec.ts:${n}:1 › ${title} ───────

    Error: expect(received).toBe(expected)
    Expected: 200
    Received: 500
`;
const pwLog = (blocks, failed, passed) =>
  `Running ${failed + passed} tests using 2 workers\n${blocks.join("")}\n  ${failed} failed\n    tests/browser/site.spec.ts:1:1 › x\n  ${passed} passed (3.0s)\n`;

test("classifyBrowserRun: blocked only when every failure is a browser launch error", () => {
  const all = pwLog([launchBlock(1, "a"), launchBlock(2, "b")], 2, 3);
  assert.equal(failureBlocks(all).length, 2);
  assert.equal(
    classifyBrowserRun({ code: 1, log: all }, "label").classification,
    "blocked",
  );
  const mixed = pwLog(
    [launchBlock(1, "a"), otherBlock(2, "api contact 400")],
    2,
    3,
  );
  const m = classifyBrowserRun({ code: 1, log: mixed }, "label");
  assert.equal(m.classification, "fail");
  assert.match(m.reason, /1 failed for another reason/);
  assert.equal(
    classifyBrowserRun({
      code: 1,
      log: "Error: Timed out waiting for webServer",
    }).classification,
    "fail",
  );
  const pass = classifyBrowserRun(
    { code: 0, log: "  41 passed (86.0s)\n" },
    "under substitute",
  );
  assert.equal(pass.classification, "pass");
  assert.match(pass.note, /41 passed; under substitute/);
});

test("classifyBrowserRun on the recorded F00 default-browser log (when present)", (t) => {
  const f = path.join(
    ROOT,
    ".orchestration/evidence/F00/checks/codex/11_test_e2e_default_browser.log",
  );
  if (!fs.existsSync(f)) return t.skip("F00 evidence not in this checkout");
  const log = fs.readFileSync(f, "utf8");
  const r = classifyBrowserRun({ code: 1, log }, "default");
  assert.equal(failureBlocks(log).length, 38);
  assert.equal(r.classification, "blocked");
  const tampered = log.replace(
    /(\n {2}38\) [^\n]*\n)([\s\S]*?)(\n {2}38 failed)/,
    "$1\n    Error: expect(received).toBe(expected)\n$3",
  );
  assert.notEqual(tampered, log);
  assert.equal(
    classifyBrowserRun({ code: 1, log: tampered }, "default").classification,
    "fail",
  );
});

// ---------------------------------------------------------------- summarize

test("summarize: fail beats incomplete; requested not_run is incomplete; exclusions alone are not", () => {
  const s = (c, extra = {}) => ({
    id: c + Math.random(),
    classification: c,
    ...extra,
  });
  const excl = s("not_run", { excluded: true });
  assert.deepEqual(
    [
      summarize([s("pass"), excl]).overall,
      summarize([s("pass"), excl]).exit_code,
    ],
    ["pass_with_exceptions", EXIT.ok],
  );
  assert.equal(summarize([s("pass"), s("pass")]).overall, "pass");
  const inc = summarize([excl, s("not_run")]);
  assert.deepEqual(
    [inc.overall, inc.exit_code],
    ["incomplete", EXIT.incomplete],
  );
  assert.equal(inc.requested_not_run.length, 1);
  const f = summarize([s("fail"), s("not_run")]);
  assert.deepEqual([f.overall, f.exit_code], ["fail", EXIT.fail]);
  const none = summarize([excl, excl]);
  assert.deepEqual(
    [none.overall, none.exit_code],
    ["incomplete", EXIT.incomplete],
  );
  const bl = summarize([s("pass"), s("blocked"), s("expected_fail_by_design")]);
  assert.deepEqual(
    [bl.overall, bl.exit_code],
    ["pass_with_exceptions", EXIT.ok],
  );
});

// ---------------------------------------------------------------- run.mjs command line

const run = (args) => {
  const out = tmp();
  const r = spawnSync(process.execPath, [RUN, ...args, "--out", out], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 300_000,
  });
  const file = path.join(out, "results.json");
  const results = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : null;
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, results };
};
const step = (results, id) => results.steps.find((s) => s.id === id);

test("run.mjs: an unknown step id is a usage error and runs nothing", () => {
  const r = run(["--only", "lnt"]);
  assert.equal(r.code, EXIT.usage, r.stderr);
  assert.match(r.stderr, /unknown step id\(s\) in --only: lnt/);
  assert.equal(r.results, null);
});

test("run.mjs: --only test_e2e without build is incomplete (exit 3), never 0", () => {
  const r = run(["--only", "test_e2e"]);
  assert.equal(r.code, EXIT.incomplete, r.stdout + r.stderr);
  assert.equal(r.results.overall, "incomplete");
  assert.deepEqual(r.results.requested_not_run, ["test_e2e"]);
  const e = step(r.results, "test_e2e");
  assert.equal(e.classification, "not_run");
  assert.match(e.reason, /build excluded by --only\/--skip/);
  assert.equal(step(r.results, "build").excluded, true);
});

test("run.mjs: skipping every step is incomplete (exit 3)", () => {
  const r = run(["--skip", IDS.join(",")]);
  assert.equal(r.code, EXIT.incomplete, r.stdout + r.stderr);
  assert.equal(r.results.overall, "incomplete");
});

test("run.mjs: --only contracts_ajv runs it when node_modules is the lockfile's install, else exit 3", () => {
  const state = installState(ROOT);
  const r = run(["--only", "contracts_ajv"]);
  const c = step(r.results, "contracts_ajv");
  if (state.ok) {
    assert.notEqual(c.classification, "not_run", c.reason);
    assert.equal(c.exit_code, 0, `contracts_ajv exit ${c.exit_code}`);
    assert.equal(c.classification, "pass");
    assert.equal(c.prerequisites_from_state[0].id, "npm_ci");
    assert.equal(r.code, EXIT.ok);
  } else {
    assert.equal(c.classification, "not_run");
    assert.match(c.reason, /npm_ci excluded/);
    assert.equal(r.code, EXIT.incomplete);
  }
});
