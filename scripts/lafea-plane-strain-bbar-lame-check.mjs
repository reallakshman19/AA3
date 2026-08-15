#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LAFEA3_QUALIFIED_MESH_QUALITY_POLICY,
  PROFILE_KINDS,
  canonicalProfile,
  defaultProfileFields,
} from '../src/core/lafea-profile-contract/index.js';
import {
  qualifyLafeaAnalysisMesh,
  requireLafeaAnalysisMeshQualifiedQualityPolicy,
} from '../src/workspace/lafea-analysis-mesh-contract.js';
import {
  LAFEA_CONTINUUM_PROBE_CONVERGENCE_DEFINITION_SCHEMA,
  LAFEA_CONTINUUM_PROBE_CONVERGENCE_OBSERVATIONS_SCHEMA,
  createLafeaContinuumProbeConvergenceDefinition,
  createLafeaContinuumProbeConvergenceObservations,
  evaluateLafeaContinuumProbeConvergence,
} from '../src/workspace/lafea-continuum-probe-convergence.js';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import {
  executeLameBbarQualificationCase,
  lameOracle,
} from './lib/lafea-plane-strain-bbar-lame-fixture.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const definition = readJson('validation/lafea-incompressible/plane-strain-bbar-v1.json');
const convergencePolicy = readJson(
  'validation/lafea-incompressible/plane-strain-bbar-convergence-v1.json',
);
const probeMeshPolicy = readJson(
  'validation/lafea-incompressible/plane-strain-bbar-probe-mesh-policy-v1.json',
);
const benchmark = definition.benchmarks.THICK_CYLINDER;
const A = benchmark.acceptance;
const methods = ['T6', 'Q8'];
const matrix = [];

assert.equal(definition.definitionState, 'FROZEN_BEFORE_PRODUCTION_OBSERVATION');
assert.equal(definition.productionOutputUsedToChooseDefinition, false);
assert.equal(convergencePolicy.definitionState, 'FROZEN_BEFORE_PRODUCTION_OBSERVATION');
assert.equal(convergencePolicy.productionOutputUsedToChooseDefinition, false);
assert.equal(probeMeshPolicy.definitionState, 'FROZEN_BEFORE_PRODUCTION_OBSERVATION');
assert.equal(probeMeshPolicy.productionOutputUsedToChooseDefinition, false);
assert.equal(probeMeshPolicy.programmeId, definition.programmeId);
assert.equal(convergencePolicy.refinementRatio, benchmark.meshLadder.refinementRatio);
assert.equal(probeMeshPolicy.refinement.ratio, benchmark.meshLadder.refinementRatio);
assert.ok(
  Math.abs(probeMeshPolicy.radialAxis.targetPhase - probeMeshPolicy.angularAxis.targetPhase)
    >= probeMeshPolicy.t6DiagonalAvoidance.minimumPhaseSeparation,
);

for (const method of methods) {
  assert.equal(benchmark.meshLadder.families[method], 'REQUIRED');
  for (const distortion of definition.distortionMatrix) {
    for (const poissonRatio of definition.poissonRatioLadder) {
      matrix.push(runSeries(method, distortion, poissonRatio));
    }
  }
}

const errorGrowth = [];
for (const method of methods) {
  for (const distortion of definition.distortionMatrix) {
    const reference = findSeries(method, distortion.distortionId, 0.30);
    const limiting = findSeries(method, distortion.distortionId, 0.4999);
    for (const probe of benchmark.fixedPhysicalProbes.filter(
      (row) => row.quantityId.startsWith('DISPLACEMENT_'),
    )) {
      const referenceError = metricForProbe(reference, probe.probeId).finestRelativeError;
      const limitingError = metricForProbe(limiting, probe.probeId).finestRelativeError;
      const growth = Math.max(0, limitingError - referenceError);
      within(
        growth,
        A.maximumDisplacementErrorGrowthFromNu030ToNu04999,
        `${method}/${distortion.distortionId}/${probe.probeId} near-incompressible error growth`,
      );
      errorGrowth.push(Object.freeze({
        method,
        distortionId: distortion.distortionId,
        probeId: probe.probeId,
        referenceNu: 0.30,
        limitingNu: 0.4999,
        referenceRelativeError: referenceError,
        limitingRelativeError: limitingError,
        positiveErrorGrowth: growth,
        limit: A.maximumDisplacementErrorGrowthFromNu030ToNu04999,
      }));
    }
  }
}

