import React from 'react';
import { C } from '../brand';
import { tr, type Scene } from '../content';
import { Art, artRect } from './Art';
import { Appear, Header, SAFE, T } from './common';

/**
 * B02 · Why: title and the one line across the top; two panels below, each a
 * drawing and, when its item appears, the product's name and one sentence.
 * Both drawings share one scale so their line weights match.
 */
const PANELS = [
  { left: SAFE.left, width: 760 },
  { left: 1010, width: 760 },
];
const ART_SCALE = 0.72;
const ART_BOTTOM = 736; // drawings stand on this line
const ART_TOP = 372;
const TEXT_TOP = 764;

export const PairScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const items = scene.items ?? [];
  const lead = scene.lines[0];
  return (
    <>
      <Header scene={scene} size={62} width={1620} />
      {lead && (
        <Appear at={lead.at} style={{ ...T.body, position: 'absolute', left: SAFE.left, top: 258, width: 1560, fontSize: 34 }}>
          {tr(lead)}
        </Appear>
      )}
      {PANELS.map((p, i) => {
        const art = scene.art?.[i];
        const item = items[i];
        const cx = p.left + p.width / 2;
        // Centre each drawing in the band between ART_TOP and ART_BOTTOM (the notebook is low and wide, the signpost tall).
        const r = art ? artRect({ name: art.name, fallback: art.fallback, crop: 'ink', pad: 14, x: 0, y: 0, scale: ART_SCALE }) : null;
        const cy = r ? Math.max(ART_TOP + r.height / 2, (ART_TOP + ART_BOTTOM) / 2 + 30) : 0;
        return (
          <React.Fragment key={i}>
            {art && <Art name={art.name} fallback={art.fallback} start={art.start ?? 0.4} dur={art.dur} washDelay={art.washDelay} crop="ink" pad={14} x={cx} y={Math.min(cy, ART_BOTTOM - (r?.height ?? 0) / 2)} anchor="c" scale={ART_SCALE} />}
            {item && (
              <Appear at={item.at} style={{ position: 'absolute', left: p.left, top: TEXT_TOP, width: p.width }}>
                {item.heading && <div style={{ ...T.serif, fontSize: 42, marginBottom: 10 }}>{tr(item.heading)}</div>}
                <div style={{ ...T.body, fontSize: 32, color: C.navy2 }}>{tr(item)}</div>
              </Appear>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};
