// The film is a sketchbook: warm ivory paper, deep navy ink, muted blue-grey watercolour and small touches of
// brass. The guide's own colours (below) stay for the guide itself when it appears as an object on the page.
export const sketch = {
  paper: '#F3EDE1', // warm ivory: the one page the whole film is drawn on
  ink: '#1E2A3E', // deep navy ink: type, handwriting, pen marks
  inkSoft: '#4A5568', // lighter handwriting, secondary notes
  wash: '#93A6B8', // muted blue-grey watercolour
  washLight: '#C5D0DA',
  brass: '#B08D57', // the single brass line, and the rare accent
  brassDeep: '#8C6D3F', // brass handwriting (reads better than the line colour at small sizes)
  tape: 'rgba(233, 222, 196, 0.78)', // masking tape holding prints in the sketchbook
  printBorder: '#FBF8F2', // the white border of a photo print
  shadow: 'rgba(30, 42, 62, 0.16)',
} as const;

// Colours sampled from Guide_prosperite_financiere_Bill_Badran.pdf (fill/stroke operators), used for the guide's
// cover and pages when the real guide is shown.
export const palette = {
  navy: '#13324B', // cover, headings, "Retraite" tile, blind spot 4
  ink: '#1F2A33', // body text
  slate: '#66727C', // secondary text
  rule: '#E6D9C3', // hairlines, card borders
  cream: '#F6EFE4', // cards, second sail, the film's field
  paper: '#FFFFFF',
  gold: '#C9974E', // "prospérité", the sun, blind spot 3, the film's line
  coral: '#E4704F', // hull, "Guide gratuit", blind spot 2
  teal: '#2E8A94', // labels, blind spot 1
  purple: '#7A6BB0', // "Testament", blind spot 5
  green: '#3E9B6A', // "Entreprise"
  coralTint: '#FBE3D9',
  tealTint: '#DCEFEA',
  note: '#FFF1B8', // "La question à vous poser"
  wave: '#7FC4CC', // cover water
  mist: '#CFE0EA', // light text on navy
} as const;

// The cover draws the sun at 90 % and the far wave at 60 % over navy.
export const SUN_OPACITY = 0.9;
export const FAR_WAVE_OPACITY = 0.6;

// Chapter colours follow the guide's "Votre parcours en 5 arrêts".
export const blindSpotColors = [palette.teal, palette.coral, palette.gold, palette.navy, palette.purple] as const;

// The guide's six tiles (p. 3). The film names them in English, as the narration does.
export const areas = {
  investments: {label: 'Investments', color: palette.teal},
  taxes: {label: 'Taxes', color: palette.coral},
  insurance: {label: 'Insurance', color: palette.gold},
  retirement: {label: 'Retirement', color: palette.navy},
  estate: {label: 'Estate', color: palette.purple},
  business: {label: 'Business', color: palette.green},
} as const;

export type AreaKey = keyof typeof areas;
