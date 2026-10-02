import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import {sketch} from '../../design/palette';
import {SERIF} from '../../design/typography';
import {fmEase, keyframes} from '../motion';
import {FPS, WORDS} from './edit';

// Captions for a feed that autoplays muted, in the brand's own language: an ivory label like the title card, navy
// serif type, and a brass underline drawn under the words that carry the point (PSV, revenu net, the figures, rien)
// as they are said. A short phrase at a time (at most MAX characters, never across the script's punctuation or a
// pause), shown whole, always in the same place, low on the frame. The parent hides them while the layout moves.
const MAX = 22;
const PAUSE = 0.45;
const KEY = /^(psv|revenu|net|95323|15|155000|rien|complet)$/;
const keyOf = (w: string) =>
  w
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

type Page = {from: number; to: number; words: {w: string; s: number}[]};

export const WordCaptions: React.FC<{centerY: number; left: number; width: number; opacity?: number}> = ({
  centerY,
  left,
  width,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();
  const pages = useMemo(() => {
    const out: Page[] = [];
    let cur: Page | null = null;
    WORDS.forEach((w, i) => {
      const prev = WORDS[i - 1];
      const text = cur ? cur.words.map((x) => x.w).join(' ') : '';
      const breakHere =
        !cur || (prev && /[.,:?!]$/.test(prev.w)) || (prev && w.s - prev.e > PAUSE) || (text + ' ' + w.w).length > MAX;
      if (breakHere) {
        cur = {from: w.s, to: w.e, words: []};
        out.push(cur);
      }
      cur!.words.push({w: w.w, s: w.s});
      cur!.to = w.e;
    });
    return out.map((p, i) => ({...p, to: Math.min(out[i + 1]?.from ?? p.to + 0.5, p.to + 0.5)}));
  }, []);

  const sec = frame / FPS;
  const page = pages.find((p) => sec >= p.from - 0.04 && sec < p.to);
  if (!page || opacity <= 0.01) return null;
  const pageFrom = Math.round(page.from * FPS);
  const pop = keyframes(frame, [pageFrom - 1, pageFrom + 4], [0, 1], fmEase.out);

  return (
    <div style={{position: 'absolute', left, width, top: centerY, display: 'flex', justifyContent: 'center', translate: '0 -50%', opacity}}>
      <div
        style={{
          maxWidth: width,
          padding: '10px 30px 18px',
          borderRadius: 6,
          background: sketch.printBorder,
          boxShadow: '0 8px 22px rgba(30,42,62,0.14), 0 1px 3px rgba(30,42,62,0.08)',
          fontFamily: `${SERIF}, serif`,
          fontWeight: 600,
          fontSize: 60,
          lineHeight: 1.2,
          textAlign: 'center',
          color: sketch.ink,
          opacity: pop,
          translate: `0 ${(1 - pop) * 10}px`,
        }}
      >
        {page.words.map((w, i) => {
          const key = KEY.test(keyOf(w.w));
          const said = sec >= w.s - 0.02;
          const under = said ? keyframes(frame, [Math.round(w.s * FPS), Math.round(w.s * FPS) + 6], [0, 1], fmEase.out) : 0;
          return (
            <span key={i} style={{display: 'inline-block', whiteSpace: 'pre', position: 'relative'}}>
              {(i === 0 ? '' : ' ') + w.w}
              {key && (
                <span
                  style={{
                    position: 'absolute',
                    left: i === 0 ? 0 : '0.3em',
                    right: 0,
                    bottom: 2,
                    height: 4,
                    borderRadius: 2,
                    background: sketch.brass,
                    transformOrigin: 'left center',
                    scale: `${under} 1`,
                  }}
                />
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
};
