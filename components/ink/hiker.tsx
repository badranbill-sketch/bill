import type { Language } from "@/lib/business";
import { Walker } from "../journey/figure";
import { HIKER_AT, HIKER_FRAME, HikerScene } from "../journey/world";

/**
 * The hiker on the last climb, drawn with the mountain ride's own pen so the
 * homepage card and the ride read as one hand. Exported as a file by
 * scripts/build-ink.tsx like the other still drawings.
 */
const ALT = {
  fr: "Un randonneur gravit un sentier de montagne",
  en: "A hiker climbing a mountain trail",
};

export function Hiker({ lang = "en" }: { lang?: Language }) {
  return (
    <svg
      viewBox={`${HIKER_FRAME.x} ${HIKER_FRAME.y} ${HIKER_FRAME.w} ${HIKER_FRAME.h}`}
      role="img"
      aria-label={ALT[lang]}
    >
      <HikerScene />
      <Walker at={HIKER_AT} pose="climb" scale={2} />
    </svg>
  );
}
