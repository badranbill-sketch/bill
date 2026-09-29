import React from 'react';
import { Img, staticFile, useCurrentFrame } from 'remotion';
import { ASSETS } from '../assets';
import { C, FONT } from '../brand';
import { SCENES, tr } from '../content';
import { Caption, InkDrawing, SerifLine, SmallCaps, Underline } from '../primitives/basics';
import { Mark } from '../primitives/objects';
import { Reveal, appearAt, progressAt, useSceneDur } from '../primitives/time';

/** S05 — Why Bill (his real photo, four pairs), then the identity board. */
export const S05: React.FC = () => {
  const s = SCENES.s05;
  const frame = useCurrentFrame();
  const dur = useSceneDur();
  const photo = appearAt(frame, s.photoAt, dur, { fadeIn: 30, rise: 10 });
  const drift = 1 + 0.03 * progressAt(frame, s.photoAt[0], s.photoAt[1] - s.photoAt[0]); // ≤ 5% Ken Burns
  const brassLine = appearAt(frame, [s.swatches[2].at![0] + 0.3, s.brassLineOut], dur, { fadeIn: 24, fadeOut: 24 });

  const swatch = (i: number, fill: string, border: string, inner?: React.ReactNode) => (
    <Reveal
      key={i}
      at={s.swatches[i].at}
      rise={8}
      style={{ position: 'absolute', left: 150 + i * 290, top: 176, width: 260 }}
    >
      <div style={{ position: 'relative', height: 150, background: fill, border: `1px solid ${border}`, borderRadius: 4 }}>{inner}</div>
      <div style={{ marginTop: 14, fontFamily: FONT.sans, fontSize: 22, color: C.navy2 }}>{tr(s.swatches[i])}</div>
    </Reveal>
  );

  return (
    <>
      {/* Part 1: Bill. */}
      {photo.opacity > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 200,
            top: 176 + photo.y,
            width: 520,
            height: 616,
            opacity: photo.opacity,
            transform: 'rotate(-2.6deg)',
            background: '#fffdf8',
            boxShadow: '0 22px 50px rgba(14,34,51,0.14), 0 2px 6px rgba(14,34,51,0.10)',
            border: `1px solid ${C.rule}`,
          }}
        >
          <div style={{ position: 'absolute', left: 30, top: 30, width: 460, height: 460, overflow: 'hidden', background: C.mist }}>
            <Img
              src={staticFile('photos/bill-portrait.jpg')}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${drift})` }}
            />
          </div>
        </div>
      ) : null}
      {s.pairs.map((pair, i) => (
        <React.Fragment key={i}>
          <SerifLine line={pair.head} size={84} weight={300} style={{ left: 880, top: 360 }} />
          <SerifLine line={pair.tail} size={46} weight={300} italic color={C.inkSoft} style={{ left: 886, top: 474 }} />
        </React.Fragment>
      ))}
      <Caption line={s.caption} />

      {/* Part 2: the identity board. */}
      <Reveal at={s.label.at} rise={6} style={{ position: 'absolute', left: 150, top: 116 }}>
        <SmallCaps size={17} color={C.inkSoft} spacing="0.22em">
          {tr(s.label)}
        </SmallCaps>
      </Reveal>
      {swatch(0, C.paper, C.rule)}
      {swatch(1, C.ink, C.ink)}
      {swatch(
        2,
        C.paper,
        C.rule,
        <div
          style={{
            position: 'absolute',
            left: 28,
            right: 28,
            top: 74,
            height: 2,
            background: C.brass,
            opacity: brassLine.opacity,
          }}
        />,
      )}
      <SerifLine line={s.serifLine} size={50} weight={300} style={{ left: 150, top: 420 }} />
      <Reveal
        at={s.sansLine.at}
        style={{ position: 'absolute', left: 152, top: 500, fontFamily: FONT.sans, fontWeight: 400, fontSize: 40, color: C.ink }}
      >
        {tr(s.sansLine)}
      </Reveal>

      <Reveal at={s.logoLine.at} rise={8} style={{ position: 'absolute', left: 1180, top: 150, width: 600 }}>
        {ASSETS.lockup ? (
          <Img src={staticFile(ASSETS.lockup)} style={{ width: 420, height: 170, objectFit: 'contain', objectPosition: 'left center' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <Mark size={104} />
            <div style={{ fontFamily: FONT.serif, fontWeight: 300, fontSize: 64, color: C.ink, letterSpacing: '-0.01em' }}>Bill Badran</div>
          </div>
        )}
        <div style={{ marginTop: 26, fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 300, fontSize: 30, lineHeight: 1.3, color: C.inkSoft }}>
          {tr(s.logoLine)}
        </div>
      </Reveal>

      <Reveal
        at={s.never.at}
        rise={8}
        style={{
          position: 'absolute',
          left: 150,
          top: 610,
          width: 940,
          boxSizing: 'border-box',
          padding: '22px 28px',
          border: `1.5px dashed ${C.blueGrey}`,
          borderRadius: 4,
          fontFamily: FONT.sans,
          fontSize: 27,
          lineHeight: 1.35,
          color: C.navy2,
        }}
      >
        {tr(s.never)}
      </Reveal>

      <InkDrawing name="sailboat" start={s.sailboatAt} dur={2.2} width={500} style={{ left: 1300, top: 470 }} />

      <SerifLine line={s.goal} size={46} weight={300} style={{ left: 150, top: 800, width: 1200 }}>
        {tr(s.goal)}{' '}
        <span style={{ position: 'relative', display: 'inline-block', fontStyle: 'italic' }}>
          {tr(s.goalQuote)}
          <Underline start={s.underlineAt} dur={1.0} color={C.brass} width={3} offset={0} seed={23} />
        </span>
      </SerifLine>
    </>
  );
};
