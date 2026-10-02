import React from 'react';
import {Video} from '@remotion/media';
import {Freeze, Img, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {arrow, BrassLine, GuideObject, Handwriting, InkStroke} from '../../components/sketch';
import {useT} from '../../components/stage';
import {copyFr} from '../../design/copy';
import {sketch} from '../../design/palette';
import {SERIF} from '../../design/typography';
import {reelCopy} from '../copy';
import {fmEase, keyframes, poseStyle, presence, progress, SPRING, staggerAt} from '../motion';
import {ReelInk, ReelPaper, ReelStage} from '../stage';
import {cue, f, SEGMENTS, SPEECH_END, TALK_FRAMES} from './edit';
import {Explainer, incomeAt, ROW, talkCopy, X0} from './Explainer';
import {WordCaptions} from './WordCaptions';

export {TALK_FRAMES};

// The talking-head Reel: Bill's take, tightened with jump cuts, and an explainer drawn as he speaks, edited like a
// produced short. The picture changes shape with the story, and every element exists once and moves:
//   hook      Bill full frame, graded into the paper's warmth; the title card is already there on frame 0
//   cut 1     the picture slides up into a split screen, its lower edge melting into the paper; the explainer opens
//   cut 2     « si votre revenu net… »: Bill becomes a small taped print, the explainer takes the frame, the counter
//             follows his income up the line
//   cut 3     « À 155 000 $… »: back to the split, punched in, for the punchline
//   end       Bill shrinks back into the print and lands on the end card beside the guide
// Every change of layout is the same no-bounce spring (Framer Motion's solver, evaluated per frame).

type Box = {x: number; y: number; w: number; h: number; rot: number; border: number};
type Layout = {
  bill: Box;
  zoom: number; // framing inside the picture (1 = cover)
  fy: number; // where his face sits, as a fraction of the picture's height
  feather: number; // px of the picture's lower edge that melt into the paper
  explainer: {dy: number; s: number; o: number};
  counter: {x: number; y: number; size: number; o: number};
};

const FULL: Layout = {
  bill: {x: 0, y: 0, w: 1080, h: 1920, rot: 0, border: 0},
  zoom: 1.45,
  fy: 0.49,
  feather: 0,
  explainer: {dy: 160, s: 1, o: 0},
  counter: {x: 560, y: 922, size: 58, o: 0},
};
const SPLIT: Layout = {
  bill: {x: 0, y: 0, w: 1080, h: 900, rot: 0, border: 0},
  zoom: 1,
  fy: 0.4,
  feather: 110,
  explainer: {dy: 0, s: 1, o: 1},
  counter: {x: 560, y: 912, size: 58, o: 1},
};
const FOCUS: Layout = {
  bill: {x: 575, y: 296, w: 385, h: 480, rot: 2.5, border: 12},
  zoom: 2.3,
  fy: 0.45,
  feather: 0,
  explainer: {dy: -150, s: 1, o: 1},
  counter: {x: 96, y: 540, size: 88, o: 1},
};
const END: Layout = {
  bill: {x: 600, y: 300, w: 340, h: 425, rot: 3, border: 12},
  zoom: 2.3,
  fy: 0.45,
  feather: 0,
  explainer: {dy: 140, s: 1, o: 0},
  counter: {x: 560, y: 912, size: 58, o: 0},
};

const mix = (a: number, b: number, p: number) => a + (b - a) * p;
const mixBox = (a: Box, b: Box, p: number): Box => ({
  x: mix(a.x, b.x, p),
  y: mix(a.y, b.y, p),
  w: mix(a.w, b.w, p),
  h: mix(a.h, b.h, p),
  rot: mix(a.rot, b.rot, p),
  border: mix(a.border, b.border, p),
});
const mixLayout = (a: Layout, b: Layout, p: number): Layout => ({
  bill: mixBox(a.bill, b.bill, p),
  zoom: mix(a.zoom, b.zoom, p),
  fy: mix(a.fy, b.fy, p),
  feather: mix(a.feather, b.feather, p),
  explainer: {dy: mix(a.explainer.dy, b.explainer.dy, p), s: mix(a.explainer.s, b.explainer.s, p), o: mix(a.explainer.o, b.explainer.o, p)},
  counter: {
    x: mix(a.counter.x, b.counter.x, p),
    y: mix(a.counter.y, b.counter.y, p),
    size: mix(a.counter.size, b.counter.size, p),
    o: mix(a.counter.o, b.counter.o, p),
  },
});

const END_AT = f(SPEECH_END);
/** Each kept part's layout, then the end card; the moves start on the cut. */
const STEPS: {at: number; L: Layout}[] = [
  {at: f(SEGMENTS[1].at), L: SPLIT},
  {at: f(SEGMENTS[2].at), L: FOCUS},
  {at: f(SEGMENTS[3].at), L: SPLIT},
  {at: END_AT, L: END},
];
const MOVE = {type: 'spring', stiffness: 150, damping: 25} as const;
const layoutAt = (t: number) => STEPS.reduce((L, s) => mixLayout(L, s.L, progress(t, s.at, MOVE)), FULL);
/** 1 while the layout is settled, 0 while it moves (the captions step aside for each move). */
const settledAt = (t: number) => STEPS.reduce((v, s) => v * keyframes(t, [s.at - 3, s.at, s.at + 13, s.at + 19], [1, 0, 0, 1], fmEase.soft), 1);

/** Punch-ins: each kept part has its own framing, so a jump cut reads as an edit (strong lines are closer). */
const PUNCH = [1.0, 1.1, 1.0, 1.15];
const DRIFT = [0.05, 0.025, 0.02, 0.03];

/** The last kept words are followed by half a second of silent picture, then a still of him for the end card. */
const HOLD = 0.45;

// The grade, measured on the footage: skin from a red rgb(206,142,114) to a natural rgb(214,162,136); the cyan-grey
// wall to the page's warm white; the dark jacket kept neutral; highlights rolled off; a light sharpen for 720p.
const GradeDefs: React.FC = () => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <defs>
      <filter id="bill-grade" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
        <feColorMatrix
          type="matrix"
          values="0.7494 0.7199 -0.4178 0 0.0204  0.0251 1.3055 -0.2868 0 0.0145  -0.0821 0.8878 0.2097 0 0.0079  0 0 0 1 0"
        />
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0 0.125 0.25 0.375 0.5 0.625 0.75 0.86 0.94 0.985" />
          <feFuncG type="table" tableValues="0 0.125 0.25 0.375 0.5 0.625 0.75 0.86 0.94 0.985" />
          <feFuncB type="table" tableValues="0 0.125 0.25 0.375 0.5 0.625 0.75 0.86 0.94 0.985" />
        </feComponentTransfer>
        <feConvolveMatrix order="3" kernelMatrix="0 -0.3 0 -0.3 2.2 -0.3 0 -0.3 0" preserveAlpha="true" />
      </filter>
    </defs>
  </svg>
);

