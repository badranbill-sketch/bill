import { curve } from "@/lib/ink";
import { enc, type Pt } from "@/lib/terrain";

/**
 * The walker used in every scene: an architectural scale figure, not a
 * character. Adult proportions (about 7.5 heads, 64 units tall), a filled
 * ink silhouette in a coat and trousers, no face. Origin is the ground point
 * between the feet; the figure faces right. Seated, it is seen from behind
 * in an Adirondack chair (see CHAIR), its origin on the deck under the seat.
 */
type Leg = { knee: Pt; ankle: Pt; toe: Pt };
type Arm = { elbow: Pt; wrist: Pt };
type Frame = {
  hip: Pt;
  shoulder: Pt;
  head: Pt;
  /** far leg, then near leg */
  legs: [Leg, Leg];
  /** far arm, then near arm */
  arms: [Arm, Arm];
  /** a walking pole, hand to tip */
  pole?: [Pt, Pt];
};

const walk: Frame = {
  hip: [0, -32],
  shoulder: [1.4, -52],
  head: [2.4, -59.6],
  legs: [
    { knee: [-4.2, -17.2], ankle: [-8.4, -3], toe: [0.86, 0.5] },
    { knee: [4.6, -17.6], ankle: [8, -2.2], toe: [0.96, -0.28] },
  ],
  arms: [
    { elbow: [2.8, -40.4], wrist: [5.6, -30.8] },
    { elbow: [-2.4, -40.4], wrist: [-5.2, -30.4] },
  ],
};
const walkPass: Frame = {
  hip: [0, -33],
  shoulder: [1.4, -53],
  head: [2.4, -60.6],
  legs: [
    { knee: [0.8, -17.4], ankle: [0, -2.2], toe: [1, 0] },
    { knee: [4.4, -19.4], ankle: [1.6, -7.4], toe: [0.7, 0.72] },
  ],
  arms: [
    { elbow: [1.6, -41], wrist: [2.8, -30] },
    { elbow: [0, -41.2], wrist: [0.4, -29.6] },
  ],
};
/**
 * Climbing: upright, leaning a little into the slope, the lead foot a step
 * up, a trekking pole planted by it with the grip at elbow height. The torso
 * stays straight so the pose reads as an adult hiking, not a stoop on a cane.
 */
const climb: Frame = {
  hip: [0, -32],
  shoulder: [2.6, -52],
  head: [3.7, -59.6],
  legs: [
    { knee: [-3.4, -16.8], ankle: [-7.6, -2.6], toe: [0.8, 0.6] },
    { knee: [7, -20.6], ankle: [7.8, -5.6], toe: [1, -0.1] },
  ],
  arms: [
    { elbow: [1, -41.6], wrist: [-1.8, -32.4] },
    { elbow: [4.2, -41.8], wrist: [12.4, -39.8] },
  ],
  pole: [
    [14, -42.4],
    [12.4, -4.2],
  ],
};
const climbPass: Frame = {
  ...climb,
  hip: [0, -32.6],
  legs: [
    { knee: [-0.6, -16.6], ankle: [-2.8, -2.6], toe: [0.9, 0.44] },
    { knee: [5.8, -20], ankle: [5.4, -5.4], toe: [1, 0] },
  ],
};
const stand: Frame = {
  hip: [0, -33],
  shoulder: [0.4, -53],
  head: [1, -60.6],
  legs: [
    { knee: [-1.6, -17.6], ankle: [-2.4, -2.2], toe: [1, 0] },
    { knee: [1.8, -17.6], ankle: [2.6, -2.2], toe: [1, 0] },
  ],
  arms: [
    { elbow: [2.2, -41.4], wrist: [3.2, -30.2] },
    { elbow: [-0.6, -41.4], wrist: [-0.2, -29.8] },
  ],
};

/**
 * An Adirondack chair seen from behind, facing the lake: the fan of its back
 * hides a seated figure below the shoulders. Shared by the chairs on the dock
 * (parts.tsx) and the seated pose below. Units from the deck point under the
 * middle of the seat.
 */
export const CHAIR = {
  /** half width of the fan at its foot (seat level) and at its top */
  foot: 8.5,
  top: 12.5,
  seat: -12,
  /** height of the fan's top edge: highest in the middle, lower at the sides */
  crown: -38,
  shoulder: -34.5,
  arm: -22,
  armHalf: 17,
};
/** Height of the chair back's top edge at `x` (from the middle). */
export const chairTop = (x: number) =>
  CHAIR.shoulder +
  (CHAIR.crown - CHAIR.shoulder) * (1 - (x / CHAIR.top) * (x / CHAIR.top));

