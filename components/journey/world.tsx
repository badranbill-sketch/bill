import type { Language } from "@/lib/business";
import { journey } from "@/lib/journey";
import {
  BRIDGE,
  CHAIRS,
  DOCK,
  FAR_DEPTH,
  HORIZON,
  ROUTE,
  WORLD,
} from "@/lib/ride";
import {
  closeDown,
  curve,
  enc,
  marks,
  Nib,
  pointOn,
  rng,
  smooth,
  summits,
  yAt,
  type Pt,
} from "@/lib/terrain";
import { Companion, Walker } from "./figure";
import {
  adirondack,
  bicycle,
  birch,
  bridge,
  canoe,
  dock,
  fence,
  garden,
  house,
  paper,
  Placard,
  placardH,
  Plane,
  PlaneArt,
  rain,
  sailboat,
  scree,
  Signpost,
  spruce,
  stormCloud,
  streaks,
  textW,
  treeline,
} from "./parts";

/*
 * One continuous landscape, 6800 × 1000 world units, drawn left to right in
 * pen, a little pencil and a few washes: I the meadow and home (0–1900) ·
 * II the climb into the weather (1900–3550) · III the plateau, the canyon
 * and the bridge (3550–5150) · IV down to the lake and the dock at sunrise
 * (5150–6800). The light comes from the upper left throughout.
 */

const H = WORLD.h;
const lift = (pts: readonly Pt[], dy: number) =>
  pts.map(([x, y]) => [x, y + dy] as Pt);
const leftRoute = ROUTE.filter(([x]) => x <= 4345);
const rightRoute = ROUTE.filter(([x]) => x >= 4950 && x <= DOCK.x0);
const ground = (x: number) => yAt(ROUTE, x);
const lerp = (a: Pt, b: Pt, t: number): Pt => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

/** A few small rocky breaks between the given points, above `below`. */
function jag(line: Pt[], seed: number, amp = 3, every = 44, below = 600) {
  const r = rng(seed);
  const out: Pt[] = [];
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i],
      [bx, by] = line[i + 1];
    out.push(line[i]);
    const n = Math.floor(Math.hypot(bx - ax, by - ay) / every);
    for (let k = 1; k < n; k++) {
      const t = k / n;
      const y = ay + (by - ay) * t;
      const a = y < below ? amp : amp * 0.3;
      out.push([ax + (bx - ax) * t, y + (r() - 0.5) * 2 * a]);
    }
  }
  out.push(line[line.length - 1]);
  return out;
}

/**
 * Engraver's hatching: parallel lines across a polygon at `angle` degrees,
 * exactly `gap` apart, ends kept `inset` inside. With `feather`, every other
 * line stops short at its lower end, so the tone fades instead of ending on
 * a hard edge. `upper` keeps only the top part of each line (for a second,
 * denser pass near a ridge).
 */
