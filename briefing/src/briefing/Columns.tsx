import React from 'react';
import { C } from '../brand';
import { tr, type Column, type Scene } from '../content';
import { Art } from './Art';
import { Appear, Bullet, from, HandRule, Header, LeadText, RefText, SAFE, T } from './common';

/**
 * B11 · Time and B13 · What we need from you: side-by-side columns, one per
 * person, each with its heading and items. The drawing sits small in the
 * bottom-right corner.
 */
type Cfg = {
  /** Columns grouped into stacks: each stack is one vertical column on screen. */
  stacks: { left: number; width: number; cols: number[] }[];
  size: number;
  gap: number;
  top: number;
  art: { x: number; y: number; scale: number };
  caption?: { top: number; width: number };
};

const CFG: Record<string, Cfg> = {
  B11: {
    stacks: [
      { left: SAFE.left, width: 820, cols: [0] },
      { left: 1060, width: 710, cols: [1, 2] },
    ],
    size: 31,
    gap: 22,
    top: 276,
    art: { x: SAFE.right + 20, y: 992, scale: 0.5 },
  },
  B13: {
    stacks: [
      { left: SAFE.left, width: 790, cols: [0] },
      { left: 1000, width: 770, cols: [1] },
    ],
    size: 31,
    gap: 22,
    top: 276,
    art: { x: SAFE.right + 20, y: 990, scale: 0.52 },
    caption: { top: 900, width: 1180 },
  },
};

export const ColumnsScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const cfg = CFG[scene.id] ?? CFG.B13;
  const cols = scene.columns ?? [];
  const art = scene.art?.[0];
  return (
    <>
      {art && <Art name={art.name} fallback={art.fallback} start={art.start ?? 0.3} dur={art.dur} washDelay={art.washDelay} crop="ink" pad={14} x={cfg.art.x} y={cfg.art.y} anchor="br" scale={cfg.art.scale} />}
      <Header scene={scene} size={64} width={1400} />
      {cfg.stacks.map((st, si) => (
        <div key={si} style={{ position: 'absolute', left: st.left, top: cfg.top, width: st.width }}>
          {st.cols.map((ci, k) => cols[ci] && <ColumnBlock key={ci} col={cols[ci]} width={st.width} size={cfg.size} gap={cfg.gap} first={k === 0} seed={ci} />)}
        </div>
      ))}
      {scene.caption && cfg.caption && (
        <Appear at={scene.caption.at} style={{ ...T.muted, position: 'absolute', left: SAFE.left, top: cfg.caption.top, width: cfg.caption.width, fontSize: 31 }}>
          {tr(scene.caption)}
        </Appear>
      )}
    </>
  );
};

const ColumnBlock: React.FC<{ col: Column; width: number; size: number; gap: number; first: boolean; seed: number }> = ({ col, width, size, gap, first, seed }) => (
  <div style={{ marginTop: first ? 0 : 40 }}>
    <Appear at={col.heading.at} style={{ position: 'relative', ...T.serif, fontSize: 40, paddingBottom: 12, marginBottom: 22 }}>
      {tr(col.heading)}
      <HandRule start={from(col.heading)} width={width} seed={50 + seed} color={C.stone} strokeWidth={1.6} style={{ left: 0, bottom: -2 }} />
    </Appear>
    {col.items.map((it, i) => (
      <Appear key={i} at={it.at} style={{ position: 'relative', paddingLeft: 40, marginBottom: gap }}>
        <Bullet start={from(it)} top={size * 0.6} seed={80 + seed * 10 + i} />
        <div style={{ ...T.body, fontSize: size, lineHeight: 1.34 }}>
          {/\(HB-/.test(tr(it)) ? <RefText text={tr(it)} /> : <LeadText text={tr(it)} />}
        </div>
      </Appear>
    ))}
  </div>
);
