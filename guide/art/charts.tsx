import type { Language } from "@/lib/business";
import { Art, Label } from "@/components/ink/primitives";
import { P, Sketch, type Pt } from "./kit";

/*
 * Diagrams drawn by the same hand as the illustrations: pen lines, engraved
 * hatching for areas, pencil guides, labels in the serif italic. Nothing
 * here is decoration: each one carries the idea of its page.
 *
 * Every number behind these shapes is hypothetical and stated as such on
 * the page. None of them shows an amount.
 */

const pencilPath = (d: string) => (
  <path
    d={d}
    fill="none"
    stroke="var(--pencil, #a7b4c3)"
    strokeWidth={0.7}
    strokeLinecap="round"
    opacity={0.8}
  />
);

/* ------------------------------------------------------------------ */
/* Chapter 3: the gap changes over time                                 */
/* ------------------------------------------------------------------ */

export const GAP = { w: 672, h: 540 };

export function GapChart({
  labels,
}: {
  lang: Language;
  labels: {
    spending: string;
    gap: string;
    pension: string;
    qpp: string;
    oas: string;
    axis: string[];
  };
}) {
  const s = new Sketch(7301);
  const base = 440,
    x0 = 30,
    x1 = 246,
    x2 = 400,
    x3 = 650;
  const pensionTop = 372,
    qppTop = 308,
    oasTop = 262;
  // What you spend: higher in the active early years, settling, and
  // rising a little much later.
  const spend = P(
    `${x0},136 110,132 190,140 ${x1},152 330,164 ${x2},170 480,176 560,170 610,158 ${x3},150`,
  );
  // Income that arrives on its own, stacked, each from its own start.
  const stackTop = (x: number) =>
    x < x1 ? pensionTop : x < x2 ? qppTop : oasTop;
  const pension: Pt[] = [
    [x0, base],
    [x0, pensionTop],
    [x3, pensionTop],
    [x3, base],
  ];
  const qpp: Pt[] = [
    [x1, pensionTop],
    [x1, qppTop],
    [x3, qppTop],
    [x3, pensionTop],
  ];
  const oas: Pt[] = [
    [x2, qppTop],
    [x2, oasTop],
    [x3, oasTop],
    [x3, qppTop],
  ];
  s.wash(pension, "stone", 0.75, 0.8);
  s.wash(qpp, "blue", 0.6, 0.8);
  s.wash(oas, "blue", 0.32, 0.8);
  // The gap: between what arrives and what you spend, hatched.
  const spendAt = (x: number) => {
    for (let i = 1; i < spend.length; i++)
      if (x <= spend[i][0]) {
        const [a, b] = [spend[i - 1], spend[i]];
        return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
      }
    return spend[spend.length - 1][1];
  };
  const gap: Pt[] = [];
  for (let x = x0; x <= x3; x += 5) gap.push([x, spendAt(x) + 3]);
  for (let x = x3; x >= x0; x -= 1) {
    const y = stackTop(x) - 3;
    gap.push([x, y]);
  }
  s.hatch(gap, { angle: 120, gap: 3.4, inset: 1.2, w: 0.5 });

  // Bands: the top edge of each, with its riser.
  s.stroke(
    [
      [x0, base],
      [x0, pensionTop],
      [x3, pensionTop],
    ],
    { w: 1.1, smooth: false, taper: 0.3 },
  );
  s.stroke(
    [
      [x1, pensionTop],
      [x1, qppTop],
      [x3, qppTop],
    ],
    { w: 1.1, smooth: false, taper: 0.3 },
  );
  s.stroke(
    [
      [x2, qppTop],
      [x2, oasTop],
      [x3, oasTop],
    ],
    { w: 1.1, smooth: false, taper: 0.3 },
  );
  // What you spend: the pen line, gone over twice.
  s.twice(spend, { w: 1.6 });
  // Baseline and ticks.
  s.stroke(
    [
      [x0 - 10, base],
      [x3 + 8, base],
    ],
    { w: 1.2, smooth: false, taper: 0.6 },
  );
  for (const x of [x0, x1, x2])
    s.line([x, base], [x, base + 7], { w: 0.8, overshoot: 0 });
  let guides = "";
  for (const x of [x1, x2])
    guides += `M${x} ${spendAt(x) - 30}L${x} ${stackTop(x - 1) - 1}`;
  guides += `M${x0} ${spendAt(x0) - 30}L${x0} ${pensionTop - 1}`;

  const [aRet, aQpp, aOas, aLater] = labels.axis;
  return (
    <Art w={GAP.w} h={GAP.h}>
      {pencilPath(guides)}
      {s.render()}
      <Label x={x3} y={spendAt(x3) - 14} size={15} anchor="end">
        {labels.spending}
      </Label>
      <Label x={x0 + 14} y={pensionTop + 40} size={14.5}>
        {labels.pension}
      </Label>
      <Label x={x1 + 14} y={qppTop + 38} size={14.5}>
        {labels.qpp}
      </Label>
      <Label x={x2 + 14} y={oasTop + 30} size={14.5}>
        {labels.oas}
      </Label>
      <foreignObject x={x0 + 20} y={210} width={200} height={90}>
        <p
          style={{
            margin: 0,
            font: "italic 400 15px/1.3 var(--serif)",
            color: "var(--navy-2)",
            background: "var(--page-bg, #faf9f5)",
            padding: "3px 6px",
            display: "inline",
            boxDecorationBreak: "clone",
            WebkitBoxDecorationBreak: "clone",
          }}
        >
          {labels.gap}
        </p>
      </foreignObject>
      <Label x={x0} y={base + 26} size={13.5}>
        {aRet}
      </Label>
      <Label x={x1} y={base + 26} size={13.5}>
        {aQpp}
      </Label>
      <Label x={x2} y={base + 26} size={13.5}>
        {aOas}
      </Label>
      <Label x={x3} y={base + 26} size={13.5} anchor="end">
        {aLater}
      </Label>
    </Art>
  );
}

