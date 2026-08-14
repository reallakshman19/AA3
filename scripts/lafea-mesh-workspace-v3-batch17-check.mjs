#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  LAFEA_SOLVER_DIAGNOSTIC_EVIDENCE_V3_SCHEMA,
  diagnoseLafeaSolverExecutionV3,
} from '../src/workspace/lafea-solver-diagnostic-evidence-v3.js';

const singular = diagnoseLafeaSolverExecutionV3({
  schema: LAFEA_SOLVER_DIAGNOSTIC_EVIDENCE_V3_SCHEMA,
  stageId: 'LAFEA.3', meshContentHash: hash('M'), executionHash: hash('EXEC'),
  preFactorization: {
    topologyQualification: 'PASS', meshQualityQualification: 'PASS',
    constraintNullspaceDimension: 3, constraintProofHash: hash('NULLSPACE_PROOF'),
    mechanismProofHash: null, stiffnessScaleRatio: 10,
  },
  factorization: { status: 'SINGULAR', estimatedRankDeficiency: 3, conditionEstimate: null },
  postSolve: { normalizedResidual: null, reactionImbalance: null, energyImbalance: null },
  thresholds: {
    stiffnessScaleRatioWarning: 1e6, conditionEstimateWarning: 1e12,
    normalizedResidualMaximum: 1e-8, reactionImbalanceMaximum: 1e-8,
    energyImbalanceMaximum: 1e-8,
  },
});
assert.ok(singular.observations.some((row) => row.code === 'FACTORIZATION_SINGULAR'));
assert.ok(singular.observations.some((row) => row.code === 'CONSTRAINT_NULLSPACE_DETECTED'));
assert.ok(singular.suggestedContributors.some(
  (row) => row.code === 'INSUFFICIENT_RESTRAINT_OR_PHYSICAL_MECHANISM',
));
assert.equal(singular.causalConclusion, 'NO_UNIQUE_CAUSE_ASSERTED');

const ill = diagnoseLafeaSolverExecutionV3({
  schema: LAFEA_SOLVER_DIAGNOSTIC_EVIDENCE_V3_SCHEMA,
  stageId: 'LAFEA.4', meshContentHash: hash('M2'), executionHash: hash('EXEC2'),
  preFactorization: {
    topologyQualification: 'PASS', meshQualityQualification: 'BLOCK',
    constraintNullspaceDimension: 0, constraintProofHash: null, mechanismProofHash: null,
    stiffnessScaleRatio: 1e9,
  },
  factorization: { status: 'SUCCESS', estimatedRankDeficiency: 0, conditionEstimate: 1e14 },
  postSolve: { normalizedResidual: 1e-10, reactionImbalance: 1e-10, energyImbalance: 1e-10 },
  thresholds: {
    stiffnessScaleRatioWarning: 1e6, conditionEstimateWarning: 1e12,
    normalizedResidualMaximum: 1e-8, reactionImbalanceMaximum: 1e-8,
    energyImbalanceMaximum: 1e-8,
  },
});
assert.ok(ill.observations.some((row) => row.code === 'ILL_CONDITIONING_DETECTED'));
assert.ok(ill.suggestedContributors.some((row) => row.code === 'MESH_DISTORTION_MAY_CONTRIBUTE'));
assert.ok(ill.suggestedContributors.some((row) => row.code === 'SCALE_DISPARITY_MAY_CONTRIBUTE'));
assert.equal(ill.causalConclusion, 'NO_UNIQUE_CAUSE_ASSERTED');

const provenMechanism = diagnoseLafeaSolverExecutionV3({
  schema: LAFEA_SOLVER_DIAGNOSTIC_EVIDENCE_V3_SCHEMA,
  stageId: 'LAFEA.3', meshContentHash: hash('M3'), executionHash: hash('EXEC3'),
  preFactorization: {
    topologyQualification: 'PASS', meshQualityQualification: 'PASS',
    constraintNullspaceDimension: 1, constraintProofHash: hash('NULLSPACE'),
    mechanismProofHash: hash('MECHANISM'), stiffnessScaleRatio: 10,
  },
  factorization: { status: 'SINGULAR', estimatedRankDeficiency: 1, conditionEstimate: null },
  postSolve: { normalizedResidual: null, reactionImbalance: null, energyImbalance: null },
  thresholds: {
    stiffnessScaleRatioWarning: 1e6, conditionEstimateWarning: 1e12,
    normalizedResidualMaximum: 1e-8, reactionImbalanceMaximum: 1e-8,
    energyImbalanceMaximum: 1e-8,
  },
});
assert.equal(provenMechanism.causalConclusion, 'KINEMATIC_MECHANISM_PROVEN_BY_SEPARATE_EVIDENCE');

console.log(JSON.stringify({
  check: 'lafea-mesh-workspace-v3-batch17', status: 'PASS',
  factorizationFailureIsObservationNotMeshCause: true,
  nullspaceWithoutMechanismProofRemainsSuggestedCause: true,
  meshDistortionAndScalingAreSuggestedContributorsOnly: true,
  uniqueMechanismCauseRequiresSeparateProofHash: true,
}));

function hash(value) {
  const hex = Buffer.from(value).toString('hex').padEnd(64, '0').slice(0, 64);
  return `sha256:${hex}`;
}
