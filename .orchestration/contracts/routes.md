# Routes 1.0: conceptual routes mapped to the existing bilingual route system

- Task F02, offers lane. **Status: proposed, submitted, not accepted.** Base HEAD `5cbbf9b5d21dbf03d2cb44e524a6fcdc10d5515b`. Facts are read with `git show` from `origin/main@77de3bd` and `origin/codex/desktop-iphone-unified@66cce52`; other branches are named where they differ.
- **Every route marked "proposed" does not exist in any branch.** Existing routes are marked "existing" with the branch they exist on.
- `lib/routes.ts`, `proxy.ts`, `app/sitemap.ts` and `app/robots.ts` are locked shared files (01 §5, D-065). Every change below is a proposal that A0 applies serially. Changes to review protection need independent review (01 §14).
- The proposed route keys and slugs are machine-checked in `evidence/F02/offers/validation.log` §5: no collision with existing slugs on main, codex or homepage, no shadowing of article or `revision` paths, ASCII only, and the same key list as the asset manifest's `intended_route_key` enum.
- Sources: 01 §7 (conceptual routes; callbacks and preview protection), 01 §9, §11; 04 §3, §4; privacy-boundary.md (PB-URL, PB-FIN, PB-COOKIE); event-envelope.md §5; TASK_LEDGER deliverable paths.

## 1. The existing route system (facts)

**`lib/routes.ts`** is byte-identical on main, codex, guide and video. add-ask-bill-section also has the same map. It maps 9 page keys to FR and EN slugs:

| Key | FR path | EN path |
|---|---|---|
| `home` | `/fr` | `/en` |
| `retirement` | `/fr/planification-retraite` | `/en/retirement-planning` |
| `investments` | `/fr/placements-retraite` | `/en/investing-for-retirement` |
| `about` | `/fr/a-propos` | `/en/about` |
| `resources` | `/fr/guide-retraite` | `/en/retirement-guide` |
| `meeting` | `/fr/demarche` | `/en/how-it-works` |
| `fees` | `/fr/outils/frais-placement` | `/en/tools/investment-fees` |
| `privacy` | `/fr/confidentialite` | `/en/privacy` |
| `legal` | `/fr/mentions-legales` | `/en/legal` |

`origin/claude/bill-centered-homepage` adds a 10th key, `ask`: `/fr/demandez-a-bill`, `/en/ask-bill`. It is backed by `lib/ask.ts` (12 Q&A) and an FAQPage JSON-LD block. It is not on main or codex. Porting it waits for HB-03 (design) and HB-23 (provenance of the questions).

**Resolution** (`app/[lang]/[[...slug]]/page.tsx`, the same on main and codex):
1. `lang` must be `fr` or `en`, or the page is a 404. `/` redirects to `/fr` (`app/(entry)/page.tsx`).
2. The slug segments are joined with `/`, and `keyFor(lang, slug)` looks them up in the map. Multi-segment slugs work (for example `outils/frais-placement`).
3. Otherwise the path must be exactly two segments: `/<lang>/<resources slug>/<article slug>` for approved articles only (`approvedArticle`), or `/<lang>/revision/<article slug>` for drafts, only when `reviewEnabled()`.
4. Anything else is a 404. `pathFor(lang, key)` builds links. On main and codex, the header (`components/navigation.tsx`) lists `retirement`, `investments`, `meeting`, `about` and `resources`, and shows a `header-cta` button to `meeting` on every page. The footer (`components/shell.tsx`) links to the same five keys plus `privacy` and `legal`.

**API routes are not localized:**
- `POST /api/inquiry` (main and codex): the contact form. Disabled unless `ENABLE_CONTACT=true` plus Resend and Upstash credentials. It checks origin, content type and a 12 KB streamed limit, validates a strict schema and uses a browser `requestId`. It is the precedent for new form endpoints. Whether Resend and Upstash are retired is open (HB-06, D-051).
- `GET /api/guide` (**codex only**; missing on main): serves `content/guides/retirement-review-en.pdf` inline, `private, no-store, noindex`. It returns 404 when `launchApproved()` is true or review is off, so it is review-only by design. `next.config.ts` on codex adds `outputFileTracingIncludes` for it.

