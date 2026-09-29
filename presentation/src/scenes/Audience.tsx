import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, EASE_SOFT, FONT } from '../brand';
import { SCENES, tr } from '../content';
import { Caption, Handwrite, InkDrawing, SerifLine, Stroke, Underline } from '../primitives/basics';
import { Couple, Drift, Jar, QuoteCard } from '../primitives/objects';
import { ellipse, line } from '../primitives/pen';
import { Reveal, appearAt, progressAt, useSceneDur } from '../primitives/time';

/** S03 — Who they are. 58 and 60, seven accounts, one question. */
export const S03: React.FC = () => {
  const s = SCENES.s03;
  const frame = useCurrentFrame();
  const dur = useSceneDur();
  // The couple, the path, the jars and the ages all leave together at 13.5 s.
  const first = appearAt(frame, [0, 13.5], dur, { fadeIn: 1, fadeOut: 24 });
  const coupleIn = appearAt(frame, [2.2, 13.5], dur, { fadeIn: 30 });
  const jars = [
    { x: 1110, y: 188, w: 112, h: 150 },
    { x: 1392, y: 150, w: 124, h: 168 },
    { x: 1664, y: 226, w: 104, h: 140 },
    { x: 1232, y: 420, w: 118, h: 158 },
    { x: 1540, y: 448, w: 112, h: 150 },
  ];
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, opacity: first.opacity }}>
        <InkDrawing name="path" start={0.3} dur={2.4} width={760} style={{ left: 110, top: 262 }} />
        <div style={{ opacity: coupleIn.opacity }}>
          <Couple x={527} y={604} h={62} />
        </div>
        {jars.map((j, i) => (
          <Jar key={i} x={j.x} y={j.y} w={j.w} h={j.h} start={s.jars[i].at![0]} seed={40 + i * 7} tone={i % 2 ? C.stone : C.blueGrey} />
        ))}
      </div>
      <Handwrite line={s.ages} size={104} tilt={-2} color={C.ink} style={{ left: 150, top: 96 }} />
      {s.jars.map((l, i) => (
        <Handwrite
          key={i}
          line={{ ...l, at: [l.at![0] + 0.5, l.at![1]] }}
          size={40}
          tilt={i % 2 ? 1.5 : -1.5}
          centerX={jars[i].x + jars[i].w / 2}
          style={{ top: jars[i].y + jars[i].h + 10 }}
        />
      ))}
      {s.beats.map((b, i) => (
        <SerifLine key={i} line={b} size={80} weight={300} style={{ left: 1100, top: 742 }} />
      ))}
      <SerifLine line={s.hero} size={120} weight={300} style={{ left: 0, right: 0, top: 424, textAlign: 'center' }} />
      <Drift line={s.thoughts[0]} x={250} y={236} size={50} tilt={-3} seed={1} />
      <Drift line={s.thoughts[1]} x={1240} y={218} size={50} tilt={2} seed={2} />
      <Drift line={s.thoughts[2]} x={300} y={690} size={50} tilt={2} seed={3} />
      <Drift line={s.thoughts[3]} x={1150} y={712} size={50} tilt={-2} seed={4} />
      <Caption line={s.caption} />
    </>
  );
};

