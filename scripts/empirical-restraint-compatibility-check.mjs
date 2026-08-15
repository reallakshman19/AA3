import assert from 'node:assert/strict';
import {
  solveLinearRestraintCompatibility,
  solveRootedTreeRestraintCompatibility,
} from '../src/core/empirical-piping-mechanics/index.js';

const E = 200e9;
const G = 80e9;
const A = 0.004;
const I = 8e-6;
const J = 1.2e-5;
const L1 = 3;
const L2 = 2;
const properties = {
  elasticModulusPa: E,
  shearModulusPa: G,
  areaM2: A,
  secondMomentYM4: I,
  secondMomentZM4: I,
  torsionConstantM4: J,
};

function close(actual, expected, label, relativeTolerance = 1e-10, absoluteTolerance = 1e-12) {
  const tolerance = Math.max(absoluteTolerance, Math.abs(expected) * relativeTolerance);
  assert(
    Math.abs(actual - expected) <= tolerance,
    `${label}: actual=${actual}, expected=${expected}, tolerance=${tolerance}`,
  );
}

function multiply(matrix, vector) {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + (value * vector[index]), 0));
}

const axialFlexibility = 5 / (E * A);
const axialReferenceMovement = 0.004;
let result = solveLinearRestraintCompatibility({
  flexibilityMatrixMPerN: [[axialFlexibility]],
  coordinates: [{
    coordinateId: 'AXIAL',
    referenceDisplacementM: axialReferenceMovement,
    targetDisplacementM: 0,
    supportStiffnessNPerM: null,
  }],
  options: {},
});
close(result.rows[0].reactionN, -axialReferenceMovement / axialFlexibility, 'rigid axial reaction', 1e-12, 1e-6);
close(result.rows[0].pipeDisplacementM, 0, 'rigid axial compatibility');
assert.equal(result.compatibility.satisfied, true);
assert.equal(result.energy.satisfied, true);

const supportStiffness = 1e8;
result = solveLinearRestraintCompatibility({
  flexibilityMatrixMPerN: [[axialFlexibility]],
  coordinates: [{
    coordinateId: 'AXIAL',
    referenceDisplacementM: axialReferenceMovement,
    targetDisplacementM: 0,
    supportStiffnessNPerM: supportStiffness,
  }],
  options: {},
});
close(
  result.rows[0].reactionN,
  -axialReferenceMovement / (axialFlexibility + (1 / supportStiffness)),
  'finite support reaction',
  1e-12,
  1e-6,
);
close(
  result.rows[0].pipeDisplacementM + result.rows[0].supportDeformationM,
  0,
  'finite support compatibility',
);

const expectedLRouteFlexibility = [
  [
    (L1 / (E * A)) + (L1 * (L2 ** 2) / (E * I)) + ((L2 ** 3) / (3 * E * I)),
    -(L2 * (L1 ** 2) / (2 * E * I)),
    0,
  ],
  [
    -(L2 * (L1 ** 2) / (2 * E * I)),
    ((L1 ** 3) / (3 * E * I)) + (L2 / (E * A)),
    0,
  ],
  [
    0,
    0,
    ((L1 ** 3) / (3 * E * I))
      + (L1 * (L2 ** 2) / (G * J))
      + ((L2 ** 3) / (3 * E * I)),
  ],
];
const imposedReferenceLoadsN = [900, -300, 725];
const referenceDisplacementM = multiply(expectedLRouteFlexibility, imposedReferenceLoadsN);
const route = solveRootedTreeRestraintCompatibility({
  nodes: [
    { id: 'ROOT', pointM: { x: 0, y: 0, z: 0 } },
    { id: 'ELBOW', pointM: { x: L1, y: 0, z: 0 } },
    { id: 'TIP', pointM: { x: L1, y: L2, z: 0 } },
  ],
  segments: [
    { segmentId: 'S1', nodeAId: 'ROOT', nodeBId: 'ELBOW', properties },
    { segmentId: 'S2', nodeAId: 'ELBOW', nodeBId: 'TIP', properties },
  ],
  rootNodeId: 'ROOT',
  coordinates: [
    { coordinateId: 'FX', nodeId: 'TIP', direction: [1, 0, 0], referenceDisplacementM: referenceDisplacementM[0], targetDisplacementM: 0, supportStiffnessNPerM: null },
    { coordinateId: 'FY', nodeId: 'TIP', direction: [0, 1, 0], referenceDisplacementM: referenceDisplacementM[1], targetDisplacementM: 0, supportStiffnessNPerM: null },
    { coordinateId: 'FZ', nodeId: 'TIP', direction: [0, 0, 1], referenceDisplacementM: referenceDisplacementM[2], targetDisplacementM: 0, supportStiffnessNPerM: null },
  ],
  options: {},
});
for (let row = 0; row < 3; row += 1) {
  for (let column = 0; column < 3; column += 1) {
    close(
      route.flexibility.matrix[row][column],
      expectedLRouteFlexibility[row][column],
      `L-route flexibility [${row},${column}]`,
      1e-11,
      1e-14,
    );
  }
  close(
    route.compatibility.rows[row].reactionN,
    -imposedReferenceLoadsN[row],
    `L-route redundant reaction ${row}`,
    1e-10,
    1e-6,
  );
}
assert.equal(route.compatibility.compatibility.satisfied, true);
assert.equal(route.compatibility.energy.satisfied, true);
assert.equal(route.evidence.empiricalResponseMultipliersConsumed, false);
assert.equal(route.evidence.contactOrGapSolved, false);