**Indexing** (the same on main and codex):
- `app/robots.ts`: before launch, `Disallow: /`. After launch, `Disallow: /fr/revision/, /en/revision/, /api/`.
- `app/sitemap.ts`: empty before launch. After launch it lists **every key in `routes`** in both languages, plus approved articles. **Consequence: adding a transactional page key to `routes` would put it in the sitemap and hreflang output.** See RT-IDX-1.

**Other branch differences that matter here:** `lib/features.ts` exists on codex and add-ask-bill-section, not on main (homepage cards, `askVideos[].anchor` values such as `can-i-retire`, which privacy-boundary.md PB-ID-4 uses as analytics labels). Homepage replaces `business.guides` with `business.guide.pdf` and `printedCopies` (D-049: the free printed-copy request conflicts with the paid book and stays off).

## 2. Proxy and review protection (facts)

`proxy.ts` is identical on all six branches (inventory §3). In Next 16.3.6 `proxy.ts` replaces `middleware.ts`; see the bundled `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`, read in the F00 codex worktree.

- Matcher: `/((?!_next/static|_next/image|assets/|favicon.ico|robots.txt|sitemap.xml).*)`. The proxy runs on every page, every `/api/*` route and every `public/` file outside `/assets/`.
- `draft` means the path matches `^/(fr|en)/revision(/|$)`. When `draft` is true and review is off, the response is 404.
- `needsAuth = (draft && !localReview()) || (!launchApproved() && !localReview())`. With `REVIEW_USER` or `REVIEW_PASSWORD` unset the response is 503. With a wrong `Authorization` header it is 401 with `WWW-Authenticate: Basic`.
- Before launch, and on every draft path, the response carries `X-Robots-Tag: noindex, nofollow` and `Cache-Control: private, no-store`.
- `launchApproved()` needs `PUBLIC_LAUNCH=true` **and** all 8 `business.approvals` flags true. All are false today (D-061).
- `localReview()` means not on Vercel, and either `NODE_ENV=development` or `LOCAL_REVIEW=true`. It removes all protection. `README.md` warns never to expose `LOCAL_REVIEW=true` on a public self-hosted server (TB-10).
- Open issue: `/assets/*` is never protected, so the unapproved portrait and AI cover are fetchable on a hosted preview (TB-09, D-060).

What that means for each class of route:

| Phase | `/<lang>/revision/*` | Other matched routes (pages, `/api/*`, `public/` outside `/assets/`) | `/assets/*`, `_next/static`, robots, sitemap |
|---|---|---|---|
| Before launch (`launchApproved()` false, no `localReview`) | 404 if review is off, otherwise Basic Auth | **Basic Auth** (503 without credentials), noindex | public |
| After launch | Basic Auth if review is on, otherwise 404 | **no proxy authentication**: only the route's own checks | public |
| `localReview()` (dev or `LOCAL_REVIEW=true`, not Vercel) | open if review is on | open | public |

## 3. Route map: conceptual routes (01 §7) → keys, slugs and protection

Protection classes:
- **public**: no authentication. After launch it is open to anyone; before launch, review Basic Auth covers it.
- **public-noindex**: public, but excluded from the sitemap and served `noindex` in every phase.
- **protected-review**: review Basic Auth in every phase (`/revision`).
- **token**: needs one opaque token of at least 128 random bits, stored only as a hash, expiring and rate-limited (PB-URL-2). The URL carries nothing else.
- **callback**: a provider callback that checks its own signature or authentication over the raw body before any side effect, and dedupes (04 §4). It may be **narrowly excluded** from review Basic Auth (§4).
- **operator**: an authenticated operator session (`HttpOnly`, `Secure`, `SameSite=Strict`, PB-COOKIE-2), independent of the proxy.
- **service**: the automation service token (06 secrets map), independent of the proxy.

### 3.1 Pages (localized, under `app/[lang]/[[...slug]]`)