/** S04 — Why they look for an advisor: the question changes, everyone sits at one table. */
export const S04: React.FC = () => {
  const s = SCENES.s04;
  const frame = useCurrentFrame();
  const dur = useSceneDur();

  // Part 2: the table.
  const cx = 960;
  const cy = 474;
  const R = 150;
  const seatR = 236;
  const n = s.seats.length;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const tableBlock = appearAt(frame, [s.tableFrom, 19.6], dur, { fadeIn: 12, fadeOut: 20 });
  const tableP = progressAt(frame, s.tableFrom, 1.1, EASE_SOFT);
  const tableWash = progressAt(frame, s.tableFrom + 0.6, 0.9);
  const spokes = progressAt(frame, s.spokesAt, 1.0, EASE_SOFT);

  return (
    <>
      {/* Part 1: the question changes. */}
      <Reveal at={s.was.at} fadeOut={12} style={{ position: 'absolute', left: 0, right: 0, top: 368, textAlign: 'center', fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 300, fontSize: 46, color: C.inkSoft }}>
        {tr(s.was)}
      </Reveal>
      <Reveal at={s.grow.at} fadeOut={12} style={{ position: 'absolute', left: 0, right: 0, top: 444, textAlign: 'center', fontFamily: FONT.serif, fontWeight: 300, fontSize: 96, lineHeight: 1.18, letterSpacing: '-0.012em', color: C.ink }}>
        {tr(s.grow)}
      </Reveal>
      <SerifLine line={s.now} size={46} weight={300} italic color={C.inkSoft} style={{ left: 0, right: 0, top: 300, textAlign: 'center' }} />
      <SerifLine line={s.become} size={96} weight={300} style={{ left: 0, right: 0, top: 376, textAlign: 'center' }} />
      <SerifLine line={s.becomeTail} size={96} weight={300} style={{ left: 0, right: 0, top: 492, textAlign: 'center' }}>
        <span style={{ position: 'relative', display: 'inline-block' }}>
          {tr(s.becomeTail)}
          <Underline start={s.underlineAt} dur={0.9} color={C.brass} width={3.2} offset={-2} seed={11} />
        </span>
      </SerifLine>

      {/* Part 2: one table, nine seats. */}
      {tableBlock.opacity > 0 ? (
        <div style={{ position: 'absolute', inset: 0, opacity: tableBlock.opacity }}>
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
            <circle cx={cx} cy={cy} r={R} fill={C.stone} opacity={0.32 * tableWash} />
            <Stroke d={ellipse(cx, cy, R, R, 17, 0.06)} p={tableP} width={2.2} />
            {s.seats.map((seat, i) => {
              const a = ang(i);
              const x = cx + Math.cos(a) * seatR;
              const y = cy + Math.sin(a) * seatR;
              const o = progressAt(frame, seat.at![0], 0.6);
              const sp = spokes;
              const x1 = cx + Math.cos(a) * (R + 6);
              const y1 = cy + Math.sin(a) * (R + 6);
              const x2 = cx + Math.cos(a) * (seatR - 30);
              const y2 = cy + Math.sin(a) * (seatR - 30);
              return (
                <g key={i}>
                  <g opacity={o}>
                    <circle cx={x} cy={y} r={26} fill={C.paper2} />
                    <Stroke d={ellipse(x, y, 26, 26, 30 + i, 0.08)} p={progressAt(frame, seat.at![0], 0.6, EASE_SOFT)} width={1.8} />
                  </g>
                  <Stroke d={line(x2, y2, x1, y1, 60 + i, 0.4)} p={sp} width={1.1} color={C.navy2} opacity={0.7} />
                </g>
              );
            })}
          </svg>
          {s.seats.map((seat, i) => {
            const a = ang(i);
            const lx = cx + Math.cos(a) * (seatR + 44);
            const ly = cy + Math.sin(a) * (seatR + 44);
            const c = Math.cos(a);
            const tx = c > 0.25 ? '0%' : c < -0.25 ? '-100%' : '-50%';
            return (
              <Reveal
                key={i}
                at={seat.at}
                rise={6}
                style={{
                  position: 'absolute',
                  left: lx,
                  top: ly,
                  transform: `translate(${tx}, -50%)`,
                  fontFamily: FONT.sans,
                  fontSize: 27,
                  color: C.navy2,
                  whiteSpace: 'nowrap',
                }}
              >
                {tr(seat)}
              </Reveal>
            );
          })}
          <SerifLine
            line={s.centre}
            size={34}
            weight={300}
            italic
            color={C.ink}
            style={{ left: cx - 120, width: 240, top: cy - 44, textAlign: 'center', lineHeight: 1.2 }}
          />
          <Handwrite line={s.same} size={58} tilt={-1.2} color={C.ink} centerX={960} style={{ top: 850 }} />
        </div>
      ) : null}

      {/* Part 3: in their words. */}
      <SerifLine line={s.looking} size={52} weight={300} style={{ left: 96, top: 132, width: 1600, lineHeight: 1.18 }} />
      {s.quotes.map((q, i) => (
        <QuoteCard key={i} line={q} footer={s.quoteFooter} style={{ left: 87 + i * 354, top: 400 }} />
      ))}
    </>
  );
};

