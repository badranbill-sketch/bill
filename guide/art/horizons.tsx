import type { Language } from "@/lib/business";
import { Art, Label } from "@/components/ink/primitives";
import {
  birch,
  figure,
  forest,
  inside,
  leaves,
  P,
  S,
  Sketch,
  spires,
  spruce,
  tuft,
  visible,
  type Pt,
} from "./kit";

/*
 * Chapter 6: time drawn as distance. A path runs from our feet to the far
 * hills; three trail posts stand beside it, near, halfway and far. Money
 * for soon is the post at hand; money for much later is the one you can
 * barely see. Near things are drawn large and firm, far things small and
 * pale, as they are in any landscape.
 */
export const HORIZONS = { w: 816, h: 1056 };

const HZ = 318;
/** The path's centre line, from our feet to the horizon. */
const CENTRE: Pt[] = P(
  "404,1080 372,980 330,890 322,810 360,740 430,680 470,630 468,580 432,530 402,490 398,452 420,418 444,390 456,366 458,346 456,330 455,321",
);
const widthAt = (y: number) => Math.max(1.2, 0.17 * (y - HZ));

function centreAt(y: number): number {
  for (let i = 1; i < CENTRE.length; i++) {
    const [a, b] = [CENTRE[i - 1], CENTRE[i]];
    if (y <= a[1] && y >= b[1])
      return a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]);
  }
  return CENTRE[CENTRE.length - 1][0];
}

/** A trail post with a small plank, scaled by its distance. */
function post(s: Sketch, [x, y]: Pt, h: number) {
  const w = Math.max(1.2, h * 0.09);
  const top = y - h;
  const body: Pt[] = [
    [x - w / 2, y],
    [x + w / 2, y],
    [x + w / 2, top],
    [x - w / 2, top],
  ];
  s.wash(body, "stone", 0.8, Math.min(0.6, h * 0.01));
  s.line([x - w / 2, y], [x - w / 2, top], {
    w: Math.min(1.1, 0.4 + h * 0.008),
    overshoot: 0,
  });
  s.line([x + w / 2, y], [x + w / 2, top], {
    w: Math.min(1.3, 0.45 + h * 0.01),
    overshoot: 0,
  });
  s.line([x - w / 2, top], [x + w / 2, top], { w: 0.5, overshoot: 0 });
  if (h > 30)
    s.hatch(
      [
        [x + w * 0.05, y - 1],
        [x + w / 2 - 0.4, y - 1],
        [x + w / 2 - 0.4, top + 1],
        [x + w * 0.05, top + 1],
      ],
      { angle: 92, gap: 1.8, inset: 0.2 },
    );
  // the plank, a little below the top
  const pw = h * 0.46,
    ph = h * 0.14,
    py = top + h * 0.08;
  const plank: Pt[] = [
    [x - pw * 0.15, py],
    [x + pw, py + ph * 0.1],
    [x + pw + ph * 0.3, py + ph * 0.55],
    [x + pw, py + ph],
    [x - pw * 0.15, py + ph * 0.9],
  ];
  s.wash(plank, "ivory", 1, 0.3);
  s.stroke([...plank, plank[0]], {
    w: Math.min(1, 0.4 + h * 0.006),
    smooth: false,
    taper: 0.3,
  });
  return { plank: [x + pw * 0.4, py + ph * 0.5] as Pt, top: [x, top] as Pt };
}

