import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

/**
 * The website's typefaces, bundled locally (Fontsource woff2 files, SIL OFL;
 * copied from the presentation project, see ASSETS.md): Newsreader 300/400
 * (+ italics), Source Sans 3 400/600 (+ 400 italic), Caveat 400 for incidental notes.
 * loadFont() holds the render (delayRender) until each face has loaded.
 */
const FACES: { family: string; file: string; weight: string; style?: string }[] = [
  { family: 'Newsreader', file: 'newsreader-latin-300-normal.woff2', weight: '300' },
  { family: 'Newsreader', file: 'newsreader-latin-300-italic.woff2', weight: '300', style: 'italic' },
  { family: 'Newsreader', file: 'newsreader-latin-400-normal.woff2', weight: '400' },
  { family: 'Newsreader', file: 'newsreader-latin-400-italic.woff2', weight: '400', style: 'italic' },
  { family: 'Source Sans 3', file: 'source-sans-3-latin-400-normal.woff2', weight: '400' },
  { family: 'Source Sans 3', file: 'source-sans-3-latin-400-italic.woff2', weight: '400', style: 'italic' },
  { family: 'Source Sans 3', file: 'source-sans-3-latin-600-normal.woff2', weight: '600' },
  { family: 'Caveat', file: 'caveat-latin-400-normal.woff2', weight: '400' },
];

let loaded = false;
export const loadBrandFonts = () => {
  if (loaded) return;
  loaded = true;
  for (const f of FACES) {
    loadFont({ family: f.family, url: staticFile(`fonts/${f.file}`), weight: f.weight, style: f.style ?? 'normal' });
  }
};
