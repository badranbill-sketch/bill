// Render stills of ONE scene, bundled on its own (the other scenes are not even imported, so a half-finished scene
// elsewhere cannot break it). Times are absolute film seconds, as in src/data/timing.json.
//
//   node tools/scene-stills.mjs pieces 34.5 40 45.2 57        → out/scenes/pieces/t034.50.png …
//   node tools/scene-stills.mjs pieces --every=2               → one still every 2 s across the whole scene
//   node tools/scene-stills.mjs pieces 40 50 --every=1         → one still per second between 40 s and 50 s
//   --scale=1 for full-size stills (default 0.5). Several stills also make out/scenes/<scene>/contact-sheet.jpg.
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MODULES = {
  intro: ['IntroBill', 'IntroBill'],
  life: ['LifeGoals', 'LifeGoals'],
  credibility: ['Credibility', 'Credibility'],
  pieces: ['Pieces', 'Pieces'],
  guide: ['GuideReveal', 'GuideReveal'],
  blindspots: ['BlindSpots', 'BlindSpots'],
  simple: ['SimpleGuide', 'SimpleGuide'],
  approach: ['Approach', 'Approach'],
  plan: ['Plan', 'Plan'],
  role: ['Closing', 'Role'],
  invite: ['Closing', 'Invite'],
  end: ['Closing', 'EndCard'],
};

const args = process.argv.slice(2);
const scene = args[0];
if (!MODULES[scene]) {
  console.error(`usage: node tools/scene-stills.mjs <${Object.keys(MODULES).join('|')}> <seconds…> [--every=2] [--scale=0.5]`);
  process.exit(1);
}
const scale = Number(args.find((a) => a.startsWith('--scale='))?.slice(8) ?? 0.5);
const every = Number(args.find((a) => a.startsWith('--every='))?.slice(8) ?? 0);
const [file, exp] = MODULES[scene];

const dir = path.join(ROOT, 'build', 'preview', scene);
rmSync(dir, {recursive: true, force: true});
mkdirSync(dir, {recursive: true});
const rel = (p) => path.relative(dir, path.join(ROOT, p)).replace(/\\/g, '/');
writeFileSync(
  path.join(dir, 'index.tsx'),
  `import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Paper, Scene, Stage} from '${rel('src/components/stage')}';
import {fontsReady} from '${rel('src/design/typography')}';
import {SCENES} from '${rel('src/timing/scenes')}';
import {FPS, TOTAL_FRAMES} from '${rel('src/timing/timing')}';
import {${exp} as C} from '${rel(`src/scenes/${file}`)}';
void fontsReady;
const s = SCENES['${scene}'];
const Preview: React.FC<{from: number; to: number}> = () => (
  <Stage>
    <Paper />
    <Scene name="${scene}" from={s.from} to={s.to} fadeIn={s.fadeIn} fadeOut={s.fadeOut}>
      <C from={s.from} to={s.to} />
    </Scene>
  </Stage>
);
registerRoot(() => (
  <Composition id="Preview" component={Preview} width={1920} height={1080} fps={FPS} durationInFrames={TOTAL_FRAMES} defaultProps={{from: s.from, to: s.to}} />
));
`,
);

const serveUrl = await bundle({entryPoint: path.join(dir, 'index.tsx'), publicDir: path.join(ROOT, 'public')});
const composition = await selectComposition({serveUrl, id: 'Preview', inputProps: {}});
const fps = composition.fps;

const range = {from: composition.props.from / fps, to: (composition.props.to - 1) / fps};
let times = args.filter((a) => !a.startsWith('--') && a !== scene).map(Number);
if (every > 0) {
  const [a, b] = times.length === 2 ? times : [range.from, range.to];
  times = [];
  for (let s = a; s <= b + 1e-6; s += every) times.push(Math.round(s * 100) / 100);
}
if (times.length === 0) {
  console.error(`no times given; the ${scene} scene runs from ${range.from.toFixed(2)} s to ${range.to.toFixed(2)} s`);
  process.exit(1);
}
for (const s of times) {
  if (s < range.from || s > range.to) console.warn(`note: ${s} s is outside the ${scene} scene (${range.from.toFixed(2)}–${range.to.toFixed(2)} s)`);
}

const outDir = path.join(ROOT, 'out', 'scenes', scene);
mkdirSync(outDir, {recursive: true});
const files = [];
for (const s of times) {
  const frame = Math.round(s * fps);
  const output = path.join(outDir, `t${s.toFixed(2).padStart(6, '0')}.png`);
  await renderStill({composition, serveUrl, output, frame, scale, imageFormat: 'png', inputProps: {}});
  files.push(output);
  console.log(`${s.toFixed(2)} s  (frame ${frame})  →  ${path.relative(ROOT, output)}`);
}
// The bundle is a copy of public/ (≈ 140 MB) in /tmp: remove it, or /tmp fills up after a few dozen runs.
rmSync(serveUrl, {recursive: true, force: true});
if (files.length > 1) {
  const sheet = path.join(outDir, 'contact-sheet.jpg');
  const cols = Math.min(4, files.length);
  execFileSync('ffmpeg', [
    '-loglevel', 'error', '-y',
    ...files.flatMap((f) => ['-i', f]),
    '-filter_complex',
    `${files.map((_, i) => `[${i}]scale=640:-1[v${i}]`).join(';')};${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${files
      .map((_, i) => `${(i % cols) === 0 ? '0' : Array.from({length: i % cols}, () => 'w0').join('+')}_${Math.floor(i / cols) === 0 ? '0' : Array.from({length: Math.floor(i / cols)}, () => 'h0').join('+')}`)
      .join('|')}:fill=white`,
    '-q:v', '3', sheet,
  ]);
  console.log(`contact sheet → ${path.relative(ROOT, sheet)}`);
}
