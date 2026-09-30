# Privacy boundary and no-financial-data marketing boundary (contract 1.0)

- Task F02, lane "data, privacy boundary, events, jobs, flags" (A3/A4 contract author). **Status: proposed, submitted, not accepted.** This file records no G5 decision. Every path, table, endpoint, processor or provider feature named here is **proposed** unless it is marked existing, and existing means only that it is present in the repository at the SHA cited.
- Base: `/home/user/bill` HEAD `5cbbf9b5d21dbf03d2cb44e524a6fcdc10d5515b`. Repository names were checked against `origin/codex/desktop-iphone-unified@66cce52`. `lib/routes.ts`, `lib/business.ts`, `proxy.ts`, `content/approvals.json`, `docs/CONTENT-WORKFLOW.md` and `scripts/verify-publication.ts` have the same blobs on `main`; `lib/features.ts` exists only on codex.
- Controlling sources: 01 §7, §9, §12, §14; 04 §1–§4, §7; 05 §8; D-014, D-040, D-042.
- Companions: `data-flow-register.json` (processor, data class, purpose, retention, owner), `authority-matrix.md`, `event-envelope.schema.json`, `delivery-job.schema.json`, `operational-data-model.md`, `feature-flags.json`. The sibling `workshop-inputs.schema.json` (another F02 lane) defines the browser-only inputs this boundary protects.

## 1. The boundary in one rule

Workshop financial inputs, and everything computed or selected from them, exist only on the visitor's device. The operational and marketing systems (site server, Supabase, n8n, Brevo, Stripe, scheduler and calendar, analytics and ads, error monitoring, logs, URLs, cookies, LLM prompts, media origin) hold only what is needed to deliver a service the person asked for, or a message they consented to. Nothing in those systems knows, or can infer, a visitor's savings, income, spending, ages, gap or selected clip.

Collecting financial documents is not called illegal here. It is outside this marketing system and would need a separately approved secure process (01 §14).

## 2. Data classes

The register defines 18 classes. These are the ones that decide most tests:

| Class | Content | Where it may go |
|---|---|---|
| DC-FIN-INPUT | Every workshop answer: spending, income amounts and start timing, gross/net basis, savings by tax category, home or business value, current and retirement ages, household timing, horizon, inflation and return assumptions, the local lifestyle choice | Browser memory; browser storage after opt-in; a file or print made in the browser |
| DC-FIN-DERIVED | Gap or surplus, capital illustration, completeness state, selected branch clip, warning or risk selection, chart series, summary text | Same as DC-FIN-INPUT |
| DC-CONTACT | Normalized email, optional first name, locale, internal and provider contact IDs | Server adapters, Supabase `contacts`, n8n (transient, per leased job), Brevo, off-host backup, operations view |
| DC-CONSENT | Purpose, state, wording version, time, capture source, evidence reference | Supabase `consent_events`; Brevo gets the status attribute only |
| DC-ORDER | Order and payment IDs, product version, payment, fulfilment and entitlement state | Stripe (authority); Supabase stores IDs and states, not the price |
| DC-SHIPPING, DC-CARD | Shipping address; card data | Stripe only |
| DC-BOOKING-INTAKE | Invitee name, email, intake answer, time, mode | Scheduler and calendar only; Supabase stores IDs, times, offer, mode and status. The invitee email reaches the application server only as the transient matching key of PB-CAL-3 (register FL-29, class DC-CONTACT) and is never stored; name and intake answers never do |

## 3. Sink matrix

A = allowed. C = allowed only under the named condition. F = forbidden.

