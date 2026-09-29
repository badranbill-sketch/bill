import React from 'react';
import {useT} from '../components/stage';
import {BillPrint, BrassLine, Clipping, Handwriting, InkDrawing, InkLayer, InkStroke, Pt, strike} from '../components/sketch';
import {copy} from '../design/copy';
import {ease, tween} from '../design/motion';
import {sketch} from '../design/palette';
import {at, endOf, wordAt} from '../timing/timing';

// C2 · simple. "They're easy mistakes to make… So I've kept this guide simple." Bill's print (slot "mistakes") on the
// left while he speaks; real clippings from the guide are taped in on the right, one per line, and "jargon" is written
// and struck out. The page clears for the guide's five questions, then clears again to a blank
// notebook drawing itself: "You just need an honest starting point." — "start here" is written on its empty page and
// the brass line touches down once, under it. The notebook stays left of x ≈ 1160, clear of Bill's print in the
// approach scene (x 1140–1700), which dissolves in over the last half second.

const s = copy.simple;

const GUIDE = {
  story: {src: 'guide/story.png', size: {w: 3109, h: 535}},
  question: {src: 'guide/question.png', size: {w: 3109, h: 495}},
  // the guide's own five questions (p. 13), cropped above its "Comptez vos oui" scoring box, which is never shown
  checklist: {src: 'guide/questions.png', size: {w: 3109, h: 1778}},
} as const;

/** A group that stays on the page, then fades away over `dur` frames from `out` (and unmounts). */
const Fade: React.FC<{out: number; dur?: number; children: React.ReactNode}> = ({out, dur = 20, children}) => {
  const t = useT();
  if (t > out + dur) return null;
  return <div style={{position: 'absolute', inset: 0, opacity: tween(t, out, out + dur, 1, 0, ease.soft)}}>{children}</div>;
};

/** Mount children only from `from` on (a print that has not landed yet costs nothing). */
const After: React.FC<{from: number; children: React.ReactNode}> = ({from, children}) => {
  const t = useT();
  return t < from ? null : <>{children}</>;
};

// ---- the notebook and its blank left page ---------------------------------------------------------------------
// notebook.full.png is 1400 × 787. Its left page, in the drawing's pixels: top-left corner (205, 405), the top edge
// runs towards the spiral (532, 290), the left edge down to (390, 760). Text laid on the page follows those two edges
// (with a little foreshortening), so "start here" reads as written on the paper in the drawing.
const NOTEBOOK = {left: 130, top: 220, width: 1100};
const K = NOTEBOOK.width / 1400;
const PAGE_ORIGIN: Pt = [205, 405];
const U: Pt = [0.9434, -0.3318]; // along the page's top edge
const V: Pt = [0.4621, 0.8868]; // along its left edge
const FORESHORTEN = 0.8;
const pagePoint = (u: number, v: number): Pt => [
  NOTEBOOK.left + K * (PAGE_ORIGIN[0] + u * U[0] + v * V[0]),
  NOTEBOOK.top + K * (PAGE_ORIGIN[1] + u * U[1] + v * V[1]),
];
/** Where the note starts on the page (stage px), and the page plane as a CSS matrix. */
const NOTE_AT = pagePoint(46, 112);
const M = {a: U[0], b: U[1], c: V[0] * FORESHORTEN, d: V[1] * FORESHORTEN};
/** A point in the note's own coordinates (px along the line, px down) → stage px. */
const onPage = (x: number, y: number): Pt => [NOTE_AT[0] + x * M.a + y * M.c, NOTE_AT[1] + x * M.b + y * M.d];

export const SimpleGuide: React.FC<{from: number; to: number}> = ({from}) => {
  // Beats, all from the narration.
  const collageOut = endOf('jargon', 0.25); // Bill and the clippings clear for the checklist
  const storyIn = at('examples', -0.3);
  const questionIn = at('questions', -0.3);
  const jargonAt = at('jargon', 0.1);
  const strikeAt = wordAt('jargon', 'jargon', 's', 0.05);
  const checklistIn = at('five-q', 0.15);
  const checklistOut = at('perfect', -0.4);
  const notebookAt = at('perfect', -0.1);
  const startAt = wordAt('honest', 'honest', 's', -0.2);
  const brassAt = wordAt('honest', 'starting', 's', 0);

  return (
    <>
      {/* Bill, and the guide's pages taped in beside him */}
      <Fade out={collageOut}>
        <BillPrint slot="mistakes" from={from} to={collageOut + 20} left={236} top={150} width={580} height={720} rotate={-1.6} arrive={from} />

        <After from={storyIn - 1}>
          <Clipping src={GUIDE.story.src} size={GUIDE.story.size} left={940} top={176} width={860} rotate={-1.2} arrive={storyIn} />
          <Handwriting text={s.examples} start={at('examples', 0.15)} speed={18} left={1316} top={348} rotate={1.8} variant="hand" />
        </After>

        <After from={questionIn - 1}>
          <Clipping src={GUIDE.question.src} size={GUIDE.question.size} left={978} top={462} width={820} rotate={1.3} arrive={questionIn} />
          <Handwriting
            text={s.questions}
            start={wordAt('questions', 'practical', 's', -0.05)}
            speed={18}
            left={1000}
            top={616}
            rotate={-1.6}
            variant="hand"
          />
        </After>

        <Handwriting text={s.jargon} start={jargonAt} speed={12} left={1404} top={694} rotate={-2} variant="handLarge" />
        <InkLayer>
          <InkStroke d={strike(1408, 748, 196, 'simple-jargon')} start={strikeAt} duration={10} width={3} color={sketch.ink} />
        </InkLayer>
      </Fade>

      {/* "And at the end, five questions…" */}
      <After from={checklistIn - 1}>
        <Fade out={checklistOut}>
          <Clipping src={GUIDE.checklist.src} size={GUIDE.checklist.size} left={480} top={296} width={960} rotate={-1} arrive={checklistIn} />
          <Handwriting text={s.five} start={wordAt('five-q', 'five', 's', -0.1)} speed={16} left={512} top={190} rotate={-2.5} variant="hand" />
        </Fade>
      </After>

      {/* "You don't need perfect answers." A blank notebook; then "start here" and the brass line's one small touch. */}
      <After from={notebookAt - 8}>
        <InkDrawing name="notebook" start={notebookAt} duration={90} left={NOTEBOOK.left} top={NOTEBOOK.top} width={NOTEBOOK.width} />
        <div
          style={{
            position: 'absolute',
            left: NOTE_AT[0],
            top: NOTE_AT[1],
            transformOrigin: '0 0',
            transform: `matrix(${M.a}, ${M.b}, ${M.c}, ${M.d}, 0, 0)`,
          }}
        >
          <Handwriting text={s.start} start={startAt} speed={14} left={0} top={0} variant="hand" />
        </div>
        <BrassLine points={[onPage(-4, 66), onPage(96, 63), onPage(194, 59)]} start={brassAt} duration={18} width={3.2} wobble={1.2} seed="simple-start" />
      </After>
    </>
  );
};
