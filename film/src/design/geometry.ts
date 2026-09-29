export type Pt = {x: number; y: number};

/** Smooth curve through points (Catmull-Rom converted to cubic Béziers). */
export const smoothPath = (pts: Pt[], closed = false, tension = 1): string => {
  if (pts.length < 2) return '';
  const p = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M ${p[1].x} ${p[1].y}`;
  const last = closed ? p.length - 2 : p.length - 2;
  for (let i = 1; i < last; i++) {
    const p0 = p[i - 1];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2];
    const c1 = {x: p1.x + ((p2.x - p0.x) / 6) * tension, y: p1.y + ((p2.y - p0.y) / 6) * tension};
    const c2 = {x: p2.x - ((p3.x - p1.x) / 6) * tension, y: p2.y - ((p3.y - p1.y) / 6) * tension};
    d += ` C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`;
  }
  return closed ? d + ' Z' : d;
};

/**
 * The cover's water line, generalised: the guide draws it as cubic segments 170 units long with control points
 * ±16 units off the line ("M0 262 C60 246 110 278 170 262 …"). `phase` slides it sideways to make it move.
 */
export const wavePath = (x0: number, x1: number, y: number, period = 170, amp = 16, phase = 0): string => {
  const start = x0 - period - (((phase % period) + period) % period);
  let d = `M ${start} ${y}`;
  for (let x = start; x < x1 + period; x += period) {
    d += ` C ${x + period * 0.353} ${y - amp} ${x + period * 0.647} ${y + amp} ${x + period} ${y}`;
  }
  return d;
};

export const polar = (cx: number, cy: number, r: number, deg: number): Pt => ({
  x: cx + r * Math.cos((deg * Math.PI) / 180),
  y: cy + r * Math.sin((deg * Math.PI) / 180),
});

export const mix = (a: Pt, b: Pt, t: number): Pt => ({x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t});

/** Deterministic pseudo-random in [0, 1) from an integer seed (for organic but repeatable layouts). */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
