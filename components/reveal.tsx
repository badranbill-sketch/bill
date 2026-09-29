"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Reveals a drawing once, with a slow soft mask, the first time it scrolls
 * into view. Drawings already on screen when the page loads are left alone,
 * so nothing flickers; without JavaScript or with reduced motion they are
 * simply there.
 */
export function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const box = el.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0) return;
    el.dataset.reveal = "wait";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = "in";
        io.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} data-reveal="">
      {children}
    </div>
  );
}
