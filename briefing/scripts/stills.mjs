// Stills for review: node --experimental-strip-types --no-warnings scripts/stills.mjs <outDir> [B04,B06]
//   Bundles once and renders two PNG stills per scene of the Briefing: the scene's midpoint and half a second
//   before its end (after every line is in, before the fade out). Then a contact sheet (contact-sheet.png) of
//   all of them. Set REMOTION_BROWSER to a local Chromium headless shell when Remotion cannot download its own.
import { bundle } from '@remotion/bundler';
import { openBrowser, renderStill, selectComposition } from '@remotion/renderer';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const { SCENES, ORDER } = await import('../src/content.ts');
const FPS = 30;
const outDir = path.resolve(process.argv[2] ?? 'out/stills');
const only = process.argv[3] ? new Set(process.argv[3].split(',')) : null;
fs.mkdirSync(outDir, { recursive: true });
const browserExecutable = process.env.REMOTION_BROWSER || null;

// Scene bounds exactly as compositions/Briefing.tsx computes them.
let f0 = 0;
const shots = [];
for (const k of ORDER) {
  const s = SCENES[k];
  const frames = Math.round(s.dur * FPS);
  const slug = `${s.id}-${s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}`;
  if (!only || only.has(s.id)) {
    shots.push({ file: `${slug}-mid.png`, frame: f0 + Math.floor(frames / 2), label: `${s.id} · ${s.name} · mid (${(frames / 2 / FPS).toFixed(1)} s)` });
    shots.push({ file: `${slug}-end.png`, frame: f0 + frames - 15, label: `${s.id} · ${s.name} · end − 0.5 s (${((frames - 15) / FPS).toFixed(1)} s)` });
  }
  f0 += frames;
}

const t0 = performance.now();
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), onProgress: () => {} });
const browser = await openBrowser('chrome', { browserExecutable, logLevel: 'error' });
const composition = await selectComposition({ serveUrl, id: 'Briefing', browserExecutable, puppeteerInstance: browser, logLevel: 'error' });
for (const s of shots) {
  const output = path.join(outDir, s.file);
  await renderStill({ composition, serveUrl, output, frame: s.frame, imageFormat: 'png', browserExecutable, puppeteerInstance: browser, overwrite: true, logLevel: 'error' });
  console.log(`${s.file}  frame ${s.frame}`);
}

// Contact sheet: small JPEG thumbnails as data URLs into the ContactSheet tool composition.
if (!only) {
  const thumbs = path.join(outDir, '.thumbs');
  fs.mkdirSync(thumbs, { recursive: true });
  const cells = shots.map((s) => {
    const jpg = path.join(thumbs, s.file.replace(/\.png$/, '.jpg'));
    execFileSync('npx', ['remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-i', path.join(outDir, s.file), '-vf', 'scale=900:-1', '-q:v', '3', jpg], { stdio: 'inherit' });
    return { src: `data:image/jpeg;base64,${fs.readFileSync(jpg).toString('base64')}`, label: s.label };
  });
  const inputProps = { cells, columns: 4 };
  const sheet = await selectComposition({ serveUrl, id: 'ContactSheet', inputProps, browserExecutable, puppeteerInstance: browser, logLevel: 'error' });
  await renderStill({ composition: sheet, serveUrl, output: path.join(outDir, 'contact-sheet.png'), frame: 0, imageFormat: 'png', inputProps, browserExecutable, puppeteerInstance: browser, overwrite: true, logLevel: 'error' });
  fs.rmSync(thumbs, { recursive: true, force: true });
  console.log('contact-sheet.png');
}
await browser.close({ silent: true });
console.log(`${shots.length} stills in ${((performance.now() - t0) / 1000).toFixed(1)} s → ${outDir}`);
