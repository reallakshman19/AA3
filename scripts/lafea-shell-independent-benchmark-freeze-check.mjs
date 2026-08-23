#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const MANIFEST_PATH = 'validation/lafea-shell/frozen-definition-manifest-v1.json';
const DEFINITION_SCHEMA = 'lafea-shell-independent-benchmark-definition/v1';
const FROZEN = 'FROZEN_BEFORE_PRODUCTION_OBSERVATION';
const BLOCKED = 'BLOCKED_SOURCE_REQUIRED';

export async function runLafeaShellIndependentBenchmarkFreezeCheck(options = {}) {
  const emit = options.emit !== false;
  const manifest = await readJson(MANIFEST_PATH);
  validateManifest(manifest);
  await proveCheckerIndependence();

  const byId = new Map();
  for (const row of manifest.definitions) {
    const definition = await readJson(row.path);
    assert.equal(definition.schema, DEFINITION_SCHEMA, `${row.benchmarkId} schema`);
    assert.equal(definition.benchmarkId, row.benchmarkId, `${row.benchmarkId} identity`);
    assert.equal(definition.stageId, 'LAFEA.4', `${row.benchmarkId} stage`);
    assert.equal(definition.definitionState, row.definitionState, `${row.benchmarkId} freeze state`);
    byId.set(row.benchmarkId, definition);
  }

  const membrane = byId.get('B4-1-MEMBRANE-PATCH-01');
  const bending = byId.get('B4-2-PURE-BENDING-PATCH-01');
  const reference = byId.get('B4-3-REFERENCE-PROBLEM-01');
  proveAnalyticalAuthority(membrane);
  proveAnalyticalAuthority(bending);
  const membraneEvidence = proveMembranePatch(membrane);
  const bendingEvidence = proveBendingPatch(bending);
  const referenceEvidence = proveBlockedReference(reference);

  const receipt = Object.freeze({
    schema: 'lafea-shell-independent-benchmark-freeze-check/v1',
    status: 'PASS',
    freezeId: manifest.freezeId,
    groundingProvenanceMainSha: manifest.groundingProvenanceMainSha,
    executableAnalyticalBenchmarks: [membraneEvidence, bendingEvidence],
    sourceRequiredBenchmark: referenceEvidence,
    productionFemImportedByOracle: false,
    externalReferenceBenchmarkStillRequired: true,
    releaseAuthorityGranted: false,
  });
  if (emit) console.log(JSON.stringify(receipt, null, 2));
  return receipt;
}

function validateManifest(manifest) {
  assert.equal(manifest.schema, 'lafea-shell-independent-benchmark-freeze-manifest/v1');
  assert.equal(manifest.stageId, 'LAFEA.4');
  assert.equal(manifest.definitionFreezeState, FROZEN);
  assert.equal(manifest.productionOutputObservedForTheseDefinitionsBeforeFreeze, false);
  assert.match(manifest.groundingProvenanceMainSha, /^[0-9a-f]{40}$/u);
  assert.deepEqual(manifest.definitions.map((row) => row.benchmarkId), [
    'B4-1-MEMBRANE-PATCH-01',
    'B4-2-PURE-BENDING-PATCH-01',
    'B4-3-REFERENCE-PROBLEM-01',
  ]);
  for (const key of [
    'productionOutputMayChooseGeometry',
    'productionOutputMayChooseLoadsOrPrescribedFields',
    'productionOutputMayChooseExpectedValues',
    'productionOutputMayChooseAcceptanceTolerance',
    'movingMaximumUsed',
    'nodalStressProjectionUsed',
    'crossElementAveragingUsed',
    'displayInterpolationUsed',
    'referenceProblemMayBeInventedWhenSourceMissing',
  ]) assert.equal(manifest.antiCircularity?.[key], false, `anti-circularity ${key}`);
  assert.equal(manifest.authorityBoundary?.benchmarkFreezeGrantsProductionAuthority, false);
  assert.equal(manifest.authorityBoundary?.benchmarkFreezeGrantsReleaseAuthority, false);
  assert.equal(manifest.authorityBoundary?.externalReferenceBenchmarkStillRequired, true);
}

async function proveCheckerIndependence() {
  const source = await readFile(fileURLToPath(import.meta.url), 'utf8');
  const staticImportSpecifiers = [...source.matchAll(
    /^\s*import\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"];?\s*$/gmu,
  )].map((match) => match[1]);
  assert.ok(staticImportSpecifiers.length >= 4, 'Independent checker import inventory is incomplete.');
  assert.equal(staticImportSpecifiers.every((specifier) => specifier.startsWith('node:')), true,
    `Independent checker may import Node built-ins only: ${staticImportSpecifiers.join(', ')}`);
}

