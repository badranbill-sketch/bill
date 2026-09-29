import React from 'react';
import {AbsoluteFill} from 'remotion';
import {InkDrawing} from '../components/InkDrawing';
import {Paper} from '../components/stage';

// Studio → Checks → InkProof: one drawing drawing itself on the film's paper, to judge the reveal.
export const InkProof: React.FC = () => (
  <AbsoluteFill>
    <Paper />
    <InkDrawing name="lake-chairs" start={10} duration={120} />
  </AbsoluteFill>
);
