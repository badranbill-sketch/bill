import type { InkName } from "@/components/ink/file";
import type { Language } from "./business";

export const features = {
  fr: {
    journey: {
      label: "Le chemin vers la retraite",
      title: "Un nouveau chapitre mérite un chemin clair.",
      link: "Découvrir le parcours",
    },
    guide: {
      label: "À lire à votre rythme",
      title: "La retraite, ça veut dire quoi pour vous?",
      body: "Avant de choisir une date, pensez à la vie que vous souhaitez. Ce guide vous aide à relier les questions, une à la fois.",
      cta: "Lire le guide gratuit",
      explore: "Explorer le guide retraite",
      preview: "Ouvrir le guide de Bill",
      inside: "Jeter un coup d’œil à l’intérieur",
      pdf: "PDF · S’ouvre dans un nouvel onglet",
      review: "PDF en anglais · Édition de révision · Nouvel onglet",
      pending: "Des questions et une liste de préparation pour commencer.",
      chapters: [
        "Ce que vous voulez vivre et dépenser",
        "Vos rentes et vos sources de revenu",
        "Les retraits, les impôts et les frais",
        "Vos notes pour une première rencontre",
      ],
    },
    ask: {
      label: "Les vraies questions avant la retraite",
      title: "Demandez à Bill",
      intro:
        "Les questions qui reviennent souvent. Un bon point de départ pour en parler.",
      all: "Explorer toutes les questions",
      watch: "Regarder la réponse",
      read: "Explorer cette question",
      soon: "Vidéo à venir",
      list: "Questions pour Bill",
      questions: [
        "J’ai 800 000 $. Puis-je prendre ma retraite à 62 ans?",
        "Devrais-je demander ma rente du RRQ à 60 ans ou attendre?",
        "Devrais-je rembourser mon hypothèque avant la retraite?",
        "Et si le marché s’effondre juste après ma retraite?",
      ],
    },
    talk: {
      label: "La prochaine étape peut être simple",
      title: "Prenons le temps d’en parler.",
      body: "Dites à Bill où vous en êtes et ce que vous aimeriez clarifier. Une première rencontre permet de voir si le courant passe.",
      cta: "Planifier une première rencontre",
      call: "Vous préférez appeler?",
      sign: "De meilleures questions. Un avenir plus lumineux.",
      signed: "— Bill",
    },
  },
  en: {
    journey: {
      label: "The road to retirement",
      title: "A new chapter deserves a clear path.",
      link: "See the journey",
    },
    guide: {
      label: "A little clarity, at your own pace",
      title: "What does retirement mean to you?",
      body: "Before choosing a date, start with the life you want. This guide helps you connect the questions, one at a time.",
      cta: "Read the free guide",
      explore: "Explore the retirement guide",
      preview: "Open Bill’s retirement guide",
      inside: "Take a look inside",
      pdf: "PDF · Opens in a new tab",
      review: "English PDF · Review edition · New tab",
      pending: "Questions and a preparation checklist to help you begin.",
      chapters: [
        "How you want to live and what you will spend",
        "Pensions and your sources of income",
        "Withdrawals, taxes and fees",
        "Your notes for a first meeting",
      ],
    },
    ask: {
      label: "Real questions before retirement",
      title: "Ask Bill",
      intro:
        "The questions that keep coming up. A good place to start a conversation.",
      all: "Explore all the questions",
      watch: "Watch the answer",
      read: "Explore this question",
      soon: "Video coming soon",
      list: "Questions for Bill",
      questions: [
        "I have $800,000. Can I retire at 62?",
        "Should I take QPP at 60 or wait?",
        "Should I pay off my mortgage before retiring?",
        "What if the market crashes right after I retire?",
      ],
    },
    talk: {
      label: "The next step can be a simple one",
      title: "Let’s have a conversation.",
      body: "Tell Bill where you are and what you’d like to understand. A first meeting is a chance to see whether it’s a good fit.",
      cta: "Plan a first meeting",
      call: "Prefer to call?",
      sign: "Better questions. A brighter tomorrow.",
      signed: "— Bill",
    },
  },
} satisfies Record<Language, unknown>;

/** Connect approved recordings per language; until then cards lead to related reading. */
export type AskVideo = {
  art: InkName;
  anchor: Record<Language, string>;
  href?: Partial<Record<Language, string>>;
  poster?: string;
};
export const askVideos: AskVideo[] = [
  { art: "travel-bag", anchor: { fr: "moyens-retraite", en: "can-i-retire" } },
  { art: "bridge", anchor: { fr: "sources-revenu", en: "income" } },
  { art: "house", anchor: { fr: "moyens-retraite", en: "can-i-retire" } },
  { art: "lighthouse", anchor: { fr: "baisse-marches", en: "markets" } },
];
