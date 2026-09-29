/**
 * Hand-drawn ink geometry for the site's illustrations.
 *
 * Every drawing is built from a seeded pen, so the server draws exactly the
 * same lines on every request and nothing shifts between renders. Units are
 * the illustration's own viewBox units (about one CSS pixel at design size).
 *
 * - `stroke`/`line`/`poly`/`ellipse` return a closed outline to FILL: a
 *   nib stroke that swells in the middle and tapers at the ends. The hand
 *   is steady: a trained draughtsman's line, not a quick doodle.
 * - `hatch` and `pencil` return centre lines to STROKE thinly.
 * - `blob` returns a loose closed shape for a watercolour wash.
 */
export type Pt = [number, number];

/** mulberry32: small, fast, good enough for drawing. */
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

const f = (n: number) => String(Math.round(n * 10) / 10);
const pt = ([x, y]: Pt) => `${f(x)} ${f(y)}`;
const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Smooth 1-D value noise in [-1, 1] over [0, 1]. */
function noise(r: () => number, knots: number) {
  const v = Array.from({ length: knots + 2 }, () => r() * 2 - 1);
  return (x: number) => {
    const u = Math.min(0.9999, Math.max(0, x)) * knots;
    const i = Math.floor(u),
      s = (1 - Math.cos((u - i) * Math.PI)) / 2;
    return v[i] * (1 - s) + v[i + 1] * s;
  };
}

/** Catmull-Rom through the points (the curve passes through every point). */
export function curve(points: Pt[], closed = false, seg = 10): Pt[] {
  if (points.length < 3) return points;
  const p = closed
    ? [points[points.length - 1], ...points, points[0], points[1]]
    : [points[0], ...points, points[points.length - 1]];
  const out: Pt[] = [];
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
    for (let s = 0; s < seg; s++) {
      const t = s / seg,
        t2 = t * t,
        t3 = t2 * t;
      out.push(
        [0, 1].map(
          (k) =>
            0.5 *
            (2 * p1[k] +
              (-p0[k] + p2[k]) * t +
              (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
              (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3),
        ) as Pt,
      );
    }
  }
  out.push(closed ? points[0] : points[points.length - 1]);
  return out;
}

/** Evenly spaced points along a polyline. */
function resample(points: Pt[], step: number): Pt[] {
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

export const rectPoly = (x: number, y: number, w: number, h: number): Pt[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

export function ellipsePoly(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  n = 36,
  from = 0,
  to = Math.PI * 2,
): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / n;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as Pt;
  });
}

export type StrokeOpts = {
  /** Widest nib width. */
  w?: number;
  /** How thin the ends get, 0 (blunt) to 1 (hairline). */
  taper?: number;
  /** Lateral tremor of the hand. */
  wobble?: number;
  /** Extend both ends slightly past the target, as quick lines do. */
  overshoot?: number;
  /** Treat the points as a smooth curve rather than a polyline. */
  smooth?: boolean;
  closed?: boolean;
};

export class Pen {
  private r: () => number;
  constructor(seed = 1) {
    this.r = rng(seed);
  }
  /** A random number in [a, b). */
  rand(a = 0, b = 1) {
    return a + (b - a) * this.r();
  }
  /** Nudge a point by up to `k` in each direction. */
  jit([x, y]: Pt, k = 1): Pt {
    return [x + this.rand(-k, k), y + this.rand(-k, k)];
  }