function proveAnalyticalAuthority(definition) {
  assert.equal(definition.definitionState, FROZEN);
  assert.equal(definition.engineeringPurpose, 'INDEPENDENT_NUMERICAL_VERIFICATION');
  assert.equal(definition.formulationScope?.authorizedElementFamily,
    'CST_DKT_TRI3_THIN_SHELL_V1');
  assert.equal(definition.formulationScope?.linearElastic, true);
  assert.equal(definition.formulationScope?.smallDisplacement, true);
  assert.equal(definition.formulationScope?.thinShellOnly, true);
  assert.equal(definition.formulationScope?.mitcClaim, false);
  assert.equal(definition.formulationScope?.drillingDofClaim, false);
  assert.equal(definition.oracleAuthority?.sourceClass, 'ANALYTICAL');
  assert.equal(definition.oracleAuthority?.productionOutputUsedToChooseDefinition, false);
  assert.equal(definition.oracleAuthority?.productionOutputUsedToChooseExpectedValues, false);
  assert.equal(definition.oracleAuthority?.importsProductionFem, false);
  assert.equal(definition.oracleAuthority?.movingMaximumUsed, false);
  assert.equal(definition.oracleAuthority?.nodalStressProjectionUsed, false);
  assert.equal(definition.oracleAuthority?.crossElementAveragingUsed, false);
  assert.equal(definition.oracleAuthority?.displayInterpolationUsed, false);
  provePatchGeometry(definition.geometry);
  assert.equal(definition.material.elasticModulus, 210000);
  assert.equal(definition.material.poissonRatio, 0.27);
  assert.equal(definition.material.thickness, 3.2);
}

function provePatchGeometry(geometry) {
  assert.equal(geometry.kind, 'FLAT_RECTANGULAR_PATCH');
  assert.equal(geometry.width, 120);
  assert.equal(geometry.height, 70);
  assert.deepEqual(geometry.nodes.map((row) => [row.nodeId, row.x, row.y, row.z]), [
    ['A', 0, 0, 0],
    ['B', 120, 0, 0],
    ['C', 120, 70, 0],
    ['D', 0, 70, 0],
  ]);
  assert.deepEqual(geometry.triangles.map((row) => [row.elementId, row.nodeIds]), [
    ['E1', ['A', 'B', 'C']],
    ['E2', ['A', 'C', 'D']],
  ]);
}

function proveMembranePatch(definition) {
  const { epsilonX, epsilonY, gammaXY } = definition.prescribedField;
  assert.equal(epsilonX, 0.0008);
  assert.equal(epsilonY, -0.00015);
  assert.equal(gammaXY, 0.00035);
  const expectedNodes = new Map(
    definition.expected.nodalKinematics.map((row) => [row.nodeId, row]),
  );
  for (const node of definition.geometry.nodes) {
    const actual = {
      ux: epsilonX * node.x + 0.5 * gammaXY * node.y,
      uy: epsilonY * node.y + 0.5 * gammaXY * node.x,
      uz: 0, r1: 0, r2: 0,
    };
    compareRecord(actual, expectedNodes.get(node.nodeId), ['ux', 'uy', 'uz', 'r1', 'r2'],
      2e-15, `B4-1 node ${node.nodeId}`);
  }
  compareRecord({ epsilonX, epsilonY, gammaXY }, definition.expected.membraneStrain,
    ['epsilonX', 'epsilonY', 'gammaXY'], 2e-15, 'B4-1 strain');
  const d = planeStress(definition.material);
  const stress = {
    sigmaX: d.d11 * epsilonX + d.d12 * epsilonY,
    sigmaY: d.d12 * epsilonX + d.d11 * epsilonY,
    tauXY: d.d33 * gammaXY,
  };
  compareRecord(stress, definition.expected.membraneStress,
    ['sigmaX', 'sigmaY', 'tauXY'], 2e-13, 'B4-1 stress');
  compareRecord(definition.expected.bendingMomentResultants, { mx: 0, my: 0, mxy: 0 },
    ['mx', 'my', 'mxy'], 0, 'B4-1 bending contamination');
  assert.deepEqual(definition.expected.appliedResultantForce, [0, 0, 0]);
  assert.deepEqual(definition.expected.appliedResultantMomentAboutOrigin, [0, 0, 0]);
  assert.ok(definition.acceptance.nodalDisplacementAbsoluteTolerance > 0);
  assert.ok(definition.acceptance.membraneStressAbsoluteToleranceMpa > 0);
  return Object.freeze({
    benchmarkId: definition.benchmarkId,
    status: 'FROZEN_ANALYTICAL_ORACLE',
    expectedMembraneStressMpa: stress,
  });
}

