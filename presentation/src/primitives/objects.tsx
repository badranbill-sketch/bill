import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { ASSETS } from '../assets';
import { C, EASE_SOFT, FONT } from '../brand';
import { DECISION_LABEL, tr, WORDMARK, type Line, type Status } from '../content';
import { Handwrite, SmallCaps, StatusTag, Stroke } from './basics';
import { line, poly, rng } from './pen';
import { Reveal, progressAt, stagger, useAppear, type At } from './time';

/* ------------------------------------------------------------------ Signpost */

/**
 * A wooden post with a plank pointing right. Drawn by pen from `start`; the label
 * (if any) is handwritten on the plank once it is there.
 */
export const Signpost: React.FC<{
  start: number;
  label?: Line;
  plank?: number; // plank length, px
  scale?: number;
  seed?: number;
  x: number;
  y: number;
  drawDur?: number;
}> = ({ start, label, plank = 300, scale = 1, seed = 5, x, y, drawDur = 1.1 }) => {
  const frame = useCurrentFrame();
  const p = progressAt(frame, start, drawDur, EASE_SOFT);
  const wash = progressAt(frame, start + drawDur * 0.7, 0.8);
  const L = plank;
  const W = L + 40;
  const H = 190;
  const postX = 46;
  const plankPts: [number, number][] = [
    [16, 34],
    [L - 12, 28],
    [L + 22, 58],
    [L - 10, 90],
    [16, 92],
  ];
  const postL = line(postX, 20, postX - 1, H - 6, seed, 0.8);
  const postR = line(postX + 14, 22, postX + 15, H - 4, seed + 1, 0.8);
  const plankD = poly(plankPts, true, seed + 2, 0.7);
  const grain1 = line(34, 52, L - 30, 49, seed + 3, 0.6);
  const grain2 = line(40, 74, L - 60, 72, seed + 4, 0.6);
  const ground = line(postX - 30, H - 4, postX + 44, H - 5, seed + 5, 0.6);
  if (p <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: W * scale, height: H * scale }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W * scale} height={H * scale} style={{ overflow: 'visible' }}>
        <rect x={postX} y={24} width={14} height={H - 28} fill={C.stone} opacity={0.45 * wash} />
        <Stroke d={postL} p={stagger(p, 0, 6)} width={2.2} />
        <Stroke d={postR} p={stagger(p, 1, 6)} width={2.2} />
        {/* The plank sits in front of the post. */}
        <path d={`M${plankPts.map((q) => q.join(' ')).join('L')}Z`} fill={C.paper2} opacity={Math.min(1, stagger(p, 2, 6) * 1.6)} />
        <path d={`M${plankPts.map((q) => q.join(' ')).join('L')}Z`} fill={C.stone} opacity={0.34 * wash} />
        <Stroke d={plankD} p={stagger(p, 2, 6)} width={2.4} />
        <Stroke d={grain1} p={stagger(p, 3, 6)} width={1} opacity={0.4} />
        <Stroke d={grain2} p={stagger(p, 4, 6)} width={1} opacity={0.4} />
        <Stroke d={ground} p={stagger(p, 5, 6)} width={1.4} opacity={0.6} />
      </svg>
      {label ? (
        <Handwrite
          line={label}
          at={[start + drawDur * 0.8, 999]}
          size={46 * scale}
          weight={500}
          color={C.ink}
          tilt={-1.2}
          style={{ left: 30 * scale, top: 30 * scale, width: (L - 20) * scale }}
        />
      ) : null}
    </div>
  );
};

/* ------------------------------------------------------------------- Mark / wordmark */

