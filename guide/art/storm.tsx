import type { Language } from "@/lib/business";
import {
  forest,
  inside,
  P,
  S,
  Sketch,
  spires,
  spruce,
  tuft,
  visible,
  water,
  type Pt,
} from "./kit";

/*
 * Chapter 4, the sequence of returns: one squall crossing a lake. On the
 * left, a small boat that has only just set out is under it; on the right,
 * another is nearly home, in clear weather. Same weather, a different
 * moment in the trip.
 *
 * The squall is engraved, not outlined: a low bank of parallel strokes,
 * darker at its base, rain falling from it in slanting shafts that thin
 * out before they reach the water.
 */
export const STORM = { w: 816, h: 630 };

/** A small sailboat; `heel` tips it with the wind (degrees). */
function boat(s: Sketch, [x, y]: Pt, k: number, heel = 0, reefed = false) {
  const t = (heel * Math.PI) / 180;
  const R = ([dx, dy]: Pt): Pt => [
    x + (dx * Math.cos(t) - dy * Math.sin(t)) * k,
    y + (dx * Math.sin(t) + dy * Math.cos(t)) * k,
  ];
  const hull = [R([-12, 0]), R([12, 0]), R([8, 4]), R([-8, 4])];
  s.wash(hull, "navy", 0.25, 0.2);
  s.stroke([...hull, hull[0]], { w: 0.9, smooth: false, taper: 0.3 });
  const mast = reefed ? 23 : 30;
  s.line(R([0, 0]), R([0, -mast]), { w: 0.75, overshoot: 0 });
  const main = [R([-0.6, -mast + 1]), R([-10, -2]), R([-0.6, -2])];
  const jib = [R([0.6, -mast + 4]), R([8, -2]), R([0.6, -2])];
  s.wash(main, "ivory", 1, 0.2);
  s.stroke([...main, main[0]], { w: 0.65, smooth: false, taper: 0.3 });
  if (!reefed) {
    s.wash(jib, "ivory", 1, 0.2);
    s.stroke([...jib, jib[0]], {
      w: 0.5,
      smooth: false,
      taper: 0.3,
      soft: true,
    });
  }
  return [...hull, R([-10, -mast]), R([8, -mast])];
}