const body = {
  schema: 'lafea-plane-strain-bbar-lame-qualification-receipt/v1',
  programmeId: definition.programmeId,
  benchmarkId: benchmark.benchmarkId,
  status: 'PASS',
  definitionHash: canonicalLafeaSha256(definition),
  convergencePolicyHash: canonicalLafeaSha256(convergencePolicy),
  probeMeshPolicyHash: canonicalLafeaSha256(probeMeshPolicy),
  definitionFrozenBeforeProductionObservation: true,
  productionOutputUsedToChooseDefinition: false,
  formulation: definition.formulations.candidate.identity,
  methods,
  poissonRatioLadder: definition.poissonRatioLadder,
  distortionIds: definition.distortionMatrix.map((row) => row.distortionId),
  protectedProbePhases: {
    radial: probeMeshPolicy.radialAxis.targetPhase,
    angular: probeMeshPolicy.angularAxis.targetPhase,
    t6MinimumDiagonalPhaseSeparation:
      probeMeshPolicy.t6DiagonalAvoidance.minimumPhaseSeparation,
  },
  seriesCount: matrix.length,
  solveCount: matrix.reduce((sum, row) => sum + row.levels.length, 0),
  matrix: matrix.map(seriesSummary),
  errorGrowth,
  legacyPlaneStrainGuardRelaxed: false,
  movingMaximumUsed: false,
  nodalOrSmoothedStressUsedAsAcceptanceAuthority: false,
  temperatureAuthorityGranted: false,
  releaseAuthorityGranted: false,
};

console.log(JSON.stringify({
  ...body,
  semanticHash: canonicalLafeaSha256({
    schema: 'lafea-plane-strain-bbar-lame-qualification-receipt-hash-input/v1',
    receipt: body,
  }),
}, null, 2));