/** The brand mark. Uses the supplied BB-sunrise art when present; otherwise a neutral placeholder. */
export const Mark: React.FC<{ size: number; style?: React.CSSProperties; mono?: boolean }> = ({ size, style }) => {
  if (ASSETS.mark) {
    return <Img src={staticFile(ASSETS.mark)} style={{ width: size, height: size, objectFit: 'contain', ...style }} />;
  }
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} style={style}>
      <circle cx={32} cy={32} r={30} fill="none" stroke={C.ink} strokeWidth={2} />
      <path d="M13 40 H51" stroke={C.ink} strokeWidth={2} strokeLinecap="round" />
      <path d="M20 40 A12 12 0 0 1 44 40" fill="none" stroke={C.ink} strokeWidth={2} />
    </svg>
  );
};

export const Wordmark: React.FC<{ size?: number; color?: string; style?: React.CSSProperties }> = ({
  size = 16,
  color = C.ink,
  style,
}) => (
  <SmallCaps size={size} color={color} spacing="0.22em" style={style}>
    {tr(WORDMARK)}
  </SmallCaps>
);

/* ------------------------------------------------------------------- Book cover */

/** The guide's cover. The approved cover image when supplied; otherwise a quiet stand-in built from the guide's cover drawing. */
export const BookCover: React.FC<{ w: number; h: number; style?: React.CSSProperties; shadow?: boolean }> = ({
  w,
  h,
  style,
  shadow = true,
}) => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: w,
    height: h,
    borderRadius: 3,
    overflow: 'hidden',
    boxShadow: shadow ? '0 18px 40px rgba(14,34,51,0.16), 0 2px 6px rgba(14,34,51,0.12)' : undefined,
    ...style,
  };
  if (ASSETS.cover) {
    return (
      <div style={base}>
        <Img src={staticFile(ASSETS.cover)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }
  return (
    <div style={{ ...base, background: C.paper2, border: `1px solid ${C.rule}` }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: h * 0.62, background: C.ink }} />
      <Img
        src={staticFile('plates/cover-art.svg')}
        style={{
          position: 'absolute',
          left: w * 0.08,
          top: h * 0.08,
          width: w * 0.84,
          height: w * 0.84 * (604 / 816),
          background: C.paper,
          borderRadius: 2,
        }}
      />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: h * 0.1, textAlign: 'center' }}>
        <Mark size={w * 0.16} style={{ display: 'block', margin: '0 auto 10px' }} />
        <Wordmark size={Math.max(9, w * 0.045)} />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------- Book flip */

/** A page of the guide showing one of its drawings, with no text. */
export const PlatePage: React.FC<{ src: string; ratio: number; w: number; h: number }> = ({ src, ratio, w, h }) => {
  const portrait = ratio < 1;
  const aw = portrait ? w * 0.84 : w * 0.88;
  const ah = aw / ratio;
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fbfaf6' }}>
      <Img
        src={staticFile(src)}
        style={{ position: 'absolute', left: (w - aw) / 2, top: (h - Math.min(ah, h * 0.9)) / 2 - h * 0.02, width: aw, height: Math.min(ah, h * 0.9), objectFit: 'contain' }}
      />
    </div>
  );
};

/**
 * The guide opening like a book: the cover turns, then each illustrated page
 * turns slowly onto the left. Pages: cover first, then plates.
 */
