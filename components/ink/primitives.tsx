import type { ReactNode } from "react";

/*
 * Building blocks for the pen-and-ink illustrations. Geometry comes from
 * `Pen` in lib/ink.ts; these components only decide how it is painted.
 * Colours and line weights live in app/ink.css so every drawing matches.
 */

/** Pen lines (outlines from Pen.stroke/line/poly/ellipse), filled with ink. */
export function Ink({ d, soft }: { d: string; soft?: boolean }) {
  return <path d={d} className={soft ? "ink soft" : "ink"} />;
}

/** Hatching (centre lines from Pen.hatch), stroked thin. */
export function Hatch({
  d,
  w = 0.6,
  soft,
}: {
  d: string;
  w?: number;
  soft?: boolean;
}) {
  return (
    <path d={d} className={soft ? "hatch soft" : "hatch"} strokeWidth={w} />
  );
}

/** Faint pencil construction lines (Pen.pencil). */
export function Pencil({ d }: { d: string }) {
  return <path d={d} className="pencil" />;
}

export type Tone = "blue" | "stone" | "brass" | "navy" | "ivory";

/** A watercolour wash: soft, uneven edges and a darker rim where pigment pools. */
export function Wash({
  d,
  tone = "blue",
  strength = 1,
}: {
  d: string;
  tone?: Tone;
  strength?: number;
}) {
  return (
    <g
      className={`wash ${tone}`}
      filter="url(#ink-wash)"
      style={strength === 1 ? undefined : { opacity: strength }}
    >
      <path d={d} className="wash-fill" />
      <path d={d} className="wash-edge" />
    </g>
  );
}

/** A handwritten note, as Bill might jot in a margin. */
export function Note({
  x,
  y,
  size = 20,
  rotate = 0,
  anchor,
  children,
}: {
  x: number;
  y: number;
  size?: number;
  rotate?: number;
  anchor?: "start" | "middle" | "end";
  children: ReactNode;
}) {
  return (
    <text
      className="note"
      x={x}
      y={y}
      fontSize={size}
      textAnchor={anchor}
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
    >
      {children}
    </text>
  );
}

/**
 * A printed caption set in the serif italic, with an optional hairline
 * leader to what it names: the way an architect labels a plate. Use it for
 * anything that is not literally written by hand inside the scene.
 */
export function Label({
  x,
  y,
  size = 14,
  anchor,
  to,
  children,
}: {
  x: number;
  y: number;
  size?: number;
  anchor?: "start" | "middle" | "end";
  /** Leader line from just beside the text to this point. */
  to?: [number, number];
  children: ReactNode;
}) {
  const from: [number, number] | undefined = to && [
    anchor === "end" ? x + 4 : anchor === "middle" ? x : x - 4,
    to[1] > y ? y + 4 : y - size * 0.75,
  ];
  return (
    <g>
      {from && to && (
        <path
          className="leader"
          d={`M${from[0].toFixed(1)} ${from[1].toFixed(1)}L${to[0].toFixed(1)} ${to[1].toFixed(1)}`}
        />
      )}
      <text className="label" x={x} y={y} fontSize={size} textAnchor={anchor}>
        {children}
      </text>
    </g>
  );
}

/**
 * An illustration. Decorative unless it has a `label`, in which case it is
 * announced as a single image.
 */
export function Art({
  w,
  h,
  label,
  className,
  children,
}: {
  w: number;
  h: number;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className ? `ink-art ${className}` : "ink-art"}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Shared SVG filters, rendered once per page. */
export function InkDefs() {
  return (
    <svg className="ink-defs" aria-hidden="true" focusable="false">
      <defs>
        <filter
          id="ink-wash"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.024"
            numOctaves={3}
            seed={4}
            result="warp"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="warp"
            scale={3.5}
            xChannelSelector="R"
            yChannelSelector="G"
            result="shape"
          />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.55"
            numOctaves={2}
            seed={11}
            result="grain"
          />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.35 1.05"
            result="speck"
          />
          <feComposite in="shape" in2="speck" operator="in" result="grainy" />
          <feGaussianBlur in="grainy" stdDeviation="0.6" />
        </filter>
      </defs>
    </svg>
  );
}
