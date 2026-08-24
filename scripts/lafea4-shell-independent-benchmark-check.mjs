#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  bendingResultant,
  calculateLocalShell,
  createCanonicalLocalShellModel,
} from '../src/core/local-shell/index.js';
import { baseSource, flatNode } from './lafea.4-fixtures.mjs';
import { runLafeaShellIndependentBenchmarkFreezeCheck } from './lafea-shell-independent-benchmark-freeze-check.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const B4_1_PATH = 'validation/lafea-shell/B4-1-membrane-patch-v1.json';
const B4_2_PATH = 'validation/lafea-shell/B4-2-pure-bending-patch-v1.json';
const B4_3_PATH = 'validation/lafea-shell/B4-3-reference-problem-v1.json';
const FROZEN = 'FROZEN_BEFORE_PRODUCTION_OBSERVATION';
const BLOCKED = 'BLOCKED_SOURCE_REQUIRED';

/**
 * Compare the production CST+DKT kernel against the already-frozen analytical
 * B4-1/B4-2 definitions. This file is intentionally NOT an oracle generator:
 * all target values and tolerances are read from the committed definitions.
 */
export async function runLafea4ShellIndependentBenchmarkCheck(options = {}) {
  const emit = options.emit !== false;
  if (options.freezeAlreadyChecked !== true) {
    await runLafeaShellIndependentBenchmarkFreezeCheck({ emit: false });
  }

  const membrane = await readJson(B4_1_PATH);
  const bending = await readJson(B4_2_PATH);
  const reference = await readJson(B4_3_PATH);
  requireFrozenAnalyticalDefinition(membrane, 'B4-1-MEMBRANE-PATCH-01');
  requireFrozenAnalyticalDefinition(bending, 'B4-2-PURE-BENDING-PATCH-01');
  requireBlockedReference(reference);

  const membraneEvidence = executeMembraneBenchmark(membrane);
  const bendingEvidence = executeBendingBenchmark(bending);

  const receipt = Object.freeze({
    schema: 'lafea4-shell-independent-benchmark-check/v1',
    status: 'PASS',
    oracleClass: 'FROZEN_ANALYTICAL',
    productionRoute: 'createCanonicalLocalShellModel -> calculateLocalShell',
    frozenTargetsModifiedByThisCheck: false,
    benchmarks: [membraneEvidence, bendingEvidence],
    sourceRequiredBenchmark: {
      benchmarkId: reference.benchmarkId,
      status: BLOCKED,
      executionEligible: false,
      expectedValuesInvented: false,
    },
    releaseAuthorityGranted: false,
  });
  if (emit) console.log(JSON.stringify(receipt, null, 2));
  return receipt;
}

