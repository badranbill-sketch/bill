import React from 'react';
import {Audio, Video} from '@remotion/media';
import {cubicBezier} from 'framer-motion';
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
import {Explainer, incomeAt, talkCopy} from './Explainer';
import {WordCaptions} from './WordCaptions';

export {TALK_FRAMES};

// The talking-head Reel: Bill's take, tightened with jump cuts, and an explainer drawn as he speaks, edited like a
// produced short. The picture changes shape with the story, and every element exists once and moves:
//   hook      Bill full frame, graded into the paper's warmth, with the stakes as a headline (« Ottawa peut reprendre
//             toute votre PSV ») that rises in on the first frame
//   cut 1     the picture slides up into a split screen that melts into the paper; the explainer opens below
//   cut 2     « si votre revenu net… »: Bill becomes a small taped print, the explainer takes the frame, the counter
//             follows his income up the line
//   cut 3     « À 155 000 $… »: back to the split, punched in, for the punchline
//   end       over « …reste », Bill shrinks back into the print and lands on the end card beside the guide
// Every move is 0.5 s on cubic-bezier(.65, 0, .35, 1) (Framer Motion's cubicBezier, evaluated per frame).

type Box = {x: number; y: number; w: number; h: number; rot: number; border: number};
type Layout = {bill: Box; zoom: number; fy: number; melt: number; explainer: {dy: number; o: number}};

const SPLIT_H = 820;
const FULL: Layout = {bill: {x: 0, y: 0, w: 1080, h: 1920, rot: 0, border: 0}, zoom: 1.45, fy: 0.49, melt: 0, explainer: {dy: 160, o: 0}};
const SPLIT: Layout = {bill: {x: 0, y: 0, w: 1080, h: SPLIT_H, rot: 0, border: 0}, zoom: 1, fy: 0.41, melt: 1, explainer: {dy: 0, o: 1}};
/** the punchline's split: the explainer a little lower, under the counter */
const SPLIT_C: Layout = {...SPLIT, explainer: {dy: 40, o: 1}};
const FOCUS: Layout = {bill: {x: 575, y: 296, w: 385, h: 480, rot: 2.5, border: 12}, zoom: 2.3, fy: 0.45, melt: 0, explainer: {dy: -90, o: 1}};
const END: Layout = {bill: {x: 640, y: 300, w: 312, h: 390, rot: 3, border: 12}, zoom: 2.3, fy: 0.45, melt: 0, explainer: {dy: 120, o: 0}};

const mix = (a: number, b: number, p: number) => a + (b - a) * p;
const mixLayout = (a: Layout, b: Layout, p: number): Layout => ({
  bill: {
    x: mix(a.bill.x, b.bill.x, p),
    y: mix(a.bill.y, b.bill.y, p),
    w: mix(a.bill.w, b.bill.w, p),
    h: mix(a.bill.h, b.bill.h, p),
    rot: mix(a.bill.rot, b.bill.rot, p),
    border: mix(a.bill.border, b.bill.border, p),
  },
  zoom: mix(a.zoom, b.zoom, p),
  fy: mix(a.fy, b.fy, p),
  // the melt and the print's border trade places early in the move, so there is no hard edge mid-move
  melt: mix(a.melt, b.melt, Math.min(1, p * 2.5)),
  explainer: {dy: mix(a.explainer.dy, b.explainer.dy, p), o: mix(a.explainer.o, b.explainer.o, p)},
});

/** Over the tail of his last word, the end card begins. */
const END_AT = f(SPEECH_END - 0.3);
const STEPS: {at: number; L: Layout}[] = [
  {at: f(SEGMENTS[1].at), L: SPLIT},
  {at: f(SEGMENTS[2].at), L: FOCUS},
  {at: f(SEGMENTS[3].at), L: SPLIT_C},
  {at: END_AT, L: END},
];
const MOVE = {duration: 0.5, ease: cubicBezier(0.65, 0, 0.35, 1)};
const layoutAt = (t: number) => STEPS.reduce((L, s) => mixLayout(L, s.L, progress(t, s.at, MOVE)), FULL);
/** 1 while the layout is settled, 0 while it moves (captions and the counter step aside for each move). */
const settledAt = (t: number) => STEPS.reduce((v, s) => v * keyframes(t, [s.at - 4, s.at, s.at + 15, s.at + 21], [1, 0, 0, 1], fmEase.soft), 1);