| Conceptual route (01 §7) | Key | FR slug | EN slug | Status | Protection | Built by | Notes |
|---|---|---|---|---|---|---|---|
| Guide landing, immediate approved PDF, optional email request | `resources` | `guide-retraite` | `retirement-guide` | **existing** (content changes) | public | U00 (copy C09) | Reuse the existing key; no new guide page. The page already renders the checklist, resources list and sources. |
| Crossroads landing and registration | `crossroads` | `carrefour-retraite` | `retirement-crossroads` | proposed | public | U01 (copy C03, C06) | Real date, cap and time zone come only from G0 (HB-17). No page says an event is available before one is scheduled (05 §2). |
| Crossroads confirmation | `crossroadsConfirmed` | `carrefour-retraite/inscription-confirmee` | `retirement-crossroads/registered` | proposed | public-noindex | U01 | Shows no registrant data. The text says "registered", never "attending". |
| Crossroads join page | `crossroadsJoin` | `carrefour-retraite/rejoindre` | `retirement-crossroads/join` | proposed, **optional** | token, public-noindex | U01 | Only if U01 keeps a site join step (source `site.join_redirect`). A click is recorded as `webinar.join_clicked` and never as attendance. The meeting link is never published on an open page; invitations are individual (01 §10). |
| Approved replay | `crossroadsReplay` | `carrefour-retraite/rediffusion` | `retirement-crossroads/replay` | proposed | public-noindex, or token if G4 limits the replay to registrants | U01 | Explicit "no replay" state until the G4 replay policy and an approved recording exist (HB-17). |
| Workshop introduction, four steps, summary, local print or download | `workshop` | `atelier-retraite` | `retirement-workshop` | proposed | public-noindex until G3 approves the calculations (HB-26) | W01–W04 (design D00) | One route. The steps are in-page state; any step sub-slugs must carry no data. Print and download happen in the browser (PB-FIN-4). No third-party script (PB-FIN-6). Zero non-static requests during use (PB-FIN-5). |
| 15-minute meeting page and provider handoff | `meeting` | `demarche` | `how-it-works` | **existing** (content changes) | public | U02 (copy C06) | The existing page links to `business.bookingUrl` (Calendly profile, `bookingVerified=true`). U02 makes the offer exact (15 minutes, one question). The scheduler link is external and never prefilled (PB-CAL-2). |
| Book offer | `book` | `livre-imprime` | `printed-book` | proposed | public-noindex until `sale_state = on_sale` and `checkout_live` | U03 (copy C09) | Shows the eight pre-payment disclosures (offer-matrix.md §2) before the checkout button. |
| Purchase status | `bookOrderStatus` | `livre-imprime/commande` | `printed-book/order` | proposed | public-noindex; carries Stripe's opaque `session_id` only | U03 | Shows "we are confirming your payment" until the verified webhook has recorded the order as paid (AM-PAY-1). The redirect itself proves nothing. |
| Verified consultation redemption | `bookConsultation` | `livre-imprime/consultation` | `printed-book/consultation` | proposed | token, or a reviewed manual process (01 §11) | U03 with U02 | Books the `book-consultation-30` meeting type against one active right. Rescheduling moves the right. |
| Privacy | `privacy` | `confidentialite` | `privacy` | **existing** | public | text by G5 (HB-27); page exists | `privacyPolicy` approval flag is false. |
| Email preferences and consent withdrawal | `emailPreferences` | `preferences-courriel` | `email-preferences` | proposed | token, public-noindex | U04 | Separate purposes: requested service versus optional nurture (04 §6). |
| Accessible unsubscribe | `unsubscribe` | `desabonnement` | `unsubscribe` | proposed | token, public-noindex | U04 | Immediate in the application. An upsert never unblocks a contact (MAIL03). |
| Existing pages kept | `home`, `retirement`, `investments`, `about`, `fees`, `legal`; articles; `revision` | as in §1 | as in §1 | **existing** | public; `revision` is protected-review | unchanged | `ask` only if ported from homepage (HB-03, HB-23). |

### 3.2 Non-localized routes (API and operations)

