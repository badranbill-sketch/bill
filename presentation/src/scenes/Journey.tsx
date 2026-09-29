import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { PLATES } from '../assets';
import { C, EASE, EASE_SOFT, FONT } from '../brand';
import { JOURNEY, SCENES, STARTS, tr, type SceneKey, type Status } from '../content';
import { Caption, CornerStatus, Handwrite, InkDrawing, SerifLine, SmallCaps, Stroke } from '../primitives/basics';
import {
  BookCover,
  BookFlip,
  DecisionCard,
  Envelope,
  Flywheel,
  Post,
  QrPending,
  Signpost,
} from '../primitives/objects';
import { ellipse, line, poly, smooth, wave } from '../primitives/pen';
import { Reveal, appearAt, progressAt, sec, stagger, useSceneDur } from '../primitives/time';

/* ------------------------------------------------------------------ Journey frame */

/** The signpost (top left, the prospect's thought) and the status tag (top right). */
const JourneyFrame: React.FC<{ k: number; status: Status }> = ({ k, status }) => {
  const label = JOURNEY[k];
  const plank = Math.max(250, tr(label).length * 19 + 70);
  return (
    <>
      <Signpost start={0.15} label={label} plank={plank} x={70} y={34} seed={11 + k * 3} scale={0.92} />
      <CornerStatus status={status} />
    </>
  );
};

/* ------------------------------------------------------------------ S06 */

const PATH_PTS: [number, number][] = [
  [40, 952],
  [300, 900],
  [560, 948],
  [860, 872],
  [1130, 905],
  [1420, 812],
  [1660, 790],
  [1890, 700],
];

/** Point on the S06 path (by x, linear between control points — good enough to plant a post). */
const pathY = (x: number) => {
  for (let i = 0; i < PATH_PTS.length - 1; i++) {
    const [ax, ay] = PATH_PTS[i];
    const [bx, by] = PATH_PTS[i + 1];
    if (x >= ax && x <= bx) {
      const t = (x - ax) / (bx - ax);
      const tt = t * t * (3 - 2 * t);
      return ay + (by - ay) * tt;
    }
  }
  return PATH_PTS[PATH_PTS.length - 1][1];
};

/** S06 — Five moments along one winding path; five empty signposts. */
export const S06: React.FC = () => {
  const s = SCENES.s06;
  const frame = useCurrentFrame();
  const p = progressAt(frame, s.pathFrom, 2.0, EASE_SOFT);
  const d = smooth(PATH_PTS);
  const posts = [300, 640, 1000, 1330, 1640];
  return (
    <>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <Stroke d={d} p={p} color={C.stone} width={74} opacity={0.42} />
        <Stroke d={d} p={p} color={C.ink} width={2} />
      </svg>
      {posts.map((x, i) => (
        <Signpost
          key={i}
          start={s.postsFrom + i * s.postsEvery}
          plank={150}
          scale={0.74}
          x={x - 34}
          y={pathY(x) - 170}
          seed={70 + i * 5}
          drawDur={0.8}
        />
      ))}
      <SerifLine line={s.heading} size={64} weight={300} style={{ left: 120, top: 150, width: 1500 }} />
    </>
  );
};

/* ------------------------------------------------------------------ Journey rail */

const RAIL_Y = 1046;
const RAIL_POSTS = [250, 600, 950, 1300, 1650];
const RAIL_SCENES: SceneKey[] = ['s07', 's08', 's09', 's10', 's11'];

