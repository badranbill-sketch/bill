import React from 'react';
import {Img, staticFile} from 'remotion';
import {sketch} from '../../design/palette';
import {ease, tween} from '../../design/motion';
import {BillShot, BillSlot} from '../BillShot';
import {GuideCover, PAGE} from '../GuideCover';
import {useT} from '../stage';
import {handPath, Pt} from './strokes';
import {InkLayer, InkStroke} from './Ink';

// Things laid on the sketchbook page: taped photo prints (Bill), paper clippings (the guide's pages), the guide itself,
// and the single brass line.

/** How an object lands on the page: it fades in, drops the last few pixels and settles its rotation. */
const useArrival = (start: number | undefined, rotate: number) => {
  const t = useT();
  if (start === undefined) return {opacity: 1, dy: 0, rot: rotate, scale: 1};
  const a = tween(t, start, start + 16, 0, 1, ease.out);
  return {opacity: a, dy: (1 - a) * -14, rot: rotate + (1 - a) * 1.2, scale: 1 + (1 - a) * 0.02};
};

const Tape: React.FC<{x: number; y: number; w?: number; rot: number}> = ({x, y, w = 128, rot}) => (
  <div
    style={{
      position: 'absolute',
      left: x - w / 2,
      top: y - 17,
      width: w,
      height: 34,
      background: sketch.tape,
      rotate: `${rot}deg`,
      boxShadow: '0 1px 2px rgba(60,48,30,0.12)',
      // torn ends
      clipPath: 'polygon(0 8%, 4% 0, 9% 10%, 14% 2%, 86% 3%, 91% 0, 96% 9%, 100% 2%, 100% 92%, 95% 100%, 90% 90%, 85% 98%, 13% 97%, 8% 100%, 4% 90%, 0 98%)',
    }}
  />
);

/**
 * A photo print taped into the sketchbook: a white border, soft shadow and two strips of tape. `children` fill the
 * picture area, which is (width - 2 * border) × (height - 2 * border).
 */
export const TapedPrint: React.FC<{
  left: number;
  top: number;
  width: number;
  height: number;
  rotate?: number;
  border?: number;
  tape?: 'corners' | 'top' | 'none';
  /** Absolute frame at which the print lands on the page (omit: already there). */
  arrive?: number;
  children: React.ReactNode;
}> = ({left, top, width, height, rotate = 0, border = 16, tape = 'corners', arrive, children}) => {
  const a = useArrival(arrive, rotate);
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        opacity: a.opacity,
        translate: `0 ${a.dy}px`,
        rotate: `${a.rot}deg`,
        scale: String(a.scale),
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: sketch.printBorder,
          boxShadow: `0 22px 44px ${sketch.shadow}, 0 3px 8px rgba(30,42,62,0.10)`,
        }}
      />
      <div style={{position: 'absolute', left: border, top: border, width: width - 2 * border, height: height - 2 * border, overflow: 'hidden'}}>
        {children}
      </div>
      {tape === 'corners' && (
        <>
          <Tape x={18} y={14} rot={-38} />
          <Tape x={width - 18} y={14} rot={38} />
        </>
      )}
      {tape === 'top' && <Tape x={width / 2} y={2} w={150} rot={-3} />}
    </div>
  );
};

/**
 * Bill on camera, as a print taped into the sketchbook. His footage (public/video/bill-<slot>.mp4) plays inside the
 * print, lip-synced; until it exists, his photo stands in with a slow push-in.
 */
export const BillPrint: React.FC<{
  slot: BillSlot;
  from: number;
  to: number;
  left: number;
  top: number;
  width: number;
  height: number;
  rotate?: number;
  arrive?: number;
  focus?: {x: number; y: number};
  zoom?: [number, number];
  clipStart?: number;
  /** Seconds into the footage at `clipStart` (see BillShot); leave it out for the film's automatic lip sync. */
  videoStart?: number;
}> = ({slot, from, to, left, top, width, height, rotate = -1.2, arrive, focus, zoom, clipStart, videoStart}) => {
  const border = 16;
  const w = width - 2 * border;
  const h = height - 2 * border;
  return (
    <TapedPrint left={left} top={top} width={width} height={height} rotate={rotate} border={border} arrive={arrive}>
      <BillShot
        slot={slot}
        from={from}
        to={to}
        frame={{kind: 'window', x: 0, y: 0, w, h, radius: 0}}
        shadow={false}
        focus={focus}
        zoom={zoom}
        clipStart={clipStart}
        videoStart={videoStart}
      />
    </TapedPrint>
  );
};

/** A paper clipping (a crop from the guide, say) taped onto the page. The height follows the image. */
export const Clipping: React.FC<{
  src: string;
  /** Pixel size of the source image, for its aspect ratio. */
  size: {w: number; h: number};
  left: number;
  top: number;
  width: number;
  rotate?: number;
  arrive?: number;
  tape?: 'top' | 'corners' | 'none';
}> = ({src, size, left, top, width, rotate = 0, arrive, tape = 'top'}) => {
  const height = (width * size.h) / size.w;
  return (
    <TapedPrint left={left} top={top} width={width} height={height} rotate={rotate} border={0} tape={tape} arrive={arrive}>
      <Img src={staticFile(src)} style={{width, height, display: 'block'}} />
    </TapedPrint>
  );
};

/** The real guide, as a booklet lying on the page: its cover (rebuilt from the PDF), a shadow and a few page edges. */
export const GuideObject: React.FC<{
  left: number;
  top: number;
  /** Displayed width of the cover in px; the height follows the page (935 × 1210). */
  width: number;
  rotate?: number;
  arrive?: number;
  time?: number;
}> = ({left, top, width, rotate = -3, arrive, time = 0}) => {
  const a = useArrival(arrive, rotate);
  const k = width / PAGE.w;
  const height = PAGE.h * k;
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        opacity: a.opacity,
        translate: `0 ${a.dy}px`,
        rotate: `${a.rot}deg`,
        scale: String(a.scale),
      }}
    >
      {/* the page block under the cover */}
      {[3, 6].map((o) => (
        <div
          key={o}
          style={{
            position: 'absolute',
            left: o,
            top: o,
            width,
            height,
            background: '#F7F4EE',
            borderRadius: 3,
            boxShadow: o === 6 ? `0 26px 50px ${sketch.shadow}, 0 4px 10px rgba(30,42,62,0.12)` : undefined,
          }}
        />
      ))}
      <div style={{position: 'absolute', inset: 0, borderRadius: 3, overflow: 'hidden'}}>
        <div style={{width: PAGE.w, height: PAGE.h, transform: `scale(${k})`, transformOrigin: '0 0'}}>
          <GuideCover time={time} />
        </div>
      </div>
    </div>
  );
};

/**
 * The film's single brass line: a hand-drawn path through `points` (stage px). It draws from start over duration;
 * `until` < 1 stops it short. Several BrassLines in a row read as one line travelling through the film.
 */
export const BrassLine: React.FC<{
  points: Pt[];
  start: number;
  duration?: number;
  until?: number;
  width?: number;
  wobble?: number;
  seed?: string;
  opacity?: number;
  tip?: boolean;
}> = ({points, start, duration = 45, until = 1, width = 3.4, wobble = 2.4, seed = 'brass', opacity = 1, tip = true}) => (
  <InkLayer>
    <InkStroke
      d={handPath(points, wobble, seed)}
      start={start}
      duration={duration}
      until={until}
      color={sketch.brass}
      width={width}
      opacity={opacity}
      tip={tip}
    />
  </InkLayer>
);
