#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  calculateLocalContinuum,
  createCanonicalLocalContinuumModel,
  QUALIFICATION_STATES,
} from '../src/core/local-continuum/index.js';
import {
  applyDiagonalScalingToMatrix,
  applyDiagonalScalingToVector,
  assembleSparseSymmetric,
  diagonalScaleFactors,
  sparseCholeskyFactorize,
  sparseCholeskySolve,
  undoDiagonalScaling,
} from '../src/core/lafea-linear-solve/index.js';
import { triangleSource, patchSource } from './lafea.3-fixtures.mjs';
import { semanticHashes, writeBmSCaseEvidence } from './lib/lafea.3-bm-s-evidence.mjs';
import {
  caseBy,
  conditioningEvidence,
  conditioningObservation,
  createS3Checks,
  displacementVectorFor,
  dot,
  finalizeChecks,
  nodalCase,
  reactionTotals,
  vectorTotals,
} from './lib/lafea.3-bm-s-s3-helpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORACLE_PATH = path.join(
  ROOT,
  'validation/lafea-benchmark-data/B02/oracle/solver-numerics-expected-values.json',
);
const oracle = JSON.parse(fs.readFileSync(ORACLE_PATH, 'utf8'));
assert.equal(oracle.schema, 'lafea-b02-s3-solver-numerics-expected-values/v1');
assert.equal(oracle.authority.productionOutputUsed, false);
assert.equal(oracle.authority.productionOutputMayModifyExpectedValues, false);
assert.equal(oracle.authority.productionOutputMayModifyAcceptance, false);
assert.equal(oracle.authority.conditioningMetricsAreDiagnosticOnly, true);
const expectedById = new Map(oracle.cases.map((row) => [row.caseId, row]));
const checksApi = createS3Checks(oracle.acceptance);
const {
  compare,
  gate,
  compareVectors,
  compareSumVectors,
  compareDisplacements,
  compareSumDisplacements,
  compareElementStress,
  compareSumElementStress,
  compareReactions,
  compareSumReactions,
} = checksApi;

const caseResults = [
  capture('SOLVER-EQUILIBRIUM-ENERGY-01', runEquilibriumEnergy),
  capture('SOLVER-LINEAR-SCALING-01', runLinearScaling),
  capture('SOLVER-SUPERPOSITION-01', runSuperposition),
  capture('SOLVER-DIAGONAL-SCALING-01', runDiagonalScaling),
];
const evidence = {
  schema: 'lafea3-bm-s-s3-solver-numerics-evidence/v1',
  benchmarkStage: 'S3',
  authority: {
    class: oracle.authority.class,
    productionOutputUsedToDefineExpectedValues: false,
    productionOutputMayModifyAcceptance: false,
    conditioningMetricsAreDiagnosticOnly: true,
  },
  acceptance: oracle.acceptance,
  caseResults,
  stageStatus: caseResults.every((row) => row.status === 'PASS') ? 'PASS' : 'FAIL',
};
writeBmSCaseEvidence('LAFEA_BM_S_S3_REPORT_PATH', evidence);
console.log(JSON.stringify(evidence));
assert.equal(
  evidence.stageStatus,
  'PASS',
  `S3 solver-numerics failures: ${caseResults.filter((row) => row.status !== 'PASS').map((row) => row.caseId).join(', ')}`,
);

function capture(caseId, execute) {
  try {
    const expected = expectedById.get(caseId);
    assert.ok(expected, `missing S3 oracle ${caseId}`);
    return { caseId, kind: expected.kind, ...execute(expected) };
  } catch (error) {
    return {
      caseId,
      kind: expectedById.get(caseId)?.kind ?? 'UNKNOWN',
      status: 'FAIL',
      error: {
        name: error?.name ?? 'Error',
        code: error?.code ?? null,
        message: String(error?.message ?? error),
      },
    };
  }
}

