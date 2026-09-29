// Render still frames from one bundle (much faster than one `remotion still` per frame).
//
//   node tools/stills.mjs 385 442 12.5s          frames, or seconds with an "s" suffix
//   node tools/stills.mjs --qc                   the brief's QC timestamps + end frame, and a contact sheet
//
// Output: out/stills/fNNNN.png (or out/qc/ for --qc).
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import {mkdirSync, rmSync} from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const qc = args.includes('--qc');
const compId = args.find((a) => a.startsWith('--comp='))?.slice(7) ?? 'BillBadranFilm';
const scale = Number(args.find((a) => a.startsWith('--scale='))?.slice(8) ?? (qc ? 1 : 0.5));
const QC_TIMES = [5, 15, 35, 55, 68, 85, 105, 120, 138, 155, 170];

const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts'), publicDir: path.join(ROOT, 'public')});
const composition = await selectComposition({serveUrl, id: compId, inputProps: {}});
const fps = composition.fps;
const last = composition.durationInFrames - 1;

const wanted = qc
  ? [...QC_TIMES.map((s) => Math.round(s * fps)), last]
  : args.filter((a) => !a.startsWith('--')).map((a) => (a.endsWith('s') ? Math.round(parseFloat(a) * fps) : parseInt(a, 10)));
const frames = wanted.filter((f) => Number.isFinite(f) && f >= 0 && f <= last);
if (frames.length === 0) {
  console.error(`No frames to render (composition has ${composition.durationInFrames} frames).`);
  process.exit(1);
}

const outDir = path.join(ROOT, 'out', qc ? 'qc' : 'stills');
mkdirSync(outDir, {recursive: true});
const files = [];
for (const frame of frames) {
  const output = path.join(outDir, `f${String(frame).padStart(4, '0')}.png`);
  await renderStill({composition, serveUrl, output, frame, scale, imageFormat: 'png', inputProps: {}});
  const mm = Math.floor(frame / fps / 60);
  const ss = ((frame / fps) % 60).toFixed(1).padStart(4, '0');
  console.log(`${mm}:${ss}  frame ${frame}  →  ${path.relative(ROOT, output)}`);
  files.push(output);
}
// The bundle is a copy of public/ (≈ 140 MB) in /tmp: remove it, or /tmp fills up after a few dozen runs.
rmSync(serveUrl, {recursive: true, force: true});

if (qc) {
  // 4 × 3 contact sheet, each frame labelled with its timecode
  const inputs = files.flatMap((f) => ['-i', f]);
  const labelled = files
    .map((_, i) => {
      const s = frames[i] / fps;
      const tc = `${Math.floor(s / 60)}\\:${String(Math.floor(s % 60)).padStart(2, '0')}`;
      return `[${i}:v]scale=640:-1,drawtext=text='${tc}':x=14:y=12:fontsize=26:fontcolor=white:box=1:boxcolor=0x13324B@0.8:boxborderw=8[v${i}]`;
    })
    .join(';');
  const stack =
    files.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${files.length}:layout=${gridLayout(files.length, 4)}:fill=0x13324B[out]`;
  const sheet = path.join(outDir, 'contact-sheet.jpg');
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    ...inputs,
    '-filter_complex',
    `${labelled};${stack}`,
    '-map',
    '[out]',
    '-q:v',
    '3',
    sheet,
  ]);
  console.log(`contact sheet → ${path.relative(ROOT, sheet)}`);
}

function gridLayout(n, cols) {
  const cells = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    cells.push(
      `${c === 0 ? '0' : Array.from({length: c}, (_, k) => `w${k}`).join('+')}_${r === 0 ? '0' : Array.from({length: r}, (_, k) => `h${k * cols}`).join('+')}`,
    );
  }
  return cells.join('|');
}
