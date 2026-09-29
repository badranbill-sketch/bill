import React from 'react';
import {Sequence, staticFile} from 'remotion';
import {Audio} from '@remotion/media';
import {timing, TOTAL_FRAMES} from '../timing/timing';
import {bedVolume, BEDS, buildCues, musicVolume, ROOM_TONE} from './cues';

// The mix. Narration is the hero at full level; the score is ducked under it (src/audio/cues.ts); a quiet room tone
// runs under everything, a lake laps under the water drawings, and the foley (pen, pages, prints, a cup) is quiet.
// The final loudness (-16 LUFS for the web) is set after the render by tools/render.mjs.
//   narration  public/<timing.audio>        (tools/voice.py, or Bill's recording)
//   music      public/audio/score.wav       (tools/music.py, or a licensed track with the same name)
//   sound      public/audio/sfx/*.wav       (tools/sfx.py)
const CUES = buildCues();

export const Soundtrack: React.FC = () => (
  <>
    <Audio src={staticFile(timing.audio)} />
    <Audio src={staticFile('audio/score.wav')} volume={(f) => musicVolume(f)} />
    <Audio src={staticFile('audio/sfx/room.wav')} loop volume={() => ROOM_TONE} />
    {BEDS.map((b, i) => (
      <Sequence key={`bed-${i}`} from={b.from} durationInFrames={Math.min(TOTAL_FRAMES, b.to) - b.from} layout="none" name={`bed ${b.sfx}`}>
        <Audio src={staticFile(`audio/sfx/${b.sfx}.wav`)} loop loopVolumeCurveBehavior="extend" volume={(f) => bedVolume(b, f)} />
      </Sequence>
    ))}
    {CUES.map((c, i) => (
      <Sequence key={i} from={c.frame} layout="none" name={`sfx ${c.sfx}`}>
        <Audio src={staticFile(`audio/sfx/${c.sfx}.wav`)} volume={() => c.volume} />
      </Sequence>
    ))}
  </>
);
