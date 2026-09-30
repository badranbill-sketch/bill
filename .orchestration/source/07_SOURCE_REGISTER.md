# Source transcription — 07_SOURCE_REGISTER.md

> Transcribed by A0 on 2026-09-30 from the operator-supplied handoff v1.0 (2026-09-29).

## Source register and verification boundaries

Prepared September 29, 2026. These sources support the plan's factual premises. Engineering choices, budgets, capacities and dates identified as proposed are design decisions, not vendor promises. Recheck the installed versions and actual account entitlements at execution.

### Project evidence

- **R1 — actual repository branches.** Read through the authenticated GitHub connector for arnaudverdier8-svg/bill. Branch snapshots appear in the master plan. API source: https://api.github.com/repos/arnaudverdier8-svg/bill/branches.
- **R2 — site business config.** https://github.com/arnaudverdier8-svg/bill/blob/66cce52046f535ddc1a90e6f94474877e375860d/lib/business.ts. Earlier connector read: approvals false; supplied credentials/experience; current Calendly/social configuration. These are source values, not independently approved business claims.
- **R3 — responsive review.** https://github.com/arnaudverdier8-svg/bill/blob/66cce52046f535ddc1a90e6f94474877e375860d/docs/RESPONSIVE-REVIEW.md. Source describes review-only guide, missing recordings, responsive behavior and commands. No tests were rerun for this plan.
- **R4 — content controls.** https://github.com/arnaudverdier8-svg/bill/blob/66cce52046f535ddc1a90e6f94474877e375860d/docs/CONTENT-WORKFLOW.md. Existing human review and hash-bound two-PR publication approach.
- **R5 — actual art direction.** https://github.com/arnaudverdier8-svg/bill/blob/66cce52046f535ddc1a90e6f94474877e375860d/docs/ART-DIRECTION.md. Palette, typography, seeded pen toolkit, composition and accessibility guidance.
- **R6 — code/review routes.** https://github.com/arnaudverdier8-svg/bill/blob/66cce52046f535ddc1a90e6f94474877e375860d/proxy.ts and package.json. Protect review deployment; inspect before adding provider callbacks.
- **R7 — book.** Library file bill-badran-before-retirement-guide-en-print.pdf, 40-page review edition, retrieved in the planning conversation. Pages 2–3 describe fictional Claire/Marc and worksheets; page 39 says the review copy is not approved for distribution and requires Bill/firm completion. No public book URL is fabricated.

### Official vendor and regulatory sources

- **S1 — Vercel commercial eligibility.** https://vercel.com/docs/plans/hobby, https://vercel.com/docs/limits/fair-use-guidelines, https://vercel.com/pricing. Hobby is restricted to personal/non-commercial use. If selecting Vercel commercially, use the applicable paid tier and actual checkout.
- **S2 — Supabase Free.** https://supabase.com/pricing and https://supabase.com/docs/guides/platform/billing-on-supabase. Free plan includes finite database/storage/egress quotas; automatic backups are not included. Price/tier details can change.
- **S3 — Supabase pausing.** https://supabase.com/docs/guides/platform/free-project-pausing. Free projects may pause for low activity over seven days. Do not promise uninterrupted production from a free tier.
- **S4 — Google Workspace/Meet.** https://workspace.google.com/intl/en_ca/pricing.html redirects to https://workspace.google.com/pricing?hl=en_ca. Retrieved page lists Standard recording/150 participants and booking pages; the fetched pricing displayed USD despite the regional link. Confirm CAD pricing and commitments in Bill's checkout. No purchase is assumed.
- **S5 — Meet attendance.** https://support.google.com/meet/answer/10090454?hl=en. Business Standard is absent from the current attendance-tracking eligibility list; do not promise native reports for that tier.
- **S6 — Calendar scheduling / polls.** https://support.google.com/calendar/answer/11608416?hl=en; https://support.google.com/calendar/answer/16287038?hl=en; https://support.google.com/meet/answer/10165071. Verify actual account features and guest behavior before replacing Calendly or relying on native polls.
- **S7 — n8n Docker.** https://docs.n8n.io/deploy/host-n8n/install-options/install-with-docker.md. Official Docker/self-hosting documentation. Old /hosting/... URLs returned not found during research.
- **S8 — n8n backup/restore.** https://docs.n8n.io/deploy/host-n8n/keep-n8n-running/backup-and-restore.md. Separate CLI exports from a complete instance recovery; preserve encryption material and necessary persistent data.
- **S9 — n8n environment reference.** https://docs.n8n.io/llms-full.txt. Current text identifies N8N_WEBHOOK_URL and the deprecated WEBHOOK_URL alias from 2.35. Verify against the selected image, not merely this document.
- **S10 — Stripe webhooks.** https://docs.stripe.com/webhooks. Signature verification, retries and duplicate-event handling. Use actual paid state, not the return page.
- **S11 — Brevo Free.** https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan; https://help.brevo.com/hc/en-us/articles/8292912279954-Add-or-remove-emails-from-your-plan; https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans. 300 sends/day; marketing and transactional messages consume credits. Do not assume n8n changes the quota.
- **S12 — consent and privacy review.** https://crtc.gc.ca/eng/com500/guide.htm; https://crtc.gc.ca/eng/com500/faq500.htm; https://www.cai.gouv.qc.ca/protection-renseignements-personnels/information-entreprises-privees/responsable-protection-renseignements-personnels-entreprise; https://www.cai.gouv.qc.ca/actualites/evaluation-facteurs-relatifs-vie-privee-guide-plus-convivial. Official guidance on commercial electronic messages and privacy assessments. This plan is not a legal opinion; the responsible reviewer determines message classifications, data processing and publication conditions.
- **S13 — Google AI search.** https://developers.google.com/search/docs/appearance/ai-features. Normal Search practices apply; there is no special AI markup/file requirement guaranteeing inclusion.
- **S14 — LinkedIn permissions.** https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access; https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin. Authorized member posting uses the appropriate OAuth permission; organizational/marketing capabilities require their own access.

### Unresolved facts — must not be fabricated

- Exact VPS resources, existing subscription prices, media egress allowance and off-host storage.
- Bill's actual Workspace entitlement, authorized API access and guest/booking behavior.
- Current Meta financial-services category/targeting rules applicable to Bill's ads and account. Age targeting is not promised.
- Applicable n8n Community licence terms for this operator/client use. Do not call the product unrestricted open source.
- Approval of financial calculations, scripts, book, professional claims, advertising, consent and retention.
- Actual production hosting/deployment status. ChatGPT prototype/site metadata is not evidence of a production customer system.

The plan explicitly gates these facts instead of allowing agents to turn an assumption into an advertised promise.
