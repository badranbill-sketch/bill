import type { Language } from "@/lib/business";
import { curve, Pen, rectPoly, type Pt } from "@/lib/ink";
import { Art, Hatch, Ink, Note, Pencil, Wash } from "./primitives";

/*
 * A desk by a window onto a Québec lake. An open notebook with the things
 * that matter, reading glasses, a coffee, a pen, a couple of loose papers.
 * It opens the Ask Bill page: the questions on the kitchen table. (It was
 * the homepage hero until Bill's own print took that place; the empty
 * paper at the lower right is where that print used to lie.)
 *
 * One eye level for the whole plate: the far shore of the lake (y = 181),
 * vanishing point at the mullion. Light from the upper left, so shade and
 * cast shadows fall right and under.
 */

export const DESK = { w: 720, h: 640 };

type Words = {
  label: string;
  list: string[];
  next: string[];
  docs: string;
};
const WORDS: Record<Language, Words> = {
  fr: {
    label:
      "Un carnet ouvert sur un bureau, devant une fenêtre qui donne sur un lac",
    list: ["Famille", "Voyages", "Maison", "Revenus", "Retraite"],
    next: ["Et après?"],
    docs: "REER · CELI · RRQ",
  },
  en: {
    label: "An open notebook on a desk, by a window overlooking a lake",
    list: ["Family", "Travel", "Home", "Income", "Retirement"],
    next: ["What’s", "next?"],
    docs: "RRSP · TFSA · QPP",
  },
};

/* ---------- geometry helpers ---------- */

const q1 = (n: number) => Math.round(n * 10) / 10;
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const mix = (a: Pt, b: Pt, t: number): Pt => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
function rot(pts: Pt[], [cx, cy]: Pt, deg: number): Pt[] {
  const a = (deg * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return pts.map(([x, y]) => [
    cx + (x - cx) * c - (y - cy) * s,
    cy + (x - cx) * s + (y - cy) * c,
  ]);
}
/** Points on an ellipse from angle a0 to a1. */
const oval = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  a0: number,
  a1: number,
  n = 24,
): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as Pt;
  });
/** Linear interpolation through (x, y) knots sorted by x. */
const profileAt = (knots: Pt[], x: number) => {
  for (let i = 1; i < knots.length; i++)
    if (x <= knots[i][0]) {
      const [x0, y0] = knots[i - 1],
        [x1, y1] = knots[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
    }
  return knots[knots.length - 1][1];
};
function inside([x, y]: Pt, poly: Pt[]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i],
      [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      c = !c;
  }
  return c;
}
/** The parts of a polyline that lie outside every occluding polygon. */
function visible(pts: Pt[], occluders: Pt[][]): Pt[][] {
  const out: Pt[][] = [];
  let run: Pt[] = [];
  for (const q of pts) {
    if (occluders.some((o) => inside(q, o))) {
      if (run.length > 1) out.push(run);
      run = [];
    } else run.push(q);
  }
  if (run.length > 1) out.push(run);
  return out;
}
/** Top of a polygon along the vertical x (Infinity if it misses). */
function topAt(poly: Pt[], x: number) {
  let top = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i],
      [bx, by] = poly[(i + 1) % poly.length];
    if ((ax <= x && bx > x) || (bx <= x && ax > x))
      top = Math.min(top, ay + ((x - ax) / (bx - ax)) * (by - ay));
  }
  return top;
}

/* ---------- compact path writing ---------- */

/** Drop points that lie within `eps` of the line through their neighbours. */
function simplify(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  for (let top = stack.pop(); top; top = stack.pop()) {
    const [a, b] = top;
    const [ax, ay] = pts[a],
      [bx, by] = pts[b];
    const dx = bx - ax,
      dy = by - ay,
      L = Math.hypot(dx, dy);
    let far = -1,
      dmax = eps;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i];
      const d = L
        ? Math.abs(dy * (px - ax) - dx * (py - ay)) / L
        : Math.hypot(px - ax, py - ay);
      if (d > dmax) {
        dmax = d;
        far = i;
      }
    }
    if (far > 0) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/**
 * Writes path data as short relative commands. The pen position is kept
 * on the rounded grid, so long outlines close exactly where they started.
 */
class Rel {
  d = "";
  private prev = "";
  private cmd = "";
  private x = 0;
  private y = 0;
  private sx = 0;
  private sy = 0;
  private n(v: number) {
    let s = String(q1(v));
    if (s === "-0") s = "0";
    s = s.replace(/^(-?)0\./, "$1.");
    const glue =
      s[0] === "-" ||
      this.prev === "" ||
      (s[0] === "." && /\./.test(this.prev));
    this.d += (glue ? "" : " ") + s;
    this.prev = s;
  }
  private c(ch: string) {
    if (ch !== this.cmd) {
      this.d += ch;
      this.cmd = ch;
      this.prev = "";
    }
  }
  /** Move; the first move is absolute, so paths can be concatenated. */
  m([x, y]: Pt) {
    const X = q1(x),
      Y = q1(y);
    const first = this.d === "";
    this.d += first ? "M" : "m";
    this.prev = "";
    this.n(first ? X : X - this.x);
    this.n(first ? Y : Y - this.y);
    // after "m" further pairs are relative lines; after "M" they are not
    this.cmd = first ? "" : "l";
    this.x = this.sx = X;
    this.y = this.sy = Y;
    return this;
  }
  l([x, y]: Pt) {
    const X = q1(x),
      Y = q1(y);
    this.c("l");
    this.n(X - this.x);
    this.n(Y - this.y);
    this.x = X;
    this.y = Y;
    return this;
  }
  v(y: number) {
    const Y = q1(y);
    this.c("v");
    this.n(Y - this.y);
    this.y = Y;
    return this;
  }
  q([cx, cy]: Pt, [x, y]: Pt) {
    const X = q1(x),
      Y = q1(y);
    this.c("q");
    this.n(q1(cx) - this.x);
    this.n(q1(cy) - this.y);
    this.n(X - this.x);
    this.n(Y - this.y);
    this.x = X;
    this.y = Y;
    return this;
  }
  z() {
    this.d += "z";
    this.cmd = "z";
    this.prev = "";
    this.x = this.sx;
    this.y = this.sy;
    return this;
  }
  /** A polyline (simplified), optionally closed. */
  poly(pts: Pt[], closed = false, eps = 0.08) {
    const s = simplify(pts, eps);
    this.m(s[0]);
    for (const q of s.slice(1)) this.l(q);
    if (closed) this.z();
    return this;
  }
  /** Absolute M/L/Q/Z path data (as lib/ink.ts writes it), made relative. */
  path(abs: string, eps = 0.1) {
    const tok = abs.match(/[MLQZ]|-?\d+(?:\.\d+)?/g) ?? [];
    let run: Pt[] = [],
      i = 0;
    const num = () => Number(tok[i++]);
    const flush = () => {
      if (run.length) this.poly(run, false, eps);
      run = [];
    };
    while (i < tok.length) {
      const t = tok[i++];
      if (t === "M") {
        flush();
        run = [[num(), num()]];
      } else if (t === "L") run.push([num(), num()]);
      else if (t === "Q") {
        flush();
        const c: Pt = [num(), num()];
        this.q(c, [num(), num()]);
      } else if (t === "Z") {
        flush();
        this.z();
      }
    }
    flush();
    return this;
  }
}
/** Points every `step` units along a closed outline, so a wash built on it
 * follows the edges instead of bulging between the corners. */