function engrave(
  poly: readonly Pt[],
  o: {
    angle: number;
    gap: number;
    inset?: number;
    feather?: number;
    upper?: number;
    phase?: number;
    r?: () => number;
  },
): [Pt, Pt][] {
  const ang = (o.angle * Math.PI) / 180,
    c = Math.cos(ang),
    s = Math.sin(ang);
  const rot = poly.map(([x, y]) => [x * c + y * s, -x * s + y * c] as Pt);
  const back = ([x, y]: Pt): Pt => [x * c - y * s, x * s + y * c];
  const ys = rot.map((q) => q[1]);
  const y0 = Math.min(...ys),
    y1 = Math.max(...ys);
  const inset = o.inset ?? 1.2;
  const r = o.r ?? (() => 0.5);
  const out: [Pt, Pt][] = [];
  let k = 0;
  for (let y = y0 + o.gap * (o.phase ?? 0.5); y < y1; y += o.gap, k++) {
    const xs: number[] = [];
    for (let i = 0; i < rot.length; i++) {
      const [ax, ay] = rot[i],
        [bx, by] = rot[(i + 1) % rot.length];
      if ((ay <= y && by > y) || (by <= y && ay > y))
        xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((p, q) => p - q);
    for (let j = 0; j + 1 < xs.length; j += 2) {
      let a = back([xs[j] + inset, y]),
        b = back([xs[j + 1] - inset, y]);
      if (xs[j + 1] - xs[j] < inset * 2 + 1.5) continue;
      // make `a` the upper end
      if (a[1] > b[1]) [a, b] = [b, a];
      if (o.upper) b = lerp(a, b, o.upper * (0.85 + 0.3 * r()));
      else if (o.feather)
        b = lerp(a, b, 1 - o.feather * (k % 2 ? 0.7 + 0.6 * r() : 0.25 * r()));
      out.push([a, b]);
    }
  }
  return out;
}

/**
 * A mountain in ink: a paper cut-out, one clean skyline and, on each face
 * turned right (away from the light), fall-line hatching hung from the
 * ridge, denser near the top and feathered below, with a pale wash on that
 * face only.
 */
function mountain(
  p: Plane,
  sky: Pt[],
  o: {
    w?: number;
    soft?: boolean;
    far?: boolean;
    depth?: number;
    gap?: number;
    wash?: number;
    arete?: boolean;
    step?: number;
    min?: number;
  } = {},
) {
  const n = p.nib;
  const r = rng(Math.round(sky[0][0]) + 7);
  const dense = curve(sky, 5).pts;
  p.cut += enc(closeDown(curve(sky, 2).pts, H), true, 0);
  const line = n.contour(sky, { w: o.w ?? 1.5, piece: 420, step: o.step });
  if (o.soft) p.soft += line;
  else p.ink += line;
  const gap = o.gap ?? 3.4;
  const hatch: [Pt, Pt][] = [];
  const dir: Pt = [
    Math.cos((74 * Math.PI) / 180),
    Math.sin((74 * Math.PI) / 180),
  ];
  for (const s of summits(sky)) {
    const i0 = dense.findIndex((q) => q[0] >= s[0] - 0.01);
    let i = i0;
    while (i + 1 < dense.length && dense[i + 1][1] >= dense[i][1] - 0.4) i++;
    const flank = dense.slice(i0, i + 1);
    const drop = flank[flank.length - 1][1] - s[1];
    if (drop < (o.min ?? 40)) continue;
    const depth = Math.min(o.depth ?? 110, drop * 0.7);
    // Hung from the ridge: evenly spaced lines along the flank, longest a
    // little below the summit, shorter towards the foot, every other one
    // stopping short so the tone fades into the paper.
    const x0 = flank[0][0],
      x1 = flank[flank.length - 1][0];
    const reach = Math.min(x1 - x0, depth * 2.6);
    const face: Pt[] = [];
    let k = 0;
    for (let x = x0 + gap * 0.6; x < x0 + reach; x += gap, k++) {
      const t = (x - x0) / reach;
      const top: Pt = [x - 0.6, yAt(flank, x) + 1.8];
      const len =
        depth *
        Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.08)) ** 0.8 *
        (k % 2 ? 0.62 + 0.2 * r() : 0.92 + 0.1 * r());
      if (len < 4) continue;
      const end: Pt = [top[0] + dir[0] * len, top[1] + dir[1] * len];
      hatch.push([top, end]);
      face.push(top);
      if (k % 2 === 0) face.unshift(lerp(top, end, 0.7));
    }
    if (o.wash && face.length > 4) p.wash("blue", enc(face, true, 0), o.wash);
    if (o.arete)
      p.soft += n.stroke(
        [
          [s[0] + 0.5, s[1] + 3],
          [s[0] - depth * 0.06, s[1] + depth * 0.5],
          [s[0] - depth * 0.1, s[1] + depth * 0.9],
        ],
        { w: 0.8, taper: 0.9, step: 6 },
      );
  }
  if (o.far) p.far += marks(hatch, 1);
  else p.hatch += marks(hatch, 1);
}

/** Shade under the lip of a path on its steep stretches, feathered. */
function lip(p: Plane, line: readonly Pt[], x0: number, x1: number) {
  const r = rng(Math.round(x0));
  const top = curve(
    line.filter(([x]) => x >= x0 && x <= x1),
    3,
  ).pts;
  if (top.length < 3) return;
  const band: Pt[] = [
    ...top.map(([x, y]) => [x, y + 3] as Pt),
    ...top
      .slice()
      .reverse()
      .map(([x, y], i, all) => {
        const k = Math.sin((Math.PI * i) / (all.length - 1));
        return [x - 3, y + 6 + 16 * k] as Pt;
      }),
  ];
  p.hatch += marks(engrave(band, { angle: 76, gap: 3.6, feather: 0.5, r }), 1);
}

/* ---------- the far layer: distant ranges ---------- */

