import React from 'react';
import {BillPrint} from '../components/sketch';
import {SCENES} from '../timing/scenes';
import {at} from '../timing/timing';

// A4 · approach. "That's how I approach financial planning, too." The page dissolves in over the notebook and Bill's
// print lands on the right, large and calm. The left of the page stays quiet paper: the plan scene draws the
// conversation there next.
//
// Hand-off contract with Plan.tsx: the print below (same slot, from/to, clipStart, geometry, zoom and arrive) is
// rendered identically at the start of the plan scene, so it runs on through the dissolve without a jump. It is fully
// landed about 0.4 s into this 4.3 s scene.

/** The frame at which Bill's approach print lands (the plan scene passes the same value). */
export const approachPrintArrive = () => at('approach', -0.1);

export const Approach: React.FC<{from: number; to: number}> = () => (
  <BillPrint
    slot="approach"
    from={SCENES.approach.from}
    to={SCENES.plan.to}
    clipStart={SCENES.approach.from}
    left={1140}
    top={170}
    width={560}
    height={700}
    rotate={-1.4}
    zoom={[700, 760]}
    arrive={approachPrintArrive()}
  />
);
