/**
 * THE OTHER SIDE OF THE TABLE — every word on screen, and when it appears.
 *
 * Each line has an English and a French version. French is empty for now and
 * falls back to English. `at: [from, to]` is in seconds from the start of its
 * scene: `from` is when the line starts to appear, `to` is when it starts to
 * leave. A `to` equal to the scene's `dur` means "stays until the scene ends".
 *
 * Checks (npm run qa): every line is held at least words / 3.5 + 1 seconds,
 * the total stays within 4:45, and none of the banned words appear here.
 */

export type Lang = 'en' | 'fr';
export const LANG = 'en' as Lang;

/** Plays public/audio/voiceover.mp3 and music.mp3 when true. */
export const AUDIO = false;

export type Line = { readonly en: string; readonly fr: string; readonly at?: readonly [number, number] };
export const tr = (l: Line) => (LANG === 'fr' && l.fr.trim() ? l.fr : l.en);

/** Status tags, used in S02 and on the scenes of the journey. */
export const STATUS = {
  built: { en: 'Built', fr: '' },
  progress: { en: 'In progress', fr: '' },
  notStarted: { en: 'Not started', fr: '' },
  needsBill: { en: 'Needs Bill', fr: '' },
} satisfies Record<string, Line>;
export type Status = keyof typeof STATUS;

/** The five thoughts on the signposts, S07 to S11. */
export const JOURNEY: Line[] = [
  { en: 'That’s me.', fr: '' },
  { en: 'Is he real?', fr: '' },
  { en: 'What’s in the book?', fr: '' },
  { en: 'I like this guy.', fr: '' },
  { en: 'Let’s go talk to Bill.', fr: '' },
];

export const DECISION_LABEL: Line = { en: 'Decision for Bill', fr: '' };
export const WORDMARK: Line = { en: 'BILL BADRAN', fr: '' };

