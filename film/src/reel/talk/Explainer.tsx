import React from 'react';
import {Handwriting, InkStroke, loop} from '../../components/sketch';
import {useT} from '../../components/stage';
import {sketch} from '../../design/palette';
import {SERIF} from '../../design/typography';
import {fmEase, keyframes} from '../motion';
import {ReelInk} from '../stage';
import {cue, f, SEGMENTS} from './edit';

// The explainer, drawn in the sketchbook's ink as Bill talks, every move keyed to the word he is saying. One meaning
// per colour: navy is the pension he keeps, brass is his income (the line), and what Ottawa takes back simply empties
// out of the bar (paper with a faint hatch).
//   split opens             the bar sweeps in, full: « votre PSV »
//   « …au complet »         it empties (0.45 s) and stays empty; it is full again behind the next move
//   « si votre revenu… »    the brass line runs along the income line from 60 000 $
//   « …dépasse 95 323 $ »   the threshold is marked
//   « Ottawa récupère… »    past it, the bar empties in proportion: « repris par Ottawa »
//   « À 155 000 $… rien »   almost empty; an ink circle round what is left, « presque plus rien »
// Laid out for the split screen (picture above y 820); the parent moves it for the other layouts.
// The figures are Bill's (2026, ages 65–74; see src/data/talk-transcript.json `check`).

export const talkCopy = {
  title: 'Récupération de la PSV', // NEW COPY
  hook1: 'Ottawa peut reprendre', // NEW COPY (Bill's point, as the hook)
  hook2: 'toute votre PSV', // NEW COPY
  income: 'revenu net', // NEW COPY
  counter: 'votre revenu net', // NEW COPY
  pension: 'votre PSV', // NEW COPY
  taken: 'repris par Ottawa', // NEW COPY
  threshold: '95\u00a0323\u00a0$', // NEW COPY (Bill's figure; the published 2026 threshold)
  rateCents: '15\u00a0¢', // NEW COPY (with rateRest: « 15 ¢ par dollar au-dessus »)
  rateRest: ' par dollar au-dessus',
  full: '155\u00a0000\u00a0$', // NEW COPY (Bill's figure; ≈ 154 708 $ for ages 65–74 in 2026)
  nothing: 'presque plus rien', // NEW COPY
} as const;

export const X0 = 96;
export const X1 = 940;
const MAX = 180000;
const START = 60000;
const xOf = (income: number) => X0 + ((X1 - X0) * income) / MAX;
const XS = xOf(START);
const XT = xOf(95323);
const XF = xOf(155000);
export const ROW = {label: 948, bar: 1004, line: 1180};
const BAR = {x: X0, y: ROW.bar, w: X1 - X0, h: 80};

/** Where « votre revenu » is on the income line at frame t, word by word (it starts at 60 000 $). */
const dotAt = (t: number) =>
  keyframes(
    t,
    [cue('si'), cue('dépasse', 0, 'e'), cue('récupère'), cue('montant', 0, 'e'), cue('À'), cue('155000', 0, 'e')],
    [XS, XT, XT, XT + 0.32 * (XF - XT), XT + 0.32 * (XF - XT), XF],
    [fmEase.inOut, fmEase.linear, fmEase.inOut, fmEase.linear, fmEase.inOut],
  );

/** The income the dot stands for at frame t (for the counter): lands exactly on Bill's two figures. */
export const incomeAt = (t: number) => {
  const x = dotAt(t);
  if (Math.abs(x - XT) < 0.5) return 95323;
  if (Math.abs(x - XF) < 0.5) return 155000;
  return Math.round((((x - X0) / (X1 - X0)) * MAX) / 100) * 100;
};

/** The explainer opens with the split screen (the start of the second kept part). */
export const EXPLAINER_IN = f(SEGMENTS[1].at);
const EXPLAIN = f(SEGMENTS[2].at);
const PUNCHLINE = f(SEGMENTS[3].at);

/** Handwriting at a calm, steady pace: every note is written in about 0.4 s. */
const write = (text: string) => Math.max(18, Math.round(text.length / 0.42));

