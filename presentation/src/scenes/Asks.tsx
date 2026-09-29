import React from 'react';
import { C, FONT } from '../brand';
import { SCENES, tr } from '../content';
import { Caption, CornerStatus, Handwrite, SerifLine, SmallCaps, Underline } from '../primitives/basics';
import { DecisionCard, Timeline } from '../primitives/objects';
import { Reveal } from '../primitives/time';

/** S11b — What this asks of Bill. */
export const S11b: React.FC = () => {
  const s = SCENES.s11b;
  return (
    <>
      <CornerStatus status={s.status} />
      {s.asks.map((a, i) => (
        <SerifLine key={i} line={a} size={46} weight={300} style={{ left: 160, top: 196 + i * 86, width: 1560 }} />
      ))}
      <SerifLine line={s.ours} size={62} weight={300} style={{ left: 160, top: 560, width: 1640 }}>
        <span style={{ color: C.inkSoft }}>{tr(s.ours)}</span>{' '}
        <span style={{ position: 'relative', display: 'inline-block', color: C.ink, fontWeight: 400 }}>
          {tr(s.yours)}
          <Underline start={s.yours.at![0] + 0.9} dur={0.8} color={C.ink} width={1.6} offset={-2} seed={31} />
        </span>
      </SerifLine>
      <Caption line={s.caption} />
    </>
  );
};

/** S11c — The first 90 days, and what Bill sees every month. */
export const S11c: React.FC = () => {
  const s = SCENES.s11c;
  const boxW = 300;
  const gap = 30;
  const x0 = (1920 - (5 * boxW + 4 * gap)) / 2;
  return (
    <>
      <Timeline x1={150} x2={1770} y={320} stops={s.stops} day1={s.day1} day90={s.day90} start={0.3} />
      <SerifLine line={s.next} size={40} weight={300} style={{ left: x0, top: 530, width: 1600 }} />
      <Handwrite line={s.sees} size={50} tilt={-1.2} color={C.ink} style={{ left: x0, top: 612 }} />
      {s.scores.map((sc, i) => (
        <Reveal
          key={i}
          at={sc.at}
          rise={8}
          style={{
            position: 'absolute',
            left: x0 + i * (boxW + gap),
            top: 694,
            width: boxW,
            height: 142,
            boxSizing: 'border-box',
            background: C.paper2,
            border: `1px solid ${C.rule}`,
            borderRadius: 4,
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <SmallCaps size={15} color={C.inkSoft} spacing="0.16em">
            {tr(sc)}
          </SmallCaps>
          <div style={{ fontFamily: FONT.serif, fontWeight: 300, fontSize: 54, lineHeight: 1, color: C.blueGrey }}>—</div>
        </Reveal>
      ))}
      <SerifLine line={s.signals} size={28} weight={300} italic color={C.inkSoft} style={{ left: x0, top: 880, width: 1620 }} />
    </>
  );
};

/** S11d — The three decisions for the meeting. */
export const S11d: React.FC = () => {
  const s = SCENES.s11d;
  const W = 540;
  const GAP = 50;
  const x0 = (1920 - (3 * W + 2 * GAP)) / 2;
  return (
    <>
      <SerifLine line={s.heading} size={72} weight={300} style={{ left: x0, top: 206 }} />
      {s.cards.map((c, i) => (
        <DecisionCard
          key={i}
          at={c.title.at}
          title={c.title}
          body={c.body}
          w={W}
          h={320}
          titleSize={46}
          bodySize={34}
          bodySerif
          style={{ left: x0 + i * (W + GAP), top: 380 }}
        />
      ))}
    </>
  );
};
