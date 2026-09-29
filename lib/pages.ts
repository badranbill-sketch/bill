import type { Language } from "./business";
/** `id` makes a section linkable (the homepage questions point at them). */
type Section = {
  id?: string;
  heading: string;
  /** A short handwritten note under the heading, as Bill might jot it. */
  note?: string;
  /** A spot drawing in the margin of this section. */
  art?: "house" | "travel" | "bridge";
  paragraphs: string[];
  items?: string[];
};
type ContentPage = {
  /** A line above the headline (e.g. who is speaking). */
  kicker?: string;
  title: string;
  /** Search title, when the on-page headline is not the best query match. */
  seoTitle?: string;
  description: string;
  sections: Section[];
};
export const pages: Record<
  Language,
  Record<
    "retirement" | "investments" | "about" | "meeting" | "privacy" | "legal",
    ContentPage
  >
> = {
  fr: {
    retirement: {
      title: "Planifier la retraite, avant d’arrêter de travailler.",
      seoTitle: "Planification de la retraite à Laval et au Québec",
      description:
        "Ce qui change de 5 à 15 ans avant la retraite, les questions à régler et comment un planificateur financier coordonne revenu, placements, impôts et succession.",
      sections: [
        {
          id: "ce-qui-change",
          heading: "Qu’est-ce qui change financièrement à la retraite\u00a0?",
          paragraphs: [
            "Pendant votre carrière, le système est simple\u00a0: gagner, épargner, investir, recommencer. À la retraite, il s’inverse. L’épargne devient un revenu, et chaque retrait touche vos impôts, vos prestations gouvernementales et la durée de votre argent.",
            "C’est pourquoi la stratégie qui a bâti votre épargne n’est pas forcément celle qui doit vous verser un revenu. Les années avant la retraite sont le moment de la revoir, pendant que presque toutes les options sont encore ouvertes.",
          ],
        },
        {
          id: "moyens-retraite",
          heading:
            "Comment savoir si j’ai les moyens de prendre ma retraite\u00a0?",
          art: "travel",
          paragraphs: [
            "Commencez par les dépenses, pas par l’épargne. Estimez ce que vous dépenserez vraiment chaque année (l’essentiel, les projets, les imprévus), puis placez chaque source de revenu en face.",
            "Une projection utile montre l’écart, les hypothèses derrière (rendements, inflation, longévité) et ce qui arrive si elles se révèlent fausses. C’est un outil de planification, pas une promesse.",
          ],
        },
        {
          id: "sources-revenu",
          heading: "D’où viendra mon revenu de retraite\u00a0?",
          paragraphs: [
            "La plupart des gens puisent à plusieurs sources, chacune avec ses règles\u00a0:",
          ],
          items: [
            "Un régime de retraite d’employeur, s’il y a lieu.",
            "Le Régime de rentes du Québec (RRQ) ou le Régime de pensions du Canada (RPC).",
            "La pension de la Sécurité de la vieillesse (PSV).",
            "Les REER, qui doivent devenir un FERR ou une rente au plus tard à la fin de l’année de vos 71 ans.",
            "Les CELI et les placements non enregistrés.",
            "Pour les propriétaires d’entreprise, les sommes détenues dans leur société.",
          ],
        },
        {
          id: "ordre",
          heading: "Dans quel ordre utiliser ces sources\u00a0?",
          art: "bridge",
          note: "Des décisions qui se répondent.",
          paragraphs: [
            "La question n’est pas seulement combien chacune rapporte, mais quand et dans quel ordre les utiliser. Puiser d’abord dans un compte plutôt qu’un autre peut changer vos impôts, vos prestations et ce qui reste pour plus tard.",
          ],
        },
        {
          id: "rrq-psv",
          heading: "À quel âge demander vos rentes du gouvernement\u00a0?",
          paragraphs: [
            "Vous pouvez commencer la rente du RRQ entre 60 et 72 ans, celle du RPC entre 60 et 70 ans, et la PSV entre 65 et 70 ans. Commencer plus tard donne un paiement plus élevé, à vie. Commencer plus tôt donne plus d’années de paiements.",
            "Le bon âge dépend de votre santé, de vos autres revenus, de votre conjoint et de vos impôts. C’est une décision à prendre avec le plan complet sous les yeux.",
          ],
        },
        {
          id: "impots",
          heading: "Combien d’impôt vais-je payer à la retraite\u00a0?",
          paragraphs: [
            "Cela dépend moins de ce que vous avez que de la façon dont vous le retirez. L’ordre des retraits, les minimums du FERR, le fractionnement du revenu de pension avec un conjoint et l’impôt de récupération de la PSV peuvent changer votre facture fiscale pendant des décennies.",
            "Planifier, c’est faire ces choix volontairement, pas par défaut. Certaines situations demandent aussi votre comptable.",
          ],
        },
        {
          id: "baisse-marches",
          heading:
            "Et si les marchés baissent au moment où je prends ma retraite\u00a0?",
          paragraphs: [
            "Une baisse durant les premières années de retraite fait plus de dommages que la même baisse à 40 ans, parce que vous retirez de l’argent pendant que les prix sont bas. C’est ce qu’on appelle le risque de séquence des rendements.",
            "S’y préparer, c’est décider à l’avance d’où viendra le revenu des prochaines années, pour qu’une mauvaise année risque moins de forcer une mauvaise vente.",
          ],
        },
        {
          id: "famille",
          heading: "Qu’arrive-t-il à mon conjoint et à ma famille\u00a0?",
          art: "house",
          paragraphs: [
            "Planifier la retraite, c’est souvent planifier à deux. Que devient le revenu si l’un de vous décède en premier\u00a0? Votre testament, votre mandat de protection et vos bénéficiaires sont-ils à jour\u00a0? L’assurance vie est-elle encore nécessaire\u00a0?",
            "Ces questions font partie du même plan que vos placements. Les documents juridiques se préparent avec votre notaire.",
          ],
        },
        {
          id: "cinq-ans",
          heading: "Que faire cinq ans avant la retraite\u00a0?",
          paragraphs: ["Une liste concrète\u00a0:"],
          items: [
            "Estimer honnêtement vos dépenses de retraite.",
            "Obtenir vos relevés de régime de retraite et vos estimations RRQ ou RPC et PSV.",
            "Dresser la liste de tous vos comptes\u00a0: où ils sont et à quoi ils servent.",
            "Décider quoi faire des dettes restantes, y compris l’hypothèque.",
            "Vérifier le risque de vos placements par rapport aux retraits à venir.",
            "Mettre à jour testament, mandat de protection et bénéficiaires.",
            "Tester votre date de retraite, et un plan B.",
          ],
        },
        {
          id: "planificateur",
          heading:
            "Que fait un planificateur financier avant la retraite\u00a0?",
          paragraphs: [
            "Bill regarde tout ensemble\u00a0: revenu, placements, impôts, assurances, succession et vos objectifs. Il établit où vous en êtes, met à l’épreuve les décisions devant vous et garde le plan à jour quand la vie change.",
            "Tout commence par une conversation. Ce que Bill fera pour vous, et la façon dont il est rémunéré, vous sont expliqués avant tout engagement. Un avis juridique ou fiscal propre à votre situation peut nécessiter d’autres professionnels.",
          ],
        },
      ],
    },
    investments: {
      title: "Votre portefeuille s’apprête à changer de rôle.",
      seoTitle: "Placements avant et pendant la retraite",
      description:
        "Avant la retraite, vos placements croissent. Après, ils vous paient. Ce qui change pour le risque, les liquidités, la diversification et les frais.",
      sections: [
        {
          id: "nouveau-role",
          heading: "Pourquoi les placements changent avant la retraite",
          paragraphs: [
            "Pendant des décennies, votre portefeuille avait un seul rôle\u00a0: croître. Bientôt, il en aura deux\u00a0: vous verser un revenu chaque année, et continuer de croître assez pour durer 25 ou 30 ans.",
            "Ce changement influence le risque qui a du sens, les liquidités à garder sous la main et les comptes où puiser.",
          ],
        },
        {
          id: "risque",
          heading: "Quel risque prendre à l’approche de la retraite\u00a0?",
          paragraphs: [
            "Moins n’est pas automatiquement mieux. Trop de risque fait mal si les marchés baissent au moment où les retraits commencent. Trop peu peut laisser votre épargne derrière l’inflation pendant une longue retraite.",
            "La réponse vient de vos besoins de revenu et de votre horizon, pas d’une règle basée sur l’âge.",
          ],
        },
        {
          id: "diversification",
          heading: "Mes placements sont-ils vraiment diversifiés\u00a0?",
          paragraphs: [
            "Plusieurs comptes dans plusieurs institutions, ce n’est pas la même chose que la diversification. Ce qui compte\u00a0: ce qu’ils contiennent, où ils se recoupent et à quoi chacun sert.",
          ],
        },
        {
          id: "frais",
          heading: "Que paie-t-on, et pour quoi\u00a0?",
          note: "Plus de clarté, moins de bruit.",
          paragraphs: [
            "Demandez quels frais s’appliquent, comment ils sont calculés, qui les reçoit et ce qu’ils couvrent. Sur 25 ans de retraite, un écart qui semble petit s’accumule.",
            "L’illustration des frais compare deux scénarios simplifiés. Elle n’affiche pas les frais de Bill et ne recommande aucun produit.",
          ],
        },
        {
          id: "relation",
          heading: "Comment fonctionne la relation",
          paragraphs: [
            "La fréquence des rencontres, les communications et la prise de décision sont convenues avant de commencer, puis revues quand votre vie change.",
          ],
        },
      ],
    },
    about: {
      kicker: "Bill Badran, planificateur financier à Laval",
      title:
        "Les chiffres sont importants. Mais ce sont vos projets qui leur donnent un sens.",
      seoTitle: "Bill Badran, planificateur financier à Laval",
      description:
        "Aider des gens à passer de l’épargne à la retraite, en français ou en anglais.",
      sections: [
        {
          heading: "Pourquoi Bill travaille ainsi",
          note: "Écouter d’abord.",
          paragraphs: [
            "À l’approche de la retraite, la plupart des gens n’ont pas besoin d’un produit de plus. Ils ont besoin de comprendre où ils en sont, ce que chaque décision change, et dans quel ordre les prendre.",
            "Bill commence donc par écouter\u00a0: ce que vous avez bâti, la vie que vous voulez mener, ce qui vous inquiète. Les comptes, les rentes et les impôts viennent ensuite, au service de ces projets.",
            "Quand une décision est difficile (une baisse des marchés, une retraite plus tôt que prévu, un changement de santé ou de famille), son rôle est de garder le portrait complet en vue, d’expliquer les options simplement et de vous laisser décider, sans pression.",
          ],
        },
        {
          heading: "Des marchés qui montent et qui baissent",
          paragraphs: [
            "Depuis plus de 15 ans, Bill travaille avec des gens avant et après la retraite\u00a0: dans les bons marchés comme dans les chutes brutales, au fil des changements de carrière et de famille, et des décisions qui viennent avec chacun.",
            "L’expérience ne rend pas l’avenir prévisible. Elle aide à voir quelles décisions comptent le plus, et à quel moment.",
          ],
        },
        {
          heading: "Sa façon de travailler",
          paragraphs: [
            "Bill est planificateur financier indépendant. Il regarde le portrait complet (revenu, placements, impôts, assurances et succession) parce qu’à la retraite, tout bouge ensemble.",
            "Il explique simplement, en français ou en anglais. Quand une question demande un notaire ou un comptable, le plan les inclut.",
          ],
        },
        {
          heading: "Avec qui Bill travaille",
          paragraphs: [
            "La plupart prendront leur retraite d’ici 5 à 15 ans. Certains l’ont déjà prise.",
          ],
          items: [
            "Des professionnels et des salariés qui ont un régime de retraite et de l’épargne à coordonner.",
            "Des couples qui planifient deux retraites comme une seule.",
            "Des propriétaires d’entreprise dont la retraite reposera en partie sur leur société.",
          ],
        },
        {
          heading: "Titres et vérification",
          paragraphs: [
            "Pl. Fin. (planificateur financier) · CIM® · B.A.A. · Représentant de courtier en épargne collective.",
            "Vous pouvez vérifier les autorisations de tout conseiller dans le registre de l’Autorité des marchés financiers.",
          ],
        },
      ],
    },
    meeting: {
      title: "Une première rencontre, simplement.",
      seoTitle: "Première rencontre avec un planificateur financier à Laval",
      description:
        "Une conversation sur votre situation, les questions qui vous préoccupent et ce que vous aimeriez clarifier.",
      sections: [
        {
          id: "deroulement",
          heading: "Comment se passe la première rencontre\u00a0?",
          paragraphs: [
            "Bill écoute d’abord. Il pose des questions, répond aux vôtres et vous dit ce qui lui semble le plus important. Ensuite, vous décidez tous les deux si travailler ensemble a du sens.",
            "Le format, la durée et les coûts éventuels sont confirmés au moment de prendre rendez-vous.",
          ],
        },
        {
          id: "apporter",
          heading: "Que dois-je apporter\u00a0?",
          paragraphs: [
            "Rien n’est obligatoire. Si vous les avez, ces documents aident\u00a0:",
          ],
          items: [
            "Votre âge de retraite visé, même approximatif.",
            "Des relevés récents de votre régime de retraite, de vos REER, CELI et autres placements.",
            "Votre relevé de participation au RRQ (ou au RPC) et votre dernière déclaration de revenus.",
            "Les questions qui reviennent sans cesse.",
          ],
        },
        {
          id: "suite",
          heading: "Que se passe-t-il si nous travaillons ensemble\u00a0?",
          paragraphs: [
            "Ce que Bill fera pour vous, et la façon dont il est rémunéré, vous sont expliqués avant tout engagement. Vient ensuite le plan\u00a0: où vous en êtes, les décisions à venir, quelques scénarios et les prochaines étapes, puis des révisions quand les marchés ou votre vie changent.",
          ],
        },
        {
          id: "rendez-vous",
          heading: "Prendre rendez-vous",
          paragraphs: [
            "Calendly confirme le moment choisi. Vous pouvez aussi appeler Bill ou lui écrire. N’envoyez ni relevés ni numéros de compte par courriel.",
          ],
        },
      ],
    },
    privacy: {
      title: "Vos renseignements et ce site.",
      description:
        "Notice de fonctionnement de la version de révision. La politique destinée au lancement doit être approuvée par le responsable de la pratique.",
      sections: [
        {
          heading: "La liste de préparation et l’illustration des frais",
          paragraphs: [
            "Les réponses et les valeurs saisies dans ces outils restent dans la mémoire de la page. Elles ne sont pas envoyées au serveur, ajoutées aux formulaires ni enregistrées dans le stockage du navigateur. Un rechargement de la page les efface. L’impression utilise la fonction d’impression de votre navigateur.",
          ],
        },
        {
          heading: "Demandes de contact",
          paragraphs: [
            "Le formulaire, lorsqu’il est configuré, demande un nom, un courriel, un sujet et un message afin de permettre une réponse. Il n’inscrit pas automatiquement à une liste de diffusion. Sans configuration du service d’envoi et de protection contre les abus, le formulaire est indisponible.",
            "Le connecteur prévu transmet la demande à Resend pour l’envoi vers la boîte de réception de la pratique. Un identifiant dérivé de l’adresse IP est conservé dans Upstash pendant dix minutes pour limiter les tentatives\u00a0; le corps du message n’y est pas enregistré. Le site n’enregistre pas les messages dans une base de données locale.",
          ],
        },
        {
          heading: "Navigation et services externes",
          paragraphs: [
            "Aucun outil de mesure marketing ni abonnement à une infolettre n’est activé dans cette version. Les polices et le portrait sont servis par le site. Le serveur et son hébergeur peuvent traiter des données techniques nécessaires aux requêtes.",
            "Les liens vers d’autres sites ouvrent les services de leurs exploitants. Leurs propres pratiques de confidentialité s’appliquent lorsque vous les consultez. Le site n’intègre pas leur suivi par défaut.",
          ],
        },
        {
          heading: "Questions et politique avant lancement",
          paragraphs: [
            "Vous pouvez utiliser les coordonnées affichées pour une question concernant ce site. Évitez de joindre des renseignements financiers sensibles à un premier courriel.",
            "La personne responsable de la protection des renseignements, les délais de conservation des courriels et journaux, les lieux de traitement, les modalités d’accès et de rectification et les contrats des prestataires doivent être établis puis intégrés à la politique approuvée avant le lancement. Cette notice ne constitue pas une attestation de conformité.",
          ],
        },
      ],
    },
    legal: {
      title: "Mentions légales.",
      description:
        "Renseignements sur la portée du contenu et le statut de cette version de révision.",
      sections: [
        {
          heading: "Information générale",
          paragraphs: [
            "Le contenu sert à préparer une discussion. Il ne tient pas compte de votre situation personnelle et ne constitue pas une recommandation d’achat ou de vente, un avis fiscal ou un avis juridique. Les placements comportent des risques.",
          ],
        },
        {
          heading: "Illustrations et articles",
          paragraphs: [
            "L’outil sur les frais utilise des hypothèses constantes et simplifiées. Il ne présente ni les frais réels de Bill, ni un rendement attendu, ni une garantie. Les articles désignés comme brouillons sont accessibles seulement dans l’espace local ou protégé de révision\u00a0; ils ne sont pas des publications approuvées par Bill.",
          ],
        },
        {
          heading: "Identité et services",
          paragraphs: [
            "Le site présente Bill Badran, à Laval. Les titres, l’inscription, l’affiliation au cabinet ou courtier et la formulation exacte des services doivent faire l’objet d’une validation avant le lancement.",
          ],
        },
        {
          heading: "Liens et rendez-vous",
          paragraphs: [
            "Un clic sur un lien de contact ou l’acceptation d’une demande par le service d’envoi ne confirme pas un rendez-vous. Les conditions d’une relation professionnelle sont à convenir directement.",
            "Les mentions exigées par le cabinet ou le courtier et la procédure applicable aux plaintes doivent être approuvées et ajoutées avant la mise en ligne publique.",
          ],
        },
      ],
    },
  },
  en: {
    retirement: {
      title: "Retirement planning, before you stop working.",
      seoTitle: "Retirement planning in Laval and Québec",
      description:
        "What changes 5 to 15 years before retirement, the questions to answer, and how a financial planner helps you coordinate income, investments, taxes and estate.",
      sections: [
        {
          id: "what-changes",
          heading: "What changes financially when you retire?",
          paragraphs: [
            "While you work, the system is simple: earn, save, invest, repeat. In retirement it runs the other way. Savings become income, and every withdrawal touches your taxes, your government benefits and how long the money lasts.",
            "That’s why the strategy that built your savings isn’t automatically the one that should pay you. The years before retirement are when to redesign it, while nearly every option is still open.",
          ],
        },
        {
          id: "can-i-retire",
          heading: "How do I know if I can afford to retire?",
          art: "travel",
          paragraphs: [
            "Start with spending, not savings. Estimate what you’ll actually spend each year (essentials, plans, the unexpected), then line up every source of income against it.",
            "A useful projection shows the gap, the assumptions behind it (returns, inflation, how long you live) and what happens if they turn out wrong. It’s a planning tool, not a promise.",
          ],
        },
        {
          id: "income",
          heading: "Where will my retirement income come from?",
          paragraphs: [
            "Most people draw on several sources, each with its own rules:",
          ],
          items: [
            "An employer pension plan, if you have one.",
            "The Québec Pension Plan (QPP) or Canada Pension Plan (CPP).",
            "Old Age Security (OAS).",
            "RRSPs, which must become a RRIF or an annuity by the end of the year you turn 71.",
            "TFSAs and non-registered investments.",
            "For business owners, money held in their corporation.",
          ],
        },
        {
          id: "order",
          heading: "In what order should I use them?",
          art: "bridge",
          note: "Decisions that connect.",
          paragraphs: [
            "The question isn’t only how much each source provides, but when and in what order to use it. Drawing on one account before another can change your taxes, your benefits and what’s left for later.",
          ],
        },
        {
          id: "qpp-oas",
          heading: "When should your government pensions start?",
          paragraphs: [
            "You can start the QPP between 60 and 72, the CPP between 60 and 70, and OAS between 65 and 70. Starting later means a larger payment, for life. Starting earlier means more years of payments.",
            "The right age depends on your health, your other income, your spouse and your taxes. It’s a decision to make with the whole plan in front of you.",
          ],
        },
        {
          id: "taxes",
          heading: "How much tax will I pay in retirement?",
          paragraphs: [
            "It depends less on how much you have than on how you draw it. Withdrawal order, RRIF minimums, pension income splitting with a spouse and the OAS recovery tax (the clawback) can change your tax bill for decades.",
            "Planning means making those choices on purpose, not by default. Some situations also call for your accountant.",
          ],
        },
        {
          id: "markets",
          heading: "What if markets fall just as I retire?",
          paragraphs: [
            "A decline in the first years of retirement does more damage than the same decline at 40, because you’re withdrawing while prices are down. This is called sequence-of-returns risk.",
            "Planning for it means deciding in advance where the next few years of income will come from, so a bad year is less likely to force a bad sale.",
          ],
        },
        {
          id: "family",
          heading: "What happens to my spouse and family?",
          art: "house",
          paragraphs: [
            "Planning a retirement often means planning for two. What happens to income if one of you dies first? Are your will, your protection mandate and your beneficiaries up to date? Is life insurance still needed?",
            "These questions belong in the same plan as your investments. Legal documents are prepared with your notary.",
          ],
        },
        {
          id: "five-years",
          heading: "What should I do five years before retirement?",
          paragraphs: ["A practical list:"],
          items: [
            "Estimate your retirement spending, honestly.",
            "Get your pension, QPP or CPP, and OAS estimates.",
            "List every account: where it is and what it’s for.",
            "Decide what to do with remaining debt, including the mortgage.",
            "Check investment risk against the withdrawals ahead.",
            "Update your will, protection mandate and beneficiaries.",
            "Test your retirement date, and a plan B.",
          ],
        },
        {
          id: "planner",
          heading: "What does a financial planner do before retirement?",
          paragraphs: [
            "Bill looks at everything together: income, investments, taxes, insurance, estate and your goals. He maps where you stand, tests the decisions in front of you and keeps the plan current as life changes.",
            "It starts with a conversation. What Bill will do for you, and how he is paid, are explained before you commit to anything. Legal or tax advice specific to your situation may require other professionals.",
          ],
        },
      ],
    },
    investments: {
      title: "Your portfolio is about to get a new job.",
      seoTitle: "Investing before and during retirement",
      description:
        "Before retirement, investments grow. After, they pay you. How risk, cash, diversification and fees change as withdrawals approach.",
      sections: [
        {
          id: "new-job",
          heading: "Why investing changes before retirement",
          paragraphs: [
            "For decades, your portfolio had one job: grow. Soon it has two: pay you every year, and keep growing enough to last 25 or 30 years.",
            "That shift changes how much risk makes sense, how much cash to keep on hand and which accounts to draw from.",
          ],
        },
        {
          id: "risk",
          heading: "How much risk should I take approaching retirement?",
          paragraphs: [
            "Less isn’t automatically better. Too much risk hurts if markets fall just as withdrawals begin. Too little can leave your savings behind inflation over a long retirement.",
            "The answer comes from your income needs and your timeline, not from a rule of thumb based on age.",
          ],
        },
        {
          id: "diversification",
          heading: "Are my investments actually diversified?",
          paragraphs: [
            "Several accounts at several institutions aren’t the same thing as diversification. What matters is what they hold, where they overlap and what each one is for.",
          ],
        },
        {
          id: "fees",
          heading: "What am I paying, and for what?",
          note: "More clarity, less noise.",
          paragraphs: [
            "Ask which fees apply, how they’re calculated, who receives them and what they cover. Over 25 years of retirement, a difference that looks small adds up.",
            "The fee illustration compares two simplified scenarios. It doesn’t show Bill’s fees or recommend a product.",
          ],
        },
        {
          id: "relationship",
          heading: "How the relationship works",
          paragraphs: [
            "How often you meet, how you communicate and how decisions are made are agreed before you start, and revisited when your life changes.",
          ],
        },
      ],
    },
    about: {
      kicker: "Bill Badran, financial planner in Laval",
      title: "The numbers matter. But it’s your plans that give them meaning.",
      seoTitle: "Bill Badran, financial planner in Laval",
      description:
        "Helping people move from saving to retirement, in French or English.",
      sections: [
        {
          heading: "Why Bill works this way",
          note: "Listen first.",
          paragraphs: [
            "As retirement gets closer, most people don’t need one more product. They need to understand where they stand, what each decision changes, and in what order to make them.",
            "So Bill starts by listening: what you’ve built, the life you want to lead, what worries you. The accounts, pensions and taxes come next, in service of those plans.",
            "When a decision is hard (a market drop, retiring sooner than planned, a change in health or family), his job is to keep the whole picture in view, explain the options plainly and leave the decision to you, without pressure.",
          ],
        },
        {
          heading: "Through markets up and down",
          paragraphs: [
            "Bill has spent more than 15 years working with people before and after retirement: through strong markets and sharp drops, through career and family changes, and the decisions that come with each.",
            "Experience doesn’t make the future predictable. It makes it easier to see which decisions matter most, and when.",
          ],
        },
        {
          heading: "How Bill works",
          paragraphs: [
            "Bill is an independent financial planner. He looks at the whole picture (income, investments, taxes, insurance and estate) because in retirement they move together.",
            "He explains things plainly, in French or English. When a question calls for a notary or an accountant, the plan includes them.",
          ],
        },
        {
          heading: "Who Bill works with",
          paragraphs: [
            "Most are 5 to 15 years from retirement. Some have already stopped working.",
          ],
          items: [
            "Professionals and employees with a pension plan and savings to coordinate.",
            "Couples planning two retirements as one.",
            "Business owners whose retirement will rely partly on their company.",
          ],
        },
        {
          heading: "Credentials and verification",
          paragraphs: [
            "F.Pl. (financial planner) · CIM® · BBA · Dealing representative, mutual fund dealer.",
            "You can check any advisor’s authorizations in the Autorité des marchés financiers register.",
          ],
        },
      ],
    },
    meeting: {
      title: "A simple first meeting.",
      seoTitle: "A first meeting with a financial planner in Laval",
      description:
        "A conversation about your situation, what’s on your mind and what you’d like to see more clearly.",
      sections: [
        {
          id: "deroulement",
          heading: "What happens in the first meeting?",
          paragraphs: [
            "Bill listens first. He asks questions, answers yours and tells you what he sees as most important. Then you both decide whether working together makes sense.",
            "The format, length and any costs are confirmed when you book.",
          ],
        },
        {
          id: "bring",
          heading: "What should I bring?",
          paragraphs: ["Nothing is required. If you have them, these help:"],
          items: [
            "Your target retirement age, even a rough one.",
            "Recent statements for your pension plan, RRSPs, TFSAs and other investments.",
            "Your QPP or CPP statement and your last tax return.",
            "The questions that keep coming back.",
          ],
        },
        {
          id: "after",
          heading: "What happens if we work together?",
          paragraphs: [
            "What Bill will do for you, and how he is paid, are explained before you commit to anything. Then comes the plan: where you stand today, the decisions ahead, a few scenarios and what to do next, followed by reviews when markets or your life change.",
          ],
        },
        {
          id: "booking",
          heading: "Booking a time",
          paragraphs: [
            "Calendly confirms the time you pick. You can also call Bill or write to him. Please don’t send statements or account numbers by email.",
          ],
        },
      ],
    },
    privacy: {
      title: "Your information and this website.",
      description:
        "An operational notice for the review version. The practice’s privacy policy requires approval before public launch.",
      sections: [
        {
          heading: "Preparation list and fee illustration",
          paragraphs: [
            "Answers and values entered in these tools remain in page memory. They are not sent to the server, added to forms or saved in browser storage. Reloading the page clears them. Printing uses your browser’s print function.",
          ],
        },
        {
          heading: "Contact requests",
          paragraphs: [
            "When configured, the form requests a name, email address, topic and message so the practice can respond. It does not subscribe you to marketing. The form is unavailable without the sending service and abuse protection configuration.",
            "The planned connector transmits requests to Resend for sending to the practice’s inbox. An identifier derived from the IP address is stored in Upstash for ten minutes to limit attempts; message content is not stored there. The website does not store messages in a local database.",
          ],
        },
        {
          heading: "Browsing and external services",
          paragraphs: [
            "No marketing analytics or newsletter subscription is enabled in this version. Fonts and the portrait are served by the website. The server and its hosting provider may process technical data needed to serve requests.",
            "External links lead to services operated by other organizations. Their privacy practices apply when you visit them. Their tracking is not embedded by default.",
          ],
        },
        {
          heading: "Questions and the policy before launch",
          paragraphs: [
            "Use the displayed contact details for a question about this website. Avoid including sensitive financial information in an initial email.",
            "The privacy contact, retention periods for email and logs, processing locations, access and correction procedures, and provider agreements must be established and included in the approved policy before launch. This notice is not a compliance certification.",
          ],
        },
      ],
    },
    legal: {
      title: "Legal notices.",
      description:
        "The scope of the content and the status of this review version.",
      sections: [
        {
          heading: "General information",
          paragraphs: [
            "Content is intended to prepare for a discussion. It does not consider your personal circumstances and is not a recommendation to buy or sell, tax advice or legal advice. Investing involves risk.",
          ],
        },
        {
          heading: "Illustrations and articles",
          paragraphs: [
            "The fee tool uses simplified, constant assumptions. It does not show Bill’s actual fees, an expected return or a guarantee. Articles labelled as drafts are available only in the local or protected review experience; they are not approved publications by Bill.",
          ],
        },
        {
          heading: "Identity and services",
          paragraphs: [
            "The website presents Bill Badran in Laval. Qualifications, registration, firm or dealer affiliation and precise service descriptions require validation before launch.",
          ],
        },
        {
          heading: "Links and appointments",
          paragraphs: [
            "A contact-link click or acceptance of a request by the sending service does not confirm an appointment. The terms of a professional relationship must be agreed directly.",
            "Firm or dealer disclosures and the applicable complaint process must be approved and added before the public launch.",
          ],
        },
      ],
    },
  },
};

