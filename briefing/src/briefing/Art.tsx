import React from 'react';
import { DRAWINGS, type DrawingName } from '../data/ink';
import { InkDraw, type PenOrder } from '../primitives/InkDraw';

/**
 * Places one drawing of the briefing, in frame pixels.
 *
 * The art lane's drawings (workshop-notebook, crossroads-signpost, ledger-page,
 * desk-clock, system-map, road-markers) use a 1440×810 viewBox that is the
 * whole frame; the site's drawings are 280×220 vignettes, 760×520 (two-chairs)
 * and 1200×440 (dock). Art crops any of them to its ink (`crop="ink"`) and
 * places the crop at a given scale (frame px per drawing unit), so line
 * weights stay comparable from scene to scene.
 *
 * A drawing that is not in src/data/ink falls back to `fallback`, or to
 * nothing: never a placeholder box.
 */

export type Box4 = readonly [number, number, number, number];

export const hasDrawing = (n: string | undefined): n is DrawingName => !!n && n in DRAWINGS;

const boundsCache = new Map<string, Box4>();
/** The ink's bounding box [x, y, w, h] in the drawing's units, padded; optionally only some object groups. */
export const inkBounds = (name: DrawingName, groups?: readonly number[], pad = 12): Box4 => {
  const key = `${name}|${groups?.join(',') ?? ''}|${pad}`;
  const hit = boundsCache.get(key);
  if (hit) return hit;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const s of DRAWINGS[name].strokes) {
    if (groups && !groups.includes(s.g)) continue;
    x0 = Math.min(x0, s.box[0]);
    y0 = Math.min(y0, s.box[1]);
    x1 = Math.max(x1, s.box[2]);
    y1 = Math.max(y1, s.box[3]);
  }
  const vb = DRAWINGS[name].viewBox;
  // Never crop outside the drawing's own viewBox (a pad may not invent paper the drawing does not have).
  const bx = Math.max(vb[0], x0 - pad);
  const by = Math.max(vb[1], y0 - pad);
  const bx1 = Math.min(vb[0] + vb[2], x1 + pad);
  const by1 = Math.min(vb[1] + vb[3], y1 + pad);
  const out: Box4 = [bx, by, bx1 - bx, by1 - by];
  boundsCache.set(key, out);
  return out;
};

export type Anchor = 'tl' | 'tc' | 'tr' | 'cl' | 'c' | 'cr' | 'bl' | 'bc' | 'br';

export type ArtProps = {
  name: string;
  fallback?: string;
  /** Seconds from the scene start when the pen starts. */
  start: number;
  /** Seconds the pen takes. */
  dur: number;
  washDelay?: number;
  washDur?: number;
  /** Already drawn: show it complete from the first frame. */
  hold?: boolean;
  order?: PenOrder;
  groups?: readonly number[];
  /** 'ink' = crop to the ink (padded by `pad`), a box in drawing units, or the whole viewBox when omitted. */
  crop?: 'ink' | Box4;
  pad?: number;
  /** The anchor point, in frame px. */
  x: number;
  y: number;
  anchor?: Anchor;
  /** Frame px per drawing unit. If omitted, the crop is fitted into width × height. */
  scale?: number;
  width?: number;
  height?: number;
  /** Fade the drawing into the paper over this many px at its bottom / left / top edge (instead of a hard crop). */
  fadeBottom?: number;
  fadeLeft?: number;
  fadeTop?: number;
  style?: React.CSSProperties;
};

/** Frame-pixel rectangle an Art with these props occupies (for layout decisions and checks). */
export const artRect = (p: Pick<ArtProps, 'name' | 'fallback' | 'groups' | 'crop' | 'pad' | 'x' | 'y' | 'anchor' | 'scale' | 'width' | 'height'>) => {
  const name = hasDrawing(p.name) ? p.name : hasDrawing(p.fallback) ? p.fallback : null;
  if (!name) return null;
  const vb = DRAWINGS[name].viewBox as unknown as Box4;
  const crop: Box4 = p.crop === 'ink' ? inkBounds(name, p.groups, p.pad) : (p.crop ?? vb);
  const [, , cw, ch] = crop;
  const k = p.scale ?? (p.width && p.height ? Math.min(p.width / cw, p.height / ch) : p.width ? p.width / cw : p.height ? p.height / ch : 1);
  const w = cw * k;
  const h = ch * k;
  const a = p.anchor ?? 'tl';
  const left = a.endsWith('l') ? p.x : a.endsWith('r') ? p.x - w : p.x - w / 2;
  const top = a.startsWith('t') ? p.y : a.startsWith('b') ? p.y - h : p.y - h / 2;
  return { name, crop, scale: k, left, top, width: w, height: h };
};

export const Art: React.FC<ArtProps> = (p) => {
  const r = artRect(p);
  if (!r) return null;
  const masks: string[] = [];
  if (p.fadeBottom) masks.push(`linear-gradient(to bottom, #000 calc(100% - ${p.fadeBottom}px), transparent)`);
  if (p.fadeTop) masks.push(`linear-gradient(to top, #000 calc(100% - ${p.fadeTop}px), transparent)`);
  if (p.fadeLeft) masks.push(`linear-gradient(to left, #000 calc(100% - ${p.fadeLeft}px), transparent)`);
  const maskStyle: React.CSSProperties = masks.length
    ? { WebkitMaskImage: masks.join(', '), maskImage: masks.join(', '), WebkitMaskComposite: 'source-in', maskComposite: 'intersect' }
    : {};
  const held = !!p.hold;
  return (
    <InkDraw
      name={r.name}
      start={held ? -100 : p.start}
      dur={held ? 1 : Math.max(0.1, p.dur)}
      washDelay={held ? 0 : p.washDelay}
      washDur={held ? 0.05 : p.washDur}
      order={p.order}
      groups={p.groups}
      crop={r.crop}
      width={r.width}
      style={{ left: r.left, top: r.top, ...maskStyle, ...p.style }}
    />
  );
};