function executeMembraneBenchmark(definition) {
  const result = solveFrozenPatch(definition);
  const loadCase = onlyLoadCase(result, definition.benchmarkId);
  const nodalMaximumError = compareNodalKinematics(
    loadCase,
    definition.expected.nodalKinematics,
    definition.acceptance.nodalDisplacementAbsoluteTolerance,
    definition.benchmarkId,
  );

  let maximumStrainError = 0;
  let maximumStressErrorMpa = 0;
  let maximumSpuriousBendingMomentN = 0;
  for (const elementResult of loadCase.elementResults) {
    const meshElement = meshElementFor(result, elementResult.elementId);
    const expectedLocalStrain = rotateEngineeringTensorToLocal([
      definition.expected.membraneStrain.epsilonX,
      definition.expected.membraneStrain.epsilonY,
      definition.expected.membraneStrain.gammaXY,
    ], meshElement.localFrame);
    const expectedLocalStress = rotateStressTensorToLocal([
      definition.expected.membraneStress.sigmaX,
      definition.expected.membraneStress.sigmaY,
      definition.expected.membraneStress.tauXY,
    ], meshElement.localFrame);

    maximumStrainError = Math.max(maximumStrainError, compareVector(
      values(elementResult.membraneStrain, ['epsilonX', 'epsilonY', 'gammaXY']),
      expectedLocalStrain,
      definition.acceptance.membraneStrainAbsoluteTolerance,
      `${definition.benchmarkId}/${elementResult.elementId}/membrane-strain`,
    ));
    maximumStressErrorMpa = Math.max(maximumStressErrorMpa, compareVector(
      values(elementResult.membraneStress, ['sigmaX', 'sigmaY', 'tauXY']),
      expectedLocalStress,
      definition.acceptance.membraneStressAbsoluteToleranceMpa,
      `${definition.benchmarkId}/${elementResult.elementId}/membrane-stress`,
    ));

    elementResult.integrationPoints.forEach((point, pointIndex) => {
      const moment = bendingResultant(meshElement, elementResult, pointIndex);
      maximumSpuriousBendingMomentN = Math.max(maximumSpuriousBendingMomentN, compareVector(
        [moment.Mxx, moment.Myy, moment.Mxy],
        [0, 0, 0],
        definition.acceptance.spuriousBendingMomentAbsoluteToleranceN,
        `${definition.benchmarkId}/${elementResult.elementId}/${point.integrationPointId}/spurious-bending`,
      ));
    });
  }

  const equilibrium = compareFrozenEquilibrium(loadCase, definition);
  return Object.freeze({
    benchmarkId: definition.benchmarkId,
    status: 'PASS',
    nodalMaximumAbsoluteError: nodalMaximumError,
    membraneStrainMaximumAbsoluteError: maximumStrainError,
    membraneStressMaximumAbsoluteErrorMpa: maximumStressErrorMpa,
    spuriousBendingMomentMaximumAbsoluteN: maximumSpuriousBendingMomentN,
    forceEquilibriumActual: equilibrium.forceActual,
    momentEquilibriumActual: equilibrium.momentActual,
    productionResultHash: result.semanticHashes.resultPayloadSemanticHash,
  });
}

function executeBendingBenchmark(definition) {
  const result = solveFrozenPatch(definition);
  const loadCase = onlyLoadCase(result, definition.benchmarkId);
  const nodalMaximumError = compareNodalKinematics(
    loadCase,
    definition.expected.nodalKinematics,
    definition.acceptance.nodalKinematicsAbsoluteTolerance,
    definition.benchmarkId,
  );

  let maximumCurvatureErrorPerMm = 0;
  let maximumBendingMomentErrorN = 0;
  let maximumSurfaceStressErrorMpa = 0;
  let maximumMembraneContamination = 0;
  for (const elementResult of loadCase.elementResults) {
    const meshElement = meshElementFor(result, elementResult.elementId);
    maximumMembraneContamination = Math.max(maximumMembraneContamination, compareVector(
      values(elementResult.membraneStrain, ['epsilonX', 'epsilonY', 'gammaXY']),
      [0, 0, 0],
      definition.acceptance.membraneContaminationStrainAbsoluteTolerance,
      `${definition.benchmarkId}/${elementResult.elementId}/membrane-contamination`,
    ));

    const expectedLocalCurvature = rotateEngineeringTensorToLocal([
      definition.expected.curvature.kappaX,
      definition.expected.curvature.kappaY,
      definition.expected.curvature.kappaXY,
    ], meshElement.localFrame);
    const expectedLocalMoment = rotateStressTensorToLocal([
      definition.expected.bendingMomentResultants.mx,
      definition.expected.bendingMomentResultants.my,
      definition.expected.bendingMomentResultants.mxy,
    ], meshElement.localFrame);
    const expectedTopStress = rotateStressTensorToLocal([
      definition.expected.topSurfaceBendingStress.sigmaX,
      definition.expected.topSurfaceBendingStress.sigmaY,
      definition.expected.topSurfaceBendingStress.tauXY,
    ], meshElement.localFrame);
    const expectedBottomStress = rotateStressTensorToLocal([
      definition.expected.bottomSurfaceBendingStress.sigmaX,
      definition.expected.bottomSurfaceBendingStress.sigmaY,
      definition.expected.bottomSurfaceBendingStress.tauXY,
    ], meshElement.localFrame);

    elementResult.integrationPoints.forEach((point, pointIndex) => {
      maximumCurvatureErrorPerMm = Math.max(maximumCurvatureErrorPerMm, compareVector(
        values(point.curvature, ['kappaX', 'kappaY', 'kappaXY']),
        expectedLocalCurvature,
        definition.acceptance.curvatureAbsoluteTolerancePerMm,
        `${definition.benchmarkId}/${elementResult.elementId}/${point.integrationPointId}/curvature`,
      ));
      const moment = bendingResultant(meshElement, elementResult, pointIndex);
      maximumBendingMomentErrorN = Math.max(maximumBendingMomentErrorN, compareVector(
        [moment.Mxx, moment.Myy, moment.Mxy],
        expectedLocalMoment,
        definition.acceptance.bendingMomentAbsoluteToleranceN,
        `${definition.benchmarkId}/${elementResult.elementId}/${point.integrationPointId}/bending-moment`,
      ));
      const top = point.surfaces.find((row) => row.surface === 'TOP');
      const bottom = point.surfaces.find((row) => row.surface === 'BOTTOM');
      assert.ok(top && bottom, `${definition.benchmarkId} TOP/BOTTOM surface evidence required`);
      maximumSurfaceStressErrorMpa = Math.max(maximumSurfaceStressErrorMpa, compareVector(
        values(top.bendingStress, ['sigmaX', 'sigmaY', 'tauXY']),
        expectedTopStress,
        definition.acceptance.surfaceStressAbsoluteToleranceMpa,
        `${definition.benchmarkId}/${elementResult.elementId}/${point.integrationPointId}/TOP-stress`,
      ));
      maximumSurfaceStressErrorMpa = Math.max(maximumSurfaceStressErrorMpa, compareVector(
        values(bottom.bendingStress, ['sigmaX', 'sigmaY', 'tauXY']),
        expectedBottomStress,
        definition.acceptance.surfaceStressAbsoluteToleranceMpa,
        `${definition.benchmarkId}/${elementResult.elementId}/${point.integrationPointId}/BOTTOM-stress`,
      ));
    });
  }

  const equilibrium = compareFrozenEquilibrium(loadCase, definition);
  return Object.freeze({
    benchmarkId: definition.benchmarkId,
    status: 'PASS',
    nodalMaximumAbsoluteError: nodalMaximumError,
    curvatureMaximumAbsoluteErrorPerMm: maximumCurvatureErrorPerMm,
    bendingMomentMaximumAbsoluteErrorN: maximumBendingMomentErrorN,
    surfaceStressMaximumAbsoluteErrorMpa: maximumSurfaceStressErrorMpa,
    membraneContaminationMaximumAbsoluteStrain: maximumMembraneContamination,
    forceEquilibriumActual: equilibrium.forceActual,
    momentEquilibriumActual: equilibrium.momentActual,
    productionResultHash: result.semanticHashes.resultPayloadSemanticHash,
  });
}

