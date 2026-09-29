import {at, endOf, TOTAL_FRAMES} from './timing';

// Scene boundaries, all derived from narration cues. The film is one sketchbook page: consecutive scenes overlap by
// a few frames and the overlap is a dissolve (the outgoing drawings fade while the incoming ones appear). Scenes
// never paint a background; the paper is drawn once, under everything (Film.tsx).
const RANGES = {
  intro: {from: 0, to: at('your-life', 0.3)}, // Bill's print taped in, his name written beside it
  life: {from: at('your-life', -0.2), to: at('fifteen', 0.4)}, // "Your life." and three unconnected sketches
  credibility: {from: at('fifteen', -0.3), to: at('work', 0.2)}, // Bill again, 15+ years
  pieces: {from: at('work', -0.4), to: at('created', 0.6)}, // the kitchen table, then the pieces; the line stops short
  guide: {from: at('created', -0.2), to: at('inside', 0.8)}, // the guide laid on the page
  blindspots: {from: at('inside', 0), to: at('easy', 0.5)}, // five small studies along one sketchbook strip
  simple: {from: at('easy', -0.2), to: at('approach', 0.3)}, // Bill (mistakes), clippings from the guide, start here
  approach: {from: at('approach', -0.2), to: at('start-you', 0.3)}, // Bill, briefly
  plan: {from: at('start-you', -0.2), to: at('role', 0.4)}, // the conversation, the fragments, one brass path
  role: {from: at('role', -0.3), to: at('read', 0.3)}, // Bill beside a path towards the lake
  invite: {from: at('read', -0.2), to: endOf('worked', 0.8)}, // Bill and the guide
  end: {from: endOf('worked', 0.1), to: TOTAL_FRAMES}, // the lake, two chairs; the brass line is the shoreline
} as const;

export type SceneId = keyof typeof RANGES;
const ORDER = Object.keys(RANGES) as SceneId[];

/** Each scene's range plus its dissolves: fadeIn = overlap with the previous scene, fadeOut = with the next. */
export const SCENES = Object.fromEntries(
  ORDER.map((id, i) => {
    const {from, to} = RANGES[id];
    const prev = i > 0 ? RANGES[ORDER[i - 1]] : null;
    const next = i < ORDER.length - 1 ? RANGES[ORDER[i + 1]] : null;
    return [id, {from, to, fadeIn: prev ? Math.max(0, prev.to - from) : 0, fadeOut: next ? Math.max(0, to - next.from) : 0}];
  }),
) as Record<SceneId, {from: number; to: number; fadeIn: number; fadeOut: number}>;