| Sink | DC-FIN-INPUT / DC-FIN-DERIVED | DC-CONTACT | DC-CONSENT | DC-ORDER | Condition or note |
|---|---|---|---|---|---|
| Browser memory | A (default) | — | — | — | Lost on tab close or reset |
| Browser storage (localStorage, sessionStorage, IndexedDB, Cache) | C | F | F | F | Explicit opt-in, shared-device warning, reset, expiry (PB-FIN-3) |
| File or print made in the browser | A | — | — | — | No server round trip, no PDF service |
| Site server (Next.js server code, any host) | F | A | A | A | Server-only adapters; no request-body logging |
| Supabase | F | A | A | C | Order: IDs and states only; no price, no address |
| n8n (execution data, SQLite) | F | C | F | C | Recipient resolved per leased job only; execution data minimized |
| Brevo | F | A | C | F | Only the eight attributes of PB-BREVO-1 |
| Stripe | F | C | F | A | Stripe collects its own buyer data; our metadata holds internal IDs only |
| Scheduler / Google Calendar / Meet | F | C | F | F | Provider-held booking data; no prefill from our side |
| Analytics and ads | F | F | F | F | Off by default. If enabled, only PB-ADS-2 events without personal data |
| Error monitoring | F | F | F | F | None selected; adding one needs a new contract version and G5 |
| Logs (app, hosting, n8n, proxy) | F | F | F | F | Codes, internal IDs and counts only |
| URL path, query or fragment | F | F | F | F | Locale, route slug and opaque tokens only |
| Cookies | F | F | F | F | No visitor cookies by default |
| LLM prompt | F | F | F | F | Only Bill's non-identifying notes and public sources, weekly draft only |
| Media origin | F | F | F | F | Requests carry no identity and no semantic branch names (PB-MEDIA) |

## 4. Testable rules

Each rule has an ID that downstream tests cite. "Test" names the acceptance check that must assert it; the owning task writes that runtime test.

### 4.1 Financial data (PB-FIN)

| ID | Rule | Test |
|---|---|---|
| PB-FIN-1 | No DC-FIN-INPUT or DC-FIN-DERIVED value leaves the browser by any channel: fetch or XHR body, beacon, WebSocket, form post, URL path, query or fragment, `Referer`, request header, cookie, `window.name`, `postMessage` to another origin, service-worker sync, third-party script, error report, console output collected by any tool, email, calendar prefill, scheduler prefill or LLM prompt. | WK04, ADS02 |
| PB-FIN-2 | Workshop state lives in memory by default. A reload without an opt-in save starts empty and says so. | WK05 |
| PB-FIN-3 | Browser storage only after an explicit, reversible choice that states what is kept, on which device, the shared-device risk and the expiry. One namespaced key (proposed `bill.workshop.v1`). Reset deletes it. Proposed expiry: 7 days after the last save, pending G5 and HB-26. The stored object never contains an email or name. | WK05 |
| PB-FIN-4 | Print and download are produced in the browser (`window.print` or a Blob). No upload to a rendering or PDF service. | WK07 |
| PB-FIN-5 | While a visitor fills in, edits, resets and prints the workshop, the page makes **zero** requests except static assets (`/_next/static/`, `/assets/`) and approved media. Approved media is allowed only as PB-MEDIA-4 permits: branch-clip requests never depend on the answers. The codex checklist test is the precedent: it records every non-static request and expects an empty list, and expects `localStorage.length` and `sessionStorage.length` to be 0 (`tests/browser/site.spec.ts`, codex `66cce52`). | WK04 |
| PB-FIN-6 | Workshop routes load no third-party script, pixel, tag manager, session replay or embedded player analytics, whatever the value of `third_party_tracking`. | WK04, ADS02 |
| PB-FIN-7 | The only workshop-related events that reach the server are `workshop.access_requested` and `workshop.completed`, with exactly the event-envelope 1.0 fields. `workshop.completed` requires consent and carries no answers, gap, clip or diagnosis. What enforces it: (a) the closed envelope rejects any added field (schema; `invalid/event-envelope/workshop-completed-*`); (b) its `resource_id` accepts only a closed workshop key and a hash version, so no word or readable number fits (schema, PB-ID-3; `amount-words-in-workshop-key`, `diagnosis-in-workshop-key`); (c) the hash must be a registered workshop build set by the server, which closes hidden encodings in the hex (runtime, PB-ID-5 and PB-ID-6). | WK04, AUTH05 |
| PB-FIN-8 | No self-selected topic, interest tag or wealth segment is collected in contract 1.0. Adding one needs a clear purpose, G5 approval and a new contract version (04 §3). | WK04, ADS02 |
| PB-FIN-9 | The existing inquiry form (`lib/contact.ts`), the scheduler link and every email link are never prefilled with workshop values, and the workshop never offers "send my results to Bill". | WK04 |
| PB-FIN-10 | No server-side component computes, stores or caches a workshop result. The educational model (W00) runs in the browser. | WK04 |