export const BookFlip: React.FC<{
  x: number;
  y: number;
  pageW: number;
  pageH: number;
  start: number;
  every: number;
  turn?: number;
  plates: { src: string; ratio: number }[];
}> = ({ x, y, pageW, pageH, start, every, turn = 1.3, plates }) => {
  const frame = useCurrentFrame();
  const n = plates.length; // turns: cover + plates[0..n-2]
  const turnP = (k: number) => progressAt(frame, start + every * (k + 1) - turn * 0.5, turn, EASE_SOFT);
  const opened = turnP(0);
  // Closed book sits centred on the right page; it slides left a little as it opens.
  const shift = interpolate(opened, [0, 1], [-pageW * 0.5, 0]);
  const pages: React.ReactNode[] = [
    <BookCover key="cover" w={pageW} h={pageH} shadow={false} style={{ left: 0, top: 0 }} />,
    ...plates.map((pl, i) => <PlatePage key={i} src={pl.src} ratio={pl.ratio} w={pageW} h={pageH} />),
  ];
  // Index of the page currently lying face up on the right.
  let current = 0;
  for (let k = 0; k < n; k++) if (turnP(k) >= 1) current = k + 1;
  const turning = current < n && turnP(current) > 0 ? current : -1;
  const leftVisible = opened > 0.5;
  return (
    <div style={{ position: 'absolute', left: x + shift, top: y, width: pageW * 2, height: pageH, perspective: 2400 }}>
      {/* Left page: the back of the last turned page (blank paper). */}
      {leftVisible ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: pageW,
            height: pageH,
            background: '#f7f5ef',
            boxShadow: '0 14px 36px rgba(14,34,51,0.12)',
            borderRight: `1px solid ${C.rule}`,
            backgroundImage: 'linear-gradient(90deg, rgba(14,34,51,0) 80%, rgba(14,34,51,0.06) 100%)',
          }}
        />
      ) : null}
      {/* Right stack: the page underneath the current one, then the current one. */}
      <div
        style={{
          position: 'absolute',
          left: pageW,
          top: 0,
          width: pageW,
          height: pageH,
          boxShadow: '0 14px 36px rgba(14,34,51,0.14)',
          backgroundImage: 'linear-gradient(90deg, rgba(14,34,51,0.07) 0%, rgba(14,34,51,0) 14%)',
        }}
      >
        {turning >= 0 && pages[turning + 1] ? (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>{pages[turning + 1]}</div>
        ) : null}
        {turning < 0 ? <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>{pages[current]}</div> : null}
      </div>
      {turning >= 0 ? (
        <div
          style={{
            position: 'absolute',
            left: pageW,
            top: 0,
            width: pageW,
            height: pageH,
            transformOrigin: '0 50%',
            transformStyle: 'preserve-3d',
            transform: `rotateY(${-180 * turnP(turning)}deg)`,
          }}
        >
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', overflow: 'hidden' }}>
            {pages[turning]}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `rgba(14,34,51,${0.12 * Math.sin(Math.PI * turnP(turning))})`,
              }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: '#f7f5ef',
              boxShadow: 'inset -10px 0 24px rgba(14,34,51,0.06)',
            }}
          />
        </div>
      ) : null}
    </div>
  );
};

/* ------------------------------------------------------------------- Cards */

export const QuoteCard: React.FC<{ line: Line; footer: Line; w?: number; h?: number; style?: React.CSSProperties }> = ({
  line: l,
  footer,
  w = 330,
  h = 380,
  style,
}) => (
  <Reveal
    at={l.at}
    style={{
      position: 'absolute',
      width: w,
      height: h,
      background: C.paper2,
      border: `1px solid ${C.rule}`,
      borderRadius: 4,
      padding: '38px 32px 30px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      ...style,
    }}
  >
    <div style={{ fontFamily: FONT.serif, fontWeight: 300, fontSize: 31, lineHeight: 1.26, color: C.ink }}>{tr(l)}</div>
    <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 14 }}>
      <SmallCaps size={13} color={C.inkSoft} spacing="0.2em">
        {tr(footer)}
      </SmallCaps>
    </div>
  </Reveal>
);