| Purpose | Method and path | Status | Protection | Built by | Event source (event-envelope.md) |
|---|---|---|---|---|---|
| Optional guide email request | `POST /api/marketing/guide-request` | proposed | public form: origin, content type, size and rate limits, strict schema | P02 (endpoint), U00 (UI) | `site.guide_request` |
| Marketing opt-in capture, and confirmation if double opt-in is chosen at G5 | part of each form; `POST /api/preferences/confirm` | proposed | form or token | P02, U04 | `site.consent_capture`, `site.optin_confirmation` |
| Crossroads registration and cancellation | `POST /api/marketing/webinar-registration`, `POST /api/marketing/webinar-cancellation` | proposed | form or token | P02, U01 | `site.webinar_registration` |
| Workshop access request | `POST /api/marketing/workshop-access` | proposed | form | P02, W01 | `site.workshop_access` |
| Consented workshop completion (no figures) | `POST /api/marketing/workshop-completed` | proposed | form; the body carries no answers (PB-FIN-7) | P02, W02 | `site.workshop_completion` |
| Start hosted checkout | `POST /api/book/checkout` | proposed | form; refused unless the offer matrix allows the current mode | U03 | none (the order row is created; payment truth comes later) |
| Stripe webhook | `POST /api/book/stripe-webhook` | proposed | **callback**: Stripe signature over the raw body, event ID dedupe | U03, N05 | `provider.stripe_webhook` |
| Redeem the consultation | `POST /api/book/redeem` | proposed | token, or operator | U03 | `provider.booking_sync` or `operator.reconciliation` (via `consultation.redeemed`) |
| Booking provider callback | `POST /api/marketing/booking-callback` | proposed, **only if P05 verifies a signed provider callback** | callback | N06, U02 | `provider.booking_sync`; otherwise the operator's daily reconciliation replaces it |
| Brevo unsubscribe, blocklist and bounce signals | `POST /api/marketing/brevo-webhook` | proposed | callback (Brevo's authentication method is unverified here; checked at P05) | N01, N07 | `provider.brevo_webhook` |
| Preferences read and update | `GET/POST /api/preferences` | proposed | token | U04 | `site.preferences` |
| One-click unsubscribe (RFC 8058 List-Unsubscribe-Post) | `POST /api/preferences/unsubscribe` | proposed | token; candidate for narrow exclusion (§4, RT-PROXY-6) | U04 | `site.unsubscribe` |
| n8n job claim and reconciliation | `/api/internal/automation/*` | proposed (P02 deliverable path) | **service** token; never public input that becomes privileged work (04 §4) | P02, N00 | `system.dispatcher` |
| Operations view (page) | `/operations` (top-level `app/operations/`, outside `[lang]`) | proposed | **operator** | U05 | none |
| Operations actions | `/api/operations/*` | proposed (U05 deliverable path) | operator plus origin/CSRF check | U05 | `operator.reconciliation`, `operator.fulfilment`, `operator.suppression` |
| Health check | `GET /api/health` | proposed | returns a status code only, no data; see RT-PROXY-7 | P00, N09 | none |
| Approved public PDF | `/guides/<approved-file>.pdf` from `public/guides/` | proposed | public; not under `/assets/`, so the proxy protects it before launch | U00 | none |
| Review-edition PDF | `GET /api/guide` | **existing (codex only)** | review-only | kept until an approved edition exists | none |

The approved-PDF proposal reuses the existing launch check. `scripts/launch.ts` expects `business.guides[lang].path` to exist under `public/` and `approved` to be true. The file name should carry the approved content hash, so a new edition gets a new URL and the old approval cannot cover it.

## 4. Rules for review protection and callbacks

- **RT-PROXY-1.** A route is excluded from review Basic Auth only by an **exact method and path allowlist** checked at the top of `proxy()`, for example `POST /api/book/stripe-webhook`. Never by a prefix such as `api/` in the matcher, which would silently unprotect every future API route. The bundled Next 16 docs make the same point for Server Functions: a matcher change can silently remove proxy coverage, so authentication belongs inside each handler, not in the proxy alone (proxy.md, "Execution order").
- **RT-PROXY-2.** Only a route that verifies a provider signature or authentication before any side effect may be excluded. It must also dedupe and reject stale or replayed deliveries (AUTH03). An obscure URL is not authentication (04 §4).
- **RT-PROXY-3.** Excluded routes still get `noindex` and `no-store` headers and appear in `robots.ts` `Disallow`.
- **RT-PROXY-4.** Protection is never removed wholesale to make one webhook pass (01 §7), and `LOCAL_REVIEW=true` is never set on a hosted environment (TB-10).
- **RT-PROXY-5.** After launch the proxy protects only `/revision`. So the operations view, `/api/operations/*` and `/api/internal/automation/*` must enforce their own authentication from their first commit. Tests must run with `launchApproved()` both false and true (AUTH01, AUTH03). Before launch, Basic Auth is only an extra layer.
- **RT-PROXY-6.** Clients that cannot send review credentials, in staging before launch:
  - Stripe and Brevo callbacks: narrow exclusion under RT-PROXY-1 and RT-PROXY-2.
  - n8n calling `/api/internal/automation/*`: Basic Auth occupies the `Authorization` header. The service token must then travel in a separate header, or the route is narrowly excluded and enforces its token itself. P02 and P00 choose one; A6 reviews it.
  - Mailbox providers sending one-click unsubscribe POSTs: either narrow exclusion with the opaque token as the authentication, or record "provider one-click not testable in staging" as `blocked` and test the token flow in a browser with review credentials. U04 chooses; A6 reviews it.
- **RT-PROXY-7.** A health endpoint that the reverse proxy or monitor must reach either sends review credentials or is narrowly excluded and returns only a status code, with no version, secret or data (N09, OPS01).
- **RT-PROXY-8.** Raw-body signature checks must be tested through the proxy. The bundled Next docs say the proxy clones and buffers the request body (10 MB by default, `proxyClientMaxBodySize.md`), so the route can still read the raw bytes. This comes from the docs and has not been tested here; U03 proves it (AUTH03).
- **RT-PROXY-9.** Fix `/assets/*` (TB-09) before any hosted preview. Unapproved media must not be served from an unprotected path.

## 5. Rules for slugs, indexing and URLs

- **RT-SLUG-1.** A new slug is lowercase ASCII `[a-z0-9-]`, with `/` between segments. It must not equal any existing slug in the same language on any branch, including `ask`'s `demandez-a-bill` and `ask-bill`.
- **RT-SLUG-2.** A new slug must not start with the `resources` slug followed by `/` (`guide-retraite/`, `retirement-guide/`), which would shadow article paths. It must not start with `revision`, `api`, `assets`, `_next` or `operations`.
- **RT-SLUG-3.** FR and EN slugs are both defined for every key (the `routes` type requires it). Slugs are proposals until the page's copy is approved at G3. Changing a slug after launch needs a redirect.
- **RT-IDX-1.** Transactional or tokenized pages (`crossroadsConfirmed`, `crossroadsJoin`, `crossroadsReplay`, `bookOrderStatus`, `bookConsultation`, `emailPreferences`, `unsubscribe`, and `workshop` and `book` until they are approved) must not enter `sitemap.xml` or hreflang. `sitemap.ts` iterates every `routes` key, so the proposal is a separate `flowRoutes` map, or an `indexable` flag that `sitemap.ts` filters on. R00 writes it; A0 applies it. Those routes also emit `robots: noindex`.
- **RT-URL-1.** URLs carry only the locale, route slugs, article slugs and at most one opaque token. They never carry an email address, name, amount, age, answer or question (PB-URL-1, PB-ID-4). Analytics labels, if tracking is ever enabled, use route keys.
- **RT-URL-2.** Redirects never forward the destination as a free parameter and never forward a query string to a third party (PB-URL-4).

## 6. Meeting link on every relevant page

The offer matrix fixes which route keys must show a direct link to the 15-minute meeting (`rules.no_mandatory_funnel_staircase.must_link_to_meeting`) and which are exempt (offer-matrix.md §6). On the existing site (main and codex), the header CTA links to `meeting` on every page. In the page body, `MeetingLink` (article aside) and the `StandardPage` CTA link to it everywhere except `meeting`, `privacy` and `legal`. New pages keep the header and follow the same body rule, and the exempt pages carry no body CTA. R00 checks it across both languages.

## 7. Proposed shared-file patches, for A0

1. `lib/routes.ts`: add the proposed page keys, plus the `flowRoutes` or `indexable` split (RT-IDX-1). Add keys only when the building task needs them, not all at once.
2. `proxy.ts`: an exact callback allowlist (RT-PROXY-1), the `/assets/` fix (TB-09) and the VPS proxy-IP adaptation (TB-10). Needs independent review.
3. `app/sitemap.ts` and `app/robots.ts`: filter out non-indexable routes, and disallow `/operations` and the transactional slugs.
4. `app/[lang]/[[...slug]]/page.tsx`: render the new keys. Its `generateMetadata` currently assumes every non-home key other than `resources` and `fees` has an entry in `pages[lang]`, so each new key needs page data or its own branch.
