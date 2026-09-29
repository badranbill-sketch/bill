import type { Pt } from "@/lib/ink";
import { Pen } from "@/lib/ink";
import { curve, r1 } from "./art/kit";

/*
 * Small hand-drawn marks for the page layout (not illustrations): the ring
 * around a brass numeral, a checkbox, a pen underline, the paperclip on the
 * job cards. Each is seeded, so it looks the same on every build.
 */

const line = (q: Pt[]) =>
  `M${q.map((p) => `${r1(p[0])} ${r1(p[1])}`).join("L")}`;

/** A ring drawn in one movement, the end running just past the start. */
export function ringPath(seed: number, r = 12.5, c: Pt = [14, 14]): string {
  const p = new Pen(seed * 7 + 3);
  const from = p.rand(-2.4, -1.6),
    sweep = Math.PI * 2 + p.rand(0.25, 0.45);
  const rx = r * p.rand(0.97, 1.04),
    ry = r * p.rand(0.93, 1.0);
  const tilt = p.rand(-0.15, 0.15);
  const pts: Pt[] = Array.from({ length: 29 }, (_, i) => {
    const t = from + (sweep * i) / 28;
    const k = 1 + 0.035 * Math.sin(t * 2 + seed) - 0.03 * (i / 28);
    const x = Math.cos(t) * rx * k,
      y = Math.sin(t) * ry * k;
    return [
      c[0] + x * Math.cos(tilt) - y * Math.sin(tilt),
      c[1] + x * Math.sin(tilt) + y * Math.cos(tilt),
    ];
  });
  return line(curve(pts, false, 3));
}

/** A small square box, drawn as four strokes that overshoot a little. */
export function boxPath(seed: number, s = 13): string {
  const p = new Pen(seed * 13 + 5);
  const j = () => p.rand(-0.5, 0.5);
  const c: Pt[] = [
    [0 + j(), 0 + j()],
    [s + j(), 0 + j()],
    [s + j(), s + j()],
    [0 + j(), s + j()],
  ];
  let d = "";
  for (let i = 0; i < 4; i++) {
    const a = c[i],
      b = c[(i + 1) % 4];
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      L = Math.hypot(dx, dy);
    const o1 = p.rand(-0.2, 1.3),
      o2 = p.rand(-0.2, 1.3);
    d += line([
      [a[0] - (dx / L) * o1, a[1] - (dy / L) * o1],
      [b[0] + (dx / L) * o2, b[1] + (dy / L) * o2],
    ]);
  }
  return d;
}

/** A pen underline, slightly bowed, for one important phrase. */
export function underlinePath(seed: number, w: number): string {
  const p = new Pen(seed);
  const pts: Pt[] = [
    [0, 3.2 + p.rand(-0.4, 0.4)],
    [w * 0.3, 2.2 + p.rand(-0.4, 0.4)],
    [w * 0.65, 2.8 + p.rand(-0.4, 0.4)],
    [w, 1.6 + p.rand(-0.4, 0.4)],
  ];
  return line(curve(pts, false, 8));
}

/** The outline of an index card, a little out of true. */
export function cardPath(seed: number, w: number, h: number): string {
  const p = new Pen(seed);
  const j = () => p.rand(-0.8, 0.8);
  const c: Pt[] = [
    [0 + j(), 0 + j()],
    [w + j(), 0 + j()],
    [w + j(), h + j()],
    [0 + j(), h + j()],
  ];
  let d = "";
  for (let i = 0; i < 4; i++) {
    const a = c[i],
      b = c[(i + 1) % 4];
    const m: Pt = [
      (a[0] + b[0]) / 2 + p.rand(-0.6, 0.6),
      (a[1] + b[1]) / 2 + p.rand(-0.6, 0.6),
    ];
    d += line(curve([a, m, b], false, 10));
  }
  return d;
}

/** A paperclip seen from above: one wire, three bends. */
export function clipPath(): string {
  const wire: Pt[] = [
    [6, 60],
    [6, 10],
    [6, 5],
    [10, 1.5],
    [14, 5],
    [14, 50],
    [14, 55],
    [11.5, 57.5],
    [9, 55],
    [9, 16],
  ];
  return line(curve(wire, false, 8));
}
