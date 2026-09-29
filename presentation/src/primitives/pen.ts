/**
 * A small seeded pen for the new centreline drawings: lines that bow a little,
 * circles that overshoot where the pen started, and posts that lean. Seeded, so
 * every render is identical.
 */
export const rng = (seed: number) => {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const r1 = (n: number) => Math.round(n * 10) / 10;
type Pt = [number, number];

/** A single hand-drawn line from a to b. */
export const line = (x1: number, y1: number, x2: number, y2: number, seed = 1, amp = 1) => {
  const r = rng(seed);
  const j = () => (r() - 0.5) * amp;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const bow = (r() - 0.5) * Math.min(6, len * 0.02) * amp;
  const cx = (x1 + x2) / 2 + (-dy / len) * bow;
  const cy = (y1 + y2) / 2 + (dx / len) * bow;
  return `M${r1(x1 + j())} ${r1(y1 + j())}Q${r1(cx)} ${r1(cy)} ${r1(x2 + j())} ${r1(y2 + j())}`;
};

/** A hand-drawn polyline, optionally closed, as one continuous stroke. */
export const poly = (pts: Pt[], closed = false, seed = 1, amp = 1) => {
  const r = rng(seed);
  const all = closed ? [...pts, pts[0]] : pts;
  let d = `M${r1(all[0][0])} ${r1(all[0][1])}`;
  for (let i = 1; i < all.length; i++) {
    const [ax, ay] = all[i - 1];
    const [bx, by] = all[i];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const bow = (r() - 0.5) * Math.min(5, len * 0.02) * amp;
    const cx = (ax + bx) / 2 + (-dy / len) * bow;
    const cy = (ay + by) / 2 + (dx / len) * bow;
    const ex = closed && i === all.length - 1 ? bx + (r() - 0.5) * 2 * amp : bx;
    d += `Q${r1(cx)} ${r1(cy)} ${r1(ex)} ${r1(by)}`;
  }
  return d;
};

/** A hand-drawn ellipse that starts at `start` (radians) and overshoots a little. */
export const ellipse = (cx: number, cy: number, rx: number, ry: number, seed = 1, overshoot = 0.08, start = -2.2) => {
  const r = rng(seed);
  const n = 28;
  const wob = [r(), r(), r()].map((v) => (v - 0.5) * 0.035);
  const pts: Pt[] = [];
  const total = Math.PI * 2 * (1 + overshoot);
  for (let i = 0; i <= n; i++) {
    const t = start + (total * i) / n;
    const k = 1 + wob[0] * Math.sin(t * 2 + wob[1] * 40) + wob[2] * Math.cos(t * 3) + (i / n) * 0.03;
    pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]);
  }
  return smooth(pts);
};

/** Catmull-Rom through points, as cubic Béziers. */
export const smooth = (pts: Pt[]) => {
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
};

/** A soft wavy line from x1 to x2 around y. */
export const wave = (x1: number, x2: number, y: number, amp = 5, period = 260, seed = 3) => {
  const r = rng(seed);
  const pts: Pt[] = [];
  const n = Math.max(4, Math.round((x2 - x1) / 40));
  const ph = r() * Math.PI * 2;
  for (let i = 0; i <= n; i++) {
    const x = x1 + ((x2 - x1) * i) / n;
    pts.push([x, y + Math.sin((x / period) * Math.PI * 2 + ph) * amp + (r() - 0.5) * 0.8]);
  }
  return { d: smooth(pts), at: (x: number) => y + Math.sin((x / period) * Math.PI * 2 + ph) * amp };
};

/** A little hand-drawn underline across a box of width w (viewBox units). */
export const underline = (w: number, h: number, seed = 7) => {
  const r = rng(seed);
  const y = h * 0.55;
  const pts: Pt[] = [];
  for (let i = 0; i <= 6; i++) {
    const x = (w * i) / 6;
    pts.push([x, y + Math.sin(i * 0.9 + r() * 2) * h * 0.12 - (i / 6) * h * 0.1]);
  }
  return smooth(pts);
};
