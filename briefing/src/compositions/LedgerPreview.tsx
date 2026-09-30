import React from 'react';
import { loadBrandFonts } from '../fonts';
import type { LedgerRow } from '../content';
import { Ledger } from '../primitives/Ledger';
import { Paper } from '../primitives/Paper';
import { Kicker, Title } from '../primitives/Text';
import { Scene } from '../primitives/time';

loadBrandFonts();

/**
 * Layout check for the Ledger placeholder. The rows are LAYOUT FIXTURES with
 * no amounts: nothing here is a price. Real rows come from LEDGER in content.ts.
 */
const FIXTURES: LedgerRow[] = [
  { id: 'fixture-1', lane: 'money', item: { en: 'Layout fixture: a service already paid for', fr: '' }, status: 'existing_cost_unknown', amount: null, currency: null, cadence: null, source: null },
  { id: 'fixture-2', lane: 'money', item: { en: 'Layout fixture: a candidate, not purchased', fr: '' }, status: 'not_purchased', amount: null, currency: null, cadence: null, source: null },
  { id: 'fixture-3', lane: 'money', item: { en: 'Layout fixture: a free tier', fr: '' }, status: 'zero_authorized', amount: null, currency: null, cadence: null, source: null },
];

export const LedgerPreview: React.FC = () => (
  <Paper>
    <Scene dur={6}>
      <Kicker line={{ en: 'Placeholder · no figures', fr: '' }} at={[0.2, 6]} style={{ left: 160, top: 120 }} />
      <Title line={{ en: 'The ledger, ruled by hand.', fr: '' }} at={[0.3, 6]} size={72} style={{ left: 156, top: 164 }} />
      <Ledger rows={FIXTURES} at={[0.8, 6]} y={340} />
    </Scene>
  </Paper>
);
