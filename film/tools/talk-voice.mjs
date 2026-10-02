// Bill's voice for the talking-head Reel, as one continuous track built from the cut list.
//
//   node tools/talk-voice.mjs        (run by npm run render:talk)
//
// Reads the kept parts of the take from src/data/talk-transcript.json (`segments`, seconds of
// public/video/bill-talk.mp4), cuts each one out of the take's sound with a 3-frame fade at both ends (so a jump cut
// never clicks), joins them back to back, and cleans the voice lightly: an 80 Hz high-pass (rumble) and a gentle FFT
// de-noise (the room). Writes public/audio/talk-voice.wav. The Reel plays this one file from frame 0, so the picture
// (cut from the same list) and the voice cannot drift apart.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const {segments} = JSON.parse(readFileSync(path.join(root, 'src/data/talk-transcript.json'), 'utf8'));
const FPS = 30;
const fr = (s) => Math.round(s * FPS) / FPS; // the Reel cuts on whole frames: so does the voice
const fade = 3 / FPS;

const parts = segments.map(([a, b], i) => {
  const s = fr(a);
  const e = fr(b);
  const d = (e - s).toFixed(4);
  return `[0:a]atrim=start=${s.toFixed(4)}:end=${e.toFixed(4)},asetpts=PTS-STARTPTS,afade=t=in:d=${fade.toFixed(4)},afade=t=out:st=${(e - s - fade).toFixed(4)}:d=${fade.toFixed(4)},apad=whole_dur=${d}[s${i}]`;
});
const join = segments.map((_, i) => `[s${i}]`).join('') + `concat=n=${segments.length}:v=0:a=1,highpass=f=80,afftdn=nr=8:nf=-50[voice]`;
const out = path.join(root, 'public/audio/talk-voice.wav');
execFileSync('ffmpeg', [
  '-hide_banner',
  '-loglevel',
  'error',
  '-y',
  '-i',
  path.join(root, 'public/video/bill-talk.mp4'),
  '-filter_complex',
  [...parts, join].join(';'),
  '-map',
  '[voice]',
  '-ar',
  '48000',
  '-ac',
  '1',
  '-c:a',
  'pcm_s16le',
  out,
]);
const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], {encoding: 'utf8'}).trim();
const expected = segments.reduce((t, [a, b]) => t + (fr(b) - fr(a)), 0);
console.log(`talk voice: ${segments.length} parts, ${Number(dur).toFixed(3)} s (cut list ${expected.toFixed(3)} s) → public/audio/talk-voice.wav`);
