#!/usr/bin/env node
import assert from 'node:assert/strict';

import { calculateLocalTrunnionFootprint } from '../src/core/local-trunnion-footprint/index.js';
import { runLafea4ShellIndependentBenchmarkCheck } from './lafea4-shell-independent-benchmark-check.mjs';
import { runLafeaShellIndependentBenchmarkFreezeCheck } from './lafea-shell-independent-benchmark-freeze-check.mjs';
import { stableShellTemplate, workflowSource } from './lafea.5-fixtures.mjs';

await runLafeaShellIndependentBenchmarkFreezeCheck({ emit: false });
const independentBenchmarkExecution = await runLafea4ShellIndependentBenchmarkCheck({
  emit: false,
  freezeAlreadyChecked: true,
});

const source = workflowSource();
const fixedNodeIds = [...new Set(source.shellTemplate.constraints.map((row) => row.nodeId))].sort();
const expectedOuterNodes = Array.from({ length: 12 }, (_, index) => `O${String(index).padStart(2, '0')}`);

assert.deepEqual(fixedNodeIds, expectedOuterNodes,
  'The engineering workflow Sample must fix only the outer Oxx ring.');
assert.equal(source.shellTemplate.constraints.length, 60,
  'The engineering workflow Sample must retain five zero DOFs on each of 12 outer-ring nodes.');
assert.equal(source.shellTemplate.constraints.some((row) => row.nodeId.startsWith('F')), false,
  'Footprint Fxx nodes must remain structurally free in the engineering workflow Sample.');

const result = calculateLocalTrunnionFootprint(source);
assert.equal(result.qualification.accepted, true, result.qualification.summary);
assert.ok(result.rawShellResult?.loadCaseResults?.length > 0);
assert.ok(result.loadDistributionEvidence?.length > 0);

const distribution = result.loadDistributionEvidence[0];
closeVector(distribution.transferredForce, [120, -80, 60], 1e-10, 'transferred force');
closeVector(distribution.transferredMoment, [680, -560, 860], 1e-9, 'transferred moment');
closeVector(distribution.forceResidual, [0, 0, 0], 1e-9, 'distribution force residual');
closeVector(distribution.momentResidual, [0, 0, 0], 1e-8, 'distribution moment residual');
assert.equal(distribution.forceQualification.accepted, true);
assert.equal(distribution.momentQualification.accepted, true);

const shellCase = result.rawShellResult.loadCaseResults[0];
assert.equal(shellCase.qualification.accepted, true);
assert.equal(shellCase.forceEquilibrium.qualification.accepted, true);
assert.equal(shellCase.momentEquilibrium.qualification.accepted, true);
assert.equal(shellCase.freeDofIdentities.length, 60);
assert.equal(shellCase.constrainedDofIdentities.length, 60);
assert.equal(shellCase.solverEvidence.method, 'DETERMINISTIC_DENSE_CHOLESKY');
assert.ok(shellCase.solverEvidence.minimumPivot > 0);
assert.ok(shellCase.solverEvidence.pivotRatio > 0);

const maximumDisplacement = maxDisplacement(result.rawShellResult);
const maximumVonMises = maxVonMises(result.rawShellResult);
assert.ok(Number.isFinite(maximumDisplacement) && maximumDisplacement > 1e-6,
  `Engineering workflow Sample must have nonzero structural displacement, got ${maximumDisplacement}.`);
assert.ok(Number.isFinite(maximumVonMises) && maximumVonMises > 1e-3,
  `Engineering workflow Sample must have nonzero structural stress, got ${maximumVonMises}.`);
// Chromium-independent audit at this geometry/load placed these values near
// 0.001251 mm and 19.999 MPa. Keep broad guards here so this is a regression
// envelope, not a circular golden-value qualification claim.
assert.ok(maximumDisplacement < 0.01,
  `Engineering workflow Sample displacement left the audited order-of-magnitude envelope: ${maximumDisplacement}.`);
assert.ok(maximumVonMises < 100,
  `Engineering workflow Sample stress left the audited order-of-magnitude envelope: ${maximumVonMises}.`);

const allFixedTemplate = stableShellTemplate();
assert.equal(allFixedTemplate.constraints.length, 120,
  'The original all-fixed shell contract fixture must remain available by default.');
assert.equal(new Set(allFixedTemplate.constraints.map((row) => row.nodeId)).size, 24);
const allFixedResult = calculateLocalTrunnionFootprint(workflowSource({
  shellTemplate: allFixedTemplate,
}));
assert.equal(allFixedResult.qualification.accepted, true, allFixedResult.qualification.summary);
assert.equal(maxDisplacement(allFixedResult.rawShellResult), 0,
  'The retained all-fixed contract fixture should remain a zero-displacement reaction-closure case.');
assert.equal(maxVonMises(allFixedResult.rawShellResult), 0,
  'The retained all-fixed contract fixture should remain a zero-stress reaction-closure case.');

console.log(JSON.stringify({
  schema: 'lafea-shell-response-acceptance-check/v1',
  status: 'PASS',
  independentBenchmarkFreeze: 'PASS_REQUIRED_BEFORE_PRODUCT_RESPONSE_ACCEPTANCE',
  independentBenchmarkExecution: independentBenchmarkExecution.status,
  workflowSample: {
    fixedNodeIds,
    freeDofCount: shellCase.freeDofIdentities.length,
    constrainedDofCount: shellCase.constrainedDofIdentities.length,
    minimumPivot: shellCase.solverEvidence.minimumPivot,
    pivotRatio: shellCase.solverEvidence.pivotRatio,
    maximumDisplacementMm: maximumDisplacement,
    maximumVonMisesMpa: maximumVonMises,
    transferredForce: distribution.transferredForce,
    transferredMoment: distribution.transferredMoment,
    forceEquilibrium: shellCase.forceEquilibrium.qualification.accepted,
    momentEquilibrium: shellCase.momentEquilibrium.qualification.accepted,
  },
  retainedContractFixture: {
    allFixedConstraintCount: allFixedTemplate.constraints.length,
    zeroDisplacement: true,
    zeroStress: true,
  },
}, null, 2));

function maxDisplacement(shellResult) {
  let maximum = 0;
  for (const loadCase of shellResult?.loadCaseResults ?? []) {
    for (const row of loadCase.nodalDisplacements ?? []) {
      maximum = Math.max(maximum, Math.hypot(row.ux ?? 0, row.uy ?? 0, row.uz ?? 0));
    }
  }
  return maximum;
}

function maxVonMises(shellResult) {
  let maximum = 0;
  for (const loadCase of shellResult?.loadCaseResults ?? []) {
    for (const element of loadCase.elementResults ?? []) {
      for (const point of element.integrationPoints ?? []) {
        for (const surface of point.surfaces ?? []) {
          maximum = Math.max(maximum, Math.abs(surface.vonMises ?? 0));
        }
      }
    }
  }
  return maximum;
}

function closeVector(actual, expected, tolerance, label) {
  assert.equal(actual.length, expected.length, `${label} dimension mismatch`);
  for (let index = 0; index < expected.length; index += 1) {
    assert.ok(Math.abs(actual[index] - expected[index]) <= tolerance,
      `${label}[${index}] ${actual[index]} != ${expected[index]}`);
  }
}