function dense(poly: Pt[], step = 8): Pt[] {
  const out: Pt[] = [];
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length];
    const k = Math.max(
      1,
      Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step),
    );
    for (let j = 0; j < k; j++) out.push(mix(a, b, j / k));
  });
  return out;
}

/** Pen output (one string or several) as one compact relative path. */
const rel = (d: string | string[], eps = 0.1) =>
  new Rel().path(Array.isArray(d) ? d.join("") : d, eps).d;
const polyD = (pts: Pt[], closed = false) => new Rel().poly(pts, closed).d;

/** A thin crisp line for small detail (tree tops, ripples, typed lines). */
function Fine({
  d,
  w = 0.7,
  o = 0.85,
  soft,
}: {
  d: string;
  w?: number;
  o?: number;
  soft?: boolean;
}) {
  return (
    <path
      d={d}
      className={soft ? "hatch soft" : "hatch"}
      strokeWidth={w}
      strokeLinejoin="round"
      style={{ opacity: o }}
    />
  );
}

/* ---------- the window ---------- */

const SHORE = 181;
/** Vanishing point: the eye level on the far shore, behind the mullion. */
const VP: Pt = [382, SHORE];
/** Opening in the wall plane (casing) and the glass set back from it. */
const OPEN = { l: 72, r: 692, t: 26, b: 284 };
const toGlass = ([x, y]: Pt): Pt => mix(VP, [x, y], 0.955);
const [GL, GT] = toGlass([OPEN.l, OPEN.t]);
const [GR, GB] = toGlass([OPEN.r, OPEN.b]);
const MUL = { l: 377, r: 387 };
const paneL = rectPoly(GL, GT, MUL.l - GL, GB - GT);
const paneR = rectPoly(MUL.r, GT, GR - MUL.r, GB - GT);

/* ---------- the view through the window ---------- */

