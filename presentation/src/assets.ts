/**
 * Art that arrives with the asset pack. While a slot is null, the film uses a
 * quiet stand-in (see primitives/objects.tsx). Paths are relative to public/.
 */
export const ASSETS: {
  cover: string | null; // the approved illustrated cover (portrait)
  mark: string | null; // BB-sunrise mark
  lockup: string | null; // full logo: mark + name
  qr: string | null; // QR for /guide/book, only once the page is live and tested
} = {
  cover: null,
  mark: null,
  lockup: null,
  qr: null,
};

/** The guide's drawings used as text-free plates in the book flip (S09). */
export const PLATES: { src: string; ratio: number }[] = [
  { src: 'plates/cover-art.svg', ratio: 816 / 604 },
  { src: 'plates/porch.svg', ratio: 816 / 1056 },
  { src: 'plates/storm.svg', ratio: 816 / 630 },
  { src: 'plates/horizons.svg', ratio: 816 / 1056 },
  { src: 'plates/harbour.svg', ratio: 816 / 400 },
];
