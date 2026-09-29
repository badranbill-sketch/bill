import type { Language } from "@/lib/business";
import { curve, Pen, type Pt, type StrokeOpts } from "@/lib/ink";
import { Art, Hatch, Ink, Pencil, Wash } from "./primitives";

/*
 * Two scenes about sitting down together.
 *
 * Both are built on a tiny pinhole camera (world units are centimetres, the
 * camera looks along +z with y up) so the furniture and the dock keep one
 * consistent perspective. Lines that pass behind a nearer object are cut
 * where it hides them, as a draughtsman would, so nothing reads as glass.
 * Light comes from the upper left in both: shade falls right and under.
 */

type V3 = [number, number, number];

/** Pinhole projection: eye position, focal length, and where the horizon's centre lands. */
function camera(eye: V3, f: number, cx: number, cy: number) {
  return ([x, y, z]: V3): Pt => {
    const dz = z - eye[2];
    return [cx + (f * (x - eye[0])) / dz, cy - (f * (y - eye[1])) / dz];
  };
}

/** Local → world: turn by `yaw` degrees about y, optionally mirror in x, then move to `at`. */
function place(at: V3, yaw: number, mirror = false) {
  const a = (yaw * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return ([x, y, z]: V3): V3 => {
    const X = x * c + z * s,
      Z = -x * s + z * c;
    return [at[0] + (mirror ? -X : X), at[1] + y, at[2] + Z];
  };
}

/** Points on a horizontal circle (local), for projected ellipses. */
function ring(
  cx: number,
  y: number,
  cz: number,
  r: number,
  from = 0,
  sweep = Math.PI * 2,
  n = 24,
): V3[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = from + (sweep * i) / n;
    return [cx + Math.cos(t) * r, y, cz + Math.sin(t) * r] as V3;
  });
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const num = (n: number) => String(r1(n)).replace(/^(-?)0\./, "$1.");
const lerp = (a: Pt, b: Pt, t: number): Pt => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

/** A polyline as a compact relative path, for thin stroked lines. */
function rel(q: Pt[]): string {
  return (
    `M${num(q[0][0])} ${num(q[0][1])}l` +
    q
      .slice(1)
      .map((v, i) => `${num(v[0] - q[i][0])} ${num(v[1] - q[i][1])}`)
      .join(" ")
      .replace(/ -/g, "-")
  );
}

/**
 * Shrink a filled pen outline (Pen.stroke output): keep only the points that
 * bend it by more than `tol` (a tenth of a unit is invisible at any size)
 * and write them as relative moves. Straight lines shrink the most.
 */
function compact(d: string, tol = 0.1): string {
  if (!d) return "";
  return d
    .split("M")
    .filter(Boolean)
    .map((sub) => {
      const n = sub.replace(/[LZ]/g, " ").trim().split(/\s+/).map(Number);
      const pts: Pt[] = [];
      for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
      // Simplify each side of the nib on its own, so the tips stay sharp.
      const h = Math.floor(pts.length / 2);
      const kept = [
        ...simplify(pts.slice(0, h), tol),
        ...simplify(pts.slice(h), tol),
      ];
      return rel(kept) + "z";
    })
    .join("");
}

/** Is the point inside the polygon (even-odd)? */
function inside([x, y]: Pt, poly: Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i],
      [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      hit = !hit;
  }
  return hit;
}

/** Convex hull (monotone chain), for the silhouette of a solid. */
function hull(pts: Pt[]): Pt[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: Pt[]) => {
    const h: Pt[] = [];
    for (const q of list) {
      while (h.length > 1 && cross(h[h.length - 2], h[h.length - 1], q) <= 0)
        h.pop();
      h.push(q);
    }
    h.pop();
    return h;
  };
  return [...half(p), ...half([...p].reverse())];
}

/** Keep the part of a polygon on the inside of a convex clip polygon. */
function clip(poly: Pt[], by: Pt[]): Pt[] {
  let out = poly;
  const n = by.length;
  const area = by.reduce(
    (s, a, i) => s + a[0] * by[(i + 1) % n][1] - by[(i + 1) % n][0] * a[1],
    0,
  );
  const side = (a: Pt, b: Pt, q: Pt) =>
    Math.sign(area) *
    ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]));
  for (let i = 0; i < n; i++) {
    const a = by[i],
      b = by[(i + 1) % n];
    const src = out;
    out = [];
    for (let k = 0; k < src.length; k++) {
      const p = src[k],
        q = src[(k + 1) % src.length];
      const sp = side(a, b, p),
        sq = side(a, b, q);
      if (sp >= 0) out.push(p);
      if (sp >= 0 !== sq >= 0) out.push(lerp(p, q, sp / (sp - sq)));
    }
    if (!out.length) break;
  }
  return out;
}

/** Douglas–Peucker: drop points that lie within `tol` of a straight run. */
function simplify(pts: Pt[], tol = 0.2): Pt[] {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop()!;
    const [ax, ay] = pts[i],
      [bx, by] = pts[j];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let far = -1,
      best = tol;
    for (let k = i + 1; k < j; k++) {
      const d =
        Math.abs((bx - ax) * (ay - pts[k][1]) - (ax - pts[k][0]) * (by - ay)) /
        len;
      if (d > best) {
        best = d;
        far = k;
      }
    }
    if (far > 0) {
      keep[far] = 1;
      stack.push([i, far], [far, j]);
    }
  }
  return pts.filter((_, k) => keep[k]);
}

/** The runs of a 2-D polyline that no occluder hides. */
function visible(points: Pt[], occ: Pt[][], step = 0.8): Pt[][] {
  if (!occ.length) return [points];
  const out: Pt[][] = [];
  let cur: Pt[] = [];
  const flush = () => {
    let len = 0;
    for (let i = 1; i < cur.length; i++)
      len += Math.hypot(cur[i][0] - cur[i - 1][0], cur[i][1] - cur[i - 1][1]);
    if (len > 1.5) out.push(simplify(cur));
    cur = [];
  };
  const test = (q: Pt) => {
    if (occ.some((o) => inside(q, o))) flush();
    else cur.push(q);
  };
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i],
      b = points[i + 1];
    const n = Math.max(
      1,
      Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step),
    );
    for (let k = 0; k < n; k++) test(lerp(a, b, k / n));
  }
  test(points[points.length - 1]);
  flush();
  return out;
}

/** Hatch centre lines (`M a Q c b`, Pen.hatch) as straight relative lines, cut by occluders. */
function lines(d: string, occ: Pt[][] = []): string {
  const out: string[] = [];
  for (const m of d.matchAll(
    /M(-?[\d.]+) (-?[\d.]+)Q-?[\d.]+ -?[\d.]+ (-?[\d.]+) (-?[\d.]+)/g,
  )) {
    const a: Pt = [+m[1], +m[2]],
      b: Pt = [+m[3], +m[4]];
    for (const r of visible([a, b], occ)) out.push(rel(r));
  }
  return out.join("");
}

