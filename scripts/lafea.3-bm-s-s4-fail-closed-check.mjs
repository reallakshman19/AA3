#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MODEL_SCHEMA,
  QUALIFICATION_PROFILE,
  createCanonicalLocalContinuumModel,
  buildElementEvidence,
} from '../src/core/local-continuum/index.js';
import { assembleMesh, validateBoundaryTractions } from '../src/core/local-continuum/assembly.js';
import { assembleLoadCase } from '../src/core/local-continuum/loads.js';
import { solvePartitioned } from '../src/core/local-continuum/solver.js';
import { clone, patchSource, triangleSource } from './lafea.3-fixtures.mjs';
import { writeBmSCaseEvidence } from './lib/lafea.3-bm-s-evidence.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = path.join(
  ROOT,
  'validation/lafea-benchmark-data/B02/governance/negative-cases.json',
);
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
assert.equal(manifest.schema, 'lafea-b02-negative-cases/v1');
assert.equal(manifest.assertionPolicy, 'EXACT_STRUCTURED_STATE_AND_CODE_NOT_MESSAGE_REGEX');
assert.equal(manifest.releaseQualified, false);

const mutations = new Map([
  ['S4-UNDER-CONSTRAINED', underConstrained],
  ['S4-ZERO-AREA', zeroArea],
  ['S4-NEAR-ZERO-AREA', nearZeroArea],
  ['S4-Q8-INVERTED-MAPPING', q8MidsideInversion],
  ['S4-DUPLICATE-CONSTRAINT', duplicateConstraint],
  ['S4-CONFLICTING-CONSTRAINT', conflictingConstraint],
  ['S4-INTERNAL-EDGE-TRACTION', internalEdgeTraction],
  ['S4-DISCONNECTED-NODE', disconnectedNode],
  ['S4-DUPLICATE-ELEMENT-NODE-SET', duplicateElementNodeSet],
]);

assert.deepEqual(
  [...mutations.keys()].sort(),
  manifest.cases.map((row) => row.negativeCaseId).sort(),
  'S4 executor mutation set must exactly match frozen negative manifest',
);

const caseResults = manifest.cases.map((expected) => executeNegative(expected));
const evidence = {
  schema: 'lafea3-bm-s-s4-fail-closed-evidence/v1',
  benchmarkStage: 'S4',
  assertionPolicy: manifest.assertionPolicy,
  authority: {
    expectedContractSource: 'validation/lafea-benchmark-data/B02/governance/negative-cases.json',
    messageRegexMayQualify: false,
    matchingCodeAtWrongBoundaryMayQualify: false,
    productionValidationRulesModified: false,
    releaseQualified: false,
  },
  caseResults,
  stageStatus: caseResults.every((row) => row.status === 'PASS') ? 'PASS' : 'FAIL',
};
writeBmSCaseEvidence('LAFEA_BM_S_S4_REPORT_PATH', evidence);
console.log(JSON.stringify(evidence));
assert.equal(
  evidence.stageStatus,
  'PASS',
  `S4 failures: ${caseResults.filter((row) => row.status !== 'PASS').map((row) => row.negativeCaseId).join(', ')}`,
);

function executeNegative(expected) {
  const mutate = mutations.get(expected.negativeCaseId);
  let fixture;
  try {
    fixture = mutate();
  } catch (error) {
    return failedFixtureResult(expected, error);
  }
  const observed = runUntilFirstFailure(fixture.source);
  const checks = {
    boundary: observed.actualBoundary === expected.expectedBoundary,
    qualificationState: observed.actualQualificationState === expected.expectedQualificationState,
    errorCode: observed.actualErrorCode === expected.expectedErrorCode,
    structuredPath: typeof observed.actualPath === 'string' && observed.actualPath.length > 0,
  };
  return {
    negativeCaseId: expected.negativeCaseId,
    mutation: expected.mutation,
    expected: {
      boundary: expected.expectedBoundary,
      qualificationState: expected.expectedQualificationState,
      errorCode: expected.expectedErrorCode,
    },
    observed,
    fixtureProof: fixture.proof,
    checks,
    status: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
  };
}

