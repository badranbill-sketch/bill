import React from 'react';
import { Audio } from '@remotion/media';
import { AbsoluteFill, interpolate, Sequence, staticFile } from 'remotion';
import { MOTION } from './brand';
import { AUDIO, ORDER, SCENES, STARTS, VOICE_WINDOWS, type SceneKey } from './content';
import { loadBrandFonts } from './fonts';
import { Paper, SceneFade } from './primitives/basics';
import { sec } from './primitives/time';
import { S11b, S11c, S11d } from './scenes/Asks';
import { S03, S04 } from './scenes/Audience';
import { S12 } from './scenes/Close';
import { S05 } from './scenes/Identity';
import { JourneyRail, S06, S07, S08, S09, S10, S11 } from './scenes/Journey';
import { S00, S01, S02 } from './scenes/Opening';

loadBrandFonts();

export const SCENE_COMPONENTS: Record<SceneKey, React.FC> = {
  s00: S00, s01: S01, s02: S02, s03: S03, s04: S04, s05: S05, s06: S06, s07: S07,
  s08: S08, s09: S09, s10: S10, s11: S11, s11b: S11b, s11c: S11c, s11d: S11d, s12: S12,
};

/** Music sits 12 dB lower under the voice-over windows, with short ramps. */
const DUCK = Math.pow(10, -12 / 20);
const MUSIC_LEVEL = 0.5;
const musicVolume = (f: number) => {
  const t = f / 30;
  let v = 1;
  for (const [a, b] of VOICE_WINDOWS) {
    const k = interpolate(t, [a - 0.5, a, b, b + 0.6], [1, DUCK, DUCK, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    v = Math.min(v, k);
  }
  return MUSIC_LEVEL * v;
};

/** One scene on its own (used by the per-scene compositions in the Studio). */
export const OneScene: React.FC<{ k: SceneKey }> = ({ k }) => {
  const Comp = SCENE_COMPONENTS[k];
  return (
    <AbsoluteFill>
      <Paper />
      <SceneFade dur={SCENES[k].dur} out={k === 's12' ? MOTION.closeOut : MOTION.sceneOut}>
        <Comp />
      </SceneFade>
    </AbsoluteFill>
  );
};

export const Presentation: React.FC = () => {
  const railFrom = sec(STARTS.s07);
  const railTo = sec(STARTS.s11 + SCENES.s11.dur);
  return (
    <AbsoluteFill>
      <Paper />
      {ORDER.map((k) => {
        const Comp = SCENE_COMPONENTS[k];
        return (
          <Sequence key={k} from={sec(STARTS[k])} durationInFrames={sec(SCENES[k].dur)} name={`${SCENES[k].id} ${SCENES[k].name}`}>
            <SceneFade dur={SCENES[k].dur} out={k === 's12' ? MOTION.closeOut : MOTION.sceneOut}>
              <Comp />
            </SceneFade>
          </Sequence>
        );
      })}
      <Sequence from={railFrom} durationInFrames={railTo - railFrom} name="Journey rail">
        <JourneyRail />
      </Sequence>
      {AUDIO ? (
        <>
          <Audio src={staticFile('audio/voiceover.mp3')} />
          <Audio src={staticFile('audio/music.mp3')} volume={(f) => musicVolume(f)} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};