function runEquilibriumEnergy(expected) {
  const model = patchSource({
    sigma: expected.inputs.tractionXMPa,
    thickness: expected.inputs.thicknessMm,
    elasticModulus: expected.inputs.elasticModulusMPa,
  });
  model.materials[0].poissonRatio = expected.inputs.poissonRatio;
  model.resultRequests = { loadCaseIds: ['TRACTION'] };
  const result = solve(model);
  const row = caseBy(result, 'TRACTION');
  const checks = [];
  const applied = vectorTotals(result.meshEvidence.dofOrdering, row.forceEvidence.forceVector);
  const reactions = reactionTotals(row.supportReactions);
  const displacementVector = displacementVectorFor(row, result.meshEvidence.dofOrdering);
  const externalWork = dot(row.forceEvidence.forceVector, displacementVector);
  const maximumFreeResidual = Math.max(0, ...row.freeDofResiduals.map((item) => Math.abs(item.value)));
  const reactionPlusApplied = { x: applied.x + reactions.x, y: applied.y + reactions.y };

  compare(checks, 'appliedResultant.x', applied.x, expected.derived.appliedResultantN.x);
  compare(checks, 'appliedResultant.y', applied.y, expected.derived.appliedResultantN.y);
  compare(checks, 'reactionResultant.x', reactions.x, expected.derived.reactionResultantN.x);
  compare(checks, 'reactionResultant.y', reactions.y, expected.derived.reactionResultantN.y);
  gate(checks, 'freeDofResidual', maximumFreeResidual, row.equilibrium.freeDofTolerance);
  gate(checks, 'reactionEquilibrium.x', Math.abs(reactionPlusApplied.x), row.equilibrium.reactionEquilibriumTolerance);
  gate(checks, 'reactionEquilibrium.y', Math.abs(reactionPlusApplied.y), row.equilibrium.reactionEquilibriumTolerance);
  gate(checks, 'energyReconstruction', Math.abs(row.energyQualification.residual), row.energyQualification.tolerance);
  compare(checks, 'strainEnergy', row.totalStrainEnergy, expected.derived.strainEnergyNmm);
  compare(checks, 'externalWork', externalWork, expected.derived.externalWorkNmm);
  compare(checks, 'clapeyron', externalWork, 2 * row.totalStrainEnergy);
  row.nodalDisplacements
    .filter((item) => ['B', 'C'].includes(item.nodeId))
    .forEach((item) => compare(checks, `${item.nodeId}.ux`, item.ux, expected.derived.rightEdgeUxMm));

  return finalizeChecks(checks, {
    appliedResultantN: applied,
    reactionResultantN: reactions,
    reactionPlusAppliedN: reactionPlusApplied,
    maximumFreeResidual,
    freeDofTolerance: row.equilibrium.freeDofTolerance,
    reactionEquilibriumTolerance: row.equilibrium.reactionEquilibriumTolerance,
    externalWorkNmm: externalWork,
    totalStrainEnergyNmm: row.totalStrainEnergy,
    externalWorkOverTwoStrainEnergy: externalWork / (2 * row.totalStrainEnergy),
    energyReconstructionResidual: row.energyQualification.residual,
    energyReconstructionTolerance: row.energyQualification.tolerance,
    conditioning: conditioningEvidence(row, checks, checksApi),
    semanticHashes: semanticHashes(result),
  });
}

function runLinearScaling(expected) {
  const result = solve(triangleSource());
  const base = caseBy(result, 'L1');
  const scaled = caseBy(result, 'L2');
  const factor = expected.derived.responseFactor;
  const checks = [];
  compareVectors(checks, 'force', scaled.forceEvidence.forceVector, base.forceEvidence.forceVector, factor);
  compareDisplacements(checks, scaled, base, factor);
  compareElementStress(checks, scaled, base, factor);
  compareReactions(checks, scaled, base, factor);
  compare(checks, 'strainEnergy', scaled.totalStrainEnergy, expected.derived.strainEnergyFactor * base.totalStrainEnergy);
  return finalizeChecks(checks, {
    responseFactor: factor,
    strainEnergyFactor: expected.derived.strainEnergyFactor,
    baseStrainEnergyNmm: base.totalStrainEnergy,
    scaledStrainEnergyNmm: scaled.totalStrainEnergy,
    baseConditioning: conditioningObservation(base),
    scaledConditioning: conditioningObservation(scaled),
    semanticHashes: semanticHashes(result),
  });
}