const Take: React.FC<{i: number; box: {w: number; h: number}; zoom: number; fy: number}> = ({i, box, zoom, fy}) => {
  const seg = SEGMENTS[i];
  const frame = useCurrentFrame();
  const len = f(seg.len);
  const last = i === SEGMENTS.length - 1;
  const drift = keyframes(frame, [0, len], [0, DRIFT[i]], fmEase.linear);
  const volume = (fr: number) => (fr >= len ? 0 : Math.min(1, fr / 3, (len - fr) / 3));
  // cover the box, then frame his face: never smaller than the box, never showing an edge
  const s = Math.max(box.w / 720, box.h / 1280) * zoom * (PUNCH[i] + drift);
  const W = 720 * s;
  const H = 1280 * s;
  const left = Math.min(0, Math.max(box.w - W, box.w / 2 - 0.5 * W));
  const top = Math.min(0, Math.max(box.h - H, box.h / 2 - fy * H));
  const video = (
    <Video
      src={staticFile('video/bill-talk.mp4')}
      trimBefore={f(seg.a)}
      trimAfter={f(seg.b + (last ? HOLD + 0.1 : 0))}
      volume={volume}
      style={{position: 'absolute', left, top, width: W, height: H, maxWidth: 'none', filter: 'url(#bill-grade)'}}
    />
  );
  const freezeAt = len + f(HOLD);
  return last && frame >= freezeAt ? <Freeze frame={freezeAt}>{video}</Freeze> : video;
};

const Tape: React.FC<{x: number; y: number; rot: number; o: number}> = ({x, y, rot, o}) => (
  <div
    style={{
      position: 'absolute',
      left: x - 56,
      top: y - 16,
      width: 112,
      height: 32,
      background: sketch.tape,
      rotate: `${rot}deg`,
      opacity: o,
      boxShadow: '0 1px 2px rgba(60,48,30,0.12)',
    }}
  />
);

