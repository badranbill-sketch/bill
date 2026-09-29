import React, {createContext, useContext} from 'react';
import {AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {sketch} from '../design/palette';

// Everything is designed on a 1920 × 1080 stage and scaled to the composition, so a 4K master or a
// re-framed social cut reuses the same scenes.
export const W = 1920;
export const H = 1080;

export const Stage: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {width, height} = useVideoConfig();
  const s = Math.min(width / W, height / H);
  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: sketch.paper}}>
      <div
        style={{
          position: 'absolute',
          width: W,
          height: H,
          left: (width - W * s) / 2,
          top: (height - H * s) / 2,
          scale: String(s),
          transformOrigin: '0 0',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

const SceneStart = createContext(0);

/**
 * A scene placed on the film's absolute timeline. Inside it, useT() returns the absolute frame. Scenes draw on one
 * shared page (the film's <Paper /> is rendered once, under every scene), so where two scenes overlap the outgoing
 * one dissolves away while the incoming one appears: `fadeIn` and `fadeOut` are those overlaps, in frames (0 = cut).
 */
export const Scene: React.FC<{
  name: string;
  from: number;
  to: number;
  fadeIn?: number;
  fadeOut?: number;
  children: React.ReactNode;
  premount?: number;
}> = ({name, from, to, fadeIn = 0, fadeOut = 0, children, premount = 45}) => (
  <Sequence name={name} from={from} durationInFrames={Math.max(1, to - from)} premountFor={premount}>
    <SceneStart.Provider value={from}>
      <Dissolve duration={to - from} fadeIn={fadeIn} fadeOut={fadeOut}>
        {children}
      </Dissolve>
    </SceneStart.Provider>
  </Sequence>
);

const Dissolve: React.FC<{duration: number; fadeIn: number; fadeOut: number; children: React.ReactNode}> = ({
  duration,
  fadeIn,
  fadeOut,
  children,
}) => {
  const f = useCurrentFrame();
  const a = fadeIn > 0 ? Math.min(1, Math.max(0, f / fadeIn)) : 1;
  const b = fadeOut > 0 ? Math.min(1, Math.max(0, (duration - f) / fadeOut)) : 1;
  // A soft S-curve, so a dissolve never looks like a dip.
  const s = (x: number) => x * x * (3 - 2 * x);
  const opacity = s(a) * s(b);
  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};

/** Absolute film frame, so scenes can use the cue helpers from timing.ts directly. */
export const useT = () => useCurrentFrame() + useContext(SceneStart);

/** A 2D camera: world coordinates in, the point (x, y) lands at the centre of the stage at the given zoom. */
export const Camera: React.FC<{x: number; y: number; zoom: number; rotate?: number; children: React.ReactNode}> = ({
  x,
  y,
  zoom,
  rotate = 0,
  children,
}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: W,
      height: H,
      transformOrigin: '0 0',
      transform: `translate(${W / 2}px, ${H / 2}px) rotate(${rotate}deg) scale(${zoom}) translate(${-x}px, ${-y}px)`,
    }}
  >
    {children}
  </div>
);

/** The film's page: warm ivory paper, a whisper of vignette and a static paper grain. Rendered once, under every
 *  scene (Film.tsx); a scene never paints its own background, so dissolves happen on one continuous sketchbook. */
export const Paper: React.FC<{grain?: number}> = ({grain = 0.32}) => (
  <AbsoluteFill style={{backgroundColor: sketch.paper}}>
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse at 50% 46%, rgba(255,253,248,0.4) 0%, rgba(255,253,248,0) 58%, rgba(120,92,52,0.07) 100%)',
      }}
    />
    <Img
      src={staticFile('textures/grain-1920.png')}
      style={{position: 'absolute', inset: 0, width: 1920, height: 1080, mixBlendMode: 'soft-light', opacity: grain}}
    />
  </AbsoluteFill>
);
