# Verification — 2026-09-28

## Passed

- Production `npm run build`: Next.js 16.3.6, successful compilation, TypeScript and page generation. Root redirects to French; informational pages and article review are server-rendered.
- `npm run typecheck` and `npm run lint`: no errors or lint warnings after corrections.
- `npm run test`: **13 tests passed**. Independent iterative fee expectations; zero/maximum/invalid inputs; checklist distinctions; all localized route mappings; draft pairing/exclusion; unsafe/incomplete content; missing credentials; strict inquiry schema; safe HTML escaping; provider-confirmed acceptance; stable idempotency; rate limiting; provider HTTP errors, malformed responses, exceptions and timeout; substantive-content approval fingerprint.
- `npm run test:e2e`: **30 Chromium tests passed in 1.3 minutes** against a production build, with isolated mocked inquiry responses. No real inquiry was sent.
- Both languages at **1440×1000 and 390×844**; all nine page types in both languages also checked for horizontal overflow at **320, 375 and 768px**.
- All internal links collected across the main pages returned 200, including protected/local draft links; language-equivalent routing and actual language switching verified. Per-page canonical URL, document language, single H1 and noindex metadata verified.
- Homepage axe scans at both main sizes in both languages found **zero violations** under the selected WCAG 2/2.1/2.2 A/AA rule tags. This is automated evidence, not a certification or complete accessibility audit.
- Keyboard skip link, mobile-menu initial focus and tab wrap, Escape, focus restoration, navigation close, reduced-motion emulation and 200% root text-size overflow check on the retirement and French privacy pages. Font sizes are in rem, so the check exercises real text enlargement; all 16 pages were also swept at 200% text at 320 and 390px with no horizontal overflow.
- Checklist edit preservation, all-yes limitation, reset, print-media visibility, reload clearing, empty local/session storage and zero new network requests during answers/editing. Contact payload whitelist excludes checklist data.
- Fee fields, invalid values and accessible annual table verified in browser.
- Inquiry pending/accepted states, duplicate-click prevention, invalid form input, server validation, 429, provider 502, unavailable/timeout 503, real browser abort timeout and preserved message after failure.
- API rejects missing/mismatched Origin, invalid schema and oversized body; missing adapter configuration returns 503. Browser acceptance is mocked; server-provider acceptance semantics are tested with an injected fetch adapter.
- Protected host requires authentication; draft routes are 404 when review is off; public article route cannot expose a draft; public resource listing excludes drafts; reference HTML is inaccessible; staging sitemap has no entries and robots disallows crawling.
- Core content and primary navigation path remain usable with JavaScript disabled. Simulated portrait failure displays a labelled monogram fallback. Absent guides produce no download link.
- Local content import dry run and review-date validation executed. Strict launch check deliberately failed with eight unresolved business/operational approval categories, as intended.
- Supplied Calendly profile inspected read-only: displayed Bill Badran and meeting options. No appointment selected or booked.

The final first-meeting-page placement improvement was followed by another successful production build and **13 targeted browser checks** (visual, routes, all responsive widths, keyboard/reduced-motion/text enlargement).

## Pen-and-ink overhaul

The theme was rebuilt as navy ink on warm paper with code-drawn illustrations, and the scroll-word animation was removed. The mountain ride was redrawn in ink. Four ride tests cover it: scrolling through four acts, reduced motion showing four still panels (the scroll engine stops and the drawings are fully visible), tabbing to the last act showing that act alone, and one English narration track with none in French. After the final changes, the full suite (30 tests), unit tests, typecheck, lint and Prettier passed. Screenshots were refreshed from a production build and inspected at 1440, 1150 and 390px.

## Visual inspection

The actual rendered desktop and mobile homepages were opened and inspected, including full-page section rhythm, image placement, contact state and typography. Final screenshots capture the normal local review configuration with the inquiry form hidden because it is unconfigured (phone, email and office shown instead), not the test-only enabled form. Additional screenshots cover a service page, biography, article review, fee tool, first-meeting page and checklist print view.

Initial QA found and corrected a dark SVG monogram, a development-only CSP debugging warning, mobile Shift+Tab focus escape and a server-origin normalization mismatch. One test selector was scoped to the fee component to avoid matching Next.js's route announcer. The final complete browser run passed.

## Limitations / not claimed

- Chromium viewport emulation, not testing on a physical iPhone or Safari. No screen-reader session, actual OS print dialog, or physical print test.
- No Lighthouse/Core Web Vitals benchmark, load test or search-ranking measurement was run.
- No live mail delivery, provider account connection, Calendly confirmation webhook, newsletter, analytics, domain or deployment test. Those integrations were intentionally not fabricated.
- GitHub protection and publication-review API checks are implemented but not run against a real repository: no repository access/reviewer configuration was supplied. CI and Vercel Git deployment need owner setup. Hosted review credentials were exercised with local test credentials, not a real Vercel deployment.
- Production indexing/hreflang/schema code remains gated by actual owner approvals. Release flags were not falsified to simulate an approved business. Staging exclusion, canonicals and equivalent routes were verified.
- Financial, business-specific, privacy and legal content still requires human/firm approval. More testing does not replace those approvals.

## Bill at the centre, Ask Bill and the guide — 2026-09-29

- `npm run lint`, `npm run typecheck`, Prettier: clean. The Remotion project in `film/` has its own dependencies and is now excluded from the site's TypeScript, ESLint and Prettier runs; before this, `npm run build` failed on its missing modules.
- `npm run test`: **18 tests passed**, including five new ones for the Ask Bill questions (both languages, one chapter each, unique anchors, deep links that exist, answer length, words ruled out in COPY-STRATEGY.md, French spacing before ? ! ; : across the funnel).
- `npm run build` succeeded; `npm run test:e2e`: **34 Chromium tests passed**, including new checks that Bill's portrait is in the first screen at 1440 and 390, that the homepage questions open their answers on the Ask Bill page in both languages, that the guide shows its booklet and chapters with no download or printed-copy offer until they exist, that the header keeps the way to a first meeting down to the phone menu, and zero axe violations on the Ask Bill and guide pages.
- Copy was drafted by three independent writers, judged for compliance, language and brand, and synthesised; the built site was then reviewed through five lenses (compliance, French, English, brand/visual, code/accessibility) with an adversarial verifier per lens. 49 findings were confirmed and fixed; 51 were refuted with reasons. A second review round was interrupted by a container restart and not completed.
- Not done: physical devices, screen-reader session, and the legal/compliance approvals listed in LAUNCH-CHECKLIST.md and COPY-STRATEGY.md flags 16–22.
