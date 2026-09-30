import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, EASE_SOFT, FONT } from '../brand';
import { tr, type At, type Line } from '../content';
import { line as penLine } from './pen';
import { progressAt, readingSeconds, Reveal } from './time';

const warnShort = (where: string, l: Line, at: At | undefined) => {
  if (!at) return;
  const need = readingSeconds(tr(l));
  if (at[1] - at[0] + 1e-6 < need) {
    // Visible in the render log; `npm run qa` fails on the same rule.
    console.warn(`[reading time] ${where} “${tr(l)}” is held ${(at[1] - at[0]).toFixed(2)} s, needs ${need.toFixed(2)} s`);
  }
};

/**
 * A headline in Newsreader: sentence case, light weight, generous leading.
 * Magazine headline, not ad headline.
 */
export const Title: React.FC<{
  line: Line;
  at?: At;
  size?: number;
  weight?: 300 | 400;
  italic?: boolean;
  color?: string;
  style?: React.CSSProperties;
}> = ({ line, at, size = 88, weight = 300, italic, color = C.ink, style }) => {
  const when = at ?? line.at;
  warnShort('Title', line, when);
  if (!tr(line)) return null;
  return (
    <Reveal
      at={when}
      style={{
        position: 'absolute',
        fontFamily: FONT.serif,
        fontWeight: weight,
        fontStyle: italic ? 'italic' : 'normal',
        fontSize: size,
        lineHeight: 1.12,
        letterSpacing: size > 70 ? '-0.012em' : '-0.004em',
        color,
        textWrap: 'balance',
        ...style,
      }}
    >
      {tr(line)}
    </Reveal>
  );
};

/**
 * An on-screen text block in Source Sans 3 (the video is meant to be read,
 * sound off). Hold it at least readingSeconds(text): 0.3 s per word + 1.5 s.
 */
export const Caption: React.FC<{
  line: Line;
  at?: At;
  size?: number;
  color?: string;
  italic?: boolean;
  style?: React.CSSProperties;
}> = ({ line, at, size = 36, color = C.navy2, italic, style }) => {
  const when = at ?? line.at;
  warnShort('Caption', line, when);
  if (!tr(line)) return null;
  return (
    <Reveal
      at={when}
      rise={8}
      style={{
        position: 'absolute',
        fontFamily: FONT.sans,
        fontWeight: 400,
        fontStyle: italic ? 'italic' : 'normal',
        fontSize: size,
        lineHeight: 1.45,
        color,
        textWrap: 'pretty',
        ...style,
      }}
    >
      {tr(line)}
    </Reveal>
  );
};

/**
 * A small label, the site's way: sentence case with a brass tick, never
 * letter-spaced capitals. The tick draws itself as the label appears.
 */
export const Kicker: React.FC<{ line: Line; at?: At; size?: number; style?: React.CSSProperties }> = ({ line, at, size = 24, style }) => {
  const frame = useCurrentFrame();
  const when = at ?? line.at;
  const p = when ? progressAt(frame, when[0], 0.5, EASE_SOFT) : 1;
  if (!tr(line)) return null;
  return (
    <Reveal
      at={when}
      rise={6}
      style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: 14, fontFamily: FONT.sans, fontSize: size, color: C.muted, ...style }}
    >
      <svg width={26} height={14} viewBox="0 0 26 14" style={{ overflow: 'visible' }}>
        <path
          d={penLine(1, 8, 24, 6, 5, 0.6)}
          fill="none"
          stroke={C.brass}
          strokeWidth={2.4}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - p}
        />
      </svg>
      <span>{tr(line)}</span>
    </Reveal>
  );
};
