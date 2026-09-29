import type { Language } from "./business";
export type Answer = "yes" | "no" | "unsure" | null;
/** Five statements a pre-retiree should be able to answer "yes" to. */
export const questions = {
  fr: [
    "Je sais à peu près combien je dépenserai chaque année à la retraite.",
    "Je sais quand je commencerai ma rente du RRQ (ou du RPC) et la PSV, et pourquoi.",
    "Je sais dans quels comptes je puiserai en premier, et l’effet sur mes impôts.",
    "Mes placements sont prêts à financer des retraits, pas seulement à croître.",
    "Mon testament, mon mandat de protection et mes bénéficiaires sont à jour.",
  ],
  en: [
    "I know roughly what I’ll spend each year in retirement.",
    "I know when I’ll start QPP or CPP and OAS, and why.",
    "I know which accounts I’ll draw from first, and the tax impact.",
    "My investments are ready to fund withdrawals, not just to grow.",
    "My will, protection mandate and beneficiaries are up to date.",
  ],
};
export const topics = {
  fr: [
    "Mes dépenses de retraite",
    "Quand commencer le RRQ ou le RPC et la PSV",
    "L’ordre des retraits et les impôts",
    "Des placements prêts pour les retraits",
    "Testament, mandat et bénéficiaires",
  ],
  en: [
    "My retirement spending",
    "When to start QPP or CPP and OAS",
    "Withdrawal order and taxes",
    "Investments ready for withdrawals",
    "Will, mandate and beneficiaries",
  ],
};
export function discussionTopics(answers: Answer[], lang: Language) {
  return answers.flatMap((a, i) =>
    a === "no" || a === "unsure" ? [topics[lang][i]] : [],
  );
}
