/**
 * Handlers for the custom blocks (::: name …) and the h1 section opener.
 * Each handler receives { attrs, raw, env, line } and returns HTML.
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { inkSvg } from './ink.mjs';
import { escapeHtml, slugify } from './markdown.mjs';
import { renderCapsule, normalizeCapsuleFile } from './capsule.mjs';

/* A checkbox drawn as one small SVG (units = points): a navy square, and for a ticked item a brass tick that
   overshoots the square's top right like a pen mark. */
const BOX = (on) =>
  `<svg class="box" viewBox="0 0 13 12" aria-hidden="true"><rect x="0.6" y="2.6" width="8.6" height="8.6" rx="0.9" fill="none" stroke="#0e2233" stroke-width="0.8"/>${
    on ? '<path d="M2.3 6.9 4.9 9.6 11.9 1.3" fill="none" stroke="#a8875a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' : ''
  }</svg>`;

const len = (v, fallback) => {
  if (v === undefined || v === true) return fallback;
  const s = String(v).trim();
  return /^\d+(\.\d+)?$/.test(s) ? `${s}%` : s; // "60" → 60 %
};

export function figureHtml({ name, captionHtml = '', attrs = {} }) {
  const align = ['left', 'right', 'center'].includes(attrs.align) ? attrs.align : 'center';
  const width = len(attrs.width, align === 'right' || align === 'left' ? '42%' : '100%');
  const maxH = len(attrs.height, undefined);
  const svg = inkSvg(name, { crop: attrs.crop || 'ink', label: attrs.alt || stripTags(captionHtml) || undefined });
  const style = [`--fig-w:${width}`, maxH ? `--fig-max:${maxH}` : ''].filter(Boolean).join(';');
  const cap = captionHtml.trim() ? `<figcaption>${captionHtml}</figcaption>` : '';
  return `<figure class="fig align-${align}" style="${style}"><div class="fig-art">${svg}</div>${cap}</figure>\n`;
}

const stripTags = (h) => String(h || '').replace(/<[^>]+>/g, '').trim();

