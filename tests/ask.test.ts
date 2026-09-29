import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ASK_GROUPS,
  ASK_KEYS,
  FEATURED,
  askGroups,
  askRelated,
  askText,
} from "../lib/ask";
import { copy } from "../lib/copy";
import { guide, pages } from "../lib/pages";
import { journey } from "../lib/journey";

const langs = ["fr", "en"] as const;

test("Ask Bill: every question in both languages, in exactly one chapter", () => {
  const grouped = ASK_GROUPS.flatMap((g) => g.questions);
  assert.deepEqual([...grouped].sort(), [...ASK_KEYS].sort());
  assert.equal(new Set(grouped).size, grouped.length);
  for (const g of ASK_GROUPS) assert.ok(g.questions.length >= 2, g.key);
  for (const lang of langs) {
    assert.deepEqual(
      Object.keys(askText[lang].questions).sort(),
      [...ASK_KEYS].sort(),
    );
    assert.deepEqual(
      Object.keys(askText[lang].groups).sort(),
      ASK_GROUPS.map((g) => g.key).sort(),
    );
    for (const g of askGroups(lang)) assert.ok(g.title && g.blurb, g.key);
  }
  assert.equal(FEATURED.length, 6);
  assert.equal(new Set(FEATURED).size, 6);
  for (const k of FEATURED) assert.ok(ASK_KEYS.includes(k));
});

test("Ask Bill: anchors are unique URL fragments and deep links exist", () => {
  for (const lang of langs) {
    const anchors = Object.values(askText[lang].questions).map((q) => q.anchor);
    assert.equal(new Set(anchors).size, anchors.length, lang);
    for (const a of anchors) assert.match(a, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    for (const [key, r] of Object.entries(askRelated)) {
      const ids = pages[lang][r.page].sections.map((s) => s.id);
      assert.ok(ids.includes(r.anchor[lang]), `${lang} ${key}`);
    }
  }
});

test("Ask Bill: short answers stay short and general", () => {
  for (const lang of langs)
    for (const [key, q] of Object.entries(askText[lang].questions)) {
      const words = q.answer.trim().split(/\s+/).length;
      assert.ok(words >= 30 && words <= 110, `${lang} ${key}: ${words}`);
      assert.ok(q.teaser.split(/\s+/).length <= 26, `${lang} ${key} teaser`);
      assert.ok(q.points.length <= 4, `${lang} ${key} points`);
    }
});

test("copy never uses the words the practice has ruled out", () => {
  // From docs/COPY-STRATEGY.md. Disclaimers live elsewhere.
  const banned = [
    /peace of mind/i,
    /tranquillit[ée] d[’']esprit/i,
    /s[ée]r[ée]nit[ée] financi[èe]re/i,
    /\bguarante/i,
    /\bgaranti/i,
    /sur mesure/i,
    /\btailored\b/i,
    /\bholistic/i,
    /\bwealth\b/i,
    /\bexpertise\b/i,
    /\bpassion/i,
    /\boptimi[sz]/i,
    /\bmaximi[sz]/i,
    /\bsolutions?\b/i,
    /book now/i,
    /d[èe]s aujourd[’']hui/i,
    /n[’']attendez plus/i,
    /\bgratuit/i,
    /\bfree (?:of charge|consultation|meeting)/i,
    /!/,
  ];
  const strings: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") strings.push(v);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(askText);
  walk({ ...copy.fr, disclaimer: "" });
  walk({ ...copy.en, disclaimer: "" });
  for (const s of strings)
    for (const b of banned) assert.doesNotMatch(s, b, `"${s}"`);
});

test("one call to action, and house typography in both languages", () => {
  for (const lang of langs) assert.ok(copy[lang].meeting.length <= 34);
  const collect = (...values: unknown[]) => {
    const out: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === "string") out.push(v);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    values.forEach(walk);
    return out;
  };
  const anchors = new Set(
    langs.flatMap((l) =>
      Object.values(askText[l].questions).map((q) => q.anchor),
    ),
  );
  for (const s of collect(askText, copy)) {
    if (anchors.has(s)) continue;
    assert.doesNotMatch(s, /\w'\w/, `straight apostrophe: "${s}"`);
  }
  // French: a non-breaking space before ? ! ; : and inside « », on every
  // page the funnel leads to.
  for (const s of collect(
    askText.fr,
    copy.fr,
    pages.fr,
    guide.fr,
    journey.fr,
  )) {
    assert.doesNotMatch(s, /(?:\S|[ \u202f])[?!;:](?=\s|$)/, `"${s}"`);
    assert.doesNotMatch(s, /«(?!\u00a0)|(?<!\u00a0)»/, `"${s}"`);
  }
});
