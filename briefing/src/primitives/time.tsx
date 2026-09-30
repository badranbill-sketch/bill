import React, { createContext, useContext } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { EASE, FPS, MOTION, READING } from '../brand';
import type { At } from '../content';

/* Adapted from the presentation project's primitives/time.tsx. */

export const sec = (s: number) => Math.round(s * FPS);

/** Words that count for reading time (anything with a letter or a digit). */
export const words = (text: string) => text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/** Minimum time on screen for a text: 0.3 s per word + 1.5 s. */
export const readingSeconds = (text: string) => words(text) * READING.perWord + READING.base;

/** An `at` window that starts at `from` and holds the text for its reading time (plus any extra). */
export const holdFor = (from: number, text: string, extra = 0): At => [from, from + readingSeconds(text) + extra];

/** The current scene's duration in seconds, so lines that stay know not to fade early. */
export const SceneCtx = createContext<{ dur: number }>({ dur: Infinity });
export const useSceneDur = () => useContext(SceneCtx).dur;

/** Eased 0→1 progress of something that starts at `start` seconds and lasts `dur` seconds. */
export const progressAt = (frame: number, start: number, dur: number, ease = EASE) =>
  interpolate(frame, [sec(start), sec(start) + Math.max(1, sec(dur))], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

export const useProgress = (start: number, dur: number, ease = EASE) => progressAt(useCurrentFrame(), start, dur, ease);

/** Opacity and rise of a block that appears at at[0] and starts leaving at at[1]. */
export const appearAt = (frame: number, at: At | undefined, sceneDur: number, opts: { fadeIn?: number; fadeOut?: number; rise?: number } = {}) => {
  if (!at) return { opacity: 1, y: 0 };
  const fadeIn = opts.fadeIn ?? MOTION.fadeIn;
  const fadeOut = opts.fadeOut ?? MOTION.fadeOut;
  const rise = Math.min(opts.rise ?? 10, MOTION.rise);
  const f0 = sec(at[0]);
  const pin = interpolate(frame, [f0, f0 + fadeIn], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
  let pout = 1;
  if (at[1] < sceneDur - 0.01) {
    const f1 = sec(at[1]);
    pout = interpolate(frame, [f1, f1 + fadeOut], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
  }
  return { opacity: pin * pout, y: (1 - pin) * rise };
};

export const useAppear = (at: At | undefined, opts?: { fadeIn?: number; fadeOut?: number; rise?: number }) =>
  appearAt(useCurrentFrame(), at, useSceneDur(), opts);

/** A block that fades in (rising a few pixels) and, if asked, fades out. */
export const Reveal: React.FC<{
  at: At | undefined;
  rise?: number;
  fadeIn?: number;
  fadeOut?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ at, rise, fadeIn, fadeOut, style, children }) => {
  const { opacity, y } = useAppear(at, { rise, fadeIn, fadeOut });
  if (opacity <= 0.001) return null;
  return (
    <div
      style={{
        ...style,
        opacity: opacity * ((style?.opacity as number | undefined) ?? 1),
        transform: `${style?.transform ?? ''} translateY(${y.toFixed(2)}px)`.trim(),
      }}
    >
      {children}
    </div>
  );
};

/** Scene wrapper: provides the duration to Reveal, so a line whose `to` equals `dur` never fades early. */
export const Scene: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => (
  <SceneCtx.Provider value={{ dur }}>{children}</SceneCtx.Provider>
);
