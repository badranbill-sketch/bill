import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, EASE, EASE_SOFT, FONT, FPS } from '../brand';
import { TAGS, tr, type At, type Line, type Scene, type Tag } from '../content';
import { line as penLine } from '../primitives/pen';
import { appearAt, progressAt, readingSeconds, Scene as SceneCtx, useSceneDur } from '../primitives/time';

/* ------------------------------------------------------------------ */
/* Type scale (1920×1080, read on a laptop, sound off)                  */
/* ------------------------------------------------------------------ */

export const T = {
  title: { fontFamily: FONT.serif, fontWeight: 300, lineHeight: 1.12, letterSpacing: '-0.006em', color: C.ink } as React.CSSProperties,
  body: { fontFamily: FONT.sans, fontWeight: 400, lineHeight: 1.38, color: C.navy2 } as React.CSSProperties,
  strong: { fontFamily: FONT.sans, fontWeight: 600, lineHeight: 1.3, color: C.ink } as React.CSSProperties,
  muted: { fontFamily: FONT.sans, fontWeight: 400, lineHeight: 1.38, color: C.muted } as React.CSSProperties,
  serif: { fontFamily: FONT.serif, fontWeight: 400, lineHeight: 1.2, color: C.ink } as React.CSSProperties,
  pull: { fontFamily: FONT.serif, fontWeight: 300, fontStyle: 'italic', lineHeight: 1.28, color: C.ink } as React.CSSProperties,
};

/** Safe area. */
export const SAFE = { left: 150, right: 1770, top: 110, bottom: 980 } as const;

/* ------------------------------------------------------------------ */
/* Appear: a block that fades in at at[0] and keeps its layout space    */
/* ------------------------------------------------------------------ */

/**
 * Like Reveal, but always rendered (opacity 0 before it appears), so flow
 * layouts never shift when a later line comes in. `until` ends it early (a
 * page of a table that gives way to the next page).
 */
export const Appear: React.FC<{
  at?: At;
  until?: number;
  delay?: number;
  rise?: number;
  fadeOut?: number;
  /** The words this block asks the viewer to read, when not all of its text counts (a ledger row's source cell is a citation). */
  readText?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ at, until, delay = 0, rise = 8, fadeOut, readText, style, children }) => {
  const frame = useCurrentFrame();
  const dur = useSceneDur();
  const a: At | undefined = at ? [at[0] + delay, until ?? at[1]] : undefined;
  if (a && until !== undefined) warnHold(a, readText ?? textOf(children));
  const { opacity, y } = appearAt(frame, a, dur, { rise, fadeOut });
  return <div style={{ ...style, opacity: opacity * ((style?.opacity as number | undefined) ?? 1), transform: `translateY(${y.toFixed(2)}px)` }}>{children}</div>;
};

const warnHold = (a: At, text: string) => {
  if (!text) return;
  const need = readingSeconds(text);
  if (a[1] - a[0] + 1e-6 < need) console.warn(`[reading time] “${text.slice(0, 60)}…” held ${(a[1] - a[0]).toFixed(2)} s, needs ${need.toFixed(2)} s`);
};
const textOf = (n: React.ReactNode): string => {
  if (n === null || n === undefined || typeof n === 'boolean') return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(textOf).join(' ');
  if (React.isValidElement(n)) return textOf((n.props as { children?: React.ReactNode }).children);
  return '';
};

/** The scene-relative seconds of a line's appearance (0 when it has no timing). */
export const from = (l?: { at?: At }) => (l?.at ? l.at[0] : 0);

/* ------------------------------------------------------------------ */
/* Hand-ruled marks                                                     */
/* ------------------------------------------------------------------ */

