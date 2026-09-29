import React from 'react';
import {BrassLine, Handwriting, InkDrawing, Pt} from '../components/sketch';
import {Camera, useT} from '../components/stage';
import {sketch} from '../design/palette';
import {copy} from '../design/copy';
import {ease, tween} from '../design/motion';
import {at, wordAt} from '../timing/timing';

// A2 · life. "Your life." is written in the corner of a fresh page and the brass line underlines it, then drifts on a
// little, as if it wanted to go somewhere. One small scene per line, scattered like fragments of a real life: the trip,
// the grandkids, time to paint. They are not connected: no line between them yet.

const TITLE = {left: 176, top: 136};

// Under "Your life.", then on a little into the empty paper.
const BRASS: Pt[] = [
  [170, 262],
  [400, 259],
  [610, 255],
  [740, 256],
  [850, 270],
  [930, 296],
];

type Fragment = {
  name: 'cafe-map' | 'grandparents' | 'easel-garden';
  line: string;
  left: number;
  top: number;
  width: number;
  note: {text: string; left: number; top: number; rotate: number; cue: number};
};

export const LifeGoals: React.FC<{from: number; to: number}> = ({from, to}) => {
  const t = useT();
  // A slow push-in of a few percent across the whole page.
  const zoom = tween(t, from, to, 1, 1.025, ease.inOut);
  const titleAt = wordAt('your-life', 'Your', 's', -0.15);
  const lineAt = wordAt('your-life', 'life', 'e', -0.2);

  const fragments: Fragment[] = [
    {
      name: 'cafe-map',
      line: 'retirement',
      left: 990,
      top: 52,
      width: 800,
      note: {text: copy.life.retirement, left: 1086, top: 508, rotate: -1.8, cue: at('retirement', 0.5)},
    },
    {
      name: 'grandparents',
      line: 'people',
      left: 112,
      top: 370,
      width: 770,
      note: {text: copy.life.people, left: 258, top: 800, rotate: 1.4, cue: at('people', 0.45)},
    },
    {
      name: 'easel-garden',
      line: 'freedom',
      left: 1120,
      top: 566,
      width: 690,
      note: {text: copy.life.freedom, left: 896, top: 810, rotate: -1.4, cue: at('freedom', 0.6)},
    },
  ];

  return (
    <Camera x={960} y={540} zoom={zoom}>
      <Handwriting text={copy.life.title} start={titleAt} speed={13} variant="serifLarge" {...TITLE} />
      <BrassLine points={BRASS} start={lineAt} duration={54} width={3.4} seed="brass-life" />
      {fragments.map((f) => {
        const start = at(f.line, -0.5);
        if (t < start) return null;
        return (
          <React.Fragment key={f.name}>
            <InkDrawing name={f.name} start={start} duration={76} left={f.left} top={f.top} width={f.width} />
            <Handwriting
              text={f.note.text}
              start={f.note.cue}
              speed={17}
              variant="note"
              color={sketch.ink}
              left={f.note.left}
              top={f.note.top}
              rotate={f.note.rotate}
            />
          </React.Fragment>
        );
      })}
    </Camera>
  );
};
