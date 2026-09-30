import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, EASE_SOFT } from '../brand';
import { tr, type Scene } from '../content';
import anchors from '../data/ink/road-markers.anchors.json';
import { progressAt } from '../primitives/time';
import { Art, hasDrawing } from './Art';
import { Appear, from, Header, SAFE, T, TagMark } from './common';
import { Callout } from './ListScene';

/**
 * B12 · Timeline: the road-markers drawing on the right, six posts nearest
 * first (waves 0 to 5). Each post carries its wave's name at the anchor the
 * art lane recorded; the legend on the left says what each wave is. The
 * Friday callout and the 90-day caption run under the road, whose near end
 * fades into the paper.
 *
 * The drawing is placed inside the page's 150 px side margin and at least
 * 100 px clear of the title: the right-hand spruce is left out, and the
 * horizon starts at the left spruces and fades out before the margin instead
 * of running from edge to edge. The spruces' tiers are drawn before their
 * trunks, so no bare trunks stand on the horizon while the pen works.
 */
type Marker = { n: number; centre: number[]; top: number[]; base: number[]; bbox: number[]; side: 'left' | 'right' };
const MARKERS = (anchors as { markers: Marker[] }).markers;
const BASE = (anchors as { scale: number }).scale; // frame px per drawing unit at the art lane's full-frame placement (the anchors' units)
const SCALE = 1.27; // frame px per drawing unit here
const OX = 128; // frame px of the drawing's origin
const OY = -108;
/** Drawing units [x0, y0, x1, y1]: the road's near end fades out at the bottom, above the callout. */
const CROP = [640, 175, 1296, 645] as const;
/** The right-hand spruce (drawing units): left out. */
const OMIT = [[1255, 175, 1335, 345]] as const;
/** The horizon and hills (group 0): from the left spruces to just short of the margin, hidden behind the spruces (their washes 1 and 2). */
const HORIZON = { groups: [0], x0: 734, x1: 1292, feather: 34, behind: [1, 2] } as const;
const TREES = [1] as const;
/** An anchor (art lane's frame px) to this scene's frame px. */
const place = (a: number, o: number) => (a / BASE) * SCALE + o;

export const RoadScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const art = scene.art?.[0];
  const row = scene.row;
  const hasRoad = !!art && hasDrawing(art.name);
  const crop = [CROP[0], CROP[1], CROP[2] - CROP[0], CROP[3] - CROP[1]] as const;
  return (
    <>
      {art && hasRoad && (
        <Art
          name={art.name}
          start={art.start ?? 0.3}
          dur={art.dur}
          washDelay={art.washDelay}
          crop={crop}
          x={place(CROP[0] * BASE, OX)}
          y={place(CROP[1] * BASE, OY)}
          anchor="tl"
          scale={SCALE}
          fadeBottom={70}
          omit={OMIT}
          fadeGroups={HORIZON}
          withContours={TREES}
        />
      )}
      {art && !hasRoad && art.fallback && <Art name={art.fallback} start={art.start ?? 0.3} dur={art.dur} crop="ink" x={1450} y={450} anchor="c" scale={1.8} />}
      <Header scene={scene} size={62} width={860} />

      {row && (
        <>
          {/* The legend. */}
          <div style={{ position: 'absolute', left: SAFE.left, top: 292, width: 880 }}>
            {row.items.map((it, i) => (
              <Appear key={i} at={it.at} style={{ display: 'flex', alignItems: 'baseline', height: 66 }}>
                <span style={{ ...T.strong, fontSize: 28, color: C.brassInk, width: 128, flex: 'none' }}>{it.label ? tr(it.label) : ''}</span>
                <span style={{ ...T.body, fontSize: 32 }}>{tr(it)}</span>
                {it.tag && <TagMark tag={it.tag} start={from(it)} size={27} style={{ marginLeft: 18 }} />}
              </Appear>
            ))}
          </div>
          {/* The same names at the posts. */}
          {hasRoad &&
            row.items.map((it, i) => {
              const m = MARKERS[i];
              if (!m || !it.label) return null;
              const x = place(m.centre[0], OX);
              const y = place(m.centre[1], OY);
              const half = ((m.bbox[2] - m.bbox[0]) / 2 / BASE) * SCALE;
              const here = it.tag === 'here';
              return (
                <Appear
                  key={i}
                  at={it.at}
                  delay={0.2}
                  style={{
                    position: 'absolute',
                    top: y - 18,
                    ...(m.side === 'left' ? { right: 1920 - (x - half - 16), textAlign: 'right' } : { left: x + half + 26 }),
                    ...T.strong,
                    fontSize: 24,
                    color: C.brassInk,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tr(it.label)}
                  {here && <HereDot start={from(it)} />}
                </Appear>
              );
            })}
        </>
      )}

      {scene.callout && (
        <div style={{ position: 'absolute', left: SAFE.left, top: 716, width: 1620 }}>
          <Callout text={tr(scene.callout)} at={scene.callout.at} width={1620} size={38} balance />
        </div>
      )}
      {scene.caption && (
        <Appear at={scene.caption.at} style={{ ...T.muted, position: 'absolute', left: SAFE.left + 44, top: 868, width: 1576, fontSize: 31, textWrap: 'balance' }}>
          {tr(scene.caption)}
        </Appear>
      )}
    </>
  );
};

/** A small brass dot beside "Wave 0": we are here. */
const HereDot: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const p = progressAt(frame, start + 0.4, 0.6, EASE_SOFT);
  return (
    <svg width={18} height={18} style={{ display: 'inline-block', marginLeft: 8, verticalAlign: 'middle', overflow: 'visible' }}>
      <circle cx={9} cy={9} r={6 * p} fill={C.brass} />
    </svg>
  );
};
