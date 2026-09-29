import type { Language } from "@/lib/business";
import { Art } from "@/components/ink/primitives";
import {
  curve,
  forest,
  inside,
  P,
  ring,
  Sketch,
  spires,
  spruce,
  tilted,
  water,
  type Pt,
  type V3,
} from "./kit";

/*
 * Chapter 1: an open notebook on a porch table, the lake beyond the
 * railing. On the left page, the life the money is for, in a list; on the
 * right page, one question. A cup of coffee, reading glasses, a pen, and
 * the statements pushed to one side, half off the table's edge of the
 * picture.
 *
 * One camera (centimetres, table top at y = 0, eye 50 cm above it, looking
 * down 30°) for the table, the notebook, the cup and the railing; the lake
 * is drawn flat on the same horizon.
 */
export const PORCH = { w: 816, h: 1056 };

const E: V3 = [0, 50, 0];
const F = 560;
const CY = 610;
const cam = tilted(E, F, 408, CY, 30);
const HZ = CY - F * Math.tan(Math.PI / 6);

/** A 2 × 3 matrix that lays text flat on the table at (x, y, z). */
function flat(o3: V3, cm: number, turn = 0) {
  const t = (turn * Math.PI) / 180;
  const d = 0.5;
  const o = cam(o3),
    a = cam([o3[0] + Math.cos(t) * d, o3[1], o3[2] + Math.sin(t) * d]),
    b = cam([o3[0] + Math.sin(t) * d, o3[1], o3[2] - Math.cos(t) * d]);
  const k = cm / d;
  const n = (v: number) => v.toFixed(4);
  return `matrix(${n((a[0] - o[0]) * k)} ${n((a[1] - o[1]) * k)} ${n((b[0] - o[0]) * k)} ${n((b[1] - o[1]) * k)} ${o[0].toFixed(1)} ${o[1].toFixed(1)})`;
}

/** Turn a point about a vertical axis through (cx, cz). */
const turnAbout =
  (deg: number, cx: number, cz: number) =>
  ([x, y, z]: V3): V3 => {
    const t = (deg * Math.PI) / 180,
      dx = x - cx,
      dz = z - cz;
    return [
      cx + dx * Math.cos(t) - dz * Math.sin(t),
      y,
      cz + dx * Math.sin(t) + dz * Math.cos(t),
    ];
  };

const d2 = (q: Pt[]) =>
  `M${q.map((v) => `${v[0].toFixed(1)} ${v[1].toFixed(1)}`).join("L")}`;

const WORDS = {
  en: { papers: "RRSP · TFSA · QPP" },
  fr: { papers: "REER · CELI · RRQ" },
};

