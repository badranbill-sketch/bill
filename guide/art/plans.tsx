import type { Language } from "@/lib/business";
import { Art, Label } from "@/components/ink/primitives";
import { C, D, P, rot, S, Sketch, type Pt } from "./kit";

/*
 * Plan views, drawn like an architect's plate: seen from straight above,
 * light from the upper left so shadows fall right and down, a few pencil
 * construction lines, labels set in the serif italic.
 *
 * TablePlan: the opening's idea. Ten subjects that used to sit apart,
 * now at one dining table, around one notebook: your retirement income.
 * AloneDesk: the same idea before, a small desk with one chair.
 */

/** A chair in plan: a seat with rounded corners and a heavier back. */
function chair(s: Sketch, [x, y]: Pt, deg: number, w = 38, d = 36) {
  const r = 5;
  const seat = P(
    `${-w / 2 + r},${-d / 2} ${w / 2 - r},${-d / 2} ${w / 2},${-d / 2 + r} ${w / 2},${d / 2 - r} ${w / 2 - r},${d / 2} ${-w / 2 + r},${d / 2} ${-w / 2},${d / 2 - r} ${-w / 2},${-d / 2 + r}`,
  ).map(([px, py]): Pt => [x + px, y + py]);
  const R = (q: Pt[]) => rot(q, [x, y], deg);
  const back = R([
    [x - w / 2 - 1, y + d / 2 - 1],
    [x + w / 2 + 1, y + d / 2 - 1],
    [x + w / 2 + 1, y + d / 2 + 5],
    [x - w / 2 - 1, y + d / 2 + 5],
  ]);
  const seatR = R(seat);
  // shadow: the same outline, nudged down and right
  const sh = seatR.map(([px, py]): Pt => [px + 4, py + 4]);
  s.hatch(sh, { angle: 120, gap: 2.8, inset: 0.4, hide: [seatR, back] });
  s.wash(seatR, "stone", 0.5, 0.5);
  s.stroke([...seatR, seatR[0]], { w: S, taper: 0.3, smooth: false });
  s.wash(back, "navy", 0.14, 0.3);
  s.poly(back, { w: 1.1, closed: true, overshoot: 0 });
  return [seatR, back];
}

/** A plate in plan: two circles and a faint rim shadow. */
function plate(s: Sketch, [x, y]: Pt, r = 17) {
  s.ellipse(x, y, r, r, { w: 0.8 });
  s.ellipse(x, y, r * 0.66, r * 0.66, { w: 0.45, soft: true });
  s.stroke(
    Array.from({ length: 9 }, (_, i): Pt => {
      const a = -0.2 + (i / 8) * 1.9;
      return [x + Math.cos(a) * (r + 1.4), y + Math.sin(a) * (r + 1.4)];
    }),
    { w: 0.5, soft: true, taper: 0.9 },
  );
}

/** A small tent card in plan: a rectangle and its fold. */
function card(s: Sketch, [x, y]: Pt, deg: number) {
  const q = rot(
    [
      [x - 11, y - 4],
      [x + 11, y - 4],
      [x + 11, y + 4],
      [x - 11, y + 4],
    ],
    [x, y],
    deg,
  );
  s.wash(q, "ivory", 1, 0.2);
  s.poly(q, { w: 0.6, closed: true, overshoot: 0 });
  const f = rot(
    [
      [x - 11, y],
      [x + 11, y],
    ],
    [x, y],
    deg,
  );
  s.line(f[0], f[1], { w: 0.4, soft: true, overshoot: 0 });
}

/** An open notebook in plan, lying square. */
function notebook(s: Sketch, [x, y]: Pt, w = 76, h = 52) {
  const cover: Pt[] = [
    [x - w / 2 - 2, y - h / 2 - 2],
    [x + w / 2 + 2, y - h / 2 - 2],
    [x + w / 2 + 2, y + h / 2 + 2],
    [x - w / 2 - 2, y + h / 2 + 2],
  ];
  s.hatch(
    cover.map(([px, py]): Pt => [px + 3, py + 3]),
    { angle: 120, gap: 2.4, inset: 0.3, hide: [cover] },
  );
  s.wash(cover, "navy", 0.2, 0.3);
  s.poly(cover, { w: 1, closed: true, overshoot: 0 });
  const pages: Pt[] = [
    [x - w / 2, y - h / 2],
    [x + w / 2, y - h / 2],
    [x + w / 2, y + h / 2],
    [x - w / 2, y + h / 2],
  ];
  s.wash(pages, "ivory", 1, 0.3);
  s.poly(pages, { w: 0.8, closed: true, overshoot: 0 });
  s.line([x, y - h / 2], [x, y + h / 2], { w: 0.7, overshoot: 0 });
  let ruled = "";
  for (let yy = y - h / 2 + 8; yy < y + h / 2 - 4; yy += 6)
    ruled += `M${x - w / 2 + 5} ${yy}L${x - 4} ${yy}M${x + 4} ${yy}L${x + w / 2 - 5} ${yy}`;
  s.thinLines(ruled, 0.4, true);
  // a few lines of writing, suggested
  let writing = "";
  for (const [dx, dy, l] of [
    [-w / 2 + 7, -h / 2 + 7.5, 22],
    [-w / 2 + 7, -h / 2 + 13.5, 16],
    [-w / 2 + 7, -h / 2 + 19.5, 25],
    [6, -h / 2 + 7.5, 18],
  ])
    writing += `M${x + dx} ${y + dy}c${l * 0.25} -1 ${l * 0.5} 1 ${l * 0.75} -0.4s${l * 0.2} 0.8 ${l * 0.25} 0.2`;
  s.thinLines(writing, 0.6);
}

