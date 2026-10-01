import type {Pt} from '../components/sketch';

// Where everything sits on the reel's 1080 × 1920 page (page pixels). Beats 1–3 and the meadow are drawn under one
// slow camera (zoom ≤ CAMERA.zoom about CAMERA.anchor), so their words stay inside TEXT_BOX, which the push-in maps
// into the safe box (x 64–960, y 270–1450) and above the caption band (y ≥ 1270). Beat 4's print and notes and the
// close/end card are laid out directly on screen.

export const CAMERA = {anchor: {x: 540, y: 900}, zoom: 1.04} as const;
/** Words under the camera stay in here: at zoom 1.04 this box lands inside x 77–957, y 276–1258 on screen. */
export const TEXT_BOX = {left: 96, right: 940, top: 300, bottom: 1240} as const;

/** A drawing placed by scale k (display width / source width). Returns its props and a source → page mapper. */
const place = (srcW: number, k: number, left: number, top: number) => ({
  left,
  top,
  width: srcW * k,
  map: ([x, y]: Pt): Pt => [left + x * k, top + y * k],
});

// ---- 1 · hook ------------------------------------------------------------------------------------------------------
// Caveat 600 at 120 px, line height 1.05 (126 px). Measured in Chromium with the film's font files: « il y a » is
// 221 px wide, « il y a votre vie » 559 px; the baseline sits 102 px below the top of each line.
export const HOOK = {left: 110, top: 330, size: 120, lineHeight: 126} as const;
const HOOK_BASELINE_2 = HOOK.top + HOOK.lineHeight + 102;
const UNDER_Y = HOOK_BASELINE_2 + 15;
/** the brass underline under « votre vie » */
export const UNDERLINE: Pt[] = [
  [HOOK.left + 221 - 6, UNDER_Y + 3],
  [HOOK.left + 390, UNDER_Y],
  [HOOK.left + 562, UNDER_Y - 4],
];
/** The notebook (1400 × 787), below the words, clear of the caption band. */
export const NOTEBOOK = {left: 40, top: 690, width: 1000} as const;

// ---- 2 · life ------------------------------------------------------------------------------------------------------
// lake-chairs (1920 × 1079): two chairs on the dock, the lake, a house, and a couple walking along the near shore.
export const LAKE = place(1920, 0.6, -90, 590);
/** The near shore under the couple, right to left, traced on the source at full size (the waterline). */
const SHORE_SRC: Pt[] = [
  [1900, 526],
  [1760, 520],
  [1690, 513],
  [1555, 501],
  [1470, 494],
  [1350, 485],
  [1220, 476],
  [1100, 472],
  [920, 469],
  [740, 466],
];
/** …and on to the far shore on the left, under the hills. */
const FAR_SRC: Pt[] = [
  [700, 446],
  [450, 442],
  [200, 441],
];
export const SHORE = SHORE_SRC.map(LAKE.map);
const FAR = FAR_SRC.map(LAKE.map);
export const LIFE_NOTES = {
  retirement: {left: 110, top: 330, size: 72},
  /** right-aligned on x 930 (756 px wide at 72 px) */
  people: {left: 930 - 756, top: 432, size: 72},
} as const;

// ---- 4b · the meadow -------------------------------------------------------------------------------------------------
// meadow-path (1920 × 1079), large, its footpath on the left third and the bench on the right.
export const MEADOW = place(1920, 0.885, -446, 315);
/** The footpath in source pixels, near end → far end (the film's trace, GuideReveal.tsx). */
const FOOTPATH_SRC: Pt[] = [
  [868, 1000],
  [848, 955],
  [824, 908],
  [800, 862],
  [776, 818],
  [758, 778],
  [742, 746],
  [735, 718],
  [741, 692],
  [757, 668],
  [776, 648],
  [792, 628],
  [798, 606],
  [792, 588],
  [780, 574],
];
export const FOOTPATH = FOOTPATH_SRC.map(MEADOW.map);
/** In the pieces beat the line climbs the path's first stretch and stops here, short of the will above it. */
export const REACH_STOP = FOOTPATH[4];
/** While the pieces land, the line rests on the path's first few pixels (where it came back onto the page). */
export const REST_LENGTH = 64;