function runSuperposition(expected) {
  const model = triangleSource();
  const a = expected.inputs.loadA;
  const b = expected.inputs.loadB;
  model.loadCases = [
    nodalCase('A', [{ loadId: 'A1', nodeId: a.nodeId, fx: a.fxN, fy: a.fyN }]),
    nodalCase('B', [{ loadId: 'B1', nodeId: b.nodeId, fx: b.fxN, fy: b.fyN }]),
    nodalCase('A_PLUS_B', [
      { loadId: 'AB1', nodeId: a.nodeId, fx: a.fxN, fy: a.fyN },
      { loadId: 'AB2', nodeId: b.nodeId, fx: b.fxN, fy: b.fyN },
    ]),
  ];
  model.resultRequests = { loadCaseIds: ['A', 'B', 'A_PLUS_B'] };
  const result = solve(model);
  const caseA = caseBy(result, 'A');
  const caseB = caseBy(result, 'B');
  const combined = caseBy(result, 'A_PLUS_B');
  const checks = [];
  compareSumVectors(checks, 'force', combined.forceEvidence.forceVector, caseA.forceEvidence.forceVector, caseB.forceEvidence.forceVector);
  compareSumDisplacements(checks, combined, caseA, caseB);
  compareSumElementStress(checks, combined, caseA, caseB);
  compareSumReactions(checks, combined, caseA, caseB);
  return finalizeChecks(checks, {
    loadA: a,
    loadB: b,
    maximumFreeResiduals: Object.fromEntries(
      [caseA, caseB, combined].map((row) => [row.loadCaseId, row.equilibrium.freeDofMaximumResidual]),
    ),
    conditioning: Object.fromEntries(
      [caseA, caseB, combined].map((row) => [row.loadCaseId, conditioningObservation(row)]),
    ),
    semanticHashes: semanticHashes(result),
  });
}

function runDiagonalScaling(expected) {
  const { matrix: dense, rightHandSide, factorizationTolerance } = expected.inputs;
  const indices = Array.from({ length: dense.length }, (_, index) => index);
  const matrix = assembleSparseSymmetric(dense.length, [{ indices, localMatrix: dense }]);
  const unscaled = sparseCholeskySolve(sparseCholeskyFactorize(matrix, factorizationTolerance), rightHandSide);
  const factors = diagonalScaleFactors(matrix);
  const scaledMatrix = applyDiagonalScalingToMatrix(matrix, factors);
  const scaledRightHandSide = applyDiagonalScalingToVector(rightHandSide, factors);
  const scaled = sparseCholeskySolve(
    sparseCholeskyFactorize(scaledMatrix, factorizationTolerance),
    scaledRightHandSide,
  );
  const recovered = undoDiagonalScaling(scaled, factors);
  const maximumRelativeDifference = Math.max(...unscaled.map((value, index) => (
    Math.abs(value - recovered[index]) / Math.max(1, Math.abs(value))
  )));
  const maximumDiagonalError = Math.max(...indices.map((index) => (
    Math.abs(scaledMatrix.rows[index].get(index) - 1)
  )));
  const checks = [];
  gate(checks, 'solutionReversibility', maximumRelativeDifference, expected.derived.maximumRelativeSolutionDifferenceLimit);
  gate(checks, 'unitDiagonal', maximumDiagonalError, expected.derived.maximumScaledDiagonalAbsoluteErrorLimit);
  return finalizeChecks(checks, {
    unscaledSolution: unscaled,
    recoveredSolution: recovered,
    scaleFactors: factors,
    maximumRelativeSolutionDifference: maximumRelativeDifference,
    maximumScaledDiagonalAbsoluteError: maximumDiagonalError,
  });
}

function solve(model) {
  const result = calculateLocalContinuum(createCanonicalLocalContinuumModel(model));
  assert.equal(result.qualification.state, QUALIFICATION_STATES.ACCEPTED);
  return result;
}
