import type { Language } from "./business";
import { pathFor } from "./routes";

/**
 * « Demandez à Bill » / "Ask Bill": real questions before retirement.
 *
 * One list of questions, used everywhere the series appears: the homepage
 * cards, the Ask Bill page, the chapters of the "Before You Retire" guide,
 * and later videos, articles and emails (see docs/ASK-BILL.md). A question
 * keeps its key forever; its anchor is the public URL fragment in each
 * language, so change it only with a redirect in mind.
 */
export const ASK_KEYS = [
  "how-much",
  "one-million",
  "retire-earlier",
  "retire-at-62",
  "qpp-60",
  "rrsp-or-tfsa",
  "mortgage",
  "market-crash",
  "more-conservative",
  "spouse",
  "already-advisor",
  "five-years",
] as const;
export type AskKey = (typeof ASK_KEYS)[number];

type QuestionText = {
  /** URL fragment on the Ask Bill page, in this language. */
  anchor: string;
  question: string;
  /** One line for a card. */
  teaser: string;
  /** The short answer: general information, never an instruction. */
  answer: string;
  /** What Bill looks at, for this question. */
  points: string[];
};

type GroupText = { title: string; blurb: string };

/** Where each question is answered at more length on the site. */
const RELATED: Record<
  AskKey,
  { page: "retirement" | "investments"; anchor: Record<Language, string> }
> = {
  "how-much": {
    page: "retirement",
    anchor: { fr: "moyens-retraite", en: "can-i-retire" },
  },
  "one-million": {
    page: "retirement",
    anchor: { fr: "moyens-retraite", en: "can-i-retire" },
  },
  "retire-earlier": {
    page: "retirement",
    anchor: { fr: "moyens-retraite", en: "can-i-retire" },
  },
  "retire-at-62": {
    page: "retirement",
    anchor: { fr: "rrq-psv", en: "qpp-oas" },
  },
  "qpp-60": { page: "retirement", anchor: { fr: "rrq-psv", en: "qpp-oas" } },
  "rrsp-or-tfsa": {
    page: "retirement",
    anchor: { fr: "ordre", en: "order" },
  },
  mortgage: {
    page: "retirement",
    anchor: { fr: "cinq-ans", en: "five-years" },
  },
  "market-crash": {
    page: "retirement",
    anchor: { fr: "baisse-marches", en: "markets" },
  },
  "more-conservative": {
    page: "investments",
    anchor: { fr: "risque", en: "risk" },
  },
  spouse: { page: "retirement", anchor: { fr: "famille", en: "family" } },
  "already-advisor": {
    page: "retirement",
    anchor: { fr: "planificateur", en: "planner" },
  },
  "five-years": {
    page: "retirement",
    anchor: { fr: "cinq-ans", en: "five-years" },
  },
};

/** The chapters: of the guide, and of the Ask Bill page. */
export const ASK_GROUPS: { key: string; questions: AskKey[] }[] = [
  {
    key: "enough",
    questions: ["how-much", "one-million"],
  },
  {
    key: "when",
    questions: ["retire-earlier", "retire-at-62"],
  },
  {
    key: "income",
    questions: ["qpp-60", "rrsp-or-tfsa", "mortgage"],
  },
  {
    key: "markets",
    questions: ["market-crash", "more-conservative"],
  },
  {
    key: "easy-to-miss",
    questions: ["spouse", "already-advisor", "five-years"],
  },
];

/** The questions shown on the homepage. */
export const FEATURED: AskKey[] = [
  "how-much",
  "retire-earlier",
  "rrsp-or-tfsa",
  "market-crash",
  "spouse",
  "five-years",
];

const text: Record<
  Language,
  { groups: Record<string, GroupText>; questions: Record<AskKey, QuestionText> }