export type Pose = "walk" | "climb" | "stand" | "sit";
const poses: Record<Exclude<Pose, "sit">, [Frame, Frame]> = {
  walk: [walk, walkPass],
  climb: [climb, climbPass],
  stand: [stand, stand],
};

const add = (a: Pt, b: Pt, k = 1): Pt => [a[0] + b[0] * k, a[1] + b[1] * k];
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const unit = (v: Pt): Pt => {
  const d = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / d, v[1] / d];
};
/** Normal of a direction: for a bone pointing up, it points right. */
const norm = (v: Pt): Pt => {
  const [x, y] = unit(v);
  return [-y, x];
};

/**
 * A closed outline, smoothed (unless `sharp`) and wound one way for every
 * shape, so shapes sharing a path never cancel.
 */
function ring(pts: Pt[], sharp = false) {
  const p = sharp
    ? pts
    : curve(
        pts.map((q) => [q[0], q[1]]),
        true,
        3,
      ).slice(0, -1);
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i],
      b = p[(i + 1) % p.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return enc(s < 0 ? [...p].reverse() : p, true);
}

/**
 * A limb as one closed outline: bones through the joints, the given half
 * widths at each joint, ends rounded off.
 */
function limb(joints: Pt[], half: number[]): Pt[] {
  const n = joints.length;
  const normals = joints.map((_, i) =>
    norm(sub(joints[Math.min(n - 1, i + 1)], joints[Math.max(0, i - 1)])),
  );
  const left = joints.map((j, i) => add(j, normals[i], half[i]));
  const right = joints.map((j, i) => add(j, normals[i], -half[i]));
  const d0 = unit(sub(joints[0], joints[1])),
    d1 = unit(sub(joints[n - 1], joints[n - 2]));
  return [
    add(joints[0], d0, half[0] * 0.7),
    ...left,
    add(joints[n - 1], d1, half[n - 1] * 0.8),
    ...right.reverse(),
  ];
}

function ellipse(c: Pt, rx: number, ry: number, tilt = 0, k = 14): Pt[] {
  const ca = Math.cos(tilt),
    sa = Math.sin(tilt);
  return Array.from({ length: k }, (_, i) => {
    const t = (i / k) * Math.PI * 2;
    const x = Math.cos(t) * rx,
      y = Math.sin(t) * ry;
    return [c[0] + x * ca - y * sa, c[1] + x * sa + y * ca] as Pt;
  });
}

/** A shoe: heel under the ankle, toe along `toe`. */
function shoe(l: Leg): Pt[] {
  const d = unit(l.toe),
    up: Pt = [d[1], -d[0]];
  const heel = add(l.ankle, d, -1.5);
  return [
    add(heel, up, 1.6),
    add(heel, up, -2.2),
    add(add(l.ankle, d, 4.4), up, -2.2),
    add(add(l.ankle, d, 5.2), up, -1.2),
    add(add(l.ankle, d, 3.4), up, 0.6),
    add(l.ankle, up, 1.6),
  ];
}

/** The small basket across a trekking pole, just above its tip. */
function basket([grip, tip]: [Pt, Pt]) {
  const d = unit(sub(grip, tip)),
    n = norm(d),
    c = add(tip, d, 2.6);
  return enc([add(c, n, -1.6), add(c, n, 1.6)]);
}

/** The outlines of one standing frame. */
function drawFrame(f: Frame) {
  const axis = sub(f.shoulder, f.hip);
  const n = norm(axis); // towards the chest
  const up = unit(axis);
  const at = (base: Pt, u: number, v: number): Pt =>
    add(add(base, up, u), n, v);
  // The coat: shoulders to a hem just below the hips.
  const coat: Pt[] = [
    at(f.hip, -5.4, 5.2),
    at(f.hip, 4, 4.3),
    at(f.shoulder, -8, 4.6),
    at(f.shoulder, -2, 4.6),
    at(f.shoulder, 1.2, 3),
    at(f.shoulder, 1.8, -0.6),
    at(f.shoulder, 0.6, -3.8),
    at(f.shoulder, -6, -4.6),
    at(f.hip, 5, -4),
    at(f.hip, -5.2, -4.4),
  ];
  const neck = limb(
    [add(f.shoulder, up, -0.5), add(f.head, sub(f.shoulder, f.head), 0.45)],
    [1.5, 1.3],
  );
  const head = ellipse(f.head, 3.3, 4.25, Math.atan2(axis[0], -axis[1]) * 0.6);
  const leg = (l: Leg) => limb([f.hip, l.knee, l.ankle], [3, 2.2, 1.5]);
  const arm = (a: Arm) =>
    limb(
      [
        add(f.shoulder, up, -2),
        a.elbow,
        a.wrist,
        add(a.wrist, unit(sub(a.wrist, a.elbow)), 2.4),
      ],
      [1.9, 1.5, 1.15, 1],
    );
  const [far, near] = f.legs,
    [farArm, nearArm] = f.arms;
  return {
    far: ring(arm(farArm)) + ring(leg(far)) + ring(shoe(far), true),
    near: ring(leg(near)) + ring(shoe(near), true),
    coat: ring(coat) + ring(neck) + ring(head),
    arm: ring(arm(nearArm)),
    pole: f.pole ? enc(f.pole) + basket(f.pole) : "",
  };
}

