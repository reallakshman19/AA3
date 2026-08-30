import assert from 'node:assert/strict';
import {
  CANONICAL_UNITS,
  MITC_PRODUCTION_FORMULATION_FAMILY,
  MITC_PRODUCTION_LIMITATIONS,
  MITC_PRODUCTION_MODEL_SCHEMA,
  MITC_PRODUCTION_QUALIFICATION_STATE,
  MITC_PRODUCTION_RESULT_REQUEST,
  MITC_PRODUCTION_ROUTE_STATUS,
  calculateLocalShell,
  createCanonicalMitcProductionModel,
} from '../src/core/local-shell/index.js';
import {
  MITC3_TOPOLOGY,
  MITC4_TOPOLOGY,
} from '../src/core/local-shell/mitc-adoption-model.js';
import { MITC3_FORMULATION } from '../src/core/local-shell/mitc3-element.js';
import { MITC4_FORMULATION } from '../src/core/local-shell/mitc4-element.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { presentLocalShell } from '../src/workspace/lafea-result-presenters/local-shell.js';
import { flatNode, qualificationProfile } from './lafea.4-fixtures.mjs';

const quadNodes = [
  flatNode('A', 0, 0),
  flatNode('B', 100, 0),
  flatNode('C', 100, 50),
  flatNode('D', 0, 50),
];

const quad = createCanonicalMitcProductionModel(productionSource({
  modelIdentity: 'MITC4-PRODUCTION-ROUTE',
  nodes: quadNodes,
  elements: [{
    elementId: 'Q1',
    formulation: MITC4_FORMULATION,
    topology: MITC4_TOPOLOGY,
    nodeIds: ['A', 'B', 'C', 'D'],
    materialId: 'MAT',
    thickness: 2,
    sourceReference: 'Q1-SRC',
  }],
  constraints: fullyFixed(quadNodes),
  loadCases: [{
    loadCaseId: 'PRESSURE',
    nodalLoads: [],
    pressureLoads: [{
      pressureLoadId: 'P1',
      elementId: 'Q1',
      pressure: 2,
      sense: 'ALONG_ELEMENT_NORMAL',
      sourceReference: 'P1-SRC',
    }],
    sourceReference: 'PRESSURE-SRC',
  }],
}));

const quadResult = calculateLocalShell(quad);
assert.equal(quadResult.schema, 'local-shell-result/v2');
assert.equal(quadResult.formulation, MITC_PRODUCTION_FORMULATION_FAMILY);
assert.equal(quadResult.routeStatus, MITC_PRODUCTION_ROUTE_STATUS);
assert.equal(quadResult.qualification.accepted, true);
assert.equal(quadResult.productionQualification.state, MITC_PRODUCTION_QUALIFICATION_STATE);
assert.equal(quadResult.productionQualification.qualifiedForRelease, false);
assert.equal(quadResult.productionQualification.evidenceState, 'NOT_RUN');
assert.deepEqual(quadResult.formulations, [MITC4_FORMULATION]);
assert.equal(quadResult.loadCaseResults.length, 1);
assert.equal(quadResult.loadCaseResults[0].routeStatus, MITC_PRODUCTION_ROUTE_STATUS);
assert.equal(quadResult.loadCaseResults[0].solverEvidence.method, 'FULLY_CONSTRAINED_NO_FREE_SOLVE');
vectorClose(quadResult.loadCaseResults[0].appliedLoadEvidence.appliedForce, [0, 0, 10000]);
vectorClose(
  quadResult.loadCaseResults[0].appliedLoadEvidence.appliedMomentAboutOrigin,
  [250000, -500000, 0],
);
assert.equal(
  quadResult.loadCaseResults[0].elementResults[0].formulation,
  MITC4_FORMULATION,
);
assert.ok(
  quadResult.loadCaseResults[0].elementResults[0].integrationPoints
    .every((point) => point.transverseShearResultant),
);
for (const reaction of quadResult.loadCaseResults[0].reactions) {
  const index = quadResult.meshEvidence.dofOrdering.indexOf(`${reaction.nodeId}:${reaction.dof}`);
  close(reaction.value, -quadResult.loadCaseResults[0].appliedLoadEvidence.forceVector[index]);
}

