#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  M047_TRACKED_RESTRAINTS,
  buildM047TargetNodeEvidence,
} from './lfea-m047-target-node-evidence.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const LOCKED_ACCDB_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const FORCE_TOLERANCE_N = 0.1;

const benchmark = JSON.parse(readFileSync(
  resolve(ROOT, 'reports/lfea-bm4nl-accdb-linear-benchmark.json'),
  'utf8',
));
const actual = JSON.parse(readFileSync(
  resolve(ROOT, 'reports/lfea-bm4nl-accdb-linear-actual.json'),
  'utf8',
));

const evidence = buildM047TargetNodeEvidence({ benchmark, actual });

assert.equal(evidence.schema, 'lfea-m047-target-node-evidence/v1');
assert.equal(evidence.sourceAccdbSha256, LOCKED_ACCDB_SHA256);
assert.equal(evidence.targets.length, M047_TRACKED_RESTRAINTS.length);
assert.deepEqual(
  evidence.targets.map((row) => `${row.caseId}:${row.nodeId}:${row.globalComponent}`),
  M047_TRACKED_RESTRAINTS.map((row) => `${row.caseId}:${row.nodeId}:${row.globalComponent}`),
);

const l19 = evidence.targets.find((row) => row.caseId === 'L19' && row.nodeId === '20090');
assert.ok(l19, 'L19 node 20090 target evidence is required');
assert.equal(l19.comparison.status, 'FAIL');
assert.ok(l19.comparison.percentError > 10, 'retained I000 L19 node 20090 must exceed 10%');
assert.deepEqual(
  l19.incidentElements.map((row) => String(row.sourceElementId)).sort(),
  ['4', '5'],
  'L19 node 20090 must retain the E4/E5 incident decomposition',
);
assert.ok(
  Math.abs(l19.balance.actionSumResidual) <= FORCE_TOLERANCE_N,
  `E4/E5 algebraic action sum residual ${l19.balance.actionSumResidual} exceeds ${FORCE_TOLERANCE_N} N`,
);
assert.ok(
  Math.abs(l19.balance.equilibriumResidual) <= FORCE_TOLERANCE_N,
  `L19 node 20090 equilibrium residual ${l19.balance.equilibriumResidual} exceeds ${FORCE_TOLERANCE_N} N`,
);
assert.ok(
  Math.abs(l19.balance.comparisonResidual) <= 1e-9,
  'target reaction row must equal the value used by qualification comparison',
);

const l20 = evidence.targets.filter((row) => row.caseId === 'L20');
assert.equal(l20.length, 5);
assert.equal(l20.filter((row) => row.comparison.status === 'FAIL').length, 5);

for (const target of evidence.targets) {
  assert.ok(target.incidentElements.length > 0, `${target.caseId} node ${target.nodeId} needs incident actions`);
  assert.ok(
    Math.abs(target.balance.actionSumResidual) <= FORCE_TOLERANCE_N,
    `${target.caseId} node ${target.nodeId} incident-action sum does not match reported incident action`,
  );
  assert.ok(
    Math.abs(target.balance.equilibriumResidual) <= FORCE_TOLERANCE_N,
    `${target.caseId} node ${target.nodeId} does not close against its support reaction`,
  );
  assert.ok(
    Math.abs(target.balance.comparisonResidual) <= 1e-9,
    `${target.caseId} node ${target.nodeId} comparison value differs from actual reaction row`,
  );
}

const replay = buildM047TargetNodeEvidence({ benchmark, actual });
assert.equal(replay.semanticHash, evidence.semanticHash);
assert.deepEqual(replay, evidence);

process.stdout.write('lfea-m047-target-node-evidence-check: PASS\n');
