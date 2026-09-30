/**
 * F03 contract validation from the repository itself (node --test, Ajv 8, JSON Schema 2020-12).
 *
 * - Every schema in the F02 contract set compiles under Ajv 2020-12 (meta-validated, unknown keywords refused).
 * - Every file in .orchestration/contracts/examples/valid/<name>/ passes its schema.
 * - Every file in .orchestration/contracts/examples/invalid/<name>/ is rejected for the reason its .why.txt states:
 *   - schema layer: Ajv reports the expected keyword at the expected instance path;
 *   - json-parse layer: strict JSON.parse refuses it, and a lenient parse still fails the schema at the stated path;
 *   - semantic / harness layer: by contract design the document is schema-VALID and only the harness rule rejects it
 *     (validate.py S3 enforces exactly that). This test asserts the schema accepts it and does not re-implement the
 *     harness; the rejection itself is checked by `.orchestration/contracts/validate.py` (tests/baseline/run.mjs).
 * - Every workshop fixture input (WM*.json, clip-rules.json rows and cases) passes workshop-inputs.schema.json, and
 *   fixtures/workshop/index.json lists exactly the fixture files on disk.
 *
 * The example-to-schema mapping mirrors SCHEMAS in validate.py. A new examples/ directory without a mapping fails.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Ajv2020 } from "ajv/dist/2020";
import type { ErrorObject, ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
// BASELINE_CONTRACTS_DIR points the test at a copy, for negative controls (tests/baseline/README.md).
const CONTRACTS = process.env.BASELINE_CONTRACTS_DIR
  ? path.resolve(process.env.BASELINE_CONTRACTS_DIR)
  : path.join(ROOT, ".orchestration", "contracts");

const SCHEMAS: Record<string, string> = {
  "event-envelope": "event-envelope.schema.json",
  "delivery-job": "delivery-job.schema.json",
  "feature-flags": "feature-flags.json",
  "offer-matrix": "offer-matrix.json",
  "asset-manifest": "asset-manifest.schema.json",
  "worker-handoff": "worker-handoff.schema.json",
  "workshop-inputs": "workshop-inputs.schema.json",
};

// strictTypes and strictRequired are Ajv lint rules, not JSON Schema: the contracts refine properties inside
// typeless if/then branches, which 2020-12 allows. Unknown keywords, formats and tuples stay strict.
const ajv = new Ajv2020({
  allErrors: true,
  verbose: true,
  strict: true,
  strictTypes: false,
  strictRequired: false,
});
addFormats(ajv);

const readJson = (p: string): unknown => JSON.parse(fs.readFileSync(p, "utf8"));
const listJson = (dir: string) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .sort()
    : [];
const subdirs = (dir: string) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

const validators = new Map<string, ValidateFunction>();
function validatorFor(name: string): ValidateFunction {
  let v = validators.get(name);
  if (!v) {
    v = ajv.compile(readJson(path.join(CONTRACTS, SCHEMAS[name])) as object);
    validators.set(name, v);
  }
  return v;
}
function errorsOf(name: string, doc: unknown): ErrorObject[] {
  const v = validatorFor(name);
  return v(doc) ? [] : [...(v.errors ?? [])];
}
const fmt = (errs: ErrorObject[]) =>
  errs
    .slice(0, 8)
    .map((e) => `${e.keyword}@${e.instancePath || "/"} ${e.message ?? ""}`)
    .join("; ");

/** The .why.txt parser of validate.py: first occurrence of each known key wins. */
const WHY_KEYS = new Set([
  "rule",
  "layer",
  "breaks",
  "expect_keyword",
  "expect_path",
  "expect_validator_value",
  "expect_message_contains",
  "expect_rule",
  "also_schema_keyword",
  "also_schema_path",
]);
function parseWhy(p: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    if (WHY_KEYS.has(k) && !(k in out)) out[k] = line.slice(i + 1).trim();
  }
  return out;
}
const normPath = (p: string | undefined) => {
  const s = (p ?? "").trim();
  if (s === "" || s === "/") return "";
  return s.startsWith("/") ? s : "/" + s;
};
const attributable = (p: string, expected: string) =>
  expected === "" ? p === "" : p === expected || p.startsWith(expected + "/");

