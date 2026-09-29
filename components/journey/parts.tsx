import { bridgeDeck } from "@/lib/ride";
import { curve, enc, marks, Nib, type Pt } from "@/lib/terrain";
import { CHAIR, chairTop } from "./figure";

/*
 * Pen-and-ink pieces for the mountain ride. Coordinates are world units.
 * Drawing happens into a Plane: every stroke of one kind shares a single
 * <path>, which keeps the 6800-unit landscape light enough to ship inline.
 * One light for the whole world, from the upper left: faces turned right
 * and the undersides carry the hatching.
 */

export type Tone = "blue" | "stone" | "brass" | "navy";

/** One depth plane of the drawing: paper, washes, hatching, pencil, ink. */
export class Plane {
  cut = "";
  ink = "";
  soft = "";
  hatch = "";
  /** lighter hatching, for what lies further away */
  far = "";
  /** thin, darker marks: branches, rigging, the rain */
  lines = "";
  /** brass-soft strokes: light on the water */
  warm = "";
  pencil = "";
  washes = new Map<string, string>();
  constructor(public nib: Nib) {}
  wash(tone: Tone, d: string, strength = 1) {
    const k = `${tone} ${strength}`;
    this.washes.set(k, (this.washes.get(k) ?? "") + d);
  }
}

export function PlaneArt({ p }: { p: Plane }) {
  return (
    <>
      {p.cut && <path d={p.cut} className="cut" />}
      {[...p.washes].map(([k, d]) => {
        const [tone, strength] = k.split(" ");
        return (
          <path
            key={k}
            d={d}
            className={`w ${tone}`}
            opacity={strength === "1" ? undefined : strength}
          />
        );
      })}
      {p.pencil && <path d={p.pencil} className="pc" />}
      {p.far && <path d={p.far} className="ht far" />}
      {p.hatch && <path d={p.hatch} className="ht" />}
      {p.lines && <path d={p.lines} className="ln" />}
      {p.warm && <path d={p.warm} className="ln warm" />}
      {p.soft && <path d={p.soft} className="ik soft" />}
      {p.ink && <path d={p.ink} className="ik" />}
    </>
  );
}

const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const lerp = (a: Pt, b: Pt, t: number): Pt => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
/** Local drawing coordinates (y up is negative) to world, at scale s. */
const at =
  (x: number, y: number, s = 1) =>
  (q: Pt): Pt => [x + q[0] * s, y + q[1] * s];

/** A paper cut-out under a closed outline (hides what lies behind). */
export function paper(p: Plane, pts: readonly Pt[]) {
  p.cut += enc(pts, true, 0);
}

/* ---------- trees ---------- */

/**
 * A spruce: a straight trunk and even tiers of short strokes angled down,
 * doubled on the side away from the light.
 */
export function spruce(p: Plane, x: number, y: number, h: number) {
  const n = p.nib;
  p.ink += n.stroke(
    [
      [x, y + 1],
      [x, y - h],
    ],
    { w: 0.8, taper: 0.9, smooth: false, step: 5 },
  );
  const rows = Math.max(4, Math.round(h / 5.2));
  const m: [Pt, Pt][] = [];
  for (let i = 0; i < rows; i++) {
    const k = (i + 0.7) / rows; // 0 at the tip, 1 at the foot
    const yy = y - h + k * h * 0.9;
    const reach = (1 + h * 0.22 * k) * n.rand(0.94, 1.06);
    for (const s of [-1, 1])
      m.push([
        [x + s * 0.3, yy],
        [x + s * reach, yy + reach * 0.45],
      ]);
    if (h > 40 && i > 1 && i % 2)
      m.push([
        [x + 0.3, yy + 2],
        [x + reach * 0.8, yy + 2 + reach * 0.42],
      ]);
  }
  p.lines += marks(m, 1);
}

/**
 * A distant treeline: one silhouette of small spires on a base line, rising
 * and falling in slow swells, with the odd rounded broadleaf crown, filled
 * with a pale flat tint.
 */
export function treeline(
  p: Plane,
  x0: number,
  x1: number,
  base: (x: number) => number,
  h: number,
) {
  const n = p.nib;
  const top: Pt[] = [[x0, base(x0)]];
  const phase = n.rand(0, 6);
  let x = x0;
  while (x < x1) {
    const swell =
      0.8 + 0.2 * Math.sin(x / 47 + phase) * Math.sin(x / 113 + phase / 2);
    // the forest thins out to nothing at either end
    const ends = Math.max(0.3, Math.min(1, (x - x0) / 40, (x1 - x) / 50));
    const hh = h * swell * ends * n.rand(0.84, 1.12);
    if (n.rand() < 0.1) {
      const w = hh * n.rand(0.7, 0.85);
      for (const [t, k] of [
        [0.14, 0.6],
        [0.5, 0.76],
        [0.86, 0.58],
        [1, 0.42],
      ])
        top.push([x + w * t, base(x + w * t) - hh * k]);
      x += w;
      continue;
    }
    const w = hh * n.rand(0.36, 0.44);
    // spires stand in small groups, with the odd deeper gap between them
    const dip = n.rand() < 0.22 ? n.rand(0.15, 0.25) : n.rand(0.4, 0.55);
    top.push([x + w / 2, base(x + w / 2) - hh]);
    top.push([x + w, base(x + w) - hh * dip]);
    x += w;
  }
  top.push([x, base(x)]);
  const sil: Pt[] = [...top, [x, base(x) + 1], [x0, base(x0) + 1]];
  paper(p, sil);
  p.wash("blue", enc(sil, true, 0), 0.75);
  p.lines += enc(top);
}