/** A thin wavy line along the bottom with five flag-posts; a dot travels it from S07 to S11. */
export const JourneyRail: React.FC = () => {
  const frame = useCurrentFrame(); // frames since the start of S07
  const t0 = STARTS.s07;
  const total = RAIL_SCENES.reduce((a, k) => a + SCENES[k].dur, 0);
  const w = wave(110, 1810, RAIL_Y, 5, 300, 9);
  const t = frame / 30;
  const fade = interpolate(frame, [0, 24, sec(total) - 20, sec(total)], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // The dot rests at post k during scene k, reaching it 1.5 s in; it travels across the cut.
  const keys = RAIL_SCENES.map((k) => STARTS[k] - t0 + 1.5);
  const xs = RAIL_POSTS;
  const TRAVEL = 2.2;
  const inT: number[] = [0];
  const outX: number[] = [110];
  keys.forEach((kt, k) => {
    inT.push(kt);
    outX.push(xs[k]);
    if (k < keys.length - 1) {
      inT.push(keys[k + 1] - TRAVEL);
      outX.push(xs[k]);
    }
  });
  const x = interpolate(t, inT, outX, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
  const draw = progressAt(frame, 0, 1.4, EASE_SOFT);
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: fade }}>
      <Stroke d={w.d} p={draw} color={C.blueGrey} width={1.6} />
      {xs.map((px, k) => {
        const reached = t >= keys[k] - 0.2;
        const py = w.at(px);
        const o = progressAt(frame, 0.3 + k * 0.15, 0.5);
        return (
          <g key={k} opacity={o}>
            <line x1={px} x2={px} y1={py} y2={py - 26} stroke={C.ink} strokeWidth={1.4} strokeLinecap="round" />
            <path
              d={`M${px} ${py - 26} L${px + 14} ${py - 21} L${px} ${py - 16}Z`}
              fill={reached ? C.ink : C.paper}
              stroke={C.ink}
              strokeWidth={1.2}
              strokeLinejoin="round"
            />
          </g>
        );
      })}
      <circle cx={x} cy={w.at(x)} r={6.5} fill={C.ink} />
    </svg>
  );
};

/* ------------------------------------------------------------------ S07 */

/** S07 — Social content: five recurring series, two real posts, the weekly rhythm. */
export const S07: React.FC = () => {
  const s = SCENES.s07;
  const frame = useCurrentFrame();
  const dur = useSceneDur();
  return (
    <>
      <JourneyFrame k={0} status={s.status} />
      {s.franchises.map((f, i) => {
        const a = appearAt(frame, f.name.at, dur, { fadeIn: 24, fadeOut: 22, rise: 10 });
        if (a.opacity <= 0) return null;
        const out = progressAt(frame, 10, 0.8, EASE);
        const rot = (i - 2) * 6 * (1 + out * 0.6);
        const dx = (i - 2) * (182 + out * 60);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 960 - 130 + dx,
              top: 330 + Math.abs(i - 2) * 16 + a.y,
              width: 260,
              height: 390,
              opacity: a.opacity,
              transform: `rotate(${rot}deg)`,
              transformOrigin: '50% 120%',
              background: C.paper2,
              border: `1px solid ${C.rule}`,
              borderRadius: 6,
              boxShadow: '0 12px 30px rgba(14,34,51,0.08)',
              padding: '34px 26px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontFamily: FONT.serif, fontWeight: 400, fontSize: 36, lineHeight: 1.12, color: C.ink }}>{tr(f.name)}</div>
            <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 300, fontSize: 25, color: C.inkSoft }}>{tr(f.note)}</div>
          </div>
        );
      })}
      <Post line={s.posts[0]} size={440} textSize={38} style={{ left: 130, top: 250 }} />
      <Post line={s.posts[1]} size={440} textSize={33} style={{ left: 610, top: 250 }} />
      {s.rhythm.map((r, i) => (
        <Reveal
          key={i}
          at={r.day.at}
          rise={8}
          style={{
            position: 'absolute',
            left: 1170,
            top: 282 + i * 84,
            width: 610,
            height: 84,
            borderTop: `1px solid ${C.rule}`,
            borderBottom: i === 2 ? `1px solid ${C.rule}` : undefined,
            display: 'flex',
            alignItems: 'center',
            gap: 34,
          }}
        >
          <SmallCaps size={18} color={C.inkSoft} spacing="0.2em" style={{ width: 60 }}>
            {tr(r.day)}
          </SmallCaps>
          <span style={{ fontFamily: FONT.serif, fontWeight: 300, fontSize: 36, color: C.ink }}>{tr(r.what)}</span>
        </Reveal>
      ))}
      <SerifLine line={s.ratio} size={28} weight={300} italic color={C.inkSoft} style={{ left: 1170, top: 560, width: 610 }} />
      <Reveal at={s.rule.at} style={{ position: 'absolute', left: 130, top: 752, width: 1000, paddingLeft: 34 }}>
        <svg width={4} height={112} style={{ position: 'absolute', left: 0, top: 4 }}>
          <path d={line(2, 0, 2, 110, 5, 0.5)} stroke={C.ink} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        </svg>
        <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 300, fontSize: 40, lineHeight: 1.26, color: C.ink }}>
          {tr(s.rule)}
        </div>
      </Reveal>
    </>
  );
};

