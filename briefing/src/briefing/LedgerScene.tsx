import React from 'react';
import { C } from '../brand';
import { LEDGER, tr, type Scene } from '../content';
import { LEDGER_WIDTH, LedgerLine, PAGE_FADE } from '../primitives/Ledger';
import { Art } from './Art';
import { Appear, Header, SAFE, T } from './common';
import { paginate, PER_PAGE } from './pages';

/**
 * B10 · Money later: the ledger-page drawing held from B09 in the top-right
 * corner, the title and the lead, then the LEDGER rows. The "if needed" costs
 * form the first page; the per-sale costs and the ad-test proposal the second.
 * A small page mark ("1 / 2", then "2 / 2") sits above the table's right end,
 * so the page turn does not look like rows going missing. The first page fades
 * out over about half a second, 0.8 s after its last row's reading time is
 * met, and the next page's first row comes in after it, never on top of it.
 */
const TURN_HOLD = 0.8; // seconds a page stays past the scripted turn: slack after its last row's reading time
const TURN_DELAY = 0.6; // seconds after that page starts to fade before the next page's first row appears
const endOf = (until: number | null) => (until === null ? undefined : until + TURN_HOLD);
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
            <LedgerLine key={x.row.id} row={x.row} at={x.at} until={endOf(page.until)} delay={pi > 0 && i === 0 ? TURN_HOLD + TURN_DELAY : 0} seed={20 + index} first={i === 0} />
          ))}
        </div>
      ))}
      {pages.length > 1 &&
        pages.map((page, pi) => {
          const first = page.rows[0]?.row.at;
          if (!first) return null;
          return (
            <Appear
              key={`p${pi}`}
              at={first}
              until={endOf(page.until)}
              delay={pi > 0 ? TURN_HOLD + TURN_DELAY : 0}
              fadeOut={PAGE_FADE}
              style={{ ...T.muted, position: 'absolute', right: 1920 - SAFE.right, top: 300, fontSize: 24, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
            >
              {pi + 1} / {pages.length}
            </Appear>
          );
        })}
    </>
  );
};