function runSeries(method, distortion, poissonRatio) {
  const levels = benchmark.meshLadder.levels.map((level) => {
    const run = executeLameBbarQualificationCase(definition, probeMeshPolicy, {
      elementType: method,
      poissonRatio,
      level,
      distortion,
    });
    const profile = meshProfile(method, level.targetElementLength, level.levelId, distortion.distortionId);
    requireLafeaAnalysisMeshQualifiedQualityPolicy('LAFEA.3', profile);
    const quality = qualifyLafeaAnalysisMesh('LAFEA.3', run.mesh, profile);
    assert.notEqual(
      quality.worstStatus,
      'BLOCK',
      `${method}/${poissonRatio}/${level.levelId}/${distortion.distortionId} mesh quality blocked`,
    );
    const equilibrium = equilibriumEvidence(run);
    within(
      equilibrium.totalForceRelativeResidual,
      A.forceEquilibriumRelativeMaximum,
      `${method}/${poissonRatio}/${level.levelId}/${distortion.distortionId} force equilibrium`,
    );
    within(
      equilibrium.totalMomentRelativeResidual,
      A.momentEquilibriumRelativeMaximum,
      `${method}/${poissonRatio}/${level.levelId}/${distortion.distortionId} moment equilibrium`,
    );
    for (const probe of run.probes) {
      within(
        probe.mapping.mappingResidual,
        A.fixedProbeMappingResidualMaximum,
        `${method}/${poissonRatio}/${level.levelId}/${distortion.distortionId}/${probe.probe.probeId} mapping`,
      );
      assert.equal(probe.movingMaximumUsed, false);
      assert.equal(probe.nodalStressProjectionUsed, false);
      assert.equal(probe.crossElementAveragingUsed, false);
      assert.equal(probe.displayInterpolationUsed, false);
      assert.equal(probe.pointwiseAcceptanceEligible, true);
      assert.ok(Number.isFinite(probe.meanDilatation));
    }
    for (const placement of run.probeCellEvidence) {
      assert.equal(placement.elementBoundaryPlacement, false);
      assert.equal(placement.t6DiagonalPlacement, false);
      assert.ok(
        placement.diagonalPhaseSeparation
          >= probeMeshPolicy.t6DiagonalAvoidance.minimumPhaseSeparation - 1e-12,
      );
    }
    return Object.freeze({
      levelId: level.levelId,
      h: level.targetElementLength,
      meshHash: run.stage.execution.meshHash,
      executionHash: run.stage.execution.compiledExecutionHash,
      recoveryHash: run.stage.lifecycle.artifacts.RECOVERY.artifactHash,
      nodeCount: run.mesh.nodes.length,
      elementCount: run.mesh.elements.length,
      quality: Object.freeze({
        worstStatus: quality.worstStatus,
        aspectRatio: quality.gateResults.find((row) => row.metric === 'ASPECT_RATIO')?.value ?? null,
        scaledJacobian: quality.gateResults.find((row) => row.metric === 'SCALED_JACOBIAN')?.value ?? null,
        blockingElementIds: quality.blockingElementIds,
        warningElementIds: quality.warningElementIds,
      }),
      topologyQualificationHash: run.topology.qualificationHash,
      highOrderJacobianQualificationHash: run.jacobian.qualificationHash,
      minimumCertifiedJacobianLowerBound: Math.min(
        ...run.jacobian.elementResults.map((row) => row.minimumCertifiedLowerBound),
      ),
      equilibrium,
      strainEnergy: run.loadCase.totalStrainEnergy,
      probeCellEvidence: run.probeCellEvidence,
      probes: run.probes,
    });
  });

  const probeMetrics = benchmark.fixedPhysicalProbes.map((frozenProbe) =>
    qualifyProbeSeries(method, distortion, poissonRatio, frozenProbe, levels));
  const stiffnessInflation = probeMetrics.filter((row) => row.quantityId.startsWith('DISPLACEMENT_'))
    .map((row) => ({
      probeId: row.probeId,
      stiffnessInflation: row.stiffnessInflation,
    }));
  const maximumStiffnessInflation = Math.max(0, ...stiffnessInflation.map((row) => row.stiffnessInflation));
  within(
    maximumStiffnessInflation,
    A.maximumStiffnessInflationRelativeToAnalyticalCompliance,
    `${method}/${poissonRatio}/${distortion.distortionId} stiffness inflation`,
  );

  return Object.freeze({
    method,
    distortionId: distortion.distortionId,
    poissonRatio,
    status: 'PASS',
    levels,
    probeMetrics,
    maximumStiffnessInflation,
  });
}

