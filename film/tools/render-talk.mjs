// Render the talking-head Reel and bring its sound to Instagram's loudness.
//
//   node tools/render-talk.mjs [out/bill-reel-talk.mp4]      (npm run render:talk)
//
// 1. Remotion renders BillReelTalk (H.264, yuv420p, BT.709). Set REMOTION_BROWSER_EXECUTABLE to use an installed
//    Chrome / Chromium headless shell instead of Remotion's download.
// 2. ffmpeg's two-pass loudnorm, in linear mode (one fixed gain, the voice's dynamics untouched), to -14 LUFS
//    integrated and -1 dBTP: the level Reels play at. The picture is copied, not re-encoded.
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdirSync, renameSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, process.argv[2] ?? 'out/bill-reel-talk.mp4');
const raw = out.replace(/\.mp4$/, '.raw.mp4');
mkdirSync(path.dirname(out), {recursive: true});

const browser = process.env.REMOTION_BROWSER_EXECUTABLE;
console.log('1/2  Rendering BillReelTalk …');
const r = spawnSync(
  'npx',
  ['remotion', 'render', 'src/index.ts', 'BillReelTalk', raw, '--color-space=bt709', ...(browser ? [`--browser-executable=${browser}`] : [])],
  {cwd: root, stdio: 'inherit'},
);
if (r.status !== 0) process.exit(r.status ?? 1);

console.log('2/2  Loudness to -14 LUFS / -1 dBTP …');
const target = 'I=-14:TP=-1:LRA=11';
const pass1 = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', raw, '-af', `loudnorm=${target}:print_format=json`, '-f', 'null', '-'], {
  encoding: 'utf8',
}).stderr;
const m = JSON.parse(pass1.slice(pass1.lastIndexOf('{'), pass1.lastIndexOf('}') + 1));
const measured = `measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}`;
execFileSync('ffmpeg', [
  '-hide_banner',
  '-loglevel',
  'error',
  '-y',
  '-i',
  raw,
  '-c:v',
  'copy',
  '-af',
  `loudnorm=${target}:${measured}:linear=true,aresample=48000`,
  '-c:a',
  'aac',
  '-b:a',
  '192k',
  '-movflags',
  '+faststart',
  out,
]);
renameSync(raw, raw + '.done');
spawnSync('rm', ['-f', raw + '.done']);
console.log(`Done: ${path.relative(root, out)} (input ${m.input_i} LUFS)`);
