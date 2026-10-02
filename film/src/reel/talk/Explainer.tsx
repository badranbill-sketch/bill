import React from 'react';
import {cubicBezier} from 'framer-motion';
import {Handwriting, InkStroke, loop} from '../../components/sketch';
import {useT} from '../../components/stage';
import {sketch} from '../../design/palette';
import {SERIF} from '../../design/typography';
import {fmEase, keyframes, progress} from '../motion';
import {ReelInk} from '../stage';
import {BEATS, cue} from './edit';

// The explainer, drawn in the sketchbook's ink as Bill talks, every move keyed to the word he is saying. One meaning
// per colour: navy is the pension he keeps, brass is his income (the line), and what Ottawa takes back empties out of
// the bar (paper with a faint hatch). The only figures on screen are the two Bill says, each shown once, as he says it.
//   « Voici comment »        Bill becomes a print; the bar (« votre PSV », full) and the income line draw in
//   « si votre revenu… »     the brass dot runs along the line from 60 000 $
//   « …dépasse 95 323 $ »    the threshold lands large beside the print (« le seuil »), its tick on the line
//   « Ottawa récupère… »     the picture comes back; the figure settles under its tick; past it, the bar empties in
//                            proportion: « repris par Ottawa », « 15 ¢ par dollar au-dessus »
//   « À 155 000 $… rien »    the dot runs to 155 000 $; almost empty; an ink circle round what is left
// Laid out under the split screen (picture above y 820); in the print layout it stays where it is.
// The figures are Bill's (2026, ages 65–74; see src/data/talk-transcript.json `check`).

export const talkCopy = {
  title: 'Récupération de la PSV', // NEW COPY
  hook1: 'Ottawa peut reprendre', // NEW COPY (Bill's point, as the hook)
  hook2: 'toute votre PSV', // NEW COPY
  income: 'revenu net', // NEW COPY
  threshold: 'le seuil', // NEW COPY
  pension: 'votre PSV', // NEW COPY
  taken: 'repris par Ottawa', // NEW COPY
  thresholdFigure: '95\u00a0323\u00a0$', // NEW COPY (the published 2026 threshold; Bill says « 95 223 »: see `check`)
  rateCents: '15\u00a0¢', // NEW COPY (with rateRest: « 15 ¢ par dollar au-dessus »)
  rateRest: ' par dollar au-dessus',
  full: '155\u00a0000\u00a0$', // NEW COPY (Bill's figure; ≈ 154 708 $ for ages 65–74 in 2026)
  nothing: 'presque plus rien', // NEW COPY
  cta: 'Guide gratuit\u00a0: lien en bio', // NEW COPY
} as const;

const X0 = 96;
const X1 = 940;
const MAX = 180000;
const START = 60000;
const xOf = (income: number) => X0 + ((X1 - X0) * income) / MAX;
const XS = xOf(START);
const XT = xOf(95323);
const XF = xOf(155000);
const ROW = {label: 846, bar: 924, line: 1100};
const BAR = {x: X0, y: ROW.bar, w: X1 - X0, h: 72};
/** Where the threshold figure stands beside the print, before it settles under its tick. */
const HERO = {x: X0, y: 492, size: 96};
const TICK_LABEL = {dy: 28, size: 48};

/** The explainer draws in once the move into the print has settled. */
export const EXPLAINER_IN = BEATS.focus + 15;

/** Where « votre revenu » is on the income line at frame t, word by word (it starts at 60 000 $). */
const dotAt = (t: number) =>
  keyframes(
    t,
    [cue('si'), cue('95323'), cue('récupère'), cue('montant', 0, 'e'), cue('À'), cue('155000', 0, 's', 0.5)],
    [XS, XT, XT, XT + 0.32 * (XF - XT), XT + 0.32 * (XF - XT), XF],
    [fmEase.inOut, fmEase.linear, fmEase.inOut, fmEase.linear, fmEase.inOut],
  );

/** Handwriting at a calm, steady pace: every note is written in about 0.4 s. */
const write = (text: string) => Math.max(18, Math.round(text.length / 0.42));

const serif = (size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
  position: 'absolute',
  fontFamily: `${SERIF}, serif`,
  fontWeight: 600,
  fontSize: size,
  color: sketch.ink,
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1.1,
  ...extra,
});

/** A brass underline that draws itself left to right. */
const Underline: React.FC<{p: number; height: number; bottom: number; opacity?: number}> = ({p, height, bottom, opacity = 1}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom,
      height,
      borderRadius: height / 2,
      background: sketch.brass,
      transformOrigin: 'left center',
      scale: `${p} 1`,
      opacity,
    }}
  />
);