function drawView() {
  const p = new Pen(202);
  const steady = { wobble: 0.12 };

  // Far hills: one clean contour, pale, with a pale wash beneath it.
  const hillK: Pt[] = [
    [80, 147],
    [140, 133],
    [200, 125],
    [262, 129],
    [326, 138],
    [388, 140],
    [450, 131],
    [512, 118],
    [566, 121],
    [626, 131],
    [684, 128],
  ];
  const hills = rel(p.stroke(hillK, { w: 0.75, taper: 0.9, ...steady }));

  // Clouds: three long thin streaks, nothing else in the sky.
  const streak = (x0: number, x1: number, y: number, w: number) =>
    p.stroke(
      [
        [x0, y],
        [(x0 + x1) / 2, y - 0.6],
        [x1, y + 0.2],
      ],
      { w, taper: 0.95, ...steady },
    );
  const clouds = rel([
    streak(432, 520, 70, 0.6),
    streak(528, 596, 69.4, 0.5),
    streak(484, 572, 77.2, 0.5),
    streak(582, 646, 77.8, 0.45),
    streak(130, 196, 93, 0.5),
    streak(204, 258, 92.6, 0.45),
  ]);

  // The cottage, the dock and the canoe, drawn at 1.2× about the dock.
  const S = 1.2;
  const H = (pts: Pt[]): Pt[] =>
    pts.map(([x, y]) => [570 + (x - 570) * S, SHORE + (y - SHORE) * S] as Pt);
  const peak: Pt = [549, 160],
    eaveA: Pt = [539.5, 171.5],
    eaveB: Pt = [558, 171.5],
    ridgeEnd: Pt = [590, 160],
    eaveE: Pt = [599, 171.5];
  const [pk, eA, eB, rE, eE] = H([peak, eaveA, eaveB, ridgeEnd, eaveE]);
  const walls = H([
    [541, 171.5],
    [541, 181],
    [596, 181],
    [596, 171.5],
  ]);
  const corner = H([
    [557, 171.5],
    [557, 181],
  ]);
  const chimney = H([
    [575, 162],
    [575, 152.5],
    [579.5, 152.5],
    [579.5, 161.5],
  ]);
  const door = H([
    [546, 181],
    [546, 174.2],
    [550.4, 174.2],
    [550.4, 181],
  ]);
  const windows = [
    H(rectPoly(563, 174, 5.2, 4.2)),
    H(rectPoly(583.5, 174, 5.2, 4.2)),
    H(rectPoly(547, 165.6, 3.8, 3.4)),
  ];
  const roof = [pk, rE, eE, eB];
  const sideWall = H([
    [557.6, 172],
    [595.6, 172],
    [595.6, 180.6],
    [557.6, 180.6],
  ]);
  /** Everything of the cottage the trees must not cross. */
  const cottage: Pt[] = [
    ...H([
      [539, 181],
      [539, 172],
    ]),
    pk,
    ...H([
      [575, 160],
      [575, 152],
      [580, 152],
      [580, 160],
    ]),
    rE,
    add(eE, [0.8, 0.4]),
    ...H([[597, 181]]),
  ];
  const lw = { w: 0.75, overshoot: 0, ...steady };
  const cottageInk = rel([
    p.line(eA, pk, lw),
    p.line(pk, eB, lw),
    p.line(pk, rE, lw),
    p.line(rE, eE, lw),
    p.line(eB, eE, lw),
    p.line(eA, eB, { ...lw, w: 0.55 }),
    p.line(walls[0], walls[1], lw),
    p.line(corner[0], corner[1], lw),
    p.line(walls[3], walls[2], lw),
    p.line(add(walls[1], [-1, 0]), add(walls[2], [1, 0]), { ...lw, w: 0.9 }),
    p.poly(chimney, { ...lw, w: 0.6 }),
    p.poly(door, { ...lw, w: 0.55 }),
  ]);
  const cottageDark = windows.map((q) => polyD(q, true)).join("");
  // A standing-seam roof: fine vertical hatch, the darkest value in the view.
  const roofHatch = rel(
    p.hatch(roof, { angle: 90, gap: 1.7, inset: 0.4, jitter: 0.05 }),
  );
  // Clapboard on the long wall, which turns away from the light.
  const wallHatch = rel(
    p.hatch(sideWall, { angle: 0, gap: 2.2, inset: 0.6, jitter: 0.05 }),
  );

  // Dock: a low deck on two posts, and an empty canoe tied at its end.
  const dk = H([
    [565.5, 181.4],
    [573.5, 181.4],
    [580, 189.6],
    [570.5, 189.6],
  ]);
  const dockInk = rel([
    p.line(dk[0], dk[3], { ...lw, w: 0.65 }),
    p.line(dk[1], dk[2], { ...lw, w: 0.65 }),
    p.line(dk[3], dk[2], { ...lw, w: 0.85 }),
    p.line(add(dk[3], [0, 1.6]), add(dk[2], [0, 1.6]), { ...lw, w: 0.5 }),
  ]);
  const posts = H([
    [571.5, 189.6],
    [571.5, 193.2],
    [579, 189.6],
    [579, 193.2],
  ]);
  const postInk = polyD([posts[0], posts[1]]) + polyD([posts[2], posts[3]]);
  const canoe = H(
    [
      ...curve(
        [
          [583.5, 190.4],
          [586, 191.5],
          [594, 192],
          [602, 191.5],
          [605, 190.2],
        ],
        false,
        3,
      ),
      ...curve(
        [
          [604.2, 191.2],
          [600, 193.6],
          [594, 194.2],
          [588, 193.7],
          [584.2, 191.4],
        ],
        false,
        3,
      ),
    ].map((q) => mix([594, 192.3], q, 0.88)),
  );

  // The far shore: a ridge of small regular spires (heights ±15%), filled
  // with fine vertical hatch, denser in the mass under the tips.
  const ridge: Pt[] = [
    [80, 171],
    [170, 168.5],
    [260, 169.5],
    [340, 166.5],
    [420, 164],
    [500, 163.5],
    [560, 160],
    [620, 157],
    [684, 158.5],
  ];
  const tp = new Pen(211);
  const tops: Pt[] = [];
  let x = GL - 3;
  while (x < GR + 3) {
    const base = profileAt(ridge, x);
    const w = tp.rand(3.6, 4.6);
    const h = 12.6 * tp.rand(0.9, 1.1) * (1 + 0.04 * Math.sin(x / 31));
    tops.push(
      [x, base - h * tp.rand(0.3, 0.4)],
      [x + w / 2 + tp.rand(-0.25, 0.25), base - h],
    );
    x += w * tp.rand(0.8, 1);
  }
  tops.push([x, profileAt(ridge, x) - 4]);
  // A pale flat tint under the hatch, with the cottage left as paper.
  const treeTint =
    polyD([...tops, [x, SHORE + 0.5], [GL - 3, SHORE + 0.5]], true) +
    polyD(cottage, true);
  // Fine enough to read as a tone, not as pickets; a second, interleaved
  // layer darkens the mass below the tips.
  const forest = new Rel();
  const G2 = 1.7;
  for (let hx = GL + 0.8; hx < GR; hx += G2) {
    if (hx > MUL.l - 0.5 && hx < MUL.r + 0.5) continue;
    const bot = Math.min(SHORE - 0.8, topAt(cottage, hx) - 1.2);
    const top = profileAt(tops, hx) + 0.7;
    if (bot - top > 1) forest.m([hx, top]).v(bot);
    const hx2 = hx + G2 / 2,
      top2 = profileAt(ridge, hx2) - 2 + tp.rand(-1, 1),
      bot2 = Math.min(SHORE - 0.8, topAt(cottage, hx2) - 1.2);
    if (bot2 - top2 > 1) forest.m([hx2, top2]).v(bot2);
  }
  const shoreInk = rel(
    p.line([GL, SHORE + 0.2], [GR, SHORE - 0.2], {
      w: 0.85,
      taper: 0.3,
      overshoot: 0,
      ...steady,
    }),
  );

  // Water: short level strokes, closer and shorter near the far shore,
  // longer and sparser toward the room; broken verticals under the cottage.
  const water = new Rel();
  const rows = [184.6, 188.2, 192.6, 198, 205, 214, 225.5, 240, 257];
  rows.forEach((ry, k) => {
    const n = Math.round(9.6 - k * 0.8);
    const span = (GR - GL - 20) / n;
    for (let i = 0; i < n; i++) {
      const len = (5 + k * 3) * p.rand(0.6, 1.3);
      const x0 = GL + 8 + span * i + p.rand(0, Math.max(1, span - len));
      const x1 = x0 + len;
      if (x1 > MUL.l - 3 && x0 < MUL.r + 3) continue;
      if (ry < 204 && x1 > 528 && x0 < 622) continue;
      const y = ry + p.rand(-0.4, 0.4);
      water.m([x0, y]).l([x1, y + p.rand(-0.3, 0.3)]);
    }
  });
  // The cottage's reflection as broken level strokes under it; the posts'
  // as broken verticals.
  for (const [a, b, y] of [
    [537, 561, 184.2],
    [586, 600, 184.4],
    [539, 556, 187],
    [588, 602, 187.4],
    [541, 552, 190],
    [590, 598, 190.4],
    [556, 574, 197],
    [602, 626, 199.6],
    [546, 562, 202.4],
  ] as [number, number, number][])
    water.m([a, y]).l([b, y + 0.2]);
  for (const [px, py] of [posts[1], posts[3]])
    water
      .m([px, py + 1])
      .v(py + 3.4)
      .m([px + 0.2, py + 4.4])
      .v(py + 5.8);

  // Washes, registered: the hills down to the tree bases, and the water as
  // one band under the far shore.
  const hillWash = rel(
    p.blob(
      dense([
        ...curve(hillK, false, 3),
        [684, profileAt(ridge, 684) - 4],
        [80, profileAt(ridge, 80) - 4],
      ]),
      1,
    ),
    0.25,
  );
  const waterWash = rel(
    p.blob(
      dense([
        [80, SHORE + 0.5],
        [684, SHORE + 0.5],
        [684, 222],
        [560, 226],
        [420, 221],
        [260, 227],
        [80, 222],
      ]),
      1.2,
    ),
    0.25,
  );

  return {
    hills,
    clouds,
    treeTint,
    forest: forest.d,
    shoreInk,
    cottageInk,
    cottageDark,
    roofHatch,
    wallHatch,
    dockInk,
    postInk,
    canoe: polyD(canoe, true),
    water: water.d,
    hillWash,
    waterWash,
  };
}

