import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {sketch} from '../design/palette';

// The reel's vertical page: 1080 × 1920, drawn at 1:1 (no scaling). The film's sketch kit draws in absolute stage
// pixels, so it works unchanged on this page; only the page, the camera and the pen layer are made for it here.
export const RW = 1080;
export const RH = 1920;

/** Instagram's Reels interface covers the rest: every word stays inside this box. */
export const SAFE = {left: 64, right: 960, top: 270, bottom: 1450} as const;
/** The burned-in captions sit at the bottom of the safe box, centred on it; other text stays above CAPTION_TOP. */
export const CAPTION = {left: SAFE.left, width: SAFE.right - SAFE.left, bottom: SAFE.bottom, top: 1270} as const;

export const ReelStage: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{overflow: 'hidden', backgroundColor: sketch.paper}}>
    <div style={{position: 'absolute', left: 0, top: 0, width: RW, height: RH, overflow: 'hidden'}}>{children}</div>
  </AbsoluteFill>
);

/**
 * The reel's page, drawn once under everything: the film's warm ivory, the same whisper of vignette and the same
 * paper grain (the film's 1920 × 1080 grain, turned a quarter so it covers the tall page).
 */
export const ReelPaper: React.FC<{grain?: number}> = ({grain = 0.32}) => (
  <AbsoluteFill style={{backgroundColor: sketch.paper}}>
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse at 50% 46%, rgba(255,253,248,0.4) 0%, rgba(255,253,248,0) 58%, rgba(120,92,52,0.07) 100%)',
      }}
    />
    <Img
      src={staticFile('textures/grain-1920.png')}
      style={{
        position: 'absolute',
        width: RH,
        height: RW,
        left: (RW - RH) / 2,
        top: (RH - RW) / 2,
        rotate: '90deg',
        mixBlendMode: 'soft-light',
        opacity: grain,
      }}
    />
  </AbsoluteFill>
);

/** One slow camera for the whole page: a push-in of a few percent that keeps `anchor` still on screen. */
export const ReelCamera: React.FC<{zoom: number; anchor: {x: number; y: number}; children: React.ReactNode}> = ({
  zoom,
  anchor,
  children,
}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: RW,
      height: RH,
      transformOrigin: `${anchor.x}px ${anchor.y}px`,
      scale: String(zoom),
    }}
  >
    {children}
  </div>
);

/** A full-page SVG layer for pen marks (the film's InkLayer is 1920 × 1080; this one is the reel's page). */
export const ReelInk: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <svg
    width={RW}
    height={RH}
    viewBox={`0 0 ${RW} ${RH}`}
    style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', ...style}}
  >
    {children}
  </svg>
);