function proveBendingPatch(definition) {
  const { kappaX, kappaY, kappaXY } = definition.prescribedField;
  assert.equal(kappaX, 8e-5);
  assert.equal(kappaY, 0);
  assert.equal(kappaXY, 0);
  const expectedNodes = new Map(
    definition.expected.nodalKinematics.map((row) => [row.nodeId, row]),
  );
  for (const node of definition.geometry.nodes) {
    const actual = {
      ux: 0,
      uy: 0,
      uz: -0.5 * kappaX * node.x ** 2
        - 0.5 * kappaY * node.y ** 2
        - 0.5 * kappaXY * node.x * node.y,
      r1: -kappaY * node.y - 0.5 * kappaXY * node.x,
      r2: kappaX * node.x + 0.5 * kappaXY * node.y,
    };
    compareRecord(actual, expectedNodes.get(node.nodeId), ['ux', 'uy', 'uz', 'r1', 'r2'],
      2e-15, `B4-2 node ${node.nodeId}`);
  }
  compareRecord({ kappaX, kappaY, kappaXY }, definition.expected.curvature,
    ['kappaX', 'kappaY', 'kappaXY'], 2e-15, 'B4-2 curvature');
  const d = planeStress(definition.material);
  const bendingScale = definition.material.thickness ** 3 / 12;
  const moments = {
    mx: bendingScale * (d.d11 * kappaX + d.d12 * kappaY),
    my: bendingScale * (d.d12 * kappaX + d.d11 * kappaY),
    mxy: bendingScale * d.d33 * kappaXY,
  };
  compareRecord(moments, definition.expected.bendingMomentResultants,
    ['mx', 'my', 'mxy'], 2e-13, 'B4-2 bending moments');
  const topZ = definition.material.thickness / 2;
  const top = {
    z: topZ,
    sigmaX: d.d11 * topZ * kappaX + d.d12 * topZ * kappaY,
    sigmaY: d.d12 * topZ * kappaX + d.d11 * topZ * kappaY,
    tauXY: d.d33 * topZ * kappaXY,
  };
  const bottom = {
    z: -topZ,
    sigmaX: -top.sigmaX,
    sigmaY: -top.sigmaY,
    tauXY: -top.tauXY,
  };
  compareRecord(top, definition.expected.topSurfaceBendingStress,
    ['z', 'sigmaX', 'sigmaY', 'tauXY'], 2e-13, 'B4-2 top stress');
  compareRecord(bottom, definition.expected.bottomSurfaceBendingStress,
    ['z', 'sigmaX', 'sigmaY', 'tauXY'], 2e-13, 'B4-2 bottom stress');
  compareRecord(definition.expected.membraneStrain,
    { epsilonX: 0, epsilonY: 0, gammaXY: 0 },
    ['epsilonX', 'epsilonY', 'gammaXY'], 0, 'B4-2 membrane contamination');
  assert.deepEqual(definition.expected.appliedResultantForce, [0, 0, 0]);
  assert.deepEqual(definition.expected.appliedResultantMomentAboutOrigin, [0, 0, 0]);
  assert.ok(definition.acceptance.curvatureAbsoluteTolerancePerMm > 0);
  assert.ok(definition.acceptance.bendingMomentAbsoluteToleranceN > 0);
  return Object.freeze({
    benchmarkId: definition.benchmarkId,
    status: 'FROZEN_ANALYTICAL_ORACLE',
    expectedBendingMomentResultantsN: moments,
    expectedTopSurfaceStressMpa: {
      sigmaX: top.sigmaX, sigmaY: top.sigmaY, tauXY: top.tauXY,
    },
  });
}

function proveBlockedReference(definition) {
  assert.equal(definition.definitionState, BLOCKED);
  assert.equal(definition.requiredSource?.status, 'UNAVAILABLE');
  assert.equal(definition.expected, null);
  assert.equal(definition.acceptance, null);
  assert.equal(definition.executionEligible, false);
  assert.equal(definition.fullClosureEligible, false);
  assert.equal(definition.antiCircularity?.productionOutputMayPopulateExpectedValues, false);
  assert.equal(definition.antiCircularity?.webFitToProductionOutputPermitted, false);
  assert.equal(definition.antiCircularity?.sourceMustBeQualifiedBeforeExpectedValues, true);
  assert.ok(definition.limitations.includes('BLOCKED_SOURCE_REQUIRED'));
  return Object.freeze({
    benchmarkId: definition.benchmarkId,
    status: BLOCKED,
    expectedValuesInvented: false,
  });
}

function planeStress(material) {
  const factor = material.elasticModulus / (1 - material.poissonRatio ** 2);
  return {
    d11: factor,
    d12: material.poissonRatio * factor,
    d33: material.elasticModulus / (2 * (1 + material.poissonRatio)),
  };
}

function compareRecord(actual, expected, keys, relativeFloor, label) {
  assert.ok(expected && typeof expected === 'object', `${label} expected record`);
  for (const key of keys) {
    assert.ok(Number.isFinite(actual[key]), `${label}.${key} actual finite`);
    assert.ok(Number.isFinite(expected[key]), `${label}.${key} expected finite`);
    const limit = relativeFloor * Math.max(1, Math.abs(actual[key]), Math.abs(expected[key]));
    assert.ok(Math.abs(actual[key] - expected[key]) <= limit,
      `${label}.${key}: ${actual[key]} != ${expected[key]} within ${limit}`);
  }
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(REPO_ROOT, relativePath), 'utf8'));
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) await runLafeaShellIndependentBenchmarkFreezeCheck();
