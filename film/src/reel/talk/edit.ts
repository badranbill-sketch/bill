import raw from '../../data/talk-transcript.json';

// The talking-head Reel's edit decision list, from src/data/talk-transcript.json: which parts of Bill's take are kept
// (segments, in seconds of public/video/bill-talk.mp4) and where every kept word lands on the Reel's timeline.

export const FPS = 30;
export const f = (s: number) => Math.round(s * FPS);

type Word = {w: string; s: number; e: number};
const T = raw as unknown as {segments: [number, number][]; words: Word[]};

/** The kept parts of the take, back to back: `at` is where each starts on the Reel (s). */
export const SEGMENTS = (() => {
  let at = 0;
  return T.segments.map(([a, b], i) => {
    const seg = {i, a, b, at, len: b - a};
    at += b - a;
    return seg;
  });
})();

/** Seconds of Bill speaking on the Reel; the end card follows. */
export const SPEECH_END = SEGMENTS.reduce((t, s) => t + s.len, 0);
export const END_CARD = 3.0;
export const TALK_FRAMES = Math.min(30 * FPS, f(SPEECH_END + END_CARD));

/** Take time → Reel time (null if that moment was cut). */
export const toReel = (src: number) => {
  const s = SEGMENTS.find((g) => src >= g.a - 0.001 && src <= g.b + 0.001);
  return s ? s.at + (src - s.a) : null;
};

/** The kept words, on the Reel's timeline (seconds). */
export const WORDS = T.words
  .map((w) => ({w: w.w, s: toReel(w.s), e: toReel(w.e)}))
  .filter((w): w is Word => w.s !== null && w.e !== null);

const clean = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Reel frame of the n-th kept word matching `text` (start or end), + offset in seconds. */
export const cue = (text: string, n = 0, edge: 's' | 'e' = 's', offset = 0) => {
  const hits = WORDS.filter((w) => clean(w.w) === clean(text));
  const w = hits[Math.min(n, hits.length - 1)];
  if (!w) throw new Error(`talk edit: no word "${text}" in src/data/talk-transcript.json`);
  return f(w[edge] + offset);
};
