import React from 'react';
import {Handwriting, InkDrawing, writeFrames} from '../../components/sketch';
import {reelCopy} from '../copy';
import {HOOK, NOTEBOOK} from '../layout';
import {at, wordAt} from '../timing';

// 1 · hook (0 → 3 s) — « Avant les chiffres, il y a votre vie. »
// The notebook draws itself (already a few lines in on the first frame, so the reel never opens on a blank page) and
// the line is handwritten above it, large, phrase by phrase with the voice. The brass underline under « votre vie »
// is the start of the reel's one brass line (BillReel.tsx).
export const Hook: React.FC = () => {
  const c = reelCopy.hook;
  return (
    <>
      <InkDrawing name="notebook" start={at('avant', -1.3)} duration={70} left={NOTEBOOK.left} top={NOTEBOOK.top} width={NOTEBOOK.width} />
      <Handwriting
        text={c.line1}
        start={at('avant', -0.1)}
        speed={22}
        left={HOOK.left}
        top={HOOK.top}
        variant="handLarge"
        style={{fontSize: HOOK.size}}
      />
      <Handwriting
        text={c.line2}
        start={wordAt('avant', 'il', 's', -0.05)}
        speed={22}
        left={HOOK.left}
        top={HOOK.top + HOOK.lineHeight}
        variant="handLarge"
        style={{fontSize: HOOK.size}}
      />
    </>
  );
};

/** When the underline under « votre vie » is drawn: once the words are on the page, as « vie » is said. */
export const hookUnderline = () => {
  const written = wordAt('avant', 'il', 's', -0.05) + writeFrames(reelCopy.hook.line2, 22);
  const start = Math.max(wordAt('avant', 'votre', 's'), written - 4);
  return {start, end: Math.max(start + 12, wordAt('avant', 'vie', 'e', 0.12))};
};