/**
 * A birch: a pale tapered trunk with a few dark marks, and one smooth crown
 * with a few gentle lobes, shaded on its right.
 */
export function birch(p: Plane, x: number, y: number, h: number) {
  const n = p.nib;
  const cx = x + 1.5,
    cy = y - h * 0.66,
    rx = h * 0.29,
    ry = h * 0.25;
  const foot = cy + ry * 0.55;
  p.ink += n.stroke(
    [
      [x - 1.7, y + 1],
      [x - 1.1, y - h * 0.3],
      [x - 0.4, foot],
    ],
    { w: 0.8, taper: 0.7, step: 5 },
  );
  p.ink += n.stroke(
    [
      [x + 1.7, y + 1],
      [x + 1.3, y - h * 0.3],
      [x + 0.9, foot],
    ],
    { w: 0.9, taper: 0.7, step: 5 },
  );
  const bark: [Pt, Pt][] = [];
  for (let k = 0.12; k < 0.6; k += 0.13)
    bark.push([
      [x - 1.2, y - h * k],
      [x + 0.2, y - h * k + 0.3],
    ]);
  p.hatch += marks(bark, 1);
  // two limbs into the crown
  p.soft += n.stroke(
    [
      [x + 0.2, foot + 4],
      [x - rx * 0.35, cy + 2],
      [x - rx * 0.5, cy - ry * 0.2],
    ],
    { w: 0.6, taper: 0.9, step: 3 },
  );
  p.soft += n.stroke(
    [
      [x + 0.6, foot + 2],
      [x + rx * 0.4, cy],
    ],
    { w: 0.6, taper: 0.9, step: 3 },
  );
  // the crown: an ellipse with five gentle lobes, flattened underneath
  const ph = n.rand(0, 6);
  const crown = (a: number): Pt => {
    const r = 1 + 0.06 * Math.cos(5 * a + ph) + 0.05 * Math.cos(a - 0.6);
    return [
      cx + Math.cos(a) * rx * r,
      Math.min(cy + Math.sin(a) * ry * r, cy + ry * 0.62),
    ];
  };
  const arc = (a0: number, a1: number, k = 22) =>
    Array.from({ length: k + 1 }, (_, i) => crown(a0 + ((a1 - a0) * i) / k));
  const ring = arc(0, Math.PI * 2, 30);
  paper(p, ring);
  p.wash("stone", enc(ring, true, 0), 0.55);
  p.soft += n.stroke(arc(Math.PI * 0.62, Math.PI * 2.38, 30), {
    w: 0.9,
    taper: 0.9,
    step: 3,
  });
  // shade on the right of the crown
  p.hatch += n.hatch(
    [
      ...arc(-Math.PI * 0.35, Math.PI * 0.45, 8).map(
        ([ax, ay]) => [ax - 1.5, ay] as Pt,
      ),
      [cx + rx * 0.2, cy + ry * 0.4],
      [cx + rx * 0.35, cy - ry * 0.4],
    ],
    { angle: 60, gap: 2.8, inset: 1 },
  );
}

/* ---------- life objects (act I) ---------- */

/**
 * A small Québec house seen at three-quarters: the gable end facing us, the
 * long wall receding to the right into shade, a steep roof and a chimney.
 * Receding edges rise towards a vanishing point well above the roof.
 */
