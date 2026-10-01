import React from 'react';
import {BrassLine, GuideObject, Handwriting, writeFrames} from '../../components/sketch';
import {useT} from '../../components/stage';
import {sketch} from '../../design/palette';
import {SERIF} from '../../design/typography';
import {reelCopy} from '../copy';
import {CLOSE, END} from '../layout';
import {poseStyle, presence, SPRING, staggerAt} from '../motion';
import {endOf, wordAt} from '../timing';

// 5 · close (23.5 → 30 s) — « Juste un point de départ honnête. »
// « Un point de départ honnête. » is handwritten over the meadow's sky and the brass line underlines « honnête ».
// When the voice has finished, the meadow gives way and the underline runs out into the end card's rule; under it the
// end card comes in as one staggered group (Framer Motion's variants + staggerChildren, by frame): who, the
// invitation, the guide itself, and the disclaimer, quiet but fully legible. Nothing here moves after it lands.

const CARD = {
  hidden: {opacity: 0, y: 14},
  visible: {opacity: 1, y: 0},
} as const;

export const Close: React.FC = () => {
  const t = useT();
  const c = reelCopy.close;
  const [line1, line2] = c.start.split('\n');

  const write = wordAt('depart', 'un', 's', -0.05);
  const line2At = write + writeFrames(line1, 18) + 4;
  const underline = Math.max(line2At + writeFrames(line2, 18) - 2, wordAt('depart', 'honnête', 's', 0.2));
  const end = endOf('depart');
  const rule = end + 12;
  const cardFrom = end + 16;
  const items = 4;
  const card = (i: number) =>
    poseStyle(
      presence(t, {
        enter: staggerAt(cardFrom, i, items, 0.22),
        initial: CARD.hidden,
        animate: CARD.visible,
        enterWith: {type: 'spring', ...SPRING.settle},
      }).pose,
    );
  const serif = (size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
    position: 'absolute',
    fontFamily: `${SERIF}, serif`,
    fontWeight: 500,
    fontSize: size,
    color: sketch.ink,
    whiteSpace: 'nowrap',
    ...extra,
  });

  return (
    <>
      <Handwriting text={line1} start={write} speed={18} left={CLOSE.left} top={CLOSE.top} variant="handLarge" style={{fontSize: CLOSE.size}} />
      <Handwriting
        text={line2}
        start={line2At}
        speed={18}
        left={CLOSE.left}
        top={CLOSE.top + CLOSE.lineHeight}
        variant="handLarge"
        style={{fontSize: CLOSE.size}}
      />
      <BrassLine points={END.underline} start={underline} duration={14} width={4} wobble={1} seed="reel-honnete" />
      <BrassLine points={END.rule} start={rule} duration={24} width={4} wobble={0.8} seed="reel-rule" tip={false} />

      <div style={{...serif(END.who.size, {left: END.who.left, top: END.who.top}), ...card(0)}}>{c.who}</div>
      <div style={{...serif(END.cta.size, {left: END.cta.left, top: END.cta.top}), ...card(1)}}>{c.cta}</div>
      <div style={{position: 'absolute', inset: 0, ...card(2)}}>
        <GuideObject left={END.guide.left} top={END.guide.top} width={END.guide.width} rotate={END.guide.rotate} />
      </div>
      <div
        style={{
          ...serif(END.disclaimer.size, {
            left: END.disclaimer.left,
            top: END.disclaimer.top,
            width: END.disclaimer.width,
            fontWeight: 400,
            color: sketch.inkSoft,
            whiteSpace: 'normal',
            lineHeight: 1.4,
          }),
          ...card(3),
        }}
      >
        {c.disclaimer}
      </div>
    </>
  );
};