export const SCENES = {
  s00: {
    id: 'S00',
    name: 'Cold open',
    dur: 14,
    open1: { en: '“Bill, I think we’re okay.', fr: '', at: [1.5, 14] },
    open2: { en: 'I just don’t know if we’re okay.”', fr: '', at: [4.4, 14] },
    footer: { en: 'Something you hear more often than you’d think.', fr: '', at: [7.5, 14] },
    caption: { en: 'Before anyone calls you, this is the sentence in their head.', fr: '', at: [5.5, 13.5] },
  },

  s01: {
    id: 'S01',
    name: 'Title',
    dur: 8,
    title: { en: 'The other side of the table.', fr: '', at: [0.4, 8] },
    sub: { en: 'Everything we built for Bill Badran — told from the chair across from yours.', fr: '', at: [1.4, 8] },
    chair: { draw: 1.2, over: 4.6 },
  },

  s02: {
    id: 'S02',
    name: 'Overhaul status',
    dur: 20,
    heading: { en: 'You asked for a complete overhaul. Here’s where it stands.', fr: '', at: [0.5, 20] },
    cards: [
      { label: { en: 'Identity', fr: '', at: [2.0, 20] }, status: 'built' },
      { label: { en: 'Printed guide', fr: '', at: [3.2, 20] }, status: 'built' },
      { label: { en: 'Cover', fr: '', at: [4.4, 20] }, status: 'built' },
      { label: { en: 'Website', fr: '', at: [5.6, 20] }, status: 'progress' },
      { label: { en: 'Social content system', fr: '', at: [6.8, 20] }, status: 'progress' },
      { label: { en: 'Google & local trust', fr: '', at: [8.0, 20] }, status: 'notStarted' },
      { label: { en: 'Emails, webinar, referral system', fr: '', at: [9.2, 20] }, status: 'notStarted' },
    ] as { label: Line; status: Status }[],
    caption: { en: 'We’ll go through each one. But first — who all of this is for.', fr: '', at: [12.5, 20] },
  },

  s03: {
    id: 'S03',
    name: 'Who they are',
    dur: 23,
    ages: { en: '58 and 60.', fr: '', at: [0.8, 13.5] },
    jars: [
      { en: 'RRSP', fr: '', at: [2.0, 13.5] },
      { en: 'TFSA', fr: '', at: [2.4, 13.5] },
      { en: 'Pension', fr: '', at: [2.8, 13.5] },
      { en: 'Non-registered', fr: '', at: [3.2, 13.5] },
      { en: 'Corporation', fr: '', at: [3.6, 13.5] },
    ] as Line[],
    beats: [
      { en: 'Decades of work.', fr: '', at: [2.5, 5.1] },
      { en: 'Seven accounts.', fr: '', at: [5.5, 8.1] },
      { en: 'Three institutions.', fr: '', at: [8.5, 11.1] },
      { en: 'One question.', fr: '', at: [11.5, 13.5] },
    ] as Line[],
    hero: { en: 'Am I actually okay?', fr: '', at: [14.5, 23] },
    thoughts: [
      { en: 'Do we have enough?', fr: '', at: [15.5, 23] },
      { en: 'Can we stop when we want?', fr: '', at: [16.5, 23] },
      { en: 'Are we missing something?', fr: '', at: [17.5, 23] },
      { en: 'How does it all fit together?', fr: '', at: [18.5, 23] },
    ] as Line[],
    caption: {
      en: 'They did the hard part. They’re not in trouble. They’re uncertain. Uncertainty is the whole market.',
      fr: '',
      at: [13.5, 23],
    },
  },

  s04: {
    id: 'S04',
    name: 'Why they look for an advisor',
    dur: 30,
    was: { en: 'For thirty years the question was', fr: '', at: [0.4, 5.4] },
    grow: { en: 'How do I grow my money?', fr: '', at: [1.6, 5.4] },
    now: { en: 'Now it’s becoming', fr: '', at: [5.8, 11.2] },
    become: { en: 'How does all of this become', fr: '', at: [6.7, 11.2] },
    becomeTail: { en: 'my retirement?', fr: '', at: [6.7, 11.2] },
    underlineAt: 8.6,
    seats: [
      { en: 'Spending', fr: '', at: [11.8, 19.6] },
      { en: 'Pension', fr: '', at: [12.25, 19.6] },
      { en: 'QPP/CPP', fr: '', at: [12.7, 19.6] },
      { en: 'OAS', fr: '', at: [13.15, 19.6] },
      { en: 'Taxes', fr: '', at: [13.6, 19.6] },
      { en: 'Time', fr: '', at: [14.05, 19.6] },
      { en: 'Markets', fr: '', at: [14.5, 19.6] },
      { en: 'Your spouse', fr: '', at: [14.95, 19.6] },
      { en: 'Withdrawals', fr: '', at: [15.4, 19.6] },
    ] as Line[],
    tableFrom: 11.4,
    spokesAt: 15.5,
    centre: { en: 'Your retirement income', fr: '', at: [15.5, 19.6] },
    same: { en: 'Everyone is at the same table now.', fr: '', at: [15.5, 19.6] },
    quotes: [
      { en: '“Someone who sees the whole picture, not just the portfolio.”', fr: '', at: [20.0, 30] },
      { en: '“Someone to tell me the questions I don’t know to ask.”', fr: '', at: [20.9, 30] },
      { en: '“Someone who picks up the phone in a bad month.”', fr: '', at: [21.8, 30] },
      { en: '“Decisions made on a calm day, not in the middle of the news.”', fr: '', at: [22.7, 30] },
      { en: '“I don’t want a product. I want to know where we stand.”', fr: '', at: [23.6, 30] },
    ] as Line[],
    quoteFooter: { en: 'In their words', fr: '' },
    looking: {
      en: 'They’re not shopping for investments. They’re looking for someone capable to sit across from.',
      fr: '',
      at: [23, 30],
    },
  },

  s05: {
    id: 'S05',
    name: 'Why Bill, and the identity',
    dur: 30,
    photoAt: [0.8, 14.4] as readonly [number, number],
    pairs: [
      { head: { en: 'Competence', fr: '', at: [2.0, 4.8] }, tail: { en: 'without showing off.', fr: '', at: [2.0, 4.8] } },
      { head: { en: 'Protection', fr: '', at: [5.2, 8.0] }, tail: { en: 'without fear.', fr: '', at: [5.2, 8.0] } },
      { head: { en: 'Expertise', fr: '', at: [8.4, 11.2] }, tail: { en: 'without jargon.', fr: '', at: [8.4, 11.2] } },
      { head: { en: 'Strength', fr: '', at: [11.6, 14.4] }, tail: { en: 'without aggression.', fr: '', at: [11.6, 14.4] } },
    ] as { head: Line; tail: Line }[],
    caption: {
      en: 'Bill is the brand. Not the logo, not the drawings — Bill. People should spend enough time with how he thinks that the first meeting feels like the second.',
      fr: '',
      at: [1.8, 13.2],
    },
    label: { en: 'Your new identity', fr: '', at: [14.8, 30] },
    swatches: [
      { en: 'Ivory', fr: '', at: [15.4, 30] },
      { en: 'Navy', fr: '', at: [15.8, 30] },
      { en: 'One brass line', fr: '', at: [16.2, 30] },
    ] as Line[],
    brassLineOut: 23.4,
    serifLine: { en: 'Newsreader — for the thinking.', fr: '', at: [17.5, 30] },
    sansLine: { en: 'Source Sans — for the detail.', fr: '', at: [18.3, 30] },
    logoLine: { en: 'One logo everywhere — the B monogram retires.', fr: '', at: [20, 30] },
    never: { en: 'What it will never be — black and gold, skyscrapers, stock charts, urgency.', fr: '', at: [22, 30] },
    sailboatAt: 21.5,
    goal: { en: 'The goal of every piece:', fr: '', at: [23.5, 30] },
    goalQuote: { en: '“I think we should go talk to Bill.”', fr: '', at: [23.5, 30] },
    underlineAt: 24.6,
  },

  s06: {
    id: 'S06',
    name: 'Journey outline',
    dur: 7,
    heading: { en: 'Five moments. Five thoughts. Here’s what meets them.', fr: '', at: [2, 7] },
    pathFrom: 0.2,
    postsFrom: 0.9,
    postsEvery: 0.55,
  },

  s07: {
    id: 'S07',
    name: 'Social content',
    dur: 28,
    status: 'progress' as Status,
    franchises: [
      { name: { en: 'Ask Bill', fr: '', at: [1.0, 10.0] }, note: { en: 'trust', fr: '', at: [1.0, 10.0] } },
      { name: { en: 'Things People Tell Bill', fr: '', at: [1.7, 10.0] }, note: { en: 'recognition', fr: '', at: [1.7, 10.0] } },
      { name: { en: 'Bill Draws It', fr: '', at: [2.4, 10.0] }, note: { en: 'clarity', fr: '', at: [2.4, 10.0] } },
      { name: { en: 'Ask Your Spouse Tonight', fr: '', at: [3.1, 10.0] }, note: { en: 'shared at home', fr: '', at: [3.1, 10.0] } },
      { name: { en: 'Retirement Is Tuesday Morning', fr: '', at: [3.8, 10.0] }, note: { en: 'the life, not the money', fr: '', at: [3.8, 10.0] } },
    ] as { name: Line; note: Line }[],
    posts: [
      { en: '“I’ve saved my entire life. Now I’m scared to spend it.”', fr: '', at: [10.4, 28] },
      { en: 'Ask your spouse tonight: “What does a normal Tuesday look like after we retire?”', fr: '', at: [12, 28] },
    ] as Line[],
    rhythm: [
      { day: { en: 'TUE', fr: '', at: [19.0, 28] }, what: { en: 'Recognition', fr: '', at: [19.0, 28] } },
      { day: { en: 'THU', fr: '', at: [19.8, 28] }, what: { en: 'Understanding', fr: '', at: [19.8, 28] } },
      { day: { en: 'SAT', fr: '', at: [20.6, 28] }, what: { en: 'Bill on camera', fr: '', at: [20.6, 28] } },
    ] as { day: Line; what: Line }[],
    rule: { en: 'Could another advisor post this by changing the logo? Then we don’t post it.', fr: '', at: [21.5, 28] },
    ratio: { en: 'About one post in three mentions the guide.', fr: '', at: [23, 28] },
  },

  s08: {
    id: 'S08',
    name: 'Google and local trust',
    dur: 15,
    status: 'notStarted' as Status,
    place: { en: 'Laval, Quebec', fr: '', at: [0.8, 15] },
    profile: { en: 'Bill Badran Financial Planning', fr: '', at: [2.5, 15] },
    checklist: [
      { en: 'Real photos', fr: '', at: [3.4, 15] },
      { en: 'Hours', fr: '', at: [4.0, 15] },
      { en: 'Website', fr: '', at: [4.6, 15] },
      { en: 'Booking', fr: '', at: [5.2, 15] },
    ] as Line[],
    reviews: { en: '5 honest requests a week, for 6 weeks. Every reply written by a person.', fr: '', at: [6.5, 15] },
    compliance: { en: 'Review approach to be confirmed with the firm’s compliance.', fr: '', at: [9.5, 15] },
    caption: { en: 'Before anyone books, they check. Google is the local trust layer.', fr: '', at: [1, 7.5] },
  },

  s09: {
    id: 'S09',
    name: 'The guide',
    dur: 20,
    status: 'built' as Status,
    flipFrom: 0.6,
    flipEvery: 2.6,
    heading: { en: 'The book isn’t the hero. It shows how Bill thinks.', fr: '', at: [1.5, 20] },
    thoughts: [
      { en: '“Let’s see if we’re okay.”', fr: '', at: [3.0, 20] },
      { en: '“We’ve never connected these.”', fr: '', at: [5.2, 20] },
      { en: '“Maybe we should talk to someone.”', fr: '', at: [7.4, 20] },
      { en: '“I already know whose thinking I trust.”', fr: '', at: [9.6, 20] },
    ] as Line[],
    decision: {
      title: { en: 'French edition', fr: '', at: [12.5, 20] },
      body: { en: 'Laval is largely francophone. The French guide is a first-90-days item.', fr: '', at: [12.5, 20] },
      footer: { en: 'Sign-off on translation', fr: '', at: [12.5, 20] },
    },
    flow: [
      { en: '/guide', fr: '', at: [14.2, 20] },
      { en: 'email', fr: '', at: [14.5, 20] },
      { en: 'download', fr: '', at: [14.8, 20] },
      { en: 'thank-you page', fr: '', at: [15.1, 20] },
    ] as Line[],
    welcome: { en: 'Bill’s 45-second welcome', fr: '', at: [15.5, 20] },
  },

  s10: {
    id: 'S10',
    name: 'Nurture',
    dur: 17,
    status: 'notStarted' as Status,
    envelopes: [
      { en: 'Guide', fr: '', at: [0.8, 17] },
      { en: 'Where to begin', fr: '', at: [1.3, 17] },
      { en: 'What “enough” means', fr: '', at: [1.8, 17] },
      { en: 'Meeting Bill', fr: '', at: [2.3, 17] },
      { en: 'The spouse conversation', fr: '', at: [2.8, 17] },
      { en: 'An invitation', fr: '', at: [3.3, 17] },
      { en: 'Keep the guide', fr: '', at: [3.8, 17] },
    ] as Line[],
    session: { en: 'We think we’re ready to retire. What should we figure out first?', fr: '', at: [5.5, 17] },
    sessionNote: { en: '45 min, real questions, no deck.', fr: '', at: [6.5, 17] },
    loop: { en: 'Every live question → a future Ask Bill episode.', fr: '', at: [9, 17] },
    evenings: { en: 'Two-chair evenings: 6–10 couples, coffee, co-hosted with an accountant or notary.', fr: '', at: [10.5, 17] },
  },

  s11: {
    id: 'S11',
    name: 'Meeting, books, referral loop',
    dur: 18,
    status: 'notStarted' as Status,
    chairsAt: 0.4,
    meeting: {
      en: 'A first meeting is a conversation. No preparation, no obligation. How Bill is paid — explained before anything is signed.',
      fr: '',
      at: [1.5, 10],
    },
    booksAt: [6.2, 14.5] as readonly [number, number],
    books: {
      en: '“One is yours. The other is for someone you care about who’s starting to ask the same questions.”',
      fr: '',
      at: [6.2, 14.5],
    },
    qr: { en: '/guide/book', fr: '', at: [9, 14.5] },
    wheelFrom: 9.6,
    wheelStep: 0.75,
    wheel: [
      { en: 'QUESTION', fr: '' },
      { en: 'BILL', fr: '' },
      { en: 'BOOK', fr: '' },
      { en: 'MORE BILL', fr: '' },
      { en: 'MEETING', fr: '' },
      { en: 'CLIENT', fr: '' },
      { en: 'BOOK IN HAND', fr: '' },
      { en: 'THEIR FRIEND', fr: '' },
    ] as Line[],
  },

  s11b: {
    id: 'S11b',
    name: 'What this asks of Bill',
    dur: 15,
    status: 'needsBill' as Status,
    asks: [
      { en: 'Half a day of filming per month — 12 Ask Bill episodes, batched.', fr: '', at: [1, 15] },
      { en: 'One 45-minute session per month.', fr: '', at: [3, 15] },
      { en: 'Five minutes a week asking clients for honest reviews.', fr: '', at: [5, 15] },
    ] as Line[],
    ours: { en: 'Everything else is ours.', fr: '', at: [8, 15] },
    yours: { en: 'This part is only yours.', fr: '', at: [8, 15] },
    caption: {
      en: 'The whole engine runs on your face and your voice. If that’s not something you want, we change the plan now, not in month two.',
      fr: '',
      at: [3, 14.5],
    },
  },

  s11c: {
    id: 'S11c',
    name: 'First 90 days',
    dur: 17,
    day1: { en: 'Day 1', fr: '', at: [0.4, 17] },
    day90: { en: 'Day 90', fr: '', at: [0.4, 17] },
    stops: [
      { en: 'Google Business Profile — claim, verify, photos', fr: '', at: [0.8, 17] },
      { en: 'Guide: French edition', fr: '', at: [1.5, 17] },
      { en: 'Define exactly what a first meeting gives someone', fr: '', at: [2.2, 17] },
      { en: '/guide landing + thank-you + 7-email automation', fr: '', at: [2.9, 17] },
      { en: 'Film the first 12 Ask Bill episodes', fr: '', at: [3.6, 17] },
      { en: 'Start honest review requests', fr: '', at: [4.3, 17] },
      { en: 'Print 50–100 books, start the two-copy experiment', fr: '', at: [5.0, 17] },
    ] as Line[],
    next: { en: 'Webinars next. Paid ads last — once the trust underneath is built.', fr: '', at: [7, 17] },
    sees: { en: 'What Bill sees every month', fr: '', at: [8.5, 17] },
    scores: [
      { en: 'Guide downloads', fr: '', at: [8.5, 17] },
      { en: 'Meetings booked', fr: '', at: [9.0, 17] },
      { en: 'Meetings held', fr: '', at: [9.5, 17] },
      { en: 'Reviews', fr: '', at: [10.0, 17] },
      { en: 'Book QR scans', fr: '', at: [10.5, 17] },
    ] as Line[],
    signals: {
      en: 'The first 90 days build the machine. The first signals are downloads and meetings, not clients.',
      fr: '',
      at: [9.5, 17],
    },
  },

  s11d: {
    id: 'S11d',
    name: 'Decisions',
    dur: 10,
    heading: { en: 'Decisions for the meeting', fr: '', at: [0.3, 10] },
    cards: [
      {
        title: { en: 'Cover portrait', fr: '', at: [0.8, 10] },
        body: { en: 'Sketch redrawn from your real photo, or your photo on the cover?', fr: '', at: [0.8, 10] },
      },
      {
        title: { en: 'Compliance path', fr: '', at: [1.6, 10] },
        body: { en: 'Who at the firm reviews public pieces; the review-request approach.', fr: '', at: [1.6, 10] },
      },
      {
        title: { en: 'On camera', fr: '', at: [2.4, 10] },
        body: { en: 'Are you in?', fr: '', at: [2.4, 10] },
      },
    ] as { title: Line; body: Line }[],
  },

  s12: {
    id: 'S12',
    name: 'Close',
    dur: 12,
    chairsAt: 0.2,
    line1: { en: 'This chair isn’t for someone who understands everything about retirement.', fr: '', at: [0.6, 5.2] },
    line2: { en: 'It’s for someone who has questions.', fr: '', at: [5.4, 12] },
    bill: { en: 'Bill Badran', fr: '', at: [7, 12] },
    tagline: { en: 'A calm conversation, before the big decisions.', fr: '', at: [7.4, 12] },
  },
} as const;

export type SceneKey = keyof typeof SCENES;
export const ORDER: SceneKey[] = [
  's00', 's01', 's02', 's03', 's04', 's05', 's06', 's07',
  's08', 's09', 's10', 's11', 's11b', 's11c', 's11d', 's12',
];

/** Scene start times in seconds, from ORDER and each scene's dur. */
export const STARTS: Record<SceneKey, number> = (() => {
  let t = 0;
  const out = {} as Record<SceneKey, number>;
  for (const k of ORDER) {
    out[k] = t;
    t += SCENES[k].dur;
  }
  return out;
})();

export const TOTAL_SECONDS = ORDER.reduce((s, k) => s + SCENES[k].dur, 0);

/** Voice-over windows (the caption lines), in absolute seconds. Music ducks under these. */
export const VOICE_WINDOWS: [number, number][] = ORDER.flatMap((k) => {
  const s = SCENES[k] as { caption?: Line };
  return s.caption?.at ? [[STARTS[k] + s.caption.at[0], STARTS[k] + s.caption.at[1]] as [number, number]] : [];
});
