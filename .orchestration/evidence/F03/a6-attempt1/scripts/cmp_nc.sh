set -u
T=/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/cmpnc; rm -rf $T; mkdir -p $T/a $T/b1 $T/b2 $T/e1 $T/e2
cp /home/user/bill/.orchestration/evidence/F03/a6-attempt1/base02/en-home-320.png /home/user/bill/.orchestration/evidence/F03/a6-attempt1/base02/fr-meeting-1440.png $T/a/
cp $T/a/*.png $T/b1/; cp $T/a/*.png $T/b2/
cat > $T/mut.mjs <<'JS'
import fs from "node:fs"; import { createRequire } from "node:module";
const require = createRequire("/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/wt/a6-f03-1/package.json"); const { PNG } = require("pngjs");
const [,, f, mode] = process.argv; const img = PNG.sync.read(fs.readFileSync(f));
const set = (x,y,r,g,b)=>{const i=(y*img.width+x)*4; img.data[i]=r; img.data[i+1]=g; img.data[i+2]=b;};
if (mode==="subtle") { const i=(500*img.width+100)*4; img.data[i]=Math.min(255,img.data[i]+3); }
if (mode==="block") { for(let y=300;y<310;y++) for(let x=100;x<110;x++) set(x,y,0,0,0); }
fs.writeFileSync(f, PNG.sync.write(img));
JS
node $T/mut.mjs $T/b1/fr-meeting-1440.png subtle
node $T/mut.mjs $T/b2/fr-meeting-1440.png block
echo "== NC1 subtle: one pixel R+3 =="; node tests/baseline/compare-screens.mjs --before $T/a --after $T/b1 --diff $T/d1; echo "exit=$?"; python3 -c "import json;r=json.load(open('$T/d1/report.json'));print([ (s['id'],s['status'],s['byte_identical'],s['exact_diff_pixels'],s['pixelmatch_diff_pixels']) for s in r['shots']])"
echo "== NC2 block: 10x10 black =="; node tests/baseline/compare-screens.mjs --before $T/a --after $T/b2 --diff $T/d2; echo "exit=$?"
echo "== NC3 both dirs empty (vacuous) =="; node tests/baseline/compare-screens.mjs --before $T/e1 --after $T/e2 --diff $T/d3; echo "exit=$?"
echo "== NC4 after dir missing entirely =="; node tests/baseline/compare-screens.mjs --before $T/a --after $T/nonexistent --diff $T/d4; echo "exit=$?"
