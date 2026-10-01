import React from 'react';
import {InkDrawing} from '../../components/sketch';
import {useT} from '../../components/stage';
import {MEADOW} from '../layout';
import {fmEase, keyframes} from '../motion';
import {at, endOf} from '../timing';

// 4b · the meadow (21.5 → 26 s) — « Vous n’avez pas besoin de réponses parfaites. »
// As the guide's page clears, the meadow draws itself around the brass line that stopped short in the pieces beat,
// and the line carries on up its footpath into the distance (BillReel.tsx). It stays under « Un point de départ
// honnête », then gives the page to the end card.
export const meadowFade = () => ({from: endOf('depart', 0.25), to: endOf('depart', 0.85)});

export const Meadow: React.FC = () => {
  const t = useT();
  const fade = meadowFade();
  const opacity = keyframes(t, [fade.from, fade.to], [1, 0], fmEase.soft);
  return (
    <InkDrawing
      name="meadow-path"
      start={at('parfaites', -0.45)}
      duration={80}
      left={MEADOW.left}
      top={MEADOW.top}
      width={MEADOW.width}
      opacity={opacity}
    />
  );
};
