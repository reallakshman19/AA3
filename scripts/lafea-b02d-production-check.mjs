#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LAFEA_CONTINUUM_PROBE_CONVERGENCE_DEFINITION_SCHEMA,
  LAFEA_CONTINUUM_PROBE_CONVERGENCE_OBSERVATIONS_SCHEMA,
  createLafeaContinuumProbeConvergenceDefinition,
  createLafeaContinuumProbeConvergenceObservations,
  evaluateLafeaContinuumProbeConvergence,
} from '../src/workspace/lafea-continuum-probe-convergence.js';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import { executeB02dProductionLevel } from './lib/lafea-b02d-production-route.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const definition = read('validation/lafea-b02-definitions/B02D-lug-pinhole.json');
const convergencePolicy = read('validation/lafea-b02-definitions/B02E-convergence.json');
const matrix = read('validation/lafea-b02-contracts/method-benchmark-applicability.json');
const methodRow = matrix.matrix.find((row) => row.benchmarkId === 'B02D');
assert.ok(methodRow);

const methods = ['T3', 'T6', 'Q8'];
const methodEvidence = methods.map(runMethod);
for (const method of ['T6', 'Q8']) {
  assert.equal(methodEvidence.find((row) => row.method === method)?.status, 'PASS');
  assert.equal(methodRow[method], 'REQUIRED');
}
assert.equal(methodRow.T3, 'CONTROL');

const body = {
  schema: 'lafea-b02d-production-qualification-receipt/v1',
  caseId: 'B02D',
  status: 'PASS',
  definitionHash: canonicalLafeaSha256(definition),
  convergencePolicyHash: canonicalLafeaSha256(convergencePolicy),
  definitionFrozenBeforeObservation: true,
  productionOutputUsedToChooseDefinition: false,
  meshPolicyId: 'B02D_PROBE_STABLE_POLAR_POLICY_V1',
  loadDistribution: 'CONSISTENT_UNIFORM_LINE_RESULTANT_T2_Q3_EDGE_V1',
  methods: methodEvidence,
  t3Disposition: 'CONTROL_NOT_RELEASE_CRITICAL',
  requiredMethods: ['T6', 'Q8'],
  fixedPhysicalProbeAuthority: true,
  fixedPhysicalPathAuthority: true,
  movingMaximumUsed: false,
  nodalAveragedStressUsedAsSoleAuthority: false,
  integrationPointExtrapolationUsed: false,
  generalInternalFeatureAuthoringAuthorityGranted: false,
  releaseAuthorityGranted: false,
  temperatureAuthorityGranted: false,
};
console.log(JSON.stringify({
  ...body,
  semanticHash: canonicalLafeaSha256({
    schema: 'lafea-b02d-production-qualification-receipt-hash-input/v1',
    receipt: body,
  }),
}, null, 2));

