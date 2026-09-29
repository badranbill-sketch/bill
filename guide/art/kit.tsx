import { curve, Pen, rectPoly, type Pt, type StrokeOpts } from "@/lib/ink";
import {
  Hatch,
  Ink,
  Pencil,
  Wash,
  type Tone,
} from "@/components/ink/primitives";

/*
 * The drawing kit for the guide's illustrations.
 *
 * Same hand as the website (components/ink/): a seeded Pen from lib/ink.ts,
 * three line weights, engraver's hatching with light from the upper left,
 * pale washes registered to the outline they tint, a few pencil marks. This
 * file gathers the helpers the site's drawings keep private, plus a small
 * pinhole camera for scenes in perspective, so every guide drawing is built
 * the same way.
 */

export { curve, rectPoly };
export type { Pt };

/** Line weights: contour, secondary, detail, hatching. */
export const C = 1.4,
  S = 0.9,
  D = 0.6,
  HW = 0.45;
/** One shade direction for every drawing ("/" falling right). */
export const SHADE = 120;

export const r1 = (n: number) => Math.round(n * 10) / 10;

/** "x,y x,y …" → points. */
export const P = (str: string): Pt[] =>
  str
    .trim()
    .split(/\s+/)
    .map((q) => q.split(",").map(Number) as Pt);

export const lerp = (a: Pt, b: Pt, t: number): Pt => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

/** A point `u` of the way from a to b, moved `v` to the side. */
export function along(a: Pt, b: Pt, u: number, v = 0): Pt {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    d = Math.hypot(dx, dy) || 1;
  return [a[0] + dx * u - (dy / d) * v, a[1] + dy * u + (dx / d) * v];
}

