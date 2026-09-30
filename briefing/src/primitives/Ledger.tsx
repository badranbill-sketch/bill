import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, EASE_SOFT, FONT } from '../brand';
import { tr, type At, type LedgerLane, type LedgerRow } from '../content';
import { line as penLine } from './pen';
import { progressAt, Reveal } from './time';

/**
 * PLACEHOLDER. A hand-ruled ledger for the Money / Time / Infrastructure
 * scenes. It shows an amount only as displayed on its source page, with the
 * cadence and the source's retrieval date; anything unknown reads
 * "not yet sourced". It never computes totals from mixed currencies or
 * cadences. Layout will be refined once the script lane fills LEDGER.
 */
const STATUS_LABEL: Record<LedgerRow['status'], string> = {
  existing_cost_unknown: 'existing, amount unknown',
  not_purchased: 'not purchased',
  not_selected: 'not selected',
  zero_authorized: 'no spend authorized',
  measured: 'measured',
};

export const Ledger: React.FC<{
  rows: readonly LedgerRow[];
  lane?: LedgerLane;
  at: At;
  x?: number;
  y?: number;
  width?: number;
  rowHeight?: number;
  /** Seconds between rows appearing. */
  stagger?: number;
}> = ({ rows, lane, at, x = 160, y = 300, width = 1600, rowHeight = 76, stagger = 0.35 }) => {
  const frame = useCurrentFrame();
  const shown = lane ? rows.filter((r) => r.lane === lane) : rows;
  const cols = [0, 0.42, 0.67, 0.8].map((k) => k * width);
  const head = ['Item', 'Amount (as displayed)', 'Cadence', 'Source'];
  const rule = (i: number) => {
    const p = progressAt(frame, at[0] + i * stagger, 0.8, EASE_SOFT);
    return (
      <path
        key={`r${i}`}
        d={penLine(0, rowHeight * (i + 1), width, rowHeight * (i + 1) + 0.5, 11 + i, 0.6)}
        fill="none"
        stroke={i === 0 ? C.ink : C.rule}
        strokeWidth={i === 0 ? 1.6 : 1.2}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="1 1"
        strokeDashoffset={1 - p}
      />
    );
  };
  const cell = (text: string, col: number, row: number, opts: { muted?: boolean; italic?: boolean; head?: boolean } = {}) => (
    <div
      key={`${row}-${col}`}
      style={{
        position: 'absolute',
        left: cols[col],
        top: rowHeight * row + rowHeight * 0.28,
        width: (cols[col + 1] ?? width) - cols[col] - 24,
        fontFamily: FONT.sans,
        fontSize: opts.head ? 22 : 30,
        fontWeight: opts.head ? 600 : 400,
        fontStyle: opts.italic ? 'italic' : 'normal',
        color: opts.head || opts.muted ? C.muted : C.ink,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {text}
    </div>
  );

  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height: rowHeight * (shown.length + 1) }}>
      <svg width={width} height={rowHeight * (shown.length + 2)} style={{ position: 'absolute', overflow: 'visible' }}>
        {[0, ...shown.map((_, i) => i + 1)].map(rule)}
      </svg>
      <Reveal at={at}>{head.map((h, c) => cell(h, c, 0, { head: true }))}</Reveal>
      {shown.length === 0 && (
        <Reveal at={[at[0] + 0.4, at[1]]}>{cell('No figures yet. Every amount will cite the page it came from.', 0, 1, { muted: true, italic: true })}</Reveal>
      )}
      {shown.map((r, i) => (
        <Reveal key={r.id} at={[at[0] + (i + 1) * stagger, at[1]]}>
          {cell(tr(r.item), 0, i + 1)}
          {r.amount && r.source
            ? cell(`${r.amount}${r.source.basis === 'snippet-only' ? ' (snippet, unverified)' : ''}`, 1, i + 1)
            : cell(r.status === 'measured' ? '—' : STATUS_LABEL[r.status], 1, i + 1, { muted: true, italic: true })}
          {cell(r.cadence ?? '—', 2, i + 1, { muted: !r.cadence })}
          {cell(r.source ? `${new URL(r.source.url).hostname} · ${r.source.retrieved}` : 'not yet sourced', 3, i + 1, { muted: true, italic: !r.source })}
        </Reveal>
      ))}
    </div>
  );
};
