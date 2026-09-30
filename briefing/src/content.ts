/**
 * PLAN BRIEFING — every word that appears on screen lives in this file.
 *
 * Internal video for Arnaud (operator) and Bill (financial planner): the plan
 * in .orchestration/source/01_MASTER_PLAN.md, what has been built so far, and
 * what it takes in time, money and infrastructure. Not for publication.
 * Storyboard: SCRIPT.md. Every factual line cites a row of CLAIMS.md (`claim`).
 *
 * Rules for whoever edits this file:
 *  - Each line has `en` and `fr`. FR is empty for now and falls back to EN.
 *  - `at: [from, to]` is in seconds from the start of its scene. A `to` equal
 *    to the scene's `dur` means "stays until the scene ends".
 *  - Scenes are written WITHOUT timings and passed through `scene()` below,
 *    which lays the lines out in the order they are written: each line
 *    appears when the previous one has had its reading time (0.3 s per word
 *    + 1.5 s, READING in brand.ts), stays until the scene ends, and the scene
 *    lasts until the last line has been read, plus a short tail. Edit the
 *    words and the timings follow; `npm run qa` checks the result.
 *  - No price, fee or figure with a currency outside LEDGER: amounts live in
 *    LEDGER only, exactly as recorded in data/published-prices.json (or in a
 *    project file for internal figures), with the URL, retrieval date, basis,
 *    currency as displayed and cadence. Unknown stays null ("to confirm").
 *  - No quarantined claims (decisions.md D-053), no superseded offers (D-049),
 *    no photo, voice or likeness of Bill, no audio.
 *  - Offers exactly as frozen (D-001 to D-005): free PDF guide; free 15-minute
 *    introduction (one question, online or in person); paid printed book
 *    including ONE 30-minute consultation (never 60); continued work only on
 *    mutual fit; no mandatory path.
 *  - Honest status: accepted ≠ live. Nothing is deployed, sent, bought or
 *    published. Friday October 2 is a protected rehearsal unless the gates
 *    are recorded and recordings exist (blockers.md "Pilot status").
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
  /** The CLAIMS.md row that supports this line. Never rendered. */
  readonly claim?: string;
  /** Cue hint, never rendered: appear together with the previous line. Its reading time still counts. */
  readonly withPrev?: boolean;
};

export const tr = (l: Line, lang: Lang = LANG) => (lang === 'fr' && l.fr.trim() ? l.fr : l.en);

/* ------------------------------------------------------------------ */
/* Render proof (6 s).                                                  */
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
/* Reading time and the cue sheet                                       */
/* ------------------------------------------------------------------ */

/** Mirrors READING in brand.ts (qa.mjs reads brand.ts and re-checks every line). */
const PER_WORD = 0.3;
const BASE = 1.5;
/** Seconds before the first line of a scene appears, and after the last line has been read. */
const LEAD_IN = 0.3;
const TAIL = 0.5;
/** Seconds between the items of a row appearing. A row is read as one unit (see Row): the stagger is visual only. */
const ROW_STAGGER = 0.3;

/** Words that count for reading time (anything with a letter or a digit), as in qa.mjs and primitives/time.tsx. */
export const wordCount = (t: string) => t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
/** Minimum time on screen for a text: 0.3 s per word + 1.5 s. */
export const readingNeed = (t: string) => wordCount(t) * PER_WORD + BASE;

/* ------------------------------------------------------------------ */
/* Drawings                                                             */
/* ------------------------------------------------------------------ */

/** The site's drawings, already in src/data/ink. */
export type ExistingDrawing = 'two-chairs' | 'path' | 'sailboat' | 'bridge' | 'lighthouse' | 'house' | 'travel-bag' | 'dock';
/** New drawings from the art lane (not in src/data/ink yet). Each scene names a `fallback` to use until they land. */
export type NewDrawing = 'workshop-notebook' | 'crossroads-signpost' | 'ledger-page' | 'desk-clock' | 'system-map' | 'road-markers';
export type BriefingDrawing = ExistingDrawing | NewDrawing;
export const NEW_DRAWINGS: readonly NewDrawing[] = ['workshop-notebook', 'crossroads-signpost', 'ledger-page', 'desk-clock', 'system-map', 'road-markers'];

export type ArtCue = {
  readonly name: BriefingDrawing;
  /** Where it sits: right/left half, centre, a low band across the frame, a small corner vignette, or the full frame. */
  readonly placement: 'right' | 'left' | 'center' | 'band' | 'corner' | 'full';
  /** Seconds from the scene start when the pen starts. `scene()` fills it from `startWith` when that is given. */
  readonly start?: number;
  /** Seconds the pen takes (pencil, contours, hatching). */
  readonly dur: number;
  /** Seconds after `start` when the washes begin. Default in InkDraw: 85% of `dur`. */
  readonly washDelay?: number;
  /** Start the pen when this line appears, as a path into the scene: 'items.0', 'diagram.hub'. */
  readonly startWith?: string;
  /** Already on screen at the end of the previous scene: show it complete from frame 0, no redraw. */
  readonly hold?: boolean;
  /** InkDraw order: 'objects' draws object by object (the system map, in step with its labels). */
  readonly order?: 'passes' | 'objects';
  /** Existing drawing to use while a NewDrawing is not in src/data/ink yet. */
  readonly fallback?: ExistingDrawing;
};

