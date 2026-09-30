import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, EASE_SOFT } from '../brand';
import { tr, type Scene } from '../content';
import { line as penLine } from '../primitives/pen';
import { progressAt } from '../primitives/time';
import { Art } from './Art';
import { Appear, Bullet, from, Header, SAFE, T, TagMark } from './common';

/**
 * B03 · offers, B04 · built so far, B05 · what we found: a title and a list.
 * Tagged items read as a checklist: the text on the left, the status in its
 * own column. The caption and the callout follow the list.
 */
type ListCfg = {
  textWidth: number;
  tagWidth: number;
  size: number;
  gap: number;
  top: number;
  art: { x: number; y: number; anchor: 'c' | 'br' | 'bl' | 'cr' | 'tr'; scale: number; crop?: 'ink' };
};

const CFG: Record<string, ListCfg> = {
  // The dock sits low on the right, under the four offers.
  B03: { textWidth: 1480, tagWidth: 0, size: 36, gap: 30, top: 300, art: { x: 1780, y: 962, anchor: 'br', scale: 0.84, crop: 'ink' } },
  B04: { textWidth: 900, tagWidth: 200, size: 32, gap: 24, top: 290, art: { x: 1600, y: 430, anchor: 'c', scale: 1.4, crop: 'ink' } },
  B05: { textWidth: 900, tagWidth: 230, size: 32, gap: 26, top: 290, art: { x: 1610, y: 470, anchor: 'c', scale: 1.4, crop: 'ink' } },
};

export const ListScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const cfg = CFG[scene.id] ?? CFG.B04;
  const items = scene.items ?? [];
  const art = scene.art?.[0];
  const tagged = cfg.tagWidth > 0;
  return (
    <>
      {art && (
        <Art
          name={art.name}
          fallback={art.fallback}
          start={art.start ?? 0.3}
          dur={art.dur}
          washDelay={art.washDelay}
          crop={cfg.art.crop}
          pad={14}
          x={cfg.art.x}
          y={cfg.art.y}
          anchor={cfg.art.anchor}
          scale={cfg.art.scale}
        />
      )}
      <Header scene={scene} size={64} width={1300} />
      <div style={{ position: 'absolute', left: SAFE.left, top: cfg.top, width: 44 + cfg.textWidth + (tagged ? 36 + cfg.tagWidth : 0) }}>
        {items.map((it, i) => (
          <Appear key={i} at={it.at} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', paddingLeft: 44, marginBottom: cfg.gap }}>
            <Bullet start={from(it)} top={cfg.size * 0.62} seed={30 + i} />
            <div style={{ ...T.body, fontSize: cfg.size, width: cfg.textWidth, color: C.navy2 }}>
              {tr(it)}
            </div>
            {tagged && it.tag && (
              <div style={{ width: cfg.tagWidth, marginLeft: 36, paddingTop: cfg.size * 0.12, flex: 'none' }}>
                <TagMark tag={it.tag} start={from(it)} size={27} />
              </div>
            )}
          </Appear>
        ))}
        {scene.caption && (
          <Appear at={scene.caption.at} style={{ ...T.muted, fontSize: 31, marginTop: 30, width: 1250 }}>
            {tr(scene.caption)}
          </Appear>
        )}
        {scene.callout && <Callout text={tr(scene.callout)} at={scene.callout.at} width={1250} />}
      </div>
    </>
  );
};

/** A pull line: Newsreader 300 italic with a brass tick in the margin. */
export const Callout: React.FC<{ text: string; at?: readonly [number, number]; width: number; size?: number; balance?: boolean; style?: React.CSSProperties }> = ({ text, at, width, size = 42, balance, style }) => {
  const frame = useCurrentFrame();
  const p = progressAt(frame, at ? at[0] : 0, 0.6, EASE_SOFT);
  return (
    <Appear at={at} style={{ position: 'relative', marginTop: 34, paddingLeft: 44, width, ...style }}>
      <svg width={28} height={size * 1.3} style={{ position: 'absolute', left: 4, top: size * 0.12, overflow: 'visible' }}>
        <path d={penLine(8, 2, 7, size * 1.1, 61, 0.5)} fill="none" stroke={C.brass} strokeWidth={2.6} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
      </svg>
      <div style={{ ...T.pull, fontSize: size, textWrap: balance ? 'balance' : 'pretty' }}>{text}</div>
    </Appear>
  );
};
