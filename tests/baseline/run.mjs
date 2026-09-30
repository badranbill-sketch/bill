#!/usr/bin/env node
/**
 * F03 reproducible baseline check suite. Runs the CI-equivalent steps of .github/workflows/verify.yml plus the
 * repository guards, the contract validation and the task-graph check, one step at a time, and classifies each:
 *
 *   pass                     exit 0
 *   fail                     non-zero exit that no rule below explains (never downgraded)
 *   expected_fail_by_design  only launch_check, only when every blocker it prints is one of the approval flags in
 *                            lib/business.ts and LAUNCH-CHECKLIST.md still documents the intentional failure
 *   blocked                  a missing tool, secret or browser build, with the reason (the output must match)
 *   not_run                  a prerequisite step did not pass, or the step was excluded with --only/--skip
 *
 * Exit status: 1 if any step is "fail", else 0. Blocked, not_run and expected_fail_by_design steps are listed in
 * the summary and in results.json; they never turn into "pass".
 *
 * Usage: node tests/baseline/run.mjs [--out DIR] [--only id,id] [--skip id,id] [--python BIN] [--list]
 *   --out     results directory (default test-results/baseline); logs, results.json, base02 captures
 *   --python  Python with jsonschema for .orchestration/contracts/validate.py (default $BASELINE_PYTHON or python3)
 *
 * Environment is passed through to every step, plus NEXT_TELEMETRY_DISABLED=1. Values of variables whose names
 * look secret (TOKEN, SECRET, PASSWORD, API_KEY, PRIVATE) are redacted from the logs; results.json records only
 * whether they were present. Logs are staged outside test-results/ and copied to --out after every step, because
 * Playwright empties test-results/ when the e2e run starts.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const list = (s) =>
  s
    ? s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    : null;
const OUT = path.resolve(ROOT, opt("out", "test-results/baseline"));
const ONLY = list(opt("only"));
const SKIP = list(opt("skip")) ?? [];
const PYTHON = opt("python", process.env.BASELINE_PYTHON || "python3");
const STAGE = fs.mkdtempSync(path.join(os.tmpdir(), "bill-baseline-"));
const MIN = 60_000;

const SECRET_NAME = /(TOKEN|SECRET|PASSWORD|API_KEY|PRIVATE)/i;
const secretValues = Object.entries(process.env)
  .filter(([k, v]) => SECRET_NAME.test(k) && v && v.length >= 6)
  .map(([k, v]) => [k, v]);
const redact = (text) =>
  secretValues.reduce((t, [k, v]) => t.split(v).join(`[REDACTED:${k}]`), text);

const sh = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", ...opts });
const firstLine = (r) =>
  r.status === 0 ? (r.stdout || r.stderr).trim().split("\n")[0] : null;
const which = (bin) => sh("sh", ["-c", `command -v ${bin}`]).status === 0;

/** A value read from the repository with node + tsx (null when it cannot be read). */
function tsxEval(code) {
  const r = sh(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "-e", code],
    {
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    },
  );
  return r.status === 0 ? r.stdout.trim() : null;
}

