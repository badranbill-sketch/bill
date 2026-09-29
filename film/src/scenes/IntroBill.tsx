import React from 'react';
import {BillPrint, BrassLine, Handwriting, Pt} from '../components/sketch';
import {sketch} from '../design/palette';
import {copy} from '../design/copy';
import {at, wordAt} from '../timing/timing';

// A1 · intro. The first page of the sketchbook: empty for a breath, then Bill's print is taped in right of centre.
// His name writes itself beside it, then his role; on "…more important than numbers" the brass line is born as the
// underline of his name.

// Bill's print: right of centre, large.
const PRINT = {left: 1068, top: 142, width: 620, height: 760, rotate: -1.2};

// His name and role, beside the print, a little above its middle.
const NAME = {left: 416, top: 396, rotate: -1.6};
const ROLE = {left: 424, top: 514, rotate: -0.8};

// The brass underline under the name (stage px): it starts under the "B", runs a touch past "Badran" and lifts.
const BRASS: Pt[] = [
  [414, 481],
  [580, 479],
  [738, 474],
  [786, 469],
];

export const IntroBill: React.FC<{from: number; to: number}> = ({from, to}) => {
  const land = at('hi', -0.45); // the page is empty for a breath, then the print lands
  const nameAt = wordAt('hi', 'Bill', 's', -0.12);
  const roleAt = wordAt('hi', 'financial', 's', -0.05);
  const bornAt = wordAt('start', 'numbers', 's', -0.1);

  return (
    <>
      <BillPrint slot="intro" from={from} to={to} arrive={land} {...PRINT} />
      <Handwriting text={copy.intro.name} start={nameAt} speed={14} variant="handLarge" {...NAME} />
      <Handwriting
        text={copy.intro.role}
        start={roleAt}
        speed={20}
        variant="serifItalic"
        color={sketch.inkSoft}
        {...ROLE}
      />
      <BrassLine points={BRASS} start={bornAt} duration={26} width={3.6} seed="brass-intro" />
    </>
  );
};
