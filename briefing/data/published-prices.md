# Published list prices: Bill Badran stack (retrieved 2026-09-30)

These are list prices, not quotes, and exclude GST/QST. Every vendor pricing page was **EGRESS_BLOCKED** (WebFetch and curl), so the prices were gathered in two ways:
- **fetched**: read from the vendor's own public GitHub source files on raw.githubusercontent.com.
- **snippet-only, unverified**: taken from the WebSearch tool's summary of search results.

Full quotes and URLs are in `published-prices.json`.

| # | Item | Published price | Currency / unit | Method | Caveat |
|---|------|-----------------|-----------------|--------|--------|
| 1a | Google Workspace Business Starter | 7.00 annual / 8.40 Flexible | USD, per user per month | snippet-only | Google pages blocked |
| 1b | Google Workspace Business Standard | 14.00 annual / 16.80 Flexible | USD, per user per month | snippet-only | The query named the figures |
| 1c | Google Workspace CAD (third party) | Starter 9.20 / 11; Standard 18.40 / 22 (annual / Flexible) | CAD, per user per month | snippet-only | Reseller blog (NorthStar IT, Aug 2026), not Google. Confirm in checkout |
| 1d | Meet by tier | Starter: 100 participants; Standard: 150 participants + recording | feature | snippet-only | Matches S4 |
| 1e | Calendar booking pages | 1 booking page on a free account or Starter; multiple pages, payments and reminders on Standard+ | feature | snippet-only | |
| 2a | Supabase Free | $0: 500 MB DB, 5 GB egress, 1 GB storage, paused after 1 week inactive, no automatic backups, 2 active projects | $ (USD billing), per month | fetched (GitHub plans.ts / pricing.ts) | |
| 2b | Supabase Pro | From 25: daily backups (7 days), never paused, 8 GB disk, 250 GB egress | $ (USD billing), per org per month + usage | fetched | $10 compute credit is snippet-only |
| 3a | Brevo Free | 0: 300 emails/day | per month | snippet-only | Contact cap unverified |
| 3b | Brevo Starter | From 9 (5,000 emails/month) | USD, per month | snippet-only | Price depends on volume; currency may vary by locale |
| 4a | Stripe CA domestic cards | 2.9% + 0.30 | CAD, per successful charge | snippet-only | stripe.com blocked |
| 4b | Stripe CA international cards | +0.8% | per transaction | snippet-only | Query named the figure. Unverified |
| 4c | Stripe CA currency conversion | +2% | per transaction | snippet-only | |
| 4d | Stripe monthly / setup fee | 0 | none | snippet-only | |
| 5a | n8n self-hosted Community Edition | 0 licence fee (Sustainable Use License v1.0; internal business use allowed) | licence | fetched (GitHub LICENSE.md) | Hosting cost is separate. Not legal advice |
| 5b | n8n Cloud Starter (the cost self-hosting avoids) | 20, billed annually, 2,500 executions | $ per month | snippet-only | May be EUR by region |
| 6 | Vercel Pro | 20 per paid seat (includes $20 usage credit); Hobby is non-commercial | USD, per seat per month | snippet-only | Only if the owner picks Vercel |
| 7 | Calendly Standard | 10 yearly / 12 monthly (one result said 16) | USD, per seat per month | snippet-only | **Conflicting.** Check Bill's invoice |
| 8a | EXAMPLE backup: Backblaze B2 | 6.95 | USD, per TB per 30 days | snippet-only | Free egress up to 3x stored |
| 8b | EXAMPLE backup: Hetzner Storage Box BX11 (1 TB) | 3.20 excl. VAT | EUR, per month | snippet-only | EU storage, a Law 25 point for review |
| 9a | EXAMPLE media: Cloudflare R2 | 0.015/GB-month; egress free; 10 GB free | USD | fetched (GitHub cloudflare-docs) | |
| 9b | EXAMPLE media: Bunny Stream | Storage 0.01/GB/region; Volume delivery 0.005/GB; $1 monthly minimum | USD | snippet-only | Standard-tier rate unconfirmed |
| 10 | Remotion licence | Free for individuals and companies with up to 3 employees; Company: $25/mo per seat (Creators) or $0.01/render with $100/mo minimum (Automators); Enterprise from $500/mo | USD | fetched (GitHub LICENSE.md + FreePricing.tsx) | Eligibility depends on the producing entity's size. Remotion 5.0 licence changes are pending |
| 11 | Meta Ads minimum | Recommended at least "$5"/day over more than 6 days; no CAD minimum found | unspecified currency | snippet-only | Plan's CAD 20/day x 14 (CAD 280) is above this, so no conflict found. Confirm in Ads Manager |