/** A hand-ruled horizontal rule that draws itself left to right from `start` (seconds). */
export const HandRule: React.FC<{
  start: number;
  width: number;
  seed?: number;
  color?: string;
  strokeWidth?: number;
  dur?: number;
  opacity?: number;
  style?: React.CSSProperties;
}> = ({ start, width, seed = 3, color = C.rule, strokeWidth = 1.4, dur = 0.8, opacity = 1, style }) => {
  const frame = useCurrentFrame();
  const p = progressAt(frame, start, dur, EASE_SOFT);
  return (
    <svg width={width} height={8} style={{ position: 'absolute', overflow: 'visible', ...style }}>
      <path
        d={penLine(1, 4, width - 1, 4.4, seed, 0.7)}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity}
        pathLength={1}
        strokeDasharray="1 1"
        strokeDashoffset={1 - p}
      />
    </svg>
  );
};

/** A pen line between two frame points, drawn from a to b from `start`. */
export const PenStroke: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  start: number;
  dur?: number;
  seed?: number;
  color?: string;
  width?: number;
  opacity?: number;
  dot?: boolean;
}> = ({ x1, y1, x2, y2, start, dur = 0.8, seed = 5, color = C.ink, width = 1.5, opacity = 0.6, dot }) => {
  const frame = useCurrentFrame();
  const p = progressAt(frame, start, dur, EASE_SOFT);
  if (p <= 0) return null;
  return (
    <g opacity={opacity}>
      <path d={penLine(x1, y1, x2, y2, seed, 0.8)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
      {dot && p >= 1 && <circle cx={x2} cy={y2} r={3.2} fill={C.brass} />}
    </g>
  );
};

/** A small brass dash, the list bullet. */
export const Bullet: React.FC<{ start: number; top?: number; seed?: number }> = ({ start, top = 22, seed = 7 }) => {
  const frame = useCurrentFrame();
  const p = progressAt(frame, start, 0.5, EASE_SOFT);
  return (
    <svg width={26} height={12} viewBox="0 0 26 12" style={{ position: 'absolute', left: 0, top, overflow: 'visible' }}>
      <path d={penLine(1, 7, 22, 5, seed, 0.6)} fill="none" stroke={C.brass} strokeWidth={2.4} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* Status tags                                                          */
/* ------------------------------------------------------------------ */

/**
 * A status tag, as TAGS defines it: done = navy text with a brass tick;
 * open = muted italic, no tick; stop = navy text in a thin hand-ruled box.
 * Never red, never a fill, never letter-spaced capitals.
 */
export const TagMark: React.FC<{ tag: Tag; start: number; size?: number; style?: React.CSSProperties }> = ({ tag, start, size = 26, style }) => {
  const frame = useCurrentFrame();
  const t = TAGS[tag];
  const p = progressAt(frame, start + 0.25, 0.5, EASE_SOFT);
  const text = tr(t);
  if (t.tone === 'done') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: FONT.sans, fontSize: size, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap', ...style }}>
        <svg width={22} height={18} viewBox="0 0 22 18" style={{ overflow: 'visible', flex: 'none' }}>
          <path d="M2 10.5 L8 15.5 L20 2.5" fill="none" stroke={C.brass} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
        </svg>
        {text}
      </span>
    );
  }
  if (t.tone === 'open') {
    return <span style={{ fontFamily: FONT.sans, fontSize: size, fontStyle: 'italic', color: C.muted, whiteSpace: 'nowrap', ...style }}>{text}</span>;
  }
  return <BoxedText text={text} start={start} size={size} style={style} />;
};

/** Navy text in a thin hand-ruled box (the 'stop' tone): never red, never a fill. The box draws itself from `start`. */
export const BoxedText: React.FC<{ text: string; start: number; size?: number; weight?: number; style?: React.CSSProperties }> = ({ text, start, size = 26, weight = 600, style }) => {
  const frame = useCurrentFrame();
  const p = progressAt(frame, start + 0.25, 0.5, EASE_SOFT);
  const padX = 12;
  const w = Math.round(text.length * size * 0.5 + padX * 2 + 6);
  const h = Math.round(size * 1.55);
  const box = [
    penLine(1, 1, w - 1, 1.5, 21, 0.6),
    penLine(w - 1, 1, w - 1.5, h - 1, 22, 0.6),
    penLine(w - 1, h - 1, 1, h - 1.5, 23, 0.6),
    penLine(1.5, h - 1, 1, 1, 24, 0.6),
  ];
  return (
    <span style={{ position: 'relative', display: 'inline-block', padding: `${Math.round(size * 0.14)}px ${padX}px ${Math.round(size * 0.2)}px`, fontFamily: FONT.sans, fontSize: size, fontWeight: weight, color: C.ink, whiteSpace: 'nowrap', lineHeight: 1.2, ...style }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {box.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={C.ink} strokeWidth={1.3} strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - Math.max(0, Math.min(1, p * 4 - i))} />
        ))}
      </svg>
      {text}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* Header: kicker + title                                               */
/* ------------------------------------------------------------------ */

export const KickerLine: React.FC<{ line: Line; style?: React.CSSProperties }> = ({ line, style }) => {
  const frame = useCurrentFrame();
  const p = progressAt(frame, from(line), 0.5, EASE_SOFT);
  return (
    <Appear at={line.at} rise={6} style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: FONT.sans, fontSize: 26, color: C.muted, ...style }}>
      <svg width={26} height={14} viewBox="0 0 26 14" style={{ overflow: 'visible', flex: 'none' }}>
        <path d={penLine(1, 8, 24, 6, 5, 0.6)} fill="none" stroke={C.brass} strokeWidth={2.4} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
      </svg>
      <span>{tr(line)}</span>
    </Appear>
  );
};

