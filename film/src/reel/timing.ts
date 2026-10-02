import raw from '../data/reel-timing.json';
import type {Line} from '../timing/timing';

// The reel is timed from its own narration, exactly like the film: src/data/reel-timing.json has the shape of
// src/data/timing.json. Until Bill records script/reel.json it is hand-authored (no audio); `npm run voice:reel`
// rewrites it from his recording and every beat, note and caption follows. Never hard-code a frame in the reel.

export const FPS = 30;

export type ReelTiming = {
  source: 'hand' | 'scratch' | 'bill';
  voice: string;
  audio: string;
  leadIn: number;
  narrationEnd: number;
  tail: number;
  duration: number;
  lines: Line[];
};

export const timing = raw as unknown as ReelTiming;
export const LINES: Line[] = timing.lines;

/** The Reel is 30 s at most (900 frames). A longer recording is cut at 30 s: shorten the tail in script/reel.json. */
export const MAX_FRAMES = 30 * FPS;
export const REEL_FRAMES = Math.min(MAX_FRAMES, Math.ceil(timing.duration * FPS));

const byId = new Map(LINES.map((l) => [l.id, l]));

/** A narration line by id (ids come from script/reel.json; an unknown id is a programming error). */
export const line = (id: string): Line => {
  const l = byId.get(id);
  if (!l) throw new Error(`reel timing: unknown narration line "${id}" — check script/reel.json`);
  return l;
};

const toFrame = (seconds: number) => Math.round(seconds * FPS);

/** Frame at which a line starts (+ offset in seconds). */
export const at = (id: string, offset = 0) => toFrame(line(id).start + offset);
/** Frame at which a line ends (+ offset in seconds). */
export const endOf = (id: string, offset = 0) => toFrame(line(id).end + offset);

/** French-safe comparison: « créé » and « cree » match, apostrophes and punctuation are ignored. */
const clean = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/**
 * Frame at which a word of a line is spoken: `which` is the word (first match) or its index. Never throws: a word
 * that cannot be found falls back to its proportional position in the line, so a render always completes.
 */
export const wordAt = (id: string, which: string | number, edge: 's' | 'e' = 's', offset = 0) => {
  const l = line(id);
  const words = l.words ?? [];
  let idx = typeof which === 'number' ? which : words.findIndex((w) => clean(w.w) === clean(which));
  if (idx >= 0 && idx < words.length) return toFrame(words[idx][edge] + offset);
  const tokens = l.text.split(/\s+/);
  idx = typeof which === 'number' ? which : tokens.findIndex((t) => clean(t) === clean(which));
  const frac = idx >= 0 ? (idx + (edge === 'e' ? 1 : 0)) / Math.max(1, tokens.length) : 0;
  return toFrame(l.start + (l.end - l.start) * frac + offset);
};

/** Bill's footage time at `frame` for an on-camera line cut by `npm run voice:reel` (footage = film time + offset). */
export const footageOffset = (slot: string) =>
  LINES.find((l) => l.source?.file.replace(/\.[^.]+$/, '') === `bill-${slot}`)?.source?.offset;