/** Collects the marks of one drawing, grouped by how they are painted. */
class Sheet {
  ink: string[] = [];
  soft: string[] = [];
  hatch: string[] = [];
  fine: string[] = [];
  thin: string[] = [];
  /** Outlines of nearer things that hide this sheet's lines. */
  occ: Pt[][] = [];
  constructor(
    public p: Pen,
    public P: (v: V3) => Pt,
    /** Tolerance kept by `compact`. */
    public tol = 0.1,
  ) {}
  private put(d: string, soft: boolean) {
    if (d) (soft ? this.soft : this.ink).push(compact(d, this.tol));
  }
  /** A pen line through 3-D points. */
  s(pts: V3[], o: StrokeOpts = {}, soft = false) {
    this.s2(pts.map(this.P), o, soft);
  }
  /** A pen line through points already on the page. */
  s2(q: Pt[], o: StrokeOpts = {}, soft = false) {
    if (!this.occ.length) return this.put(this.p.stroke(q, o), soft);
    const c = o.smooth !== false && q.length > 2 ? curve(q, o.closed) : q;
    for (const r of visible(c, this.occ))
      this.put(this.p.stroke(r, { ...o, smooth: false, closed: false }), soft);
  }
  /** A ruled pen line between two 3-D points. */
  l(a: V3, b: V3, o: StrokeOpts = {}, soft = false) {
    const A = this.P(a),
      B = this.P(b);
    if (!this.occ.length) return this.put(this.p.line(A, B, o), soft);
    for (const r of visible([A, B], this.occ))
      this.put(
        this.p.line(r[0], r[r.length - 1], { overshoot: 0, ...o }),
        soft,
      );
  }
  /** Hatching inside a 3-D polygon (projected first). */
  h(pts: V3[], o: Parameters<Pen["hatch"]>[1] = {}, fine = false) {
    this.h2(pts.map(this.P), o, fine);
  }
  h2(q: Pt[], o: Parameters<Pen["hatch"]>[1] = {}, fine = false) {
    (fine ? this.fine : this.hatch).push(lines(this.p.hatch(q, o), this.occ));
  }
  /** A thin stroked line through 3-D points (seams, far details). */
  t(pts: V3[], fine = false) {
    this.t2(pts.map(this.P), fine);
  }
  t2(q: Pt[], fine = false) {
    for (const r of visible(q, this.occ))
      (fine ? this.fine : this.thin).push(rel(r));
  }
}

function Marks({ s }: { s: Sheet }) {
  return (
    <>
      {s.fine.length > 0 && <Hatch d={s.fine.join("")} w={0.45} soft />}
      {s.hatch.length > 0 && <Hatch d={s.hatch.join("")} w={0.5} />}
      {s.thin.length > 0 && <Hatch d={s.thin.join("")} w={0.7} />}
      {s.soft.length > 0 && <Ink d={s.soft.join("")} soft />}
      {s.ink.length > 0 && <Ink d={s.ink.join("")} />}
    </>
  );
}

/** A wash path from page points, a little loose but registered to them. */
function washPath(pen: Pen, pts: Pt[], spread = 0.7, step = 7): string {
  // Points along every edge, so the wash follows the outline instead of
  // bulging between corners.
  const dense: Pt[] = [];
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length];
    const n = Math.max(
      1,
      Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step),
    );
    for (let k = 0; k < n; k++) dense.push(lerp(a, b, k / n));
  });
  return compact(pen.blob(dense, spread), 0.25);
}

/* ------------------------------------------------------------------ */
/* Two chairs                                                          */
/* ------------------------------------------------------------------ */

/** Armchair dimensions, in local centimetres. */
const AC = {
  B: 19, // underside of the upholstery
  AT: 57, // arm top
  SI: 28, // arm inner x
  SO: 40, // arm outer x
  F: -37, // arm front z
  ST: 44, // seat top
  SB: 33, // seat cushion bottom
  SF: -40, // seat front z
  BK: 39, // rear face z
  BT: 86, // top of the back at its corners
};

/**
 * The solid parts of an armchair on the page (seat block, back block): used
 * to hide what passes behind it and to lay its wash.
 */
function armchairSolid(P: (v: V3) => Pt): Pt[][] {
  const { B, AT, SO, F, SF, SB, ST, BK, BT } = AC;
  const body: V3[] = [];
  for (const x of [-SO, SO])
    for (const z of [F, BK]) for (const y of [B, AT]) body.push([x, y, z]);
  body.push([-SO + 12, ST, SF], [SO - 12, ST, SF], [-SO + 12, SB, SF]);
  // The back follows the arm tops as they rise into it.
  const back: V3[] = [];
  for (const x of [-SO, SO])
    back.push(
      [x, AT, 12],
      [x, AT + 6, 23],
      [x, BT - 10, 30],
      [x * 0.97, BT - 3, 35],
      [x * 0.95, BT - 1, BK - 1],
      [x, AT, BK],
    );
  back.push([0, BT + 3, BK], [-20, BT + 2, BK], [20, BT + 2, BK]);
  return [hull(body.map(P)), hull(back.map(P))];
}

/**
 * A mid-century upholstered armchair on four tapered legs, in local
 * centimetres: it faces −z, and −x is the arm nearest the viewer.
 * `shadeFront` hatches the front faces (window light from the far side),
 * otherwise the near side is hatched. `cushion` leaves out the lines a
 * cushion in the far corner would hide.
 */
function armchair(s: Sheet, shadeFront: boolean, cushion = false) {
  const { B, AT, SI, SO, F, ST, SB, SF, BK, BT } = AC;
  const main = { w: 1.5 },
    sec = { w: 0.95 },
    det = { w: 0.6 };

  // Near side silhouette: arm top running back, rising into the back.
  s.s(
    [
      [-SO, AT - 3, F],
      [-SO, AT - 1.5, -10],
      [-SO, AT, 12],
      [-SO, AT + 6, 23],
      [-SO, BT - 10, 30],
      [-SO + 1, BT - 3, 35],
      [-SO + 2, BT - 1, BK - 1],
    ],
    main,
  );
  s.l([-SO, BT - 5, BK], [-SO, B + 1, BK], sec);
  // Near arm: front face with its rounded top.
  s.s(
    [
      [-SO, B, F],
      [-SO, AT - 8, F],
      [-SO + 1.5, AT - 1.5, F],
      [-34, AT + 0.5, F],
      [-SI - 1.5, AT - 1.5, F],
      [-SI, AT - 8, F],
      [-SI, SB, F],
    ],
    main,
  );
  s.s(
    [
      [-SI, AT - 2, F + 1],
      [-SI, AT - 1, 0],
      [-SI, AT, 15],
    ],
    sec,
  );
  // Far arm: front face and top.
  s.s(
    [
      [SI, ST + 1, F],
      [SI, AT - 8, F],
      [SI + 1.5, AT - 1.5, F],
      [34, AT + 0.5, F],
      [SO - 1.5, AT - 1.5, F],
      [SO, AT - 8, F],
      [SO, B, F],
    ],
    main,
  );
  s.s(
    [
      [SO, AT - 3, F + 1],
      [SO, AT - 1.5, -6],
      [SO, AT, 12],
      [SO, AT + 6, 23],
      [SO, BT - 10, 30],
      [SO - 1, BT - 3, 35],
    ],
    main,
  );
  s.s(
    [
      [SI, AT - 2, F + 1],
      [SI, AT - 1, 0],
      cushion ? [SI, AT - 0.5, 5] : [SI, AT, 15],
    ],
    det,
    true,
  );
  // Back: the rear top edge, gently arched, and the plump back cushion.
  s.s(
    [
      [-SO + 2, BT - 1, BK - 1],
      [-20, BT + 2.5, BK],
      [0, BT + 3.5, BK],
      [20, BT + 2.5, BK],
      [SO - 1, BT - 3, 36],
    ],
    main,
  );
  s.s(
    [
      [-SI, AT + 1, 16],
      [-SI + 1, 73, 22],
      [-SI + 4, 79, 24],
      [0, 81, 24],
      [SI - 4, 79, 24],
      [SI - 1, 73, 22],
      [SI, AT + 1, 16],
    ],
    sec,
  );
  // Seat cushion: front face, a welt under the top, the crease at the back.
  s.s(
    [
      [-SI, ST, SF],
      [-10, ST + 1.2, SF - 0.5],
      [10, ST + 1.2, SF - 0.5],
      [SI, ST, SF],
    ],
    main,
  );
  s.s(
    [
      [-SI + 1, SB, SF + 0.5],
      [0, SB - 0.4, SF],
      [SI - 1, SB, SF + 0.5],
    ],
    sec,
  );
  s.s(
    [
      [-SI + 2, ST - 2.2, SF - 0.2],
      [0, ST - 1.4, SF - 0.6],
      [SI - 2, ST - 2.2, SF - 0.2],
    ],
    det,
    true,
  );
  s.s(
    cushion
      ? [
          [-5, ST - 0.5, 16],
          [-SI + 6, ST + 0.5, 15],
        ]
      : [
          [SI - 7, ST + 0.3, 15.5],
          [0, ST - 0.4, 16],
          [-SI + 11, ST + 0.3, 15.5],
        ],
    det,
    true,
  );
  // Underside: front and near side.
  s.l([-SO, B, F], [SO, B, F], sec);
  s.l([-SO, B, F], [-SO, B, BK], sec);
  // Tapered legs, splayed a little.
  const leg = (x: number, z: number, sx: number, sz: number) => {
    s.l([x - 1.6, B, z], [x + sx - 0.6, 0, z + sz], { w: 0.95, taper: 0.5 });
    s.l([x + 1.6, B, z], [x + sx + 0.6, 0, z + sz], { w: 0.7, taper: 0.5 });
  };
  leg(-34, -32, -3, -3);
  leg(34, -32, 3, -3);
  leg(-34, 33, -3, 3);

  // Shade: one hatch direction for every face turned from the window.
  const shade = { angle: 68, gap: 3.2 };
  if (shadeFront) {
    for (const q of [
      [
        [-SI, SB - 1, SF],
        [SI, SB - 1, SF],
        [SI, B, F],
        [-SI, B, F],
      ],
      [
        [-SO, B, F],
        [-SI, B, F],
        [-SI, AT - 5, F],
        [-SO, AT - 5, F],
      ],
      [
        [SI, B, F],
        [SO, B, F],
        [SO, AT - 5, F],
        [SI, AT - 5, F],
      ],
    ] as V3[][])
      s.h(q, shade);
    s.h(
      [
        [-SI + 1, ST - 3, SF],
        [SI - 1, ST - 3, SF],
        [SI - 1, SB + 1, SF],
        [-SI + 1, SB + 1, SF],
      ],
      { angle: 68, gap: 4 },
      true,
    );
  } else {
    s.h(
      [
        [-SO, B + 1, F + 1],
        [-SO, AT - 4, F + 1],
        [-SO, AT - 1, 12],
        [-SO, BT - 11, 30],
        [-SO, BT - 7, BK - 1],
        [-SO, B + 1, BK - 1],
      ],
      shade,
    );
  }
}