/** Split a text after each separator ('. ' or '; '), keeping the separator's mark on the left part. Layout only. */
export const splitAfter = (text: string, sep?: string): string[] => {
  if (!sep) return [text];
  const out: string[] = [];
  let rest = text;
  let i = rest.indexOf(sep);
  while (i >= 0) {
    out.push(rest.slice(0, i + sep.trimEnd().length));
    rest = rest.slice(i + sep.length);
    i = rest.indexOf(sep);
  }
  out.push(rest);
  return out.filter(Boolean);
};

/** A text set as one block per sentence (or clause), each balanced on its own. */
export const Broken: React.FC<{ text: string; sep?: string }> = ({ text, sep }) => (
  <>
    {splitAfter(text, sep).map((part, i) => (
      <span key={i} style={{ display: 'block', textWrap: 'balance' }}>
        {part}
      </span>
    ))}
  </>
);

const KICKER_SPACE = 48;

/** Kicker and title, top-left, in normal flow inside an absolutely placed column. */
export const Header: React.FC<{ scene: Scene; size?: number; width?: number; left?: number; top?: number; gap?: number; breakAt?: string; style?: React.CSSProperties }> = ({
  scene,
  size = 64,
  width = 1500,
  left = SAFE.left,
  top = SAFE.top - 6,
  gap = 14,
  breakAt,
  style,
}) => (
  <div style={{ position: 'absolute', left, top, width, ...style }}>
    {scene.kicker ? <KickerLine line={scene.kicker} style={{ marginBottom: gap }} /> : <div style={{ height: KICKER_SPACE }} />}
    <Appear at={scene.title.at} style={{ ...T.title, fontSize: size, textWrap: 'balance', marginLeft: -3 }}>
      <Broken text={tr(scene.title)} sep={breakAt} />
    </Appear>
  </div>
);

/**
 * Split "Records: Supabase" into a lead and the rest (layout only; the words are unchanged).
 * `soft`: a text with no colon takes its lead from before its first ';' or ',' (the name of the
 * piece), so every row of a table or label of a diagram gets the same lead treatment.
 */
export const splitLead = (text: string, soft = false): [string | null, string] => {
  const i = text.indexOf(': ');
  if (i >= 0 && i <= 40) return [text.slice(0, i + 1), text.slice(i + 2)];
  if (!soft) return [null, text];
  const m = text.match(/^([^:;,]{1,40}[;,]) (.+)$/);
  return m ? [m[1], m[2]] : [null, text];
};

