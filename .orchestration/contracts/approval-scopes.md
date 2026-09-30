# Approval scopes 1.0: gates G0–G6 as an operational contract

- Task F02, offers lane. **Status: proposed, submitted, not accepted.** Base HEAD `5cbbf9b5d21dbf03d2cb44e524a6fcdc10d5515b`. The existing mechanism (§3) was read from `origin/codex/desktop-iphone-unified@66cce52`. `lib/articles.ts`, `content/approvals.json`, `scripts/verify-publication.ts`, `scripts/content.ts`, `scripts/launch.ts`, `scripts/protections.ts`, `docs/CONTENT-WORKFLOW.md` and `.github/workflows/verify.yml` are byte-identical on `origin/main@77de3bd`.
- **This file records no approval.** No G0–G6 record exists today (decisions.md, blockers.md "Gate mapping"). Every ledger, path and script marked "proposed" does not exist.
- It complements authority-matrix.md §4 (what each gate can and cannot make true for data, events and flags) and feature-flags.md §3 (the five readiness states). It adds the per-artifact-class rules, the hash binding, invalidation, who may write, and the worker handoff (§8).
- Sources: 06 gate registry and input sheet; 01 §4, §5, §13, §14, §16; 04 §1, §7, CNT05, CNT06; 03 (shared contract, A6, handoff); decisions D-006, D-043, D-059, D-061; blockers HB-11, HB-21 to HB-29.

## 1. The gates, operationally

| Gate | Owner (06) | Scope type | Recorded as | Where the record lives | Unlocks | Never unlocks |
|---|---|---|---|---|---|---|
| **G0** | Arnaud, plus Bill where relevant | Configuration choices: host, canonical branch, audience, language and geography, event date and cap, scheduling owner, book price and cap, time allocation | The human's answer, dated and attributed; A0 transcribes it | `.orchestration/decisions.md#D-nnn` (blockers.md, "How to answer") | Configuring the chosen production design; the offer-matrix values it names | Any content approval, send, publication or purchase |
| **G1** | Bill plus the required firm reviewer | Professional facts and offer terms: identity, designations, affiliation, service scope, the 15-minute and 30-minute offer wording, publication claims | A claim or wording record naming the exact claim text and its sources | H00 approval packet `.orchestration/approval-packets/…` (proposed) | Using those claims in final copy | A draft being created (drafts need no gate); an asset hash approval by itself |
| **G2** | Account owner, or Arnaud | **One named action** in one environment: an account, least-privilege access, staging or live-test permission, spend cap, allowlist | An action scope: action, environment, account, allowlist reference, cap, expiry | H00 packet; caps in `costs.json` `authorized_caps` | That action only, for example allowlisted test sends from staging | Public launch; the full list; any other action (06: "Permission to test one email does not permit sending the full list.") |
| **G3** | Bill plus the required firm reviewer | **Exact artifact hashes**: pages, book, scripts, cases, articles, ads, email templates, calculations | The reviewer's own recorded decision on an exact hash | `content/approvals.json` (articles, existing); proposed `content/asset-approvals.json` or an H00 packet for other classes (§4) | Publication eligibility of that exact version | Any later version, another locale or channel, future weekly posts (06: G3 is asset-scoped) |
| **G4** | Bill plus the relevant rights holders | Real recordings, portrait and art rights, recording consent, replay release policy | A rights or consent record on the exact media bundle hash, or a policy record | H00 packet; signed documents in owner-controlled storage (blockers HB-22) | Connecting real Bill media, distributing recorded material | Synthetic stand-ins presented as Bill (D-016) |
| **G5** | Privacy and operations owner | Data flows, privacy assessment, consent wording, retention, processors, incident owner, fulfilment, refund and cancellation process | Decision record plus the hash of the approved wording | H00 packet; decisions recorded in decisions.md | Processing personal data in the agreed scope | Any processing outside the recorded purposes |
| **G6** | Arnaud or Bill as appropriate | One release step: release manifest, acceptance evidence, active flag list, ads scope, rollback plan, named operator | Signature of the release record | `.orchestration/release.json` (L04, proposed) | Controlled public activation of that step | Ad spend beyond the separately approved cap; an agent saying "ready" (06) |

