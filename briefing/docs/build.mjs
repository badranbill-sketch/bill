#!/usr/bin/env node
/**
 * Build a print document: Markdown (+ custom blocks) → HTML → PDF (headless Chromium, US Letter).
 *
 *   node docs/build.mjs <doc.md> [--out <dir>] [--name <basename>] [--html-only] [--strict]
 *
 * Writes <out>/<name>.pdf, <out>/<name>.html and <out>/<name>.report.json.
 * Default out: docs/out/ (git-ignored). Default name: the Markdown file's basename.
 * --strict exits non-zero when the build has warnings (wording checks, capsule checks).
 * Env: DOCS_CHROMIUM overrides the browser executable.
 * Authoring guide: docs/AUTHORING.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { chromium } from 'playwright-core';
import { PDFDocument, PDFName } from 'pdf-lib';
import { createMarkdown, escapeHtml } from './lib/markdown.mjs';
import { createHandlers, figureHtml } from './lib/blocks.mjs';
import { inkSvg } from './lib/ink.mjs';
import { lint } from './lib/lint.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(HERE, '..');
const FONTS = path.join(PKG, 'public/fonts');
const BROWSERS = [
  process.env.DOCS_CHROMIUM,
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
].filter(Boolean);

const DEFAULTS = {
  date: '30 September 2026',
  classification: 'Internal — not for publication',
  lang: 'en',
  toc: 'auto',
  toc_threshold: 8,
  wpm: 150,
};
const DEFAULTS_FR = {
  date: '30 septembre 2026',
  classification: 'Interne — ne pas publier',
  kicker: 'Note interne',
};
const LABELS = {
  en: { section: 'Section', contents: 'Contents', sources: 'Sources', for: 'For', date: 'Date', status: 'Status', prepared: 'Prepared by', page: 'Page', of: 'of' },
  fr: { section: 'Section', contents: 'Table des matières', sources: 'Sources', for: 'Pour', date: 'Date', status: 'Statut', prepared: 'Préparé par', page: 'Page', of: 'de' },
};

/* ------------------------------------------------------------------ */
function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--out') a.out = argv[++i];
    else if (k === '--name') a.name = argv[++i];
    else if (k === '--html-only') a.htmlOnly = true;
    else if (k === '--strict') a.strict = true;
    else if (k === '-h' || k === '--help') a.help = true;
    else a._.push(k);
  }
  return a;
}

function splitFrontMatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (!m) return { meta: {}, body: src, bodyLine: 1 };
  return { meta: YAML.parse(m[1]) || {}, body: src.slice(m[0].length), bodyLine: m[0].split('\n').length };
}

const cssString = (s) => `"${String(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;

function fontFaces() {
  const faces = [
    ['Newsreader', 300, 'normal', 'newsreader-latin-300-normal.woff2'],
    ['Newsreader', 300, 'italic', 'newsreader-latin-300-italic.woff2'],
    ['Newsreader', 400, 'normal', 'newsreader-latin-400-normal.woff2'],
    ['Newsreader', 400, 'italic', 'newsreader-latin-400-italic.woff2'],
    ['Source Sans 3', 400, 'normal', 'source-sans-3-latin-400-normal.woff2'],
    ['Source Sans 3', 400, 'italic', 'source-sans-3-latin-400-italic.woff2'],
    ['Source Sans 3', 600, 'normal', 'source-sans-3-latin-600-normal.woff2'],
  ];
  return faces
    .map(([fam, w, st, file]) => {
      const b64 = fs.readFileSync(path.join(FONTS, file)).toString('base64');
      return `@font-face{font-family:'${fam}';font-style:${st};font-weight:${w};font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
    })
    .join('\n');
}

/* Running header and footer: CSS page-margin boxes (Chromium ≥ 131). */
function pageCss(meta, L) {
  const head = meta.short_title || meta.title;
  const footLeft = [meta.date, meta.version].filter(Boolean).join(' · ');
  const box = `font-family:'Source Sans 3',sans-serif;font-size:7.4pt;color:#4e5b68;`;
  return `@page {
  @top-left { content: ${cssString(head)}; font-family:'Newsreader',serif; font-style:italic; font-size:9pt; color:#173450; vertical-align:bottom; padding-bottom:0.24in; }
  @top-right { content: ${cssString(meta.classification)}; ${box} font-weight:600; font-size:6.6pt; letter-spacing:0.13em; text-transform:uppercase; color:#7a5d33; vertical-align:bottom; padding-bottom:0.245in; }
  @bottom-left { content: ${cssString(footLeft)}; ${box} vertical-align:top; padding-top:0.24in; }
  @bottom-right { content: ${cssString(`${L.page} `)} counter(page) ${cssString(` ${L.of} `)} counter(pages); ${box} vertical-align:top; padding-top:0.24in; font-variant-numeric: tabular-nums; }
}
@page cover { @top-left { content: none } @top-right { content: none } @bottom-left { content: none } @bottom-right { content: none } }`;
}

