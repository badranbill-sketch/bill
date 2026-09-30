import React, { useId, useMemo } from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, EASE, EASE_PEN, WASH } from '../brand';
import { DRAWINGS, type DrawingName, type InkData, type InkStroke } from '../data/ink';

/**
 * One of the website's pen drawings, drawn stroke by stroke.
 *
 * The data comes from scripts/prep-ink.mjs: every stroke of the site's SVG,
 * in the order the site's code drew it. The pen works like an illustrator:
 * a few faint pencil construction marks, then every ink contour, then the
 * hatching pass (order="passes", the default), or contours then hatching one
 * object at a time (order="objects"; only useful where the site's code keeps
 * an object's hatching next to its contours). The washes only fade in
 * afterwards: ink first, wash after, as on the site.
 *
 * Ink lines are thin filled outlines (the site's tapered nib). Each one is
 * revealed through a mask: a round-capped stroke that travels along the
 * outline's first edge and is as wide as the nib, so the line appears from
 * its start to its end with the taper intact. Hatching and pencil lines are
 * centre lines, revealed by their own dash.
 */

type Plan = { s: InkStroke; a: number; b: number }[];

// Relative pen time per stroke: ink outlines are twice the length of the line
// they draw; hatching is quick; each stroke adds a small pen lift.
const weight = (s: InkStroke) => {
  if (s.kind === 'pencil') return s.len * 0.3 + 2;
  if (s.kind === 'hatch' || s.kind === 'hatchSoft') return s.len * 0.55 + 2;
  return s.len * 0.5 + 6;
};
const phase = (s: InkStroke) => (s.kind === 'ink' || s.kind === 'inkSoft' ? 0 : 1);

export type PenOrder = 'passes' | 'objects';

/** Order the strokes and give each a window [a, b] inside 0..1 of the pen's time. */
export const planStrokes = (data: InkData, order: PenOrder = 'passes', overlap = 0.8, groups?: readonly number[]): Plan => {
  const indexed = data.strokes.map((s, i) => ({ s, i })).filter(({ s }) => !groups || groups.includes(s.g));
  const pencil = indexed.filter(({ s }) => s.kind === 'pencil');
  const group = (s: InkStroke) => (order === 'objects' ? s.g : 0);
  const rest = indexed
    .filter(({ s }) => s.kind !== 'pencil')
    .sort((x, y) => group(x.s) - group(y.s) || phase(x.s) - phase(y.s) || x.i - y.i);
  const ordered = [...pencil, ...rest].map(({ s }) => s);
  const total = ordered.reduce((t, s) => t + weight(s), 0) || 1;
  let acc = 0;
  const raw = ordered.map((s) => {
    const a = acc / total;
    acc += weight(s);
    const b = acc / total;
    // Let the next strokes start before this one ends, so the hand keeps flowing.
    return { s, a, b: b + (b - a) * overlap + 0.01 };
  });
  const end = Math.max(...raw.map((p) => p.b));
  return raw.map((p) => ({ s: p.s, a: p.a / end, b: p.b / end }));
};

const INK_STYLE: Record<InkStroke['kind'], { color: string; opacity: number }> = {
  ink: { color: C.ink, opacity: 1 },
  inkSoft: { color: C.navy2, opacity: 0.85 },
  hatch: { color: C.ink, opacity: 0.42 },
  hatchSoft: { color: C.navy2, opacity: 0.28 },
  pencil: { color: C.blueGrey, opacity: 0.5 },
};

export type InkDrawProps = {
  name: DrawingName;
  /** Seconds (from the start of the enclosing Sequence) when the pen starts. */
  start: number;
  /** Seconds the pen takes for pencil, contours and hatching. */
  dur: number;
  /** On-screen width in px; the height follows the drawing (or the crop). */
  width: number;
  /** Seconds after `start` when the washes begin to fade in. Default: 85% of `dur`. */
  washDelay?: number;
  /** Seconds each wash takes to fade in. */
  washDur?: number;
  /** Show only this part of the drawing: [x, y, w, h] in the drawing's own units. */
  crop?: readonly [number, number, number, number];
  /** Leave the washes out entirely. */
  noWash?: boolean;
  /** 'passes' (default): all contours, then all hatching. 'objects': contours then hatching, object by object. */
  order?: PenOrder;
  /** Draw only the strokes of these object groups (`g`), e.g. one object of the system map. */
  groups?: readonly number[];
  style?: React.CSSProperties;
};

