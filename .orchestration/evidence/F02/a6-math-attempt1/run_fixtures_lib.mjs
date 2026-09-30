// Structural diff used by run_fixtures.mjs and negative_controls.mjs
export function deepDiff(a, b, p = '', out = []) {
  if (a === b) return out;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    if (!(Number.isNaN(a) && Number.isNaN(b))) out.push(`${p || '/'}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
    return out;
  }
  if (Array.isArray(a) !== Array.isArray(b)) { out.push(`${p}: array/object mismatch`); return out; }
  if (Array.isArray(a)) {
    if (a.length !== b.length) out.push(`${p}: length got ${a.length} expected ${b.length}`);
    for (let k = 0; k < Math.min(a.length, b.length); k++) deepDiff(a[k], b[k], `${p}/${k}`, out);
    return out;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (!(k in a)) out.push(`${p}/${k}: missing in computed (expected ${JSON.stringify(b[k])})`);
    else if (!(k in b)) out.push(`${p}/${k}: unexpected in computed (${JSON.stringify(a[k])})`);
    else deepDiff(a[k], b[k], `${p}/${k}`, out);
  }
  return out;
}