/* ------------------------------------------------------------------ */
/* Chapter 4: the same returns, in opposite order                       */
/* ------------------------------------------------------------------ */

/**
 * An invented series of 25 yearly returns (%), averaging about 5.6%: two
 * bad years, then a mix. Used only to show the effect of order.
 */
export const RETURNS = [
  -18, -9, 4, 11, 7, 9, 6, 12, 3, 8, 10, 5, 7, 9, 2, 11, 6, 8, 4, 10, 7, 5, 9,
  6, 8,
];

/** Balance year by year with a fixed yearly flow (+ adds, − withdraws). */
export function path(returns: number[], start: number, flow: number) {
  const v = [start];
  let b = start;
  for (const r of returns) {
    b = (b + flow) * (1 + r / 100);
    v.push(Math.max(0, b));
  }
  return v;
}

export const SEQ = { w: 320, h: 262 };

export function SequencePanel({
  mode,
  labels,
}: {
  lang: Language;
  mode: "saving" | "drawing";
  labels: { first: string; last: string; start: string; years: string };
}) {
  const s = new Sketch(mode === "saving" ? 7411 : 7433);
  const [start, flow] = mode === "saving" ? [20, 4] : [100, -5];
  const first = path(RETURNS, start, flow),
    last = path([...RETURNS].reverse(), start, flow);
  const max = Math.max(...first, ...last) * 1.02;
  const X = (i: number) => 12 + (i / 25) * 206,
    Y = (v: number) => 232 - (v / max) * 172;
  const line = (vals: number[]): Pt[] => vals.map((v, i) => [X(i), Y(v)]);
  const A = line(first),
    B = line(last);
  const guide = `M${X(0)} ${Y(start)}L${X(25) + 4} ${Y(start)}`;
  s.stroke(
    [
      [6, 232],
      [X(25) + 8, 232],
    ],
    { w: 1, smooth: false, taper: 0.7 },
  );
  // The two bad years, shaded like a passing shower: a pale band with
  // rain-slanted hatching, at the start for one line and the end for the
  // other.
  const band = (i0: number, soft: boolean) => {
    const q: Pt[] = [
      [X(i0), 52],
      [X(i0 + 2), 52],
      [X(i0 + 2), 231],
      [X(i0), 231],
    ];
    s.wash(q, "blue", soft ? 0.28 : 0.45, 0.5);
    s.hatch(q, { angle: 70, gap: 3.4, inset: 0.6, w: 0.4, soft: true });
  };
  band(0, false);
  band(23, true);
  s.twice(A, { w: 1.6 });
  s.stroke(B, { w: 1, soft: true });
  s.ellipse(A[0][0], A[0][1], 2.4, 2.4, { w: 0.9 });
  const endA = A[25],
    endB = B[25];
  const aHigh = endA[1] < endB[1];
  const apart = Math.abs(endA[1] - endB[1]) < 16;
  return (
    <Art w={SEQ.w} h={SEQ.h}>
      {pencilPath(guide)}
      {s.render()}
      <Label
        x={X(25) + 8}
        y={endA[1] + (aHigh ? (apart ? -4 : 2) : apart ? 12 : 6)}
        size={12.5}
      >
        {labels.first}
      </Label>
      <Label
        x={X(25) + 8}
        y={endB[1] + (aHigh ? (apart ? 12 : 6) : apart ? -4 : 2)}
        size={12.5}
      >
        {labels.last}
      </Label>
      <Label x={X(0)} y={250} size={12}>
        {labels.start}
      </Label>
      <Label x={X(25)} y={250} size={12} anchor="end">
        {labels.years}
      </Label>
    </Art>
  );
}

/* ------------------------------------------------------------------ */
/* Chapter 8: one point a year, over 25 years                           */
/* ------------------------------------------------------------------ */

export const FEES = { w: 640, h: 236 };