**AS-GATE-1.** A gate is recorded only by its human owner(s). Agent roles A0–A6 never record, imply or pre-fill a gate decision (D-043, AM-GATE-1). A0 may transcribe a G0 answer from the owner's direct reply, citing when and where it was given. A0 may assemble H00 packets. The decision fields of a G1, G3, G4, G5 or G6 record must come from the owner's own recorded action (§5).

**AS-GATE-2.** A chat "yes" or "OK" is not an approval of an artifact (blockers.md "How to answer", point 5). G1, G3, G4 and G5 need a record that names the reviewer, the date and the exact hash or scope.

## 2. Which artifact classes need which gate

"Hash method" names the fingerprint in §4.2. G3 is always per exact version and per locale. The gates listed are the records the approval must rely on.

| Artifact class (examples) | Needs | Hash method | Record (existing or proposed) | Also required |
|---|---|---|---|---|
| Articles (13 packages, C04, C05) | G3; G1 if the article states credentials or an offer; firm approval when `firmApprovalRequired` | `articles-contentFingerprint-v1` (existing) | `content/approvals.json` + merged review PR (existing, §3) | Fresh source check before each publication (05 §6) |
| LinkedIn adaptation of an article | its own G3 (approving the article does not approve it) | `file-sha256-v1` | proposed asset ledger or H00 packet | Authorized posting or a manual package (N08) |
| Site page copy (`lib/pages.ts`, `lib/copy.ts`, component text) | G1 (claims, service scope, business details) + G3 | `rendered-text-sha256-v1` per route, plus the source commit (proposed) | H00 packet + the 8 existing `business.approvals` flags, set by humans | `launchApproved()` still needs `PUBLIC_LAUNCH=true` |
| Free PDF and printed book (each locale; print master separate) | G0 (which book) + G1 (claims) + G3 (exact file) + G4 (cover, portrait) | `file-sha256-v1` | H00 packet; `business.guides[lang] = {path, approved: true}` (existing field on main and codex) | offer-matrix `approved_editions` and `approved_print_editions` cite it |
| Offer wording: meeting page, book terms, the 8 disclosures, AD04, AD06, E05, E12, E13 | G1 + G3; plus the G0 values and G5 process for disclosures | `file-sha256-v1` or `json-canonical-sha256-v1` | H00 packet | offer-matrix fields recorded first (offer-matrix.md §2) |
| Scripts: 18 capsules, 18 companion briefs, 12 workshop clips, 10 cases, host lines | G3 on the script hash (this permits **recording**, not publication); G1 if credentials or offers are stated | `file-sha256-v1` | H00 packet | Bill records only approved scripts (05 §10) |
| Recordings: masters, edits, captions, transcripts, posters | G3 + G4 on the media bundle; the script approval does not carry over | `bundle-sha256-v1` over master, captions, transcript and poster hashes | H00 packet + G4 consent reference | Captions in another language do not count as a recording (05 §3) |
| Workshop calculations: W00 model, units, defaults, rounding, fixtures, assumption copy, clip-selection rules | G3 (calculations); reviewer per HB-26 | `bundle-sha256-v1` over the model files, fixtures and displayed assumption strings | H00 packet | No verdict, no safe-withdrawal rule (01 §9) |
| Email templates E01–E16 and operational notices | G3; G5 (classification, consent wording, footer); G1 if an offer is stated | `json-canonical-sha256-v1` over subject, preview, plain text, HTML, footer, CTA route, purpose, eligibility, timing, expiry, suppressions | proposed asset ledger; the dispatcher's `template_version` = `h` + sha256 prefix (delivery-job schema) | N02 sends only approved versions (PB-BREVO-2) |
| Ads AD01–AD06, RT01–RT03 | G3 (copy, crop, landing page) + G1 (offer claims) + G5 (tracking); spend is G2 cap plus G6 scope | `bundle-sha256-v1` | H00 packet | ADS01 verification of current platform rules |
| Ink art A01–A08, other illustrations, portrait | G3 (visual family approved by Bill and Arnaud, 05 §5) + G4 (portrait rights, provenance) | `file-sha256-v1` (SVG or raster) plus alt text | H00 packet | `portraitRights` flag stays false until G4 |
| Crossroads kit: decks, answer key, scorecard, recording disclosure, replay description | G3 + G4 (recording disclosure, replay policy) + G0 (date, cap) | `bundle-sha256-v1` | H00 packet | EV02 fairness audit is technical, not approval |
| Consent wording, privacy policy, retention statements, scheduler intake questions | G5 + G3 | `file-sha256-v1` | H00 packet; `privacyPolicy` flag | PB-CAL-1 |
| Testimonials and review requests | G1 + G3; none exist | `file-sha256-v1` | H00 packet | HB-29 policy first |
| Code, workflow exports, migrations | **not content approval**: A6 technical verification; G2 to connect credentials; G6 to activate | commit SHA and export hash | reviews/, release.json | Changes to permissions, reviews and release guards need independent review (01 §14) |
| Feature flags | G6 per flag in production, with the gates in feature-flags.md §2 | config hash | release.json | FF-APPR-1: `approved` is recorded by human roles only |