export const Explainer: React.FC<{style?: React.CSSProperties}> = ({style}) => {
  const t = useT();
  const c = talkCopy;
  const xDot = dotAt(t);

  // the bar: sweeps in full; empties on « au complet » and holds; full again behind the move into the explanation;
  // then empties in proportion to the income above the threshold
  const sweep = keyframes(t, [EXPLAINER_IN + 6, EXPLAINER_IN + 21], [0, 1], fmEase.out);
  const scare = keyframes(t, [cue('complet', 0, 's', -0.05), cue('complet', 0, 's', 0.4), EXPLAIN + 3, EXPLAIN + 12], [0, 1, 1, 0], fmEase.inOut);
  const above = Math.min(1, Math.max(0, (xDot - XT) / (XF - XT))) * 0.96;
  const gone = Math.max(scare, above);
  const inner = BAR.w - 10;
  const pensionOut = keyframes(t, [cue('rien', 0, 's', -0.45), cue('rien', 0, 's', -0.3)], [1, 0], fmEase.soft);
  const pulse = 1 + 0.035 * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - cue('rien')) / 8)));
  const lineOn = keyframes(t, [cue('si', 0, 's', -0.1), cue('si', 0, 's', 0.15)], [0, 1], fmEase.soft);
  const rateOut = keyframes(t, [PUNCHLINE - 4, PUNCHLINE + 4], [1, 0], fmEase.soft);

  const serif = (size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
    position: 'absolute',
    fontFamily: `${SERIF}, serif`,
    fontWeight: 600,
    fontSize: size,
    color: sketch.ink,
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
    ...extra,
  });
  const appear = (from: number) => keyframes(t, [from, from + 8], [0, 1], fmEase.out);
  const keptW = inner * sweep * (1 - gone);
  const circle = loop(BAR.x + 30, BAR.y + BAR.h / 2, 62, 62, 'talk-rien', 1.08);

  return (
    <div style={{position: 'absolute', inset: 0, ...style}}>
      <Handwriting text={c.pension} start={EXPLAINER_IN + 6} speed={write(c.pension)} left={X0} top={ROW.label - 4} variant="hand" style={{fontSize: 50}} opacity={pensionOut} />
      <Handwriting text={c.nothing} start={cue('rien', 0, 's', -0.25)} speed={write(c.nothing)} left={X0} top={ROW.label - 8} variant="hand" style={{fontSize: 58}} />

      {/* the pension bar: navy is what he keeps; what Ottawa takes back empties out */}
      <div style={{position: 'absolute', left: BAR.x, top: BAR.y, width: BAR.w, height: BAR.h, scale: String(pulse), transformOrigin: 'left center'}}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 10,
            border: `2px solid ${sketch.ink}`,
            opacity: Math.min(1, sweep * 2),
            background: `repeating-linear-gradient(-45deg, rgba(30,42,62,0.13) 0 2px, rgba(30,42,62,0) 2px 12px)`,
          }}
        />
        <div style={{position: 'absolute', left: 5, top: 5, width: keptW, height: BAR.h - 10, borderRadius: 7, background: sketch.ink, opacity: 0.92}} />
      </div>
      <Handwriting
        text={c.taken}
        start={cue('récupère')}
        speed={write(c.taken)}
        left={X1 - 290}
        top={BAR.y + BAR.h + 6}
        variant="hand"
        style={{fontSize: 46}}
        color={sketch.inkSoft}
        opacity={pensionOut}
      />

      <ReelInk>
        {/* « presque plus rien »: an ink circle round what is left */}
        <InkStroke d={circle} start={cue('rien', 0, 's', -0.1)} duration={12} width={4} />
        {/* the income line, its two marks, and the brass line for « votre revenu » */}
        <InkStroke d={`M ${X0} ${ROW.line} L ${X1} ${ROW.line}`} start={EXPLAINER_IN + 4} duration={14} width={5} />
        <InkStroke d={`M ${XT} ${ROW.line - 28} L ${XT} ${ROW.line + 28}`} start={cue('95323')} duration={7} width={4} />
        <InkStroke d={`M ${XF} ${ROW.line - 28} L ${XF} ${ROW.line + 28}`} start={cue('155000')} duration={7} width={4} />
        {lineOn > 0.01 && (
          <g opacity={lineOn}>
            <line x1={X0} y1={ROW.line} x2={xDot} y2={ROW.line} stroke={sketch.brass} strokeWidth={10} strokeLinecap="round" />
            <circle cx={xDot} cy={ROW.line} r={16} fill={sketch.brass} stroke={sketch.printBorder} strokeWidth={3} />
          </g>
        )}
      </ReelInk>
      <Handwriting text={c.income} start={EXPLAINER_IN + 10} speed={write(c.income)} left={X0} top={ROW.line + 26} variant="hand" style={{fontSize: 54}} />
      <div style={{...serif(44, {left: XT - 96, top: ROW.line + 34}), opacity: appear(cue('95323'))}}>{c.threshold}</div>
      <div style={{...serif(44, {left: XF - 124, top: ROW.line + 34}), opacity: appear(cue('155000'))}}>{c.full}</div>
      <div
        style={{
          position: 'absolute',
          left: XT - 96,
          top: ROW.line + 96,
          whiteSpace: 'nowrap',
          color: sketch.ink,
          opacity: appear(cue('15')) * rateOut,
        }}
      >
        <span style={{fontFamily: `${SERIF}, serif`, fontWeight: 600, fontSize: 42}}>{c.rateCents}</span>
        <span style={{fontFamily: 'Caveat, cursive', fontWeight: 500, fontSize: 48}}>{c.rateRest}</span>
      </div>
    </div>
  );
};