function qualifyProbeSeries(method, distortion, poissonRatio, frozenProbe, levels) {
  const evidenceByLevel = levels.map((level) => level.probes.find(
    (probe) => probe.probe.probeId === frozenProbe.probeId,
  ));
  assert.equal(evidenceByLevel.every(Boolean), true);
  const oracle = lameOracle(definition, poissonRatio, frozenProbe);
  const finest = evidenceByLevel.at(-1);
  const finestRelativeError = relativeError(finest.authoritativeValue, oracle.expectedValue);
  const displacement = frozenProbe.quantityId.startsWith('DISPLACEMENT_');
  const finestLimit = finestErrorLimit(distortion.distortionId, displacement);
  within(
    finestRelativeError,
    finestLimit,
    `${method}/${poissonRatio}/${distortion.distortionId}/${frozenProbe.probeId} finest analytical error`,
  );

  const quantityClass = displacement ? 'DISPLACEMENT_MM' : 'STRESS_MPA';
  const convergenceDefinition = createLafeaContinuumProbeConvergenceDefinition({
    schema: LAFEA_CONTINUUM_PROBE_CONVERGENCE_DEFINITION_SCHEMA,
    studyId: `${definition.programmeId}/${method}/${distortion.distortionId}/NU-${poissonRatio}/${frozenProbe.probeId}`,
    quantityIdentityHash: evidenceByLevel[0].quantityIdentityHash,
    refinementRatio: convergencePolicy.refinementRatio,
    gciSafetyFactor: convergencePolicy.gciSafetyFactor,
    nearZeroAbsolute: convergencePolicy.nearZeroAbsoluteByQuantityClass[quantityClass],
    orderStabilityRelativeTolerance: convergencePolicy.orderStabilityRelativeTolerance,
    levels: benchmark.meshLadder.levels.map((level) => ({
      levelId: level.levelId,
      h: level.targetElementLength,
    })),
  });
  const observations = createLafeaContinuumProbeConvergenceObservations({
    schema: LAFEA_CONTINUUM_PROBE_CONVERGENCE_OBSERVATIONS_SCHEMA,
    studyId: convergenceDefinition.studyId,
    definitionHash: convergenceDefinition.semanticHash,
    levels: benchmark.meshLadder.levels.map((level, index) => ({
      levelId: level.levelId,
      evidence: evidenceByLevel[index],
    })),
  });
  const convergence = evaluateLafeaContinuumProbeConvergence(
    convergenceDefinition,
    observations,
  );
  assert.ok(
    convergencePolicy.acceptedForGciQualification.includes(convergence.classification),
    `${convergenceDefinition.studyId} convergence is ${convergence.classification}`,
  );
  const fineGciRelative = convergence.gciFineAbsolute === null
    ? convergence.classification === 'NEAR_ZERO_FINE_DIFFERENCE' ? 0 : null
    : convergence.gciFineAbsolute / Math.max(Math.abs(finest.authoritativeValue), 1e-30);
  assert.ok(Number.isFinite(fineGciRelative), `${convergenceDefinition.studyId} GCI unavailable`);
  within(
    fineGciRelative,
    gciLimit(distortion.distortionId),
    `${convergenceDefinition.studyId} fine GCI`,
  );
  const stiffnessInflation = displacement
    ? Math.max(0,
      Math.abs(oracle.expectedValue) / Math.max(Math.abs(finest.authoritativeValue), 1e-30) - 1)
    : 0;
  return Object.freeze({
    probeId: frozenProbe.probeId,
    quantityId: frozenProbe.quantityId,
    expectedValue: oracle.expectedValue,
    observedFinestValue: finest.authoritativeValue,
    finestRelativeError,
    finestRelativeErrorLimit: finestLimit,
    convergenceClassification: convergence.classification,
    observedOrder: convergence.observedOrder,
    gciFineAbsolute: convergence.gciFineAbsolute,
    gciFineRelative: fineGciRelative,
    gciFineRelativeLimit: gciLimit(distortion.distortionId),
    stiffnessInflation,
    finestEvidenceHash: finest.semanticHash,
    convergenceEvidenceHash: convergence.semanticHash,
  });
}

function meshProfile(method, h, levelId, distortionId) {
  const defaults = defaultProfileFields(PROFILE_KINDS.MESH);
  const policy = LAFEA3_QUALIFIED_MESH_QUALITY_POLICY.fields;
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `PS-BBAR-LAME/${method}/${levelId}/${distortionId}`,
    sourceRevision: 'PS-BBAR-FROZEN-V1',
    semanticHash: undefined,
    fields: {
      ...defaults,
      continuumElement: method,
      globalTargetSize: h,
      adjacentSizeRatioMax: policy.adjacentSizeRatioMax,
      aspectRatioWarn: policy.aspectRatioWarn,
      aspectRatioBlock: policy.aspectRatioBlock,
      scaledJacobianWarn: policy.scaledJacobianWarn,
      scaledJacobianBlock: policy.scaledJacobianBlock,
      adaptiveLevels: Math.max(defaults.adaptiveLevels, policy.adaptiveLevelsMinimum),
    },
  });
}