/* ------------------------------------------------------------------ S08 */

/** A soft, stylised map of Laval: an island between two rivers, a few roads, one pin. */
const LavalMap: React.FC<{ x: number; y: number; w: number; h: number }> = ({ x, y, w, h }) => {
  const frame = useCurrentFrame();
  const p = progressAt(frame, 0.3, 1.6, EASE_SOFT);
  const wash = progressAt(frame, 0.5, 1.2);
  const pin = appearAt(frame, [1.4, 99], 99, { fadeIn: 20, rise: 12 });
  const island: [number, number][] = [
    [110, 330], [190, 250], [320, 214], [470, 200], [600, 226], [680, 290], [650, 380],
    [560, 430], [430, 470], [300, 466], [180, 430],
  ];
  const cx = 400;
  const cy = 330;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: C.mist, borderRadius: 10, overflow: 'hidden' }}>
      <svg viewBox="0 0 760 640" width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
        {/* Rivers: one band above the island, one below. */}
        <path d={smooth([[-20, 190], [150, 150], [360, 140], [560, 150], [780, 200]])} stroke={C.blueGrey} strokeWidth={46} fill="none" opacity={0.45 * wash} strokeLinecap="round" />
        <path d={smooth([[-20, 500], [200, 520], [420, 520], [620, 480], [780, 430]])} stroke={C.blueGrey} strokeWidth={60} fill="none" opacity={0.45 * wash} strokeLinecap="round" />
        <path d={smooth([...island, island[0], island[1]])} fill={C.paper2} opacity={0.95 * wash} />
        <path d={smooth([...island, island[0], island[1]])} fill={C.stone} opacity={0.28 * wash} />
        <Stroke d={smooth([...island, island[0], island[1]])} p={p} width={2} color={C.navy2} />
        {/* A few roads. */}
        <Stroke d={line(160, 300, 640, 330, 3, 0.8)} p={stagger(p, 1, 4)} width={3} color={C.stone} />
        <Stroke d={line(330, 214, 380, 462, 4, 0.8)} p={stagger(p, 2, 4)} width={3} color={C.stone} />
        <Stroke d={line(520, 220, 470, 450, 5, 0.8)} p={stagger(p, 3, 4)} width={3} color={C.stone} />
        <Stroke d={poly([[200, 400], [320, 360], [460, 380], [600, 340]], false, 6, 0.8)} p={stagger(p, 3, 4)} width={2.4} color={C.stone} />
        <g opacity={pin.opacity} transform={`translate(0 ${-pin.y})`}>
          <ellipse cx={cx} cy={cy + 2} rx={9} ry={3} fill={C.ink} opacity={0.18} />
          <path d={`M${cx} ${cy} C${cx - 6} ${cy - 16} ${cx - 22} ${cy - 30} ${cx - 22} ${cy - 46} A22 22 0 1 1 ${cx + 22} ${cy - 46} C${cx + 22} ${cy - 30} ${cx + 6} ${cy - 16} ${cx} ${cy}Z`} fill={C.ink} />
          <circle cx={cx} cy={cy - 46} r={8} fill={C.mist} />
        </g>
      </svg>
    </div>
  );
};