/**
 * Seated in a chair, seen from behind: head and shoulders above its back.
 * The companion is a little slighter, with hair to the collar, and leans
 * towards the walker.
 */
function drawSeated(companion = false) {
  const k = companion ? 0.93 : 1;
  const edge = [-8.4, -6, -3, 0, 3, 6, 8.4].map(
    (x) => [x * k, chairTop(x * k) - 0.9] as Pt,
  );
  const shoulders: Pt[] = [
    ...edge,
    [8.2 * k, -38.6],
    [6.4 * k, -40.6],
    [2.2 * k, -41.6],
    [-2.2 * k, -41.6],
    [-6.4 * k, -40.6],
    [-8.2 * k, -38.6],
  ];
  const neck = limb(
    [
      [0, -40.5],
      [companion ? -0.4 : 0.2, -43.6],
    ],
    [1.7 * k, 1.5 * k],
  );
  const head = companion
    ? [
        ...ellipse([-0.9, -45.9], 3.25, 4.1, -0.12, 10).slice(5),
        [2.9, -43.2] as Pt,
        [3.4, -41.4] as Pt,
        [-4.6, -41.4] as Pt,
        [-4.4, -43.4] as Pt,
      ]
    : ellipse([0.3, -46.4], 3.4, 4.3, 0.05);
  // forearms resting on the arms of the chair, just past the back's edges
  const elbow = (s: number) =>
    ring(
      limb(
        [
          [s * 13.4, CHAIR.arm - 3.4],
          [s * 14.4, CHAIR.arm - 0.9],
        ],
        [1.6, 1.4],
      ),
    );
  return {
    coat: ring(shoulders) + ring(neck) + ring(head),
    arm: elbow(-1) + elbow(1),
  };
}

/** A second figure, already seated in the other chair on the dock. */
export function Companion({ at }: { at: readonly [number, number] }) {
  const d = drawSeated(true);
  return (
    <g
      className="companion"
      transform={`translate(${at[0].toFixed(1)} ${at[1].toFixed(1)})`}
    >
      <path d={d.arm} className="fig fig-coat" />
      <path d={d.coat} className="fig fig-coat" />
    </g>
  );
}

function FrameArt({ f }: { f: Frame }) {
  const d = drawFrame(f);
  return (
    <>
      <path d={d.far} className="fig fig-far" />
      <path d={d.near} className="fig" />
      <path d={d.coat} className="fig fig-coat" />
      <path d={d.arm} className="fig fig-coat" />
      {d.pole && <path d={d.pole} className="fig-pole" />}
    </>
  );
}

function SeatedArt() {
  const d = drawSeated();
  return (
    <>
      <path d={d.arm} className="fig fig-coat" />
      <path d={d.coat} className="fig fig-coat" />
    </>
  );
}

/**
 * The listed poses are all present in the markup; CSS shows the one named by
 * `data-pose` and the stride frame named by `data-step`, so the scroll engine
 * only flips attributes and never rebuilds SVG.
 */
export function Walker({
  at,
  pose,
  poses: available = [pose],
  scale = 1,
  live = false,
}: {
  at: readonly [number, number];
  pose: Pose;
  poses?: Pose[];
  scale?: number;
  live?: boolean;
}) {
  return (
    <g
      className="walker"
      data-walker={live ? "" : undefined}
      data-pose={pose}
      data-step="0"
      transform={`translate(${at[0].toFixed(1)} ${at[1].toFixed(1)})${scale === 1 ? "" : ` scale(${scale})`}`}
    >
      {available.map((p) => (
        <g key={p} className={`pose pose-${p}`}>
          {p === "sit" ? (
            <g className="frame-a">
              <SeatedArt />
            </g>
          ) : (
            <>
              <g className="frame-a">
                <FrameArt f={poses[p][0]} />
              </g>
              {poses[p][1] !== poses[p][0] && (
                <g className="frame-b">
                  <FrameArt f={poses[p][1]} />
                </g>
              )}
            </>
          )}
        </g>
      ))}
    </g>
  );
}