/** Text of an item with its lead (before the first colon; with `soft`, else before the first ';' or ',') set in the strong face. */
export const LeadText: React.FC<{ text: string; leadColor?: string; soft?: boolean }> = ({ text, leadColor = C.ink, soft = false }) => {
  const [lead, rest] = splitLead(text, soft);
  if (!lead) return <>{text}</>;
  return (
    <>
      <span style={{ fontWeight: 600, color: leadColor }}>{lead}</span> {rest}
    </>
  );
};

/** Text whose trailing "(HB-…)" reference stays on one line, in the muted colour. Layout only. */
export const RefText: React.FC<{ text: string }> = ({ text }) => {
  const m = text.match(/^(.*?)\s*(\((?:[^()]*HB-[^()]*)\))$/);
  if (!m) return <>{text}</>;
  return (
    <>
      {m[1]} <span style={{ whiteSpace: 'nowrap', color: C.muted }}>{m[2]}</span>
    </>
  );
};


/* ------------------------------------------------------------------ */
/* Scene shell: fades, chapter mark                                     */
/* ------------------------------------------------------------------ */

const FADE_IN = Math.round(0.3 * FPS);
const FADE_OUT = Math.round(0.5 * FPS);

export const SceneShell: React.FC<{ scene: Scene; index: number; frames: number; children: React.ReactNode }> = ({ scene, index, frames, children }) => {
  const frame = useCurrentFrame();
  const fin = interpolate(frame, [0, FADE_IN], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
  const fout = interpolate(frame, [frames - FADE_OUT, frames - 1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
  return (
    <SceneCtx dur={scene.dur}>
      <AbsoluteFill style={{ opacity: Math.min(fin, fout) }}>
        {children}
        <ChapterMark index={index} name={scene.name} />
      </AbsoluteFill>
    </SceneCtx>
  );
};

/** A quiet chapter mark at the bottom-left: the scene number and name. */
export const ChapterMark: React.FC<{ index: number; name: string }> = ({ index, name }) => (
  <div style={{ position: 'absolute', left: SAFE.left, top: 1018, display: 'flex', alignItems: 'baseline', gap: 12, fontFamily: FONT.sans, fontSize: 21, color: C.muted }}>
    <span style={{ fontWeight: 600, color: C.brassInk, fontVariantNumeric: 'tabular-nums' }}>{String(index + 1).padStart(2, '0')}</span>
    <span>{name}</span>
  </div>
);

/** Fourteen short hand-ruled dashes at the bottom-right: where we are in the briefing. Persistent across scenes. */
export const Progress: React.FC<{ bounds: number[]; total: number }> = ({ bounds, total }) => {
  const frame = useCurrentFrame();
  const n = bounds.length - 1;
  const w = 24;
  const gap = 8;
  const x0 = SAFE.right - n * (w + gap) + gap;
  const endFade = interpolate(frame, [total - FADE_OUT, total - 1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
  const startFade = interpolate(frame, [0, FADE_IN], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: Math.min(endFade, startFade) }}>
      {Array.from({ length: n }, (_, i) => {
        const a = bounds[i];
        const b = bounds[i + 1];
        // 0 before the scene, 1 during it, 0.5 after it; eased over the scene's first and last frames.
        const on = interpolate(frame, [a - 1, a + 8, b - 8, b + 1], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const past = frame >= b ? 1 : 0;
        const color = on > 0.01 ? C.brass : past ? C.blueGrey : C.rule;
        const x = x0 + i * (w + gap);
        return <path key={i} d={penLine(x, 1030, x + w, 1029.5, 40 + i, 0.4)} stroke={color} strokeWidth={on > 0.01 ? 2.2 + on * 0.6 : 2} strokeLinecap="round" fill="none" opacity={on > 0.01 ? 0.5 + on * 0.5 : 1} />;
      })}
    </svg>
  );
};