/** S08 — Google and local trust. */
export const S08: React.FC = () => {
  const s = SCENES.s08;
  return (
    <>
      <JourneyFrame k={1} status={s.status} />
      <LavalMap x={130} y={236} w={760} h={640} />
      <Handwrite line={s.place} at={[1.9, 15]} size={50} weight={500} tilt={-2} color={C.ink} style={{ left: 566, top: 500 }} />
      <Reveal
        at={s.profile.at}
        style={{
          position: 'absolute',
          left: 990,
          top: 236,
          width: 800,
          height: 400,
          boxSizing: 'border-box',
          background: C.paper2,
          border: `1px solid ${C.rule}`,
          borderRadius: 6,
          padding: '34px 40px',
        }}
      >
        <div style={{ fontFamily: FONT.serif, fontWeight: 300, fontSize: 50, lineHeight: 1.1, color: C.ink }}>{tr(s.profile)}</div>
        <div style={{ height: 1, background: C.rule, margin: '26px 0 12px' }} />
      </Reveal>
      {s.checklist.map((c, i) => (
        <Reveal
          key={i}
          at={c.at}
          rise={6}
          style={{ position: 'absolute', left: 1030, top: 384 + i * 58, display: 'flex', alignItems: 'center', gap: 20 }}
        >
          <svg width={30} height={30}>
            <circle cx={15} cy={15} r={12} fill="none" stroke={C.blueGrey} strokeWidth={1.8} strokeDasharray="4 4" />
          </svg>
          <span style={{ fontFamily: FONT.sans, fontSize: 29, color: C.navy2 }}>{tr(c)}</span>
        </Reveal>
      ))}
      <SerifLine line={s.reviews} size={36} weight={300} style={{ left: 990, top: 672, width: 800, lineHeight: 1.26 }} />
      <SerifLine line={s.compliance} size={26} weight={300} italic color={C.inkSoft} style={{ left: 990, top: 800, width: 800 }} />
      <Caption line={s.caption} bottom={92} />
    </>
  );
};

/* ------------------------------------------------------------------ S09 */

/** S09 — The guide: the book turns slowly; the prospect's thoughts; the French edition decision. */
export const S09: React.FC = () => {
  const s = SCENES.s09;
  const frame = useCurrentFrame();
  const flowX = 780;
  const boxW = 214;
  const gap = 64;
  return (
    <>
      <JourneyFrame k={2} status={s.status} />
      <BookFlip x={96} y={262} pageW={320} pageH={456} start={s.flipFrom} every={s.flipEvery} plates={PLATES} />
      <SerifLine line={s.heading} size={56} weight={300} style={{ left: 780, top: 214, width: 1000, lineHeight: 1.16 }} />
      {s.thoughts.map((t, i) => (
        <Handwrite key={i} line={t} size={44} tilt={i % 2 ? 0.8 : -0.8} color={C.navy2} style={{ left: 784, top: 388 + i * 70 }} />
      ))}
      <DecisionCard
        at={s.decision.title.at}
        title={s.decision.title}
        body={s.decision.body}
        footer={s.decision.footer}
        status="needsBill"
        w={400}
        h={360}
        titleSize={36}
        bodySize={22}
        style={{ left: 1420, top: 360 }}
      />
      {s.flow.map((f, i) => {
        const x = flowX + i * (boxW + gap);
        const o = progressAt(frame, f.at![0] + 0.3, 0.5);
        return (
          <React.Fragment key={i}>
            <Reveal
              at={f.at}
              rise={6}
              style={{
                position: 'absolute',
                left: x,
                top: 786,
                width: boxW,
                height: 76,
                boxSizing: 'border-box',
                border: `1.5px solid ${C.ink}`,
                borderRadius: 4,
                background: C.paper,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONT.sans,
                fontSize: 25,
                color: C.ink,
              }}
            >
              {tr(f)}
            </Reveal>
            {i < s.flow.length - 1 ? (
              <svg width={gap} height={76} style={{ position: 'absolute', left: x + boxW, top: 786, opacity: o }}>
                <path d={`M12 38 H${gap - 12} M${gap - 22} 30 L${gap - 12} 38 L${gap - 22} 46`} stroke={C.navy2} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </React.Fragment>
        );
      })}
      <Handwrite line={s.welcome} size={40} tilt={-1.5} color={C.navy2} style={{ left: 1480, top: 880 }} />
    </>
  );
};

/* ------------------------------------------------------------------ S10 */

/** A small drawn loop arrow. */
const LoopArrow: React.FC<{ x: number; y: number; size: number; start: number }> = ({ x, y, size, start }) => {
  const frame = useCurrentFrame();
  const p = progressAt(frame, start, 1.0, EASE_SOFT);
  const r = size / 2 - 6;
  const c = size / 2;
  const d = ellipse(c, c, r, r * 0.86, 5, -0.14, -1.2);
  const head = `M${c + r * Math.cos(-1.2 + 2 * Math.PI * 0.86) - 12} ${c + r * 0.86 * Math.sin(-1.2 + 2 * Math.PI * 0.86) - 6}l12 6l-4 12`;
  return (
    <svg width={size} height={size} style={{ position: 'absolute', left: x, top: y, overflow: 'visible' }}>
      <Stroke d={d} p={p} width={2.2} />
      {p > 0.97 ? <path d={head} stroke={C.ink} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
    </svg>
  );
};

/** S10 — Nurture: seven emails, a monthly live session, two-chair evenings. */
export const S10: React.FC = () => {
  const s = SCENES.s10;
  const W = 190;
  const GAP = 42;
  const x0 = (1920 - (7 * W + 6 * GAP)) / 2;
  return (
    <>
      <JourneyFrame k={3} status={s.status} />
      {s.envelopes.map((e, i) => (
        <React.Fragment key={i}>
          <Envelope x={x0 + i * (W + GAP)} y={262} w={W} start={e.at![0]} seed={200 + i * 9} />
          <Reveal
            at={[e.at![0] + 0.3, e.at![1]]}
            rise={6}
            style={{
              position: 'absolute',
              left: x0 + i * (W + GAP) - 16,
              width: W + 32,
              top: 406,
              textAlign: 'center',
              fontFamily: FONT.sans,
              fontSize: 23,
              lineHeight: 1.25,
              color: C.navy2,
            }}
          >
            <span style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 15, letterSpacing: '0.14em', color: C.inkSoft, display: 'block', marginBottom: 6 }}>
              {i + 1}
            </span>
            {tr(e)}
          </Reveal>
        </React.Fragment>
      ))}
      <Reveal
        at={s.session.at}
        style={{
          position: 'absolute',
          left: 150,
          top: 560,
          width: 860,
          boxSizing: 'border-box',
          padding: '30px 36px',
          border: `1.5px solid ${C.ink}`,
          borderRadius: 4,
          background: C.paper2,
        }}
      >
        <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 300, fontSize: 40, lineHeight: 1.22, color: C.ink }}>
          {tr(s.session)}
        </div>
        <Reveal at={s.sessionNote.at} rise={6} style={{ marginTop: 18, fontFamily: FONT.sans, fontSize: 25, color: C.navy2 }}>
          {tr(s.sessionNote)}
        </Reveal>
      </Reveal>
      <LoopArrow x={1110} y={574} size={84} start={s.loop.at![0]} />
      <SerifLine line={s.loop} size={38} weight={300} style={{ left: 1224, top: 572, width: 560, lineHeight: 1.22 }} />
      <SerifLine line={s.evenings} size={30} weight={300} italic color={C.inkSoft} style={{ left: 150, top: 830, width: 1500 }} />
    </>
  );
};

