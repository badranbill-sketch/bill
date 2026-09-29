/**
 * Geometry and timing of the four-act mountain ride, shared by the server
 * (static fallback crops) and the browser (scroll engine). Pure functions only.
 */
import { curve, fracAtX, pointOn, type Curve, type Pt } from "./terrain";
import type { Pose } from "@/components/journey/figure";

export const WORLD = { w: 6800, h: 1000 };
export const FAR_DEPTH = 0.8; // parallax factor of the distant ranges (gentle)

export const BRIDGE = { x0: 4360, x1: 4900, y: 418, sag: 76 };

/** The far shore of the lake, and the dock the ride ends on (act IV). */
export const HORIZON = 560;
export const DOCK = { x0: 5932, x1: 6168, y: 702 };
/** Where the dock's two chairs stand; the ride ends seated in the first. */
export const CHAIRS: [number, number] = [6050, 6092];
const DECK_WALK = DOCK.y - 6;

/** Quadratic sag: `t` 0..1 across the span, lowest point `sag` below the anchors. */
export function bridgeDeck(x0: number, x1: number, y: number, sag: number) {
  return (t: number): Pt => [
    x0 + (x1 - x0) * t,
    (1 - t) * (1 - t) * y + 2 * (1 - t) * t * (y + 2 * sag) + t * t * y,
  ];
}

const deck = bridgeDeck(BRIDGE.x0, BRIDGE.x1, BRIDGE.y, BRIDGE.sag);

/** The one brass trail through the whole world, left to right. */
export const ROUTE: Pt[] = [
  // I · meadow
  [760, 862],
  [860, 856],
  [960, 846],
  [1060, 836],
  [1160, 828],
  [1260, 822],
  [1360, 818],
  [1440, 814],
  [1530, 806],
  [1630, 788],
  [1730, 758],
  [1820, 722],
  // II · the climb, then the ridge in the storm
  [1910, 678],
  [1990, 636],
  [2060, 600],
  [2130, 558],
  [2200, 524],
  [2270, 492],
  [2340, 466],
  [2420, 444],
  [2510, 428],
  [2600, 414],
  [2700, 404],
  [2800, 396],
  [2900, 386],
  [3000, 376],
  [3100, 370],
  [3200, 374],
  [3300, 386],
  [3400, 402],
  [3500, 418],
  // III · the plateau of choices, then the bridge
  [3600, 430],
  [3700, 438],
  [3800, 441],
  [3900, 441],
  [4000, 439],
  [4100, 434],
  [4200, 426],
  [4280, 420],
  [4340, 418],
  ...Array.from({ length: 21 }, (_, i) => {
    const [x, y] = deck(i / 20);
    return [x, y - 1] as Pt;
  }),
  [4950, 416],
  [5020, 415],
  [5100, 420],
  // IV · a gentle path down to the shore, then out along the dock
  [5200, 434],
  [5300, 456],
  [5400, 486],
  [5500, 522],
  [5600, 561],
  [5700, 600],
  [5790, 636],
  [5860, 664],
  [5915, 684],
  [5960, DECK_WALK],
  [6005, DECK_WALK],
  [CHAIRS[0], DECK_WALK],
];

export type Ride = {
  route: Curve;
  /** route fraction at the start, each act's stop and the end */
  stops: number[];
  /** smoothed camera height for each route sample */
  camY: number[];
};

let cached: Ride | null = null;
export function ride(): Ride {
  if (cached) return cached;
  const route = curve(ROUTE, 12);
  const stops = [
    0,
    fracAtX(route, 1440),
    fracAtX(route, 3000),
    fracAtX(route, 4630),
    1,
  ];
  // Box-filter the trail height over ±420 units so the camera glides.
  const camY = route.pts.map(([x]) => {
    let sum = 0,
      n = 0;
    for (const p of route.pts)
      if (Math.abs(p[0] - x) < 420) {
        sum += p[1];
        n++;
      }
    return sum / n;
  });
  cached = { route, stops, camY };
  return cached;
}