export function FeeChart({
  labels,
}: {
  lang: Language;
  labels: { lower: string; higher: string; result: string; axis: string[] };
}) {
  const s = new Sketch(7507);
  const a = Array.from({ length: 26 }, (_, t) => 1.05 ** t),
    b = Array.from({ length: 26 }, (_, t) => 1.04 ** t);
  const X = (t: number) => 20 + (t / 25) * 420,
    Y = (v: number) => 206 - ((v - 0.6) / (3.5 - 0.6)) * 190;
  const A: Pt[] = a.map((v, t) => [X(t), Y(v)]),
    B: Pt[] = b.map((v, t) => [X(t), Y(v)]);
  s.stroke(
    [
      [12, 206],
      [X(25) + 12, 206],
    ],
    { w: 1, smooth: false, taper: 0.7 },
  );
  // the space between them, lightly hatched
  s.hatch([...A, ...B.slice().reverse()], {
    angle: 120,
    gap: 3.2,
    inset: 0.6,
    w: 0.45,
    soft: true,
  });
  s.twice(A, { w: 1.5 });
  s.stroke(B, { w: 1.2 });
  s.ellipse(A[0][0], A[0][1], 2.4, 2.4, { w: 0.9 });
  // a bracket at 25 years
  const xa = X(25) + 12;
  s.stroke(
    [
      [xa - 4, A[25][1]],
      [xa, A[25][1] + 3],
      [xa, B[25][1] - 3],
      [xa - 4, B[25][1]],
    ],
    { w: 0.8, smooth: false, taper: 0.4 },
  );
  const guide = `M${X(0)} ${Y(1)}L${X(25)} ${Y(1)}`;
  return (
    <Art w={FEES.w} h={FEES.h}>
      {pencilPath(guide)}
      {s.render()}
      <Label x={X(17)} y={A[17][1] - 12} size={13.5} anchor="end">
        {labels.lower}
      </Label>
      <Label x={X(15)} y={B[15][1] + 22} size={13.5} anchor="start">
        {labels.higher}
      </Label>
      <Label x={xa + 10} y={(A[25][1] + B[25][1]) / 2 + 5} size={13.5}>
        {labels.result}
      </Label>
      <Label x={X(0)} y={228} size={12.5}>
        {labels.axis[0]}
      </Label>
      <Label x={X(25)} y={228} size={12.5} anchor="end">
        {labels.axis[1]}
      </Label>
    </Art>
  );
}

/* ------------------------------------------------------------------ */
/* Chapter 7: the same containers, one year at a time                   */
/* ------------------------------------------------------------------ */

export const PLAN = { w: 672, h: 176 };

export function PlanDiagram({
  containers,
  centre,
  effects,
}: {
  lang: Language;
  containers: string[];
  centre: string;
  effects: string[];
}) {
  const s = new Sketch(7603);
  const ys = containers.map((_, i) => 18 + i * 34);
  const boxW = 128;
  // small hand-ruled boxes, one per container
  ys.forEach((y) => {
    const q: Pt[] = [
      [0, y],
      [boxW, y],
      [boxW, y + 24],
      [0, y + 24],
    ];
    s.wash(q, "ivory", 1, 0.3);
    s.poly(q, { w: 0.8, closed: true, overshoot: 0.6 });
  });
  // threads converging on this year's income
  const c: Pt = [300, 88];
  const cw = 86;
  const cq: Pt[] = [
    [c[0] - cw, c[1] - 22],
    [c[0] + cw, c[1] - 22],
    [c[0] + cw, c[1] + 22],
    [c[0] - cw, c[1] + 22],
  ];
  ys.forEach((y) =>
    s.stroke(
      [
        [boxW + 4, y + 12],
        [boxW + 40, y + 12 + (c[1] - y - 12) * 0.4],
        [c[0] - cw - 4, c[1] + (y + 12 - c[1]) * 0.12],
      ],
      { w: 0.7, taper: 0.7 },
    ),
  );
  s.wash(cq, "stone", 0.5, 0.6);
  s.twice([...cq, cq[0]], { w: 1.2, smooth: false });
  // and out to what each year's choice touches
  const ex = 510;
  const ey = [40, 88, 136];
  ey.forEach((y) => {
    s.stroke(
      [
        [c[0] + cw + 4, c[1] + (y - c[1]) * 0.12],
        [c[0] + cw + 40, c[1] + (y - c[1]) * 0.6],
        [ex - 10, y],
      ],
      { w: 0.7, taper: 0.7 },
    );
    s.stroke(
      [
        [ex - 16, y - 4],
        [ex - 9, y],
        [ex - 16, y + 4],
      ],
      { w: 0.7, smooth: false, taper: 0.5 },
    );
  });
  return (
    <Art w={PLAN.w} h={PLAN.h}>
      {s.render()}
      {containers.map((t, i) => (
        <Label key={t} x={boxW / 2} y={ys[i] + 17} size={13.5} anchor="middle">
          {t}
        </Label>
      ))}
      <Label x={c[0]} y={c[1] + 5} size={15} anchor="middle">
        {centre}
      </Label>
      {effects.map((t, i) => (
        <Label key={t} x={ex} y={ey[i] + 5} size={15}>
          {t}
        </Label>
      ))}
    </Art>
  );
}
