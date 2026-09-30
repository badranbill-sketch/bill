import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { C } from '../brand';

/**
 * The warm page (#FAF9F5) with a faint paper grain. It never moves.
 * The grain is the presentation project's grain-1920.png (mid-grey, mean 127.5)
 * blended in overlay mode: on a light page it adds about ±1 level of texture
 * and leaves the page's mean tone at #FAF9F5 (a plain 4% layer greyed it to
 * about #F4F3EF). A very soft warm falloff toward the corners keeps large
 * empty areas from looking flat.
 */
export const Paper: React.FC<{ grain?: number; children?: React.ReactNode }> = ({ grain = 1, children }) => (
  <AbsoluteFill style={{ backgroundColor: C.paper }}>
    <Img src={staticFile('textures/grain-1920.png')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: grain, mixBlendMode: 'overlay' }} />
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse 120% 90% at 50% 45%, rgba(250,249,245,0) 60%, rgba(201,192,177,0.10) 100%)' }} />
    {children}
  </AbsoluteFill>
);
