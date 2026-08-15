import assert from 'node:assert/strict';
import {
  bMatrix,
  buildElementEvidence,
  constitutiveEvidence,
  createCanonicalLocalContinuumModel,
  FORMULATIONS,
} from '../src/core/local-continuum/index.js';
import { matrixVector } from '../src/core/local-continuum/matrix.js';
import { clone, triangleSource } from './lafea.3-fixtures.mjs';

const model = createCanonicalLocalContinuumModel(triangleSource());
const element = buildElementEvidence(model)[0];
const nodes = model.nodes;
const affine = nodes.flatMap((node) => [
  2 + 0.01 * node.x + 0.02 * node.y,
  -3 + 0.03 * node.x - 0.04 * node.y,
]);
closeVector(matrixVector(element.bMatrix, affine), [0.01, -0.04, 0.05]);
const translation = nodes.flatMap(() => [2, -3]);
closeVector(matrixVector(element.bMatrix, translation), [0, 0, 0]);
const rotation = nodes.flatMap((node) => [-0.001 * node.y, 0.001 * node.x]);
closeVector(matrixVector(element.bMatrix, rotation), [0, 0, 0]);

const clockwise = createCanonicalLocalContinuumModel(triangleSource({ clockwise: true }));
assert.equal(clockwise.semanticHash, model.semanticHash);
assert.deepEqual(buildElementEvidence(clockwise)[0], element);
assert.equal(element.stiffnessSymmetry.accepted, true);
assert.equal(element.constitutiveSymmetry.accepted, true);

const doubleE = buildElementEvidence(createCanonicalLocalContinuumModel(
  triangleSource({ elasticModulus: 400000 }),
))[0];
const doubleT = buildElementEvidence(createCanonicalLocalContinuumModel(
  triangleSource({ thickness: 20 }),
))[0];
close(doubleE.localStiffnessMatrix[0][0], 2 * element.localStiffnessMatrix[0][0]);
close(doubleT.localStiffnessMatrix[0][0], 2 * element.localStiffnessMatrix[0][0]);

const material = model.materials[0];
const stress = constitutiveEvidence(
  material,
  FORMULATIONS.PLANE_STRESS,
  model.qualificationProfile,
).matrix;
const strain = constitutiveEvidence(
  material,
  FORMULATIONS.PLANE_STRAIN,
  model.qualificationProfile,
).matrix;
close(stress[0][0], 200000 / (1 - 0.3 ** 2));
close(stress[0][1], stress[0][0] * 0.3);
close(strain[0][0], 200000 * (1 - 0.3) / ((1 + 0.3) * (1 - 0.6)));
close(strain[0][1], 200000 * 0.3 / ((1 + 0.3) * (1 - 0.6)));

assert.throws(() => createCanonicalLocalContinuumModel({
  ...clone(triangleSource()),
  elements: [{ ...triangleSource().elements[0], nodeIds: ['A', 'B', 'B'] }],
}));

checkPointOnlyConnectionRejected();
checkNonManifoldEdgeRejected();
checkQuadraticMidsideMismatchRejected();

console.log('LAFEA.3 affine, rigid-body, orientation, symmetry, scaling, constitutive and conforming-manifold topology benchmarks passed.');

function checkPointOnlyConnectionRejected() {
  const source = triangleSource();
  source.nodes.push(
    node('D', 200, 100),
    node('E', 100, 200),
  );
  source.elements.push(t3('E2', ['C', 'D', 'E']));
  assert.throws(
    () => createCanonicalLocalContinuumModel(source),
    (error) => error?.code === 'DISCONNECTED_MESH_COMPONENT',
  );
}

function checkNonManifoldEdgeRejected() {
  const source = triangleSource();
  source.nodes.push(
    node('D', 0, -100),
    node('E', 100, 100),
  );
  source.elements = [
    t3('E1', ['A', 'B', 'C']),
    t3('E2', ['A', 'D', 'B']),
    t3('E3', ['A', 'B', 'E']),
  ];
  assert.throws(
    () => createCanonicalLocalContinuumModel(source),
    (error) => error?.code === 'NON_MANIFOLD_CONTINUUM_EDGE',
  );
}

function checkQuadraticMidsideMismatchRejected() {
  const source = triangleSource();
  source.nodes = [
    node('A', 0, 0),
    node('B', 100, 0),
    node('C', 0, 100),
    node('G', 100, 100),
    node('D', 50, 0),
    node('E', 50, 50),
    node('F', 0, 50),
    node('H', 100, 50),
    node('I', 50, 100),
    node('J', 55, 45),
  ];
  source.elements = [
    t6('E1', ['A', 'B', 'C', 'D', 'E', 'F']),
    t6('E2', ['B', 'G', 'C', 'H', 'I', 'J']),
  ];
  source.elementTypePolicy = { allowT3Fallback: false, sourceReference: 'T6_ONLY' };
  assert.throws(
    () => createCanonicalLocalContinuumModel(source),
    (error) => error?.code === 'NONCONFORMING_SHARED_EDGE',
  );
}

function t3(elementId, nodeIds) {
  return {
    elementId,
    elementType: 'T3',
    nodeIds,
    materialId: 'MAT',
    thickness: 10,
    sourceReference: `ELEMENT#${elementId}`,
  };
}
function t6(elementId, nodeIds) {
  return {
    elementId,
    elementType: 'T6',
    nodeIds,
    materialId: 'MAT',
    thickness: 10,
    sourceReference: `ELEMENT#${elementId}`,
  };
}
function node(nodeId, x, y) {
  return { nodeId, x, y, sourceReference: `NODE#${nodeId}` };
}
function close(actual, expected) {
  assert.ok(
    Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)),
    `${actual} != ${expected}`,
  );
}
function closeVector(actual, expected) {
  actual.forEach((value, index) => close(value, expected[index]));
}