/** Where the room's furniture stands, in world centimetres. */
const ROOM = {
  eye: [0, 172, -420] as V3,
  f: 740,
  cx: 380,
  cy: 112,
  wall: 150,
  chairL: { at: [-104, 0, 4] as V3, yaw: -56 },
  chairR: { at: [106, 0, 12] as V3, yaw: -56 },
  table: [0, 0, -52] as V3,
  lamp: [232, 0, 104] as V3,
};

export function TwoChairs(props: { lang?: Language }) {
  // Nothing in this room is written, so both languages draw the same.
  void props;
  const P = camera(ROOM.eye, ROOM.f, ROOM.cx, ROOM.cy);
  const W = ROOM.wall;

  // Chairs and table first: they hide what stands behind them.
  const atL = place(ROOM.chairL.at, ROOM.chairL.yaw),
    atR = place(ROOM.chairR.at, ROOM.chairR.yaw, true);
  const PL = (v: V3) => P(atL(v)),
    PR = (v: V3) => P(atR(v));
  const solidL = armchairSolid(PL),
    solidR = armchairSolid(PR);
  const T = ROOM.table;
  const TR = 42,
    TY = 46;
  const tableSolid: Pt[][] = [
    hull(ring(T[0], TY, T[2], TR, 0, Math.PI * 2, 24).map(P)),
    hull(
      (
        [
          [T[0] - 4, TY - 3, T[2]],
          [T[0] + 4, TY - 3, T[2]],
          [T[0] + 4, 2, T[2]],
          [T[0] - 4, 2, T[2]],
        ] as V3[]
      ).map(P),
    ),
    hull(ring(T[0], 2, T[2], 21, 0, Math.PI * 2, 16).map(P)),
  ];

  // The back wall: window, curtain and shelves.
  const room = new Sheet(new Pen(412), P);
  const wx0 = -236,
    wx1 = -126,
    wy0 = 90,
    wy1 = 228,
    mid = (wx0 + wx1) / 2,
    tr = 190;
  room.l([wx0, wy0, W], [wx0, wy1, W], { w: 1.3 });
  room.l([wx0, wy1, W], [wx1, wy1, W], { w: 1.3 });
  room.l([wx1, wy1, W], [wx1, wy0, W], { w: 1.3 });
  room.l([mid, wy1 - 1, W], [mid, wy0 + 1, W], { w: 0.9 });
  room.l([wx0 + 1, tr, W], [wx1 - 1, tr, W], { w: 0.8 });
  // Sill, deeper than the wall, with its shadow line.
  room.l([wx0 - 8, wy0, W - 8], [wx1 + 8, wy0, W - 8], { w: 1.4 });
  room.l([wx0 - 7, wy0 - 3.5, W - 8], [wx1 + 7, wy0 - 3.5, W - 8], det());
  // Glass: two strokes of reflected light, and the far shore beyond.
  for (const [x, y, k] of [
    [wx1 - 26, 168, 18],
    [wx1 - 18, 164, 11],
  ] as const)
    room.l([x, y, W], [x + k * 0.55, y - k, W], { w: 0.5, taper: 0.9 }, true);
  // One low far hill, broken by the mullion.
  const hill = (x: number) =>
    112 +
    3 * ((x - wx0) / (wx1 - wx0)) +
    7 * Math.exp(-(((x + 158) / 26) ** 2));
  for (const [a, b] of [
    [wx0 + 3, mid - 3],
    [mid + 3, wx1 - 3],
  ])
    room.t(
      Array.from({ length: 9 }, (_, i) => {
        const x = a + ((b - a) * i) / 8;
        return [x, hill(x), W] as V3;
      }),
    );
  // Curtain rod and one panel, hanging in two soft folds.
  const rod = wy1 + 10;
  room.l([wx0 - 36, rod, W - 4], [wx1 + 16, rod, W - 4], { w: 0.9 });
  const cx0 = wx0 - 32,
    cx1 = wx0 - 6,
    hem = 22;
  room.s(
    [
      [cx0, rod - 1, W - 6],
      [cx0 - 0.5, 150, W - 7],
      [cx0 - 1.5, hem, W - 9],
    ],
    { w: 0.95 },
  );
  room.s(
    [
      [cx1, rod - 1, W - 6],
      [cx1 - 2.5, 170, W - 7],
      [cx1 - 1, 90, W - 8],
      [cx1 + 1.5, hem, W - 9],
    ],
    { w: 0.95 },
  );
  room.s(
    [
      [cx0 - 1.5, hem, W - 9],
      [cx0 + 8, hem + 1.2, W - 9],
      [cx0 + 16, hem - 0.6, W - 9],
      [cx1 + 1.5, hem, W - 9],
    ],
    det(),
  );
  for (const [x, sway] of [
    [cx0 + 9, 1.2],
    [cx0 + 17, -1],
  ] as const)
    room.s(
      [
        [x, rod - 3, W - 6],
        [x + sway, 160, W - 7],
        [x - sway * 0.5, hem + 8, W - 9],
      ],
      det(),
      true,
    );
  room.h(
    [
      [cx0 + 17, rod - 4, W - 6],
      [cx1 - 1.5, rod - 4, W - 6],
      [cx1 - 1, 90, W - 8],
      [cx1 + 1, hem + 2, W - 9],
      [cx0 + 17, hem + 2, W - 9],
    ],
    { angle: 80, gap: 3.4 },
    true,
  );

  // Two plain wall shelves with books, drawn lightly.
  const bx0 = 60,
    bx1 = 180,
    bd = 22;
  const shelf = (y: number) => {
    room.l([bx0, y, W - bd], [bx1, y, W - bd], { w: 1 });
    room.l([bx0, y - 2.5, W - bd], [bx1, y - 2.5, W - bd], det());
    room.l([bx0, y, W - bd], [bx0, y, W], det());
    room.l([bx1, y - 2.5, W - bd], [bx1, y, W - bd], det());
  };
  const books = (y: number, x0: number, n: number, seed: number) => {
    const q = new Pen(seed);
    let x = x0;
    const z = W - 8;
    for (let i = 0; i < n; i++) {
      const bw = q.rand(3.2, 5.4),
        bh = q.rand(21, 27);
      room.l([x, y, z], [x, y + bh, z], det(0.55));
      room.l([x, y + bh, z], [x + bw, y + bh, z], det(0.55));
      x += bw;
    }
    room.l([x, y, z], [x, y + 22, z], det(0.55));
    // The last book leans on the others.
    room.l([x + 1, y, z], [x + 9, y + 20, z], det(0.55));
    room.l([x + 9, y + 20, z], [x + 12.5, y + 18.6, z], det(0.55));
    room.l([x + 12.5, y + 18.6, z], [x + 5, y, z], det(0.55));
  };
  shelf(168);
  books(168, bx0 + 8, 8, 3);
  shelf(126);
  books(126, bx0 + 52, 5, 5);
  // A short stack lying flat.
  for (let i = 0; i < 3; i++)
    room.l(
      [bx0 + 12 + i * 0.8, 126 + 4 * (i + 1), W - 8],
      [bx0 + 36 - i * 1.2, 126 + 4 * (i + 1), W - 8],
      det(0.55),
    );
  room.l([bx0 + 12, 126, W - 8], [bx0 + 12, 138, W - 8], det(0.55));
  room.l([bx0 + 36, 126, W - 8], [bx0 + 36, 134, W - 8], det(0.55));

  const L = ROOM.lamp;
  // Two faint pencil marks where the floor meets the wall, either side.
  const pencil = [
    room.p.pencil(P([-268, 0, W]), P([-212, 0, W]), 3),
    room.p.pencil(P([222, 0, W]), P([284, 0, W]), 3),
  ].join("");

  // Floor lamp standing in the corner right of the chairs.
  const lamp = new Sheet(new Pen(77), P);
  lamp.l([L[0], 2, L[2]], [L[0], 127, L[2]], { w: 1 });
  lamp.s(ring(L[0], 1.5, L[2], 13, 0.3, Math.PI * 2.1, 16), { w: 0.95 });
  lamp.s(
    [
      [L[0] - 19, 127, L[2]],
      [L[0] - 13, 154, L[2]],
    ],
    { w: 1.3 },
  );
  lamp.s(
    [
      [L[0] + 19, 127, L[2]],
      [L[0] + 13, 154, L[2]],
    ],
    { w: 1.3 },
  );
  lamp.s(ring(L[0], 154, L[2], 13, 0.2, Math.PI * 2.08, 18), { w: 0.9 });
  lamp.s(ring(L[0], 127, L[2], 19, Math.PI * 1.02, Math.PI * 0.96, 16), {
    w: 1.3,
  });
  lamp.h(
    [
      [L[0] + 5, 128, L[2] - 19],
      [L[0] + 19, 127.5, L[2]],
      [L[0] + 13, 153.5, L[2]],
      [L[0] + 4, 153.5, L[2] - 12],
    ],
    { angle: 76, gap: 3 },
    true,
  );

  // Chairs.
  const cL = new Sheet(new Pen(21), PL);
  armchair(cL, true);
  const cR = new Sheet(new Pen(34), PR);
  armchair(cR, false, true);
  // A cushion tucked in the right chair's inner corner: the two chairs are
  // the same model, this is what makes one of them lived in.
  const pillow = (u: number, v: number): V3 => [
    23 - u * 26 - v * 1.5,
    46 + v * 25 + Math.sin(u * Math.PI) * 1.5,
    8 + v * 11,
  ];
  const pillowRim: V3[] = [
    pillow(0.04, 0.02),
    pillow(0.5, -0.06),
    pillow(0.96, 0.03),
    pillow(1.04, 0.5),
    pillow(0.95, 0.97),
    pillow(0.5, 1.07),
    pillow(0.05, 0.98),
    pillow(-0.04, 0.5),
  ];
  cR.s(pillowRim, { w: 0.95, closed: true });
  cR.s([pillow(0.2, 0.22), pillow(0.34, 0.36)], { w: 0.55 }, true);

  // Shadows on the floor, thrown right and forward, away from the window.
  const floor = new Sheet(new Pen(88), P);
  floor.occ = [...solidL, ...solidR, ...tableSolid];
  // A soft oval pool under each chair, not a hatched box.
  const cast = (at: (v: V3) => V3): V3[] => {
    const [x, , z] = at([0, 0, 2]);
    return ring(x + 12, 0, z - 10, 46, 0, Math.PI * 2, 20);
  };
  const floorShade = { angle: 7, gap: 3.2 };
  floor.h(cast(atL), floorShade, true);
  floor.h(cast(atR), floorShade, true);
  floor.occ = [...solidL, ...solidR, tableSolid[0], tableSolid[1]];
  floor.h(
    ring(T[0] + 9, 0, T[2] - 7, 25, 0, Math.PI * 2, 14),
    floorShade,
    true,
  );

  // A low round pedestal table, cups on saucers.
  const tb = new Sheet(new Pen(58), P);
  tb.s(ring(T[0], TY, T[2], TR, 0.4, Math.PI * 2.08, 30), { w: 1.5 });
  tb.s(ring(T[0], TY - 3, T[2], TR, Math.PI * 1.02, Math.PI * 0.96, 16), {
    w: 0.95,
  });
  // The column shows only below the front rim of the top.
  const rimY = P([T[0], TY - 3, T[2] - TR])[1];
  const colTop =
    ROOM.eye[1] - ((rimY - ROOM.cy) * (T[2] - ROOM.eye[2])) / ROOM.f - 1;
  tb.l([T[0] - 3, colTop, T[2]], [T[0] - 3.5, 3, T[2]], { w: 1.3 });
  tb.l([T[0] + 3, colTop, T[2]], [T[0] + 3.5, 3, T[2]], { w: 0.95 });
  tb.s(ring(T[0], 2, T[2], 21, 0.2, Math.PI * 2.08, 18), { w: 1.3 });
  tb.s(
    ring(T[0], 0, T[2], 21, Math.PI * 1.06, Math.PI * 0.88, 12),
    { w: 0.6 },
    true,
  );
  tb.h(
    [
      [T[0] + 0.5, colTop, T[2]],
      [T[0] + 3.2, colTop, T[2]],
      [T[0] + 3.2, 3, T[2]],
      [T[0] + 0.5, 3, T[2]],
    ],
    { angle: 80, gap: 2.8, inset: 1 },
  );
  const cup = (x: number, z: number, handle: number) => {
    tb.s(ring(x, TY + 0.4, z, 11, 0.3, Math.PI * 2.08, 18), { w: 0.8 });
    tb.s(ring(x, TY + 9, z, 6.4, 0, Math.PI * 2.1, 16), { w: 0.95 });
    tb.s(
      [
        [x - 6.4, TY + 9, z],
        [x - 6, TY + 3.6, z],
        [x - 3, TY + 1, z],
        [x + 3, TY + 1, z],
        [x + 6, TY + 3.6, z],
        [x + 6.4, TY + 9, z],
      ],
      { w: 1 },
    );
    tb.s(
      [
        [x + handle * 6.2, TY + 7.6, z],
        [x + handle * 10, TY + 7, z],
        [x + handle * 9.6, TY + 4.2, z],
        [x + handle * 5.8, TY + 3.4, z],
      ],
      { w: 0.7 },
    );
  };
  cup(T[0] - 24, T[2] + 10, -1);
  cup(T[0] + 25, T[2] + 14, 1);
  // Open notebook, turned a little, with a pen across it.
  const nb = (u: number, v: number, lift = 0): V3 => {
    const a = (-12 * Math.PI) / 180;
    return [
      T[0] + 1 + u * Math.cos(a) - v * Math.sin(a),
      TY + 0.6 + lift,
      T[2] - 12 + u * Math.sin(a) + v * Math.cos(a),
    ];
  };
  const NW = 20,
    NH = 13.5;
  for (const v of [-NH, NH]) {
    tb.s([nb(-NW, v), nb(-9, v - 0.4, 0.9), nb(-1, v, 1.3), nb(0, v)], {
      w: v < 0 ? 1 : 0.8,
    });
    tb.s([nb(0, v), nb(1, v, 1.3), nb(9, v - 0.4, 0.9), nb(NW, v)], {
      w: v < 0 ? 1 : 0.8,
    });
  }
  tb.l(nb(-NW, -NH), nb(-NW, NH), { w: 0.8 });
  tb.l(nb(NW, -NH), nb(NW, NH), { w: 0.8 });
  tb.l(nb(0, -NH), nb(0, NH), { w: 0.55 }, true);
  for (let i = 0; i < 5; i++) {
    const v = -9 + i * 4.4;
    tb.t([nb(-17, v, 0.9), nb(-4 - (i % 3) * 3, v, 1.1)], true);
    if (i < 3) tb.t([nb(4, v, 1.1), nb(15 - i * 3, v, 0.9)], true);
  }
  tb.l(nb(5, 11, 1.6), nb(24, -4, 1.6), { w: 0.95, taper: 0.5 });

  // Washes: blue-grey for the fabric and the glass, stone for the wood and
  // the cushion, brass for the coffee and the lamplight.
  const wp = new Pen(903);
  const glass = (x0: number, x1: number, y0: number, y1: number) =>
    washPath(
      wp,
      (
        [
          [x0, y0, W],
          [x1, y0, W],
          [x1, y1, W],
          [x0, y1, W],
        ] as V3[]
      ).map(P),
      0.8,
    );
  const blue = [...solidL, ...solidR].map((q) => washPath(wp, q)).join("");
  const panes =
    glass(wx0 + 2.5, mid - 2.5, wy0 + 3, tr - 2.5) +
    glass(mid + 2.5, wx1 - 2.5, wy0 + 3, tr - 2.5) +
    glass(wx0 + 2.5, mid - 2.5, tr + 2.5, wy1 - 2.5) +
    glass(mid + 2.5, wx1 - 2.5, tr + 2.5, wy1 - 2.5);
  const stone =
    washPath(wp, ring(T[0], TY, T[2], TR - 3, 0, Math.PI * 2, 14).map(P), 1.5) +
    washPath(
      wp,
      pillowRim.map((v) => P(atR(v))),
      0.8,
    );
  const brass =
    [
      [T[0] - 24, T[2] + 10],
      [T[0] + 25, T[2] + 14],
    ]
      .map(([x, z]) =>
        washPath(wp, ring(x, TY + 8.6, z, 5.2, 0, Math.PI * 2, 8).map(P), 0.6),
      )
      .join("") +
    washPath(
      wp,
      (
        [
          [L[0] - 17, 128, L[2]],
          [L[0] + 17, 128, L[2]],
          [L[0] + 12, 152, L[2]],
          [L[0] - 12, 152, L[2]],
        ] as V3[]
      ).map(P),
      0.8,
    );
  return (
    <Art w={760} h={520}>
      <Wash d={panes} tone="blue" strength={0.35} />
      <Wash d={blue} tone="blue" strength={0.4} />
      <Wash d={stone} tone="stone" strength={0.55} />
      <Wash d={brass} tone="brass" strength={0.55} />
      <Pencil d={pencil} />
      <Marks s={floor} />
      <Marks s={room} />
      <Marks s={lamp} />
      <Marks s={cL} />
      <Marks s={cR} />
      <Marks s={tb} />
    </Art>
  );
}

