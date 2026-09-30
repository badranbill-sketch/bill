// Ajv 8 (draft 2020-12) cross-validator for workshop-inputs.schema.json (A6 attempt 2).
// Checks the same examples as validate_schema.py with a second, independent validator and
// records the validator-dependent behaviour of Infinity / NaN / integer-valued floats.
import { createRequire } from "module";
import fs from "fs";
import path from "path";
const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020").default;

const C = "/home/user/bill/.orchestration/contracts";
const schema = JSON.parse(fs.readFileSync(`${C}/workshop-inputs.schema.json`, "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
let ok = 0, bad = 0;
const rec = (c, m) => { if (c) { ok++; console.log("  ok  ", m); } else { bad++; console.log("  FAIL", m); } };
const errs = (d) => (validate(d) ? [] : validate.errors.map((e) => [e.keyword, e.instancePath, JSON.stringify(e.params)]));
// lenient parse: map bare NaN / Infinity tokens to real JS values
const lenient = (txt) => JSON.parse(txt.replace(/:\s*(-?Infinity|NaN)\b/g, ': "__NF_$1__"'), (k, v) =>
  (typeof v === "string" && v.startsWith("__NF_")) ? Number(v.slice(5, -2)) : v);

console.log("== valid examples + fixture inputs (Ajv)");
for (const f of fs.readdirSync(`${C}/examples/valid/workshop-inputs`).sort()) {
  const e = errs(JSON.parse(fs.readFileSync(`${C}/examples/valid/workshop-inputs/${f}`, "utf8")));
  rec(e.length === 0, `${f} errors=${e.length}`);
}
let nfx = 0, badfx = [];
for (const f of fs.readdirSync(`${C}/fixtures/workshop`).filter((x) => x.startsWith("WM")).sort()) {
  const d = JSON.parse(fs.readFileSync(`${C}/fixtures/workshop/${f}`, "utf8"));
  nfx++; if (errs(d.input).length) badfx.push(f);
}
const cr = JSON.parse(fs.readFileSync(`${C}/fixtures/workshop/clip-rules.json`, "utf8"));
const crIn = cr.truth_table.filter((r) => r.input).map((r) => r.input).concat(cr.supplementary_cases.map((c) => c.input));
for (const [i, d] of crIn.entries()) if (errs(d).length) badfx.push(`clip-input-${i}`);
rec(badfx.length === 0, `${nfx} WM inputs + ${crIn.length} clip-rule inputs accepted; rejected: ${JSON.stringify(badfx)}`);

console.log("== invalid examples (Ajv)");
const report = [];
for (const f of fs.readdirSync(`${C}/examples/invalid/workshop-inputs`).filter((x) => x.endsWith(".json")).sort()) {
  const name = f.slice(0, -5);
  const why = Object.fromEntries(fs.readFileSync(`${C}/examples/invalid/workshop-inputs/${name}.why.txt`, "utf8")
    .split("\n").filter((l) => l.includes(":")).map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]));
  const txt = fs.readFileSync(`${C}/examples/invalid/workshop-inputs/${f}`, "utf8");
  let strictOk = true; try { JSON.parse(txt); } catch { strictOk = false; }
  const e = errs(lenient(txt));
  report.push({ name, layer: why.layer, strictOk, e });
  if (why.layer === "schema") {
    const m = e.filter((x) => x[0] === why.expect_keyword && x[1] === why.expect_path);
    // Ajv adds an "if" wrapper error for failed if/then clauses; it is not a different rule
    const unrelated = e.filter((x) => !(x[0] === why.expect_keyword && x[1] === why.expect_path) && x[0] !== "if");
    rec(strictOk && m.length > 0 && unrelated.length === 0, `${name}: expect ${why.expect_keyword}@${why.expect_path || "/"} -> ${JSON.stringify(e.map((x) => x[0] + "@" + x[1]))}`);
  } else if (why.layer === "semantic") {
    rec(strictOk && e.length === 0, `${name}: schema-valid under Ajv (semantic rule ${why.expect_rule}) errors=${e.length}`);
  } else {
    rec(!strictOk && e.length > 0, `${name}: strict JSON.parse rejected=${!strictOk}; lenient -> ${JSON.stringify(e.map((x) => x[0] + "@" + x[1]))}`);
  }
}
fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "out", "invalid_examples_ajv.json"), JSON.stringify(report, null, 1));

console.log("== validator-dependent behaviour (informative)");
const base = JSON.parse(fs.readFileSync(`${C}/examples/valid/workshop-inputs/complete-single.json`, "utf8"));
const withV = (v) => { const d = structuredClone(base); d.chapters.life.spending.amount = { status: "estimated", value: v }; return d; };
console.log("  Ajv Infinity   ->", JSON.stringify(errs(withV(Infinity)).map((x) => x[0] + "@" + x[1])));
console.log("  Ajv NaN        ->", JSON.stringify(errs(withV(NaN)).map((x) => x[0] + "@" + x[1])));
console.log("  Ajv 450000.0   ->", JSON.stringify(errs(withV(450000.0))), "(JS has no integer/float distinction; runtime Number.isSafeInteger needed for 1e300 etc.)");
console.log("  Ajv 2**53      ->", JSON.stringify(errs(withV(2 ** 53)).map((x) => x[0] + "@" + x[1])));
console.log("  Number.isSafeInteger(Infinity) =", Number.isSafeInteger(Infinity), " Number.isFinite(NaN) =", Number.isFinite(NaN));
console.log("== float64 contrast (why the contract forbids float math)");
console.log("  WM17: Math.round(1000050*1.01) =", Math.round(1000050 * 1.01), "(half-even of exact 1010050.5 is 1010050)");
console.log("  WM24: 1000800*1.025*1.025 =", (1000800 * 1.025 * 1.025).toPrecision(17), "Math.round ->", Math.round(1000800 * 1.025 * 1.025), "(exact 1051465.5 -> half-even 1051466)");
console.log(`== summary: ${ok} ok, ${bad} failed`);
process.exit(bad ? 1 : 0);
