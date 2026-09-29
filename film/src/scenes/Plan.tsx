import React from 'react';
import {BillPrint, BrassLine, Handwriting, HandStyle, InkDrawing, Pt} from '../components/sketch';
import {useT} from '../components/stage';
import {copy} from '../design/copy';
import {ease, tween} from '../design/motion';
import {sketch} from '../design/palette';
import {sketchType} from '../design/typography';
import {at, wordAt} from '../timing/timing';
import {SCENES} from '../timing/scenes';

// D1 · plan — "We start with you: your family, your priorities, your goals. Then we look at the whole picture —
// your investments, taxes, insurance, retirement, and estate planning — and build one coordinated plan. A plan we
// revisit as your life changes."
// Conversation → connection → calm. Bill (continuing from the approach scene) listens while the conversation drawing
// (two cups, an open notebook) draws itself beside him and "you" is written above the table, with what matters close
// around it. Then the page opens to the whole picture: the money notes, small and quiet, a little further out. On
// "build one coordinated plan" the brass line runs through every note in one unhurried spiral and ends under "one
// plan" (the only chime in the film). On "revisit" the page clears to the calm sea and the line lies down as its
// horizon, y 610, with the years written along it.

const HORIZON = 610;

// ---- the notes ------------------------------------------------------------------------------------------------------
// Caveat's vertical metrics (ascent 0.96, descent 0.30 em): the baseline sits this far below the top of a line box.
const baselineOf = (variant: HandStyle, size: number) => {
  const lh = sketchType[variant].lineHeight;
  return ((lh - 1.26) / 2 + 0.96) * size;
};

type Note = {
  text: string;
  left: number;
  top: number;
  variant: HandStyle;
  size: number;
  /** Measured advance of the text at `size` (Caveat), for the underline the brass line draws under it. Measured for
   *  the English copy: re-measure if copy.plan changes (or for LANG = 'fr'). */
  w: number;
  rotate: number;
  color: string;
  speed: number;
  cue: number;
};

const note = (n: Omit<Note, 'size'> & {size?: number}): Note => ({size: sketchType[n.variant].fontSize, ...n});

/** The two ends of the line under a note, in the direction the pen travels ('>' left to right). */
const under = (n: Note, dir: '>' | '<', drop = 0.24, pad = 10): Pt[] => {
  const y = baselineOf(n.variant, n.size) + n.size * drop;
  const r = (n.rotate * Math.PI) / 180;
  const p = (dx: number): Pt => [n.left + dx * Math.cos(r) - y * Math.sin(r), n.top + dx * Math.sin(r) + y * Math.cos(r)];
  const a = p(-pad);
  const b = p(n.w + pad);
  return dir === '>' ? [a, b] : [b, a];
};

