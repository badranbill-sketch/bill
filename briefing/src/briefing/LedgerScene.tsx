import React from 'react';
import { C } from '../brand';
import { LEDGER, tr, type Scene } from '../content';
import { LEDGER_WIDTH, LedgerLine } from '../primitives/Ledger';
import { Art } from './Art';
import { Appear, Header, SAFE, T } from './common';
import { paginate, PER_PAGE } from './pages';

/**
 * B10 · Money later: the ledger-page drawing held from B09 in the top-right
 * corner, the title and the lead, then the LEDGER rows. The "if needed" costs
 * form the first page; the per-sale costs and the ad-test proposal the second.
 */
export const LedgerScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const block = scene.ledger;
  const art = scene.art?.[0];
  if (!block) return null;
  const rows = block.rows.map((cue) => ({ at: cue.at, row: LEDGER.find((r) => r.id === cue.id)! })).filter((x) => x.row);
  const pages = paginate(rows, PER_PAGE[scene.id] ?? 4, (x) => x.row.kind);
  return (
    <>
      {art && <Art name={art.name} fallback={art.fallback} hold={art.hold} start={art.start ?? 0} dur={art.dur} crop="ink" pad={14} x={SAFE.right + 10} y={60} anchor="tr" scale={0.46} />}
      <Header scene={scene} size={64} width={1200} />
      {block.lead && (
        <Appear at={block.lead.at} style={{ ...T.body, position: 'absolute', left: SAFE.left, top: 244, fontSize: 34, color: C.navy2 }}>
          {tr(block.lead)}
        </Appear>
      )}
      {pages.map((page, pi) => (
        <div key={pi} style={{ position: 'absolute', left: SAFE.left, top: 344, width: LEDGER_WIDTH }}>
          {page.rows.map(({ row: x, index }, i) => (
            <LedgerLine key={x.row.id} row={x.row} at={x.at} until={page.until ?? undefined} delay={pi > 0 && i === 0 ? 0.3 : 0} seed={20 + index} first={i === 0} />
          ))}
        </div>
      ))}
    </>
  );
};
