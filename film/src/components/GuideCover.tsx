import React from 'react';
import {palette} from '../design/palette';
import {clamp01} from '../design/motion';
import {SANS, SERIF} from '../design/typography';
import {BOAT, SailboatArt} from './Sailboat';

// The guide's cover (p. 1), rebuilt in vector from the PDF so it can assemble itself on screen.
// Coordinates are "page units": the page rendered at 110 dpi is 935 × 1210.
export const PAGE = {w: 935, h: 1210};
export const ART = {x: 433, y: 710, s: 1.084}; // where the 420 × 300 illustration sits on the page
export const SUN_ON_PAGE = {x: ART.x + BOAT.sun.cx * ART.s, y: ART.y + BOAT.sun.cy * ART.s, r: BOAT.sun.r * ART.s};
export const BOAT_CENTRE = {x: ART.x + 210 * ART.s, y: ART.y + 170 * ART.s};

export type CoverParts = {
  header?: number;
  pill?: number;
  title?: [number, number, number];
  subtitle?: number;
  pills?: number;
  footer?: number;
  sun?: number;
  sails?: number;
  hull?: number;
  water?: number;
};

const ALL: Required<CoverParts> = {
  header: 1,
  pill: 1,
  title: [1, 1, 1],
  subtitle: 1,
  pills: 1,
  footer: 1,
  sun: 1,
  sails: 1,
  hull: 1,
  water: 1,
};

/** The cover, drawn at PAGE size (scale it from outside). `background` off lets a flood behind it be the navy. */
export const GuideCover: React.FC<{
  parts?: CoverParts;
  time?: number;
  boatX?: number;
  background?: boolean;
  showSun?: boolean;
  sunOpacity?: number;
}> = ({parts, time = 0, boatX = 0, background = true, showSun = true, sunOpacity}) => {
  const p = {...ALL, ...parts};
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: PAGE.w,
        height: PAGE.h,
        background: background ? palette.navy : undefined,
        overflow: 'hidden',
        fontFamily: SANS,
        color: palette.paper,
      }}
    >
      {/* running header */}
      <div
        style={{
          position: 'absolute',
          left: 73,
          top: 69,
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          whiteSpace: 'nowrap',
          opacity: p.header,
        }}
      >
        <span style={{fontWeight: 700, fontSize: 13.5, letterSpacing: '0.3em'}}>BILL BADRAN</span>
        <span style={{fontWeight: 400, fontSize: 12, letterSpacing: '0.2em', color: palette.mist, opacity: 0.8}}>
          · PLANIFICATION FINANCIÈRE
        </span>
      </div>
      {/* "Guide gratuit" */}
      <div
        style={{
          position: 'absolute',
          left: 728,
          top: 57,
          width: 140,
          height: 48,
          borderRadius: 24,
          background: palette.coral,
          fontWeight: 700,
          fontSize: 15,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          rotate: '5deg',
          opacity: clamp01(p.pill * 1.5),
          scale: String(0.7 + 0.3 * p.pill),
        }}
      >
        Guide gratuit
      </div>
      {/* title */}
      <div style={{position: 'absolute', left: 71, top: 200, fontFamily: SERIF, fontWeight: 700, fontSize: 74, lineHeight: '77px'}}>
        <TitleLine p={p.title[0]}>Le guide de la</TitleLine>
        <TitleLine p={p.title[1]}>
          <span style={{fontStyle: 'italic', color: palette.gold}}>prospérité</span>
        </TitleLine>
        <TitleLine p={p.title[2]}>financière</TitleLine>
      </div>
      {/* subtitle */}
      <div
        style={{
          position: 'absolute',
          left: 73,
          top: 452,
          fontSize: 20.5,
          lineHeight: '31px',
          fontWeight: 400,
          opacity: p.subtitle,
          translate: `0 ${(1 - p.subtitle) * 12}px`,
        }}
      >
        Les 5 erreurs qu’on voit{' '}
        <span
          style={{
            textDecorationLine: 'underline',
            textDecorationColor: palette.coral,
            textDecorationThickness: 3,
            textUnderlineOffset: 7,
          }}
        >
          tout le temps
        </span>{' '}
        en bureau
        <br />
        (et comment les éviter)
      </div>
      {/* the three pills */}
      <div style={{position: 'absolute', left: 73, top: 913, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start'}}>
        {(
          [
            ['clock', '15 minutes de lecture'],
            ['cup', 'Un café suffit'],
            ['check', 'Zéro jargon'],
          ] as const
        ).map(([icon, label], i) => {
          const v = clamp01(p.pills * 3 - i);
          return (
            <div
              key={label}
              style={{
                height: 42,
                padding: '0 15px',
                borderRadius: 21,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.28)',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 14,
                boxSizing: 'border-box',
                whiteSpace: 'nowrap',
                opacity: v,
                translate: `${(1 - v) * -14}px 0`,
              }}
            >
              <PillIcon kind={icon} />
              {label}
            </div>
          );
        })}
      </div>
      {/* signature */}
      <div style={{position: 'absolute', left: 73, top: 1110, fontSize: 14, lineHeight: '22px', opacity: p.footer, whiteSpace: 'nowrap'}}>
        <div style={{fontWeight: 700}}>Bill Badran, B.A.A., Pl.Fin, CIM</div>
        <div style={{color: palette.mist, opacity: 0.85}}>Planificateur financier · Gestionnaire de portefeuille agréé · Laval</div>
      </div>
      {/* the illustration */}
      <svg
        width={420 * ART.s}
        height={300 * ART.s}
        viewBox="0 0 420 300"
        style={{position: 'absolute', left: ART.x, top: ART.y, overflow: 'visible'}}
      >
        <SailboatArt
          sun={p.sun}
          sails={p.sails}
          hull={p.hull}
          water={p.water}
          time={time}
          boatX={boatX}
          showSun={showSun}
          sunOpacity={sunOpacity}
        />
      </svg>
    </div>
  );
};

const TitleLine: React.FC<{p: number; children: React.ReactNode}> = ({p, children}) => (
  <div style={{overflow: 'hidden', paddingBottom: 14, marginBottom: -14}}>
    <div style={{translate: `0 ${(1 - p) * 100}%`, opacity: clamp01(p * 1.4), whiteSpace: 'nowrap'}}>{children}</div>
  </div>
);

const PillIcon: React.FC<{kind: 'clock' | 'cup' | 'check'}> = ({kind}) => (
  <svg width={15} height={15} viewBox="0 0 16 16" style={{flex: 'none'}}>
    {kind === 'clock' && (
      <g fill="none" stroke={palette.paper} strokeWidth={1.4} strokeLinecap="round">
        <circle cx={8} cy={9} r={5.6} />
        <path d="M8 9 L8 6.2 M6.4 1.8 L9.6 1.8 M8 1.8 L8 3.4" />
      </g>
    )}
    {kind === 'cup' && (
      <g fill="none" stroke={palette.paper} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 6.5 L11.5 6.5 L10.8 12 Q10.6 13.5 9 13.5 L5 13.5 Q3.4 13.5 3.2 12 Z" />
        <path d="M11.4 7.8 Q14.2 7.8 13.6 10 Q13.2 11.2 11 11.2" />
        <path d="M5.5 1.8 Q4.6 3 5.5 4.2 M8.4 1.8 Q7.5 3 8.4 4.2" />
      </g>
    )}
    {kind === 'check' && <path d="M2.8 8.6 L6.4 12 L13.2 4.4" fill="none" stroke={palette.paper} strokeWidth={1.6} strokeLinecap="round" />}
  </svg>
);
