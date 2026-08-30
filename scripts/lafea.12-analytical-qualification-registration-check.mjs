import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const aggregateText = await readFile(new URL('scripts/lafea.12-analytical-qualification-check.mjs', root), 'utf8');
const workflowText = await readFile(new URL('.github/workflows/lafea12-analytical-oracle.yml', root), 'utf8');
const oracle = JSON.parse(await readFile(new URL(
  'agents/qualifications/ADV-LAFEA12-ANALYTICAL-QUALIFICATION/ORACLE_BENCHMARKS.json',
  root,
), 'utf8'));

const requiredChecks = [
  'lafea.1-contract-check.mjs',
  'lafea.2-contract-check.mjs',
  'lafea.12-pressure-thrust-custody-check.mjs',
  'lafea.12-independent-oracle-check.mjs',
  'lafea.12-independent-oracle-extended-check.mjs',
  'lafea.12-analytical-result-authority-check.mjs',
];
const requiredBenchmarkIds = [
  'LAFEA1-RLT-01',
  'LAFEA1-LAME-01',
  'LAFEA1-END-01',
  'LAFEA2-SEC-01',
  'LAFEA2-COMB-01',
  'LAFEA2-ENV-01',
  'LAFEA1-LAFEA2-HANDOFF-NEG',
];

for (const scriptName of requiredChecks) {
  assert.match(aggregateText, new RegExp(escapeRegExp(scriptName), 'u'),
    `Analytical aggregate must retain ${scriptName}.`);
}
assert.match(
  workflowText,
  /node scripts\/lafea\.12-analytical-qualification-check\.mjs/u,
  'Dedicated workflow must execute the bounded analytical aggregate.',
);
assert.match(
  workflowText,
  /node scripts\/lafea\.12-analytical-qualification-registration-check\.mjs/u,
  'Dedicated workflow must execute its registration/coverage guard.',
);
for (const pathFragment of [
  "'src/core/local-stress/**'",
  "'src/core/local-attachment-screening/**'",
  "'scripts/lafea.12-*.mjs'",
  "'agents/qualifications/ADV-LAFEA12-ANALYTICAL-QUALIFICATION/**'",
]) {
  assert.ok(workflowText.includes(pathFragment), `Workflow trigger must retain ${pathFragment}.`);
}
const actualIds = oracle.benchmarks.map((row) => row.benchmarkId).sort();
assert.deepEqual(actualIds, [...requiredBenchmarkIds].sort(), 'All seven #1533 oracle IDs must remain registered in the frozen fixture ledger.');
for (const row of oracle.benchmarks) {
  assert.ok(Array.isArray(row.sourceIds) && row.sourceIds.length > 0,
    `${row.benchmarkId} must retain at least one independent source ID.`);
}
const rlt = oracle.benchmarks.find((row) => row.benchmarkId === 'LAFEA1-RLT-01');
const lame = oracle.benchmarks.find((row) => row.benchmarkId === 'LAFEA1-LAME-01');
const end = oracle.benchmarks.find((row) => row.benchmarkId === 'LAFEA1-END-01');
const combined = oracle.benchmarks.find((row) => row.benchmarkId === 'LAFEA2-COMB-01');
const envelope = oracle.benchmarks.find((row) => row.benchmarkId === 'LAFEA2-ENV-01');
assert.deepEqual(Object.keys(rlt.expected.covarianceVariants).sort(), ['loadScaled', 'rotated', 'translated']);
assert.equal(typeof lame.expected.radialMid, 'number');
assert.equal(end.expected.explicitAxialResultant, end.input.explicitAxialResultant);
assert.deepEqual(Object.keys(combined.expected.independentSubcases).sort(), ['pureAxial', 'pureBendingY', 'pureBendingZ', 'pureTorsion']);
assert.ok(combined.expected.radialLocationsAtBendingMaximum.mid);
assert.ok(combined.expected.radialLocationsAtBendingMaximum.inner);
assert.ok(envelope.expected.loadScaling && envelope.expected.completeReversal && envelope.expected.superposition);

console.log('LAFEA.1/.2 analytical qualification registration and expanded seven-family oracle coverage checks passed.');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}