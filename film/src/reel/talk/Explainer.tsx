import React from 'react';
import {Handwriting, InkStroke} from '../../components/sketch';
import {useT} from '../../components/stage';
import {sketch} from '../../design/palette';
import {fmEase, keyframes} from '../motion';
import {ReelInk} from '../stage';
import {cue, f, SEGMENTS} from './edit';

// The explainer under Bill, drawn in the sketchbook's ink as he talks, every move keyed to the word he is saying:
// his question → a line for « revenu net » and a bar for « votre PSV »; « au complet » → the bar empties for a moment;
// « si votre revenu net de 2026 dépasse 95 323 $ » → the brass line runs along the income line to the threshold;
// « Ottawa récupère environ 15 ¢ pour chaque dollar au-dessus » → past it, the bar shrinks; « À 155 000 $, il n'y a
// presque plus rien qui reste » → the line reaches 155 000 $ and the bar is almost gone. The figures are Bill's
// (2026, ages 65–74; see src/data/talk-transcript.json `check`).

export const talkCopy = {
  title: 'Récupération de la PSV', // NEW COPY
  titleTwoLines: 'Récupération\nde la PSV', // the same title, on two lines
  income: 'revenu net', // NEW COPY
  pension: 'votre PSV', // NEW COPY
  threshold: '95 323 $', // NEW COPY (Bill's figure; the published 2026 threshold)
  thresholdNote: 'seuil 2026', // NEW COPY
  rate: '15 ¢ par dollar au-dessus', // NEW COPY
  full: '155 000 $', // NEW COPY (Bill's figure; ≈ 154 708 $ for ages 65–74 in 2026)
  nothing: 'presque plus rien', // NEW COPY
  ages: '65 à 74 ans', // NEW COPY
  counter: 'votre revenu net', // NEW COPY
} as const;

const X0 = 110;
const X1 = 940;
const MAX = 180000;
const xOf = (income: number) => X0 + ((X1 - X0) * income) / MAX;
const XT = xOf(95323);
const XF = xOf(155000);
// laid out for a seam at y 900: everything between y 960 and the bottom of the safe box (1450)
const SCALE_Y = 1290;
const BAR = {x: 110, y: 1068, w: 440, h: 74};

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

/** The explainer appears when the picture first splits (the start of the second kept part). */
export const EXPLAINER_IN = f(SEGMENTS[1].at);

export const Explainer: React.FC<{style?: React.CSSProperties}> = ({style}) => {
  const t = useT();
  const c = talkCopy;
  const xDot = dotAt(t);
  const lineOn = keyframes(t, [cue('si', 0, 's', -0.1), cue('si', 0, 's', 0.1)], [0, 1], fmEase.soft);
  // the pension: in on « PSV », gone for a beat on « au complet », back on « Voici », then 15 ¢ per dollar past the threshold
  const barIn = keyframes(t, [cue('pension'), cue('pension', 0, 's', 0.5)], [0, 1], fmEase.out);
  const scare = keyframes(t, [cue('complet'), cue('complet', 0, 'e', 0.1), cue('Voici'), cue('Voici', 0, 's', 0.45)], [1, 0, 0, 1], fmEase.inOut);
  const kept = 1 - Math.min(1, Math.max(0, (xDot - XT) / (XF - XT)));
  const fill = barIn * scare * Math.max(0.03, kept);
  const pensionLabel = keyframes(t, [cue('presque', 0, 's', -0.1), cue('presque', 0, 's', 0.3)], [1, 0], fmEase.soft);

  return (
    <div style={{position: 'absolute', inset: 0, ...style}}>

      {/* the pension bar */}
      <div
        style={{
          position: 'absolute',
          left: BAR.x,
          top: BAR.y,
          width: BAR.w,
          height: BAR.h,
          borderRadius: 8,
          border: `2.5px solid ${sketch.ink}`,
          opacity: barIn,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: BAR.x + 5,
          top: BAR.y + 5,
          width: (BAR.w - 10) * fill,
          height: BAR.h - 10,
          borderRadius: 5,
          background: sketch.wash,
          opacity: 0.85,
        }}
      />
      <Handwriting text={c.pension} start={cue('pension')} speed={26} left={BAR.x + BAR.w + 28} top={BAR.y - 2} variant="hand" style={{fontSize: 62}} opacity={pensionLabel} />
      <Handwriting text={c.nothing} start={cue('presque')} speed={26} left={BAR.x + BAR.w + 28} top={BAR.y - 2} variant="hand" style={{fontSize: 58}} />

      {/* the income line, its two marks, and the brass line for « votre revenu » */}
      <ReelInk>
        <InkStroke d={`M ${X0} ${SCALE_Y} L ${X1} ${SCALE_Y}`} start={EXPLAINER_IN + 8} duration={22} width={3} />
        <InkStroke d={`M ${XT} ${SCALE_Y - 22} L ${XT} ${SCALE_Y + 22}`} start={cue('95323')} duration={8} width={3} />
        <InkStroke d={`M ${XF} ${SCALE_Y - 22} L ${XF} ${SCALE_Y + 22}`} start={cue('155000')} duration={8} width={3} />
        {xDot > XT + 1 && (
          <rect x={XT} y={SCALE_Y - 14} width={xDot - XT} height={28} fill={sketch.ink} opacity={0.12 * lineOn} />
        )}
        {xDot > X0 + 1 && (
          <g opacity={lineOn}>
            <line x1={X0} y1={SCALE_Y} x2={xDot} y2={SCALE_Y} stroke={sketch.brass} strokeWidth={6} strokeLinecap="round" />
            <circle cx={xDot} cy={SCALE_Y} r={11} fill={sketch.brass} />
          </g>
        )}
      </ReelInk>
      <Handwriting text={c.income} start={EXPLAINER_IN + 16} speed={24} left={X0} top={SCALE_Y + 26} variant="hand" style={{fontSize: 54}} />
      <Handwriting text={c.threshold} start={cue('95323')} speed={20} left={XT - 92} top={SCALE_Y + 26} variant="hand" style={{fontSize: 58}} />
      <Handwriting text={c.thresholdNote} start={cue('95323', 0, 's', 0.4)} speed={24} left={XT - 78} top={SCALE_Y + 90} variant="note" style={{fontSize: 44}} color={sketch.inkSoft} />
      <Handwriting text={c.rate} start={cue('15')} speed={26} left={XT - 150} top={SCALE_Y - 92} variant="hand" style={{fontSize: 52}} />
      <Handwriting text={c.full} start={cue('155000')} speed={20} left={XF - 96} top={SCALE_Y + 26} variant="hand" style={{fontSize: 58}} />
    </div>
  );
};
