// Bill's voice for the talking-head Reel, as one continuous track built from the cut list.
//
//   node tools/talk-voice.mjs        (run by npm run render:talk)
//
// Reads the kept parts of the take from src/data/talk-transcript.json (`segments`, seconds of
// public/video/bill-talk.mp4), cuts each one out of the take's sound with a 3-frame fade at both ends (so a jump cut
// never clicks) and joins them back to back. Under them, for the whole Reel and the end card, runs a bed of the room's
// own tone (a quiet second of the take after his last word, played forwards then backwards so it loops without a
// seam), so a cut never drops to digital silence and the end card is not dead air. The voice is cleaned lightly (an
// 80 Hz high-pass for rumble, a gentle FFT de-noise for the room); the bed only gets the high-pass, since it is the
// room. Writes public/audio/talk-voice.wav. The Reel's picture is cut from the same list, and render:talk lays this
// file under it from sample 0.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const {segments, endCard} = JSON.parse(readFileSync(path.join(root, 'src/data/talk-transcript.json'), 'utf8'));
const FPS = 30;
const fr = (s) => Math.round(s * FPS) / FPS; // the Reel cuts on whole frames: so does the voice
const fade = 3 / FPS;
/** The room with nobody speaking: just after « …reste. », before he speaks again. */
const ROOM = [35.0, 36.4];
/** The bed plays at the room's own level, as recorded: the floor of his pauses. */
const ROOM_GAIN = 1.0;

const take = path.join(root, 'public/video/bill-talk.mp4');
const rate = Number(
  execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate', '-of', 'csv=p=0', take], {encoding: 'utf8'}).trim(),
);
const speech = segments.reduce((t, [a, b]) => t + (fr(b) - fr(a)), 0);
const total = Math.round((speech + endCard) * FPS) / FPS;

const parts = segments.map(([a, b], i) => {
  const s = fr(a);
  const e = fr(b);
  const d = (e - s).toFixed(4);
  return `[0:a]atrim=start=${s.toFixed(4)}:end=${e.toFixed(4)},asetpts=PTS-STARTPTS,afade=t=in:d=${fade.toFixed(4)},afade=t=out:st=${(e - s - fade).toFixed(4)}:d=${fade.toFixed(4)},apad=whole_dur=${d}[s${i}]`;
});
const voice =
  segments.map((_, i) => `[s${i}]`).join('') + `concat=n=${segments.length}:v=0:a=1,highpass=f=80,afftdn=nr=8:nf=-50,apad=whole_dur=${total.toFixed(4)}[voice]`;
const room = [
  `[0:a]atrim=start=${ROOM[0]}:end=${ROOM[1]},asetpts=PTS-STARTPTS,asplit[r0][r1]`,
  `[r1]areverse[r2]`,
  `[r0][r2]concat=n=2:v=0:a=1,aloop=loop=-1:size=${Math.round(2 * (ROOM[1] - ROOM[0]) * rate)},atrim=end=${total.toFixed(4)},highpass=f=80,volume=${ROOM_GAIN}[room]`,
];
const mix = `[voice][room]amix=inputs=2:normalize=0:duration=first[out]`;
const out = path.join(root, 'public/audio/talk-voice.wav');
execFileSync('ffmpeg', [
  '-hide_banner',
  '-loglevel',
  'error',
  '-y',
  '-i',
  take,
  '-filter_complex',
  [...parts, voice, ...room, mix].join(';'),
  '-map',
  '[out]',
  '-ar',
  '48000',
  '-ac',
  '1',
  '-c:a',
  'pcm_s16le',
  out,
]);
const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], {encoding: 'utf8'}).trim();
console.log(
  `talk voice: ${segments.length} parts, ${speech.toFixed(3)} s of speech + ${endCard} s of room tone = ${Number(dur).toFixed(3)} s → public/audio/talk-voice.wav`,
);
