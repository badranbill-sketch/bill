import React from 'react';
import {Video} from '@remotion/media';
import {Sequence, staticFile, useCurrentFrame} from 'remotion';
import {BrassLine, GuideObject, Handwriting} from '../../components/sketch';
import {useT} from '../../components/stage';
import {sketch} from '../../design/palette';
import {SERIF} from '../../design/typography';
import {reelCopy} from '../copy';
import {fmEase, keyframes, poseStyle, presence, progress, SPRING, staggerAt} from '../motion';
import {ReelPaper, ReelStage} from '../stage';
import {cue, f, SEGMENTS, SPEECH_END, TALK_FRAMES} from './edit';
import {Explainer, incomeAt, talkCopy} from './Explainer';
import {WordCaptions} from './WordCaptions';

export {TALK_FRAMES};

// The talking-head Reel. Bill's take, tightened with jump cuts, and an explainer drawn as he speaks, edited like a
// produced short: the picture changes shape with the story.
//   hook      Bill full frame, his question as captions
//   cut 1     the picture slides up into a split screen; a brass line runs along the seam; the explainer opens below
//   cut 2     « si votre revenu net… »: Bill becomes a small taped print in the corner, the explainer takes the frame,
//             a counter follows his income up the line
//   cut 3     « À 155 000 $… »: back to Bill, punched in, for the punchline
//   end       the paper rises over him and becomes the end card
// Each change of layout is the same no-bounce spring (Framer Motion's spring solver, evaluated per frame).

type Box = {x: number; y: number; w: number; h: number};
type Layout = {
  bill: Box & {r: number; rot: number; border: number};
  zoom: number; // framing inside the picture (1 = cover)
  fy: number; // where his face sits, as a fraction of the picture's height
  explainer: {dy: number; o: number};
  cap: number; // captions' centre line
  counter: number;
  title: {x: number; y: number; size: number; strip: number; o: number};
};

const FULL: Layout = {
  bill: {x: 0, y: 0, w: 1080, h: 1920, r: 0, rot: 0, border: 0},
  zoom: 1.4,
  fy: 0.47,
  explainer: {dy: 120, o: 0},
  cap: 1290,
  counter: 0,
  title: {x: 96, y: 300, size: 60, strip: 1, o: 1},
};
const SPLIT: Layout = {
  bill: {x: 0, y: 0, w: 1080, h: 900, r: 0, rot: 0, border: 0},
  zoom: 1,
  fy: 0.4,
  explainer: {dy: 0, o: 1},
  cap: 900,
  counter: 0,
  title: {x: 110, y: 962, size: 70, strip: 0, o: 1},
};
const FOCUS: Layout = {
  bill: {x: 610, y: 296, w: 350, h: 438, r: 4, rot: 2.5, border: 12},
  zoom: 2.3,
  fy: 0.45,
  explainer: {dy: -180, o: 1},
  cap: 1352,
  counter: 1,
  title: {x: 96, y: 300, size: 62, strip: 0, o: 1},
};

const mix = (a: number, b: number, p: number) => a + (b - a) * p;
const mixLayout = (a: Layout, b: Layout, p: number): Layout => ({
  bill: {
    x: mix(a.bill.x, b.bill.x, p),
    y: mix(a.bill.y, b.bill.y, p),
    w: mix(a.bill.w, b.bill.w, p),
    h: mix(a.bill.h, b.bill.h, p),
    r: mix(a.bill.r, b.bill.r, p),
    rot: mix(a.bill.rot, b.bill.rot, p),
    border: mix(a.bill.border, b.bill.border, p),
  },
  zoom: mix(a.zoom, b.zoom, p),
  fy: mix(a.fy, b.fy, p),
  explainer: {dy: mix(a.explainer.dy, b.explainer.dy, p), o: mix(a.explainer.o, b.explainer.o, p)},
  cap: mix(a.cap, b.cap, p),
  counter: mix(a.counter, b.counter, p),
  title: {
    x: mix(a.title.x, b.title.x, p),
    y: mix(a.title.y, b.title.y, p),
    size: mix(a.title.size, b.title.size, p),
    strip: mix(a.title.strip, b.title.strip, p),
    o: mix(a.title.o, b.title.o, p),
  },
});

