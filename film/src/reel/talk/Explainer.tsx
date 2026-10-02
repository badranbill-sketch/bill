import React from 'react';
import {Handwriting, InkStroke} from '../../components/sketch';
import {useT} from '../../components/stage';
import {sketch} from '../../design/palette';
import {SERIF} from '../../design/typography';
import {fmEase, keyframes} from '../motion';
import {ReelInk} from '../stage';
import {cue, f, SEGMENTS} from './edit';

// The explainer, drawn in the sketchbook's ink as Bill talks, every move keyed to the word he is saying:
//   « …au complet »          the pension bar empties (and stays empty until the explanation starts)
//   « si votre revenu… »     the brass line runs along the income line; the counter follows it
//   « …dépasse 95 323 $ »    the threshold is marked
//   « Ottawa récupère… »     past it, the part of the bar Ottawa takes back turns to brass hatching
//   « À 155 000 $… »         the line reaches 155 000 $ and there is « presque plus rien »
// Laid out for the split screen (picture above y 900); the parent moves and scales it for the other layouts.
// The figures are Bill's (2026, ages 65–74; see src/data/talk-transcript.json `check`).

export const talkCopy = {
  title: 'Récupération de la PSV', // NEW COPY
  stakes: 'Ottawa peut reprendre toute votre PSV', // NEW COPY (Bill's point, in a line)
  income: 'revenu net', // NEW COPY
  counter: 'votre revenu net', // NEW COPY
  pension: 'votre PSV', // NEW COPY
  threshold: '95 323 $', // NEW COPY (Bill's figure; the published 2026 threshold)
  thresholdNote: 'seuil 2026', // NEW COPY
  rate: '15 ¢ par dollar au-dessus', // NEW COPY
  full: '155 000 $', // NEW COPY (Bill's figure; ≈ 154 708 $ for ages 65–74 in 2026)
  nothing: 'presque plus rien', // NEW COPY
} as const;

export const X0 = 96;
export const X1 = 940;
const MAX = 180000;
const xOf = (income: number) => X0 + ((X1 - X0) * income) / MAX;
const XT = xOf(95323);
const XF = xOf(155000);
export const ROW = {bar: 1030, line: 1172};
const BAR = {x: X0, y: ROW.bar, w: 470, h: 66};

/** Where « votre revenu » is on the income line at frame t, word by word. */
const dotAt = (t: number) =>
  keyframes(
    t,
    [cue('si'), cue('dépasse', 0, 'e'), cue('récupère'), cue('montant', 0, 'e'), cue('À'), cue('155000', 0, 'e')],
    [X0, XT, XT, XT + 0.32 * (XF - XT), XT + 0.32 * (XF - XT), XF],
    [fmEase.inOut, fmEase.linear, fmEase.inOut, fmEase.linear, fmEase.inOut],
  );

/** The income the dot stands for at frame t (for the counter): lands exactly on Bill's two figures. */
export const incomeAt = (t: number) => {
  const x = dotAt(t);
  if (Math.abs(x - XT) < 0.5) return 95323;
  if (Math.abs(x - XF) < 0.5) return 155000;
  return Math.round((((x - X0) / (X1 - X0)) * MAX) / 100) * 100;
};

/** The explainer opens with the split screen (the start of the second kept part) and re-arms with the third. */
export const EXPLAINER_IN = f(SEGMENTS[1].at);
const EXPLAIN = f(SEGMENTS[2].at);

/** Handwriting at a calm, steady pace: every note is written in about 0.4 s. */
const write = (text: string) => Math.max(18, Math.round(text.length / 0.42));

