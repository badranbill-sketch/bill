/**
 * Geometry for the mountain ride: the route curve (arc length, lookups) and a
 * compact pen-and-ink toolkit for drawing a 6800-unit landscape.
 *
 * The drawing tools follow `Pen` in lib/ink.ts (tapered nib outlines to fill,
 * engraver's hatching, flat washes) with a steady hand: little wobble, no
 * overshoot. They write much shorter paths:
 * relative coordinates, a coarser step on long contours and every outline
 * wound the same way, so many strokes can share one <path> and still fill
 * where they overlap. Everything is seeded, so the server draws exactly the
 * same landscape on every request.
 */
import { curve as spline } from "@/lib/ink";

export type Pt = readonly [number, number];

export function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- the route ---------- */

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Catmull-Rom curve through the points, as an SVG path (for the route). */
export function smooth(points: readonly Pt[]) {
  let d = `M${r1(points[0][0])},${r1(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i],
      p1 = points[i],
      p2 = points[i + 1],
      p3 = points[i + 2] || p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r1(c1[0])},${r1(c1[1])} ${r1(c2[0])},${r1(c2[1])} ${r1(p2[0])},${r1(p2[1])}`;
  }
  return d;
}

export type Curve = { pts: Pt[]; len: number[]; total: number };

/** Dense samples of the Catmull-Rom curve, with cumulative arc length. */
export function curve(points: readonly Pt[], per = 24): Curve {
  const pts: Pt[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i],
      p1 = points[i],
      p2 = points[i + 1],
      p3 = points[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    for (let s = i ? 1 : 0; s <= per; s++) {
      const t = s / per,
        u = 1 - t;
      pts.push([
        u * u * u * p1[0] +
          3 * u * u * t * c1[0] +
          3 * u * t * t * c2[0] +
          t * t * t * p2[0],
        u * u * u * p1[1] +
          3 * u * u * t * c1[1] +
          3 * u * t * t * c2[1] +
          t * t * t * p2[1],
      ]);
    }
  }
  const len = [0];
  for (let i = 1; i < pts.length; i++)
    len.push(
      len[i - 1] +
        Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]),
    );
  return { pts, len, total: len[len.length - 1] };
}

