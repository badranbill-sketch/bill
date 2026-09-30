import React from 'react';
import { C, FONT } from '../brand';
import { EXAMPLE, INTERNAL_SOURCE, ledgerText, tr, UNVERIFIED, type At, type LedgerRow } from '../content';
import { Appear, BoxedText, HandRule, RefText, splitLead, T } from '../briefing/common';

/**
 * A hand-ruled ledger of LEDGER rows (content.ts). Each row shows:
 *  - the item, and under it when the cost would arise (`trigger`);
 *  - the amount exactly as recorded (`shown`), and under it
 *    "unverified — confirm at checkout" for every snippet-only figure and
 *    "example only" for an example;
 *  - the source: the page's host (or, for a vendor source file, where the
 *    file was fetched) and retrieval date, or "project plan, internal" for a
 *    figure from a project file.
 * An unknown amount reads as `shown` says ("to confirm", "quote needed").
 * A proposal (kind 'proposal') keeps its status words in a hand-ruled box and
 * its amount in the muted colour: it is not a cost anyone has approved.
 * It never adds, totals, converts or annualizes anything.
 */
/** Frames a page of rows takes to fade out when the next page replaces it (about half a second). */
export const PAGE_FADE = 14;
export const LEDGER_COLS = { item: 560, amount: 760, source: 300 } as const;
export const LEDGER_WIDTH = LEDGER_COLS.item + LEDGER_COLS.amount + LEDGER_COLS.source;

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

/** Where a vendor source file was fetched: a GitHub raw file reads as its repository owner on github.com. */
const fileHost = (url: string) => {
  const m = url.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\//);
  return m ? `github.com/${m[1]}` : host(url);
};

/**
 * The source cell as lines of text. A 'vendor-source' figure cites the file
 * actually fetched (the vendor's own data file behind its pricing page), not
 * the pricing page, which may have been out of reach.
 */
export const sourceLines = (r: LedgerRow): string[] => {
  if (!r.source) return [];
  if (r.source.basis === 'internal') return [tr(INTERNAL_SOURCE)];
  if (r.source.basis === 'vendor-source' && r.source.dataUrl) return [fileHost(r.source.dataUrl), r.source.retrieved];
  return [host(r.source.url), r.source.retrieved];
};

export const LedgerLine: React.FC<{ row: LedgerRow; at?: At; until?: number; delay?: number; seed?: number; first?: boolean }> = ({ row: r, at, until, delay = 0, seed = 1, first }) => {
  const markers = [r.source?.basis === 'snippet-only' ? tr(UNVERIFIED) : '', r.example ? tr(EXAMPLE) : ''].filter(Boolean);
  const known = r.amount !== null;
  const proposal = r.kind === 'proposal';
  const shown = r.shown ? tr(r.shown) : (r.amount ?? '');
  const start = (at?.[0] ?? 0) + delay;
  const [lead, rest] = splitLead(tr(r.item));
  return (
    <Appear at={at} until={until} delay={delay} fadeOut={PAGE_FADE} readText={ledgerText(r)} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', padding: '20px 0 20px' }}>
      {first && <HandRule start={start} width={LEDGER_WIDTH} seed={seed + 100} color={C.ink} strokeWidth={1.6} style={{ left: 0, top: -4 }} />}
      <div style={{ width: LEDGER_COLS.item - 32, marginRight: 32 }}>
        <div style={{ ...T.body, fontSize: 31, color: C.ink, lineHeight: 1.25 }}>
          {proposal && lead ? (
            <>
              {lead.replace(/:$/, '')} <BoxedText text={rest} start={start} size={27} weight={600} style={{ marginLeft: 6, verticalAlign: 'baseline' }} />
            </>
          ) : (
            tr(r.item)
          )}
        </div>
        {r.trigger && (
          <div style={{ ...T.muted, fontSize: 28, fontStyle: 'italic', marginTop: 6, lineHeight: 1.25, textWrap: 'pretty' }}>
            <RefText text={tr(r.trigger)} />
          </div>
        )}
      </div>
      <div style={{ width: LEDGER_COLS.amount - 32, marginRight: 32 }}>
        <div style={{ fontFamily: FONT.sans, fontSize: 31, lineHeight: 1.25, color: known && !proposal ? C.ink : C.muted, fontStyle: known ? 'normal' : 'italic', fontVariantNumeric: 'tabular-nums' }}>{shown}</div>
        {markers.length > 0 && (
          <div style={{ fontFamily: FONT.sans, fontSize: 27, fontStyle: 'italic', color: C.brassInk, marginTop: 6, lineHeight: 1.25 }}>{markers.join(' · ')}</div>
        )}
      </div>
      <div style={{ width: LEDGER_COLS.source, fontFamily: FONT.sans, fontSize: 23, color: C.muted, lineHeight: 1.35, paddingTop: 5 }}>
        {sourceLines(r).map((l, i) => (
          <div key={i} style={{ whiteSpace: 'nowrap' }}>
            {l}
          </div>
        ))}
      </div>
      <HandRule start={start} width={LEDGER_WIDTH} seed={seed} color={C.rule} strokeWidth={1.3} style={{ left: 0, bottom: -4 }} />
    </Appear>
  );
};
