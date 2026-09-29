import React from 'react';
import {Camera, useT} from '../components/stage';
import {
  arrow,
  Handwriting,
  HandStyle,
  IllustrationName,
  InkDrawing,
  InkLayer,
  InkStroke,
  loop,
  Pt,
  underline,
} from '../components/sketch';
import {copy} from '../design/copy';
import {ease, lerp, tween} from '../design/motion';
import {sketch} from '../design/palette';
import {at, endOf, FPS, wordAt} from '../timing/timing';

// C1 · blind spots. "Inside, we explore five common blind spots." Five studies along one long sketchbook strip; the
// camera drifts slowly along it and glides on to the next study between lines (m1…m5). Each study is a drawing, a
// small chapter mark (a handwritten numeral in a loose loop: a chapter, never a score) and one handwritten note.
// Only the study being talked about is on the page: the one behind the camera fades as the next one is drawn, so
// no more than two drawings are ever mounted. No brass line in this scene.

// NEW COPY — chapter marks only (the numeral inside each hand-drawn loop). Not a rank, a score or a fraction.
const CHAPTER_MARKS = ['1', '2', '3', '4', '5'] as const;

const b = copy.blindspots;

/** Two lines, broken at the space nearest 45 % of the way in (works for either language of the copy). */
const twoLines = (text: string) => {
  const target = text.length * 0.45;
  let best = -1;
  for (let i = 0; i < text.length; i++) if (text[i] === ' ' && (best < 0 || Math.abs(i - target) < Math.abs(best - target))) best = i;
  return best < 0 ? text : `${text.slice(0, best)}\n${text.slice(best + 1)}`;
};

// ---- the camera -----------------------------------------------------------------------------------------------
// A slow constant drift (it eases down to a crawl on the last study, so the strip settles), plus one smooth glide of
// GLIDE px between consecutive studies. Every study is placed where the camera is at its hold's midpoint, so the
// stations and the camera can never disagree, whatever the narration timing.
const GLIDE = 800;
const DRIFT = 80; // px/s
const DRIFT_END = 26; // px/s on the last study

const cosEase = (u: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, u)))) / 2;
const smoothstep = (u: number) => {
  const x = Math.min(1, Math.max(0, u));
  return x * x * (3 - 2 * x);
};

type Glide = [number, number];

const makeCamera = (from: number, glides: Glide[], settleFrom: number) => {
  const drift = (f: number) => lerp(DRIFT, DRIFT_END, smoothstep((f - settleFrom) / (2.5 * FPS))) / FPS;
  return (t: number) => {
    let x = 0;
    for (let f = from; f < t; f++) x += drift(f);
    for (const [a, z] of glides) x += GLIDE * cosEase((t - a) / Math.max(1, z - a));
    return x;
  };
};

// ---- small pieces ---------------------------------------------------------------------------------------------

/** A chapter mark: a loose pen loop, then the numeral written inside it. */
const ChapterMark: React.FC<{x: number; y: number; n: string; start: number}> = ({x, y, n, start}) => (
  <>
    <InkLayer>
      <InkStroke d={loop(x, y, 29, 26, `bs-mark-${n}`)} start={start} duration={14} width={2.2} color={sketch.ink} />
    </InkLayer>
    <Handwriting text={n} start={start + 9} speed={8} left={x - 40} top={y - 33} width={80} align="center" variant="hand" />
  </>
);

type Note = {
  text: string;
  left: number;
  top: number;
  start: number;
  speed?: number;
  rotate?: number;
  variant?: HandStyle;
  color?: string;
};

type Study = {
  id: string;
  drawing: IllustrationName;
  draw: number;
  duration: number;
  left: number;
  top: number;
  width: number;
  mark: {x: number; y: number; start: number};
  notes: Note[];
  /** Extra pen marks (arrows), in the study's own stage coordinates. */
  strokes?: {d: string; start: number; duration: number}[];
};

/** One study on the strip. Coordinates are the stage as it looks when the camera sits on this study. */
const StudyView: React.FC<{s: Study; n: string; offset: number; out: number}> = ({s, n, offset, out}) => {
  const t = useT();
  if (t < s.draw - 8 || t > out + 20) return null;
  const opacity = tween(t, out, out + 20, 1, 0, ease.soft);
  return (
    <div style={{position: 'absolute', left: offset, top: 0, width: 1920, height: 1080, opacity}}>
      <InkDrawing name={s.drawing} start={s.draw} duration={s.duration} left={s.left} top={s.top} width={s.width} />
      <ChapterMark x={s.mark.x} y={s.mark.y} n={n} start={s.mark.start} />
      {s.notes.map((note, i) => (
        <Handwriting
          key={i}
          text={note.text}
          start={note.start}
          speed={note.speed ?? 16}
          left={note.left}
          top={note.top}
          rotate={note.rotate ?? -1.5}
          variant={note.variant ?? 'hand'}
          color={note.color ?? sketch.ink}
        />
      ))}
      {s.strokes && (
        <InkLayer>
          {s.strokes.map((k, i) => (
            <InkStroke key={i} d={k.d} start={k.start} duration={k.duration} width={2.2} color={sketch.ink} />
          ))}
        </InkLayer>
      )}
    </div>
  );
};

const arrowStrokes = (a: Pt, z: Pt, start: number, bend: number, seed: string) => {
  const {shaft, head} = arrow(a, z, bend, 14, seed);
  return [
    {d: shaft, start, duration: 11},
    {d: head, start: start + 10, duration: 5},
  ];
};

