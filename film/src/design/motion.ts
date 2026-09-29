import {Easing, interpolate} from 'remotion';

// A small, consistent motion vocabulary. Nothing bounces; things arrive, settle and wait.
export const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1), // arrivals: quick start, long settle
  inOut: Easing.bezier(0.65, 0, 0.35, 1), // camera moves and layout changes
  soft: Easing.bezier(0.33, 0, 0.2, 1), // fades
  draw: Easing.bezier(0.45, 0.05, 0.25, 1), // the gold line
  in: Easing.bezier(0.55, 0, 0.9, 0.4), // exits
  settle: Easing.spring({damping: 200}), // no-overshoot spring, for rare physical moments
  lift: Easing.bezier(0.2, 1.25, 0.35, 1), // a whisper of overshoot, used sparingly
  linear: Easing.linear,
} as const;

type EasingFn = (t: number) => number;

/** Clamped interpolation between two frames. */
export const tween = (f: number, from: number, to: number, a = 0, b = 1, easing: EasingFn = ease.out): number =>
  interpolate(f, [from, Math.max(to, from + 1)], [a, b], {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** Clamped multi-keyframe interpolation. */
export const keys = (f: number, frames: number[], values: number[], easing: EasingFn = ease.inOut): number => {
  const fr = frames.map((x, i) => (i > 0 && x <= frames[i - 1] ? frames[i - 1] + 1 : x));
  for (let i = 1; i < fr.length; i++) fr[i] = Math.max(fr[i], fr[i - 1] + 1);
  return interpolate(f, fr, values, {easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
};

/** 0→1 in, hold, 1→0 out. */
export const inOut = (f: number, inAt: number, outAt: number, dur = 15, easing: EasingFn = ease.soft): number =>
  Math.min(tween(f, inAt, inAt + dur, 0, 1, easing), tween(f, outAt, outAt + dur, 1, 0, easing));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