function coverHtml(meta, L, md, env) {
  if (meta.cover === false) return '';
  const inl = (s) => md.renderInline(String(s ?? ''), env);
  const rows = [
    meta.audience && [L.for, inl(meta.audience)],
    meta.prepared_by && [L.prepared, inl(meta.prepared_by)],
    [L.date, inl(meta.date)],
    meta.status && [L.status, inl(meta.status)],
  ].filter(Boolean);
  const art = meta.cover_drawing
    ? `<div class="cover-art">${inkSvg(meta.cover_drawing, { crop: meta.cover_crop || 'ink', align: 'xMaxYMax meet' })}</div>`
    : '<div class="cover-art"></div>';
  return `<section class="cover">
  <div class="cover-top"><span class="cover-kicker">${inl(meta.kicker || 'Internal briefing')}</span><span class="cover-class">${inl(meta.classification)}</span></div>
  <div class="cover-main">
    <h1 class="cover-title">${inl(meta.title)}</h1>
    ${meta.subtitle ? `<p class="cover-sub">${inl(meta.subtitle)}</p>` : ''}
    <dl class="cover-meta">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
  </div>
  ${art}
  <div class="cover-foot"><span class="note">${inl(meta.cover_note || '')}</span><span class="brand">${inl(meta.brand || '')}</span></div>
</section>`;
}

function tocHtml(headings, pages, L, meta) {
  const levels = Number(meta.toc_depth || 2);
  const items = headings
    .filter((h) => h.level <= levels)
    .map((h) => {
      const pg = pages ? pages[h.id] ?? '' : '00';
      return `<li class="toc-${h.level}"><a href="#${h.id}">${h.level === 1 ? `<span class="toc-num">${h.number || ''}</span>` : ''}<span class="toc-title">${escapeHtml(h.text)}</span><span class="toc-leader"></span><span class="toc-page">${pg}</span></a></li>`;
    })
    .join('\n');
  return `<nav class="toc"><h1 class="toc-head">${escapeHtml(meta.toc_title || L.contents)}</h1><ol>${items}</ol></nav>`;
}

function renderDocument(srcFile) {
  const src = fs.readFileSync(srcFile, 'utf8');
  const { meta: fm, body, bodyLine } = splitFrontMatter(src);
  const meta = { ...DEFAULTS, ...(fm.lang === 'fr' ? DEFAULTS_FR : {}), ...fm };
  if (!meta.title) throw new Error(`${srcFile}: front matter needs a title`);
  const lang = meta.lang === 'fr' ? 'fr' : 'en';
  const L = LABELS[lang];
  const mds = {};
  const handlers = createHandlers((l) => mds[l]);
  for (const l of ['en', 'fr']) {
    mds[l] = createMarkdown({ lang: l, handlers, onImage: ({ name, captionHtml, attrs }) => figureHtml({ name, captionHtml, attrs }) });
  }
  const env = { lang, meta, labels: L, headings: [], warnings: [], docDir: path.dirname(srcFile), usedIds: new Set() };
  let bodyHtml;
  try {
    bodyHtml = mds[lang].render(body, env);
  } catch (e) {
    // Report Markdown line numbers relative to the whole file.
    e.message = e.message.replace(/Line (\d+)/, (_m, n) => `${path.basename(srcFile)}:${Number(n) + bodyLine - 1}`);
    throw e;
  }
  const lintWarnings = lint(src, meta);
  env.warnings.unshift(...lintWarnings.map((w) => `${path.basename(srcFile)}:${w}`));
  return { meta, L, env, bodyHtml, md: mds[lang] };
}

function composeHtml(doc, { toc, pages }) {
  const { meta, L, env, bodyHtml, md } = doc;
  const css = fs.readFileSync(path.join(HERE, 'theme/print.css'), 'utf8');
  const js = fs.readFileSync(path.join(HERE, 'theme/page.js'), 'utf8');
  const coverEnv = { ...env, headings: [], warnings: env.warnings };
  return `<!doctype html>
<html lang="${meta.lang === 'fr' ? 'fr' : 'en'}" data-capsule-pages="${escapeHtml(String(meta.capsule_pages ?? 'auto'))}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(meta.title)}</title>
<meta name="description" content="${escapeHtml(meta.subtitle || '')}">
<style>
${fontFaces()}
${css}
${pageCss(meta, L)}
</style>
</head>
<body>
${coverHtml(meta, L, md, coverEnv)}
${toc ? tocHtml(env.headings, pages, L, meta) : ''}
<main class="doc">
${bodyHtml}
</main>
<script>${js}</script>
</body>
</html>`;
}

