# Bill Badran

A complete bilingual Next.js App Router / TypeScript website, with self-hosted Newsreader, Source Sans 3 and Caveat fonts, pen-and-ink illustrations drawn in code, server-rendered pages, local-only preparation checklist, a fee illustration, protected Markdown article review and a server-side Resend inquiry adapter.

**This is a review build. Public launch is disabled.** Business, service, credential, policy and copy approvals remain open. See [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md). No emails, bookings, account creation, DNS changes or deployments were performed during testing.

## Run

Use Node.js 22.16+ (tested locally on Node 26.7) and npm. The lockfile pins dependencies.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000/fr or /en. No secrets are needed. Drafts appear with explicit review labels only in local development or a protected review configuration. Telephone and email links work without integrations. The inquiry form stays hidden until fully configured; phone, email and office are shown instead.

```sh
npm run lint
npm run test
npm run build
npm run typecheck
npx playwright install chromium
npm run test:e2e
```

For a local production preview:

```sh
LOCAL_REVIEW=true npm run start
```

Bind local review to loopback only, as the supplied commands do. Never expose `LOCAL_REVIEW=true` on a public self-hosted server. Vercel ignores this flag. Tests start two loopback production servers (3100/3101); one uses intentionally invalid local-only adapter settings and mocked browser responses, the other tests access control. They never send a real inquiry. On a machine with Chromium already installed:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

## Project map

- `lib/business.ts`: typed business identity, supplied claims, release approvals, optional assets and feature defaults.
- `lib/routes.ts`, `lib/copy.ts`, `lib/pages.ts`: equivalent URLs, bilingual copy, substantive page content.
- `components/`: small client interactions and server-rendered layout.
- `lib/ink.ts`, `components/ink/`: the pen-and-ink toolkit (a seeded `Pen`, SVG primitives) and the drawings built with it. Preview one with `scripts/ink-preview.tsx`, check its size with `scripts/ink-size.tsx`, export them with `scripts/build-ink.tsx` (see `docs/ART-DIRECTION.md`).
- `lib/fees.ts`: pure tested annual-compounding illustration.
- `lib/contact.ts`, `app/api/inquiry/route.ts`: validation, rate limiting, provider acceptance and failure handling.
- `content/`: four complete Markdown drafts (two French/English pairs), JSON frontmatter, empty approval ledger.
- `scripts/`: executable draft import, structure validation, review-date, approval-evidence and repository-protection checks.
- `reference/`: untouched original HTML, brief and unused supplied photos. Never served publicly.
- `docs/`: art direction, copy strategy (with the claims Bill must confirm), narration, content workflow, generation prompt, fixture brief and external integration setup.

## Review and publication

Read [docs/CONTENT-WORKFLOW.md](docs/CONTENT-WORKFLOW.md). Import locally without credentials:

```sh
npm run content -- import --brief docs/sample-brief.json --notes docs/sample-notes.txt --draft content/en-five-years-before-retirement.md --dry-run
npm run content -- validate
npm run content -- review-due
npm run launch:check
```

The last command intentionally fails until real approvals are recorded. Do not flip flags to pass it. No model API is enabled; local import is the supported workflow. Bill reviews readable article pages in `/fr/revision/...` or `/en/revision/...`, and Arnaud can handle authorized Git operations.

## Protected Vercel deployment

1. Import this directory as a Next.js project into an owner-authorized Vercel project. The supplied `.github/workflows/verify.yml` checks builds, content, tests and approval evidence. Configure branch protection before production publication.
2. Use `npm run build`, the standard Next.js output and Node 22. Configure `REVIEW_USER`, a strong `REVIEW_PASSWORD`, `REVIEW_ENABLED=true`, and `PUBLIC_LAUNCH=false` on **preview**. Use Vercel Deployment Protection as an additional control when available. Do not put credentials in client variables or URLs.
3. Unconfigured hosted reviews return 503; configured reviews require HTTP Basic authentication and remain noindex. Draft routes also require the protected review configuration. Noindex alone is never used as access control.
4. Preview on Vercel's generated URL, with no custom domain or production promotion. Share credentials separately. Verify authentication, both languages and contact failure states there.
5. Resolve the launch checklist and content review. Set reviewer repository variables, run `npm run protections:check`, and require the `verify` check on the production branch. Connect Vercel Git deployment to the approved branch. A merged approved publication change triggers the normal Vercel rebuild; there is no publication webhook or automatic approval.
6. Only after explicit owner authorization, record factual approvals in `lib/business.ts` and set `PUBLIC_LAUNCH=true` for production. Protected preview deployments must remain false. If enabling inquiries, follow [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).

