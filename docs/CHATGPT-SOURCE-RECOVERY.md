# Recovery of the published ChatGPT website

## Verified provenance

- Published URL: https://bill-badran-responsive.walkin199.chatgpt.site
- Sites version: 4
- Published source commit: `a9db3385bc0ad758ab4915d5e96b596fc4458e04`
- Publication succeeded on 2026-10-02.
- Compared against `badranbill-sketch/bill` main: `a8a22e64cef440be2601b91630cae1f1fbf0508a` (2026-10-08).
- The authenticated Sites source workflow recovered that exact commit. This is a source recovery, not a reconstruction from screenshots.

## Changes recovered

- Photographic desktop opening featuring Bill facing a client, with the published text and gradient.
- The same photograph and introductory copy on tablet and iPhone, with the published crop.
- Scroll-driven retirement journey on phones as well as desktop.
- Visitor control to switch between animation and static stages; system reduced-motion preference remains the default.
- Mobile journey stays below the 76px navigation.
- Both original WebP assets restored byte-for-byte. These are AI-generated concept images; the client interaction is illustrative, not documentary evidence.

The book photograph was present in the published source but was not referenced by the version-4 pages. It is restored as an asset without adding a new section or replacing the existing guide cover.

## Deliberately preserved from current main

Vercel/Next.js server configuration, API contact/guide routes, OPEN_PREVIEW, approval and publication controls, dependencies, approved logo, content, and the separate film project are preserved. Browser assertions are updated for the recovered photo and live mobile journey.

Sites used a static-export configuration and a public review PDF path. Those hosting-only differences are not copied into the Vercel project: the existing `/api/guide` route already serves the identical PDF (SHA-256 `9dc48a1fbda787268d63d64f3d18b6da88a49c596a1824fcd62453d54d10f8bf`). This PR ports the published presentation onto the current server-capable project, rather than replacing the whole repository with the older static snapshot.

## Why GitHub was behind

The saved publication identifies a commit in the separate Sites source repository. The transferred GitHub repository has neither that photographic opening nor these two assets. Publishing to ChatGPT Sites did not synchronize those changes to this GitHub repository.

## Validation

- Existing logic tests: 13 passed.
- `npm run build`: passed with the existing server configuration.
- `npm run typecheck`: passed.
- `npm run lint`: passed with one Next.js advisory about the recovered plain `<img>` (no errors).
- `git diff --check`: passed.
- Browser tests updated but not executed locally: Chromium installation failed because the downloaded browser archive was empty/truncated. GitHub's existing PR workflow includes Chromium installation and the full browser suite. Check that workflow and the Vercel preview before merging.

## Restored asset hashes

- `public/assets/bill-conversation-hero.webp`: `589b10ac4a2e706c0f5735e96b476e817fb9996456662e1023c7d0207c0a7ea4`
- `public/assets/bill-retirement-book.webp`: `6d451e557ca675764e453aab8e77a2a51752e161125a753b3206cda7c0c881d6`