/** Lenient parse for the json-parse layer: admits bare NaN / Infinity tokens outside strings. */
function lenientParse(text: string): unknown {
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      out += c;
      if (c === "\\") out += text[++i];
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      continue;
    }
    const rest = text.slice(i);
    const m = /^(-?Infinity|NaN)/.exec(rest);
    if (m) {
      out += `"__nonfinite__${m[1]}"`;
      i += m[1].length - 1;
      continue;
    }
    out += c;
  }
  return JSON.parse(out, (_k, v) =>
    typeof v === "string" && v.startsWith("__nonfinite__")
      ? Number(v.slice("__nonfinite__".length))
      : v,
  );
}

const exampleRoot = path.join(CONTRACTS, "examples");

test("every schema compiles under Ajv 2020-12", () => {
  for (const [name, file] of Object.entries(SCHEMAS)) {
    const schema = readJson(path.join(CONTRACTS, file)) as Record<
      string,
      unknown
    >;
    assert.equal(
      schema.$schema,
      "https://json-schema.org/draft/2020-12/schema",
      `${file} declares draft 2020-12`,
    );
    assert.doesNotThrow(() => validatorFor(name), `${file} compiles`);
  }
});

test("every examples/ directory maps to a schema of the contract set", () => {
  for (const kind of ["valid", "invalid"]) {
    for (const d of subdirs(path.join(exampleRoot, kind)))
      assert.ok(d in SCHEMAS, `examples/${kind}/${d}/ has no schema mapping`);
  }
  for (const name of Object.keys(SCHEMAS)) {
    assert.ok(
      listJson(path.join(exampleRoot, "valid", name)).length > 0,
      `${name}: valid examples present`,
    );
    assert.ok(
      listJson(path.join(exampleRoot, "invalid", name)).length > 0,
      `${name}: invalid examples present`,
    );
  }
});