/** Detail weight. */
function det(w = 0.6): StrokeOpts {
  return { w, taper: 0.7 };
}

/* ------------------------------------------------------------------ */
/* The dock                                                            */
/* ------------------------------------------------------------------ */

/**
 * An Adirondack chair in local centimetres, standing on y = 0 and facing +z
 * (away from the viewer, toward the lake): five fanned back slats under an
 * arched top, three rails across their backs (the middle one carries the
 * arms), wide flat arms, front legs and the side runners. We see it from
 * behind, so the back hides the rest. Returns its solid outline on the page.
 */
function adirondack(s: Sheet): Pt[][] {
  const Y0 = 18; // bottom of the slats, at the back of the seat
  const zAt = (y: number) => 2 - (y - Y0) * 0.34; // the back reclines
  const topAt = (x: number) => 99 - 12 * (x / 26) ** 2;
  // Point on slat i (−2…2): u across (−1…1), v up (0…1, 1 = the arch).
  const slat = (i: number, u: number, v: number): V3 => {
    const x = i * (9.4 + 3.2 * v) + u * 4.1;
    const y = Y0 + v * (topAt(x) - Y0);
    return [x, y, zAt(y)];
  };
  const P = s.P;
  const fan: Pt[] = [
    ...[0, 0.5, 0.97].map((v) => P(slat(-2, -1, v))),
    ...[-2, -1, 0, 1, 2].flatMap((i) =>
      [-0.9, 0.9].map((u) => P(slat(i, u, 1))),
    ),
    ...[0.97, 0.5, 0].map((v) => P(slat(2, 1, v))),
  ];
  // Rails across the back of the slats, a little nearer to us.
  const rail = (y0: number, y1: number, hw: number): V3[] => [
    [-hw, y0, zAt(y0) - 2.6],
    [hw, y0, zAt(y0) - 2.6],
    [hw, y1, zAt(y1) - 2.6],
    [-hw, y1, zAt(y1) - 2.6],
  ];
  const rails = [
    rail(Y0 - 2, Y0 + 6, 23),
    rail(55, 60.5, 41),
    rail(80, 86, 27),
  ];
  const railPoly = rails.map((r) => r.map(P));
  // Arms: flat boards resting on the middle rail, wider at the front.
  const AY = 62.5;
  const arm = (sd: number): V3[] =>
    (
      [
        [23, -13],
        [40, -13],
        [44, 50],
        [43, 57],
        [38.5, 61],
        [30, 61],
        [25.5, 57],
        [24.5, 50],
      ] as [number, number][]
    ).map(([x, z]) => [x * sd, AY, z]);
  const arms = [arm(-1), arm(1)];

  // Slats in shade (the sun is in front of the chair), cut by the rails.
  s.occ = railPoly;
  for (let i = -2; i <= 2; i++) {
    s.s(
      [
        slat(i, -1, 0),
        slat(i, -1, 0.5),
        slat(i, -1, 0.94),
        slat(i, -0.7, 1),
        slat(i, 0, 1.006),
        slat(i, 0.7, 1),
        slat(i, 1, 0.94),
        slat(i, 1, 0.5),
        slat(i, 1, 0),
      ],
      { w: 1.3, taper: 0.5 },
    );
    s.h(
      [
        slat(i, -0.72, 0.02),
        slat(i, 0.72, 0.02),
        slat(i, 0.72, 0.9),
        slat(i, -0.72, 0.9),
      ],
      { angle: 64, gap: 2.8, inset: 0.6 },
    );
  }
  s.occ = [];
  for (const r of rails) {
    s.l(r[0], r[1], { w: 1 });
    s.l(r[3], r[2], { w: 1 });
    s.l(r[0], r[3], det(0.7));
    s.l(r[1], r[2], det(0.7));
  }
  // Arms, legs and runners: only what the back leaves in view.
  s.occ = [fan, ...railPoly];
  for (const a of arms) s.s([...a, a[0]], { w: 1, smooth: false });
  s.occ = [fan, ...railPoly, ...arms.map((a) => a.map(P))];
  for (const sd of [-1, 1]) {
    // Front leg under the arm's end: a board in shade.
    s.l([33 * sd, AY - 2, 52], [33 * sd, 0, 52], { w: 1 });
    s.l([38 * sd, AY - 2, 52], [38 * sd, 0.5, 52], det(0.75));
    s.h(
      [
        [33.6 * sd, AY - 3, 52],
        [37.4 * sd, AY - 3, 52],
        [37.4 * sd, 1, 52],
        [33.6 * sd, 1, 52],
      ],
      { angle: 80, gap: 2.8, inset: 0.4 },
      true,
    );
    // Runner: its foot at the back; the rest runs under the seat.
    s.l([27 * sd, 0, -6], [27 * sd, 8, 16], { w: 1 });
    s.l([27 * sd, 12, -7], [27 * sd, 19, 14], det(0.75));
    s.l([27 * sd, 0, -6], [27 * sd, 12, -7], det(0.75));
  }
  s.occ = [];
  return [fan, ...railPoly, ...arms.map((a) => a.map(P))];
}

