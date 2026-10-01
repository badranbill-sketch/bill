import type React from 'react';
import {cubicBezier, easeInOut, spring, stagger, transform} from 'framer-motion';
import {FPS} from './timing';

// Framer Motion, driven by the frame.
//
// Remotion renders every frame on its own (in parallel tabs, often out of order), so <motion.div>, animate() and
// AnimatePresence, which run on the wall clock, would freeze or flicker in a render. The reel uses Framer Motion's
// pure functions instead (its easing curves, keyframe interpolation, spring solver and stagger) and evaluates them
// at the current frame. The vocabulary is Framer Motion's (initial / animate / exit, transition, staggerChildren),
// the result is deterministic. Calm only: nothing bounces, so every spring here is over-damped.

export type Ease = (t: number) => number;

export const fmEase = {
  /** arrivals: quick start, long settle (the film's ease.out) */
  out: cubicBezier(0.16, 1, 0.3, 1),
  /** the camera and slow moves */
  inOut: easeInOut,
  /** fades */
  soft: cubicBezier(0.33, 0, 0.2, 1),
  /** the brass pen */
  draw: cubicBezier(0.45, 0.05, 0.25, 1),
  linear: (t: number) => t,
} as const;

/** Framer Motion's keyframes at frame t: values[i] at frames[i], clamped, with one ease per segment (or one for all). */
export const keyframes = (t: number, frames: number[], values: number[], ease: Ease | Ease[] = fmEase.inOut) => {
  // transform() needs a strictly increasing input; voice timing can make two cues land on the same frame
  const fr = [...frames];
  for (let i = 1; i < fr.length; i++) fr[i] = Math.max(fr[i], fr[i - 1] + 1);
  return transform(t, fr, values, {clamp: true, ease});
};

export type SpringConfig = {stiffness: number; damping: number; mass?: number};

/** Springs from the skill's "no bounce" family (damping ratio > 1: they settle without overshoot). */
export const SPRING = {
  /** an object laid on the page */
  settle: {stiffness: 120, damping: 26},
  /** a slower glide */
  gentle: {stiffness: 70, damping: 24},
} as const satisfies Record<string, SpringConfig>;

const springs = new Map<string, ReturnType<typeof spring>>();
const springProgress = (ms: number, c: SpringConfig) => {
  const k = `${c.stiffness}/${c.damping}/${c.mass ?? 1}`;
  let g = springs.get(k);
  if (!g) {
    g = spring({keyframes: [0, 1], stiffness: c.stiffness, damping: c.damping, mass: c.mass ?? 1});
    springs.set(k, g);
  }
  // the solver is analytic: next(ms) depends only on ms, so frames can be asked for in any order
  return g.next(ms).value as number;
};

export type Transition =
  | {type?: 'tween'; duration?: number; delay?: number; ease?: Ease}
  | ({type: 'spring'; delay?: number} & SpringConfig);

/** 0 → 1 progress of a transition that starts at frame `start` (durations and delays in seconds, as in Framer Motion). */
export const progress = (t: number, start: number, tr: Transition = {}) => {
  const from = start + Math.round((tr.delay ?? 0) * FPS);
  if (t <= from) return 0;
  if (tr.type === 'spring') return Math.min(1, springProgress(((t - from) / FPS) * 1000, tr));
  const dur = Math.max(1, Math.round((tr.duration ?? 0.5) * FPS));
  return transform(t, [from, from + dur], [0, 1], {clamp: true, ease: tr.ease ?? fmEase.out});
};

export type Pose = {opacity?: number; x?: number; y?: number; scale?: number; rotate?: number};
const DEFAULT: Required<Pose> = {opacity: 1, x: 0, y: 0, scale: 1, rotate: 0};
const mixPose = (a: Pose, b: Pose, p: number): Required<Pose> => {
  const out = {...DEFAULT};
  for (const key of Object.keys(DEFAULT) as (keyof Pose)[]) {
    const va = a[key] ?? DEFAULT[key];
    const vb = b[key] ?? DEFAULT[key];
    out[key] = va + (vb - va) * p;
  }
  return out;
};

/**
 * AnimatePresence by frame: the element enters at `enter` (initial → animate) and, if `leave` is given, leaves from
 * `leave` (animate → exit). `mounted` is false before it enters and once its exit is over, so the caller can unmount.
 */
export const presence = (
  t: number,
  o: {
    enter: number;
    leave?: number;
    initial?: Pose;
    animate?: Pose;
    exit?: Pose;
    /** Framer Motion's `transition` for the entrance (named so, because Remotion's lint reads `transition` as CSS) */
    enterWith?: Transition;
    /** …and for the exit */
    exitWith?: Transition;
  },
) => {
  const initial = o.initial ?? {opacity: 0};
  const animate = o.animate ?? {};
  const exit = o.exit ?? {opacity: 0};
  const pIn = progress(t, o.enter, o.enterWith);
  const pOut = o.leave === undefined ? 0 : progress(t, o.leave, o.exitWith ?? {duration: 0.5, ease: fmEase.soft});
  const pose = mixPose(mixPose(initial, animate, pIn), exit, pOut);
  return {pose, mounted: t >= o.enter && pOut < 1};
};

/** A pose as CSS (individual transform properties, so it composes with a `rotate` already on the element). */
export const poseStyle = (p: Required<Pose>): React.CSSProperties => ({
  opacity: p.opacity,
  translate: `${p.x}px ${p.y}px`,
  scale: String(p.scale),
  rotate: `${p.rotate}deg`,
});

/** staggerChildren: the frame at which child i of `total` starts, `each` seconds apart (Framer Motion's stagger()). */
export const staggerAt = (start: number, i: number, total: number, each = 0.12, from: 'first' | 'last' | 'center' = 'first') =>
  start + Math.round(stagger(each, {from})(i, total) * FPS);