/** The layout of each kept part, and the spring that carries one into the next at the cut. */
const PLAN: Layout[] = [FULL, SPLIT, FOCUS, SPLIT];
const MOVE = {type: 'spring', stiffness: 150, damping: 25} as const;
const layoutAt = (t: number) => {
  let L = PLAN[0];
  for (let i = 1; i < SEGMENTS.length; i++) L = mixLayout(L, PLAN[i], progress(t, f(SEGMENTS[i].at), MOVE));
  return L;
};
/** How much of each layout is showing (they sum to 1), for what crossfades rather than travels. */
const weightsAt = (t: number) => {
  let w = {full: 1, split: 0, focus: 0};
  const one = (L: Layout) => ({full: L === FULL ? 1 : 0, split: L === SPLIT ? 1 : 0, focus: L === FOCUS ? 1 : 0});
  for (let i = 1; i < SEGMENTS.length; i++) {
    const p = progress(t, f(SEGMENTS[i].at), MOVE);
    const n = one(PLAN[i]);
    w = {full: mix(w.full, n.full, p), split: mix(w.split, n.split, p), focus: mix(w.focus, n.focus, p)};
  }
  return w;
};
/** The last kept words are followed by a beat of silent picture, so the end card rises over a moving image. */
const HOLD = 0.6;

/** Punch-ins: each kept part has its own framing, so a jump cut reads as an edit (strong lines are closer). */
const PUNCH = [1.0, 1.1, 1.0, 1.16];

// A warm, gentle grade for a white-walled room shot on a phone: a touch more contrast and warmth, skin less grey.
const GRADE = 'contrast(1.08) saturate(1.12) brightness(1.04) sepia(0.1) hue-rotate(-4deg)';

const Take: React.FC<{i: number; box: {w: number; h: number}; zoom: number; fy: number}> = ({i, box, zoom, fy}) => {
  const seg = SEGMENTS[i];
  const frame = useCurrentFrame();
  const len = f(seg.len);
  const last = i === SEGMENTS.length - 1;
  const drift = keyframes(frame, [0, len], [0, 0.025], fmEase.linear);
  const volume = (fr: number) => Math.min(1, fr / 3, (len - fr) / 3);
  // cover the box, then frame his face: the picture is never smaller than the box and never shows an edge
  const s = Math.max(box.w / 720, box.h / 1280) * zoom * (PUNCH[i] + drift);
  const W = 720 * s;
  const H = 1280 * s;
  const left = Math.min(0, Math.max(box.w - W, box.w / 2 - 0.5 * W));
  const top = Math.min(0, Math.max(box.h - H, box.h / 2 - fy * H));
  return (
    <Video
      src={staticFile('video/bill-talk.mp4')}
      trimBefore={f(seg.a)}
      trimAfter={f(seg.b + (last ? HOLD : 0))}
      volume={(fr) => (fr >= len ? 0 : volume(fr))}
      style={{position: 'absolute', left, top, width: W, height: H, maxWidth: 'none', filter: GRADE}}
    />
  );
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

/** Bill: full frame, the top of a split, or a small taped print, depending on the layout. */
const Bill: React.FC<{L: Layout}> = ({L}) => {
  const {x, y, w, h, r, rot, border} = L.bill;
  const inner = {w: w - 2 * border, h: h - 2 * border};
  const printness = Math.min(1, border / 12);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        rotate: `${rot}deg`,
        background: sketch.printBorder,
        borderRadius: r,
        boxShadow: printness > 0.01 ? `0 ${22 * printness}px ${44 * printness}px ${sketch.shadow}, 0 3px 8px rgba(30,42,62,${0.1 * printness})` : undefined,
      }}
    >
      <div style={{position: 'absolute', left: border, top: border, width: inner.w, height: inner.h, overflow: 'hidden', background: '#cfcac2'}}>
        {SEGMENTS.map((s) => (
          <Sequence key={s.i} from={f(s.at)} durationInFrames={f(s.at + s.len + (s.i === SEGMENTS.length - 1 ? HOLD : 0)) - f(s.at)} layout="none">
            <Take i={s.i} box={inner} zoom={L.zoom} fy={L.fy} />
          </Sequence>
        ))}
        {/* vignette: keeps the eye on his face */}
        <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 75% 65% at 50% 40%, rgba(0,0,0,0) 55%, rgba(20,24,30,0.28) 100%)'}} />
        {/* where the picture meets the paper */}
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 60, background: 'linear-gradient(rgba(0,0,0,0), rgba(30,42,62,0.16))', opacity: 1 - printness}} />
      </div>
      <Tape x={w * 0.2} y={2} rot={-6} o={printness} />
      <Tape x={w * 0.8} y={h - 2} rot={-4} o={printness} />
    </div>
  );
};

/** « Récupération de la PSV »: a taped strip over the video, then on the page under it, then beside the print. */
const Title: React.FC<{w: {full: number; split: number; focus: number}}> = ({w}) => (
  <>
    <div style={{opacity: w.full}}>
      <div
        style={{
          position: 'absolute',
          left: 74,
          top: 288,
          width: 680,
          height: 102,
          background: sketch.printBorder,
          opacity: 0.95,
          rotate: '-1.5deg',
          boxShadow: '0 10px 24px rgba(30,42,62,0.2)',
        }}
      />
      <Handwriting text={talkCopy.title} start={4} speed={30} left={96} top={300} variant="handLarge" rotate={-1.5} style={{fontSize: 68}} />
    </div>
    <Handwriting text={talkCopy.title} start={4} speed={999} left={110} top={962} variant="handLarge" opacity={w.split} style={{fontSize: 70}} />
    <Handwriting text={talkCopy.titleTwoLines} start={4} speed={999} left={96} top={292} variant="handLarge" opacity={w.focus} style={{fontSize: 70}} />
  </>
);