/** Index and blend factor for an arc-length fraction (binary search). */
export function locate(c: Curve, frac: number): [number, number] {
  const target = Math.max(0, Math.min(1, frac)) * c.total;
  let lo = 1,
    hi = c.len.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (c.len[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  const k = (target - c.len[lo - 1]) / (c.len[lo] - c.len[lo - 1] || 1);
  return [lo, k];
}

export function pointOn(c: Curve, frac: number): Pt {
  const [i, k] = locate(c, frac);
  const a = c.pts[i - 1],
    b = c.pts[i];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
}

/** Point at an arc-length fraction of the Catmull-Rom curve through `points`. */
export function along(points: readonly Pt[], frac: number): Pt {
  return pointOn(curve(points), frac);
}

/** Fraction at which a left-to-right curve first reaches `x`. */
export function fracAtX(c: Curve, x: number) {
  const i = c.pts.findIndex((p) => p[0] >= x);
  if (i <= 0) return i === 0 ? 0 : 1;
  const a = c.pts[i - 1],
    b = c.pts[i];
  const k = (x - a[0]) / (b[0] - a[0] || 1);
  return (c.len[i - 1] + (c.len[i] - c.len[i - 1]) * k) / c.total;
}

/** Height of a left-to-right polyline at `x` (clamped at the ends). */
export function yAt(line: readonly Pt[], x: number) {
  if (x <= line[0][0]) return line[0][1];
  for (let i = 1; i < line.length; i++)
    if (line[i][0] >= x) {
      const [ax, ay] = line[i - 1],
        [bx, by] = line[i];
      return ay + ((by - ay) * (x - ax)) / (bx - ax || 1);
    }
  return line[line.length - 1][1];
}

/* ---------- compact path writing ---------- */

/** A delta in tenths of a unit, as short as SVG allows (".5", "-1.2", "3"). */
function tenths(d: number) {
  const a = Math.abs(d);
  const i = Math.floor(a / 10),
    f = a % 10;
  return (d < 0 ? "-" : "") + (f ? `${i || ""}.${f}` : String(i));
}

/** Numbers joined with only the separators the path grammar needs. */
function join(nums: string[]) {
  let out = "",
    prev = "";
  for (const s of nums) {
    if (out && s[0] !== "-" && !(s[0] === "." && prev.includes(".")))
      out += " ";
    out += s;
    prev = s;
  }
  return out;
}

/**
 * A polyline as `M x y l dx dy …` in relative coordinates. `dec` is 1 for
 * tenths (ink outlines) or 0 for whole units (washes).
 */
export function enc(pts: readonly Pt[], close = false, dec: 0 | 1 = 1) {
  const k = dec ? 10 : 1;
  const q = pts.map(([x, y]) => [Math.round(x * k), Math.round(y * k)]);
  const fmt = dec ? tenths : String;
  const nums: string[] = [];
  for (let i = 1; i < q.length; i++) {
    const dx = q[i][0] - q[i - 1][0],
      dy = q[i][1] - q[i - 1][1];
    if (dx || dy) nums.push(fmt(dx), fmt(dy));
  }
  return (
    `M${join([fmt(q[0][0]), fmt(q[0][1])])}` +
    (nums.length ? `l${join(nums)}` : "") +
    (close ? "z" : "")
  );
}

/** Short straight marks (hatching, rain, grass) as one relative path. */
export function marks(segs: [Pt, Pt][], dec: 0 | 1 = 0) {
  const k = dec ? 10 : 1;
  const fmt = dec ? tenths : String;
  let d = "",
    px = 0,
    py = 0;
  for (const [a, b] of segs) {
    const ax = Math.round(a[0] * k),
      ay = Math.round(a[1] * k),
      bx = Math.round(b[0] * k),
      by = Math.round(b[1] * k);
    if (ax === bx && ay === by) continue;
    d += d
      ? `m${join([fmt(ax - px), fmt(ay - py)])}`
      : `M${join([fmt(ax), fmt(ay)])}`;
    d += `l${join([fmt(bx - ax), fmt(by - ay)])}`;
    px = bx;
    py = by;
  }
  return d;
}

/* ---------- the nib ---------- */

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const sstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

function resample(points: readonly Pt[], step: number): Pt[] {
  const out: Pt[] = [points[0]];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      d = dist(a, b);
    let t = step - carry;
    while (t <= d) {
      out.push([
        a[0] + ((b[0] - a[0]) * t) / d,
        a[1] + ((b[1] - a[1]) * t) / d,
      ]);
      t += step;
    }
    carry = d - (t - step);
  }
  const last = points[points.length - 1];
  if (dist(out[out.length - 1], last) > step * 0.3) out.push(last);
  return out;
}

function area(p: readonly Pt[]) {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i],
      b = p[(i + 1) % p.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

export type NibOpts = {
  /** Widest nib width. */
  w?: number;
  /** 0 (blunt ends) to 1 (hairline ends). */
  taper?: number;
  /** Lateral tremor of the hand (kept at 0.3 or less: a steady hand). */
  wobble?: number;
  /** Extend both ends a little past the target. */
  overshoot?: number;
  /** Treat the points as a smooth curve (default) or a polyline. */
  smooth?: boolean;
  /** Longest sampling step along the line (world units). */
  step?: number;
};

export type HatchOpts = {
  angle?: number;
  gap?: number;
  jitter?: number;
  inset?: number;
  cross?: boolean;
  crossAt?: number;
  /** Break long lines into dashes of about this length. */
  dash?: number;
  /** Keep-probability across the lines, `u` from 0 to 1. */
  density?: (u: number) => number;
};

/** A seeded pen for the ride that writes compact paths. */
export class Nib {
  private r: () => number;
  constructor(seed = 1) {
    this.r = rng(seed);
  }
  rand(a = 0, b = 1) {
    return a + (b - a) * this.r();
  }
  jit([x, y]: Pt, k = 1): Pt {
    return [x + this.rand(-k, k), y + this.rand(-k, k)];
  }
  private noise(knots: number) {
    const v = Array.from({ length: knots + 2 }, () => this.r() * 2 - 1);
    return (x: number) => {
      const u = Math.min(0.9999, Math.max(0, x)) * knots;
      const i = Math.floor(u),
        s = (1 - Math.cos((u - i) * Math.PI)) / 2;
      return v[i] * (1 - s) + v[i + 1] * s;
    };
  }

  /** One pen stroke through the points, as a closed outline to fill. */
  stroke(points: readonly Pt[], o: NibOpts = {}): string {
    const w = o.w ?? 1.4,
      taper = o.taper ?? 0.7,
      wobble = Math.min(o.wobble ?? 0.15, 0.3);
    let p: Pt[] =
      points.length > 2 && o.smooth !== false
        ? spline(
            points.map((q) => [q[0], q[1]]),
            false,
            8,
          )
        : [...points];
    const os = o.overshoot ?? 0;
    if (os && p.length > 1) {
      const ext = (a: Pt, b: Pt, k: number): Pt => {
        const d = dist(a, b) || 1;
        return [a[0] + ((a[0] - b[0]) / d) * k, a[1] + ((a[1] - b[1]) / d) * k];
      };
      p = [
        ext(p[0], p[1], os * this.rand(0.3, 1)),
        ...p,
        ext(p[p.length - 1], p[p.length - 2], os * this.rand(0.3, 1)),
      ];
    }
    let len = 0;
    for (let i = 1; i < p.length; i++) len += dist(p[i - 1], p[i]);
    if (len < 0.5) return "";
    const s = resample(
      p,
      o.step
        ? Math.max(1, Math.min(o.step, len / 3))
        : Math.max(1.5, Math.min(6, len / 9)),
    );
    const n = s.length;
    const tremor = this.noise(Math.max(2, Math.round(len / 45)));
    const press = this.noise(Math.max(2, Math.round(len / 30)));
    const lo = 1 - taper;
    const left: Pt[] = [],
      right: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const a = s[Math.max(0, i - 1)],
        b = s[Math.min(n - 1, i + 1)];
      const d = dist(a, b) || 1;
      const nx = -(b[1] - a[1]) / d,
        ny = (b[0] - a[0]) / d;
      const profile =
        lo + (1 - lo) * sstep(0, 0.16, t) * (1 - sstep(0.7, 1, t));
      const half = Math.max(0.12, w * profile * (1 + 0.08 * press(t))) / 2;
      const off = wobble * tremor(t);
      const [x, y] = s[i];
      left.push([x + nx * (off + half), y + ny * (off + half)]);
      right.push([x + nx * (off - half), y + ny * (off - half)]);
    }
    const ring = [...left, ...right.reverse()];
    // One winding for every outline, so overlapping strokes in a path fill.
    if (area(ring) < 0) ring.reverse();
    return enc(ring, true);
  }

  /** A ruled line by hand: the faintest bow, barely past its ends. */
  line(a: Pt, b: Pt, o: NibOpts = {}): string {
    const d = dist(a, b);
    const bow = this.rand(-1, 1) * Math.min(0.6, d * 0.004);
    const mx = (a[0] + b[0]) / 2 - ((b[1] - a[1]) / (d || 1)) * bow;
    const my = (a[1] + b[1]) / 2 + ((b[0] - a[0]) / (d || 1)) * bow;
    return this.stroke([a, [mx, my], b], {
      overshoot: Math.min(0.8, d * 0.01),
      step: Math.max(2.5, Math.min(12, d / 4)),
      ...o,
    });
  }

  /** Straight segments drawn as separate strokes that meet at the corners. */
  poly(points: readonly Pt[], o: NibOpts & { closed?: boolean } = {}) {
    let out = "";
    const n = o.closed ? points.length : points.length - 1;
    for (let i = 0; i < n; i++)
      out += this.line(points[i], points[(i + 1) % points.length], o);
    return out;
  }

  /** A hand-drawn ellipse, true to its shape; the end just meets the start. */
  ellipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    o: NibOpts & { from?: number; sweep?: number } = {},
  ): string {
    const from = o.from ?? this.rand(0, Math.PI * 2);
    const sweep = o.sweep ?? Math.PI * 2 + this.rand(0.04, 0.1);
    const wob = this.noise(5);
    const k = Math.max(10, Math.round(((rx + ry) / 2) * 0.35));
    const pts: Pt[] = Array.from({ length: k + 1 }, (_, i) => {
      const t = i / k,
        a = from + sweep * t,
        m = 1 + 0.01 * wob(t);
      return [cx + Math.cos(a) * rx * m, cy + Math.sin(a) * ry * m];
    });
    return this.stroke(pts, { taper: 0.8, ...o });
  }

  /**
   * A long contour drawn as several strokes, the way a steady hand lifts and
   * starts again: pieces overlap a little, and rarely leave a small gap.
   */
  contour(
    points: readonly Pt[],
    o: NibOpts & { piece?: number; gaps?: number } = {},
  ): string {
    const dense = curve(points, 6);
    const piece = o.piece ?? 260;
    const count = Math.max(1, Math.round(dense.total / piece));
    let out = "";
    let from = 0;
    for (let i = 0; i < count; i++) {
      const to = i === count - 1 ? 1 : (i + 1 + this.rand(-0.15, 0.15)) / count;
      const gap = this.r() < (o.gaps ?? 0.05);
      const a = Math.max(0, from + (gap ? 4 : -4) / dense.total),
        b = Math.min(1, to + 3 / dense.total);
      const seg = dense.pts.filter((_, j) => {
        const f = dense.len[j] / dense.total;
        return f >= a && f <= b;
      });
      if (seg.length > 1)
        out += this.stroke(seg, {
          taper: 0.8,
          ...o,
          step: o.step ?? 10,
          smooth: false,
          w: (o.w ?? 1.4) * this.rand(0.94, 1.04),
        });
      from = to;
    }
    return out;
  }

  /**
   * Engraver's hatching inside a polygon: straight thin strokes, parallel and
   * evenly spaced, their ends kept just inside the outline.
   */
  hatch(poly: readonly Pt[], o: HatchOpts = {}): string {
    const gap = o.gap ?? 4,
      jitter = Math.min(o.jitter ?? 0.1, 0.2),
      inset = o.inset ?? 1.5;
    const segs: [Pt, Pt][] = [];
    const pass = (deg: number) => {
      const ang = (deg * Math.PI) / 180,
        c = Math.cos(ang),
        s = Math.sin(ang);
      const rot = poly.map(([x, y]) => [x * c + y * s, -x * s + y * c] as Pt);
      const back = ([x, y]: Pt): Pt => [x * c - y * s, x * s + y * c];
      const ys = rot.map((q) => q[1]);
      const y0 = Math.min(...ys),
        y1 = Math.max(...ys);
      for (
        let y = y0 + gap * this.rand(0.3, 1);
        y < y1;
        y += gap * this.rand(0.96, 1.04)
      ) {
        const yy = y + this.rand(-0.5, 0.5) * gap * jitter;
        if (o.density && this.r() > o.density((yy - y0) / (y1 - y0 || 1)))
          continue;
        const xs: number[] = [];
        for (let i = 0; i < rot.length; i++) {
          const [ax, ay] = rot[i],
            [bx, by] = rot[(i + 1) % rot.length];
          if ((ay <= yy && by > yy) || (by <= yy && ay > yy))
            xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax));
        }
        xs.sort((p, q) => p - q);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          const a = xs[k] + inset * this.rand(0.6, 1.3),
            b = xs[k + 1] - inset * this.rand(0.6, 1.3);
          if (b - a < 2) continue;
          const tilt = this.rand(-1, 1) * Math.min(0.3, (b - a) * 0.006);
          if (o.dash && b - a > o.dash * 1.4) {
            let x = a;
            while (x < b - 2) {
              const e = Math.min(b, x + o.dash * this.rand(0.6, 1.3));
              segs.push([back([x, yy - tilt]), back([e, yy + tilt])]);
              x = e + o.dash * this.rand(0.15, 0.5);
            }
          } else segs.push([back([a, yy - tilt]), back([b, yy + tilt])]);
        }
      }
    };
    pass(o.angle ?? 45);
    if (o.cross) pass((o.angle ?? 45) + (o.crossAt ?? 90));
    return marks(segs);
  }

  /** Faint construction line, extended a little past both ends. */
  pencil(a: Pt, b: Pt, extend = 4): string {
    const d = dist(a, b) || 1;
    const ux = (b[0] - a[0]) / d,
      uy = (b[1] - a[1]) / d;
    const e1 = extend * this.rand(0.4, 1.3),
      e2 = extend * this.rand(0.4, 1.3);
    return marks([
      [
        [a[0] - ux * e1, a[1] - uy * e1],
        [b[0] + ux * e2, b[1] + uy * e2],
      ],
    ]);
  }

  /** A closed shape just off the points, for a wash registered to its object. */
  blob(points: readonly Pt[], spread = 1.5, seg = 4): string {
    const loose = points.map((q) => this.jit(q, spread) as [number, number]);
    return enc(spline(loose, true, seg), true, 0);
  }
}

/* ---------- shapes ---------- */

/** The outline closed down to a base line, for a paper cut-out or a wash. */
export function closeDown(line: readonly Pt[], base: number): Pt[] {
  return [...line, [line[line.length - 1][0], base], [line[0][0], base]];
}

/** Summits of an outline: points higher (smaller y) than both neighbours. */
export function summits(line: readonly Pt[]) {
  return line.filter(
    (p, i) =>
      i > 0 &&
      i < line.length - 1 &&
      p[1] < line[i - 1][1] &&
      p[1] < line[i + 1][1],
  );
}
