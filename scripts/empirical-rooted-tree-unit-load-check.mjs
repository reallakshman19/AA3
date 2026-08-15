import assert from 'node:assert/strict';
import {
  assembleUnitForceFlexibilityMatrix,
  buildRootedTreeUnitForceActions,
} from '../src/core/empirical-piping-mechanics/index.js';

const E = 200e9;
const G = 80e9;
const A = 0.004;
const I = 8e-6;
const J = 1.2e-5;
const properties = {
  elasticModulusPa: E,
  shearModulusPa: G,
  areaM2: A,
  secondMomentYM4: I,
  secondMomentZM4: I,
  torsionConstantM4: J,
};

const straight = buildRootedTreeUnitForceActions({
  nodes: [
    node('A', 0, 0, 0),
    node('B', 2, 0, 0),
    node('C', 5, 0, 0),
  ],
  segments: [segment('AB', 'A', 'B'), segment('BC', 'B', 'C')],
  rootNodeId: 'A',
  cases: [
    unitCase('FX', 'C', [1, 0, 0]),
    unitCase('FY', 'C', [0, 1, 0]),
  ],
});
const straightMatrix = flexibility(straight);
close(straightMatrix.matrix[0][0], 5 / (E * A), 'straight split axial flexibility');
close(
  straightMatrix.matrix[1][1],
  (5 ** 3) / (3 * E * I),
  'straight split cantilever bending flexibility',
);
close(straightMatrix.matrix[0][1], 0, 'straight axial/bending coupling');
assert.equal(straightMatrix.reciprocity.satisfied, true);

const L1 = 3;
const L2 = 2;
const lRoute = buildRootedTreeUnitForceActions({
  nodes: [
    node('A', 0, 0, 0),
    node('B', L1, 0, 0),
    node('C', L1, L2, 0),
  ],
  segments: [segment('AB', 'A', 'B'), segment('BC', 'B', 'C')],
  rootNodeId: 'A',
  cases: [
    unitCase('FX', 'C', [1, 0, 0]),
    unitCase('FY', 'C', [0, 1, 0]),
    unitCase('FZ', 'C', [0, 0, 1]),
  ],
});
const lMatrix = flexibility(lRoute);
const expectedXX = (
  L1 / (E * A)
  + (L1 * (L2 ** 2)) / (E * I)
  + (L2 ** 3) / (3 * E * I)
);
const expectedYY = (L1 ** 3) / (3 * E * I) + L2 / (E * A);
const expectedXY = -(L2 * (L1 ** 2)) / (2 * E * I);
const expectedZZ = (
  (L1 ** 3) / (3 * E * I)
  + (L1 * (L2 ** 2)) / (G * J)
  + (L2 ** 3) / (3 * E * I)
);
close(lMatrix.matrix[0][0], expectedXX, 'L-route +X flexibility');
close(lMatrix.matrix[1][1], expectedYY, 'L-route +Y flexibility');
close(lMatrix.matrix[0][1], expectedXY, 'L-route XY cross-flexibility');
close(lMatrix.matrix[1][0], expectedXY, 'L-route Maxwell-Betti reverse cross-flexibility');
close(lMatrix.matrix[2][2], expectedZZ, 'L-route out-of-plane bending plus torsion');
assert.equal(lMatrix.reciprocity.satisfied, true);

const ab = lRoute.segments.find((row) => row.segmentId === 'AB');
assert(ab);
close(ab.actionByCaseId.FZ.torsionNm.i, -L2, 'L-route root leg torsion at I');
close(ab.actionByCaseId.FZ.torsionNm.j, -L2, 'L-route root leg torsion at J');
assert.equal(ab.axes.handedness, 'RIGHT_HANDED_X_CROSS_Y_EQUALS_Z');

const branch = buildRootedTreeUnitForceActions({
  nodes: [
    node('A', 0, 0, 0),
    node('B', 1, 0, 0),
    node('C', 2, 0, 0),
    node('D', 1, 1, 0),
  ],
  segments: [
    segment('AB', 'A', 'B'),
    segment('BC', 'B', 'C'),
    segment('BD', 'B', 'D'),
  ],
  rootNodeId: 'A',
  cases: [
    unitCase('CX', 'C', [1, 0, 0]),
    unitCase('DY', 'D', [0, 1, 0]),
  ],
});
assert.deepEqual(
  branch.segments.find((row) => row.segmentId === 'BD').actionByCaseId.CX,
  zeroAction(),
  'load on C must not create action on sibling branch BD',
);
assert.deepEqual(
  branch.segments.find((row) => row.segmentId === 'BC').actionByCaseId.DY,
  zeroAction(),
  'load on D must not create action on sibling branch BC',
);
const branchMatrix = flexibility(branch);
assert.equal(branchMatrix.reciprocity.satisfied, true);

assert.throws(() => buildRootedTreeUnitForceActions({
  nodes: [node('A', 0, 0, 0), node('B', 1, 0, 0), node('C', 0, 1, 0)],
  segments: [segment('AB', 'A', 'B'), segment('BC', 'B', 'C'), segment('CA', 'C', 'A')],
  rootNodeId: 'A',
  cases: [unitCase('F', 'B', [1, 0, 0])],
}), /tree/);
assert.throws(() => buildRootedTreeUnitForceActions({
  nodes: [node('A', 0, 0, 0), node('B', 1, 0, 0)],
  segments: [segment('AB', 'A', 'B')],
  rootNodeId: 'A',
  cases: [unitCase('F', 'B', [2, 0, 0])],
}), /unit vector/);
assert.throws(() => buildRootedTreeUnitForceActions({
  nodes: [node('A', 0, 0, 0), node('B', 1, 0, 0)],
  segments: [segment('AB', 'A', 'B')],
  rootNodeId: 'A',
  cases: [unitCase('F', 'A', [1, 0, 0])],
}), /fixed root/);

assert.equal(lRoute.evidence.internalActionsAcceptedFromCaller, false);
assert.equal(lRoute.evidence.unitLoadMagnitudeN, 1);
console.log('PASS: rooted-tree unit-load action analytical route checks');
console.log(JSON.stringify({
  straightMatrix: straightMatrix.matrix,
  lRouteMatrix: lMatrix.matrix,
  branchMatrix: branchMatrix.matrix,
  rootLegOutOfPlaneTorsionNm: ab.actionByCaseId.FZ.torsionNm,
}, null, 2));

function flexibility(route) {
  return assembleUnitForceFlexibilityMatrix({
    caseIds: route.caseIds,
    segments: route.segments.map((row) => ({
      segmentId: row.segmentId,
      lengthM: row.lengthM,
      properties,
      actionByCaseId: row.actionByCaseId,
    })),
    reciprocityTolerance: 1e-14,
  });
}

function node(id, x, y, z) {
  return { id, pointM: { x, y, z } };
}

function segment(segmentId, nodeAId, nodeBId) {
  return { segmentId, nodeAId, nodeBId };
}

function unitCase(caseId, nodeId, direction) {
  return { caseId, nodeId, direction };
}

function zeroAction() {
  return {
    axialN: { i: 0, j: 0 },
    bendingMomentYNm: { i: 0, j: 0 },
    bendingMomentZNm: { i: 0, j: 0 },
    torsionNm: { i: 0, j: 0 },
  };
}

function close(actual, expected, label) {
  const tolerance = Math.max(1e-14, Math.abs(expected) * 1e-11);
  assert(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}, tolerance ${tolerance}`,
  );
}
