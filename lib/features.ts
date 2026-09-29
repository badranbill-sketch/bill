import type { InkName } from "@/components/ink/file";
import type { Language } from "./business";

/**
 * Copy for the three blocks that follow the mountain ride: the journey and
 * guide cards, the "Ask Bill" video row and the closing invitation.
 */
export const features = {
  fr: {
    journey: {
      title: "Un nouveau chapitre mérite un chemin clair.",
      link: "Découvrir le parcours",
    },
    guide: {
      label: "Un guide pour la suite",
      title: "Avant de prendre votre retraite",
      subtitle:
        "Les questions qui valent la peine d’être posées avant votre dernier jour de travail.",
      body: "Un guide pratique et facile à lire pour réfléchir à ce qui compte vraiment avant la retraite.",
      cta: "Obtenir le guide gratuit",
      author: "Bill Badran",
    },
    ask: {
      label: "Vraies questions avant la retraite",
      title: "Demandez à Bill",
      intro:
        "Des réponses directes aux questions que se posent vraiment les gens à l’approche de la retraite.",
      all: "Voir toutes les questions",
      watch: "Regarder",
      soon: "Vidéo à venir",
      list: "Vidéos de Bill",
      questions: [
        "J’ai 800 000 $. Puis-je prendre ma retraite à 62 ans?",
        "Devrais-je demander ma rente du RRQ à 60 ans ou attendre?",
        "Devrais-je rembourser mon hypothèque avant la retraite?",
        "Et si le marché s’effondre juste après ma retraite?",
      ],
    },
    talk: {
      title: "Parlons-en.",
      body: "Une première rencontre est informelle et sans engagement : une occasion de discuter, de poser vos questions et de voir si nous sommes faits pour travailler ensemble.",
      cta: "Rencontrer Bill",
      sign: "De meilleures questions. Un avenir plus lumineux.",
      signed: "— Bill",
    },
  },
  en: {
    journey: {
      title: "A new chapter deserves a clear path.",
      link: "See the journey",
    },
    guide: {
      label: "A guide for what comes next",
      title: "Before You Retire",
      subtitle: "The questions worth answering before your last day at work.",
      body: "A practical, easy-to-read guide to help you think through what really matters before retirement.",
      cta: "Get your free guide",
      author: "Bill Badran",
    },
    ask: {
      label: "Real questions before retirement",
      title: "Ask Bill",
      intro:
        "Straight answers to the questions pre-retirees are really asking.",
      all: "See all questions",
      watch: "Watch",
      soon: "Video coming soon",
      list: "Videos from Bill",
      questions: [
        "I have $800,000. Can I retire at 62?",
        "Should I take QPP at 60 or wait?",
        "Should I pay off my mortgage before retiring?",
        "What if the market crashes right after I retire?",
      ],
    },
    talk: {
      title: "Let’s have a conversation.",
      body: "A first meeting is informal and no obligation — just a chance to talk, ask questions, and see if it’s a good fit.",
      cta: "Meet Bill",
      sign: "Better questions. A brighter tomorrow.",
      signed: "— Bill",
    },
  },
} satisfies Record<Language, unknown>;

/**
 * The "Ask Bill" videos, in the order of `ask.questions`. Nothing is filmed
 * yet, so each card is drawn with a spot illustration and says "coming
 * soon". When a video exists, add its address per language in `href` (a
 * page or a YouTube/Vimeo link) and, optionally, a still from it in
 * `poster` (a path under /public). The card then becomes a link.
 */
export type AskVideo = {
  art: InkName;
  href?: Partial<Record<Language, string>>;
  poster?: string;
};
export const askVideos: AskVideo[] = [
  { art: "travel-bag" },
  { art: "bridge" },
  { art: "house" },
  { art: "lighthouse" },
];
