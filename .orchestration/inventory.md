# F00 inventory — repository, branches, assets, tools

- Task: F00 (owner A0, reviewer A6, stage design_or_audit, check BASE01). Status: **submitted, not accepted**. A6 verifies it separately.
- Written 2026-09-30 by an A0 delegate, from three evidence lanes (repo, assets, checks) plus A0 spot-checks (listed in §8).
- Base: `/home/user/bill` HEAD `eeb79a9380b297880e8fb530ac1f5b6f2fa7f89d` (branch `claude/orchestration-foundation`). Nothing in the repo was committed, staged or modified by F00.
- `E/` means `/home/user/bill/.orchestration/evidence/F00/`. SHAs are immutable, so every `git` command cited here reproduces its result.
- Every lane's `report.md` was not written: the harness blocked subagent report `.md` writes. The raw evidence files are the record.
- **Repair 2 (2026-09-30 ~02:52Z)** addresses A6 review `.orchestration/reviews/F00.md` (P2-1, P3-1…P3-9). New evidence: `E/repair2/` (re-gathered logs; `connectors.minimised.json`). Changed rows: §1.1 guide, §1 local state, §2.1 codex ← homepage / codex ← guide, §2.2 footnote, §6.2 original.html, §7, §8 pre-existing failures and spot-checks, §9 D1–D3.
- **Repair 3 (2026-09-30 ~03:15Z)** addresses A6 review `.orchestration/reviews/F00-attempt2.md`: P2-1 (§6.1 rebuilt), P2-2 (§2.2 row B, §8), P3-1 (§8 F00-SPOT-09 exit corrected; log-artifact errata), P3-2 (`E/repo/connectors.json` replaced by minimised content), P3-3 (§9 D3, D12 reframed), P3-4 (§1 and D2 labelled circumstantial). New evidence: `E/repair3/` (F00-SPOT-09b…14, `F00-ERRATA.log`). Raw lane logs are not rewritten; `E/repair3/F00-ERRATA.log` records how to read the three log artifacts.

---

## 1. Provenance

### 1.1 Branches (origin = `arnaudverdier8-svg/bill`, private, default branch `main`)

| Branch | Head SHA | Plan snapshot (§2) | Behind/ahead main | Commits beyond main: SHA, author, date | Evidence |
|---|---|---|---|---|---|
| main | `77de3bd51a8c9cb73aec0b32d27ca0cacb6285cd` | `77de3bd5…` **match** | 0/0 | 4 commits in total. Root is `8454981` (Arnaud Verdier <arnaud@verdierconseils.ca>, 2026-09-29 06:56 -0400, site and ink). Then `f84c60f` (film/ Remotion), `ee821cd` and `77de3bd` (monogram), all three by <arnaudverdier8@gmail.com>, 07:13–08:15 -0400 | `E/repo/branch_heads.txt`, `git log origin/main` |
| add-ask-bill-section | `01e296caf4cb6822c9ccd45642834d69e02334bf` | `01e296ca…` **match** | 0/1 | `01e296c` Claude <noreply@anthropic.com>, 2026-09-29 18:21Z, 11 files | `E/repo/branch_commits_files.txt` |
| codex/desktop-iphone-unified | `66cce52046f535ddc1a90e6f94474877e375860d` | `66cce520…` **match** | 0/3 | `01e296c`, then `d8ce2ef` and `66cce52` (arnaud verdier <arnaudverdier8@gmail.com>, 14:57 and 15:00 -0400). 24 files vs main | same |
| claude/bill-centered-homepage | `d63aabd50d0760145208857856f32779b1069e15` | none | 0/1 | `d63aabd` Claude, 2026-09-29 14:52Z. 37 files (+2177/−615), including 3 ink SVG deletions | same |
| claude/bill-presentation-video | `fc0044576d851be414d19e2f7a21ca7fd1285eae` | none | 0/1 | `fc00445` Claude, 2026-09-29 13:50 -0400. 67 files, almost all new under `presentation/` | same |
| guide/pre-retirement-guide | `749b360f75185041e1aa3408500857605bc4507f` | none | 0/1 | `749b360` Claude, 2026-09-29 09:30 -0400. 21 files (+8304/−1): 18 added under `guide/`; `M package.json` (adds `"guide"` script); `M .gitignore` (adds `guide/dist/`); **`A scripts/ink-sheet.tsx`** (65 lines, new root-level dev script; launches Chromium via `PLAYWRIGHT_CHROMIUM_EXECUTABLE`; absent on every other branch) | `E/repo/branch_commits_files.txt:181`, `E/repair2/p2-1_guide_paths.log` |
| claude/orchestration-foundation | `eeb79a9380b297880e8fb530ac1f5b6f2fa7f89d` | n/a | on top of main | `eeb79a9` Claude, 2026-09-30 01:58:43Z. 11 files, `.orchestration/` only. **Pushed**: the origin ref has the same SHA. None of the F00 lanes made this commit. | `git branch -a -vv`, `git show --stat eeb79a9` |
| refs/pull/1/head, refs/pull/1/merge | `66cce52…`, `a8e6b332e147027e28da0845a5f7a1557de43cf5` | — | — | PR #1 | `E/repo/ls-remote.txt` |

- **Ancestry.** main is an ancestor of every branch, and add-ask-bill-section is an ancestor of codex (`E/repo/ancestry.txt`). homepage, presentation and guide are each a single independent commit on main. No branch is behind main.
- **PR #1** is open, a **draft** and unmerged: head `codex/desktop-iphone-unified@66cce52`, base **`add-ask-bill-section`@01e296c** (not main). Created 2026-09-29T18:57:52Z. It is the only PR (`E/repo/github_remote.json`).
- **Branch protection.** The GitHub branches API reports `all_protected: false` for bill (`E/repo/github_remote.json`). No `.github/CODEOWNERS` exists on any branch (`git ls-tree -r --name-only origin/<b> | grep CODEOWNERS` returns nothing; also in the assets lane).
- **Local state.** Local `main` = origin/main `77de3bd`. Tracked tree clean; `git stash list` empty. Untracked, as of 2026-09-30T02:52Z (`E/repair2/F00-SPOT-05_repo_state.log`): `.orchestration/evidence/` (lanes), `.orchestration/inventory.md` and `.orchestration/handoffs/` (F00 outputs), `.orchestration/reviews/` (A6); unchanged at 03:18Z (`E/repair3/F00-SPOT-14_repo_state.log`). **Circumstantial, no recorded probe:** before F00 wrote its outputs, only `.orchestration/evidence/` was untracked. This is consistent with the evidence dir's birth time 01:53:21Z preceding commit `eeb79a9` (01:58:43Z), which contains no evidence/handoffs/inventory/reviews paths (`E/repair3/F00-ERRATA.log` [P3-4]). Six detached worktrees are kept for F03 under `…/scratchpad/wt/base01-{main,codex,homepage,guide,video,diag-main-filmdeps}`; each has only `M next-env.d.ts`, rewritten by `next build` (`E/checks/worktrees_final_status.txt`).
- **billsite.** `arnaudverdier8-svg/billsite` is public, created 2026-09-29, and **empty** (409 "Git Repository is empty", 0 branches, 0 PRs). The local `/home/user/billsite` has no commits (`E/repo/github_remote.json`). There is nothing to preserve.
- **Shared files.** No branch touches the root `package-lock.json`. Only guide touches `package.json` (it adds the `"guide"` script) (`E/repo/conflict_detail_config.txt`). guide is also the only branch adding a file to the shared `scripts/` directory (`scripts/ink-sheet.tsx`) (`E/repair2/p2-1_guide_paths.log`).