function solveFrozenPatch(definition) {
  const source = sourceFromFrozenDefinition(definition);
  const result = calculateLocalShell(createCanonicalLocalShellModel(source));
  assert.equal(result.qualification.accepted, true, result.qualification.summary);
  assert.equal(result.formulation, 'CST_DKT_TRI3_THIN_SHELL_V1');
  assert.equal(result.meshEvidence.elements.length, definition.geometry.triangles.length);
  return result;
}

function sourceFromFrozenDefinition(definition) {
  const expectedNodes = new Map(
    definition.expected.nodalKinematics.map((row) => [row.nodeId, row]),
  );
  const nodes = definition.geometry.nodes.map((node) => {
    assert.equal(node.z, 0, `${definition.benchmarkId} is a flat patch`);
    return flatNode(node.nodeId, node.x, node.y);
  });
  const constraints = nodes.flatMap((node) => {
    const expected = expectedNodes.get(node.nodeId);
    assert.ok(expected, `${definition.benchmarkId}/${node.nodeId} frozen kinematics`);
    return [
      ['UX', expected.ux],
      ['UY', expected.uy],
      ['UZ', expected.uz],
      ['R1', expected.r1],
      ['R2', expected.r2],
    ].map(([dof, value]) => ({
      constraintId: `${definition.benchmarkId}-${node.nodeId}-${dof}`,
      nodeId: node.nodeId,
      dof,
      value,
      sourceReference: `${definition.benchmarkId}/${node.nodeId}/${dof}`,
    }));
  });

  return baseSource({
    modelIdentity: definition.benchmarkId,
    modelVersion: 'FROZEN-1',
    sourceAncestry: [`validation/lafea-shell/${definition.benchmarkId}`],
    materials: [{
      materialId: 'MAT',
      elasticModulus: definition.material.elasticModulus,
      poissonRatio: definition.material.poissonRatio,
      sourceReference: `${definition.benchmarkId}/MATERIAL`,
    }],
    nodes,
    elements: definition.geometry.triangles.map((row) => ({
      elementId: row.elementId,
      nodeIds: [...row.nodeIds],
      materialId: 'MAT',
      thickness: definition.material.thickness,
      sourceReference: `${definition.benchmarkId}/${row.elementId}`,
    })),
    constraints,
    loadCases: [{
      loadCaseId: 'BENCHMARK',
      nodalLoads: [],
      pressureLoads: [],
      sourceReference: `${definition.benchmarkId}/PRESCRIBED-FIELD`,
    }],
  });
}