export const TABLE_PLAN = { w: 672, h: 640 };

export function TablePlan({
  lang,
  cards,
  centre,
}: {
  lang: Language;
  cards: string[];
  centre: string;
}) {
  void lang;
  const s = new Sketch(5117);
  const cx = 336,
    cy = 322,
    hw = 250,
    hh = 158,
    rr = 58;

  // Construction lines through the centre, past the table.
  s.pencil([cx - hw - 78, cy], [cx - hw - 40, cy]);
  s.pencil([cx + hw + 40, cy], [cx + hw + 78, cy]);
  s.pencil([cx, cy - hh - 84], [cx, cy - hh - 50]);
  s.pencil([cx, cy + hh + 50], [cx, cy + hh + 84]);

  // Ten seats: four along each side, one at each end.
  const xs = [-174, -58, 58, 174];
  const seats: { at: Pt; n: Pt }[] = [
    ...xs.map((x) => ({ at: [cx + x, cy - hh] as Pt, n: [0, -1] as Pt })),
    { at: [cx + hw, cy] as Pt, n: [1, 0] as Pt },
    ...xs
      .slice()
      .reverse()
      .map((x) => ({ at: [cx + x, cy + hh] as Pt, n: [0, 1] as Pt })),
    { at: [cx - hw, cy] as Pt, n: [-1, 0] as Pt },
  ];
  const hide: Pt[][] = [];
  for (const { at, n } of seats) {
    const deg = (Math.atan2(n[1], n[0]) * 180) / Math.PI - 90;
    hide.push(...chair(s, [at[0] + n[0] * 30, at[1] + n[1] * 30], deg));
  }

  // The table: a long top with rounded corners, its shadow, a pale wash.
  const corner = (ccx: number, ccy: number, a0: number): Pt[] =>
    Array.from({ length: 9 }, (_, i) => {
      const a = a0 + (i / 8) * (Math.PI / 2);
      return [ccx + Math.cos(a) * rr, ccy + Math.sin(a) * rr];
    });
  const top: Pt[] = [
    ...corner(cx + hw - rr, cy - hh + rr, -Math.PI / 2),
    ...corner(cx + hw - rr, cy + hh - rr, 0),
    ...corner(cx - hw + rr, cy + hh - rr, Math.PI / 2),
    ...corner(cx - hw + rr, cy - hh + rr, Math.PI),
  ];
  s.hatch(
    top.map(([x, y]): Pt => [x + 8, y + 8]),
    { angle: 120, gap: 3, inset: 0.4, hide: [top, ...hide] },
  );
  s.wash(top, "stone", 0.42, 1.2);
  s.twice([...top, top[0]], { w: C, smooth: false });
  // grain: a few long strokes along the table
  let grain = "";
  for (const [dy, x0, x1] of [
    [-86, -160, 40],
    [-40, -210, -60],
    [44, 20, 200],
    [88, -120, 60],
  ])
    grain += `M${cx + x0} ${cy + dy}C${cx + x0 + 60} ${cy + dy - 2} ${cx + x1 - 60} ${cy + dy + 2} ${cx + x1} ${cy + dy}`;
  s.thinLines(grain, 0.4, true);

  // A plate and a place card at each seat; the name set just inside.
  const labelAt: Pt[] = [];
  for (const { at, n } of seats) {
    plate(s, [at[0] - n[0] * 30, at[1] - n[1] * 30], 16);
    const deg = (Math.atan2(n[1], n[0]) * 180) / Math.PI - 90;
    card(s, [at[0] - n[0] * 56, at[1] - n[1] * 56], deg);
    labelAt.push(
      n[1] !== 0
        ? [at[0], n[1] < 0 ? at[1] + 84 : at[1] - 70]
        : [at[0] - n[0] * 100, at[1] + 5],
    );
  }

  // The notebook in the middle: what they all come back to.
  notebook(s, [cx, cy - 8], 92, 58);

  // Pencil threads: each subject to the notebook, and the pairs that pull
  // on each other most (taxes and withdrawals, pension and spouse …).
  const links: [number, number][] = [
    [3, 4],
    [4, 5],
    [1, 2],
    [8, 9],
    [9, 0],
    [6, 7],
    [5, 6],
    [7, 8],
  ];
  const thread = (a: Pt, b: Pt, bow: number) => {
    const m: Pt = [
      (a[0] + b[0]) / 2 + (b[1] - a[1]) * bow,
      (a[1] + b[1]) / 2 - (b[0] - a[0]) * bow,
    ];
    return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${m[0].toFixed(1)} ${m[1].toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  };
  // Where a thread leaves each name: just below or above it, or beside
  // it at the ends of the table.
  const anchor = (q: Pt, i: number): Pt =>
    i === 4
      ? [q[0] - 32, q[1] - 5]
      : i === 9
        ? [q[0] + 42, q[1] - 5]
        : [q[0], q[1] + (q[1] < cy ? 8 : -18)];
  const nbx = 46,
    nby = 29;
  let threads = "";
  const bows = [0.06, -0.05, 0.05, -0.06, 0.03, 0.06, 0, 0, -0.05, -0.03];
  labelAt.forEach((q, i) => {
    // the two names nearest the caption reach the notebook through their
    // neighbours instead of across the words
    if (i === 6 || i === 7) return;
    const a = anchor(q, i);
    // the nearest point on the notebook's edge, toward the name
    const dx = a[0] - cx,
      dy = a[1] - (cy - 8);
    const k = Math.min(nbx / Math.abs(dx || 1e-6), nby / Math.abs(dy || 1e-6));
    const b: Pt = [cx + dx * k * 1.08, cy - 8 + dy * k * 1.08];
    threads += thread(a, b, bows[i]);
  });
  for (const [i, j] of links) {
    const a = anchor(labelAt[i], i),
      b = anchor(labelAt[j], j);
    threads += thread(a, b, a[1] < cy || b[1] < cy ? -0.1 : 0.1);
  }

  return (
    <Art w={TABLE_PLAN.w} h={TABLE_PLAN.h}>
      <path
        d={threads}
        fill="none"
        stroke="var(--pencil, #a7b4c3)"
        strokeWidth={0.75}
        strokeLinecap="round"
        opacity={0.8}
      />
      {s.render()}
      {cards.map((t, i) => (
        <Label
          key={t}
          x={labelAt[i][0]}
          y={labelAt[i][1]}
          size={15}
          anchor="middle"
        >
          {t}
        </Label>
      ))}
      <Label x={cx} y={cy + 50} size={16} anchor="middle">
        {centre}
      </Label>
      {void D}
    </Art>
  );
}

export const ALONE = { w: 250, h: 190 };

/** Before: one small table, one chair, one place set. */
export function AloneDesk({ label }: { label: string }) {
  const s = new Sketch(5203);
  const cx = 130,
    cy = 82,
    hw = 56,
    hh = 40,
    rr = 14;
  s.pencil([cx - hw - 34, cy], [cx - hw - 14, cy]);
  s.pencil([cx + hw + 14, cy], [cx + hw + 34, cy]);
  const hide = chair(s, [cx, cy + hh + 28], 0, 36, 32);
  const corner = (ccx: number, ccy: number, a0: number): Pt[] =>
    Array.from({ length: 7 }, (_, i) => {
      const a = a0 + (i / 6) * (Math.PI / 2);
      return [ccx + Math.cos(a) * rr, ccy + Math.sin(a) * rr];
    });
  const top: Pt[] = [
    ...corner(cx + hw - rr, cy - hh + rr, -Math.PI / 2),
    ...corner(cx + hw - rr, cy + hh - rr, 0),
    ...corner(cx - hw + rr, cy + hh - rr, Math.PI / 2),
    ...corner(cx - hw + rr, cy - hh + rr, Math.PI),
  ];
  s.hatch(
    top.map(([x, y]): Pt => [x + 6, y + 6]),
    { angle: 120, gap: 2.8, inset: 0.4, hide: [top, ...hide] },
  );
  s.wash(top, "stone", 0.42, 0.8);
  s.stroke([...top, top[0]], { w: 1.2, smooth: false, taper: 0.3 });
  plate(s, [cx, cy + hh - 18], 12);
  card(s, [cx, cy - 2], 0);
  return (
    <Art w={ALONE.w} h={ALONE.h}>
      {s.render()}
      <Label x={cx} y={cy - 16} size={14} anchor="middle">
        {label}
      </Label>
    </Art>
  );
}
