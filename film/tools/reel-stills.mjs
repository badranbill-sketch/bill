// Stills of the Instagram Reel (BillReel), from one bundle, plus a labelled contact sheet.
//
//   node tools/reel-stills.mjs                 the QC times: 0, 3, 9, 16, 23 and 29.5 s
//   node tools/reel-stills.mjs 12.5s 400       seconds (with an "s") or frames
//   node tools/reel-stills.mjs --out=out/x    write somewhere else than out/reel/stills
//   node tools/reel-stills.mjs --guides        also draws the safe box (x 64–960, y 270–1450, green) and the top of
//                                              the caption band (y 1270, orange) on copies, to check the layout
//
// Output: out/reel/stills/ (and out/reel/stills/guides/). Set REMOTION_BROWSER_EXECUTABLE to use an installed
// Chrome / Chromium headless shell instead of Remotion's download.
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import {mkdirSync, rmSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const guides = args.includes('--guides');
const QC = ['0s', '3s', '9s', '16s', '23s', '29.5s'];
const wanted = args.filter((a) => !a.startsWith('--'));
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;

const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts'), publicDir: path.join(ROOT, 'public')});
const composition = await selectComposition({serveUrl, id: process.env.REEL_COMP || 'BillReel', inputProps: {}, browserExecutable});
const {fps} = composition;
const last = composition.durationInFrames - 1;
const frames = (wanted.length ? wanted : QC)
  .map((a) => (a.endsWith('s') ? Math.round(parseFloat(a) * fps) : parseInt(a, 10)))
  .map((f) => Math.min(last, f))
  .filter((f) => Number.isFinite(f) && f >= 0);

const outArg = args.find((a) => a.startsWith('--out='))?.slice(6);
const outDir = outArg ? path.resolve(ROOT, outArg) : path.join(ROOT, 'out', 'reel', 'stills');
mkdirSync(path.join(outDir, 'guides'), {recursive: true});
const files = [];
for (const frame of frames) {
  const name = `t${(frame / fps).toFixed(2).padStart(5, '0')}s.png`;
  const output = path.join(outDir, name);
  await renderStill({composition, serveUrl, output, frame, imageFormat: 'png', inputProps: {}, browserExecutable});
  let shown = output;
  if (guides) {
    shown = path.join(outDir, 'guides', name);
    execFileSync('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      '-i',
      output,
      '-vf',
      'drawbox=x=64:y=270:w=896:h=1180:color=0x2EA043@0.9:t=3,drawbox=x=0:y=1270:w=1080:h=2:color=0xF08A24@0.9:t=fill',
      shown,
    ]);
  }
  console.log(`${(frame / fps).toFixed(2).padStart(6)} s  frame ${frame}  →  ${path.relative(ROOT, shown)}`);
  files.push({file: shown, frame});
}
// The bundle is a copy of public/ in the temp dir: remove it.
rmSync(serveUrl, {recursive: true, force: true});

if (files.length > 1) {
  const cols = Math.min(files.length, 6);
  const label = files
    .map(({frame}, i) => {
      const s = (frame / fps).toFixed(1).replace('.', '\\.');
      return `[${i}:v]scale=360:-1,drawtext=text='${s} s':x=12:y=10:fontsize=24:fontcolor=white:box=1:boxcolor=0x1E2A3E@0.85:boxborderw=6[v${i}]`;
    })
    .join(';');
  const layout = files.map((_, i) => `${(i % cols) * 360}_${Math.floor(i / cols) * 640}`).join('|');
  const sheet = path.join(outDir, guides ? 'guides/contact-sheet.jpg' : 'contact-sheet.jpg');
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    ...files.flatMap(({file}) => ['-i', file]),
    '-filter_complex',
    `${label};${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${layout}:fill=0x1E2A3E[out]`,
    '-map',
    '[out]',
    '-q:v',
    '3',
    sheet,
  ]);
  console.log(`contact sheet → ${path.relative(ROOT, sheet)}`);
}