/* ------------------------------------------------------------------ S11 */

/** S11 — The first meeting, two books, and the referral loop. */
export const S11: React.FC = () => {
  const s = SCENES.s11;
  const frame = useCurrentFrame();
  const dur = useSceneDur();
  const books = appearAt(frame, s.booksAt, dur, { fadeIn: 30, rise: 12 });
  return (
    <>
      <JourneyFrame k={4} status={s.status} />
      <InkDrawing name="chairs-table" start={s.chairsAt} dur={3.2} width={600} style={{ left: 104, top: 214 }} />
      <SerifLine line={s.meeting} size={36} weight={300} style={{ left: 120, top: 486, width: 640, lineHeight: 1.28 }} />
      {books.opacity > 0 ? (
        <div style={{ position: 'absolute', inset: 0, opacity: books.opacity, transform: `translateY(${books.y}px)` }}>
          <BookCover w={150} h={214} style={{ left: 126, top: 704, transform: 'rotate(-5deg)' }} />
          <BookCover w={150} h={214} style={{ left: 218, top: 690, transform: 'rotate(3deg)' }} />
        </div>
      ) : null}
      <Handwrite line={s.books} size={36} wrap={430} lineHeight={1.12} tilt={-0.6} color={C.navy2} style={{ left: 420, top: 686 }} />
      <Reveal at={s.qr.at} rise={6} style={{ position: 'absolute', left: 420, top: 862, display: 'flex', alignItems: 'center', gap: 18 }}>
        <QrPending size={104} style={{ border: `1px solid ${C.rule}`, padding: 6, boxSizing: 'content-box' }} />
        <span style={{ fontFamily: FONT.sans, fontSize: 24, color: C.navy2 }}>{tr(s.qr)}</span>
      </Reveal>
      <Flywheel cx={1400} cy={574} r={246} labels={s.wheel} start={s.wheelFrom} step={s.wheelStep} />
    </>
  );
};

