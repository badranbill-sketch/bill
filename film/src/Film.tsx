import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {Paper, Scene, Stage} from './components/stage';
import {SCENES, SceneId} from './timing/scenes';
import {IntroBill} from './scenes/IntroBill';
import {LifeGoals} from './scenes/LifeGoals';
import {Credibility} from './scenes/Credibility';
import {Pieces} from './scenes/Pieces';
import {GuideReveal} from './scenes/GuideReveal';
import {BlindSpots} from './scenes/BlindSpots';
import {SimpleGuide} from './scenes/SimpleGuide';
import {Approach} from './scenes/Approach';
import {Plan} from './scenes/Plan';
import {EndCard, Invite, Role} from './scenes/Closing';
import {Soundtrack} from './audio/Soundtrack';
import {CaptionTrack} from './components/CaptionTrack';

export type FilmProps = {captions: boolean};

const COMPONENTS: Partial<Record<SceneId, React.FC<{from: number; to: number}>>> = {
  intro: IntroBill,
  life: LifeGoals,
  credibility: Credibility,
  pieces: Pieces,
  guide: GuideReveal,
  blindspots: BlindSpots,
  simple: SimpleGuide,
  approach: Approach,
  plan: Plan,
  role: Role,
  invite: Invite,
  end: EndCard,
};

/** The master film: one sketchbook page, and the scenes on one absolute timeline derived from the narration
 *  (src/timing/scenes.ts). */
export const Film: React.FC<FilmProps> = ({captions}) => {
  return (
    <AbsoluteFill>
      <Soundtrack />
      <Stage>
        <Paper />
        {(Object.keys(SCENES) as SceneId[]).map((id) => {
          const C = COMPONENTS[id];
          const {from, to, fadeIn, fadeOut} = SCENES[id];
          return C ? (
            <Scene key={id} name={id} from={from} to={to} fadeIn={fadeIn} fadeOut={fadeOut}>
              <C from={from} to={to} />
            </Scene>
          ) : null;
        })}
      </Stage>
      {captions && <CaptionTrack />}
    </AbsoluteFill>
  );
};

/** One scene on its own timeline, for previewing in the Studio. */
export const ScenePreview: React.FC<{scene: SceneId}> = ({scene}) => (
  <Sequence from={-SCENES[scene].from} layout="none">
    <Film captions={false} />
  </Sequence>
);
