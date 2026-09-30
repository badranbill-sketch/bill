/**
 * Capsule pages (C01: 18 main capsules S01–S18, each with its companion cut brief).
 * Input: one capsule object (YAML inside "::: capsule", or an item of a JSON/YAML file given to
 * "::: capsules src=…"). Field reference: ../capsule.schema.json and ../AUTHORING.md.
 */
import { inkSvg } from './ink.mjs';
import { escapeHtml, tagHtml, TAGS } from './markdown.mjs';

export const STATUSES = ['brief', 'draft', 'reviewed', 'recorded', 'edited', 'approved', 'published'];

/** Offer and CTA labels. Offer wording follows .orchestration/contracts/offer-matrix.md §1 (frozen offers). */
export const CTA_LABELS = {
  'guide-pdf': { en: 'Free PDF guide', fr: 'Guide PDF gratuit' },
  'intro-15': { en: 'Free 15-minute introduction (one question)', fr: 'Introduction gratuite de 15 minutes (une question)' },
  'book-bundle': { en: 'Printed book, including one 30-minute consultation', fr: 'Livre imprimé, incluant une consultation de 30 minutes' },
  workshop: { en: 'Workshop (prototype, not live)', fr: 'Atelier (prototype, pas en ligne)' },
  crossroads: { en: 'Crossroads event (only once one is scheduled)', fr: 'Événement Crossroads (seulement une fois planifié)' },
  'share-with-partner': { en: 'Share with a partner', fr: 'Partager avec son ou sa partenaire' },
  none: { en: 'No call to action', fr: 'Aucun appel à l’action' },
};

const METHOD_TAG = {
  fetched: ['done', 'fetched'],
  'snippet-only': ['caution', 'unverified'],
  'project-file': ['open', 'project file'],
  internal: ['open', 'project file'],
  pending: ['open', 'to confirm'],
};

const L = {
  en: {
    main: 'Main capsule', en: 'English', fr: 'Français (Québec)', onscreen: 'On-screen text', shot: 'Shot · props · ink',
    cta: 'Call to action', companion: 'Companion cut', sources: 'Sources', compliance: 'Compliance note', duration: 'Duration',
    destination: 'Destination', offer: 'Offer', targetCap: 'Target', words: 'words', estShort: 'est.', durNote: (e, f, w) => `${e} / ${f} words at ${w} wpm; time a read-through`, ctaLine: 'CTA wording', ctaShort: 'CTA', route: 'route key',
    status: 'Status', version: 'version', owner: 'owner', rights: 'rights', hash: 'review hash', none: 'none', notRecorded: 'not recorded',
    notPublished: 'not published', at: 'At', noClaims: 'No factual claims (writer’s statement; reviewer to confirm).',
    angle: 'Useful point', continued: 'continued', credentials: 'states credentials: needs G1', measured: 'measured',
  },
  fr: {
    main: 'Capsule principale', en: 'English', fr: 'Français (Québec)', onscreen: 'Texte à l’écran', shot: 'Plan · accessoires · dessin',
    cta: 'Appel à l’action', companion: 'Version courte', sources: 'Sources', compliance: 'Note de conformité', duration: 'Durée',
    destination: 'Destination', offer: 'Offre', targetCap: 'Cible', words: 'mots', estShort: 'env.', durNote: (e, f, w) => `${e} / ${f} mots à ${w} mots/min; chronométrer une lecture`, ctaLine: 'Formulation de l’appel', ctaShort: 'Appel', route: 'clé de route',
    status: 'Statut', version: 'version', owner: 'responsable', rights: 'droits', hash: 'empreinte de révision', none: 'aucune', notRecorded: 'non enregistré',
    notPublished: 'non publié', at: 'À', noClaims: 'Aucune affirmation factuelle (déclaration de l’auteur; à confirmer).',
    angle: 'Point utile', continued: 'suite', credentials: 'mentionne des titres : exige G1', measured: 'mesurée',
  },
};

export function normalizeCapsuleFile(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.capsules)) return data.capsules;
  throw new Error('Capsule file must be an array of capsules or an object with a "capsules" array');
}