function runMethod(method) {
  const required = methodRow[method] === 'REQUIRED';
  const levels = definition.globalResponseLadder.levels.map((level) => {
    const run = executeB02dProductionLevel(definition, method, level);
    const loadResultant = run.load.resultant;
    const expected = definition.loadCase.resultant;
    const forceError = Math.hypot(
      loadResultant.forceX - expected.x,
      loadResultant.forceY - expected.y,
    ) / Math.max(1, Math.hypot(expected.x, expected.y));
    within(forceError, definition.acceptance.global.loadResultantRelativeMaximum,
      `B02D/${method}/${level.levelId} load resultant`);
    const momentError = Math.abs(
      loadResultant.momentZ - definition.loadCase.momentAboutOrigin,
    ) / Math.max(1, Math.abs(definition.loadCase.momentAboutOrigin));
    within(momentError, definition.acceptance.global.loadMomentRelativeMaximum,
      `B02D/${method}/${level.levelId} load moment`);

    const equilibrium = equilibriumEvidence(run.stage, run.resultCase);
    within(equilibrium.totalForceRelativeResidual,
      definition.acceptance.global.forceEquilibriumRelativeMaximum,
      `B02D/${method}/${level.levelId} force equilibrium`);
    within(equilibrium.totalMomentRelativeResidual,
      definition.acceptance.global.momentEquilibriumRelativeMaximum,
      `B02D/${method}/${level.levelId} moment equilibrium`);
    within(run.energyReconstruction.relativeResidual,
      definition.acceptance.global.energyReconstructionRelativeMaximum,
      `B02D/${method}/${level.levelId} energy reconstruction`);

    for (const probe of [...run.fixedProbes, ...run.pathProbes]) {
      within(probe.mapping.mappingResidual,
        definition.acceptance.stressRecovery.probeMappingResidualMaximum,
        `B02D/${method}/${level.levelId}/${probe.probe.probeId} mapping residual`);
      const margin = naturalCoordinateMargin(probe);
      assert.ok(
        margin > definition.acceptance.stressRecovery.naturalCoordinateMarginMinimum,
        `B02D/${method}/${level.levelId}/${probe.probe.probeId} natural margin ${margin}`,
      );
      assert.equal(probe.movingMaximumUsed, false);
      assert.equal(probe.nodalStressProjectionUsed, false);
      assert.equal(probe.crossElementAveragingUsed, false);
      assert.equal(probe.retainedIntegrationPointExtrapolationUsed, false);
      assert.equal(probe.pointwiseAcceptanceEligible, true);
    }

    return Object.freeze({
      levelId: level.levelId,
      h: level.h,
      meshHash: run.stage.execution.meshHash,
      executionHash: run.stage.execution.compiledExecutionHash,
      recoveryHash: run.stage.lifecycle.artifacts.RECOVERY.artifactHash,
      nodeCount: run.meshEvidence.mesh.nodes.length,
      elementCount: run.meshEvidence.mesh.elements.length,
      loadResultant,
      forceError,
      momentError,
      equilibrium,
      strainEnergy: run.resultCase.totalStrainEnergy,
      energyReconstruction: run.energyReconstruction,
      solverStorage: run.runtimeSolverDiagnostics?.storageRoute ?? null,
      solverMethods: run.runtimeSolverDiagnostics?.methods ?? [],
      fixedProbes: run.fixedProbes,
      pathProbes: run.pathProbes,
    });
  });

  const convergenceLevelIds = definition.globalResponseLadder.evaluatedConvergenceLevels;
  const convergenceLevels = convergenceLevelIds.map((id) => {
    const found = levels.find((row) => row.levelId === id);
    assert.ok(found, `B02D missing convergence level ${id}`);
    return found;
  });
  const energyConvergence = scalarConvergence(
    `B02D/${method}/STRAIN_ENERGY`,
    convergenceLevels.map((row) => ({ levelId: row.levelId, h: row.h, value: row.strainEnergy })),
    convergencePolicy,
  );
  if (required) {
    assertConverged(energyConvergence, `B02D/${method}/STRAIN_ENERGY`);
    within(energyConvergence.gciFineRelative,
      definition.acceptance.global.strainEnergyGciRelativeMaximum,
      `B02D/${method} strain energy GCI`);
  }

  const fixedProbeConvergence = definition.fixedProbes.map((probe) =>
    physicalProbeConvergence(method, probe.probeId, convergenceLevels,
      (row) => row.fixedProbes, probe.singularityClassification, required));
  const pathConvergence = definition.fixedPath.stations.map((station) =>
    physicalProbeConvergence(method, `${definition.fixedPath.pathId}/${station.stationId}`,
      convergenceLevels, (row) => row.pathProbes,
      station.singularityClassification, required));

  return Object.freeze({
    method,
    applicability: methodRow[method],
    status: 'PASS',
    levels: levels.map(summaryLevel),
    energyConvergence,
    fixedProbeConvergence,
    pathConvergence,
    releaseCritical: required,
  });
}

