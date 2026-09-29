import React from 'react';
import {BillPrint, Handwriting} from '../components/sketch';
import {useT} from '../components/stage';
import {sketch} from '../design/palette';
import {copy} from '../design/copy';
import {ease, tween} from '../design/motion';
import {at, wordAt} from '../timing/timing';

// A3 · credibility. "For more than fifteen years, I've worked with individuals and families…" Bill again, this time
// on the left of the page, tilted the other way. Two small notes beside him; on "And I've noticed something" they
// fade and leave only Bill.

const PRINT = {left: 300, top: 138, width: 620, height: 770, rotate: 1.3};

export const Credibility: React.FC<{from: number; to: number}> = ({from, to}) => {
  const t = useT();
  const land = at('fifteen', 0.15); // lands once the life page has mostly dissolved
  const yearsAt = wordAt('fifteen', 'fifteen', 's', -0.1);
  const whoAt = wordAt('fifteen', 'individuals', 's', -0.1);
  const clear = tween(t, at('noticed', -0.1), at('noticed', 0.6), 1, 0, ease.soft);

  return (
    <>
      <BillPrint slot="credibility" from={from} to={to} arrive={land} {...PRINT} />
      <Handwriting
        text={copy.credibility.years}
        start={yearsAt}
        speed={12}
        variant="handLarge"
        left={1034}
        top={378}
        rotate={-2.2}
        opacity={clear}
      />
      <Handwriting
        text={copy.credibility.who}
        start={whoAt}
        speed={18}
        variant="hand"
        color={sketch.inkSoft}
        left={1044}
        top={486}
        rotate={-1.2}
        opacity={clear}
      />
    </>
  );
};
