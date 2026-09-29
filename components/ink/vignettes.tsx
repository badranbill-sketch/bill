import type { Language } from "@/lib/business";
import {
  curve,
  ellipsePoly,
  Pen,
  rectPoly,
  type Pt,
  type StrokeOpts,
} from "@/lib/ink";
import { Art, Hatch, Ink, Note, Pencil, Wash, type Tone } from "./primitives";

/*
 * Small spot drawings (vignettes) for the margins of questions, the top of
 * inner pages and the gaps between sections on mobile. All share one box,
 * VIGNETTE_W × VIGNETTE_H, with the subject centred and the edges left to
 * fade into the paper.
 *
 * One hand for all eight: three line weights (contour, secondary, detail),
 * light from the upper left so shade falls right and under, hatching that
 * stays parallel and inside its shape, a few pale washes built from the
 * outline they tint.
 */
export const VIGNETTE_W = 280;
export const VIGNETTE_H = 220;

/** Line weights: contour, secondary, detail, hatching. */
const C = 1.4,
  S = 0.9,
  D = 0.6,
  HW = 0.45;
/** Hatching for shade: one direction for the whole set ("/"). */
const SHADE = 120;

/* ------------------------------------------------------------------ */
/* Local drawing kit                                                   */
/* ------------------------------------------------------------------ */

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
 * Rewrite an absolute M/L/Q/Z path (as lib/ink.ts writes it) as short
 * relative commands, dropping points no one could see (under `eps` units).
 */
