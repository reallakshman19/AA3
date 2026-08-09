#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(new URL(
  '../src/core/fea-benchmarks/caesar-accdb-linear-solve.js',
  import.meta.url,
));
const before = `    shearCorrectionFactorY: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' },
    shearCorrectionFactorZ: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' },`;
const after = `    shearCorrectionFactorY: { value: 0.5, source: 'INTERGRAPH-CAESAR-II-CAUX-2015-FKX-SHEAR-COEFFICIENT-2' },
    shearCorrectionFactorZ: { value: 0.5, source: 'INTERGRAPH-CAESAR-II-CAUX-2015-FKX-SHEAR-COEFFICIENT-2' },`;

const text = readFileSync(target, 'utf8');
if (!text.includes(before)) {
  if (text.includes(after)) {
    console.log(JSON.stringify({ patch: 'issue-947-caesar-shear-profile', status: 'ALREADY_APPLIED' }, null, 2));
    process.exit(0);
  }
  throw new Error('Expected Cowper 0.53 ACCDB frame-profile block was not found; refusing a fuzzy edit.');
}
const occurrences = text.split(before).length - 1;
if (occurrences !== 1) throw new Error(`Expected exactly one ACCDB shear-profile block; found ${occurrences}.`);
writeFileSync(target, text.replace(before, after));
console.log(JSON.stringify({
  patch: 'issue-947-caesar-shear-profile',
  status: 'APPLIED',
  target,
  formulation: 'PIPE_FRAME3D_TIMOSHENKO_V1',
  shearCorrectionFactorY: 0.5,
  shearCorrectionFactorZ: 0.5,
  source: 'INTERGRAPH-CAESAR-II-CAUX-2015-FKX-SHEAR-COEFFICIENT-2',
  genericFrameKernelChanged: false,
}, null, 2));
