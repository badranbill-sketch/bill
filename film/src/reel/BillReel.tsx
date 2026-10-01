import React from 'react';
import {Audio} from '@remotion/media';
import {getStaticFiles, staticFile} from 'remotion';
import {CaptionTrack} from '../components/CaptionTrack';
import {Scene, useT} from '../components/stage';
import {sketch} from '../design/palette';
import {Close} from './beats/Close';
import {Guide} from './beats/Guide';
import {Hook, hookUnderline} from './beats/Hook';
import {Life} from './beats/Life';
import {Meadow, meadowFade} from './beats/Meadow';
import {Pieces} from './beats/Pieces';
import {CAMERA, FOOTPATH, REACH_STOP, REST_LENGTH, THREAD_A, THREAD_A_MARKS} from './layout';
import {fmEase, keyframes} from './motion';
import {BEATS, BeatId} from './scenes';
import {CAPTION, ReelCamera, ReelPaper, ReelStage} from './stage';
import {Thread, threadPath} from './Thread';
import {at, endOf, timing, wordAt} from './timing';

// « Guide de la prospérité financière » — a 30-second vertical Instagram Reel (1080 × 1920, 30 fps) in the film's
// sketchbook style: one ivory page drawn once under everything, navy ink, and one brass line that carries the eye from
// beat to beat. Beats: hook → life → pieces → guide (Bill) → close and end card. All timing comes from
// src/data/reel-timing.json (hand-authored until Bill records script/reel.json), never from hard-coded frames.

const COMPONENTS: Record<BeatId, React.FC> = {
  hook: Hook,
  life: Life,
  pieces: Pieces,
  guide: Guide,
  meadow: Meadow,
  close: Close,
};
const UNDER_CAMERA: BeatId[] = ['hook', 'life', 'pieces', 'meadow'];
const ON_SCREEN: BeatId[] = ['guide', 'close'];

const beat = (id: BeatId) => {
  const C = COMPONENTS[id];
  const b = BEATS[id];
  return (
    <Scene key={id} name={id} from={b.from} to={b.to} fadeIn={b.fadeIn} fadeOut={b.fadeOut}>
      <C />
    </Scene>
  );
};

// ---- the brass line --------------------------------------------------------------------------------------------------
const A = threadPath(THREAD_A, 1.8, 'reel-thread-a');
const B = threadPath(FOOTPATH, 1.4, 'reel-thread-b');
const markA = {
  underline: A.at(THREAD_A_MARKS.underlineEnd),
  shoreIn: A.at(THREAD_A_MARKS.shoreStart),
  shoreEnd: A.at(THREAD_A_MARKS.shoreEnd),
  farEnd: A.at(THREAD_A_MARKS.farEnd),
  rest: A.length,
};
const reach = B.at(REACH_STOP);

/**
 * Line A: the underline under « votre vie » → off the page on the right → back in along the lake's near shore, past the
 * couple, and on along the far shore → off on the left → back in low, to where the meadow's footpath will begin.
 * Line B carries on from there without a break: it turns up the footpath a little and rests while the pieces land,
 * climbs toward them on the question and stops short, then walks the rest of the path through the meadow.
 */
const BrassThread: React.FC = () => {
  const u = hookUnderline();
  const away = at('retraite', -0.3); // the hook gives way: the line runs on
  const back = at('retraite', 0.55); // …and is back on the page, at the right-hand end of the shore
  const shoreDone = endOf('gens', 0.1);
  const leave = endOf('gens', 1.2); // the lake gives way to the pieces
  const rests = at('morceaux', 0.9);
  const climb = wordAt('emboite', 'Mais', 's', 0.05);
  const stop = endOf('emboite', -0.1);
  const walk = wordAt('parfaites', 'Vous', 's', 0);
  const arrive = endOf('parfaites', 0.1);
  const fade = meadowFade();
  return (
    <>
      <Thread
        path={A}
        head={{
          frames: [u.start, u.end, away, back, shoreDone, leave, rests],
          values: [0, markA.underline, markA.underline, markA.shoreIn, markA.shoreEnd, markA.shoreEnd, markA.rest],
          ease: [fmEase.draw, fmEase.linear, fmEase.inOut, fmEase.inOut, fmEase.linear, fmEase.inOut],
        }}
        tail={{
          frames: [away, back, back + 10, leave, rests + 10],
          values: [0, markA.underline, markA.shoreIn, markA.shoreIn, markA.rest],
          ease: [fmEase.inOut, fmEase.inOut, fmEase.linear, fmEase.inOut],
        }}
      />
      <Thread
        path={B}
        width={4}
        head={{
          frames: [rests - 2, rests + 12, climb, stop, walk, arrive],
          values: [0, REST_LENGTH, REST_LENGTH, reach, reach, B.length],
          ease: [fmEase.out, fmEase.linear, fmEase.draw, fmEase.linear, fmEase.draw],
        }}
        opacity={{frames: [fade.from, fade.to], values: [1, 0], ease: fmEase.soft}}
      />
    </>
  );
};

/** One slow push-in for the whole page (4 % over the reel), easing in and out. */
const Camera: React.FC<{children: React.ReactNode}> = ({children}) => {
  const t = useT();
  const zoom = keyframes(t, [0, endOf('depart', 0.4)], [1, CAMERA.zoom], fmEase.inOut);
  return (
    <ReelCamera zoom={zoom} anchor={CAMERA.anchor}>
      {children}
    </ReelCamera>
  );
};

const hasNarration = () => getStaticFiles().some((f) => f.name === timing.audio);

export const BillReel: React.FC = () => (
  <ReelStage>
    <ReelPaper />
    {/* Bill's recorded narration, once `npm run voice:reel` has made it (no other sound: the music and effects of the
        film come from a non-commercial licence) */}
    {hasNarration() && <Audio src={staticFile(timing.audio)} />}
    <Camera>
      {UNDER_CAMERA.map(beat)}
      <BrassThread />
    </Camera>
    {ON_SCREEN.map(beat)}
    <CaptionTrack
      src="captions/reel.srt"
      area={{
        left: CAPTION.left,
        width: CAPTION.width,
        top: 0,
        bottom: 'auto',
        height: CAPTION.bottom - 10,
        paddingBottom: 0,
      }}
      box={{
        maxWidth: CAPTION.width,
        padding: '14px 28px 16px',
        borderRadius: 14,
        background: 'rgba(30, 42, 62, 0.9)',
        color: sketch.printBorder,
        fontSize: 58,
        lineHeight: 1.22,
      }}
    />
  </ReelStage>
);
