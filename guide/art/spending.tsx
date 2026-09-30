import type { Language } from "@/lib/business";
import { Art } from "@/components/ink/primitives";
import { P, rot, S, Sketch, type Pt } from "./kit";

/*
 * Chapter 2: one year of retirement, laid out on the kitchen table and
 * seen from straight above, like a plate in an architect's notebook. Each
 * kind of spending is an everyday object, numbered to match the list on
 * the facing page: the keys and the grocery list, two tickets, the
 * roofer's quote, a map and passports, a calendar of appointments.
 */
export const SPENDING = { w: 672, h: 470 };

const WORDS = {
  en: {
    list: ["milk, bread", "coffee", "hydro", "insurance"],
    quote: ["Roof", "Estimate"],
    month: "March",
  },
  fr: {
    list: ["lait, pain", "café", "Hydro", "assurances"],
    quote: ["Toiture", "Soumission"],
    month: "Mars",
  },
};

const rectAt = (
  x: number,
  y: number,
  w: number,
  h: number,
  deg: number,
): Pt[] =>
  rot(
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    [x + w / 2, y + h / 2],
    deg,
  );

/** Lines across a rotated sheet, from u0 to u1 (fractions of its width). */
function ruled(q: Pt[], rows: number[], u0 = 0.1, u1 = 0.9): string {
  const [a, b, , d] = q;
  let out = "";
  for (const v of rows) {
    const p0: Pt = [
      a[0] + (b[0] - a[0]) * u0 + (d[0] - a[0]) * v,
      a[1] + (b[1] - a[1]) * u0 + (d[1] - a[1]) * v,
    ];
    const p1: Pt = [
      a[0] + (b[0] - a[0]) * u1 + (d[0] - a[0]) * v,
      a[1] + (b[1] - a[1]) * u1 + (d[1] - a[1]) * v,
    ];
    out += `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`;
  }
  return out;
}

/** Where a fraction (u, v) of a rotated sheet lands. */
const at = (q: Pt[], u: number, v: number): Pt => [
  q[0][0] + (q[1][0] - q[0][0]) * u + (q[3][0] - q[0][0]) * v,
  q[0][1] + (q[1][1] - q[0][1]) * u + (q[3][1] - q[0][1]) * v,
];

const shadow = (q: Pt[], k = 4): Pt[] => q.map(([x, y]) => [x + k, y + k]);