export function house(p: Plane, x: number, y: number, s = 1) {
  const n = p.nib;
  const T = at(x, y, s);
  const P = (pts: Pt[]) => pts.map(T);
  const gable = P([
    [-30, 0],
    [-30, -42],
    [-4, -72],
    [22, -42],
    [22, 0],
  ]);
  const side = P([
    [22, 0],
    [22, -42],
    [64, -48],
    [64, -7.5],
  ]);
  // the right-hand roof plane, receding: verge, ridge, eave
  const roof = P([
    [-4, -72],
    [25, -39.5],
    [67, -46],
    [38, -76.5],
  ]);
  paper(
    p,
    P([
      [-31, 1],
      [-31, -42],
      [-4, -73],
      [38, -77.5],
      [68, -46],
      [64.5, -7],
      [22, 1],
    ]),
  );
  paper(
    p,
    P([
      [45, -60],
      [45, -84],
      [52, -84.8],
      [52, -68],
    ]),
  );
  const o = { w: 1.3 * s, step: 5 };
  p.ink += n.line(gable[4], gable[0], { w: 1.5 * s });
  p.ink += n.poly([gable[0], gable[1]], o);
  p.ink += n.poly([side[0], side[3], side[2]], { ...o, w: 1.1 * s });
  p.ink += n.line(gable[4], gable[3], o);
  // verges drawn a little heavier, then the ridge and the eave
  p.ink += n.line(
    ...(P([
      [-32, -40],
      [-4, -72.5],
    ]) as [Pt, Pt]),
    { w: 1.5 * s },
  );
  p.ink += n.line(roof[0], roof[1], { w: 1.5 * s });
  p.ink += n.line(roof[0], roof[3], { w: 1.2 * s });
  p.ink += n.line(roof[3], roof[2], { w: 1.2 * s });
  p.ink += n.line(roof[1], roof[2], { w: 1 * s });
  // chimney
  p.ink += n.poly(
    P([
      [45, -60.5],
      [45, -84],
      [52, -84.8],
      [52, -68.5],
    ]),
    { w: 1 * s, step: 4 },
  );
  // shingle courses parallel to the eave
  const courses: [Pt, Pt][] = [];
  for (const k of [0.25, 0.5, 0.75]) {
    const a = lerp(roof[1], roof[0], k),
      b = lerp(roof[2], roof[3], k);
    courses.push([lerp(a, b, 0.02), lerp(a, b, k > 0.6 ? 0.2 : 0.97)]);
  }
  p.hatch += marks(courses, 1);
  // the long wall in shade: an even hatch and a pale wash, darker under the eave
  const wall = P([
    [23, -1],
    [23, -41],
    [63, -47],
    [63, -8.5],
  ]);
  p.wash("blue", enc(wall, true, 0), 0.7);
  p.hatch += n.hatch(wall, { angle: 90, gap: 3.4 * s, inset: 1 });
  p.hatch += n.hatch(
    P([
      [23, -41],
      [63, -47],
      [63, -42],
      [23, -36],
    ]),
    { angle: 90, gap: 1.7 * s, inset: 0.5 },
  );
  // door, windows
  p.ink += n.poly(
    P([
      [-11, 0],
      [-11, -24],
      [-1, -24],
      [-1, 0],
    ]),
    { w: 0.9 * s, step: 4 },
  );
  const wins: Pt[][] = [
    [
      [-25, -33],
      [-17, -33],
      [-17, -21],
      [-25, -21],
    ],
    [
      [6, -33],
      [14, -33],
      [14, -21],
      [6, -21],
    ],
    [
      [-8, -58],
      [0, -58],
      [0, -47],
      [-8, -47],
    ],
    [
      [30, -35.2],
      [37, -36.2],
      [37, -24.2],
      [30, -23.4],
    ],
    [
      [48, -37.6],
      [55, -38.6],
      [55, -26.8],
      [48, -26],
    ],
  ];
  for (const w of wins) {
    const win = P(w);
    p.ink += n.poly(win, { closed: true, w: 0.8 * s, step: 4 });
    p.wash("navy", enc(win, true, 0), 0.25);
  }
  // porch step
  p.ink += n.line(
    ...(P([
      [-14, 1.5],
      [2, 1.5],
    ]) as [Pt, Pt]),
    { w: 0.9 * s },
  );
}

/** A picket fence along the ground, with two rails. */
export function fence(p: Plane, pts: Pt[], every = 11) {
  const n = p.nib;
  const line = curve(pts, 8);
  const m: [Pt, Pt][] = [];
  for (let d = 2; d <= line.total; d += every) {
    const i = line.len.findIndex((l) => l >= d);
    const [px, py] = line.pts[Math.max(0, i)];
    m.push([
      [px, py + 1],
      [px, py - 15],
    ]);
  }
  p.lines += marks(m, 1);
  for (const dy of [-5, -11])
    p.soft += n.stroke(
      pts.map(([px, py]) => [px, py + dy] as Pt),
      { w: 0.7, taper: 0.6, step: 8 },
    );
}

