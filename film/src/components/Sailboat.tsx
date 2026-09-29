import React from 'react';
import {FAR_WAVE_OPACITY, palette, SUN_OPACITY} from '../design/palette';
import {wavePath} from '../design/geometry';
import {clamp01} from '../design/motion';

// The guide's cover illustration, with its exact geometry (viewBox 0 0 420 300, from the PDF's vector data).
export const BOAT = {
  viewBox: {w: 420, h: 300},
  sun: {cx: 300, cy: 90, r: 52},
  sailMain: 'M205 40 L205 210 L120 210 Z',
  sailJib: 'M212 62 L212 210 L290 210 Z',
  hull: 'M100 220 L310 220 L280 250 L130 250 Z',
  waterY: 262,
  farWaterY: 284,
};

type Parts = {
  /** 0 → 1 each; lets the illustration assemble itself piece by piece. */
  sun?: number;
  sails?: number;
  hull?: number;
  water?: number;
  /** Seconds, drives the water and the gentle bob. */
  time?: number;
  /** Drift of the whole boat along the water (units of the 420-wide drawing). */
  boatX?: number;
  showSun?: boolean;
  /** The cover paints the sun at 90 % over navy; 1 while it is still the solid gold dot of the line. */
  sunOpacity?: number;
};

/** Parts of the cover illustration, drawn in its own 420 × 300 coordinate space. Render inside an <svg>. */
export const SailboatArt: React.FC<Parts> = ({
  sun = 1,
  sails = 1,
  hull = 1,
  water = 1,
  time = 0,
  boatX = 0,
  showSun = true,
  sunOpacity = SUN_OPACITY,
}) => {
  const bob = Math.sin(time * 1.3) * 2.2;
  const roll = Math.sin(time * 1.3 + 0.6) * 1.1;
  const sailsY = (1 - clamp01(sails)) * 175; // sails rise from the deck
  const hullX = (1 - clamp01(hull)) * -60;
  return (
    <g>
      {showSun && sun > 0 && (
        <circle cx={BOAT.sun.cx} cy={BOAT.sun.cy} r={BOAT.sun.r * clamp01(sun)} fill={palette.gold} opacity={sunOpacity} />
      )}
      <g transform={`translate(${boatX} ${bob}) rotate(${roll} 205 235)`}>
        <clipPath id="deckclip">
          <rect x={0} y={-400} width={420} height={610} />
        </clipPath>
        <g clipPath="url(#deckclip)" opacity={sails > 0 ? 1 : 0}>
          <g transform={`translate(0 ${sailsY})`}>
            <path d={BOAT.sailMain} fill={palette.paper} />
            <path d={BOAT.sailJib} fill={palette.cream} />
          </g>
        </g>
        <g transform={`translate(${hullX} 0)`} opacity={clamp01(hull * 1.6)}>
          <path d={BOAT.hull} fill={palette.coral} />
        </g>
      </g>
      <Water progress={water} time={time} />
    </g>
  );
};

/** The two water lines of the cover, drawn left → right, then slowly moving. */
export const Water: React.FC<{progress: number; time: number; x0?: number; x1?: number}> = ({progress, time, x0 = 0, x1 = 420}) => {
  if (progress <= 0) return null;
  const reveal = x0 + (x1 - x0) * clamp01(progress);
  const id = `water-${x0}-${x1}`;
  return (
    <g>
      <clipPath id={id}>
        <rect x={x0 - 4} y={200} width={reveal - x0 + 8} height={120} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <path
          d={wavePath(x0, x1, BOAT.waterY, 170, 16, time * 22)}
          fill="none"
          stroke={palette.wave}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <path
          d={wavePath(x0 + 20, x1, BOAT.farWaterY, 170, 13, time * 14 + 60)}
          fill="none"
          stroke={palette.wave}
          strokeWidth={3.6}
          strokeLinecap="round"
          opacity={FAR_WAVE_OPACITY}
        />
      </g>
    </g>
  );
};
