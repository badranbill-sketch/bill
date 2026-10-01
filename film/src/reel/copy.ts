import {copyFr} from '../design/copy';

// Every word the reel shows, in one place (the captions come from the narration script, script/reel.json).
// Strings that are not in src/design/copy.ts are marked NEW COPY: they need Bill's approval like the rest.
// French typography: a no-break space (\u00a0) before « ? » and « : », as in copy.ts, so they never start a line;
// typographic apostrophes (’), as in copy.ts.

export const reelCopy = {
  hook: {
    line1: 'Avant les chiffres,', // NEW COPY (with line2: « Avant les chiffres, il y a votre vie. »)
    line2: 'il y a votre vie.', // NEW COPY
    /** the words the brass line underlines, at the end of line2 */
    underlined: 'votre vie',
  },
  life: {
    retirement: 'La retraite que vous attendez.', // NEW COPY
    people: 'Les gens dont vous prenez soin.', // NEW COPY
  },
  pieces: {
    account: 'Un compte ici.', // NEW COPY
    policy: 'Une police là.', // NEW COPY
    will: 'Un testament pas revu\ndepuis des années.', // NEW COPY (one sentence, written on two lines)
    question: 'Qui regarde comment\ntout s’emboîte\u00a0?', // NEW COPY (one question, written on two lines)
  },
  guide: {
    spots: 'Cinq angles morts.', // NEW COPY (copy.ts has « cinq angles morts » as a heading)
    examples: 'Des exemples simples.', // NEW COPY
    jargon: 'Aucun jargon.', // NEW COPY
  },
  close: {
    start: 'Un point de départ\nhonnête.', // NEW COPY (« Un point de départ honnête. », on two lines)
    who: 'Bill Badran · planificateur financier', // NEW COPY (copy.ts has the name and « Planificateur financier »)
    cta: 'Le guide\u00a0: lien en bio', // NEW COPY
    disclaimer: copyFr.end.disclaimer, // from copy.ts, word for word
  },
} as const;
