import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, EASE_SOFT } from '../brand';
import { tr, type Scene } from '../content';
import { rng } from '../primitives/pen';
import { progressAt } from '../primitives/time';
import { Art } from './Art';
import { Appear, from, HandRule, Header, LeadText, SAFE, T } from './common';

/**
 * B07 · How it gets built, B09 · Money today: a title and a few lines beside
 * one drawing. B07 adds the seven approval gates across the bottom: open
 * circles, because none is recorded yet.
 */
const CFG: Record<string, { titleWidth: number; titleSize: number; textWidth: number; breakAt: string; art: { x: number; y: number; scale: number } }> = {
  B07: { titleWidth: 1180, titleSize: 64, textWidth: 1060, breakAt: '. ', art: { x: 1560, y: 430, scale: 1.6 } },
  B09: { titleWidth: 1040, titleSize: 60, textWidth: 960, breakAt: '; ', art: { x: 1460, y: 580, scale: 0.9 } },
};

export const StatementScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const cfg = CFG[scene.id] ?? CFG.B07;
  const art = scene.art?.[0];
  return (
    <>
      {art && <Art name={art.name} fallback={art.fallback} start={art.start ?? 0.3} dur={art.dur} washDelay={art.washDelay} crop="ink" pad={14} x={cfg.art.x} y={cfg.art.y} anchor="c" scale={cfg.art.scale} />}
      <div style={{ position: 'absolute', left: SAFE.left, top: SAFE.top - 6, width: cfg.titleWidth }}>
        <Header scene={scene} size={cfg.titleSize} width={cfg.titleWidth} left={0} top={0} breakAt={cfg.breakAt} style={{ position: 'relative' }} />
        <div style={{ marginTop: 44, width: cfg.textWidth }}>
          {scene.lines.map((l, i) => (
            <Appear key={i} at={l.at} style={{ ...T.body, fontSize: 35, marginBottom: 30 }}>
              <LeadText text={tr(l)} />
            </Appear>
          ))}
        </div>
      </div>
      {scene.row && <GateRow scene={scene} />}
    </>
  );
};

const GateRow: React.FC<{ scene: Scene }> = ({ scene }) => {
  const row = scene.row!;
  const n = row.items.length;
  const top = 680;
  const colW = (SAFE.right - SAFE.left) / n;
  const first = from(row.items[0]);
  const last = from(row.items[n - 1]);
  return (
    <>
      {row.lead && (
        <Appear at={row.lead.at} style={{ ...T.strong, position: 'absolute', left: SAFE.left, top, fontSize: 32 }}>
          {tr(row.lead)}
        </Appear>
      )}
      <HandRule start={first} dur={last - first + 0.8} width={SAFE.right - SAFE.left} seed={91} color={C.stone} strokeWidth={1.6} style={{ left: SAFE.left, top: top + 112 }} />
      {row.items.map((it, i) => (
        <Appear key={i} at={it.at} style={{ position: 'absolute', left: SAFE.left + i * colW, top: top + 64, width: colW - 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 44 }}>
            <OpenCircle start={from(it)} seed={100 + i} />
            {it.label && <span style={{ ...T.strong, fontSize: 30, color: C.brassInk }}>{tr(it.label)}</span>}
          </div>
          <div style={{ ...T.body, fontSize: 30, marginTop: 16, lineHeight: 1.25 }}>{tr(it)}</div>
        </Appear>
      ))}
    </>
  );
};

/** A small hand-drawn open circle: a gate that is not recorded yet. */
const OpenCircle: React.FC<{ start: number; seed: number; r?: number }> = ({ start, seed, r = 11 }) => {
  const frame = useCurrentFrame();
  const p = progressAt(frame, start + 0.1, 0.6, EASE_SOFT);
  const rand = rng(seed);
  const pts: string[] = [];
  const k = 28;
  const a0 = rand() * Math.PI * 2;
  for (let i = 0; i <= k + 2; i++) {
    const a = a0 + (i / k) * Math.PI * 2;
    const rr = r + (rand() - 0.5) * 0.9;
    pts.push(`${(r + 3 + Math.cos(a) * rr).toFixed(2)} ${(r + 3 + Math.sin(a) * rr).toFixed(2)}`);
  }
  return (
    <svg width={r * 2 + 6} height={r * 2 + 6} style={{ overflow: 'visible', flex: 'none' }}>
      <path d={`M${pts.join('L')}`} fill="none" stroke={C.ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
    </svg>
  );
};