for (const name of Object.keys(SCHEMAS)) {
  const vdir = path.join(exampleRoot, "valid", name);
  for (const f of listJson(vdir)) {
    test(`valid ${name}/${f} passes ${SCHEMAS[name]}`, () => {
      const errs = errorsOf(name, readJson(path.join(vdir, f)));
      assert.equal(errs.length, 0, fmt(errs));
    });
  }

  const idir = path.join(exampleRoot, "invalid", name);
  for (const f of listJson(idir)) {
    const whyPath = path.join(idir, f.replace(/\.json$/, ".why.txt"));
    test(`invalid ${name}/${f} is rejected for its stated reason`, () => {
      assert.ok(fs.existsSync(whyPath), `${f}: .why.txt missing`);
      const w = parseWhy(whyPath);
      const text = fs.readFileSync(path.join(idir, f), "utf8");
      const kw = w.expect_keyword ?? "";
      const want = normPath(w.expect_path);

      if (w.layer === "json-parse") {
        assert.throws(
          () => JSON.parse(text),
          `${f}: strict JSON.parse must refuse it`,
        );
        const also = normPath(w.also_schema_path);
        const errs = errorsOf(name, lenientParse(text));
        assert.ok(
          errs.length > 0,
          `${f}: lenient parse must still fail the schema`,
        );
        const hit = errs.filter(
          (e) => e.keyword !== "if" && attributable(e.instancePath, also),
        );
        const stray = errs.filter((e) =>
          e.keyword === "if"
            ? !(e.instancePath === "" || attributable(also, e.instancePath))
            : !attributable(e.instancePath, also),
        );
        assert.ok(
          hit.length > 0,
          `${f}: expected an error at ${also}; got ${fmt(errs)}`,
        );
        assert.equal(
          stray.length,
          0,
          `${f}: errors outside ${also}: ${fmt(stray)}`,
        );
        return;
      }

      const doc = JSON.parse(text);
      const errs = errorsOf(name, doc);

      if (
        kw.startsWith("semantic:") ||
        kw.startsWith("harness:") ||
        w.layer === "semantic"
      ) {
        // Contract design: only the harness rule may reject it (validate.py S3 fails if the schema does).
        assert.equal(
          errs.length,
          0,
          `${f}: must be schema-valid so only harness rule ${kw || w.expect_rule} rejects it; got ${fmt(errs)}`,
        );
        return;
      }

      assert.ok(
        errs.length > 0,
        `${f}: unexpectedly ACCEPTED by ${SCHEMAS[name]}`,
      );
      const wantValue =
        w.expect_validator_value !== undefined
          ? JSON.parse(w.expect_validator_value)
          : undefined;
      const contains = (w.expect_message_contains ?? "").replace(
        /^'(.*)'$/,
        "$1",
      );
      const hit = errs.filter(
        (e) =>
          e.keyword === kw &&
          e.instancePath === want &&
          (wantValue === undefined ||
            JSON.stringify(e.schema) === JSON.stringify(wantValue)) &&
          (contains === "" ||
            JSON.stringify(e.params).includes(contains) ||
            (e.message ?? "").includes(contains)),
      );
      assert.ok(
        hit.length > 0,
        `${f}: expected ${kw} at ${want || "/"}${wantValue !== undefined ? ` (value ${w.expect_validator_value})` : ""}${contains ? ` mentioning ${contains}` : ""}; got ${fmt(errs)}`,
      );
      if (name === "workshop-inputs") {
        // Ajv adds a summary error (keyword "if", "must match then schema") at the object that owns a failed
        // if/then branch; Python jsonschema reports only the inner keyword. Such a summary is accepted only when
        // it sits on the expected path or one of its ancestors; any other error is stray.
        const stray = errs.filter((e) =>
          e.keyword === "if"
            ? !(e.instancePath === "" || attributable(want, e.instancePath))
            : !attributable(e.instancePath, want),
        );
        assert.equal(
          stray.length,
          0,
          `${f}: errors outside ${want || "/"}: ${fmt(stray)}`,
        );
      }
    });
  }
}

const fixDir = path.join(CONTRACTS, "fixtures", "workshop");

test("fixtures/workshop/index.json lists exactly the fixture files on disk", () => {
  const idx = readJson(path.join(fixDir, "index.json")) as {
    fixtures: { file: string }[];
  };
  const listed = idx.fixtures.map((e) => e.file).sort();
  const onDisk = listJson(fixDir).filter((f) => f !== "index.json");
  assert.deepEqual(listed, onDisk);
});

for (const f of listJson(fixDir).filter((x) => /^WM\d+/.test(x))) {
  test(`fixture ${f}: input passes workshop-inputs.schema.json`, () => {
    const doc = readJson(path.join(fixDir, f)) as { input: unknown };
    const errs = errorsOf("workshop-inputs", doc.input);
    assert.equal(errs.length, 0, fmt(errs));
  });
}

test("fixture clip-rules.json: every possible row and supplementary case input passes workshop-inputs.schema.json", () => {
  const cr = readJson(path.join(fixDir, "clip-rules.json")) as {
    truth_table: { row: number; possible: boolean; input?: unknown }[];
    supplementary_cases?: { case: string; input?: unknown }[];
  };
  assert.equal(cr.truth_table.length, 32, "32-row truth table");
  let checked = 0;
  for (const r of cr.truth_table) {
    if (!r.possible) continue;
    const errs = errorsOf("workshop-inputs", r.input);
    assert.equal(errs.length, 0, `row ${r.row}: ${fmt(errs)}`);
    checked++;
  }
  for (const c of cr.supplementary_cases ?? []) {
    const errs = errorsOf("workshop-inputs", c.input);
    assert.equal(errs.length, 0, `${c.case}: ${fmt(errs)}`);
    checked++;
  }
  assert.ok(checked > 0, "at least one clip-rules input checked");
});