/** An upturned cedar canoe resting on two sawhorses. */
export function canoe(p: Plane, x: number, y: number, s = 1) {
  const n = p.nib;
  const T = at(x, y, s);
  const P = (pts: Pt[]) => pts.map(T);
  const legs: [Pt, Pt][] = [];
  for (const hx of [-44, 42]) {
    p.ink += n.line(
      ...(P([
        [hx - 9, -23],
        [hx + 9, -23],
      ]) as [Pt, Pt]),
      { w: 1.1 * s },
    );
    legs.push(
      P([
        [hx - 5, -23],
        [hx - 9, 0],
      ]) as [Pt, Pt],
      P([
        [hx + 5, -23],
        [hx + 9, 0],
      ]) as [Pt, Pt],
    );
  }
  for (const l of legs) p.ink += n.line(l[0], l[1], { w: 0.9 * s });
  const gunwale = P([
    [-72, -18],
    [-56, -23.5],
    [-20, -26],
    [20, -26],
    [56, -23.5],
    [72, -18],
  ]);
  const keel = P([
    [-72, -18],
    [-60, -30],
    [-30, -37],
    [0, -38.5],
    [30, -37],
    [60, -30],
    [72, -18],
  ]);
  const hull = [...gunwale, ...keel.slice(1, -1).reverse()];
  paper(p, hull);
  p.wash("brass", enc(hull, true, 0), 0.8);
  p.ink += n.stroke(gunwale, { w: 1.3 * s, step: 4 });
  p.ink += n.stroke(keel, { w: 1.5 * s, step: 4 });
  // one cedar strip line along the hull, and shade under the gunwale
  p.soft += n.stroke(
    keel.map(
      (q, i) =>
        [
          q[0],
          q[1] + (gunwale[Math.min(i, gunwale.length - 1)][1] - q[1]) * 0.45,
        ] as Pt,
    ),
    { w: 0.5 * s, taper: 0.9, step: 6 },
  );
  p.hatch += n.hatch(
    P([
      [-58, -24],
      [58, -24],
      [50, -29],
      [-50, -29],
    ]),
    { angle: 100, gap: 2.8, inset: 1 },
  );
}

/** A bicycle on its stand, facing right. */
export function bicycle(p: Plane, x: number, y: number, s = 1) {
  const n = p.nib;
  const T = at(x, y, s);
  const P = (pts: Pt[]) => pts.map(T);
  const r = 13 * s;
  const rear = T([0, -13]),
    front = T([40, -13]);
  for (const c of [rear, front]) {
    p.ink += n.ellipse(c[0], c[1], r, r, { w: 1.1 * s, step: 3 });
    p.soft += n.ellipse(c[0], c[1], r * 0.82, r * 0.82, {
      w: 0.45 * s,
      step: 3,
    });
  }
  const bb = T([17, -11]),
    seat = T([13, -32]),
    head = T([35, -32]),
    headLow = T([36, -27]);
  const o = { w: 1.1 * s, step: 4 };
  p.ink += n.poly([rear, bb, seat, rear], o);
  p.ink += n.line(seat, head, o);
  p.ink += n.line(bb, headLow, o);
  p.ink += n.line(head, front, { ...o, w: 1 * s });
  p.ink += n.stroke(
    P([
      [10, -34],
      [13, -34.5],
      [18, -34.5],
    ]),
    { w: 2.2 * s, taper: 0.4, step: 2 },
  );
  p.ink += n.stroke(
    P([
      [35, -32],
      [36, -37],
      [32.5, -38.5],
      [30, -38],
    ]),
    { w: 1 * s, step: 2 },
  );
  p.ink += n.line(bb, T([12, 0]), { w: 0.7 * s });
}

/** Garden rows: soil tinted stone, short sprout marks. */
export function garden(p: Plane, x0: number, x1: number, y: number) {
  p.wash(
    "stone",
    enc(
      [
        [x0, y - 3],
        [x1, y - 5],
        [x1 + 4, y + 5],
        [x0 - 3, y + 6],
      ],
      true,
      0,
    ),
    0.6,
  );
  const m: [Pt, Pt][] = [];
  for (let row = 0; row < 3; row++) {
    const yy = y - 2 + row * 3.5;
    for (let xx = x0 + 4 + row * 2; xx < x1 - 3; xx += 6.5) {
      m.push([
        [xx, yy],
        [xx - 1, yy - 3],
      ]);
      m.push([
        [xx + 0.4, yy],
        [xx + 1.6, yy - 2.6],
      ]);
    }
  }
  p.hatch += marks(m, 1);
}

/* ---------- sky and weather ---------- */

/** Fair weather: two or three long, thin horizontal streaks. */
export function streaks(p: Plane, x: number, y: number, w: number) {
  const n = p.nib;
  const rows: [number, number, number][] = [
    [0, 1, 0],
    [0.22, 0.62, 5.5],
    [0.08, 0.34, 11],
  ];
  for (const [a, len, dy] of rows) {
    const x0 = x + a * w,
      x1 = x + (a + len) * w;
    p.soft += n.stroke(
      [
        [x0, y + dy],
        [(x0 + x1) / 2, y + dy - 0.8],
        [x1, y + dy + 0.2],
      ],
      { w: dy ? 0.6 : 0.75, taper: 0.95, step: 18 },
    );
  }
}

/**
 * A storm cloud engraved in level lines: a stack of long horizontal strokes,
 * closer and longer towards the base, their ends staggered so the cloud has
 * a soft, uneven edge; one firmer streak along the base and a pale tint.
 */
