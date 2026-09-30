import React from 'react';
import { C } from '../brand';
import { tr, type Scene } from '../content';
import { Art } from './Art';
import { Appear, Broken, KickerLine, SAFE, T } from './common';

/** B01 · Opening: kicker, title and caption vertically centred on the left; two-chairs on the right (as PipelineTest), inside the 150 px side margin. */
export const TitleScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const art = scene.art?.[0];
  return (
    <>
      {art && <Art name={art.name} fallback={art.fallback} start={art.start ?? 0.3} dur={art.dur} washDelay={art.washDelay} x={780} y={550} anchor="cl" width={1000} />}
      <div style={{ position: 'absolute', left: SAFE.left, top: 0, height: 1080, width: 660, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {scene.kicker && <KickerLine line={scene.kicker} style={{ marginBottom: 22 }} />}
        <Appear at={scene.title.at} style={{ ...T.title, fontSize: 88, marginLeft: -4, textWrap: 'balance' }}>
          {tr(scene.title)}
        </Appear>
        {scene.caption && (
          <Appear at={scene.caption.at} style={{ ...T.body, fontSize: 36, marginTop: 40, color: C.navy2, width: 600, textWrap: 'balance' }}>
            {tr(scene.caption)}
          </Appear>
        )}
      </div>
    </>
  );
};

/** B14 · Close: the sailboat centred at the top, the brand line under it, then the next step. */
export const CloseScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const art = scene.art?.[0];
  return (
    <>
      {art && <Art name={art.name} fallback={art.fallback} start={art.start ?? 0.2} dur={art.dur} washDelay={art.washDelay} crop="ink" pad={14} x={960} y={470} anchor="bc" scale={1.7} />}
      <Appear at={scene.title.at} style={{ ...T.title, position: 'absolute', left: 160, width: 1600, top: 540, fontSize: 80, textAlign: 'center' }}>
        {tr(scene.title)}
      </Appear>
      {scene.lines.map((l, i) => (
        <Appear key={i} at={l.at} style={{ ...T.body, position: 'absolute', left: 260, width: 1400, top: 680 + i * 60, fontSize: 34, textAlign: 'center' }}>
          <Broken text={tr(l)} sep=". " />
        </Appear>
      ))}
    </>
  );
};