/** Bill: full frame, the top of a split melting into the paper, or a small taped print. One element, always. */
const Bill: React.FC<{L: Layout}> = ({L}) => {
  const t = useT();
  const {x, y, w, h, rot, border} = L.bill;
  const inner = {w: w - 2 * border, h: h - 2 * border};
  const print = Math.min(1, border / 12);
  const mask = L.feather > 1 ? `linear-gradient(to bottom, #000 calc(100% - ${L.feather}px), rgba(0,0,0,0) 100%)` : undefined;
  const lastEnd = f(SEGMENTS[SEGMENTS.length - 1].at + SEGMENTS[SEGMENTS.length - 1].len);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        rotate: `${rot}deg`,
        background: print > 0.01 ? sketch.printBorder : undefined,
        boxShadow: print > 0.01 ? `0 ${22 * print}px ${44 * print}px ${sketch.shadow}, 0 3px 8px rgba(30,42,62,${0.1 * print})` : undefined,
      }}
    >
      <div style={{position: 'absolute', left: border, top: border, width: inner.w, height: inner.h, overflow: 'hidden', WebkitMaskImage: mask, maskImage: mask}}>
        {SEGMENTS.map((s) => (
          <Sequence key={s.i} from={f(s.at)} durationInFrames={(s.i === SEGMENTS.length - 1 ? TALK_FRAMES : f(s.at + s.len)) - f(s.at)} layout="none">
            <Take i={s.i} box={inner} zoom={L.zoom} fy={L.fy} />
          </Sequence>
        ))}
        {/* the paper's own grain over the picture, so both are the same material */}
        <Img
          src={staticFile('textures/grain-1920.png')}
          style={{position: 'absolute', width: 1920, height: 1080, left: (inner.w - 1920) / 2, top: (inner.h - 1080) / 2, rotate: '90deg', mixBlendMode: 'soft-light', opacity: 0.35}}
        />
      </div>
      <Tape x={w * 0.22} y={2} rot={-6} o={print} />
      <Tape x={w * 0.78} y={h - 2} rot={-4} o={print * (1 - Math.min(1, Math.max(0, (t - lastEnd) / 6)))} />
    </div>
  );
};

/** Frame 0 already says what this is: the title, and what is at stake, in Bill's words. Leaves with the first cut. */
const HookCard: React.FC = () => {
  const t = useT();
  const out = progress(t, f(SEGMENTS[1].at) - 2, {duration: 0.3, ease: fmEase.inOut});
  if (out >= 1) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 64,
        top: 300,
        padding: '22px 30px 20px',
        background: sketch.printBorder,
        borderTop: `5px solid ${sketch.brass}`,
        boxShadow: '0 18px 40px rgba(30,42,62,0.22), 0 3px 8px rgba(30,42,62,0.10)',
        rotate: '-1.2deg',
        opacity: 1 - out,
        translate: `0 ${-40 * out}px`,
      }}
    >
      <div style={{fontFamily: `${SERIF}, serif`, fontWeight: 600, fontSize: 58, color: sketch.ink, lineHeight: 1.1, whiteSpace: 'nowrap'}}>{talkCopy.title}</div>
      <div style={{fontFamily: 'Caveat, cursive', fontWeight: 600, fontSize: 54, color: sketch.ink, lineHeight: 1.1, marginTop: 6, whiteSpace: 'nowrap'}}>
        {talkCopy.stakes}
      </div>
    </div>
  );
};

/** His income, counted as the dot moves along the line: small above the explainer in the split, the hero in the print. */
const Counter: React.FC<{L: Layout}> = ({L}) => {
  const t = useT();
  const shown =
    L.counter.o *
    keyframes(t, [cue('si', 0, 's', 0.05), cue('si', 0, 's', 0.3)], [0, 1], fmEase.soft) *
    keyframes(t, [END_AT - 2, END_AT + 5], [1, 0], fmEase.soft);
  if (shown < 0.01) return null;
  const value = incomeAt(t).toLocaleString('fr-CA').replace(/\s/g, ' ') + ' $';
  const {x, y, size} = L.counter;
  return (
    <div style={{position: 'absolute', left: x, top: y, opacity: shown}}>
      <div style={{fontFamily: 'Caveat, cursive', fontWeight: 500, fontSize: size * 0.52, color: sketch.inkSoft, lineHeight: 1}}>{talkCopy.counter}</div>
      <div style={{fontFamily: `${SERIF}, serif`, fontWeight: 600, fontSize: size, color: sketch.ink, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1}}>
        {value}
      </div>
    </div>
  );
};

