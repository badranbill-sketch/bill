import React from 'react';
import { C } from '../brand';
import { SCENES } from '../content';
import { InkDrawing, SerifLine } from '../primitives/basics';

/** S12 — Close. Both chairs, left one first; the invitation; Bill's name. */
export const S12: React.FC = () => {
  const s = SCENES.s12;
  const w = 700;
  return (
    <>
      <InkDrawing name="chairs-table" start={s.chairsAt} dur={4.2} width={w} style={{ left: (1920 - w) / 2, top: 118 }} />
      <SerifLine line={s.line1} size={48} weight={300} style={{ left: 0, right: 0, top: 540, textAlign: 'center' }} />
      <SerifLine line={s.line2} size={56} weight={300} style={{ left: 0, right: 0, top: 534, textAlign: 'center' }} />
      <SerifLine line={s.bill} size={92} weight={300} style={{ left: 0, right: 0, top: 680, textAlign: 'center' }} />
      <SerifLine line={s.tagline} size={36} weight={300} italic color={C.inkSoft} style={{ left: 0, right: 0, top: 808, textAlign: 'center' }} />
    </>
  );
};