async function printPdf(page, html, htmlPath) {
  fs.writeFileSync(htmlPath, html);
  await page.goto(`file://${htmlPath}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__docsReady === true, null, { timeout: 30000 });
  const capsules = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.capsule')).map((c) => ({ id: c.id, fit: c.dataset.fit, heightIn: Number(c.dataset.heightIn) })),
  );
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, outline: true, tagged: true });
  return Object.assign(pdf, { capsules });
}

async function destPages(buf) {
  const doc = await PDFDocument.load(buf, { updateMetadata: false });
  const refs = doc.getPages().map((p) => p.ref.toString());
  const out = {};
  const dests = doc.catalog.lookup(PDFName.of('Dests'));
  if (dests) {
    for (const key of dests.keys()) {
      const arr = dests.lookup(key);
      const ref = arr?.get?.(0);
      const idx = ref ? refs.indexOf(ref.toString()) : -1;
      const name = key.toString().slice(1).replace(/#([0-9a-fA-F]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));
      if (idx >= 0) out[name] = idx + 1;
    }
  }
  return { pages: out, count: doc.getPageCount() };
}

/* ------------------------------------------------------------------ */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._.length !== 1) {
    console.log('Usage: node docs/build.mjs <doc.md> [--out <dir>] [--name <basename>] [--html-only] [--strict]');
    process.exit(args.help ? 0 : 2);
  }
  const srcFile = path.resolve(args._[0]);
  const outDir = path.resolve(args.out || path.join(HERE, 'out'));
  const name = args.name || path.basename(srcFile).replace(/\.(md|markdown)$/i, '');
  fs.mkdirSync(outDir, { recursive: true });
  const htmlPath = path.join(outDir, `${name}.html`);
  const pdfPath = path.join(outDir, `${name}.pdf`);
  const t0 = Date.now();

  const doc = renderDocument(srcFile);
  const { meta, env } = doc;
  const tocWanted = meta.toc === true || meta.toc === 'true' ? 'yes' : meta.toc === false || meta.toc === 'false' ? 'no' : 'auto';

  if (args.htmlOnly) {
    fs.writeFileSync(htmlPath, composeHtml(doc, { toc: tocWanted === 'yes', pages: null }));
    finish({ args, htmlPath, pdfPath: null, pages: null, env, t0, passes: 0, toc: tocWanted === 'yes' });
    return;
  }

  const exe = BROWSERS.find((p) => fs.existsSync(p));
  if (!exe) throw new Error(`No Chromium found. Tried: ${BROWSERS.join(', ')} (set DOCS_CHROMIUM)`);
  // Unhinted font metrics on screen match the metrics used for print, so page.js measures what will print.
  const browser = await chromium.launch({ executablePath: exe, args: ['--font-render-hinting=none'] });
  let buf;
  let passes = 0;
  let toc = tocWanted === 'yes';
  let count;
  try {
    const page = await browser.newPage();
    if (tocWanted === 'auto') {
      buf = await printPdf(page, composeHtml(doc, { toc: false }), htmlPath);
      passes++;
      count = (await destPages(buf)).count;
      toc = count > Number(meta.toc_threshold);
    }
    if (toc) {
      // Pass with placeholder page numbers, then fill them in until they are stable.
      let pages = null;
      for (let i = 0; i < 4; i++) {
        buf = await printPdf(page, composeHtml(doc, { toc: true, pages }), htmlPath);
        passes++;
        const found = await destPages(buf);
        count = found.count;
        const stable = pages && env.headings.every((h) => pages[h.id] === found.pages[h.id]);
        pages = found.pages;
        if (stable) break;
      }
      const missing = env.headings.filter((h) => h.level <= Number(meta.toc_depth || 2) && !pages[h.id]).map((h) => h.id);
      if (missing.length) env.warnings.push(`Contents: no page found for ${missing.join(', ')}`);
    } else if (!buf) {
      buf = await printPdf(page, composeHtml(doc, { toc: false }), htmlPath);
      passes++;
      count = (await destPages(buf)).count;
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(pdfPath, Buffer.from(buf));
  finish({ args, htmlPath, pdfPath, pages: count, env, t0, passes, toc, exe, capsules: buf.capsules || [] });
}

function finish({ args, htmlPath, pdfPath, pages, env, t0, passes, toc, exe, capsules = [] }) {
  for (const c of capsules) {
    if (c.fit === 'flow' && String(env.meta.capsule_pages ?? 'auto') === 'auto') env.warnings.push(`${c.id}: longer than one page even at the densest step, so it prints on two (scripts, then on-screen text and production notes)`);
    if (/overflows/.test(c.fit || '')) env.warnings.push(`${c.id}: longer than one page even at the densest step; with capsule_pages: 1 it overflows`);
  }
  const report = {
    source: path.resolve(args._[0]),
    html: htmlPath,
    pdf: pdfPath,
    pages,
    toc,
    passes,
    chromium: exe || null,
    seconds: Number(((Date.now() - t0) / 1000).toFixed(1)),
    sections: env.headings.filter((h) => h.level === 1).map((h) => h.text),
    capsules,
    warnings: env.warnings,
  };
  fs.writeFileSync(htmlPath.replace(/\.html$/, '.report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(
    pdfPath
      ? `${pdfPath}  (${pages} pages, ${passes} print pass${passes === 1 ? '' : 'es'}, ${report.seconds} s${toc ? ', with contents' : ''})`
      : `${htmlPath}  (HTML only)`,
  );
  for (const w of env.warnings) console.warn(`  warning: ${w}`);
  if (args.strict && env.warnings.length) {
    console.error(`--strict: ${env.warnings.length} warning(s)`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(`docs/build: ${e.message}`);
  process.exit(1);
});