const CARD = {hidden: {opacity: 0, y: 22}, visible: {opacity: 1, y: 0}} as const;

/** The end card lands while Bill's print is still moving into place: no blank frame, nothing cuts across him. */
const EndCard: React.FC<{start: number}> = ({start}) => {
  const t = useT();
  if (t < start - 2) return null;
  const card = (i: number) =>
    poseStyle(presence(t, {enter: staggerAt(start, i, 6, 0.09), initial: CARD.hidden, animate: CARD.visible, enterWith: {type: 'spring', ...SPRING.settle}}).pose);
  const serif = (size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
    position: 'absolute',
    left: 96,
    fontFamily: `${SERIF}, serif`,
    fontWeight: 500,
    fontSize: size,
    color: sketch.ink,
    whiteSpace: 'nowrap',
    ...extra,
  });
  const [name, role] = reelCopy.close.who.split(' · ');
  const a = arrow([700, 1000], [560, 1120], 0.28, 18, 'talk-arrow');
  return (
    <>
      <div style={{...serif(66, {top: 318, fontWeight: 600}), ...card(0)}}>{name}</div>
      <div style={{...serif(40, {top: 404, fontStyle: 'italic', fontWeight: 400, color: sketch.inkSoft}), ...card(1)}}>{role}</div>
      <BrassLine points={[[96, 478], [320, 476], [548, 477]]} start={start + 4} duration={14} width={5} wobble={0.7} seed="talk-rule" tip={false} />
      <div style={{...serif(50, {top: 500}), ...card(2)}}>{reelCopy.close.cta}</div>
      <div style={{position: 'absolute', inset: 0, ...card(3)}}>
        <GuideObject left={110} top={642} width={480} rotate={-3} />
      </div>
      <Handwriting text={copyFr.guide.note.split(' · ')[0]} start={start + 12} speed={40} left={640} top={900} rotate={-4} variant="hand" style={{fontSize: 58}} />
      <ReelInk>
        <InkStroke d={a.shaft} start={start + 20} duration={10} width={3.5} />
        <InkStroke d={a.head} start={start + 29} duration={5} width={3.5} />
      </ReelInk>
      <div style={{...serif(26, {top: 1364, width: 860, whiteSpace: 'normal', fontWeight: 400, color: sketch.inkSoft, lineHeight: 1.4}), ...card(5)}}>
        {reelCopy.close.disclaimer}
      </div>
    </>
  );
};

export const BillReelTalk: React.FC = () => {
  const t = useT();
  const L = layoutAt(t);
  const split = f(SEGMENTS[1].at);
  // a slow push-in over the end card
  const push = keyframes(t, [END_AT, TALK_FRAMES], [1, 1.03], fmEase.inOut);
  return (
    <ReelStage>
      <GradeDefs />
      <ReelPaper />
      <div style={{position: 'absolute', inset: 0, scale: String(push), transformOrigin: '540px 820px'}}>
        <Explainer
          style={{
            translate: `0 ${L.explainer.dy}px`,
            scale: String(L.explainer.s),
            transformOrigin: `${X0}px ${ROW.bar}px`,
            opacity: L.explainer.o * keyframes(t, [END_AT - 2, END_AT + 6], [1, 0], fmEase.soft),
          }}
        />
        <Counter L={L} />
        <EndCard start={END_AT - 4} />
        <Bill L={L} />
        {/* the brass line runs along the seam as the picture splits */}
        <div style={{opacity: keyframes(t, [split + 12, split + 26], [1, 0], fmEase.soft)}}>
          <BrassLine points={[[0, 900], [540, 899], [1080, 900]]} start={split} duration={13} width={5} wobble={0.6} seed="talk-seam" tip={false} />
        </div>
        <HookCard />
      </div>
      {t < END_AT + 4 && <WordCaptions centerY={1362} left={64} width={896} opacity={settledAt(t) * keyframes(t, [END_AT, END_AT + 4], [1, 0], fmEase.soft)} />}
    </ReelStage>
  );
};
