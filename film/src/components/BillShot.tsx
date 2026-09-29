import {Video} from '@remotion/media';
import React from 'react';
import {getStaticFiles, Img, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {palette} from '../design/palette';
import {ease, tween} from '../design/motion';
import {useT} from './stage';
import {FPS, LINES} from '../timing/timing';

export type BillSlot = 'intro' | 'credibility' | 'mistakes' | 'approach' | 'role' | 'invitation';

export type ShotFrame =
  | {kind: 'window'; x: number; y: number; w: number; h: number; radius?: number}
  | {kind: 'circle'; cx: number; cy: number; r: number};

const PHOTO = {src: 'photos/bill-portrait.jpg', size: 960}; // bill3.jpg, 960 × 960

export const billVideo = (slot: BillSlot) => `video/bill-${slot}.mp4`;
export const hasBillVideo = (slot: BillSlot) => getStaticFiles().some((f) => f.name === billVideo(slot));

/** Offset (footage time = film time + offset) for a slot whose footage was also given to `npm run voice:bill`. */
const syncOffset = (slot: BillSlot) => LINES.find((l) => l.source?.file.replace(/\.[^.]+$/, '') === `bill-${slot}`)?.source?.offset;

/**
 * Bill on camera. If public/video/bill-<slot>.mp4 exists it plays (muted: the narration track carries his
 * voice) inside the frame; otherwise his portrait stands in, with a slow push-in that never enlarges the
 * 960 px photo beyond its own resolution. Same geometry either way, so footage drops in with no layout work.
 */
export const BillShot: React.FC<{
  slot: BillSlot;
  frame: ShotFrame;
  from: number;
  to: number;
  /** Point of the portrait to keep centred (fractions of the photo). */
  focus?: {x: number; y: number};
  /** Displayed photo size (px) at the start and end of the shot; stays ≤ 960 so it is never upscaled. */
  zoom?: [number, number];
  /** Seconds into the footage at `clipStart`. Leave it out: when the footage also went through
   *  `npm run voice:bill`, the lip-synced value is computed from src/data/timing.json (otherwise 0). */
  videoStart?: number;
  /** Absolute film frame at which the clip's first frame plays (default: `from`). A shot that continues across
   *  two scenes passes the same value in both, so the footage and the push-in run on without a jump. */
  clipStart?: number;
  shadow?: boolean;
}> = ({slot, frame, from, to, focus = {x: 0.5, y: 0.36}, zoom, videoStart, clipStart, shadow = true}) => {
  const t = useT();
  const sceneStart = t - useCurrentFrame();
  const box =
    frame.kind === 'window'
      ? {left: frame.x, top: frame.y, width: frame.w, height: frame.h, borderRadius: frame.radius ?? 22}
      : {left: frame.cx - frame.r, top: frame.cy - frame.r, width: frame.r * 2, height: frame.r * 2, borderRadius: '50%'};
  const w = box.width;
  const h = box.height;
  const minSize = Math.max(w, h);
  const [z0, z1] = zoom ?? [Math.max(minSize, Math.min(PHOTO.size * 0.9, minSize * 1.0)), Math.min(PHOTO.size * 0.94, minSize * 1.06)];
  const size = tween(t, from, to, Math.max(minSize, z0), Math.max(minSize, z1), ease.soft);
  // keep the focus point centred, but never reveal an edge of the photo
  const left = Math.min(0, Math.max(w - size, w / 2 - focus.x * size));
  const top = Math.min(0, Math.max(h - size, h / 2 - focus.y * size));
  const video = hasBillVideo(slot);
  // footage timing: which film frame shows which footage frame (a take that starts late just starts late)
  const seqStart = clipStart ?? from;
  const offset = syncOffset(slot);
  const footageAtStart = videoStart ?? (offset === undefined ? 0 : seqStart / FPS + offset);
  const videoFrom = seqStart + Math.max(0, Math.round(-footageAtStart * FPS));
  const trimBefore = Math.max(0, Math.round(footageAtStart * FPS));
  return (
    <div
      style={{
        position: 'absolute',
        ...box,
        overflow: 'hidden',
        background: '#E9E6E1',
        boxShadow: shadow ? '0 30px 60px rgba(19,50,75,0.16), 0 6px 14px rgba(19,50,75,0.08)' : undefined,
      }}
    >
      {video ? (
        <Sequence from={videoFrom - sceneStart} layout="none">
          <Video
            src={staticFile(billVideo(slot))}
            muted
            trimBefore={trimBefore}
            objectFit="cover"
            style={{width: '100%', height: '100%'}}
          />
        </Sequence>
      ) : (
        <Img src={staticFile(PHOTO.src)} style={{position: 'absolute', left, top, width: size, height: size, maxWidth: 'none'}} />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: box.borderRadius,
          boxShadow: `inset 0 0 0 1px ${palette.rule}`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
