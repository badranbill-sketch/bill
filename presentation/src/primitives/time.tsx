import React, { createContext, useContext } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { EASE, FPS, MOTION } from '../brand';

export const sec = (s: number) => Math.round(s * FPS);

/** The current scene's duration in seconds, so lines that stay know not to fade early. */
export const SceneCtx = createContext<{ dur: number }>({ dur: Infinity });
export const useSceneDur = () => useContext(SceneCtx).dur;

/** Eased 0→1 progress of something that starts at `start` seconds and lasts `dur` seconds. */
export const useProgress = (start: number, dur: number, ease = EASE) => {
  const frame = useCurrentFrame();
  return progressAt(frame, start, dur, ease);
};

export const progressAt = (frame: number, start: number, dur: number, ease = EASE) =>
  interpolate(frame, [sec(start), sec(start) + Math.max(1, sec(dur))], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

export type At = readonly [number, number] | undefined;

/** Opacity and rise of a block that appears at at[0] and starts leaving at at[1]. */
export const appearAt = (
  frame: number,
  at: At,
  sceneDur: number,
  opts: { fadeIn?: number; fadeOut?: number; rise?: number } = {},
) => {
  if (!at) return { opacity: 1, y: 0 };
  const fadeIn = opts.fadeIn ?? MOTION.fadeIn;
  const fadeOut = opts.fadeOut ?? MOTION.fadeOut;
  const rise = Math.min(opts.rise ?? 10, MOTION.rise);
  const f0 = sec(at[0]);
  const pin = interpolate(frame, [f0, f0 + fadeIn], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE,
  });
  let pout = 1;
  if (at[1] < sceneDur - 0.01) {
    const f1 = sec(at[1]);
    pout = interpolate(frame, [f1, f1 + fadeOut], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE,
    });
  }
  return { opacity: pin * pout, y: (1 - pin) * rise };
};

export const useAppear = (at: At, opts?: { fadeIn?: number; fadeOut?: number; rise?: number }) => {
  const frame = useCurrentFrame();
  const dur = useSceneDur();
  return appearAt(frame, at, dur, opts);
};

/** A block that fades in (rising a few pixels) and, if asked, fades out. */
export const Reveal: React.FC<{
  at: At;
  rise?: number;
  fadeIn?: number;
  fadeOut?: number;
  style?: React.CSSProperties;
  className?: string;
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

/** Progress of item i of n inside an overall 0→1 progress, with a little overlap. */
export const stagger = (p: number, i: number, n: number, overlap = 0.35) => {
  const span = 1 / (n - (n - 1) * overlap);
  const start = i * span * (1 - overlap);
  return Math.max(0, Math.min(1, (p - start) / span));
};