export const Explainer: React.FC<{style?: React.CSSProperties}> = ({style}) => {
  const t = useT();
  const c = talkCopy;
  const xDot = dotAt(t);

  // the bar sweeps in full, then empties in proportion to the income above the threshold
  const sweep = keyframes(t, [EXPLAINER_IN + 4, EXPLAINER_IN + 19], [0, 1], fmEase.out);
  const gone = Math.min(1, Math.max(0, (xDot - XT) / (XF - XT))) * 0.96;
  const inner = BAR.w - 10;
  const keptW = inner * sweep * (1 - gone);
  const pensionOut = keyframes(t, [cue('presque', 0, 's', -0.3), cue('presque', 0, 's', -0.15)], [1, 0], fmEase.soft);
  const pulse = 1 + 0.035 * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - cue('rien')) / 8)));
  const lineOn = keyframes(t, [EXPLAINER_IN + 12, EXPLAINER_IN + 18], [0, 1], fmEase.soft);
  const appear = (from: number) => keyframes(t, [from, from + 8], [0, 1], fmEase.out);
  const full = appear(cue('155000'));
  const circle = loop(BAR.x + 22, BAR.y + BAR.h / 2, 50, 46, 'talk-rien', 1.08);

  return (
    <div style={{position: 'absolute', inset: 0, ...style}}>
      <Handwriting text={c.pension} start={EXPLAINER_IN + 4} speed={write(c.pension)} left={X0} top={ROW.label} variant="hand" style={{fontSize: 50}} opacity={pensionOut} />
      <Handwriting text={c.nothing} start={cue('presque', 0, 's', -0.1)} speed={write(c.nothing)} left={X0} top={ROW.label - 6} variant="hand" style={{fontSize: 58}} />

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
      <Handwriting text={c.taken} start={cue('récupère')} speed={write(c.taken)} left={X1 - 290} top={BAR.y + BAR.h + 6} variant="hand" style={{fontSize: 46}} color={sketch.inkSoft} />

      <ReelInk>
        {/* « presque plus rien »: an ink circle round what is left */}
        <InkStroke d={circle} start={cue('rien', 0, 's', -0.1)} duration={12} width={4} />
        {/* the income line, its two marks, and the brass line for « votre revenu » */}
        <InkStroke d={`M ${X0} ${ROW.line} L ${X1} ${ROW.line}`} start={EXPLAINER_IN} duration={14} width={5} />
        <InkStroke d={`M ${XT} ${ROW.line - 28} L ${XT} ${ROW.line + 28}`} start={cue('95323')} duration={7} width={4} />
        <InkStroke d={`M ${XF} ${ROW.line - 28} L ${XF} ${ROW.line + 28}`} start={cue('155000')} duration={7} width={4} />
        {lineOn > 0.01 && (
          <g opacity={lineOn}>
            <line x1={X0} y1={ROW.line} x2={xDot} y2={ROW.line} stroke={sketch.brass} strokeWidth={10} strokeLinecap="round" />
            <circle cx={xDot} cy={ROW.line} r={16} fill={sketch.brass} stroke={sketch.printBorder} strokeWidth={3} />
          </g>
        )}
      </ReelInk>
      <Handwriting text={c.income} start={EXPLAINER_IN + 8} speed={write(c.income)} left={X0} top={ROW.line + 24} variant="hand" style={{fontSize: 50}} />

      {/* 155 000 $ lands under its tick as Bill says it, underlined: the punchline's number */}
      <div
        style={{
          ...serif(TICK_LABEL.size, {left: XF, top: ROW.line + TICK_LABEL.dy}),
          translate: '-50% 0',
          opacity: full,
          scale: String(1 + 0.25 * (1 - full)),
        }}
      >
        {c.full}
        <Underline p={keyframes(t, [cue('155000') + 6, cue('155000') + 14], [0, 1], fmEase.out)} height={4} bottom={-2} />
      </div>
      <div style={{position: 'absolute', left: XT - 100, top: ROW.line + 92, whiteSpace: 'nowrap', color: sketch.ink, opacity: appear(cue('15'))}}>
        <span style={{fontFamily: `${SERIF}, serif`, fontWeight: 600, fontSize: 42}}>{c.rateCents}</span>
        <span style={{fontFamily: 'Caveat, cursive', fontWeight: 500, fontSize: 48}}>{c.rateRest}</span>
      </div>
    </div>
  );
};

const mix = (a: number, b: number, p: number) => a + (b - a) * p;

/**
 * The threshold, the one element that crosses layouts: it lands large beside Bill's print as he says it, then, as the
 * picture comes back, it travels down and settles under its tick on the income line. Drawn above the picture, and
 * a few frames ahead of it, so the picture never covers it on the way.
 */
export const ThresholdFigure: React.FC<{opacity?: number}> = ({opacity = 1}) => {
  const t = useT();
  const c = talkCopy;
  const land = cue('95323');
  const p = progress(t, BEATS.split - 4, {duration: 0.45, ease: cubicBezier(0.65, 0, 0.35, 1)});
  const shown = keyframes(t, [land, land + 8], [0, 1], fmEase.out);
  const size = mix(HERO.size, TICK_LABEL.size, p);
  // a little ahead across than down: on this path it clears both the moving picture and « votre PSV »
  const px = p ** 0.7;
  const py = p;
  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      <Handwriting
        text={c.threshold}
        start={cue('dépasse')}
        speed={write(c.threshold)}
        left={HERO.x}
        top={HERO.y - 64}
        variant="hand"
        color={sketch.brassDeep}
        style={{fontSize: 52}}
        opacity={1 - Math.min(1, p * 3)}
      />
      {shown > 0.01 && (
        <div
          style={{
            ...serif(size, {left: mix(HERO.x, XT, px), top: mix(HERO.y, ROW.line + TICK_LABEL.dy, py)}),
            translate: `${-50 * px}% ${(1 - shown) * 20}px`,
            opacity: shown,
            letterSpacing: '-0.01em',
          }}
        >
          {c.thresholdFigure}
          <Underline p={keyframes(t, [land + 6, land + 16], [0, 1], fmEase.out)} height={6} bottom={-4} opacity={1 - p} />
        </div>
      )}
    </div>
  );
};
