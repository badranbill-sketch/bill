// Splits the website's standalone ink SVGs into an ink layer and a wash layer,
// optionally cropped, so the film can draw the pen first and bloom the wash after.
//   node scripts/split-ink.mjs
import fs from 'node:fs';
import path from 'node:path';

const SRC = '../public/assets/ink';
const OUT = 'public/ink';
fs.mkdirSync(OUT, { recursive: true });
const file = (prefix) => fs.readdirSync(SRC).find((f) => f.startsWith(prefix + '.') && f.endsWith('.svg'));

const JOBS = [
  { name: 'two-chairs', src: 'two-chairs' },
  { name: 'chairs-table', src: 'two-chairs', crop: [88, 236, 588, 252] },
  { name: 'left-chair', src: 'two-chairs', crop: [84, 236, 210, 222] },
  { name: 'path', src: 'path' },
  { name: 'sailboat', src: 'sailboat' },
];

const HIDE_WASH = '.ink-art .wash{display:none}';
const HIDE_INK = '.ink-art .ink,.ink-art .hatch,.ink-art .pencil,.ink-art .note,.ink-art .label,.ink-art .leader{display:none}';

const out = {};
for (const job of JOBS) {
  let svg = fs.readFileSync(path.join(SRC, file(job.src)), 'utf8');
  const filterId = `ink-wash-${job.name}`;
  svg = svg.replaceAll('id="ink-wash"', `id="${filterId}"`).replaceAll('url(#ink-wash)', `url(#${filterId})`);
  let [vx, vy, vw, vh] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  if (job.crop) {
    [vx, vy, vw, vh] = job.crop;
    svg = svg
      .replace(/viewBox="[^"]+"/, `viewBox="${vx} ${vy} ${vw} ${vh}"`)
      .replace(/width="[\d.]+"/, `width="${vw}"`)
      .replace(/height="[\d.]+"/, `height="${vh}"`);
    // Clip to the crop so neighbouring objects never leak in.
    svg = svg.replace(/(<svg[^>]*>)/, `$1<clipPath id="crop-${job.name}"><rect x="${vx}" y="${vy}" width="${vw}" height="${vh}"/></clipPath><g clip-path="url(#crop-${job.name})">`).replace(/<\/svg>\s*$/, '</g></svg>');
  }
  svg = svg.replace('.ink-art{display:block;width:100%;height:auto;overflow:visible;}', '.ink-art{display:block;overflow:hidden;}');
  const withRule = (rule) => svg.replace('</style>', rule + '</style>');
  fs.writeFileSync(path.join(OUT, `${job.name}.ink.svg`), withRule(HIDE_WASH));
  fs.writeFileSync(path.join(OUT, `${job.name}.wash.svg`), withRule(HIDE_INK));
  fs.writeFileSync(path.join(OUT, `${job.name}.full.svg`), svg);
  out[job.name] = { w: vw, h: vh };
}
fs.writeFileSync('src/data/ink.json', JSON.stringify(out, null, 2));
console.log(out);
