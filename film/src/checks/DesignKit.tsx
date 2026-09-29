import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Paper} from '../components/stage';
import {sketch} from '../design/palette';
import {
  arrow,
  BillPrint,
  BrassLine,
  Clipping,
  GuideObject,
  Handwriting,
  InkDrawing,
  InkLayer,
  InkStroke,
  loop,
  strike,
  tick,
  underline,
} from '../components/sketch';

// Studio → Checks → DesignKit: every sketchbook component on one page, to check them together.
export const DesignKit: React.FC = () => {
  const a = arrow([700, 300], [820, 380]);
  return (
    <AbsoluteFill>
      <Paper />
      <BillPrint slot="intro" from={0} to={150} left={1180} top={120} width={560} height={700} rotate={-1.4} arrive={4} />
      <Handwriting text="Bill Badran" start={20} left={160} top={150} variant="handLarge" />
      <Handwriting text={'Financial Planner\nsince 2009'} start={40} left={164} top={250} variant="note" color={sketch.inkSoft} />
      <InkDrawing name="cafe-map" start={10} duration={60} left={120} top={420} width={620} />
      <Clipping src="guide/question.png" size={{w: 3109, h: 495}} left={760} top={860} width={520} rotate={1.5} arrive={30} />
      <GuideObject left={820} top={420} width={300} rotate={4} arrive={36} />
      <InkLayer>
        <InkStroke d={underline(160, 236, 360)} start={50} duration={14} />
        <InkStroke d={tick(560, 170, 40)} start={60} duration={10} />
        <InkStroke d={loop(1000, 250, 150, 60, 'k')} start={64} duration={20} />
        <InkStroke d={strike(900, 250, 200)} start={80} duration={10} />
        <InkStroke d={a.shaft} start={84} duration={12} />
        <InkStroke d={a.head} start={95} duration={6} />
      </InkLayer>
      <Handwriting text="jargon" start={70} left={905} top={218} variant="hand" />
      <BrassLine points={[[120, 1000], [600, 960], [1100, 1010], [1800, 960]]} start={60} duration={60} until={0.8} />
    </AbsoluteFill>
  );
};