/* ------------------------------------------------------------------ */
/* Status tags, rows, tables, maps, columns                             */
/* ------------------------------------------------------------------ */

export type Tag =
  | 'accepted'
  | 'in-review'
  | 'fixed'
  | 'must-not-ship'
  | 'quarantined'
  | 'plan-stands'
  | 'not-used'
  | 'exists'
  | 'to-confirm'
  | 'edition-to-confirm'
  | 'to-open'
  | 'not-chosen'
  | 'here'
  | 'next';

/**
 * The words of each status tag, and how it should look:
 * done = navy text with a brass tick; open = muted italic, no tick;
 * stop = navy text in a thin hand-ruled box (never red, never a fill).
 */
export const TAGS: Record<Tag, Line & { readonly tone: 'done' | 'open' | 'stop' }> = {
  accepted: { en: 'accepted', fr: '', tone: 'done' },
  'in-review': { en: 'in final review', fr: '', tone: 'open' },
  fixed: { en: 'fixed', fr: '', tone: 'done' },
  'must-not-ship': { en: 'must not ship', fr: '', tone: 'stop' },
  quarantined: { en: 'quarantined', fr: '', tone: 'stop' },
  'plan-stands': { en: 'plan stands', fr: '', tone: 'done' },
  'not-used': { en: 'not used', fr: '', tone: 'stop' },
  exists: { en: 'exists', fr: '', tone: 'done' },
  'to-confirm': { en: 'to confirm', fr: '', tone: 'open' },
  'edition-to-confirm': { en: 'edition to confirm', fr: '', tone: 'open' },
  'to-open': { en: 'to open', fr: '', tone: 'open' },
  'not-chosen': { en: 'not chosen', fr: '', tone: 'open' },
  here: { en: 'we are here', fr: '', tone: 'done' },
  next: { en: 'next', fr: '', tone: 'open' },
};

/** One entry of a list, table, map or column. Everything nested in it appears with it and counts toward its reading time. */
export type Item = Line & {
  readonly tag?: Tag;
  /** A bold lead shown before or above the text (a product name). */
  readonly heading?: Line;
  /** A short code shown as a small mark before the text: 'G0', 'Wave 1'. */
  readonly label?: Line;
  /** Table column: who owns it. */
  readonly owner?: Line;
};

/** Items read as ONE unit (a row of short markers, a map legend): they appear 0.3 s apart and the row is timed as one line of all its words. */
export type Row<T extends Item = Item> = { readonly kind: 'row'; readonly lead?: Line; readonly items: readonly T[] };

/** Objects drawn in the 'system-map' drawing. Labels are UI text placed next to them, never drawn. */
export type MapObject = 'building' | 'drawer' | 'gear' | 'envelope' | 'calendar' | 'receipt' | 'film' | 'padlock';
export type MapNode = Item & { readonly id: string; readonly object: MapObject };
export type Diagram = {
  readonly kind: 'diagram';
  /** The ways in, across the top, ending at the destination. */
  readonly paths: Line;
  /** The site: the building at the centre. */
  readonly hub: MapNode;
  /** The services behind it, one label per object. */
  readonly nodes: Row<MapNode>;
};

export type Table = { readonly kind: 'table'; readonly header?: Line; readonly rows: readonly Item[]; readonly footer?: Line };

export type Column = { readonly kind: 'column'; readonly heading: Line; readonly items: readonly Item[] };

/** A block of LEDGER rows shown in a scene, in this order. `at` is filled by `scene()`. */
export type LedgerCue = { readonly id: string; readonly at?: At };
export type LedgerBlock = { readonly kind: 'ledger'; readonly lead?: Line; readonly rows: readonly LedgerCue[]; readonly footer?: Line };

export type Layout =
  | 'title' // kicker, title and caption beside one drawing
  | 'statement' // title and a few lines beside one drawing
  | 'pair' // title, a line, then two items each with its own drawing
  | 'list' // title and tagged items beside one drawing
  | 'diagram' // the system map with labels
  | 'table' // rows with status and owner columns
  | 'ledger' // LEDGER rows, hand-ruled
  | 'columns' // two or three side-by-side columns
  | 'road' // the road-markers drawing with a row of wave markers
  | 'close'; // the brand line

export type Scene = {
  readonly id: string;
  readonly name: string;
  readonly dur: number;
  /** The main drawing (see `art` for all cues). */
  readonly drawing?: BriefingDrawing;
  readonly layout?: Layout;
  readonly art?: readonly ArtCue[];
  readonly kicker?: Line;
  readonly title: Line;
  readonly lines: readonly Line[];
  readonly items?: readonly Item[];
  readonly row?: Row;
  readonly diagram?: Diagram;
  readonly table?: Table;
  readonly ledger?: LedgerBlock;
  readonly columns?: readonly Column[];
  readonly callout?: Line;
  readonly caption?: Line;
};

/* ------------------------------------------------------------------ */
/* Ledger: the only place amounts may appear.                          */
/* Mirrors .orchestration/costs.json (status legend, null = unknown)   */
/* and data/published-prices.json (list prices, retrieved 2026-09-30). */
/* ------------------------------------------------------------------ */