function physicalProbeConvergence(method, probeId, levels, selector, singularityClass, required) {
  const evidence = levels.map((row) => selector(row).find((probe) => probe.probe.probeId === probeId));
  assert.equal(evidence.every(Boolean), true, `B02D/${method}/${probeId} evidence missing`);
  const definitionValue = createLafeaContinuumProbeConvergenceDefinition({
    schema: LAFEA_CONTINUUM_PROBE_CONVERGENCE_DEFINITION_SCHEMA,
    studyId: `B02D/${method}/${probeId}`,
    quantityIdentityHash: evidence[0].quantityIdentityHash,
    refinementRatio: convergencePolicy.frozenRules.refinementRatio,
    gciSafetyFactor: convergencePolicy.frozenRules.gciSafetyFactor,
    nearZeroAbsolute: convergencePolicy.frozenRules.nearZeroAbsoluteByQuantityClass.STRESS_MPA,
    orderStabilityRelativeTolerance: convergencePolicy.frozenRules.orderStabilityRelativeTolerance,
    levels: levels.map(({ levelId, h }) => ({ levelId, h })),
  });
  const observations = createLafeaContinuumProbeConvergenceObservations({
    schema: LAFEA_CONTINUUM_PROBE_CONVERGENCE_OBSERVATIONS_SCHEMA,
    studyId: definitionValue.studyId,
    definitionHash: definitionValue.semanticHash,
    levels: levels.map((row, index) => ({ levelId: row.levelId, evidence: evidence[index] })),
  });
  const result = evaluateLafeaContinuumProbeConvergence(definitionValue, observations);
  let gciFineRelative = null;
  if (result.gciFineAbsolute !== null) {
    gciFineRelative = result.gciFineAbsolute /
      Math.max(Math.abs(evidence.at(-1).authoritativeValue), 1e-30);
  } else if (result.classification === 'NEAR_ZERO_FINE_DIFFERENCE') {
    gciFineRelative = 0;
  }
  if (required) {
    assertConverged({ ...result, gciFineRelative }, `B02D/${method}/${probeId}`);
    const limit = singularityClass === 'HIGH_GRADIENT_CONVERGENCE'
      ? definition.acceptance.stressRecovery.highGradientGciRelativeMaximum
      : definition.acceptance.stressRecovery.nonSingularGciRelativeMaximum;
    within(gciFineRelative, limit, `B02D/${method}/${probeId} stress GCI`);
  }
  return Object.freeze({
    probeId,
    singularityClassification: singularityClass,
    classification: result.classification,
    observedOrder: result.observedOrder,
    gciFineAbsolute: result.gciFineAbsolute,
    gciFineRelative,
    evidenceHash: result.semanticHash,
    releaseCritical: required,
  });
}

function scalarConvergence(studyId, levels, policy) {
  assert.equal(levels.length, 3);
  const [coarse, medium, fine] = levels;
  const ratio1 = coarse.h / medium.h;
  const ratio2 = medium.h / fine.h;
  close(ratio1, policy.frozenRules.refinementRatio, 1e-12, `${studyId} r1`);
  close(ratio2, policy.frozenRules.refinementRatio, 1e-12, `${studyId} r2`);
  const d1 = coarse.value - medium.value;
  const d2 = medium.value - fine.value;
  const nearZero = policy.frozenRules.nearZeroAbsoluteByQuantityClass.ENERGY_N_MM;
  if (Math.abs(d2) <= nearZero) {
    return Object.freeze({
      studyId, classification: 'NEAR_ZERO_FINE_DIFFERENCE', observedOrder: null,
      gciFineAbsolute: 0, gciFineRelative: 0,
      levels, evidenceHash: canonicalLafeaSha256({ schema: 'lafea-b02-scalar-convergence/v1', studyId, levels }),
    });
  }
  if (d1 * d2 < 0) return scalarRejected(studyId, 'OSCILLATORY', levels);
  if (!(Math.abs(d2) < Math.abs(d1))) return scalarRejected(studyId, 'DIVERGENT', levels);
  const observedOrder = Math.log(Math.abs(d1 / d2)) / Math.log(policy.frozenRules.refinementRatio);
  if (!(Number.isFinite(observedOrder) && observedOrder > 0)) {
    return scalarRejected(studyId, 'DIVERGENT', levels);
  }
  const denominator = policy.frozenRules.refinementRatio ** observedOrder - 1;
  const gciFineAbsolute = policy.frozenRules.gciSafetyFactor * Math.abs(d2) / denominator;
  const gciFineRelative = gciFineAbsolute / Math.max(Math.abs(fine.value), 1e-30);
  return Object.freeze({
    studyId,
    classification: 'MONOTONIC_CONVERGING',
    observedOrder,
    gciFineAbsolute,
    gciFineRelative,
    levels,
    evidenceHash: canonicalLafeaSha256({
      schema: 'lafea-b02-scalar-convergence/v1', studyId, levels,
      observedOrder, gciFineAbsolute, gciFineRelative,
    }),
  });
}

function scalarRejected(studyId, classification, levels) {
  return Object.freeze({
    studyId, classification, observedOrder: null,
    gciFineAbsolute: null, gciFineRelative: null, levels,
    evidenceHash: canonicalLafeaSha256({
      schema: 'lafea-b02-scalar-convergence/v1', studyId, classification, levels,
    }),
  });
}

function assertConverged(result, label) {
  assert.ok(
    ['ASYMPTOTIC', 'MONOTONIC_CONVERGING', 'NEAR_ZERO_FINE_DIFFERENCE'].includes(result.classification),
    `${label} convergence is ${result.classification}`,
  );
  assert.ok(Number.isFinite(result.gciFineRelative), `${label} GCI is unavailable`);
}

