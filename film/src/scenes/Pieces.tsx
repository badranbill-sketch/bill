import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Camera, useT} from '../components/stage';
import {BrassLine, Handwriting, IllustrationName, InkDrawing, InkLayer, InkStroke, Pt, tick} from '../components/sketch';
import {copy} from '../design/copy';
import {ease, tween} from '../design/motion';
import {at, wordAt} from '../timing/timing';

// B1 · pieces — "People work hard. / They save. / They try to make good decisions. / But often, their financial lives
// have grown one piece at a time. / A retirement account here. / An insurance policy there. / A will that hasn't been
// reviewed in years. / Each piece may make sense on its own. / But who's looking at how they all fit together?"
//
// The film's low point, told calmly. First a couple at the kitchen table at night draws itself, with three
// handwritten notes beside it. On "one piece at a time" the page clears, and the pieces arrive one by one, each on its
// own patch of paper, a little askew: the statement, the policy, the will, each with its tag. A small tick by each.
// On "who's looking at how they all fit together?" the brass line leaves the first piece, reaches toward the others
// and stops short — it never touches them. The question is written apart, in the empty corner.

// ---- part 1: the kitchen table ---------------------------------------------------------------------------------------
const COUPLE = {left: 176, top: 150, width: 1240};
const LIST = {left: 1334, top: 356, step: 92};

// ---- part 2: the pieces ------------------------------------------------------------------------------------------------
type Piece = {
  name: IllustrationName;
  left: number;
  top: number;
  width: number;
  rotate: number;
  tag: string;
  tagAt: {left: number; top: number; rotate: number};
  tickAt: Pt;
};

const PIECES: Piece[] = [
  {
    name: 'statement',
    left: 110,
    top: 120,
    width: 720,
    rotate: -2.5,
    tag: copy.pieces.account,
    tagAt: {left: 232, top: 538, rotate: -2},
    tickAt: [610, 552],
  },
  {
    name: 'policy',
    left: 1160,
    top: 80,
    width: 640,
    rotate: 3,
    tag: copy.pieces.policy,
    tagAt: {left: 1254, top: 530, rotate: 2},
    tickAt: [1588, 556],
  },
  {
    name: 'will-folder',
    left: 650,
    top: 400,
    width: 680,
    rotate: -1.2,
    tag: copy.pieces.will,
    tagAt: {left: 1300, top: 742, rotate: -1.5},
    tickAt: [1716, 746],
  },
];

/** The reach: from the statement's envelope toward the policy. `until` keeps it well short of anything. */
const REACH: Pt[] = [
  [754, 338],
  [866, 320],
  [975, 311],
  [1082, 318],
  [1198, 340],
];
const REACH_UNTIL = 0.6;

const QUESTION = {left: 132, top: 786, rotate: -2};

/** A camera that pushes in slowly while keeping `anchor` still on screen. */
const pushIn = (anchor: {x: number; y: number}, zoom: number) => ({
  x: anchor.x - (anchor.x - 960) / zoom,
  y: anchor.y - (anchor.y - 540) / zoom,
  zoom,
});

export const Pieces: React.FC<{from: number; to: number}> = ({from, to}) => {
  const t = useT();

  // ---- beats (all from the narration) ----------------------------------------------------------------------------
  const tCouple = at('work', -0.35);
  const notes = [
    {text: copy.pieces.work, start: wordAt('work', 'work', 's', -0.1), dx: 0, rotate: -2},
    {text: copy.pieces.save, start: wordAt('save', 'save', 's', -0.1), dx: 26, rotate: 1.5},
    {text: copy.pieces.decide, start: wordAt('decisions', 'try', 's', -0.05), dx: -8, rotate: -1},
  ];
  const tClear = wordAt('piece', 'grown', 's', 0); // "…have grown one piece at a time": the page clears
  const clearFrames = 20;
  const pieceStarts = [
    wordAt('piece', 'piece', 's', -0.1), // the statement starts as "piece" is said, lands on "A retirement account here"
    at('policy', -0.9),
    at('will', -0.7),
  ];
  const tagStarts = [
    wordAt('account', 'retirement', 's', 0),
    wordAt('policy', 'insurance', 's', 0),
    wordAt('will', 'will', 's', 0.1),
  ];
  const tickStarts = [wordAt('sense', 'each', 's', 0.05), wordAt('sense', 'may', 's', 0), wordAt('sense', 'sense', 's', 0)];
  const tReach = wordAt('who', "who's", 's', -0.1);
  const reachFrames = Math.max(45, wordAt('who', 'together', 'e', 0.1) - tReach);
  const tQuestion = wordAt('who', 'fit', 's', 0);

  // ---- part 1 -------------------------------------------------------------------------------------------------------
  const part1 = tween(t, tClear, tClear + clearFrames, 1, 0, ease.soft);
  const cam1 = pushIn({x: 780, y: 480}, tween(t, from, tClear + clearFrames, 1, 1.03, ease.soft));

  // ---- part 2 -------------------------------------------------------------------------------------------------------
  const cam2 = pushIn({x: 960, y: 430}, tween(t, pieceStarts[0], to, 1, 1.025, ease.soft));

  return (
    <AbsoluteFill>
      {part1 > 0 && (
        <AbsoluteFill style={{opacity: part1}}>
          <Camera x={cam1.x} y={cam1.y} zoom={cam1.zoom}>
            <InkDrawing name="couple-talking" start={tCouple} duration={100} left={COUPLE.left} top={COUPLE.top} width={COUPLE.width} />
            {notes.map((n, i) => (
              <Handwriting
                key={n.text}
                text={n.text}
                start={n.start}
                speed={15}
                left={LIST.left + n.dx}
                top={LIST.top + i * LIST.step}
                variant="hand"
                rotate={n.rotate}
              />
            ))}
          </Camera>
        </AbsoluteFill>
      )}

      {t >= tClear && (
        <Camera x={cam2.x} y={cam2.y} zoom={cam2.zoom}>
          {PIECES.map((p, i) => (
            <InkDrawing
              key={p.name}
              name={p.name}
              start={pieceStarts[i]}
              duration={i === 2 ? 84 : 80}
              left={p.left}
              top={p.top}
              width={p.width}
              style={{rotate: `${p.rotate}deg`}}
            />
          ))}
          {PIECES.map((p, i) => (
            <Handwriting
              key={p.tag}
              text={p.tag}
              start={tagStarts[i]}
              speed={18}
              left={p.tagAt.left}
              top={p.tagAt.top}
              variant="note"
              rotate={p.tagAt.rotate}
            />
          ))}
          <InkLayer>
            {PIECES.map((p, i) => (
              <InkStroke key={p.name} d={tick(p.tickAt[0], p.tickAt[1], 30)} start={tickStarts[i]} duration={9} width={2.8} />
            ))}
          </InkLayer>

          {/* who's looking at how they all fit together? — the line reaches, and stops short */}
          <BrassLine points={REACH} start={tReach} duration={reachFrames} until={REACH_UNTIL} seed="pieces-reach" />

          <Handwriting
            text={copy.pieces.who}
            start={tQuestion}
            speed={15}
            left={QUESTION.left}
            top={QUESTION.top}
            variant="hand"
            rotate={QUESTION.rotate}
          />
        </Camera>
      )}
    </AbsoluteFill>
  );
};
