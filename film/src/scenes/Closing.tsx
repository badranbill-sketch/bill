import React from 'react';
import {BillPrint, BrassLine, GuideObject, Handwriting, InkDrawing, Pt} from '../components/sketch';
import {useT} from '../components/stage';
import {copy} from '../design/copy';
import {ease, tween} from '../design/motion';
import {sketch} from '../design/palette';
import {SERIF} from '../design/typography';
import {endOf, FPS, wordAt} from '../timing/timing';

// D2–D4 · the closing: role, invite, end. The brass line that became the calm horizon at y 610 in the plan scene
// moves on: it is the ground under the lakeside path (role), a short underline under the web address (invite), and
// the shoreline under the two chairs that stretches into the end card's rule (end).

const LINE_Y = 610;

// Bill's print, shared by role and invite: the same print on the same spot, so across the dissolve only the footage
// inside it changes.
const BILL = {left: 140, top: 268, width: 560, height: 700, rotate: 1.2} as const;

/** A drawing placed by scale k (display width / source width), positioned so that source point (sx, sy) lands on
 *  stage point (x, y). Returns the props for InkDrawing and a mapper from source to stage px. */
const place = (srcW: number, k: number, anchor: {sx: number; sy: number; x: number; y: number}) => {
  const left = anchor.x - anchor.sx * k;
  const top = anchor.y - anchor.sy * k;
  const map = (sx: number, sy: number): Pt => [left + sx * k, top + sy * k];
  return {left, top, width: srcW * k, map};
};

// ---- D2 · role ---------------------------------------------------------------------------------------------------------
// "My role is to help you understand your choices and how they connect to the future you want."
// Bill on the left. On the right the couple walks along the lake. The brass line picks up at the height where the
// plan's horizon lay (y 610), right beside Bill, and sweeps down to become the ground under the drawing while the
// horizon dissolves; on "connect" it carries on up the lakeside path — along its water side, past the couple — and runs
// out along the far shore.
export const Role: React.FC<{from: number; to: number}> = ({from, to}) => {
  // couple-walking: 1920 × 1079, generous, its empty lake running off the right edge
  const d = place(1920, 0.66, {sx: 0, sy: 0, x: 770, y: 40});
  const m = d.map;
  const ground: Pt[] = [[724, LINE_Y], [800, LINE_Y + 42], m(200, 1008), m(430, 1012)];
  const path: Pt[] = [
    m(430, 1012),
    m(640, 1004),
    m(740, 975),
    m(795, 890),
    m(810, 770),
    m(822, 672),
    m(860, 618),
    m(950, 601),
    m(1100, 597),
    m(1275, 590),
    m(1480, 592),
  ];
  const connect = wordAt('role', 'connect', 's', -0.35);
  return (
    <>
      <InkDrawing name="couple-walking" start={from} duration={100} left={d.left} top={d.top} width={d.width} />
      <BillPrint slot="role" from={from} to={to} arrive={from} zoom={[700, 740]} {...BILL} />
      <BrassLine points={ground} start={from + 2} duration={34} wobble={1.2} seed="role-ground" />
      <BrassLine points={path} start={connect} duration={66} wobble={1.6} seed="role-path" />
    </>
  );
};

// ---- D3 · invite -------------------------------------------------------------------------------------------------------
// "Take a few minutes to read the guide. And when you're ready, let's talk about what matters to you. You've worked
// hard for what you have."  A quiet morning: a cup by the lake draws itself beside Bill, the guide is laid on the page,
// and the address is written under it with a short brass underline.
export const Invite: React.FC<{from: number; to: number}> = ({from, to}) => {
  const t = useT();
  const d = place(1920, 0.55, {sx: 0, sy: 0, x: 800, y: 60});
  const guideLands = wordAt('read', 'read', 's', -0.3);
  const urlStart = wordAt('read', 'guide', 's', 0.05);
  const url = {left: 1066, top: 742};
  const urlW = 258; // Caveat 52 px
  const underlineAt = urlStart + 30;
  return (
    <>
      <InkDrawing name="morning-porch" start={from} duration={100} left={d.left} top={d.top} width={d.width} opacity={0.92} />
      <GuideObject left={1400} top={520} width={300} rotate={3} arrive={guideLands} time={t / FPS} />
      <BillPrint slot="invitation" from={from} to={to} zoom={[740, 780]} {...BILL} />
      <Handwriting text={copy.invite.url} start={urlStart} speed={16} left={url.left} top={url.top} variant="hand" rotate={-1.5} />
      <BrassLine
        points={[
          [url.left - 6, url.top + 62],
          [url.left + urlW * 0.5, url.top + 58],
          [url.left + urlW + 10, url.top + 52],
        ]}
        start={underlineAt}
        duration={18}
        wobble={1.2}
        seed="invite-url"
      />
    </>
  );
};

