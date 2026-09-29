import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {staticFile, useDelayRender} from 'remotion';
import sizes from '../data/illustrations.json';
import {useT} from './stage';

// A sketchbook drawing that draws itself: the pen lines appear first, spreading along the strokes from where the pen
// starts, then the watercolour blooms in behind them. The layers come from tools/illustrate.py
// (public/illustrations/<name>.ink / .wash / .time .png). Each frame is composed on a canvas and white is turned
// into transparency, so the drawing sits on the film's paper inside any camera move, fade or rotation.

export type IllustrationName = keyof typeof sizes;

type Layers = {w: number; h: number; ink: Uint8ClampedArray; wash: Uint8ClampedArray; time: Uint8ClampedArray};

// A few decoded drawings are kept, so a drawing that returns in a later scene is not decoded again.
const cache = new Map<string, Promise<Layers>>();
const CACHE_SIZE = 6;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`InkDrawing: could not load ${src}`));
    img.src = src;
  });

const pixels = (img: HTMLImageElement) => {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d', {willReadFrequently: true});
  if (!ctx) throw new Error('InkDrawing: no 2D canvas');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, c.width, c.height).data;
};

const load = (name: string): Promise<Layers> => {
  const hit = cache.get(name);
  if (hit) {
    cache.delete(name);
    cache.set(name, hit);
    return hit;
  }
  const p = Promise.all(
    (['ink', 'wash', 'time'] as const).map((layer) => loadImage(staticFile(`illustrations/${name}.${layer}.png`))),
  ).then(([ink, wash, time]) => ({
    w: ink.naturalWidth,
    h: ink.naturalHeight,
    ink: pixels(ink),
    wash: pixels(wash),
    time: pixels(time),
  }));
  cache.set(name, p);
  while (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string);
  p.catch(() => cache.delete(name));
  return p;
};

/** The reveal is over (ink and wash complete) at this progress. */
export const DRAWN = 1.32;

const lutInk = new Float32Array(256);
const lutWash = new Float32Array(256);

/** Paint the drawing at progress p (0 = blank page, 1 = all ink down, DRAWN = wash dry). */
const paint = (ctx: CanvasRenderingContext2D, out: ImageData, L: Layers, p: number, sharp: number, soft: number) => {
  for (let v = 0; v < 256; v++) {
    const t = v / 255;
    lutInk[v] = Math.min(1, Math.max(0, (p - t) * sharp));
    lutWash[v] = Math.min(1, Math.max(0, (p - t) * soft));
  }
  const o = out.data;
  const {ink, wash, time} = L;
  for (let j = 0; j < o.length; j += 4) {
    const ai = lutInk[time[j]];
    const aw = lutWash[time[j + 1]];
    if (ai === 0 && aw === 0) {
      o[j + 3] = 0;
      continue;
    }
    // Colour on white: ink x wash, each faded towards white by how far the reveal has reached this pixel.
    const r = (1 - (ai * (255 - ink[j])) / 255) * (1 - (aw * (255 - wash[j])) / 255);
    const g = (1 - (ai * (255 - ink[j + 1])) / 255) * (1 - (aw * (255 - wash[j + 1])) / 255);
    const b = (1 - (ai * (255 - ink[j + 2])) / 255) * (1 - (aw * (255 - wash[j + 2])) / 255);
    // Colour to alpha: the least opaque ink that gives back this colour over white.
    const a = 1 - Math.min(r, g, b);
    if (a < 0.004) {
      o[j + 3] = 0;
      continue;
    }
    o[j] = 255 * (1 - (1 - r) / a);
    o[j + 1] = 255 * (1 - (1 - g) / a);
    o[j + 2] = 255 * (1 - (1 - b) / a);
    o[j + 3] = 255 * a;
  }
  ctx.putImageData(out, 0, 0);
};

export const InkDrawing: React.FC<{
  name: IllustrationName;
  /** Absolute film frame at which the pen touches the paper. */
  start: number;
  /** Frames until the last line is down. The wash keeps blooming for another third of this. */
  duration?: number;
  /** Position and width on the stage, in px. The height follows the picture. */
  left?: number;
  top?: number;
  width?: number;
  opacity?: number;
  /** How crisp the advancing ink front is, and how softly the wash spreads. */
  sharpness?: number;
  softness?: number;
  style?: React.CSSProperties;
}> = ({name, start, duration = 90, left = 0, top = 0, width, opacity = 1, sharpness = 22, softness = 3.4, style}) => {
  const t = useT();
  const size = sizes[name];
  const w = width ?? size.width;
  const h = (w * size.height) / size.width;
  const canvas = useRef<HTMLCanvasElement>(null);
  const buffer = useRef<ImageData | null>(null);
  const painted = useRef<number | null>(null);
  const [layers, setLayers] = useState<Layers | null>(null);
  const {delayRender, continueRender, cancelRender} = useDelayRender();
  const [handle] = useState(() => delayRender(`Loading drawing ${name}`));

  const released = useRef(false);
  useEffect(() => {
    let live = true;
    load(name)
      .then((L) => {
        if (live) setLayers(L);
      })
      .catch((e) => cancelRender(e));
    return () => {
      live = false;
    };
  }, [name, cancelRender]);

  const p = Math.min(DRAWN, Math.max(0, (t - start) / Math.max(1, duration)));

  useLayoutEffect(() => {
    const c = canvas.current;
    if (!layers || !c) return;
    if (painted.current === p) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    if (!buffer.current || buffer.current.width !== layers.w) buffer.current = ctx.createImageData(layers.w, layers.h);
    if (p <= 0) ctx.clearRect(0, 0, layers.w, layers.h);
    else paint(ctx, buffer.current, layers, p, sharpness, softness);
    painted.current = p;
    // The frame may be captured only once the first picture is really on the canvas.
    if (!released.current) {
      released.current = true;
      continueRender(handle);
    }
  }, [layers, p, sharpness, softness, continueRender, handle]);

  return (
    <canvas
      ref={canvas}
      width={size.width}
      height={size.height}
      style={{position: 'absolute', left, top, width: w, height: h, opacity, ...style}}
    />
  );
};
