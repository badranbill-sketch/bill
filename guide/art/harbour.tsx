import type { Language } from "@/lib/business";
import { Art } from "@/components/ink/primitives";
import {
  figure,
  forest,
  inside,
  P,
  S,
  Sketch,
  spires,
  spruce,
  tuft,
  water,
  type Pt,
} from "./kit";

/*
 * Chapter 9, when markets fall: a sheltered cove on a grey day. A small
 * boat is tied up at a dock behind a rock point; out on the open lake the
 * water is rough under low cloud. Nothing dramatic: the point is that the
 * shelter was chosen before the weather came.
 */
export const HARBOUR = { w: 816, h: 400 };

export function Harbour({ lang }: { lang: Language }) {
  void lang;
  const s = new Sketch(9413);
  const H = 150;
  const hide: Pt[][] = [];

  // Low cloud over the open lake, engraved, heaviest at its base.
  let cl = "",
    clSoft = "";
  for (let y = 46; y < 128; y += s.rand(2.8, 3.6)) {
    const x0 = 250 + (128 - y) * 2.2;
    for (let x = x0 + s.rand(0, 30); x < 830; x += s.rand(24, 60)) {
      const l = s.rand(20, 70);
      const k = (y - 46) / 82;
      if (s.rand(0, 1) > 0.3 + 0.65 * k) continue;
      const d = `M${x.toFixed(1)} ${y.toFixed(1)}L${(x + l).toFixed(1)} ${(y + s.rand(-0.3, 0.3)).toFixed(1)}`;
      if (k > 0.6) cl += d;
      else clSoft += d;
    }
  }
  s.thinLines(clSoft, 0.42, true);
  s.thinLines(cl, 0.5);
  s.wash(P("300,110 520,70 830,56 830,128 280,132"), "blue", 0.34, 3);
  // Rain falling from it, far off, thinning out before the water.
  let rd = "";
  for (let x = 420; x < 820; x += s.rand(4, 7)) {
    const y0 = 126 + s.rand(0, 4),
      len = s.rand(10, 26);
    rd += `M${x.toFixed(1)} ${y0.toFixed(1)}L${(x - len * 0.2).toFixed(1)} ${(y0 + len).toFixed(1)}`;
  }
  s.thinLines(rd, 0.4, true);

  // The far shore, on the left where the cloud has not reached.
  s.stroke(
    P(`0,${H - 22} 90,${H - 36} 190,${H - 40} 280,${H - 28} 360,${H - 10}`),
    {
      w: 0.5,
      taper: 0.95,
      soft: true,
    },
  );
  forest(s, [spires(s, 0, 380, H, 7, 2)], H, 1.6, 0.3);
  s.line([0, H + 0.5], [420, H + 0.5], { w: 0.5, soft: true, taper: 0.9 });

  // The point: a low rocky arm from the right, closing the cove, with a
  // few spruce on it. Only a narrow entrance is left on the left.
  const ptTop = P(
    "830,222 740,212 640,216 540,228 440,240 360,250 312,256 296,262",
  );
  const ptLow = P("296,262 330,268 420,268 540,262 660,254 760,250 830,252");
  const point: Pt[] = [...ptTop, ...ptLow.slice(1)];
  s.wash(point, "stone", 0.55, 0.6);
  s.stroke(ptTop, { w: 1.1, taper: 0.5 });
  s.stroke(ptLow, { w: 0.8, taper: 0.6 });
  s.hatch(
    [
      ...ptLow.slice().reverse(),
      ...ptTop
        .slice(3)
        .map(([x, y]): Pt => [x, y + 10])
        .reverse(),
    ].reverse(),
    {
      angle: 120,
      gap: 2.2,
      inset: 0.3,
    },
  );
  hide.push(point);
  // The other side of the entrance: a low shore from the left.
  const lTop = P("-10,236 60,232 130,238 176,250 190,258");
  const lLow = P("190,258 150,264 80,264 -10,262");
  const left: Pt[] = [...lTop, ...lLow.slice(1)];
  s.wash(left, "stone", 0.5, 0.6);
  s.stroke(lTop, { w: 1, taper: 0.5 });
  s.stroke(lLow, { w: 0.7, taper: 0.6 });
  hide.push(left);
  for (const [x, y, h] of [
    [470, 238, 44],
    [520, 232, 58],
    [560, 228, 70],
    [600, 222, 52],
    [660, 218, 84],
    [700, 214, 66],
    [760, 214, 96],
    [800, 218, 74],
    [40, 234, 60],
    [84, 234, 76],
    [130, 240, 48],
  ] as const)
    hide.push(spruce(s, [x, y], h, 0.9));

  // Open water beyond the point: short broken chop.
  s.wash(P(`0,${H + 2} 830,${H + 2} 830,230 0,236`), "blue", 0.24, 2);
  let ch = "";
  for (let i = 0; i < 240; i++) {
    const y = H + 4 + Math.pow(s.rand(0, 1), 1.1) * 86;
    const x = s.rand(0, 830);
    if (hide.some((h) => inside([x, y], h))) continue;
    const w = 2.2 + (y - H) * 0.03;
    ch += `M${(x - w).toFixed(1)} ${(y + 0.8).toFixed(1)}L${x.toFixed(1)} ${(y - 1).toFixed(1)}L${(x + w * s.rand(0.6, 1.2)).toFixed(1)} ${(y + 0.7).toFixed(1)}`;
  }
  s.thinLines(ch, 0.5, true);

  // Inside the cove: still water, a few level dashes.
  const shore = P(
    "-10,348 100,340 220,338 340,344 460,356 580,372 700,392 760,404",
  );
  const land: Pt[] = [...shore, [760, 420], [-10, 420]];
  s.wash(P("0,262 830,252 830,420 0,420"), "blue", 0.16, 2);
  // The dock, running from the near shore into the cove.
  const deck = P("170,344 380,286 394,290 190,350");
  s.wash(deck, "stone", 0.7, 0.4);
  s.poly(deck, { w: 1, closed: true, overshoot: 0 });
  let planks = "";
  for (let k = 1; k < 18; k++) {
    const u = k / 18;
    const a: Pt = [170 + (380 - 170) * u, 344 + (286 - 344) * u],
      b: Pt = [190 + (394 - 190) * u, 350 + (290 - 350) * u];
    planks += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  }
  s.thinLines(planks, 0.45, true);
  for (const [x, y] of [
    [380, 286],
    [394, 290],
    [300, 314],
    [312, 318],
  ] as const) {
    s.line([x, y], [x, y + 12], { w: 0.8, overshoot: 0 });
    s.dash([x, y + 15], [x, y + 19], 0.5);
  }
  hide.push(deck);
  // The boat, tied alongside: sails furled, lines to the dock.
  const bx = 356,
    by = 318;
  const hull = P(
    `${bx - 30},${by + 2} ${bx + 34},${by - 12} ${bx + 26},${by - 3} ${bx - 22},${by + 8}`,
  );
  s.wash(hull, "navy", 0.25, 0.2);
  s.stroke([...hull, hull[0]], { w: 1, smooth: false, taper: 0.3 });
  s.line([bx + 4, by - 4], [bx + 3, by - 74], { w: 0.85, overshoot: 0 });
  s.stroke(
    P(`${bx + 3},${by - 20} ${bx - 18},${by - 16} ${bx - 22},${by - 14}`),
    { w: 1.4, taper: 0.4 },
  );
  s.stroke(P(`${bx + 3},${by - 72} ${bx - 26},${by} `), {
    w: 0.4,
    soft: true,
    smooth: false,
  });
  s.stroke(P(`${bx + 3},${by - 72} ${bx + 32},${by - 12}`), {
    w: 0.4,
    soft: true,
    smooth: false,
  });
  s.stroke(
    P(`${bx + 32},${by - 10} ${bx + 36},${by - 22} ${bx + 34},${by - 30}`),
    { w: 0.5, taper: 0.8 },
  );
  s.stroke(
    P(`${bx - 26},${by + 2} ${bx - 34},${by - 6} ${bx - 40},${by - 10}`),
    { w: 0.5, taper: 0.8 },
  );
  s.dash([bx - 16, by + 14], [bx + 2, by + 12], 0.5);
  s.dash([bx - 4, by + 18], [bx + 8, by + 17], 0.45);
  hide.push(hull);
  water(
    s,
    500,
    [
      [270, 300, 830, 10],
      [282, 200, 830, 12],
      [298, 120, 830, 14],
      [318, 60, 830, 16],
      [342, 360, 830, 18],
      [368, 540, 830, 20],
    ],
    { w: 0.55, keep: 1.2, hide: [...hide, land] },
  );
  // The near shore and a figure on it.
  s.wash(land, "stone", 0.32, 1.5);
  s.stroke(shore, { w: S, taper: 0.8 });
  figure(s, [124, 346], 40, { stride: 0.1, coat: true });
  for (const q of P("40,344 80,342 230,338 300,344 420,352 520,364"))
    tuft(s, q, 5);

  return (
    <Art w={HARBOUR.w} h={HARBOUR.h}>
      {s.render()}
    </Art>
  );
}

