import React from 'react';
import {getLength, getPointAtLength} from '@remotion/paths';
import {handPath, Pt} from '../components/sketch';
import {useT} from '../components/stage';
import {sketch} from '../design/palette';
import {Ease, keyframes} from './motion';
import {ReelInk} from './stage';

// The reel's one brass line, as a pen travelling along a path. The film's BrassLine draws a line once; the reel's line
// also moves on: `head` is where the pen is, `tail` where the line still begins (both as lengths along the path,
// keyframed in frames), so it can underline a phrase, leave it behind and become a shoreline or a footpath. Same
// look as BrassLine: the kit's hand-wobbled curve, brass, round ends, a dot at the pen tip while it moves.

export type ThreadPath = {
  d: string;
  length: number;
  /** Length along the path closest to `p` (searching from `after` px on), to key the pen to a feature. */
  at: (p: Pt, after?: number) => number;
};

export const threadPath = (points: Pt[], wobble = 1.8, seed = 'reel-brass'): ThreadPath => {
  const d = handPath(points, wobble, seed);
  const length = getLength(d);
  const samples: [number, number, number][] = [];
  for (let l = 0; l <= length; l += 2) {
    const q = getPointAtLength(d, l);
    if (q) samples.push([l, q.x, q.y]);
  }
  const at = ([x, y]: Pt, after = 0) => {
    let best = after;
    let dist = Infinity;
    for (const [l, sx, sy] of samples) {
      if (l < after) continue;
      const dd = Math.hypot(sx - x, sy - y);
      if (dd < dist) {
        dist = dd;
        best = l;
      }
    }
    return best;
  };
  return {d, length, at};
};

export type Track = {frames: number[]; values: number[]; ease?: Ease | Ease[]};

const value = (t: number, track: Track | undefined, fallback: number) =>
  track ? keyframes(t, track.frames, track.values, track.ease) : fallback;

export const Thread: React.FC<{
  path: ThreadPath;
  head: Track;
  tail?: Track;
  opacity?: Track;
  width?: number;
}> = ({path, head, tail, opacity, width = 4}) => {
  const t = useT();
  const h = Math.min(path.length, Math.max(0, value(t, head, 0)));
  const s = Math.min(h, Math.max(0, value(t, tail, 0)));
  const o = value(t, opacity, 1);
  if (h - s < 0.5 || o <= 0) return null;
  const moving = Math.abs(h - Math.min(path.length, Math.max(0, value(t - 1, head, 0)))) > 0.3;
  const tip = moving ? getPointAtLength(path.d, h) : null;
  return (
    <ReelInk>
      <g opacity={o}>
        <path
          d={path.d}
          fill="none"
          stroke={sketch.brass}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${h - s} ${path.length + 100}`}
          strokeDashoffset={-s}
        />
        {tip ? <circle cx={tip.x} cy={tip.y} r={width * 1.25} fill={sketch.brass} /> : null}
      </g>
    </ReelInk>
  );
};