/**
 * A range drawn in world coordinates, as seen when the camera looks at it,
 * moved onto the far layer (which pans at FAR_DEPTH of the camera's speed).
 */
const toFar = (pts: Pt[], camY: number) =>
  pts.map(
    ([x, y]) =>
      [
        x - (1 - FAR_DEPTH) * Math.max(0, x - 700),
        y - (1 - FAR_DEPTH) * camY,
      ] as Pt,
  );

/** A gently rolling ridge line. */
function rolling(
  x0: number,
  x1: number,
  y: number,
  amp: number,
  period: number,
  seed: number,
) {
  const r = rng(seed);
  const pts: Pt[] = [];
  const ph = r() * 6;
  for (let x = x0; x < x1; x += 90 + r() * 40)
    pts.push([x, y + Math.sin(x / period + ph) * amp]);
  pts.push([x1, y + Math.sin(x1 / period + ph) * amp]);
  return pts;
}

function buildFar() {
  const p = new Plane(new Nib(201));
  // Act I: a rounded Laurentian ridge behind the meadow, one pale tint.
  const ridge = toFar(rolling(-40, 2000, 626, 18, 230, 211), 300);
  p.cut += enc(closeDown(curve(ridge, 3).pts, H), true, 0);
  p.soft += p.nib.contour(ridge, { w: 0.8, piece: 500, step: 9 });
  // Act II: far peaks beside the massif.
  mountain(
    p,
    toFar(
      [
        [3240, 600],
        [3330, 480],
        [3400, 420],
        [3450, 436],
        [3530, 356],
        [3600, 404],
        [3660, 392],
        [3760, 456],
        [3860, 436],
        [3960, 520],
        [4060, 600],
      ],
      0,
    ),
    { w: 0.8, soft: true, far: true, gap: 4.4, depth: 50, step: 8 },
  );
  return p;
}

/* ---------- the main layer ---------- */

const MASSIF: Pt[] = jag(
  [
    [1480, 1000],
    [1640, 860],
    [1760, 760],
    [1880, 662],
    [2000, 566],
    [2120, 476],
    [2240, 392],
    [2360, 322],
    [2480, 262],
    [2580, 214],
    [2660, 180],
    [2722, 148],
    [2772, 170],
    [2840, 210],
    [2920, 238],
    [3000, 230],
    [3080, 204],
    [3152, 176],
    [3222, 212],
    [3300, 258],
    [3400, 302],
    [3520, 372],
    [3640, 452],
    [3760, 540],
    [3900, 650],
    [4050, 780],
    [4200, 1000],
  ],
  105,
);
const CHOICE_PEAK: Pt[] = jag(
  [
    [3700, 1000],
    [3780, 660],
    [3850, 520],
    [3920, 380],
    [3990, 282],
    [4052, 214],
    [4112, 250],
    [4180, 296],
    [4240, 290],
    [4300, 340],
    [4346, 394],
    [4362, 430],
    [4350, 1000],
  ],
  106,
);
/** The income peak beyond the bridge, running down into the far shore. */
const INCOME_PEAK: Pt[] = jag(
  [
    [4800, 1000],
    [4860, 700],
    [4920, 520],
    [4980, 404],
    [5030, 334],
    [5082, 298],
    [5134, 324],
    [5200, 368],
    [5290, 420],
    [5380, 462],
    [5470, 494],
    [5560, 514],
    [5660, 526],
    [5760, 532],
    [5850, 538],
    [5900, 547],
    [5940, 557],
    [6000, HORIZON + 8],
    [6060, HORIZON + 30],
  ],
  109,
);
/** The far shore beyond the sun, to the right. */
const FAR_SHORE: Pt[] = [
  [6330, HORIZON + 30],
  [6356, HORIZON - 3],
  [6420, 548],
  [6500, 534],
  [6580, 520],
  [6660, 512],
  [6740, 516],
  [6840, 520],
];
const HILLS: Pt[] = [
  [-40, 760],
  [120, 716],
  [300, 690],
  [480, 704],
  [660, 668],
  [860, 690],
  [1040, 654],
  [1170, 690],
  [1290, 770],
  [1350, 860],
  [1380, 1000],
];
const SHOULDER: Pt[] = [
  [1560, 1000],
  [1600, 800],
  [1660, 700],
  [1720, 646],
  [1790, 628],
  [1860, 652],
  [1940, 700],
  [2000, 760],
];
const VALLEY: Pt[] = [
  [4340, 1000],
  [4420, 800],
  [4480, 756],
  [4550, 770],
  [4620, 736],
  [4700, 760],
  [4780, 726],
  [4850, 764],
  [4920, 830],
  [4960, 1000],
];
/** The low sun over the lake (it rises with the scroll through act IV). */
const SUN: Pt = [6232, HORIZON + 1];
/** The canyon's two rock edges, from the rim down, in steps and ledges. */
const WALL_L: Pt[] = [
  [4362, 426],
  [4367, 450],
  [4365, 470],
  [4378, 476],
  [4386, 522],
  [4383, 548],
  [4399, 556],
  [4410, 612],
  [4418, 652],
  [4414, 668],
  [4432, 676],
  [4446, 750],
  [4460, 830],
  [4478, 920],
  [4494, 1000],
];
// The far wall breaks at other heights than the near one, and less often.
const WALL_R: Pt[] = [
  [4902, 426],
  [4896, 448],
  [4899, 466],
  [4887, 472],
  [4879, 512],
  [4882, 531],
  [4871, 540],
  [4860, 598],
  [4852, 640],
  [4857, 660],
  [4846, 668],
  [4830, 742],
  [4812, 830],
  [4792, 920],
  [4774, 1000],
];
const GROUND_LEFT: Pt[] = [
  [-40, 874],
  [300, 870],
  [600, 867],
  ...lift(leftRoute, 4),
  ...WALL_L,
];
/** The shore under the dock, and the bank curving down towards us. */
const SHORE_BANK: Pt[] = [
  [DOCK.x0 - 2, DOCK.y + 1],
  [DOCK.x0 - 26, DOCK.y + 16],
  [DOCK.x0 - 90, DOCK.y + 48],
  [DOCK.x0 - 190, DOCK.y + 104],
  [DOCK.x0 - 300, DOCK.y + 190],
  [DOCK.x0 - 350, H],
];
const GROUND_RIGHT: Pt[] = [
  ...WALL_R.slice().reverse(),
  ...lift(rightRoute, 4),
  ...SHORE_BANK,
];