/* ---------- window, desk and what lies on it ---------- */

function drawRoom() {
  /* Window: casing, the glass set back in one-point perspective, mullion,
     stool. Level and plumb, corners that meet. */
  const w = new Pen(101);
  const firm = { overshoot: 0, wobble: 0.12 };
  const O = OPEN;
  const cL: Pt = [O.l, O.t],
    cR: Pt = [O.r, O.t],
    cBL: Pt = [O.l, O.b],
    cBR: Pt = [O.r, O.b];
  const gTL: Pt = [GL, GT],
    gTR: Pt = [GR, GT],
    gBL: Pt = [GL, GB],
    gBR: Pt = [GR, GB];
  const TRIM = 9;
  const casing = rel([
    w.line(cL, cR, { w: 1.35, ...firm }),
    w.line(cL, cBL, { w: 1.4, ...firm }),
    w.line(cR, cBR, { w: 1.4, ...firm }),
    // the trim around the opening
    w.line([O.l - TRIM, O.t - TRIM], [O.r + TRIM, O.t - TRIM], {
      w: 0.7,
      ...firm,
    }),
    w.line([O.l - TRIM, O.t - TRIM], [O.l - TRIM, O.b], { w: 0.7, ...firm }),
    w.line([O.r + TRIM, O.t - TRIM], [O.r + TRIM, O.b], { w: 0.7, ...firm }),
  ]);
  const glass = rel([
    w.line(gTL, gTR, { w: 0.7, ...firm }),
    w.line(gTL, gBL, { w: 0.7, ...firm }),
    w.line(gTR, gBR, { w: 0.7, ...firm }),
    w.line(gBL, gBR, { w: 0.85, ...firm }),
    w.line([MUL.l, GT], [MUL.l, GB], { w: 0.85, ...firm }),
    w.line([MUL.r, GT], [MUL.r, GB], { w: 0.85, ...firm }),
    // reveal edges, running to the vanishing point
    w.line(cL, gTL, { w: 0.6, ...firm }),
    w.line(cR, gTR, { w: 0.6, ...firm }),
    w.line(cBL, gBL, { w: 0.6, ...firm }),
    w.line(cBR, gBR, { w: 0.6, ...firm }),
  ]);
  // Shade: the head soffit and the left reveal turn away from the light.
  const revealHatch = rel([
    w.hatch([cL, gTL, gBL, cBL], { angle: 90, gap: 2.9, inset: 0.8 }),
    w.hatch([cL, cR, gTR, gTL], { angle: 0, gap: 2.8, inset: 1.2 }),
  ]);
  // The stool: front edge (the one retraced contour), face, horns.
  const ST = { back: O.b, front: 288.6, face: 294.4, l: 50, r: 714 };
  const [stoolTop, stoolRe] = w.twice(
    [
      [ST.l, ST.front],
      [382, ST.front],
      [ST.r, ST.front],
    ],
    { w: 1.5, taper: 0.4, ...firm },
  );
  const stool = rel([
    stoolTop,
    stoolRe,
    w.line([ST.l, ST.face], [ST.r, ST.face], { w: 0.8, taper: 0.5, ...firm }),
    w.line([ST.l, ST.front], [ST.l, ST.face], { w: 0.7, ...firm }),
    w.line([ST.r, ST.front], [ST.r, ST.face], { w: 0.7, ...firm }),
    w.line([ST.l, ST.front], [O.l - TRIM - 4, ST.back], { w: 0.7, ...firm }),
    w.line([ST.r, ST.front], [O.r + TRIM + 4, ST.back], { w: 0.7, ...firm }),
    w.line([O.l - TRIM - 4, ST.back], [O.l - TRIM, ST.back], {
      w: 0.7,
      ...firm,
    }),
    w.line([O.r + TRIM, ST.back], [O.r + TRIM + 4, ST.back], {
      w: 0.7,
      ...firm,
    }),
  ]);
  // Cast shadow of the stool on the wall: one soft line.
  const stoolShadow = rel(
    w.stroke(
      [
        [ST.l + 6, ST.face + 2.6],
        [382, ST.face + 2.8],
        [ST.r - 2, ST.face + 2.6],
      ],
      { w: 1.3, taper: 0.9, wobble: 0.1 },
    ),
  );
  // Where the desk meets the wall.
  const deskEdge = rel(
    w.stroke(
      [
        [26, 316.4],
        [360, 316],
        [700, 315.6],
      ],
      { w: 0.95, taper: 0.9, wobble: 0.12 },
    ),
  );

  /* Coffee cup on its saucer, back left. A body of revolution seen from a
     little above: every ellipse has the same proportions (ry = 0.33 rx). */
  const c = new Pen(404);
  const K = 0.33,
    CX = 104,
    RIM = 333,
    R = 30,
    HT = 30;
  const rAt = (t: number) => R * Math.sqrt(1 - 0.72 * t * t);
  const lower: Pt[] = [];
  for (let i = 0; i <= 36; i++) {
    const dx = -R + (2 * R * i) / 36;
    let y = RIM;
    for (let j = 0; j <= 60; j++) {
      const t = j / 60,
        r = rAt(t);
      if (Math.abs(dx) <= r)
        y = Math.max(y, RIM + HT * t + K * Math.sqrt(r * r - dx * dx));
    }
    lower.push([CX + dx, y]);
  }
  const rimBack = oval(CX, RIM, R, R * K, Math.PI, Math.PI * 2, 24);
  const cupBody: Pt[] = [...rimBack, ...lower.slice().reverse()];
  const handleOut: Pt[] = [
    [133.4, 338.6],
    [143, 336.8],
    [150.2, 341.2],
    [149.2, 349.6],
    [141, 356],
    [127.6, 359.4],
  ];
  const handleIn: Pt[] = [
    [133.2, 343.6],
    [140.8, 342.4],
    [144.6, 346.4],
    [141.6, 351.2],
    [130.4, 354.6],
  ];
  const handleShape: Pt[] = [
    ...curve(handleOut, false, 4),
    ...curve(handleIn, false, 4).reverse(),
  ];
  const cupInk = rel([
    c.ellipse(CX, RIM, R, R * K, { w: 1.25, taper: 0.85, wobble: 0.1 }),
    c.stroke(lower, { w: 1.5, taper: 0.6, wobble: 0.12, smooth: false }),
    c.stroke(handleOut, { w: 1.25, wobble: 0.1 }),
    c.stroke(handleIn, { w: 0.85, taper: 0.7, wobble: 0.1 }),
    // the lip's inner edge
    c.ellipse(CX, RIM + 0.4, R - 2.4, (R - 2.4) * K, {
      w: 0.5,
      taper: 0.9,
      wobble: 0.08,
    }),
  ]);
  // The coffee: its far edge shows inside the rim, the near one hides.
  const coffeeEdge = oval(
    CX,
    RIM + 4.2,
    25.5,
    25.5 * K,
    Math.PI + 0.1,
    2 * Math.PI - 0.1,
    20,
  );
  const coffeeInk = rel(
    c.stroke(coffeeEdge, { w: 0.5, taper: 0.9, wobble: 0.06 }),
  );
  const coffee = rel(
    c.blob(
      [
        ...oval(CX, RIM + 4.2, 25.5, 25.5 * K, Math.PI, Math.PI * 2, 8),
        ...oval(CX, RIM + 0.4, R - 3, (R - 3) * K, 0.25, Math.PI - 0.25, 6),
      ],
      0.5,
    ),
    0.2,
  );
  // Saucer: rim, well, the thickness at the front; hidden behind the cup.
  const SY = 364.6,
    SR = 55;
  const occ = [cupBody, handleShape];
  const saucerLines = [
    ...visible(oval(CX, SY, SR, SR * K, 0, Math.PI * 2, 72), occ).map((r) =>
      c.stroke(r, { w: 1.2, taper: 0.7, wobble: 0.1, smooth: false }),
    ),
    ...visible(
      oval(CX, SY + 3.2, SR - 1.5, (SR - 1.5) * K, 0.12, Math.PI - 0.12, 40),
      occ,
    ).map((r) =>
      c.stroke(r, { w: 0.7, taper: 0.9, wobble: 0.08, smooth: false }),
    ),
    ...visible(oval(CX, SY - 0.6, 34, 34 * K, 0, Math.PI * 2, 48), occ).map(
      (r) => c.stroke(r, { w: 0.5, taper: 0.9, wobble: 0.08, smooth: false }),
    ),
  ];
  const saucerInk = rel(saucerLines);
  // Form shadow on the cup's right, cast shadows on the saucer and desk.
  const shadeSide: Pt[] = [
    ...oval(CX, RIM, R, R * K, 0.95, 0, 8),
    ...lower.filter(([px]) => px > CX + 6).reverse(),
  ];
  const cupShade = rel(
    c.hatch(shadeSide, {
      angle: 80,
      gap: 2.8,
      inset: 1,
      density: (t) => 0.35 + t,
    }),
  );
  const foot = lower.filter(([px]) => px >= CX - 6 && px <= CX + 21);
  const onSaucer: Pt[] = [
    ...foot,
    ...foot
      .slice()
      .reverse()
      .map((q, i, a) =>
        add(q, [7 * Math.sin((Math.PI * (i + 1)) / (a.length + 1)) + 1, 3.6]),
      ),
  ];
  const saucerShade = rel(
    c.hatch(onSaucer, { angle: 45, gap: 2.8, inset: 0.8 }),
  );
  const saucerFront = oval(
    CX,
    SY + 3.2,
    SR - 1.5,
    (SR - 1.5) * K,
    -0.2,
    1.5,
    16,
  );
  const onDesk: Pt[] = [
    ...saucerFront,
    ...saucerFront
      .slice()
      .reverse()
      .map((q) => add(q, [7, 4.5])),
  ];
  const deskShade = rel(c.hatch(onDesk, { angle: 45, gap: 3, inset: 0.6 }));

  /* Loose papers under the notebook: a statement on top, one more below. */
  const dc = new Pen(707);
  const sheetB = rot(rectPoly(16, 404, 172, 204), [102, 506], -3);
  const sheetA = rot(rectPoly(18, 420, 164, 202), [100, 521], 5);
  const edges = (q: Pt[], wt: number) =>
    q.map((a, i) =>
      dc.line(a, q[(i + 1) % q.length], { w: wt, overshoot: 0, wobble: 0.12 }),
    );
  const sheetAInk = rel(edges(sheetA, 0.85));
  const sheetBInk = rel(edges(sheetB, 1));
  // B's bottom edge casts a hairline of shadow on A.
  const sheetShadow = polyD([
    add(mix(sheetB[3], sheetB[2], 0.02), [1.2, 2]),
    add(mix(sheetB[3], sheetB[2], 0.62), [1.2, 2]),
  ]);
  // Typed lines, in the sheet's own frame, then turned with it.
  const typed = new Rel();
  const lineOn = (x0: number, ly: number, len: number) => {
    const [a, b] = rot(
      [
        [x0, ly],
        [x0 + len, ly],
      ],
      [102, 506],
      -3,
    );
    typed.m(a).l(b);
  };
  const lens = [128, 136, 118, 132, 74, 0, 130, 124, 136, 96, 0];
  lens.forEach((len, i) => {
    if (len) lineOn(30, 450 + i * 9, len);
  });
  // a small table: labels on the left, figures ranged right
  for (let i = 0; i < 4; i++) {
    lineOn(30, 552 + i * 9, [46, 38, 52, 30][i]);
    lineOn(132 - [24, 20, 26, 22][i], 552 + i * 9, [24, 20, 26, 22][i]);
  }
  lineOn(100, 586.5, 32);

  /* The notebook. */
  const n = new Pen(606);
  const TLo: Pt = [186, 352],
    S0: Pt = [362, 360],
    S1: Pt = [358, 596],
    BLo: Pt = [172, 586],
    TRo: Pt = [544, 346],
    BRo: Pt = [556, 581];
  const lt: Pt[] = [TLo, [240, 350.6], [305, 352.4], [346, 356], S0];
  const lb: Pt[] = [BLo, [228, 585.2], [294, 587.6], [340, 591.6], S1];
  const rt: Pt[] = [S0, [380, 355.6], [440, 350], [500, 347], TRo];
  const rb: Pt[] = [S1, [378, 591.8], [440, 585.8], [500, 582.4], BRo];
  const ltC = curve(lt, false, 6),
    lbC = curve(lb, false, 6),
    rtC = curve(rt, false, 6),
    rbC = curve(rb, false, 6);
  const pageL: Pt[] = [...ltC, ...lbC.slice().reverse()];
  const pageR: Pt[] = [...rtC, ...rbC.slice().reverse()];
  const coverBottom: Pt[] = [
    add(BLo, [-9, 8]),
    [228, 594],
    [294, 597],
    [340, 601],
    add(S1, [0, 10]),
    [378, 601.4],
    [440, 594.8],
    [500, 591],
    add(BRo, [9, 8]),
  ];
  const cover: Pt[] = [
    add(TLo, [-9, -3]),
    add(S0, [0, -3]),
    add(TRo, [9, -4]),
    ...curve(coverBottom, false, 4).reverse(),
  ];
  const [topL, topLre] = n.twice(lt, { w: 1.35, wobble: 0.12 });
  const bookInk = rel([
    topL,
    topLre,
    n.stroke(rt, { w: 1.3, wobble: 0.12 }),
    n.line(TLo, BLo, { w: 1.2, overshoot: 0, wobble: 0.12 }),
    n.line(TRo, BRo, { w: 1.2, overshoot: 0, wobble: 0.12 }),
    n.stroke(lb, { w: 1.15, wobble: 0.12 }),
    n.stroke(rb, { w: 1.15, wobble: 0.12 }),
    n.stroke([S0, [360.4, 470], S1], { w: 0.8, taper: 0.8, wobble: 0.1 }),
    // the cover board
    n.line(add(TLo, [-9, -3]), add(BLo, [-9, 8]), {
      w: 1.4,
      overshoot: 0,
      wobble: 0.12,
    }),
    n.line(add(TRo, [9, -4]), add(BRo, [9, 8]), {
      w: 1.4,
      overshoot: 0,
      wobble: 0.12,
    }),
    n.stroke(coverBottom, { w: 1.45, taper: 0.5, wobble: 0.12 }),
    n.line(add(TLo, [-9, -3]), add(TLo, [0, -1.2]), {
      w: 0.8,
      overshoot: 0,
    }),
    n.line(add(TRo, [9, -4]), add(TRo, [0, -0.6]), {
      w: 0.8,
      overshoot: 0,
    }),
  ]);
  // The page block's edge: two fine lines under the pages.
  const stack = new Rel();
  for (const k of [3, 5.8]) {
    stack.poly(
      curve(
        lb.map((q) => add(q, [0, k])),
        false,
        4,
      ),
    );
    stack.poly(
      curve(
        rb.map((q) => add(q, [0, k])),
        false,
        4,
      ),
    );
    stack.poly([add(TLo, [-k * 0.8, 1]), add(BLo, [-k * 0.8, k])]);
  }
  // Gutter: the pages curve down into the spine. Lines closer toward it,
  // more on the left page, which turns away from the light.
  const gutter = new Rel();
  for (const d of [1.3, 2.9, 4.8, 7.1, 9.9, 13.4])
    gutter
      .m([S0[0] - d, profileAt(ltC, S0[0] - d) + 1.6])
      .l([S1[0] - d, profileAt(lbC, S1[0] - d) - 1.6]);
  for (const d of [1.5, 3.7, 6.6])
    gutter
      .m([S0[0] + d, profileAt(rtC, S0[0] + d) + 1.6])
      .l([S1[0] + d, profileAt(rbC, S1[0] + d) - 1.6]);
  // Ruled lines follow the pages (between their top and bottom edges).
  const BASE = [379, 412, 445, 478, 511, 544];
  const rules = new Rel();
  for (const by of BASE) {
    const v = (by - 351) / 236;
    const rl = ltC.map((q, i) => mix(q, lbC[i], v));
    const rr = rtC.map((q, i) => mix(q, rbC[i], v));
    rules.poly(rl.slice(2, -3), false, 0.15);
    rules.poly(rr.slice(3, -2), false, 0.15);
  }
  const coverWash = rel(n.blob(dense(cover, 10), 0.8), 0.25);
  // Cast shadow on the desk: the cover shifted down-right, minus itself.
  const off: Pt = [5.5, 6];
  const cTR = add(TRo, [9, -4]);
  const bottomC = curve(coverBottom, false, 4);
  const shadowPoly: Pt[] = [
    cTR,
    ...bottomC.slice().reverse(),
    ...bottomC.map((q) => add(q, off)),
    add(cTR, off),
  ];
  const bookShadow = rel(
    n.hatch(shadowPoly, { angle: 45, gap: 3, inset: 0.5 }),
  );
  const ribbon: Pt[] = [
    [354.6, 598],
    [361, 598.4],
    [362, 630.5],
    [358.4, 626],
    [354.2, 631.5],
  ];
  const ribbonInk = rel([
    n.stroke(
      [
        [354.6, 598],
        [354.4, 614],
        [354.2, 631.5],
      ],
      { w: 0.7, overshoot: 0 },
    ),
    n.stroke(
      [
        [361, 598.4],
        [361.6, 614],
        [362, 630.5],
      ],
      { w: 0.7, overshoot: 0 },
    ),
    n.poly(
      [
        [354.2, 631.5],
        [358.4, 626],
        [362, 630.5],
      ],
      { w: 0.6, overshoot: 0 },
    ),
  ]);
  const ribbonHatch = rel(n.hatch(ribbon, { angle: 88, gap: 1.5, inset: 0.5 }));

  /* Reading glasses, folded, resting across the top of the spread. */
  const g = new Pen(505);
  const gc: Pt = [350, 386];
  const G = (pts: Pt[]) =>
    rot(
      pts.map(([px, py]) => [gc[0] + px, gc[1] + py] as Pt),
      gc,
      -9,
    );
  const lensPts = (cx: number, a: number, b: number, a0 = 0, sweep = 6.4) =>
    Array.from({ length: 41 }, (_, i) => {
      const t = a0 + (sweep * i) / 40,
        co = Math.cos(t),
        si = Math.sin(t);
      return [
        cx + a * Math.sign(co) * Math.abs(co) ** 0.78,
        b * Math.sign(si) * Math.abs(si) ** 0.78 + (si < 0 ? 0 : 1.2 * si),
      ] as Pt;
    });
  const glassesInk = rel([
    g.stroke(G(lensPts(-30, 23.5, 15, 2.2)), {
      w: 1.25,
      taper: 0.8,
      wobble: 0.1,
    }),
    g.stroke(G(lensPts(30, 23.5, 15, 3.6)), {
      w: 1.25,
      taper: 0.8,
      wobble: 0.1,
    }),
    g.stroke(G(lensPts(-30, 21.6, 13.2, 1.2)), {
      w: 0.45,
      taper: 0.9,
      wobble: 0.06,
    }),
    g.stroke(G(lensPts(30, 21.6, 13.2, 4.4)), {
      w: 0.45,
      taper: 0.9,
      wobble: 0.06,
    }),
    // bridge
    g.stroke(
      G([
        [-7.2, -9.5],
        [0, -12.5],
        [7.2, -9.5],
      ]),
      { w: 1.05, taper: 0.4, wobble: 0.08 },
    ),
    // end pieces, where the temples hinge
    g.stroke(
      G([
        [-53, -8],
        [-57.5, -10],
      ]),
      { w: 1.1, smooth: false, taper: 0.3 },
    ),
    g.stroke(
      G([
        [53, -8],
        [57.5, -10],
      ]),
      { w: 1.1, smooth: false, taper: 0.3 },
    ),
  ]);
  // The temples, folded behind the frame: from here they show just above
  // the lenses, one over the other, their ends curling down.
  const temples = rel([
    g.stroke(
      G([
        [-57.5, -10],
        [-49, -17],
        [-12, -19.2],
        [30, -19.6],
        [44, -18.2],
        [48.4, -13.6],
      ]),
      { w: 0.8, taper: 0.6, wobble: 0.06 },
    ),
    g.stroke(
      G([
        [57.5, -10],
        [49, -20.6],
        [12, -23.4],
        [-30, -23.8],
        [-44, -22.4],
        [-48.6, -17.6],
      ]),
      { w: 0.8, taper: 0.6, wobble: 0.06 },
    ),
  ]);
  // Glints (upper left, toward the light) and the shadow the rims cast.
  const glint = new Rel();
  for (const cx of [-30, 30]) {
    const [a, b] = G([
      [cx - 13, -1],
      [cx - 7, -8],
    ]);
    const [e, f] = G([
      [cx - 10, 3],
      [cx - 2.5, -5.5],
    ]);
    glint.m(a).l(b).m(e).l(f);
  }
  const glassesShadow = new Rel();
  for (const cx of [-30, 30])
    glassesShadow.poly(
      G(lensPts(cx, 23.5, 15, -0.5, 2.6).map((q) => add(q, [2.6, 3.6]))),
    );

  /* A fountain pen on the right-hand page, its cap end under the print. */
  const pp = new Pen(909);
  const nib: Pt = [392, 576],
    end: Pt = [516, 489];
  const ax: Pt = [end[0] - nib[0], end[1] - nib[1]];
  const alen = Math.hypot(ax[0], ax[1]);
  const nrm: Pt = [-ax[1] / alen, ax[0] / alen];
  const at = (t: number, off: number): Pt => [
    nib[0] + ax[0] * t + nrm[0] * off,
    nib[1] + ax[1] * t + nrm[1] * off,
  ];
  const prof: [number, number][] = [
    [0.075, 2.6],
    [0.1, 3.4],
    [0.2, 4],
    [0.215, 4.9],
    [0.6, 5.2],
    [0.94, 5],
    [0.985, 3.6],
    [1, 0.6],
  ];
  const penBody: Pt[] = [
    ...prof.map(([t, h]) => at(t, h)),
    ...prof
      .slice()
      .reverse()
      .map(([t, h]) => at(t, -h)),
  ];
  const penInk = rel([
    pp.stroke([...penBody, penBody[0]], {
      w: 1,
      smooth: false,
      taper: 0.2,
      wobble: 0.08,
    }),
    pp.line(at(0.215, 4.9), at(0.215, -4.9), { w: 0.7, overshoot: 0 }),
    pp.line(at(0.6, 5.2), at(0.6, -5.2), { w: 0.7, overshoot: 0 }),
    pp.line(at(0.64, 5.2), at(0.64, -5.2), { w: 0.5, overshoot: 0 }),
    // nib
    pp.stroke(
      [
        at(0.075, 2.6),
        at(0.03, 1.6),
        at(0, 0),
        at(0.03, -1.6),
        at(0.075, -2.6),
      ],
      {
        w: 0.8,
        smooth: false,
        taper: 0.3,
      },
    ),
    // clip, on the side away from us
    pp.stroke([at(0.66, -5.2), at(0.67, -7), at(0.9, -6.8), at(0.93, -5.1)], {
      w: 0.75,
      smooth: false,
      taper: 0.4,
    }),
  ]);
  const penDark = polyD([at(0.012, 0), at(0.06, 0.3)]);
  // Shade along the barrel's lower side (lines follow the cylinder).
  const penShade = new Rel()
    .poly([at(0.23, 3.2), at(0.59, 3.4)])
    .poly([at(0.23, 4.2), at(0.59, 4.4)])
    .poly([at(0.65, 3.3), at(0.93, 3.2)])
    .poly([at(0.65, 4.3), at(0.93, 4.2)]).d;
  const penShadow = polyD([
    add(at(0.03, 1.4), [1.6, 2.4]),
    add(at(0.5, 5.4), [1.8, 2.8]),
    add(at(0.97, 5.2), [1.8, 2.8]),
  ]);

  /* Marks on the pages: underline, arrow to the question. */
  const nt = new Pen(1111);
  const underline = {
    fr: rel(
      nt.stroke(
        [
          [207, 551.4],
          [248, 550.4],
          [293, 548.6],
        ],
        { w: 1.6, taper: 0.8, wobble: 0.1 },
      ),
    ),
    en: rel(
      nt.stroke(
        [
          [207, 551.4],
          [262, 550.4],
          [318, 548.2],
        ],
        { w: 1.6, taper: 0.8, wobble: 0.1 },
      ),
    ),
  };
  // From the last word, across the gutter, up to the question.
  const arrowPath: Record<Language, Pt[]> = {
    fr: [
      [296, 539],
      [324, 533],
      [350, 514],
      [366, 488],
    ],
    en: [
      [316, 541],
      [340, 535.5],
      [358, 518],
      [368, 494],
    ],
  };
  const arrows = (["fr", "en"] as const).map((lang) => {
    const path = arrowPath[lang];
    const tip = path[path.length - 1],
      prev = path[path.length - 2];
    const d = Math.hypot(tip[0] - prev[0], tip[1] - prev[1]);
    const u: Pt = [(tip[0] - prev[0]) / d, (tip[1] - prev[1]) / d];
    const barb = (s: number): Pt => {
      const a = Math.atan2(-u[1], -u[0]) + s * 0.45;
      return [tip[0] + Math.cos(a) * 8, tip[1] + Math.sin(a) * 8];
    };
    return rel([
      nt.stroke(path, { w: 0.95, taper: 0.8, wobble: 0.1 }),
      nt.line(tip, barb(1), { w: 0.9, overshoot: 0 }),
      nt.line(tip, barb(-1), { w: 0.9, overshoot: 0 }),
    ]);
  });

  /* Pencil: two short construction marks, nothing through an object. */
  const pc = new Pen(808);
  const pencils =
    pc.pencil([382, O.t - TRIM - 1], [382, O.t - TRIM - 7], 1) +
    pc.pencil([O.l - TRIM - 9, SHORE], [O.l - TRIM - 2, SHORE], 1);

  return {
    casing,
    glass,
    revealHatch,
    stool,
    stoolShadow,
    deskEdge,
    cupInk,
    coffeeInk,
    coffee,
    saucerInk,
    cupShade,
    saucerShade,
    deskShade,
    sheetA,
    sheetB,
    sheetAInk,
    sheetBInk,
    sheetShadow,
    typed: typed.d,
    pageL,
    pageR,
    cover,
    bookInk,
    stack: stack.d,
    gutter: gutter.d,
    rules: rules.d,
    coverWash,
    bookShadow,
    ribbonInk,
    ribbonHatch,
    glassesInk,
    temples,
    glint: glint.d,
    glassesShadow: glassesShadow.d,
    penBody,
    penInk,
    penDark,
    penShade,
    penShadow,
    underline,
    arrows: { fr: arrows[0], en: arrows[1] },
    pencils,
  };
}

