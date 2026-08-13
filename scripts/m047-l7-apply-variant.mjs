#!/usr/bin/env node
import fs from 'node:fs';
import { resolve } from 'node:path';
import { buildCandidateSource } from './lfea-m047-stage2-direction-only-experiment.mjs';
import { buildRelockFinalReturnMapCandidateSource } from './lfea-m047-stage2-d1-relock-final-return-map-experiment.mjs';
const variant=process.argv[2];
const p=resolve('src/core/fea-benchmarks/caesar-accdb-friction-solve.js');
const original=fs.readFileSync(p,'utf8');
const source=variant==='D1'?buildCandidateSource(original,p):variant==='H1'?buildRelockFinalReturnMapCandidateSource(original,p):null;
if(source===null)throw new TypeError('Usage: node scripts/m047-l7-apply-variant.mjs <D1|H1>');
fs.writeFileSync(p,source,'utf8');
