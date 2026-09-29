import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, EASE_SOFT, FONT, MOTION } from '../brand';
import { tr, STATUS, type Line, type Status } from '../content';
import ink from '../data/ink.json';
import { underline as underlinePath } from './pen';
import { Reveal, SceneCtx, progressAt, sec, useAppear, type At } from './time';

/** The ivory page, with a 4% paper grain. It never changes. */
export const Paper: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: C.paper }}>
    <Img src={staticFile('textures/grain-1920.png')} style={{ width: '100%', height: '100%', opacity: 0.04 }} />
  </AbsoluteFill>
);

/** Scene content fades in over 12 frames and out over 20 (36 for the close). */
export const SceneFade: React.FC<{ dur: number; out?: number; children: React.ReactNode }> = ({
  dur,
  out = MOTION.sceneOut,
  children,
}) => {
  const frame = useCurrentFrame();
  const total = sec(dur);
  const o = interpolate(frame, [0, MOTION.sceneIn, total - out, total], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <SceneCtx.Provider value={{ dur }}>
      <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>
    </SceneCtx.Provider>
  );
};

/** Handwriting (Caveat), revealed left to right through a soft mask. */
export const Handwrite: React.FC<{
  line: Line;
  at?: At;
  size?: number;
  tilt?: number;
  color?: string;
  weight?: 400 | 500;
  speed?: number; // seconds per character
  style?: React.CSSProperties;
  align?: 'left' | 'center' | 'right';
  centerX?: number; // centre the text on this x
  wrap?: number; // wrap at this width instead of one line
  lineHeight?: number;
}> = ({ line, at, size = 48, tilt = 0, color = C.navy2, weight = 400, speed = 0.05, style, align = 'left', centerX, wrap, lineHeight = 1.1 }) => {
  const frame = useCurrentFrame();
  const when = at ?? line.at;
  const { opacity } = useAppear(when, { fadeIn: 12, rise: 0 });
  if (!when || opacity <= 0.001) return null;
  const text = tr(line);
  const dur = Math.min(2.6, Math.max(0.6, (wrap ? Math.min(text.length, (wrap / size) * 2.2) : text.length) * speed));
  const p = progressAt(frame, when[0], dur, EASE_SOFT);
  const edge = p * 116 - 12;
  const mask = `linear-gradient(90deg, #000 ${edge}%, transparent ${edge + 12}%)`;
  return (
    <div
      style={{
        position: 'absolute',
        fontFamily: FONT.hand,
        fontWeight: weight,
        fontSize: size,
        lineHeight,
        color,
        whiteSpace: wrap ? 'normal' : 'nowrap',
        width: wrap,
        textAlign: align,
        left: centerX,
        transform: `${centerX !== undefined ? 'translateX(-50%) ' : ''}rotate(${tilt}deg)`,
        opacity,
        // Room around the glyphs so the mask never clips a trailing quote or a descender.
        padding: '0.15em 0.35em',
        margin: centerX !== undefined ? '-0.15em 0 0 0' : '-0.15em 0 0 -0.35em',
        WebkitMaskImage: mask,
        maskImage: mask,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/** A line of display serif (Newsreader), fading in and rising a few pixels. */
export const SerifLine: React.FC<{
  line: Line;
  at?: At;
  size?: number;
  weight?: 300 | 400;
  italic?: boolean;
  color?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ line, at, size = 56, weight = 300, italic, color = C.ink, style, children }) => (
  <Reveal
    at={at ?? line.at}
    style={{
      position: 'absolute',
      fontFamily: FONT.serif,
      fontWeight: weight,
      fontStyle: italic ? 'italic' : 'normal',
      fontSize: size,
      lineHeight: 1.18,
      letterSpacing: size > 70 ? '-0.012em' : '-0.004em',
      color,
      ...style,
    }}
  >
    {children ?? tr(line)}
  </Reveal>
);

/** Voice-over line: a bottom strip in italic serif 34 px. */
export const Caption: React.FC<{ line: Line; bottom?: number }> = ({ line, bottom = 70 }) => (
  <Reveal
    at={line.at}
    rise={6}
    style={{
      position: 'absolute',
      left: 160,
      right: 160,
      bottom,
      textAlign: 'center',
      fontFamily: FONT.serif,
      fontStyle: 'italic',
      fontWeight: 400,
      fontSize: 34,
      lineHeight: 1.32,
      color: C.navy2,
    }}
  >
    <span style={{ backgroundColor: 'rgba(250,249,245,0.86)', boxDecorationBreak: 'clone', padding: '2px 10px' }}>
      {tr(line)}
    </span>
  </Reveal>
);

/** Small caps label in Source Sans. */
export const SmallCaps: React.FC<{
  children: React.ReactNode;
  size?: number;
  color?: string;
  spacing?: string;
  style?: React.CSSProperties;
}> = ({ children, size = 17, color = C.inkSoft, spacing = '0.16em', style }) => (
  <span
    style={{
      fontFamily: FONT.sans,
      fontWeight: 600,
      fontSize: size,
      letterSpacing: spacing,
      textTransform: 'uppercase',
      color,
      ...style,
    }}
  >
    {children}
  </span>
);

/** Status pill: Built = solid ink, In progress = soft ink outline, Not started = dashed light, Needs Bill = brass. */
export const StatusTag: React.FC<{ status: Status; scale?: number; style?: React.CSSProperties }> = ({
  status,
  scale = 1,
  style,
}) => {
  const look: Record<Status, React.CSSProperties> = {
    built: { background: C.ink, color: C.paper, border: `1.5px solid ${C.ink}` },
    progress: { background: 'transparent', color: C.navy2, border: `1.5px solid rgba(23,52,80,0.55)` },
    notStarted: { background: 'transparent', color: C.inkSoft, border: `1.5px dashed ${C.blueGrey}` },
    needsBill: { background: 'transparent', color: C.brassInk, border: `1.5px solid ${C.brass}` },
  };
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10 * scale,
        height: 38 * scale,
        padding: `0 ${18 * scale}px`,
        borderRadius: 999,
        fontFamily: FONT.sans,
        fontWeight: 600,
        fontSize: 16 * scale,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        ...look[status],
        ...style,
      }}
    >
      {tr(STATUS[status])}
    </div>
  );
};

