import assert from 'node:assert/strict';
import {
  buildRootedTreeThermalReferenceDisplacements,
  solveRootedTreeThermalRestraintCompatibility,
} from '../src/core/empirical-piping-mechanics/index.js';

const close = (actual, expected, tolerance = 1e-10) => {
  const scale = Math.max(1, Math.abs(expected));
  assert.ok(
    Math.abs(actual - expected) <= tolerance * scale,
    `Expected ${expected}, received ${actual}`,
  );
};

const thermal = (
  referenceTemperatureC,
  analysisTemperatureC,
  expansionCoefficientPerK,
  coefficientBasis = 'APPROVED_MEAN_BETWEEN_REFERENCE_AND_ANALYSIS',
) => ({
  referenceTemperatureC,
  analysisTemperatureC,
  expansionCoefficientPerK,
  coefficientBasis,
});

const properties = {
  elasticModulusPa: 200e9,
  shearModulusPa: 80e9,
  areaM2: 0.004,
  secondMomentYM4: 8e-6,
  secondMomentZM4: 8e-6,
  torsionConstantM4: 1.2e-5,
};

const straight = solveRootedTreeThermalRestraintCompatibility({
  nodes: [
    { id: 'A', pointM: { x: 0, y: 0, z: 0 } },
    { id: 'B', pointM: { x: 10, y: 0, z: 0 } },
  ],
  segments: [{
    segmentId: 'AB',
    nodeAId: 'A',
    nodeBId: 'B',
    properties,
    thermal: thermal(20, 120, 12e-6),
  }],
  rootNodeId: 'A',
  coordinates: [{
    coordinateId: 'BX',
    nodeId: 'B',
    direction: [1, 0, 0],
    targetDisplacementM: 0,
    supportStiffnessNPerM: null,
  }],
  options: {},
});
close(straight.thermalReference.rows[0].referenceDisplacementM, 0.012);
close(straight.compatibility.compatibility.rows[0].reactionN, -960000);
assert.equal(straight.evidence.finiteElementRouteUsed, false);
assert.equal(straight.evidence.globalNodalStiffnessMatrixAssembled, false);

const lRouteReference = buildRootedTreeThermalReferenceDisplacements({
  nodes: [
    { id: 'A', pointM: { x: 0, y: 0, z: 0 } },
    { id: 'B', pointM: { x: 3, y: 0, z: 0 } },
    { id: 'C', pointM: { x: 3, y: 2, z: 0 } },
  ],
  segments: [
    {
      segmentId: 'AB',
      nodeAId: 'A',
      nodeBId: 'B',
      thermal: thermal(20, 120, 1e-5),
    },
    {
      segmentId: 'BC',
      nodeAId: 'B',
      nodeBId: 'C',
      thermal: thermal(20, 120, 1e-5, 'CONSTANT_OVER_TEMPERATURE_RANGE'),
    },
  ],
  rootNodeId: 'A',
  coordinates: [
    { coordinateId: 'CX', nodeId: 'C', direction: [1, 0, 0] },
    { coordinateId: 'CY', nodeId: 'C', direction: [0, 1, 0] },
  ],
});
const lById = Object.fromEntries(lRouteReference.rows.map((row) => [row.coordinateId, row]));
close(lById.CX.referenceDisplacementM, 0.003);
close(lById.CY.referenceDisplacementM, 0.002);
close(lById.CX.displacementVectorM[0], 0.003);
close(lById.CX.displacementVectorM[1], 0.002);

const branch = buildRootedTreeThermalReferenceDisplacements({
  nodes: [
    { id: 'A', pointM: { x: 0, y: 0, z: 0 } },
    { id: 'B', pointM: { x: 1, y: 0, z: 0 } },
    { id: 'C', pointM: { x: 2, y: 0, z: 0 } },
    { id: 'D', pointM: { x: 1, y: 1, z: 0 } },
  ],
  segments: [
    { segmentId: 'AB', nodeAId: 'A', nodeBId: 'B', thermal: thermal(0, 100, 1e-5) },
    { segmentId: 'BC', nodeAId: 'B', nodeBId: 'C', thermal: thermal(0, 200, 1e-5) },
    { segmentId: 'BD', nodeAId: 'B', nodeBId: 'D', thermal: thermal(0, 500, 1e-5) },
  ],
  rootNodeId: 'A',
  coordinates: [
    { coordinateId: 'CX', nodeId: 'C', direction: [1, 0, 0] },
    { coordinateId: 'DY', nodeId: 'D', direction: [0, 1, 0] },
  ],
});
const branchById = Object.fromEntries(branch.rows.map((row) => [row.coordinateId, row]));
close(branchById.CX.referenceDisplacementM, 0.003);
close(branchById.DY.referenceDisplacementM, 0.005);

const cooling = buildRootedTreeThermalReferenceDisplacements({
  nodes: [
    { id: 'A', pointM: { x: 0, y: 0, z: 0 } },
    { id: 'B', pointM: { x: 2, y: 0, z: 0 } },
  ],
  segments: [{
    segmentId: 'AB',
    nodeAId: 'A',
    nodeBId: 'B',
    thermal: thermal(120, 20, 12e-6),
  }],
  rootNodeId: 'A',
  coordinates: [{ coordinateId: 'BX', nodeId: 'B', direction: [1, 0, 0] }],
});
close(cooling.rows[0].referenceDisplacementM, -0.0024);

assert.throws(
  () => buildRootedTreeThermalReferenceDisplacements({
    nodes: [
      { id: 'A', pointM: { x: 0, y: 0, z: 0 } },
      { id: 'B', pointM: { x: 1, y: 0, z: 0 } },
    ],
    segments: [{
      segmentId: 'AB',
      nodeAId: 'A',
      nodeBId: 'B',
      thermal: { ...thermal(0, 100, 1e-5), thermalForceN: 1000 },
    }],
    rootNodeId: 'A',
    coordinates: [{ coordinateId: 'BX', nodeId: 'B', direction: [1, 0, 0] }],
  }),
  /unexpected or missing keys/,
);

assert.throws(
  () => buildRootedTreeThermalReferenceDisplacements({
    nodes: [
      { id: 'A', pointM: { x: 0, y: 0, z: 0 } },
      { id: 'B', pointM: { x: 1, y: 0, z: 0 } },
    ],
    segments: [{
      segmentId: 'AB',
      nodeAId: 'A',
      nodeBId: 'B',
      thermal: thermal(0, 100, 1e-5, 'GUESSED_CTE'),
    }],
    rootNodeId: 'A',
    coordinates: [{ coordinateId: 'BX', nodeId: 'B', direction: [1, 0, 0] }],
  }),
  /outside the qualified thermal basis set/,
);

console.log('PASS: empirical rooted-tree thermal compatibility checks');