/** Pose while holding at each stop (start, act I–III stops, end). */
export const HOLD_POSES: Pose[] = ["stand", "stand", "climb", "stand", "sit"];

/**
 * Scroll timeline, in acts (0–4): the walker moves, then holds for the rest of
 * the act so the narration and text can land before the next scene begins.
 */
const KEYS: [number, number][] = [
  [0, 0],
  [0.06, 0],
  [0.84, 1],
  [1, 1],
  [1.84, 2],
  [2, 2],
  [2.84, 3],
  [3, 3],
  [3.84, 4],
  [4, 4],
];

const smooth = (v: number) => v * v * (3 - 2 * v);
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Route fraction and hold state for a scroll position measured in acts. */
export function timeline(p: number) {
  const r = ride();
  const q = Math.max(0, Math.min(4, p));
  let i = 1;
  while (i < KEYS.length - 1 && q > KEYS[i][0]) i++;
  const [p0, s0] = KEYS[i - 1],
    [p1, s1] = KEYS[i];
  const k = smooth(clamp01((q - p0) / (p1 - p0)));
  return {
    t: r.stops[s0] + (r.stops[s1] - r.stops[s0]) * k,
    holding: s0 === s1 ? s0 : -1,
  };
}

export function cameraY(t: number) {
  const r = ride();
  const i = Math.min(r.camY.length - 1, Math.round(t * (r.camY.length - 1)));
  // camY is indexed by sample, not arc length; close enough for a glide.
  return r.camY[i];
}

export const pointAt = (t: number) => pointOn(ride().route, t);

/** Camera framing: how much world fits vertically, and where the walker sits. */
export function framing(x: number, narrow: boolean) {
  const end = smooth(clamp01((x - 5550) / 450));
  return {
    viewH: narrow ? 620 : 760,
    // Desktop keeps the seated walker clear of the text column on the left.
    anchor: narrow ? 0.5 - end * 0.25 : 0.6 - end * 0.08,
    // A small, slow pull back at the dock (no dramatic zoom).
    zoom: 1 - end * (narrow ? 0.12 : 0.04),
    level: 0.64,
  };
}

/**
 * Act III is one wide picture: the bridge and the two placards on its towers.
 * Near the crossing a wide screen pulls back just enough to keep all of it
 * inside the clear part of the window, between the text and the rail.
 */
export const CROSSING = { x0: 4280, x1: 4980 };

/**
 * Top-left world corner of the camera for a walker at route fraction t.
 * `clear` is the part of the window's width the art may use without being
 * covered, as fractions (wide screens only).
 */
export function camera(
  t: number,
  viewW: number,
  viewH: number,
  narrow: boolean,
  clear?: [number, number],
) {
  const [x] = pointAt(t);
  const f = framing(x, narrow);
  let zoom = f.zoom,
    g = 0,
    fitLeft = 0;
  if (clear && !narrow) {
    const mid = (CROSSING.x0 + CROSSING.x1) / 2;
    // never so far back that the walker becomes a speck
    const room = Math.max(
      0.72,
      ((clear[1] - clear[0]) * viewW) / (CROSSING.x1 - CROSSING.x0),
    );
    g = smooth(clamp01(1 - Math.abs(x - mid) / 420));
    zoom += (Math.min(zoom, room) - zoom) * g;
    fitLeft = mid - ((clear[0] + clear[1]) / 2) * (viewW / zoom);
  }
  const w = viewW / zoom;
  const left = x - f.anchor * w + (fitLeft - (x - f.anchor * w)) * g;
  const h = viewH / zoom;
  return {
    x: Math.max(0, Math.min(WORLD.w - w, left)),
    y: Math.max(0, Math.min(WORLD.h - h, cameraY(t) - f.level * h)),
    zoom,
  };
}