const F2 = expectedLRouteFlexibility.slice(0, 2).map((row) => row.slice(0, 2));
const target = [0.0012, -0.0004];
const determinant = (F2[0][0] * F2[1][1]) - (F2[0][1] * F2[1][0]);
const expectedSettlementReaction = [
  ((target[0] * F2[1][1]) - (F2[0][1] * target[1])) / determinant,
  ((F2[0][0] * target[1]) - (target[0] * F2[1][0])) / determinant,
];
result = solveLinearRestraintCompatibility({
  flexibilityMatrixMPerN: F2,
  coordinates: [
    { coordinateId: 'FX', referenceDisplacementM: 0, targetDisplacementM: target[0], supportStiffnessNPerM: null },
    { coordinateId: 'FY', referenceDisplacementM: 0, targetDisplacementM: target[1], supportStiffnessNPerM: null },
  ],
  options: {},
});
expectedSettlementReaction.forEach((expected, index) => close(
  result.rows[index].reactionN,
  expected,
  `settlement reaction ${index}`,
  1e-10,
  1e-6,
));

assert.throws(() => solveLinearRestraintCompatibility({
  flexibilityMatrixMPerN: [[1e-5, 1e-6], [2e-6, 1e-5]],
  coordinates: [
    { coordinateId: 'A', referenceDisplacementM: 0, targetDisplacementM: 0, supportStiffnessNPerM: null },
    { coordinateId: 'B', referenceDisplacementM: 0, targetDisplacementM: 0, supportStiffnessNPerM: null },
  ],
  options: {},
}), /reciprocity/);
assert.throws(() => solveLinearRestraintCompatibility({
  flexibilityMatrixMPerN: [[axialFlexibility, axialFlexibility], [axialFlexibility, axialFlexibility]],
  coordinates: [
    { coordinateId: 'A', referenceDisplacementM: 0, targetDisplacementM: 0, supportStiffnessNPerM: null },
    { coordinateId: 'B', referenceDisplacementM: 0, targetDisplacementM: 0, supportStiffnessNPerM: null },
  ],
  options: {},
}), /positive definite/);
assert.throws(() => solveLinearRestraintCompatibility({
  flexibilityMatrixMPerN: [[axialFlexibility]],
  coordinates: [{ coordinateId: 'A', referenceDisplacementM: 0, targetDisplacementM: 0, supportStiffnessNPerM: -1 }],
  options: {},
}), /greater than zero/);
assert.throws(() => solveLinearRestraintCompatibility({
  flexibilityMatrixMPerN: [[axialFlexibility]],
  coordinates: [{ coordinateId: 'A', referenceDisplacementM: 0, targetDisplacementM: 0, supportStiffnessNPerM: null, gapM: 0.003 }],
  options: {},
}), /unexpected or missing keys/);
assert.throws(() => solveRootedTreeRestraintCompatibility({
  nodes: [
    { id: 'ROOT', pointM: { x: 0, y: 0, z: 0 } },
    { id: 'TIP', pointM: { x: 1, y: 0, z: 0 } },
  ],
  segments: [{
    segmentId: 'NON_AXISYMMETRIC',
    nodeAId: 'ROOT',
    nodeBId: 'TIP',
    properties: { ...properties, secondMomentZM4: I * 2 },
  }],
  rootNodeId: 'ROOT',
  coordinates: [{ coordinateId: 'FY', nodeId: 'TIP', direction: [0, 1, 0], referenceDisplacementM: 0, targetDisplacementM: 0, supportStiffnessNPerM: null }],
  options: {},
}), /axisymmetric/);

console.log('empirical-restraint-compatibility-check: PASS');
console.log(JSON.stringify({
  rigidAxialReactionN: -axialReferenceMovement / axialFlexibility,
  finiteSupportReactionN: -axialReferenceMovement / (axialFlexibility + (1 / supportStiffness)),
  lRouteFlexibility: expectedLRouteFlexibility,
  lRouteExpectedRedundantReactionsN: imposedReferenceLoadsN.map((value) => -value),
}, null, 2));