function runUntilFirstFailure(source) {
  let boundary = 'canonical-model';
  try {
    const model = createCanonicalLocalContinuumModel(source);
    boundary = 'element-formulation';
    const elements = buildElementEvidence(model);
    boundary = 'assembly';
    const mesh = assembleMesh(model, elements);
    boundary = 'load-case-preflight';
    validateBoundaryTractions(model, mesh);
    const requested = new Set(model.resultRequests.loadCaseIds);
    for (const loadCase of model.loadCases.filter((row) => requested.has(row.loadCaseId))) {
      boundary = 'load-assembly';
      const load = assembleLoadCase(model, mesh, elements, loadCase);
      boundary = 'solver';
      solvePartitioned(model, mesh, load);
    }
    return {
      actualBoundary: 'none',
      actualQualificationState: 'ACCEPTED',
      actualErrorCode: null,
      actualPath: null,
      message: 'Negative fixture reached the end of the solver pipeline without rejection.',
    };
  } catch (error) {
    return {
      actualBoundary: boundary,
      actualQualificationState: error?.state ?? 'NUMERICAL_FAILURE',
      actualErrorCode: error?.code ?? 'UNEXPECTED_ERROR',
      actualPath: error?.path ?? 'unknown',
      message: String(error?.message ?? error),
    };
  }
}

function underConstrained() {
  const source = clone(triangleSource());
  source.constraints = [];
  source.resultRequests = { loadCaseIds: ['L1'] };
  return { source, proof: { constraintCount: 0, otherwiseUnmodifiedTriangleFixture: true } };
}

function zeroArea() {
  const source = clone(triangleSource());
  nodeById(source, 'C').x = 200;
  nodeById(source, 'C').y = 0;
  return { source, proof: { signedAreaMm2: 0, distinctNodeCoordinates: true } };
}

function nearZeroArea() {
  const source = clone(triangleSource());
  nodeById(source, 'C').x = 100;
  nodeById(source, 'C').y = 1e-12;
  return {
    source,
    proof: {
      geometricAreaMm2: 5e-11,
      productionMinimumElementAreaRule: structuredClone(QUALIFICATION_PROFILE.tolerances.minimumElementArea),
      coordinatePerturbationMm: 1e-12,
    },
  };
}

function q8MidsideInversion() {
  const source = q8Source();
  nodeById(source, 'E').y = 125;
  return {
    source,
    proof: {
      cornerOrder: ['A', 'B', 'C', 'D'],
      cornerSignedAreaMm2: 10000,
      cornersRemainCounterClockwise: true,
      movedMidsideNodeId: 'E',
      movedMidsideCoordinateMm: { x: 50, y: 125 },
      nominalMidsideCoordinateMm: { x: 50, y: 0 },
      independentlyDerivedMinimumGaussDetJMm2: -625,
      cornerWindingReversed: false,
    },
  };
}

function duplicateConstraint() {
  const source = clone(triangleSource());
  const original = source.constraints[0];
  source.constraints.push({
    ...clone(original),
    constraintId: 'C-DUP',
    sourceReference: 'CONSTRAINT#C-DUP',
  });
  return { source, proof: { targetDof: `${original.nodeId}:${original.dof}`, sameValue: true } };
}

function conflictingConstraint() {
  const source = clone(triangleSource());
  const original = source.constraints[0];
  source.constraints.push({
    ...clone(original),
    constraintId: 'C-CONFLICT',
    value: original.value + 1,
    sourceReference: 'CONSTRAINT#C-CONFLICT',
  });
  return { source, proof: { targetDof: `${original.nodeId}:${original.dof}`, sameValue: false } };
}

function internalEdgeTraction() {
  const source = clone(patchSource());
  const loadCase = source.loadCases.find((row) => row.loadCaseId === 'TRACTION');
  loadCase.edgeTractions = [{
    tractionId: 'T-INTERNAL',
    elementId: 'E1',
    edgeNodeIds: ['B', 'D'],
    tx: 10,
    ty: 0,
    sourceReference: 'TRACTION#T-INTERNAL',
  }];
  source.resultRequests = { loadCaseIds: ['TRACTION'] };
  return { source, proof: { edgeNodeIds: ['B', 'D'], ownerElementIds: ['E1', 'E2'] } };
}