export const Explainer: React.FC<{style?: React.CSSProperties}> = ({style}) => {
  const t = useT();
  const c = talkCopy;
  const xDot = dotAt(t);

  // the pension: drawn in on « pension », emptied on « au complet », refilled as the explanation opens
  const barIn = keyframes(t, [EXPLAINER_IN + 4, EXPLAINER_IN + 16], [0, 1], fmEase.out);
  const fillIn = keyframes(t, [cue('pension'), cue('pension', 0, 's', 0.45)], [0, 1], fmEase.out);
  const scare = keyframes(t, [cue('complet'), cue('complet', 0, 'e', 0.15), EXPLAIN + 2, EXPLAIN + 18], [1, 0, 0, 1], fmEase.inOut);
  const taken = Math.min(1, Math.max(0, (xDot - XT) / (XF - XT))) * 0.97;
  const kept = fillIn * scare * (1 - taken);
  const takenW = (BAR.w - 10) * taken;
  const pensionOut = keyframes(t, [cue('presque', 0, 's', -0.3), cue('presque', 0, 's', -0.15)], [1, 0], fmEase.soft);
  const lineOn = keyframes(t, [cue('si', 0, 's', -0.1), cue('si', 0, 's', 0.1)], [0, 1], fmEase.soft);

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

  return (
    <div style={{position: 'absolute', inset: 0, ...style}}>
      {/* the pension bar: what is kept in navy, what Ottawa takes back hatched in brass */}
      <div style={{position: 'absolute', left: BAR.x, top: BAR.y, width: BAR.w, height: BAR.h, borderRadius: 10, border: `3px solid ${sketch.ink}`, opacity: barIn}} />
      <div
        style={{
          position: 'absolute',
          left: BAR.x + 5,
          top: BAR.y + 5,
          width: (BAR.w - 10) * kept,
          height: BAR.h - 10,
          borderRadius: 6,
          background: sketch.ink,
          opacity: 0.88,
        }}
      />
      {takenW > 1 && (
        <div
          style={{
            position: 'absolute',
            left: BAR.x + 5 + (BAR.w - 10) - takenW,
            top: BAR.y + 5,
            width: takenW,
            height: BAR.h - 10,
            borderRadius: 6,
            background: `repeating-linear-gradient(-45deg, ${sketch.brass} 0 3px, rgba(176,141,87,0.15) 3px 11px)`,
            opacity: 0.9,
          }}
        />
      )}
      <div style={{...serif(46, {left: BAR.x + BAR.w + 28, top: BAR.y + 4, fontWeight: 500}), opacity: barIn * pensionOut}}>{c.pension}</div>
      <Handwriting text={c.nothing} start={cue('presque')} speed={write(c.nothing)} left={BAR.x + BAR.w + 28} top={BAR.y - 4} variant="hand" style={{fontSize: 58}} color={sketch.brassDeep} />

      {/* the income line, its two marks, and the brass line for « votre revenu » */}
      <ReelInk>
        <InkStroke d={`M ${X0} ${ROW.line} L ${X1} ${ROW.line}`} start={EXPLAINER_IN + 2} duration={14} width={5} />
        <InkStroke d={`M ${XT} ${ROW.line - 26} L ${XT} ${ROW.line + 26}`} start={cue('95323')} duration={7} width={4} />
        <InkStroke d={`M ${XF} ${ROW.line - 26} L ${XF} ${ROW.line + 26}`} start={cue('155000')} duration={7} width={4} />
        {xDot > X0 + 1 && (
          <g opacity={lineOn}>
            <line x1={X0} y1={ROW.line} x2={xDot} y2={ROW.line} stroke={sketch.brass} strokeWidth={9} strokeLinecap="round" />
            <circle cx={xDot} cy={ROW.line} r={15} fill={sketch.brass} stroke={sketch.printBorder} strokeWidth={3} />
          </g>
        )}
      </ReelInk>
      <Handwriting text={c.income} start={EXPLAINER_IN + 8} speed={write(c.income)} left={X0} top={ROW.line + 22} variant="hand" style={{fontSize: 52}} />
      <div style={{...serif(42, {left: XT - 92, top: ROW.line + 30}), opacity: appear(cue('95323'))}}>{c.threshold}</div>
      <Handwriting text={c.thresholdNote} start={cue('95323', 0, 's', 0.35)} speed={write(c.thresholdNote)} left={XT - 66} top={ROW.line + 82} variant="note" style={{fontSize: 40}} color={sketch.inkSoft} />
      <Handwriting text={c.rate} start={cue('15')} speed={write(c.rate)} left={X1 - 430} top={ROW.line - 74} variant="hand" style={{fontSize: 48}} />
      <div style={{...serif(42, {left: XF - 112, top: ROW.line + 30}), opacity: appear(cue('155000'))}}>{c.full}</div>
    </div>
  );
};