export const Plan: React.FC<{from: number; to: number}> = ({from}) => {
  const t = useT();

  // All positions are the page as it is once the whole picture is up. While Bill is on the page (beat 1) the life
  // words sit PAN higher-left, above the conversation drawing; on "Then we look at the whole picture" the page pans
  // slowly so that "you" comes to the centre, as the drawing and Bill leave.
  const PAN: Pt = [100, 110];

  // Life, close to the centre.
  const you = note({
    text: copy.plan.you,
    left: 750,
    top: 376,
    variant: 'handLarge',
    size: 112,
    w: 120,
    rotate: -1.5,
    color: sketch.ink,
    speed: 10,
    cue: wordAt('start-you', 'you', 's', -0.15),
  });
  const family = note({
    text: copy.plan.family,
    left: 650,
    top: 300,
    variant: 'hand',
    size: 58,
    w: 118,
    rotate: -2.5,
    color: sketch.ink,
    speed: 16,
    cue: wordAt('family', 'family', 's', -0.12),
  });
  const priorities = note({
    text: copy.plan.priorities,
    left: 990,
    top: 290,
    variant: 'hand',
    size: 58,
    w: 176,
    rotate: 1.5,
    color: sketch.ink,
    speed: 22,
    cue: wordAt('priorities', 'priorities', 's', -0.12),
  });
  const goals = note({
    text: copy.plan.goals,
    left: 1000,
    top: 480,
    variant: 'hand',
    size: 58,
    w: 95,
    rotate: -1,
    color: sketch.ink,
    speed: 16,
    cue: wordAt('goals', 'goals', 's', -0.12),
  });
  // Money, a little further out: small and quiet, around the life words.
  const investments = note({
    text: copy.plan.investments,
    left: 290,
    top: 384,
    variant: 'note',
    w: 264,
    rotate: -1.5,
    color: sketch.inkSoft,
    speed: 22,
    cue: at('investments', -0.1),
  });
  const taxes = note({
    text: copy.plan.taxes,
    left: 400,
    top: 640,
    variant: 'note',
    w: 71,
    rotate: 1,
    color: sketch.inkSoft,
    speed: 16,
    cue: at('taxes', -0.1),
  });
  const insurance = note({
    text: copy.plan.insurance,
    left: 720,
    top: 718,
    variant: 'note',
    w: 131,
    rotate: -1,
    color: sketch.inkSoft,
    speed: 20,
    cue: at('insurance', -0.1),
  });
  const retirement = note({
    text: copy.plan.retirement,
    left: 1062,
    top: 680,
    variant: 'note',
    w: 452,
    rotate: 1,
    color: sketch.inkSoft,
    speed: 30,
    cue: at('retirement-area', -0.1),
  });
  const estate = note({
    text: copy.plan.estate,
    left: 1300,
    top: 194,
    variant: 'note',
    w: 152,
    rotate: -1.5,
    color: sketch.inkSoft,
    speed: 20,
    cue: wordAt('estate', 'estate', 's', -0.15),
  });
  const onePlan = note({
    text: copy.plan.one,
    left: 790,
    top: 150,
    variant: 'handLarge',
    w: 236,
    rotate: -1,
    color: sketch.ink,
    speed: 14,
    cue: wordAt('build', 'one', 's', -0.1),
  });
  const notes = [you, family, priorities, goals, investments, taxes, insurance, retirement, estate, onePlan];

  // ---- beats ---------------------------------------------------------------------------------------------------------
  const billOut = tween(t, at('whole', -0.15), at('whole', -0.15) + 20, 1, 0, ease.soft); // after "your goals"
  const drawingOut = tween(t, at('whole', 0.05), at('whole', 0.05) + 22, 1, 0, ease.soft);
  const pan = tween(t, at('whole', 0.1), at('whole', 0.1) + 66, 0, 1, ease.inOut);
  const bridgeStart = at('build', 0.15);
  const bridgeDur = 88;
  const clear = tween(t, at('revisit', -0.3), at('revisit', -0.3) + 20, 1, 0, ease.soft); // the page clears
  const seaStart = at('revisit', -0.45);
  const horizonStart = at('revisit', 0.1);

  // The bridge: one counter-clockwise spiral from "you" outwards, every word underlined in the direction the pen is
  // travelling, ending under "one plan".
  const bridge: Pt[] = [
    ...under(you, '>'),
    ...under(goals, '>'),
    [1250, 470],
    ...under(priorities, '<'),
    ...under(family, '<'),
    ...under(investments, '<'),
    [205, 560],
    ...under(taxes, '>'),
    ...under(insurance, '>'),
    ...under(retirement, '>'),
    [1640, 520],
    [1575, 300],
    ...under(estate, '<'),
    ...under(onePlan, '<', 0.1),
  ];

  const years = copy.plan.years;
  const yearAt = [330, 880, 1690];
  const dx = (pan - 1) * PAN[0];
  const dy = (pan - 1) * PAN[1];

  return (
    <>
      {/* the calm sea (the echo of the rough one in blind spot 3); its painted horizon sits on y 610 */}
      {t >= seaStart - 1 && <InkDrawing name="sailboat-calm" start={seaStart} duration={80} left={0} top={HORIZON - 718} width={1920} />}

      {/* the page as it opens: conversation, Bill, the notes and the bridge, under one slow pan */}
      {clear > 0 && (
        <div style={{position: 'absolute', inset: 0, translate: `${dx}px ${dy}px`}}>
          {/* the conversation: two cups and an open notebook, sitting down together */}
          {drawingOut > 0 && (
            <InkDrawing name="conversation" start={from} duration={92} left={140} top={554} width={1075} opacity={drawingOut} />
          )}
          {/* Bill, exactly where the approach scene left him; he listens until "your goals", then steps out */}
          {billOut > 0 && (
            <div style={{position: 'absolute', inset: 0, opacity: billOut}}>
              <BillPrint
                slot="approach"
                from={SCENES.approach.from}
                to={SCENES.plan.to}
                clipStart={SCENES.approach.from}
                left={1140 + PAN[0]}
                top={170 + PAN[1]}
                width={560}
                height={700}
                rotate={-1.4}
                zoom={[700, 760]}
              />
            </div>
          )}
          <div style={{position: 'absolute', inset: 0, opacity: clear}}>
            {notes.map((n) => (
              <Handwriting
                key={n.text}
                text={n.text}
                start={n.cue}
                speed={n.speed}
                left={n.left}
                top={n.top}
                variant={n.variant}
                color={n.color}
                rotate={n.rotate}
                style={{fontSize: n.size}}
              />
            ))}
            <BrassLine points={bridge} start={bridgeStart} duration={bridgeDur} wobble={2} seed="plan-bridge" />
          </div>
        </div>
      )}

      {/* the horizon, the years along it, and the note */}
      <BrassLine
        points={[
          [-20, HORIZON],
          [640, HORIZON + 1],
          [1280, HORIZON - 1],
          [1940, HORIZON],
        ]}
        start={horizonStart}
        duration={66}
        wobble={1.4}
        seed="plan-horizon"
      />
      <Handwriting
        text={copy.plan.revisit}
        start={wordAt('revisit', 'revisit', 's', -0.05)}
        speed={18}
        left={1470}
        top={410}
        variant="hand"
        color={sketch.ink}
        rotate={-2}
      />
      {years.map((y, i) => (
        <Handwriting
          key={y}
          text={y}
          start={wordAt('revisit', 'as', 's', 0) + i * 13}
          speed={16}
          left={yearAt[i]}
          top={HORIZON + 14}
          variant="note"
          color={sketch.inkSoft}
          rotate={i === 1 ? 1 : -1}
        />
      ))}
    </>
  );
};
