import {random} from 'remotion';

// Hand-drawn path geometry for the sketchbook: every mark wobbles a little, like a pen held by a person. Paths are
// in stage pixels (1920 × 1080) and deterministic (seeded), so every render draws exactly the same line.

export type Pt = [number, number];

/** A smooth curve through the points (Catmull-Rom as cubic Béziers). */
export const smooth = (pts: Pt[], tension = 1): string => {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1: Pt = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension];
    const c2: Pt = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
};

/** Low-frequency 1-D noise in [-1, 1]: a few sines with seeded phases. */
const noise = (seed: string, s: number) => {
  let v = 0;
  for (let k = 0; k < 3; k++) {
    const f = [0.9, 2.3, 5.1][k];
    const ph = random(`${seed}-${k}`) * Math.PI * 2;
    v += Math.sin(s * f + ph) / (k + 1);
  }
  return v / 1.83;
};

/** Resample a polyline every `step` px and push each point sideways by a little seeded noise: a human line. */
export const wobble = (pts: Pt[], amp = 2.2, seed = 'w', step = 36): Pt[] => {
  const out: Pt[] = [];
  let travelled = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(len / step));
    const nx = -(y1 - y0) / (len || 1);
    const ny = (x1 - x0) / (len || 1);
    for (let j = 0; j < n; j++) {
      const t = j / n;
      const s = (travelled + t * len) / 140;
      const off = noise(seed, s) * amp;
      out.push([x0 + (x1 - x0) * t + nx * off, y0 + (y1 - y0) * t + ny * off]);
    }
    travelled += len;
  }
  const last = pts[pts.length - 1];
  out.push([last[0], last[1]]);
  // Pin the two ends where they were asked to be.
  out[0] = pts[0];
  return out;
};

/** Points along the smooth (Catmull-Rom) curve through `pts`, about every `step` px, so corners become curves. */
export const curvePoints = (pts: Pt[], step = 24): Pt[] => {
  if (pts.length < 3) return pts;
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const n = Math.max(2, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 0; j < n; j++) {
      const t = j / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
};

/** A hand-drawn path through points: a smooth curve, then a little human wobble. */
export const handPath = (pts: Pt[], amp = 2.2, seed = 'h') => smooth(wobble(curvePoints(pts), amp, seed, 30));

/** A quick underline, slightly rising, slightly overshooting at the end. */
export const underline = (x: number, y: number, w: number, seed = 'u') =>
  handPath(
    [
      [x, y + 2],
      [x + w * 0.5, y],
      [x + w * 1.03, y - 3],
    ],
    1.6,
    seed,
  );

/** A strike-through, for a word that has no place here ("jargon"). */
export const strike = (x: number, y: number, w: number, seed = 's') =>
  handPath(
    [
      [x - 6, y + 4],
      [x + w * 0.5, y - 1],
      [x + w + 8, y - 5],
    ],
    1.8,
    seed,
  );

/** A tick mark, drawn in one movement. */
export const tick = (x: number, y: number, size = 34) =>
  smooth([
    [x, y],
    [x + size * 0.32, y + size * 0.36],
    [x + size * 0.46, y + size * 0.42],
    [x + size, y - size * 0.55],
  ]);

/** A loose hand-drawn loop around something, overshooting where it closes. */
export const loop = (cx: number, cy: number, rx: number, ry: number, seed = 'o', turns = 1.12) => {
  const pts: Pt[] = [];
  const n = 28;
  const a0 = -2.3 + random(`${seed}-a`) * 0.4;
  for (let i = 0; i <= n; i++) {
    const a = a0 + (i / n) * Math.PI * 2 * turns;
    const r = 1 + (random(`${seed}-${i}`) - 0.5) * 0.06 + (i / n) * 0.05;
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  return smooth(pts);
};

/** A small hand-drawn arrow from a to b, bowed to one side. Returns the shaft and the head as two paths. */
export const arrow = (a: Pt, b: Pt, bend = 0.18, head = 16, seed = 'a') => {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const ctrl: Pt = [mx - dy * bend, my + dx * bend];
  const shaft = handPath([a, ctrl, b], 1.4, seed);
  // Head aligned with the last part of the curve.
  const ang = Math.atan2(b[1] - ctrl[1], b[0] - ctrl[0]);
  const l: Pt = [b[0] - head * Math.cos(ang - 0.5), b[1] - head * Math.sin(ang - 0.5)];
  const r: Pt = [b[0] - head * Math.cos(ang + 0.5), b[1] - head * Math.sin(ang + 0.5)];
  const headPath = `M ${l[0].toFixed(1)} ${l[1].toFixed(1)} L ${b[0].toFixed(1)} ${b[1].toFixed(1)} L ${r[0].toFixed(1)} ${r[1].toFixed(1)}`;
  return {shaft, head: headPath};
};