/**
 * The canyon: each wall shows its face as it runs away from us, between the
 * near edge and a lighter far edge. The left face is turned from the light
 * and hatched; the right one is lit, with bedding lines only. Everything
 * thins out with depth.
 */
function canyon(p: Plane) {
  const n = p.nib;
  const r = rng(77);
  const near: [Pt, Pt][] = [];
  const far: [Pt, Pt][] = [];
  const fade = (y: number) => Math.min(1, Math.max(0, (y - 426) / 480));
  const faces: [Pt[], number][] = [
    [WALL_L, 1],
    [WALL_R, -1],
  ];
  // The gorge is open air: nothing from the far hills shows through it. It
  // winds the same way as the ground on either side, so overlaps never cancel.
  paper(p, [...WALL_R, ...WALL_L.slice().reverse()]);
  for (const [wall, side] of faces) {
    const edge = wall.filter(([, y]) => y < 960);
    // The face's far side is left open, as an engraver would: the hatching
    // just stops, a little further out at some ledges than at others, so
    // the wall does not read as a ribbon doubled along its edge.
    const back = edge.map(
      ([x, y]) =>
        [x + side * (24 - 10 * fade(y)) * (0.5 + 0.7 * r()), y + 12] as Pt,
    );
    const face: Pt[] = [...edge, ...back.slice().reverse()];
    if (side > 0) {
      // the face in shade: steep hatching, closer near the rim
      for (const [seg, y] of engrave(face, {
        angle: 86,
        gap: 2.4,
        feather: 0.2,
        r,
      }).map((q) => [q, q[0][1]] as const)) {
        if (fade(y) > 0.75) continue;
        (fade(y) < 0.35 ? near : far).push(seg);
      }
      p.wash(
        "blue",
        enc(
          face.filter(([, y]) => y < 760),
          true,
          0,
        ),
        0.3,
      );
    }
    // bedding lines across the face, at the ledges and between them
    for (let y = 446; y < 880; y += 22 + 14 * fade(y)) {
      const x = yAt(
        edge.map(([a, b]) => [b, a] as Pt),
        y,
      );
      const w = (24 - 10 * fade(y)) * (0.6 + 0.4 * r());
      (fade(y) < 0.4 ? near : far).push([
        [x + side * 1.5, y + 0.5],
        [x + side * w, y + 5 + r()],
      ]);
    }
  }
  p.hatch += marks(near, 1);
  p.far += marks(far, 1);
  // The near edges: firm at the rim, lighter as they go down.
  for (const wall of [WALL_L, WALL_R]) {
    const k = wall.findIndex(([, y]) => y > 680);
    const top = wall.slice(0, k),
      low = wall.slice(k - 1);
    p.ink += n.stroke(top, { w: 1.4, taper: 0.3, smooth: false, step: 4 });
    p.soft += n.stroke(low, { w: 1, taper: 0.8, step: 8 });
  }
  // the river far below, and its water
  const river: Pt[] = [
    [4488, 952],
    [4600, 946],
    [4700, 948],
    [4782, 944],
    [4780, 955],
    [4700, 959],
    [4600, 958],
    [4490, 964],
  ];
  p.wash("blue", enc(river, true, 0), 0.5);
  p.far += marks([
    [
      [4500, 956],
      [4530, 956],
    ],
    [
      [4580, 951],
      [4630, 951],
    ],
    [
      [4680, 954],
      [4712, 954],
    ],
    [
      [4730, 951],
      [4764, 951],
    ],
  ]);
}