// ---- D4 · end ----------------------------------------------------------------------------------------------------------
// "Let's build a plan for what comes next."  Two chairs by the water draw themselves; the brass line is the shoreline
// under them, and once the voice has finished it stretches out into the end card's rule. The card is typeset below it,
// word for word from copy.end; the signature is handwritten.
export const EndCard: React.FC<{from: number; to: number}> = ({from}) => {
  const t = useT();
  // lake-chairs: 1920 × 1079, centred; its bottom (source y ≈ 1005, under the dock and the reeds) on the line
  const d = place(1920, 0.55, {sx: 960, sy: 1005, x: 960, y: LINE_Y});
  const e = endOf('next');
  const shore = wordAt('next', 'build', 's', -0.2);
  const fade = (start: number, dur = 18) => tween(t, start, start + dur, 0, 1, ease.soft);

  // the headline, word for word, set on two lines as the brief wrote it
  const [head1, head2] = splitHeadline(copy.end.headline);

  const card = {
    head1: fade(e + 3),
    head2: fade(e + 13),
    who: fade(e + 30),
    cta: fade(e + 44),
    lang: fade(e + 58),
    disclaimer: fade(e + 70, 24),
  };
  const serif = (size: number, weight = 500, extra: React.CSSProperties = {}): React.CSSProperties => ({
    fontFamily: `${SERIF}, serif`,
    fontWeight: weight,
    fontSize: size,
    color: sketch.ink,
    whiteSpace: 'nowrap',
    ...extra,
  });

  return (
    <>
      <InkDrawing name="lake-chairs" start={from} duration={95} left={d.left} top={d.top} width={d.width} />
      {/* the shoreline, then the rule */}
      <BrassLine
        points={[
          [470, LINE_Y + 1],
          [960, LINE_Y - 1],
          [1450, LINE_Y],
        ]}
        start={shore}
        duration={40}
        wobble={1.2}
        seed="end-shore"
      />
      <BrassLine
        points={[
          [1450, LINE_Y],
          [1800, LINE_Y + 1],
        ]}
        start={e}
        duration={26}
        wobble={0.8}
        seed="end-rule-r"
      />
      <BrassLine
        points={[
          [470, LINE_Y + 1],
          [120, LINE_Y],
        ]}
        start={e}
        duration={26}
        wobble={0.8}
        seed="end-rule-l"
      />

      {/* left: the headline and the signature */}
      <div style={{position: 'absolute', left: 120, top: 646, ...serif(64, 500, {lineHeight: 1.14, letterSpacing: '0.03em', textTransform: 'uppercase'})}}>
        <div style={{opacity: card.head1}}>{head1}</div>
        <div style={{opacity: card.head2}}>{head2}</div>
      </div>
      <Handwriting
        text={copy.end.signature}
        start={e + 64}
        speed={18}
        left={126}
        top={826}
        variant="hand"
        color={sketch.inkSoft}
        rotate={-1.5}
      />

      {/* right: who, the invitation, the guide's language */}
      <div style={{position: 'absolute', left: 1100, width: 700, top: 650, textAlign: 'right'}}>
        <div style={{opacity: card.who}}>
          <div style={serif(46, 500, {lineHeight: 1.15})}>{copy.end.name}</div>
          <div style={serif(30, 400, {fontStyle: 'italic', color: sketch.inkSoft, lineHeight: 1.3, marginTop: 2})}>{copy.end.role}</div>
        </div>
        <div style={{opacity: card.cta, marginTop: 26}}>
          <div style={serif(24, 600, {letterSpacing: '0.2em', lineHeight: 1.3})}>{copy.end.cta}</div>
          <div style={serif(40, 500, {lineHeight: 1.25})}>{copy.end.url}</div>
        </div>
        <div style={{opacity: card.lang, marginTop: 8, ...serif(26, 400, {fontStyle: 'italic', color: sketch.inkSoft, lineHeight: 1.4})}}>
          {copy.end.language}
        </div>
      </div>

      {/* the disclaimer: quiet, but fully legible */}
      <div
        style={{
          position: 'absolute',
          left: 110,
          width: 1700,
          top: 958,
          textAlign: 'center',
          opacity: card.disclaimer,
          ...serif(25, 400, {color: sketch.inkSoft, whiteSpace: 'normal', lineHeight: 1.4}),
        }}
      >
        {copy.end.disclaimer}
      </div>
    </>
  );
};

/** "A plan for what comes next." → ["A plan for", "what comes next."]; falls back to an even split by words. */
const splitHeadline = (s: string): [string, string] => {
  const i = s.toLowerCase().indexOf(' for ');
  if (i > 0) return [s.slice(0, i + 4), s.slice(i + 5)];
  const words = s.split(' ');
  const h = Math.ceil(words.length / 2);
  return [words.slice(0, h).join(' '), words.slice(h).join(' ')];
};