The application fails the production launch build when required approvals are incomplete. Staging robots exclude the site, and staging sitemap is empty. Public routes, sitemap and structured data exclude unapproved articles.

## Design and source notes

The look is navy ink on warm paper: editorial pen-and-ink drawings by a steady hand (tapered lines, engraver's hatching, a few pale washes, handwriting only where something is actually written) inside precise typography and a calm, asymmetric layout. Bill's real portrait sits on the hero desk like a print tucked into a notebook. The subjects are life, not finance: a desk by a lake, two chairs, a dock, a home, a path. Every drawing is generated from fixed seeds (`lib/ink.ts`, `components/ink/`). `npm run ink`, which runs before `dev` and `build`, writes the static drawings to `public/assets/ink/` as SVG files with their text in outline and a content hash in the name, and records them in `lib/ink-files.json`; pages link to those files (`components/ink/file.tsx`), so a drawing is sent once, cached for good and loaded lazily. After editing a drawing, run `npm run ink` again. The mountain ride stays inline because the scroll engine moves parts of it. Rules, palette and toolkit usage are in [docs/ART-DIRECTION.md](docs/ART-DIRECTION.md). The reasoning behind the copy, the persona critique and the list of claims to confirm are in [docs/COPY-STRATEGY.md](docs/COPY-STRATEGY.md). The supplied `bill3.jpg` is the only photo used. No generated person, testimonial, client story or financial result is included.

Directly after the hero, the homepage is a four-act mountain ride (what you've built, the last climb, the crossing, the life ahead), drawn in the same ink. It is one continuous 6800-unit landscape: a pinned stage pans across it as the visitor scrolls, and the hiker walks the trail and stops at each act while its text takes over. Everything is a pure function of native scroll: there is no scroll hijacking, nothing plays on its own, and scrolling back up rewinds the ride. `lib/ride.ts` holds the route, the scroll timeline and the camera. `lib/terrain.ts` draws the landscape on the server. `components/journey/` holds the layout, the props, the hiker, the section and the scroll engine (`ride-motion.tsx`). `lib/journey.ts` holds the bilingual copy. Without JavaScript, or with reduced motion, the section shows four still panels cropped from the same landscape.

Narration is one continuous English track (`public/audio/journey/en.mp3`, with chapter start times in `lib/journey.ts`). "Listen" plays it from the current act; it pauses when the ride leaves the screen or when the visitor presses Pause. There is no French narration, and the button only appears when the file exists. See [docs/NARRATION.md](docs/NARRATION.md). The current voice is a stand-in and must be replaced by Bill's own recording, or removed, before launch.

Motion is deliberately small. Drawings are revealed once by a slow, soft mask as they scroll into view, and the ride moves with the scroll. Nothing else moves: no hover animation, no text animation, no bounce or zoom. With reduced motion, nothing moves at all.

Framework APIs were checked against the installed Next.js documentation and [official App Router documentation](https://nextjs.org/docs/app). Provider adapters follow [Resend](https://resend.com/docs/api-reference/emails/send-email) and [Upstash REST](https://upstash.com/docs/redis/features/restapi). Factual article sources are linked in each article. See `TEST-SUMMARY.md` for the checks actually run and remaining limits.

## Screenshots

[French desktop](docs/screenshots/fr-1440.png) · [French mobile](docs/screenshots/fr-390.png) · [English desktop](docs/screenshots/en-1440.png) · [English mobile](docs/screenshots/en-390.png) · [First meeting on mobile](docs/screenshots/meeting-mobile.png) · [Article review](docs/screenshots/article-desktop.png) · Mountain ride, acts 1–4: [desktop](docs/screenshots/ride-1440-act1.png) [2](docs/screenshots/ride-1440-act2.png) [3](docs/screenshots/ride-1440-act3.png) [4](docs/screenshots/ride-1440-act4.png), [mobile](docs/screenshots/ride-390-act1.png) [2](docs/screenshots/ride-390-act2.png) [3](docs/screenshots/ride-390-act3.png) [4](docs/screenshots/ride-390-act4.png)