## 3. The existing hash-bound mechanism (facts)

It exists only for **articles**. F00 found that it exists but is not enforced (D-059): `content/approvals.json` is `{}` on every branch, 0 articles are published, there is no CODEOWNERS file, no branch is protected, `protections:check` cannot run here (no `gh`) and `verify-publication` passes vacuously.

**Fingerprint.** `parseArticle` in `lib/articles.ts` computes `data = articleSchema.parse(JSON.parse(frontmatter))`. zod builds `data` again as a new object in `articleSchema` key order. `contentFingerprint(data, body)` then removes `status`, `reviewer`, `publicationDate`, `substantiveReviewDate` and `nextReviewDate` and hashes `sha256(JSON.stringify({...substance, body}))`. `body` is the raw markdown after the frontmatter. French typography is applied after hashing, for display only, so the hash covers the raw text and not the displayed text.
- Covered: `language`, `translationGroup`, `slug`, `title`, `description`, `topic`, `sources` (each as `{title, url, accessed}`), `author`, `relatedServices`, `relatedArticles`, `generation`, `firmApprovalRequired`, then `body`.
- **Key order follows `articleSchema`, not the file.** The hashed JSON is always in `articleSchema` declaration order: the list above, then `body`. So reordering keys in the file does not change the hash, at the top level or inside a source object, and neither does frontmatter whitespace or indentation. Such a harmless edit leaves the approval valid. A test that expects a key reorder to block publication is wrong. Reproduced against the real `lib/articles.ts` (blob `df24ccb`, the same on main and codex, zod 4.6.5) in `evidence/F02/offers/fingerprint-key-order.log`, which confirms A6's `07-fingerprint-key-order.log`.
- These changes do alter the hash: any covered value, `sources` array order, `relatedServices` or `relatedArticles` array order, and any byte of the body, including whitespace. zod keeps these values as written (no URL normalization, so a letter-case change in a URL changes the hash).
- Not covered: the five excluded fields. An unknown key inside a source object is also not covered, because `z.object` strips it silently (only the top level is `.strict()`). An unknown top-level key makes `parseArticle` throw, so that file has no fingerprint.
- It is a canonical-JSON fingerprint in schema order, not the file's byte hash. Any reimplementation, such as the proposed `scripts/verify-assets.ts` or a CX-15 conformance test, must either call `parseArticle` or reproduce exactly this order. Sorted keys (`json-canonical-sha256-v1`) give a different hash.

**Ledger.** `content/approvals.json` is keyed by article filename. Each entry is `{sha256, pullRequest, humanReview, firmApproval | null}`.