export type LedgerLane = 'time' | 'money' | 'infrastructure';
export type LedgerStatus = 'existing_cost_unknown' | 'not_purchased' | 'not_selected' | 'zero_authorized' | 'measured';
export type Cadence = 'monthly' | 'annual' | 'per-user-month' | 'per-user-year' | 'per-transaction' | 'one-time' | 'hours' | 'usage';
export type LedgerSource = {
  readonly url: string;
  /** ISO date the page was retrieved (or the project file read), e.g. '2026-09-30'. */
  readonly retrieved: string;
  /**
   * 'page' = figure read on the retrieved page;
   * 'vendor-source' = read from the vendor's own public source file that feeds its pricing page (published-prices.json method "fetched");
   * 'snippet-only' = search-result summary, unverified (method "snippet-only"): always shown with UNVERIFIED;
   * 'internal' = a figure from a project file (the plan, costs.json), cited at a pushed commit;
   * 'blocked' = page not reachable (cannot supply an amount).
   */
  readonly basis: 'page' | 'snippet-only' | 'blocked' | 'vendor-source' | 'internal';
  /** Where the figure is recorded: 'data/published-prices.json#<item id>' or '<file>:<line>'. */
  readonly ref?: string;
  /** vendor-source only: the file actually fetched. */
  readonly dataUrl?: string;
};
export type LedgerRow = {
  readonly id: string; // the costs.json item id where one exists
  readonly lane: LedgerLane;
  readonly item: Line;
  readonly status: LedgerStatus;
  /** Exactly as recorded (published-prices.json `price`), or null while unknown. */
  readonly amount: string | null;
  readonly currency: string | null;
  readonly cadence: Cadence | null;
  readonly source: LedgerSource | null;
  readonly gate?: string; // approval gate, e.g. 'G2'
  readonly note?: Line;
  /** What the row is, for layout: a conditional later cost, a per-sale cost, an unauthorized proposal, an existing cost. */
  readonly kind?: 'if-needed' | 'per-sale' | 'proposal' | 'existing' | 'reference';
  /** When it would become necessary. */
  readonly trigger?: Line;
  /** The amount text shown on screen, composed only from the record (amount, currency and unit as displayed). */
  readonly shown?: Line;
  /** The record's unit wording, verbatim (published-prices.json `unit`). */
  readonly unitAsRecorded?: string;
  /** An example of a kind of service, not a selection: always shown with EXAMPLE. */
  readonly example?: boolean;
  /** .orchestration/costs.json item this row belongs to. */
  readonly costsId?: string;
};

/** Shown beside every snippet-only amount. */
export const UNVERIFIED: Line = { en: 'unverified — confirm at checkout', fr: '' };
/** Shown beside every example row. */
export const EXAMPLE: Line = { en: 'example only', fr: '' };
/** Source cell of a row whose figure comes from a project file (basis 'internal'); wording from SCRIPT.md §1.2. */
export const INTERNAL_SOURCE: Line = { en: 'project plan, internal', fr: '' };

const PRICES = 'data/published-prices.json#';
const RETRIEVED = '2026-09-30';
/** A pushed commit of the orchestration record (origin/claude/orchestration-foundation), for internal figures. */
const PLAN_AT = 'https://github.com/arnaudverdier8-svg/bill/blob/d1a37cf3c17953529774e7801af8f0c16eedb925/.orchestration/';

