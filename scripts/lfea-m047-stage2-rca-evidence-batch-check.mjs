#!/usr/bin/env node
/** Static/ordering contract for the M047 Stage 2 L13 RCA evidence batch. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { evidenceStepOrder } from './lfea-m047-stage2-rca-evidence-batch.mjs';

const withStateStable = evidenceStepOrder(true);
assert.deepEqual(withStateStable, [
  'R1_REFERENCE_RESOLUTION',
  'R6_RESTRAINT_SENTINELS',
  'R5_FRICTION_GEOMETRY',
  'DIRECTION_LAW_RCA',
  'DIRECTION_ONLY_EXPERIMENT',
  'R2_DELETED_SPRING_EXPERIMENT',
  'R2_MOBILISATION_DIAGNOSTICS',
  'R3_CAPACITY_DIAGNOSTICS',
  'RCA_DECISION_GATE',
]);

const withoutStateStable = evidenceStepOrder(false);
assert.deepEqual(withoutStateStable, [
  'R1_REFERENCE_RESOLUTION',
  'R6_RESTRAINT_SENTINELS',
  'R5_FRICTION_GEOMETRY',
  'DIRECTION_LAW_RCA',
  'DIRECTION_ONLY_EXPERIMENT',
  'R2_DELETED_SPRING_EXPERIMENT',
  'R3_CAPACITY_DIAGNOSTICS',
  'RCA_DECISION_GATE',
]);
assert.equal(withoutStateStable.includes('R2_MOBILISATION_DIAGNOSTICS'), false,
  'R2 mobilisation must not be fabricated when the experiment has no state-stable snapshot');

const scriptPath = resolve('scripts/lfea-m047-stage2-rca-evidence-batch.mjs');
const source = readFileSync(scriptPath, 'utf8');
assert.match(source, /64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8/u,
  'batch must pin the corrected BM4_L member hash');
assert.match(source, /5_136_384/u, 'batch must pin the BM4_L member byte count');
assert.match(source, /reports\/m047-stage2-rca-evidence/u,
  'batch outputs must default beneath reports/');
assert.match(source, /RCA batch refuses stale\/previous output/u,
  'batch must fail closed on stale owned outputs unless overwrite is explicit');
assert.match(source, /--max-iterations', '60'/u,
  'R2 deleted-spring iteration budget must remain declared and fixed in the batch');
assert.match(source, /firstStateStable !== null/u,
  'batch must branch on whether the R2 experiment actually produced a state-stable snapshot');
assert.match(source, /no first state-stable snapshot; mobilisation comparison has no admissible snapshot/u,
  'batch must explicitly skip, not fabricate, R2 mobilisation when no snapshot exists');
assert.match(source, /productionMechanicsChanged: false/u);
assert.match(source, /toleranceChanged: false/u);
assert.match(source, /comparisonPolicyChanged: false/u);
assert.doesNotMatch(source, /lfea-m047-stage2-production-run\.mjs/u,
  'L13 RCA batch must not invoke the full L7/L1 production boundary');
assert.doesNotMatch(source, /caesar-accdb-friction-solve/u,
  'batch runner is orchestration only and must not import the nonlinear solver');

for (const path of [
  scriptPath,
  resolve('scripts/lfea-m047-stage2-rca-decision-gate.mjs'),
  resolve('scripts/lfea-m047-stage2-rca-evidence-manifest-check.mjs'),
]) {
  const syntax = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, `${path} must parse: ${syntax.stderr}`);
}

process.stdout.write('PASS m047 Stage 2 L13 RCA evidence batch contract\n');
