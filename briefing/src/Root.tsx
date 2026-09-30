import React from 'react';
import { Composition, Folder } from 'remotion';
import { FPS, H, W } from './brand';
import { PIPELINE_TEST } from './content';
import { Briefing, BRIEFING_FRAMES } from './compositions/Briefing';
import { ContactSheet, contactSheetHeight, type ContactSheetProps } from './compositions/ContactSheet';
import { LedgerPreview } from './compositions/LedgerPreview';
import { PipelineTest } from './compositions/PipelineTest';

export const Root: React.FC = () => (
  <>
    <Composition id="Briefing" component={Briefing} durationInFrames={BRIEFING_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="PipelineTest" component={PipelineTest} durationInFrames={Math.round(PIPELINE_TEST.dur * FPS)} fps={FPS} width={W} height={H} />
    <Folder name="Primitives">
      <Composition id="LedgerPreview" component={LedgerPreview} durationInFrames={6 * FPS} fps={FPS} width={W} height={H} />
    </Folder>
    <Folder name="Tools">
      <Composition
        id="ContactSheet"
        component={ContactSheet}
        durationInFrames={1}
        fps={FPS}
        width={W}
        height={1080}
        defaultProps={{ cells: [], columns: 4 } satisfies ContactSheetProps}
        calculateMetadata={({ props }) => ({ height: contactSheetHeight(props.cells.length, props.columns) })}
      />
    </Folder>
  </>
);
