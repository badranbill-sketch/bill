# Desktop and iPhone refinement

Based on `01e296caf4cb6822c9ccd45642834d69e02334bf` on
`add-ask-bill-section`.

The homepage brings the mobile prototype's clear introduction, real guide cover,
and easy next steps into the existing bilingual Next.js site. One reading and
keyboard order serves both layouts: introduction, guide and questions, Bill,
retirement journey, meeting explanation, and closing invitation.

## Layout and interaction

- Desktop retains the illustrated desk, spacious editorial features, four-column
  Ask Bill row, and animated retirement journey.
- Phones use the hiker illustration, a compact sticky header, full-width primary
  actions, and a native swipeable question list with keyboard-accessible controls.
- Phones and reduced-motion visitors see four readable journey panels. Desktop
  scroll and keyboard navigation retain the existing animation and narration.
- The final invitation leads to the localized meeting page, where the configured
  Calendly link is available. The phone number remains directly callable.
- Repeated homepage question, guide, and closing sections are consolidated.
  Existing inner pages, tools, and contact handling remain available.

## Guide and recordings

The cover and English PDF are from the retirement-guide prototype. The review PDF
is a compressed 40-page copy stored outside `public/`, served by `/api/guide` only
when review mode is enabled and launch approval is off. The normal review proxy
also protects this route. Responses are private, uncached, and excluded from
indexing. The build traces the PDF into the server output.

An approved language-specific guide in `lib/business.ts` takes precedence. Until
then, review pages identify the English review edition; public pages link to the
existing retirement preparation page. This change does not change launch or
content approval settings.

Ask Bill recordings are not present in the source commit. Cards therefore lead
to relevant existing reading and say that video is coming soon. Configure an
approved recording in `lib/features.ts` to enable its video link and play icon.

## Verification

Run `npm run lint`, `npm run test`, `npm run build`, `npm run typecheck`, and
`npm run test:e2e`. The added responsive checks cover English and French at 320,
390, 700, 768, and 1440 CSS pixels, navigation, question controls, PDF access,
booking, overflow, and browser errors. The existing suite also covers axe
accessibility, keyboard use, reduced motion, 200% text, inner routes, forms,
calculators, narration, and review protection.

Local verification uses Chromium with responsive viewports; a physical iPhone
Safari check remains a useful final device check before release.
