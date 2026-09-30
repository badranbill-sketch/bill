import { Easing } from 'remotion';

/**
 * Brand tokens: the website's palette (docs/ART-DIRECTION.md on origin/main),
 * as the presentation project (origin/claude/bill-presentation-video) set them.
 * Navy ink on warm paper. Brass is for small marks only, never a fill.
 */
export const C = {
  paper: '#faf9f5',
  ivory: '#f5f2ea',
  ink: '#0e2233',
  navy2: '#173450',
  muted: '#4e5b68',
  blueGrey: '#a7b4c3',
  stone: '#c9c0b1',
  brass: '#a8875a',
  brassSoft: '#c9a874',
  brassInk: '#7a5d33',
  rule: '#d5d4d2',
} as const;

/** Watercolour tones used by the drawings' washes (the site's ink CSS). */
export const WASH: Record<string, string> = {
  blue: C.blueGrey,
  stone: C.stone,
  brass: C.brassSoft,
  navy: C.navy2,
  ivory: C.ivory,
};

/** The website's ink easing, its softer sibling, and the pen's in-out. No springs anywhere. */
export const EASE = Easing.bezier(0.3, 0.6, 0.2, 1);
export const EASE_SOFT = Easing.bezier(0.33, 0, 0.2, 1);
export const EASE_PEN = Easing.bezier(0.37, 0, 0.63, 1);

export const FPS = 30;
export const W = 1920;
export const H = 1080;

export const FONT = {
  serif: "'Newsreader', Georgia, serif",
  sans: "'Source Sans 3', 'Helvetica Neue', Arial, sans-serif",
  hand: "'Caveat', cursive", // incidental notes only
} as const;

/** Motion rules, in frames: calm fades, a few pixels of rise, nothing that bounces. */
export const MOTION = {
  fadeIn: 24,
  fadeOut: 20,
  rise: 12,
} as const;

/** On-screen reading time: at least 0.3 s per word, plus 1.5 s. */
export const READING = { perWord: 0.3, base: 1.5 } as const;
