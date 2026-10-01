import {at, endOf, REEL_FRAMES} from './timing';

// The reel's beats on one timeline, every boundary from a narration cue (src/data/reel-timing.json). Beats 1–3 and the
// meadow share the page under the camera and dissolve into each other; the guide (Bill's print, the booklet and the
// notes) and the close are laid over it. `fadeIn` / `fadeOut` are dissolves in frames (0 = the beat handles it).
export const BEATS = {
  hook: {from: 0, to: at('retraite', -0.05), fadeIn: 0, fadeOut: at('retraite', -0.05) - at('retraite', -0.4)},
  life: {from: at('retraite', -0.4), to: at('morceaux', -0.1), fadeIn: at('retraite', -0.05) - at('retraite', -0.4), fadeOut: 8},
  pieces: {from: at('morceaux', -0.35), to: at('guide', 0), fadeIn: 8, fadeOut: at('guide', 0) - at('guide', -0.45)},
  guide: {from: at('guide', -0.45), to: at('parfaites', 0.45), fadeIn: 0, fadeOut: 0},
  meadow: {from: at('parfaites', -0.45), to: endOf('depart', 0.95), fadeIn: 0, fadeOut: 0},
  close: {from: at('depart', -0.1), to: REEL_FRAMES, fadeIn: 0, fadeOut: 0},
} as const;

export type BeatId = keyof typeof BEATS;
