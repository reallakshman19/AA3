#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const matrixPath = new URL('../docs/local-continuum/LAFEA3_BENCHMARK_SOURCE_MATRIX.md', import.meta.url);
const matrix = await readFile(matrixPath, 'utf8');

const required = [
  ['LAFEA3-SRC-PATCH-01', 'lafea.3-benchmark-cont-patch-01-check.mjs'],
  ['LAFEA3-SRC-KIRSCH-01', 'lafea.3-benchmark-cont-hole-01-check.mjs'],
  ['LAFEA3-SRC-LAME-01', 'lafea.3-benchmark-cont-cyl-01-check.mjs'],
];
for (const [claimId, benchmark] of required) {
  assert.ok(matrix.includes(`\`${claimId}\``), `source matrix must retain ${claimId}`);
  assert.ok(matrix.includes(`\`${benchmark}\``), `source matrix must bind ${claimId} to ${benchmark}`);
  await readFile(new URL(`./${benchmark}`, import.meta.url), 'utf8');
}

assert.ok(matrix.includes('10.1016/0168-874X(85)90003-4'),
  'MacNeal-Harder DOI locator must remain explicit');
assert.ok(matrix.includes('Eqs. (7.1a–c)'),
  'Kirsch equation locator must remain explicit');
assert.ok(matrix.includes('sigma_r(r) = A - B/r^2'),
  'Lamé radial-stress equation must remain explicit');
assert.ok(matrix.includes('Production output may modify oracle?'),
  'matrix must preserve explicit oracle-custody boundary');
assert.ok(matrix.match(/\*\*NO\*\*/gu)?.length >= 3,
  'each qualified benchmark must deny production-output oracle authority');

console.log(JSON.stringify({
  check: 'lafea.3-benchmark-source-custody',
  status: 'PASS',
  claimCount: required.length,
  oracleMutationByProductionOutput: false,
}));