export function Horizons({ labels }: { lang: Language; labels: string[] }) {
  const s = new Sketch(9203);
  const hide: Pt[][] = [];

  // Construction marks at the eye level.
  s.pencil([20, HZ], [48, HZ]);
  s.pencil([768, HZ], [796, HZ]);

  // Near framing: a birch on the left, a spruce on the right.
  hide.push(birch(s, 44, 1070, 360, 22, 7, 8, 11));
  hide.push(birch(s, 100, 1040, 470, 13, 5, 2, 8));
  leaves(s, [70, 400], 70, 56, 110, 0.24);
  hide.push(spruce(s, [764, 1000], 420, 1.2));
  hide.push(spruce(s, [700, 930], 250, 1));
  for (const b of [
    "48,470 34,448 24,434",
    "50,430 64,406 74,394",
    "102,520 112,500 118,490",
  ])
    s.stroke(P(b), { w: 0.6, taper: 0.9, soft: true });

  // The path, widening toward us, with its edges.
  const ys: number[] = [];
  for (let y = 1080; y > HZ + 2; y -= y > 600 ? 16 : y > 420 ? 8 : 3)
    ys.push(y);
  const L: Pt[] = ys.map((y) => [centreAt(y) - widthAt(y) / 2, y]);
  const R: Pt[] = ys.map((y) => [centreAt(y) + widthAt(y) / 2, y]);
  s.wash([...L, ...R.slice().reverse()], "stone", 0.42, 1.2);
  s.stroke(L, { w: S, taper: 0.9, hide });
  s.stroke(R, { w: S, taper: 0.9, hide });
  // ruts and stones, fewer with distance
  let ruts = "";
  for (let i = 0; i < 26; i++) {
    const y = HZ + 40 + Math.pow(s.rand(0, 1), 0.7) * 700;
    const c = centreAt(y),
      w = widthAt(y);
    const x = c + s.rand(-0.35, 0.35) * w,
      l = w * s.rand(0.05, 0.12);
    ruts += `M${x.toFixed(1)} ${y.toFixed(1)}L${(x + l).toFixed(1)} ${(y + 0.3).toFixed(1)}`;
  }
  s.thinLines(ruts, 0.55, true);

  // A rail fence along the right of the path, receding.
  const fence: Pt[] = [];
  for (let y = 1000; y > 470; y -= Math.max(18, (y - HZ) * 0.22)) {
    const x = centreAt(y) + widthAt(y) * 0.5 + (y - HZ) * 0.16;
    fence.push([x, y]);
  }
  fence.forEach(([x, y], i) => {
    const h = (y - HZ) * 0.085;
    s.line([x, y], [x, y - h], {
      w: Math.min(1.1, 0.35 + h * 0.012),
      overshoot: 0,
      hide,
    });
    if (i > 0) {
      const [px, py] = fence[i - 1],
        ph = (py - HZ) * 0.085;
      s.line([px, py - ph * 0.85], [x, y - h * 0.85], {
        w: Math.min(0.9, 0.3 + h * 0.01),
        overshoot: 0,
        hide,
      });
      s.line([px, py - ph * 0.45], [x, y - h * 0.45], {
        w: Math.min(0.8, 0.3 + h * 0.008),
        overshoot: 0,
        soft: true,
        hide,
      });
    }
  });

  // Middle distance: a stand of birches left of the path.
  for (const [x, base, top, w0] of [
    [236, 640, 470, 5.5],
    [256, 632, 486, 4.5],
    [214, 650, 500, 4.2],
  ] as const)
    hide.push(birch(s, x, base, top, w0, 2, 1, 4));
  leaves(s, [238, 486], 38, 28, 60, 0.22);

  // Far: hills, a treeline, a glimpse of water.
  s.stroke(
    P(
      `60,${HZ - 18} 160,${HZ - 40} 260,${HZ - 48} 350,${HZ - 34} 430,${HZ - 14} 470,${HZ - 6}`,
    ),
    {
      w: 0.55,
      taper: 0.95,
      soft: true,
      hide,
    },
  );
  s.stroke(
    P(
      `430,${HZ - 4} 520,${HZ - 40} 620,${HZ - 62} 720,${HZ - 52} 800,${HZ - 30}`,
    ),
    {
      w: 0.6,
      taper: 0.9,
      soft: true,
      hide,
    },
  );
  const far = [
    spires(s, 120, 440, HZ, 6.5, 2),
    spires(s, 470, 760, HZ, 7.5, 2.5),
  ];
  forest(
    s,
    far.flatMap((t) => visible(t, hide, false)),
    HZ,
    1.5,
    0.32,
  );
  s.wash(
    P(`130,${HZ + 3} 380,${HZ + 3} 400,${HZ + 12} 150,${HZ + 12}`),
    "blue",
    0.4,
    1,
  );
  for (const [x, l] of [
    [180, 12],
    [240, 16],
    [310, 10],
  ] as const)
    s.dash([x, HZ + 8], [x + l, HZ + 8], 0.45);
  s.line([170, 200], [256, 199], { w: 0.5, soft: true, taper: 0.9 });
  s.line([196, 208], [234, 208], { w: 0.45, soft: true, taper: 0.9 });
  s.line([540, 156], [620, 155], { w: 0.45, soft: true, taper: 0.9 });

  // The three posts: near, halfway, far.
  const at = (y: number, side: number, off: number): Pt => [
    centreAt(y) + side * (widthAt(y) / 2 + off * (y - HZ)),
    y,
  ];
  const p1 = post(s, at(930, -1, 0.06), 104);
  const p2 = post(s, at(606, 1, 0.08), 42);
  const p3 = post(s, at(392, 1, 0.1), 12);

  // The two of them, walking on, between the first post and the second.
  figure(s, [440, 700], 44, { stride: 0.35, coat: true });
  figure(s, [459, 701], 41, { stride: -0.3, wide: 0.95 });

  // Grass, bigger near us.
  for (const [x, y, h] of [
    [150, 1030, 11],
    [210, 990, 10],
    [250, 944, 9],
    [150, 930, 9],
    [620, 1030, 11],
    [590, 980, 10],
    [560, 930, 9],
    [540, 860, 8],
    [236, 860, 8],
    [250, 800, 7],
    [296, 752, 6],
    [520, 760, 7],
    [556, 700, 6],
    [330, 700, 5],
    [520, 660, 5],
    [340, 560, 4],
    [500, 560, 4],
  ] as const)
    if (!hide.some((h2) => inside([x, y], h2))) tuft(s, [x, y], h);

  const tags: [Pt, number, number][] = [
    [p1.plank, 14, 0],
    [p2.plank, 9, 1],
    [p3.plank, 7, 2],
  ];
  return (
    <Art w={HORIZONS.w} h={HORIZONS.h}>
      {s.render()}
      {tags.map(([q, r, i]) => {
        const lx = q[0] + [70, 36, 26][i],
          ly = q[1] - [46, 22, 14][i];
        const mx = lx - 14;
        return (
          <g key={i}>
            <path
              className="leader"
              d={`M${(q[0] + [34, 10, 3][i]).toFixed(1)} ${(q[1] - 1).toFixed(1)}L${(mx - 7).toFixed(1)} ${(ly + 1).toFixed(1)}`}
            />
            <circle
              cx={mx}
              cy={ly - 5}
              r={9.5}
              fill="#faf9f5"
              stroke="#a8875a"
              strokeWidth={0.9}
            />
            <text
              x={mx}
              y={ly - 1}
              textAnchor="middle"
              fontSize={12.5}
              style={{
                fontFamily: "var(--serif)",
                fontStyle: "italic",
                fill: "#7a5d33",
              }}
            >
              {["a", "b", "c"][i]}
            </text>
            <Label x={lx} y={ly} size={[17, 15.5, 14.5][i]} anchor="start">
              {labels[i]}
            </Label>
            {void r}
          </g>
        );
      })}
    </Art>
  );
}