function compact(d: string, eps = 0.1): string {
  const tok = d.match(/[MLQZ]|-?\d+(?:\.\d+)?/g) ?? [];
  let out = "",
    prev = "",
    last = "",
    cx = 0,
    cy = 0,
    sx = 0,
    sy = 0,
    i = 0,
    run: Pt[] = [];
  const num = (v: number) => {
    let n = String(Math.round(v * 10) / 10).replace(/^(-?)0\./, "$1.");
    if (n === "-0") n = "0";
    const glue =
      n[0] === "-" || prev === "" || (n[0] === "." && prev.includes("."));
    out += (glue ? "" : " ") + n;
    prev = n;
  };
  const cmd = (c: string) => {
    if (c !== last) {
      out += c;
      last = c;
      prev = "";
    }
  };
  const flush = () => {
    if (!run.length) return;
    const pts = simplify(run, eps);
    const [x, y] = pts[0];
    out += "m";
    prev = "";
    num(x - cx);
    num(y - cy);
    cx = sx = x;
    cy = sy = y;
    last = "l";
    for (const [px, py] of pts.slice(1)) {
      cmd("l");
      num(px - cx);
      num(py - cy);
      cx = px;
      cy = py;
    }
    run = [];
  };
  const n = () => Number(tok[i++]);
  while (i < tok.length) {
    const c = tok[i++];
    if (c === "M") {
      flush();
      run = [[n(), n()]];
    } else if (c === "L") run.push([n(), n()]);
    else if (c === "Q") {
      flush();
      const x1 = n(),
        y1 = n(),
        x = n(),
        y = n();
      cmd("q");
      num(x1 - cx);
      num(y1 - cy);
      num(x - cx);
      num(y - cy);
      cx = x;
      cy = y;
    } else if (c === "Z") {
      flush();
      out += "z";
      last = "z";
      prev = "";
      cx = sx;
      cy = sy;
    }
  }
  flush();
  return out;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const seg = (a: Pt, b: Pt) =>
  `M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}`;

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

/** Points every `step` units along a polyline. */
function dense(points: Pt[], step = 1): Pt[] {
  const out: Pt[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1],
      [bx, by] = points[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    for (let k = 1; k <= n; k++)
      out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  return out;
}

/** The runs of a line left visible in front of the hiding shapes. */
function visible(points: Pt[], hide: Pt[][], smooth = true): Pt[][] {
  const pts = dense(smooth && points.length > 2 ? curve(points) : points);
  const runs: Pt[][] = [];
  let cur: Pt[] = [];
  for (const q of pts) {
    if (hide.some((h) => inside(q, h))) {
      if (cur.length > 2) runs.push(cur);
      cur = [];
    } else cur.push(q);
  }
  if (cur.length > 2) runs.push(cur);
  return runs;
}

/** Rotate points by `deg` (clockwise, as SVG does) around `c`. */
function rot(points: Pt[], [cx, cy]: Pt, deg: number): Pt[] {
  const a = (deg * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return points.map(([x, y]) => [
    cx + (x - cx) * c - (y - cy) * s,
    cy + (x - cx) * s + (y - cy) * c,
  ]);
}

/** A point `u` of the way from a to b, moved `v` to the side. */
function along(a: Pt, b: Pt, u: number, v = 0): Pt {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    d = Math.hypot(dx, dy) || 1;
  return [a[0] + dx * u - (dy / d) * v, a[1] + dy * u + (dx / d) * v];
}

type Line = StrokeOpts & { soft?: boolean; hide?: Pt[][] };
type HatchOpts = NonNullable<Parameters<Pen["hatch"]>[1]> & {
  w?: number;
  soft?: boolean;
};

/**
 * A pen plus the layers it has drawn: all ink goes into one path, all
 * hatching of one weight into another, which keeps the markup small.
 */
class Sketch {
  readonly p: Pen;
  private ink: string[] = [];
  private softInk: string[] = [];
  private thin = new Map<string, string[]>();
  private guides: string[] = [];
  private washes: { d: string; tone: Tone; strength: number }[] = [];
  constructor(seed: number) {
    this.p = new Pen(seed);
  }
  rand(a: number, b: number) {
    return this.p.rand(a, b);
  }
  private put(d: string, soft?: boolean) {
    if (d) (soft ? this.softInk : this.ink).push(d);
  }
  stroke(points: Pt[], o: Line = {}) {
    const { soft, hide, ...so } = o;
    if (!hide) return this.put(this.p.stroke(points, so), soft);
    for (const run of visible(points, hide, so.smooth !== false))
      this.put(
        this.p.stroke(run, { ...so, smooth: false, overshoot: 0 }),
        soft,
      );
  }
  line(a: Pt, b: Pt, o: Line = {}) {
    if (o.hide) return this.stroke([a, b], { ...o, smooth: false });
    const { soft, ...so } = o;
    this.put(this.p.line(a, b, so), soft);
  }
  poly(points: Pt[], o: Line & { closed?: boolean } = {}) {
    const n = o.closed ? points.length : points.length - 1;
    for (let i = 0; i < n; i++)
      this.line(points[i], points[(i + 1) % points.length], o);
  }
  ellipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    o: StrokeOpts & { soft?: boolean; from?: number; sweep?: number } = {},
  ) {
    const { soft, ...so } = o;
    this.put(this.p.ellipse(cx, cy, rx, ry, so), soft);
  }
  /** An important contour, gone over a second time. */
  twice(points: Pt[], o: StrokeOpts = {}) {
    const [a, b] = this.p.twice(points, o);
    this.put(a);
    this.put(b, true);
  }
  hatch(poly: Pt[], o: HatchOpts = {}) {
    const { w = HW, soft, ...ho } = o;
    this.thinLines(this.p.hatch(poly, ho), w, soft);
  }
  /** A short ink dash from a to b: pointed ends, full width in the middle. */
  dash(a: Pt, b: Pt, w = D, soft = true) {
    const [nx, ny] = along(a, b, 0, 1),
      k = w / 2;
    const off = (u: number, v: number): Pt => {
      const [x, y] = along(a, b, u);
      return [x + (nx - a[0]) * v, y + (ny - a[1]) * v];
    };
    const q = [a, off(0.3, k), off(0.7, k), b, off(0.7, -k), off(0.3, -k)];
    this.put(`M${q.map((p) => `${r1(p[0])} ${r1(p[1])}`).join("L")}Z`, soft);
  }
  /** Any thin stroked lines (balusters, water, ruled lines in ink). */
  thinLines(d: string, w = 0.5, soft?: boolean) {
    const k = `${w}|${soft ? 1 : 0}`;
    const list = this.thin.get(k);
    if (list) list.push(d);
    else this.thin.set(k, [d]);
  }
  pencil(a: Pt, b: Pt, extend = 0, hide?: Pt[][]) {
    if (!hide) return void this.guides.push(this.p.pencil(a, b, extend));
    for (const run of visible([a, b], hide, false))
      this.guides.push(seg(run[0], run[run.length - 1]));
  }
  /**
   * A pale wash registered to the outline(s) it tints: built from the same
   * points, evenly spaced, each moved at most `spread` off the line.
   */
  wash(shapes: Pt[] | Pt[][], tone: Tone = "blue", strength = 1, spread = 1) {
    const list = (
      typeof shapes[0][0] === "number" ? [shapes] : shapes
    ) as Pt[][];
    const d = list
      .map((pts) => {
        const ring = dense(simplify([...pts, pts[0]], 0.4), 7).slice(0, -1);
        const c = curve(
          ring.map((q) => this.p.jit(q, spread)),
          true,
          3,
        );
        return `M${c.map((q) => `${r1(q[0])} ${r1(q[1])}`).join("L")}Z`;
      })
      .join("");
    this.washes.push({ d, tone, strength });
  }
  render() {
    return (
      <>
        {this.guides.length > 0 && <Pencil d={compact(this.guides.join(""))} />}
        {this.washes.map((w, i) => (
          <Wash
            key={i}
            d={compact(w.d, 0.2)}
            tone={w.tone}
            strength={w.strength}
          />
        ))}
        {[...this.thin].map(([k, ds]) => {
          const [w, soft] = k.split("|");
          return (
            <Hatch
              key={k}
              d={compact(ds.join(""))}
              w={Number(w)}
              soft={soft === "1"}
            />
          );
        })}
        {this.ink.length > 0 && <Ink d={compact(this.ink.join(""))} />}
        {this.softInk.length > 0 && (
          <Ink d={compact(this.softInk.join(""))} soft />
        )}
      </>
    );
  }
}

/** "x,y x,y …" → points, which keeps the drawings readable. */
const P = (str: string): Pt[] =>
  str
    .trim()
    .split(/\s+/)
    .map((q) => q.split(",").map(Number) as Pt);

/** A ground line that breaks up and thins toward both ends. */
function ground(s: Sketch, x0: number, x1: number, y: number, w = 1) {
  const L = x1 - x0;
  const j = () => y + s.rand(-0.3, 0.3);
  s.stroke(
    [
      [x0 + L * 0.2, j()],
      [x0 + L * 0.5, j()],
      [x0 + L * 0.8, j()],
    ],
    { w, taper: 0.85 },
  );
  s.line([x0 + L * 0.07, j()], [x0 + L * 0.18, j()], {
    w: w * 0.6,
    soft: true,
  });
  s.line([x0 + L * 0.82, j()], [x0 + L * 0.93, j()], {
    w: w * 0.6,
    soft: true,
  });
}

/** A small tuft of grass: three fine blades. */
function tuft(s: Sketch, [x, y]: Pt, h = 5) {
  for (let i = 0; i < 3; i++) {
    const dx = (i - 1) * 1.6,
      lean = dx * 0.8 + s.rand(-0.4, 0.4);
    s.stroke(
      [
        [x + dx, y],
        [x + dx + lean * 0.4, y - h * 0.5],
        [x + dx + lean, y - h * s.rand(0.8, 1.1)],
      ],
      { w: D, taper: 0.9, soft: true },
    );
  }
}

/**
 * A deciduous tree, from a hand-placed canopy outline (clockwise, starting
 * just past the upper left): one smooth contour with a few gentle lobes,
 * left open where the light strikes and where the trunk enters; engraved
 * shade on its lower right; a tapered trunk that forks into the crown.
 */
function tree(s: Sketch, crown: Pt[], [bx, by]: Pt, tint = 0.35) {
  const xs = crown.map((q) => q[0]),
    ys = crown.map((q) => q[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2,
    cy = (Math.min(...ys) + Math.max(...ys)) / 2,
    rx = (Math.max(...xs) - Math.min(...xs)) / 2,
    ry = (Math.max(...ys) - Math.min(...ys)) / 2;
  const w0 = Math.max(5, rx * 0.24),
    w1 = w0 * 0.55;
  s.wash(crown, "blue", tint, 1);
  // The contour, open at the upper left and where the trunk goes in.
  const line = curve(crown, false, 6);
  const gap = (q: Pt) => q[1] > cy + ry * 0.5 && Math.abs(q[0] - bx) < w0 * 1.2;
  const cut = line.findIndex(gap),
    resume = line.findIndex((q, i) => i > cut && !gap(q));
  s.stroke(line.slice(0, cut), { w: 1.1, taper: 0.6, smooth: false });
  s.stroke(line.slice(resume), { w: S, taper: 0.7, smooth: false });
  // Shade: the part of the crown below and right of a line from its upper
  // right to its lower left, pulled in toward the light.
  const ring = curve(crown, true, 6);
  const ang = (q: Pt) => Math.atan2((q[1] - cy) / ry, (q[0] - cx) / rx);
  const outer = ring.filter((q) => {
    const a = ang(q);
    return a > -0.55 && a < 2.55;
  });
  outer.sort((p, q) => ang(p) - ang(q));
  const inner = outer
    .map(([x, y]): Pt => [
      cx - rx * 0.14 + (x - cx) * 0.8,
      cy - ry * 0.22 + (y - cy) * 0.8,
    ])
    .reverse();
  s.hatch([...outer, ...inner], { angle: SHADE, gap: 2.6 });
  // Trunk: flared at the root, tapering, forking just inside the crown
  // into two limbs that fade among the leaves.
  const top = Math.max(...ys) - 2;
  const edge = (k: number): Pt[] => [
    [bx + k * (w0 / 2 + 2), by],
    [bx + k * (w0 / 2), by - 3.5],
    [bx + k * (w0 * 0.38), by - (by - top) * 0.5],
    [bx + k * (w1 / 2), top],
  ];
  s.stroke(edge(-1), { w: S, taper: 0.5 });
  s.stroke(edge(1), { w: 1.2, taper: 0.5 });
  const limb = { w: 0.7, taper: 0.9 };
  const L: Pt = [bx - rx * 0.24, top - ry * 0.62],
    R: Pt = [bx + rx * 0.3, top - ry * 0.5];
  if (rx < 24) {
    // A small, distant tree: each limb a single line.
    s.stroke([[bx - 0.6, top], [bx - 1.5, top - 5], L], limb);
    s.stroke([[bx + 0.6, top], [bx + 2, top - 4.5], R], limb);
  } else {
    s.stroke(
      [
        [bx - w1 / 2, top],
        [bx - w1 / 2 - 1.5, top - 6],
        [L[0] - 1, L[1]],
      ],
      limb,
    );
    s.stroke(
      [
        [bx - 0.3, top - 2.5],
        [bx - 1.6, top - 7.5],
        [L[0] + 0.9, L[1]],
      ],
      limb,
    );
    s.stroke(
      [
        [bx + w1 / 2, top],
        [bx + w1 / 2 + 2.2, top - 5.5],
        [R[0] + 0.9, R[1]],
      ],
      limb,
    );
    s.stroke(
      [
        [bx + 0.3, top - 2.5],
        [bx + 2, top - 7],
        [R[0] - 0.9, R[1]],
      ],
      limb,
    );
  }
  s.hatch([...edge(0.15), ...edge(1).reverse()], {
    angle: 92,
    gap: 1.5,
    inset: 0.3,
  });
}

/**
 * A conifer treeline: one even row of small spires (heights ±15%) on a
 * gentle rise, smaller toward both ends. Returns its outline from (x0, y)
 * to (x1, y).
 */
function spires(
  s: Sketch,
  x0: number,
  x1: number,
  y: number,
  h: number,
  rise = 0,
): Pt[] {
  const t = (x: number) => Math.sin((Math.PI * (x - x0)) / (x1 - x0));
  const env = (x: number) => y - rise * t(x);
  const size = (x: number) => h * (0.45 + 0.55 * t(x));
  const pts: Pt[] = [[x0, y]];
  for (let x = x0 + h * 0.5; x < x1 - h * 0.4;) {
    pts.push([x, env(x) - size(x) * s.rand(0.87, 1.13)]);
    const dx = h * 0.56 * s.rand(0.9, 1.1);
    pts.push([x + dx / 2, env(x + dx / 2) - size(x) * 0.5]);
    x += dx;
  }
  pts[pts.length - 1] = [x1, y];
  return pts;
}

/** Ink a treeline: its silhouette, a fine vertical hatch, a pale tint. */
function forest(s: Sketch, runs: Pt[][], y: number, gap = 1.3) {
  const close = (r: Pt[]) =>
    [...r, [r[r.length - 1][0], y], [r[0][0], y]] as Pt[];
  // The tint follows the tips, not every notch between them.
  const tips = (r: Pt[]) => {
    const out: Pt[] = [];
    for (const q of r) {
      const last = out[out.length - 1];
      if (!last || q[0] - last[0] >= 3.5) out.push([...q]);
      else if (q[1] < last[1]) last[1] = q[1];
    }
    return out;
  };
  s.wash(
    runs.map((r) => close(tips(r))),
    "blue",
    0.45,
    0.4,
  );
  for (const r of runs)
    s.stroke(r, { w: 0.5, taper: 0.9, soft: true, smooth: false });
  for (const r of runs)
    s.hatch(close(r), { angle: 90, gap, inset: 0.4, w: 0.35, soft: true });
}

/**
 * Water: rows of short level dashes, sparser away from `cx`. Each row is
 * [y, x0, x1, dash length]; dashes under `hide` are left out.
 */
function water(
  s: Sketch,
  cx: number,
  rows: number[][],
  o: { w?: number; hide?: Pt[][] } = {},
) {
  for (const [y, x0, x1, len] of rows) {
    const half = Math.max(cx - x0, x1 - cx);
    for (
      let x = x0 + s.rand(0, len * 1.5);
      x + len * 0.5 < x1;
      x += len * s.rand(1.9, 3.1)
    ) {
      const L = Math.min(x1 - x, len * s.rand(0.7, 1.15));
      const far = Math.abs(x + L / 2 - cx) / half;
      if (s.rand(0, 1) < far * far * 0.85) continue;
      const a: Pt = [x, y + s.rand(-0.3, 0.3)],
        b: Pt = [x + L, a[1] + s.rand(-0.15, 0.15)];
      if (
        o.hide?.some(
          (h) =>
            inside(a, h) ||
            inside(b, h) ||
            inside([(a[0] + b[0]) / 2, a[1]], h),
        )
      )
        continue;
      s.dash(a, b, (o.w ?? 0.6) * s.rand(0.8, 1.15));
    }
  }
}

/** The runs of segment a→b that lie inside `poly` and outside `hide`. */
function within(a: Pt, b: Pt, poly: Pt[], hide: Pt[][] = []): [Pt, Pt][] {
  const runs: [Pt, Pt][] = [];
  let start: Pt | undefined, prev: Pt | undefined;
  for (const q of dense([a, b], 0.5)) {
    const ok = inside(q, poly) && !hide.some((h) => inside(q, h));
    if (ok && !start) start = q;
    if (!ok && start && prev) {
      runs.push([start, prev]);
      start = undefined;
    }
    prev = q;
  }
  if (start && prev) runs.push([start, prev]);
  return runs;
}

/* ------------------------------------------------------------------ */
/* House                                                               */
/* ------------------------------------------------------------------ */

/** A Québec house: steep flared roof, dormers, a galerie, a maple. */
// `lang` is accepted like the other drawings; nothing here is written.
export function House(props: { lang?: Language }) {
  void props;
  const s = new Sketch(1107);
  const G = 170;
  s.pencil([14, G], [28, G]);
  s.pencil([219, 71.7], [225, 71.7]);

  const roof = P(
    "118,73 110,98 104,118 98,128 93,132 199.5,132 202,128 205,118 208,98 212.5,73",
  );
  const dormers = [140, 180].map((c) =>
    P(
      `${c - 11},104 ${c},89.5 ${c + 11},104 ${c + 8},104 ${c + 8},116.5 ${c - 8},116.5 ${c - 8},104`,
    ),
  );

  // Tin roof and the one lit window.
  s.wash(roof, "blue", 0.45, 1);
  s.wash(rectPoly(108.6, 138.6, 11.4, 11.4), "brass", 0.95, 0.6);

  // Roof: flared rakes, ridge, the long eave over the galerie.
  s.stroke(P("118,72 110,98 104,118 98,128 91,133"), { w: C });
  s.line([117.6, 72.2], [213.4, 71.8], { w: C, overshoot: 0.4 });
  s.stroke(P("213,72 208,98 205,118 202,128 199.5,133"), { w: C });
  s.stroke(P("213,72 219,98 224,116 229,124 236,128"), { w: C });
  s.twice(P("91,133 150,132.6 200,133"), { w: 1.5 });
  s.line([95, 136], [199, 136], { w: D, soft: true, overshoot: 0 });
  s.line([235.5, 128.2], [228.5, 129.4], { w: D, overshoot: 0 });
  // Standing seams of the tin roof, ridge to eave, round the dormers.
  const inner = P(
    "119.5,75 111.8,98 106,118 100.5,127.5 96,130.8 197.5,130.8 200.2,127.5 203.2,118 206.4,98 210.8,75",
  );
  let seams = "";
  for (let x = 104; x < 208; x += 7)
    for (const [a, b] of within([x, 70], [x, 134], inner, dormers))
      if (b[1] - a[1] > 3) seams += seg(a, b);
  s.thinLines(seams, 0.5, true);

  // Dormers: gable, cheeks, a dark pane, the shadow each casts on the roof.
  for (const c of [140, 180]) {
    s.stroke(P(`${c - 11},104 ${c},90 ${c + 11},104`), {
      w: 1.1,
      smooth: false,
    });
    s.line([c - 7.5, 104.5], [c - 7.5, 116], { w: S, overshoot: 0 });
    s.line([c + 7.5, 104.5], [c + 7.5, 116], { w: S, overshoot: 0 });
    s.poly(rectPoly(c - 3.5, 105.5, 7, 8), { w: D, closed: true });
    s.hatch(rectPoly(c - 3.5, 105.5, 7, 8), {
      angle: SHADE,
      gap: 1.8,
      inset: 0.6,
    });
    s.hatch(
      P(`${c + 8.5},104.5 ${c + 12.5},107 ${c + 12},116.5 ${c + 8.5},116.5`),
      {
        angle: SHADE,
        gap: 2,
        inset: 0.6,
        soft: true,
      },
    );
  }

  // Chimneys, the shaded side hatched.
  for (const [x0, x1, top, base] of [
    [114, 121, 60, 75],
    [209, 217, 58, 72],
  ]) {
    s.line([x0, base], [x0, top], { w: S, overshoot: 0 });
    s.line([x1, top], [x1, base], { w: S, overshoot: 0 });
    s.line([x0 - 1.5, top], [x1 + 1.5, top], { w: 1.1, overshoot: 0 });
    s.hatch(rectPoly((x0 + x1) / 2, top + 1, (x1 - x0) / 2, base - top - 2), {
      angle: 90,
      gap: 1.6,
      inset: 0.3,
    });
  }

  // Gable wall, in shade, with a small window.
  s.line([228, 128], [228, 166], { w: C, overshoot: 0 });
  s.line([200, 170], [228, 166], { w: C, overshoot: 0.4 });
  s.poly(P("209,139 219,139.4 219,153 209,153"), {
    w: S,
    closed: true,
    overshoot: 0.3,
  });
  s.hatch(P("201,134 206,118 213,79 220,104 227,124 227,165 201,169"), {
    angle: SHADE,
    gap: 3.2,
  });

  // The galerie: posts, deck, railing, steps, the dark space beneath.
  for (const x of [100, 124, 176, 198])
    s.line([x, 136.5], [x, 152], { w: S, overshoot: 0 });
  s.line([93, 152], [203, 152], { w: C });
  s.line([95, 156], [201, 156], { w: S, overshoot: 0.3 });
  s.line([100, 143], [136, 143], { w: S, overshoot: 0 });
  s.line([164, 143], [198, 143], { w: S, overshoot: 0 });
  let bal = "";
  for (let x = 104.5; x < 134; x += 4.6) bal += seg([x, 144], [x, 151.5]);
  for (let x = 167.5; x < 196; x += 4.6) bal += seg([x, 144], [x, 151.5]);
  s.thinLines(bal, 0.55);
  s.line([136, 152], [132.5, 169.5], { w: S, overshoot: 0 });
  s.line([164, 152], [167.5, 169.5], { w: S, overshoot: 0 });
  s.line([134.5, 158], [165.5, 158], { w: D, overshoot: 0 });
  s.line([133.5, 164], [166.5, 164], { w: D, overshoot: 0 });
  for (const r of [rectPoly(95, 157, 38, 12.5), rectPoly(167, 157, 34, 12.5)])
    s.hatch(r, { angle: SHADE, gap: 2.9 });

  // The front wall in the shade of the galerie roof; door and windows.
  for (const [x0, x1] of [
    [96, 108],
    [120, 145],
    [156, 180],
    [192, 200],
  ])
    s.hatch(rectPoly(x0, 136.5, x1 - x0, 15), {
      angle: SHADE,
      gap: 3,
      soft: true,
      density: (k) => 1 - 0.5 * k,
    });
  s.poly(rectPoly(145, 138, 11, 14), { w: S, overshoot: 0 });
  s.hatch(rectPoly(145, 138, 11, 14), { angle: SHADE, gap: 2.2, inset: 0.8 });
  s.poly(rectPoly(108, 138, 12, 12), { w: S, closed: true, overshoot: 0.3 });
  s.line([114, 138.5], [114, 149.5], { w: 0.5, soft: true, overshoot: 0 });
  s.poly(rectPoly(180, 138, 12, 12), { w: S, closed: true, overshoot: 0.3 });
  s.hatch(rectPoly(180, 138, 12, 12), { angle: SHADE, gap: 2, inset: 0.8 });

  // The maple, to the left, and the ground.
  tree(
    s,
    P(
      "30,82 38,75.5 45.5,74.8 53,71.8 61.5,72 68,75 75.5,75.8 82.5,81.5 84.6,88.5 88.4,95 89,104 85.8,110.5 84,117.5 75,123.5 63,126 50,126.2 38,124 28.5,118.5 22,110 20,100 22.5,90.5 25.6,85.5",
    ),
    [55, G],
  );
  ground(s, 22, 256, G);
  tuft(s, [44, G], 5);
  tuft(s, [74, G], 4.5);
  tuft(s, [240, G - 0.5], 4.5);

  return (
    <Art w={VIGNETTE_W} h={VIGNETTE_H}>
      {s.render()}
    </Art>
  );
}

/* ------------------------------------------------------------------ */
/* Travel bag                                                          */
/* ------------------------------------------------------------------ */

/** A canvas holdall with leather trim, a hat on top, a folded map in front. */
// `lang` is accepted like the other drawings; nothing here is written.
export function TravelBag(props: { lang?: Language }) {
  void props;
  const s = new Sketch(2203);
  const brim = ellipsePoly(92, 113, 28, 6.5, 24);
  const crown = P(
    "79,111.5 81.8,98.6 84,96.2 88,95.6 92,96.3 96,95.6 100,96.2 102.2,98.6 105,111.5",
  );
  const hat = [brim, crown];
  s.pencil([214, 172.6], [236, 172.6]);
  s.pencil([40, 172.6], [56, 172.6]);

  // Canvas body, leather straps and handle, the cast shadow, a lake on the map.
  const outer = P("123,119 124,106 132,97 146,94 160,97 167,106 168,118");
  const inner = P("128,119 129,108 136,101 146,98.5 156,101 163,108 163,118");
  s.wash(
    P(
      "64,124 76,110 84,108 198,105 206,109 210,120 210.5,150 208,164 202,171 186,172.5 130,174.5 72,171.5 64,166 61.5,150 62,134",
    ),
    "stone",
    0.6,
    1,
  );
  s.wash(
    [
      P("121.5,122 130,122 131,173 122.5,173"),
      P("161.5,121 170.5,121 169.5,172 161,172"),
      [...curve(outer), ...curve(inner).reverse()],
    ],
    "brass",
    0.8,
    0.6,
  );
  s.wash(
    P("68,172 130,175 204,172 226,173.5 222,178 130,179.5 64,176.5"),
    "blue",
    0.45,
    1,
  );
  s.wash(ellipsePoly(79, 191, 5.2, 2.2, 12), "blue", 0.8, 0.4);

  // Top panel: back edge, front seam, zip and its pull.
  s.stroke(P("84,108 140,106.5 198,105"), { w: 1.2, hide: hat });
  s.stroke(P("72,122 130,122 188,120"), { w: S, hide: hat });
  s.stroke(P("80,115 140,114 194,112.5"), { w: D, soft: true, hide: hat });
  s.stroke(P("182,113.2 182.6,119.6"), { w: D });
  s.ellipse(182.7, 121, 1.3, 1.3, { w: D });
  // Body, the rounded end, the leather base.
  s.stroke(P("84,108 74,111 66,120 62,134 62,158 66,168 72,171"), {
    w: C,
    hide: hat,
  });
  s.twice(P("72,171 130,173.5 186,172"), { w: 1.5 });
  s.stroke(P("188,120 190,146 186,172"), { w: S });
  s.stroke(P("188,120 192,111 198,105"), { w: S });
  s.stroke(P("198,105 205,108 209,118 210,150 208,164 202,171 186,172"), {
    w: C,
  });
  s.stroke(P("194,114 202,113 205,122 206,150 204,162 198,166"), {
    w: D,
    soft: true,
  });
  s.stroke(P("62,157 130,162 189,160"), { w: S });
  // Straps, their buckles, the handle.
  for (const [l, r] of [
    ["122,122 121,147 123,173", "130,122 129,147 131,173"],
    ["162,121 163,147 161,172", "170,121 171,147 169,172"],
  ]) {
    s.stroke(P(l), { w: S });
    s.stroke(P(r), { w: S });
  }
  for (const [x, y] of P("126,122 166,121")) {
    s.poly(rectPoly(x - 6, y - 3, 12, 7), {
      w: S,
      closed: true,
      overshoot: 0.3,
    });
    s.ellipse(x, y + 0.5, 0.9, 0.9, { w: D });
  }
  s.stroke(outer, { w: 1.3 });
  s.stroke(inner, { w: S });
  // Shade: the far end, the belly, under the brim.
  s.hatch(
    P(
      "190,121 195,110 205,108 209,118 210,150 208,164 202,171 188,171 190,146",
    ),
    { angle: SHADE, gap: 3 },
  );
  s.hatch(P("63,158 130,163 188,160.5 186.5,171 130,173 72,170.5 65,166"), {
    angle: SHADE,
    gap: 3.6,
    soft: true,
  });
  s.hatch(P("100,119.4 118.5,117.6 118.2,121.4 100,122.4"), {
    angle: SHADE,
    gap: 2.2,
    soft: true,
  });

  // The hat: brim in front, its back half behind the crown, a dark band.
  s.ellipse(92, 113, 28, 6.5, { from: -0.15, sweep: Math.PI + 0.3, w: C });
  s.ellipse(92, 113, 28, 6.5, { from: Math.PI - 0.05, sweep: 1.0, w: S });
  s.ellipse(92, 113, 28, 6.5, { from: 2 * Math.PI - 0.98, sweep: 1.0, w: S });
  s.line(crown[0], crown[1], { w: C, overshoot: 0 });
  s.stroke(crown.slice(1, 8), { w: C, taper: 0.4 });
  s.line(crown[7], crown[8], { w: C, overshoot: 0 });
  s.stroke(P("91.8,97.6 92.1,100.8"), { w: D, soft: true });
  s.stroke(P("80.4,105.4 92,106.3 103.6,105.4"), { w: S });
  s.hatch(P("80.6,105.8 103.4,105.8 104.8,111.2 79.2,111.6"), {
    angle: SHADE,
    gap: 1.6,
    w: 0.5,
    inset: 0.4,
  });
  s.hatch(P("97.5,96 100.2,96.4 102.2,98.8 104.7,105.4 99.6,106 99.4,100"), {
    angle: SHADE,
    gap: 2.4,
    inset: 0.8,
  });

  // The map, fan-folded and half open: a lake, a road, a place.
  const top = P("70,182 90,178 110,182 130,178 150,182");
  const bot = P("66,199 86,195 106,199 126,195 146,199");
  s.stroke(top, { w: S, smooth: false });
  s.stroke(bot, { w: 1.1, smooth: false });
  for (let i = 0; i < 5; i++)
    s.line(top[i], bot[i], {
      w: i % 4 === 0 ? S : D,
      soft: i % 4 !== 0,
      overshoot: 0,
    });
  for (const i of [1, 3])
    s.hatch([top[i], top[i + 1], bot[i + 1], bot[i]], {
      angle: SHADE,
      gap: 2.8,
      soft: true,
    });
  s.ellipse(79, 191, 5, 2.1, { w: D, soft: true });
  let road = "";
  const rp = curve(P("86,193 100,188 116,191 132,186"));
  for (let i = 0; i + 3 < rp.length; i += 5) road += seg(rp[i], rp[i + 3]);
  s.thinLines(road, 0.7, true);
  s.ellipse(134, 185.5, 1.8, 1.4, { w: D });

  return (
    <Art w={VIGNETTE_W} h={VIGNETTE_H}>
      <g transform="translate(0 -20)">{s.render()}</g>
    </Art>
  );
}

/* ------------------------------------------------------------------ */
/* Sailboat                                                            */
/* ------------------------------------------------------------------ */

/** A small sloop on a calm lake, the far shore low and quiet. */
export function Sailboat() {
  const s = new Sketch(3301);
  const Y = 128; // horizon
  s.pencil([14, Y], [32, Y]);
  s.pencil([252, Y], [266, Y]);

  const hull = P(
    "113,141.5 148,144.6 186,138.6 181,146 177,151 148,152 120,150.5",
  );
  const sails = [
    P("146,45 146,135 116,136.5 122,108 133,78"),
    P("147,54 183,139 154,133 152,92"),
  ];
  const shore = spires(s, 36, 112, Y, 6.5, 4);

  // The far shore, the water near the horizon, the hull's reflection.
  s.wash(P("30,129.4 250,129.4 244,139 150,142 36,139"), "blue", 0.4, 1.2);
  s.wash(P("121,152 176,151.6 170,159 128,159.4"), "navy", 0.22, 0.8);

  forest(s, [shore], Y);
  s.stroke(P("188,128 204,125.4 222,124 238,125.2 250,127.8"), {
    w: D,
    taper: 0.9,
    soft: true,
  });

  // Hull.
  s.twice(P("114,142 148,145 185,139"), { w: 1.5 });
  s.stroke(P("185,139 181,146 177,150"), { w: C });
  s.stroke(P("177,150 148,151.5 120,150"), { w: C });
  s.line([120, 150], [114, 142], { w: 1.3, overshoot: 0.3 });
  s.hatch(P("116,144 148,146.5 183,141 176,149.5 120,149.5"), {
    angle: 90,
    gap: 2,
    w: 0.5,
    inset: 0.6,
  });

  // Mast, boom, mainsail with its battens, a pennant.
  s.line([146, 145], [146, 43], { w: 1.3, overshoot: 0 });
  s.line([146, 134], [115, 136], { w: S, overshoot: 0.3 });
  s.stroke(P("146,47 133,78 122,108 116,135"), { w: 1.3 });
  for (const [x, y] of P("135.5,72 126.5,96 120,118"))
    s.line([x, y], [x + 7.5, y + 0.8], { w: 0.5, soft: true, overshoot: 0 });
  s.stroke(P("146,43 153,45 146,47.5"), { w: D, smooth: false });

  // Jib, toned with hatching laid along its luff.
  s.line([147, 55], [183, 139], { w: S, overshoot: 0 });
  s.stroke(P("147,56 152,92 154,132"), { w: 1.2 });
  s.line([154, 132], [182, 138.5], { w: S, overshoot: 0 });
  s.hatch(P("149,62 180,136 155,131 152,92"), {
    angle: 67,
    gap: 3.2,
    soft: true,
  });

  // Reflection: the hull's dark band, the mast as broken verticals.
  for (const [x0, x1, y] of [
    [122, 138, 153.6],
    [144, 172, 153.4],
    [127, 150, 156.6],
    [156, 168, 156.8],
  ])
    s.line([x0, y], [x1, y + s.rand(-0.2, 0.2)], {
      w: 0.8,
      taper: 0.8,
      overshoot: 0,
    });
  for (const [y0, y1] of [
    [160, 166],
    [169.5, 174],
    [177.5, 180.5],
    [184, 186],
  ])
    s.line([146.4, y0], [146.2, y1], { w: 0.6, soft: true, overshoot: 0 });

  // Still water: short level strokes, closer and shorter toward the far
  // shore, thinning out away from the boat.
  water(
    s,
    148,
    [
      [131.6, 40, 246, 7],
      [134.8, 44, 242, 8],
      [138.6, 40, 250, 9],
      [143, 46, 236, 10],
      [148, 52, 232, 12],
      [154.6, 70, 222, 13],
      [162, 76, 218, 15],
      [170.5, 86, 206, 16],
      [180, 96, 196, 18],
      [190.5, 108, 186, 20],
    ],
    { hide: [hull, ...sails, rectPoly(120, 150, 58, 10)] },
  );

  return (
    <Art w={VIGNETTE_W} h={VIGNETTE_H}>
      {s.render()}
    </Art>
  );
}

/* ------------------------------------------------------------------ */
/* Lighthouse                                                          */
/* ------------------------------------------------------------------ */

/** A lighthouse on its rocks, steady in calm weather, its lamp lit. */
export function Lighthouse() {
  const s = new Sketch(4409);
  const H = 166; // horizon
  s.pencil([140, 16], [140, 24.5]);
  s.pencil([252, H], [264, H]);

  // Three granite blocks, the lighthouse on the middle one.
  const A = P(
    "68,183 72,177.5 78,172.5 86,169 94,168 99,170.5 102,175.5 104,183",
  );
  const B = P(
    "100,183 102,175 104,167 108.5,163 112,157.5 117,153 122,151.5 158,151.5 163,152.5 168,156 171,161 175.5,166.5 177,183",
  );
  const Cr = P(
    "170,183 171,175.5 175,169 180.5,163.5 187,161 194,161.5 200.5,165 205.5,170 210,176 215,183",
  );
  const rock = [...A.slice(0, 6), ...B.slice(2, 12), ...Cr.slice(3)];
  // The lamp, the rock, the sea near the horizon.
  s.wash(rectPoly(131.5, 50.8, 17, 15), "brass", 0.85, 0.6);
  s.wash(rock, "stone", 0.7, 1);
  s.wash(P("30,166.6 250,166.6 246,176 140,179 34,176"), "blue", 0.4, 1.2);

  // Two long streaks of cloud drifting past.
  for (const [pts, w] of [
    ["168,42 200,40.8 236,41.6", 0.5],
    ["186,47.5 214,46.8 248,47.5", 0.45],
    ["202,53 222,52.6 240,53", 0.4],
  ] as const)
    s.stroke(P(pts), { w, taper: 0.95, soft: true });

  // Tower: tapered, drawn with a firm hand; one dark band.
  s.twice(P("122,151 125,114 128,77"), { w: 1.5 });
  s.twice(P("158,151 155,114 152,77"), { w: 1.5 });
  s.stroke(P("123.5,101 140,102.5 156.5,101"), { w: S });
  s.stroke(P("124.5,113 140,114.5 155.5,113"), { w: S });
  s.hatch(P("124,101.8 156.4,101.8 155.4,113.2 124.6,113.2"), {
    angle: SHADE,
    gap: 2.2,
    inset: 0.8,
  });
  s.hatch(P("147,101.8 156.4,101.8 155.4,113.2 147,113.2"), {
    angle: 60,
    gap: 2.4,
    inset: 0.8,
  });
  s.hatch(P("146,79 152,78 158,150 148,150"), {
    angle: 86,
    gap: 2.6,
    density: (k) => 1 - 0.45 * k,
  });
  s.stroke(P("135,151 135,142 140,137.5 145,142 145,151"), { w: S });
  s.poly(rectPoly(138.5, 86, 3.4, 6), { w: D, closed: true, overshoot: 0.2 });
  s.poly(rectPoly(138.8, 122, 3.2, 6), { w: D, closed: true, overshoot: 0.2 });

  // Gallery, lantern and cap.
  s.line([119, 76], [161, 76], { w: C, overshoot: 0.4 });
  s.line([121, 79], [159, 79], { w: S, overshoot: 0 });
  s.line([122, 66], [158, 66], { w: S, overshoot: 0 });
  let rail = "";
  for (let x = 124.5; x < 158; x += 4.2) rail += seg([x, 66.5], [x, 75.5]);
  s.thinLines(rail, 0.55);
  s.line([131, 66], [131, 50.5], { w: 1, overshoot: 0 });
  s.line([149, 66], [149, 50.5], { w: 1, overshoot: 0 });
  s.line([137, 64.5], [137, 51.5], { w: 0.5, soft: true, overshoot: 0 });
  s.line([143, 64.5], [143, 51.5], { w: 0.5, soft: true, overshoot: 0 });
  s.stroke(P("128,50 132,44 140,39.5 148,44 152,50"), { w: C });
  s.line([127, 50.5], [153, 50.2], { w: 1.1, overshoot: 0.3 });
  s.hatch(P("145,43 148,44 151,49.6 144,49.6"), {
    angle: SHADE,
    gap: 1.8,
    inset: 0.4,
  });
  s.ellipse(140, 36.6, 2, 2, { w: 0.8 });
  s.line([140, 34.4], [140, 27], { w: D, overshoot: 0 });

  // Rock: faceted blocks, the faces turned from the light hatched, the
  // deepest shade cross-hatched at the waterline.
  const flat = { w: C, smooth: false } as const;
  s.stroke(A, flat);
  s.stroke(B.slice(2, 7), { ...flat, hide: [A] });
  s.stroke(B.slice(7, 13), { ...flat, hide: [Cr] });
  s.stroke(Cr, flat);
  s.line([120, 151.5], [160, 151.5], { w: 1.3, overshoot: 0.3 });
  s.stroke(P("94,168 96.5,175 95.5,183"), { w: S, smooth: false });
  s.stroke(P("117,153 115,163 117.5,172 116,183"), {
    w: D,
    soft: true,
    smooth: false,
  });
  s.stroke(P("158,151.5 163.5,160 165,168 163.5,183"), {
    w: S,
    smooth: false,
  });
  s.stroke(P("187,161 190,170 188.5,183"), { w: S, smooth: false });
  s.hatch(P("94.6,168.6 99,170.6 102,175.6 103.6,182.6 96,182.6 97,175"), {
    angle: SHADE,
    gap: 2.8,
    soft: true,
  });
  s.hatch(
    P(
      "158.8,152.2 163,152.8 168,156.2 171,161.2 175,166.6 172,170.5 170.4,182.6 164,182.6 165.5,168 164,160",
    ),
    { angle: SHADE, gap: 2.8 },
  );
  s.hatch(
    P(
      "187.6,161.4 194,161.8 200.5,165.2 205.5,170.2 210,176 214.4,182.6 189,182.6 190.6,170",
    ),
    { angle: SHADE, gap: 2.8 },
  );
  s.hatch(P("191,174 209,175 214.4,182.6 189.2,182.6"), {
    angle: 60,
    gap: 2.8,
  });

  // Sea: a horizon either side of the rock, a line where rock meets water,
  // then short level strokes widening toward us.
  s.line([30, H], [101, H], { w: D, soft: true, overshoot: 0 });
  s.line([201, H], [250, H], { w: D, soft: true, overshoot: 0 });
  for (const [x0, x1] of [
    [72, 94],
    [99, 130],
    [136, 160],
    [167, 188],
    [194, 213],
  ])
    s.line([x0, 183.4], [x1, 183.6], { w: 0.8, taper: 0.8, overshoot: 0 });
  water(
    s,
    140,
    [
      [169.6, 34, 246, 7],
      [173.2, 40, 240, 8],
      [177.2, 36, 244, 9],
      [188, 48, 232, 12],
      [194.2, 56, 224, 14],
      [201.4, 70, 212, 16],
      [209.5, 90, 192, 18],
    ],
    { hide: [rock] },
  );

  return (
    <Art w={VIGNETTE_W} h={VIGNETTE_H}>
      {s.render()}
    </Art>
  );
}

/* ------------------------------------------------------------------ */
/* Bridge                                                              */
/* ------------------------------------------------------------------ */

/** A humpbacked stone footbridge over a stream, and its reflection. */
export function Bridge() {
  const s = new Sketch(5503);
  const W0 = 150; // water level at the arch
  const intra = ellipsePoly(140, W0, 34, 38, 18, Math.PI, 2 * Math.PI);
  const extra = ellipsePoly(140, W0, 44, 47, 18, Math.PI, 2 * Math.PI);
  s.pencil([140, 83], [140, 91.5]);
  s.pencil([12, 139], [26, 139]);

  // Stone, the stream, the shade under the arch and its reflection.
  s.wash(
    P(
      "58,127 98,105 140,95 182,105 222,127 224,140 176,150 172,126 140,113 108,126 104,150 56,141",
    ),
    "stone",
    0.7,
    1,
  );
  s.wash(
    P("106,151 174,151 188,168 202,186 211,197 72,197 79,186 93,168"),
    "blue",
    0.45,
    1,
  );
  s.wash(
    P(
      "107,150 111,133 122,121 140,113.5 158,121 169,133 173,150 162,163 140,168 118,163",
    ),
    "blue",
    0.35,
    0.8,
  );

  // Arch ring with its voussoirs, the keystone a little firmer.
  s.twice(intra, { w: 1.5 });
  s.stroke(extra, { w: S });
  for (let k = 1; k < 9; k++) {
    const a = Math.PI + (k * Math.PI) / 9,
      key = k === 4 || k === 5;
    s.line(
      [140 + Math.cos(a) * 34.6, W0 + Math.sin(a) * 38.6],
      [140 + Math.cos(a) * 43.4, W0 + Math.sin(a) * 46.4],
      { w: key ? S : D, soft: !key, overshoot: 0 },
    );
  }
  // Parapet, sloping down into the banks at both ends.
  s.twice(P("58,127 98,105 140,95 182,105 222,127"), { w: C });
  s.stroke(P("62,130 99,109 140,99.5 181,109 218,130"), { w: S });
  s.line([58, 127], [56.5, 141], { w: 1.3, overshoot: 0 });
  s.line([222, 127], [223.5, 140], { w: 1.3, overshoot: 0 });
  // A few dressed stones near each end, never all of them: bed joints
  // and the odd upright joint, mirrored about the crown.
  for (const m of [1, -1]) {
    const X = (x: number) => (m > 0 ? x : 280 - x);
    const joint = { w: 0.5, soft: true, taper: 0.85, overshoot: 0 };
    for (const [x0, x1, y] of [
      [66, 84, 133.6],
      [63, 78, 139.8],
      [81, 94, 139.7],
    ])
      s.line([X(x0), y], [X(x1), y - 0.2], joint);
    for (const [x, y] of [
      [74.5, 128.8],
      [79.5, 134.6],
      [88, 134.5],
    ])
      s.line([X(x), y], [X(x) + m * 0.2, y + 4.4], joint);
  }

  // Shade under the arch, deepest at the crown.
  s.hatch(intra, {
    angle: 0,
    gap: 2,
    density: (k) => 1.3 - k * 2,
  });
  // Its reflection: the arch again, broken by the water.
  const refl = ellipsePoly(140, W0 + 1.5, 34, 30, 16, 0.12, Math.PI - 0.12);
  for (const [a, b] of [
    [0, 4],
    [5, 8],
    [9, 12],
    [13, 17],
  ])
    s.stroke(refl.slice(a, b), { w: D, soft: true });
  s.hatch(ellipsePoly(140, W0 + 1, 30, 14, 12, 0.2, Math.PI - 0.2), {
    angle: 0,
    gap: 2.6,
    soft: true,
  });

  // Banks: the far edge of the grass, the stream widening toward us.
  s.stroke(P("24,139 56,141 86,146 106,150"), { w: 1 });
  s.stroke(P("174,150 196,146 224,140 256,136"), { w: 1 });
  s.stroke(P("106,151 99,160 93,167 86,177 79,187 72,196"), { w: 1.1 });
  s.stroke(P("174,151 182,160 188,168 195,177 203,187 211,197"), { w: 1.1 });
  water(
    s,
    140,
    [
      [156, 102, 178, 8],
      [161, 98, 182, 9],
      [167, 94, 186, 10],
      [174, 90, 192, 12],
      [182, 84, 198, 13],
      [191, 78, 204, 15],
    ],
    { w: 0.6 },
  );

  // A tree on the far bank, reeds and grass.
  tree(
    s,
    P(
      "231,100 238,96 245.5,95.2 253,96.8 258.5,100.6 262,106.5 261.4,113 257,118.4 249,121.6 240,122 231.5,120.6 225.6,116.4 223.4,110.2 225.4,104.2",
    ),
    [243, 137.5],
  );
  for (const q of P("44,140 206,143.5 90,164")) tuft(s, q, 5);
  for (const [x, y, h, lean] of [
    [98, 158, 14, -2],
    [101, 157, 10, 2],
    [185, 162, 13, 3],
  ])
    s.stroke(
      [
        [x, y],
        [x + lean * 0.4, y - h * 0.6],
        [x + lean, y - h],
      ],
      { w: D, taper: 0.9 },
    );

  return (
    <Art w={VIGNETTE_W} h={VIGNETTE_H}>
      <g transform="translate(0 -18)">{s.render()}</g>
    </Art>
  );
}

/* ------------------------------------------------------------------ */
/* Path                                                                */
/* ------------------------------------------------------------------ */

/**
 * A birch: two gently bent edges, firm at the foot and fading upward, the
 * short dark marks of the bark, shade on its right. Returns its outline.
 */
function birch(
  s: Sketch,
  x: number,
  base: number,
  top: number,
  w0: number,
  w1: number,
  lean = 0,
  marks = 5,
): Pt[] {
  const bend = s.rand(-1.5, 1.5);
  const at = (u: number): Pt => [
    x + lean * u + bend * Math.sin(Math.PI * u),
    base + (top - base) * u,
  ];
  const half = (u: number) => (w0 + (w1 - w0) * u) / 2;
  const firm = w0 > 8 ? 1.3 : w0 > 5 ? 1 : 0.8;
  const edges: Pt[][] = [];
  for (const side of [-1, 1]) {
    const e = [0, 0.25, 0.5, 0.75, 1].map((u): Pt => {
      const [cx, cy] = at(u);
      return [cx + side * half(u), cy];
    });
    edges.push(e);
    s.stroke(e.slice(0, 3), { w: firm * (side > 0 ? 1.1 : 1), taper: 0.6 });
    s.stroke(e.slice(2, 4), { w: firm * 0.75, taper: 0.8 });
    s.stroke(e.slice(3), { w: 0.5, taper: 0.95, soft: true });
  }
  for (let i = 0; i < marks; i++) {
    const u = (i + s.rand(0.25, 0.75)) / (marks + 1);
    const [cx, cy] = at(u),
      h = half(u),
      side = i % 2 ? 1 : -1,
      len = h * s.rand(0.6, 1.05);
    s.stroke(
      [
        [cx + side * h, cy],
        [cx + side * (h - len), cy + s.rand(-0.3, 0.3)],
      ],
      { w: Math.min(1.5, 0.65 + h * 0.18), taper: 0.7, smooth: false },
    );
  }
  if (w0 > 7)
    s.hatch(
      [
        at(0.02).map((v, k) => (k ? v : v + half(0.02) * 0.2)) as Pt,
        at(0.02).map((v, k) => (k ? v : v + half(0.02))) as Pt,
        at(0.7).map((v, k) => (k ? v : v + half(0.7))) as Pt,
        at(0.7).map((v, k) => (k ? v : v + half(0.7) * 0.2)) as Pt,
      ],
      { angle: 92, gap: 1.8, inset: 0.4, soft: true },
    );
  return [...edges[0], ...edges[1].reverse()];
}

/** A path winding between birches toward a clearing full of light. */
export function Path() {
  const s = new Sketch(6604);
  const H = 112; // horizon
  s.pencil([26, H], [44, H]);
  s.pencil([252, H], [264, H]);

  // Birches, the near ones tall at the edges of the picture, all fading
  // upward into the paper.
  const trunks = [
    birch(s, 62, 204, 10, 10, 4.5, 4, 9),
    birch(s, 80, 196, 30, 5.5, 2.8, 7, 6),
    birch(s, 101, 178, 48, 6, 3.2, 2, 6),
    birch(s, 214, 206, 8, 11, 5, -5, 9),
    birch(s, 238, 170, 46, 5.5, 3.2, -2, 6),
  ];
  // A few fine branches, rising, near the tops.
  for (const b of [
    "64,64 56,52 50,44",
    "64.5,46 71,36 76,30",
    "83,62 90,52 94,46",
    "103,78 108,68 111,62",
    "211.5,54 219,44 225,36",
    "210.5,72 203,62 198,56",
    "237,86 240,74 242,66",
  ])
    s.stroke(P(b), { w: 0.55, taper: 0.9, soft: true });

  // The far treeline, open where the path goes through.
  const far = [spires(s, 60, 134, H, 5.6, 2), spires(s, 166, 246, H, 6, 3)];
  forest(
    s,
    far.flatMap((t) => visible(t, trunks, false)),
    H,
    1.7,
  );

  // The path: centre line and width in perspective, fading toward us.
  const ys = [206, 190, 170, 152, 136, 124, 115];
  const cs = [150, 146, 158, 166, 156, 148, 150];
  const ws = [104, 74, 46, 30, 18, 10, 5];
  const L = ys.map((y, i): Pt => [cs[i] - ws[i] / 2, y]);
  const R = ys.map((y, i): Pt => [cs[i] + ws[i] / 2, y]);
  s.wash([...L.slice(0, 5), ...R.slice(0, 5).reverse()], "stone", 0.5, 1);
  s.wash(
    [...L.slice(3), [132, H + 0.6], [168, H + 0.6], ...R.slice(3).reverse()],
    "brass",
    0.85,
    0.8,
  );
  s.stroke(L.slice(1), { w: S, taper: 0.9 });
  s.stroke(R.slice(1), { w: S, taper: 0.9 });
  s.line(L[0], L[1], { w: 0.5, soft: true, overshoot: 0 });
  s.line(R[0], R[1], { w: 0.5, soft: true, overshoot: 0 });
  let ruts = "";
  for (const [x, y, l] of [
    [146, 182, 7],
    [158, 162, 5],
    [157, 144, 4],
  ])
    ruts += seg([x, y], [x + l, y + 0.2]);
  s.thinLines(ruts, 0.6, true);
  for (const q of P("56,204 98,178 118,172 184,166 208,206 244,170"))
    tuft(s, q, 5);

  return (
    <Art w={VIGNETTE_W} h={VIGNETTE_H}>
      {s.render()}
    </Art>
  );
}

/* ------------------------------------------------------------------ */
/* Notebook of questions                                               */
/* ------------------------------------------------------------------ */

/** A spiral notebook page with three questions, and a pen set down. */
export function QuestionsNotebook({ lang = "fr" }: { lang?: Language }) {
  const s = new Sketch(7703);
  const C0: Pt = [138, 114],
    R = -3;
  const on = (pts: Pt[]) => rot(pts, C0, R);
  const X0 = 58,
    X1 = 216,
    Y0 = 36,
    Y1 = 196;

  // The pen: an axis from tip to end, its outline hiding what it covers.
  const tip: Pt = [176, 150],
    end: Pt = [256, 196];
  const pen = (u: number, v = 0) => along(tip, end, u, v);
  const hide = [
    [
      pen(0),
      pen(0.1, 2.4),
      pen(0.3, 3.6),
      pen(1, 3.6),
      pen(1.02),
      pen(1, -3.6),
      pen(0.3, -3.6),
      pen(0.1, -2.4),
    ],
  ];

  // Shadow of the page and of the pen; the pen's navy body.
  s.wash(
    on(P("216,44 221,47 222,201 74,202 72,198.5 216,197")),
    "blue",
    0.45,
    1,
  );
  s.wash(
    [pen(0.12, 4.6), pen(1, 6.6), pen(1, 3.4), pen(0.1, 2.4)],
    "blue",
    0.4,
    0.8,
  );
  s.wash(
    [pen(0.3, 3.2), pen(0.98, 3.2), pen(0.98, -3.2), pen(0.3, -3.2)],
    "navy",
    0.3,
    0.6,
  );

  // Page, the pages beneath, a dog-eared corner.
  const [c0, c1, c2, c3, c4] = on([
    [X0, Y0],
    [X1, Y0],
    [X1, Y1 - 16],
    [X1 - 18, Y1],
    [X0, Y1],
  ]);
  const frame = { w: C, taper: 0.4, overshoot: 0.5 };
  s.line(c0, c1, frame);
  s.line(c1, c2, { ...frame, hide });
  s.line(c4, c0, frame);
  s.line(c4, c3, frame);
  s.line(c2, c3, { w: D, soft: true, hide });
  const flap = on(P(`${X1},${Y1 - 16} ${X1 - 13},${Y1 - 13} ${X1 - 18},${Y1}`));
  s.stroke(flap, { w: S, smooth: false, hide });
  s.hatch(flap, { angle: SHADE, gap: 2.2, soft: true });
  s.stroke(on(P(`${X1 + 3},${Y0 + 6} ${X1 + 3},${Y1 - 12}`)), {
    w: D,
    soft: true,
    hide,
  });
  s.stroke(on(P(`${X0 + 6},${Y1 + 3} ${X1 - 20},${Y1 + 3}`)), {
    w: D,
    soft: true,
  });

  // Spiral binding: every coil the same ring, over the top edge and
  // through its hole.
  for (let x = X0 + 10; x < X1 - 4; x += 13) {
    const [[hx, hy]] = on([[x + 0.6, Y0 + 2.6]]);
    s.ellipse(hx, hy, 1, 1, { w: 0.5, wobble: 0 });
    s.stroke(
      on(
        ellipsePoly(
          x + 0.6,
          Y0 - 1.2,
          1.9,
          5.4,
          16,
          -Math.PI / 2,
          1.5 * Math.PI,
        ),
      ),
      { w: 0.85, taper: 0.3, wobble: 0 },
    );
  }

  // Ruled lines and a margin, in pencil.
  const rules = [62, 88, 114, 140, 166];
  for (const y of rules) {
    const [a, b] = on([
      [X0 + 3, y],
      [X1 - 3, y],
    ]);
    s.pencil(a, b, 0, hide);
  }
  const [ma, mb] = on([
    [X0 + 22, Y0 + 14],
    [X0 + 22, Y1 - 4],
  ]);
  s.pencil(ma, mb);

  // The pen itself: tip, grip, barrel, clip, shade along its underside.
  s.stroke([pen(0.1, 2.4), pen(0.3, 3.6), pen(0.98, 3.6)], {
    w: S,
    smooth: false,
  });
  s.stroke([pen(0.1, -2.4), pen(0.3, -3.6), pen(0.98, -3.6)], {
    w: 1.2,
    smooth: false,
  });
  s.stroke([tip, pen(0.1, 2.4)], { w: 0.8, smooth: false });
  s.stroke([tip, pen(0.1, -2.4)], { w: 0.8, smooth: false });
  s.stroke([pen(0.98, 3.6), pen(1.02), pen(0.98, -3.6)], { w: S });
  s.line(pen(0.3, 3.6), pen(0.3, -3.6), { w: 0.8, overshoot: 0 });
  s.line(pen(0.62, 3.6), pen(0.62, -3.6), { w: D, overshoot: 0 });
  s.stroke([pen(0.64, 1.2), pen(0.92, 1.2), pen(0.94, 0.4)], { w: D });
  s.hatch([pen(0.31, 3.3), pen(0.97, 3.3), pen(0.97, 1.4), pen(0.31, 1.4)], {
    angle: SHADE,
    gap: 1.8,
    inset: 0.3,
  });

  // One brass underline, under the question that matters most.
  const [u0, u1] = on([
    [X0 + 27, 145],
    [X0 + (lang === "fr" ? 136 : 124), 144],
  ]);
  const lines =
    lang === "fr"
      ? ["Quand?", "Combien?", "Dans quel ordre?"]
      : ["When?", "How much?", "In what order?"];
  return (
    <Art w={VIGNETTE_W} h={VIGNETTE_H}>
      {s.render()}
      <path
        d={compact(
          new Pen(77).stroke([u0, along(u0, u1, 0.5, 0.6), u1], {
            w: 1.3,
            wobble: 0.1,
          }),
        )}
        fill="var(--brass, #a8875a)"
        opacity={0.8}
      />
      {lines.map((l, k) => {
        const [[x, y]] = on([[X0 + 27, rules[k + 1] - 4]]);
        return (
          <Note key={k} x={x} y={y} size={20} rotate={R}>
            {l}
          </Note>
        );
      })}
    </Art>
  );
}

/* ------------------------------------------------------------------ */
/* Letter                                                              */
/* ------------------------------------------------------------------ */

/** A sealed envelope over a folded letter, and a fountain pen. */
export function Letter({ lang = "fr" }: { lang?: Language }) {
  const s = new Sketch(8807);
  const EC: Pt = [150, 138],
    ER = -4;
  const env = rot(rectPoly(78, 94, 144, 88), EC, ER);
  const LC: Pt = [98, 76];
  const letter = rot(rectPoly(46, 30, 106, 92), LC, 7);

  // Fountain pen, nib down to the left.
  const nib: Pt = [206, 196],
    cap: Pt = [262, 116];
  const A = (u: number, v = 0) => along(nib, cap, u, v);
  const penShape: Pt[] = [
    nib,
    A(0.13, 2.8),
    A(0.2, 3.6),
    A(0.34, 4.6),
    A(0.98, 4.2),
    A(1.01),
    A(0.98, -4.2),
    A(0.34, -4.6),
    A(0.2, -3.6),
    A(0.13, -2.8),
  ];

  // The cream letter, the envelope's shadow, the pen's body, a gold nib.
  s.wash(letter, "stone", 0.45, 1);
  s.wash(
    rot(P("222,97 226.5,99 226.5,186.5 83,186.5 81,182 222,182"), EC, ER),
    "blue",
    0.45,
    0.8,
  );
  s.wash(penShape.slice(3, 8), "navy", 0.3, 0.6);
  s.wash([nib, A(0.13, 2.8), A(0.13, -2.8)], "brass", 0.95, 0.3);

  // The letter, folded in three, lying beneath: a few lines of script.
  const hideL = [env];
  s.poly(letter, { w: 1.1, closed: true, hide: hideL });
  for (const y of [60.7, 91.3]) {
    const [a, b] = rot(
      [
        [46, y],
        [152, y],
      ],
      LC,
      7,
    );
    s.line(a, b, { w: D, soft: true, hide: hideL });
  }
  for (const [k, y] of [42, 50.5, 66, 74.5, 83, 96, 104.5].entries()) {
    const x1 = k === 0 ? 92 : 138 - (k % 3) * 8;
    for (let x = k === 0 ? 58 : 56 + (k === 2 ? 8 : 0); x < x1 - 4;) {
      const L = Math.min(x1 - x, s.rand(12, 30));
      const pts: Pt[] = [];
      for (let u = 0; u < L; u += 3.5)
        pts.push([x + u, y + s.rand(-0.35, 0.35)]);
      pts.push([x + L, y]);
      s.stroke(rot(pts, LC, 7), {
        w: 0.6,
        taper: 0.85,
        soft: true,
        hide: hideL,
      });
      x += L + s.rand(3, 5);
    }
  }

  // The envelope, back up, flap closed.
  const hideP = [penShape];
  s.poly(env, { w: C, closed: true, hide: hideP, overshoot: 0.4 });
  const [fl, ft, fr] = rot(P("78,94 150,142 222,94"), EC, ER);
  s.stroke([fl, along(fl, ft, 0.5, -0.8), ft], { w: 1, hide: hideP });
  s.stroke([ft, along(ft, fr, 0.5, -0.8), fr], { w: 1, hide: hideP });

  // The fountain pen: nib with its slit, section, barrel, posted cap, clip.
  s.stroke([nib, A(0.08, 1.9), A(0.13, 2.8)], { w: S });
  s.stroke([nib, A(0.08, -1.9), A(0.13, -2.8)], { w: S });
  s.line(A(0.015), A(0.09), { w: 0.5, overshoot: 0 });
  s.ellipse(...A(0.095), 0.7, 0.7, { w: 0.5 });
  s.stroke([A(0.13, 2.8), A(0.2, 3.4), A(0.34, 4.6)], { w: 1 });
  s.stroke([A(0.13, -2.8), A(0.2, -3.4), A(0.34, -4.6)], { w: 1.1 });
  s.line(A(0.13, 2.8), A(0.13, -2.8), { w: 0.7, overshoot: 0 });
  s.line(A(0.34, 4.6), A(0.34, -4.6), { w: 1, overshoot: 0 });
  s.stroke([A(0.34, 4.6), A(0.66, 4.4), A(0.98, 4.2)], { w: 1.2 });
  s.stroke([A(0.34, -4.6), A(0.66, -4.4), A(0.98, -4.2)], { w: 1.3 });
  s.stroke([A(0.98, 4.2), A(1.01), A(0.98, -4.2)], { w: 1.1 });
  s.line(A(0.62, 4.5), A(0.62, -4.5), { w: 0.8, overshoot: 0 });
  s.line(A(0.64, 4.5), A(0.64, -4.5), { w: D, soft: true, overshoot: 0 });
  s.stroke([A(0.7, -4.4), A(0.72, -6), A(0.94, -6), A(0.96, -4.3)], {
    w: 0.8,
    smooth: false,
  });
  s.stroke([A(0.36, -2.4), A(0.6, -2.3)], { w: 0.5, soft: true, taper: 0.9 });
  s.stroke([A(0.67, -2.2), A(0.96, -2.1)], { w: 0.5, soft: true, taper: 0.9 });

  const [[tx, ty]] = rot([[150, 170]], EC, ER);
  return (
    <Art w={VIGNETTE_W} h={VIGNETTE_H}>
      {s.render()}
      <Note x={tx} y={ty} size={19} rotate={ER} anchor="middle">
        {t(lang, "Pour les enfants", "For the kids")}
      </Note>
    </Art>
  );
}

const t = (lang: Language, fr: string, en: string) => (lang === "fr" ? fr : en);

export const VIGNETTES = {
  House,
  TravelBag,
  Sailboat,
  Lighthouse,
  Bridge,
  Path,
  QuestionsNotebook,
  Letter,
} as const;
