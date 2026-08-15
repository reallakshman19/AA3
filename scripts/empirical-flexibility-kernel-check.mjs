import assert from 'node:assert/strict';
import {
  assembleUnitForceFlexibilityMatrix,
  calculatePrismaticVirtualWorkContribution,
  integrateLinearEndFieldProduct,
} from '../src/core/empirical-piping-mechanics/index.js';

const L = 4.2;
const E = 205e9;
const G = 79e9;
const A = 0.0064;
const IY = 8.2e-6;
const IZ = 1.17e-5;
const J = 1.64e-5;

const properties = {
  elasticModulusPa: E,
  shearModulusPa: G,
  areaM2: A,
  secondMomentYM4: IY,
  secondMomentZM4: IZ,
  torsionConstantM4: J,
};

const zero = () => ({ i: 0, j: 0 });
const action = (overrides = {}) => ({
  axialN: zero(),
  bendingMomentYNm: zero(),
  bendingMomentZNm: zero(),
  torsionNm: zero(),
  ...overrides,
});

function close(actual, expected, label) {
  const tolerance = Math.max(1e-15, Math.abs(expected) * 1e-12);
  const error = Math.abs(actual - expected);
  assert(
    error <= tolerance,
    `${label}: actual=${actual}, expected=${expected}, error=${error}, tolerance=${tolerance}`,
  );
}

close(
  integrateLinearEndFieldProduct({
    lengthM: L,
    fieldA: { i: 1, j: 0 },
    fieldB: { i: 1, j: 0 },
  }),
  L / 3,
  'linear product exact integral',
);

const axial = calculatePrismaticVirtualWorkContribution({
  segmentId: 'AXIAL',
  lengthM: L,
  properties,
  actionA: action({ axialN: { i: 1, j: 1 } }),
  actionB: action({ axialN: { i: 1, j: 1 } }),
});
close(axial.total, L / (E * A), 'axial bar L/EA');

const torsion = calculatePrismaticVirtualWorkContribution({
  segmentId: 'TORSION',
  lengthM: L,
  properties,
  actionA: action({ torsionNm: { i: 1, j: 1 } }),
  actionB: action({ torsionNm: { i: 1, j: 1 } }),
});
close(torsion.total, L / (G * J), 'torsional member L/GJ');

const tipForceY = action({ bendingMomentYNm: { i: L, j: 0 } });
const cantileverTipForceY = calculatePrismaticVirtualWorkContribution({
  segmentId: 'CANTILEVER-FORCE-Y',
  lengthM: L,
  properties,
  actionA: tipForceY,
  actionB: tipForceY,
});
close(
  cantileverTipForceY.total,
  (L ** 3) / (3 * E * IY),
  'cantilever second-axis tip-force L^3/(3EIy)',
);

const tipForce = action({ bendingMomentZNm: { i: L, j: 0 } });
const tipMoment = action({ bendingMomentZNm: { i: 1, j: 1 } });

const cantileverTipForce = calculatePrismaticVirtualWorkContribution({
  segmentId: 'CANTILEVER-FORCE-Z',
  lengthM: L,
  properties,
  actionA: tipForce,
  actionB: tipForce,
});
close(
  cantileverTipForce.total,
  (L ** 3) / (3 * E * IZ),
  'cantilever tip-force L^3/(3EIz)',
);

const cantileverTipMoment = calculatePrismaticVirtualWorkContribution({
  segmentId: 'CANTILEVER-MOMENT',
  lengthM: L,
  properties,
  actionA: tipMoment,
  actionB: tipMoment,
});
close(
  cantileverTipMoment.total,
  L / (E * IZ),
  'cantilever tip-moment L/EIz',
);

const crossForceMoment = calculatePrismaticVirtualWorkContribution({
  segmentId: 'CROSS-FM',
  lengthM: L,
  properties,
  actionA: tipForce,
  actionB: tipMoment,
});
const crossMomentForce = calculatePrismaticVirtualWorkContribution({
  segmentId: 'CROSS-MF',
  lengthM: L,
  properties,
  actionA: tipMoment,
  actionB: tipForce,
});
const expectedCross = (L ** 2) / (2 * E * IZ);
close(crossForceMoment.total, expectedCross, 'force/moment L^2/(2EI)');
close(crossMomentForce.total, expectedCross, 'moment/force L^2/(2EI)');
close(crossForceMoment.total, crossMomentForce.total, 'Maxwell-Betti reciprocity');

const matrix = assembleUnitForceFlexibilityMatrix({
  caseIds: ['FX', 'FY'],
  segments: [{
    segmentId: 'S1',
    lengthM: L,
    properties,
    actionByCaseId: {
      FX: action({ axialN: { i: 1, j: 1 } }),
      FY: tipForce,
    },
  }],
  reciprocityTolerance: 1e-15,
});

assert.equal(matrix.unitConvention, 'UNIT_TRANSLATIONAL_FORCE_CASES_SI');
assert.equal(matrix.coefficientUnit, 'm/N');
close(matrix.matrix[0][0], L / (E * A), 'matrix axial diagonal');
close(matrix.matrix[1][1], (L ** 3) / (3 * E * IZ), 'matrix bending diagonal');
assert.equal(matrix.matrix[0][1], 0);
assert.equal(matrix.matrix[1][0], 0);
assert.equal(matrix.reciprocity.satisfied, true);
assert.equal(matrix.reciprocity.maximumResidual, 0);
assert(Object.isFrozen(matrix));

const splitMatrix = assembleUnitForceFlexibilityMatrix({
  caseIds: ['FX'],
  segments: [
    {
      segmentId: 'S1A',
      lengthM: L / 2,
      properties,
      actionByCaseId: {
        FX: action({ axialN: { i: 1, j: 1 } }),
      },
    },
    {
      segmentId: 'S1B',
      lengthM: L / 2,
      properties,
      actionByCaseId: {
        FX: action({ axialN: { i: 1, j: 1 } }),
      },
    },
  ],
});
close(splitMatrix.matrix[0][0], L / (E * A), 'segment additivity');

assert.throws(() => calculatePrismaticVirtualWorkContribution({
  segmentId: 'INVALID-TORSION',
  lengthM: L,
  properties: { ...properties, torsionConstantM4: 0 },
  actionA: action(),
  actionB: action(),
}), /greater than zero/);

assert.throws(() => assembleUnitForceFlexibilityMatrix({
  caseIds: ['FX', 'FX'],
  segments: [{
    segmentId: 'S1',
    lengthM: L,
    properties,
    actionByCaseId: {},
  }],
}), /unique/);

console.log('PASS: empirical flexibility kernel analytical checks');
console.log(JSON.stringify({
  axialFlexibilityMPerN: axial.total,
  torsionalCoefficientRadPerNm: torsion.total,
  cantileverSecondAxisTipForceFlexibilityMPerN: cantileverTipForceY.total,
  cantileverTipForceFlexibilityMPerN: cantileverTipForce.total,
  cantileverTipMomentFlexibilityRadPerNm: cantileverTipMoment.total,
  forceMomentCrossCoefficient: crossForceMoment.total,
  reciprocityResidual: matrix.reciprocity.maximumResidual,
}, null, 2));