function equilibriumEvidence(stage, loadCase) {
  const model = stage.execution.canonicalInput;
  const nodeById = new Map(model.nodes.map((node) => [node.nodeId, node]));
  const applied = resultant(vectorFromForce(stage.execution.result, loadCase.forceEvidence.forceVector, nodeById), nodeById);
  const reaction = resultant(vectorFromReactions(loadCase.supportReactions, nodeById), nodeById);
  const total = {
    forceX: applied.forceX + reaction.forceX,
    forceY: applied.forceY + reaction.forceY,
    momentZ: applied.momentZ + reaction.momentZ,
  };
  const forceScale = Math.max(1, Math.hypot(definition.loadCase.resultant.x, definition.loadCase.resultant.y));
  const momentScale = Math.max(1, Math.abs(definition.loadCase.momentAboutOrigin));
  return Object.freeze({
    applied, reaction, total,
    totalForceRelativeResidual: Math.hypot(total.forceX, total.forceY) / forceScale,
    totalMomentRelativeResidual: Math.abs(total.momentZ) / momentScale,
  });
}

function vectorFromForce(result, values, nodeById) {
  const vector = new Map([...nodeById.keys()].map((nodeId) => [nodeId, { fx: 0, fy: 0 }]));
  result.meshEvidence.dofOrdering.forEach((identity, index) => {
    const separator = identity.lastIndexOf(':');
    const nodeId = identity.slice(0, separator);
    const dof = identity.slice(separator + 1);
    vector.get(nodeId)[dof === 'UX' ? 'fx' : 'fy'] = values[index];
  });
  return vector;
}
function vectorFromReactions(rows, nodeById) {
  const vector = new Map([...nodeById.keys()].map((nodeId) => [nodeId, { fx: 0, fy: 0 }]));
  rows.forEach((row) => {
    const separator = row.dofIdentity.lastIndexOf(':');
    const nodeId = row.dofIdentity.slice(0, separator);
    const dof = row.dofIdentity.slice(separator + 1);
    vector.get(nodeId)[dof === 'UX' ? 'fx' : 'fy'] = row.value;
  });
  return vector;
}
function resultant(vector, nodeById) {
  let forceX = 0; let forceY = 0; let momentZ = 0;
  for (const [nodeId, force] of vector) {
    const node = nodeById.get(nodeId);
    forceX += force.fx; forceY += force.fy;
    momentZ += node.x * force.fy - node.y * force.fx;
  }
  return Object.freeze({ forceX, forceY, momentZ });
}
function naturalCoordinateMargin(evidence) {
  const natural = evidence.mapping.naturalCoordinates;
  return evidence.mapping.elementType === 'Q8'
    ? Math.min(1 - Math.abs(natural.xi), 1 - Math.abs(natural.eta))
    : Math.min(natural.xi, natural.eta, natural.lambda1);
}
function summaryLevel(row) {
  return Object.freeze({
    levelId: row.levelId, h: row.h,
    meshHash: row.meshHash, executionHash: row.executionHash, recoveryHash: row.recoveryHash,
    nodeCount: row.nodeCount, elementCount: row.elementCount,
    loadResultant: row.loadResultant,
    loadResultantRelativeError: row.forceError,
    loadMomentRelativeError: row.momentError,
    equilibrium: row.equilibrium,
    strainEnergy: row.strainEnergy,
    energyReconstruction: row.energyReconstruction,
    solverStorage: row.solverStorage, solverMethods: row.solverMethods,
    fixedProbes: row.fixedProbes.map(probeSummary),
    pathProbes: row.pathProbes.map(probeSummary),
  });
}
function probeSummary(probe) {
  return Object.freeze({
    probeId: probe.probe.probeId,
    value: probe.authoritativeValue,
    units: probe.authoritativeUnits,
    elementId: probe.mapping.elementId,
    elementType: probe.mapping.elementType,
    naturalCoordinates: probe.mapping.naturalCoordinates,
    naturalCoordinateMargin: naturalCoordinateMargin(probe),
    mappingResidual: probe.mapping.mappingResidual,
    evidenceHash: probe.semanticHash,
  });
}
function within(value, limit, label) {
  assert.ok(Number.isFinite(value) && value <= limit, `${label}: ${value} > ${limit}`);
}
function close(actual, expected, relative, label) {
  const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
  assert.ok(Math.abs(actual - expected) <= relative * scale, `${label}: ${actual} != ${expected}`);
}
function read(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}
