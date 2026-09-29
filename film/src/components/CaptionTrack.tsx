import React, {useCallback, useEffect, useState} from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame, useDelayRender} from 'remotion';
import {parseSrt} from '@remotion/captions';
import type {Caption} from '@remotion/captions';
import {FPS} from '../timing/timing';

// Burned-in captions for the "BillBadranFilm-Captioned" render. Read from public/captions/narration.srt (written by
// tools/voice.py; hand edits to that file show up here). Styled apart from the film's design type: no serif, no
// gold, just a plain high-contrast box, the same everywhere, inside the title-safe area (90% of the frame). For
// YouTube or social uploads prefer the uncaptioned film plus the .srt as a separate track.
export const CaptionTrack: React.FC = () => {
  const frame = useCurrentFrame();
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const {delayRender, continueRender, cancelRender} = useDelayRender();
  const [handle] = useState(() => delayRender('Loading captions'));

  const load = useCallback(async () => {
    try {
      const text = await (await fetch(staticFile('captions/narration.srt'))).text();
      setCaptions(parseSrt({input: text}).captions);
      continueRender(handle);
    } catch (e) {
      cancelRender(e);
    }
  }, [continueRender, cancelRender, handle]);

  useEffect(() => {
    load();
  }, [load]);

  const ms = (frame / FPS) * 1000;
  const current = captions?.find((c) => ms >= c.startMs && ms < c.endMs);
  if (!current) return null;

  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 86, pointerEvents: 'none'}}>
      <div
        style={{
          maxWidth: 1500,
          padding: '12px 28px 14px',
          borderRadius: 10,
          background: 'rgba(12, 24, 36, 0.84)',
          color: '#FFFFFF',
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 500,
          fontSize: 40,
          lineHeight: 1.32,
          textAlign: 'center',
          whiteSpace: 'pre-line',
        }}
      >
        {current.text.trim()}
      </div>
    </AbsoluteFill>
  );
};