function launchDoc() {
  const f = path.join(ROOT, "LAUNCH-CHECKLIST.md");
  if (!fs.existsSync(f)) return null;
  const lines = fs.readFileSync(f, "utf8").split("\n");
  const i = lines.findIndex((l) =>
    /launch:check`? intentionally fails/.test(l),
  );
  return i < 0 ? null : `LAUNCH-CHECKLIST.md:${i + 1}`;
}

function browserInfo() {
  const exe = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  let expected = null;
  try {
    const b = JSON.parse(
      fs.readFileSync(
        path.join(ROOT, "node_modules/playwright-core/browsers.json"),
        "utf8",
      ),
    ).browsers.find((x) => x.name === "chromium");
    const v = JSON.parse(
      fs.readFileSync(
        path.join(ROOT, "node_modules/@playwright/test/package.json"),
        "utf8",
      ),
    ).version;
    expected = `Playwright ${v} expects chromium rev ${b.revision} (${b.browserVersion})`;
  } catch {
    /* node_modules not installed yet */
  }
  if (!exe)
    return {
      mode: "playwright-default",
      executable: null,
      version: null,
      expected,
    };
  const r = sh(exe, ["--version"]);
  return {
    mode: "substitute",
    executable: exe,
    version: firstLine(r),
    expected,
  };
}

const count = (log, re) => {
  const m = log.match(re);
  return m ? Number(m[1]) : null;
};
const nodeTestNote = (log) => {
  const t = count(log, /^# tests (\d+)/m);
  return t === null
    ? null
    : `node:test ${count(log, /^# pass (\d+)/m)}/${t} passed, ${count(log, /^# fail (\d+)/m)} failed`;
};
const playwrightNote = (log) => {
  const parts = ["passed", "failed", "flaky", "skipped", "did not run"]
    .map((k) => [k, count(log, new RegExp(`^\\s*(\\d+) ${k}`, "m"))])
    .filter(([, n]) => n !== null)
    .map(([k, n]) => `${n} ${k}`);
  return parts.length ? `playwright: ${parts.join(", ")}` : null;
};
const browserLabel = () => {
  const b = browserInfo();
  return b.mode === "substitute"
    ? `under substitute ${b.version ?? b.executable} via PLAYWRIGHT_CHROMIUM_EXECUTABLE${b.expected ? `; ${b.expected}` : ""}`
    : `Playwright default browser${b.expected ? ` (${b.expected})` : ""}`;
};
const e2eClassify = ({ code, log }) => {
  const note = [playwrightNote(log), browserLabel()].filter(Boolean).join("; ");
  if (code === 0) return { classification: "pass", note };
  if (
    /Executable doesn't exist|browserType\.launch: .*(ENOENT|not found)/.test(
      log,
    )
  )
    return {
      classification: "blocked",
      reason:
        "Playwright browser build not installed (set PLAYWRIGHT_CHROMIUM_EXECUTABLE or run npx playwright install chromium)",
      note,
    };
  return { classification: "fail", note };
};

const STEPS = [
  {
    id: "npm_ci",
    title: "Clean install (verify.yml)",
    cmd: "npm ci",
    timeout: 15 * MIN,
  },
  {
    id: "lint",
    title: "ESLint (verify.yml)",
    cmd: "npm run lint",
    needs: ["npm_ci"],
  },
  {
    id: "test",
    title: "Unit tests (verify.yml)",
    cmd: "npm test",
    needs: ["npm_ci"],
    classify: ({ code, log }) => ({
      classification: code === 0 ? "pass" : "fail",
      note: nodeTestNote(log),
    }),
  },
  {
    id: "typecheck",
    title: "TypeScript before build",
    cmd: "npm run typecheck",
    needs: ["npm_ci"],
  },
  {
    id: "build",
    title: "Production build (verify.yml)",
    cmd: "npm run build",
    needs: ["npm_ci"],
    timeout: 15 * MIN,
  },
  {
    id: "typecheck_after_build",
    title: "TypeScript after build (verify.yml order)",
    cmd: "npm run typecheck",
    needs: ["npm_ci"],
  },
  {
    id: "protections_check",
    title: "Branch-protection audit (scripts/protections.ts)",
    cmd: "npm run protections:check",
    needs: ["npm_ci"],
    classify: ({ code, log }) => {
      if (code === 0) return { classification: "pass" };
      if (/Set GITHUB_REPOSITORY/.test(log))
        return {
          classification: "blocked",
          reason: `GITHUB_REPOSITORY is not set; the audit needs the repository name and an authenticated gh CLI${which("gh") ? "" : " (gh is also not installed here)"}`,
        };
      if (/spawnSync gh ENOENT/.test(log))
        return {
          classification: "blocked",
          reason: "gh CLI is not installed in this environment",
        };
      if (/gh auth login|HTTP 401|authentication required/i.test(log))
        return {
          classification: "blocked",
          reason: "gh CLI is not authenticated (no token provided)",
        };
      return { classification: "fail" };
    },
  },
  {
    id: "launch_check",
    title: "Strict launch guard (npm run launch:check)",
    cmd: "npm run launch:check",
    needs: ["npm_ci"],
    classify: ({ code, log }) => {
      if (code === 0) return { classification: "pass" };
      const m = log.match(/Launch blocked: (.+)/);
      const flags = JSON.parse(
        tsxEval(
          "const m = await import('./lib/business.ts'); console.log(JSON.stringify(Object.keys((m.business ?? m.default.business).approvals)))",
        ) ?? "null",
      );
      const doc = launchDoc();
      const items = m ? m[1].trim().split(/,\s*/) : [];
      const extra = flags ? items.filter((x) => !flags.includes(x)) : items;
      if (code === 1 && m && flags && doc && items.length && extra.length === 0)
        return {
          classification: "expected_fail_by_design",
          citation: `${doc} ("npm run launch:check intentionally fails for the unresolved approval categories"); .orchestration/decisions.md D-061`,
          note: `blocked only by ${items.length} approval flag(s) of lib/business.ts: ${items.join(", ")}`,
        };
      return {
        classification: "fail",
        note: extra.length
          ? `blockers beyond the approval flags: ${extra.join(", ")}`
          : null,
      };
    },
  },
  {
    id: "verify_publication",
    title: "Hash-bound publication check (verify.yml)",
    cmd: "node --import tsx scripts/verify-publication.ts",
    needs: ["npm_ci"],
    classify: ({ code, log }) => {
      const published = tsxEval(
        "const m = await import('./lib/articles.ts'); console.log(m.articles().filter((a) => a.status === 'published').length)",
      );
      const note =
        published === "0"
          ? "vacuous: 0 articles have status=published, so no GitHub API call is made"
          : published === null
            ? "published-article count not readable"
            : `${published} published article(s) verified`;
      if (code === 0) return { classification: "pass", note };
      if (/spawnSync gh ENOENT/.test(log))
        return {
          classification: "blocked",
          reason: "gh CLI is not installed; published articles need it",
          note,
        };
      return { classification: "fail", note };
    },
  },
  {
    id: "test_e2e",
    title: "Browser tests (verify.yml, playwright.config.ts)",
    cmd: "npm run test:e2e",
    needs: ["build"],
    timeout: 25 * MIN,
    classify: e2eClassify,
  },
  {
    id: "contracts_ajv",
    title:
      "Contract examples and fixtures, Ajv 2020-12 (npm run test:contracts)",
    cmd: "npm run test:contracts",
    needs: ["npm_ci"],
    classify: ({ code, log }) => ({
      classification: code === 0 ? "pass" : "fail",
      note: nodeTestNote(log),
    }),
  },
  {
    id: "contracts_validate_py",
    title: "Contract harness .orchestration/contracts/validate.py",
    cmd: `${PYTHON} .orchestration/contracts/validate.py`,
    env: { PYTHONDONTWRITEBYTECODE: "1" },
    pre: () => {
      if (sh(PYTHON, ["-c", "import jsonschema"]).status !== 0)
        return `${PYTHON} cannot import jsonschema (see .orchestration/contracts/README.md §7; pass --python)`;
      return null;
    },
    classify: ({ code, log }) => {
      const tail =
        [
          log.match(/^pass: \d+\s+fail: \d+\s+known: \d+.*$/m)?.[0],
          ...(log.match(/^ {2}- .*$/gm) ?? []).map((l) =>
            l.trim().slice(0, 300),
          ),
        ]
          .filter(Boolean)
          .join(" | ") || null;
      if (code === 0) return { classification: "pass", note: tail };
      if (code === 2)
        return {
          classification: "blocked",
          reason: `validate.py setup error (exit 2): ${(log.match(/^.*(error|missing).*$/im) ?? ["see log"])[0].slice(0, 200)}`,
        };
      return { classification: "fail", note: tail };
    },
  },
  {
    id: "build_graph_check",
    title: "Task graph and acceptance catalog regenerate unchanged",
    cmd: "python3 .orchestration/scripts/build_graph.py --check",
    env: { PYTHONDONTWRITEBYTECODE: "1" },
    pre: () => (which("python3") ? null : "python3 not found"),
  },
  {
    id: "base02_capture",
    title:
      "BASE02 screenshots, console and status capture (npm run test:base02)",
    cmd: "npm run test:base02",
    needs: ["build"],
    timeout: 25 * MIN,
    env: { BASE02_OUT: path.join(STAGE, "base02") },
    classify: e2eClassify,
  },
];

if (argv.includes("--list")) {
  for (const s of STEPS) console.log(`${s.id.padEnd(24)} ${s.cmd}`);
  process.exit(0);
}

function gitInfo() {
  return {
    head: firstLine(sh("git", ["rev-parse", "HEAD"])),
    branch: firstLine(sh("git", ["rev-parse", "--abbrev-ref", "HEAD"])),
    status: (sh("git", ["status", "--porcelain"]).stdout || "")
      .split("\n")
      .filter(Boolean),
  };
}

function sync() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.cpSync(STAGE, OUT, { recursive: true, force: true });
}

function runStep(step, logPath) {
  return new Promise((resolve) => {
    const started = new Date();
    const t0 = process.hrtime.bigint();
    const fd = fs.openSync(logPath, "w");
    const header = [
      `# step: ${step.id} - ${step.title}`,
      `# command: ${step.cmd}`,
      `# cwd: ${ROOT}`,
      `# started: ${started.toISOString()}`,
      `# env overrides: ${JSON.stringify({ NEXT_TELEMETRY_DISABLED: "1", ...(step.env ?? {}) })}`,
      "",
    ].join("\n");
    fs.writeSync(fd, header + "\n");
    let text = "";
    const child = spawn("sh", ["-c", step.cmd], {
      cwd: ROOT,
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1",
        ...(step.env ?? {}),
      },
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const onData = (buf) => {
      const s = redact(buf.toString());
      text += s;
      fs.writeSync(fd, s);
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    let timedOut = false;
    const timer = setTimeout(
      () => {
        timedOut = true;
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {
          /* already gone */
        }
      },
      step.timeout ?? 10 * MIN,
    );
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      const seconds = Number(process.hrtime.bigint() - t0) / 1e9;
      const exit = code ?? (signal ? 128 : 1);
      fs.writeSync(
        fd,
        `\n# finished: ${new Date().toISOString()}\n# exit: ${exit}${signal ? ` (signal ${signal})` : ""}${timedOut ? " (timeout)" : ""}\n# seconds: ${seconds.toFixed(2)}\n`,
      );
      fs.closeSync(fd);
      resolve({
        code: exit,
        seconds,
        log: text,
        timedOut,
        started: started.toISOString(),
      });
    });
  });
}

const results = {
  suite: "tests/baseline/run.mjs",
  task: "F03",
  started_at: new Date().toISOString(),
  finished_at: null,
  root: ROOT,
  out: OUT,
  git_before: gitInfo(),
  git_after: null,
  dirtied_by_suite: null,
  environment: {
    node: process.version,
    npm: firstLine(sh("npm", ["--version"])),
    python_for_validate: PYTHON,
    python_version: firstLine(sh(PYTHON, ["--version"])),
    os: `${os.type()} ${os.release()} ${os.arch()}`,
    browser: browserInfo(),
    gh_cli_installed: which("gh"),
    env_present: Object.fromEntries(
      [
        "GITHUB_REPOSITORY",
        "GH_TOKEN",
        "GITHUB_TOKEN",
        "CONTENT_REVIEWERS",
        "FIRM_REVIEWERS",
        "PLAYWRIGHT_CHROMIUM_EXECUTABLE",
        "CI",
      ].map((k) => [k, Boolean(process.env[k])]),
    ),
  },
  steps: [],
  summary: null,
  overall: null,
  exit_code: null,
};

const byId = new Map();
const writeResults = () => {
  fs.writeFileSync(
    path.join(STAGE, "results.json"),
    JSON.stringify(results, null, 2) + "\n",
  );
  sync();
};

let n = 0;
for (const step of STEPS) {
  n++;
  const logName = `${String(n).padStart(2, "0")}_${step.id}.log`;
  const base = {
    id: step.id,
    title: step.title,
    command: step.cmd,
    log: null,
    exit_code: null,
    seconds: null,
  };
  let rec;
  const excluded = (ONLY && !ONLY.includes(step.id)) || SKIP.includes(step.id);
  const unmet = (step.needs ?? []).filter(
    (d) => byId.get(d)?.classification !== "pass",
  );
  const preReason = !excluded && !unmet.length && step.pre ? step.pre() : null;
  if (excluded) {
    rec = {
      ...base,
      classification: "not_run",
      reason: "excluded by --only/--skip",
    };
  } else if (unmet.length) {
    rec = {
      ...base,
      classification: "not_run",
      reason: `prerequisite ${unmet.map((d) => `${d}=${byId.get(d)?.classification ?? "absent"}`).join(", ")}`,
    };
  } else if (preReason) {
    rec = { ...base, classification: "blocked", reason: preReason };
  } else {
    process.stdout.write(`[${step.id}] ${step.cmd} ... `);
    const logPath = path.join(STAGE, logName);
    const r = await runStep(step, logPath);
    const c = r.timedOut
      ? {
          classification: "fail",
          reason: `timeout after ${(step.timeout ?? 10 * MIN) / MIN} min`,
        }
      : step.classify
        ? step.classify({ code: r.code, log: r.log })
        : { classification: r.code === 0 ? "pass" : "fail" };
    rec = {
      ...base,
      log: logName,
      exit_code: r.code,
      seconds: Number(r.seconds.toFixed(2)),
      started_at: r.started,
      ...c,
    };
    if (rec.classification === "pass" && r.code !== 0)
      rec = { ...rec, classification: "fail", reason: "non-zero exit" };
    console.log(`${rec.classification} (exit ${r.code}, ${rec.seconds}s)`);
  }
  if (!rec.log)
    console.log(`[${step.id}] ${rec.classification}: ${rec.reason}`);
  byId.set(step.id, rec);
  results.steps.push(rec);
  writeResults();
}

results.finished_at = new Date().toISOString();
// Re-read after npm ci: the Playwright expectation comes from node_modules, which may not exist at start.
results.environment.browser = browserInfo();
results.git_after = gitInfo();
const beforeSet = new Set(results.git_before.status);
results.dirtied_by_suite = results.git_after.status.filter(
  (l) => !beforeSet.has(l),
);
const tally = {};
for (const s of results.steps)
  tally[s.classification] = (tally[s.classification] ?? 0) + 1;
results.summary = tally;
results.overall = tally.fail
  ? "fail"
  : Object.keys(tally).some((k) => k !== "pass")
    ? "pass_with_exceptions"
    : "pass";
results.exit_code = tally.fail ? 1 : 0;
writeResults();
fs.rmSync(STAGE, { recursive: true, force: true });

console.log(
  "\nstep                     class                    exit  seconds",
);
for (const s of results.steps)
  console.log(
    `${s.id.padEnd(24)} ${s.classification.padEnd(24)} ${String(s.exit_code ?? "-").padEnd(5)} ${s.seconds ?? "-"}${s.reason ? `  (${s.reason})` : ""}`,
  );
console.log(
  `\noverall: ${results.overall} ${JSON.stringify(tally)}; results: ${path.join(OUT, "results.json")}`,
);
process.exit(results.exit_code);
