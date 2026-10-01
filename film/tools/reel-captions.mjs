// Burned-in captions for the Instagram Reel, from its narration timing.
//
//   node tools/reel-captions.mjs        (also run by `npm run voice:reel`)
//
// Reads src/data/reel-timing.json (the script's words with their times) and writes public/captions/reel.srt and .vtt.
// A Reel autoplays muted, so the captions carry the voice: each caption is one or two short lines (at most MAX
// characters, which keeps a line well inside the 896 px caption box at 58 px), broken at the script's own pauses
// (commas, colons, full stops) where it can, and shown while those words are spoken.
import {readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX = 26; // characters per caption line
const NBSP = ' ';
const timing = JSON.parse(readFileSync(path.join(ROOT, 'src/data/reel-timing.json'), 'utf8'));

const spoken = (w) => /[\p{L}\p{N}]/u.test(w);
/** Little words that belong with the word after them: a caption line does not end on one. */
const CLINGS = new Set(
  'à au aux avec ce ces dans de des dont du en et il je la le les leur ma mes mon ne nos notre ou par pas pour que qui sa se ses son sur un une vos votre vous nous on y'.split(' '),
);

/** The line's words, with punctuation that stands alone (« ? », « : ») glued to the word before it. */
const glued = (words) => {
  const out = [];
  for (const w of words) {
    if (!spoken(w.w) && out.length) {
      const prev = out[out.length - 1];
      out[out.length - 1] = {...prev, w: prev.w + NBSP + w.w};
    } else out.push({...w});
  }
  return out;
};

/** One or two lines, as even as possible, each at most MAX characters; null if it does not fit. */
const wrap = (words) => {
  const text = words.map((w) => w.w).join(' ');
  if (text.length <= MAX) return [text];
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).map((w) => w.w).join(' ');
    const b = words.slice(i).map((w) => w.w).join(' ');
    if (a.length > MAX || b.length > MAX) continue;
    // prefer breaking after the script's own punctuation, never after a little word (« point de / départ »), then
    // the most even pair
    const last = words[i - 1].w.toLowerCase();
    const cost = Math.abs(a.length - b.length) - (/[,.:;?!]$/.test(a) ? 12 : 0) + (CLINGS.has(last) ? 20 : 0);
    if (!best || cost < best.cost) best = {cost, lines: [a, b]};
  }
  return best?.lines ?? null;
};

/** Phrases: runs of words that end on the script's punctuation. */
const phrases = (words) => {
  const out = [[]];
  for (const w of words) {
    out[out.length - 1].push(w);
    if (/[,.:;?!]$/.test(w.w)) out.push([]);
  }
  return out.filter((p) => p.length);
};

/** Captions for one line: whole phrases packed while they still fit in two lines; a long phrase is split by words. */
const chunks = (words) => {
  const out = [];
  let cur = [];
  const flush = () => {
    if (cur.length) out.push(cur);
    cur = [];
  };
  for (const p of phrases(words)) {
    if (wrap([...cur, ...p])) {
      cur = [...cur, ...p];
      continue;
    }
    flush();
    if (wrap(p)) {
      cur = [...p];
      continue;
    }
    for (const w of p) {
      if (!wrap([...cur, w])) flush();
      cur.push(w);
    }
  }
  flush();
  return out;
};

const cues = [];
timing.lines.forEach((line, li) => {
  const parts = chunks(glued(line.words));
  const nextLine = timing.lines[li + 1];
  parts.forEach((part, pi) => {
    const start = part[0].s;
    const next = parts[pi + 1];
    const end = next ? next[0].s - 0.04 : Math.min(part[part.length - 1].e + 0.6, nextLine ? nextLine.start - 0.05 : Infinity);
    cues.push({start, end, lines: wrap(part)});
  });
});

const stamp = (t, sep) => {
  const ms = Math.round(t * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}${sep}${p(ms % 1000, 3)}`;
};
const srt = cues.map((c, i) => `${i + 1}\n${stamp(c.start, ',')} --> ${stamp(c.end, ',')}\n${c.lines.join('\n')}\n`).join('\n');
const vtt = 'WEBVTT\n\n' + cues.map((c) => `${stamp(c.start, '.')} --> ${stamp(c.end, '.')}\n${c.lines.join('\n')}\n`).join('\n');
writeFileSync(path.join(ROOT, 'public/captions/reel.srt'), srt);
writeFileSync(path.join(ROOT, 'public/captions/reel.vtt'), vtt);
for (const c of cues) console.log(`${c.start.toFixed(2).padStart(6)} → ${c.end.toFixed(2).padStart(6)}  ${c.lines.join(' / ')}`);
console.log(`reel captions: ${cues.length} → public/captions/reel.srt, .vtt`);
