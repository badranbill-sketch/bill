import React from 'react';
import {evolvePath, getLength, getPointAtLength} from '@remotion/paths';
import {sketch} from '../../design/palette';
import {ease, tween} from '../../design/motion';
import {useT} from '../stage';
import {HAND, sketchType} from '../../design/typography';

// Pen marks and handwriting that draw themselves on the page, timed in absolute film frames (use at() / wordAt()).

type EasingFn = (t: number) => number;

/** A full-stage SVG layer for pen marks, in stage pixels. */
export const InkLayer: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <svg
    width={1920}
    height={1080}
    viewBox="0 0 1920 1080"
    style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', ...style}}
  >
    {children}
  </svg>
);

/**
 * One pen stroke (an SVG path in stage pixels) drawn from start to start + duration. `until` stops the pen part way
 * (0.8 = stops short, and stays that way). Must be placed inside an <InkLayer>.
 */
export const InkStroke: React.FC<{
  d: string;
  start: number;
  duration?: number;
  until?: number;
  color?: string;
  width?: number;
  opacity?: number;
  easing?: EasingFn;
  /** Show a small dot at the pen tip while it is moving (used for the brass line). */
  tip?: boolean;
}> = ({d, start, duration = 18, until = 1, color = sketch.ink, width = 2.6, opacity = 1, easing = ease.draw, tip = false}) => {
  const t = useT();
  const p = tween(t, start, start + duration, 0, until, easing);
  if (p <= 0 || !d) return null;
  const {strokeDasharray, strokeDashoffset} = evolvePath(p, d);
  const moving = tip && p > 0 && p < until - 0.001;
  const at = moving ? getPointAtLength(d, getLength(d) * p) : null;
  return (
    <g opacity={opacity}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
      />
      {at ? <circle cx={at.x} cy={at.y} r={width * 1.25} fill={color} /> : null}
    </g>
  );
};

export type HandStyle = keyof typeof sketchType;

/** How long (in frames) a line of handwriting takes to write at `speed` characters per second. */
export const writeFrames = (text: string, speed = 16, fps = 30) =>
  Math.max(8, Math.round((text.replace(/\s+/g, ' ').length / speed) * fps));

/**
 * Handwriting that writes itself left to right, one line after the other ("\n" breaks lines). The reveal is a soft
 * edge moving along each line, like a pen keeping up with the words.
 */
export const Handwriting: React.FC<{
  text: string;
  start: number;
  /** Characters per second. 16 is an unhurried hand; 22 keeps up with fast narration. */
  speed?: number;
  left: number;
  top: number;
  width?: number;
  variant?: HandStyle;
  color?: string;
  rotate?: number;
  align?: 'left' | 'center' | 'right';
  /** Absolute frame at which the note fades away (optional). */
  exit?: number;
  opacity?: number;
  style?: React.CSSProperties;
}> = ({
  text,
  start,
  speed = 16,
  left,
  top,
  width,
  variant = 'note',
  color = sketch.ink,
  rotate = 0,
  align = 'left',
  exit,
  opacity = 1,
  style,
}) => {
  const t = useT();
  const lines = text.split('\n');
  const gone = exit === undefined ? 1 : tween(t, exit, exit + 12, 1, 0, ease.soft);
  if (t < start) return null;
  let cursor = start;
  const type = sketchType[variant];
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        rotate: `${rotate}deg`,
        transformOrigin: align === 'center' ? '50% 0' : align === 'right' ? '100% 0' : '0 0',
        textAlign: align,
        color,
        opacity: opacity * gone,
        whiteSpace: 'nowrap',
        ...type,
        fontFamily: type.fontFamily === HAND ? `${HAND}, cursive` : `${type.fontFamily}, serif`,
        ...style,
      }}
    >
      {lines.map((line, i) => {
        const dur = writeFrames(line, speed);
        const from = cursor;
        cursor += dur + 4;
        const p = tween(t, from, from + dur, -8, 100, ease.linear);
        const mask = `linear-gradient(90deg, #000 ${p}%, rgba(0,0,0,0) ${p + 8}%)`;
        return (
          <div key={i} style={{display: 'block'}}>
            <span style={{display: 'inline-block', WebkitMaskImage: mask, maskImage: mask, paddingRight: 6}}>
              {line || ' '}
            </span>
          </div>
        );
      })}
    </div>
  );
};
