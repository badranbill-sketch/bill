import type { Language } from "./business";
export const routes = {
  home: { fr: "", en: "" },
  retirement: { fr: "planification-retraite", en: "retirement-planning" },
  investments: { fr: "placements-retraite", en: "investing-for-retirement" },
  about: { fr: "a-propos", en: "about" },
  resources: { fr: "guide-retraite", en: "retirement-guide" },
  meeting: { fr: "demarche", en: "how-it-works" },
  fees: { fr: "outils/frais-placement", en: "tools/investment-fees" },
  privacy: { fr: "confidentialite", en: "privacy" },
  legal: { fr: "mentions-legales", en: "legal" },
} as const;
export type PageKey = keyof typeof routes;
export const pathFor = (lang: Language, key: PageKey) =>
  `/${lang}${routes[key][lang] ? "/" + routes[key][lang] : ""}`;
export const keyFor = (lang: Language, slug: string) =>
  (Object.keys(routes) as PageKey[]).find((k) => routes[k][lang] === slug);
export const other = (lang: Language): Language =>
  lang === "fr" ? "en" : "fr";