/**
 * A steep rock step beside the trail: two angular blocks standing just
 * behind the path, lit on the left, hatched on the faces turned right.
 */
function rockStep(p: Plane, x: number, k = 1.3) {
  const n = p.nib;
  const g = ground(x) - 1;
  // local offsets from the foot, scaled by k
  const P = (pts: Pt[]) =>
    pts.map(([dx, dy]) => [x + dx * k, g + dy * k] as Pt);
  const big = P([
    [-17, 0],
    [-13, -17],
    [-3, -25],
    [9, -21],
    [15, -8],
    [16, 0],
  ]);
  const small = P([
    [14, 0],
    [16, -10],
    [24, -13],
    [29, -4],
    [30, 0],
  ]);
  paper(p, big);
  paper(p, small);
  p.ink += n.poly(big, { w: 1.2, step: 3 });
  p.ink += n.poly(small.slice(0, -1), { w: 1, step: 3 });
  // the edge between the lit and the shaded face of each block
  const [e1, e2, e3, e4] = P([
    [-3, -24],
    [1, -1],
    [24, -12.5],
    [24.5, -1],
  ]);
  p.soft += n.line(e1, e2, { w: 0.8 });
  p.soft += n.line(e3, e4, { w: 0.7 });
  p.hatch += marks(
    [
      ...engrave(
        P([
          [-2.5, -23],
          [9, -20],
          [14.5, -8],
          [15, -1],
          [1.5, -1],
        ]),
        { angle: 78, gap: 1.9, inset: 0.5 },
      ),
      ...engrave(
        P([
          [24.5, -12],
          [28.5, -4],
          [29, -1],
          [25, -1],
        ]),
        { angle: 78, gap: 1.9, inset: 0.4 },
      ),
    ],
    1,
  );
}