const presented = presentLocalShell(quadResult, {
  length: 'mm',
  force: 'N',
  moment: 'N*mm',
  pressure: 'MPa',
});
assert.ok(presented.sections.some((section) => section.title.includes('MITC4/MITC3')));
assert.ok(presented.sections.some((section) => section.title.includes('transverse-shear')));
assert.ok(presented.sections[0].rows.some((row) =>
  row.sourcePath === 'result.productionQualification.state'
    && row.value === MITC_PRODUCTION_QUALIFICATION_STATE));
console.log('✅ MITC4 v2 enters calculateLocalShell(), solves, retains pressure/recovery evidence and reaches the formulation-aware presenter.');

// The registered workbench stage must traverse the same v2 production route,
// not merely expose the kernel and presenter as direct imports. This closes the
// composition-custody gap for Issue #1536 without changing release authority.
const stage = requireLafeaStageComposition('LAFEA.4');
assert.equal(stage.executionSupported, true);
assert.equal(stage.releaseStateBinding, 'RELEASE_NOT_QUALIFIED');
for (const benchmarkId of [
  'SHELL-PATCH-01',
  'SHELL-BEND-01',
  'LAFEA4-CYL-01',
  'LAFEA4-PRESS-01',
  'LAFEA4-COMB-01',
]) {
  assert.ok(
    stage.benchmarkManifestIds.includes(benchmarkId),
    `LAFEA.4 composition must register benchmark ${benchmarkId}`,
  );
}
const stageDocument = stage.normalizeDocument(quad);
assert.equal(stageDocument.schema, MITC_PRODUCTION_MODEL_SCHEMA);
assert.equal(stageDocument.semanticHash, undefined);
const stageCanonical = stage.canonicalize(stageDocument);
assert.equal(stageCanonical.schema, MITC_PRODUCTION_MODEL_SCHEMA);
const stageResult = stage.calculate(stageCanonical);
assert.equal(stage.acceptResult(stageResult), true);
assert.equal(stageResult.schema, 'local-shell-result/v2');
assert.equal(stageResult.routeStatus, MITC_PRODUCTION_ROUTE_STATUS);
assert.equal(stageResult.productionQualification.qualifiedForRelease, false);
assert.equal(stageResult.productionQualification.evidenceState, 'NOT_RUN');
const stagePresentation = stage.presentResult(
  stageResult,
  stage.resolveUnits(stageDocument),
);
assert.ok(stagePresentation.sections.some((section) => section.title.includes('MITC4/MITC3')));
assert.ok(stagePresentation.sections.some((section) => section.title.includes('transverse-shear')));
console.log('✅ Registered LAFEA.4 composition normalizes, canonicalizes, calculates, accepts and presents the v2 MITC route while release remains not qualified.');