/** A status tag in the top-right corner of a journey scene. */
export const CornerStatus: React.FC<{ status: Status; at?: At }> = ({ status, at = [0.3, 999] }) => (
  <Reveal at={at} rise={6} style={{ position: 'absolute', top: 64, right: 96 }}>
    <StatusTag status={status} scale={1.12} />
  </Reveal>
);

/** A hand-drawn underline that draws itself under whatever sits in its (relative) parent. */
export const Underline: React.FC<{
  start: number;
  dur?: number;
  color?: string;
  width?: number; // stroke px
  offset?: number; // px below the baseline box
  seed?: number;
  height?: number;
}> = ({ start, dur = 0.9, color = C.brass, width = 3, offset = 2, seed = 7, height = 16 }) => {
  const frame = useCurrentFrame();
  const p = progressAt(frame, start, dur, EASE_SOFT);
  if (p <= 0) return null;
  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      style={{ position: 'absolute', left: '-1%', width: '102%', bottom: -height + offset, height, overflow: 'visible' }}
    >
      <path
        d={underlinePath(100, height, seed)}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="1 1"
        strokeDashoffset={1 - p}
      />
    </svg>
  );
};

type InkName = keyof typeof ink;

/**
 * One of the website's pen drawings, drawn by the pen from left to right
 * (a soft moving mask over the ink layer), then its wash blooms in behind.
 */
export const InkDrawing: React.FC<{
  name: InkName;
  start: number;
  dur: number;
  width: number;
  washDelay?: number;
  washDur?: number;
  style?: React.CSSProperties;
  direction?: 'ltr' | 'up';
}> = ({ name, start, dur, width, washDelay, washDur = 1.3, style, direction = 'ltr' }) => {
  const frame = useCurrentFrame();
  const { w, h } = ink[name];
  const height = (width * h) / w;
  const p = progressAt(frame, start, dur, EASE_SOFT);
  const wash = progressAt(frame, start + (washDelay ?? dur * 0.75), washDur, EASE);
  if (p <= 0) return null;
  const edge = p * 122 - 14;
  const mask =
    direction === 'ltr'
      ? `linear-gradient(90deg, #000 ${edge}%, transparent ${edge + 14}%)`
      : `linear-gradient(0deg, #000 ${edge}%, transparent ${edge + 14}%)`;
  return (
    <div style={{ position: 'absolute', width, height, ...style }}>
      <Img
        src={staticFile(`ink/${name}.wash.svg`)}
        style={{ position: 'absolute', inset: 0, width, height, opacity: wash }}
      />
      <Img
        src={staticFile(`ink/${name}.ink.svg`)}
        style={{ position: 'absolute', inset: 0, width, height, WebkitMaskImage: mask, maskImage: mask }}
      />
    </div>
  );
};

/** A stroke that draws itself (pathLength = 1). */
export const Stroke: React.FC<{
  d: string;
  p: number;
  color?: string;
  width?: number;
  opacity?: number;
  dash?: string;
  fill?: string;
}> = ({ d, p, color = C.ink, width = 2.2, opacity = 1, fill = 'none' }) => {
  if (p <= 0.001) return null;
  return (
    <path
      d={d}
      fill={fill}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
      pathLength={1}
      strokeDasharray="1 1"
      strokeDashoffset={1 - Math.min(1, p)}
    />
  );
};

/** Absolute helper. */
export const Abs: React.FC<{ x: number; y: number; w?: number; h?: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({
  x,
  y,
  w,
  h,
  style,
  children,
}) => <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, ...style }}>{children}</div>;
