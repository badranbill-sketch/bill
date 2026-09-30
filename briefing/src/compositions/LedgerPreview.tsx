import React from 'react';
import { loadBrandFonts } from '../fonts';
import type { LedgerRow } from '../content';
import { LedgerLine } from '../primitives/Ledger';
import { Paper } from '../primitives/Paper';
import { Kicker, Title } from '../primitives/Text';
import { Scene } from '../primitives/time';

loadBrandFonts();

/**
 * Layout check for LedgerLine. The rows are LAYOUT FIXTURES with no amounts:
 * nothing here is a price. The briefing's rows come from LEDGER in content.ts.
 */
const FIXTURES: LedgerRow[] = [
  { id: 'fixture-1', lane: 'money', item: { en: 'Layout fixture: a service already paid for', fr: '' }, status: 'existing_cost_unknown', amount: null, currency: null, cadence: null, source: null, shown: { en: 'to confirm', fr: '' } },
  { id: 'fixture-2', lane: 'money', item: { en: 'Layout fixture: a candidate, not purchased', fr: '' }, trigger: { en: 'if a limit is reached', fr: '' }, status: 'not_purchased', amount: null, currency: null, cadence: null, source: null, shown: { en: 'quote needed', fr: '' } },
];

export const LedgerPreview: React.FC = () => (
  <Paper>
    <Scene dur={6}>
      <Kicker line={{ en: 'Layout fixture · no figures', fr: '' }} at={[0.2, 6]} style={{ left: 160, top: 120 }} />
      <Title line={{ en: 'The ledger, ruled by hand.', fr: '' }} at={[0.3, 6]} size={72} style={{ left: 156, top: 164 }} />
      <div style={{ position: 'absolute', left: 150, top: 340, width: 1620 }}>
        {FIXTURES.map((r, i) => (
          <LedgerLine key={r.id} row={r} at={[0.8 + i * 0.4, 6]} seed={20 + i} />
        ))}
      </div>
    </Scene>
  </Paper>
);
