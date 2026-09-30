/**
 * PLAN BRIEFING — every word that appears on screen lives in this file.
 *
 * Internal video for Arnaud (operator) and Bill (financial planner): the plan
 * in .orchestration/source/01_MASTER_PLAN.md, and what it takes in time, money
 * and infrastructure. Not for publication.
 *
 * Rules for whoever fills this file (the director's script lane):
 *  - Each line has `en` and `fr`. FR is empty for now and falls back to EN.
 *  - `at: [from, to]` is in seconds from the start of its scene. A `to` equal
 *    to the scene's `dur` means "stays until the scene ends".
 *  - Every line must stay on screen at least 0.3 s per word + 1.5 s
 *    (READING in brand.ts; `npm run qa` checks it).
 *  - No price, fee or figure without a source: amounts go in LEDGER only, as
 *    displayed on a page actually retrieved (or marked snippet-only), with the
 *    URL, retrieval date, currency as displayed and cadence. Unknown stays null.
 *  - No quarantined claims (decisions.md D-053), no superseded offers, and no
 *    photo, voice or likeness of Bill.
 */

export type Lang = 'en' | 'fr';
export const LANG = 'en' as Lang;

export type At = readonly [number, number];
export type Line = {
  readonly en: string;
  readonly fr: string;
  readonly at?: At;
  /** What the slot is for, while it is empty. Never rendered. */
  readonly brief?: string;
};

export const tr = (l: Line, lang: Lang = LANG) => (lang === 'fr' && l.fr.trim() ? l.fr : l.en);

/* ------------------------------------------------------------------ */
/* Render proof (6 s). The only filled copy for now.                   */
/* ------------------------------------------------------------------ */

export const PIPELINE_TEST = {
  dur: 6,
  drawing: { name: 'two-chairs', start: 0.25, dur: 3.0, washDelay: 2.7, washDur: 1.4 },
  kicker: { en: 'Internal briefing · render proof', fr: '', at: [0.3, 6] },
  title: { en: 'The plan, and what it takes.', fr: '', at: [0.5, 6] },
  caption: { en: 'Time, money and infrastructure, for Arnaud and Bill.', fr: '', at: [1.4, 6] },
} as const satisfies {
  dur: number;
  drawing: { name: string; start: number; dur: number; washDelay: number; washDur: number };
  kicker: Line;
  title: Line;
  caption: Line;
};

/* ------------------------------------------------------------------ */
/* The briefing. Outline only: EN slots are empty until the script     */
/* lane writes them; durations are provisional.                        */
/* ------------------------------------------------------------------ */

export type Scene = {
  readonly id: string;
  readonly name: string;
  readonly dur: number;
  readonly drawing?: string; // a name from src/data/ink (e.g. 'path', 'bridge', 'lighthouse')
  readonly title: Line;
  readonly lines: readonly Line[];
  readonly caption?: Line;
};

const slot = (brief: string): Line => ({ en: '', fr: '', brief });

export const SCENES = {
  b00: {
    id: 'B00',
    name: 'Opening',
    dur: 10,
    drawing: 'two-chairs',
    title: slot('What this video is, and who it is for (Arnaud and Bill).'),
    lines: [],
  },
  b01: {
    id: 'B01',
    name: 'Why',
    dur: 20,
    drawing: 'path',
    title: slot('The mission in one sentence (01 §1).'),
    lines: [slot('The two products: Workshop Journey and Retirement Crossroads.'), slot('The frozen offers (01 §1 table), as currently approved.')],
  },
  b02: {
    id: 'B02',
    name: 'Where things stand',
    dur: 20,
    title: slot('What exists today, from inventory/baseline evidence.'),
    lines: [],
  },
  b03: {
    id: 'B03',
    name: 'The system',
    dur: 25,
    drawing: 'bridge',
    title: slot('One site, one small operational store (01 §7 diagram).'),
    lines: [],
  },
  b04: {
    id: 'B04',
    name: 'Build sequence',
    dur: 25,
    title: slot('Waves 0–5 and the Friday pilot gate (01 §6).'),
    lines: [],
  },
  b05: {
    id: 'B05',
    name: 'Time',
    dur: 25,
    title: slot("What it asks of Bill's time and of Arnaud's time."),
    lines: [],
  },
  b06: {
    id: 'B06',
    name: 'Money',
    dur: 30,
    title: slot('What is paid, what is free, what is still unknown. Figures come from LEDGER only.'),
    lines: [],
  },
  b07: {
    id: 'B07',
    name: 'Infrastructure',
    dur: 25,
    drawing: 'house',
    title: slot('Hosting, data, automations, email, meetings, payments, media (01 §2 defaults).'),
    lines: [],
  },
  b08: {
    id: 'B08',
    name: 'Decisions',
    dur: 25,
    drawing: 'lighthouse',
    title: slot('The human gates and what Bill and Arnaud each decide (06).'),
    lines: [],
  },
  b09: {
    id: 'B09',
    name: 'The first 90 days',
    dur: 20,
    drawing: 'sailboat',
    title: slot('The operating loop after launch (01 §17).'),
    lines: [],
  },
  b10: {
    id: 'B10',
    name: 'Close',
    dur: 10,
    title: slot('The next step, plainly.'),
    lines: [],
  },
} satisfies Record<string, Scene>;

export type SceneKey = keyof typeof SCENES;
export const ORDER = Object.keys(SCENES) as SceneKey[];

/* ------------------------------------------------------------------ */
/* Ledger: the only place amounts may appear.                          */
/* Mirrors .orchestration/costs.json (status legend, null = unknown).  */
/* ------------------------------------------------------------------ */

export type LedgerLane = 'time' | 'money' | 'infrastructure';
export type LedgerStatus = 'existing_cost_unknown' | 'not_purchased' | 'not_selected' | 'zero_authorized' | 'measured';
export type Cadence = 'monthly' | 'annual' | 'per-user-month' | 'per-user-year' | 'per-transaction' | 'one-time' | 'hours' | 'usage';
export type LedgerSource = {
  readonly url: string;
  /** ISO date the page was retrieved, e.g. '2026-09-30'. */
  readonly retrieved: string;
  /** 'page' = figure read on the retrieved page; 'snippet-only' = search snippet, unverified; 'blocked' = page not reachable. */
  readonly basis: 'page' | 'snippet-only' | 'blocked';
};
export type LedgerRow = {
  readonly id: string; // the costs.json item id where one exists
  readonly lane: LedgerLane;
  readonly item: Line;
  readonly status: LedgerStatus;
  /** Exactly as displayed on the source page (e.g. what the page shows), or null while unknown. */
  readonly amount: string | null;
  readonly currency: string | null;
  readonly cadence: Cadence | null;
  readonly source: LedgerSource | null;
  readonly gate?: string; // approval gate, e.g. 'G2'
  readonly note?: Line;
};

/** Filled by the costs lane from .orchestration/costs.json and retrieved pages. Empty on purpose. */
export const LEDGER: readonly LedgerRow[] = [];
