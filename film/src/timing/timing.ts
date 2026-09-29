import raw from '../data/timing.json';

// The whole film is timed from the narration. tools/voice.py writes src/data/timing.json from
// script/script.json (temporary synthetic voice or Bill's recording); every cue below is a line or a word.

export const FPS = 30;

export type Word = {w: string; s: number; e: number};
export type Line = {
  id: string;
  scene: string;
  slot: string | null;
  clip: string;
  text: string;
  cue: string;
  start: number;
  end: number;
  words: Word[];
  /** Bill's recording only: the on-camera file this line was cut from; footage time = film time + offset. */
  source?: {file: string; offset: number};
};
export type Timing = {
  source: 'scratch' | 'bill';
  voice: string;
  audio: string;
  leadIn: number;
  narrationEnd: number;
  tail: number;
  duration: number;
  lines: Line[];
};

export const timing = raw as unknown as Timing;
export const LINES: Line[] = timing.lines;
export const TOTAL_FRAMES = Math.ceil(timing.duration * FPS);

const byId = new Map(LINES.map((l) => [l.id, l]));

/** A narration line by id. Ids come from script/script.json; an unknown id is a programming error. */
export const line = (id: string): Line => {
  const l = byId.get(id);
  if (!l) throw new Error(`timing: unknown narration line "${id}" — check script/script.json`);
  return l;
};

const toFrame = (seconds: number) => Math.round(seconds * FPS);

/** Frame at which a line starts (+ offset in seconds). */
export const at = (id: string, offset = 0) => toFrame(line(id).start + offset);
/** Frame at which a line ends (+ offset in seconds). */
export const endOf = (id: string, offset = 0) => toFrame(line(id).end + offset);

const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Frame at which a word of a line is spoken. `which` is the word's text (first match) or its index.
 * Never throws: if the word cannot be found (script edited, odd alignment) it falls back to the word's
 * proportional position within the line, so a render always completes.
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

/** True while the narrator is speaking (used to duck the music). */
export const speakingAt = (seconds: number, pad = 0.12) => LINES.some((l) => seconds >= l.start - pad && seconds <= l.end + pad);
