import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { Language } from "@/lib/business";
import { journey, narration } from "@/lib/journey";
import {
  cameraY,
  FAR_DEPTH,
  HOLD_POSES,
  pointAt,
  ride,
  WORLD,
} from "@/lib/ride";
import { pathFor } from "@/lib/routes";
import { t } from "@/lib/copy";
import { Walker } from "./figure";
import { RideMotion } from "./ride-motion";
import { FarLayer, LiveLayer, LiveWalker, MainLayer } from "./world";

export const actId = (i: number) => `parcours-0${i + 1}`;

const lines = (text: string) =>
  text.split("\n").map((line, i, all) => (
    <span key={i}>
      {line}
      {i < all.length - 1 && <br />}
    </span>
  ));

/** The narration track for a language, if one exists on disk. */
function track(lang: Language) {
  const t = narration[lang];
  return t && fs.existsSync(path.join(process.cwd(), "public", t.src))
    ? t
    : null;
}

/** Crop of the world around an act's stop, for the static version. */
function crop(stop: number, act: number) {
  const t = ride().stops[stop];
  const [x] = pointAt(t);
  const w = 1400,
    h = 700;
  const x0 = Math.max(0, Math.min(WORLD.w - w, x - (act === 3 ? 560 : 820)));
  const y0 = Math.max(0, Math.min(WORLD.h - h, cameraY(t) - 0.6 * h));
  return { x0, y0, w, h, at: pointAt(t) };
}

/**
 * Phone crops, one per act, offset from the walker's stop. Each is narrow
 * enough that the sign text in it renders at 11 CSS px or more on a 390 px
 * screen (14-unit boards need 496 units or less, 20-unit placards 709).
 * Act III keeps the walker and the sign he is walking toward.
 */
const NARROW = [
  { dx: -259, dy: -214, w: 480 },
  { dx: -265, dy: -236, w: 580 },
  { dx: -230, dy: -253, w: 680 },
  { dx: -170, dy: -246, w: 480 },
];

function narrowCrop(stop: number, act: number) {
  const at = pointAt(ride().stops[stop]);
  const { dx, dy, w } = NARROW[act];
  return { x0: at[0] + dx, y0: at[1] + dy, w, h: (w * 3) / 4, at };
}

/** One still panel's art: the three layers seen through a crop. */
function PanelArt({
  c,
  pose,
  className,
}: {
  c: ReturnType<typeof crop>;
  pose: (typeof HOLD_POSES)[number];
  className: string;
}) {
  const shift = `translate(${(c.x0 * (1 - FAR_DEPTH)).toFixed(1)} ${(c.y0 * (1 - FAR_DEPTH)).toFixed(1)})`;
  return (
    <svg
      className={`ride-panel-art ${className}`}
      viewBox={`${c.x0} ${c.y0} ${c.w} ${c.h}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <use href="#ride-far" transform={shift} />
      <use href="#ride-main" />
      <use href="#ride-live" />
      <Walker at={c.at} pose={pose} />
    </svg>
  );
}

/**
 * The four-act mountain ride. With JavaScript and motion allowed, a pinned
 * stage pans across one continuous landscape as the visitor scrolls. Without
 * JavaScript, or with reduced motion, each act is shown as a still panel.
 */
export function Ride({ lang }: { lang: Language }) {
  const j = journey[lang];
  const audio = track(lang);
  const layer = (depth: number, children: React.ReactNode) => (
    <svg
      className="ride-layer"
      data-depth={depth}
      viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
      preserveAspectRatio="xMinYMin meet"
      focusable="false"
    >
      {children}
    </svg>
  );
  // Its label switches between Listen and Pause, so it carries no
  // aria-pressed: the name alone says what a press will do.
  const listen = audio && (
    <button
      type="button"
      className="ride-sound"
      data-sound=""
      data-listen={j.listen}
      data-pause={j.pause}
      data-src={audio.src}
      data-chapters={audio.chapters.join(" ")}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M3,8h3l4,-4v12l-4,-4h-3Z" />
        <path
          d="M13,7c1.3,1.6 1.3,4.4 0,6M15.5,5c2.4,2.8 2.4,7.2 0,10"
          className="waves"
        />
      </svg>
      <span data-sound-label="">{j.listen}</span>
    </button>
  );
  const cta = (
    <Link className="button" href={pathFor(lang, "meeting")}>
      {t(lang).meeting}
      <span aria-hidden="true">→</span>
    </Link>
  );
  return (
    <RideMotion>
      <section
        className="ride"
        id="parcours"
        data-mode="static"
        aria-label={j.label}
      >
        {j.acts.map((_, i) => (
          <span
            key={i}
            className="ride-anchor"
            id={actId(i)}
            style={{ "--i": i } as CSSProperties}
          />
        ))}
        <div className="ride-stage">
          <div className="ride-window" aria-hidden="true">
            {layer(FAR_DEPTH, <FarLayer />)}
            {layer(1, <MainLayer lang={lang} />)}
            {layer(
              1,
              <>
                <LiveLayer lang={lang} />
                <LiveWalker at={pointAt(0)} />
              </>,
            )}
          </div>
          <div className="ride-text">
            {j.acts.map((act, i) => (
              <div
                className="ride-act"
                data-act={i}
                data-active={i === 0}
                key={i}
              >
                <p className="ride-count">
                  0{i + 1} <span>/ 04</span>
                </p>
                <p className="eyebrow">{act.eyebrow}</p>
                <h2>{lines(act.title)}</h2>
                <p className="ride-body">{act.body}</p>
                {i === 3 && cta}
              </div>
            ))}
          </div>
          {listen}
          <nav className="ride-rail" aria-label={j.label}>
            <ol>
              {j.acts.map((act, i) => (
                <li key={i} data-active={i === 0}>
                  <a href={`#${actId(i)}`}>
                    <span className="rail-dot" aria-hidden="true" />
                    <span className="rail-label">{act.rail}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <p className="ride-hint" aria-hidden="true">
            <i />
            {j.scrollHint}
          </p>
        </div>

        <div className="ride-static">
          {listen && <div className="ride-static-sound">{listen}</div>}
          {j.acts.map((act, i) => (
            <div className="ride-panel" key={i}>
              <div className="ride-panel-copy">
                <p className="ride-count">
                  0{i + 1} <span>/ 04</span>
                </p>
                <p className="eyebrow">{act.eyebrow}</p>
                <h2>{lines(act.title)}</h2>
                <p className="ride-body">{act.body}</p>
                {i === 3 && cta}
              </div>
              <PanelArt
                c={crop(i + 1, i)}
                pose={HOLD_POSES[i + 1]}
                className="ride-panel-wide"
              />
              <PanelArt
                c={narrowCrop(i + 1, i)}
                pose={HOLD_POSES[i + 1]}
                className="ride-panel-narrow"
              />
            </div>
          ))}
        </div>
      </section>
    </RideMotion>
  );
}
