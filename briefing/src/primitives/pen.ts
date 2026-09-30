/**
 * A small seeded pen for marks drawn in the film itself (rules, ticks,
 * underlines). From the presentation project's primitives/pen.ts; the
 * website's full pen is lib/ink.ts. Seeded, so every render is identical.
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

/** A single hand-drawn line from a to b: the faintest bow, ends nudged. */
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
