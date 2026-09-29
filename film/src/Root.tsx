import React from 'react';
import {Composition, Folder, Still} from 'remotion';
import {GuideCover, PAGE} from './components/GuideCover';
import {InkProof} from './checks/InkProof';
import {DesignKit} from './checks/DesignKit';
import {Film, ScenePreview} from './Film';
import {fontsReady} from './design/typography';
import {SCENES, SceneId} from './timing/scenes';
import {FPS, TOTAL_FRAMES} from './timing/timing';

void fontsReady;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="BillBadranFilm"
      component={Film}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={TOTAL_FRAMES}
      defaultProps={{captions: false}}
    />
    <Composition
      id="BillBadranFilm-Captioned"
      component={Film}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={TOTAL_FRAMES}
      defaultProps={{captions: true}}
    />
    <Folder name="Scenes">
      {(Object.keys(SCENES) as SceneId[]).map((id) => (
        <Composition
          key={id}
          id={`Scene-${id}`}
          component={ScenePreview}
          width={1920}
          height={1080}
          fps={FPS}
          durationInFrames={Math.max(1, SCENES[id].to - SCENES[id].from)}
          defaultProps={{scene: id}}
        />
      ))}
    </Folder>
    <Folder name="Checks">
      {/* the rebuilt cover at the size of the 110 dpi PDF render, to compare with the real page */}
      <Still id="GuideCover" component={GuideCover} width={PAGE.w} height={PAGE.h} defaultProps={{}} />
      <Composition id="InkProof" component={InkProof} width={1920} height={1080} fps={FPS} durationInFrames={200} />
      <Composition id="DesignKit" component={DesignKit} width={1920} height={1080} fps={FPS} durationInFrames={150} />
    </Folder>
  </>
);
