// Every word that appears on screen, in one place. The narration is in English, so the film's notes are too; set
// LANG to 'fr' for a French-screen version (the narration would need Bill's French recording to match).
//
// The end card's lines come from the brief and must stay word for word. The handwritten notes are small on purpose:
// the film is about a life, and the financial terms appear only as annotations (RRSP, TFSA, RRIF, QPP in English;
// REER, CELI, FERR, RRQ in French).

export type Lang = 'en' | 'fr';
export const LANG: Lang = 'en';

const COPY = {
  en: {
    intro: {name: 'Bill Badran', role: 'Financial Planner'},
    life: {
      title: 'Your life.',
      retirement: 'the trip, someday soon',
      people: 'the grandkids',
      freedom: 'time to paint again',
    },
    credibility: {years: '15+ years', who: 'individuals & families'},
    pieces: {
      work: 'work hard',
      save: 'save',
      decide: 'try to decide well',
      account: 'retirement account · 2011',
      policy: 'insurance policy · 2016',
      will: 'will · not reviewed since 2009',
      who: 'who sees the whole picture?',
    },
    guide: {note: 'free guide · in French', bigger: 'the bigger picture', step: 'a clearer next step'},
    blindspots: {
      heading: 'five blind spots',
      m1: 'scattered, no one plan',
      m2: 'returns, without fees & taxes in view',
      fees: 'fees',
      taxes: 'taxes',
      m3: 'fear at the helm',
      m4: 'what will retirement cost?',
      m4lines: ['home ?', 'health ?', 'travel ?', 'family ?'],
      m5: 'advice before, not after',
    },
    simple: {
      examples: 'everyday examples',
      questions: 'practical questions',
      jargon: 'jargon',
      five: 'five questions',
      start: 'start here',
    },
    plan: {
      you: 'you',
      family: 'family',
      priorities: 'priorities',
      goals: 'goals',
      investments: 'investments · TFSA',
      taxes: 'taxes',
      insurance: 'insurance',
      retirement: 'retirement · RRSP → RRIF · QPP',
      estate: 'estate · will',
      one: 'one plan',
      revisit: 'as life changes',
      years: ['2026', '2031', '2038'],
    },
    invite: {url: 'billbadran.com'},
    end: {
      headline: 'A plan for what comes next.',
      name: 'Bill Badran',
      role: 'Financial Planner',
      cta: 'READ THE FREE GUIDE',
      url: 'billbadran.com',
      language: 'Guide currently available in French',
      disclaimer: 'For general information only. Not personalized financial, tax or legal advice.',
      signature: 'Voir plus clair pour la suite.',
    },
  },
  fr: {
    intro: {name: 'Bill Badran', role: 'Planificateur financier'},
    life: {
      title: 'Votre vie.',
      retirement: 'le voyage, bientôt',
      people: 'les petits-enfants',
      freedom: 'du temps pour peindre',
    },
    credibility: {years: '15 ans et plus', who: 'particuliers et familles'},
    pieces: {
      work: 'travailler fort',
      save: 'épargner',
      decide: 'bien décider',
      account: 'compte de retraite · 2011',
      policy: 'police d’assurance · 2016',
      will: 'testament · pas revu depuis 2009',
      who: 'qui voit l’ensemble ?',
    },
    guide: {note: 'guide gratuit · en français', bigger: 'la vue d’ensemble', step: 'un prochain pas plus clair'},
    blindspots: {
      heading: 'cinq angles morts',
      m1: 'éparpillé, sans plan commun',
      m2: 'le rendement, sans voir frais et impôts',
      fees: 'frais',
      taxes: 'impôts',
      m3: 'la peur à la barre',
      m4: 'combien coûtera la retraite ?',
      m4lines: ['maison ?', 'santé ?', 'voyages ?', 'famille ?'],
      m5: 'conseil avant, pas après',
    },
    simple: {
      examples: 'des exemples concrets',
      questions: 'des questions pratiques',
      jargon: 'jargon',
      five: 'cinq questions',
      start: 'commencer ici',
    },
    plan: {
      you: 'vous',
      family: 'famille',
      priorities: 'priorités',
      goals: 'objectifs',
      investments: 'placements · CELI',
      taxes: 'impôts',
      insurance: 'assurances',
      retirement: 'retraite · REER → FERR · RRQ',
      estate: 'succession · testament',
      one: 'un seul plan',
      revisit: 'au fil de la vie',
      years: ['2026', '2031', '2038'],
    },
    invite: {url: 'billbadran.com'},
    end: {
      headline: 'Un plan pour la suite.',
      name: 'Bill Badran',
      role: 'Planificateur financier',
      cta: 'LISEZ LE GUIDE GRATUIT',
      url: 'billbadran.com',
      language: 'Guide offert en français',
      disclaimer:
        'À titre informatif seulement. Ne constitue pas un conseil financier, fiscal ou juridique personnalisé.',
      signature: 'Voir plus clair pour la suite.',
    },
  },
} as const;

export const copy = COPY[LANG];