/** The lake scene: camera, and the dock in plan (start, heading, extent). */
const LAKE = {
  eye: [0, 190, 0] as V3,
  f: 1250,
  cx: 600,
  cy: 185,
  deck: 48,
  from: [-380, 860] as [number, number],
  heading: 50,
  start: 160,
  length: 600,
  half: 110,
};

/** A point on the dock: `u` along it, `v` across (negative = the side facing us). */
function dockPt(u: number, y: number, v: number): V3 {
  const a = (LAKE.heading * Math.PI) / 180,
    s = Math.sin(a),
    c = Math.cos(a);
  return [LAKE.from[0] + u * s - v * c, y, LAKE.from[1] + u * c + v * s];
}

/** A smooth open curve as page points. */
const bend = (points: Pt[]) => curve(points, false, 8);

/** Height of a polyline at x (the polyline runs left to right). */
function heightAt(line: Pt[], x: number): number {
  for (let i = 1; i < line.length; i++)
    if (line[i][0] >= x) {
      const [ax, ay] = line[i - 1],
        [bx, by] = line[i];
      return ay + ((by - ay) * (x - ax)) / (bx - ax || 1);
    }
  return line[line.length - 1][1];
}

/**
 * A far treeline: one even silhouette of small spruce spires between x0 and
 * x1, `width` apart, standing on `base(x)`, `tall(x)` high (each within
 * ±13%). Each spire is narrow at the top and full at the skirt; neighbours
 * overlap, so the valleys sit about halfway up, and the silhouette is the
 * upper edge of them all.
 */
