#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const NEEDLE = `        gravityWeightN: entry.gravityWeightN,\n      })),`;
const REPLACEMENT = `        gravityWeightN: entry.gravityWeightN,\n        globalStiffness: [...entry.contribution.globalStiffness],\n        equivalentLoadGlobal: [...entry.contribution.equivalentLoadGlobal],\n        initialStrainLoadGlobal: [...entry.contribution.initialStrainLoadGlobal],\n      })),`;

function parse(argv) {
  const m = new Map();
  for (let i=0;i<argv.length;i+=2) {
    if (!argv[i]?.startsWith('--') || argv[i+1]===undefined) throw new TypeError(`Invalid argument near ${String(argv[i])}`);
    m.set(argv[i], argv[i+1]);
  }
  if (!m.get('--source') || !m.get('--manifest')) throw new TypeError('Usage: --source <solver.js> --manifest <json>.');
  return {source:resolve(m.get('--source')),manifest:resolve(m.get('--manifest'))};
}
function norm(t){return t.replace(/\r\n/gu,'\n');}
function count(t,n){return t.split(n).length-1;}
function sha(t){return createHash('sha256').update(t,'utf8').digest('hex');}

const input=parse(process.argv.slice(2));
const raw=readFileSync(input.source,'utf8');
let source=norm(raw);
if (count(source,NEEDLE)!==1) throw new Error(`I030 expected one element-ledger evidence needle; found ${count(source,NEEDLE)}.`);
source=source.replace(NEEDLE,REPLACEMENT);
for (const token of [
  'globalStiffness: [...entry.contribution.globalStiffness]',
  'equivalentLoadGlobal: [...entry.contribution.equivalentLoadGlobal]',
  'initialStrainLoadGlobal: [...entry.contribution.initialStrainLoadGlobal]',
  'smooth90FlexibilityCorrection: true,',
]) if (!source.includes(token)) throw new Error(`I030 instrumentation missing required token ${token}.`);
writeFileSync(input.source,source,'utf8');
const manifest={
  schema:'lfea-m047-i030-matrix-evidence-manifest/v1',issueId:'M047',iterationId:'M047-I030',
  sourcePath:'src/core/fea-benchmarks/caesar-accdb-linear-solve.js',
  originalSha256:sha(norm(raw)),instrumentedSha256:sha(source),
  instrumentationOnly:true,
  exposedFields:['globalStiffness','equivalentLoadGlobal','initialStrainLoadGlobal'],
  mechanicsChanged:false,
};
mkdirSync(dirname(input.manifest),{recursive:true});
writeFileSync(input.manifest,`${JSON.stringify(manifest,null,2)}\n`,'utf8');
console.log(`M047 I030 matrix evidence instrumentation: ${manifest.originalSha256} -> ${manifest.instrumentedSha256}`);
