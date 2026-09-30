import React from 'react';
import { Sequence } from 'remotion';
import { FPS } from '../brand';
import { ORDER, SCENES, type Scene } from '../content';
import { loadBrandFonts } from '../fonts';
import { Paper } from '../primitives/Paper';
import { ColumnsScene } from '../briefing/Columns';
import { Progress, SceneShell } from '../briefing/common';
import { DiagramScene } from '../briefing/Diagram';
import { LedgerScene } from '../briefing/LedgerScene';
import { ListScene } from '../briefing/ListScene';
import { PairScene } from '../briefing/Pair';
import { RoadScene } from '../briefing/Road';
import { StatementScene } from '../briefing/Statement';
import { TableScene } from '../briefing/TableScene';
import { CloseScene, TitleScene } from '../briefing/TitleClose';

loadBrandFonts();

/**
 * The plan briefing: 14 scenes from SCENES (content.ts), in ORDER, on one
 * sheet of paper that never moves. No audio of any kind. Each scene fades in
 * over its first 0.3 s and out over its last 0.5 s, inside its own duration.
 */
export const sceneFrames = (s: Scene) => Math.round(s.dur * FPS);
export const BOUNDS = ORDER.reduce<number[]>((acc, k) => [...acc, acc[acc.length - 1] + sceneFrames(SCENES[k])], [0]);
export const BRIEFING_FRAMES = BOUNDS[BOUNDS.length - 1];

const LAYOUTS: Record<NonNullable<Scene['layout']>, React.FC<{ scene: Scene }>> = {
  title: TitleScene,
  statement: StatementScene,
  pair: PairScene,
  list: ListScene,
  diagram: DiagramScene,
  table: TableScene,
  ledger: LedgerScene,
  columns: ColumnsScene,
  road: RoadScene,
  close: CloseScene,
};

export const Briefing: React.FC = () => (
  <Paper>
    {ORDER.map((k, i) => {
      const s = SCENES[k] as Scene;
      const Layout = LAYOUTS[s.layout ?? 'statement'];
      return (
        <Sequence key={k} name={`${s.id} · ${s.name}`} from={BOUNDS[i]} durationInFrames={sceneFrames(s)}>
          <SceneShell scene={s} index={i} frames={sceneFrames(s)}>
            <Layout scene={s} />
          </SceneShell>
        </Sequence>
      );
    })}
    <Progress bounds={BOUNDS} total={BRIEFING_FRAMES} />
  </Paper>
);
