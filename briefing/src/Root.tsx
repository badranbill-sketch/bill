import React from 'react';
import { Composition, Folder } from 'remotion';
import { FPS, H, W } from './brand';
import { PIPELINE_TEST } from './content';
import { LedgerPreview } from './compositions/LedgerPreview';
import { PipelineTest } from './compositions/PipelineTest';

export const Root: React.FC = () => (
  <>
    <Composition id="PipelineTest" component={PipelineTest} durationInFrames={Math.round(PIPELINE_TEST.dur * FPS)} fps={FPS} width={W} height={H} />
    <Folder name="Primitives">
      <Composition id="LedgerPreview" component={LedgerPreview} durationInFrames={6 * FPS} fps={FPS} width={W} height={H} />
    </Folder>
  </>
);