function buildMain() {
  /* sky: a few thin streaks of fair-weather cloud */
  const sky = new Plane(new Nib(301));
  streaks(sky, 780, 330, 220);
  streaks(sky, 1180, 262, 300);
  streaks(sky, 5520, 300, 240);
  streaks(sky, 6380, 250, 280);

  /* back: the massif, the peak of choices, the income peak, the far shore */
  const back = new Plane(new Nib(302));
  mountain(back, MASSIF, { w: 1.6, depth: 96, gap: 4, wash: 0.2, step: 12 });
  mountain(back, CHOICE_PEAK, {
    w: 1.5,
    depth: 80,
    gap: 4,
    wash: 0.2,
    step: 12,
  });
  mountain(back, INCOME_PEAK, {
    w: 1.4,
    depth: 76,
    gap: 4,
    wash: 0.2,
    step: 12,
  });
  mountain(back, FAR_SHORE, { w: 0.9, soft: true, depth: 20, step: 8 });

  /* the weather over the ridge: engraved storm clouds and their rain */
  const storm = new Plane(new Nib(303));
  stormCloud(storm, 2420, 268, 280, 30);
  rain(storm, 2456, 268, 180, 104);
  stormCloud(storm, 2872, 250, 440, 46);
  rain(storm, 2940, 250, 200, 150);

  /* middle distance: meadow hills, the shoulder, the valley in the gorge */
  const mid = new Plane(new Nib(304));
  mountain(mid, HILLS, { w: 0.9, soft: true, step: 14, min: 999 });
  mountain(mid, SHOULDER, { w: 1.2, depth: 60, gap: 3.6 });
  mountain(mid, VALLEY, {
    w: 0.8,
    soft: true,
    far: true,
    step: 14,
    depth: 30,
    gap: 4.4,
  });

  /* the ground the walker treads */
  const front = new Plane(new Nib(305));
  const n = front.nib;
  front.cut += enc(closeDown(curve(GROUND_LEFT, 3).pts, H), true, 0);
  front.cut += enc(closeDown(curve(GROUND_RIGHT, 3).pts, H), true, 0);
  const meadow = GROUND_LEFT.filter(([x]) => x < 1620);
  front.ink += n.contour(meadow, { w: 1.2, piece: 600 });
  const flank = GROUND_LEFT.filter(([x]) => x >= 1600 && x <= 4362);
  front.ink += n.contour(flank, { w: 1.6, piece: 700 });
  const path = lift(rightRoute, 4);
  front.ink += n.contour(path, { w: 1.6, piece: 700 });
  front.soft += n.stroke(SHORE_BANK, { w: 1, taper: 0.8, step: 6 });
  lip(front, lift(ROUTE, 4), 1720, 2380);
  lip(front, lift(ROUTE, 4), 3260, 3540);
  lip(front, lift(ROUTE, 4), 5330, 5820);
  canyon(front);
  // act II: the scree ahead of the walker, spilling off the path
  scree(front, [3076, ground(3076) + 9], 26, [40, 62]);

  /* the lake: the horizon, still water, the sun's road */
  const lake = new Plane(new Nib(306));
  const ln = lake.nib;
  lake.cut += enc(
    [
      [5560, HORIZON],
      [6830, HORIZON],
      [6830, H],
      [5560, H],
    ],
    true,
    0,
  );
  lake.soft += ln.contour(
    [
      [5570, HORIZON],
      [6200, HORIZON + 0.3],
      [6830, HORIZON],
    ],
    { w: 0.8, piece: 800, step: 10 },
  );
  // the far shore's forest, in front of the hills behind it
  treeline(lake, 5560, 6080, () => HORIZON + 0.5, 16);
  treeline(lake, 6364, 6836, () => HORIZON + 0.5, 17);
  // Still water: short level strokes in even rows, closer near the horizon,
  // denser near the dock and the sun's road, thinning out towards us.
  const water: [Pt, Pt][] = [];
  const focus: Pt = [6120, 690];
  let row = 0;
  for (let y = HORIZON + 5; y < H - 10; y += 5 + (y - HORIZON) * 0.06, row++) {
    const len = 12 + (y - HORIZON) * 0.07;
    const step = len * 3.2;
    for (
      let x = 5580 + ((row * 0.37) % 1) * step;
      x < 6820;
      x += step * ln.rand(0.9, 1.1)
    ) {
      const d = Math.hypot((x - focus[0]) / 2.4, y - focus[1]);
      const keep = 0.95 - d / 420 - (y - HORIZON) / 700;
      if (ln.rand() > keep) continue;
      if (
        x > DOCK.x0 - 20 &&
        x < DOCK.x1 + 12 &&
        y > DOCK.y - 16 &&
        y < DOCK.y + 30
      )
        continue;
      water.push([
        [x, y],
        [x + len * ln.rand(0.8, 1.2), y],
      ]);
    }
  }
  lake.hatch += marks(water);
  // the far shore's trees reflected as broken verticals
  const refl: [Pt, Pt][] = [];
  for (const [x0, x1] of [
    [5580, 6070],
    [6370, 6830],
  ])
    for (let x = x0; x < x1; x += ln.rand(5, 9))
      refl.push([
        [x, HORIZON + 2.5],
        [x, HORIZON + 2.5 + ln.rand(3, 7)],
      ]);
  lake.far += marks(refl, 1);
  // the sun's road: broken brass strokes, widening towards us
  const road: [Pt, Pt][] = [];
  for (let y = HORIZON + 5; y < DOCK.y - 18; y += 4.2 + (y - HORIZON) * 0.03) {
    const half = 7 + (y - HORIZON) * 0.24;
    for (let x = SUN[0] - half; x < SUN[0] + half; x += ln.rand(6, 11)) {
      if (ln.rand() < 0.3) continue;
      road.push([
        [x, y],
        [x + ln.rand(3, 8), y],
      ]);
    }
  }
  lake.warm += marks(road);
  lake.pencil += ln.pencil([5530, HORIZON], [5570, HORIZON], 4);

  /* props: what you've built, the trees, the bridge, the dock */
  const props = new Plane(new Nib(307));
  // act I: the canoe under the trees, the house and garden, the bicycle
  spruce(props, 560, ground(560) - 2, 64);
  spruce(props, 590, ground(590) - 3, 42);
  canoe(props, 1004, ground(1004) - 5, 0.86);
  spruce(props, 1084, ground(1084) - 8, 62);
  spruce(props, 1106, ground(1106) - 10, 44);
  birch(props, 1172, ground(1172) - 14, 96);
  house(props, 1256, ground(1256) - 16, 1.18);
  garden(props, 1206, 1320, ground(1270) - 7);
  fence(
    props,
    [
      [1150, ground(1150) - 4],
      [1260, ground(1260) - 3],
      [1372, ground(1372) - 3],
    ],
    11,
  );
  bicycle(props, 1356, ground(1356) - 1, 1);
  birch(props, 1702, ground(1702) - 3, 84);
  // a few spruce on the climb, the plateau and the far side
  for (const [x, h] of [
    [1880, 44],
    [1904, 32],
    [3640, 38],
    [3700, 48],
    [3724, 32],
    [4150, 36],
    [5176, 42],
    [5200, 30],
    [5446, 40],
    [5800, 50],
    [5824, 34],
  ] as const)
    spruce(props, x, ground(x) + 2, h);
  bridge(props, BRIDGE.x0, BRIDGE.x1, BRIDGE.y, BRIDGE.sag);
  sailboat(props, 6392, 640, 0.8);
  dock(props, DOCK.x0, DOCK.x1, DOCK.y, [6110, HORIZON]);
  for (const cx of CHAIRS) adirondack(props, cx, DOCK.y - 6);
  rockStep(props, 2908);
  return { sky, back, storm, mid, front, lake, props };
}

