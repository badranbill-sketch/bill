import type { Language } from "@/lib/business";
import { Art } from "@/components/ink/primitives";
import {
  birch,
  D,
  figure,
  forest,
  inside,
  P,
  S,
  Sketch,
  spires,
  spruce,
  leaves,
  tuft,
  visible,
  water,
  type Pt,
} from "./kit";

/*
 * The cover: a path through the trees, down a gentle slope to a dock on a
 * lake. A couple walks down toward the water, small, seen from behind.
 * Everything recedes to one vanishing point on the far shore, and the top
 * of the drawing fades into the paper so the title can breathe.
 */
export const COVER = { w: 816, h: 604 };

export function CoverArt({ lang }: { lang: Language }) {
  void lang;
  const s = new Sketch(2611);
  const H = 250; // far shore, the eye level
  const VP: Pt = [486, H];

  // Construction marks at the eye level, just outside the scene.
  s.pencil([24, H], [52, H]);
  s.pencil([772, H], [796, H]);

  // Near things first: they hide what stands behind them.
  const hide: Pt[][] = [];
  // Left: a stand of birches, their light crowns barely there.
  hide.push(birch(s, 30, 604, 150, 15, 5.5, 5, 9));
  hide.push(birch(s, 64, 590, 212, 10, 4, 3, 7));
  hide.push(birch(s, 156, 520, 196, 11, 4.4, 5, 8));
  hide.push(birch(s, 184, 506, 238, 7.5, 3.4, -3, 6));
  hide.push(birch(s, 126, 540, 262, 8, 3.2, -2, 6));
  leaves(s, [168, 214], 58, 40, 90);
  leaves(s, [60, 176], 44, 36, 60, 0.22);
  leaves(s, [124, 278], 30, 22, 36, 0.2);
  // Right: spruce, the nearest tall, and one birch at the edge.
  hide.push(spruce(s, [712, 520], 250, 1.1));
  hide.push(spruce(s, [650, 470], 182, 1));
  hide.push(spruce(s, [606, 430], 124, 0.9));
  hide.push(spruce(s, [574, 404], 84, 0.8));
  hide.push(birch(s, 784, 604, 168, 13, 5, -5, 8));
  for (const b of [
    "33,214 22,196 14,186",
    "34,186 44,168 52,158",
    "64,262 72,246 78,236",
    "160,232 150,216 142,206",
    "161,214 172,198 180,190",
    "185,258 194,246 200,240",
    "781,222 770,204 762,194",
    "783,250 793,234 800,226",
  ])
    s.stroke(P(b), { w: 0.55, taper: 0.9, soft: true });

  // Far hills: two clean contours, the farther one lighter, broken where
  // the near trees stand in front of them.
  const hillFront = P(
    "250,250 300,232 352,220 410,218 462,228 506,244 520,250",
  );
  const hillBack = P("430,236 480,212 540,200 600,204 652,218 700,236 736,250");
  const frontSolid: Pt[] = [...hillFront, [250, 250]];
  s.stroke(hillFront, { w: 0.65, taper: 0.9, soft: true, hide });
  s.stroke(hillBack, {
    w: 0.5,
    taper: 0.95,
    soft: true,
    hide: [...hide, frontSolid],
  });
  s.stroke(P("120,250 160,240 206,236 240,242 262,250"), {
    w: 0.5,
    taper: 0.95,
    soft: true,
    hide,
  });
  // The morning sun, low over the far hill: the one warm note.
  s.wash(
    Array.from({ length: 16 }, (_, i): Pt => {
      const a = (i / 16) * Math.PI * 2;
      return [556 + Math.cos(a) * 7.5, 186 + Math.sin(a) * 7.5];
    }),
    "brass",
    0.85,
    0.5,
  );
  s.line([604, 164], [672, 163], { w: 0.5, soft: true, taper: 0.9 });
  s.line([622, 171], [652, 171], { w: 0.45, soft: true, taper: 0.9 });
  s.line([300, 178], [352, 177], { w: 0.45, soft: true, taper: 0.9 });

  // The far treeline along the shore.
  const far = [spires(s, 110, 470, H, 8, 2.5), spires(s, 500, 760, H, 9, 3)];
  forest(
    s,
    far.flatMap((t) => visible(t, hide, false)),
    H,
    1.5,
    0.38,
  );

  // The near shore: a long curve, broken, lighter toward the edges.
  const shore = P(
    "0,372 90,370 180,374 280,380 380,386 460,388 530,386 620,380 720,372 816,366",
  );
  const land: Pt[] = [...shore, [816, 604], [0, 604]];
  s.stroke(P("120,372 220,377 320,383 400,387 466,388"), {
    w: 0.8,
    taper: 0.85,
    hide,
  });
  s.stroke(P("508,387 580,383 660,377 740,370"), {
    w: 0.8,
    taper: 0.85,
    hide,
  });

  // The dock, receding to the vanishing point.
  const toVP = (a: Pt, y: number): Pt => {
    const t = (a[1] - y) / (a[1] - VP[1]);
    return [a[0] + (VP[0] - a[0]) * t, y];
  };
  const nl: Pt = [466, 390],
    nr: Pt = [508, 390];
  const fy = 334;
  const fl = toVP(nl, fy),
    fr = toVP(nr, fy);
  const deck: Pt[] = [nl, nr, fr, fl];
  s.wash(deck, "stone", 0.6, 0.5);
  s.line(nl, fl, { w: 1.2, overshoot: 0 });
  s.line(nr, fr, { w: 1.3, overshoot: 0 });
  s.line(fl, fr, { w: 1, overshoot: 0 });
  s.line([fl[0] + 0.5, fy + 2.4], [fr[0] - 0.5, fy + 2.4], {
    w: 0.55,
    overshoot: 0,
  });
  let planks = "";
  for (let k = 1; k < 13; k++) {
    const y = 390 - (390 - fy) * (1 - Math.pow(1 - k / 13, 1.3));
    const a = toVP(nl, y),
      b = toVP(nr, y);
    planks += `M${(a[0] + 0.8).toFixed(1)} ${y.toFixed(1)}L${(b[0] - 0.8).toFixed(1)} ${y.toFixed(1)}`;
  }
  s.thinLines(planks, 0.45, true);
  s.hatch([nr, [nr[0] + 3, nr[1] + 1], [fr[0] + 2, fy + 3], fr], {
    angle: 92,
    gap: 1.6,
    inset: 0.2,
  });
  for (const x of [fl[0] + 1, fr[0] - 1]) {
    s.line([x, fy + 2.4], [x, fy + 10], { w: 0.85, overshoot: 0 });
    s.dash([x, fy + 13], [x, fy + 16.5], 0.6);
    s.dash([x + 0.3, fy + 19], [x + 0.3, fy + 21], 0.5);
  }
  // Two chairs at the end of the dock, facing the water.
  for (const cx of [fl[0] + 8, fr[0] - 8]) {
    const back: Pt[] = [
      [cx - 4.4, fy + 1],
      [cx - 4, fy - 8.5],
      [cx - 2, fy - 10.8],
      [cx + 2, fy - 10.8],
      [cx + 4, fy - 8.5],
      [cx + 4.4, fy + 1],
    ];
    s.wash(back, "ivory", 1, 0.2);
    s.stroke(back, { w: 0.7, taper: 0.5, smooth: false });
    s.line([cx - 1.4, fy - 9.8], [cx - 1.5, fy], { w: 0.4, soft: true });
    s.line([cx + 1.4, fy - 9.8], [cx + 1.5, fy], { w: 0.4, soft: true });
    s.line([cx - 6, fy - 3.4], [cx - 4, fy - 3.4], { w: 0.6 });
    s.line([cx + 4, fy - 3.4], [cx + 6, fy - 3.4], { w: 0.6 });
  }

  // A sailboat far out, with one broken reflection.
  const bx = 330,
    by = 296;
  s.stroke(
    P(
      `${bx - 9},${by} ${bx + 9},${by} ${bx + 6},${by + 3} ${bx - 6},${by + 3} ${bx - 9},${by}`,
    ),
    { w: 0.8, smooth: false, taper: 0.3 },
  );
  s.line([bx, by], [bx, by - 23], { w: 0.7, overshoot: 0 });
  const main = P(
    `${bx - 0.6},${by - 22} ${bx - 8.5},${by - 1.6} ${bx - 0.6},${by - 1.6}`,
  );
  s.wash(main, "ivory", 1, 0.2);
  s.stroke(main, { w: 0.6, smooth: false, taper: 0.3 });
  s.stroke(
    P(`${bx + 0.6},${by - 19} ${bx + 7},${by - 1.6} ${bx + 0.6},${by - 1.6}`),
    {
      w: 0.5,
      smooth: false,
      taper: 0.3,
      soft: true,
    },
  );
  s.dash([bx - 3, by + 6], [bx + 4, by + 6], 0.5);
  s.dash([bx - 1, by + 9.5], [bx + 2, by + 9.5], 0.4);

  // Water: one pale band under the far shore, level dashes that thin out
  // toward the sides and stop at the near shore.
  s.wash(P("90,254 770,254 790,320 600,332 300,332 70,320"), "blue", 0.24, 1.6);
  const onLand = (q: Pt) => inside(q, land);
  const hideWater = [...hide, land, deck];
  water(
    s,
    486,
    [
      [258, 170, 720, 9],
      [266, 130, 760, 11],
      [276, 100, 780, 13],
      [289, 70, 790, 15],
      [305, 50, 800, 18],
      [324, 40, 800, 21],
      [345, 60, 780, 23],
      [364, 150, 720, 22],
    ],
    { w: 0.55, hide: hideWater, keep: 1.35 },
  );
  // The dock and the boat, reflected as broken verticals.
  for (const [x, y0, y1] of [
    [bx - 1, by + 12, by + 15],
    [fl[0] + 8, fy + 22, fy + 26],
    [fr[0] - 8, fy + 23, fy + 26],
  ] as const)
    s.dash([x, y0], [x + 0.2, y1], 0.5);
  void onLand;

  // Rocks where the dock meets the shore.
  for (const [x, y, w, h] of [
    [446, 392, 13, 5],
    [520, 390, 10, 4.2],
    [532, 393, 6, 3],
  ] as const) {
    const r = P(
      `${x},${y} ${x + w * 0.2},${y - h} ${x + w * 0.7},${y - h * 1.1} ${x + w},${y}`,
    );
    s.stroke(r, { w: 0.8, taper: 0.5 });
    s.hatch([...r, [x + w * 0.9, y + 0.5], [x + w * 0.1, y + 0.5]], {
      angle: 120,
      gap: 1.8,
      inset: 0.3,
    });
  }

  // The path, winding down to the dock: centre line and width in
  // perspective, widening toward us and fading off the bottom.
  const ys = [604, 570, 536, 502, 470, 442, 418, 402, 392];
  const cs = [372, 356, 364, 392, 428, 456, 476, 484, 487];
  const ws = [196, 158, 124, 96, 76, 62, 52, 46, 42];
  const L = ys.map((y, i): Pt => [cs[i] - ws[i] / 2, y]);
  const R = ys.map((y, i): Pt => [cs[i] + ws[i] / 2, y]);
  s.wash([...L, ...R.slice().reverse()], "stone", 0.45, 1.2);
  s.stroke(L, { w: S, taper: 0.9, hide });
  s.stroke(R, { w: S, taper: 0.9, hide });
  let ruts = "";
  for (const [x, y, l] of [
    [350, 560, 16],
    [326, 572, 8],
    [362, 520, 12],
    [396, 488, 9],
    [430, 458, 7],
    [462, 432, 5],
  ])
    ruts += `M${x} ${y}L${x + l} ${y + 0.3}`;
  s.thinLines(ruts, 0.6, true);
  for (const [x, y, r] of [
    [296, 592, 2.2],
    [314, 586, 1.4],
    [420, 580, 1.8],
    [322, 540, 1.3],
    [436, 492, 1.2],
  ] as const)
    s.ellipse(x, y, r * 1.6, r, { w: 0.5, soft: true });

  // The two of them, walking down toward the water.
  figure(s, [466, 426], 34, { stride: 0.35, coat: true });
  figure(s, [481, 427], 32, { stride: -0.3, wide: 0.95 });

  // Grass along the path, along the shore, at the foot of the trees.
  for (const q of P(
    "262,590 276,556 292,520 318,488 350,462 386,440 468,590 450,556 440,520 450,486 476,462 500,444 150,522 196,508 120,542 700,522 640,474 20,606 56,592 772,606",
  ))
    tuft(s, q, 6);
  for (const q of P("200,378 300,384 400,390 540,390 600,384 680,376"))
    tuft(s, q, 4);
  void D;

  return (
    <Art w={COVER.w} h={COVER.h}>
      {s.render()}
    </Art>
  );
}
