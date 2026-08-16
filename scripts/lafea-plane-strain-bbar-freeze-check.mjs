#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const definition = readJson('validation/lafea-incompressible/plane-strain-bbar-v1.json');
const convergence = readJson(
  'validation/lafea-incompressible/plane-strain-bbar-convergence-v1.json',
);
const probeMeshPolicy = readJson(
  'validation/lafea-incompressible/plane-strain-bbar-probe-mesh-policy-v1.json',
);

assert.equal(definition.schema, 'lafea-plane-strain-bbar-qualification-definition/v1');
assert.equal(definition.programmeId, 'LAFEA3-PS-BBAR-001');
assert.equal(definition.stageId, 'LAFEA.3');
assert.equal(definition.definitionState, 'FROZEN_BEFORE_PRODUCTION_OBSERVATION');
assert.equal(definition.productionOutputUsedToChooseDefinition, false);
assert.equal(definition.baselineMainSha, '543cd27c5d498390bacf4a3584ca70e30ee18641');

assert.equal(convergence.schema, 'lafea-plane-strain-bbar-convergence-policy/v1');
assert.equal(convergence.programmeId, definition.programmeId);
assert.equal(convergence.definitionState, 'FROZEN_BEFORE_PRODUCTION_OBSERVATION');
assert.equal(convergence.productionOutputUsedToChooseDefinition, false);
assert.equal(convergence.minimumUsefulLevels, 3);
assert.equal(convergence.availableLevels, 4);
assert.equal(convergence.refinementRatio, 2);
assert.equal(convergence.gciSafetyFactor, 1.25);
assert.equal(convergence.orderStabilityRelativeTolerance, 0.2);
assert.deepEqual(convergence.acceptedForGciQualification, [
  'ASYMPTOTIC', 'MONOTONIC_CONVERGING', 'NEAR_ZERO_FINE_DIFFERENCE',
]);
assert.equal(convergence.fixedPhysicalQuantityIdentityRequired, true);
assert.equal(convergence.sameProbeIdentityHashRequiredAcrossLevels, true);
assert.equal(convergence.sameQuantityIdentityHashRequiredAcrossLevels, true);
assert.equal(convergence.sameUnitsRequiredAcrossLevels, true);
assert.equal(convergence.movingMaximumForbidden, true);
assert.equal(convergence.displayInterpolationForbiddenAsAcceptanceAuthority, true);
assert.equal(convergence.nodalAveragingForbiddenAsAcceptanceAuthority, true);
assert.equal(convergence.releaseAuthorityGranted, false);

assert.equal(probeMeshPolicy.schema, 'lafea-plane-strain-bbar-probe-mesh-policy/v1');
assert.equal(probeMeshPolicy.programmeId, definition.programmeId);
assert.equal(probeMeshPolicy.definitionState, 'FROZEN_BEFORE_PRODUCTION_OBSERVATION');
assert.equal(probeMeshPolicy.productionOutputUsedToChooseDefinition, false);
assert.equal(probeMeshPolicy.radialAxis.targetPhase, 0.5);
assert.equal(probeMeshPolicy.angularAxis.targetPhase, 0.35);
assert.deepEqual(probeMeshPolicy.radialAxis.protectedProbeRadii, [30, 60, 90]);
assert.deepEqual(probeMeshPolicy.angularAxis.protectedProbeAnglesDegrees, [30]);
assert.equal(probeMeshPolicy.t6DiagonalAvoidance.minimumPhaseSeparation, 0.15);
assert.ok(
  Math.abs(probeMeshPolicy.radialAxis.targetPhase - probeMeshPolicy.angularAxis.targetPhase)
    >= probeMeshPolicy.t6DiagonalAvoidance.minimumPhaseSeparation,
);
assert.equal(probeMeshPolicy.t6DiagonalAvoidance.mappingAmbiguityAllowed, false);
assert.equal(probeMeshPolicy.boundaryPolicy.probeMustNotLieOnElementBoundary, true);
assert.equal(probeMeshPolicy.refinement.ratio, convergence.refinementRatio);
assert.equal(probeMeshPolicy.authority.releaseAuthorityGranted, false);

