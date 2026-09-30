/**
 * Wording checks from the plan's hard rules. They warn; they do not rewrite.
 * A line can opt out of one check with an HTML comment naming it: <!-- ok: credentials -->
 * (use it where a document explains the rule rather than making the claim).
 */
import { TAGS } from './markdown.mjs';

const CHECKS = [
  {
    id: 'sixty',
    re: /\b(60|sixty|soixante)[\s-]?(min\b|minutes?\b|-minute)|\b(one|an|1)[\s-]hour (consultation|meeting|session)|\bheure de consultation/i,
    msg: 'a 60-minute / one-hour meeting: the book includes ONE 30-minute consultation, never 60',
  },
  {
    id: 'credentials',
    re: /\bPl\.?\s?Fin\b|\bCIM\b|\bCFP\b|financial planner|planificat(eur|rice)s? financi|\bindependent\b|\bindépendante?s?\b|\b\d+\s+(years|ans)\s+(of experience|d.expérience)/i,
    msg: "a professional claim about Bill (designation, 'financial planner', 'independent', years of experience) is pending G1: do not state it as fact",
  },
  {
    id: 'guarantee',
    re: /\bguarantee[ds]?\b|\bgaranti(e|es|s)?\b|\brisk[- ]free\b|\bsans risque\b/i,
    msg: 'a guarantee or no-risk wording: check it is not a promise about results',
  },
  {
    id: 'photo',
    re: /!\[[^\]]*\]\((?!ink:)[^)]+\.(jpe?g|png|webp|gif|avif)\)/i,
    msg: 'an image that is not one of the ink drawings: no photo, portrait or likeness of Bill (HB-22); check rights',
  },
];

export function lint(src, meta = {}) {
  const out = [];
  const lines = src.split('\n');
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) return;
    const ok = new Set([...line.matchAll(/<!--\s*ok:\s*([\w ,-]+?)\s*-->/g)].flatMap((m) => m[1].split(/[ ,]+/)));
    for (const c of CHECKS) {
      if (ok.has(c.id) || (meta.lint_ok || []).includes(c.id)) continue;
      const m = c.re.exec(line);
      if (m) out.push(`${i + 1}: [${c.id}] "${m[0]}": ${c.msg}`);
    }
    // Bracketed words that look like a status tag but are not one (typos such as [to-confirm]).
    const prose = line.replace(/`[^`]*`/g, ''); // not inside inline code
    for (const m of prose.matchAll(/(^|[^!\]\\])\[([a-zA-Z][a-zA-Z -]{1,24})\](?![(\[:])/g)) {
      const k = m[2].trim().toLowerCase();
      if (!TAGS[k] && !/^(x| )$/.test(k)) out.push(`${i + 1}: [tag] "[${m[2]}]" is not a known status tag (see AUTHORING.md); it prints as plain text`);
    }
  });
  return out;
}
