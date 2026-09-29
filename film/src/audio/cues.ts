import {at, endOf, FPS, LINES, timing, TOTAL_FRAMES, wordAt} from '../timing/timing';

// ---- music: one level while Bill speaks, another in the pauses -------------------------------------------------
// Computed from the narration timing, so it follows any new take and works the same with a replacement track.
export const MUSIC = {
  under: 0.16, // under the voice (≈ -16 dB)
  open: 0.5, // in the pauses between lines
  tail: 0.62, // after the last line, over the end card
  preroll: 0.35, // the music starts to dip this long (s) before a line
  release: 0.6, // and stays down this long (s) after it: gaps shorter than ~1 s stay ducked
  smooth: 0.45, // length (s) of the smoothing between the two levels
};

const musicCurve: number[] = (() => {
  const target = Array.from({length: TOTAL_FRAMES}, (_, f) => {
    const s = f / FPS;
    if (s > timing.narrationEnd + MUSIC.release) return MUSIC.tail;
    return LINES.some((l) => s >= l.start - MUSIC.preroll && s <= l.end + MUSIC.release) ? MUSIC.under : MUSIC.open;
  });
  const half = Math.round((MUSIC.smooth * FPS) / 2);
  return target.map((_, f) => {
    let sum = 0;
    let n = 0;
    for (let k = f - half; k <= f + half; k++) {
      sum += target[Math.min(TOTAL_FRAMES - 1, Math.max(0, k))];
      n++;
    }
    return sum / n;
  });
})();

/** Music volume at an absolute frame of the film. */
export const musicVolume = (frame: number) => musicCurve[Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(frame)))];

// ---- ambience ---------------------------------------------------------------------------------------------------
/** A quiet room under the whole film, so the pauses never fall into digital silence (≈ -60 dBFS in the mix). */
export const ROOM_TONE = 0.5;

export type Bed = {sfx: 'lake'; from: number; to: number; volume: number; fade: number};
const bed = (from: number, to: number, volume: number, fade = 45): Bed => ({sfx: 'lake', from, to, volume, fade});

/** Water lapping under the drawings with water in them. */
export const BEDS: Bed[] = [
  bed(endOf('created', -0.35), at('inside', 0.8), 0.15), // the meadow path: a distant lake
  bed(at('revisit', -0.45), TOTAL_FRAMES, 0.25, 60), // the calm sea, then the lakeside walk, the porch and the two chairs
];

/** Volume of a bed at frame f of its own sequence: faded in and out over `fade` frames. */
export const bedVolume = (b: Bed, f: number) => {
  const len = b.to - b.from;
  const k = Math.min(1, f / b.fade, (len - f) / b.fade);
  return b.volume * Math.max(0, k) * Math.max(0, k);
};

// ---- sound effects -----------------------------------------------------------------------------------------------
// Each cue mirrors a beat in a scene (the same `at` / `wordAt` expression), so they stay on the picture when the
// narration is re-timed. Files come from tools/sfx.py (public/audio/sfx/<name>.wav); all are levelled alike, so the
// volumes below are the mix.
export type Sfx = 'pen' | 'write' | 'write-short' | 'page' | 'paper' | 'cup' | 'chime' | 'swell';
export type Cue = {frame: number; sfx: Sfx; volume: number};

const cue = (frame: number, sfx: Sfx, volume = 1): Cue => ({frame, sfx, volume});

export const buildCues = (): Cue[] => [
  // intro: Bill's print laid on the empty page; his name written; the brass line born under it
  cue(at('hi', -0.45), 'paper', 0.45),
  cue(wordAt('hi', 'Bill', 's', -0.12), 'write', 0.25),
  cue(wordAt('start', 'numbers', 's', -0.1), 'write-short', 0.2),

  // life: "Your life." written; the three fragments draw themselves
  cue(wordAt('your-life', 'Your', 's', -0.15), 'write-short', 0.2),
  ...['retirement', 'people', 'freedom'].map((id) => cue(at(id, -0.5), 'pen', 0.3)),

  // credibility: Bill's print lands on the left
  cue(at('fifteen', 0.15), 'paper', 0.4),

  // pieces: the kitchen table at night; the three pieces, one by one; the ticks; the reach that stops short
  cue(at('work', -0.35), 'pen', 0.35),
  cue(wordAt('piece', 'piece', 's', -0.1), 'pen', 0.3),
  cue(at('policy', -0.9), 'pen', 0.28),
  cue(at('will', -0.7), 'pen', 0.28),
  cue(wordAt('sense', 'each', 's', 0.05), 'write-short', 0.2),
  cue(wordAt('who', "who's", 's', -0.1), 'pen', 0.18),
  cue(wordAt('who', 'fit', 's', 0), 'write', 0.22),

  // guide: the booklet laid on the page; the meadow; the brass line walks the path
  cue(wordAt('created', 'created', 's', -0.25), 'page', 0.45),
  cue(endOf('created', -0.35), 'pen', 0.35),
  cue(wordAt('help', 'take', 's', -0.2), 'pen', 0.18),

  // the five blind spots: each study starts drawing as the camera arrives
  cue(wordAt('inside', 'five', 's', -0.4), 'write-short', 0.3),
  cue(at('m1', -0.75), 'pen', 0.45),
  cue(at('m2', -0.6), 'pen', 0.4),
  cue(at('m3', -0.5), 'pen', 0.4),
  cue(at('m4', -0.5), 'pen', 0.4),
  cue(at('m5', -0.5), 'pen', 0.4),

  // simple: Bill; clippings of the real guide taped in; "jargon" struck through; the notebook, "start here"
  cue(at('easy', -0.2), 'paper', 0.4),
  cue(at('examples', -0.3), 'paper', 0.45),
  cue(at('questions', -0.3), 'paper', 0.45),
  cue(wordAt('jargon', 'jargon', 's', 0.05), 'write-short', 0.35),
  cue(at('five-q', 0.15), 'paper', 0.5),
  cue(at('perfect', -0.1), 'pen', 0.45),
  cue(wordAt('honest', 'honest', 's', -0.2), 'write-short', 0.25),

  // approach: Bill's print lands as the page dissolves in
  cue(at('approach', -0.1), 'paper', 0.3),

  // plan: sitting down together (two cups); the brass line joins everything into one plan — the only chime in the
  // film, because this is the first time the line connects
  cue(at('start-you', 1.0), 'cup', 0.3),
  cue(wordAt('build', 'plan', 's'), 'chime', 0.32),

  // role, invite, end: Bill's print; the line rises up the lakeside path; the guide laid down; the two chairs
  cue(at('role', -0.3), 'paper', 0.3),
  cue(wordAt('role', 'connect', 's', -0.35), 'pen', 0.2),
  cue(wordAt('read', 'read', 's', -0.3), 'paper', 0.45),
  cue(endOf('worked', 0.1), 'pen', 0.25),
];
