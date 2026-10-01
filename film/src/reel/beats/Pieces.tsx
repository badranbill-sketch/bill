import React from 'react';
import {Clipping, Handwriting, InkStroke, tick} from '../../components/sketch';
import {reelCopy} from '../copy';
import {CLIPS, PIECE_NOTES, TICKS} from '../layout';
import {ReelInk} from '../stage';
import {wordAt} from '../timing';

// 3 · pieces (8 → 16 s) — « Un compte ici, une police là, un testament pas revu depuis des années. / Chaque morceau a
// du sens. / Mais qui regarde comment tout s’emboîte ? »
// The pieces land as taped clippings, one per phrase (the account statement, the policy, the will), each with its
// handwritten note on the other side of the page. « Chaque morceau a du sens »: a small tick by each. On the question
// the brass line, resting low on the left since the lake, climbs toward them and stops short (BillReel.tsx); the
// question is written apart, low on the right.
export const Pieces: React.FC = () => {
  const c = reelCopy.pieces;
  const n = PIECE_NOTES;
  const lands = {
    statement: wordAt('morceaux', 'compte', 's', -0.4),
    policy: wordAt('morceaux', 'police', 's', -0.4),
    will: wordAt('morceaux', 'testament', 's', -0.4),
  };
  const ticks = [wordAt('sens', 'Chaque', 's', 0.05), wordAt('sens', 'morceau', 's', 0.1), wordAt('sens', 'sens', 's', -0.05)];
  return (
    <>
      {(Object.keys(CLIPS) as (keyof typeof CLIPS)[]).map((k) => {
        const p = CLIPS[k];
        return <Clipping key={k} src={p.src} size={p.size} left={p.left} top={p.top} width={p.width} rotate={p.rotate} arrive={lands[k]} />;
      })}

      <Handwriting
        text={c.account}
        start={wordAt('morceaux', 'Un', 's', 0.05)}
        speed={20}
        left={n.account.left}
        top={n.account.top}
        variant="hand"
        rotate={n.account.rotate}
        style={{fontSize: n.account.size}}
      />
      <Handwriting
        text={c.policy}
        start={wordAt('morceaux', 'une', 's', 0.05)}
        speed={20}
        left={n.policy.left}
        top={n.policy.top}
        variant="hand"
        rotate={n.policy.rotate}
        style={{fontSize: n.policy.size}}
      />
      <Handwriting
        text={c.will}
        start={wordAt('morceaux', 'testament', 's', 0)}
        speed={22}
        left={n.will.left}
        top={n.will.top}
        variant="hand"
        rotate={n.will.rotate}
        style={{fontSize: n.will.size}}
      />

      <ReelInk>
        {TICKS.map(([x, y], i) => (
          <InkStroke key={i} d={tick(x, y, 30)} start={ticks[i]} duration={9} width={3} />
        ))}
      </ReelInk>

      <Handwriting
        text={c.question}
        start={wordAt('emboite', 'Mais', 's', 0)}
        speed={26}
        left={n.question.left}
        top={n.question.top}
        variant="hand"
        rotate={n.question.rotate}
        style={{fontSize: n.question.size}}
      />
    </>
  );
};
