import React from 'react';
import {Video} from '@remotion/media';
import {AbsoluteFill, staticFile} from 'remotion';
import {BrassLine, Clipping, GuideObject, InkDrawing} from '../../components/sketch';
import {Scene, useT} from '../../components/stage';
import {sketch} from '../../design/palette';
import {SERIF} from '../../design/typography';
import {reelCopy} from '../copy';
import {CLIPS, FOOTPATH, LAKE, MEADOW} from '../layout';
import {fmEase, keyframes} from '../motion';
import {ReelPaper, ReelStage} from '../stage';

// The talking-head cut of the Reel: Bill on camera (public/video/bill-talk.mp4, his own words and voice), with
// sketchbook cutaways laid over his voice at his natural pauses, then the end card. Cut points are in seconds of
// the clip, found from the pauses in his speech (ffmpeg silencedetect); change them here if the take changes.

const FPS = 30;
const f = (s: number) => Math.round(s * FPS);
/** where his last sentence ends in the clip; the end card follows */
const SPEECH_END = 27.85;
export const TALK_FRAMES = 30 * FPS;

const CUTAWAYS = [
  {from: 6.0, to: 10.8, kind: 'life'},
  {from: 14.2, to: 18.2, kind: 'pieces'},
  {from: 20.0, to: 24.5, kind: 'meadow'},
] as const;
const DISSOLVE = 8;

const Bill: React.FC = () => {
  const t = useT();
  const volume = keyframes(t, [f(SPEECH_END), f(SPEECH_END) + 8], [1, 0], fmEase.soft);
  // a slow push-in on Bill, never a jump
  const zoom = keyframes(t, [0, f(SPEECH_END)], [1.0, 1.06], fmEase.inOut);
  return (
    <AbsoluteFill style={{scale: String(zoom), transformOrigin: '50% 35%'}}>
      <Video src={staticFile('video/bill-talk.mp4')} volume={volume} objectFit="cover" style={{width: '100%', height: '100%'}} />
    </AbsoluteFill>
  );
};

const Life: React.FC<{start: number}> = ({start}) => (
  <>
    <ReelPaper />
    <InkDrawing name="lake-chairs" start={start - 6} duration={75} left={LAKE.left} top={LAKE.top - 120} width={LAKE.width} />
  </>
);

const Pieces: React.FC<{start: number}> = ({start}) => (
  <>
    <ReelPaper />
    {(Object.keys(CLIPS) as (keyof typeof CLIPS)[]).map((k, i) => {
      const c = CLIPS[k];
      return <Clipping key={k} src={c.src} size={c.size} left={c.left} top={c.top + 140} width={c.width} rotate={c.rotate} arrive={start + i * 22} />;
    })}
  </>
);

const Meadow: React.FC<{start: number; end: number}> = ({start, end}) => (
  <>
    <ReelPaper />
    <InkDrawing name="meadow-path" start={start - 6} duration={70} left={MEADOW.left} top={MEADOW.top} width={MEADOW.width} />
    <BrassLine points={FOOTPATH} start={start + 20} duration={Math.max(30, end - start - 40)} width={4} wobble={1.4} seed="talk-path" />
  </>
);

/** Bill's name, small, the first time we see him. */
const NameTag: React.FC = () => {
  const t = useT();
  const o = keyframes(t, [f(0.4), f(0.9), f(4.6), f(5.2)], [0, 1, 1, 0], fmEase.soft);
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 64,
        top: 1150,
        padding: '14px 24px',
        background: 'rgba(243, 237, 225, 0.94)',
        borderRadius: 6,
        opacity: o,
        fontFamily: `${SERIF}, serif`,
        fontSize: 40,
        color: sketch.ink,
      }}
    >
      {reelCopy.close.who}
    </div>
  );
};

const EndCard: React.FC = () => {
  const t = useT();
  const start = f(SPEECH_END) - 4;
  const fade = (d: number) => keyframes(t, [start + d, start + d + 12], [0, 1], fmEase.soft);
  const serif = (size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
    position: 'absolute',
    left: 110,
    fontFamily: `${SERIF}, serif`,
    fontWeight: 500,
    fontSize: size,
    color: sketch.ink,
    whiteSpace: 'nowrap',
    ...extra,
  });
  return (
    <>
      <ReelPaper />
      <div style={{...serif(64, {top: 330}), opacity: fade(0)}}>Bill Badran</div>
      <div style={{...serif(40, {top: 420, fontStyle: 'italic', fontWeight: 400, color: sketch.inkSoft}), opacity: fade(4)}}>
        {reelCopy.close.who.split(' · ')[1]}
      </div>
      <BrassLine points={[[110, 500], [520, 498], [940, 499]]} start={start + 6} duration={18} width={4} wobble={0.8} seed="talk-rule" />
      <div style={{...serif(56, {top: 540}), opacity: fade(10)}}>{reelCopy.close.cta}</div>
      <div style={{position: 'absolute', inset: 0, opacity: fade(14)}}>
        <GuideObject left={118} top={680} width={380} rotate={-2.5} />
      </div>
      <div
        style={{
          ...serif(28, {top: 1250, width: 830, whiteSpace: 'normal', fontWeight: 400, color: sketch.inkSoft, lineHeight: 1.4}),
          opacity: fade(16),
        }}
      >
        {reelCopy.close.disclaimer}
      </div>
    </>
  );
};

export const BillReelTalk: React.FC = () => (
  <ReelStage>
    <ReelPaper />
    <Bill />
    <NameTag />
    {CUTAWAYS.map((c) => {
      const from = f(c.from);
      const to = f(c.to);
      return (
        <Scene key={c.kind} name={`cutaway-${c.kind}`} from={from} to={to} fadeIn={DISSOLVE} fadeOut={DISSOLVE}>
          {c.kind === 'life' && <Life start={from} />}
          {c.kind === 'pieces' && <Pieces start={from} />}
          {c.kind === 'meadow' && <Meadow start={from} end={to} />}
        </Scene>
      );
    })}
    <Scene name="end" from={f(SPEECH_END) - 4} to={TALK_FRAMES} fadeIn={10}>
      <EndCard />
    </Scene>
  </ReelStage>
);