export const LEDGER: readonly LedgerRow[] = [
  /* Later, only if a trigger is reached (list prices; nothing bought). */
  {
    id: 'workspace_business_standard',
    costsId: 'workspace_business_standard_candidate',
    lane: 'money',
    kind: 'if-needed',
    item: { en: 'Google Workspace Business Standard', fr: '' },
    trigger: { en: 'if Meet must record or host 150', fr: '' },
    status: 'not_purchased',
    amount: '14.00 (annual commitment) / 16.80 (Flexible)',
    currency: 'USD',
    cadence: 'per-user-month',
    unitAsRecorded: 'per user per month',
    shown: { en: 'USD 14.00 annual / 16.80 flexible, per user per month', fr: '' },
    source: { url: 'https://workspace.google.com/pricing', retrieved: RETRIEVED, basis: 'snippet-only', ref: `${PRICES}gws-standard-usd` },
    gate: 'G2',
    note: { en: 'Some Google pages show USD for Canada. Regional checkout is the price that counts.', fr: '' },
  },
  {
    id: 'supabase_pro',
    costsId: 'supabase_paid_tier',
    lane: 'money',
    kind: 'if-needed',
    item: { en: 'Supabase Pro', fr: '' },
    trigger: { en: 'if free limits or backups fall short', fr: '' },
    status: 'not_purchased',
    amount: 'From 25',
    currency: '$ (Supabase bills in USD; the source file shows only $)',
    cadence: 'monthly',
    unitAsRecorded: 'per month (organization), includes one project on Micro compute',
    shown: { en: 'From $25 per month + usage (USD)', fr: '' },
    source: {
      url: 'https://supabase.com/pricing',
      retrieved: RETRIEVED,
      basis: 'vendor-source',
      ref: `${PRICES}supabase-pro`,
      dataUrl: 'https://raw.githubusercontent.com/supabase/supabase/master/packages/shared-data/plans.ts',
    },
    gate: 'G2',
  },
  {
    id: 'brevo_starter',
    costsId: 'brevo_upgrade',
    lane: 'money',
    kind: 'if-needed',
    item: { en: 'Brevo Starter', fr: '' },
    trigger: { en: 'if daily email nears the free 300', fr: '' },
    status: 'not_purchased',
    amount: 'From 9 (5,000 emails/month tier)',
    currency: 'USD',
    cadence: 'monthly',
    unitAsRecorded: 'per month',
    shown: { en: 'From USD 9 per month', fr: '' },
    source: { url: 'https://www.brevo.com/pricing/', retrieved: RETRIEVED, basis: 'snippet-only', ref: `${PRICES}brevo-starter` },
    gate: 'G2',
  },
  {
    id: 'backup_example_b2',
    costsId: 'offhost_backup',
    lane: 'money',
    kind: 'if-needed',
    example: true,
    item: { en: 'Backups: Backblaze B2', fr: '' },
    trigger: { en: 'if no owner storage exists', fr: '' },
    status: 'not_selected',
    amount: '6.95',
    currency: 'USD',
    cadence: 'usage',
    unitAsRecorded: 'per TB per 30 days',
    shown: { en: 'USD 6.95 per TB per 30 days', fr: '' },
    source: { url: 'https://www.backblaze.com/cloud-storage/pricing', retrieved: RETRIEVED, basis: 'snippet-only', ref: `${PRICES}example-backup-b2` },
    gate: 'G2',
  },
  {
    id: 'backup_example_hetzner',
    costsId: 'offhost_backup',
    lane: 'money',
    kind: 'if-needed',
    example: true,
    item: { en: 'Backups: Hetzner Storage Box (1 TB)', fr: '' },
    status: 'not_selected',
    amount: '3.20 (excl. VAT); about 4.00 incl. VAT',
    currency: 'EUR',
    cadence: 'monthly',
    unitAsRecorded: 'per month',
    shown: { en: 'EUR 3.20 per month, excl. VAT', fr: '' },
    source: { url: 'https://www.hetzner.com/storage/storage-box/bx11/', retrieved: RETRIEVED, basis: 'snippet-only', ref: `${PRICES}example-backup-hetzner` },
    gate: 'G2',
    note: { en: 'Stored in the EU: a point for the privacy review.', fr: '' },
  },

  /* Per sale, and one proposal. */
  {
    id: 'stripe_fee_ca',
    costsId: 'stripe_fees',
    lane: 'money',
    kind: 'per-sale',
    item: { en: 'Stripe fee per book (Canadian card)', fr: '' },
    status: 'not_purchased',
    amount: '2.9% + 0.30',
    currency: 'CAD',
    cadence: 'per-transaction',
    unitAsRecorded: 'per successful card charge',
    shown: { en: '2.9% + CA$0.30 per successful card charge', fr: '' },
    source: { url: 'https://stripe.com/en-ca/pricing', retrieved: RETRIEVED, basis: 'snippet-only', ref: `${PRICES}stripe-ca-domestic` },
    gate: 'G2',
    note: { en: 'International cards and currency conversion cost more.', fr: '' },
  },
  {
    id: 'book_printing_shipping',
    costsId: 'book_printing',
    lane: 'money',
    kind: 'per-sale',
    item: { en: 'Printing and shipping per book', fr: '' },
    status: 'not_purchased',
    amount: null,
    currency: null,
    cadence: null,
    source: null,
    gate: 'G0',
    shown: { en: 'quote needed (HB-20)', fr: '' },
  },
  {
    id: 'ads_test_proposal',
    costsId: 'ads_meta',
    lane: 'money',
    kind: 'proposal',
    item: { en: 'Ad test: proposed, not authorized', fr: '' },
    status: 'zero_authorized',
    amount: '20/day × 14 days = 280',
    currency: 'CAD',
    cadence: 'one-time',
    unitAsRecorded: 'a 14-day test at 20 a day (costs.json proposals.ads_test: daily 20, days 14, arithmetic_total 280)',
    shown: { en: 'CAD 20 a day × 14 days = CAD 280', fr: '' },
    source: { url: `${PLAN_AT}source/01_MASTER_PLAN.md#L397`, retrieved: RETRIEVED, basis: 'internal', ref: '.orchestration/source/01_MASTER_PLAN.md:397; .orchestration/costs.json proposals.ads_test' },
    gate: 'G2 cap and G6 scope',
    note: { en: 'The ads limit stays at zero.', fr: '' },
  },

  /* Existing costs whose amounts are still to confirm: HB-08 (b) asks for them; the build assistant comes from Arnaud's own invoice (costs.json). Named on screen, no amounts. */
  ...(
    [
      ['vps_increment', 'Existing server (VPS)'],
      ['domain_dns_existing', 'Domain billbadran.com'],
      ['current_mail_provider_existing', 'Current mailbox'],
      ['calendly_existing', 'Calendly'],
      ['google_account_existing', "Bill's Google account"],
      ['github_existing', 'GitHub'],
      ['build_assistant_existing', "Arnaud's build-assistant subscription"],
    ] as const
  ).map(
    ([id, en]): LedgerRow => ({
      id,
      costsId: id,
      lane: 'money',
      kind: 'existing',
      item: { en, fr: '' },
      status: 'existing_cost_unknown',
      amount: null,
      currency: null,
      cadence: null,
      source: null,
      shown: { en: 'to confirm', fr: '' },
    }),
  ),
];

const ledgerRow = (id: string) => {
  const r = LEDGER.find((x) => x.id === id);
  if (!r) throw new Error(`LEDGER has no row ${id}`);
  return r;
};