export function stormCloud(
  p: Plane,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const n = p.nib;
  const ph = n.rand(0, 6);
  // the cloud's height above its base at t (0–1 along it): rounded on the
  // left, drawn out to a thin tail on the right, two slow swells on top
  const lift = (t: number) =>
    t <= 0 || t >= 1
      ? 0
      : h *
        Math.sin(Math.PI * Math.min(1, t * 1.3)) ** 0.5 *
        (1 - 0.6 * t) *
        (1 + 0.2 * Math.sin(t * Math.PI * 2.4 + ph));
  const k = 20;
  const top = Array.from({ length: k + 1 }, (_, i): Pt => [
    x + (w * i) / k,
    y - lift(i / k),
  ]);
  const sil: Pt[] = [...top, [x + w, y + 2], [x, y + 2]];
  paper(p, sil);
  p.wash("blue", enc(sil, true, 0), 0.3);
  const m: [Pt, Pt][] = [];
  for (let d = 1.5, row = 0; d < h * 1.2; d += 2.6 + d * 0.08, row++) {
    // the stretch of this row that lies inside the cloud
    let a = -1,
      b = -1;
    for (let i = 0; i <= 200; i++) {
      const t = i / 200;
      if (lift(t) > d) {
        if (a < 0) a = t;
        b = t;
      }
    }
    if (a < 0) break;
    const x0 = x + w * a + n.rand(0, 14) + (row % 2) * 6,
      x1 = x + w * b - n.rand(0, 18);
    if (x1 - x0 < 8) continue;
    // break the long rows once, so they read as strokes of a pen
    const cut = x0 + (x1 - x0) * n.rand(0.35, 0.65);
    m.push([
      [x0, y - d],
      [cut - n.rand(1, 4), y - d],
    ]);
    m.push([
      [cut + n.rand(1, 4), y - d],
      [x1, y - d],
    ]);
  }
  p.hatch += marks(m, 1);
  p.soft += n.stroke(
    [
      [x + w * 0.02, y + 1],
      [x + w * 0.45, y + 1.6],
      [x + w * 0.9, y + 0.6],
    ],
    { w: 0.9, taper: 0.95, step: 18 },
  );
}

/**
 * A rain curtain: fine parallel strokes slanting from a cloud base, evenly
 * spaced, longest under the middle of the cloud.
 */
export function rain(
  p: Plane,
  x: number,
  y: number,
  w: number,
  h: number,
  lean = -0.3,
) {
  const n = p.nib;
  const m: [Pt, Pt][] = [];
  let i = 0;
  for (let xx = x; xx < x + w; xx += 5.2, i++) {
    const t = (xx - x) / w;
    const env = Math.sin(Math.PI * t) ** 0.7;
    const len =
      h * env * (0.75 + 0.25 * Math.sin(i * 2.3)) * n.rand(0.92, 1.08);
    if (len < 10) continue;
    const a: Pt = [xx, y + 4 + (i % 3) * 3],
      b: Pt = [xx + lean * len, a[1] + len];
    const c1 = 0.3 + 0.12 * ((i * 7) % 3),
      c2 = c1 + 0.12;
    m.push([a, lerp(a, b, c1)], [lerp(a, b, c2), lerp(a, b, 0.72)]);
    if (i % 2) m.push([lerp(a, b, 0.8), b]);
  }
  p.hatch += marks(m, 1);
}

/**
 * Loose scree: small angular stones spilling down a slope from `from`,
 * fanning out, the bigger ones rolled furthest; each with an outline and a
 * shaded underside.
 */
export function scree(
  p: Plane,
  from: Pt,
  count: number,
  spread: [number, number],
) {
  const n = p.nib;
  let out = "";
  const shade: [Pt, Pt][] = [];
  for (let i = 0; i < count; i++) {
    const t = (i + n.rand(0, 0.8)) / count; // 0 near the path, 1 at the foot
    const fan = n.rand(-1, 1) * (6 + 26 * t);
    const sx = from[0] + spread[0] * t + fan,
      sy = from[1] + spread[1] * t - fan * 0.25 + n.rand(-2, 2);
    const r = 1.6 + 3 * t * n.rand(0.6, 1.2);
    const pts = Array.from({ length: 6 }, (_, j): Pt => {
      const a = (j / 6) * Math.PI * 2 + n.rand(-0.25, 0.25);
      const rr = r * n.rand(0.8, 1.15);
      return [
        sx + Math.cos(a) * rr * 1.3,
        sy + Math.min(0.55, Math.sin(a)) * rr * 0.85,
      ];
    });
    paper(p, pts);
    out += enc([...pts, pts[0]]);
    shade.push([
      [sx - r * 0.3, sy + r * 0.55],
      [sx + r * 1.1, sy + r * 0.2],
    ]);
  }
  p.lines += out;
  p.hatch += marks(shade, 1);
}

