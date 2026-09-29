import React from 'react';
import { Composition, Folder } from 'remotion';
import { FPS, H, W } from './brand';
import { ORDER, SCENES, TOTAL_SECONDS } from './content';
import { OneScene, Presentation } from './Presentation';

export const Root: React.FC = () => (
  <>
    <Composition id="BillPresentation" component={Presentation} durationInFrames={Math.round(TOTAL_SECONDS * FPS)} fps={FPS} width={W} height={H} />
    <Folder name="Scenes">
      {ORDER.map((k) => (
        <Composition
          key={k}
          id={`Scene-${SCENES[k].id}`}
          component={() => <OneScene k={k} />}
          durationInFrames={Math.round(SCENES[k].dur * FPS)}
          fps={FPS}
          width={W}
          height={H}
        />
      ))}
    </Folder>
  </>
);