const triNodes = [
  flatNode('T1', 0, 0),
  flatNode('T2', 100, 0),
  flatNode('T3', 0, 50),
];
const tri = createCanonicalMitcProductionModel(productionSource({
  modelIdentity: 'MITC3-PRODUCTION-ROUTE',
  nodes: triNodes,
  elements: [{
    elementId: 'T1E',
    formulation: MITC3_FORMULATION,
    topology: MITC3_TOPOLOGY,
    nodeIds: ['T1', 'T2', 'T3'],
    materialId: 'MAT',
    thickness: 2,
    sourceReference: 'T1E-SRC',
  }],
  constraints: fullyFixed(triNodes),
  loadCases: [{
    loadCaseId: 'NODAL',
    nodalLoads: [{
      loadId: 'N1',
      nodeId: 'T2',
      fx: 11,
      fy: -7,
      fz: 5,
      m1: 13,
      m2: -17,
      sourceReference: 'N1-SRC',
    }],
    pressureLoads: [],
    sourceReference: 'NODAL-SRC',
  }],
}));
const triResult = calculateLocalShell(tri);
assert.equal(triResult.qualification.accepted, true);
assert.deepEqual(triResult.formulations, [MITC3_FORMULATION]);
assert.equal(triResult.loadCaseResults[0].elementResults[0].topology, MITC3_TOPOLOGY);
const t2Offset = triResult.meshEvidence.dofOrdering.indexOf('T2:UX');
assert.deepEqual(
  triResult.loadCaseResults[0].appliedLoadEvidence.forceVector.slice(t2Offset, t2Offset + 5),
  [11, -7, 5, 13, -17],
);
console.log('✅ Explicit MITC3 TRI3 is a production-contract route, not an implicit fallback from MITC4.');

assert.throws(
  () => createCanonicalMitcProductionModel(productionSource({
    modelIdentity: 'BAD-TOPOLOGY',
    nodes: quadNodes,
    elements: [{
      elementId: 'BAD',
      formulation: MITC4_FORMULATION,
      topology: MITC3_TOPOLOGY,
      nodeIds: ['A', 'B', 'C', 'D'],
      materialId: 'MAT',
      thickness: 2,
      sourceReference: 'BAD-SRC',
    }],
    constraints: fullyFixed(quadNodes),
    loadCases: [{
      loadCaseId: 'EMPTY',
      nodalLoads: [],
      pressureLoads: [],
      sourceReference: 'EMPTY-SRC',
    }],
  })),
  /requires topology QUAD4/,
);
console.log('✅ Production contract fails closed on formulation/topology mismatch; no silent MITC4→MITC3 fallback exists.');

console.log('\n✅ LAFEA.4 MITC production-route contract check passed.');

function productionSource(overrides) {
  return {
    schema: MITC_PRODUCTION_MODEL_SCHEMA,
    modelIdentity: overrides.modelIdentity,
    modelVersion: '2',
    sourceAncestry: ['fixture/lafea4-mitc-production-route/v1'],
    units: { ...CANONICAL_UNITS },
    formulationFamily: MITC_PRODUCTION_FORMULATION_FAMILY,
    materials: [{
      materialId: 'MAT',
      elasticModulus: 200000,
      poissonRatio: 0.3,
      sourceReference: 'MAT-SRC',
    }],
    nodes: overrides.nodes,
    elements: overrides.elements,
    constraints: overrides.constraints,
    loadCases: overrides.loadCases,
    resultRequests: {
      stressSurfaces: [...MITC_PRODUCTION_RESULT_REQUEST.stressSurfaces],
      retainElementMatrices: true,
      retainTransverseShear: true,
    },
    qualificationProfile: qualificationProfile(),
    mitcQualification: {
      quadPlanarity: { absolute: 1e-9, relative: 1e-8 },
      rigidBodyEnergy: { absolute: 1e-9, relative: 1e-9 },
    },
    limitations: [...MITC_PRODUCTION_LIMITATIONS],
  };
}

function fullyFixed(nodes) {
  return nodes.flatMap((node) =>
    ['UX', 'UY', 'UZ', 'R1', 'R2'].map((dof) => ({
      constraintId: `C-${node.nodeId}-${dof}`,
      nodeId: node.nodeId,
      dof,
      value: 0,
      sourceReference: `C-${node.nodeId}-${dof}-SRC`,
    })));
}

function vectorClose(actual, expected) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => close(value, expected[index]));
}

function close(actual, expected, tolerance = 1e-9) {
  const scale = Math.max(1, Math.abs(expected));
  assert.ok(Math.abs(actual - expected) <= tolerance * scale, `${actual} != ${expected}`);
}