export const DecisionCard: React.FC<{
  at: At;
  title: Line;
  body: Line;
  footer?: Line;
  status?: Status;
  w: number;
  h?: number;
  titleSize?: number;
  bodySize?: number;
  bodySerif?: boolean;
  style?: React.CSSProperties;
}> = ({ at, title, body, footer, status, w, h, titleSize = 36, bodySize = 23, bodySerif, style }) => (
  <Reveal
    at={at}
    style={{
      position: 'absolute',
      width: w,
      height: h,
      background: C.paper2,
      border: `2px solid ${C.brass}`,
      borderRadius: 4,
      padding: '26px 30px 28px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      ...style,
    }}
  >
    <SmallCaps size={14} color={C.brassInk} spacing="0.22em">
      {tr(DECISION_LABEL)}
    </SmallCaps>
    <div style={{ fontFamily: FONT.serif, fontWeight: 400, fontSize: titleSize, lineHeight: 1.1, color: C.ink }}>{tr(title)}</div>
    <div
      style={{
        fontFamily: bodySerif ? FONT.serif : FONT.sans,
        fontStyle: bodySerif ? 'italic' : 'normal',
        fontWeight: bodySerif ? 300 : 400,
        fontSize: bodySize,
        lineHeight: 1.38,
        color: C.navy2,
      }}
    >
      {tr(body)}
    </div>
    {status || footer ? (
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {status ? <StatusTag status={status} scale={0.85} /> : null}
        {footer ? (
          <span style={{ fontFamily: FONT.sans, fontSize: 19, color: C.inkSoft }}>{tr(footer)}</span>
        ) : null}
      </div>
    ) : null}
  </Reveal>
);

/* ------------------------------------------------------------------- Social post */

export const Post: React.FC<{ line: Line; size?: number; style?: React.CSSProperties; textSize?: number }> = ({
  line: l,
  size = 440,
  style,
  textSize = 36,
}) => (
  <Reveal
    at={l.at}
    style={{
      position: 'absolute',
      width: size,
      height: size,
      background: C.paper2,
      border: `1px solid ${C.rule}`,
      borderRadius: 6,
      boxShadow: '0 10px 30px rgba(14,34,51,0.07)',
      padding: 40,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      ...style,
    }}
  >
    <div style={{ fontFamily: FONT.serif, fontWeight: 300, fontSize: textSize, lineHeight: 1.22, color: C.ink }}>{tr(l)}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Mark size={30} />
      <Wordmark size={14} />
    </div>
  </Reveal>
);

/* ------------------------------------------------------------------- Flywheel */

