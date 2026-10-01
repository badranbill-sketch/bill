import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import {sketch} from '../../design/palette';
import {fmEase, keyframes} from '../motion';
import {FPS, WORDS} from './edit';

// Word-by-word captions (the Reels / TikTok convention, for a feed that autoplays muted): a short phrase at a time,
// the word being said lit in warm brass and lifted slightly as it lands. Pages come from the word timings in
// src/data/talk-transcript.json: at most MAX characters (one line, two at most), never across the script's
// punctuation, never across a pause.
const MAX = 22;
const PAUSE = 0.45;

type Page = {from: number; to: number; words: {w: string; s: number}[]};

export const WordCaptions: React.FC<{centerY: number; left: number; width: number}> = ({centerY, left, width}) => {
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
    // a page stays up until the next one (or a moment after its last word)
    return out.map((p, i) => ({...p, to: Math.min(out[i + 1]?.from ?? p.to + 0.5, p.to + 0.5)}));
  }, []);

  const sec = frame / FPS;
  const page = pages.find((p) => sec >= p.from - 0.04 && sec < p.to);
  if (!page) return null;
  const pageFrom = Math.round(page.from * FPS);
  const pop = keyframes(frame, [pageFrom - 1, pageFrom + 4], [0, 1], fmEase.out);

  return (
    <div style={{position: 'absolute', left, width, top: centerY, display: 'flex', justifyContent: 'center', translate: '0 -50%'}}>
      <div
        style={{
          maxWidth: width,
          padding: '12px 28px 16px',
          borderRadius: 16,
          background: 'rgba(30, 42, 62, 0.94)',
          boxShadow: '0 10px 30px rgba(30,42,62,0.25)',
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 600,
          fontSize: 64,
          lineHeight: 1.16,
          textAlign: 'center',
          color: sketch.printBorder,
          opacity: pop,
          scale: String(0.92 + 0.08 * pop),
        }}
      >
        {page.words.map((w, i) => {
          const next = page.words[i + 1]?.s ?? page.to;
          const active = sec >= w.s - 0.02 && sec < next;
          const lift = keyframes(frame, [Math.round(w.s * FPS), Math.round(w.s * FPS) + 4], [0, 1], fmEase.out);
          return (
            <span key={i} style={{display: 'inline-block', whiteSpace: 'pre', color: active ? '#E9C887' : undefined, translate: active ? `0 ${-5 * lift}px` : undefined}}>
              {(i === 0 ? '' : ' ') + w.w}
            </span>
          );
        })}
      </div>
    </div>
  );
};