function compareNodalKinematics(loadCase, expectedRows, tolerance, label) {
  const actualByNode = new Map(loadCase.nodalDisplacements.map((row) => [row.nodeId, row]));
  let maximum = 0;
  for (const expected of expectedRows) {
    const actual = actualByNode.get(expected.nodeId);
    assert.ok(actual, `${label}/${expected.nodeId} retained nodal displacement`);
    maximum = Math.max(maximum, compareVector(
      values(actual, ['ux', 'uy', 'uz', 'r1', 'r2']),
      values(expected, ['ux', 'uy', 'uz', 'r1', 'r2']),
      tolerance,
      `${label}/${expected.nodeId}/nodal-kinematics`,
    ));
  }
  assert.equal(actualByNode.size, expectedRows.length, `${label} nodal displacement count`);
  return maximum;
}

function compareFrozenEquilibrium(loadCase, definition) {
  assert.equal(loadCase.forceEquilibrium.qualification.accepted, true,
    `${definition.benchmarkId} production force-equilibrium contract`);
  assert.equal(loadCase.momentEquilibrium.qualification.accepted, true,
    `${definition.benchmarkId} production moment-equilibrium contract`);
  const forceTolerance = frozenEquilibriumLimit(
    loadCase.forceEquilibrium.qualification.scale,
    definition.acceptance.forceEquilibrium,
    'absoluteToleranceN',
  );
  const momentTolerance = frozenEquilibriumLimit(
    loadCase.momentEquilibrium.qualification.scale,
    definition.acceptance.momentEquilibrium,
    'absoluteToleranceNmm',
  );
  assert.ok(loadCase.forceEquilibrium.qualification.actual <= forceTolerance,
    `${definition.benchmarkId} force equilibrium ${loadCase.forceEquilibrium.qualification.actual} > ${forceTolerance}`);
  assert.ok(loadCase.momentEquilibrium.qualification.actual <= momentTolerance,
    `${definition.benchmarkId} moment equilibrium ${loadCase.momentEquilibrium.qualification.actual} > ${momentTolerance}`);
  compareVector(
    loadCase.appliedLoadEvidence.appliedForce,
    definition.expected.appliedResultantForce,
    definition.acceptance.forceEquilibrium.absoluteToleranceN,
    `${definition.benchmarkId}/applied-force`,
  );
  compareVector(
    loadCase.appliedLoadEvidence.appliedMomentAboutOrigin,
    definition.expected.appliedResultantMomentAboutOrigin,
    definition.acceptance.momentEquilibrium.absoluteToleranceNmm,
    `${definition.benchmarkId}/applied-moment`,
  );
  return {
    forceActual: loadCase.forceEquilibrium.qualification.actual,
    momentActual: loadCase.momentEquilibrium.qualification.actual,
  };
}

function frozenEquilibriumLimit(scale, acceptance, absoluteKey) {
  assert.ok(Number.isFinite(scale));
  assert.ok(Number.isFinite(acceptance[absoluteKey]));
  assert.ok(Number.isFinite(acceptance.relativeTolerance));
  return Math.max(acceptance[absoluteKey], acceptance.relativeTolerance * scale);
}

function meshElementFor(result, elementId) {
  const row = result.meshEvidence.elements.find((item) => item.elementId === elementId);
  assert.ok(row, `retained mesh element ${elementId}`);
  requireFlatRightHandedFrame(row.localFrame, elementId);
  return row;
}