### 4.2 Media requests (PB-MEDIA)

Fetching the branch clip chosen from a visitor's answers would reveal a derived result to the media origin. Opaque file names do not prevent this on their own: anyone can run the workshop once and learn which file plays for which branch. The access log of an ordinary origin also records the client IP address. So the request pattern itself must not depend on the selection (PB-MEDIA-4).

| ID | Rule | Test |
|---|---|---|
| PB-MEDIA-1 | Clip file names and URLs are opaque (content hash or neutral ID). They never carry branch meaning such as `funding-gap`, `missing-income` or a `w07`-style ID that maps publicly to a branch. This is hygiene, not the control: PB-MEDIA-4 is. | WK04, WK06 |
| PB-MEDIA-2 | Media requests carry no query string, no cookie and no identifier, and use `Referrer-Policy: no-referrer` or `same-origin`. | WK04 |
| PB-MEDIA-3 | No third-party player analytics. The media origin is treated as receiving the client IP address, because ordinary access logs record it. Its log retention is set at G5 (D-026). PB-MEDIA-4 makes sure those logs can never show a selection. | WK04 |
| PB-MEDIA-4 | **The branch-clip request pattern never depends on the selection.** On every workshop run the page requests the same fixed set of branch-clip resources (W06–W10): every file the page could play in the active locale, meaning video, poster and captions, plus any other-locale file it would offer as a fallback. It requests them in full, in the same order, at a point that does not depend on any answer: page load of the workshop route, or entry to the summary step, which a visitor can reach whatever they entered (the summary stays usable in every clip state). The set depends only on the locale and the published media manifest. Playback of the selected clip issues no further request: it plays from bytes already fetched (for example a Blob URL), with no playback-driven range request. One opaque bundle that holds all five is equivalent. A first-party origin that keeps no paths does not satisfy this rule on its own. Where `workshop-clip-rules.md` §8 lists alternatives, this rule controls. If no branch clip is `available`, no branch-clip request is made at all, for every visitor alike. | WK04 (media procedure in §5), WK06 |

### 4.3 Identifiers (PB-ID)

| ID | Rule | Enforced by |
|---|---|---|
| PB-ID-1 | Internal IDs are a type prefix plus 26 lowercase Crockford base32 characters from a CSPRNG (ULID permitted): `con_`, `cev_`, `wev_`, `reg_`, `ord_`, `rgt_`, `bkg_`, `job_`, `cnt_`, `aud_`, `opr_`. Event IDs are server-generated UUID v4 or v7. | event-envelope and delivery-job schemas |
| PB-ID-2 | Idempotency keys are `ik1_` + 64 lowercase hex (HMAC-SHA256 over internal IDs and provider event IDs, event-envelope.md §4). Purpose keys are `pk1:<contact_id>:<trigger_event_id>:<template_id>:<template_version>`. Neither can contain `@`, `.`, spaces, currency symbols or free text. | schemas; invalid examples `email-in-idempotency-key`, `email-in-purpose-key` |
| PB-ID-3 | Registry codes on contact-subject events (the guide, the workshop and consent wordings) have a **closed key set** and a **hash-only version**. The guide keys are `retirement-guide`, the workshop keys are `retirement-workshop`, and the consent purposes are `nurture` and `workshop-followup`. All are proposed, and adding one is a contract change. The version is `h` plus a 12–64 hex sha256 prefix, never `v<number>`. So no word, name, age, amount or diagnosis can be written into these codes in readable form. Content-item codes (subject `cnt_`) are asset-manifest 1.0 asset IDs (letters-and-hyphens keys, `v` or `h` version). They describe editorial items, never a visitor. The schema cannot tell a real hash from a number written in hex; PB-ID-5 closes that. | schema; invalid examples `age-in-resource-id`, `amount-words-in-workshop-key`, `diagnosis-in-workshop-key`, `age-in-guide-version`, `name-as-guide-key`, `consent-wording-mutable-version` |
| PB-ID-4 | No email, name, amount, age or question appears in an idempotency key, URL, analytics label, event ID, file name, log line or alert (04 §3). Labels use stable keys: route keys from `lib/routes.ts` and anchors such as `askVideos[].anchor` in `lib/features.ts` (codex). They never use displayed question text, because those strings contain amounts and ages ("I have $800,000. Can I retire at 62?"). | PB-SCAN, WK04, ADS02 |
| PB-ID-5 | **Registry membership.** Every registry-code `resource_id` in an accepted event is an entry of the approved resource registry (proposed; P02 builds it from the approval records: G3 hashes for guide, workshop and content versions, G5 records for consent wordings). Each entry holds the code, kind, key, version hash, locales and approval reference (event-envelope.md §4.2). A code that matches the schema but is not in the registry is rejected whole (EV-REJ-1, EV-REG-1). Entries come only from approvals, never from request input. | AUTH05 (fixture: a well-formed but unregistered code such as `workshop.retirement-workshop.h850000000000` is rejected), WK04, P02 tests; reference check in `evidence/F02/data/validate_f02_data.py` §7 |
| PB-ID-6 | **Server-set resource codes.** For `site.*` sources the server sets `resource_id` itself, from the registry entry of the guide, workshop or consent wording it served. The kind and key come from the endpoint, never from the request. A request may name at most the served version hash, and it is accepted only if it is a registry entry for that kind and key. | AUTH05, WK04 |