// ---- the scene ------------------------------------------------------------------------------------------------

export const BlindSpots: React.FC<{from: number; to: number}> = ({from}) => {
  const t = useT();

  // Glides from study to study: they start just before a line ends and land about a second into the next line.
  const glides: Glide[] = [
    [at('m1', -1.5), at('m1', 1.2)],
    [endOf('m1', -0.7), at('m2', 1.4)],
    [endOf('m2', -0.7), at('m3', 1.4)],
    [endOf('m3', -0.7), at('m4', 1.4)],
    [endOf('m4', -0.7), at('m5', 1.4)],
  ];
  const camX = makeCamera(from, glides, at('m5', 1.0));
  // Where the camera rests on each station (heading, then m1…m5).
  const focus = [
    Math.round((from + glides[0][0]) / 2),
    ...glides.slice(1).map(([a], i) => Math.round((glides[i][1] + a) / 2)),
    glides[4][1] + 2 * FPS,
  ];
  const offset = focus.map((f) => camX(f));
  // A study fades once the camera is well on its way to the next one; the last one fades as Bill takes over.
  const outs = [...glides.map(([a]) => a + Math.round(0.9 * FPS)), endOf('m5', 0.15)];

  const studies: Study[] = [
    {
      id: 'm1',
      drawing: 'kitchen-table',
      draw: at('m1', -0.75),
      duration: 80,
      left: 230,
      top: 190,
      width: 1120,
      mark: {x: 1352, y: 470, start: at('m1', 0.4)},
      notes: [
        {text: twoLines(b.m1), left: 1396, top: 434, start: wordAt('m1', 'scattered', 's', -0.15), speed: 17, rotate: -2},
      ],
    },
    {
      id: 'm2',
      drawing: 'coin-jar',
      draw: at('m2', -0.6),
      duration: 75,
      left: 470,
      top: 210,
      width: 1000,
      mark: {x: 1052, y: 290, start: at('m2', 0.25)},
      notes: [
        {text: twoLines(b.m2), left: 1096, top: 256, start: at('m2', 0.3), speed: 22, rotate: -1.5},
        {text: b.fees, left: 1100, top: 428, start: at('m2', 2.1), speed: 12, rotate: -4, variant: 'tiny'},
        {text: b.taxes, left: 1212, top: 460, start: at('m2', 2.55), speed: 12, rotate: -2, variant: 'tiny'},
      ],
      // Both arrows come down onto the coins slipping out of the cracked jar.
      strokes: [
        ...arrowStrokes([1114, 474], [1048, 570], at('m2', 2.3), 0.18, 'bs-fees'),
        ...arrowStrokes([1226, 506], [1142, 596], at('m2', 2.75), 0.18, 'bs-taxes'),
      ],
    },
    {
      id: 'm3',
      drawing: 'sailboat-rough',
      draw: at('m3', -0.5),
      duration: 90,
      left: 370,
      top: 104,
      width: 1180,
      mark: {x: 806, y: 796, start: at('m3', 0.9)},
      notes: [{text: b.m3, left: 850, top: 762, start: wordAt('m3', 'fear', 's', -0.2), speed: 16, rotate: -1.5}],
    },
    {
      id: 'm4',
      drawing: 'home',
      draw: at('m4', -0.5),
      duration: 85,
      left: 350,
      top: 250,
      width: 1060,
      mark: {x: 1060, y: 296, start: at('m4', 0.3)},
      notes: [
        {text: twoLines(b.m4), left: 1104, top: 262, start: at('m4', 0.45), speed: 24, rotate: -1.5},
        {
          text: b.m4lines.join('\n'),
          left: 1350,
          top: 398,
          start: at('m4', 1.45),
          speed: 26,
          rotate: 1.5,
          variant: 'note',
          color: sketch.inkSoft,
        },
      ],
    },
    {
      id: 'm5',
      drawing: 'keys-document',
      draw: at('m5', -0.5),
      duration: 85,
      left: 390,
      top: 296,
      width: 1150,
      mark: {x: 574, y: 302, start: at('m5', 1.0)},
      notes: [{text: b.m5, left: 620, top: 268, start: wordAt('m5', 'advice', 's', -0.3), speed: 16, rotate: -1.5}],
    },
  ];

  // The heading opens the strip.
  const headStart = wordAt('inside', 'five', 's', -0.4);
  const headOut = outs[0];
  const headOpacity = tween(t, headOut, headOut + 20, 1, 0, ease.soft);

  return (
    <Camera x={960 + camX(t)} y={540} zoom={1}>
      {t <= headOut + 20 && (
        <div style={{position: 'absolute', left: offset[0], top: 0, width: 1920, height: 1080, opacity: headOpacity}}>
          <Handwriting text={b.heading} start={headStart} speed={14} left={712} top={446} variant="handLarge" rotate={-1.5} />
          <InkLayer>
            <InkStroke d={underline(718, 550, 470, 'bs-head')} start={headStart + 38} duration={14} width={2.4} />
          </InkLayer>
        </div>
      )}
      {studies.map((s, i) => (
        <StudyView key={s.id} s={s} n={CHAPTER_MARKS[i]} offset={offset[i + 1]} out={outs[i + 1]} />
      ))}
    </Camera>
  );
};
