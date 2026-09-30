/**
 * Markdown → HTML for the print documents.
 *
 * CommonMark + GFM tables (markdown-it), plus:
 *   ::: name key=value key="quoted value" flag     custom blocks, closed by a bare ":::" line;
 *   ...                                             they nest (every opener has a name, every closer is bare)
 *   :::
 *   # Heading {drawing=road-markers nonumber}      attributes at the end of a heading
 *   [done] [to confirm] [unverified] …              status tags (see TAGS); [done: custom words] for custom text
 *   ![caption](ink:crossroads-signpost)             a drawing as a figure (same as ::: figure)
 * Block handlers live in blocks.mjs.
 */
import MarkdownIt from 'markdown-it';

/* ------------------------------------------------------------------ */
/* Attributes: key=value key="a b" key='a b' flag                       */
/* ------------------------------------------------------------------ */
export function parseAttrs(src) {
  const attrs = {};
  const re = /([a-zA-Z_][\w-]*)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  let m;
  while ((m = re.exec(src || ''))) {
    const v = m[2] ?? m[3] ?? m[4];
    attrs[m[1]] = v === undefined ? true : v;
  }
  return attrs;
}

export const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function slugify(text, used) {
  let base =
    String(text)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section';
  let id = base;
  let i = 2;
  while (used.has(id)) id = `${base}-${i++}`;
  used.add(id);
  return id;
}

/* ------------------------------------------------------------------ */
/* Status tags                                                          */
/* tone: done = navy words after a brass tick; open = muted italic in a */
/* dashed outline; caution = brass italic in a thin brass box;          */
/* stop = navy words in a thin ruled box. Never red, never a fill.      */
/* ------------------------------------------------------------------ */
export const TAGS = {
  done: 'done', accepted: 'done', exists: 'done', fixed: 'done', resolved: 'done', verified: 'done',
  fetched: 'done', complete: 'done', recorded: 'done', approved: 'done', built: 'done', 'in place': 'done',
  'to confirm': 'open', pending: 'open', draft: 'open', 'in review': 'open', proposed: 'open', next: 'open',
  'not chosen': 'open', 'to open': 'open', planned: 'open', 'not started': 'open', rehearsal: 'open',
  'to decide': 'open', 'to write': 'open', 'to record': 'open', optional: 'open', brief: 'open', reviewed: 'open',
  unverified: 'caution', 'snippet-only': 'caution', example: 'caution', estimate: 'caution', assumption: 'caution',
  'layout sample': 'caution',
  blocked: 'stop', 'not used': 'stop', 'must not ship': 'stop', quarantined: 'stop', 'not live': 'stop',
  'do not publish': 'stop', internal: 'stop', 'not sent': 'stop', 'not bought': 'stop', 'not published': 'stop',
};
const TONES = new Set(['done', 'open', 'caution', 'stop']);
const TICK =
  '<svg class="tick" viewBox="0 0 12 12" aria-hidden="true"><path d="M1.6 6.6 4.6 9.4 10.6 2.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function tagHtml(tone, text) {
  const t = escapeHtml(text);
  return `<span class="tag tag-${tone}">${tone === 'done' ? TICK : ''}<span class="tag-t">${t}</span></span>`;
}