/** Every word a LEDGER row puts on screen (item, trigger, amount, markers), for its reading time. */
export const ledgerText = (r: LedgerRow) =>
  [
    r.item.en,
    r.trigger?.en,
    r.shown?.en ?? r.amount ?? 'to confirm',
    r.source?.basis === 'snippet-only' ? UNVERIFIED.en : '',
    r.example ? EXAMPLE.en : '',
  ]
    .filter(Boolean)
    .join(' ');

/* ------------------------------------------------------------------ */
/* The cue sheet: lays out a scene's lines in the order written.        */
/* ------------------------------------------------------------------ */

type Draft = Omit<Scene, 'dur'>;
type Obj = Record<string, unknown>;
const isLine = (n: unknown): n is Line => !!n && typeof n === 'object' && 'en' in (n as Obj) && 'fr' in (n as Obj);

/** All words an item puts on screen: its text, heading, label, owner and tag. */
export const itemText = (l: Item) => [l.label?.en, l.heading?.en, l.en, l.owner?.en, l.tag ? TAGS[l.tag].en : ''].filter(Boolean).join(' ');

const r2 = (n: number) => Math.round(n * 100) / 100;

function scene(draft: Draft): Scene {
  let cursor = LEAD_IN; // when the next line may appear
  let prevFrom = LEAD_IN;
  const placed: { node: Obj }[] = [];
  const starts = new Map<string, number>();

  const put = (node: Obj, path: string, from: number, need: number) => {
    node.at = [r2(from), 0];
    placed.push({ node });
    starts.set(path, r2(from));
    prevFrom = from;
    cursor = Math.max(cursor, from + need);
  };
  const seq = (l: Line, path: string): Obj => {
    const node: Obj = { ...l };
    const need = readingNeed(itemText(l as Item));
    const from = l.withPrev ? prevFrom : cursor;
    // withPrev: appear with the previous line, but the reader still needs this line's time after the previous one.
    if (l.withPrev) {
      const before = cursor;
      put(node, path, from, 0);
      cursor = before + need;
    } else put(node, path, from, need);
    return node;
  };
  const row = (r: Row, path: string): Obj => {
    const from = cursor;
    const out: Obj = { ...r };
    const words = (r.lead ? wordCount(r.lead.en) : 0) + r.items.reduce((n, it) => n + wordCount(itemText(it)), 0);
    const need = words * PER_WORD + BASE;
    if (r.lead) {
      const lead: Obj = { ...r.lead };
      put(lead, `${path}.lead`, from, 0);
      out.lead = lead;
    }
    out.items = r.items.map((it, i) => {
      const n: Obj = { ...it };
      put(n, `${path}.items.${i}`, from + (r.lead ? i + 1 : i) * ROW_STAGGER, 0);
      return n;
    });
    cursor = from + need;
    return out;
  };
  const walk = (key: string, v: unknown): unknown => {
    if (v === undefined || v === null) return v;
    if (Array.isArray(v)) return v.map((x, i) => walk(`${key}.${i}`, x));
    if (isLine(v)) return seq(v, key);
    if (typeof v !== 'object') return v;
    const o = v as Obj;
    if (o.kind === 'row') return row(o as unknown as Row, key);
    if (o.kind === 'column') {
      // The heading is a one-word label: it appears with the first item and adds its words, not a full line.
      const c = o as unknown as Column;
      const heading: Obj = { ...c.heading };
      const from = cursor;
      put(heading, `${key}.heading`, from, 0);
      cursor = from + wordCount(c.heading.en) * PER_WORD;
      const items = c.items.map((it, i) => walk(`${key}.items.${i}`, { ...it, withPrev: i === 0 ? true : it.withPrev }));
      return { ...c, heading, items };
    }
    if (o.kind === 'table' && (o as unknown as Table).header) {
      // The header names the columns (a glance label): it appears with the first row and adds its words.
      const tb = o as unknown as Table;
      const header: Obj = { ...tb.header };
      const from = cursor;
      put(header, `${key}.header`, from, 0);
      cursor = from + wordCount(tb.header!.en) * PER_WORD;
      const rows = tb.rows.map((r, i) => walk(`${key}.rows.${i}`, { ...r, withPrev: i === 0 ? true : r.withPrev }));
      const footer = tb.footer ? walk(`${key}.footer`, tb.footer) : undefined;
      return { ...tb, header, rows, ...(footer ? { footer } : {}) };
    }
    if (o.kind === 'ledger') {
      const b = o as unknown as LedgerBlock;
      const lead = b.lead ? walk(`${key}.lead`, b.lead) : undefined;
      const rows = b.rows.map((cue, i) => {
        const n: Obj = { ...cue };
        put(n, `${key}.rows.${i}`, cursor, readingNeed(ledgerText(ledgerRow(cue.id))));
        return n;
      });
      const footer = b.footer ? walk(`${key}.footer`, b.footer) : undefined;
      return { ...b, ...(lead ? { lead } : {}), rows, ...(footer ? { footer } : {}) };
    }
    const out: Obj = {};
    for (const [k, x] of Object.entries(o)) out[k] = walk(`${key}.${k}`, x);
    return out;
  };

  const out: Obj = {};
  for (const [k, v] of Object.entries(draft)) {
    if (k === 'art' || k === 'id' || k === 'name' || k === 'drawing' || k === 'layout') out[k] = v;
    else if (k === 'kicker' && isLine(v)) {
      // The kicker is a small label above the title: it appears with the title and adds its words, not a full line.
      const node: Obj = { ...v };
      put(node, 'kicker', cursor, 0);
      cursor += wordCount(v.en) * PER_WORD;
      out[k] = node;
    } else out[k] = walk(k, v);
  }
  const dur = Math.ceil((cursor + TAIL) * 10) / 10;
  for (const { node } of placed) node.at = [(node.at as number[])[0], dur];
  out.art = (draft.art ?? []).map((a) => ({ ...a, start: a.startWith ? (starts.get(a.startWith) ?? 0) : (a.start ?? 0.2) }));
  out.dur = dur;
  return out as unknown as Scene;
}