/* ---------- signs ---------- */

/** Approximate advance of a label, in units of font size (measured on the
 *  site's serif: capitals ≈ 0.64 em, lowercase ≈ 0.44 em). */
export const textW = (s: string, size: number, upper = 0.64, lower = 0.44) =>
  [...s].reduce(
    (w, c) =>
      w +
      (c === " "
        ? 0.25
        : c === c.toUpperCase() && c !== c.toLowerCase()
          ? upper
          : lower),
    0,
  ) * size;

function Board({
  n,
  x,
  y,
  label,
  dir,
}: {
  n: Nib;
  x: number;
  y: number;
  label: string;
  dir: 1 | -1;
}) {
  const w = textW(label, 14) + 16,
    h = 20;
  const x0 = dir === 1 ? x - 7 : x + 7;
  const x1 = x0 + dir * w;
  const tip = x1 + dir * 9;
  const shape: Pt[] = [
    [x0, y],
    [x1, y],
    [tip, y + h / 2],
    [x1, y + h],
    [x0, y + h],
  ];
  return (
    <>
      <path d={enc(shape, true)} className="board" />
      <path d={n.poly(shape, { closed: true, w: 1, step: 6 })} className="ik" />
      <text x={(x0 + x1) / 2} y={y + h / 2 + 4.8} className="sign-text">
        {label}
      </text>
    </>
  );
}

/** A wooden signpost with arrow boards. */
export function Signpost({
  x,
  base,
  top,
  boards,
  seed,
}: {
  x: number;
  base: number;
  top: number;
  boards: { y: number; label: string; dir: 1 | -1 }[];
  seed: number;
}) {
  const n = new Nib(seed);
  const post: Pt[] = [
    [x - 2.8, base + 1],
    [x - 2.8, top + 1],
    [x, top - 1.5],
    [x + 2.8, top + 1],
    [x + 2.8, base + 1],
  ];
  return (
    <g className="signpost">
      <path d={enc(post, true)} className="cut" />
      <path
        d={
          n.line(post[0], post[1], { w: 1.3 }) +
          n.line(post[4], post[3], { w: 1.1 }) +
          n.poly([post[1], post[2], post[3]], { w: 0.9 }) +
          n.line([x - 10, base + 1.5], [x + 10, base + 1.5], { w: 1 })
        }
        className="ik"
      />
      <path
        d={n.hatch(
          [
            [x + 0.6, base],
            [x + 0.6, top + 2],
            [x + 2.4, top + 2],
            [x + 2.4, base],
          ],
          { angle: 90, gap: 1.2, inset: 0.2 },
        )}
        className="ht"
      />
      {boards.map((b) => (
        <Board key={b.label} n={n} x={x} {...b} />
      ))}
    </g>
  );
}

/** A two-post placard, at each end of the bridge. */
/** Height of a placard board with `lines` lines of text. */
export const placardH = (lines: number) => 18 + lines * 24;

export function Placard({
  cx,
  y,
  lines,
  posts,
  seed,
}: {
  cx: number;
  y: number;
  lines: string[];
  posts: [number, number][];
  seed: number;
}) {
  const n = new Nib(seed);
  const size = 20,
    lead = 24;
  const w = Math.max(...lines.map((l) => textW(l, size))) + 30;
  const h = placardH(lines.length);
  const box: Pt[] = [
    [cx - w / 2, y],
    [cx + w / 2, y],
    [cx + w / 2, y + h],
    [cx - w / 2, y + h],
  ];
  let ink = "";
  for (const [px, py] of posts)
    ink +=
      n.line([px - 2.4, y + h], [px - 2.4, py + 1.5], { w: 1.2 }) +
      n.line([px + 2.4, y + h], [px + 2.4, py + 1.5], { w: 1 });
  ink += n.poly(box, { closed: true, w: 1.3, step: 6 });
  ink += n.poly(
    box.map(
      ([bx, by]) => [bx + (bx < cx ? 4 : -4), by + (by < y + 4 ? 4 : -4)] as Pt,
    ),
    { closed: true, w: 0.5, step: 6 },
  );
  return (
    <g className="placard">
      <path d={enc(box, true)} className="board" />
      <path d={ink} className="ik" />
      {lines.map((l, i) => (
        <text
          key={l}
          x={cx}
          y={y + 9 + lead * 0.72 + i * lead}
          className="sign-text big"
        >
          {l}
        </text>
      ))}
    </g>
  );
}

/* ---------- the suspension bridge ---------- */