let cached:
  | { v: ReturnType<typeof drawView>; r: ReturnType<typeof drawRoom> }
  | undefined;
const scene = () => (cached ??= { v: drawView(), r: drawRoom() });

/** The hero scene: a desk, an open notebook, a window onto the lake. */
export function HeroDesk({ lang = "fr" }: { lang?: Language }) {
  const { v, r } = scene();
  const t = WORDS[lang];
  const full = "M-40-40h800v720h-800z";
  return (
    <Art w={DESK.w} h={DESK.h} label={t.label}>
      <defs>
        <clipPath id="hd-glass">
          <path d={polyD(paneL, true) + polyD(paneR, true)} />
        </clipPath>
        <mask id="hd-book" maskUnits="userSpaceOnUse">
          <path d={full} fill="#fff" />
          <path d={polyD(r.cover, true)} fill="#000" />
        </mask>
        <mask id="hd-sheet" maskUnits="userSpaceOnUse">
          <path d={full} fill="#fff" />
          <path d={polyD(r.cover, true) + polyD(r.sheetB, true)} fill="#000" />
        </mask>
        <mask id="hd-cover" maskUnits="userSpaceOnUse">
          <path d={full} fill="#fff" />
          <path d={polyD(r.pageL, true) + polyD(r.pageR, true)} fill="#000" />
        </mask>
        <mask id="hd-pen" maskUnits="userSpaceOnUse">
          <path d={full} fill="#fff" />
          <path d={polyD(r.penBody, true)} fill="#000" />
        </mask>
      </defs>

      {/* washes: each one sits on its object */}
      <g clipPath="url(#hd-glass)">
        <Wash d={v.hillWash} tone="blue" strength={0.3} />
        <Wash d={v.waterWash} tone="blue" strength={0.5} />
      </g>
      <g mask="url(#hd-cover)">
        <Wash d={r.coverWash} tone="navy" strength={0.2} />
      </g>
      <Wash d={r.coffee} tone="brass" />

      {/* the view */}
      <g clipPath="url(#hd-glass)">
        <Ink d={v.hills} soft />
        <Ink d={v.clouds} soft />
        <Hatch d={v.forest} w={0.45} />
        <path
          d={v.treeTint}
          className="ink"
          fillRule="evenodd"
          style={{ opacity: 0.13 }}
        />
        <Ink d={v.shoreInk} />
        <Hatch d={v.roofHatch} w={0.45} />
        <Hatch d={v.wallHatch} w={0.4} soft />
        <Ink d={v.cottageInk} />
        <path d={v.cottageDark} className="ink" />
        <Ink d={v.dockInk} />
        <Fine d={v.postInk} w={0.9} o={0.9} />
        <path d={v.canoe} className="ink" />
        <Fine d={v.water} w={0.5} o={0.55} soft />
      </g>

      {/* window, stool, wall */}
      <Hatch d={r.revealHatch} w={0.45} soft />
      <Ink d={r.glass} />
      <Ink d={r.casing} />
      <Ink d={r.stool} />
      <Ink d={r.stoolShadow} soft />
      <Ink d={r.deskEdge} />
      <Pencil d={r.pencils} />

      {/* cup and saucer */}
      <Hatch d={r.deskShade} w={0.4} soft />
      <Hatch d={r.saucerShade} w={0.4} soft />
      <Hatch d={r.cupShade} w={0.45} />
      <Ink d={r.saucerInk} />
      <Ink d={r.coffeeInk} soft />
      <Ink d={r.cupInk} />

      {/* papers under the notebook */}
      <g mask="url(#hd-sheet)">
        <Ink d={r.sheetAInk} />
      </g>
      <g mask="url(#hd-book)">
        <Fine d={r.sheetShadow} w={1.1} o={0.3} soft />
        <Ink d={r.sheetBInk} />
        <Fine d={r.typed} w={0.6} o={0.45} soft />
        <Note x={23} y={433} size={20} rotate={-3}>
          {t.docs}
        </Note>
      </g>

      {/* notebook */}
      <Hatch d={r.bookShadow} w={0.4} soft />
      <Hatch d={r.gutter} w={0.45} soft />
      <Fine d={r.stack} w={0.5} o={0.7} />
      <g mask="url(#hd-pen)">
        <Pencil d={r.rules} />
      </g>
      <Ink d={r.bookInk} />
      <Hatch d={r.ribbonHatch} w={0.5} />
      <Ink d={r.ribbonInk} />

      {/* writing */}
      {t.list.map((word, i) => (
        <Note
          key={word}
          x={208 + [0, 2, 1, 3, 1][i]}
          y={[412, 445, 478, 511, 544][i]}
          size={i === 4 ? 27 : 25}
          rotate={[-1.5, -1, -1.5, -1, -1][i]}
        >
          {word}
        </Note>
      ))}
      <path
        d={r.underline[lang]}
        className="ink"
        style={{ fill: "var(--brass, #a8875a)" }}
      />
      <Ink d={r.arrows[lang]} />
      {t.next.map((line, i) => (
        <Note key={line} x={374 + i * 4} y={478 + i * 33} size={25} rotate={-3}>
          {line}
        </Note>
      ))}

      {/* glasses and pen on top */}
      <Fine d={r.glassesShadow} w={1.1} o={0.28} soft />
      <Ink d={r.temples} />
      <Ink d={r.glassesInk} />
      <Fine d={r.glint} w={0.6} o={0.55} soft />
      <Fine d={r.penShadow} w={1.4} o={0.25} soft />
      <Fine d={r.penShade} w={0.5} o={0.7} />
      <Ink d={r.penInk} />
      <Fine d={r.penDark} w={0.5} o={0.9} />
    </Art>
  );
}