let cache: { far: Plane; main: ReturnType<typeof buildMain> } | null = null;
function world() {
  cache ??= { far: buildFar(), main: buildMain() };
  return cache;
}

/* ---------- labels, the note and the paths that react to the walker ---------- */

/**
 * The words of act II, printed like an engraver's plate captions, each on a
 * hairline to what it names: the storm cloud, the rain, the loose scree,
 * the rock step. `at` is the walker's x when the word is written in.
 */
const WORDS: { x: number; y: number; to: Pt; at: number }[] = [
  { x: 3000, y: 178, to: [3006, 212], at: 2420 },
  { x: 3160, y: 322, to: [3106, 300], at: 2540 },
  { x: 3130, y: 492, to: [3118, 456], at: 2760 },
  { x: 2890, y: 318, to: [2902, 348], at: 2640 },
];
const WORD_SIZE = 17;
/** Faint alternative paths leaving the plateau of choices. */
const ALTS: Pt[][] = [
  [
    [3890, 446],
    [3930, 500],
    [3920, 580],
    [3950, 660],
  ],
  [
    [3990, 440],
    [4030, 380],
    [4062, 320],
    [4084, 262],
  ],
  [
    [4010, 444],
    [4090, 470],
    [4170, 520],
    [4270, 556],
  ],
];

const TEXT: Record<Language, { canoe: string; note: string }> = {
  fr: { canoe: "les étés au lac", note: "un mardi matin" },
  en: { canoe: "summers at the lake", note: "a Tuesday morning" },
};

/** A printed caption with a hairline leader from beside it to `to`. */
function Caption({
  x,
  y,
  to,
  size,
  children,
}: {
  x: number;
  y: number;
  to: Pt;
  size: number;
  children: string;
}) {
  const half = textW(children, size, 0.6, 0.42) / 2;
  const from: Pt =
    Math.abs(to[0] - x) > half
      ? [to[0] > x ? x + half + 4 : x - half - 4, y - size * 0.32]
      : [x + (to[0] - x) * 0.3, to[1] > y ? y + 4 : y - size * 0.8];
  return (
    <>
      <path
        className="ride-leader"
        d={`M${from[0].toFixed(1)} ${from[1].toFixed(1)}L${to[0].toFixed(1)} ${to[1].toFixed(1)}`}
      />
      <text className="ride-label" x={x} y={y} fontSize={size}>
        {children}
      </text>
    </>
  );
}

export function FarLayer() {
  const { far } = world();
  return (
    <g id="ride-far" className="ride-art far-layer">
      <PlaneArt p={far} />
    </g>
  );
}