export const InkDraw: React.FC<InkDrawProps> = ({ name, start, dur, width, washDelay, washDur = 1.4, crop, noWash, order = 'passes', groups, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const data = DRAWINGS[name];
  const groupKey = groups ? groups.join(',') : '';
  // groups is keyed by its contents, so a new array with the same groups does not re-plan.
  const plan = useMemo(() => planStrokes(data, order, 0.8, groups), [data, order, groupKey]);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const filterId = `wash-${name}-${uid}`;
  const maskId = `pen-${name}-${uid}`;

  const [vx, vy, vw, vh] = crop ?? (data.viewBox as [number, number, number, number]);
  const height = (width * vh) / vw;
  const t = frame / fps - start;
  const P = interpolate(t, [0, dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_PEN });
  const tWash = frame / fps - (start + (washDelay ?? dur * 0.85));

  if (t < 0) return <div style={{ position: 'absolute', width, height, ...style }} />;

  const done: React.ReactNode[] = [];
  const moving: React.ReactNode[] = [];
  const masks: React.ReactNode[] = [];
  const lines: React.ReactNode[] = [];

  plan.forEach(({ s, a, b }, i) => {
    const p = P >= 1 ? 1 : Math.max(0, Math.min(1, (P - a) / (b - a)));
    if (p <= 0) return;
    const look = INK_STYLE[s.kind];
    const opacity = look.opacity * (s.o ?? 1);
    if (s.kind === 'ink' || s.kind === 'inkSoft') {
      const path = <path key={i} d={s.d} fill={look.color} opacity={opacity} />;
      if (p >= 1) {
        done.push(path);
        return;
      }
      moving.push(path);
      // Half of the outline is one full edge of the line; a little more covers the far end's taper.
      const q = p * 0.58;
      masks.push(
        <path
          key={i}
          d={s.d}
          fill="none"
          stroke="#fff"
          strokeWidth={(s.nib ?? 1.4) * 2 + 0.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - q}
        />,
      );
      return;
    }
    lines.push(
      <path
        key={i}
        d={s.d}
        fill="none"
        stroke={look.color}
        strokeWidth={s.w ?? 0.6}
        strokeLinecap="round"
        opacity={opacity}
        {...(p < 1 ? { pathLength: 1, strokeDasharray: '1 1', strokeDashoffset: 1 - p } : {})}
      />,
    );
  });

  return (
    <div style={{ position: 'absolute', width, height, ...style }}>
      <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} width={width} height={height} style={{ display: 'block', overflow: 'hidden' }}>
        <defs>
          {/* The site's watercolour filter (components/ink/primitives.tsx → Art defs). */}
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.024" numOctaves={3} seed={4} result="warp" />
            <feDisplacementMap in="SourceGraphic" in2="warp" scale={3.5} xChannelSelector="R" yChannelSelector="G" result="shape" />
            <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves={2} seed={11} result="grain" />
            <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.35 1.05" result="speck" />
            <feComposite in="shape" in2="speck" operator="in" result="grainy" />
            <feGaussianBlur in="grainy" stdDeviation={0.6} />
          </filter>
          {masks.length > 0 && (
            <mask id={maskId} maskUnits="userSpaceOnUse" x={vx - 20} y={vy - 20} width={vw + 40} height={vh + 40}>
              {masks}
            </mask>
          )}
        </defs>
        {!noWash &&
          data.washes.map((w, i) => {
            const o = interpolate(tWash - i * 0.18, [0, washDur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
            if (o <= 0) return null;
            return (
              <g key={i} filter={`url(#${filterId})`} opacity={w.opacity * o} color={WASH[w.tone] ?? WASH.blue}>
                <path d={w.d} fill="currentColor" opacity={0.34} />
                <path d={w.d} fill="none" stroke="currentColor" strokeWidth={0.8} opacity={0.22} />
              </g>
            );
          })}
        {lines}
        {done}
        {moving.length > 0 && <g mask={`url(#${maskId})`}>{moving}</g>}
      </svg>
    </div>
  );
};

/** Aspect ratio (w / h) of a drawing, or of a crop of it. */
export const inkRatio = (name: DrawingName, crop?: readonly [number, number, number, number]) => {
  const [, , w, h] = crop ?? (DRAWINGS[name].viewBox as [number, number, number, number]);
  return w / h;
};