export function bridge(
  p: Plane,
  x0: number,
  x1: number,
  y: number,
  sag: number,
) {
  const n = p.nib;
  const deck = bridgeDeck(x0, x1, y, sag);
  const rope = bridgeDeck(x0, x1, y - 38, sag * 0.84);
  const back = bridgeDeck(x0 + 4, x1 + 4, y - 42, sag * 0.84);
  const along = (f: (t: number) => Pt, dy = 0, k = 30) =>
    Array.from({ length: k + 1 }, (_, i) => add(f(i / k), [0, dy]));
  p.soft += n.contour(along(back), { w: 0.6, piece: 600 });
  const hangers: [Pt, Pt][] = [];
  const count = Math.round((x1 - x0) / 18);
  for (let i = 1; i < count; i++) {
    const t = i / count;
    const [hx, hy] = deck(t),
      [, ry] = rope(t);
    hangers.push([
      [hx, hy - 0.8],
      [hx, ry + 0.8],
    ]);
  }
  p.lines += marks(hangers, 1);
  const planks: [Pt, Pt][] = [];
  const pc = Math.round((x1 - x0) / 5);
  for (let i = 1; i < pc; i++) {
    const [px, py] = deck(i / pc);
    planks.push([
      [px, py + 1],
      [px, py + 4],
    ]);
  }
  p.hatch += marks(planks, 1);
  p.ink += n.contour(along(deck), { w: 1.4, piece: 600 });
  p.soft += n.contour(along(deck, 4.6), { w: 0.8, piece: 600 });
  p.ink += n.contour(along(rope), { w: 1.1, piece: 600 });
  for (const ex of [x0, x1]) {
    p.ink += n.line([ex - 3.5, y + 5], [ex - 3.5, y - 46], { w: 1.6 });
    p.ink += n.line([ex + 3, y + 5], [ex + 3, y - 44], { w: 1.2 });
    p.ink += n.line([ex - 5, y - 44], [ex + 4.5, y - 43], { w: 1 });
  }
  // guy ropes to the ground
  p.soft += n.line([x0 - 3.5, y - 43], [x0 - 32, y + 5], { w: 0.7 });
  p.soft += n.line([x1 + 3, y - 43], [x1 + 30, y + 4], { w: 0.7 });
}

/* ---------- the lake ---------- */

/** A small sailboat, its reflection in broken verticals. */
export function sailboat(p: Plane, x: number, y: number, s = 1) {
  const n = p.nib;
  const T = at(x, y, s);
  const P = (pts: Pt[]) => pts.map(T);
  const hull = P([
    [-15, -5],
    [-10, 0],
    [12, 0],
    [18, -5.5],
  ]);
  const main = P([
    [1, -8],
    [1, -44],
    [-13, -8],
  ]);
  const jib = P([
    [3, -40],
    [15, -8],
    [3, -8],
  ]);
  paper(p, [...hull, ...P([[18, -6]])]);
  paper(p, main);
  paper(p, jib);
  p.wash("stone", enc(main, true, 0), 0.6);
  p.ink += n.stroke(hull, { w: 1.2 * s, step: 3, smooth: false });
  p.ink += n.line(
    ...(P([
      [-16, -5.5],
      [19, -5.5],
    ]) as [Pt, Pt]),
    { w: 0.8 * s },
  );
  p.ink += n.line(main[0], main[1], { w: 1 * s });
  p.ink += n.line(main[1], main[2], { w: 0.7 * s });
  p.ink += n.line(main[2], main[0], { w: 0.7 * s });
  p.ink += n.poly(jib, { w: 0.6 * s, closed: true });
  // the sails reflected as broken verticals, fading down
  const m: [Pt, Pt][] = [];
  for (const [rx, len] of [
    [1, 22],
    [-4, 12],
    [5, 14],
    [-9, 6],
    [10, 7],
  ] as const)
    for (let k = 0; k < len; k += 5)
      m.push([T([rx, 3 + k]), T([rx, 3 + k + Math.min(3, len - k)])]);
  p.lines += marks(m, 1);
}

/* ---------- the dock and the chairs (act IV) ---------- */

/**
 * A dock seen from the shore at an angle: its deck, a front board, posts in
 * the water with their reflections, and a thin band of shadow on the water.
 * `y` is the front edge of the deck; its far edge recedes towards `vp`.
 */