/** Rotate points by `deg` (clockwise, as SVG does) around `c`. */
export function rot(points: Pt[], [cx, cy]: Pt, deg: number): Pt[] {
  const a = (deg * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return points.map(([x, y]) => [
    cx + (x - cx) * c - (y - cy) * s,
    cy + (x - cx) * s + (y - cy) * c,
  ]);
}

export const shift = (points: Pt[], dx: number, dy: number): Pt[] =>
  points.map(([x, y]) => [x + dx, y + dy]);

/** Drop points that lie within `eps` of the line through their neighbours. */
export function simplify(pts: Pt[], eps: number): Pt[] {
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
export function compact(d: string, eps = 0.1): string {
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

export const seg = (a: Pt, b: Pt) =>
  `M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}`;

export const polyline = (q: Pt[]) =>
  `M${q.map((p) => `${r1(p[0])} ${r1(p[1])}`).join("L")}`;

export function inside([x, y]: Pt, poly: Pt[]) {
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
export function dense(points: Pt[], step = 1): Pt[] {
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
export function visible(points: Pt[], hide: Pt[][], smooth = true): Pt[][] {
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

/** The runs of segment a→b that lie inside `poly` and outside `hide`. */
export function within(
  a: Pt,
  b: Pt,
  poly: Pt[],
  hide: Pt[][] = [],
): [Pt, Pt][] {
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

/** Convex hull (monotone chain), for the silhouette of a solid. */
export function hull(pts: Pt[]): Pt[] {
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

/* ------------------------------------------------------------------ */
/* Perspective                                                         */
/* ------------------------------------------------------------------ */

export type V3 = [number, number, number];

/**
 * Pinhole projection (world units are centimetres, y up, the camera looks
 * along +z): eye position, focal length, where the horizon's centre lands.
 */
export function camera(eye: V3, f: number, cx: number, cy: number) {
  return ([x, y, z]: V3): Pt => {
    const dz = z - eye[2];
    return [cx + (f * (x - eye[0])) / dz, cy - (f * (y - eye[1])) / dz];
  };
}

/**
 * The same pinhole, tilted down by `pitch` degrees, for a view that takes
 * in both the far horizon and a table under the eyes without the stretch
 * of a very wide lens. Verticals converge gently downward, as they do when
 * you look down. The horizon lands at cy - f·tan(pitch).
 */
export function tilted(
  eye: V3,
  f: number,
  cx: number,
  cy: number,
  pitch: number,
) {
  const t = (pitch * Math.PI) / 180,
    c = Math.cos(t),
    sn = Math.sin(t);
  return ([x, y, z]: V3): Pt => {
    const dx = x - eye[0],
      dy = y - eye[1],
      dz = z - eye[2];
    const zc = -dy * sn + dz * c,
      yc = dy * c + dz * sn;
    return [cx + (f * dx) / zc, cy - (f * yc) / zc];
  };
}

/** Local → world: turn by `yaw` degrees about y, then move to `at`. */
export function place(at: V3, yaw: number) {
  const a = (yaw * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return ([x, y, z]: V3): V3 => [
    at[0] + x * c + z * s,
    at[1] + y,
    at[2] - x * s + z * c,
  ];
}

/** Points on a horizontal circle, for projected ellipses. */
export function ring(
  cx: number,
  y: number,
  cz: number,
  r: number,
  n = 36,
  from = 0,
  sweep = Math.PI * 2,
): V3[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = from + (sweep * i) / n;
    return [cx + Math.cos(t) * r, y, cz + Math.sin(t) * r] as V3;
  });
}

/** A flat box (x0..x1, y0..y1, z0..z1): its eight corners. */
export function box(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
) {
  return {
    b: [
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, y0, z1],
      [x0, y0, z1],
    ] as V3[],
    t: [
      [x0, y1, z0],
      [x1, y1, z0],
      [x1, y1, z1],
      [x0, y1, z1],
    ] as V3[],
  };
}

/* ------------------------------------------------------------------ */
/* The sketch                                                          */
/* ------------------------------------------------------------------ */

export type Line = StrokeOpts & { soft?: boolean; hide?: Pt[][] };
export type HatchOpts = NonNullable<Parameters<Pen["hatch"]>[1]> & {
  w?: number;
  soft?: boolean;
  hide?: Pt[][];
};

/**
 * A pen plus the layers it has drawn: all ink goes into one path, all
 * hatching of one weight into another, which keeps the markup small.
 */
export class Sketch {
  readonly p: Pen;
  private ink: string[] = [];
  private softInk: string[] = [];
  private thin = new Map<string, string[]>();
  private guides: string[] = [];
  private washes: { d: string; tone: Tone; strength: number }[] = [];
  /** An optional camera, for the *3 methods. */
  cam?: (v: V3) => Pt;
  constructor(seed: number, cam?: (v: V3) => Pt) {
    this.p = new Pen(seed);
    this.cam = cam;
  }
  rand(a: number, b: number) {
    return this.p.rand(a, b);
  }
  private put(d: string, soft?: boolean) {
    if (d) (soft ? this.softInk : this.ink).push(d);
  }
  stroke(points: Pt[], o: Line = {}) {
    const { soft, hide, ...so } = o;
    if (!hide || !hide.length) return this.put(this.p.stroke(points, so), soft);
    for (const run of visible(points, hide, so.smooth !== false))
      this.put(
        this.p.stroke(run, { ...so, smooth: false, overshoot: 0 }),
        soft,
      );
  }
  line(a: Pt, b: Pt, o: Line = {}) {
    if (o.hide && o.hide.length)
      return this.stroke([a, b], { ...o, smooth: false });
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
    const { w = HW, soft, hide, ...ho } = o;
    let d = this.p.hatch(poly, ho);
    if (hide && hide.length) {
      const out: string[] = [];
      for (const m of d.matchAll(
        /M(-?[\d.]+) (-?[\d.]+)Q(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)/g,
      )) {
        const a: Pt = [+m[1], +m[2]],
          b: Pt = [+m[5], +m[6]];
        for (const r of visible([a, b], hide, false))
          out.push(seg(r[0], r[r.length - 1]));
      }
      d = out.join("");
    }
    this.thinLines(d, w, soft);
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
  /** A solid ink shape (a small silhouette, a dark pane): filled, no outline. */
  fill(points: Pt[], soft = false) {
    this.put(
      `M${curve(points, true, 4)
        .map((p) => `${r1(p[0])} ${r1(p[1])}`)
        .join("L")}Z`,
      soft,
    );
  }
  /** Any thin stroked lines (water, ruled lines, balusters). */
  thinLines(d: string, w = 0.5, soft?: boolean) {
    if (!d) return;
    const k = `${w}|${soft ? 1 : 0}`;
    const list = this.thin.get(k);
    if (list) list.push(d);
    else this.thin.set(k, [d]);
  }
  pencil(a: Pt, b: Pt, extend = 0) {
    this.guides.push(this.p.pencil(a, b, extend));
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

  /* 3-D versions, through the camera. */
  private C(v: V3): Pt {
    if (!this.cam) throw new Error("Sketch has no camera");
    return this.cam(v);
  }
  p3 = (v: V3) => this.C(v);
  s3(pts: V3[], o: Line = {}) {
    this.stroke(
      pts.map((v) => this.C(v)),
      o,
    );
  }
  l3(a: V3, b: V3, o: Line = {}) {
    this.line(this.C(a), this.C(b), o);
  }
  h3(pts: V3[], o: HatchOpts = {}) {
    this.hatch(
      pts.map((v) => this.C(v)),
      o,
    );
  }
  w3(pts: V3[], tone: Tone = "blue", strength = 1, spread = 1) {
    this.wash(
      pts.map((v) => this.C(v)),
      tone,
      strength,
      spread,
    );
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

/* ------------------------------------------------------------------ */
/* Recurring motifs                                                    */
/* ------------------------------------------------------------------ */

/**
 * Water: rows of short level dashes, sparser away from `cx`. Each row is
 * [y, x0, x1, dash length]; dashes under `hide` are left out.
 */
export function water(
  s: Sketch,
  cx: number,
  rows: number[][],
  o: { w?: number; hide?: Pt[][]; keep?: number } = {},
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
      if (s.rand(0, 1) < far * far * (o.keep ?? 0.85)) continue;
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

/**
 * A conifer treeline: one even row of small spires (heights ±15%) on a
 * gentle rise, smaller toward both ends. Returns its outline.
 */
export function spires(
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
export function forest(
  s: Sketch,
  runs: Pt[][],
  y: number,
  gap = 1.3,
  tint = 0.45,
) {
  const close = (r: Pt[]) =>
    [...r, [r[r.length - 1][0], y], [r[0][0], y]] as Pt[];
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
    tint,
    0.4,
  );
  for (const r of runs)
    s.stroke(r, { w: 0.5, taper: 0.9, soft: true, smooth: false });
  for (const r of runs)
    s.hatch(close(r), { angle: 90, gap, inset: 0.4, w: 0.35, soft: true });
}

/** A ground line that breaks up and thins toward both ends. */
export function ground(s: Sketch, x0: number, x1: number, y: number, w = 1) {
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

const ellipseRing = ([cx, cy]: Pt, rx: number, ry: number): Pt[] =>
  Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as Pt;
  });

/** A small tuft of grass: three fine blades. */
export function tuft(s: Sketch, [x, y]: Pt, h = 5) {
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
 * A single spruce, as on the site's ride: a straight trunk and tiers of
 * short straight strokes angled down, a little uneven, doubled on the side
 * away from the light; a pale tint inside its silhouette. Returns the
 * silhouette, to hide what stands behind it.
 */
export function spruce(s: Sketch, [x, y]: Pt, h: number, w = 1): Pt[] {
  const top = y - h;
  s.stroke(
    [
      [x, y + 1],
      [x, top],
    ],
    { w: 0.75 * w, taper: 0.85, smooth: false },
  );
  const rows = Math.max(5, Math.round(h / 4.6));
  const reachAt = (k: number) => 1 + h * 0.2 * k;
  let marks = "",
    soft = "";
  const L: Pt[] = [],
    R: Pt[] = [];
  for (let i = 0; i < rows; i++) {
    const k = (i + 0.7) / rows; // 0 at the tip, 1 at the foot
    const yy = top + k * h * 0.9;
    for (const side of [-1, 1]) {
      const reach = reachAt(k) * s.rand(0.82, 1.12) * (side > 0 ? 1.04 : 1);
      const drop = reach * s.rand(0.4, 0.52);
      marks += `M${r1(x + side * 0.3)} ${r1(yy)}L${r1(x + side * reach)} ${r1(yy + drop)}`;
      (side < 0 ? L : R).push([x + side * reach, yy + drop]);
      // the shade side gets a second, shorter stroke just below
      if (side > 0 && h > 36 && i > 0 && i % 2 === 1) {
        const r2 = reach * s.rand(0.55, 0.8);
        soft += `M${r1(x + 0.4)} ${r1(yy + 2)}L${r1(x + r2)} ${r1(yy + 2 + r2 * 0.44)}`;
      }
    }
  }
  s.thinLines(marks, 0.6 * w);
  s.thinLines(soft, 0.5, true);
  const sil: Pt[] = [[x, top], ...R, [x, y], ...L.reverse()];
  s.wash(sil, "blue", 0.32, 0.8);
  return sil;
}

/**
 * A small figure at architectural scale, seen from behind: a filled ink
 * silhouette with adult proportions (about 7.5 heads), no face. `stride`
 * opens the legs as if walking; `coat` lengthens the jacket; `lean` tips
 * the body a little forward.
 */
export function figure(
  s: Sketch,
  [x, y]: Pt,
  h: number,
  o: { stride?: number; coat?: boolean; lean?: number; wide?: number } = {},
) {
  const u = h / 7.5,
    st = (o.stride ?? 0.4) * u,
    ln = (o.lean ?? 0) * u,
    wd = o.wide ?? 1;
  // x offset grows with height for the lean
  const X = (dx: number, v: number): Pt => [x + dx * wd + (ln * v) / h, y - v];
  const hem = o.coat ? 2.7 * u : 3.4 * u;
  const body: Pt[] = [
    X(-0.28 * u, 6.55 * u), // neck
    X(-0.95 * u, 6.2 * u), // left shoulder
    X(-1.05 * u, 5.7 * u),
    X(-0.98 * u, 4.2 * u), // left arm outer
    X(-0.95 * u, 3.55 * u), // hand
    X(-0.78 * u, 3.5 * u),
    X(-0.74 * u, 4.6 * u), // arm inner, back to the body
    X(-0.8 * u, hem), // hem
    X(-0.5 * u - st * 0.5, hem - 0.1 * u),
    X(-0.42 * u - st, 0.12 * u), // left foot
    X(-0.1 * u - st, 0),
    X(-0.06 * u - st * 0.3, hem - 0.4 * u),
    X(0.06 * u + st * 0.3, hem - 0.4 * u), // crotch
    X(0.1 * u + st, 0),
    X(0.42 * u + st, 0.12 * u), // right foot
    X(0.5 * u + st * 0.5, hem - 0.1 * u),
    X(0.8 * u, hem),
    X(0.74 * u, 4.6 * u),
    X(0.78 * u, 3.5 * u),
    X(0.95 * u, 3.55 * u),
    X(0.98 * u, 4.2 * u),
    X(1.05 * u, 5.7 * u),
    X(0.95 * u, 6.2 * u), // right shoulder
    X(0.28 * u, 6.55 * u),
  ];
  s.fill(body);
  const [hx, hy] = X(0, 7.0 * u);
  s.fill(ellipseRing([hx, hy], 0.42 * u, 0.5 * u));
}

/**
 * A birch trunk (as in the site's path vignette): two tapered edges that
 * thin upward and fade into the paper, a few dark bark marks, a fine shade
 * hatch on the right. Returns its outline, to hide what stands behind it.
 */
export function birch(
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
      { w: Math.min(1.6, 0.65 + h * 0.18), taper: 0.7, smooth: false },
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

/**
 * A deciduous tree, from a hand-placed canopy outline (clockwise, starting
 * just past the upper left): one smooth contour with a few gentle lobes,
 * left open where the light strikes and where the trunk enters; engraved
 * shade on its lower right; a tapered trunk that forks into the crown.
 */
export function tree(s: Sketch, crown: Pt[], [bx, by]: Pt, tint = 0.35) {
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
 * Loose foliage: small leaf marks scattered in an oval, denser toward the
 * shaded lower right, with a pale tint behind them. For birches and
 * shrubs seen at a distance, where a closed canopy outline would read as
 * a cartoon.
 */
export function leaves(
  s: Sketch,
  [cx, cy]: Pt,
  rx: number,
  ry: number,
  n: number,
  tint = 0.28,
) {
  let d = "";
  const ring: Pt[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const k = 0.78 + 0.22 * Math.sin(a * 3 + cx);
    ring.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  s.wash(ring, "blue", tint, 1.5);
  for (let i = 0; i < n; i++) {
    const a = s.rand(0, Math.PI * 2),
      r = Math.sqrt(s.rand(0, 1));
    const x = cx + Math.cos(a) * rx * r,
      y = cy + Math.sin(a) * ry * r;
    // more marks where the shade falls (lower right)
    const shade = (x - cx) / rx + (y - cy) / ry;
    if (shade < -0.6 && s.rand(0, 1) < 0.6) continue;
    const len = s.rand(2, 3.6),
      ang = s.rand(0.35, 0.8);
    d += `M${r1(x)} ${r1(y)}L${r1(x + Math.cos(ang) * len)} ${r1(y + Math.sin(ang) * len)}`;
  }
  s.thinLines(d, 0.55, true);
}