**Runtime gate.** `approvedArticle(a)` requires all of these:
- `status: "published"`, and `author`, `reviewer`, `publicationDate`, `substantiveReviewDate` and `nextReviewDate` present;
- a ledger entry whose `sha256` equals the current fingerprint;
- `pullRequest` matching `https://github.com/<owner>/<repo>/pull/<n>`;
- `humanReview` present;
- `firmApproval` present when `firmApprovalRequired`.

Only such articles reach public article routes, listings, the sitemap and hreflang. `/revision/*` shows drafts, labelled, only when review is on.

**CI verifier.** `scripts/verify-publication.ts` runs in the `verify` job (`.github/workflows/verify.yml`, on pull requests and pushes to main) with `GH_TOKEN`, `GITHUB_REPOSITORY`, and `CONTENT_REVIEWERS` and `FIRM_REVIEWERS` from repository variables. For each published article it checks:
1. `approvedArticle` holds.
2. The review PR belongs to this repository and is merged.
3. The **latest** review by a configured content reviewer is `APPROVED`, at the PR head commit, with the exact `humanReview` URL. The same holds for a configured firm reviewer and `firmApproval` when required. Reviews are read with `per_page=100` and no pagination. A review beyond the first 100 is not found, so the check fails closed, as `docs/CONTENT-WORKFLOW.md` states.
4. The article file fetched at the PR head has the **same fingerprint** as the file being published, so the publication PR can change only the excluded metadata.

It never approves or edits anything.

**Command-line guards.** `scripts/content.ts`:
- `validate` refuses a published article without current evidence, and a draft that claims a reviewer, publication or review dates.
- `import` accepts only unreviewed drafts and never overwrites.
- `pr` needs `ALLOW_CONTENT_PR=true` and opens only a draft review PR.
- `review-due` warns when `nextReviewDate` has passed.

`scripts/protections.ts` checks the branch protection: at least one approving review, stale-review dismissal, code-owner review, last-push approval, admin enforcement, and a strict `verify` status check.

**Process** (`docs/CONTENT-WORKFLOW.md`): two PRs. First an editorial review PR, approved by the real reviewers on the latest substantive commit and merged. Then a publication PR that sets status, reviewer and dates and adds the ledger entry. An offline approval must first be recorded **by the actual reviewer** in the review PR; the automation never supplies their identity.

**Launch guard.** Separately from content, `lib/business.ts` holds 8 approval flags, all false: `businessDetails`, `serviceScope`, `qualificationsAndAffiliation`, `portraitRights`, `websiteCopy`, `privacyPolicy`, `legalNotices` and `contactOperations`. `scripts/launch.ts` blocks while any is false, and `launchApproved()` gates the proxy and indexing. Agents never flip them (D-061).

## 4. Extending the same mechanism to other artifact classes (proposed)

The principle stays the same: a canonical fingerprint, a human-reviewed ledger entry bound to that fingerprint and to the reviewer's own recorded action, a CI verifier that recomputes it, and a runtime or publish guard that refuses anything else.

### 4.1 Ledger
- Keep `content/approvals.json` exactly as it is, for articles. `lib/articles.ts` reads it by filename, and changing its shape would touch a guarded file for no gain.
- Add **`content/asset-approvals.json`** (proposed). It is keyed `<asset_id>@<locale>@v<version>`, using asset-manifest 1.0 IDs. Each entry holds:
  - `sha256` and `method` (§4.2) and `source_path`;
  - `pullRequest`, `humanReview` and `firmApproval | null`, with the same meaning as for articles;
  - `gates` (the gate records this approval relies on);
  - `g4_record | null` for media;
  - `depends_on`: `{offer_matrix: "1.0", offers: [...], claim_ids: [...], calculation_bundle: sha256 | null}`;
  - `approved_on`.
- Where the reviewer uses the offline route (HB-11: Bill may not have a GitHub login), the H00 packet in `.orchestration/approval-packets/` (proposed) holds the same fields plus the location of the reviewer's own recorded statement. The ledger entry then cites the packet.