function equilibriumEvidence(run) {
  const model = run.canonicalInput;
  const nodeById = new Map(model.nodes.map((node) => [node.nodeId, node]));
  const applied = resultant(
    vectorFromForce(run.result, run.loadCase.forceEvidence.forceVector, nodeById),
    nodeById,
  );
  const reaction = resultant(vectorFromReactions(run.loadCase.supportReactions, nodeById), nodeById);
  const total = {
    forceX: applied.forceX + reaction.forceX,
    forceY: applied.forceY + reaction.forceY,
    momentZ: applied.momentZ + reaction.momentZ,
  };
  const forceScale = Math.max(1, Math.hypot(applied.forceX, applied.forceY));
  const momentScale = Math.max(
    1,
    Math.abs(applied.momentZ),
    forceScale * benchmark.geometry.outerRadius,
  );
  return Object.freeze({
    applied,
    reaction,
    total,
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
    forceX += force.fx;
    forceY += force.fy;
    momentZ += node.x * force.fy - node.y * force.fx;
  }
  return Object.freeze({ forceX, forceY, momentZ });
}

function finestErrorLimit(distortionId, displacement) {
  if (distortionId === 'REGULAR') {
    return displacement
      ? A.regularMeshFinestDisplacementRelativeErrorMaximum
      : A.regularMeshFinestStressRelativeErrorMaximum;
  }
  if (distortionId === 'MODERATE') {
    return displacement
      ? A.moderateDistortionFinestDisplacementRelativeErrorMaximum
      : A.moderateDistortionFinestStressRelativeErrorMaximum;
  }
  if (distortionId === 'STRONG_QUALIFIED') {
    return displacement
      ? A.strongDistortionFinestDisplacementRelativeErrorMaximum
      : A.strongDistortionFinestStressRelativeErrorMaximum;
  }
  throw new TypeError(`Unknown distortion ${distortionId}`);
}
function gciLimit(distortionId) {
  if (distortionId === 'REGULAR') return A.regularMeshFineGciRelativeMaximum;
  if (distortionId === 'MODERATE') return A.moderateDistortionFineGciRelativeMaximum;
  if (distortionId === 'STRONG_QUALIFIED') return A.strongDistortionFineGciRelativeMaximum;
  throw new TypeError(`Unknown distortion ${distortionId}`);
}
function seriesSummary(row) {
  return Object.freeze({
    method: row.method,
    distortionId: row.distortionId,
    poissonRatio: row.poissonRatio,
    status: row.status,
    maximumStiffnessInflation: row.maximumStiffnessInflation,
    levels: row.levels.map((level) => ({
      levelId: level.levelId,
      h: level.h,
      meshHash: level.meshHash,
      executionHash: level.executionHash,
      recoveryHash: level.recoveryHash,
      nodeCount: level.nodeCount,
      elementCount: level.elementCount,
      meshQualityWorstStatus: level.quality.worstStatus,
      aspectRatio: level.quality.aspectRatio,
      scaledJacobian: level.quality.scaledJacobian,
      minimumCertifiedJacobianLowerBound: level.minimumCertifiedJacobianLowerBound,
      probeCellEvidence: level.probeCellEvidence,
      equilibrium: level.equilibrium,
    })),
    probeMetrics: row.probeMetrics,
  });
}
function findSeries(method, distortionId, poissonRatio) {
  const row = matrix.find((candidate) => candidate.method === method
    && candidate.distortionId === distortionId
    && candidate.poissonRatio === poissonRatio);
  assert.ok(row);
  return row;
}
function metricForProbe(series, probeId) {
  const metric = series.probeMetrics.find((row) => row.probeId === probeId);
  assert.ok(metric);
  return metric;
}
function relativeError(actual, expected) {
  return Math.abs(actual - expected) / Math.max(Math.abs(expected), 1e-30);
}
function within(value, limit, label) {
  assert.ok(Number.isFinite(value) && value <= limit, `${label}: ${value} > ${limit}`);
}
function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}