function treeline(
  q: Pen,
  x0: number,
  x1: number,
  base: (x: number) => number,
  tall: (x: number) => number,
  width: [number, number],
) {
  const spires: [number, number, number][] = [];
  for (let x = x0; x < x1;) {
    const s = q.rand(width[0], width[1]);
    spires.push([x, s * 2.4, tall(x) * q.rand(0.87, 1.13)]);
    x += s;
  }
  const edge: Pt[] = [];
  for (let x = x0; x <= x1; x += 0.5) {
    let y = base(x);
    for (const [c, w, h] of spires) {
      const d = Math.abs(x - c) / (w / 2);
      if (d < 1) y = Math.min(y, base(c) - h * (1 - d ** (1 / 1.5)));
    }
    edge.push([x, y]);
  }
  return { top: simplify(edge, 0.18), spires };
}

export function Dock(props: { lang?: Language }) {
  // Nothing here is written, so both languages draw the same.
  void props;
  const P = camera(LAKE.eye, LAKE.f, LAKE.cx, LAKE.cy);
  const { deck: D, start: U, length: L, half: H } = LAKE;
  const fz = D - 16; // bottom of the fascia board
  const flat = (v: V3): Pt => [v[0], v[1]];

  // Chairs near the end, facing the lake, turned a little toward each other.
  const atL = place(dockPt(400, D, -62), 8),
    atR = place(dockPt(548, D, -40), -5);
  const cL = new Sheet(new Pen(301), (v) => P(atL(v)), 0.12);
  const cR = new Sheet(new Pen(302), (v) => P(atR(v)), 0.12);
  const solid = [...adirondack(cL), ...adirondack(cR)];

  // The deck: edges, the fascia on the near side, plank seams.
  const dock = new Sheet(new Pen(1201), P, 0.12);
  const deckPoly: Pt[] = [
    P(dockPt(U, D, -H)),
    P(dockPt(L, D, -H)),
    P(dockPt(L, D, H)),
    P(dockPt(U, D, H)),
  ];
  dock.occ = solid;
  dock.l(dockPt(U, D, -H), dockPt(L, D, -H), { w: 1.5 });
  dock.l(dockPt(U, D, H), dockPt(L, D, H), { w: 0.95 });
  dock.l(dockPt(L, D, -H), dockPt(L, D, H), { w: 1.3 });
  dock.l(dockPt(U, D, -H), dockPt(U, D, H), { w: 0.9 });
  dock.l(dockPt(U + 30, fz, -H), dockPt(L, fz, -H), { w: 0.95 });
  dock.l(dockPt(L, D, -H), dockPt(L, fz, -H), { w: 1 });
  for (let u = U + 14; u < L - 5; u += 14)
    dock.t([dockPt(u, D, -H + 1.5), dockPt(u, D, H - 1.5)], true);
  // Fascia in shade: even hatch.
  dock.occ = [];
  dock.h(
    [
      dockPt(U + 30, D - 1, -H),
      dockPt(L, D - 1, -H),
      dockPt(L, fz + 1, -H),
      dockPt(U + 30, fz + 1, -H),
    ],
    { angle: 64, gap: 3.2 },
  );
  // Posts along the near side; the last one tall, a mooring post.
  const posts = [306, 414, 522, L - 6];
  const postPoly: Pt[][] = [];
  for (const u of posts) {
    const tall = u === L - 6;
    const c = dockPt(u, 0, -H - (tall ? 8 : 0));
    const top = tall ? D + 24 : fz;
    const hw = tall ? 8 : 6.5;
    postPoly.push(
      [
        P([c[0] - hw, top, c[2]]),
        P([c[0] + hw, top, c[2]]),
        P([c[0] + hw, 0, c[2]]),
        P([c[0] - hw, 0, c[2]]),
      ].map(([x, y]) => [x, y] as Pt),
    );
    dock.l([c[0] - hw, top, c[2]], [c[0] - hw, 0, c[2]], { w: 1.3 });
    dock.l([c[0] + hw, top, c[2]], [c[0] + hw, 1, c[2]], { w: 0.8 });
    if (tall) {
      dock.s(ring(c[0], top, c[2], hw, 0, Math.PI * 2.1, 14), { w: 0.9 });
      dock.h(
        [
          [c[0] + 1, top - 1, c[2]],
          [c[0] + hw - 1, top - 1, c[2]],
          [c[0] + hw - 1, 1, c[2]],
          [c[0] + 1, 1, c[2]],
        ],
        { angle: 80, gap: 2.8, inset: 1 },
      );
    }
    dock.s(
      ring(c[0], 0, c[2], hw + 7, Math.PI * 1.1, Math.PI * 0.8, 10),
      det(0.55),
      true,
    );
  }
  // The bank slopes down under the first metres of the dock; beyond it,
  // the dark space under the deck, cross-hatched only where it is deepest.
  dock.occ = postPoly;
  const wet = U + 130;
  dock.s(
    [dockPt(U, D, -H), dockPt(U + 30, fz - 2, -H), dockPt(wet, 0, -H)],
    det(0.85),
  );
  dock.h(
    [
      dockPt(U + 34, fz - 1, -H),
      dockPt(L, fz - 1, -H),
      dockPt(L, 1, -H),
      dockPt(wet + 4, 1, -H),
    ],
    { angle: 64, gap: 2.8, inset: 1 },
    true,
  );
  dock.h(
    [
      dockPt(U + 40, fz - 1, -H),
      dockPt(L, fz - 1, -H),
      dockPt(L, fz - 12, -H),
      dockPt(U + 70, fz - 12, -H),
    ],
    { angle: -28, gap: 3, inset: 1 },
  );
  dock.l(dockPt(wet, 0, -H), dockPt(L, 0, -H), { w: 0.6 }, true);
  // Its reflection: broken strokes under the waterline, posts as dashes.
  const rq = new Pen(57);
  dock.occ = [];
  for (let k = 0; k < 4; k++) {
    const y = -3 - k * 5;
    for (let u = wet + 10 + rq.rand(0, 20); u < L - 10; u += rq.rand(26, 44)) {
      const len = rq.rand(12, 26) * (1 - k * 0.18);
      dock.t([dockPt(u, y, -H - 4), dockPt(u + len, y, -H - 4)], k > 1);
    }
  }
  for (const u of posts) {
    const c = dockPt(u, 0, -H - (u === L - 6 ? 8 : 0));
    for (const [y0, y1] of [
      [-3, -11],
      [-15, -20],
    ])
      dock.t(
        [
          [c[0] - 2, y0, c[2]],
          [c[0] - 2, y1, c[2]],
        ],
        y0 < -10,
      );
  }

  // Chair shadows on the deck, thrown toward us and a little to the right.
  const shade = new Sheet(new Pen(303), P, 0.12);
  shade.occ = solid;
  const cast = (at: (v: V3) => V3): Pt[] => {
    const sh = (v: V3): Pt => {
      const [X, Y, Z] = at(v);
      return P([X + (Y - D) * 0.3, D, Z - (Y - D) * 0.42]);
    };
    const pts: V3[] = [
      [-30, 0, -4],
      [30, 0, -4],
      [-30, 0, 55],
      [30, 0, 55],
      [-26, 97, -21],
      [26, 97, -21],
      [0, 98, -22],
      [-43, 60, 55],
      [43, 60, 55],
      [-38, 60, -10],
      [38, 60, -10],
    ];
    return clip(hull(pts.map(sh)), deckPoly);
  };
  for (const at of [atL, atR])
    shade.h2(cast(at), { angle: 14, gap: 2.8, inset: 0.8 }, true);

  // The near bank where the dock begins: grass edge, waterline, two stones.
  const bank = new Sheet(new Pen(420), flat, 0.12);
  const root = P(dockPt(U, D, H));
  const bankTop: Pt[] = [
    [40, 381],
    [110, 372],
    [170, 362],
    [root[0] - 1, root[1] + 2],
  ];
  const bankFoot: Pt[] = [
    [60, 420],
    [150, 417],
    [236, 416],
    lerp(P(dockPt(U + 30, fz - 2, -H)), P(dockPt(wet, 0, -H)), 0.12),
  ];
  bank.s2(bankTop, { w: 1, taper: 0.8 });
  bank.t2(bankFoot, true);
  const gq = new Pen(421);
  for (let x = 58; x < root[0] - 6; x += gq.rand(9, 16)) {
    const y = heightAt(bend(bankTop), x);
    for (let k = -1; k <= 1; k++)
      bank.t2([
        [x + k * 1.2, y + 0.5],
        [x + k * gq.rand(1.8, 3), y - gq.rand(4, 7)],
      ]);
  }
  const stone = (x: number, y: number, rx: number, ry: number) => {
    bank.s2(
      Array.from({ length: 9 }, (_, i) => {
        const a = Math.PI * (1 + i / 8);
        return [x + Math.cos(a) * rx, y + Math.sin(a) * ry] as Pt;
      }),
      { w: 0.95, taper: 0.6 },
    );
    bank.h2(
      [
        [x + rx * 0.1, y - ry * 0.85],
        [x + rx * 0.95, y - 0.5],
        [x - rx * 0.1, y - 0.5],
      ],
      { angle: 62, gap: 2.8, inset: 0.4 },
    );
  };
  stone(262, 414, 11, 7);
  stone(238, 416, 6.5, 4.5);

  // Far shore: hills, a low sun, one even treeline and a wooded point.
  const far = new Sheet(new Pen(640), flat, 0.12);
  const shoreY = LAKE.cy + 5;
  const hillA = bend([
    [78, 184],
    [180, 166],
    [300, 153],
    [420, 160],
    [560, 182],
  ]);
  const hillB = bend([
    [440, 176],
    [620, 150],
    [800, 139],
    [960, 150],
    [1130, 177],
  ]).filter(([x, y]) => x > 560 || y < heightAt(hillA, x) - 0.5);
  const sun: Pt = [316, 147],
    sr = 8;
  // Only the part above the hill shows.
  const disc = Array.from({ length: 21 }, (_, i) => {
    const a = Math.PI * (0.75 + (1.5 * i) / 20);
    return [sun[0] + Math.cos(a) * sr, sun[1] + Math.sin(a) * sr] as Pt;
  }).filter(([x, y]) => y < heightAt(hillA, x) - 0.6);
  far.t2(disc);
  // Thin streaks of cloud.
  const sky = new Sheet(new Pen(643), flat, 0.12);
  const streak = { w: 0.55, taper: 0.95 };
  sky.s2(
    [
      [196, 122],
      [290, 120.5],
      [372, 121.5],
    ],
    streak,
    true,
  );
  sky.s2(
    [
      [238, 128],
      [300, 127.2],
    ],
    streak,
    true,
  );
  sky.s2(
    [
      [826, 98],
      [930, 96.5],
      [1010, 97.5],
    ],
    streak,
    true,
  );
  const tq = new Pen(641);
  const ramp = (a: number, b: number, x: number) =>
    Math.min(1, Math.max(0, (x - a) / (b - a)));
  const mainBase = () => shoreY;
  const main = treeline(
    tq,
    150,
    935,
    mainBase,
    (x) =>
      (12 + 4 * Math.sin(x / 170 + 0.9) ** 2 + 2 * Math.sin(x / 57) ** 2) *
      (0.45 + 0.55 * ramp(150, 290, x)) *
      (1 - 0.3 * ramp(880, 935, x)),
    [4.2, 5.4],
  );
  const pointY = (x: number) => 203 + (x - 905) * 0.018;
  const point = treeline(
    tq,
    905,
    1140,
    pointY,
    (x) => 14 + 15 * Math.min(1, (x - 905) / 90, (1140 - x) / 75),
    [5.6, 7],
  );
  far.hatch.push(rel(main.top));
  far.t2(point.top);
  // Faint pencil where the shore runs on past the trees.
  const pencil = [
    far.p.pencil([96, shoreY + 0.4], [148, shoreY + 0.4], 3),
    far.p.pencil([1142, pointY(1140) + 0.4], [1166, pointY(1140) + 0.9], 2),
  ].join("");
  // The hills pass behind the trees.
  far.occ = [
    [...main.top, [935, shoreY + 2], [150, shoreY + 2]],
    [...point.top, [1140, pointY(1140) + 2], [905, pointY(905) + 2]],
  ];
  far.t2(hillA);
  far.t2(hillB, true);
  far.occ = [];
  // Fill: fine vertical hatch, stopping short of the water as mist would.
  const fill = (
    top: Pt[],
    base: (x: number) => number,
    gap: number,
    fine: boolean,
  ) => {
    for (let x = top[0][0] + gap * 0.6; x < top[top.length - 1][0]; x += gap) {
      const y0 = heightAt(top, x) + 0.9,
        y1 = base(x) - 1.8;
      if (y1 - y0 > 1.2)
        far.t2(
          [
            [x, y0],
            [x, y1],
          ],
          fine,
        );
    }
  };
  fill(main.top, mainBase, 3, true);
  fill(point.top, pointY, 2.8, true);
  far.t2(
    [
      [110, shoreY + 0.4],
      [905, shoreY + 0.4],
    ],
    true,
  );
  far.t2(
    [
      [905, pointY(905) + 0.4],
      [1140, pointY(1140) + 0.4],
    ],
    true,
  );
  // Their reflections: a few short verticals, under the taller trees.
  const rfq = new Pen(642);
  const refl = (
    spires: [number, number, number][],
    base: (x: number) => number,
    min: number,
  ) => {
    for (const [x, , h] of spires) {
      if (h < min || rfq.rand() > 0.45) continue;
      const y = base(x) + 2.4;
      far.t2(
        [
          [x, y],
          [x, y + h * rfq.rand(0.22, 0.42)],
        ],
        true,
      );
    }
  };
  refl(point.spires, pointY, 22);
  // The sun's path on the water.
  for (const [dy, hw] of [
    [6, 15],
    [11, 10],
    [17, 6],
    [24, 3.5],
  ])
    far.t2([
      [sun[0] - hw, shoreY + dy],
      [sun[0] + hw, shoreY + dy],
    ]);

  // Sailboat, far out.
  const boat = new Sheet(new Pen(77), flat, 0.12);
  const bx = 840,
    by = 207;
  boat.s2(
    [
      [bx - 10, by - 2],
      [bx - 6, by + 1],
      [bx + 7, by + 1],
      [bx + 11, by - 2],
    ],
    { w: 1 },
  );
  boat.t2([
    [bx - 10, by - 2],
    [bx + 11, by - 2],
  ]);
  boat.s2(
    [
      [bx, by - 3],
      [bx, by - 27],
    ],
    { w: 0.7, taper: 0.8 },
  );
  boat.s2(
    [
      [bx + 0.8, by - 25.5],
      [bx + 9.5, by - 4.5],
      [bx + 0.8, by - 4.5],
    ],
    { w: 0.7, smooth: false },
  );
  boat.s2(
    [
      [bx - 1, by - 21],
      [bx - 8, by - 4.5],
      [bx - 1, by - 4.5],
    ],
    { w: 0.65, smooth: false },
  );
  boat.h2(
    [
      [bx - 1.5, by - 18],
      [bx - 6.8, by - 5.2],
      [bx - 1.5, by - 5.2],
    ],
    { angle: 80, gap: 2.8, inset: 0.3 },
    true,
  );
  for (const [x0, y0, y1] of [
    [bx - 3, by + 4, by + 8],
    [bx + 2, by + 6, by + 11],
    [bx, by + 13, by + 16],
  ])
    boat.t2(
      [
        [x0, y0],
        [x0, y1],
      ],
      true,
    );

  // Water: evenly spaced short strokes, denser near things, none on them.
  const keepOut: Pt[][] = [
    [
      P(dockPt(U - 40, D + 120, H + 10)),
      P(dockPt(L + 40, D + 120, H + 10)),
      P(dockPt(L + 40, -28, -H - 26)),
      P(dockPt(U - 40, -28, -H - 26)),
    ],
    [
      [0, 350],
      [300, 350],
      [300, 440],
      [0, 440],
    ],
  ];
  const near: Pt[] = [
    ...posts.map((u) => P(dockPt(u, 0, -H))),
    P(dockPt(L, 0, -H)),
    P(dockPt(L, 0, H)),
    [840, 212],
    [330, 425],
    [1030, 420],
    [1100, 432],
  ];
  const water = new Sheet(new Pen(900), flat, 0.12);
  const wq = new Pen(901);
  // Far out: a few long calm lines in the band under the shore.
  for (const [x, y, len] of [
    [380, 208, 90],
    [610, 214, 70],
    [170, 219, 60],
    [720, 222, 90],
    [470, 226, 50],
  ])
    water.t2(
      [
        [x, y],
        [x + len, y],
      ],
      true,
    );
  for (let y = 234, gap = 9; y < 432; y += gap, gap *= 1.12) {
    const step = 30 + (y - 200) * 0.3,
      len = 7 + (y - 200) * 0.09;
    for (
      let x = 140 + wq.rand(0, step);
      x < 1080;
      x += step * wq.rand(0.8, 1.2)
    ) {
      const d = Math.min(
        ...near.map(([nx, ny]) => Math.hypot(x - nx, (y - ny) * 2)),
      );
      const keep = 0.05 + 0.9 * Math.exp(-((d / 105) ** 2));
      if (wq.rand() > keep) continue;
      const l = len * wq.rand(0.7, 1.25);
      const a: Pt = [x, y + wq.rand(-0.6, 0.6)],
        b: Pt = [x + l, a[1]];
      if (keepOut.some((o) => inside(a, o) || inside(b, o))) continue;
      water.t2([a, b], y < 300);
    }
  }

  // Reeds and cattails in the shallows, both corners.
  const reeds = new Sheet(new Pen(505), flat, 0.12);
  // A blade rises and leans; one that `arc`s bends over at the top.
  const blade = (x: number, y: number, h: number, lean: number, arc = 0) =>
    reeds.s2(
      arc
        ? [
            [x, y],
            [x + lean * 0.05 * h, y - h * 0.5],
            [x + arc * 0.08 * h, y - h * 0.86],
            [x + arc * 0.24 * h, y - h],
            [x + arc * 0.42 * h, y - h * 0.93],
          ]
        : [
            [x, y],
            [x + lean * 0.1 * h, y - h * 0.45],
            [x + lean * 0.4 * h, y - h * 0.82],
            [x + lean * h, y - h],
          ],
      { w: 1.3, taper: 0.95 },
    );
  const cattail = (x: number, y: number, h: number, tilt: number) => {
    const at = (t: number): Pt => [x + tilt * t * t, y - h * t];
    reeds.s2([at(0), at(0.45), at(0.78)], { w: 0.9, taper: 0.6 });
    reeds.s2([at(0.97), at(1.06)], { w: 0.5, taper: 0.9 });
    // The head: a slim solid ink capsule.
    const c = at(0.875),
      hl = h * 0.1,
      hw = 2.4;
    const head: Pt[] = Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2;
      return [c[0] + Math.cos(a) * hw, c[1] + Math.sin(a) * hl] as Pt;
    });
    reeds.ink.push(rel(head) + "z");
  };
  blade(70, 432, 118, -0.1);
  blade(84, 434, 96, 0.14, 1);
  blade(122, 433, 132, 0.05);
  blade(150, 432, 88, 0.22, 1);
  blade(176, 434, 70, -0.05);
  cattail(100, 434, 126, -4);
  cattail(136, 433, 108, 5);
  blade(1052, 433, 104, 0.12);
  blade(1076, 434, 82, -0.16, -1);
  blade(1118, 432, 120, 0.04);
  cattail(1094, 434, 116, 4);
  for (const [x0, x1, y] of [
    [58, 110, 437],
    [128, 196, 438],
    [1036, 1080, 437],
    [1100, 1146, 438],
  ])
    reeds.t2(
      [
        [x0, y],
        [x1, y],
      ],
      true,
    );

  // Washes: one calm band of water, stone for the wood and the bank, a
  // touch of brass in the sun.
  const wp = new Pen(950);
  const band = washPath(
    wp,
    [
      [110, shoreY + 1],
      [500, shoreY + 1],
      [905, shoreY + 1],
      [1000, pointY(1000) + 1],
      [1130, pointY(1130) + 1],
      [1100, 226],
      [820, 232],
      [520, 228],
      [240, 231],
      [120, 214],
    ],
    1.5,
    24,
  );
  const inset = (pts: Pt[], k: number): Pt[] => {
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length,
      cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    return pts.map(([x, y]) => [x + (cx - x) * k, y + (cy - y) * k] as Pt);
  };
  const wood =
    washPath(wp, inset(deckPoly, 0.015), 1.5) +
    washPath(
      wp,
      [
        P(dockPt(U + 30, D - 1, -H)),
        P(dockPt(L, D - 1, -H)),
        P(dockPt(L, fz, -H)),
        P(dockPt(U + 30, fz, -H)),
      ],
      0.8,
    ) +
    washPath(wp, [...bend(bankTop), ...[...bankFoot].reverse()], 1.5);
  const sunWash = washPath(wp, inset(disc, 0.1), 0.5);
  return (
    <Art w={1200} h={440}>
      <Wash d={band} tone="blue" strength={0.5} />
      <Wash d={wood} tone="stone" strength={0.6} />
      <Wash d={sunWash} tone="brass" strength={0.9} />
      <Pencil d={pencil} />
      <g opacity={0.45}>
        <Marks s={sky} />
      </g>
      <Marks s={far} />
      <Marks s={water} />
      <Marks s={boat} />
      <Marks s={bank} />
      <Marks s={shade} />
      <Marks s={dock} />
      <Marks s={cL} />
      <Marks s={cR} />
      <Marks s={reeds} />
    </Art>
  );
}