const both = (v) => (v == null ? { en: '', fr: '' } : typeof v === 'string' ? { en: v, fr: '' } : { en: v.en ?? '', fr: v.fr ?? '' });

function beatsToMarkdown(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    return v
      .map((b) => (typeof b === 'string' ? b : `${b.at ? `**${b.at}** ` : ''}${b.text ?? ''}`))
      .join('\n\n');
  }
  return String(v);
}

export function countWords(markdown) {
  const plain = String(markdown || '')
    .replace(/\[[^\]]*\]\([^)]*\)/g, (m) => m.replace(/\]\([^)]*\)/, ''))
    .replace(/\*\*[^*]*\*\* /g, '') // beat time labels
    .replace(/\*\([^)]*\)\*/g, '') // *(stage directions)*
    .replace(/[*_`#>]/g, ' ');
  return (plain.match(/[\p{L}\p{N}][\p{L}\p{N}'’\-.,]*/gu) || []).length;
}

export function renderCapsule(raw, env, { md, where }) {
  const warn = (msg) => env.warnings.push(`Capsule ${raw?.id ?? '?'} (${where}): ${msg}`);
  if (!raw || typeof raw !== 'object') throw new Error(`Capsule (${where}) is empty or not an object`);
  const lang = env.lang === 'fr' ? 'fr' : 'en';
  const t = L[lang];
  const mdEn = md({ ...env, lang: 'en' });
  const mdFr = md({ ...env, lang: 'fr' });
  const envEn = Object.assign(Object.create(null), env, { lang: 'en' });
  const envFr = Object.assign(Object.create(null), env, { lang: 'fr' });
  const blockIn = (l, s) => (l === 'fr' ? mdFr.render(String(s ?? ''), envFr) : mdEn.render(String(s ?? ''), envEn));
  const inlineIn = (l, s) => (l === 'fr' ? mdFr.renderInline(String(s ?? ''), envFr) : mdEn.renderInline(String(s ?? ''), envEn));

  const id = String(raw.id || '').trim();
  if (!id) throw new Error(`Capsule (${where}) has no id`);
  if (!/^S(0[1-9]|1[0-8])$/.test(id) && !raw.sample) warn(`id "${id}" is not S01–S18`);
  const title = both(raw.title);
  if (!title.en || !title.fr) warn('title needs both en and fr');
  const status = String(raw.status || 'draft');
  if (!STATUSES.includes(status)) warn(`status "${status}" is not one of ${STATUSES.join(', ')}`);
  if (['approved', 'published'].includes(status)) warn(`status "${status}" needs a recorded human gate (G3, and G1 for offers/credentials); check before printing`);

  const script = { en: beatsToMarkdown(raw.script?.en), fr: beatsToMarkdown(raw.script?.fr) };
  if (!script.en.trim()) warn('script.en is empty');
  if (!script.fr.trim()) warn('script.fr is empty');
  const wpm = Number(env.meta?.wpm) || 150;
  const words = { en: countWords(script.en), fr: countWords(script.fr) };
  const secs = { en: Math.round((words.en / wpm) * 60), fr: Math.round((words.fr / wpm) * 60) };
  for (const l of ['en', 'fr']) {
    if (words[l] && (secs[l] < 45 || secs[l] > 75)) warn(`${l.toUpperCase()} script is about ${secs[l]} s at ${wpm} wpm, outside 45–75 s`);
  }

  const cta = raw.cta || {};
  if (Array.isArray(cta)) throw new Error(`Capsule ${id}: one CTA only (05 §2)`);
  if (!cta.offer) warn('no cta.offer: every capsule has exactly one CTA (use "none" deliberately if so)');
  const offer = cta.offer || 'none';
  if (!CTA_LABELS[offer]) warn(`cta.offer "${offer}" is not one of ${Object.keys(CTA_LABELS).join(', ')}`);
  const dest = typeof cta.destination === 'string' ? { en: cta.destination } : cta.destination || {};

  const sources = Array.isArray(raw.sources) ? raw.sources : [];
  if (!sources.length && raw.factual_claims !== false) warn('no sources: add them, or set factual_claims: false');

  const status4 = STATUSES.indexOf(status);
  const statusTag = tagHtml(
    status === 'approved' || status === 'published' ? 'done' : TAGS[status] || 'open',
    lang === 'fr' ? status : status,
  );
  const sampleTag = raw.sample ? tagHtml('caution', 'layout sample') : '';
  const credTag = raw.credential_claims ? tagHtml('stop', t.credentials) : '';

  (env.headings ||= []).push({ level: 2, id: `capsule-${id.toLowerCase()}`, text: `${id} · ${title[lang] || title.en}`, number: null });

  const target = typeof raw.duration === 'object' && raw.duration ? raw.duration.target : raw.duration;
  const measured = typeof raw.duration === 'object' && raw.duration ? raw.duration.measured : null;
  const durHtml = [
    [target && `${t.targetCap} ${escapeHtml(target)}`, measured && `${escapeHtml(measured)} ${t.measured}`].filter(Boolean).join(' · '),
    `EN ${t.estShort} ${secs.en} s · FR ${t.estShort} ${secs.fr} s`,
  ]
    .filter(Boolean)
    .join('<br>');
  const durNote = t.durNote(words.en, words.fr, wpm);

  const onScreen = Array.isArray(raw.on_screen) ? raw.on_screen : [];
  const onScreenList = (l) =>
    onScreen.length
      ? `<div class="cap-sub"><h4 class="cap-k">${t.onscreen}</h4><ol class="cap-os">${onScreen
          .map((r) => `<li>${r.at ? `<span class="at">${escapeHtml(r.at)}</span>` : ''}<span class="os">${inlineIn(l, r[l] || '')}</span></li>`)
          .join('')}</ol></div>`
      : '';
  const ctaLine = (l) => (cta[l] ? `<div class="cap-sub"><h4 class="cap-k">${t.ctaLine}</h4><p class="cap-ctaline">${inlineIn(l, cta[l])}</p></div>` : '');

  const inks = [].concat(raw.ink || []).filter(Boolean);
  const inkHtml = inks.length
    ? `<div class="cap-ink">${inks.map((n) => inkSvg(n, { crop: raw.ink_crop || 'ink' })).join('')}</div>`
    : '';

  const comp = raw.companion || {};
  if (!raw.companion) warn('companion cut brief is missing');
  const compHead = [comp.duration, comp.format].filter(Boolean).map(escapeHtml).join(' · ');

  const destHtml = [dest.en && `<span lang="en">${escapeHtml(dest.en)}</span>`, dest.fr && `<span lang="fr">${escapeHtml(dest.fr)}</span>`]
    .filter(Boolean)
    .join(' · ');

  const srcHtml = sources.length
    ? `<ol class="cap-src">${sources
        .map((s) => {
          const [tone, label] = METHOD_TAG[s.method] || ['open', s.method || 'method?'];
          if (!METHOD_TAG[s.method]) warn(`source "${s.title || s.url}" has method "${s.method}"; use fetched | snippet-only | project-file`);
          const claim = s.claim ? `<span class="src-claim">${inlineIn(lang, s.claim)}:</span> ` : '';
          const ttl = s.title ? `<span class="src-title">${inlineIn(lang, s.title)}</span>` : '';
          const url = s.url ? ` <a href="${escapeHtml(s.url)}">${escapeHtml(s.url.replace(/^https?:\/\//, '')).replace(/\//g, '/<wbr>')}</a>` : '';
          const acc = s.accessed ? `, <span class="src-date">${escapeHtml(s.accessed)}</span>` : '';
          return `<li>${claim}${ttl}${url}${acc} ${tagHtml(tone, label)}</li>`;
        })
        .join('')}</ol>`
    : `<p class="cap-empty">${raw.factual_claims === false ? t.noClaims : '—'}</p>`;

  const C = lang === 'fr' ? '\u00a0:' : ':';
  const statusLine = [
    `${t.status}${C} ${escapeHtml(status)}`,
    raw.version != null ? `${t.version} ${escapeHtml(raw.version)}` : '',
    raw.owner ? `${t.owner} ${escapeHtml(raw.owner)}` : '',
    `${t.rights}${C} ${escapeHtml(raw.rights || 'pending')}`,
    `${t.hash}${C} ${escapeHtml(raw.review_hash || t.none)}`,
    status4 < STATUSES.indexOf('recorded') ? t.notRecorded : '',
    status !== 'published' ? t.notPublished : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const plainTitle = (title[lang] || title.en).replace(/[*_`]/g, '');
  const hasOs = onScreen.length > 0 || Boolean(cta.en || cta.fr);
  const cont = `${escapeHtml(id)} · ${escapeHtml(plainTitle)} · ${t.continued}`;
  return `<article class="capsule${hasOs ? ' has-os' : ''}" id="capsule-${escapeHtml(id.toLowerCase())}" lang="${lang}">
<header class="cap-head">
  <div class="cap-id">${escapeHtml(id)}</div>
  <div class="cap-titles">
    <div class="cap-kicker">${escapeHtml(raw.format || t.main)}</div>
    <h2 class="cap-title" lang="en">${inlineIn('en', title.en)}</h2>
    ${title.fr ? `<div class="cap-title-fr" lang="fr">${inlineIn('fr', title.fr)}</div>` : ''}
  </div>
  <div class="cap-tags">${statusTag}${sampleTag}${credTag}</div>
</header>
<div class="cap-meta">
  <div class="cap-cell cap-angle"><h4 class="cap-k">${t.angle}</h4>${raw.angle ? inlineIn(lang, raw.angle) : '—'}</div>
  <div class="cap-cell cap-dur"><h4 class="cap-k">${t.duration}</h4>${durHtml}<span class="cap-est">${durNote}</span></div>
  <div class="cap-cell cap-cta"><h4 class="cap-k">${t.cta}</h4>${escapeHtml((CTA_LABELS[offer] || {})[lang] || offer)}${
    destHtml ? `<span class="cap-dest">${destHtml}</span>` : ''
  }${dest.route ? `<span class="cap-est">${t.route} <code>${escapeHtml(dest.route)}</code></span>` : ''}</div>
</div>
<section class="cap-scripts">
  <div class="cap-script" lang="en"><h3>${t.en}</h3>${blockIn('en', script.en)}${onScreenList('en')}${ctaLine('en')}</div>
  <div class="cap-script" lang="fr"><h3>${t.fr}</h3>${blockIn('fr', script.fr)}${onScreenList('fr')}${ctaLine('fr')}</div>
</section>
${hasOs ? `<section class="cap-os-page" data-cont="${cont}">
  <div class="cap-os-col" lang="en"><h3>${t.en}</h3>${onScreenList('en')}${ctaLine('en')}</div>
  <div class="cap-os-col" lang="fr"><h3>${t.fr}</h3>${onScreenList('fr')}${ctaLine('fr')}</div>
</section>` : ''}
<section class="cap-grid" data-cont="${cont}">
  <div class="cap-box cap-shot"><h3>${t.shot}</h3>${inkHtml}${blockIn(lang, raw.shot || '—')}</div>
  <div class="cap-box cap-companion"><h3>${t.companion}${compHead ? `<span class="h3-sub">${compHead}</span>` : ''}</h3>${blockIn(lang, comp.brief || '—')}</div>
</section>
<footer class="cap-foot">
  <div class="cap-sources"><h3>${t.sources}</h3>${srcHtml}</div>
  <div class="cap-compliance"><h3>${t.compliance}</h3>${blockIn(lang, raw.compliance || '—')}${
    cta.note ? `<div class="cap-cta-note"><span class="cap-k-inline">${t.ctaShort}</span> ${inlineIn(lang, cta.note)}</div>` : ''
  }</div>
</footer>
<p class="cap-status">${statusLine}</p>
${raw.notes ? `<div class="cap-notes">${blockIn(lang, raw.notes)}</div>` : ''}
</article>
`;
}