export const Flywheel: React.FC<{
  cx: number;
  cy: number;
  r: number;
  labels: Line[];
  start: number;
  step: number;
}> = ({ cx, cy, r, labels, start, step }) => {
  const frame = useCurrentFrame();
  const n = labels.length;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pos = (i: number, rr = r) => [cx + Math.cos(ang(i)) * rr, cy + Math.sin(ang(i)) * rr] as const;
  const circleP = progressAt(frame, start - 0.4, 0.6);
  const nodeR = 11;
  const arc = (i: number) => {
    const gap = 0.16; // radians of clearance around each node
    const a0 = ang(i) + gap;
    const a1 = ang(i + 1) - gap;
    const pts: [number, number][] = [];
    for (let k = 0; k <= 10; k++) {
      const a = a0 + ((a1 - a0) * k) / 10;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    const [ex, ey] = pts[pts.length - 1];
    const tang = a1 + Math.PI / 2;
    const head = `M${ex + Math.cos(tang + 2.6) * 12} ${ey + Math.sin(tang + 2.6) * 12}L${ex} ${ey}L${ex + Math.cos(tang - 2.6) * 12} ${ey + Math.sin(tang - 2.6) * 12}`;
    return { body: `M${pts.map((q) => q.map((v) => v.toFixed(1)).join(' ')).join('L')}`, head };
  };
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, pointerEvents: 'none' }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.rule} strokeWidth={1.2} opacity={circleP} strokeDasharray="2 7" />
        {labels.map((_, i) => {
          const tNode = start + i * step;
          const lit = progressAt(frame, tNode, 0.45);
          const next = i + 1;
          const arcP = progressAt(frame, tNode + 0.25, step * 0.8, EASE_SOFT);
          const a = arc(i);
          const closing = next === n;
          const color = closing ? C.brass : C.navy2;
          const [x, y] = pos(i);
          const appear = progressAt(frame, tNode - 0.2, 0.4);
          return (
            <g key={i}>
              {appear > 0 ? (
                <circle
                  cx={x}
                  cy={y}
                  r={nodeR}
                  fill={lit > 0 ? `rgba(14,34,51,${lit})` : 'none'}
                  stroke={C.ink}
                  strokeWidth={1.8}
                  opacity={appear}
                />
              ) : null}
              <Stroke d={a.body} p={arcP} color={color} width={closing ? 3 : 1.8} />
              {arcP > 0.98 ? <path d={a.head} fill="none" stroke={color} strokeWidth={closing ? 3 : 1.8} strokeLinecap="round" strokeLinejoin="round" /> : null}
            </g>
          );
        })}
      </svg>
      {labels.map((l, i) => {
        const [x, y] = pos(i, r + 34);
        const c = Math.cos(ang(i));
        const s = Math.sin(ang(i));
        const tNode = start + i * step;
        const o = progressAt(frame, tNode, 0.5);
        const tx = c > 0.3 ? '0%' : c < -0.3 ? '-100%' : '-50%';
        const ty = s > 0.3 ? '0%' : s < -0.3 ? '-100%' : '-50%';
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: `translate(${tx}, ${ty})`,
              opacity: o,
              whiteSpace: 'nowrap',
              fontFamily: FONT.sans,
              fontWeight: 600,
              fontSize: 19,
              letterSpacing: '0.16em',
              color: C.ink,
            }}
          >
            {tr(l)}
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------- Timeline */

export const Timeline: React.FC<{
  x1: number;
  x2: number;
  y: number;
  stops: Line[];
  day1: Line;
  day90: Line;
  start: number;
}> = ({ x1, x2, y, stops, day1, day90, start }) => {
  const frame = useCurrentFrame();
  const n = stops.length;
  const lineP = progressAt(frame, start, 1.2, EASE_SOFT);
  const pad = 70;
  const sx = (i: number) => x1 + pad + ((x2 - x1 - pad * 2) * i) / (n - 1);
  const d = line(x1, y, x2, y, 21, 0.5);
  const endP = progressAt(frame, start + 1.0, 0.6);
  return (
    <>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <Stroke d={d} p={lineP} width={2} color={C.ink} />
        <circle cx={x1} cy={y} r={5} fill={C.ink} opacity={progressAt(frame, start, 0.3)} />
        <circle cx={x2} cy={y} r={7} fill="none" stroke={C.brass} strokeWidth={2.4} opacity={endP} />
        {stops.map((s, i) => {
          const at = s.at ?? [start, 999];
          const o = progressAt(frame, at[0], 0.6);
          const up = i % 2 === 0;
          return (
            <g key={i} opacity={o}>
              <line x1={sx(i)} x2={sx(i)} y1={y + (up ? -34 : 34)} y2={y + (up ? -20 : 20)} stroke={C.blueGrey} strokeWidth={1.2} />
              <circle cx={sx(i)} cy={y} r={17} fill={C.paper} stroke={C.ink} strokeWidth={1.6} />
              <text x={sx(i)} y={y + 6} textAnchor="middle" fontFamily="Source Sans 3" fontWeight={600} fontSize={16} fill={C.ink}>
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <Handwrite line={day1} size={46} color={C.navy2} style={{ left: x1 - 10, top: y + 22 }} />
      <Handwrite line={day90} size={46} color={C.navy2} style={{ left: x2 - 90, top: y + 22 }} />
      {stops.map((s, i) => {
        const up = i % 2 === 0;
        return (
          <Reveal
            key={i}
            at={s.at}
            rise={up ? 8 : -8}
            style={{
              position: 'absolute',
              left: sx(i) - 125,
              width: 250,
              top: up ? undefined : y + 44,
              bottom: up ? 1080 - y + 44 : undefined,
              textAlign: 'center',
              fontFamily: FONT.sans,
              fontSize: 21,
              lineHeight: 1.3,
              color: C.navy2,
            }}
          >
            {tr(s)}
          </Reveal>
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------- Drawn props */

/** A hand-drawn jar with a lid; drawn by pen, then a pale wash. */
export const Jar: React.FC<{ x: number; y: number; w: number; h: number; start: number; seed: number; tone?: string }> = ({
  x,
  y,
  w,
  h,
  start,
  seed,
  tone = C.blueGrey,
}) => {
  const frame = useCurrentFrame();
  const p = progressAt(frame, start, 1.0, EASE_SOFT);
  const wash = progressAt(frame, start + 0.7, 0.8);
  if (p <= 0) return null;
  const neck = w * 0.18;
  const body: [number, number][] = [
    [neck, h * 0.2],
    [neck - 4, h * 0.26],
    [4, h * 0.36],
    [2, h * 0.88],
    [10, h - 2],
    [w - 10, h - 2],
    [w - 2, h * 0.88],
    [w - 4, h * 0.36],
    [w - neck + 4, h * 0.26],
    [w - neck, h * 0.2],
  ];
  const lid: [number, number][] = [
    [neck - 6, h * 0.06],
    [w - neck + 6, h * 0.05],
    [w - neck + 7, h * 0.19],
    [neck - 7, h * 0.2],
  ];
  const r = rng(seed);
  const level = h * (0.45 + r() * 0.25);
  return (
    <svg style={{ position: 'absolute', left: x, top: y, overflow: 'visible' }} width={w} height={h}>
      <path d={`M4 ${level} Q${w / 2} ${level + 4} ${w - 4} ${level} L${w - 3} ${h * 0.88} L${w - 10} ${h - 3} L10 ${h - 3} L3 ${h * 0.88}Z`} fill={tone} opacity={0.32 * wash} />
      <path d={`M${lid.map((q) => q.join(' ')).join('L')}Z`} fill={C.stone} opacity={0.5 * wash} />
      <Stroke d={poly(body, false, seed, 0.8)} p={stagger(p, 0, 3)} width={2} />
      <Stroke d={poly(lid, true, seed + 1, 0.6)} p={stagger(p, 1, 3)} width={2} />
      <Stroke d={line(8, h * 0.5, 8, h * 0.8, seed + 2, 0.5)} p={stagger(p, 2, 3)} width={1} opacity={0.4} />
    </svg>
  );
};

/** A hand-drawn envelope. */
export const Envelope: React.FC<{ x: number; y: number; w: number; start: number; seed: number }> = ({ x, y, w, start, seed }) => {
  const frame = useCurrentFrame();
  const h = w * 0.64;
  const p = progressAt(frame, start, 0.9, EASE_SOFT);
  const wash = progressAt(frame, start + 0.5, 0.7);
  if (p <= 0) return null;
  const box = poly([[2, 2], [w - 2, 3], [w - 3, h - 2], [3, h - 3]], true, seed, 0.6);
  const flap = poly([[3, 4], [w / 2, h * 0.56], [w - 3, 4]], false, seed + 1, 0.6);
  const lower = poly([[4, h - 4], [w * 0.4, h * 0.46]], false, seed + 2, 0.5);
  const lower2 = poly([[w - 4, h - 4], [w * 0.6, h * 0.46]], false, seed + 3, 0.5);
  return (
    <svg style={{ position: 'absolute', left: x, top: y, overflow: 'visible' }} width={w} height={h}>
      <rect x={2} y={2} width={w - 4} height={h - 4} fill={C.paper2} opacity={wash} />
      <path d={`M3 4 L${w / 2} ${h * 0.56} L${w - 3} 4Z`} fill={C.stone} opacity={0.3 * wash} />
      <Stroke d={box} p={stagger(p, 0, 4)} width={1.8} />
      <Stroke d={flap} p={stagger(p, 1, 4)} width={1.8} />
      <Stroke d={lower} p={stagger(p, 2, 4)} width={1.1} opacity={0.5} />
      <Stroke d={lower2} p={stagger(p, 3, 4)} width={1.1} opacity={0.5} />
    </svg>
  );
};

/** Two small navy silhouettes, a couple standing side by side. */
export const Couple: React.FC<{ x: number; y: number; h: number; opacity?: number }> = ({ x, y, h, opacity = 1 }) => {
  const s = h / 100;
  const person = (dx: number, tall: number, seed: number) => {
    const r = rng(seed);
    const hh = 100 * tall;
    const top = 100 - hh;
    const head = 7.5 * tall;
    return (
      <g transform={`translate(${dx} 0)`}>
        <ellipse cx={0} cy={top + head} rx={head * 0.82} ry={head} fill={C.ink} />
        <path
          d={`M${-7 * tall} ${top + head * 2.3} Q0 ${top + head * 1.9} ${7 * tall} ${top + head * 2.3} L${9 * tall} ${top + hh * 0.55} L${5.5 * tall} ${top + hh * 0.56} L${4.5 * tall} 100 L${1.2} 100 L0 ${top + hh * 0.66} L${-1.2} 100 L${-4.5 * tall} 100 L${-5.5 * tall} ${top + hh * 0.56} L${-9 * tall} ${top + hh * 0.55}Z`}
          fill={C.ink}
          opacity={0.92 + r() * 0.05}
        />
      </g>
    );
  };
  return (
    <svg style={{ position: 'absolute', left: x, top: y, overflow: 'visible', opacity }} width={40 * s} height={h} viewBox="-20 0 40 100">
      <ellipse cx={0} cy={100} rx={18} ry={2} fill={C.ink} opacity={0.12} />
      {person(-6, 1, 3)}
      {person(7, 0.93, 4)}
    </svg>
  );
};

/** A placeholder QR block: deliberately not scannable until /guide/book is live and tested. */
export const QrPending: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => {
  if (ASSETS.qr) return <Img src={staticFile(ASSETS.qr)} style={{ width: size, height: size, ...style }} />;
  const n = 21;
  const r = rng(99);
  const cells: React.ReactNode[] = [];
  const finder = (i: number, j: number) =>
    (i < 7 && j < 7) || (i < 7 && j >= n - 7) || (i >= n - 7 && j < 7);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      if (finder(i, j)) continue;
      if (r() < 0.42) cells.push(<rect key={`${i}-${j}`} x={j} y={i} width={1} height={1} fill={C.ink} />);
    }
  const F = (x: number, y: number) => (
    <g transform={`translate(${x} ${y})`}>
      <rect x={0.5} y={0.5} width={6} height={6} fill="none" stroke={C.ink} strokeWidth={1} />
      <rect x={2} y={2} width={3} height={3} fill={C.ink} />
    </g>
  );
  return (
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} width={size} height={size} style={{ background: '#fff', ...style }}>
      {cells}
      {F(0, 0)}
      {F(n - 7, 0)}
      {F(0, n - 7)}
    </svg>
  );
};

/* ------------------------------------------------------------------- Handwritten thought that drifts */

export const Drift: React.FC<{ line: Line; x: number; y: number; size?: number; tilt?: number; seed?: number; color?: string }> = ({
  line: l,
  x,
  y,
  size = 46,
  tilt = 0,
  seed = 1,
  color = C.navy2,
}) => {
  const frame = useCurrentFrame();
  const r = rng(seed);
  const ph = r() * 6.28;
  const dx = Math.sin(frame / 70 + ph) * 6;
  const dy = Math.cos(frame / 85 + ph) * 5;
  const { opacity } = useAppear(l.at, { fadeIn: 36, rise: 0 });
  if (opacity <= 0) return null;
  return (
    <Handwrite line={l} size={size} tilt={tilt} color={color} style={{ left: x + dx, top: y + dy }} />
  );
};