function statusTags(md) {
  md.inline.ruler.before('link', 'status_tag', (state, silent) => {
    const src = state.src;
    const pos = state.pos;
    if (src.charCodeAt(pos) !== 0x5b /* [ */) return false;
    const end = src.indexOf(']', pos + 1);
    if (end < 0 || end - pos > 80) return false;
    const next = src.charAt(end + 1);
    if (next === '(' || next === '[' || next === ':') return false; // a link or reference, not a tag
    const inner = src.slice(pos + 1, end);
    let tone;
    let text;
    const custom = /^(done|open|caution|stop|tag)\s*:\s*(.+)$/i.exec(inner);
    if (custom) {
      tone = custom[1].toLowerCase() === 'tag' ? 'open' : custom[1].toLowerCase();
      text = custom[2].trim();
    } else {
      const key = inner.trim().toLowerCase().replace(/\s+/g, ' ');
      tone = TAGS[key];
      text = inner.trim();
    }
    if (!tone || !TONES.has(tone)) return false;
    if (!silent) {
      const tok = state.push('html_inline', '', 0);
      tok.content = tagHtml(tone, text);
    }
    state.pos = end + 1;
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Custom blocks                                                        */
/* ------------------------------------------------------------------ */
function containers(md, getHandlers) {
  md.block.ruler.before(
    'fence',
    'docs_container',
    (state, startLine, endLine, silent) => {
      if (state.sCount[startLine] - state.blkIndent >= 4) return false;
      const start = state.bMarks[startLine] + state.tShift[startLine];
      const line = state.src.slice(start, state.eMarks[startLine]);
      const m = /^(:{3,})\s*([a-zA-Z][\w-]*)\s*(.*?)\s*$/.exec(line);
      if (!m) return false;
      if (silent) return true;
      let rest = m[3];
      let oneLine = false;
      if (/(^|\s):{3,}$/.test(rest)) {
        // ::: pagebreak :::   or   ::: figure name=x :::
        oneLine = true;
        rest = rest.replace(/\s*:{3,}$/, '');
      }
      const lines = [];
      let next = startLine;
      if (!oneLine) {
        let depth = 1;
        const indent = state.bMarks[startLine] + state.tShift[startLine] - state.bMarks[startLine];
        let fence = null; // inside a fenced code block, ":::" lines are text
        while (++next < endLine) {
          const s = state.bMarks[next] + state.tShift[next];
          const text = state.src.slice(s, state.eMarks[next]);
          const f = /^(`{3,}|~{3,})/.exec(text);
          if (f && (!fence || f[1][0] === fence[0] && f[1].length >= fence.length)) fence = fence ? null : f[1];
          if (fence || f) {
            const raw = state.src.slice(state.bMarks[next], state.eMarks[next]);
            lines.push(raw.slice(Math.min(indent, raw.length - raw.trimStart().length)));
            continue;
          }
          if (/^:{3,}\s*[a-zA-Z][\w-]*/.test(text) && !/\s:{3,}\s*$/.test(text)) depth++;
          else if (/^:{3,}\s*$/.test(text)) {
            depth--;
            if (depth === 0) break;
          }
          const raw = state.src.slice(state.bMarks[next], state.eMarks[next]);
          lines.push(raw.slice(Math.min(indent, raw.length - raw.trimStart().length)));
        }
        if (next >= endLine) {
          throw new Error(`Line ${startLine + 1}: "::: ${m[2]}" is never closed (add a line with just ":::")`);
        }
      }
      const tok = state.push('docs_container', 'div', 0);
      tok.info = m[2];
      tok.meta = { attrs: parseAttrs(rest), raw: lines.join('\n'), line: startLine + 1 };
      tok.map = [startLine, next + 1];
      state.line = next + 1;
      return true;
    },
    { alt: ['paragraph', 'reference', 'blockquote', 'list'] },
  );
  md.renderer.rules.docs_container = (tokens, idx, _opts, env) => {
    const t = tokens[idx];
    const h = getHandlers()[t.info];
    if (!h || t.info.startsWith('__')) {
      const known = Object.keys(getHandlers()).filter((k) => !k.startsWith('__'));
      throw new Error(`Line ${t.meta.line}: unknown block "::: ${t.info}". Known: ${known.join(', ')}`);
    }
    try {
      return h({ attrs: t.meta.attrs, raw: t.meta.raw, env, line: t.meta.line });
    } catch (e) {
      if (!/^Line \d+/.test(e.message) && !/^Capsule/.test(e.message)) e.message = `Line ${t.meta.line}: ${e.message}`;
      throw e;
    }
  };
}

/* ------------------------------------------------------------------ */
/* Heading attributes and ids                                           */
/* ------------------------------------------------------------------ */
function headings(md) {
  md.core.ruler.before('inline', 'heading_attrs', (state) => {
    const toks = state.tokens;
    for (let i = 0; i < toks.length; i++) {
      if (toks[i].type !== 'heading_open') continue;
      const inline = toks[i + 1];
      const m = /\s*\{([^{}]*)\}\s*$/.exec(inline.content);
      toks[i].meta = { ...(toks[i].meta || {}), attrs: m ? parseAttrs(m[1]) : {} };
      if (m) inline.content = inline.content.slice(0, m.index);
    }
  });
}

/* ------------------------------------------------------------------ */
/* French spacing: keep « », : ; ! ? with their words.                   */
/* Only replaces spaces the writer typed; imposes no convention.         */
/* ------------------------------------------------------------------ */
function frenchSpacing(md) {
  md.core.ruler.push('fr_spacing', (state) => {
    if ((state.env.lang || 'en') !== 'fr') return;
    for (const blk of state.tokens) {
      if (blk.type !== 'inline' || !blk.children) continue;
      for (const t of blk.children) {
        if (t.type !== 'text') continue;
        t.content = t.content
          .replace(/« /g, '« ')
          .replace(/ »/g, ' »')
          .replace(/ ([:;!?])/g, ' $1')
          .replace(/(\d) (\$|%)/g, '$1 $2');
      }
    }
  });
}

/* ------------------------------------------------------------------ */
/* Soft line-break opportunities after the slashes of paths and URLs,   */
/* so "workspace.google.com/pricing" can wrap in a narrow table cell.    */
/* ------------------------------------------------------------------ */
const SLASH = /([\w.)-])\/(?=[\w(])/g;
function softBreaks(md) {
  md.core.ruler.push('soft_breaks', (state) => {
    for (const blk of state.tokens) {
      if (blk.type !== 'inline' || !blk.children) continue;
      blk.children = blk.children.flatMap((t) => {
        if (t.type !== 'text' || !/[\w.)-]\/[\w(]/.test(t.content)) return [t];
        const h = new state.Token('html_inline', '', 0);
        h.content = escapeHtml(t.content).replace(SLASH, '$1/<wbr>');
        return [h];
      });
    }
  });
  md.renderer.rules.code_inline = (tokens, idx) =>
    `<code>${escapeHtml(tokens[idx].content).replace(SLASH, '$1/<wbr>')}</code>`;
}

/* ------------------------------------------------------------------ */
/* The instance                                                         */
/* ------------------------------------------------------------------ */
export function createMarkdown({ lang = 'en', handlers, onImage } = {}) {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    quotes: lang === 'fr' ? ['« ', ' »', '“', '”'] : ['“', '”', '‘', '’'],
  });
  md.linkify.set({ fuzzyLink: false, fuzzyEmail: false });
  statusTags(md);
  containers(md, () => handlers);
  headings(md);
  frenchSpacing(md);
  softBreaks(md);

  // Heading renderer: ids for the table of contents; h1 becomes a section opener (blocks.mjs).
  const defaultHeadingOpen = md.renderer.rules.heading_open || ((t, i, o, e, s) => s.renderToken(t, i, o));
  md.renderer.rules.heading_open = (tokens, idx, opts, env, self) => {
    const t = tokens[idx];
    const inline = tokens[idx + 1];
    const text = inline.children.map((c) => c.content).join('');
    const level = Number(t.tag.slice(1));
    env.usedIds ||= new Set();
    const id = t.meta?.attrs?.id || slugify(text, env.usedIds);
    if (level === 1 && handlers.__h1) {
      t.meta.h1 = true;
      return handlers.__h1({ id, text, html: md.renderer.renderInline(inline.children, opts, env), attrs: t.meta.attrs, env });
    }
    if (level === 2) (env.headings ||= []).push({ level, id, text, number: null });
    t.attrSet('id', id);
    return defaultHeadingOpen(tokens, idx, opts, env, self);
  };
  md.renderer.render = ((orig) =>
    function render(tokens, options, env) {
      // Skip the inline and closing tokens of h1 (rendered inside the opener).
      const out = [];
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (t.type === 'heading_open' && t.tag === 'h1' && handlers.__h1) {
          out.push(this.rules.heading_open(tokens, i, options, env, this));
          i += 2;
          continue;
        }
        if (t.type === 'inline') out.push(this.renderInline(t.children, options, env));
        else if (this.rules[t.type]) out.push(this.rules[t.type](tokens, i, options, env, this));
        else out.push(this.renderToken(tokens, i, options, env));
      }
      return out.join('');
    })(md.renderer.render);

  // A paragraph holding only an ink figure is not wrapped in <p>.
  md.core.ruler.push('ink_figure_unwrap', (state) => {
    const toks = state.tokens;
    for (let i = 1; i < toks.length - 1; i++) {
      const t = toks[i];
      if (t.type !== 'inline' || toks[i - 1].type !== 'paragraph_open') continue;
      const kids = (t.children || []).filter((c) => !(c.type === 'text' && !c.content.trim()) && c.type !== 'softbreak');
      if (kids.length === 1 && kids[0].type === 'image' && (kids[0].attrGet('src') || '').startsWith('ink:')) {
        toks[i - 1].hidden = true;
        toks[i + 1].hidden = true;
      }
    }
  });

  // ![caption](ink:name "crop=ink width=60%")
  const defaultImage = md.renderer.rules.image;
  md.renderer.rules.image = (tokens, idx, opts, env, self) => {
    const t = tokens[idx];
    const src = t.attrGet('src') || '';
    if (src.startsWith('ink:') && onImage) {
      const caption = self.renderInline(t.children, opts, env);
      return onImage({ name: src.slice(4), captionHtml: caption, attrs: parseAttrs(t.attrGet('title') || ''), env });
    }
    return defaultImage(tokens, idx, opts, env, self);
  };
  return md;
}
