import React from 'react';
import { C, FONT } from '../brand';
import { tr, type MapNode, type MapObject, type Scene } from '../content';
import { DRAWINGS } from '../data/ink';
import anchors from '../data/ink/system-map.anchors.json';
import { Art, artRect, hasDrawing } from './Art';
import { Appear, Broken, from, Header, PenStroke, SAFE, splitLead, T } from './common';

/**
 * B06 · The plan: the system in one picture.
 *
 * The art lane drew the eight objects of the system map as separate groups
 * and recorded where each one stands (system-map.anchors.json). Here each
 * object is drawn on its own, cropped to its group, and the objects are set
 * out as a hub and spokes: the site (the building) in the middle, the seven
 * services around it, each with its label beside it and a pen-drawn spoke
 * from the hub. Labels are screen text, never drawn.
 *
 * Timing: the building is drawn first, during the title; each service is
 * drawn just before its label appears, and its spoke draws with the label,
 * so object, spoke and label arrive together.
 */

// content.ts object names → anchor ids in system-map.anchors.json.
const ANCHOR_ID: Record<MapObject, string> = {
  building: 'building',
  drawer: 'filing',
  gear: 'gears',
  envelope: 'envelope',
  calendar: 'calendar',
  receipt: 'receipt',
  film: 'film',
  padlock: 'padlock',
};

type Anchor = { id: string; centre: number[]; bbox: number[] };
const ANCHORS = (anchors as { scale: number; objects: Anchor[] }).objects;
const ANCHOR_SCALE = (anchors as { scale: number }).scale;

/** The stroke group that holds an anchor's object: the group whose ink box contains the anchor's centre. */
const groupFor = (object: MapObject): number | null => {
  if (!hasDrawing('system-map')) return null;
  const a = ANCHORS.find((o) => o.id === ANCHOR_ID[object]);
  if (!a) return null;
  const [cx, cy] = a.centre.map((v) => v / ANCHOR_SCALE);
  const boxes = new Map<number, [number, number, number, number]>();
  for (const s of DRAWINGS['system-map'].strokes) {
    const b = boxes.get(s.g) ?? [Infinity, Infinity, -Infinity, -Infinity];
    boxes.set(s.g, [Math.min(b[0], s.box[0]), Math.min(b[1], s.box[1]), Math.max(b[2], s.box[2]), Math.max(b[3], s.box[3])]);
  }
  for (const [g, b] of boxes) if (cx >= b[0] && cx <= b[2] && cy >= b[1] && cy <= b[3]) return g;
  return null;
};

/** Where each object sits (centre, frame px) and which side its label goes. */
const PLACE: Record<MapObject, { x: number; y: number; side: 'left' | 'right' | 'above'; maxW?: number }> = {
  building: { x: 960, y: 578, side: 'above' },
  drawer: { x: 566, y: 398, side: 'left' },
  gear: { x: 440, y: 578, side: 'left' },
  film: { x: 566, y: 820, side: 'left' },
  calendar: { x: 1330, y: 398, side: 'right' },
  envelope: { x: 1500, y: 578, side: 'right' },
  receipt: { x: 1440, y: 820, side: 'right' },
  padlock: { x: 960, y: 848, side: 'right', maxW: 250 },
};
/** Seconds each service's pen takes; it finishes just after its label starts to fade in. */
const NODE_PEN = 1.5;
const NODE_LEAD = 1.2;
const HUB_SCALE = 1.45;
const NODE_SCALE = 1.1;
const LABEL_GAP = 26;