### 4.2 Fingerprint methods

| Method | Used for | Definition |
|---|---|---|
| `articles-contentFingerprint-v1` | articles | Existing `contentFingerprint` (§3): sha256 of `JSON.stringify` (no whitespace) over the output of `articleSchema.parse`, which lists keys in zod schema declaration order. The five non-substantive fields are removed and `body` is appended last. Key order in the file does not matter; the zod schema order is part of the method. Changing `articleSchema` key order, or changing its fields, creates a new method version (`-v2`), which requires every article to be approved again |
| `file-sha256-v1` | scripts, PDFs, SVGs, single-file copy | sha256 of the exact file bytes (UTF-8, LF, no BOM for text) |
| `json-canonical-sha256-v1` | email templates, structured copy | sha256 of the JSON with sorted keys, no insignificant whitespace, UTF-8. Only fields the class declares non-substantive (status and review dates, as for articles) are excluded, and the exclusion list is part of the method |
| `bundle-sha256-v1` | recordings, ads, calculations, event kits | sha256 over the sorted lines `<relative path>\0<sha256 of file>\n` of every member file. A member missing or added changes the hash |
| `rendered-text-sha256-v1` | site pages | sha256 of the normalized visible text of the route, rendered from the release commit by a test (R00 or H00), stored with that commit SHA. Human approval covers what is actually shown (01 §14) |

### 4.3 Verifier and guards (proposed owners)
- **Verifier.** A `scripts/verify-assets.ts` modelled on `verify-publication.ts` (H00 defines it, R00 and N08 run it in CI). For every asset used by the release it checks: merged review PR in this repository, a configured reviewer's latest `APPROVED` review at the PR head, the recomputed fingerprint of the file at the PR head, the ledger `sha256`, and the fingerprint of the current file. All must match.
- **Guards.** Every path that serves, sends or publishes an asset refuses anything without a ledger entry equal to its current fingerprint:
  - N02 sends a template only if its `template_version` is an approved `h<sha>`.
  - W03 plays only approved media IDs.
  - WF09 publishes only approved hashes and records `content.published` after the live check (AM-PUB-1).
  - The book page shows only an approved print edition.
- **Articles** keep using the existing path unchanged.

## 5. Who may write approvals

- **AS-WRITE-1.** Only human gate owners write approval decisions: `bill`, `firm_reviewer`, `privacy_owner`, `account_owner` and `arnaud`. Arnaud decides G0, G2 and G6 and operates merges; content approval (G3) belongs to Bill and the firm reviewer (06; D-043; HB-11 proposal). The same five role names are the only values accepted by the schemas: `recorded_by_role` (offer matrix), `approved_by_roles` (asset manifest) and `recorded_by` for `approved` (feature flags, FF-APPR-1).
- **AS-WRITE-2.** Workers and A0 cannot create or edit a decision in any ledger. That covers `content/approvals.json`, the proposed `content/asset-approvals.json`, the decision fields of approval packets, `business.approvals`, the `approved` state in flag documents and the G6 record in `release.json`. They may prepare packets, compute hashes and propose PRs. The decision's validity rests on evidence an agent cannot produce: the reviewer's own GitHub review from their own login, or their own recorded statement in the PR or in owner-controlled storage.
- **AS-WRITE-3. Enforcement** (proposed, needs HB-11):
  - CODEOWNERS naming real people for `content/approvals.json`, `content/asset-approvals.json`, `.orchestration/approval-packets/`, `lib/business.ts`, flag documents, `.orchestration/release.json`, `proxy.ts`, `scripts/verify-*.ts`, `scripts/launch.ts` and `.github/`;
  - branch protection as `scripts/protections.ts` expects;
  - reviewer lists in the `CONTENT_REVIEWERS` and `FIRM_REVIEWERS` repository variables.

  Until then the rule is procedural. A6 checks it at L00 with `git log --format='%H %an %ae' -- <ledger paths>` and by confirming that every approval URL resolves to a review by a configured human. CNT05 must include "edit the approval ledger as a worker": the release must stay blocked.
