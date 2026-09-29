import type { Language } from "@/lib/business";
import { Art, Label } from "@/components/ink/primitives";
import { hull, S, Sketch, tilted, type Pt, type V3 } from "./kit";

/*
 * Chapter 7: five containers on a table, each opened at a different time
 * for a different reason, lying apart: a pension envelope, an RRSP file
 * folder, a small TFSA notebook, a stack of statements for the
 * non-registered account, and the company's ledger. Seen in one
 * perspective (centimetres, table top at y = 0), light from the upper left.
 */
export const CONTAINERS = { w: 720, h: 540 };

const E: V3 = [0, 62, 0];
const cam = tilted(E, 520, 360, 372, 45);
const LIGHT: V3 = (() => {
  const v: V3 = [-1, 1.4, -0.5];
  const l = Math.hypot(...v);
  return v.map((c) => c / l) as V3;
})();

type Box = { top: V3[]; faces: V3[][]; sil: Pt[] };

/** A flat box on the table, turned `yaw` degrees about its centre. */
function slab(
  cx: number,
  cz: number,
  w: number,
  d: number,
  h: number,
  yaw: number,
  y0 = 0,
): Box {
  const t = (yaw * Math.PI) / 180;
  const at = (dx: number, dz: number, y: number): V3 => [
    cx + dx * Math.cos(t) - dz * Math.sin(t),
    y,
    cz + dx * Math.sin(t) + dz * Math.cos(t),
  ];
  const b = [
    at(-w / 2, -d / 2, y0),
    at(w / 2, -d / 2, y0),
    at(w / 2, d / 2, y0),
    at(-w / 2, d / 2, y0),
  ];
  const u = b.map(([x, , z]) => [x, y0 + h, z] as V3);
  const faces = [
    u, // top
    [b[0], b[1], u[1], u[0]], // near
    [b[1], b[2], u[2], u[1]], // right
    [b[2], b[3], u[3], u[2]], // far
    [b[3], b[0], u[0], u[3]], // left
  ];
  return { top: u, faces, sil: hull([...b, ...u].map(cam)) };
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Draw a slab: visible faces, the silhouette firmer, the shaded side hatched. */
function drawSlab(
  s: Sketch,
  box: Box,
  o: {
    tone?: "stone" | "ivory" | "navy" | "blue";
    tint?: number;
    hide?: Pt[][];
  } = {},
) {
  const hide = o.hide ?? [];
  const C = (v: V3) => cam(v);
  // shadow on the table, pushed right and toward us
  const foot = box.faces[0].map(([x, , z]) => [x + 2.6, 0, z - 1.8] as V3);
  s.hatch(
    hull([...box.faces[0].map(([x, , z]) => C([x, 0, z])), ...foot.map(C)]),
    {
      angle: 120,
      gap: 2.4,
      inset: 0.3,
      hide: [box.sil, ...hide],
    },
  );
  s.wash(box.sil, o.tone ?? "ivory", o.tint ?? 1, 0.3);
  for (const f of box.faces) {
    const [a, b, c] = f;
    let n = cross(sub(b, a), sub(c, a));
    const centre: V3 = [
      (f[0][0] + f[2][0]) / 2,
      (f[0][1] + f[2][1]) / 2,
      (f[0][2] + f[2][2]) / 2,
    ];
    // outward: away from the box's own centre
    const mid = box.faces[0].reduce(
      (m, v) => [m[0] + v[0] / 4, m[1], m[2] + v[2] / 4] as V3,
      [0, box.faces[0][0][1] / 2, 0] as V3,
    );
    if (dot(n, sub(centre, mid)) < 0) n = n.map((v) => -v) as V3;
    if (dot(n, sub(E, centre)) <= 0) continue;
    const q = f.map(C);
    const lit = dot(n, LIGHT) / Math.hypot(...n);
    if (f !== box.faces[0] && lit < 0.15)
      s.hatch(q, { angle: 100, gap: 1.8, inset: 0.2, hide });
    s.poly(q, {
      w: f === box.faces[0] ? 0.9 : 0.7,
      closed: true,
      overshoot: 0,
      hide,
    });
  }
  s.stroke([...box.sil, box.sil[0]], {
    w: 1.1,
    smooth: false,
    taper: 0.3,
    hide,
  });
}

export function Containers({ labels }: { lang: Language; labels: string[] }) {
  const s = new Sketch(9307, cam);
  const C = (v: V3) => cam(v);
  const [rrsp, tfsa, pension, nonReg, company] = labels;

  // The table's far edge and a little grain, the rest left to the paper.

  let grain = "";
  for (const [x0, x1, z] of [
    [-66, -54, 134],
    [60, 70, 126],
    [-20, -8, 64],
    [52, 64, 42],
  ]) {
    const a = C([x0, 0, z]),
      b = C([x1, 0, z]);
    grain += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  }
  s.thinLines(grain, 0.4, true);

  // Far to near, so nearer things draw over farther ones.
  // The company ledger: thick, hard covers, a dark spine.
  const ledger = slab(40, 104, 24, 31, 3.4, -8);
  drawSlab(s, ledger, { tone: "navy", tint: 0.22 });
  {
    const t = (-8 * Math.PI) / 180;
    const sp = (dx: number, dz: number): V3 => [
      40 + dx * Math.cos(t) - dz * Math.sin(t),
      3.45,
      104 + dx * Math.sin(t) + dz * Math.cos(t),
    ];
    s.line(C(sp(-9, -15.5)), C(sp(-9, 15.5)), { w: 0.8, overshoot: 0 });
    s.hatch(
      [C(sp(-12, -15.5)), C(sp(-9, -15.5)), C(sp(-9, 15.5)), C(sp(-12, 15.5))],
      {
        angle: 95,
        gap: 1.6,
        inset: 0.2,
      },
    );
    s.poly([C(sp(-2, -4)), C(sp(8, -4)), C(sp(8, 3)), C(sp(-2, 3))], {
      w: 0.5,
      closed: true,
      soft: true,
      overshoot: 0,
    });
  }

  // Statements for the non-registered account: a small fanned stack.
  const sheets = [
    slab(-38, 96, 21.6, 27.9, 0.3, 14),
    slab(-37, 95, 21.6, 27.9, 0.3, 6),
    slab(-36, 94, 21.6, 27.9, 0.3, -3),
  ];
  const sheetHide: Pt[][] = [];
  for (let i = sheets.length - 1; i >= 0; i--) {
    drawSlab(s, sheets[i], { hide: sheetHide });
    sheetHide.push(sheets[i].sil);
  }
  {
    const t = (-3 * Math.PI) / 180;
    const sp = (dx: number, dz: number): V3 => [
      -36 + dx * Math.cos(t) - dz * Math.sin(t),
      0.32,
      94 + dx * Math.sin(t) + dz * Math.cos(t),
    ];
    let rules = "";
    for (let dz = 8; dz > -12; dz -= 2.6) {
      const a = C(sp(-8, dz)),
        b = C(sp(dz > 4 ? 0 : 8, dz));
      rules += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
    }
    s.thinLines(rules, 0.4, true);
    s.thinLines(
      (() => {
        const a = C(sp(2, -10)),
          b = C(sp(8, -10));
        return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
      })(),
      0.8,
    );
  }

  // The RRSP file folder: closed, a tab along its top edge.
  const folder = slab(2, 80, 31, 24, 1.4, -5);
  drawSlab(s, folder, { tone: "stone", tint: 0.8 });
  {
    const t = (-5 * Math.PI) / 180;
    const sp = (dx: number, dz: number, y = 1.45): V3 => [
      2 + dx * Math.cos(t) - dz * Math.sin(t),
      y,
      80 + dx * Math.sin(t) + dz * Math.cos(t),
    ];
    const tab = [sp(4, 12), sp(6, 14.2), sp(14, 14.2), sp(15.5, 12)];
    s.wash(tab.map(C), "stone", 0.8, 0.2);
    s.stroke(tab.map(C), { w: 0.8, smooth: false, taper: 0.3 });
    s.line(C(sp(-15.5, 10.5)), C(sp(15.5, 10.5)), {
      w: 0.45,
      soft: true,
      overshoot: 0,
    });
  }

  // The pension envelope: flat, its flap outlined.
  const env = slab(-34, 62, 24, 11, 0.5, 9);
  drawSlab(s, env);
  {
    const t = (9 * Math.PI) / 180;
    const sp = (dx: number, dz: number): V3 => [
      -34 + dx * Math.cos(t) - dz * Math.sin(t),
      0.55,
      62 + dx * Math.sin(t) + dz * Math.cos(t),
    ];
    s.stroke([C(sp(-12, 5.5)), C(sp(0, -1.5)), C(sp(12, 5.5))], {
      w: 0.7,
      smooth: false,
      taper: 0.4,
    });
    s.poly([C(sp(5, -1)), C(sp(9.5, -1)), C(sp(9.5, -4.2)), C(sp(5, -4.2))], {
      w: 0.5,
      closed: true,
      overshoot: 0,
    });
  }

  // The TFSA notebook: small, soft cover, an elastic band.
  const nb = slab(32, 60, 15, 21, 1.3, 14);
  drawSlab(s, nb, { tone: "blue", tint: 0.5 });
  {
    const t = (14 * Math.PI) / 180;
    const sp = (dx: number, dz: number, y = 1.36): V3 => [
      32 + dx * Math.cos(t) - dz * Math.sin(t),
      y,
      60 + dx * Math.sin(t) + dz * Math.cos(t),
    ];
    s.line(C(sp(4.6, -10.5)), C(sp(4.6, 10.5)), { w: 0.9, overshoot: 0 });
    s.line(C(sp(4.6, -10.5, 0)), C(sp(4.6, -10.5, 1.36)), {
      w: 0.8,
      overshoot: 0,
    });
  }

  // Labels, as on a plate: each with a hairline to its object.
  const tag = (v: V3): Pt => C(v);
  const off = (
    v: V3,
    dx: number,
    dy: number,
    a: "start" | "middle" | "end",
    t: string,
  ) => {
    const q = tag(v);
    return { at: q, x: q[0] + dx, y: q[1] + dy, t, a };
  };
  const L = [
    off([44, 3.4, 116], 40, -46, "start", company),
    off([-40, 0.3, 104], -30, -52, "end", nonReg),
    off([4, 1.4, 88], 10, -70, "middle", rrsp),
    off([-40, 0.5, 58], -20, 62, "end", pension),
    off([36, 1.3, 54], 40, 58, "start", tfsa),
  ];
  void S;
  return (
    <Art w={CONTAINERS.w} h={CONTAINERS.h}>
      {s.render()}
      {L.map((l) => (
        <Label key={l.t} x={l.x} y={l.y} size={16} anchor={l.a} to={l.at}>
          {l.t}
        </Label>
      ))}
    </Art>
  );
}
