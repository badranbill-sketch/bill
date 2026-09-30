import fs from "node:fs"; import { createRequire } from "node:module";
const require = createRequire(process.argv[2] + "/package.json");
const { PNG } = require("pngjs");
const [,, , src, out, y0, h] = process.argv;
const img = PNG.sync.read(fs.readFileSync(src));
const H = Math.min(Number(h), img.height - Number(y0));
const o = new PNG({ width: img.width, height: H });
img.data.copy(o.data, 0, Number(y0) * img.width * 4, (Number(y0) + H) * img.width * 4);
fs.writeFileSync(out, PNG.sync.write(o)); console.log(out, img.width, H);