/** Punch-ins: each kept part has its own framing (strong lines are closer); a slow drift inside each. */
const PUNCH = [1.0, 1.1, 1.0, 1.15];
const DRIFT = [0.07, 0.025, 0.02, 0.03];

/** The still on the end card: frame 1044 of the take (34.8 s), just after his last word: mouth closed, eyes on the lens. */
const END_STILL = 34.8;
/** The first six frames hold frame 100 of the take (eyes on the lens), which the picture then plays on from. */
const OPEN_HOLD = 6;

// The grade, measured on the footage (least squares on skin, wall, sofa, jacket, beard): skin from a red
// rgb(206,142,114) to rgb(214,163,137); the cyan-grey wall to the page's warm white (+5 R, −2 B more in the highlights,
// measured against the paper); the jacket kept neutral; an
// identity curve with a soft shoulder above 80 % so the forehead never clips; a light sharpen for the 720p source.
const GradeDefs: React.FC = () => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <defs>
      <filter id="bill-grade" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
        <feColorMatrix type="matrix" values="0.7004 0.7783 -0.3892 0 0.0408  -0.0430 1.4905 -0.3957 0 0.0205  -0.1190 1.1012 0.0051 0 0.0094  0 0 0 1 0" />
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0 0.1 0.2 0.3 0.4 0.5 0.6 0.7 0.8 0.885 0.955" />
          <feFuncG type="table" tableValues="0 0.1 0.2 0.3 0.4 0.5 0.6 0.7 0.8 0.885 0.955" />
          <feFuncB type="table" tableValues="0 0.1 0.2 0.3 0.4 0.5 0.6 0.7 0.8 0.885 0.955" />
        </feComponentTransfer>
        <feConvolveMatrix order="3" kernelMatrix="0 -0.25 0 -0.25 2 -0.25 0 -0.25 0" preserveAlpha="true" />
      </filter>
    </defs>
  </svg>
);

/** His voice: one continuous track built from the same cut list (tools/talk-voice.mjs), played from frame 0. */
const Voice: React.FC = () => <Audio src={staticFile('audio/talk-voice.wav')} />;

const Take: React.FC<{i: number; box: {w: number; h: number}; zoom: number; fy: number}> = ({i, box, zoom, fy}) => {
  const seg = SEGMENTS[i];
  const frame = useCurrentFrame();
  const len = f(seg.len);
  const last = i === SEGMENTS.length - 1;
  const drift = keyframes(frame, [0, len], [0, DRIFT[i]], fmEase.linear);
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
      trimAfter={f(last ? Math.max(seg.b, END_STILL) + 0.5 : seg.b)}
      muted
      style={{position: 'absolute', left, top, width: W, height: H, maxWidth: 'none', filter: 'url(#bill-grade)'}}
    />
  );
  // the first frames hold a look into the lens; the end card holds a still of him, mouth closed
  if (i === 0 && frame < OPEN_HOLD) return <Freeze frame={OPEN_HOLD}>{video}</Freeze>;
  const stillFrom = END_AT - f(seg.at) + 4;
  return last && frame >= stillFrom ? <Freeze frame={f(END_STILL - seg.a)}>{video}</Freeze> : video;
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
  const {x, y, w, h, rot, border} = L.bill;
  const inner = {w: w - 2 * border, h: h - 2 * border};
  const print = Math.min(1, border / 12);
  // the split melts into the paper: an oval that drops the sofa at the sides, and a long fade at the bottom
  const melt =
    L.melt > 0.01
      ? `radial-gradient(ellipse ${100 + 60 * (1 - L.melt)}% ${118 + 60 * (1 - L.melt)}% at 50% 22%, #000 62%, rgba(0,0,0,0) 100%), linear-gradient(to bottom, #000 calc(100% - ${80 * L.melt}px), rgba(0,0,0,0) 100%)`
      : undefined;
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
      <div
        style={{
          position: 'absolute',
          left: border,
          top: border,
          width: inner.w,
          height: inner.h,
          overflow: 'hidden',
          WebkitMaskImage: melt,
          maskImage: melt,
          WebkitMaskComposite: 'source-in',
          maskComposite: 'intersect',
        }}
      >
        {SEGMENTS.map((s) => (
          <Sequence key={s.i} from={f(s.at)} durationInFrames={(s.i === SEGMENTS.length - 1 ? TALK_FRAMES : f(s.at + s.len)) - f(s.at)} layout="none">
            <Take i={s.i} box={inner} zoom={L.zoom} fy={L.fy} />
          </Sequence>
        ))}
        {/* the paper's own grain over the picture, so both are the same material */}
        <Img
          src={staticFile('textures/grain-1920.png')}
          style={{position: 'absolute', width: 1920, height: 1080, left: (inner.w - 1920) / 2, top: (inner.h - 1080) / 2, rotate: '90deg', mixBlendMode: 'soft-light', opacity: 0.4}}
        />
      </div>
      <Tape x={w * 0.22} y={2} rot={-6} o={Math.max(0, (print - 0.85) / 0.15)} />
      <Tape x={w * 0.78} y={h - 2} rot={-4} o={Math.max(0, (print - 0.85) / 0.15)} />
    </div>
  );
};

