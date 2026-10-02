import raw from '../../data/talk-transcript.json';

// The talking-head Reel's edit decision list, from src/data/talk-transcript.json: which parts of Bill's take are kept
// (segments, in seconds of public/video/bill-talk.mp4) and where every kept word lands on the Reel's timeline.

export const FPS = 30;
export const f = (s: number) => Math.round(s * FPS);

type Word = {w: string; s: number; e: number};
const T = raw as unknown as {segments: [number, number][]; endCard: number; words: Word[]};

/** The kept parts of the take, back to back: `at` is where each starts on the Reel (s). */
export const SEGMENTS = (() => {
  let at = 0;
  // cut on whole frames, like the voice track (tools/talk-voice.mjs), so picture and sound stay locked
  const snap = (s: number) => Math.round(s * FPS) / FPS;
  return T.segments.map(([a0, b0], i) => {
    const a = snap(a0);
    const b = snap(b0);
    const seg = {i, a, b, at, len: b - a};
    at += b - a;
    return seg;
  });
})();

/** Seconds of Bill speaking on the Reel; the end card follows. */
export const SPEECH_END = SEGMENTS.reduce((t, s) => t + s.len, 0);
export const END_CARD = T.endCard;
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
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Reel frame of the n-th kept word matching `text` (start or end), + offset in seconds. */
export const cue = (text: string, n = 0, edge: 's' | 'e' = 's', offset = 0) => {
  const hits = WORDS.filter((w) => clean(w.w) === clean(text));
  const w = hits[Math.min(n, hits.length - 1)];
  if (!w) throw new Error(`talk edit: no word "${text}" in src/data/talk-transcript.json`);
  return f(w[edge] + offset);
};

/**
 * The edit's beats (Reel frames). The move into the explainer starts 4 frames before its cut, so the cut lands inside
 * the move, at speed:
 *   focus   « Voici comment » — Bill becomes a taped print and the explainer takes the frame
 *   split   « Ottawa récupère… » — the picture comes back large, above the explainer, for the 15 ¢ line and the punchline
 *   end     « …reste » — he shrinks into the print on the end card
 */
export const BEATS = {
  focus: f(SEGMENTS[1].at) - 4,
  split: cue('Ottawa') - 8,
  end: f(SPEECH_END - 0.45),
};
