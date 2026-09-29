"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Language } from "@/lib/business";

/** Native scrolling still works without JS; the controls add keyboard access. */
export function QuestionCarousel({
  children,
  count,
  label,
  lang,
}: {
  children: ReactNode;
  count: number;
  label: string;
  lang: Language;
}) {
  const list = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const update = () => {
      const first = el.firstElementChild as HTMLElement | null;
      const next = first?.nextElementSibling as HTMLElement | null;
      if (!first || !next) return;
      const step = next.offsetLeft - first.offsetLeft;
      setActive(
        Math.max(0, Math.min(count - 1, Math.round(el.scrollLeft / step))),
      );
    };
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [count]);
  const move = (index: number) => {
    const el = list.current;
    const item = el?.children[index] as HTMLElement | undefined;
    const first = el?.firstElementChild as HTMLElement | undefined;
    if (el && item && first)
      el.scrollTo({
        left: item.offsetLeft - first.offsetLeft,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  };
  return (
    <div className="ask-carousel">
      <ul ref={list} className="video-list" aria-label={label}>
        {children}
      </ul>
      <div className="ask-controls">
        <div
          className="ask-dots"
          aria-label={
            lang === "fr" ? "Choisir une question" : "Choose a question"
          }
        >
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Question ${i + 1}`}
              aria-current={active === i ? "true" : undefined}
              onClick={() => move(i)}
            >
              <span />
            </button>
          ))}
        </div>
        <span>
          {lang === "fr" ? "Glissez pour explorer" : "Swipe to explore"}
        </span>
      </div>
    </div>
  );
}