export function Storm({ lang }: { lang: Language }) {
  void lang;
  const s = new Sketch(8123);
  const H = 470; // far shore
  const hide: Pt[][] = [];

  /* The squall: a low bank of horizontal strokes, ragged at both ends,
     heaviest along its base. */
  let bank = "",
    bankSoft = "";
  const top = (x: number) =>
    262 - 26 * Math.sin((Math.PI * (x + 40)) / 600) + 6 * Math.sin(x / 37);
  const bottom = (x: number) =>
    350 + 8 * Math.sin(x / 61) - 10 * Math.sin((Math.PI * (x + 40)) / 600);
  for (let y = 226; y < 364; y += s.rand(2.6, 3.4)) {
    let x = -40 + s.rand(0, 30);
    while (x < 560) {
      const len = s.rand(18, 70);
      const x1 = Math.min(560, x + len);
      const mid = (x + x1) / 2;
      const inBank =
        y > top(mid) && y < bottom(mid) && mid < 520 - (bottom(mid) - y) * 0.2;
      const depth = (y - top(mid)) / (bottom(mid) - top(mid));
      if (inBank && s.rand(0, 1) < 0.35 + 0.6 * depth) {
        const d = `M${x.toFixed(1)} ${y.toFixed(1)}L${x1.toFixed(1)} ${(y + s.rand(-0.4, 0.4)).toFixed(1)}`;
        if (depth > 0.55) bank += d;
        else bankSoft += d;
      }
      x = x1 + s.rand(2, 9);
    }
  }
  s.thinLines(bankSoft, 0.45, true);
  s.thinLines(bank, 0.55);
  s.wash(
    P(
      "-20,280 80,256 200,240 320,236 440,250 520,286 500,330 420,352 300,356 160,356 40,352 -20,348",
    ),
    "blue",
    0.42,
    3,
  );

  /* Rain: three shafts, slanting with the wind, thinning out low down. */
  const shafts: [number, number, number][] = [
    [30, 170, 560],
    [200, 330, 620],
    [360, 470, 540],
  ];
  let rd = "";
  for (const [x0, x1, reach] of shafts)
    for (let x = x0; x < x1; x += s.rand(3.4, 5.6)) {
      const y0 = bottom(x) - s.rand(0, 8);
      const edge = Math.min(x - x0, x1 - x) / ((x1 - x0) / 2);
      const len = (reach - y0) * (0.55 + 0.45 * edge) * s.rand(0.75, 1.05);
      if (len < 20) continue;
      rd += `M${x.toFixed(1)} ${y0.toFixed(1)}L${(x - len * 0.2).toFixed(1)} ${(y0 + len).toFixed(1)}`;
    }
  s.thinLines(rd, 0.42, true);
  for (const [x0, x1, reach] of shafts)
    s.wash(
      P(
        `${x0 + 6},${bottom(x0) - 4} ${x1 - 6},${bottom(x1) - 4} ${x1 - 30},${reach - 30} ${x0 - 20},${reach - 20}`,
      ),
      "blue",
      0.2,
      4,
    );

  /* Clear weather to the right: two streaks and a low, pale sun. */
  s.line([586, 232], [700, 231], { w: 0.5, soft: true, taper: 0.9 });
  s.line([620, 241], [668, 241], { w: 0.45, soft: true, taper: 0.9 });
  s.line([690, 312], [770, 311], { w: 0.45, soft: true, taper: 0.9 });
  s.wash(
    Array.from({ length: 16 }, (_, i): Pt => {
      const a = (i / 16) * Math.PI * 2;
      return [680 + Math.cos(a) * 9, 392 + Math.sin(a) * 9];
    }),
    "brass",
    0.85,
    0.5,
  );

  /* The near shore across the bottom: land, a dock, spruce, grasses. */
  const shore = P(
    "0,792 120,786 260,790 400,782 540,770 640,756 720,740 830,730",
  );
  const land: Pt[] = [...shore, [830, 900], [0, 900]];
  s.wash(
    P(
      "0,792 120,786 260,790 400,782 540,770 640,756 720,740 816,732 816,772 700,784 520,790 300,794 120,796 0,796",
    ),
    "stone",
    0.2,
    2,
  );
  s.stroke(shore, { w: S, taper: 0.8 });
  hide.push(land);
  hide.push(spruce(s, [770, 744], 236, 1.05));
  hide.push(spruce(s, [724, 752], 160, 0.95));
  hide.push(spruce(s, [80, 796], 120, 0.9));
  // A dock at the right, running out from the shore.
  const deck = P("650,754 574,716 584,710 676,748");
  s.wash(deck, "stone", 0.7, 0.4);
  s.poly(deck, { w: 1, closed: true, overshoot: 0 });
  let planks = "";
  for (let k = 1; k < 12; k++) {
    const u = k / 12;
    const a: Pt = [650 + (574 - 650) * u, 754 + (716 - 754) * u],
      b: Pt = [676 + (584 - 676) * u, 748 + (710 - 748) * u];
    planks += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  }
  s.thinLines(planks, 0.45, true);
  for (const [x, y] of [
    [575, 716],
    [585, 711],
    [612, 735],
  ] as const) {
    s.line([x, y], [x, y + 14], { w: 0.8, overshoot: 0 });
    s.dash([x, y + 17], [x, y + 21], 0.5);
  }
  hide.push(deck);

  /* The far shore: hills and treeline, veiled by rain on the left. */
  const veil = P("0,300 520,300 520,540 0,540");
  s.stroke(
    P(
      `0,${H - 28} 100,${H - 44} 200,${H - 50} 290,${H - 38} 380,${H - 18} 430,${H - 8}`,
    ),
    {
      w: 0.45,
      taper: 0.95,
      soft: true,
    },
  );
  s.stroke(
    P(
      `400,${H - 4} 480,${H - 34} 580,${H - 56} 680,${H - 50} 760,${H - 30} 816,${H - 24}`,
    ),
    { w: 0.6, taper: 0.9, soft: true, hide },
  );
  const farL = spires(s, 0, 390, H, 7, 2).filter(
    (q) => !inside(q, veil) || s.rand(0, 1) < 0.55,
  );
  const farR = spires(s, 410, 816, H, 9, 3);
  forest(s, [farL, ...visible(farR, hide, false)], H, 1.6, 0.32);
  s.line([0, H + 0.5], [560, H + 0.5], { w: 0.5, soft: true, taper: 0.9 });

  /* The boats: one just setting out, under the squall, heeling; the
     other nearly home, in clear weather, its wake behind it. */
  hide.push(boat(s, [252, 572], 1.35, -15, true));
  hide.push(boat(s, [548, 650], 1.2, -2));
  s.stroke(P("574,656 620,646 668,640"), { w: 0.5, soft: true, taper: 0.9 });
  s.stroke(P("568,660 614,654 656,650"), { w: 0.45, soft: true, taper: 0.9 });

  /* Water: calm, level dashes on the right; under the squall, short
     broken strokes, fewer and fainter toward us. */
  s.wash(P(`0,${H + 2} 816,${H + 2} 816,730 0,780`), "blue", 0.2, 2);
  water(
    s,
    640,
    [
      [476, 500, 816, 10],
      [486, 480, 816, 12],
      [500, 470, 816, 14],
      [518, 460, 816, 16],
      [540, 450, 816, 18],
      [568, 440, 816, 20],
      [602, 430, 790, 22],
      [642, 430, 760, 24],
      [690, 430, 700, 24],
    ],
    { w: 0.55, keep: 1.2, hide },
  );
  let ch = "";
  for (let i = 0; i < 260; i++) {
    const y = H + 6 + Math.pow(s.rand(0, 1), 1.3) * 290;
    const x = s.rand(0, 470 - (y - H) * 0.25);
    if (hide.some((h) => inside([x, y], h))) continue;
    const w = 2.4 + (y - H) * 0.028;
    const lean = s.rand(-0.6, 0.6);
    ch += `M${(x - w).toFixed(1)} ${(y + 0.9).toFixed(1)}L${(x + lean).toFixed(1)} ${(y - 1).toFixed(1)}L${(x + w * s.rand(0.6, 1.2)).toFixed(1)} ${(y + 0.7).toFixed(1)}`;
  }
  s.thinLines(ch, 0.5, true);
  s.dash([548, 662], [549, 670], 0.5);
  s.dash([546, 674], [547, 678], 0.45);

  for (const q of P("150,790 230,788 330,786 470,776 560,764 700,746 800,736"))
    tuft(s, q, 6);
  for (const [x, y, w, h] of [
    [300, 788, 14, 5],
    [318, 790, 8, 3.4],
    [520, 774, 12, 4.4],
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

  // Cropped to the scene: the sky above the squall is left to the page.
  return (
    <svg
      viewBox="0 170 816 630"
      className="ink-art"
      aria-hidden="true"
      focusable="false"
    >
      {s.render()}
    </svg>
  );
}
