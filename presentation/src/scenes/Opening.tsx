import React from 'react';
import { C, FONT } from '../brand';
import { SCENES, tr } from '../content';
import { Caption, Handwrite, InkDrawing, SerifLine, StatusTag } from '../primitives/basics';
import { Reveal } from '../primitives/time';

/** S00 — Cold open. Blank ivory; the sentence in the prospect's head. */
export const S00: React.FC = () => {
  const s = SCENES.s00;
  return (
    <>
      <Handwrite line={s.open1} size={112} tilt={-1.6} color={C.ink} centerX={960} style={{ top: 318 }} />
      <Handwrite line={s.open2} size={112} tilt={-1.2} color={C.ink} centerX={960} style={{ top: 462 }} />
      <SerifLine
        line={s.footer}
        size={38}
        weight={300}
        italic
        color={C.inkSoft}
        style={{ left: 0, right: 0, top: 700, textAlign: 'center' }}
      />
      <Caption line={s.caption} />
    </>
  );
};

/** S01 — Title, with the empty left armchair drawn by pen. */
export const S01: React.FC = () => {
  const s = SCENES.s01;
  return (
    <>
      <SerifLine line={s.title} size={112} weight={300} style={{ left: 150, top: 318, width: 920, lineHeight: 1.04 }} />
      <SerifLine
        line={s.sub}
        size={40}
        weight={300}
        italic
        color={C.inkSoft}
        style={{ left: 154, top: 590, width: 820, lineHeight: 1.3 }}
      />
      <InkDrawing name="left-chair" start={s.chair.draw} dur={s.chair.over} width={560} style={{ left: 1190, top: 236 }} />
    </>
  );
};

/** S02 — Where the overhaul stands: seven pieces, seven status tags. */
export const S02: React.FC = () => {
  const s = SCENES.s02;
  const W = 232;
  const GAP = 16;
  const x0 = (1920 - (7 * W + 6 * GAP)) / 2;
  return (
    <>
      <SerifLine line={s.heading} size={68} weight={300} style={{ left: x0, top: 150, width: 1400, lineHeight: 1.12 }} />
      {s.cards.map((c, i) => (
        <Reveal
          key={i}
          at={c.label.at}
          rise={10}
          style={{
            position: 'absolute',
            left: x0 + i * (W + GAP),
            top: 430,
            width: W,
            height: 270,
            boxSizing: 'border-box',
            background: C.paper2,
            border: `1px solid ${C.rule}`,
            borderRadius: 4,
            padding: '26px 22px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontFamily: FONT.serif, fontWeight: 400, fontSize: 30, lineHeight: 1.16, color: C.ink }}>{tr(c.label)}</div>
          <div>
            <StatusTag status={c.status} scale={0.86} />
          </div>
        </Reveal>
      ))}
      <Caption line={s.caption} />
    </>
  );
};
