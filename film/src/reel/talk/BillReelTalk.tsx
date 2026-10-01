import React from 'react';
import {Video} from '@remotion/media';
import {AbsoluteFill, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {BrassLine, GuideObject} from '../../components/sketch';
import {useT} from '../../components/stage';
import {sketch} from '../../design/palette';
import {SERIF} from '../../design/typography';
import {reelCopy} from '../copy';
import {fmEase, keyframes, poseStyle, presence, SPRING, staggerAt} from '../motion';
import {ReelPaper, ReelStage} from '../stage';
import {f, SEGMENTS, SPEECH_END, TALK_FRAMES} from './edit';
import {Explainer} from './Explainer';
import {WordCaptions} from './WordCaptions';

export {TALK_FRAMES};

// The talking-head Reel, edited the way short-form talking heads are cut: Bill on camera in the top of the frame,
// his words as word-by-word captions on the seam, and an explainer drawn under him as he speaks. The take is
// tightened with jump cuts (the retake and the chatter at the end are gone, see src/data/talk-transcript.json) and
// every cut lands on a different framing (a punch-in), so it reads as an edit, not a glitch. At the end the paper
// rises over him and becomes the end card.

const SEAM = 900; // where Bill's picture meets the explainer's paper
/** Framing of each kept part: punched in on the strong lines (« reprendre… au complet », « presque plus rien »). */
const PUNCH = [1.0, 1.13, 1.0, 1.16];

const BillTake: React.FC<{i: number}> = ({i}) => {
  const seg = SEGMENTS[i];
  const frame = useCurrentFrame(); // within the segment
  const len = f(seg.len);
  const drift = keyframes(frame, [0, len], [0, 0.025], fmEase.linear);
  // a few frames of fade on the sound at each cut, so a jump cut never clicks
  const volume = (fr: number) => Math.min(1, fr / 3, (len - fr) / 3);
  return (
    <AbsoluteFill style={{scale: String(PUNCH[i] + drift), transformOrigin: '540px 430px'}}>
      <Video
        src={staticFile('video/bill-talk.mp4')}
        trimBefore={f(seg.a)}
        trimAfter={f(seg.b)}
        volume={volume}
        objectFit="cover"
        style={{position: 'absolute', left: 0, top: -380, width: 1080, height: 1920}}
      />
    </AbsoluteFill>
  );
};

const Bill: React.FC = () => (
  <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: SEAM, overflow: 'hidden', background: '#ddd'}}>
    {SEGMENTS.map((s) => (
      <Sequence key={s.i} from={f(s.at)} durationInFrames={f(s.at + s.len) - f(s.at)} layout="none">
        <BillTake i={s.i} />
      </Sequence>
    ))}
    {/* a soft shadow where the paper meets the picture */}
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 40, background: 'linear-gradient(rgba(0,0,0,0), rgba(30,42,62,0.18))'}} />
  </div>
);

const CARD = {hidden: {opacity: 0, y: 16}, visible: {opacity: 1, y: 0}} as const;

const EndCard: React.FC<{start: number}> = ({start}) => {
  const t = useT();
  const card = (i: number) =>
    poseStyle(
      presence(t, {enter: staggerAt(start, i, 5, 0.18), initial: CARD.hidden, animate: CARD.visible, enterWith: {type: 'spring', ...SPRING.settle}})
        .pose,
    );
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
  const [name, role] = reelCopy.close.who.split(' · ');
  return (
    <>
      <div style={{...serif(72, {top: 320}), ...card(0)}}>{name}</div>
      <div style={{...serif(42, {top: 418, fontStyle: 'italic', fontWeight: 400, color: sketch.inkSoft}), ...card(1)}}>{role}</div>
      <BrassLine points={[[110, 500], [520, 498], [940, 499]]} start={start + 6} duration={18} width={4} wobble={0.8} seed="talk-rule" />
      <div style={{...serif(60, {top: 540}), ...card(2)}}>{reelCopy.close.cta}</div>
      <div style={{position: 'absolute', inset: 0, ...card(3)}}>
        <GuideObject left={118} top={690} width={380} rotate={-2.5} />
      </div>
      <div style={{...serif(28, {top: 1250, width: 830, whiteSpace: 'normal', fontWeight: 400, color: sketch.inkSoft, lineHeight: 1.4}), ...card(4)}}>
        {reelCopy.close.disclaimer}
      </div>
    </>
  );
};

export const BillReelTalk: React.FC = () => {
  const t = useT();
  const end = f(SPEECH_END);
  // the paper rises over Bill, then the end card lands on it
  const rise = keyframes(t, [end - 6, end + 12], [SEAM, 0], fmEase.inOut);
  const explainerOut = keyframes(t, [end - 8, end + 2], [1, 0], fmEase.soft);
  return (
    <ReelStage>
      <ReelPaper />
      <Bill />
      <Explainer opacity={explainerOut} />
      {t < end + 2 && <WordCaptions centerY={SEAM} left={64} width={896} />}
      {t >= end - 6 && (
        <div style={{position: 'absolute', left: 0, top: rise, width: 1080, height: 1920, overflow: 'hidden', boxShadow: '0 -12px 30px rgba(30,42,62,0.18)'}}>
          <div style={{position: 'absolute', left: 0, top: -rise, width: 1080, height: 1920}}>
            <ReelPaper />
            <EndCard start={end + 10} />
          </div>
        </div>
      )}
    </ReelStage>
  );
};

