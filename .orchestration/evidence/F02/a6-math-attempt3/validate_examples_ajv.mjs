// Validate the 5 valid and 27 invalid workshop-inputs examples with Ajv 8 (draft 2020-12)
// plus the independent semantic checker; compare to each .why.txt's stated rule/keyword/path.
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { semanticErrors } from './model.mjs';

const ROOT = '/home/user/bill/.orchestration/contracts';
const schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'workshop-inputs.schema.json'), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
ajv.addMetaSchema; // default 2020 meta
const metaOk = ajv.validateSchema(schema);
console.log(`metaschema (Ajv 2020-12) valid: ${metaOk}`);
const validate = ajv.compile(schema);

// lenient parse for NaN/Infinity literals
function lenientParse(txt) {
  try { return { strict: true, doc: JSON.parse(txt) }; } catch (e) {
    const doc = Function('"use strict"; return (' + txt + ');')();
    return { strict: false, doc, strictError: e.message };
  }
}
function parseWhy(txt) { const o = {}; for (const line of txt.split('\n')) { const m = line.match(/^([a-z_]+):\s?(.*)$/); if (m) o[m[1]] = m[2]; } return o; }

let bad = 0;
const vdir = path.join(ROOT, 'examples/valid/workshop-inputs');
for (const f of fs.readdirSync(vdir).sort()) {
  const doc = JSON.parse(fs.readFileSync(path.join(vdir, f), 'utf8'));
  const ok = validate(doc); const sem = semanticErrors(doc);
  console.log(`VALID ${f}: schema=${ok} semantic=${sem.length ? JSON.stringify(sem) : 'ok'}`);
  if (!ok || sem.length) { bad++; console.log(JSON.stringify(validate.errors).slice(0, 400)); }
}
const idir = path.join(ROOT, 'examples/invalid/workshop-inputs');
const results = [];
for (const f of fs.readdirSync(idir).filter((x) => x.endsWith('.json')).sort()) {
  const why = parseWhy(fs.readFileSync(path.join(idir, f.replace('.json', '.why.txt')), 'utf8'));
  const { strict, doc, strictError } = lenientParse(fs.readFileSync(path.join(idir, f), 'utf8'));
  const ok = validate(doc);
  const errs = (validate.errors || []).filter((e) => e.keyword !== 'if');
  const sem = ok ? semanticErrors(doc) : [];
  let verdict, detail;
  if (why.layer === 'semantic') {
    const hit = sem.find((s) => s.rule === why.expect_rule && s.path === why.expect_path);
    verdict = ok && hit && sem.length === 1 ? 'OK' : 'MISMATCH';
    detail = `schema_valid=${ok} semantic=${JSON.stringify(sem)}`;
  } else if (why.layer === 'json-parse') {
    const hit = errs.some((e) => e.instancePath === why.also_schema_path);
    verdict = !strict && !ok && hit ? 'OK' : 'MISMATCH';
    detail = `strict_parse_rejected=${!strict} (${strictError}); ajv keywords at path: ${[...new Set(errs.filter((e) => e.instancePath === why.also_schema_path).map((e) => e.keyword))].join(',')}; all errors: ${errs.map((e) => e.instancePath + ':' + e.keyword).join(' ')}`;
  } else {
    const hit = errs.filter((e) => e.keyword === why.expect_keyword && e.instancePath === (why.expect_path || ''));
    let valueOk = true;
    if (why.expect_validator_value !== undefined && hit.length) {
      const ev = JSON.parse(why.expect_validator_value);
      valueOk = hit.some((e) => JSON.stringify(e.params.limit ?? e.params.missingProperty ?? null) === JSON.stringify(ev) || (Array.isArray(ev) && ev.includes(e.params.missingProperty)));
    }
    let msgOk = true;
    if (why.expect_message_contains) { const needle = why.expect_message_contains.replace(/'/g, ''); msgOk = hit.some((e) => JSON.stringify(e.params).includes(needle)); }
    const unrelated = errs.filter((e) => !(e.keyword === why.expect_keyword && e.instancePath === (why.expect_path || '')));
    verdict = !ok && hit.length && valueOk && msgOk ? 'OK' : 'MISMATCH';
    detail = `hits=${hit.length} value_ok=${valueOk} msg_ok=${msgOk}; other errors: ${unrelated.map((e) => e.instancePath + ':' + e.keyword + (e.params.limit !== undefined ? '(' + e.params.limit + ')' : '')).join(' ') || 'none'}`;
  }
  if (verdict !== 'OK') bad++;
  results.push({ file: f, rule: why.rule, layer: why.layer, verdict, detail });
  console.log(`INVALID ${verdict} ${f} [${why.rule}] ${detail}`);
}
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/invalid_examples_ajv.json', JSON.stringify(results, null, 1));
console.log(bad ? `${bad} problems` : 'ALL EXAMPLES BEHAVE AS STATED (Ajv 8)');
process.exitCode = bad ? 1 : 0;