  /** One pen stroke through the points, as a filled outline. */
  stroke(points: Pt[], o: StrokeOpts = {}): string {
    const w = o.w ?? 1.4,
      taper = o.taper ?? 0.55,
      wobble = Math.min(o.wobble ?? 0.25, 0.45);
    let p =
      points.length > 2 && o.smooth !== false
        ? curve(points, o.closed)
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
    const s = resample(p, Math.max(1.2, Math.min(4, len / 60)));
    const n = s.length;
    const tremor = noise(this.r, Math.max(2, Math.round(len / 45)));
    const press = noise(this.r, Math.max(2, Math.round(len / 30)));
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
        lo + (1 - lo) * smooth(0, 0.16, t) * (1 - smooth(0.7, 1, t));
      const half = Math.max(0.12, w * profile * (1 + 0.08 * press(t))) / 2;
      const off = wobble * tremor(t);
      const [x, y] = s[i];
      left.push([x + nx * (off + half), y + ny * (off + half)]);
      right.push([x + nx * (off - half), y + ny * (off - half)]);
    }
    return (
      `M${pt(left[0])}` +
      left
        .slice(1)
        .map((q) => `L${pt(q)}`)
        .join("") +
      right
        .reverse()
        .map((q) => `L${pt(q)}`)
        .join("") +
      "Z"
    );
  }

  /**
   * An important contour gone over again: the second pass is fine and lies
   * almost on the first, so the line reads richer, not doubled.
   * Returns [main, retrace].
   */
  twice(points: Pt[], o: StrokeOpts = {}): [string, string] {
    const w = o.w ?? 1.4;
    const again = points.map((q) => this.jit(q, Math.max(0.25, w * 0.25)));
    return [
      this.stroke(points, o),
      this.stroke(again, { ...o, w: w * 0.4, taper: 0.9 }),
    ];
  }

  /** A ruled line by hand: the faintest bow, barely past its ends. */
  line(a: Pt, b: Pt, o: StrokeOpts = {}): string {
    const d = dist(a, b);
    const bow = this.rand(-1, 1) * Math.min(0.8, d * 0.005);
    const mx = (a[0] + b[0]) / 2 - ((b[1] - a[1]) / (d || 1)) * bow;
    const my = (a[1] + b[1]) / 2 + ((b[0] - a[0]) / (d || 1)) * bow;
    return this.stroke([a, [mx, my], b], {
      overshoot: Math.min(1.2, d * 0.012),
      ...o,
    });
  }

  /** Straight segments drawn as separate strokes, corners overshooting. */
  poly(points: Pt[], o: StrokeOpts & { closed?: boolean } = {}): string {
    const out: string[] = [];
    const n = o.closed ? points.length : points.length - 1;
    for (let i = 0; i < n; i++)
      out.push(this.line(points[i], points[(i + 1) % points.length], o));
    return out.join("");
  }

  /** A hand-drawn ellipse: true to its shape, the end just meets the start. */
  ellipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    o: StrokeOpts & { from?: number; sweep?: number } = {},
  ): string {
    const from = o.from ?? this.rand(0, Math.PI * 2);
    const sweep = o.sweep ?? Math.PI * 2 + this.rand(0.04, 0.12);
    const wob = noise(this.r, 5);
    const k = Math.max(12, Math.round(((rx + ry) / 2) * 0.35));
    const pts: Pt[] = Array.from({ length: k + 1 }, (_, i) => {
      const t = i / k,
        a = from + sweep * t,
        m = 1 + 0.012 * wob(t);
      return [cx + Math.cos(a) * rx * m, cy + Math.sin(a) * ry * m];
    });
    return this.stroke(pts, { taper: 0.8, ...o });
  }

  /**
   * Parallel hatching inside a polygon, as thin centre lines to stroke.
   * `angle` is in degrees; `cross` adds a second pass at `angle + crossAt`.
   * `density(t)` (t runs 0→1 across the shape) thins lines out, for a
   * gradient of shade.
   */
  hatch(
    poly: Pt[],
    o: {
      angle?: number;
      gap?: number;
      jitter?: number;
      inset?: number;
      cross?: boolean;
      crossAt?: number;
      density?: (t: number) => number;
    } = {},
  ): string {
    const gap = o.gap ?? 4,
      jitter = Math.min(o.jitter ?? 0.12, 0.2),
      inset = o.inset ?? 2;
    const segs: [Pt, Pt, Pt][] = [];
    const pass = (deg: number) => {
      const ang = (deg * Math.PI) / 180,
        c = Math.cos(ang),
        s = Math.sin(ang);
      // Rotate so hatch lines are horizontal, scan, rotate back.
      const rot = poly.map(([x, y]) => [x * c + y * s, -x * s + y * c] as Pt);
      const back = ([x, y]: Pt): Pt => [x * c - y * s, x * s + y * c];
      const ys = rot.map((q) => q[1]);
      const y0 = Math.min(...ys),
        y1 = Math.max(...ys);
      for (
        let y = y0 + gap * this.rand(0.3, 1);
        y < y1;
        y += gap * this.rand(0.95, 1.05)
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
          // Engraver's hatching: evenly spaced, parallel, ends kept just
          // inside the outline with only a little variation.
          const a = xs[k] + inset * this.rand(0.6, 1.2),
            b = xs[k + 1] - inset * this.rand(0.6, 1.2);
          if (b - a < 1.5) continue;
          const tilt = this.rand(-1, 1) * Math.min(0.35, (b - a) * 0.006);
          const bow = this.rand(-1, 1) * Math.min(0.25, (b - a) * 0.004);
          segs.push([
            back([a, yy - tilt]),
            back([(a + b) / 2, yy + bow]),
            back([b, yy + tilt]),
          ]);
        }
      }
    };
    pass(o.angle ?? 45);
    if (o.cross) pass((o.angle ?? 45) + (o.crossAt ?? 90));
    return segs.map(([a, c, b]) => `M${pt(a)}Q${pt(c)} ${pt(b)}`).join("");
  }

  /** Faint construction line, extended a little past both ends. */
  pencil(a: Pt, b: Pt, extend = 3): string {
    const d = dist(a, b) || 1;
    const ux = (b[0] - a[0]) / d,
      uy = (b[1] - a[1]) / d;
    const e1 = extend * this.rand(0.4, 1.3),
      e2 = extend * this.rand(0.4, 1.3);
    return `M${pt([a[0] - ux * e1, a[1] - uy * e1])}L${pt([b[0] + ux * e2, b[1] + uy * e2])}`;
  }

  /** A loose closed shape around the points, for a watercolour wash. */
  blob(points: Pt[], spread = 1.5): string {
    const loose = points.map((q) => this.jit(q, spread));
    const c = curve(loose, true, 6);
    return (
      `M${pt(c[0])}` +
      c
        .slice(1)
        .map((q) => `L${pt(q)}`)
        .join("") +
      "Z"
    );
  }
}