## 2. Reconciliation facts (for F03, which selects the baseline)

### 2.1 Trial-merge matrix
Method: `git merge --no-commit --no-ff` in a throwaway worktree, then abort. Nothing was committed (`E/repo/trial_merges.log`). Only the merge exit codes and `clean_after` are relied on: in the two trials with no merge state (codex ← add-ask, main ← octopus) the log's `abort_exit=0` follows "fatal: There is no merge to abort" and is a logging artifact (a real abort returns 128; `E/repair3/F00-ERRATA.log` [P3-1b]).

| Base ← merged | Exit | Conflicting paths (hunks) | Nature |
|---|---|---|---|
| codex ← add-ask-bill | 0 | — | Already up to date (add-ask-bill is an ancestor of codex) |
| codex ← homepage | 1 | `components/pages.tsx` (3), `lib/copy.ts` (2), `lib/ink-files.json` (1), `scripts/build-ink.tsx` (2), `tests/browser/site.spec.ts` (1). Also, homepage deletes `public/assets/ink/{dock.ccd6542ba7,desk-caption-en.6834acbe8c,desk-caption-fr.15f201593d}.svg` | **Design conflict.** The two hero designs compete: pages.tsx hunk sizes (lines strictly between markers) are ours 2/24/35 against theirs 6/137/4 (`E/repair2/p3-2_p2-1_trial_merges.log`; the lane's 3/25/36 counted a marker line). `copy.nav` changes from an array to an object with an `ask` entry. New eyebrow and hero copy. Tests select `.hero-person img` (codex) versus `.hero-print img` (homepage). codex still imports `Dock`, `Hiker` and `HeroDeskOverlay`, which homepage removes (`E/repo/conflict_detail_codex_homepage.txt`). The auto-merged eslint config lists `"film/**"` twice (harmless). |
| codex ← presentation | 1 | `eslint.config.mjs` (1), `tsconfig.json` (1) | Ignore/exclude one-liners only: `film` against `presentation` (`E/repo/conflict_detail_config.txt`). Hypothesis, not tested: keeping both entries resolves it. |
| codex ← guide | 0 | — | Clean. Stages 21 paths: 18 new under `guide/`, new `scripts/ink-sheet.tsx`, the `package.json` `guide` script and `.gitignore guide/dist/` (`E/repair2/p3-2_p2-1_trial_merges.log`) |
| codex ← guide + presentation (octopus merge) | 1 | `eslint.config.mjs`, `tsconfig.json` | Same as codex ← presentation |
| homepage ← presentation | 1 | `.prettierignore`, `tsconfig.json` | Ignore one-liners |
| homepage ← guide | 0 | — | Clean |
| presentation ← guide | 0 | — | Clean |
| add-ask-bill ← homepage | 1 | `components/pages.tsx` (2), `lib/ink-files.json` (1), `scripts/build-ink.tsx` (2), plus the same 3 SVG deletions | Design conflict (a subset of codex ← homepage) |
| main ← homepage + presentation + guide (octopus) | 2 | `.prettierignore`, `tsconfig.json` | git refused the octopus merge and left no merge state behind |

### 2.2 Baseline options (facts only; F03 selects, and G0 records the canonical branch)

| Option | Keeps | Loses or must port | Check state (§8) |
|---|---|---|---|
| A. codex `66cce52`, then + guide (clean), then + presentation (2 ignore lines) | add-ask-bill section and hiker; responsive work (`app/responsive.css`, `components/question-carousel.tsx`, `tests/browser/responsive.spec.ts`); `/api/guide` and the 40-page review PDF; the film/ exclusion | homepage's Bill-centred hero, Ask Bill page (`lib/ask.ts`, `components/ask.tsx`, `docs/ASK-BILL.md`, `tests/ask.test.ts`), booklet and copy rewrite | Only target green on the full CI sequence (e2e 41/41 under the substitute Chromium 141) |
| B. homepage `d63aabd`, then + guide (clean), then + presentation (2 ignore lines) | Bill-centred design; Ask Bill (`lib/ask.ts`, 12 Q&A) with **+5 unit tests** in the new `tests/ask.test.ts` (branch total 18, against 13 on every other branch; the 13 in `tests/logic.test.ts` and `tests/ride.test.ts` are byte-identical everywhere); `tests/browser/site.spec.ts` modified (+108/−4); booklet; updated COPY-STRATEGY (flags 16–22) (`E/repair3/F00-SPOT-13_unit_test_counts.log`) | add-ask-bill and codex responsive work, `/api/guide` and the review PDF. The Dock and desk-caption SVGs are deleted, and Dock is the closest seed for ink asset A06 (§4) | lint, test, build and typecheck green; **e2e not_run** |
| C. Manual integration of codex + homepage | Both | Needs a human decision on hero, nav and copy, and on the 3 deleted SVGs. 5 files to resolve by hand, without taking either side wholesale (§5 of the master plan) | not_run |
| D. main `77de3bd` plus cherry-picks | main only | Everything on the branches, unless picked | **Not green** until film/ is excluded (§8) |

On every option: guide merges clean (bringing `guide/`, `scripts/ink-sheet.tsx`, one `package.json` script and one `.gitignore` line); presentation needs the ignore-list union; `package-lock.json` is untouched. PR #1 would update add-ask-bill-section, not main.

## 3. Existing capabilities mapped to the plan
Status comes from `E/assets/gap-matrix.json` unless a check is cited.

| Plan capability | What exists (branch:path) | Status |
|---|---|---|
| Branded bilingual site (Next 16.3.6, React 19.2.4) | `origin/main:lib/routes.ts` (9 page keys; homepage adds `ask`); seeded pen ink toolkit (`docs/ART-DIRECTION.md`, `components/ink/*`) | exists |
| Review protection and noindex | `proxy.ts` (identical on all 6 branches). The matcher excludes `/assets/*`, so unapproved images are fetchable on a hosted preview | exists (gap noted) |
| Launch guard | `lib/business.ts:28-37`: 8 approval flags, all `false` on every branch; `scripts/launch.ts` | exists |
| Hash-bound article publication | `lib/articles.ts:103-128`, `scripts/verify-publication.ts`, `scripts/protections.ts`, `.github/workflows/verify.yml`; `content/approvals.json` = `{}` | exists, but unexercised: 0 published articles, no CODEOWNERS, branches unprotected, `protections:check` not runnable here |
| SEO (robots, sitemap, structured data) | `app/robots.ts`, `app/sitemap.ts`: disallow-all until launch | exists |
| Five-state feature flags (04 §7) | Only `newsletterEnabled` and `analyticsEnabled` (both false) | partial |
| Workshop Journey (4 chapters, math, summary, clip selection) | none. Precedents: `components/checklist.tsx` (local-only, print), `lib/fees.ts` (tested pure math) | missing |
| Crossroads (landing, registration, join, replay) | none | missing |
| Free PDF access | codex `app/api/guide/route.ts` (review-only; 404 when launched or when review is off) + `content/guides/retirement-review-en.pdf`; homepage `components/booklet.tsx` with `guide.pdf=null` | partial (no approved PDF) |
| Paid book, Stripe checkout, 30-minute consultation redemption | none | missing |
| Free 15-minute introduction | Meeting route `demarche/how-it-works`; `bookingUrl=https://calendly.com/bbadran`, `bookingVerified=true` (`lib/business.ts:14-15`). No duration or cost stated | partial |
| Email via Brevo | none. The inquiry form uses Resend (send) + Upstash (rate limit) (`lib/contact.ts:20-25,50,72`) | missing (Brevo); partial (inquiry) |
| Supabase operational storage | none | missing |
| Self-hosted n8n / SQLite | none (0 `n8n` hits on any branch) | missing |
| VPS hosting | none: no Dockerfile or compose file; docs are Vercel-only | missing |
| Weekly articles + LinkedIn | Publication pipeline above; article weeks 1–3 partial (seeds); no LinkedIn code | partial / missing |
| Two social videos per week | 12 of 18 capsule seeds partial; 0 recordings | partial / blocked_human |
| Consented ads and meeting follow-up | none; no Bill ad account visible (§7) | missing / blocked_human |
| Unsubscribe and preferences, ops view, runbooks | none | missing |
| Privacy page | `lib/pages.ts:276-309` (FR), `586-619` (EN): a review notice naming Resend/Upstash | partial |
| Site FAQ | homepage `lib/ask.ts` + `docs/ASK-BILL.md` (12 Q&A) | partial |

## 4. Asset register
Counts come from `git ls-tree -r [-l] origin/<branch>`. Rights and approval statuses are quoted from repo docs, not independently verified.

| Asset | Count / size | Path | Branch(es) | Documented provenance / rights / approval | Placeholder? |
|---|---|---|---|---|---|
| Site ink SVGs | 16 (main, guide, video), 17 (add-ask, codex: + hiker), 13 (homepage: −dock, −2 desk-captions) | `public/assets/ink/` | all | Drawn in code with the seeded Pen (`docs/ART-DIRECTION.md`). Some alt text is empty (`lib/ink-files.json`). No per-asset rights or checksum manifest. `websiteCopy=false` | no |
| Bill portrait | 1 (960×960, 58,948 B) | `public/assets/bill-portrait.jpg` (the same blob sits in `film/public/photos/` and `presentation/public/photos/`) | all | `portraitRights=false` (`lib/business.ts:32`); source undocumented | no |
| Reference photos | 5 | `reference/bill.avif`, `bill2.jpeg`, `bill4.jpg`, `bill5.jpg`, `bill_take_the_side.jpg` | all | Unused; rights undocumented | — |
| Review-guide cover | 1 (534×800) | `public/assets/retirement-guide-cover.jpg` | codex | AI-assisted sketch portrait with the text "BILL BADRAN FINANCIAL PLANNING" and a script signature; no approval | candidate only |
| 40-page review book (EN) | 1 PDF, 912,448 B, sha256 `9dc48a1fbda787268d63d64f3d18b6da88a49c596a1824fcd62453d54d10f8bf` | `content/guides/retirement-review-en.pdf` | codex | 40 pp, 432×648 pt (6×9 in). Title "Build a Better Retirement Together". p.39: "Illustrations use AI-assisted editorial artwork. REVIEW COPY - NOT APPROVED FOR DISTRIBUTION". **Source not in any branch. No French edition** | review edition |
| 32-page guide generator | 11 art modules; builds 4 PDFs (EN/FR × screen/print), 32 pp each, 1.1–1.3 MB | `guide/` (outputs to `guide/dist/`, which is gitignored) | guide | Code-drawn; PDFs not committed; unapproved (`E/checks/guide/07_guide.log`) | draft |
| On-site booklet | 1 component | `components/booklet.tsx` | homepage | "Avant la retraite / Before You Retire"; `guide.pdf=null`, `printedCopies=false` | draft |
| Older French guide | 1 PDF, 14 pp, 542,261 B, sha256 `38f070fee217541976511facbbf4f76e2fffb905919cb3522d93d7e3f4e806b7` | `film/assets/source/Guide_prosperite_financiere_Bill_Badran.pdf` | all | Contains invented anecdotes, a press citation and a credential line (§6). **Quarantine candidate** | — |
| Film raster art | 101 PNG (19 raw, 76 illustrations, 5 guide crops, 1 texture) | `film/assets/illustrations/raw/`, `film/public/…` | all | Canva AI; commercial terms unchecked (`film/README.md`) | yes |
| Film audio | 14 voice, 1 music, 10 sfx raw, 12 in `film/public/audio` | `film/assets/…`, `film/public/audio/` | all | ElevenLabs "Jonathan" synthetic voice, music and sfx on a **free plan, which does not allow commercial use** (`film/README.md`) | yes |
| Homepage narration | 1 MP3 (613,817 B, about 51 s) | `public/audio/journey/en.mp3` | all | **Chatterbox clone of a third-party `lawyer.wav`, speaking first-person "I'm Bill Badran"** (`docs/NARRATION.md:18,27`); labelled a stand-in | yes, **must not ship** |
| Presentation pitch assets | 24 SVG, 9 woff2 fonts, 1 texture, portrait | `presentation/public/` | video | Internal pitch video with superseded offers (§6) | internal |
| Bill video recordings | **0** (no mp4/mov/webm on any branch) | — | — | — | — |
| Drive PDFs | 2 × 27,067,783 B | Drive "bill-badran-before-retirement-guide-en-print 2.pdf" (owner arnaudverdier8@gmail.com), created 2026-09-29T18:38Z | — | Not downloaded. Size matches neither repo PDF (§9) | unknown |

## 5. Gap matrix summary
Source: `E/assets/gap-matrix.json` (sha256 `76272615ad043513ebf87397af8265aeeaa6a7ecb05c5b6255f8e27ed1822108`), 171 rows. Totals: **7 exists / 30 partial / 119 missing / 15 blocked_human**. "Partial" means reusable substantive text or art exists; it is a lane judgement, and each row states its basis.

| Group | exists | partial | missing | blocked_human | total |
|---|---|---|---|---|---|
| site_capability | 6 | 5 | 5 | 0 | 16 |
| workshop | 0 | 0 | 7 | 0 | 7 |
| workshop_clip (W00–W11) | 0 | 0 | 12 | 1 | 13 |
| crossroads_case (C01–C10) | 0 | 0 | 10 | 0 | 10 |
| crossroads_event_kit | 0 | 0 | 14 | 1 | 15 |
| ink_asset (A01–A08 + manifest) | 0 | 6 | 2 | 1 | 9 |
| social_capsule (S01–S18 + companions + recordings) | 0 | 12 | 7 | 1 | 20 |
| article_package (weeks 1–13) | 0 | 3 | 10 | 0 | 13 |
| email_template (E01–E16 + operational notices) | 0 | 0 | 17 | 0 | 17 |
| ad_creative (AD01–06, RT01–03) | 0 | 0 | 6 | 3 | 9 |
| n8n_workflow (WF00–WF11, SM01–02) | 0 | 0 | 14 | 0 | 14 |
| infra | 1 | 0 | 6 | 4 | 11 |
| book | 0 | 1 | 2 | 1 | 4 |
| bill_media | 0 | 0 | 0 | 3 | 3 |
| other_marketing | 0 | 3 | 5 | 0 | 8 |
| calendar, ops | 0 | 0 | 2 | 0 | 2 |

**blocked_human rows (15):** W00–W11 recordings; event date/cap and Workspace/Meet; A08 (approved book cover); capsule recordings; RT01–RT03; book terms; Bill's voice interview; real Bill recordings; portrait rights; n8n live on the VPS; Supabase project and backups; Stripe account and test keys; Brevo account and DKIM/SPF/DMARC.

**exists rows (7):** bilingual routing, review proxy, hash-bound publication, launch guard, robots/sitemap, test suite, Calendly link.

## 6. Claims pending G1, and offer/stack contradictions in existing copy

### 6.1 Claims in site copy, held behind `approvals.qualificationsAndAffiliation=false`, `websiteCopy=false` (scope: `serviceScope=false`)
Source: `E/repair3/F00-SPOT-10_claims_register.log` (locale-safe `git grep` on all 6 branches over every tracked file except `film/`, `presentation/`, `reference/`, `docs/`, `public/`, `*.svg`, `package-lock.json`; the repair-2 grep's `[ée]` bracket missed multibyte `é` under the C locale). "Base" = main, add-ask-bill-section, codex, presentation-video and guide: their `lib/` hits have identical line numbers and text (hash-compared, RUN 4). homepage renumbers and adds lines. `presentation/src/` was grepped separately (RUN 5: only the C2 hit at `content.ts:226`); `film/` and `reference/` are in §6.2.

| # | Claim (COPY-STRATEGY flag) | Base `lib/…` (main, add-ask, codex, video, guide) | Other branch-specific | homepage `d63aabd` (renumbered) |
|---|---|---|---|---|
| C1 | **Affiliation: "independent"** (flag 1: "a regulated claim if he is tied to one firm or dealer"; flag 3: firm/dealer affiliation "Not shown", a required disclosure) | `pages.ts:209` "Bill est planificateur financier indépendant"; `pages.ts:521` "Bill is an independent financial planner" | — | `pages.ts:211,523` (same sentences); `copy.ts:32-33` "Une pratique indépendante" / "Bill a sa propre pratique…"; `copy.ts:175-176` "An independent practice" / "Bill runs his own practice…" (flag 16) |
| C2 | **Title about Bill: "planificateur financier / financial planner"** (flag 2: Pl.Fin. and « planificateur financier » are protected) | `copy.ts:14,114` (`portrait` text), `copy.ts:73,173` (`experienceSub`); `pages.ts:183,186` (About kicker and SEO title "Bill Badran, planificateur financier à Laval"), `pages.ts:496,498` (EN "Bill Badran, financial planner in Laval"); `pages.ts:209,521` (C1 sentences); `pages.ts:227,539` (designation line) | codex: `components/pages.tsx:119-120` "Planificateur financier · Laval" / "Financial planner · Laval" under Bill's name; `content/guides/retirement-review-en.pdf` p.37 first person "I'm a financial planner in Laval" (`E/repair3/F00-SPOT-11_review_pdf_claims.log`); cover JPG "BILL BADRAN / FINANCIAL PLANNING" (§4). video: `presentation/src/content.ts:226` profile "Bill Badran Financial Planning" | `copy.ts:15,158` (eyebrow "Bill Badran · Planificateur financier · Laval"), `copy.ts:21,164` (`portrait` text), `copy.ts:52,195` (`experienceSub`), `copy.ts:144,286` (`seoHomeDescription`, the home meta description); `pages.ts:185,188,498,500` (About kicker and SEO titles), `pages.ts:211,523`, `pages.ts:229,541` |
| C2b | Role named on meeting and retirement pages; implies Bill (flag 2, flag 8 "Laval") | `pages.ts:235,547` (SEO title "Première rencontre avec un planificateur financier à Laval" / "A first meeting with a financial planner in Laval"); generic role text `pages.ts:34,127,348,440` | — | `pages.ts:237,549`; generic `pages.ts:34,129,350,442` |
| C3 | **Experience: "more than 15 years"** (flag 5: "Confirm the number") | `business.ts:12` `experienceYears: 15`; `copy.ts:72` "Plus de 15 ans", `copy.ts:172` "15+ years"; `pages.ts:202,514` | — | `business.ts:12`; `copy.ts:51` "Plus de 15\u00a0ans", `copy.ts:194` "More than 15 years"; `pages.ts:204,516` |
| C4 | **Designations: Pl. Fin./F.Pl. · CIM® · B.A.A./BBA · mutual-fund dealing representative** (flag 2) | `business.ts:22-27` `suppliedCredentials` (23 Pl.Fin., 24 CIM, 25 B.A.A., 26 "Représentant en épargne collective"); `pages.ts:227` (FR), `pages.ts:539` (EN); LinkedIn slug "pl-fin-cim" `business.ts:18` | — | `business.ts:18,22-27`; `pages.ts:229,541` |
| C5 | Compensation and service promises: "how he is paid is explained before you commit", reviews, who he serves (flags 13–15; homepage 17) | Locations per COPY-STRATEGY (Retirement page, meeting page, home step 3, hero, About); not line-enumerated here | guide: `guide/copy.ts:426,537,995,1108` (compensation promise) | `copy.ts:33,176` (compensation promise inside C1) |
| C6 | Registration category and firm disclosure **absent**, marked TODO | — | guide: `guide/copy.ts:552,1124` "To complete before distribution: Bill's registration category and his firm's disclosure"; `guide/README.md:73` | — |
| C7 | Quoted prospect voices "In their words" (provenance undocumented) | — | video: `presentation/src/content.ts:141-144` | — |
| C8 | Ask Bill: 12 questions and answers in Bill's name; "real questions" provenance unverified; benefit/tax facts (flags 18, 21, 22) | — | — | `lib/ask.ts` |

The review-flag list: `docs/COPY-STRATEGY.md:160` heading, flags #1–#15 at lines **164–178** (blob `c0fc777`, identical on main, add-ask, codex, presentation and guide); homepage blob `cedeca0`, heading `:172`, flags #1–#22 at lines 176–197 (`E/repair3/F00-SPOT-12_copy_strategy_flags.log`). C1–C4 are flags #1, #2, #3 and #5 made concrete by line. All of them sit behind `qualificationsAndAffiliation=false` and `websiteCopy=false` on every branch (`lib/business.ts:28-37`).

### 6.2 Claims contrary to CNT02 (quarantine; do not reuse)
| Content | Location | Branches |
|---|---|---|
| "Gestionnaire de portefeuille agréé" (portfolio-manager title) | `film/src/components/GuideCover.tsx:178`; film PDF text | all |
| "Financial Planner since 2009" | `film/src/checks/DesignKit.tsx:29` | all |
| Invented first-person client story ("Nathalie, 54 ans, Laval"), La Presse and Globe and Mail citations, fear/urgency framing | `film/assets/source/Guide_prosperite_financiere_Bill_Badran.pdf` (text extraction; crops referenced at `film/tools/guide_assets.sh:23`) | all |
| CIM "gestionnaire de portefeuille agréé" | `reference/original.html:7,352,412,600,603,698,722` (line 352 is JSON-LD structured data; file not served, per the proxy) (`E/repair2/F00-SPOT-07_original_html_claim.log`) | all |

### 6.3 Offer contradictions (against the frozen offers: free PDF, 15-minute introduction, paid book with 30-minute consultation)
| Contradiction | Location |
|---|---|
| 45-minute monthly session | video `presentation/src/content.ts:281,325` |
| 7-email automation; "Print 50–100 books, two-copy experiment"; "Webinars next. Paid ads last"; "Emails, webinar, referral system" | video `presentation/src/content.ts:347,350,352,75` |
| Free "Ask for a printed copy" email request (disabled) | homepage `lib/copy.ts:109,251`; `components/pages.tsx:291`; `lib/business.ts` `guide.printedCopies=false` |
| No 15-minute or 30-minute offer text anywhere. The meeting page states no duration or cost | main `components/pages.tsx:480-490`; `docs/COPY-STRATEGY.md:169` (flag 6) |
| No 60-minute, Zoom or n8n text found on any branch (nothing to strip) | assets lane greps |

### 6.4 Stack contradictions (against VPS, Brevo, Supabase, n8n)
| Item | Location |
|---|---|
| Vercel-only deployment docs | `README.md:65-72`; `docs/CONTENT-WORKFLOW.md:24,30`; `LAUNCH-CHECKLIST.md:36-38`; `.env.example:6` |
| Runtime coupled to Vercel | `lib/business.ts:54` (`localReview` gated on `!process.env.VERCEL`); `app/api/inquiry/route.ts:45-46` (`x-vercel-forwarded-for`); `lib/contact.ts:25` (a `TRUST_PROXY_IP` alternative exists). `README.md:33` warns never to expose `LOCAL_REVIEW=true` on a public self-hosted server |
| Resend + Upstash adapters | `lib/contact.ts:20-25,50,72`; `docs/INTEGRATIONS.md:5-11` |
| Privacy text names Resend/Upstash as processors | `lib/pages.ts:291` (FR), `:601` (EN) |

## 7. Tools, environment and account visibility

| Probe | Result | Evidence |
|---|---|---|
| node / npm / git | v22.22.2 / 10.9.7 / 2.43.0. Root `node_modules` not installed in `/home/user/bill` | `E/repo/env_node_playwright.txt` |
| Playwright | The lockfile pins 1.63.0 (package.json `^1.58.2`), which needs chromium rev 1243 (153.0.8010.12). Installed: `/opt/pw-browsers/chromium-1194` (Chromium 141.0.7390.37, the Playwright 1.56.1 build). The browser CDNs are blocked | `E/repo/env_playwright_compat.txt`, `E/repo/reachability.txt` |
| Docker | 29.3.1 with Compose v5.1.1. `dockerd` started by the repo lane, **still running as PID 3134**. `hello-world:latest` pulled after 2× 429 and kept. Local imported image ran and was removed. 4 CPU, 16.9 GB RAM, cgroup v1 | `E/repo/env_docker_run.txt`, `E/repo/dockerd.log` |
| Egress | Reachable: npm registry, Docker Hub, GitHub API, googleapis, ghcr. **CONNECT 403**: docs.n8n.io, supabase.com, api.brevo.com, api.stripe.com, docker.n8n.io, cdn.playwright.dev, playwright.download.prss.microsoft.com, calendly.com (`curl https://calendly.com/bbadran`: exit 56, "CONNECT tunnel failed, response 403", http 000) | `E/repo/reachability.txt`, `E/repair2/F00-PROBE-calendly.log` |
| GitHub MCP (read-only) | Login `arnaudverdier8-svg`; 21 repos visible; bill + billsite as in §1 | `E/repo/github_remote.json` |
| n8n MCP (read-only) | **n8n Cloud** (webhook host `*.app.n8n.cloud`), 1 personal project registered to [redacted: personal Gmail, not Bill's], 1 workflow (not Bill-related), 1 credential (Gmail OAuth). Version not visible. Forbidden for Bill production | `E/repair2/connectors.minimised.json`; `E/repo/connectors.json` now holds the same minimised content (original sha256 `f3516ff1…3871054` replaced in repair 3 and not retained, because it held unrelated third-party identifiers; `E/repair3/F00-ERRATA.log` [P3-2]) |
| Google Calendar (read-only) | 2 calendars. Primary is arnaud@verdierconseils.ca (America/Toronto), plus Holidays in Canada. No Bill or booking calendar. Events not read | same |
| Google Drive (read-only) | Runs as **arnaudverdier8@gmail.com**, a different identity from Calendar: `search_files("title contains 'bill-badran-before-retirement-guide-en-print' and owner = 'me'")` returned 2 files, both owner arnaudverdier8@gmail.com. The only Bill files are the 2 PDFs in §4. 2 unrelated personal files seen, titles deliberately not recorded. Nothing downloaded | `E/repair2/F00-PROBE-drive_identity.log`, `E/repair2/connectors.minimised.json` |
| Meta Ads via Pipeboard (read-only) | 1 connection, 2 ACTIVE CAD ad accounts, neither Bill's (names/IDs not recorded). **No Bill account** | `E/repair2/connectors.minimised.json` |
| Availability only, not called | Gmail, Zoom, Wix, Shopify, Canva, Notion, Trello, ElevenLabs, Higgsfield, HeyGen HyperFrames, ComfyUI, Docusign, Fathom, Spotify | same |
| Not exposed as connectors | Brevo, Supabase, Stripe, Calendly, LinkedIn, Google Meet (only via Calendar event creation), VPS/SSH | same |

**Not probed or not visible:** the VPS and its reverse proxy (no access, no tool); the Workspace edition and Meet entitlement; Calendly event types and durations (403); the n8n version and Cloud tier; GitHub Actions run history; branch-protection details beyond `protected=false`; any `gh` CLI (not installed); Brevo, Supabase and Stripe accounts (no connector, egress 403); proxy diagnostics (`/root/.ccr/README.md` read denied by the permission classifier), so the cause of the Docker 429 is undetermined.

## 8. BASE01 results
Clean `npm ci` in a fresh detached worktree per target. Tokens `GH_TOKEN`/`GITHUB_TOKEN` unset; `NEXT_TELEMETRY_DISABLED=1`. `$CHROME141` = `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. `status_before` was empty for every target. After each run the only tracked change was `M next-env.d.ts`, written by `next build`. Guards were not modified; `playwright install` was not run. Tooling: `E/checks/{runner.sh,pipeline.sh,assemble.py}`. Rows: `E/checks/results.json` (50). Log paths are relative to `E/`.

| Target | SHA | Step | Command | Exit | Log |
|---|---|---|---|---|---|
| main | 77de3bd | 01_npm_ci | `npm ci` | 0 | checks/main/01_npm_ci.log |
| main | 77de3bd | 02_lint | `npm run lint` | 1 | checks/main/02_lint.log |
| main | 77de3bd | 03_test | `npm test` | 0 | checks/main/03_test.log |
| main | 77de3bd | 04_typecheck_prebuild | `npm run typecheck` | 2 | checks/main/04_typecheck_prebuild.log |
| main | 77de3bd | 05_build | `npm run build` | 1 | checks/main/05_build.log |
| main | 77de3bd | 06_typecheck | `npm run typecheck` | 2 | checks/main/06_typecheck.log |
| main | 77de3bd | 07_protections_check | `npm run protections:check` | 1 | checks/main/07_protections_check.log |
| main | 77de3bd | 08_protections_check_with_repo | `GITHUB_REPOSITORY=arnaudverdier8-svg/bill npm run protections:check` | 1 | checks/main/08_protections_check_with_repo.log |
| main | 77de3bd | 09_launch_check | `npm run launch:check` | 1 | checks/main/09_launch_check.log |
| main | 77de3bd | 10_verify_publication | `GITHUB_REPOSITORY=arnaudverdier8-svg/bill node --import tsx scripts/verify-publication.ts` | 0 | checks/main/10_verify_publication.log |
| main | 77de3bd | 11_test_e2e_default_browser | `npm run test:e2e` | 1 | checks/main/11_test_e2e_default_browser.log |
| main | 77de3bd | 12_test_e2e | `PLAYWRIGHT_CHROMIUM_EXECUTABLE=$CHROME141 npm run test:e2e` | 1 | checks/main/12_test_e2e.log |
| codex | 66cce52 | 01_npm_ci | `npm ci` | 0 | checks/codex/01_npm_ci.log |
| codex | 66cce52 | 02_lint | `npm run lint` | 0 | checks/codex/02_lint.log |
| codex | 66cce52 | 03_test | `npm test` | 0 | checks/codex/03_test.log |
| codex | 66cce52 | 04_typecheck_prebuild | `npm run typecheck` | 0 | checks/codex/04_typecheck_prebuild.log |
| codex | 66cce52 | 05_build | `npm run build` | 0 | checks/codex/05_build.log |
| codex | 66cce52 | 06_typecheck | `npm run typecheck` | 0 | checks/codex/06_typecheck.log |
| codex | 66cce52 | 07_protections_check | `npm run protections:check` | 1 | checks/codex/07_protections_check.log |
| codex | 66cce52 | 08_protections_check_with_repo | `GITHUB_REPOSITORY=arnaudverdier8-svg/bill npm run protections:check` | 1 | checks/codex/08_protections_check_with_repo.log |
| codex | 66cce52 | 09_launch_check | `npm run launch:check` | 1 | checks/codex/09_launch_check.log |
| codex | 66cce52 | 10_verify_publication | `GITHUB_REPOSITORY=arnaudverdier8-svg/bill node --import tsx scripts/verify-publication.ts` | 0 | checks/codex/10_verify_publication.log |
| codex | 66cce52 | 11_test_e2e_default_browser | `npm run test:e2e` | 1 | checks/codex/11_test_e2e_default_browser.log |
| codex | 66cce52 | 12_test_e2e | `PLAYWRIGHT_CHROMIUM_EXECUTABLE=$CHROME141 npm run test:e2e` | 0 | checks/codex/12_test_e2e.log |
| homepage | d63aabd | 01_npm_ci | `npm ci` | 0 | checks/homepage/01_npm_ci.log |
| homepage | d63aabd | 02_lint | `npm run lint` | 0 | checks/homepage/02_lint.log |
| homepage | d63aabd | 03_test | `npm test` | 0 | checks/homepage/03_test.log |
| homepage | d63aabd | 04_typecheck_prebuild | `npm run typecheck` | 0 | checks/homepage/04_typecheck_prebuild.log |
| homepage | d63aabd | 05_build | `npm run build` | 0 | checks/homepage/05_build.log |
| homepage | d63aabd | 06_typecheck | `npm run typecheck` | 0 | checks/homepage/06_typecheck.log |
| guide | 749b360 | 01_npm_ci | `npm ci` | 0 | checks/guide/01_npm_ci.log |
| guide | 749b360 | 02_lint | `npm run lint` | 1 | checks/guide/02_lint.log |
| guide | 749b360 | 03_test | `npm test` | 0 | checks/guide/03_test.log |
| guide | 749b360 | 04_typecheck_prebuild | `npm run typecheck` | 2 | checks/guide/04_typecheck_prebuild.log |
| guide | 749b360 | 05_build | `npm run build` | 1 | checks/guide/05_build.log |
| guide | 749b360 | 06_typecheck | `npm run typecheck` | 2 | checks/guide/06_typecheck.log |
| guide | 749b360 | 07_guide | `PLAYWRIGHT_CHROMIUM_EXECUTABLE=$CHROME141 npm run guide` | 0 | checks/guide/07_guide.log |
| video | fc00445 | 01_npm_ci | `npm ci` | 0 | checks/video/01_npm_ci.log |
| video | fc00445 | 02_lint | `npm run lint` | 1 | checks/video/02_lint.log |
| video | fc00445 | 03_test | `npm test` | 0 | checks/video/03_test.log |
| video | fc00445 | 04_typecheck_prebuild | `npm run typecheck` | 2 | checks/video/04_typecheck_prebuild.log |
| video | fc00445 | 05_build | `npm run build` | 1 | checks/video/05_build.log |
| video | fc00445 | 06_typecheck | `npm run typecheck` | 2 | checks/video/06_typecheck.log |
| diag-main-filmdeps* | 77de3bd | D01_npm_ci | `npm ci` | 0 | checks/diag-main-filmdeps/D01_npm_ci.log |
| diag-main-filmdeps* | 77de3bd | D02_film_npm_ci | `npm ci --prefix film` | 0 | checks/diag-main-filmdeps/D02_film_npm_ci.log |
| diag-main-filmdeps* | 77de3bd | D03_lint | `npm run lint` | 1 | checks/diag-main-filmdeps/D03_lint.log |
| diag-main-filmdeps* | 77de3bd | D04_test | `npm test` | 0 | checks/diag-main-filmdeps/D04_test.log |
| diag-main-filmdeps* | 77de3bd | D05_build | `npm run build` | 0 | checks/diag-main-filmdeps/D05_build.log |
| diag-main-filmdeps* | 77de3bd | D06_typecheck | `npm run typecheck` | 0 | checks/diag-main-filmdeps/D06_typecheck.log |
| diag-main-filmdeps* | 77de3bd | D07_test_e2e | `PLAYWRIGHT_CHROMIUM_EXECUTABLE=$CHROME141 npm run test:e2e` | 1 | checks/diag-main-filmdeps/D07_test_e2e.log |

\* Diagnostic, not CI-equivalent: it adds `npm ci --prefix film`.

**Observed outcomes**
- Unit tests pass everywhere: 13/13 on main, codex, guide and video; 18/18 on homepage (`# tests`/`# pass` lines in `*/03_test.log`). homepage's 18 = the same 13 (`tests/logic.test.ts` 11 + `tests/ride.test.ts` 2, identical blobs on all 6 branches) + 5 in the new `tests/ask.test.ts` (`E/repair3/F00-SPOT-13_unit_test_counts.log`).
- The `# env:` header of `*/12_test_e2e.log`, `D07_test_e2e.log` and `guide/07_guide.log` prints `PLAYWRIGHT_CHROMIUM_EXECUTABLE=<unset>` because `checks/runner.sh:22` reads the runner's own environment. The step sets the variable inline, as the `# command=` line shows (`checks/pipeline.sh:36,39`). The command line is authoritative (`E/repair3/F00-ERRATA.log` [P3-1c]).
- codex e2e: **41 passed (1.3 m) under Chromium 141** (`codex/12_test_e2e.log`). Under the default browser it had 38 failed and 3 passed, because `chromium_headless_shell-1243` is missing (`codex/11_…log`).
- guide `npm run guide` produced 4 PDFs of 32 pages each (`guide/07_guide.log`).

**Pre-existing failures**
| Failure | Targets | Cause (status) |
|---|---|---|
| lint: 2 errors | main, guide, video | `film/src/components/CaptionTrack.tsx` and `film/src/components/sketch/Ink.tsx` (react-hooks rules, e.g. `Ink.tsx:131` "Cannot reassign `cursor` after render"). Still 2 errors with film dependencies installed. Confirmed only that the files are in film/; the rule explanation is a hypothesis |
| typecheck: 26 errors = 23 × TS2307 (missing `remotion` modules) + 3 × TS7006 (implicit any: `film/src/audio/Soundtrack.tsx:18,22`, `film/src/components/BillShot.tsx:18`) (`E/repair2/F00-SPOT-03_ts_error_codes.log`) | main, guide, video | All 26 in `film/`, 0 outside it. Root tsconfig does not exclude film/, and CI installs only root dependencies. **Confirmed**: the diagnostic run with film deps passes typecheck and build. codex and homepage add the exclusion |
| build fails, so e2e cannot start ("Could not find a production build") | main, guide, video | Same film/ cause |
| e2e 4 of 30 failed: `locator('.hero img')` resolved to 3 elements (strict mode) | main (diagnostic) | Hypothesis: the selector is stale; codex updates it |
| `protections:check` exit 1: "Set GITHUB_REPOSITORY… and authenticate gh"; with the repo set, `spawnSync gh ENOENT` | main, codex | `gh` not installed; token deliberately withheld. **Blocked**, not failed |
| `launch:check` exit 1: "Launch blocked: businessDetails, serviceScope, qualificationsAndAffiliation, portraitRights, websiteCopy, privacyPolicy, legalNotices, contactOperations" | main, codex | **Blocked by design** (8 human approvals). Do not flip the flags |
| `verify-publication` exit 0 | main, codex | **Vacuous**: 0 published articles, so no API call is made |

**A0 spot-checks (read-only; this delegate; logs from repair 2, 2026-09-30T02:52Z, and repair 3, 03:14–03:19Z)**
IDs are distinct from BASE01 (P3-4). Log paths are relative to `E/`.

| ID | Command (abridged) | Result | Exit | Log |
|---|---|---|---|---|
| F00-SPOT-01 | `git show origin/codex/desktop-iphone-unified:content/guides/retirement-review-en.pdf` → `sha256sum`, `stat`, pypdf | `9dc48a1f…10f8bf`, 912,448 B, 40 pp, 432×648; p.39 contains "AI-assisted editorial artwork" and "REVIEW COPY - NOT APPROVED FOR DISTRIBUTION" | 0 | repair2/F00-SPOT-01_review_pdf.log |
| F00-SPOT-02 | `git show origin/main:film/assets/source/Guide_prosperite_financiere_Bill_Badran.pdf` → `sha256sum`, pypdf | `38f070fe…4e806b7`, 542,261 B, 14 pp; "Nathalie, 54 ans, Laval", "La Presse", "Globe and Mail", "gestionnaire de portefeuille agréé" all present | 0 | repair2/F00-SPOT-02_film_pdf.log |
| F00-SPOT-03 | `grep -o 'error TS[0-9]*' checks/{main,guide,video}/06_typecheck.log \| sort \| uniq -c`; non-film count | Each: 23 × TS2307 + 3 × TS7006; 0 non-film error lines | 0 | repair2/F00-SPOT-03_ts_error_codes.log |
| F00-SPOT-04 | `git log origin/main -- TEST-SUMMARY.md`; `git log -1 f84c60f` | Last change `8454981` (06:56:05 -0400) precedes film/ commit `f84c60f` (07:13:56 -0400) | 0 | repair2/F00-SPOT-04_test_summary_history.log |
| F00-SPOT-05 | `git rev-parse HEAD; git status --porcelain; git stash list; git worktree list; git branch -a -vv` | HEAD `eeb79a9`; 4 untracked `.orchestration/` paths (§1); stash empty; 6 base01 worktrees | 0 | repair2/F00-SPOT-05_repo_state.log |
| F00-SPOT-06 | `ps -p 3134 -o pid,comm,etime; docker images` | dockerd running; `hello-world:latest` only | 0 | repair2/F00-SPOT-06_dockerd.log |
| F00-SPOT-07 | `git show origin/main:reference/original.html \| grep -n -i 'gestionnaire de portefeuille agr'` | Lines 7, 352, 412, 600, 603, 698, 722 | 0 | repair2/F00-SPOT-07_original_html_claim.log |
| F00-SPOT-08 | `git diff --name-status origin/main origin/guide/pre-retirement-guide` (+ `grep -c`, `wc -l`, `cat-file -e` on 5 branches) | 21 paths: 18 `guide/`, `M .gitignore`, `M package.json`, `A scripts/ink-sheet.tsx` (65 lines, absent elsewhere) | 0 | repair2/p2-1_guide_paths.log |
| F00-SPOT-09 (find), F00-SPOT-09-git (ls-tree), F00-SPOT-09-sed | `find / -name PLAN_VALIDATION.json -not -path '/proc/*'`; `git ls-tree -r --name-only HEAD .orchestration`; `sed -n 3p source/01_MASTER_PLAN.md` | find: no match, but **exit 1** (`-not -path` does not prune `/proc`; permission errors), so superseded by F00-SPOT-09b. `02_TASK_GRAPH.json` and `acceptance_catalog.json` are committed in `eeb79a9` | 1 (find) / 0 / 0 | repair2/F00-SPOT-09_companion_json.log |
| F00-SPOT-09b | `find / \( -path /proc -o -path /sys -o -path /dev \) -prune -o \( -iname 'PLAN_VALIDATION*' -o -iname '*PLAN_VALIDATION.json' \) -print` | No match | 0 | repair3/F00-SPOT-09b_plan_validation_pruned.log |
| F00-SPOT-10 | `git grep -n -i -E '<affiliation\|title\|years\|designation patterns>' origin/<b> -- . ':(exclude)film/' …` on 6 branches (run 2: 4 category greps each); run 3 guide/homepage Bill lines; run 4 key labels and base `lib/` identity; run 5 the same 4 categories on video `presentation/src/` | §6.1 C1–C8 line sets. Base branches' `lib/` hits are identical to main's. Run 1's `[ée]` bracket missed multibyte `é` (C locale) and is superseded by run 2 | 0 for every grep, except run 5 affiliation, years and designation: 1 (no match). The run-4 identity loop's exit was not captured (null in the handoff) | repair3/F00-SPOT-10_claims_register.log |
| F00-SPOT-11 | `git show origin/codex/…:content/guides/retirement-review-en.pdf` → pypdf text, claim regex | sha256 `9dc48a1f…10f8bf`, 40 pp; p.37 "I'm a financial planner in Laval"; no independent/CIM/Pl.Fin./years hits (text extraction only; fontTools absent) | 0 | repair3/F00-SPOT-11_review_pdf_claims.log |
| F00-SPOT-12 | `git show origin/<b>:docs/COPY-STRATEGY.md \| grep -n -E '^#+ '` and the Flags table; `git rev-parse origin/<b>:docs/COPY-STRATEGY.md` | main flags #1–#15 at lines 164–178 (heading 160), blob `c0fc777` on 5 branches; homepage `cedeca0` flags #1–#22 at 176–197 | 0 (blob loop: not captured) | repair3/F00-SPOT-12_copy_strategy_flags.log |
| F00-SPOT-13 | `git ls-tree` + `grep -c '^test('` per test file per branch; `git diff --stat origin/main origin/claude/bill-centered-homepage -- tests/` | 13 on 5 branches (logic 11 + ride 2, same blobs); homepage 18 = 13 + `ask.test.ts` 5; `site.spec.ts` +108/−4 | 0 (per-file count loop: not captured) | repair3/F00-SPOT-13_unit_test_counts.log |
| F00-SPOT-14 | `git rev-parse HEAD; git status --porcelain; git stash list; git worktree list; git ls-remote origin refs/heads/claude/orchestration-foundation` | HEAD = origin `eeb79a9`; same 4 untracked paths; stash empty; 6 base01 worktrees | 0 | repair3/F00-SPOT-14_repo_state.log |
| F00-MERGE-R2a/b | throwaway worktree at codex: merge homepage (count hunks), abort; merge guide (list staged), abort; remove worktree | homepage exit 1, pages.tsx ours 2/24/35 vs theirs 6/137/4; guide exit 0, 21 staged paths incl. `scripts/ink-sheet.tsx`; status clean after each abort | 1 / 0 | repair2/p3-2_p2-1_trial_merges.log |
| F00-PROBE-calendly | `curl -sS -o /dev/null -w '%{http_code}' https://calendly.com/bbadran` | CONNECT 403, http 000 | 56 | repair2/F00-PROBE-calendly.log |
| F00-PROBE-drive | Drive MCP `search_files(title contains '…-en-print' and owner = 'me')`, no snippets | 2 files, owner arnaudverdier8@gmail.com, 27,067,783 B each | n/a (tool ok) | repair2/F00-PROBE-drive_identity.log |

## 9. Delta report (only changed facts or contradicted assumptions)

| # | Plan or packet assumption | Evidence-backed fact |
|---|---|---|
| D1 | The companion JSON files are attached | **A0 observation (what the operator attached is not visible to F00 lanes or A6):** per A0's transcription note (`source/01_MASTER_PLAN.md:3`), `02_TASK_GRAPH.json`, `acceptance_catalog.json` and `PLAN_VALIDATION.json` were referenced but not attached; the director regenerated the first two from `TASK_LEDGER.md` and 04 §8 with `.orchestration/scripts/build_graph.py` (both committed in `eeb79a9`). **Verified locally:** no `PLAN_VALIDATION.json` exists anywhere on the filesystem outside `/proc`, `/sys` and `/dev` (pruned find, exit 0: `E/repair3/F00-SPOT-09b_plan_validation_pruned.log`; the repair-2 unpruned find also found nothing but exited 1: `E/repair2/F00-SPOT-09_companion_json.log`) |
| D2 | Packet: "origin/main 77de3bd + uncommitted .orchestration/" | `.orchestration/` (spec, graph, catalog, scripts) is committed as `eeb79a9` on `claude/orchestration-foundation` and pushed. At 2026-09-30T02:52Z and 03:18Z the untracked paths are `evidence/`, `handoffs/`, `inventory.md` and `reviews/` (`E/repair2/F00-SPOT-05_repo_state.log`, `E/repair3/F00-SPOT-14_repo_state.log`). **Circumstantial (no recorded probe):** before F00 outputs were written, only `.orchestration/evidence/` was untracked (`E/repair3/F00-ERRATA.log` [P3-4]) |
| D3 | Plan §2 (`source/01_MASTER_PLAN.md:83`): the responsive branch is a candidate baseline, and the other branches are to be preserved | Adopting codex does not preserve homepage automatically: codex ← homepage conflicts in 5 files at the design level (hero, `nav` type, 3 deleted ink SVGs; §2.1). PR #1, the codex PR, is a draft whose base is `add-ask-bill-section`, not main, so merging it would not change main (`E/repo/github_remote.json`). The three plan snapshots are unchanged (§1.1) and codex's check results are in §8; neither is a delta |
| D4 | The existing app builds; browser checks are historical | main `77de3bd` **fails lint, typecheck and build** in clean CI conditions because of film/ (`f84c60f`). main's `TEST-SUMMARY.md` (2026-09-28, last touched in `8454981`) predates film/, so it is stale for the current head. guide and video inherit the same failure |
| D5 | R7 = `bill-badran-before-retirement-guide-en-print.pdf`, 40 pages | That file name is what the guide-branch generator outputs, but its build is **32 pp / 1.1 MB**. The 40-page content described by R7 matches codex `content/guides/retirement-review-en.pdf` (912,448 B) by description only. The Drive copies "…-en-print 2.pdf" are **27,067,783 B**, matching neither. **Byte identity of R7 is unverified.** The 40-page source is in no branch, and there is no French edition. Three competing guide artifacts exist, plus the older 14-page French guide |
| D6 | Real Bill recordings will exist; no voice clone without consent | 0 videos. `public/audio/journey/en.mp3` on **every branch** is a clone of a third-party voice speaking as Bill. The film voice, music and sfx are ElevenLabs free-plan (non-commercial) |
| D7 | Default hosting is the VPS | The repo is Vercel-only in docs and code (§6.4). No Dockerfile or compose file |
| D8 | Email is Brevo; storage is Supabase | The existing inquiry path is Resend + Upstash, and the privacy text names them |
| D9 | Automations are self-hosted n8n | The only visible n8n is **n8n Cloud** in a personal project registered to [redacted: personal Gmail, not Bill's]. No self-hosted instance is visible |
| D10 | Hash-bound publication controls (§13) | No CODEOWNERS; branches unprotected; `protections:check` cannot run (no `gh`); `verify-publication` passes vacuously |
| D11 | Existing content is reusable subject to review | film/ (all branches) has invented client anecdotes, an unsupported title, press citations, "since 2009" and urgency framing (§6.2). The presentation has superseded offers and unattributed quotes. homepage has a free printed-copy request (§6.3) |
| D12 | Plan §2 (`source/01_MASTER_PLAN.md:95,106`): the Workspace edition and meeting calendar are **unknowns**; Business Standard is only a candidate | Not a contradiction: they are still unknown and not visible. New fact: the connected Calendar (arnaud@verdierconseils.ca) and Drive (arnaudverdier8@gmail.com) connectors are different Google identities, neither of them Bill's, and no Bill or booking calendar is visible (§7) |
| D13 | Bill advertising | Neither visible Meta ad account is Bill's |
| D14 | Live provider checks can run from the build container | Egress blocks Brevo, Supabase, Stripe, n8n docs and images, the Playwright CDN and Calendly (403) |
| D15 | CI-equivalent browser | The pinned Playwright 1.63.0 needs chromium 1243, but only 1194 is installed. All local e2e evidence is under Chromium 141 |
| D16 | The plan names "known Bill branches" | A second repo, `billsite`, exists and is empty. Nothing to preserve |
| D17 | Review protection covers assets | The proxy matcher excludes `/assets/*`: the portrait (`portraitRights=false`) and the AI cover with Bill's name are fetchable on a hosted preview |

## 10. Open questions routed to F01 (non-secret; batch once per 06 "One input sheet")
Secrets go only to the destinations in the 06 secrets map. Do not enter them in chat.

| # | Question | Owner / gate |
|---|---|---|
| Q1 | Canonical branch and design direction: codex (add-ask, responsive), homepage (Bill-centred, Ask Bill), or a manual merge of both? Should PR #1 be retargeted to main? | Arnaud (+ Bill), G0 |
| Q2 | Which book edition is canonical: the 40-page 6×9 review book (where is its source, the "retirement-guide prototype"?), the 32-page generator, or the booklet? Is the Drive "…-en-print 2.pdf" the R7 file? Is a French edition planned? | Arnaud/Bill, G0 and G3 |
| Q3 | VPS provider, hostname, resources, reverse-proxy layout, current deploy method, DNS owner | Arnaud, G0 and G2 |
| Q4 | Do Resend or Upstash accounts exist? Confirm they are retired in favour of Brevo and Supabase (plan default) | Arnaud, G2 and G5 |
| Q5 | Which Google account is Bill's operating identity? Its Workspace edition and Meet entitlement? Which calendar takes bookings? | Bill, G0 and G2 |
| Q6 | The event types and durations behind `calendly.com/bbadran` (is there any 60-minute intro?) | Bill/Arnaud |
| Q7 | Confirm the connected (non-Bill) n8n Cloud instance is out of scope, and authorize self-hosted n8n on the VPS | Arnaud, G2 |
| Q8 | Bill's Meta ad account and page (none visible) | Arnaud/Bill, G2 and G6 |
| Q9 | Remove or quarantine the cloned narration (`en.mp3`) and the ElevenLabs film audio? Recording session date? Source and rights for `bill-portrait.jpg` and the `reference/` photos? | Bill, G4 |
| Q10 | Should film/ and presentation/ be excluded from the production baseline, or kept as internal-only? | Arnaud |
| Q11 | For the §6.1 claims: verified designations (C4), the protected title (C2), "more than 15 years" (C3), whether "independent" / "independent practice" can be said (C1), the firm/dealer affiliation and registration category to disclose (C1, C6), and the compensation wording (C5). Also the reviewer identity | Bill + firm, G1 |
| Q12 | GitHub reviewers for CODEOWNERS and the `CONTENT_REVIEWERS`/`FIRM_REVIEWERS` variables; branch-protection policy; how `gh` access will be provided (via a secure store, not chat) | Arnaud, G2 |
| Q13 | Provenance of the "In their words" quotes and of the Ask Bill questions | Bill, G1 and G3 |
| Q14 | Purpose of the empty `billsite` repo (ignore, or archive?) | Arnaud |
| Q15 | The 06 input-sheet items not yet supplied: slots per week (15-minute and 30-minute), book price/cap/shipping, event date/cap, languages, recording time, allowlist, spending caps | Bill/Arnaud, G0 and G2 |