export function createHandlers(getMd) {
  const md = (env) => getMd(env.lang || 'en');
  const render = (raw, env) => md(env).render(raw, env);
  const renderInline = (s, env) => md(env).renderInline(String(s ?? ''), env);

  const handlers = {
    /* Section opener: every "# Title" starts a new page. */
    __h1({ id, text, html, attrs, env }) {
      const numbered = !attrs.nonumber;
      if (numbered) env.sectionNo = (env.sectionNo || 0) + 1;
      const number = numbered ? String(env.sectionNo).padStart(2, '0') : null;
      (env.headings ||= []).push({ level: 1, id, text, number });
      const art = attrs.drawing
        ? `<div class="opener-art">${inkSvg(attrs.drawing, { crop: attrs.crop || 'ink' })}</div>`
        : '';
      const kicker = attrs.kicker ? escapeHtml(attrs.kicker) : number ? `${env.labels.section} ${number}` : '';
      return `<header class="opener${art ? ' has-art' : ''}" id="${id}"><div class="opener-text">${
        kicker ? `<div class="opener-num"><span>${kicker}</span></div>` : ''
      }<h1>${html}</h1></div>${art}</header>\n`;
    },

    figure({ attrs, raw, env, line }) {
      if (!attrs.name) throw new Error(`Line ${line}: ::: figure needs name=<drawing>`);
      const captionHtml = attrs.caption ? renderInline(attrs.caption, env) : raw.trim() ? md(env).renderInline(raw.trim().replace(/\n+/g, ' '), env) : '';
      return figureHtml({ name: attrs.name, captionHtml, attrs });
    },

    callout({ attrs, raw, env }) {
      const tone = ['note', 'rule', 'plain', 'quiet'].includes(attrs.tone) ? attrs.tone : 'note';
      const label = attrs.title ? `<div class="callout-label">${renderInline(attrs.title, env)}</div>` : '';
      return `<aside class="callout tone-${tone}">${label}<div class="callout-body">${render(raw, env)}</div></aside>\n`;
    },

    checklist({ attrs, raw, env }) {
      let html = render(raw, env);
      html = html.replace(/<ul>/g, '<ul class="checklist">');
      html = html.replace(/<li>(\s*<p>)?\s*\[( |x|X)\]\s*/g, (_m, p, mark) => {
        const on = mark.toLowerCase() === 'x';
        return `<li class="${on ? 'on' : 'off'}">${BOX(on)}${p || ''}`;
      });
      const label = attrs.title ? `<div class="checklist-label">${renderInline(attrs.title, env)}</div>` : '';
      return `<div class="checklist-block">${label}${html}</div>\n`;
    },

    'two-col'({ attrs, raw, env }) {
      const parts = raw.split(/^[ \t]*\+\+\+[ \t]*$/m);
      if (parts.length < 2) return `<div class="two-col flow">${render(raw, env)}</div>\n`;
      const ratio = String(attrs.ratio || '1/1').split(/[\/:]/).map(Number);
      const cols = parts.map((p, i) => `<div class="col">${render(p, env)}</div>`).join('');
      const tpl = parts.map((_, i) => `${ratio[i] || 1}fr`).join(' ');
      return `<div class="two-col${attrs.rule ? ' ruled' : ''}" style="grid-template-columns:${tpl}">${cols}</div>\n`;
    },

    lede({ raw, env }) {
      return `<div class="lede">${render(raw, env)}</div>\n`;
    },

    sources({ attrs, raw, env }) {
      const label = attrs.title === undefined ? env.labels.sources : attrs.title;
      return `<div class="sources">${label ? `<div class="sources-label">${renderInline(label, env)}</div>` : ''}${render(raw, env)}</div>\n`;
    },

    note({ raw, env }) {
      return `<div class="small-note">${render(raw, env)}</div>\n`;
    },

    keep({ raw, env }) {
      return `<div class="keep">${render(raw, env)}</div>\n`;
    },

    pagebreak() {
      return '<div class="pagebreak"></div>\n';
    },

    table({ attrs, raw, env }) {
      let html = render(raw, env);
      if (attrs.widths) {
        const w = String(attrs.widths).split(',').map((x) => x.trim());
        const total = w.reduce((a, b) => a + Number(b || 0), 0) || 100;
        const cols = w.map((x) => `<col style="width:${((Number(x) / total) * 100).toFixed(2)}%">`).join('');
        html = html.replace('<table>', `<table class="fixed"><colgroup>${cols}</colgroup>`);
      }
      const cls = ['tbl', attrs.compact ? 'compact' : '', attrs.first === 'strong' ? 'first-strong' : ''].filter(Boolean).join(' ');
      const title = attrs.title ? `<div class="tbl-title">${renderInline(attrs.title, env)}</div>` : '';
      const note = attrs.note ? `<div class="tbl-note">${renderInline(attrs.note, env)}</div>` : '';
      return `<figure class="${cls}">${title}${html}${note}</figure>\n`;
    },

    /* One capsule written as YAML inside the block. */
    capsule({ raw, env, line }) {
      let data;
      try {
        data = YAML.parse(raw);
      } catch (e) {
        throw new Error(`Line ${line}: ::: capsule is not valid YAML: ${e.message}`);
      }
      return renderCapsule(data, env, { md, where: `line ${line}` });
    },

    /* Every capsule of a JSON or YAML file (path relative to the Markdown file). */
    capsules({ attrs, env, line }) {
      if (!attrs.src) throw new Error(`Line ${line}: ::: capsules needs src=<file.json|file.yaml>`);
      const file = path.resolve(env.docDir, attrs.src);
      if (!fs.existsSync(file)) throw new Error(`Line ${line}: capsule file not found: ${file}`);
      const data = YAML.parse(fs.readFileSync(file, 'utf8'));
      const list = normalizeCapsuleFile(data);
      const only = attrs.only ? new Set(String(attrs.only).split(',').map((s) => s.trim())) : null;
      return list
        .filter((c) => !only || only.has(c.id))
        .map((c, i) => renderCapsule(c, env, { md, where: `${path.basename(file)} #${i + 1}` }))
        .join('');
    },
  };
  return handlers;
}

export { slugify };
