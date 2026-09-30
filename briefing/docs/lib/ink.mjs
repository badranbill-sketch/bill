/**
 * The site's pen-and-ink drawings (public/ink/*.svg) as static, inline editorial illustrations.
 *
 * Each call returns the drawing's own SVG, unmodified except for:
 *  - width/height attributes removed (CSS sizes it; the viewBox keeps the aspect ratio),
 *  - ids made unique per instance (every drawing defines the same `ink-wash` filter id),
 *  - a `data-crop` attribute read by the page script (theme/page.js) before printing:
 *      "ink"  (default) crop the viewBox to the drawing's ink with a small margin,
 *      "full" keep the drawing's own viewBox (the 1440×810 frame drawings keep their empty left side),
 *      "x,y,w,h" an explicit viewBox in the drawing's own units.
 * Nothing is redrawn, recoloured or animated. See ../../ASSETS.md for provenance.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const INK_DIR = path.resolve(HERE, '../../public/ink');

export function listInk() {
  return fs
    .readdirSync(INK_DIR)
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.replace(/\.svg$/, ''))
    .sort();
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

let instance = 0;

/**
 * @param {string} name   drawing name, e.g. "crossroads-signpost"
 * @param {{crop?: string, label?: string, cls?: string, align?: string}} [opts]  align = SVG preserveAspectRatio
 */
export function inkSvg(name, opts = {}) {
  const file = path.join(INK_DIR, `${name}.svg`);
  if (!fs.existsSync(file)) {
    throw new Error(`Unknown drawing "${name}". Available: ${listInk().join(', ')}`);
  }
  const crop = opts.crop ?? 'ink';
  if (!/^(ink|full|-?[\d.]+,-?[\d.]+,[\d.]+,[\d.]+)$/.test(crop)) {
    throw new Error(`Drawing "${name}": crop must be ink, full or x,y,w,h (got "${crop}")`);
  }
  let svg = fs.readFileSync(file, 'utf8').trim();
  const n = ++instance;
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  for (const id of new Set(ids)) {
    const nid = `${id}-i${n}`;
    svg = svg
      .replaceAll(`id="${id}"`, `id="${nid}"`)
      .replaceAll(`url(#${id})`, `url(#${nid})`)
      .replaceAll(`href="#${id}"`, `href="#${nid}"`);
  }
  svg = svg.replace(/^<svg([^>]*)>/, (_m, attrs) => {
    let a = attrs.replace(/\s(width|height)="[^"]*"/g, '');
    a = a.replace(/class="([^"]*)"/, (_c, cls) => `class="${cls} ink-fig${opts.cls ? ` ${opts.cls}` : ''}"`);
    return `<svg${a} data-ink="${esc(name)}" data-crop="${esc(crop)}" preserveAspectRatio="${esc(opts.align || 'xMidYMid meet')}" role="img" aria-label="${esc(opts.label || name.replace(/-/g, ' '))}" focusable="false">`;
  });
  return svg;
}
