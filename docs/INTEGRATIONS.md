# External integrations

## Inquiry adapter

The form is intentionally disabled by default. Set all of `ENABLE_CONTACT=true`, `RESEND_API_KEY`, `MAIL_FROM`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RATE_LIMIT_SALT` in the server environment. On Vercel, the platform-provided IP header is used. Elsewhere, `TRUST_PROXY_IP=true` is allowed only behind a trusted reverse proxy that overwrites x-forwarded-for; never trust an arbitrary client header. Use a high-entropy rate salt. Missing credentials, disabled integration or rate-store failure fails closed with HTTP 503.

The recipient is the business configuration's supplied email. Confirm ownership first. Configure an authorized verified Resend sending domain; no provider accounts or DNS changes were made. Authorize the provider contract, retention and processing regions before live use. The form sends only name, email, stable topic ID, language and message. It does not collect phone numbers, financial statements or account identifiers. It does not enroll marketing contacts.

A Redis Lua operation atomically increments a HMAC-hashed IP key and sets a 600-second expiry on the first attempt. More than five valid requests per IP per ten minutes returns 429 and Retry-After:600. Message text is never stored in Redis. Shared connections may share the allowance. Add an owner-approved Vercel Firewall request rule for `/api/inquiry` as defense against high-volume invalid traffic; the application enforces length, origin, content-type, strict schema and a hidden spam field. The platform must set a request-body limit in addition to the app's streamed 12KB limit.

Resend requests use an eight-second timeout, check HTTP status and require a nonempty provider ID. A deterministic HMAC idempotency key incorporates a browser-generated UUID and the validated payload. Unchanged retries reuse it; changed messages use a new ID. Provider idempotency is bounded by the provider's retention window (verify current terms before launch). The UI disables concurrent submissions and preserves entries on failure. Only provider acceptance produces a success state; inbox delivery and actual appointments are not inferred. A browser timeout also preserves the same retry key.

The site does not log inquiry bodies, email addresses or IP addresses in application logs. Review hosting access-log and provider retention policies; this does not prevent providers from processing technical logs. The privacy draft states the implementation but leaves operational policy approval open. Never use process memory or local disk for production lead storage.

## Booking

The supplied `https://calendly.com/bbadran` was inspected read-only on 2026-09-28. It displayed Bill Badran and three meeting choices, including remote and Laval options. No event was selected and no booking submitted. The site links to the supplied profile only, not an inferred event URL. Recheck ownership, choices, availability and terms before launch. No Calendly embed is used; cookies are not loaded by this site. Users complete and confirm appointments on Calendly.

## Guide, newsletter, testimonials

The guide « Avant la retraite » / "Before You Retire" is read on the site; no PDF exists yet. `business.guide.pdf.fr/en` default to null and `business.guide.printedCopies` to false. Add the verified file for each language under public, record its path with `approved: true` only after review, and set `printedCopies` only once printed copies exist; the launch check rejects a configured but missing PDF. Downloads are ungated. No message claims a file was emailed or saved.

Newsletter and testimonials default off/empty. No newsletter adapter is included because provider, unsubscribe flow and consent text are absent. Do not enable that flag: the launch check intentionally blocks it. Testimonials require authentic, approved text and publication permission; none have been invented.

## Measurement and search

No analytics package, third-party tracking, cookie banner or marketing cookies are loaded. Configure an approved provider and consent approach before any measurement work. Allowed events only: meeting CTA activation, provider-accepted contact, actual guide-link activation and verified booking confirmation. Do not send checklist answers, balances, email, names, messages or URLs containing personal data. A booking click is not a confirmed booking.

After an authorized public launch, the owner can verify the intended domain in Search Console, submit `/sitemap.xml`, inspect indexing and choose AI crawler policy. Confirm the practice's business profile and approved contact information; do not create duplicates or imply existing access. No accounts were connected and no ranking/citation promises are made.
