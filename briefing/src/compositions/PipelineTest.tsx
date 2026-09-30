import React from 'react';
import { loadBrandFonts } from '../fonts';
import { PIPELINE_TEST as T } from '../content';
import { InkDraw, inkRatio } from '../primitives/InkDraw';
import { Paper } from '../primitives/Paper';
import { Caption, Kicker, Title } from '../primitives/Text';
import { Scene } from '../primitives/time';

loadBrandFonts();

/**
 * Render proof (6 s): one of the site's drawings drawn by the pen on the
 * paper, with a Newsreader title, a label and a caption. Checks fonts, the
 * stroke reveal, the ink → wash order and the encoder in one pass.
 */
export const PipelineTest: React.FC = () => {
  const drawW = 1060;
  const drawH = drawW / inkRatio('two-chairs');
  return (
    <Paper>
      <Scene dur={T.dur}>
        <Kicker line={T.kicker} style={{ left: 150, top: 300 }} />
        <Title line={T.title} size={92} style={{ left: 146, top: 352, width: 640 }} />
        <Caption line={T.caption} size={34} style={{ left: 150, top: 590, width: 480 }} />
        <InkDraw
          name={T.drawing.name}
          start={T.drawing.start}
          dur={T.drawing.dur}
          washDelay={T.drawing.washDelay}
          washDur={T.drawing.washDur}
          width={drawW}
          style={{ left: 780, top: (1080 - drawH) / 2 + 10 }}
        />
      </Scene>
    </Paper>
  );
};