assert.equal(definition.formulations.legacyControl.identity, 'PLANE_STRAIN');
assert.equal(definition.formulations.legacyControl.poissonWarning, 0.40);
assert.equal(definition.formulations.legacyControl.poissonHardBlock, 0.45);
assert.equal(definition.formulations.legacyControl.guardMustRemainUnchanged, true);
assert.equal(definition.formulations.candidate.identity, 'PLANE_STRAIN_BBAR');
assert.deepEqual(definition.formulations.candidate.supportedFamilies, ['T6', 'Q8']);
assert.equal(
  definition.formulations.candidate.t3Disposition,
  'CONTROL_ONLY_NO_LOCKING_RESISTANT_AUTHORITY',
);
assert.equal(
  definition.formulations.candidate.temperatureDisposition,
  'BLOCKED_UNTIL_SEPARATELY_QUALIFIED',
);

assert.deepEqual(definition.poissonRatioLadder, [0.30, 0.45, 0.49, 0.499, 0.4999]);
assert.equal(definition.elementFamilies.T3, 'CONTROL');
assert.equal(definition.elementFamilies.T6, 'REQUIRED');
assert.equal(definition.elementFamilies.Q8, 'REQUIRED');

const cylinder = definition.benchmarks.THICK_CYLINDER;
assert.equal(cylinder.oracle.authority, 'CLASSICAL_LAME_THICK_CYLINDER_PLANE_STRAIN_CLOSED_FORM');
assert.equal(cylinder.oracle.productionOutputUsed, false);
assert.equal(cylinder.meshLadder.refinementRatio, convergence.refinementRatio);
assert.equal(cylinder.meshLadder.levels.length, convergence.availableLevels);
assert.deepEqual(
  cylinder.meshLadder.levels.map((row) => row.targetElementLength),
  [20, 10, 5, 2.5],
);
assert.equal(cylinder.meshLadder.exactCircularBoundaryRequired, true);
assert.equal(cylinder.meshLadder.existingMeshQualityPolicyMustPass, true);
assert.equal(cylinder.meshLadder.fullParentJacobianQualificationMustPass, true);
assert.equal(cylinder.acceptance.movingMaximumAllowed, false);
assert.equal(cylinder.acceptance.nodalOrSmoothedStressAllowedAsAcceptanceAuthority, false);
assert.deepEqual(
  [...new Set(cylinder.fixedPhysicalProbes.map((row) => row.r))].sort((a, b) => a - b),
  probeMeshPolicy.radialAxis.protectedProbeRadii,
);
assert.deepEqual(
  [...new Set(cylinder.fixedPhysicalProbes.map((row) => row.thetaDegrees))].sort((a, b) => a - b),
  probeMeshPolicy.angularAxis.protectedProbeAnglesDegrees,
);

assert.deepEqual(
  definition.distortionMatrix.map((row) => row.distortionId),
  ['REGULAR', 'MODERATE', 'STRONG_QUALIFIED'],
);
assert.deepEqual(
  definition.distortionMatrix.map((row) => [
    row.radialAmplitudeTimesH,
    row.angularAmplitudeTimesHOverR,
  ]),
  [[0, 0], [0.15, 0.10], [0.30, 0.20]],
);

const oracleEvidence = definition.poissonRatioLadder.map((nu) => {
  const material = { elasticModulus: definition.material.elasticModulus, poissonRatio: nu };
  return Object.freeze({
    poissonRatio: nu,
    boundary: verifyLameBoundary(cylinder, material),
    probes: cylinder.fixedPhysicalProbes.map((probe) =>
      Object.freeze({ probeId: probe.probeId, ...evaluateProbe(cylinder, material, probe) })),
  });
});

for (const row of oracleEvidence) {
  close(row.boundary.innerSigmaR, -cylinder.load.internalPressure, 1e-12, 'inner sigma_r');
  close(row.boundary.outerSigmaR, -cylinder.load.externalPressure, 1e-12, 'outer sigma_r');
  assert.ok(row.probes.every((probe) => Number.isFinite(probe.expectedValue)));
}

// The analytical solution must remain finite through the frozen near-incompressible ladder.
const nearIncompressible = oracleEvidence.at(-1);
assert.ok(nearIncompressible.probes.every((probe) => Number.isFinite(probe.expectedValue)));
const reference = oracleEvidence[0].probes.find((row) => row.probeId === 'LAME-R60-T30-UX');
const limiting = nearIncompressible.probes.find((row) => row.probeId === 'LAME-R60-T30-UX');
assert.ok(reference && limiting);
assert.ok(Math.abs(limiting.expectedValue) > 0);

assert.equal(definition.qualificationAuthority.benchmarkQualified, false);
assert.equal(definition.qualificationAuthority.releaseAuthorityGranted, false);
assert.equal(definition.qualificationAuthority.temperatureAuthorityGranted, false);
assert.equal(definition.qualificationAuthority.nonlinearAuthorityGranted, false);
assert.equal(definition.qualificationAuthority.contactAuthorityGranted, false);