/** The stakes, in Bill's words, rising in with the first frame; the brass line underlines « toute votre PSV ». */
const HookCard: React.FC = () => {
  const t = useT();
  const inn = keyframes(t, [-3, 3], [0, 1], cubicBezier(0.33, 1, 0.68, 1));
  const out = progress(t, f(SEGMENTS[1].at) - 3, {duration: 0.3, ease: fmEase.inOut});
  if (out >= 1) return null;
  const o = inn * (1 - out);
  return (
    <div
      style={{
        position: 'absolute',
        left: 64,
        top: 284,
        width: 800,
        padding: '14px 28px 22px',
        background: sketch.printBorder,
        boxShadow: '0 18px 40px rgba(30,42,62,0.22), 0 3px 8px rgba(30,42,62,0.10)',
        rotate: '-1deg',
        opacity: o,
        translate: `0 ${24 * (1 - inn) - 40 * out}px`,
      }}
    >
      <div style={{fontFamily: 'Caveat, cursive', fontWeight: 600, fontSize: 40, color: sketch.brassDeep, lineHeight: 1}}>{talkCopy.title}</div>
      <div style={{fontFamily: `${SERIF}, serif`, fontWeight: 600, fontSize: 66, color: sketch.ink, lineHeight: 1.06, marginTop: 8, whiteSpace: 'nowrap'}}>
        {talkCopy.hook1}
        <br />
        {talkCopy.hook2}
      </div>
      <svg width={800} height={30} style={{position: 'absolute', left: 28, top: 196, overflow: 'visible'}}>
        <path
          d="M 2 12 C 130 8, 340 6, 496 4"
          fill="none"
          stroke={sketch.brass}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={540}
          strokeDashoffset={540 * (1 - keyframes(t, [8, 19], [0, 1], fmEase.draw))}
        />
      </svg>
    </div>
  );
};

/** His income, counted as the dot moves along the line: one element, above the print, that moves with the layout
 *  (beside the print in the explanation, under the picture for the punchline) and is underlined when it lands. */
const Counter: React.FC<{t: number}> = ({t}) => {
  const toC = progress(t, f(SEGMENTS[3].at), MOVE);
  const pos = {x: 96, y: mix(500, 826, toC), size: mix(86, 84, toC)};
  const shown =
    keyframes(t, [cue('si', 0, 's', 0.05), cue('si', 0, 's', 0.3)], [0, 1], fmEase.soft) * keyframes(t, [END_AT - 2, END_AT + 5], [1, 0], fmEase.soft);
  if (shown < 0.01) return null;
  const value = incomeAt(t).toLocaleString('fr-CA').replace(/\s/g, '\u00a0') + '\u00a0$';
  const landed = keyframes(t, [cue('155000', 0, 'e'), cue('155000', 0, 'e') + 8], [0, 1], fmEase.out);
  return (
    <div style={{position: 'absolute', left: pos.x, top: pos.y, opacity: shown}}>
      <div style={{fontFamily: 'Caveat, cursive', fontWeight: 500, fontSize: 44, color: sketch.inkSoft, lineHeight: 1}}>{talkCopy.counter}</div>
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          fontFamily: `${SERIF}, serif`,
          fontWeight: 600,
          fontSize: pos.size,
          color: sketch.ink,
          letterSpacing: '-0.01em',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}
      >
        {value}
        <div style={{position: 'absolute', left: 0, right: 0, bottom: -4, height: 6, borderRadius: 3, background: sketch.brass, transformOrigin: 'left center', scale: `${landed} 1`}} />
      </div>
    </div>
  );
};

