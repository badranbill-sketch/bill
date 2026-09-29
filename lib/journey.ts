import type { Language } from "./business";

/** Copy for the four-act mountain ride. `\n` marks a deliberate line break. */
export type Act = {
  eyebrow: string;
  title: string;
  body: string;
  rail: string;
};

export const journey: Record<
  Language,
  {
    label: string;
    cta: string;
    listen: string;
    pause: string;
    scrollHint: string;
    signsFoundations: string[];
    signsChoices: string[];
    words: string[];
    placards: [string, string];
    acts: Act[];
  }
> = {
  fr: {
    label: "Le chemin vers la retraite",
    cta: "Planifier une première rencontre",
    listen: "Écouter",
    pause: "Pause",
    scrollHint: "Faites défiler pour commencer",
    signsFoundations: ["REER", "CELI", "Régime de retraite", "Patrimoine"],
    signsChoices: ["REER", "CELI", "FERR", "RRQ", "PSV"],
    words: ["Volatilité", "Inflation", "Frais", "Impôts"],
    placards: ["Accumulation", "Revenu\nde retraite"],
    acts: [
      {
        eyebrow: "Ce que vous avez bâti",
        title: "Pendant votre carrière,\nle plan était simple.",
        body: "Gagner, épargner, investir. Votre maison, votre régime de retraite, vos REER et vos CELI en sont le résultat.",
        rail: "Ce que vous avez bâti",
      },
      {
        eyebrow: "La dernière montée",
        title: "Avant la retraite,\nla pente devient raide.",
        body: "Une baisse des marchés au moment où les retraits commencent fait plus de dommages que la même baisse à 40 ans. Le plan doit tenir aussi les mauvaises années.",
        rail: "La dernière montée",
      },
      {
        eyebrow: "La traversée",
        title:
          "Épargner et vivre de son épargne,\nce n’est pas le même travail.",
        body: "REER et FERR, RRQ ou RPC, PSV, rentes, impôts\u00a0: chaque choix fait bouger les autres. La stratégie qui a bâti votre épargne n’est pas forcément celle qui doit vous verser un revenu.",
        rail: "La traversée",
      },
      {
        eyebrow: "La vie devant vous",
        title: "Le but n’est pas d’arriver à la retraite.\nC’est d’y vivre.",
        body: "Savoir ce que vous pouvez dépenser, d’où vient l’argent et ce qui se passe si la vie change.",
        rail: "La vie devant vous",
      },
    ],
  },
  en: {
    label: "The road to retirement",
    cta: "Plan a first meeting",
    listen: "Listen",
    pause: "Pause",
    scrollHint: "Scroll to begin",
    signsFoundations: ["RRSP", "TFSA", "Pension plan", "Net worth"],
    signsChoices: ["RRSP", "TFSA", "RRIF", "QPP", "OAS"],
    words: ["Volatility", "Inflation", "Fees", "Taxes"],
    placards: ["Accumulation", "Retirement\nincome"],
    acts: [
      {
        eyebrow: "What you’ve built",
        title: "For most of your career,\nthe plan was simple.",
        body: "Earn, save, invest. Your home, your pension, your RRSPs and TFSAs are the result.",
        rail: "What you’ve built",
      },
      {
        eyebrow: "The last climb",
        title: "The years before retirement\nare the steepest.",
        body: "A market drop just as withdrawals begin hurts more than the same drop at 40. The plan has to hold up in bad years, not just good ones.",
        rail: "The last climb",
      },
      {
        eyebrow: "The crossing",
        title: "Saving and spending\nare different jobs.",
        body: "RRSP to RRIF, QPP or CPP, OAS, pensions, taxes: each choice moves the others. The strategy that built your savings isn’t automatically the one that should pay you.",
        rail: "The crossing",
      },
      {
        eyebrow: "The life ahead",
        title: "The goal isn’t to reach retirement.\nIt’s to live it.",
        body: "Knowing what you can spend, where it comes from and what happens if life changes.",
        rail: "The life ahead",
      },
    ],
  },
};

/**
 * Bill's narration: one continuous track per language, with the second at
 * which each act's passage begins. English only for now; a language without
 * an entry (or without its file on disk) shows no Listen button.
 */
export const narration: Partial<
  Record<Language, { src: string; chapters: number[] }>
> = {
  en: { src: "/audio/journey/en.mp3", chapters: [0, 9.81, 23.2, 39.73] },
};