export function Porch({
  lang,
  list,
  question,
}: {
  lang: Language;
  list: string[];
  question: string;
}) {
  const s = new Sketch(3107, cam);
  const C = (v: V3) => cam(v);

  /* ---------------- geometry of the things on the table ----------- */
  const TURN = -4;
  const nb = (x: number, y: number, z: number) =>
    turnAbout(TURN, 6, 47)([x, y, z]);
  const X0 = -18,
    XG = 6,
    X1 = 30,
    Z0 = 31,
    Z1 = 63;
  // Pages rise from the gutter and flatten toward the outer edges.
  const lift = (x: number) => 1.1 * (1 - Math.exp(-Math.abs(x - XG) / 2.6));
  const pageRow = (xa: number, xb: number, z: number, dy = 0) =>
    Array.from({ length: 11 }, (_, i) => {
      const x = xa + ((xb - xa) * i) / 10;
      return nb(x, lift(x) + dy, z);
    });
  const cover3: V3[] = [
    nb(X0 - 1, 0, Z0 - 0.9),
    nb(X1 + 1, 0, Z0 - 0.9),
    nb(X1 + 1, 0, Z1 + 0.9),
    nb(X0 - 1, 0, Z1 + 0.9),
  ];
  const coverS = cover3.map(C);
  const nearL = pageRow(X0, XG, Z0),
    nearR = pageRow(XG, X1, Z0),
    farL = pageRow(X0, XG, Z1),
    farR = pageRow(XG, X1, Z1);
  const leftPage = [...nearL, ...farL.slice().reverse()].map(C);
  const rightPage = [...nearR, ...farR.slice().reverse()].map(C);

  const CX = -29,
    CZ = 47;
  const saucer = ring(CX, 0.5, CZ, 7.4, 40).map(C);
  // The cup stands plumb over the saucer's centre, as the post and the
  // balusters do: each ring keeps its projected shape, recentred.
  const base = C([CX, 0.5, CZ]);
  const plumb = (y: number, r: number): Pt[] => {
    const pts = ring(CX, y, CZ, r, 40).map(C);
    const c = C([CX, y, CZ]);
    return pts.map(([x, yy]) => [x - c[0] + base[0], yy]);
  };
  const rim = plumb(8.2, 4.3);
  // The body's outline: tangent to the rim and the foot as seen.
  const ext = (pts: Pt[]) => {
    let lo = pts[0],
      hi = pts[0];
    for (const q of pts) {
      if (q[0] < lo[0]) lo = q;
      if (q[0] > hi[0]) hi = q;
    }
    return [lo, hi];
  };
  const [rimL, rimR] = ext(rim);
  const [midL, midR] = ext(plumb(4.5, 3.95));
  const [footL, footR] = ext(plumb(1, 3.2));
  const cupL: Pt[] = [rimL, midL, footL],
    cupR: Pt[] = [rimR, midR, footR];
  const cupSil = [...cupL, ...cupR.slice().reverse(), ...rim.slice(20)];

  const pz = turnAbout(-10, 58, 66);
  const sheetA: V3[] = [
    pz([46, 0.3, 50]),
    pz([72, 0.3, 50]),
    pz([72, 0.3, 84]),
    pz([46, 0.3, 84]),
  ];
  const sheetB: V3[] = [
    pz([50, 0.15, 53]),
    pz([76, 0.15, 54]),
    pz([75, 0.15, 86]),
    pz([49, 0.15, 85]),
  ];
  const onTable = [coverS, saucer, cupSil, sheetA.map(C), sheetB.map(C)];

  /* ---------------- the porch ------------------------------------- */
  const RZ = 158,
    railTop = 15,
    railBot = 9;
  const tableFar = 100;
  const tableTop: Pt[] = [
    C([-120, 0, 14]),
    C([-90, 0, tableFar]),
    C([90, 0, tableFar]),
    C([120, 0, 14]),
  ];
  const postX0 = 96,
    postX1 = 108;
  const pL = C([postX0, 15, RZ])[0],
    pR = C([postX1, 15, RZ])[0];
  const post: Pt[] = [
    [pL, 1056],
    [pR, 1056],
    [pR, 0],
    [pL, 0],
  ];
  const railFace: Pt[] = [
    C([-400, railTop, RZ - 3]),
    C([postX0, railTop, RZ - 3]),
    C([postX0, railBot, RZ - 3]),
    C([-400, railBot, RZ - 3]),
  ];
  const front = [post, tableTop, railFace];

  /* ---------------- the view -------------------------------------- */
  // Sky: two long thin streaks.
  s.line([110, 150], [206, 149], { w: 0.5, soft: true, taper: 0.9 });
  s.line([136, 158], [178, 158], { w: 0.45, soft: true, taper: 0.9 });
  s.line([470, 186], [548, 185], { w: 0.45, soft: true, taper: 0.9 });
  // Hills, and the treeline on the far shore.
  const ridge = P(
    `330,${HZ - 2} 400,${HZ - 30} 480,${HZ - 46} 560,${HZ - 50} 640,${HZ - 38} 720,${HZ - 20} 800,${HZ - 12}`,
  );
  s.stroke(ridge, { w: 0.6, taper: 0.9, soft: true, hide: front });
  s.stroke(
    P(
      `0,${HZ - 16} 80,${HZ - 30} 170,${HZ - 36} 260,${HZ - 30} 340,${HZ - 18} 420,${HZ - 12}`,
    ),
    {
      w: 0.5,
      taper: 0.95,
      soft: true,
      hide: [[...ridge, [800, HZ], [330, HZ]]],
    },
  );
  const trees = [spires(s, 0, 420, HZ, 8, 2), spires(s, 440, 770, HZ, 9, 3)];
  forest(
    s,
    trees.map((t) => t.filter((q) => !inside(q, post))),
    HZ,
    1.5,
    0.36,
  );
  s.line([0, HZ + 0.5], [760, HZ + 0.5], { w: 0.55, soft: true, taper: 0.9 });
  // A small island with three spruces.
  const iy = HZ + 26;
  const isle = P(
    `520,${iy} 540,${iy - 5} 572,${iy - 7} 600,${iy - 4} 616,${iy}`,
  );
  s.stroke(isle, { w: 0.7, taper: 0.7 });
  s.wash([...isle, [520, iy + 1]], "stone", 0.5, 0.4);
  for (const [x, h] of [
    [548, 28],
    [561, 38],
    [576, 24],
  ] as const)
    spruce(s, [x, iy - 4], h, 0.7);
  // A sailboat, far out.
  const bx = 214,
    by = HZ + 40;
  s.stroke(
    P(
      `${bx - 8},${by} ${bx + 8},${by} ${bx + 5},${by + 2.6} ${bx - 5},${by + 2.6} ${bx - 8},${by}`,
    ),
    { w: 0.7, smooth: false, taper: 0.3 },
  );
  s.line([bx, by], [bx, by - 20], { w: 0.6, overshoot: 0 });
  const sail = P(
    `${bx - 0.5},${by - 19} ${bx - 7.5},${by - 1.4} ${bx - 0.5},${by - 1.4}`,
  );
  s.wash(sail, "ivory", 1, 0.2);
  s.stroke(sail, { w: 0.55, smooth: false, taper: 0.3 });
  s.stroke(
    P(`${bx + 0.5},${by - 16} ${bx + 6},${by - 1.4} ${bx + 0.5},${by - 1.4}`),
    {
      w: 0.45,
      smooth: false,
      taper: 0.3,
      soft: true,
    },
  );
  s.dash([bx - 3, by + 6], [bx + 3, by + 6], 0.45);
  // Water: a pale band, level dashes thinning out toward the sides, and a
  // few more, fainter, between the balusters.
  const railY = C([0, railTop, RZ - 3])[1];
  s.wash(
    P(`0,${HZ + 2} 816,${HZ + 2} 816,${railY - 6} 0,${railY - 6}`),
    "blue",
    0.24,
    1.6,
  );
  const rows: number[][] = [];
  for (let y = HZ + 6, k = 0; y < railY - 4; y += 6 + k * 2.2, k++)
    rows.push([y, 0, 816, 8 + k * 2]);
  water(s, 400, rows, {
    w: 0.55,
    keep: 1.05,
    hide: [...front, [...isle, [520, iy + 1]]],
  });

  /* ---------------- the railing and the post ---------------------- */
  const rt = [C([-400, railTop, RZ + 3]), C([postX0, railTop, RZ + 3])];
  const rf = [C([-400, railTop, RZ - 3]), C([postX0, railTop, RZ - 3])];
  const rb = [C([-400, railBot, RZ - 3]), C([postX0, railBot, RZ - 3])];
  s.wash([rt[0], rt[1], rf[1], rf[0]], "stone", 0.5, 0.4);
  s.line(rt[0], rt[1], { w: 0.8, overshoot: 0 });
  s.twice([rf[0], rf[1]], { w: 1.4 });
  s.line(rb[0], rb[1], { w: 0.9, overshoot: 0 });
  s.hatch([rf[0], rf[1], rb[1], rb[0]], { angle: 120, gap: 2.6, inset: 0.5 });
  // Balusters, kept plumb as a draughtsman would: two fine verticals each,
  // from the rail down to where the table hides them.
  let bal = "";
  const tableEdgeY = (x: number) => {
    const a0 = C([-90, 0, tableFar]),
      a1 = C([90, 0, tableFar]);
    if (x < a0[0] || x > a1[0]) return 1056;
    return a0[1] + ((a1[1] - a0[1]) * (x - a0[0])) / (a1[0] - a0[0]);
  };
  const railLow = (x: number) => {
    const a0 = rb[0],
      a1 = rb[1];
    return a0[1] + ((a1[1] - a0[1]) * (x - a0[0])) / (a1[0] - a0[0]);
  };
  const postL = C([postX0, railTop, RZ])[0],
    postR = C([postX1, railTop, RZ])[0];
  for (let x = -262; x < postX0 - 6; x += 21) {
    for (const xx of [
      C([x, railBot, RZ - 1])[0],
      C([x + 4, railBot, RZ - 1])[0],
    ]) {
      if (xx < -4 || xx > postL - 3) continue;
      const top = railLow(xx) + 0.6,
        bot = Math.min(tableEdgeY(xx) - 0.8, 1056);
      if (bot - top > 2)
        bal += d2([
          [xx, top],
          [xx, bot],
        ]);
    }
  }
  s.thinLines(bal, 0.6);
  // The lake carries on behind them, paler.
  const low = tableEdgeY(400);
  s.wash(
    P(
      `0,${railLow(0) + 3} ${postL - 2},${railLow(postL) + 3} ${postL - 2},${low - 3} 0,${low - 3}`,
    ),
    "blue",
    0.12,
    1,
  );
  const behind: number[][] = [];
  for (let y = railLow(400) + 12, k = 0; y < low - 8; y += 14 + k * 3, k++)
    behind.push([y, 0, postL - 4, 22 + k * 2]);
  water(s, 380, behind, { w: 0.5, keep: 1.3 });
  // The post, plumb, fading upward into the paper; the porch beam above.
  const beamY = 44;
  const postBot = tableEdgeY(postL);
  s.stroke(
    [
      [postL, postBot],
      [postL, railLow(postL) - 40],
      [postL, beamY + 12],
    ],
    {
      w: 1.2,
      taper: 0.5,
    },
  );
  s.stroke(
    [
      [postR, Math.min(postBot, 1056)],
      [postR, railLow(postR) - 40],
      [postR, beamY + 12],
    ],
    {
      w: 1.4,
      taper: 0.5,
    },
  );
  s.hatch(
    [
      [postL + 0.5, beamY + 16],
      [postR - 0.5, beamY + 16],
      [postR - 0.5, postBot],
      [postL + 0.5, postBot],
    ],
    { angle: 92, gap: 2.4, inset: 0.4 },
  );
  s.stroke(
    [
      [-10, beamY],
      [300, beamY - 0.3],
      [600, beamY + 0.2],
      [826, beamY],
    ],
    {
      w: 1.1,
      taper: 0.9,
    },
  );
  s.stroke(
    [
      [-10, beamY + 12],
      [320, beamY + 12.2],
      [640, beamY + 11.8],
      [826, beamY + 12],
    ],
    {
      w: 0.7,
      taper: 0.9,
      soft: true,
    },
  );
  s.hatch(
    [
      [40, beamY + 1],
      [800, beamY + 1],
      [800, beamY + 11],
      [40, beamY + 11],
    ],
    {
      angle: 120,
      gap: 3.2,
      inset: 1,
      w: 0.4,
      soft: true,
    },
  );

  /* ---------------- the table ------------------------------------- */
  s.wash(
    [C([-90, 0, tableFar]), C([90, 0, tableFar]), [830, 1070], [-14, 1070]],
    "stone",
    0.3,
    1.4,
  );
  s.twice([C([-90, 0, tableFar]), C([90, 0, tableFar])], { w: 1.5 });
  s.stroke([C([-90, 0, tableFar]), C([-100, 0, 40])], { w: 1.2, taper: 0.6 });
  s.stroke([C([90, 0, tableFar]), C([98, 0, 60])], { w: 1.3, taper: 0.6 });
  // Slats toward the vanishing point, broken under what lies on them.
  let slats = "";
  for (let x = -72; x < 90; x += 18) {
    const pts = curve([C([x, 0, tableFar - 0.4]), C([x, 0, 14])], false, 90);
    let run: Pt[] = [];
    const flush = () => {
      if (run.length > 3) slats += d2([run[0], run[run.length - 1]]);
      run = [];
    };
    for (const q of pts) {
      if (onTable.some((h) => inside(q, h)) || q[1] > 1056) flush();
      else run.push(q);
    }
    flush();
  }
  s.thinLines(slats, 0.55, true);

  /* ---------------- the statements -------------------------------- */
  s.w3(sheetB, "ivory", 1, 0.3);
  s.poly(sheetB.map(C), { w: 0.7, closed: true, hide: [sheetA.map(C)] });
  s.w3(sheetA, "ivory", 1, 0.3);
  s.poly(sheetA.map(C), { w: 0.9, closed: true });
  let rules = "";
  for (let z = 57; z < 80; z += 2.4)
    rules += d2([C(pz([49, 0.3, z])), C(pz([z > 74 ? 60 : 68, 0.3, z]))]);
  s.thinLines(rules, 0.45, true);
  s.hatch(
    [
      C(sheetB[1]),
      C([sheetB[1][0] + 2.4, 0, sheetB[1][2] - 1.5]),
      C([sheetB[2][0] + 2.4, 0, sheetB[2][2] - 1]),
      C(sheetB[2]),
    ],
    { angle: 120, gap: 2.6, inset: 0.3 },
  );

  /* ---------------- cup and saucer -------------------------------- */
  s.hatch(ring(CX + 3.4, 0, CZ - 2.4, 8.2, 30).map(C), {
    angle: 120,
    gap: 2.6,
    inset: 0.4,
    hide: [saucer],
  });
  s.wash(saucer, "ivory", 1, 0.3);
  const cupBody = [...cupL, ...cupR.slice().reverse()];
  s.stroke([...saucer, saucer[0]], {
    w: 1.1,
    taper: 0.3,
    smooth: false,
    hide: [cupBody],
  });
  s.stroke(ring(CX, 0.9, CZ, 5.4, 30, Math.PI * 0.08, Math.PI * 0.84).map(C), {
    w: 0.5,
    soft: true,
    taper: 0.8,
    hide: [cupBody],
  });
  s.wash([...cupL, ...cupR.slice().reverse()], "ivory", 1, 0.2);
  s.stroke(cupL, { w: 1.1, taper: 0.4 });
  s.stroke(cupR, { w: 1.3, taper: 0.4 });
  const footRing = plumb(1, 3.2);
  s.stroke(
    footRing.filter((q) => q[1] >= (footL[1] + footR[1]) / 2 - 0.5),
    { w: 0.9, taper: 0.5 },
  );
  // Shade on the right of the cup: a band just inside its right side.
  const inset = (q: Pt, k: number): Pt => [q[0] - k, q[1]];
  s.hatch(
    [rimR, midR, footR, inset(footR, 5), inset(midR, 7), inset(rimR, 8)],
    { angle: 100, gap: 1.8, inset: 0.3 },
  );
  s.stroke(rim, { w: 1, taper: 0.3, closed: true });
  const coffee = plumb(7.4, 3.85);
  s.wash(coffee, "brass", 0.95, 0.3);
  s.stroke(coffee.slice(15, 30), { w: 0.4, soft: true });
  // the handle, on the shaded side
  const hx = (y: number, dx: number): Pt => {
    const q = C([CX + dx, y, CZ]);
    const c = C([CX, y, CZ]);
    return [q[0] - c[0] + base[0], q[1]];
  };
  s.stroke([hx(7, 4.15), hx(6.8, 6.3), hx(4.4, 6.4), hx(3.2, 3.8)], {
    w: 1.1,
    taper: 0.4,
  });
  s.stroke([hx(6.2, 4.2), hx(6.0, 5.5), hx(4.8, 5.6), hx(4.0, 4)], {
    w: 0.55,
    taper: 0.6,
  });

  /* ---------------- the notebook ---------------------------------- */
  // Its shadow, falling right and toward us.
  s.hatch(
    [
      C(nb(X1 + 1, 0, Z1 + 0.9)),
      C(nb(X1 + 3.2, 0, Z1 - 1.2)),
      C(nb(X1 + 3.2, 0, Z0 - 2.6)),
      C(nb(X0 + 1, 0, Z0 - 2.6)),
      C(nb(X0 - 1, 0, Z0 - 0.9)),
      C(nb(X1 + 1, 0, Z0 - 0.9)),
    ],
    { angle: 120, gap: 2.4, inset: 0.3 },
  );
  s.w3(cover3, "navy", 0.2, 0.4);
  s.poly(coverS, { w: 1.2, closed: true, overshoot: 0 });
  s.wash(leftPage, "ivory", 1, 0.3);
  s.wash(rightPage, "ivory", 1, 0.3);
  s.stroke(nearL.map(C), { w: 1.2, taper: 0.4 });
  s.stroke(nearR.map(C), { w: 1.2, taper: 0.4 });
  s.stroke(farL.map(C), { w: 0.8, taper: 0.4 });
  s.stroke(farR.map(C), { w: 0.8, taper: 0.4 });
  s.line(C(nb(X0, lift(X0), Z0)), C(nb(X0, lift(X0), Z1)), {
    w: 0.9,
    overshoot: 0,
  });
  s.line(C(nb(X1, lift(X1), Z0)), C(nb(X1, lift(X1), Z1)), {
    w: 1.2,
    overshoot: 0,
  });
  s.line(C(nb(XG, 0.05, Z0)), C(nb(XG, 0.05, Z1)), { w: 0.8, overshoot: 0 });
  for (const k of [0.3, 0.6, 0.9]) {
    s.stroke(pageRow(X0, XG, Z0 - k * 0.3, -k).map(C), {
      w: 0.4,
      soft: true,
      taper: 0.6,
    });
    s.stroke(pageRow(XG, X1, Z0 - k * 0.3, -k).map(C), {
      w: 0.4,
      soft: true,
      taper: 0.6,
    });
  }
  let ruled = "";
  for (let z = Z0 + 3.2; z < Z1 - 2; z += 3.1)
    for (const [xa, xb] of [
      [X0 + 1.4, XG - 1.3],
      [XG + 1.3, X1 - 1.4],
    ])
      ruled += d2(pageRow(xa, xb, z).map(C));
  s.thinLines(ruled, 0.4, true);
  // A ribbon over the near edge.
  const rib: V3[] = [
    nb(XG + 0.8, 0.3, Z0 + 2.5),
    nb(XG + 2.2, 0.3, Z0 + 2.5),
    nb(XG + 2.8, -0.3, Z0 - 5),
    nb(XG + 1.4, -0.3, Z0 - 5.4),
  ];
  s.w3(rib, "brass", 0.75, 0.2);
  s.stroke([C(nb(XG + 0.8, 0.3, Z0 + 0.5)), C(rib[3])], { w: 0.5 });
  s.stroke([C(nb(XG + 2.2, 0.3, Z0 + 0.5)), C(rib[2])], { w: 0.5 });
  s.stroke([C(rib[3]), C(nb(XG + 2.1, -0.3, Z0 - 4.4)), C(rib[2])], {
    w: 0.5,
    smooth: false,
  });

  // Reading glasses, folded, on the right page.
  const gy = lift(16) + 0.9,
    gz = 45;
  const lens = (cx: number) =>
    ring(0, 0, 0, 2.5, 28).map(([x, , z]) =>
      nb(cx + x * 1.12, gy, gz + z * 0.9),
    );
  const lL = lens(13.6),
    lR = lens(20.6);
  s.hatch(
    ring(0, 0, 0, 2.6, 20).map(([x, , z]) =>
      C(nb(21.6 + x, lift(20) + 0.02, gz - 1.6 + z)),
    ),
    { angle: 120, gap: 1.6, inset: 0.2, hide: [lR.map(C), lL.map(C)] },
  );
  s.stroke(lL.map(C), { w: 0.95, taper: 0.3, closed: true });
  s.stroke(lR.map(C), { w: 0.95, taper: 0.3, closed: true });
  s.stroke(
    [
      C(nb(16.3, gy, gz + 0.8)),
      C(nb(17.1, gy + 0.5, gz + 1.4)),
      C(nb(17.9, gy, gz + 0.8)),
    ],
    {
      w: 0.7,
      taper: 0.5,
    },
  );
  // temples folded behind the lenses
  s.stroke(
    [
      C(nb(10.8, gy + 0.4, gz + 1.3)),
      C(nb(15, gy + 0.6, gz + 2.3)),
      C(nb(21.4, gy + 0.6, gz + 2.1)),
    ],
    {
      w: 0.6,
      taper: 0.6,
    },
  );
  s.stroke(
    [
      C(nb(23.4, gy + 0.4, gz + 1.1)),
      C(nb(19, gy + 0.7, gz + 2.7)),
      C(nb(12.4, gy + 0.7, gz + 2.5)),
    ],
    {
      w: 0.55,
      taper: 0.6,
      soft: true,
    },
  );

  // A pen, lying across the lower right of the page.
  const pa = nb(9.4, lift(9) + 0.5, 37.6),
    pb = nb(25.2, lift(25) + 0.5, 41.8);
  const across = (v: V3, k: number): V3 => [v[0] - 0.26 * k, v[1], v[2] + k];
  s.stroke([C(across(pa, 0.5)), C(across(pb, 0.5))], {
    w: 0.8,
    taper: 0.2,
    smooth: false,
  });
  s.stroke([C(across(pa, -0.5)), C(across(pb, -0.5))], {
    w: 1.05,
    taper: 0.2,
    smooth: false,
  });
  s.line(C(across(pb, 0.5)), C(across(pb, -0.5)), { w: 0.8, overshoot: 0 });
  s.stroke(
    [
      C(across(pa, 0.5)),
      C([pa[0] - 1.7, pa[1], pa[2] - 0.35]),
      C(across(pa, -0.5)),
    ],
    {
      w: 0.7,
      taper: 0.4,
    },
  );
  s.line(C(nb(19.6, lift(19) + 0.9, 40.1)), C(nb(24.4, lift(24) + 0.9, 41.4)), {
    w: 0.5,
    overshoot: 0,
  });
  s.hatch(
    [
      C(across(pa, -0.6)),
      C(across(pb, -0.6)),
      C([pb[0] + 0.5, lift(25), pb[2] - 1.4]),
      C([pa[0] + 0.5, lift(9), pa[2] - 1.4]),
    ],
    { angle: 120, gap: 1.4, inset: 0.1 },
  );

  /* ---------------- words ----------------------------------------- */
  const lines = list.map((t, i) => (
    <text
      key={i}
      className="note"
      fontSize={20}
      transform={flat(
        nb(X0 + 2.2, lift(X0 + 2) + 0.05, Z1 - 5 - i * 3.1),
        0.12,
        TURN,
      )}
    >
      {t}
    </text>
  ));
  const qz = Z1 - 5.2;
  const q = (
    <text
      className="note"
      fontSize={20}
      transform={flat(nb(XG + 2.6, lift(XG + 2.6) + 0.05, qz), 0.118, TURN)}
    >
      {question}
    </text>
  );
  // A curved arrow from the question back to the list.
  const arrow = [
    nb(XG + 5, 1.1, qz - 1.6),
    nb(XG + 3.2, 1.1, qz - 5.4),
    nb(XG - 2.8, 0.7, qz - 9.8),
  ].map(C);
  s.stroke(curve(arrow, false, 10), { w: 0.6, taper: 0.7, smooth: false });
  const tip = arrow[2];
  s.stroke([[tip[0] + 5.5, tip[1] - 4], tip, [tip[0] + 6.5, tip[1] + 1.8]], {
    w: 0.6,
    taper: 0.6,
    smooth: false,
  });
  const papers = (
    <text
      className="note"
      fontSize={20}
      transform={flat(pz([49, 0.3, 80.5]), 0.105, -10)}
    >
      {WORDS[lang].papers}
    </text>
  );

  return (
    <Art w={PORCH.w} h={PORCH.h}>
      {s.render()}
      {lines}
      {q}
      {papers}
    </Art>
  );
}