export function SpendingTable({ lang }: { lang: Language }) {
  const w = WORDS[lang];
  const s = new Sketch(6203);
  const notes: { x: number; y: number; t: string; r: number; size?: number }[] =
    [];
  const marks: { n: number; at: Pt }[] = [];
  const paper = (q: Pt[], hide: Pt[][] = [], k = 4) => {
    s.hatch(shadow(q, k), {
      angle: 120,
      gap: 2.6,
      inset: 0.3,
      hide: [q, ...hide],
    });
    s.wash(q, "ivory", 1, 0.3);
    s.poly(q, { w: 0.9, closed: true, overshoot: 0.3, hide });
  };

  // The table: a long top seen from above, its edge and a little grain.
  const T: Pt[] = [
    [18, 26],
    [654, 26],
    [654, 452],
    [18, 452],
  ];
  s.wash(T, "stone", 0.34, 1.4);
  s.stroke([T[0], T[1]], { w: 0.8, taper: 0.7, smooth: false, soft: true });
  s.stroke([T[1], T[2]], { w: 1.3, taper: 0.5, smooth: false });
  s.stroke([T[2], T[3]], { w: 1.3, taper: 0.5, smooth: false });
  s.stroke([T[3], T[0]], { w: 0.8, taper: 0.7, smooth: false, soft: true });
  s.line([30, 460], [650, 460], { w: 0.6, soft: true, overshoot: 0 });
  s.line([662, 36], [662, 458], { w: 0.6, soft: true, overshoot: 0 });
  let grain = "";
  for (const [y, x0, x1] of [
    [44, 250, 420],
    [238, 26, 120],
    [250, 560, 646],
    [436, 330, 520],
    [140, 440, 470],
  ])
    grain += `M${x0} ${y}C${x0 + 30} ${y - 1.5} ${x1 - 30} ${y + 1.5} ${x1} ${y}`;
  s.thinLines(grain, 0.4, true);

  /* 1 — The basics: the house keys and the grocery list. */
  const list = rectAt(52, 58, 116, 150, -5);
  paper(list);
  s.thinLines(ruled(list, [0.2, 0.34, 0.48, 0.62, 0.76, 0.9]), 0.4, true);
  w.list.forEach((t, i) =>
    notes.push({
      ...(() => {
        const p = at(list, 0.13, 0.18 + i * 0.14);
        return { x: p[0], y: p[1] };
      })(),
      t,
      r: -5,
      size: 17,
    }),
  );
  // keys on a ring
  const kc: Pt = [206, 132];
  s.ellipse(kc[0], kc[1], 13, 13, { w: 1 });
  s.ellipse(kc[0], kc[1], 10.6, 10.6, { w: 0.4, soft: true });
  const key = (deg: number, len: number) => {
    const bow = rot(
      P(`0,-7 5,-9 9,-5 9,5 5,9 0,7`).map(([x, y]): Pt => [
        kc[0] + 16 + x,
        kc[1] + y,
      ]),
      kc,
      deg,
    );
    const blade = rot(
      P(
        `25,-2.2 ${25 + len},-2.2 ${27 + len},0 ${25 + len},2.2 ${23 + len},2.2 ${21 + len},4 ${19 + len},2.2 25,2.2`,
      ).map(([x, y]): Pt => [kc[0] + x, kc[1] + y]),
      kc,
      deg,
    );
    s.hatch(shadow([...bow, ...blade], 3), {
      angle: 120,
      gap: 2.2,
      inset: 0.2,
      hide: [bow, blade],
    });
    s.wash(bow, "stone", 0.7, 0.2);
    s.stroke([...bow, bow[0]], { w: 0.9, taper: 0.3 });
    s.wash(blade, "stone", 0.7, 0.2);
    s.stroke([...blade, blade[0]], { w: 0.8, taper: 0.3, smooth: false });
  };
  key(20, 30);
  key(62, 24);
  key(-18, 26);
  marks.push({ n: 1, at: [44, 238] });

  /* 2 — The life you choose: two tickets. */
  const t1 = rectAt(300, 70, 118, 46, 7),
    t2 = rectAt(318, 92, 118, 46, -4);
  for (const t of [t1, t2]) {
    paper(t, t === t1 ? [t2] : [], 3);
    const perf = [at(t, 0.74, 0.08), at(t, 0.74, 0.92)];
    s.pencil(perf[0], perf[1]);
    s.thinLines(ruled(t, [0.34, 0.58], 0.1, 0.6), 0.45, true);
    if (t === t1) continue;
    s.thinLines(ruled(t, [0.34, 0.58], 0.1, 0.6), 0.5);
    s.ellipse(...at(t, 0.87, 0.5), 5, 5, { w: 0.6 });
  }
  marks.push({ n: 2, at: [458, 156] });

  /* 3 — Large, irregular costs: the roofer's quote. */
  const q = rectAt(492, 50, 128, 168, 3);
  paper(q);
  s.thinLines(ruled(q, [0.44, 0.52, 0.6, 0.68], 0.1, 0.9), 0.4, true);
  s.thinLines(ruled(q, [0.84], 0.55, 0.9), 0.8);
  // a small roof sketched in the corner
  const r0 = at(q, 0.62, 0.1),
    r1 = at(q, 0.76, 0.02),
    r2 = at(q, 0.9, 0.1);
  s.stroke([r0, r1, r2], { w: 0.7, smooth: false, taper: 0.4 });
  s.stroke(
    [at(q, 0.66, 0.1), at(q, 0.66, 0.22), at(q, 0.86, 0.22), at(q, 0.86, 0.1)],
    {
      w: 0.6,
      smooth: false,
      taper: 0.3,
    },
  );
  {
    const a = at(q, 0.1, 0.13),
      b = at(q, 0.1, 0.25);
    notes.push({ x: a[0], y: a[1], t: w.quote[0], r: 3, size: 20 });
    notes.push({ x: b[0], y: b[1], t: w.quote[1], r: 3, size: 15 });
  }
  // a paper clip holding a second sheet
  const clip = rot(
    P("0,-2 0,26 4,30 8,26 8,4 5,1 2,4 2,22").map(([x, y]): Pt => [
      512 + x,
      38 + y,
    ]),
    [516, 52],
    6,
  );
  s.stroke(clip, { w: 0.8, taper: 0.2 });
  marks.push({ n: 3, at: [620, 236] });

  /* 4 — Early projects: a map, half folded, and two passports. */
  const map = rectAt(46, 268, 250, 150, -3);
  paper(map);
  let folds = "";
  for (const u of [0.25, 0.5, 0.75]) {
    const a = at(map, u, 0),
      b = at(map, u, 1);
    folds += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  }
  const mid0 = at(map, 0, 0.5),
    mid1 = at(map, 1, 0.5);
  folds += `M${mid0[0].toFixed(1)} ${mid0[1].toFixed(1)}L${mid1[0].toFixed(1)} ${mid1[1].toFixed(1)}`;
  s.thinLines(folds, 0.45, true);
  // coastline and a route, lightly
  s.stroke(
    [
      at(map, 0.03, 0.2),
      at(map, 0.2, 0.28),
      at(map, 0.34, 0.2),
      at(map, 0.5, 0.34),
      at(map, 0.68, 0.3),
      at(map, 0.9, 0.44),
      at(map, 0.97, 0.4),
    ],
    {
      w: 0.55,
      soft: true,
      taper: 0.8,
    },
  );
  s.wash(
    [
      at(map, 0.03, 0),
      at(map, 0.97, 0),
      at(map, 0.97, 0.4),
      at(map, 0.9, 0.44),
      at(map, 0.68, 0.3),
      at(map, 0.5, 0.34),
      at(map, 0.34, 0.2),
      at(map, 0.2, 0.28),
      at(map, 0.03, 0.2),
    ],
    "blue",
    0.35,
    0.8,
  );
  const route = [
    at(map, 0.12, 0.72),
    at(map, 0.3, 0.6),
    at(map, 0.46, 0.7),
    at(map, 0.62, 0.56),
    at(map, 0.8, 0.64),
  ];
  let dashes = "";
  const rc = route;
  for (let i = 0; i < rc.length - 1; i++)
    for (let k = 0; k < 4; k++) {
      const a: Pt = [
        rc[i][0] + (rc[i + 1][0] - rc[i][0]) * (k / 4),
        rc[i][1] + (rc[i + 1][1] - rc[i][1]) * (k / 4),
      ];
      const b: Pt = [
        rc[i][0] + (rc[i + 1][0] - rc[i][0]) * ((k + 0.5) / 4),
        rc[i][1] + (rc[i + 1][1] - rc[i][1]) * ((k + 0.5) / 4),
      ];
      dashes += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
    }
  s.thinLines(dashes, 0.7);
  for (const p of [route[0], route[route.length - 1]])
    s.ellipse(p[0], p[1], 2.4, 2.4, { w: 0.7 });
  const pp1 = rectAt(238, 318, 58, 80, 12),
    pp2 = rectAt(256, 330, 58, 80, -6);
  for (const pp of [pp1, pp2]) {
    s.hatch(shadow(pp, 3), {
      angle: 120,
      gap: 2.2,
      inset: 0.3,
      hide: [pp, ...(pp === pp1 ? [pp2] : [])],
    });
    s.wash(pp, "navy", 0.24, 0.3);
    s.poly(pp, {
      w: 0.9,
      closed: true,
      overshoot: 0.2,
      hide: pp === pp1 ? [pp2] : [],
    });
  }
  const em = at(pp2, 0.5, 0.42);
  s.ellipse(em[0], em[1], 9, 9, { w: 0.6 });
  s.thinLines(ruled(pp2, [0.72], 0.25, 0.75), 0.6);
  marks.push({ n: 4, at: [36, 438] });

  /* 5 — Later needs: a calendar page with appointments circled. */
  const cal = rectAt(452, 262, 176, 164, 2);
  paper(cal);
  // two spiral rings at the top
  for (const u of [0.3, 0.7]) {
    const p = at(cal, u, 0.02);
    s.ellipse(p[0], p[1] - 3, 3, 5, { w: 0.7 });
  }
  const g0 = 0.22,
    rows = 5;
  let grid = "";
  for (let r = 0; r <= rows; r++) {
    const v = g0 + ((0.95 - g0) * r) / rows;
    grid += ruled(cal, [v], 0.05, 0.95);
  }
  for (let c = 0; c <= 7; c++) {
    const u = 0.05 + (0.9 * c) / 7;
    const a = at(cal, u, g0),
      b = at(cal, u, 0.95);
    grid += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  }
  s.thinLines(grid, 0.4, true);
  {
    const m = at(cal, 0.06, 0.15);
    notes.push({ x: m[0], y: m[1], t: w.month, r: 2, size: 19 });
  }
  for (const [c, r] of [
    [2, 1],
    [5, 2],
    [1, 3],
    [4, 4],
  ]) {
    const u = 0.05 + (0.9 * (c + 0.5)) / 7,
      v = g0 + ((0.95 - g0) * (r + 0.5)) / rows;
    const p = at(cal, u, v);
    s.ellipse(p[0], p[1], 10, 7.4, { w: 0.7, taper: 0.6 });
  }
  marks.push({ n: 5, at: [640, 440] });

  /* The morning coffee and the glasses, just to one side. */
  const cup: Pt = [362, 262];
  s.hatch(
    Array.from({ length: 20 }, (_, i): Pt => {
      const a = (i / 20) * Math.PI * 2;
      return [cup[0] + 5 + Math.cos(a) * 27, cup[1] + 5 + Math.sin(a) * 27];
    }),
    {
      angle: 120,
      gap: 2.6,
      inset: 0.3,
      hide: [
        Array.from({ length: 20 }, (_, i): Pt => {
          const a = (i / 20) * Math.PI * 2;
          return [cup[0] + Math.cos(a) * 27, cup[1] + Math.sin(a) * 27];
        }),
      ],
    },
  );
  s.ellipse(cup[0], cup[1], 27, 27, { w: 1 });
  s.ellipse(cup[0], cup[1], 16, 16, { w: 0.9 });
  s.wash(
    Array.from({ length: 16 }, (_, i): Pt => {
      const a = (i / 16) * Math.PI * 2;
      return [cup[0] + Math.cos(a) * 13.5, cup[1] + Math.sin(a) * 13.5];
    }),
    "brass",
    0.9,
    0.4,
  );
  s.stroke(
    P(
      `${cup[0] + 16},${cup[1] - 4} ${cup[0] + 26},${cup[1] - 4} ${cup[0] + 26},${cup[1] + 4} ${cup[0] + 16},${cup[1] + 4}`,
    ),
    {
      w: 0.9,
      taper: 0.4,
    },
  );
  // glasses, folded
  const gl: Pt = [398, 350];
  for (const dx of [0, 30])
    s.ellipse(gl[0] + dx, gl[1], 12, 10, { w: 0.9, taper: 0.3 });
  s.stroke(
    P(
      `${gl[0] + 12},${gl[1] - 2} ${gl[0] + 15},${gl[1] - 5} ${gl[0] + 18},${gl[1] - 2}`,
    ),
    { w: 0.7 },
  );
  s.stroke(
    P(
      `${gl[0] - 12},${gl[1] - 3} ${gl[0] + 10},${gl[1] - 12} ${gl[0] + 40},${gl[1] - 10}`,
    ),
    { w: 0.55, taper: 0.7 },
  );
  s.stroke(
    P(
      `${gl[0] + 42},${gl[1] - 3} ${gl[0] + 20},${gl[1] - 13} ${gl[0] - 8},${gl[1] - 11}`,
    ),
    { w: 0.5, taper: 0.7, soft: true },
  );
  void S;

  return (
    <Art w={SPENDING.w} h={SPENDING.h}>
      {s.render()}
      {notes.map((n, i) => (
        <text
          key={i}
          className="note"
          x={n.x}
          y={n.y}
          fontSize={n.size ?? 18}
          transform={`rotate(${n.r} ${n.x} ${n.y})`}
        >
          {n.t}
        </text>
      ))}
      {marks.map((m) => (
        <g key={m.n}>
          <circle
            cx={m.at[0]}
            cy={m.at[1]}
            r={11}
            fill="#faf9f5"
            stroke="#a8875a"
            strokeWidth={0.9}
          />
          <text
            x={m.at[0]}
            y={m.at[1] + 4.6}
            textAnchor="middle"
            fontSize={13.5}
            style={{
              fontFamily: "var(--serif)",
              fontStyle: "italic",
              fill: "#7a5d33",
            }}
          >
            {m.n}
          </text>
        </g>
      ))}
    </Art>
  );
}
