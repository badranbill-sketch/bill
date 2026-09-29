// Render stills of the presentation: node scripts/stills.mjs [times...]
//   times: seconds (e.g. 12.5) — defaults to the midpoint of every scene.
//   Output: out/stills/<t>.jpg and out/stills/contact-sheet.jpg (if ImageMagick is present).
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const browserExecutable = process.env.REMOTION_BROWSER || null;
const outDir = path.resolve('out/stills');
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), onProgress: () => {} });
const composition = await selectComposition({ serveUrl, id: 'BillPresentation', browserExecutable });

let times = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
if (!times.length) {
  const { SCENES, ORDER, STARTS } = await import('../src/content.ts');
  times = ORDER.map((k) => STARTS[k] + SCENES[k].dur / 2);
}
const files = [];
for (const t of times) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(t * 30));
  const output = path.join(outDir, `${t.toFixed(2).padStart(6, '0')}.jpg`);
  await renderStill({ composition, serveUrl, output, frame, imageFormat: 'jpeg', jpegQuality: 88, browserExecutable });
  files.push(output);
  console.log('still', t, '→', path.relative('.', output));
}
try {
  execSync(`montage ${files.map((f) => `"${f}"`).join(' ')} -tile 4x -geometry 640x360+6+6 -background "#d8d5cd" "${outDir}/contact-sheet.jpg"`);
  console.log('contact sheet → out/stills/contact-sheet.jpg');
} catch {}
