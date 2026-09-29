// Render the film and master its loudness for the web.
//   node tools/render.mjs              -> out/bill-badran-film.mp4
//   node tools/render.mjs --captioned  -> out/bill-badran-film-captioned.mp4 (burned-in captions)
// Step 1 is a normal Remotion render (settings in remotion.config.ts). Step 2 measures the mix and brings it to
// -16 LUFS integrated with one fixed gain, so the balance and dynamics of voice, music and effects are untouched; a
// 4x-oversampled lookahead limiter only catches the few peaks that would pass -1.5 dBTP. (ffmpeg's loudnorm was not
// used for this: when the peaks do not fit it silently switches to dynamic mode and compresses the whole mix.)
// The picture is copied, not re-encoded.
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdirSync, rmSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const captioned = process.argv.includes('--captioned');
const comp = captioned ? 'BillBadranFilm-Captioned' : 'BillBadranFilm';
const out = path.join(root, 'out', captioned ? 'bill-badran-film-captioned.mp4' : 'bill-badran-film.mp4');
const raw = out.replace(/\.mp4$/, '.raw.mp4');
const TARGET = {I: -16, TP: -1.5};
mkdirSync(path.dirname(out), {recursive: true});

console.log(`\n1/2  Rendering ${comp} …`);
const r = spawnSync('npx', ['remotion', 'render', 'src/index.ts', comp, raw], {cwd: root, stdio: 'inherit'});
if (r.status !== 0) process.exit(r.status ?? 1);

console.log('\n2/2  Mastering loudness …');
const pass1 = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', raw, '-af', 'ebur128', '-f', 'null', '-'], {encoding: 'utf8'});
const inputI = Number(pass1.stderr.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()?.match(/-?[\d.]+/)?.[0]);
if (!Number.isFinite(inputI)) throw new Error('could not measure the loudness of the raw render');
// A limiter lowers the loudness a little where it works; 0.1 dB of extra gain covers it for this mix.
const gain = TARGET.I - inputI + 0.1;
const limit = 10 ** ((TARGET.TP - 0.7) / 20); // sample-peak ceiling, with room for the AAC encoder's overshoot
const master = `volume=${gain.toFixed(2)}dB,aresample=192000,alimiter=limit=${limit.toFixed(4)}:attack=5:release=80:level=false:latency=true,aresample=48000`;
console.log(`     raw mix ${inputI.toFixed(1)} LUFS → gain ${gain >= 0 ? '+' : ''}${gain.toFixed(1)} dB, limiter at ${(TARGET.TP - 0.7).toFixed(1)} dBFS`);
execFileSync(
  'ffmpeg',
  [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    raw,
    '-map',
    '0:v',
    '-map',
    '0:a',
    '-c:v',
    'copy',
    '-af',
    master,
    '-ar',
    '48000',
    '-c:a',
    'aac',
    '-b:a',
    '256k',
    '-movflags',
    '+faststart',
    out,
  ],
  {stdio: 'inherit'},
);
rmSync(raw, {force: true});

const check = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', out, '-af', 'ebur128=peak=true', '-f', 'null', '-'], {
  encoding: 'utf8',
}).stderr;
const I = check.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop();
const TP = check.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop();
console.log(`\nDone: ${path.relative(root, out)}   (${I}, true peak ${TP})`);
