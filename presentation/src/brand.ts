import { Easing } from 'remotion';

/** Brand tokens — the website's palette (bill repo, commit 77de3bd). */
export const C = {
  paper: '#faf9f5',
  paper2: '#f5f2ea',
  ink: '#0e2233',
  navy2: '#173450',
  inkSoft: '#4e5b68',
  mist: '#e8edf2',
  blueGrey: '#a7b4c3',
  stone: '#c9c0b1',
  brass: '#a8875a',
  brassInk: '#7a5d33',
  rule: '#d5d4d2',
} as const;

/** The website's ink easing, and its softer sibling. No springs anywhere. */
export const EASE = Easing.bezier(0.3, 0.6, 0.2, 1);
export const EASE_SOFT = Easing.bezier(0.33, 0, 0.2, 1);

export const FPS = 30;
export const W = 1920;
export const H = 1080;

export const FONT = {
  serif: "'Newsreader', Georgia, serif",
  sans: "'Source Sans 3', 'Helvetica Neue', Arial, sans-serif",
  hand: "'Caveat', cursive",
} as const;

/** Motion rules from the brief, in frames. */
export const MOTION = {
  fadeIn: 24, // 20–40 frames
  fadeOut: 20,
  rise: 12, // text rises at most 12 px while fading in
  sceneIn: 12,
  sceneOut: 20,
  closeOut: 36,
} as const;
