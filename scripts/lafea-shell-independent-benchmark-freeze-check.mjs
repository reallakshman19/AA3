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
    assert.equal(row.executionEligible, true, `${row.benchmarkId} execution eligibility`);
    byId.set(row.benchmarkId, definition);
  }

  const membrane = byId.get('B4-1-MEMBRANE-PATCH-01');
  const bending = byId.get('B4-2-PURE-BENDING-PATCH-01');
  const reference = byId.get('B4-3-REFERENCE-PROBLEM-01');
  proveAnalyticalAuthority(membrane);
  proveAnalyticalAuthority(bending);
  const membraneEvidence = proveMembranePatch(membrane);
  const bendingEvidence = proveBendingPatch(bending);
  const referenceEvidence = provePublishedReference(reference, manifest.sourceQualificationAddendum);

  const receipt = Object.freeze({
    schema: 'lafea-shell-independent-benchmark-freeze-check/v2',
    status: 'PASS',
    freezeId: manifest.freezeId,
    groundingProvenanceMainSha: manifest.groundingProvenanceMainSha,
    executableAnalyticalBenchmarks: [membraneEvidence, bendingEvidence],
    executablePublishedReferenceBenchmark: referenceEvidence,
    productionFemImportedByOracle: false,
    externalReferenceBenchmarkStillRequired: false,
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
  assert.deepEqual(manifest.definitions.map((row) => row.definitionState), [FROZEN, FROZEN, FROZEN]);
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
  assert.equal(manifest.authorityBoundary?.externalReferenceBenchmarkStillRequired, false);
  assert.equal(manifest.authorityBoundary?.externalReferenceBenchmarkQualified, true);
  assert.equal(manifest.sourceQualificationAddendum?.benchmarkId, 'B4-3-REFERENCE-PROBLEM-01');
  assert.equal(manifest.sourceQualificationAddendum?.sourceClass, 'PRIMARY_PUBLISHED_REFERENCE');
  assert.equal(manifest.sourceQualificationAddendum?.doi, '10.1002/nme.1620151205');
  assert.equal(manifest.sourceQualificationAddendum?.productionOutputObservedForReferenceBeforeFreeze, false);
  assert.match(manifest.sourceQualificationAddendum?.mainShaAtSourceQualification ?? '', /^[0-9a-f]{40}$/u);
  assert.equal(
    manifest.sourceQualificationAddendum?.definitionCommit,
    'c0d3ec551fef6be7a5d15484fdac8dda30f023c7',
  );
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
  proveFormulationScope(definition);
  assert.equal(definition.oracleAuthority?.sourceClass, 'ANALYTICAL');
  proveAntiCircularOracleAuthority(definition.oracleAuthority);
  provePatchGeometry(definition.geometry);
  assert.equal(definition.material.elasticModulus, 210000);
  assert.equal(definition.material.poissonRatio, 0.27);
  assert.equal(definition.material.thickness, 3.2);
}

function proveFormulationScope(definition) {
  assert.equal(definition.formulationScope?.authorizedElementFamily, 'CST_DKT_TRI3_THIN_SHELL_V1');
  assert.equal(definition.formulationScope?.linearElastic, true);
  assert.equal(definition.formulationScope?.smallDisplacement, true);
  assert.equal(definition.formulationScope?.thinShellOnly, true);
  assert.equal(definition.formulationScope?.mitcClaim, false);
  assert.equal(definition.formulationScope?.drillingDofClaim, false);
}

function proveAntiCircularOracleAuthority(authority) {
  assert.equal(authority?.productionOutputUsedToChooseDefinition, false);
  assert.equal(authority?.productionOutputUsedToChooseExpectedValues, false);
  if ('productionOutputUsedToChooseAcceptanceTolerance' in authority) {
    assert.equal(authority.productionOutputUsedToChooseAcceptanceTolerance, false);
  }
  assert.equal(authority?.importsProductionFem, false);
  assert.equal(authority?.movingMaximumUsed, false);
  assert.equal(authority?.nodalStressProjectionUsed, false);
  assert.equal(authority?.crossElementAveragingUsed, false);
  assert.equal(authority?.displayInterpolationUsed, false);
}

function provePatchGeometry(geometry) {
  assert.equal(geometry.kind, 'FLAT_RECTANGULAR_PATCH');
  assert.equal(geometry.width, 120);
  assert.equal(geometry.height, 70);
  assert.deepEqual(geometry.nodes.map((row) => [row.nodeId, row.x, row.y, row.z]), [
    ['A', 0, 0, 0], ['B', 120, 0, 0], ['C', 120, 70, 0], ['D', 0, 70, 0],
  ]);
  assert.deepEqual(geometry.triangles.map((row) => [row.elementId, row.nodeIds]), [
    ['E1', ['A', 'B', 'C']], ['E2', ['A', 'C', 'D']],
  ]);
}

function proveMembranePatch(definition) {
  const { epsilonX, epsilonY, gammaXY } = definition.prescribedField;
  assert.deepEqual({ epsilonX, epsilonY, gammaXY }, {
    epsilonX: 0.0008, epsilonY: -0.00015, gammaXY: 0.00035,
  });
  const expectedNodes = new Map(definition.expected.nodalKinematics.map((row) => [row.nodeId, row]));
  for (const node of definition.geometry.nodes) {
    compareRecord({
      ux: epsilonX * node.x + 0.5 * gammaXY * node.y,
      uy: epsilonY * node.y + 0.5 * gammaXY * node.x,
      uz: 0, r1: 0, r2: 0,
    }, expectedNodes.get(node.nodeId), ['ux', 'uy', 'uz', 'r1', 'r2'], 2e-15,
    `B4-1 node ${node.nodeId}`);
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
  return Object.freeze({ benchmarkId: definition.benchmarkId, status: 'FROZEN_ANALYTICAL_ORACLE',
    expectedMembraneStressMpa: stress });
}

function proveBendingPatch(definition) {
  const { kappaX, kappaY, kappaXY } = definition.prescribedField;
  assert.deepEqual({ kappaX, kappaY, kappaXY }, { kappaX: 8e-5, kappaY: 0, kappaXY: 0 });
  const expectedNodes = new Map(definition.expected.nodalKinematics.map((row) => [row.nodeId, row]));
  for (const node of definition.geometry.nodes) {
    compareRecord({
      ux: 0,
      uy: 0,
      uz: -0.5 * kappaX * node.x ** 2 - 0.5 * kappaY * node.y ** 2 - 0.5 * kappaXY * node.x * node.y,
      r1: -kappaY * node.y - 0.5 * kappaXY * node.x,
      r2: kappaX * node.x + 0.5 * kappaXY * node.y,
    }, expectedNodes.get(node.nodeId), ['ux', 'uy', 'uz', 'r1', 'r2'], 2e-15,
    `B4-2 node ${node.nodeId}`);
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
  const bottom = { z: -topZ, sigmaX: -top.sigmaX, sigmaY: -top.sigmaY, tauXY: -top.tauXY };
  compareRecord(top, definition.expected.topSurfaceBendingStress,
    ['z', 'sigmaX', 'sigmaY', 'tauXY'], 2e-13, 'B4-2 top stress');
  compareRecord(bottom, definition.expected.bottomSurfaceBendingStress,
    ['z', 'sigmaX', 'sigmaY', 'tauXY'], 2e-13, 'B4-2 bottom stress');
  compareRecord(definition.expected.membraneStrain, { epsilonX: 0, epsilonY: 0, gammaXY: 0 },
    ['epsilonX', 'epsilonY', 'gammaXY'], 0, 'B4-2 membrane contamination');
  assert.deepEqual(definition.expected.appliedResultantForce, [0, 0, 0]);
  assert.deepEqual(definition.expected.appliedResultantMomentAboutOrigin, [0, 0, 0]);
  return Object.freeze({ benchmarkId: definition.benchmarkId, status: 'FROZEN_ANALYTICAL_ORACLE',
    expectedBendingMomentResultantsN: moments,
    expectedTopSurfaceStressMpa: { sigmaX: top.sigmaX, sigmaY: top.sigmaY, tauXY: top.tauXY } });
}

function provePublishedReference(definition, addendum) {
  assert.equal(definition.definitionState, FROZEN);
  assert.equal(definition.engineeringPurpose, 'INDEPENDENT_NUMERICAL_VERIFICATION');
  proveFormulationScope(definition);
  assert.equal(definition.oracleAuthority?.sourceClass, 'PRIMARY_PUBLISHED_REFERENCE');
  proveAntiCircularOracleAuthority(definition.oracleAuthority);
  assert.equal(definition.source?.doi, '10.1002/nme.1620151205');
  assert.equal(definition.source?.year, 1980);
  assert.equal(definition.source?.volume, 15);
  assert.equal(definition.source?.sourceQualificationStatus, 'DOI_AND_EXACT_PAGE_FIGURE_VERIFIED');
  assert.deepEqual(definition.source?.locations?.map((row) => [row.section ?? null, row.figure ?? null, row.printedPage]), [
    ['3.1.1 Small displacement theory of plates with transverse shear included', 2, 1777],
    ['4.2.2 Twisting of a square plate', null, 1793],
    [null, 16, 1797],
  ]);
  assert.equal(addendum?.doi, definition.source.doi);
  assert.equal(addendum?.definitionCommit, 'c0d3ec551fef6be7a5d15484fdac8dda30f023c7');

  const { inchToMm, psiToMpa, lbfToN } = definition.unitConversion;
  assert.equal(inchToMm, 25.4);
  assert.equal(psiToMpa, 0.006894757293168361);
  assert.equal(lbfToN, 4.4482216152605);
  closeScalar(definition.geometry.width, 8 * inchToMm, 1e-13, 'B4-3 width conversion');
  closeScalar(definition.geometry.height, 8 * inchToMm, 1e-13, 'B4-3 height conversion');
  closeScalar(definition.material.thickness, inchToMm, 1e-13, 'B4-3 thickness conversion');
  closeScalar(definition.material.elasticModulus, 10000 * psiToMpa, 1e-13, 'B4-3 modulus conversion');
  assert.equal(definition.material.poissonRatio, 0.3);
  assert.deepEqual(definition.geometry.nodes.map((row) => [row.nodeId, row.x, row.y, row.z]), [
    ['A', 0, 203.2, 0], ['B', 0, 0, 0], ['C', 203.2, 203.2, 0],
    ['D', 203.2, 0, 0], ['O', 101.6, 101.6, 0],
  ]);
  assert.deepEqual(definition.geometry.triangles.map((row) => [row.elementId, row.nodeIds]), [
    ['E1', ['A', 'B', 'O']], ['E2', ['B', 'D', 'O']],
    ['E3', ['D', 'C', 'O']], ['E4', ['C', 'A', 'O']],
  ]);
  assert.deepEqual(definition.publishedSupports, [
    { nodeId: 'A', dof: 'UZ', value: 0 }, { nodeId: 'B', dof: 'UZ', value: 0 },
    { nodeId: 'D', dof: 'UZ', value: 0 },
  ]);
  assert.equal(definition.auxiliaryMembraneRigidBodyStabilization?.physicalSupportAuthority, false);
  assert.deepEqual(definition.auxiliaryMembraneRigidBodyStabilization?.constraints, [
    { nodeId: 'A', dof: 'UX', value: 0 }, { nodeId: 'A', dof: 'UY', value: 0 },
    { nodeId: 'B', dof: 'UX', value: 0 },
  ]);

  const forceMagnitude = 5 * lbfToN;
  closeScalar(definition.load.magnitude, forceMagnitude, 1e-13, 'B4-3 load magnitude conversion');
  closeScalar(definition.load.signedValue, -forceMagnitude, 1e-13, 'B4-3 signed downward load');
  const expectedByNode = new Map(definition.expected.fixedNodalDisplacements.map((row) => [row.nodeId, row]));
  closeScalar(expectedByNode.get('O').value, -0.0624 * inchToMm, 1e-13, 'B4-3 center signed deflection');
  closeScalar(expectedByNode.get('C').value, -0.2496 * inchToMm, 1e-13, 'B4-3 corner signed deflection');
  closeScalar(definition.expected.globalBendingMomentResultants.mx, 0, 0, 'B4-3 Mx');
  closeScalar(definition.expected.globalBendingMomentResultants.my, 0, 0, 'B4-3 My');
  closeScalar(definition.expected.globalBendingMomentResultants.mxy, 2.5 * lbfToN, 1e-13, 'B4-3 Mxy');
  compareRecord({
    x: definition.expected.appliedResultantForce[0], y: definition.expected.appliedResultantForce[1],
    z: definition.expected.appliedResultantForce[2],
  }, { x: 0, y: 0, z: -forceMagnitude }, ['x', 'y', 'z'], 1e-13, 'B4-3 applied force');
  compareRecord({
    x: definition.expected.appliedResultantMomentAboutOrigin[0],
    y: definition.expected.appliedResultantMomentAboutOrigin[1],
    z: definition.expected.appliedResultantMomentAboutOrigin[2],
  }, { x: -203.2 * forceMagnitude, y: 203.2 * forceMagnitude, z: 0 }, ['x', 'y', 'z'], 1e-13,
  'B4-3 applied moment');

  closeScalar(definition.acceptance.fixedNodalDisplacementAbsoluteToleranceMm,
    0.5e-5 * inchToMm, 1e-16, 'B4-3 displacement source-precision tolerance');
  closeScalar(definition.acceptance.bendingMomentAbsoluteToleranceN,
    0.5e-5 * lbfToN, 1e-16, 'B4-3 moment source-precision tolerance');
  closeScalar(definition.acceptance.zeroBendingMomentAbsoluteToleranceN,
    0.5e-5 * lbfToN, 1e-16, 'B4-3 zero-moment tolerance');
  assert.equal(definition.executionEligible, true);
  assert.equal(definition.fullClosureEligible, true);
  assert.equal(definition.antiCircularity?.productionOutputMayPopulateExpectedValues, false);
  assert.equal(definition.antiCircularity?.productionOutputMayChooseTolerance, false);
  assert.equal(definition.antiCircularity?.webFitToProductionOutputPermitted, false);
  assert.equal(definition.antiCircularity?.sourceQualifiedBeforeExpectedValues, true);
  assert.equal(definition.limitations.includes('BLOCKED_SOURCE_REQUIRED'), false);

  return Object.freeze({
    benchmarkId: definition.benchmarkId,
    status: 'FROZEN_PRIMARY_PUBLISHED_REFERENCE',
    doi: definition.source.doi,
    sourceLocations: definition.source.locations,
    meshIdentity: definition.geometry.meshIdentity,
    expectedCenterDeflectionMm: expectedByNode.get('O').value,
    expectedLoadedCornerDeflectionMm: expectedByNode.get('C').value,
    expectedGlobalTwistingResultantN: definition.expected.globalBendingMomentResultants.mxy,
    productionOutputObservedBeforeFreeze: false,
  });
}

function planeStress(material) {
  const factor = material.elasticModulus / (1 - material.poissonRatio ** 2);
  return { d11: factor, d12: material.poissonRatio * factor,
    d33: material.elasticModulus / (2 * (1 + material.poissonRatio)) };
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

function closeScalar(actual, expected, tolerance, label) {
  assert.ok(Number.isFinite(actual), `${label} actual finite`);
  assert.ok(Number.isFinite(expected), `${label} expected finite`);
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} != ${expected} within ${tolerance}`);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(REPO_ROOT, relativePath), 'utf8'));
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) await runLafeaShellIndependentBenchmarkFreezeCheck();