function disconnectedNode() {
  const source = clone(triangleSource());
  source.nodes.push({ nodeId: 'X', x: 250, y: 250, sourceReference: 'NODE#X' });
  return { source, proof: { addedNodeId: 'X', referencedByElements: false } };
}

function duplicateElementNodeSet() {
  const source = clone(triangleSource());
  source.elements.push({
    ...clone(source.elements[0]),
    elementId: 'E-DUP',
    nodeIds: ['C', 'A', 'B'],
    sourceReference: 'ELEMENT#E-DUP',
  });
  return { source, proof: { firstNodeSet: ['A', 'B', 'C'], duplicatePermutation: ['C', 'A', 'B'] } };
}

function q8Source() {
  return {
    schema: MODEL_SCHEMA,
    modelIdentity: 'BM_S_S4_Q8_MIDSIDE_INVERSION',
    modelVersion: '1',
    sourceAncestry: {
      sourceModelIdentity: 'BM-S-B02',
      sourceVersion: '1',
      adapterIdentity: 'S4_NEGATIVE_FIXTURE',
      adapterVersion: '1',
    },
    units: { length: 'mm', force: 'N', stress: 'MPa', modulus: 'MPa' },
    formulation: 'PLANE_STRESS',
    materials: [{
      materialId: 'MAT', elasticModulus: 200000, poissonRatio: 0.3, sourceReference: 'MATERIAL#MAT',
    }],
    nodes: [
      node('A', 0, 0), node('B', 100, 0), node('C', 100, 100), node('D', 0, 100),
      node('E', 50, 0), node('F', 100, 50), node('G', 50, 100), node('H', 0, 50),
    ],
    elements: [{
      elementId: 'E1', elementType: 'Q8', nodeIds: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
      materialId: 'MAT', thickness: 10, sourceReference: 'ELEMENT#E1',
    }],
    elementTypePolicy: { allowT3Fallback: false, sourceReference: 'S4_Q8_NEGATIVE' },
    constraints: [
      constraint('C1', 'A', 'UX'), constraint('C2', 'A', 'UY'), constraint('C3', 'B', 'UY'),
    ],
    loadCases: [{
      loadCaseId: 'NONE', nodalForces: [], edgeTractions: [], pressureLoads: [], bodyForces: [],
      temperatureLoads: [], imposedDisplacements: [], sourceReference: 'CASE#NONE',
    }],
    resultRequests: { loadCaseIds: ['NONE'] },
    qualificationProfile: structuredClone(QUALIFICATION_PROFILE),
    limitations: [],
  };
}

function failedFixtureResult(expected, error) {
  return {
    negativeCaseId: expected.negativeCaseId,
    mutation: expected.mutation,
    expected: {
      boundary: expected.expectedBoundary,
      qualificationState: expected.expectedQualificationState,
      errorCode: expected.expectedErrorCode,
    },
    observed: {
      actualBoundary: 'benchmark-fixture',
      actualQualificationState: error?.state ?? 'NUMERICAL_FAILURE',
      actualErrorCode: error?.code ?? 'UNEXPECTED_ERROR',
      actualPath: error?.path ?? 'fixture',
      message: String(error?.message ?? error),
    },
    fixtureProof: null,
    checks: { boundary: false, qualificationState: false, errorCode: false, structuredPath: false },
    status: 'FAIL',
  };
}

function nodeById(source, nodeId) {
  const row = source.nodes.find((nodeRow) => nodeRow.nodeId === nodeId);
  assert.ok(row, `missing node ${nodeId}`);
  return row;
}
function node(nodeId, x, y) { return { nodeId, x, y, sourceReference: `NODE#${nodeId}` }; }
function constraint(constraintId, nodeId, dof) {
  return { constraintId, nodeId, dof, value: 0, sourceReference: `CONSTRAINT#${constraintId}` };
}
