// Render the talking-head Reel and bring its sound to Instagram's loudness.
//
//   node tools/render-talk.mjs [out/bill-reel-talk.mp4]      (npm run render:talk)
//
// 1. tools/talk-voice.mjs rebuilds Bill's voice track from the cut list (public/audio/talk-voice.wav).
// 2. Remotion renders BillReelTalk's picture, muted (H.264, yuv420p, BT.709). Set REMOTION_BROWSER_EXECUTABLE to use
//    an installed Chrome / Chromium headless shell instead of Remotion's download.
// 3. The voice track is laid under the picture directly, from sample 0 (Remotion's own audio path encodes AAC twice
//    and leaves 2048 samples of encoder delay in the file: the voice 43 ms late on the lips), and brought to
//    Instagram's level with ffmpeg's two-pass loudnorm, in linear mode (one fixed gain, the voice's dynamics untouched):
//    -14 LUFS integrated, -1 dBTP. The picture is copied, not re-encoded; the AAC is encoded once.
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdirSync, rmSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, process.argv[2] ?? 'out/bill-reel-talk.mp4');
const raw = out.replace(/\.mp4$/, '.raw.mp4');
mkdirSync(path.dirname(out), {recursive: true});

console.log('1/3  Voice track from the cut list …');
execFileSync('node', [path.join(root, 'tools/talk-voice.mjs')], {cwd: root, stdio: 'inherit'});

const browser = process.env.REMOTION_BROWSER_EXECUTABLE;
console.log('2/3  Rendering BillReelTalk …');
const r = spawnSync(
  'npx',
  ['remotion', 'render', 'src/index.ts', 'BillReelTalk', raw, '--color-space=bt709', '--muted', ...(browser ? [`--browser-executable=${browser}`] : [])],
  {cwd: root, stdio: 'inherit'},
);
if (r.status !== 0) process.exit(r.status ?? 1);

console.log('3/3  Loudness to -14 LUFS / -1 dBTP …');
const target = 'I=-14:TP=-1:LRA=11';
const voice = path.join(root, 'public/audio/talk-voice.wav');
const pass1 = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', voice, '-af', `loudnorm=${target}:print_format=json`, '-f', 'null', '-'], {
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
  '-i',
  voice,
  '-map',
  '0:v',
  '-map',
  '1:a',
  '-c:v',
  'copy',
  '-af',
  `loudnorm=${target}:${measured}:linear=true,aresample=48000,apad`,
  '-shortest',
  '-c:a',
  'aac',
  '-b:a',
  '192k',
  '-movflags',
  '+faststart',
  out,
]);
rmSync(raw, {force: true});
console.log(`Done: ${path.relative(root, out)} (input ${m.input_i} LUFS)`);
