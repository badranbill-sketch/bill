import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { C, FONT } from '../brand';

/**
 * QA tool, not part of the briefing: a contact sheet of rendered stills
 * (scripts/stills.mjs passes them in as small JPEG data URLs).
 */
export type ContactSheetProps = { cells: { src: string; label: string }[]; columns: number };

const PAD = 24;
const LABEL = 34;
const cellW = (columns: number) => (1920 - PAD * (columns + 1)) / columns;
export const contactSheetHeight = (n: number, columns: number) => {
  const rows = Math.max(1, Math.ceil(n / columns));
  const h = (cellW(columns) * 9) / 16;
  return Math.ceil(PAD + rows * (h + LABEL + PAD)) + (Math.ceil(PAD + rows * (h + LABEL + PAD)) % 2);
};

export const ContactSheet: React.FC<ContactSheetProps> = ({ cells, columns }) => {
  const w = cellW(columns);
  const h = (w * 9) / 16;
  return (
    <AbsoluteFill style={{ backgroundColor: '#ffffff' }}>
      {cells.map((c, i) => {
        const x = PAD + (i % columns) * (w + PAD);
        const y = PAD + Math.floor(i / columns) * (h + LABEL + PAD);
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width: w }}>
            <Img src={c.src} style={{ width: w, height: h, display: 'block', outline: `1px solid ${C.rule}` }} />
            <div style={{ fontFamily: FONT.sans, fontSize: 20, color: C.muted, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