export function dock(p: Plane, x0: number, x1: number, y: number, vp: Pt) {
  const n = p.nib;
  const depth = 13;
  const back = (q: Pt): Pt => lerp(q, vp, depth / (q[1] - vp[1]));
  const fl: Pt = [x0, y],
    fr: Pt = [x1, y],
    bl = back(fl),
    br = back(fr);
  const board = 3.4;
  paper(p, [bl, br, fr, [x1, y + board], [x0, y + board], fl]);
  p.wash("stone", enc([bl, br, fr, fl], true, 0), 0.5);
  p.ink += n.line(fl, fr, { w: 1.3 });
  p.ink += n.line([x0, y + board], [x1, y + board], { w: 0.9 });
  p.ink += n.line(fr, [x1, y + board], { w: 0.9 });
  p.soft += n.line(bl, br, { w: 0.7 });
  p.soft += n.line(fr, br, { w: 0.8 });
  // plank joints, converging towards the vanishing point
  const joints: [Pt, Pt][] = [];
  for (let x = x0 + 9; x < x1 - 4; x += 9)
    joints.push([[x, y - 0.8], back([x, y])]);
  p.hatch += marks(joints, 1);
  // posts into the water, and their reflections
  const posts: [Pt, Pt][] = [];
  const refl: [Pt, Pt][] = [];
  for (let x = x0 + 18; x <= x1 - 2; x += 44) {
    posts.push([
      [x, y + board],
      [x, y + board + 8],
    ]);
    for (let k = 0; k < 3; k++)
      refl.push([
        [x, y + board + 11 + k * 5],
        [x, y + board + 13.5 + k * 5],
      ]);
  }
  p.ink += posts.map(([a, b]) => n.line(a, b, { w: 1.3 })).join("");
  p.lines += marks(refl, 1);
  // the deck's shadow on the water
  p.hatch += n.hatch(
    [
      [x0 + 6, y + board + 1],
      [x1 + 4, y + board + 1],
      [x1 + 7, y + board + 5],
      [x0 + 12, y + board + 5],
    ],
    { angle: 0, gap: 1.6, inset: 2 },
  );
}

/**
 * An Adirondack chair seen from behind, on the deck at (x, y): the fan of
 * slats, the wide arms, the back legs, and a short shadow to the right.
 */
export function adirondack(p: Plane, x: number, y: number) {
  const n = p.nib;
  const seat = y + CHAIR.seat,
    arm = y + CHAIR.arm;
  const k = 16;
  const topEdge: Pt[] = Array.from({ length: k + 1 }, (_, i) => {
    const dx = -CHAIR.top + (2 * CHAIR.top * i) / k;
    return [x + dx, y + chairTop(dx)];
  });
  const fan: Pt[] = [
    [x - CHAIR.foot, seat],
    ...topEdge,
    [x + CHAIR.foot, seat],
  ];
  // arms: planks seen end-on from behind, receding a little
  const armL: Pt[] = [
    [x - CHAIR.armHalf, arm],
    [x - CHAIR.foot - 1, arm],
    [x - CHAIR.foot - 0.4, arm - 3],
    [x - CHAIR.armHalf + 1.5, arm - 3.4],
  ];
  const armR = armL.map(([ax, ay]) => [2 * x - ax, ay] as Pt);
  // legs: the back legs under the fan, the arm posts at the sides
  const legs: [Pt, Pt][] = [
    [
      [x - CHAIR.foot + 1, seat],
      [x - CHAIR.foot - 1.5, y],
    ],
    [
      [x + CHAIR.foot - 1, seat],
      [x + CHAIR.foot + 1.5, y],
    ],
    [
      [x - CHAIR.armHalf + 2, arm],
      [x - CHAIR.armHalf + 2, y - 2.5],
    ],
    [
      [x + CHAIR.armHalf - 2, arm],
      [x + CHAIR.armHalf - 2, y - 2.5],
    ],
  ];
  paper(p, fan);
  paper(p, armL);
  paper(p, armR);
  p.ink += n.stroke(topEdge, { w: 1.1, taper: 0.4, step: 2 });
  p.ink += n.line(fan[0], topEdge[0], { w: 1 });
  p.ink += n.line(fan[fan.length - 1], topEdge[k], { w: 1.2 });
  p.ink += n.line(fan[0], fan[fan.length - 1], { w: 0.9 });
  for (const a of [armL, armR]) p.ink += n.poly(a, { closed: true, w: 0.9 });
  for (const [a, b] of legs) p.ink += n.line(a, b, { w: 1 });
  // the gaps between the slats
  const gaps: [Pt, Pt][] = [];
  for (let i = 1; i < 5; i++) {
    const u = -1 + (2 * i) / 5;
    const bottom: Pt = [x + u * CHAIR.foot, seat - 0.5];
    const dx = u * CHAIR.top;
    gaps.push([bottom, [x + dx, y + chairTop(dx) + 0.8]]);
  }
  p.lines += marks(gaps, 1);
  // the fan's right slats a shade darker; the shadow falls right, on the deck
  p.hatch += n.hatch(
    [
      [x + CHAIR.foot * 0.45, seat - 1],
      [x + CHAIR.top * 0.5, y + chairTop(CHAIR.top * 0.5) + 1.5],
      [x + CHAIR.top - 0.8, y + chairTop(CHAIR.top) + 1.5],
      [x + CHAIR.foot - 0.8, seat - 1],
    ],
    { angle: 75, gap: 2.2, inset: 0.4 },
  );
  p.hatch += n.hatch(
    [
      [x - 6, y - 1],
      [x + 22, y - 1],
      [x + 26, y - 4],
      [x - 2, y - 4.5],
    ],
    { angle: 0, gap: 1.4, inset: 1.5 },
  );
}
