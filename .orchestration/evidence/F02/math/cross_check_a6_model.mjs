// Cross-check of the repaired fixtures against the A6 attempt-1 independent model
// (evidence/F02/a6-math-attempt1/model.mjs, imported read-only, unmodified). Informative only.
import fs from 'node:fs';
import { computeModel } from '../a6-math-attempt1/model.mjs';
import { deepDiff } from '../a6-math-attempt1/run_fixtures_lib.mjs';
const FD = '/home/user/bill/.orchestration/contracts/fixtures/workshop';
const files = fs.readdirSync(FD).filter((f) => /^WM\d\d-/.test(f)).sort();
const fx = Object.fromEntries(files.map((f) => [f.slice(0, 4), JSON.parse(fs.readFileSync(`${FD}/${f}`, 'utf8'))]));
const diff = (id, opts = {}) => deepDiff(JSON.parse(JSON.stringify(computeModel(fx[id].input, opts))), fx[id].expected);
console.log('== baseline: A6 model (default options) vs every WM fixture');
for (const id of Object.keys(fx)) {
  const d = diff(id);
  console.log(`${id} differences: ${d.length}${d.length ? '  e.g. ' + d.slice(0, 2).join(' | ') : ''}`);
}
console.log('\n== faults from reviews/F02-math.md P2-1/P2-2/P3-1, on the fixtures written for them');
const cases = [
  ['unknownSpendingZeroRowsOnly', ['WM25']],
  ['startPointUnknownAsNotPaying', ['WM26', 'WM33']],
  ['startPointUnknownAsAlreadyReceiving', ['WM26', 'WM33']],
  ['unresolvableStartAsNotPayingWindowKnown', ['WM29']],
  ['unknownEndAsOpen', ['WM27', 'WM28']],
  ['unknownFirst', ['WM32', 'WM33']],
  ['crDiscountToBase', ['WM35']],
  ['ignoreNoPositiveGap', ['WM36']],
];
for (const [fault, ids] of cases) {
  for (const id of ids) {
    const base = diff(id).length, faulty = diff(id, { [fault]: true }).length;
    console.log(`${fault.padEnd(40)} ${id}: baseline differences ${base}, with fault ${faulty} -> ${faulty > base ? 'CAUGHT' : 'MISSED'}`);
  }
}
console.log('\n== repair 3 (F02-MATH2-P2-1): the attempt-1 model predates the new s5 rule 1 (groups null under incomplete coverage)');
console.log('   Known older-model differences: WM25 and WM34 (repair 2, see above); WM07 and WM30 (repair 3, checked below).');
const GROUP = /^\/years\/\d+\/income_(net|gross|unknown_basis)_cents: got .+ expected null$/;
for (const id of ['WM07', 'WM30']) {
  const d = diff(id);
  const grp = d.filter((x) => GROUP.test(x));
  const other = d.filter((x) => !GROUP.test(x));
  const rows = fx[id].expected.years.length;
  console.log(`${id}: ${grp.length} of ${d.length} differences are income group fields where the fixture has null (${rows} rows x 3 fields = ${rows * 3}); differences elsewhere: ${other.length}${other.length ? '  e.g. ' + other.slice(0, 2).join(' | ') : ''}`);
}