// ---- the brass line, beats 1 → 3 -------------------------------------------------------------------------------------
// One pen line: it underlines « votre vie », runs on and leaves the page on the right, comes back in along the lake's
// near shore (past the couple) and the far shore, leaves on the left, and comes back in low to rest where the
// meadow's footpath will begin. The parts off the page are never seen; they only keep the line continuous.
export const THREAD_A: Pt[] = [
  ...UNDERLINE,
  [840, UNDER_Y + 4],
  [990, UNDER_Y + 40],
  [1130, UNDER_Y + 120], // off the page from here…
  [1190, 790],
  [1175, 880],
  [1110, 904], // …to here
  ...SHORE,
  ...FAR,
  [-40, 858], // off the page again…
  [-160, 950],
  [-170, 1090],
  [-110, 1180],
  [-30, 1199], // …and back
  [80, 1201],
  [200, 1201],
  FOOTPATH[0],
];
export const THREAD_A_MARKS = {
  underlineEnd: UNDERLINE[UNDERLINE.length - 1],
  shoreStart: SHORE[0],
  shoreEnd: SHORE[SHORE.length - 1],
  farEnd: FAR[FAR.length - 1],
  rest: FOOTPATH[0],
} as const;

// ---- 3 · pieces ------------------------------------------------------------------------------------------------------
// Three clippings, scattered left and right; the notes on the other side; the question low on the right. The column
// x 190–340, y 1000–1210 is kept for the brass line. Clipping images: illustrations/<name>.full.png.
export const CLIPS = {
  statement: {src: 'illustrations/statement.full.png', size: {w: 800, h: 525}, left: 96, top: 320, width: 400, rotate: -3},
  policy: {src: 'illustrations/policy.full.png', size: {w: 800, h: 582}, left: 600, top: 520, width: 340, rotate: 3.5},
  will: {src: 'illustrations/will-folder.full.png', size: {w: 900, h: 669}, left: 96, top: 750, width: 310, rotate: -2},
} as const;
export const PIECE_NOTES = {
  account: {left: 560, top: 404, size: 64, rotate: -2},
  policy: {left: 116, top: 625, size: 64, rotate: 1.5},
  will: {left: 470, top: 830, size: 58, rotate: -1.5},
  question: {left: 480, top: 1062, size: 60, rotate: -1},
} as const;
/** small ticks on « Chaque morceau a du sens. », one by each piece */
export const TICKS: Pt[] = [
  [470, 600],
  [612, 790],
  [384, 1000],
];

// ---- 4a · guide (on screen, over the camera) -------------------------------------------------------------------------
/** Bill's print: 4:5, 800 × 1000, low on the page so the notes have the top. Its lower edge runs under the captions. */
export const PRINT = {left: 140, top: 548, width: 800, height: 1000, rotate: -1.5} as const;
export const GUIDE = {left: 690, top: 268, width: 260, rotate: 6} as const;
export const GUIDE_NOTES = {
  spots: {left: 100, top: 296},
  examples: {left: 124, top: 368},
  jargon: {left: 100, top: 440},
  size: 64,
} as const;

// ---- 5 · close and end card (on screen) ------------------------------------------------------------------------------
// Caveat 600 at 110 px, line height 1.05 (115.5 px), baseline 94 px below each line's top.
export const CLOSE = {left: 110, top: 318, size: 110, lineHeight: 115.5} as const;
const CLOSE_UNDER_Y = CLOSE.top + CLOSE.lineHeight + 94 + 14;
export const END = {
  /** under « honnête » (line 2), then out to the right edge of the safe box as the end card's rule */
  underline: [
    [CLOSE.left - 4, CLOSE_UNDER_Y + 2],
    [CLOSE.left + 150, CLOSE_UNDER_Y],
    [CLOSE.left + 330, CLOSE_UNDER_Y - 3],
  ] as Pt[],
  rule: [
    [CLOSE.left + 330, CLOSE_UNDER_Y - 3],
    [600, CLOSE_UNDER_Y - 2],
    [940, CLOSE_UNDER_Y - 1],
  ] as Pt[],
  who: {left: 110, top: 592, size: 44},
  cta: {left: 110, top: 656, size: 56},
  guide: {left: 118, top: 790, width: 350, rotate: -2.5},
  disclaimer: {left: 110, top: 1300, width: 830, size: 28},
} as const;