/** In the explainer's full frame: Bill's income, counted as the dot moves along the line. */
const Counter: React.FC<{L: Layout}> = ({L}) => {
  const t = useT();
  const shown = L.counter ** 3 * keyframes(t, [cue('si', 0, 's', 0.1), cue('si', 0, 's', 0.4)], [0, 1], fmEase.soft);
  if (shown < 0.01) return null;
  const value = incomeAt(t).toLocaleString('fr-CA').replace(/\s/g, ' ') + ' $';
  return (
    <div style={{position: 'absolute', left: 96, top: 470, opacity: shown, translate: `0 ${(1 - shown) * 18}px`}}>
      <div style={{fontFamily: 'Caveat, cursive', fontWeight: 500, fontSize: 50, color: sketch.inkSoft}}>{talkCopy.counter}</div>
      <div style={{fontFamily: `${SERIF}, serif`, fontWeight: 600, fontSize: 92, color: sketch.ink, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', marginTop: 4}}>
        {value}
      </div>
    </div>
  );
};

const CARD = {hidden: {opacity: 0, y: 16}, visible: {opacity: 1, y: 0}} as const;

const EndCard: React.FC<{start: number}> = ({start}) => {
  const t = useT();
  const card = (i: number) =>
    poseStyle(presence(t, {enter: staggerAt(start, i, 5, 0.18), initial: CARD.hidden, animate: CARD.visible, enterWith: {type: 'spring', ...SPRING.settle}}).pose);
  const serif = (size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
    position: 'absolute',
    left: 110,
    fontFamily: `${SERIF}, serif`,
    fontWeight: 500,
    fontSize: size,
    color: sketch.ink,
    whiteSpace: 'nowrap',
    ...extra,
  });
  const [name, role] = reelCopy.close.who.split(' · ');
  return (
    <>
      <div style={{...serif(72, {top: 320}), ...card(0)}}>{name}</div>
      <div style={{...serif(42, {top: 418, fontStyle: 'italic', fontWeight: 400, color: sketch.inkSoft}), ...card(1)}}>{role}</div>
      <BrassLine points={[[110, 500], [520, 498], [940, 499]]} start={start + 6} duration={18} width={4} wobble={0.8} seed="talk-rule" />
      <div style={{...serif(60, {top: 540}), ...card(2)}}>{reelCopy.close.cta}</div>
      <div style={{position: 'absolute', inset: 0, ...card(3)}}>
        <GuideObject left={118} top={690} width={380} rotate={-2.5} />
      </div>
      <div style={{...serif(28, {top: 1250, width: 830, whiteSpace: 'normal', fontWeight: 400, color: sketch.inkSoft, lineHeight: 1.4}), ...card(4)}}>
        {reelCopy.close.disclaimer}
      </div>
    </>
  );
};

export const BillReelTalk: React.FC = () => {
  const t = useT();
  const L = layoutAt(t);
  const w = weightsAt(t);
  const end = f(SPEECH_END);
  const split = f(SEGMENTS[1].at);
  const rise = keyframes(t, [end - 6, end + 12], [L.bill.h, 0], fmEase.inOut);
  const out = keyframes(t, [end - 8, end + 2], [1, 0], fmEase.soft);
  return (
    <ReelStage>
      <ReelPaper />
      <Explainer style={{translate: `0 ${L.explainer.dy}px`, opacity: L.explainer.o * out}} />
      <Counter L={L} />
      <Bill L={L} />
      {/* the brass line runs along the seam as the picture splits */}
      <div style={{opacity: keyframes(t, [split + 14, split + 30], [1, 0], fmEase.soft)}}>
        <BrassLine points={[[0, 900], [540, 899], [1080, 900]]} start={split + 2} duration={14} width={5} wobble={0.6} seed="talk-seam" tip={false} />
      </div>
      <div style={{opacity: out}}>
        <Title w={w} />
      </div>
      {t < end + 2 && <WordCaptions centerY={L.cap} left={64} width={896} />}
      {t >= end - 6 && (
        <div style={{position: 'absolute', left: 0, top: rise, width: 1080, height: 1920, overflow: 'hidden', boxShadow: '0 -12px 30px rgba(30,42,62,0.18)'}}>
          <div style={{position: 'absolute', left: 0, top: -rise, width: 1080, height: 1920}}>
            <ReelPaper />
            <EndCard start={end + 10} />
          </div>
        </div>
      )}
    </ReelStage>
  );
};