- **AS-WRITE-4.** No agent can approve a change to the guardrail that gives itself authority (01 §5). Changes to reviews, permissions and release guards need independent review (01 §14).

## 6. What invalidates an approval

**Mechanical invalidation (AS-INV-1).** Any change to fingerprinted content produces a new hash. The old ledger entry no longer matches, so the artifact is unpublishable until a new approval exists. No human judgement is needed. It covers changes to:
- a title, body, claim, source or author;
- a calculation: formula, constant, default, rounding, unit or displayed assumption;
- an offer statement or CTA;
- a template's eligibility, timing, expiry or suppression fields;
- an ad's landing page or crop;
- a media master, captions or poster;
- a clip-selection rule.

**Not invalidating (AS-INV-2).**
- Fields the method declares non-substantive. For articles these are `status`, `reviewer`, `publicationDate`, `substantiveReviewDate` and `nextReviewDate`, which the publication PR may set.
- Display-only transforms (French typography).
- For articles: key order and whitespace in the frontmatter JSON, because `articles-contentFingerprint-v1` hashes the output of `articleSchema.parse` in schema order (§3). Array order and any byte of the body do invalidate.
- Unrelated code: a content or media change does not invalidate `code_ready` or `provider_tested` evidence of unrelated capabilities (04 §7).

**Dependency invalidation (AS-INV-3).** Some approvals lose validity without their own bytes changing. The ledger's `depends_on` makes these explicit, and the verifier fails when a dependency moved:
- **Offer change.** A new offer-matrix version, or a recorded G0 value an asset states (price, cap, validity, modality), voids every approval whose `offers` or asset `offer_refs` include that offer.
- **Claim change.** A G1 fact changes (designation, affiliation, years of experience, service scope), or a source in the claims ledger (C00) is superseded. Every approval with `credential_claims` or that `claim_id` is void.
- **Calculation change.** A new calculation bundle hash voids the approval of the bundle, the approval of any clip-selection rule and of W05–W10 scripts that describe changed logic, and the summary copy that displays it.
- **Freshness.** `nextReviewDate` passed. Today `review-due` only warns. Proposal: WF09 refuses a new publication past that date; already published items are flagged to the operator, not silently removed.
- **Rights or consent.** A G4 consent or licence is withdrawn: the media approval is void, and the asset is taken down per the G4 policy.
- **Withdrawal.** The reviewer withdraws the approval, recorded like an approval.

**Scope limits (AS-INV-4).** An approval never covers another locale, another version, another channel (the LinkedIn adaptation), the recording of an approved script, or future posts of a series (06: G3 is asset-scoped).

## 7. Technical verification (A6) versus human approval

| | Technical verification | Human approval |
|---|---|---|
| Who | A6 in a fresh context, not the implementer (03 A6) | The gate owners in §1 |
| Question answered | Does the artifact behave as its contract says? | May this exact thing be used, published, processed or activated? |
| Output | `pass`, `fail`, `blocked` or `not_run`, with reproduction and evidence (D-038) | Approve, reject or request changes, on an exact hash or scope, with name and date |
| Evidence location | `reviews/<task>.md`, test logs, hashes | ledger entry, approval packet, `release.json` G6 record |
| States it can support | `code_ready` (A0 records it after A6 evidence), `provider_tested` (with the operator), `live_verified` | `approved`; the `business.approvals` flags; G6 enablement |
| Can never | Approve content, sign as Bill or the firm, flip flags, turn "not run" into "pass" | Replace tests; extend an approval beyond its hash or scope |

- **AS-SEP-1.** H00 packets list A6 evidence in a separate section labelled "technical checks, not an approval".
- **AS-SEP-2.** A6 findings on factual accuracy (CNT02, CNT03) inform the reviewer; they are not the approval.
- **AS-SEP-3.** A green CI run, a passed schema or a merged PR is never a G3 record (authority-matrix.md, "Content approval").