export function MainLayer({ lang }: { lang: Language }) {
  const j = journey[lang];
  const [a, b, c, d] = j.signsFoundations;
  const [e, f, g, h, i] = j.signsChoices;
  const m = world().main;
  const sun = new Nib(401);
  const t = TEXT[lang];
  return (
    <g id="ride-main" className="ride-art">
      <PlaneArt p={m.sky} />
      <g className="sun" data-sun="">
        <path
          d={enc(
            Array.from({ length: 28 }, (_, k): Pt => {
              const a = (k / 28) * Math.PI * 2;
              return [SUN[0] + Math.cos(a) * 38, SUN[1] + Math.sin(a) * 38];
            }),
            true,
          )}
          className="w brass"
        />
        <path
          d={sun.ellipse(SUN[0], SUN[1], 38.5, 38.5, {
            w: 0.8,
            from: Math.PI * 1.04,
            sweep: Math.PI * 0.92,
            taper: 0.9,
          })}
          className="ik soft"
        />
      </g>
      <PlaneArt p={m.back} />
      <PlaneArt p={m.storm} />
      <PlaneArt p={m.mid} />
      <PlaneArt p={m.lake} />
      <PlaneArt p={m.front} />
      <PlaneArt p={m.props} />
      <Companion at={[CHAIRS[1], DOCK.y - 6]} />
      <Signpost
        seed={501}
        x={1500}
        base={ground(1500) + 3}
        top={640}
        boards={[
          { y: 648, label: a, dir: 1 },
          { y: 674, label: b, dir: -1 },
          { y: 700, label: c, dir: 1 },
          { y: 726, label: d, dir: 1 },
        ]}
      />
      <Signpost
        seed={502}
        x={3960}
        base={443}
        top={200}
        boards={[
          { y: 208, label: e, dir: 1 },
          { y: 238, label: f, dir: -1 },
          { y: 268, label: g, dir: 1 },
          { y: 298, label: h, dir: -1 },
          { y: 328, label: i, dir: 1 },
        ]}
      />
      {/* the two placards stand on the bridge's towers: the crossing
          goes from one to the other */}
      <Placard
        seed={503}
        cx={BRIDGE.x0}
        y={BRIDGE.y - 44 - placardH(1)}
        lines={[j.placards[0]]}
        posts={[]}
      />
      <Placard
        seed={504}
        cx={BRIDGE.x1}
        y={BRIDGE.y - 44 - placardH(j.placards[1].split("\n").length)}
        lines={j.placards[1].split("\n")}
        posts={[]}
      />
      <Caption x={1004} y={770} to={[1004, 806]} size={14}>
        {t.canoe}
      </Caption>
      <text
        x={6008}
        y={520}
        className="note"
        fontSize={24}
        transform={`rotate(-3 6008 520)`}
      >
        {t.note}
      </text>
    </g>
  );
}

/** Everything the scroll engine moves, in its finished (no-JavaScript) state. */
export function LiveLayer({ lang }: { lang: Language }) {
  const words = journey[lang].words;
  const route = smooth(ROUTE);
  return (
    <g id="ride-live" className="ride-art">
      {words.map((w, k) => {
        const s = WORDS[k];
        return (
          <g
            key={w}
            className="mtn-word"
            data-word={s.x}
            data-y={s.y}
            data-half={Math.round(textW(w, WORD_SIZE, 0.6, 0.42) / 2 + 4)}
            data-at={s.at}
          >
            <Caption x={s.x} y={s.y} to={s.to} size={WORD_SIZE}>
              {w}
            </Caption>
          </g>
        );
      })}
      <path
        className="alts pc"
        data-alts=""
        d={ALTS.map((alt) => {
          // even dashes along each path, as a footpath is drawn on a map
          const c = curve(alt, 12);
          const dash: [Pt, Pt][] = [];
          for (let d = 0; d + 3 < c.total; d += 8)
            dash.push([pointOn(c, d / c.total), pointOn(c, (d + 3) / c.total)]);
          return marks(dash, 1);
        }).join("")}
      />
      <path d={route} className="route-ghost" />
      <path d={route} className="route" pathLength={1} data-route="" />
    </g>
  );
}

export function LiveWalker({ at }: { at: Pt }) {
  return (
    <Walker
      at={at}
      pose="stand"
      poses={["walk", "climb", "stand", "sit"]}
      live
    />
  );
}