/* ------------------------------------------------------------------ */
/* The briefing                                                          */
/* ------------------------------------------------------------------ */

const t = (en: string, claim?: string, extra: Partial<Item> = {}): Item => ({ en, fr: '', ...(claim ? { claim } : {}), ...extra });

export const SCENES = {
  s01: scene({
    id: 'B01',
    name: 'Opening',
    drawing: 'two-chairs',
    layout: 'title',
    art: [{ name: 'two-chairs', placement: 'right', start: 0.3, dur: 3.2, washDelay: 2.9 }],
    kicker: t('Internal briefing · 30 September 2026', 'C01-1'),
    title: t('The plan, what is built, and what it takes.', undefined, { withPrev: true }),
    lines: [],
    caption: t('For Arnaud and Bill. Not for publication.', 'C01-2'),
  }),

  s02: scene({
    id: 'B02',
    name: 'Why',
    drawing: 'workshop-notebook',
    layout: 'pair',
    art: [
      { name: 'workshop-notebook', placement: 'left', start: 0.4, dur: 3.0, fallback: 'path' },
      { name: 'crossroads-signpost', placement: 'right', start: 2.4, dur: 3.0, fallback: 'bridge' },
    ],
    kicker: t('Why'),
    title: t("The goal isn't to reach retirement. It's to live it.", 'C02-1', { withPrev: true }),
    lines: [t("The system's job: held, relevant retirement conversations with Bill; client relationships where the fit is mutual.", 'C02-2')],
    items: [
      t('A four-part exercise at your own pace: Bill on video beside an interactive tool.', 'C02-3', { heading: t('Workshop Journey') }),
      t('A live game show Bill hosts: ten fictional cases, A/B/C/D answers, explanations.', 'C02-4', { heading: t('Retirement Crossroads Challenge') }),
    ],
  }),

  s03: scene({
    id: 'B03',
    name: 'The offers',
    drawing: 'dock',
    layout: 'list',
    art: [{ name: 'dock', placement: 'band', start: 0.3, dur: 4.5 }],
    kicker: t('The offers'),
    title: t('Four fixed offers. No required path to Bill.', 'C03-1', { withPrev: true }),
    lines: [],
    items: [
      t('Free PDF guide.', 'C03-2'),
      t('Free 15-minute introduction with Bill: one question, online or in person.', 'C03-3'),
      t('Paid printed book, including one 30-minute consultation. Price not set yet.', 'C03-4'),
      t('Continued work only if the fit is mutual.', 'C03-5'),
    ],
  }),

  s04: scene({
    id: 'B04',
    name: 'Built so far',
    drawing: 'house',
    layout: 'list',
    art: [{ name: 'house', placement: 'right', start: 0.3, dur: 3.0 }],
    kicker: t('Built so far'),
    title: t('First, the foundation. Nothing is live yet.', 'C04-1', { withPrev: true }),
    lines: [],
    items: [
      t('Inventory: 6 branches, every asset, a 171-line gap list.', 'C04-2', { tag: 'accepted' }),
      t('74 decisions recorded; 29 questions in one batch.', 'C04-3', { tag: 'accepted' }),
      t('15 versioned rules for data, workshop maths, offers and approvals.', 'C04-4', { tag: 'accepted' }),
      t('A combined code base that builds and passes 41 browser tests.', 'C04-5', { tag: 'accepted' }),
      t('Four extra test cases for the workshop maths.', 'C04-6', { tag: 'accepted' }),
    ],
    caption: t('Each step checked by an independent verifier that did none of the work.', 'C04-7'),
    callout: t("Why first: so parallel work can't drift, leak anyone's numbers, or promise what Bill hasn't approved.", 'C04-8'),
  }),

  s05: scene({
    id: 'B05',
    name: 'What we found',
    drawing: 'lighthouse',
    layout: 'list',
    art: [{ name: 'lighthouse', placement: 'right', start: 0.3, dur: 3.0 }],
    kicker: t('What we found'),
    title: t('Facts, not blame.', undefined, { withPrev: true }),
    lines: [],
    items: [
      t('The main branch did not build (a video folder, film/); the combined base does.', 'C05-1', { tag: 'fixed' }),
      t("Site narration: a clone of someone else's voice, speaking as Bill.", 'C05-2', { tag: 'must-not-ship' }),
      t('Film material: an invented client story, unsupported titles.', 'C05-3', { tag: 'quarantined' }),
      t("The code assumes other services (Resend, Upstash, Vercel); the only n8n (automation tool) we can reach is someone else's Cloud project.", 'C05-4', { tag: 'plan-stands' }),
    ],
  }),

  s06: scene({
    id: 'B06',
    name: 'The system',
    drawing: 'system-map',
    layout: 'diagram',
    art: [{ name: 'system-map', placement: 'full', start: 0.6, dur: 9.0, order: 'objects' }],
    kicker: t('The plan'),
    title: t('The system in one picture', undefined, { withPrev: true }),
    lines: [],
    diagram: {
      kind: 'diagram',
      paths: t("Guide · Workshop Journey · Crossroads · Book → Bill's 15-minute conversation", 'C06-1'),
      hub: { ...t("Bill's website, on the existing server", 'C06-2'), id: 'site', object: 'building' },
      nodes: {
        kind: 'row',
        items: [
          { ...t('Records: Supabase', 'C06-3'), id: 'records', object: 'drawer' },
          { ...t('Automation: n8n', 'C06-3'), id: 'automation', object: 'gear' },
          { ...t('Email: Brevo', 'C06-3'), id: 'email', object: 'envelope' },
          { ...t('Calendar: Google; Calendly for now', 'C06-4'), id: 'calendar', object: 'calendar' },
          { ...t('Payments: Stripe', 'C06-3'), id: 'payments', object: 'receipt' },
          { ...t("Bill's recordings", 'C06-5'), id: 'recordings', object: 'film' },
          { ...t('Backups, kept off the server', 'C06-6'), id: 'backups', object: 'padlock' },
        ],
      },
    },
    caption: t("Numbers typed into the workshop never leave the visitor's browser. No AI talks to visitors.", 'C06-7'),
  }),

  s07: scene({
    id: 'B07',
    name: 'How it gets built',
    drawing: 'bridge',
    layout: 'statement',
    art: [{ name: 'bridge', placement: 'right', start: 0.3, dur: 3.0 }],
    kicker: t('How we build'),
    title: t('A small supervised team builds it. People switch it on.', 'C07-1', { withPrev: true }),
    lines: [
      t("Building: one AI director and at most three AI specialists ('agents') at once, the verifier included.", 'C07-2'),
      t('Once live: tested automations send reminders and receipts; no agent decides for a client.', 'C07-3'),
    ],
    row: {
      kind: 'row',
      lead: t('Seven approvals, none recorded yet:', 'C07-4'),
      items: [
        t('basic choices', 'C07-5', { label: t('G0') }),
        t('credentials, offers', 'C07-5', { label: t('G1') }),
        t('accounts, spending limits', 'C07-5', { label: t('G2') }),
        t('exact versions', 'C07-5', { label: t('G3') }),
        t('recordings, rights', 'C07-5', { label: t('G4') }),
        t('personal data', 'C07-5', { label: t('G5') }),
        t('switch-on', 'C07-5', { label: t('G6') }),
      ],
    },
  }),

  s08: scene({
    id: 'B08',
    name: 'Infrastructure',
    drawing: 'travel-bag',
    layout: 'table',
    art: [{ name: 'travel-bag', placement: 'corner', start: 0.3, dur: 2.6 }],
    kicker: t('Infrastructure'),
    title: t("Proven pieces, in the owners' own names.", 'C08-1', { withPrev: true }),
    lines: [],
    table: {
      kind: 'table',
      header: t('Status · Owner'),
      rows: [
        t('Existing server (VPS): site, n8n, nightly encrypted off-server backups', 'C08-2', { tag: 'to-confirm', owner: t('Arnaud') }),
        t('Supabase Free: small database', 'C08-3', { tag: 'to-open', owner: t('Bill or firm (proposed)') }),
        t('Brevo Free: email; one domain record, current mail untouched', 'C08-4', { tag: 'to-open', owner: t('Bill or firm (proposed)') }),
        t('Google account for Meet and Calendar; Calendly kept for the pilot', 'C08-5', { tag: 'edition-to-confirm', owner: t('Bill') }),
        t('Stripe hosted checkout, test mode first', 'C08-6', { tag: 'to-open', owner: t('Bill or firm (proposed)') }),
        t('Video host, after a bandwidth estimate', 'C08-7', { tag: 'not-chosen', owner: t('Arnaud') }),
        t('GitHub: reviewed versions', 'C08-8', { tag: 'exists', owner: t('Arnaud') }),
      ],
      footer: t('Not used: Zoom, n8n Cloud, Vercel Hobby, a custom video platform, a new CRM.', 'C08-9'),
    },
  }),

  s09: scene({
    id: 'B09',
    name: 'Money today',
    drawing: 'ledger-page',
    layout: 'statement',
    art: [{ name: 'ledger-page', placement: 'right', start: 0.3, dur: 3.0 }],
    kicker: t('Money'),
    title: t('Today: nothing bought or spent; spending limits at zero until Arnaud sets them.', 'C09-1', { withPrev: true }),
    lines: [
      t("New subscriptions for the pilot: none, if the existing server and Bill's Google account suffice.", 'C09-2'),
      t('Existing costs to confirm: server, domain, mailbox, Calendly, Google, GitHub, build assistant.', 'C09-3'),
    ],
  }),

  s10: scene({
    id: 'B10',
    name: 'Money later',
    drawing: 'ledger-page',
    layout: 'ledger',
    art: [{ name: 'ledger-page', placement: 'corner', hold: true, start: 0, dur: 0 }],
    title: t('Money later, only if needed.', 'C10-1'),
    lines: [],
    ledger: {
      kind: 'ledger',
      lead: t('Published list prices, not quotes. Taxes extra.', 'C10-2'),
      rows: [
        { id: 'workspace_business_standard' },
        { id: 'supabase_pro' },
        { id: 'brevo_starter' },
        { id: 'backup_example_b2' },
        { id: 'stripe_fee_ca' },
        { id: 'book_printing_shipping' },
        { id: 'ads_test_proposal' },
      ],
    },
  }),

  s11: scene({
    id: 'B11',
    name: 'Time',
    drawing: 'desk-clock',
    layout: 'columns',
    art: [{ name: 'desk-clock', placement: 'corner', start: 0.3, dur: 2.8 }],
    kicker: t('Time'),
    title: t('What it asks of each person', undefined, { withPrev: true }),
    lines: [],
    columns: [
      {
        kind: 'column',
        heading: t('Bill'),
        items: [
          t('10 questions, once; a 20-minute recorded voice interview.', 'C11-1'),
          t('Recording: 22 to 35 minutes of finished video, not studio time.', 'C11-2'),
          t('Meetings, proposed: six 15-minute and two 30-minute weekly, buffers included: 3 h 50 min. Bill confirms.', 'C11-3'),
          t('Crossroads: 60 minutes, proposed monthly, plus rehearsal. A weekly voice note; reviewing drafts.', 'C11-4'),
        ],
      },
      {
        kind: 'column',
        heading: t('Arnaud'),
        items: [
          t('13 questions in one sitting; owners open accounts in their own names.', 'C11-5'),
          t('Operating: daily booking check, event moderation, weekly review.', 'C11-6'),
        ],
      },
      {
        kind: 'column',
        heading: t('Reviewer, privacy owner'),
        items: [t('Approves exact versions; 6 questions.', 'C11-7')],
      },
    ],
  }),

  s12: scene({
    id: 'B12',
    name: 'Timeline',
    drawing: 'road-markers',
    layout: 'road',
    art: [{ name: 'road-markers', placement: 'band', start: 0.3, dur: 4.0, fallback: 'path' }],
    kicker: t('Timeline'),
    title: t('Where we are: finishing wave 0.', 'C12-1', { withPrev: true }),
    lines: [],
    row: {
      kind: 'row',
      items: [
        t('Inspect, freeze the rules', 'C12-2', { label: t('Wave 0'), tag: 'here' }),
        t('First workshop screen, local setup', 'C12-2', { label: t('Wave 1'), tag: 'next' }),
        t('Build every path', 'C12-2', { label: t('Wave 2') }),
        t('Recordings, reviews, provider tests', 'C12-2', { label: t('Wave 3') }),
        t('Friday pilot gate', 'C12-2', { label: t('Wave 4') }),
        t('All content, then 90 days', 'C12-2', { label: t('Wave 5') }),
      ],
    },
    callout: t('Friday 2 October: on current evidence, a clearly labelled protected rehearsal, unless gates are recorded and recordings exist.', 'C12-3'),
    caption: t('Then 90 days: an article and two videos a week, Crossroads monthly if justified, one change at a time. Success: meetings held.', 'C12-4'),
  }),

  s13: scene({
    id: 'B13',
    name: 'What we need from you',
    drawing: 'two-chairs',
    layout: 'columns',
    art: [{ name: 'two-chairs', placement: 'corner', start: 0.3, dur: 3.0 }],
    kicker: t('Your part'),
    title: t('One sitting each. "Don\'t know yet" is fine.', 'C13-1', { withPrev: true }),
    lines: [],
    columns: [
      {
        kind: 'column',
        heading: t('Arnaud'),
        items: [
          t('Host choice, server facts and access (HB-01, HB-02)', 'C13-2'),
          t('Which code version is official; domain and mail (HB-03, HB-05)', 'C13-2'),
          t('Who opens each test account; password manager; operator (HB-06, HB-07, HB-10)', 'C13-2'),
          t('Spending limits, proposed at zero; test recipients (HB-08, HB-09)', 'C13-2'),
        ],
      },
      {
        kind: 'column',
        heading: t('Bill'),
        items: [
          t('Google account, Calendly, weekly slots (HB-14 to HB-16)', 'C13-3'),
          t('First Crossroads, interview and recording dates (HB-17, HB-19)', 'C13-3'),
          t('Book price and terms (HB-20)', 'C13-3'),
          t('Professional details, firm reviewer, photo and voice rights (HB-21, HB-22)', 'C13-3'),
        ],
      },
    ],
    caption: t('Secrets never go in chat: each has its named place. Full list: .orchestration/blockers.md', 'C13-4'),
  }),

  s14: scene({
    id: 'B14',
    name: 'Close',
    drawing: 'sailboat',
    layout: 'close',
    art: [{ name: 'sailboat', placement: 'center', start: 0.2, dur: 3.0 }],
    title: t('Build a Better Retirement Together', 'C14-1'),
    lines: [t('Next: one sitting each for the questions. Local work continues; nothing goes live without recorded approval.', 'C14-2')],
  }),
} satisfies Record<string, Scene>;

export type SceneKey = keyof typeof SCENES;
export const ORDER = Object.keys(SCENES) as SceneKey[];
export const TOTAL_SECONDS = ORDER.reduce((s, k) => s + SCENES[k].dur, 0);
