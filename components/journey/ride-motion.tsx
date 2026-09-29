"use client";

import { useEffect, type ReactNode } from "react";
import {
  camera,
  clamp01,
  framing,
  HOLD_POSES,
  pointAt,
  ride,
  timeline,
  WORLD,
} from "@/lib/ride";

const ACTS = 4;

/**
 * Scroll engine for the mountain ride. Every value is a pure function of the
 * native scroll position: nothing plays on its own and scrolling back up
 * rewinds the story. Only narration, which the visitor switches on, runs in
 * time. Reduced motion keeps the still panels rendered by the server.
 */
export function RideMotion({ children }: { children: ReactNode }) {
  useEffect(() => {
    const section = document.getElementById("parcours");
    if (!section) return;
    const $ = <T extends Element>(s: string) => section.querySelector<T>(s);
    const $$ = <T extends Element>(s: string) =>
      Array.from(section.querySelectorAll<T>(s));

    section.dataset.ready = "";
    const stage = $<HTMLElement>(".ride-stage")!;
    const win = $<HTMLElement>(".ride-window")!;
    const textCol = $<HTMLElement>(".ride-text");
    const layers = $$<SVGSVGElement>(".ride-layer").map((el) => ({
      el,
      depth: Number(el.dataset.depth),
    }));
    const walker = $<SVGGElement>("[data-walker]")!;
    const route = $<SVGPathElement>("[data-route]")!;
    const sun = $<SVGGElement>("[data-sun]");
    const alts = $<SVGElement>("[data-alts]");
    const hint = $<HTMLElement>(".ride-hint");
    // The words of act II: world position, half width, and the hiker x at
    // which each one is written in.
    const words = $$<SVGTextElement>("[data-word]").map((el) => ({
      el,
      x: Number(el.dataset.word),
      y: Number(el.dataset.y),
      half: Number(el.dataset.half),
      at: Number(el.dataset.at),
    }));
    const acts = $$<HTMLElement>(".ride-act");
    const rail = $$<HTMLElement>(".ride-rail li");
    // Two Listen buttons: one on the live stage, one above the still panels.
    const sounds = $$<HTMLButtonElement>("[data-sound]");
    const sound = sounds[0];
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const total = ride().route.total;

    /* ---------- narration ---------- */
    // One continuous track. Listen starts it at the passage for the act on
    // screen; after that it plays through, whatever the scroll does, and only
    // pauses while the ride is off screen.
    const chapters = (sound?.dataset.chapters ?? "0").split(" ").map(Number);
    const live = () => section.dataset.mode === "live";
    let audio: HTMLAudioElement | null = null;
    let listening = false;
    let offscreen = false;
    let currentAct = -1;
    let fade = 0;
    const chapterAt = (time: number) =>
      chapters.reduce((c, start, i) => (time >= start - 0.05 ? i : c), 0);
    const quiet = () => {
      cancelAnimationFrame(fade);
      const a = audio;
      if (!a || a.paused) return;
      const start = performance.now(),
        from = a.volume;
      const step = () => {
        // A frame's timestamp can predate `start`; volume outside 0–1 throws.
        const k = Math.min(1, Math.max(0, (performance.now() - start) / 250));
        a.volume = from * (1 - k);
        if (k < 1) fade = requestAnimationFrame(step);
        else {
          a.pause();
          a.volume = 1;
        }
      };
      fade = requestAnimationFrame(step);
    };
    const speak = () => {
      if (!listening || offscreen || !sound?.dataset.src) return;
      cancelAnimationFrame(fade);
      audio ??= Object.assign(new Audio(sound.dataset.src), {
        preload: "auto",
        onended: () => setListening(false),
      });
      // Live, it starts at the act on screen; still, it simply plays through.
      const act = Math.max(0, currentAct);
      if (audio.ended) audio.currentTime = live() ? (chapters[act] ?? 0) : 0;
      else if (live() && chapterAt(audio.currentTime) !== act)
        audio.currentTime = chapters[act] ?? 0;
      audio.volume = 1;
      audio.play().catch((e: DOMException) => {
        // A pause while play() is pending is expected; anything else is not.
        if (e.name !== "AbortError") setListening(false);
      });
    };
    const setListening = (on: boolean) => {
      listening = on;
      for (const b of sounds) {
        b.dataset.playing = String(on);
        const label = b.querySelector("[data-sound-label]");
        if (label)
          label.textContent = on ? b.dataset.pause! : b.dataset.listen!;
      }
      if (on) speak();
      else quiet();
    };
    const onSound = () => setListening(!listening);
    for (const b of sounds) b.addEventListener("click", onSound);

    /* ---------- layout ---------- */
    let scale = 1,
      narrow = false,
      frame = 0;
    // Where the art starts, clear of the text: a left edge on wide screens,
    // a top edge per act on narrow ones (stage coordinates, px).
    let clearX = 0,
      clearW: [number, number] | undefined,
      winTop = 0,
      clearY: number[] = [];
    const size = () => {
      narrow = window.innerWidth <= 760;
      scale = win.clientHeight / framing(0, narrow).viewH;
      for (const { el } of layers) {
        el.style.width = `${WORLD.w * scale}px`;
        el.style.height = `${WORLD.h * scale}px`;
      }
      const top = stage.getBoundingClientRect().top;
      winTop = win.getBoundingClientRect().top - top;
      clearX = narrow ? 0 : (textCol?.getBoundingClientRect().right ?? 0);
      // The part of the width the camera may frame act III in: past the
      // middle of the text column's fade, short of the rail.
      const W = win.clientWidth,
        x0 = win.getBoundingClientRect().left,
        fade = textCol?.getBoundingClientRect(),
        railBox = section.querySelector(".ride-rail")?.getBoundingClientRect();
      clearW = narrow
        ? undefined
        : [
            (fade ? fade.right - fade.width * 0.13 - x0 : 0) / W,
            (railBox?.width ? railBox.left - 20 - x0 : W - 24) / W,
          ];
      clearY = acts.map((a) =>
        narrow ? a.getBoundingClientRect().bottom - top + 12 : 0,
      );
    };

    const setAct = (act: number) => {
      if (act === currentAct) return;
      currentAct = act;
      acts.forEach((el, i) => (el.dataset.active = String(i === act)));
      rail.forEach((el, i) => (el.dataset.active = String(i === act)));
    };

    /* ---------- the frame ---------- */
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const run = section.offsetHeight - window.innerHeight;
      const p = clamp01(-rect.top / Math.max(1, run)) * ACTS;
      const { t, holding } = timeline(p);
      const [x, y] = pointAt(t);
      const view = camera(
        t,
        win.clientWidth / scale,
        win.clientHeight / scale,
        narrow,
        clearW,
      );
      const s = scale * view.zoom;
      for (const { el, depth } of layers)
        el.style.transform = `translate3d(${(-view.x * depth * s).toFixed(1)}px, ${(-view.y * depth * s).toFixed(1)}px, 0) scale(${view.zoom.toFixed(4)})`;

      // The hiker, the pose and the stride.
      walker.setAttribute(
        "transform",
        `translate(${x.toFixed(1)} ${y.toFixed(1)})`,
      );
      let pose = HOLD_POSES[holding] ?? "walk";
      if (holding < 0) {
        const [ax, ay] = pointAt(t - 0.002),
          [bx, by] = pointAt(t + 0.002);
        pose = (by - ay) / Math.max(0.1, bx - ax) < -0.42 ? "climb" : "walk";
      }
      walker.dataset.pose = pose;
      walker.dataset.step = String(Math.floor((t * total) / 12) % 2);
      route.style.strokeDashoffset = String(1 - t);

      // The words of act II are written in as the hiker climbs, only where
      // the art is clear of the text, and fade once the storm is behind.
      const act = Math.min(ACTS - 1, Math.floor(p));
      const after = clamp01((3700 - x) / 240);
      for (const w of words) {
        const sx = (w.x - view.x) * s,
          sy = winTop + (w.y - view.y) * s;
        // Never under the text, never cut by the edge of the window.
        const clear =
          (narrow
            ? clamp01((sy - 26 * s - (clearY[act] ?? 0)) / 24)
            : clamp01((sx - w.half * s - clearX) / 36)) *
          clamp01((sx - w.half * s) / 24) *
          clamp01((win.clientWidth - sx - w.half * s) / 24);
        w.el.style.opacity = String(clamp01((x - w.at) / 180) * clear * after);
      }
      if (alts)
        alts.style.opacity = String(0.62 - 0.5 * clamp01((x - 3860) / 200));
      // The sun rises slowly over the lake through the last act.
      if (sun)
        sun.setAttribute(
          "transform",
          `translate(0 ${((1 - clamp01((p - 3.1) / 0.85)) * 110).toFixed(1)})`,
        );
      if (hint) hint.dataset.shown = String(p < 0.12);

      setAct(act);

      // Narration pauses while the ride is off screen and resumes on return.
      const away = rect.bottom < 0 || rect.top > window.innerHeight;
      if (away !== offscreen) {
        offscreen = away;
        if (away) quiet();
        else speak();
      }
    };
    const schedule = () => {
      if (!frame && live()) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      apply();
      if (!live()) return;
      size();
      schedule();
    };

    // Phones, reduced motion, and short screens (including a laptop at
    // 200 % zoom) get still panels with the drawing beside its explanation.
    const still = () =>
      motion.matches || window.innerWidth <= 760 || window.innerHeight < 520;
    const drawn = [
      ...words.map(({ el }) => el as SVGElement),
      ...(alts ? [alts] : []),
      route,
    ];
    const sunAt = sun?.getAttribute("transform");
    const apply = () => {
      const mode = still() ? "static" : "live";
      if (mode === section.dataset.mode) return;
      section.dataset.mode = mode;
      if (mode === "static") {
        cancelAnimationFrame(frame);
        frame = 0;
        // The panels clone the live drawing: put back what the ride moved.
        for (const el of drawn)
          el.style.opacity = el.style.strokeDashoffset = "";
        if (sunAt) sun?.setAttribute("transform", sunAt);
        else sun?.removeAttribute("transform");
        offscreen = false;
        return;
      }
      size();
      update();
    };
    apply();
    // A keyboard user tabbing to an act's link is taken to that act, so the
    // text and the landscape always match.
    const onFocus = (e: FocusEvent) => {
      const i = acts.findIndex((a) => a.contains(e.target as Node));
      if (live() && i >= 0 && i !== currentAct)
        document
          .getElementById(`parcours-0${i + 1}`)
          ?.scrollIntoView({ block: "start", behavior: "instant" });
    };
    textCol?.addEventListener("focusin", onFocus);
    // Text metrics settle once the web fonts arrive.
    let alive = true;
    document.fonts?.ready.then(() => {
      if (alive && live()) onResize();
    });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);
    motion.addEventListener("change", apply);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      motion.removeEventListener("change", apply);
      for (const b of sounds) b.removeEventListener("click", onSound);
      textCol?.removeEventListener("focusin", onFocus);
      cancelAnimationFrame(fade);
      audio?.pause();
      section.dataset.mode = "static";
      delete section.dataset.ready;
    };
  }, []);

  return <>{children}</>;
}