console.log(JSON.stringify({
  schema: 'lafea-plane-strain-bbar-freeze-check/v1',
  status: 'PASS',
  programmeId: definition.programmeId,
  definitionFrozenBeforeProductionObservation: true,
  productionOutputUsedToChooseDefinition: false,
  legacyPlaneStrainGuard: {
    warning: definition.formulations.legacyControl.poissonWarning,
    block: definition.formulations.legacyControl.poissonHardBlock,
    mustRemainUnchanged: true,
  },
  candidateFormulation: definition.formulations.candidate.identity,
  supportedFamilies: definition.formulations.candidate.supportedFamilies,
  poissonRatioLadder: definition.poissonRatioLadder,
  convergencePolicy: {
    minimumUsefulLevels: convergence.minimumUsefulLevels,
    refinementRatio: convergence.refinementRatio,
    gciSafetyFactor: convergence.gciSafetyFactor,
    orderStabilityRelativeTolerance: convergence.orderStabilityRelativeTolerance,
    acceptedClassifications: convergence.acceptedForGciQualification,
  },
  probeMeshPolicy: {
    radialPhase: probeMeshPolicy.radialAxis.targetPhase,
    angularPhase: probeMeshPolicy.angularAxis.targetPhase,
    minimumT6DiagonalPhaseSeparation:
      probeMeshPolicy.t6DiagonalAvoidance.minimumPhaseSeparation,
    exactFactorTwoLocalContraction:
      probeMeshPolicy.refinement.localProbeCellWidthContraction,
  },
  oracle: {
    authority: cylinder.oracle.authority,
    analyticalCases: oracleEvidence,
  },
  releaseAuthorityGranted: false,
  temperatureAuthorityGranted: false,
}, null, 2));

function verifyLameBoundary(benchmark, material) {
  const a = benchmark.geometry.innerRadius;
  const b = benchmark.geometry.outerRadius;
  const pi = benchmark.load.internalPressure;
  const po = benchmark.load.externalPressure;
  const constants = lameConstants(a, b, pi, po);
  return {
    innerSigmaR: sigmaR(constants, a),
    outerSigmaR: sigmaR(constants, b),
    innerSigmaTheta: sigmaTheta(constants, a),
    outerSigmaTheta: sigmaTheta(constants, b),
    innerDisplacement: radialDisplacement(constants, material, a),
    outerDisplacement: radialDisplacement(constants, material, b),
  };
}

function evaluateProbe(benchmark, material, probe) {
  const a = benchmark.geometry.innerRadius;
  const b = benchmark.geometry.outerRadius;
  const pi = benchmark.load.internalPressure;
  const po = benchmark.load.externalPressure;
  const constants = lameConstants(a, b, pi, po);
  const theta = probe.thetaDegrees * Math.PI / 180;
  const r = probe.r;
  const sr = sigmaR(constants, r);
  const st = sigmaTheta(constants, r);
  const sz = 2 * material.poissonRatio * constants.A;
  const ur = radialDisplacement(constants, material, r);
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const values = {
    DISPLACEMENT_X: ur * c,
    DISPLACEMENT_Y: ur * s,
    STRESS_SIGMA_X: sr * c * c + st * s * s,
    STRESS_SIGMA_Y: sr * s * s + st * c * c,
    STRESS_TAU_XY: (sr - st) * s * c,
    STRESS_SIGMA_Z: sz,
  };
  assert.ok(Object.hasOwn(values, probe.quantityId), `Unsupported frozen probe ${probe.quantityId}`);
  return {
    physicalCoordinate: { x: r * c, y: r * s },
    expectedValue: values[probe.quantityId],
    units: probe.units,
  };
}

function lameConstants(a, b, pi, po) {
  assert.ok(a > 0 && b > a);
  const denominator = b * b - a * a;
  return {
    A: (pi * a * a - po * b * b) / denominator,
    B: (a * a * b * b * (pi - po)) / denominator,
  };
}
function sigmaR(constants, r) { return constants.A - constants.B / (r * r); }
function sigmaTheta(constants, r) { return constants.A + constants.B / (r * r); }
function radialDisplacement(constants, material, r) {
  const { elasticModulus: E, poissonRatio: nu } = material;
  return ((1 + nu) / E) * ((1 - 2 * nu) * constants.A * r + constants.B / r);
}
function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}
function close(actual, expected, relative, label) {
  const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
  assert.ok(Math.abs(actual - expected) <= relative * scale, `${label}: ${actual} != ${expected}`);
}
