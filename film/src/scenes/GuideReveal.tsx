import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Camera, useT} from '../components/stage';
import {
  arrow,
  BrassLine,
  GuideObject,
  Handwriting,
  InkDrawing,
  InkLayer,
  InkStroke,
  Pt,
  writeFrames,
} from '../components/sketch';
import {copy} from '../design/copy';
import {ease, tween} from '../design/motion';
import {sketch} from '../design/palette';
import {endOf, wordAt} from '../timing/timing';

// B2 · guide — "That's why I created The Guide to Financial Prosperity. / To help you see the bigger picture — and
// take a clearer next step."
// The first breath of clarity after the scattered pieces. The real guide is laid on the page (left), with a small
// handwritten note and an arrow. Then the meadow draws itself beside it, and on "a clearer next step" the brass line
// walks up its footpath, from the near end into the distance. One slow push-in; nothing else moves.

/** Where the meadow drawing sits on the stage (1920 × 1079 source → scale MEADOW.width / 1920). */
const MEADOW = {left: 690, top: 134, width: 1170};
const K = MEADOW.width / 1920;
const onMeadow = ([x, y]: Pt): Pt => [MEADOW.left + x * K, MEADOW.top + y * K];

/**
 * The drawn footpath in meadow-path.full.png source pixels, from its near end (bottom of the drawing) to where it
 * narrows and disappears into the grass. Traced by eye on the source at full size, down the middle of the path;
 * extra points on the two bends so the curve does not cut corners.
 */
const FOOTPATH: Pt[] = [
  [868, 1000],
  [848, 955],
  [824, 908],
  [800, 862],
  [776, 818],
  [758, 778],
  [742, 746],
  [735, 718],
  [741, 692],
  [757, 668],
  [776, 648],
  [792, 628],
  [798, 606],
  [792, 588],
  [780, 574],
];
const PATH = FOOTPATH.map(onMeadow);

/** The guide booklet, lying on the left of the page. */
const GUIDE = {left: 176, top: 246, width: 430, rotate: -3};

/** The point the slow push-in keeps still: the middle of the footpath. */
const ANCHOR = {x: 1130, y: 560};
const cameraAt = (zoom: number) => ({
  x: ANCHOR.x - (ANCHOR.x - 960) / zoom,
  y: ANCHOR.y - (ANCHOR.y - 540) / zoom,
  zoom,
});

export const GuideReveal: React.FC<{from: number; to: number}> = ({from, to}) => {
  const t = useT();

  // ---- beats (all from the narration) ----------------------------------------------------------------------------
  const tLand = wordAt('created', 'created', 's', -0.25); // the guide is laid on the page
  const tNote = wordAt('created', 'Guide', 's', 0); // "free guide · in French"
  const noteDone = tNote + writeFrames(copy.guide.note, 16);
  const tArrow = noteDone + 2;
  const tMeadow = endOf('created', -0.35); // the meadow starts to draw a beat before "To help you see…"
  const tBigger = wordAt('help', 'bigger', 's', -0.25);
  const tBrass = wordAt('help', 'take', 's', -0.2); // the line walks the path through "a clearer next step"
  const brassFrames = Math.max(36, wordAt('help', 'step', 'e', 0) - tBrass);
  const tStep = wordAt('help', 'clearer', 's', 0.05);

  const zoom = tween(t, from, to, 1, 1.03, ease.soft);
  const cam = cameraAt(zoom);

  const a = arrow([GUIDE.left + 318, GUIDE.top - 66], [GUIDE.left + 370, GUIDE.top + 4], -0.42, 15, 'guide-arrow');

  return (
    <AbsoluteFill>
      <Camera x={cam.x} y={cam.y} zoom={cam.zoom}>
        {/* the meadow, beside the guide */}
        <InkDrawing name="meadow-path" start={tMeadow} duration={88} left={MEADOW.left} top={MEADOW.top} width={MEADOW.width} />

        {/* the real guide, laid on the page */}
        <GuideObject left={GUIDE.left} top={GUIDE.top} width={GUIDE.width} rotate={GUIDE.rotate} arrive={tLand} />

        <Handwriting
          text={copy.guide.note}
          start={tNote}
          speed={16}
          left={GUIDE.left + 18}
          top={GUIDE.top - 108}
          variant="note"
          color={sketch.inkSoft}
          rotate={-2}
        />
        <InkLayer>
          <InkStroke d={a.shaft} start={tArrow} duration={14} color={sketch.inkSoft} width={2.4} />
          <InkStroke d={a.head} start={tArrow + 13} duration={6} color={sketch.inkSoft} width={2.4} />
        </InkLayer>

        <Handwriting
          text={copy.guide.bigger}
          start={tBigger}
          speed={16}
          left={1446}
          top={150}
          variant="hand"
          rotate={-1.5}
        />

        {/* the clearer next step: the brass line walks the footpath into the distance */}
        <BrassLine points={PATH} start={tBrass} duration={brassFrames} width={3.6} wobble={1.6} seed="meadow-path" />

        <Handwriting
          text={copy.guide.step}
          start={tStep}
          speed={17}
          left={PATH[0][0] + 44}
          top={PATH[0][1] + 26}
          variant="hand"
          rotate={-2}
        />
      </Camera>
    </AbsoluteFill>
  );
};