> = {
  fr: {
    groups: {
      enough: {
        title: "Est-ce que j’en ai assez\u00a0?",
        blurb:
          "Ce qu’il faut vraiment pour prendre votre retraite, et pourquoi tout part de ce que vous dépensez.",
      },
      when: {
        title: "Prendre ma retraite quand je le veux\u00a0?",
        blurb:
          "Plus tôt que prévu ou à 62\u00a0ans\u00a0: ce qui fait bouger la date, et les années avant les rentes.",
      },
      income: {
        title: "De l’épargne au revenu",
        blurb:
          "Rentes du gouvernement, ordre des retraits, hypothèque\u00a0: comment ce que vous avez bâti devient une paie.",
      },
      markets: {
        title: "Vos placements et les marchés",
        blurb:
          "Ce qui change quand votre portefeuille commence à vous verser un revenu.",
      },
      "easy-to-miss": {
        title: "Ce qu’on oublie souvent",
        blurb:
          "Votre conjoint, le conseiller que vous avez déjà, les cinq ans avant le départ\u00a0: ce qui mérite qu’on s’y arrête.",
      },
    },
    questions: {
      "how-much": {
        anchor: "combien-faut-il-pour-la-retraite",
        question: "Combien me faut-il vraiment pour prendre ma retraite\u00a0?",
        teaser:
          "Il n’y a pas de chiffre magique. La réponse part de ce que vous dépenserez, pas de ce que vous avez.",
        answer:
          "Il n’y a pas de montant universel. La question utile part de l’autre bout\u00a0: combien vous dépenserez chaque année, pour l’essentiel, pour vos projets et pour les imprévus. On met ensuite en regard chaque source de revenu\u00a0: régime de retraite, RRQ, PSV, épargne. L’écart, s’il y en a un, dépend d’hypothèses sur les rendements, l’inflation et la longévité. C’est ce que Bill regarde avec vous, à l’aide de scénarios plutôt que d’une promesse.",
        points: [
          "Vos dépenses réelles, aujourd’hui et plus tard",
          "Toutes vos sources de revenu",
          "Les hypothèses derrière la projection",
          "Quelques scénarios, dont un moins favorable",
        ],
      },
      "one-million": {
        anchor: "j-ai-1-million-est-ce-assez",
        question: "J’ai 1\u00a0million\u00a0$. Est-ce que c’est assez\u00a0?",
        teaser:
          "Peut-être. Tout dépend de ce que vous dépensez, de vos autres revenus et du temps que l’argent doit durer.",
        answer:
          "Un même montant peut être largement suffisant pour une personne et serré pour une autre. Ce qui compte\u00a0: ce que vous prévoyez dépenser, les revenus qui s’ajoutent (régime de retraite, rente du RRQ, PSV), l’âge auquel vous arrêtez et les comptes où se trouve l’argent. Un retrait de REER ou de FERR s’ajoute à votre revenu imposable\u00a0; un retrait de CELI, non. Le chiffre seul ne répond pas à la question. Le portrait complet, oui.",
        points: [
          "Vos dépenses prévues",
          "Les revenus qui s’ajoutent",
          "Les comptes où se trouve l’argent",
          "L’âge auquel vous arrêtez",
        ],
      },
      "retire-earlier": {
        anchor: "retraite-plus-tot-que-prevu",
        question: "Puis-je prendre ma retraite plus tôt que prévu\u00a0?",
        teaser:
          "Peut-être. Chaque année plus tôt, c’est une année d’épargne en moins et une année de retraite en plus à financer.",
        answer:
          "Parfois, oui. Mais chaque année gagnée a un coût. Partir plus tôt veut dire moins d’années d’épargne, une retraite plus longue à financer et, parfois, des rentes moins élevées si vous les demandez plus tôt. Un régime de retraite d’employeur peut aussi avoir ses propres règles de départ anticipé. Certains quittent leur emploi d’un coup, d’autres réduisent leurs heures peu à peu. Ce qui fait la différence\u00a0: vos dépenses, les années avant les rentes et votre marge si les marchés déçoivent. Bill peut comparer quelques dates avec vous, côte à côte.",
        points: [
          "Quelques dates de départ, côte à côte",
          "Les années avant le début des rentes",
          "Les règles de votre régime de retraite",
          "Partir d’un coup ou graduellement",
        ],
      },
      "retire-at-62": {
        anchor: "retraite-a-62-ans",
        question: "Est-ce que je peux prendre ma retraite à 62\u00a0ans\u00a0?",
        teaser:
          "La vraie question\u00a0: qu’est-ce qui paie vos dépenses entre 62\u00a0ans et le début de vos autres revenus\u00a0?",
        answer:
          "À 62\u00a0ans, certains revenus ne sont pas encore là. La PSV ne peut pas commencer avant 65\u00a0ans, et la rente du RRQ, possible dès 60\u00a0ans, est réduite si vous la demandez tôt. Les premières années reposent donc souvent sur votre épargne et, s’il y a lieu, sur votre régime de retraite. Ce qui compte\u00a0: combien ces années coûtent, d’où vient l’argent et ce qu’il reste ensuite. Bill peut regarder avec vous si 62\u00a0ans tient la route, et à quelles conditions.",
        points: [
          "Les années entre 62 et 65\u00a0ans",
          "D’où vient le revenu, année par année",
          "Le moment de demander vos rentes",
          "Ce qu’il reste pour plus tard",
        ],
      },
      "qpp-60": {
        anchor: "rrq-a-60-ans-ou-attendre",
        question:
          "Devrais-je demander ma rente du RRQ à 60\u00a0ans, ou attendre\u00a0?",
        teaser:
          "Plus tôt\u00a0: une rente moins élevée, versée plus longtemps. Plus tard\u00a0: une rente plus élevée, à vie aussi. Le reste du plan tranche.",
        answer:
          "La rente du RRQ peut commencer entre 60 et 72\u00a0ans. La demander tôt donne plus d’années de versements, mais une rente réduite, à vie. Attendre donne une rente plus élevée, à vie aussi. Il n’y a pas de bonne réponse générale. Votre santé, vos autres revenus, votre conjoint et votre impôt font pencher la balance, et la décision se prend mieux avec le plan complet sous les yeux. C’est là que Bill vous aide à voir ce que chaque âge change.",
        points: [
          "Votre santé et votre horizon",
          "Vos autres revenus, année par année",
          "La situation de votre conjoint",
          "L’effet sur votre impôt",
        ],
      },
      "rrsp-or-tfsa": {
        anchor: "reer-ou-celi-en-premier",
        question: "REER ou CELI\u00a0: dans lequel puiser en premier\u00a0?",
        teaser:
          "Il n’y a pas d’ordre universel. L’ordre des retraits peut changer vos impôts, vos prestations et ce qui reste pour plus tard.",
        answer:
          "Il n’y a pas d’ordre qui vaut pour tout le monde. Un retrait de REER ou de FERR s’ajoute à votre revenu imposable\u00a0; un retrait de CELI, non. L’ordre des retraits peut donc changer vos impôts, vos prestations du gouvernement et ce qui reste pour plus tard. Un REER doit aussi devenir un FERR ou une rente au plus tard à la fin de l’année de vos 71\u00a0ans. Bill regarde avec vous l’ordre des retraits sur toute la retraite, pas seulement la première année.",
        points: [
          "Votre revenu imposable, année après année",
          "Les retraits minimums du FERR",
          "La récupération de la PSV",
          "Le fractionnement du revenu de pension",
        ],
      },
      mortgage: {
        anchor: "hypotheque-avant-la-retraite",
        question:
          "Devrais-je finir de payer mon hypothèque avant la retraite\u00a0?",
        teaser:
          "Pour certains, c’est un soulagement qui vaut son prix. Pour d’autres, l’argent sert mieux ailleurs. Les deux se défendent.",
        answer:
          "Il n’y a pas de réponse unique. Arriver à la retraite sans hypothèque réduit les dépenses fixes, et bien des gens y tiennent. Mais l’argent doit venir de quelque part\u00a0: un retrait de REER, par exemple, est imposable, et ce qui va dans la maison n’est plus disponible ailleurs. Le taux de votre prêt, vos revenus à venir et la marge que vous voulez garder pour l’imprévu comptent tous. Le confort de ne plus rien devoir aussi.",
        points: [
          "Le taux et le solde restant",
          "D’où viendrait l’argent",
          "Vos dépenses fixes à la retraite",
          "Ce que vous voulez garder disponible",
        ],
      },
      "market-crash": {
        anchor: "si-la-bourse-plonge-apres-la-retraite",
        question: "Et si la Bourse plonge juste après ma retraite\u00a0?",
        teaser:
          "Une baisse au début de la retraite pèse plus lourd. Personne ne peut la prévoir, mais on peut s’y préparer.",
        answer:
          "C’est une inquiétude légitime. Une baisse des marchés dans les premières années de retraite fait plus de dommages que la même baisse en milieu de carrière, parce que vous retirez de l’argent pendant que les prix sont bas. C’est ce qu’on appelle le risque de séquence des rendements. Personne ne peut prévoir les marchés. S’y préparer, c’est décider à l’avance d’où viendra le revenu des prochaines années, pour éviter, autant que possible, qu’une mauvaise année vous oblige à vendre au mauvais moment.",
        points: [
          "Le revenu des premières années",
          "Les liquidités à garder sous la main",
          "Le niveau de risque qui vous convient",
          "Un plan pour les mauvaises années",
        ],
      },
      "more-conservative": {
        anchor: "placements-plus-prudents",
        question: "Mes placements devraient-ils devenir plus prudents\u00a0?",
        teaser:
          "Pas automatiquement. Trop de risque fait mal au mauvais moment. Trop peu, et votre épargne risque de ne pas suivre l’inflation.",
        answer:
          "Moins de risque n’est pas automatiquement mieux. Trop de risque fait mal si les marchés baissent au moment où les retraits commencent. Trop peu peut empêcher votre épargne de suivre l’inflation pendant une longue retraite. Votre portefeuille s’apprête à changer de rôle\u00a0: vous verser un revenu, tout en continuant de croître assez pour durer. Le bon dosage vient de vos besoins de revenu et de votre horizon, pas d’une règle basée sur l’âge. C’est ce que Bill regarde avec vous, compte par compte.",
        points: [
          "Vos besoins de revenu, année par année",
          "Votre horizon, pas seulement votre âge",
          "Ce que contiennent vraiment vos comptes",
          "Votre confort face aux baisses",
        ],
      },
      spouse: {
        anchor: "si-l-un-de-nous-deux-decede",
        question:
          "Qu’arrive-t-il financièrement si l’un de nous deux décède en premier\u00a0?",
        teaser:
          "Certains revenus diminuent, d’autres s’arrêtent, l’impôt change. C’est une question à regarder à deux, pendant que tout va bien.",
        answer:
          "Souvent, le revenu du ménage baisse plus que les dépenses. Certaines rentes continuent en partie pour le survivant, d’autres s’arrêtent, et l’impôt se calcule désormais sur un seul revenu. Les réponses se trouvent dans les règles de votre régime de retraite, vos assurances, votre testament, votre mandat de protection et, pour certains produits, vos bénéficiaires. Planifier la retraite, c’est souvent planifier à deux, y compris cette partie-là. Pour les documents juridiques, un notaire ou un avocat peut vous accompagner.",
        points: [
          "Le revenu du survivant",
          "Les options de votre régime de retraite",
          "Testament, mandat de protection et bénéficiaires",
          "Les assurances déjà en place",
        ],
      },
      "already-advisor": {
        anchor: "j-ai-deja-un-conseiller",
        question:
          "J’ai déjà un conseiller. Pourquoi aurais-je quand même besoin d’un plan de retraite\u00a0?",
        teaser:
          "Un bon portefeuille ne vous dit pas quand partir, dans quel ordre faire vos retraits ni quoi faire de l’hypothèque.",
        answer:
          "Gérer des placements et planifier une retraite sont deux métiers voisins, mais distincts. Le premier porte surtout sur vos comptes. Le second relie tout le reste\u00a0: vos dépenses, le moment de vos rentes, l’ordre des retraits, l’impôt, votre conjoint, votre succession. Parfois, la même personne s’occupe des deux\u00a0; parfois, personne n’a encore regardé ces questions ensemble. Vouloir y voir plus clair ne remet pas en cause la relation que vous avez déjà.",
        points: [
          "Ce que votre conseiller actuel couvre déjà",
          "Ce qui relie vos comptes entre eux",
          "Les décisions au-delà des placements",
        ],
      },
      "five-years": {
        anchor: "cinq-ans-avant-la-retraite",
        question:
          "À quoi devrais-je faire attention dans les cinq ans qui précèdent ma retraite\u00a0?",
        teaser:
          "Ce sont les années où presque toutes les options sont encore ouvertes. Quelques décisions méritent d’être regardées tôt.",
        answer:
          "Ce sont des années qui comptent, parce que presque toutes les options sont encore ouvertes. Quelques sujets reviennent chez la plupart des gens\u00a0: une estimation honnête de vos dépenses, vos relevés de régime de retraite, l’estimation de vos rentes du RRQ et de la PSV, la liste de vos comptes, les dettes qui restent (hypothèque comprise), le niveau de risque de vos placements compte tenu des retraits à venir, un testament et un mandat de protection à jour. Rien ne se règle en une fois. Bill peut vous aider à mettre ces sujets dans le bon ordre.",
        points: [
          "Une estimation honnête de vos dépenses",
          "Vos relevés et estimations de rentes",
          "Le risque, compte tenu des retraits à venir",
          "Votre date de départ, un plan B",
        ],
      },
    },
  },
  en: {
    groups: {
      enough: {
        title: "Do I have enough?",
        blurb:
          "What retirement really takes, and why it all starts with what you spend.",
      },
      when: {
        title: "Can I retire when I want to?",
        blurb:
          "Sooner than planned, or at 62: what moves the date, and the years before pensions begin.",
      },
      income: {
        title: "From savings to income",
        blurb:
          "Government pensions, withdrawal order, the mortgage: how what you’ve built becomes a paycheque.",
      },
      markets: {
        title: "Your investments and the markets",
        blurb: "What changes when your portfolio starts paying you.",
      },
      "easy-to-miss": {
        title: "What’s easy to miss",
        blurb:
          "Your spouse, the advisor you already have, the five years before you stop: what deserves a closer look.",
      },
    },
    questions: {
      "how-much": {
        anchor: "how-much-do-i-need",
        question: "How much do I actually need to retire?",
        teaser:
          "There’s no magic number. The answer starts with what you’ll spend, not with what you have.",
        answer:
          "There’s no universal number. The useful question starts from the other end: what you’ll spend each year, on essentials, on plans and on the unexpected. Then you line up every source of income against it: pension plan, QPP, OAS, savings. The gap, if there is one, depends on assumptions about returns, inflation and how long you live. That’s what Bill looks at with you, in scenarios rather than promises.",
        points: [
          "Your real spending, now and later",
          "Every source of income",
          "The assumptions behind the projection",
          "A few scenarios, including a harder one",
        ],
      },
      "one-million": {
        anchor: "i-have-1-million-is-it-enough",
        question: "I have $1 million. Is that enough?",
        teaser:
          "Maybe. It depends on what you spend, your other income and how long the money has to last.",
        answer:
          "The same amount can be plenty for one person and tight for another. What matters is what you plan to spend, the income that comes on top (a pension plan, the QPP, OAS), the age you stop and where the money sits. RRSP and RRIF withdrawals add to your taxable income; TFSA withdrawals don’t. The number alone doesn’t answer the question. The whole picture does.",
        points: [
          "What you plan to spend",
          "The income that comes on top",
          "Which accounts the money is in",
          "The age you stop working",
        ],
      },
      "retire-earlier": {
        anchor: "retire-earlier",
        question: "Can I retire earlier than I thought?",
        teaser:
          "Maybe. Each year earlier is one less year of saving and one more year of retirement to fund.",
        answer:
          "Sometimes, yes. But every year gained has to be paid for somewhere. Leaving earlier means fewer years of saving, a longer retirement to fund and, sometimes, smaller pensions if you start them early. An employer pension plan may also have its own early-retirement rules. Some people stop all at once, others ease out. What makes the difference: your spending, the years before pensions start and your margin if markets disappoint. Bill can compare a few dates with you, side by side.",
        points: [
          "A few retirement dates, side by side",
          "The years before pensions begin",
          "Your pension plan’s early-retirement rules",
          "Easing out or stopping at once",
        ],
      },
      "retire-at-62": {
        anchor: "retire-at-62",
        question: "Can I retire at 62?",
        teaser:
          "The real question: what pays your expenses between 62 and the moment your other income starts?",
        answer:
          "At 62, some income isn’t there yet. OAS can’t start before 65, and the QPP, which can start at 60, pays less when it starts early. So the first years often rest on your savings and, if you have one, your pension plan. What matters is what those years cost, where the money comes from and what’s left afterwards. Bill can look with you at whether 62 holds up, and what it would take.",
        points: [
          "The years between 62 and 65",
          "Where income comes from, year by year",
          "When to start your pensions",
          "What’s left for later",
        ],
      },
      "qpp-60": {
        anchor: "qpp-at-60-or-wait",
        question: "Should I take my QPP at 60, or wait?",
        teaser:
          "Earlier: smaller payments, for more years. Later: larger payments, for fewer. Both last for life. The rest of your plan decides.",
        answer:
          "Your QPP pension can start between 60 and 72. Taking it early means more years of payments, but a smaller amount, for life. Waiting means a larger payment, also for life. There’s no general right answer. Your health, your other income, your spouse and your taxes tip the balance, and the decision is easier with the whole plan in front of you. That’s where Bill helps you see what each age changes.",
        points: [
          "Your health and your horizon",
          "Your other income, year by year",
          "Your spouse’s situation",
          "The effect on your taxes",
        ],
      },
      "rrsp-or-tfsa": {
        anchor: "rrsp-or-tfsa-first",
        question: "RRSP or TFSA: which should I draw from first?",
        teaser:
          "There’s no universal order. The order you draw in can change your taxes, your benefits and what’s left for later.",
        answer:
          "No order works for everyone. RRSP and RRIF withdrawals add to your taxable income; TFSA withdrawals don’t. So the order of withdrawals can change your taxes, your government benefits and what’s left for later. An RRSP also has to become a RRIF or an annuity by the end of the year you turn 71. Bill looks with you at the order of withdrawals across your whole retirement, not just the first year.",
        points: [
          "Your taxable income, year by year",
          "RRIF minimum withdrawals",
          "The OAS clawback",
          "Pension income splitting with a spouse",
        ],
      },
      mortgage: {
        anchor: "mortgage-before-retiring",
        question: "Should I pay off my mortgage before I retire?",
        teaser:
          "For some, it’s a relief worth paying for. For others, the money does more elsewhere. Both can make sense.",
        answer:
          "There’s no single answer. Reaching retirement without a mortgage lowers your fixed costs, and many people value that. But the money has to come from somewhere: an RRSP withdrawal, for instance, is taxable, and what goes into the house isn’t available for anything else. Your interest rate, your future income and the room you want to leave for the unexpected all count. So does the comfort of owing nothing.",
        points: [
          "The rate and the balance left",
          "Where the money would come from",
          "Your fixed costs in retirement",
          "What you’d like to keep on hand",
        ],
      },
      "market-crash": {
        anchor: "market-crash-after-retiring",
        question: "What if the market crashes right after I retire?",
        teaser:
          "A drop early in retirement hits harder. No one can predict it, but you can prepare for it.",
        answer:
          "It’s a fair worry. A market drop in the first years of retirement does more damage than the same drop in mid-career, because you’re withdrawing money while prices are down. This is called sequence-of-returns risk. No one can predict markets. Preparing for it means deciding in advance where the next few years of income will come from, so a bad year is less likely to force a bad sale.",
        points: [
          "Income for the first few years",
          "How much cash to keep on hand",
          "The risk that makes sense for you",
          "A plan for bad years",
        ],
      },
      "more-conservative": {
        anchor: "more-conservative-investments",
        question: "Should my investments become more conservative?",
        teaser:
          "Not automatically. Too much risk hurts at the wrong moment. Too little can leave your savings behind inflation.",
        answer:
          "Less risk isn’t automatically better. Too much risk hurts if markets fall just as withdrawals begin. Too little can leave your savings behind inflation over a long retirement. Your portfolio is about to get a new job: paying you an income while still growing enough to last. The right balance comes from your income needs and your timeline, not from a rule of thumb based on age. That’s what Bill looks at with you, account by account.",
        points: [
          "Your income needs, year by year",
          "Your timeline, not just your age",
          "What your accounts actually hold",
          "How you live with market drops",
        ],
      },
      spouse: {
        anchor: "if-one-of-us-dies-first",
        question: "What happens financially if one of us dies first?",
        teaser:
          "Some income shrinks, some stops, and taxes change. It’s a question to look at together, while all is well.",
        answer:
          "Household income often falls more than expenses do. Some pensions continue in part for the survivor, others stop, and taxes are then based on a single income. The answers lie in your pension plan’s rules, your insurance, your will, your protection mandate and, for some products, your beneficiaries. Planning a retirement often means planning for two, and that includes this part. For the legal documents, a notary or a lawyer can help.",
        points: [
          "Survivor income",
          "Your pension plan’s survivor options",
          "Will, protection mandate and beneficiaries",
          "The insurance already in place",
        ],
      },
      "already-advisor": {
        anchor: "already-have-an-advisor",
        question:
          "I already have an advisor. Why would I still need retirement planning?",
        teaser:
          "A good portfolio on its own doesn’t tell you when to retire, what to draw on first or what to do about the mortgage.",
        answer:
          "Managing investments and planning a retirement are related jobs, but not the same one. The first is mostly about your accounts. The second connects everything else: your spending, when your pensions start, the order of withdrawals, taxes, your spouse, your estate. Sometimes the same person does both; sometimes no one has looked at these questions together yet. Wanting a clearer picture doesn’t mean second-guessing the advisor you already have.",
        points: [
          "What your current advisor already covers",
          "How your accounts connect",
          "Decisions beyond the investments",
        ],
      },
      "five-years": {
        anchor: "five-years-before-retiring",
        question:
          "What should I pay attention to in the five years before I retire?",
        teaser:
          "These are the years when nearly every option is still open. A few decisions deserve an early look.",
        answer:
          "These years matter, because nearly every option is still open. A few topics come up for most people: an honest estimate of your spending, your pension statements and your QPP and OAS estimates, a list of your accounts, the debt that’s left (the mortgage included), investment risk against the withdrawals ahead, and an up-to-date will and protection mandate. None of it gets settled in one sitting. Bill can help you put it in the right order.",
        points: [
          "An honest estimate of your spending",
          "Your pension and benefit estimates",
          "Risk against the withdrawals ahead",
          "A retirement date, and a plan B",
        ],
      },
    },
  },
};

export type AskQuestion = QuestionText & {
  key: AskKey;
  href: string;
  more: string;
};

export function askQuestion(lang: Language, key: AskKey): AskQuestion {
  const q = text[lang].questions[key];
  const r = RELATED[key];
  return {
    key,
    ...q,
    href: `${pathFor(lang, "ask")}#${q.anchor}`,
    more: `${pathFor(lang, r.page)}#${r.anchor[lang]}`,
  };
}

export const askGroups = (lang: Language) =>
  ASK_GROUPS.map((g) => ({
    key: g.key,
    ...text[lang].groups[g.key],
    questions: g.questions.map((k) => askQuestion(lang, k)),
  }));

export const askFeatured = (lang: Language) =>
  FEATURED.map((k) => askQuestion(lang, k));

/** Raw text, for integrity tests. */
export const askText = text;
export const askRelated = RELATED;