const CARD = {hidden: {opacity: 0, y: 22}, visible: {opacity: 1, y: 0}} as const;

/** The end card lands while Bill's print is still moving into place: the call to action is the largest thing on it. */
const EndCard: React.FC<{start: number}> = ({start}) => {
  const t = useT();
  if (t < start - 2) return null;
  const card = (i: number) =>
    poseStyle(presence(t, {enter: staggerAt(start, i, 6, 0.08), initial: CARD.hidden, animate: CARD.visible, enterWith: {type: 'spring', ...SPRING.settle}}).pose);
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
  const a = arrow([600, 1090], [470, 1170], 0.3, 18, 'talk-arrow');
  return (
    <>
      <div style={{...serif(52, {top: 430, fontWeight: 600}), ...card(0)}}>{name}</div>
      <div style={{...serif(36, {top: 500, fontStyle: 'italic', fontWeight: 400, color: sketch.inkSoft}), ...card(1)}}>{role}</div>
      <div style={{...serif(62, {top: 752, fontWeight: 600}), ...card(2)}}>{reelCopy.close.cta}</div>
      <BrassLine points={[[96, 846], [400, 844], [700, 845]]} start={start + 8} duration={12} width={6} wobble={0.7} seed="talk-cta" tip={false} />
      <div style={{position: 'absolute', inset: 0, ...card(3)}}>
        <GuideObject left={112} top={884} width={330} rotate={-3} />
      </div>
      <Handwriting text={copyFr.guide.note.split(' · ')[0]} start={start + 10} speed={44} left={520} top={1010} rotate={-4} variant="hand" style={{fontSize: 62}} />
      <ReelInk>
        <InkStroke d={a.shaft} start={start + 17} duration={9} width={3.5} />
        <InkStroke d={a.head} start={start + 25} duration={5} width={3.5} />
      </ReelInk>
      <div style={{...serif(26, {top: 1366, width: 860, whiteSpace: 'normal', fontWeight: 400, color: sketch.inkSoft, lineHeight: 1.4}), ...card(5)}}>
        {reelCopy.close.disclaimer}
      </div>
    </>
  );
};

/** The brass line lays itself along the seam once the split has settled. */
const Seam: React.FC<{t: number}> = ({t}) => {
  const lines = [
    {from: f(SEGMENTS[1].at) + 15, to: f(SEGMENTS[2].at) - 2},
    {from: f(SEGMENTS[3].at) + 15, to: END_AT - 2},
  ];
  return (
    <>
      {lines.map((l, i) => (
        <div key={i} style={{opacity: keyframes(t, [l.to, l.to + 6], [1, 0], fmEase.soft)}}>
          {t < l.to + 6 && (
            <BrassLine points={[[0, SPLIT_H - 3], [540, SPLIT_H - 4], [1080, SPLIT_H - 3]]} start={l.from} duration={11} width={4} wobble={0.6} seed={`talk-seam-${i}`} tip={false} />
          )}
        </div>
      ))}
    </>
  );
};

export const BillReelTalk: React.FC = () => {
  const t = useT();
  const L = layoutAt(t);
  const push = keyframes(t, [END_AT, TALK_FRAMES], [1, 1.02], fmEase.inOut);
  return (
    <ReelStage>
      <GradeDefs />
      <Voice />
      <ReelPaper />
      <div style={{position: 'absolute', inset: 0, scale: String(push), transformOrigin: '540px 820px'}}>
        <Explainer
          style={{
            translate: `0 ${L.explainer.dy}px`,
            opacity: L.explainer.o * keyframes(t, [END_AT, END_AT + 8], [1, 0], fmEase.soft),
          }}
        />
        <EndCard start={END_AT + 3} />
        <Bill L={L} />
        <Seam t={t} />
        <Counter t={t} />
        <HookCard />
      </div>
      {t < END_AT + 4 && <WordCaptions centerY={1380} left={64} width={896} opacity={settledAt(t) * keyframes(t, [END_AT, END_AT + 4], [1, 0], fmEase.soft)} />}
    </ReelStage>
  );
};