/**
 * The guide page (route key `resources`): « Avant la retraite » /
 * "Before You Retire", read on the site. Its chapters come from lib/ask.ts.
 */
export const guide = {
  fr: {
    title: "Avant la retraite, un petit guide de Bill Badran.",
    seoTitle: "Avant la retraite\u00a0: les questions qui méritent une réponse",
    description:
      "Les questions qui méritent une réponse avant votre dernière journée de travail, en cinq chapitres et en langage clair. Avec un bilan en cinq questions.",
    contentsTitle: "Ce que contient le guide",
    contentsIntro:
      "Cinq chapitres, dans l’ordre où les questions se posent d’habitude. Allez droit à celle qui vous occupe, et notez celles qui vous concernent\u00a0: c’est un bon point de départ pour en parler avec Bill.",
    read: "Articles et outils",
    sources: "Sources officielles",
  },
  en: {
    title: "Before You Retire, a small guide by Bill Badran.",
    seoTitle: "Before You Retire: the questions worth answering",
    description:
      "The questions worth answering before your last day at work, in five short chapters and plain language. With a five-question check-up.",
    contentsTitle: "What’s inside",
    contentsIntro:
      "Five chapters, in the order the questions usually come up. Go straight to the one on your mind, and mark the ones that sound like yours: they’re a good place to start with Bill.",
    read: "Articles and tools",
    sources: "Official sources",
  },
};
