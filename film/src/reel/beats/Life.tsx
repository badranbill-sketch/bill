import React from 'react';
import {Handwriting, InkDrawing} from '../../components/sketch';
import {reelCopy} from '../copy';
import {LAKE, LIFE_NOTES} from '../layout';
import {at, wordAt} from '../timing';

// 2 · life (3 → 8 s) — « La retraite que vous attendez. / Les gens dont vous prenez soin. »
// One drawing: two chairs on a dock, the lake, a couple walking along the shore. The two notes are written above it,
// one per line, the second set to the right, over the couple. The brass line comes back onto the page along the near
// shore, past the couple, and runs on along the far shore (BillReel.tsx).
export const Life: React.FC = () => {
  const c = reelCopy.life;
  const n = LIFE_NOTES;
  return (
    <>
      <InkDrawing name="lake-chairs" start={at('retraite', -0.4)} duration={90} left={LAKE.left} top={LAKE.top} width={LAKE.width} />
      <Handwriting
        text={c.retirement}
        start={wordAt('retraite', 'La', 's', 0.1)}
        speed={22}
        left={n.retirement.left}
        top={n.retirement.top}
        variant="hand"
        rotate={-1.5}
        style={{fontSize: n.retirement.size}}
      />
      <Handwriting
        text={c.people}
        start={wordAt('gens', 'Les', 's', 0.05)}
        speed={22}
        left={n.people.left}
        top={n.people.top}
        variant="hand"
        rotate={1}
        style={{fontSize: n.people.size}}
      />
    </>
  );
};
