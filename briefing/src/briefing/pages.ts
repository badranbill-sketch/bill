/**
 * Pages for long tables (pure data, no JSX: scripts/qa.mjs imports it to check
 * the reading time of rows that leave with their page).
 *
 * A table longer than `perPage` rows, or one whose rows change kind (the
 * LEDGER's "if needed" costs, then per-sale costs and the proposal), is shown
 * as pages. A page stays until the first row of the next page appears; that
 * row was placed by content.ts's scene() only after every earlier row had its
 * reading time, so no row leaves early.
 */
export type Paged<T> = { rows: { row: T; index: number }[]; until: number | null }[];

export const paginate = <T extends { at?: readonly [number, number] }>(rows: readonly T[], perPage: number, kindOf?: (r: T) => string | undefined): Paged<T> => {
  const pages: { row: T; index: number }[][] = [];
  let cur: { row: T; index: number }[] = [];
  rows.forEach((row, index) => {
    const prev = cur[cur.length - 1];
    const kindBreak = !!kindOf && !!prev && kindOf(prev.row) === 'if-needed' && kindOf(row) !== 'if-needed';
    if (cur.length >= perPage || kindBreak) {
      pages.push(cur);
      cur = [];
    }
    cur.push({ row, index });
  });
  if (cur.length) pages.push(cur);
  return pages.map((p, i) => ({ rows: p, until: i < pages.length - 1 ? (pages[i + 1][0].row.at?.[0] ?? null) : null }));
};

/** Rows per page, by scene. */
export const PER_PAGE: Record<string, number> = { B10: 4 };