### 4.4 URLs and cookies (PB-URL, PB-COOKIE)

| ID | Rule | Test |
|---|---|---|
| PB-URL-1 | A URL we generate carries only the locale, route slugs from `lib/routes.ts` (for example `/fr/guide-retraite`, `/en/how-it-works`), article slugs and, where a flow needs one, a single opaque token. | WK04, ADS02 |
| PB-URL-2 | Tokens (preferences, unsubscribe, any future individualized link) are at least 128 random bits, stored only as a hash on the server, expiring and rate-limited (01 §7). The workshop invitation link is generic and forwardable in 1.0 (D-068). | AUTH03 |
| PB-URL-3 | Unsubscribe and preference links we generate never contain the address. Links generated by a provider (for example Brevo's unsubscribe link) are checked at P05; their format is unverified here. | MAIL03 |
| PB-URL-4 | Redirects never carry the destination as a free parameter (no open redirect) and never forward the query string to a third party. | AUTH03 |
| PB-COOKIE-1 | Visitors get no cookie from the site by default; this is already true on codex (`docs/INTEGRATIONS.md`). | ADS02 |
| PB-COOKIE-2 | The only first-party cookie is the operations-view session for an authenticated operator: `HttpOnly`, `Secure`, `SameSite=Strict`, never set on public routes. The review Basic Auth in `proxy.ts` is browser-managed and sets no cookie. | AUTH01 |
| PB-COOKIE-3 | Third-party or tracking cookies only when `third_party_tracking` is enabled with the G5-approved consent approach, and never on workshop routes (PB-FIN-6). No cookie ever holds a financial value. | ADS02 |

### 4.5 Operational systems (PB-SUPA, PB-N8N, PB-BREVO, PB-STRIPE, PB-CAL)

| ID | Rule | Test |
|---|---|---|
| PB-SUPA-1 | Supabase holds only the tables in `operational-data-model.md`. No column name contains a PB-SCAN-1 financial, age, health or derived-selection token. | AUTH01, P01 security tests |
| PB-SUPA-2 | Email and first name exist only in `contacts`. Every other table refers to people by `contact_id`. | AUTH01 |
| PB-SUPA-3 | No full IP address, user agent or device fingerprint is stored, even if a form library offers it (04 §2). | AUTH01 |
| PB-SUPA-4 | RLS is enabled on every table. Roles `anon` and `authenticated` have no grants and no policies. The service-role key never reaches a browser. Server code uses scoped procedures only. | AUTH01, AUTH02 |
| PB-N8N-1 | n8n receives internal IDs, template IDs and job state. It obtains a recipient address only by calling the scoped operation for a job it has leased, and passes it straight to Brevo. | AUTO02 |
| PB-N8N-2 | Execution data saving is minimized (errors only, or pruned quickly; values set in P03) and never contains a financial value. | INF02, WK04 |
| PB-N8N-3 | n8n never accepts a URL, SQL fragment, JavaScript snippet or template name from a payload that turns into privileged work (04 §4). Template IDs are the closed E01–E16 enum. | AUTH05 |
| PB-BREVO-1 | Brevo contact attributes are limited to the eight fields of 01 §12: language, consent status, guide requested, event registration, workshop completion (a boolean or date, never a result), book entitlement, booking stage, suppression. No free text, no amounts. | MAIL02, ADS02 |
| PB-BREVO-2 | Message content comes only from approved template versions (G3 hash). No per-recipient generated text and no workshop figures. | MAIL01, CNT05 |
| PB-BREVO-3 | Brevo's blocklist and unsubscribe signals flow back and win over application state; an upsert never removes a Brevo block (AM-CONSENT-2). | MAIL03 |
| PB-STRIPE-1 | Checkout session metadata carries only `contact_id`, `order_id` and the product version. No workshop data, no answers, no email in metadata. | PAY01, AUTH02 |
| PB-STRIPE-2 | Card data never touches the app (hosted checkout). The shipping address stays in Stripe unless G5 approves a necessary copy (04 §2). | PAY03, OPS03 |
| PB-CAL-1 | Scheduler intake questions ask for no balances, amounts, account numbers or documents; their wording is approved at G3/G5. | BOOK01 |
| PB-CAL-2 | We never prefill a scheduler or calendar link with an email, name or workshop value. Supabase stores the provider event ID, times, offer, mode and status only. | BOOK02, WK04 |
| PB-CAL-3 | **Booking-to-contact join** (authority-matrix.md AM-BOOK-3 to AM-BOOK-6; register FL-29). The booking adapter may read the invitee's address from a verified provider record only to join the booking to an existing contact. It normalizes the address, computes its `email_hmac` in application-server memory, passes only that value to `op_accept_event`, and discards the address. Only the matched `contact_id` is stored. The address never reaches `bookings`, `integration_events`, an envelope, a job, n8n, a log, an alert or a URL. The invitee's name and intake answers are not read. A booking with no match is stored without a contact, emits no event, creates no job and creates no contact row. | BOOK01, BOOK02, AUTH02, OPS02 |

### 4.6 Analytics, ads, error monitoring, logs, LLM (PB-ADS, PB-ERR, PB-LOG, PB-LLM)

| ID | Rule | Test |
|---|---|---|
| PB-ADS-1 | `third_party_tracking` and `paid_ads` default to false. With them false, no analytics or ads script, pixel or server-side conversion call exists on any route. | ADS02 |
| PB-ADS-2 | If enabled after G5 and G6, the only events are the four already allowed in `docs/INTEGRATIONS.md` (codex): meeting CTA activation, provider-accepted contact, actual guide-link activation and verified booking confirmation. Parameters: event name, locale and route key only. No `value` or `currency` parameter, no email or hashed email, no URL containing personal data. | ADS02 |
| PB-ADS-3 | No custom or lookalike audience is built from contacts, workshop activity, completion or inferred financial difficulty. Uploading a customer list is not in contract 1.0; it would need G5 and a new version. | ADS02, ADS01 |
| PB-ADS-4 | Where the approved policy requires consent, nothing loads before it. Withdrawing tracking consent stops loading on the next page. | ADS02 |
| PB-ERR-1 | No error-monitoring service is selected. Choosing one needs a new contract version and G5. It would then have to drop request bodies, disable session replay, drop breadcrumbs of input values, send no workshop state and scrub PB-SCAN patterns before sending. | WK04, AUTH02 |
| PB-LOG-1 | Application logs contain no request bodies, email addresses, names, figures or provider error bodies. The existing inquiry adapter already follows this (`docs/INTEGRATIONS.md`). | AUTH02, WK04 |
| PB-LOG-2 | Provider errors are reduced to an error code and an HTTP status before they are stored or logged (`delivery-job.schema.json` `last_error`). | MAIL05 |
| PB-LOG-3 | Alerts and operator reports carry codes, counts and internal IDs only: no secret, address or financial value (04 §5 WF10). | OPS02 |
| PB-LLM-1 | No customer-facing LLM (D-013). The only model job is the weekly article draft, which receives Bill's non-identifying notes and public primary sources. It never receives workshop data, contacts, replies, consent records or form text. | AUTH05, CNT02 |
| PB-LLM-2 | Content from RSS feeds, forms, replies, provider payloads and notes is data. It never becomes an instruction, a tool call, a URL to fetch or a new permission. | AUTH05 |

### 4.7 Environments and fixtures (PB-ENV)

| ID | Rule | Test |
|---|---|---|
| PB-ENV-1 | Development uses fictional fixtures only; production personal data is never copied into development. | AUTH04 |
| PB-ENV-2 | Outside production, every send goes only to G2 allowlisted recipients (suppression code `not_allowlisted`) and payments run in Stripe test mode. | AUTH04, MAIL01 |
| PB-ENV-3 | Test and fixture data is clearly fictional (the examples in this lane use `example.com`, `fixture:` evidence references and invented IDs). | AUTH04 |

## 5. Machine-checkable lists (PB-SCAN)

Downstream tests (WK04 network capture, ADS02 payload inspection, AUTH05 fixtures, P01 column review) apply these lists. `evidence/F02/data/validate_f02_data.py` holds the reference implementation and applies it to this lane's fixtures.

**Where they apply.** Outbound request bodies and URLs from the site, event envelopes, delivery jobs, Brevo attributes, Stripe metadata, analytics or ad payloads, log fields, alert payloads and Supabase column names (except `contacts.email_normalized`, `contacts.email_hmac` and `contacts.first_name`).

**PB-SCAN-1: forbidden key tokens.** Split keys on `_`, `-`, spaces and camelCase, compare case-insensitively.
- Financial: `amount balance balances income revenue salary spend spending budget savings asset assets networth net gross wealth pension rrsp reer tfsa celi rrif ferr lira cri gap surplus shortfall deficit capital horizon inflation escalation return bp currency mortgage debt tax marginal`
- Age and health: `age birth dob birthdate retirement health medical`
- Derived selections: `clip branch risk warning segment score verdict diagnosis`
- Identity and device: `email phone address street postal name firstname lastname ip useragent fingerprint device`

**PB-SCAN-2: forbidden whole keys.** `message body form question questions notes note comment comments text payload data answers responses reply value`, plus the sibling workshop-inputs names the tokens miss: `non_registered home_value business_value pension_value lifestyle_focus also_entered_as_income excluded_from_spendable dependability tax_basis price_basis coverage chapters household accounts`.

**PB-SCAN-3: forbidden value patterns** (URLs, analytics labels, log lines, event and job strings):
- an email shape `[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}`. The only exception is `delivery_jobs.provider_message_id`, because RFC 5322 Message-IDs contain `@`; a test must also check that it never equals the recipient address;
- a currency symbol (`$`, `€`, `£`) or `CAD`/`USD` next to a digit;
- a formatted amount `\b\d{1,3}(?:[ ,.  ]\d{3})+(?:[.,]\d{2})?\b` (IDs and timestamps are excluded by field).

A hit fails the test unless the field is on a reviewed exception list. The initial list is `provider_message_id` for the email shape only; adding anything needs a contract change.

**WK04 canary procedure (proposed).** Enter fictional, distinctive values, for example monthly spending 4817 (annual 57804), pension income 23719 a year, savings 386152 and home value 612409. Capture every request, response header, cookie, Web Storage entry and console message during a full run: fill in, edit, skip, reset, print, reload and follow the next-step links. Search the capture for each canary as plain digits and in common formats (`4 817`, `4,817`, `4817.00`, `4 817,00 $`). Search also for the derived gap the model shows for those inputs. Expected result: no hit, and no non-static request during the interaction (PB-FIN-5). Ages cannot serve as canaries because they are too common, so the zero-request assertion and PB-SCAN-1 cover them.

**WK04 media procedure (proposed, PB-MEDIA-4).** Use the clip-rules fixtures to drive one full run for each selection (W06, W07, W08, W09, W10 for `core_inputs_missing`, W10 for `neutral_fallback`) and one run with no answers, in each locale. For every run, record each media request: method, full URL, `Range` header, response size and order. Also record any media request made after the summary is shown. Expected result: within a locale, the recorded lists are identical across all runs. Playing the selected clip adds no request. No media URL carries a query string, cookie or identifier (PB-MEDIA-2). A run that fetches only the selected clip fails, whatever its file names.

## 6. What each downstream check asserts

| Check | Owner task | Rules it must assert |
|---|---|---|
| WK04 | W04 (with N03 and L00) | PB-FIN-1 to 10, PB-MEDIA-1 to 4 (the identical branch-clip request pattern, by the media procedure), PB-ID-3 to 6, PB-URL-1, PB-SCAN-1 to 3 and the canary procedure |
| ADS02 | R02 (and L00 for off-by-default) | PB-ADS-1 to 4, PB-COOKIE-1 and 3, PB-FIN-6 and 8, PB-BREVO-1, PB-SCAN |
| AUTH05 | L00 (fixtures from P02, N00, N08) | PB-N8N-3, PB-LLM-1 and 2, PB-URL-4, PB-ID-5 and 6 (an unregistered or request-supplied resource code is rejected), PB-FIN-7, closed enums in the event and job schemas |
| AUTH01 | P01, U05, L00 | PB-SUPA-1 to 4, PB-COOKIE-2 |
| AUTH02 | P00, L00 | PB-SUPA-4, PB-STRIPE-1, PB-LOG-1, PB-ERR-1, secrets never in logs or exports |
| MAIL02, MAIL03 | U04, N01, N07 | PB-BREVO-1 and 3, PB-URL-3, AM-CONSENT rules (a revocation suppresses `pending` and `retry_due` jobs, and a leased job is stopped at its pre-send check: job-state-machine.md JS-SUPP-1 to 3) |
| BOOK01, BOOK02 | N06, U02 | PB-CAL-1 to 3, AM-BOOK-1 to 6: a booking changes state only from provider or operator evidence; the contact join is an exact address match whose address is never stored; an unmatched booking emits nothing and is listed for the operator (OPS02) |
| OPS03 | U04, N07, WF11 | data-flow-register retention rows (after G5), PB-STRIPE-2 |

## 7. Open items (not decided here)

| Item | Owner | Where asked |
|---|---|---|
| Retention periods for every stored class; processor list and regions; consent wording per purpose; single or double opt-in; the Quebec privacy assessment | Privacy and operations owner (G5) | HB-27, HB-21 |
| Browser-storage expiry (7 days proposed) and the shared-device wording | G5 with the reviewer | HB-26, HB-27 |
| Media origin and its log retention | Arnaud (cost), A3 (estimate), G5 | D-026 |
| Whether an error-monitoring service is wanted | Arnaud, G5 | not asked yet: new contract version first |
| Retiring Resend and Upstash (existing inquiry path, `lib/contact.ts`) | Arnaud, G5 | HB-06, D-051 |
| Exact Brevo unsubscribe-link and message-ID formats | A4 at P05 | TB-06 (egress blocked here) |
| Which PB-MEDIA-4 variant W03/W04 implement (fetch all at page load, fetch all at summary entry, or one bundle), and its cost in the MED02 bandwidth estimate | W03/W04 with A3; A0 records it in D-026 | D-026 |

## 8. Changes in F02 repair attempt 2 (design review `reviews/F02-design.md`)

- A6D-02: PB-MEDIA-4 added. PB-FIN-5 now allows media only under it. PB-MEDIA-1 and PB-MEDIA-3 corrected (opaque names are not the control, and origin logs hold the IP address). WK04 asserts PB-MEDIA-4 with the media procedure in §5.
- A6D-03: PB-ID-3 now states what the schema really enforces (closed keys and hash-only versions on contact-subject codes). PB-ID-5 (registry membership) and PB-ID-6 (server-set codes) cover what the schema cannot see. PB-FIN-7 names its three layers. Five new invalid envelope examples.
- A6D-05: the data model's PB-SCAN-1 list now equals §5 (`balances`, `assets`). The harness checks both lists against its own.

## 9. Changes in F02 repair attempt 3 (design review `reviews/F02-design-attempt2.md`)

- A6D2-02: PB-CAL-3 names the booking-to-contact join and its privacy basis. The invitee address is a transient DC-CONTACT matching key on the application server (register FL-29), used only through its `email_hmac` and never stored. The DC-BOOKING-INTAKE row says so. §6 gains a BOOK01/BOOK02 row.
- A6D2-01: the MAIL02/MAIL03 row in §6 now cites the job-state-machine.md rule for a revocation that meets a leased job.
