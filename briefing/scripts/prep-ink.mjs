// Turns the website's standalone ink drawings (public/ink/*.svg, copied verbatim
// from the site; see ASSETS.md) into stroke data that <InkDraw/> can draw one
// pen stroke at a time:  npm run ink
//
// The site's pen (lib/ink.ts) writes every ink line as a thin filled outline
// (left edge out, right edge back) and merges many strokes into one <path>.
// Here each merged path is split back into its strokes (subpaths), made
// absolute, and measured: length, bounding box and, for filled outlines, the
// widest nib, so the reveal mask covers the stroke and not its neighbours.
// Washes are kept whole (they fade in; they are never drawn).
import fs from 'node:fs';
import path from 'node:path';
import { getBoundingBox, getLength, getPointAtLength, getSubpaths, normalizePath, translatePath } from '@remotion/paths';

const SRC = 'public/ink';
const OUT = 'src/data/ink';
fs.mkdirSync(OUT, { recursive: true });

const round = (s) => s.replace(/-?\d*\.?\d+(?:e-?\d+)?/g, (n) => String(Math.round(Number(n) * 100) / 100));
const r2 = (n) => Math.round(n * 100) / 100;
const attr = (a, name) => (a.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`)) || [])[1];

/** Widest nib of a thin filled outline, from its area and perimeter (area ≈ mean width × half the perimeter). */
const nibWidth = (d, len) => {
  const n = Math.max(12, Math.min(600, Math.round(len / 1.2)));
  let area = 0;
  const at = (l) => getPointAtLength(d, Math.min(len * 0.99999, Math.max(0, l)));
  const first = at(0);
  let prev = first;
  for (let i = 1; i <= n; i++) {
    const q = i === n ? first : at((len * i) / n); // close the ring
    if (!q || !prev) continue;
    area += prev.x * q.y - q.x * prev.y;
    prev = q;
  }
  const mean = Math.abs(area / 2) / Math.max(0.5, len / 2);
  return r2(Math.min(4, Math.max(0.3, mean * 1.6))); // the pen swells to ~1.6× its mean in the middle
};

const KIND = {
  ink: 'ink',
  'ink soft': 'inkSoft',
  hatch: 'hatch',
  'hatch soft': 'hatchSoft',
  pencil: 'pencil',
};

const summary = {};
for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith('.svg')).sort()) {
  const name = file.replace(/\.svg$/, '');
  const svg = fs.readFileSync(path.join(SRC, file), 'utf8');
  const viewBox = attr(svg.match(/<svg[^>]*>/)[0], 'viewBox').split(/\s+/).map(Number);
  const stack = [{ tx: 0, ty: 0, opacity: 1, wash: null }];
  const washes = [];
  const strokes = [];
  let group = 0; // bumps whenever a run of ink ends and something else starts: one object of the drawing
  let lastWasInk = false;
  const tagRe = /<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g;
  let m;
  while ((m = tagRe.exec(svg))) {
    const [, close, tag, attrs, selfClose] = m;
    if (tag === 'g') {
      if (close) {
        stack.pop();
        continue;
      }
      const top = stack[stack.length - 1];
      const t = attr(attrs, 'transform');
      let [tx, ty] = [0, 0];
      if (t) {
        const tm = t.match(/^translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)$/);
        if (!tm) throw new Error(`${file}: unsupported transform "${t}"`);
        [tx, ty] = [Number(tm[1]), Number(tm[2])];
      }
      const cls = attr(attrs, 'class') ?? '';
      const style = attr(attrs, 'style') ?? '';
      const op = Number(attr(attrs, 'opacity') ?? (style.match(/opacity:\s*([\d.]+)/) || [])[1] ?? 1);
      const wash = cls.startsWith('wash ') ? { tone: cls.split(/\s+/)[1], opacity: op } : top.wash;
      stack.push({
        tx: top.tx + tx,
        ty: top.ty + ty,
        opacity: wash && cls.startsWith('wash ') ? top.opacity : top.opacity * op,
        wash,
      });
      if (selfClose) stack.pop();
      continue;
    }
    if (tag !== 'path' || close) continue;
    const top = stack[stack.length - 1];
    const cls = attr(attrs, 'class') ?? '';
    const raw = attr(attrs, 'd');
    if (!raw) continue;
    const shifted = (d) => (top.tx || top.ty ? translatePath(d, top.tx, top.ty) : d);
    if (cls === 'wash-fill') {
      washes.push({ tone: top.wash?.tone ?? 'blue', opacity: r2(top.wash?.opacity ?? 1), d: round(shifted(normalizePath(raw))) });
      continue;
    }
    if (cls === 'wash-edge') continue; // same outline as its wash-fill; drawn from it
    const kind = KIND[cls];
    if (!kind) throw new Error(`${file}: unknown path class "${cls}"`);
    const isInk = kind === 'ink' || kind === 'inkSoft';
    if (!isInk && lastWasInk) group++;
    lastWasInk = isInk;
    const w = Number(attr(attrs, 'stroke-width') ?? (kind === 'pencil' ? 0.5 : 0.6));
    for (const sub of getSubpaths(normalizePath(raw))) {
      const d = round(shifted(sub));
      const len = getLength(d);
      if (len < 0.2) continue;
      const b = getBoundingBox(d);
      const s = { kind, g: group, d, len: r2(len), box: [r2(b.x1), r2(b.y1), r2(b.x2), r2(b.y2)] };
      if (isInk) s.nib = nibWidth(d, len);
      else s.w = w;
      if (top.opacity !== 1) s.o = r2(top.opacity);
      strokes.push(s);
    }
  }
  const data = { name, viewBox, washes, strokes };
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(data));
  const count = (k) => strokes.filter((s) => s.kind === k).length;
  summary[name] = {
    viewBox: viewBox.join(' '),
    ink: count('ink') + count('inkSoft'),
    hatch: count('hatch') + count('hatchSoft'),
    pencil: count('pencil'),
    washes: washes.length,
    groups: group + 1,
    kb: Math.round(JSON.stringify(data).length / 1024),
  };
}

// An index so components can import every drawing by name.
const names = Object.keys(summary);
fs.writeFileSync(
  path.join(OUT, 'index.ts'),
  `// Generated by scripts/prep-ink.mjs — do not edit.\n` +
    names.map((n, i) => `import d${i} from './${n}.json';`).join('\n') +
    `\n\nexport const DRAWINGS = {\n` +
    names.map((n, i) => `  '${n}': d${i} as InkData,`).join('\n') +
    `\n};\nexport type DrawingName = keyof typeof DRAWINGS;\n\n` +
    `export type StrokeKind = 'ink' | 'inkSoft' | 'hatch' | 'hatchSoft' | 'pencil';\n` +
    `export type InkStroke = { kind: StrokeKind; g: number; d: string; len: number; box: [number, number, number, number]; nib?: number; w?: number; o?: number };\n` +
    `export type InkWash = { tone: string; opacity: number; d: string };\n` +
    `export type InkData = { name: string; viewBox: number[]; washes: InkWash[]; strokes: InkStroke[] };\n`,
);
console.table(summary);