/*
 * Chapter 5's small drawing: a canoe on the shore, loaded for the trip
 * ahead. A pack in the middle, a paddle across the thwart.
 */
export const CANOE = { w: 520, h: 230 };

export function Canoe({ lang }: { lang: Language }) {
  void lang;
  const s = new Sketch(9505);
  const nearG = P("58,112 92,132 160,148 260,154 360,148 426,132 460,112");
  const farG = P("58,112 96,122 170,128 260,130 350,128 424,122 460,112");
  const keel = P("64,118 96,146 170,168 260,174 350,168 424,146 454,118");
  const body: Pt[] = [
    [54, 100],
    ...farG,
    [464, 100],
    ...keel.slice().reverse(),
  ];
  const packShape = P("236,146 238,104 290,104 290,146");
  const trees: Pt[][] = [];
  // Water behind, the shore it was pulled up on.
  s.wash(P("0,96 520,96 520,126 0,128"), "blue", 0.24, 1.2);
  water(
    s,
    260,
    [
      [100, 10, 510, 12],
      [108, 0, 520, 14],
      [117, 0, 520, 16],
    ],
    { w: 0.5, keep: 1.2, hide: [body, packShape, ...trees] },
  );
  s.stroke(P("0,130 120,128 260,132 400,128 520,130"), {
    w: 0.7,
    taper: 0.85,
    soft: true,
    hide: [body],
  });
  s.wash(P("0,132 520,130 520,214 0,216"), "stone", 0.26, 1.4);
  // The canoe, seen from the side and a little above: two gunwales that
  // meet at raised ends, the hull below, the inside showing between them.
  s.hatch(
    P("110,178 180,184 260,186 360,182 430,172 360,168 260,174 170,168"),
    {
      angle: 120,
      gap: 2.4,
      inset: 0.3,
    },
  );
  s.wash([...farG, ...nearG.slice().reverse()], "stone", 0.9, 0.5);
  s.wash([...nearG, ...keel.slice().reverse()], "stone", 0.55, 0.5);
  s.hatch(P("300,152 360,148 426,132 440,126 424,146 350,168 300,172"), {
    angle: 110,
    gap: 2,
    inset: 0.3,
  });
  s.hatch(P("150,128 200,129 190,146 150,144"), {
    angle: 120,
    gap: 2.4,
    inset: 0.3,
    soft: true,
  });
  s.stroke(farG, { w: 0.9, taper: 0.5 });
  s.twice(nearG, { w: 1.4 });
  s.stroke(keel, { w: 1.2, taper: 0.4 });
  // raised stems
  s.stroke(P("58,112 54,104 58,100"), { w: 1, taper: 0.5 });
  s.stroke(P("460,112 464,104 460,100"), { w: 1, taper: 0.5 });
  // thwarts
  for (const [x, dn] of [
    [150, 20],
    [262, 24],
    [366, 20],
  ] as const)
    s.line([x, 128], [x + 3, 128 + dn], { w: 0.8, overshoot: 0 });
  // the pack, sitting low in the middle
  const pack = P("236,146 238,112 246,104 280,104 288,110 290,146");
  s.wash(pack, "brass", 0.55, 0.4);
  s.stroke([...pack.slice(0, 6)], { w: 0.9, smooth: false, taper: 0.3 });
  s.stroke(P("242,112 262,118 286,112"), { w: 0.6, taper: 0.6 });
  s.line([262, 118], [262, 130], { w: 0.5, overshoot: 0 });
  s.hatch(P("278,106 288,110 290,146 280,146"), {
    angle: 100,
    gap: 1.8,
    inset: 0.2,
  });
  // a bedroll behind it
  s.ellipse(314, 118, 7, 9, { w: 0.7 });
  s.stroke(P("314,109 338,110 340,130 316,130"), {
    w: 0.8,
    taper: 0.4,
    hide: [pack],
  });
  // the paddle, lying across the thwarts
  const blade = P("352,126 362,122 394,122 404,125 394,130 362,130");
  s.stroke(P("112,133 352,126"), {
    w: 0.9,
    taper: 0.3,
    smooth: false,
    hide: [pack],
  });
  s.wash(blade, "stone", 0.8, 0.2);
  s.stroke([...blade, blade[0]], { w: 0.8, taper: 0.3 });
  // spruce at the end of the shore, grass
  spruce(s, [486, 134], 84, 0.85);
  spruce(s, [506, 136], 56, 0.75);
  for (const q of P("30,196 70,190 440,192 480,188")) tuft(s, q, 5);
  return (
    <Art w={CANOE.w} h={CANOE.h}>
      {s.render()}
    </Art>
  );
}
