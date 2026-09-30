import fs from 'node:fs';
import { evaluate } from './model.mjs';
const docs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const refs = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
function canon(x){ if(Array.isArray(x)) return x.map(canon); if(x&&typeof x==='object'){ const o={}; for(const k of Object.keys(x).sort()) o[k]=canon(x[k]); return o;} return x; }
function firstDiff(a,b,p=''){ if(JSON.stringify(canon(a))===JSON.stringify(canon(b))) return null;
  if(a&&b&&typeof a==='object'&&typeof b==='object'){ const ks=new Set([...Object.keys(a),...Object.keys(b)]); for(const k of ks){ const d=firstDiff(a[k],b[k],p+'/'+k); if(d) return d; } }
  return `${p}: mine=${JSON.stringify(a)?.slice(0,200)} ref=${JSON.stringify(b)?.slice(0,200)}`; }
let same=0, diff=0; const kinds={};
docs.forEach((d,k)=>{ const mine=JSON.parse(JSON.stringify(evaluate(d))); const r=refs[k];
  const fd=firstDiff(mine,r); if(!fd) same++; else { diff++; const key=fd.split(':')[0].replace(/\/\d+/g,'/N'); (kinds[key] ||= {n:0, ex:[]}).n++; if(kinds[key].ex.length<2) kinds[key].ex.push({k, fd}); } });
console.log(JSON.stringify({compared: docs.length, identical: same, different: diff, kinds}, null, 1));
