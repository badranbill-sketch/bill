import fs from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
const schema = JSON.parse(fs.readFileSync('/home/user/bill/.orchestration/contracts/workshop-inputs.schema.json', 'utf8'));
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
// replicate the generator via dynamic import hack: re-run fuzz gen by copying module text
const src = fs.readFileSync('./fuzz.mjs','utf8').split('const violations')[0].replace("import { evaluate, semanticErrors } from './model.mjs';","");
const mod = await import('data:text/javascript;base64,' + Buffer.from(src.replace(/^import Ajv2020.*$/m,"import Ajv2020 from '"+new URL('./node_modules/ajv/dist/2020.js', import.meta.url).href+"';").replace("'/home/user/bill","'/home/user/bill") + '\nexport { gen };').toString('base64'));
const counts = {};
for (let k=0;k<3000;k++){ const d=mod.gen(); if(!validate(d)){ const key=validate.errors.filter(e=>e.keyword!=='if').map(e=>e.instancePath.replace(/\d+/g,'N')+':'+e.keyword+':'+JSON.stringify(e.params)).join(' | '); counts[key]=(counts[key]||0)+1; } }
console.log(Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10));