export const DiagramScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const d = scene.diagram;
  if (!d) return null;
  const art = scene.art?.[0];
  const nodes = d.nodes.items as readonly MapNode[];
  const drawn = [d.hub, ...nodes];
  // Pen: the hub first (from the art cue's start), then each service just before its own label.
  const penStart = art?.start ?? 0.6;
  const penDur = art?.dur ?? 9;
  const hubDur = Math.min(2.4, penDur * 0.3);
  const nodeStart = (n: MapNode, i: number) => Math.max(penStart + hubDur + i * 0.15, from(n) - NODE_LEAD);

  const rects = drawn.map((n, i) => {
    const g = groupFor(n.object);
    const p = PLACE[n.object];
    const scale = i === 0 ? HUB_SCALE : NODE_SCALE;
    const r = g === null ? null : artRect({ name: 'system-map', groups: [g], crop: 'ink', pad: 10, x: p.x, y: p.y, anchor: 'c', scale });
    return { node: n, g, p, r, scale };
  });
  const hub = rects[0];
  const hubW = hub.r?.width ?? 240;
  const hubH = hub.r?.height ?? 200;

  // Radial spoke from the hub's edge to just short of the node.
  const spoke = (x2: number, y2: number, w2: number, h2: number) => {
    const dx = x2 - hub.p.x;
    const dy = y2 - hub.p.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const edge = (w: number, h: number) => 1 / Math.sqrt((ux / (w / 2)) ** 2 + (uy / (h / 2)) ** 2);
    const a = edge(hubW * 0.92, hubH * 0.92) + 4;
    const b = edge(w2 * 0.95, h2 * 0.95) + 6;
    return [hub.p.x + ux * a, hub.p.y + uy * a, x2 - ux * b, y2 - uy * b] as const;
  };

  const [pathsLead, pathsDest] = tr(d.paths).split('→').map((s) => s.trim());

  return (
    <>
      <Header scene={scene} size={64} width={1500} />
      <Appear at={d.paths.at} style={{ ...T.body, position: 'absolute', left: SAFE.left, top: 244, width: 1620, fontSize: 34, color: C.navy2 }}>
        {pathsLead}
        {pathsDest !== undefined && (
          <>
            <span style={{ color: C.brass, fontWeight: 600, fontSize: 40, margin: '0 16px', lineHeight: 1 }}>→</span>
            <span style={{ fontWeight: 600, color: C.ink }}>{pathsDest}</span>
          </>
        )}
      </Appear>

      {/* Spokes, drawn as each service's label appears. */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {rects.slice(1).map(({ node, p, r }, i) => {
          const [x1, y1, x2, y2] = spoke(p.x, p.y, r?.width ?? 140, r?.height ?? 140);
          return <PenStroke key={node.id} x1={x1} y1={y1} x2={x2} y2={y2} start={from(node)} dur={0.7} seed={70 + i} color={C.ink} width={1.6} opacity={0.5} />;
        })}
      </svg>

      {/* The objects. */}
      {rects.map(({ node, g, p, scale }, i) =>
        g === null ? null : (
          <Art
            key={node.id}
            name="system-map"
            groups={[g]}
            crop="ink"
            pad={10}
            x={p.x}
            y={p.y}
            anchor="c"
            scale={scale}
            start={i === 0 ? penStart : nodeStart(node, i - 1)}
            dur={i === 0 ? hubDur : NODE_PEN}
            washDelay={i === 0 ? hubDur * 0.9 : NODE_PEN * 0.8}
            washDur={1.0}
          />
        ),
      )}

      {/* Labels: UI text beside each object. */}
      {rects.map(({ node, p, r }, i) => {
        const w = r?.width ?? 140;
        const h = r?.height ?? 140;
        const isHub = i === 0;
        // Every service label has a strong lead: before its colon, else before its first comma, else the whole label.
        const [lead0, rest0] = splitLead(tr(node), !isHub);
        const [lead, rest] = !isHub && !lead0 ? [rest0, ''] : [lead0, rest0];
        const body = (
          <>
            {lead && <div style={{ ...T.strong, fontSize: 30 }}>{lead.replace(/[:;,]$/, '')}</div>}
            {rest && <div style={{ ...(isHub ? T.strong : T.body), fontSize: isHub ? 32 : 30, color: isHub ? C.ink : C.navy2, lineHeight: 1.25 }}>{isHub ? <Broken text={rest} sep=", " /> : rest}</div>}
          </>
        );
        if (p.side === 'above') {
          return (
            <Appear key={node.id} at={node.at} style={{ position: 'absolute', left: p.x - 230, width: 460, top: p.y - h / 2 - 96, textAlign: 'center', textWrap: 'balance' }}>
              {body}
            </Appear>
          );
        }
        const labelW = p.side === 'left' ? p.x - w / 2 - LABEL_GAP - SAFE.left : SAFE.right - (p.x + w / 2 + LABEL_GAP);
        return (
          <Appear
            key={node.id}
            at={node.at}
            style={{
              position: 'absolute',
              top: p.y,
              transformOrigin: 'left center',
              width: Math.min(labelW, p.maxW ?? 360),
              ...(p.side === 'left' ? { left: p.x - w / 2 - LABEL_GAP - Math.min(labelW, p.maxW ?? 360), textAlign: 'right' } : { left: p.x + w / 2 + LABEL_GAP, textAlign: 'left' }),
              fontFamily: FONT.sans,
            }}
          >
            <div style={{ transform: 'translateY(-50%)' }}>{body}</div>
          </Appear>
        );
      })}

      {scene.caption && (
        <Appear at={scene.caption.at} style={{ ...T.muted, position: 'absolute', left: SAFE.left, top: 928, width: 1620, fontSize: 31 }}>
          {tr(scene.caption)}
        </Appear>
      )}
    </>
  );
};
