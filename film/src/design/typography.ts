import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// The guide is set in Lora (headlines, bold; "prospérité" in bold italic) and Poppins (everything else). The film
// keeps Lora for its elegant serif lines and adds Caveat for handwritten notes. All three are SIL Open Font License
// files served from public/fonts, so renders never depend on the network.
export const SERIF = 'Lora';
export const SANS = 'Poppins';
export const HAND = 'Caveat';

export const fontsReady = Promise.all([
  loadFont({family: SERIF, url: staticFile('fonts/Lora-Variable.woff2'), weight: '400 700', style: 'normal'}),
  loadFont({family: SERIF, url: staticFile('fonts/Lora-Italic-Variable.woff2'), weight: '400 700', style: 'italic'}),
  ...(['300', '400', '500', '600', '700'] as const).map((weight) =>
    loadFont({family: SANS, url: staticFile(`fonts/Poppins-${weight}.woff2`), weight, style: 'normal'}),
  ),
  loadFont({family: SANS, url: staticFile('fonts/Poppins-400-Italic.woff2'), weight: '400', style: 'italic'}),
  loadFont({family: HAND, url: staticFile('fonts/Caveat-Variable.ttf'), weight: '400 700', style: 'normal'}),
]);

// Type scale for a 1920 × 1080 stage. Big statements are rare; labels do most of the work, as in the guide.
export const type = {
  display: {fontFamily: SERIF, fontWeight: 700, fontSize: 184, lineHeight: 1.02, letterSpacing: '-0.012em'},
  headline: {fontFamily: SERIF, fontWeight: 700, fontSize: 104, lineHeight: 1.06, letterSpacing: '-0.01em'},
  statement: {fontFamily: SERIF, fontWeight: 700, fontSize: 76, lineHeight: 1.12, letterSpacing: '-0.005em'},
  title: {fontFamily: SERIF, fontWeight: 700, fontSize: 56, lineHeight: 1.15},
  label: {
    fontFamily: SANS,
    fontWeight: 700,
    fontSize: 22,
    letterSpacing: '0.24em',
    textTransform: 'uppercase',
    lineHeight: 1.2,
  },
  body: {fontFamily: SANS, fontWeight: 400, fontSize: 30, lineHeight: 1.45},
  small: {fontFamily: SANS, fontWeight: 400, fontSize: 22, lineHeight: 1.4},
} as const;

// The sketchbook's voice. Serif lines are few and quiet (the brief: elegant serif typography); everything else is a
// handwritten note. Caveat reads small, so notes are never below 34 px on the 1920 × 1080 stage.
export const sketchType = {
  serifLarge: {fontFamily: SERIF, fontWeight: 500, fontSize: 96, lineHeight: 1.08, letterSpacing: '-0.01em'},
  serif: {fontFamily: SERIF, fontWeight: 500, fontSize: 64, lineHeight: 1.14, letterSpacing: '-0.005em'},
  serifItalic: {fontFamily: SERIF, fontWeight: 400, fontStyle: 'italic', fontSize: 44, lineHeight: 1.25},
  small: {fontFamily: SERIF, fontWeight: 400, fontSize: 26, lineHeight: 1.4},
  handLarge: {fontFamily: HAND, fontWeight: 600, fontSize: 84, lineHeight: 1.05},
  hand: {fontFamily: HAND, fontWeight: 500, fontSize: 52, lineHeight: 1.12},
  note: {fontFamily: HAND, fontWeight: 500, fontSize: 40, lineHeight: 1.15},
  tiny: {fontFamily: HAND, fontWeight: 500, fontSize: 34, lineHeight: 1.15},
} as const;
