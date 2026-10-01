import React from 'react';
import {AbsoluteFill} from 'remotion';
import {BillPrint, GuideObject, Handwriting} from '../../components/sketch';
import {useT} from '../../components/stage';
import {reelCopy} from '../copy';
import {GUIDE, GUIDE_NOTES, PRINT} from '../layout';
import {fmEase, poseStyle, presence} from '../motion';
import {at, footageOffset, FPS, wordAt} from '../timing';

// 4a · guide (16 → 21.5 s) — « J’ai créé un guide : cinq angles morts, des exemples simples, aucun jargon. »
// Right after the question, Bill lands on the page as a large taped print (4:5, 800 × 1000; his photo, slowly pushed
// in, until public/video/bill-reel.mp4 exists). The guide booklet is laid at the top right on « un guide », and the
// three notes are written at the top left as he lists them. Then the page clears, softly and all together (an
// AnimatePresence exit), and under the print the brass line is still there, ready to become the meadow's footpath.
export const Guide: React.FC = () => {
  const t = useT();
  const c = reelCopy.guide;
  const n = GUIDE_NOTES;
  const arrive = at('guide', -0.45);
  const leave = at('parfaites', -0.15);
  const gone = presence(t, {
    enter: arrive,
    leave,
    initial: {opacity: 1},
    exit: {opacity: 0, y: -6},
    exitWith: {duration: 0.55, ease: fmEase.soft},
  });
  if (!gone.mounted) return null;

  // Bill's footage, when it exists and went through `npm run voice:reel`, stays lip-synced: footage = film + offset
  const offset = footageOffset('reel');
  const videoStart = offset === undefined ? undefined : arrive / FPS + offset;

  const notes = [
    {text: c.spots, start: wordAt('guide', 'cinq', 's', 0), at: n.spots, rotate: -1.5},
    {text: c.examples, start: wordAt('guide', 'des', 's', 0), at: n.examples, rotate: 1},
    {text: c.jargon, start: wordAt('guide', 'aucun', 's', 0), at: n.jargon, rotate: -1},
  ];

  return (
    <AbsoluteFill style={poseStyle(gone.pose)}>
      <BillPrint
        slot="reel"
        from={arrive}
        to={leave + 18}
        left={PRINT.left}
        top={PRINT.top}
        width={PRINT.width}
        height={PRINT.height}
        rotate={PRINT.rotate}
        arrive={arrive}
        zoom={[PRINT.height - 32, PRINT.height + 12]}
        clipStart={arrive}
        videoStart={videoStart}
      />
      <GuideObject left={GUIDE.left} top={GUIDE.top} width={GUIDE.width} rotate={GUIDE.rotate} arrive={wordAt('guide', 'guide', 's', -0.15)} />
      {notes.map((note) => (
        <Handwriting
          key={note.text}
          text={note.text}
          start={note.start}
          speed={22}
          left={note.at.left}
          top={note.at.top}
          variant="hand"
          rotate={note.rotate}
          style={{fontSize: n.size}}
        />
      ))}
    </AbsoluteFill>
  );
};