## 8. Worker handoff 1.1 (`worker-handoff.schema.json`)

The worker handoff is a **submission**, not an approval. Its schema lives in this lane; this section gives its semantics.
- **WH-ST-1.** `status` is always `submitted`. Workers cannot mark work accepted; A0 writes acceptance separately after A6 evidence (03, D-037).
- **WH-SHAPE-1, WH-REQ-1.** The object has exactly the 13 fields of the 03 example, all required, and nothing else. For example, no `accepted_by` field.
- **WH-PH-1, WH-PH-2.** No placeholders. `base_commit` is 40 lowercase hex. `result_commit` is 40 lowercase hex or `null` when uncommitted (WH-SHA-1). Artifact `sha256` is 64 lowercase hex (WH-SHA-2). The 03 example strings (`actual-sha`, `actual-hash`, `actual command`, `actual path`, `actual/path`), `TODO`, `TBD`, `xxx` and `<…>` are refused. The 03 example submitted verbatim fails.
- **WH-ID-1.** `task_id` is one of the 63 IDs in `tasks.json`: the 62 planned IDs and the split task F02a (D-072), which worker handoff 1.1 lists explicitly (A0 patch 1, D-074). A split task needs a contract minor version, and its ID is listed explicitly; no generic suffix is accepted.
- **WH-PATH-1, WH-PATH-2.** `changed_paths`, artifact paths and evidence paths are repo-relative POSIX paths with no leading `/`, no `..` segment and no whitespace. Parentheses are allowed, as in `app/(entry)/page.tsx`. Notes go in `assumptions`, not in paths.
- **WH-ART-1.** At least one artifact is listed with its hash.
- **WH-TEST-1.** `exit_code` is an integer from 0 to 255, or `null` when the exit status was not captured (explain it in `assumptions`).
- **WH-ENV-1.** `environment` starts with `local`, `ci`, `staging`, `provider-sandbox` or `production`, so that fixture, sandbox and live evidence stay distinct (03).
- **WH-BLK-1.** `blocked_checks[]` is `{check, status: blocked | not_run, reason, owner?}`. The vocabulary is D-038's; a check is never `pass` there.
- **WH-EXT-1.** An `external_actions_taken[]` entry with `effect: side_effect` must carry `authorization: G<n>:<record path>`, pointing at decisions.md or an approval packet.
- **WH-COST-1, WH-COST-2.** `metered_cost.status` is `unavailable-not-estimated` (amount and currency `null`: no estimate is ever written) or `provider-metered` (a number, an ISO currency and a `source` run record). This matches `costs.json`.

**`handoffs/F00.json` result** (validation log §4, F00.json unchanged): **does not conform to 1.0 or 1.1**, with 6 mismatches, both shape problems rather than wrong evidence:
1. `changed_paths[2..5]` carry prose notes such as `".orchestration/evidence/F00/ (untracked; …)"` (WH-PATH-2).
2. `blocked_checks[5]` and `blocked_checks[6]` use `status: "not_visible"`, which is outside the D-038 vocabulary (WH-BLK-1). `blocked` fits both.

F00 was written before this contract existed. Whether to reissue it is A0's decision; nothing here changes its accepted status. `examples/valid/worker-handoff/normalized-f00-subset.json` shows the same real values in conforming shape.

## 9. Rule index

AS-GATE-1, AS-GATE-2 (§1) · AS-WRITE-1 to AS-WRITE-4 (§5) · AS-INV-1 to AS-INV-4 (§6) · AS-SEP-1 to AS-SEP-3 (§7) · WH-* (§8; negative examples in `examples/invalid/worker-handoff/`) · schema-enforced counterparts: OM-DOC-1, OM-DOC-2 (offer-matrix.md), AM-APPR-1 to AM-APPR-5, AM-HASH-1, AM-KIND-1 (asset-manifest.md), FF-APPR-1, FF-APPR-2 (feature-flags.md).
