// Render proof for the pipeline: node scripts/proof.mjs [outDir]
//   Bundles once, renders PipelineTest to <outDir>/pipeline-test.mp4, then stills
//   at 1 s, 3 s and 5.5 s, and writes <outDir>/pipeline-test.report.json with the
//   render time per frame. Set REMOTION_BROWSER to a local Chromium / headless
//   shell when Remotion cannot download its own (see README).
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const outDir = path.resolve(process.argv[2] ?? 'out');
fs.mkdirSync(outDir, { recursive: true });
const browserExecutable = process.env.REMOTION_BROWSER || null;
const id = 'PipelineTest';

const t0 = performance.now();
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), onProgress: () => {} });
const t1 = performance.now();
const composition = await selectComposition({ serveUrl, id, browserExecutable });

const video = path.join(outDir, 'pipeline-test.mp4');
let concurrency = null;
const t2 = performance.now();
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  crf: 18,
  imageFormat: 'jpeg',
  jpegQuality: 92,
  outputLocation: video,
  browserExecutable,
  overwrite: true,
  onStart: (s) => (concurrency = s.resolvedConcurrency ?? null),
});
const t3 = performance.now();

const stills = [];
for (const s of [1, 3, 5.5]) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
  const output = path.join(outDir, `pipeline-test-${String(s).replace('.', '_')}s.png`);
  const a = performance.now();
  await renderStill({ composition, serveUrl, output, frame, imageFormat: 'png', browserExecutable, overwrite: true });
  stills.push({ seconds: s, frame, output, ms: Math.round(performance.now() - a) });
}

const frames = composition.durationInFrames;
const renderSec = (t3 - t2) / 1000;
const report = {
  composition: id,
  size: `${composition.width}x${composition.height}`,
  fps: composition.fps,
  frames,
  browserExecutable: browserExecutable ?? 'remotion default download',
  concurrency,
  cpus: os.cpus().length,
  bundleSeconds: +((t1 - t0) / 1000).toFixed(2),
  renderSeconds: +renderSec.toFixed(2),
  secondsPerFrameWall: +(renderSec / frames).toFixed(4),
  secondsPerFramePerWorker: concurrency ? +((renderSec * concurrency) / frames).toFixed(4) : null,
  video,
  videoBytes: fs.statSync(video).size,
  stills,
};
fs.writeFileSync(path.join(outDir, 'pipeline-test.report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