function requireFlatRightHandedFrame(frame, label) {
  const [c, s, z] = frame.ex;
  assert.ok(Math.abs(z) <= 1e-12, `${label} local ex must remain in patch plane`);
  assert.ok(Math.abs(frame.ey[2]) <= 1e-12, `${label} local ey must remain in patch plane`);
  assert.ok(Math.abs(frame.ez[0]) <= 1e-12 && Math.abs(frame.ez[1]) <= 1e-12,
    `${label} local normal must remain perpendicular to patch plane`);
  assert.ok(frame.ez[2] > 0, `${label} canonical normal must retain +Z patch orientation`);
  assert.ok(Math.abs(c * c + s * s - 1) <= 1e-12, `${label} local ex must be unit length`);
  assert.ok(Math.abs(frame.ey[0] + s) <= 1e-12 && Math.abs(frame.ey[1] - c) <= 1e-12,
    `${label} local ey must be the right-handed in-plane companion`);
}

// Engineering shear/twist components transform with the factor-of-two form.
function rotateEngineeringTensorToLocal([xx, yy, xy], frame) {
  const c = frame.ex[0];
  const s = frame.ex[1];
  return [
    c ** 2 * xx + s ** 2 * yy + c * s * xy,
    s ** 2 * xx + c ** 2 * yy - c * s * xy,
    2 * c * s * (yy - xx) + (c ** 2 - s ** 2) * xy,
  ];
}

// Stress and bending-resultant shear components transform as tensor shear.
function rotateStressTensorToLocal([xx, yy, xy], frame) {
  const c = frame.ex[0];
  const s = frame.ex[1];
  return [
    c ** 2 * xx + s ** 2 * yy + 2 * c * s * xy,
    s ** 2 * xx + c ** 2 * yy - 2 * c * s * xy,
    c * s * (yy - xx) + (c ** 2 - s ** 2) * xy,
  ];
}

function compareVector(actual, expected, absoluteTolerance, label) {
  assert.equal(actual.length, expected.length, `${label} vector dimension`);
  let maximum = 0;
  for (let index = 0; index < expected.length; index += 1) {
    assert.ok(Number.isFinite(actual[index]), `${label}[${index}] actual finite`);
    assert.ok(Number.isFinite(expected[index]), `${label}[${index}] expected finite`);
    const error = Math.abs(actual[index] - expected[index]);
    maximum = Math.max(maximum, error);
    assert.ok(error <= absoluteTolerance,
      `${label}[${index}] ${actual[index]} != ${expected[index]} within frozen ${absoluteTolerance}`);
  }
  return maximum;
}

function values(record, keys) {
  return keys.map((key) => record[key]);
}

function onlyLoadCase(result, benchmarkId) {
  assert.equal(result.loadCaseResults.length, 1, `${benchmarkId} production load-case count`);
  const loadCase = result.loadCaseResults[0];
  assert.equal(loadCase.loadCaseId, 'BENCHMARK', `${benchmarkId} production load-case identity`);
  assert.equal(loadCase.qualification.accepted, true, `${benchmarkId} production load-case qualification`);
  return loadCase;
}

function requireFrozenAnalyticalDefinition(definition, benchmarkId) {
  assert.equal(definition.benchmarkId, benchmarkId);
  assert.equal(definition.stageId, 'LAFEA.4');
  assert.equal(definition.definitionState, FROZEN);
  assert.equal(definition.oracleAuthority?.sourceClass, 'ANALYTICAL');
  assert.equal(definition.oracleAuthority?.productionOutputUsedToChooseDefinition, false);
  assert.equal(definition.oracleAuthority?.productionOutputUsedToChooseExpectedValues, false);
  assert.equal(definition.oracleAuthority?.importsProductionFem, false);
}

function requireBlockedReference(definition) {
  assert.equal(definition.benchmarkId, 'B4-3-REFERENCE-PROBLEM-01');
  assert.equal(definition.definitionState, BLOCKED);
  assert.equal(definition.executionEligible, false);
  assert.equal(definition.expected, null);
  assert.equal(definition.acceptance, null);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(REPO_ROOT, relativePath), 'utf8'));
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) await runLafea4ShellIndependentBenchmarkCheck();
