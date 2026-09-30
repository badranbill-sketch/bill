import React from 'react';
import { C, FONT } from '../brand';
import { tr, type Scene } from '../content';
import { Art } from './Art';
import { Appear, from, HandRule, Header, LeadText, SAFE, T, TagMark } from './common';

/**
 * B08 · Infrastructure: each piece, its status and its owner, one row at a
 * time, hand-ruled like the ledger. The travel bag sits in the top-right
 * corner, clear of the column headers. Every row's lead (the piece's name) is
 * set in the strong face. The "Not used" footer comes last.
 */
const COLS = { piece: 1010, status: 250, owner: 360 }; // + gaps = 1620
const GAP = 0;

export const TableScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const tb = scene.table;
  const art = scene.art?.[0];
  if (!tb) return null;
  const heads = tb.header ? tr(tb.header).split(' · ') : [];
  const top = 262;
  return (
    <>
      {art && <Art name={art.name} fallback={art.fallback} start={art.start ?? 0.3} dur={art.dur} washDelay={art.washDelay} crop="ink" pad={14} x={SAFE.right} y={64} anchor="tr" scale={1.2} />}
      <Header scene={scene} size={64} width={1300} />
      <div style={{ position: 'absolute', left: SAFE.left, top, width: SAFE.right - SAFE.left }}>
        {tb.header && (
          <Appear at={tb.header.at} style={{ position: 'relative', display: 'flex', height: 46, fontFamily: FONT.sans, fontSize: 24, fontWeight: 600, color: C.muted }}>
            <div style={{ width: COLS.piece }} />
            <div style={{ width: COLS.status, marginLeft: GAP }}>{heads[0]}</div>
            <div style={{ width: COLS.owner, marginLeft: GAP }}>{heads[1]}</div>
            <HandRule start={from(tb.header)} width={SAFE.right - SAFE.left} seed={11} color={C.ink} strokeWidth={1.6} style={{ left: 0, bottom: -4 }} />
          </Appear>
        )}
        {tb.rows.map((r, i) => (
          <Appear key={i} at={r.at} style={{ position: 'relative', display: 'flex', alignItems: 'baseline', padding: '15px 0 15px' }}>
            <div style={{ ...T.body, fontSize: 31, width: COLS.piece - 30, marginRight: 30, lineHeight: 1.3 }}>
              <LeadText text={tr(r)} soft />
            </div>
            <div style={{ width: COLS.status, marginLeft: GAP }}>{r.tag && <TagMark tag={r.tag} start={from(r)} size={27} />}</div>
            <div style={{ ...T.body, fontSize: 30, width: COLS.owner, marginLeft: GAP, color: C.ink, lineHeight: 1.25 }}>{r.owner ? tr(r.owner) : ''}</div>
            <HandRule start={from(r)} width={SAFE.right - SAFE.left} seed={12 + i} color={C.rule} strokeWidth={1.3} style={{ left: 0, bottom: -4 }} />
          </Appear>
        ))}
        {tb.footer && (
          <Appear at={tb.footer.at} style={{ ...T.muted, fontSize: 31, fontStyle: 'italic', marginTop: 34 }}>
            <LeadText text={tr(tb.footer)} leadColor={C.muted} />
          </Appear>
        )}
      </div>
    </>
  );
};
