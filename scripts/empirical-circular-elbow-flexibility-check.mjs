import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  assembleRootedTreeComponentFlexibility,
  buildCircularElbowThermalEndTranslation,
  buildCircularElbowUnitLoadAction,
  calculateCircularElbowVirtualWorkContribution,
  createEmpiricalElbowFlexibilityAuthority,
  normalizeCircularElbowGeometry,
  reverseCircularElbowGeometry,
  solveRootedTreeComponentThermalCompatibility,
} from '../src/core/empirical-piping-mechanics/index.js';
import {
  buildEmpiricalElbowFlexibilityAuthorityFromB31J,
} from '../src/workspace/engineering-loads/adapters/b31j-elbow-to-empirical-flexibility.js';

const PI = Math.PI;
const R = 1.2;
const E = 200e9;
const G = 76.923076923e9;
const A = 0.004;
const I = 8e-6;
const J = 1.6e-5;
const K = 2.5;
const EPS = 1e-3;

const properties = Object.freeze({
  elasticModulusPa: E,
  shearModulusPa: G,
  areaM2: A,
  secondMomentYM4: I,
  secondMomentZM4: I,
  torsionConstantM4: J,
});
const thermal = Object.freeze({
  referenceTemperatureC: 20,
  analysisTemperatureC: 120,
  expansionCoefficientPerK: 1e-5,
  coefficientBasis: 'CONSTANT_OVER_TEMPERATURE_RANGE',
});
const geometryInput = Object.freeze({
  componentId: 'ELBOW-1',
  startPointM: { x: 0, y: 0, z: 0 },
  endPointM: { x: R, y: R, z: 0 },
  centerPointM: { x: 0, y: R, z: 0 },
  planeNormal: [0, 0, 1],
});
const geometry = normalizeCircularElbowGeometry(geometryInput);
const authority = createEmpiricalElbowFlexibilityAuthority({
  schema: 'empirical-elbow-flexibility-authority/v1',
  authorityId: 'AUTH-ELBOW-1',
  componentId: 'ELBOW-1',
  basis: 'CODE_COMPONENT_FLEXIBILITY',
  inPlaneFlexibilityFactor: K,
  outOfPlaneFlexibilityFactor: K,
  torsionalFlexibilityFactor: 1,
  source: {
    standard: 'ASME_B31J',
    edition: '2023',
    ruleId: 'INDEPENDENT-QUALIFICATION-K',
    sourceSemanticHash: 'fnv1a64:1111111111111111',
    factorResultSemanticHash: 'fnv1a64:2222222222222222',
  },
  geometryBinding: {
    bendRadiusM: R,
    outerDiameterM: 0.2191,
    wallThicknessM: 0.01509,
    pressurePa: 0,
    elasticModulusPa: E,
  },
});
const tip = geometry.endPointM;
const caseX = unitCase('UX', tip, [1, 0, 0]);
const caseY = unitCase('UY', tip, [0, 1, 0]);
const caseZ = unitCase('UZ', tip, [0, 0, 1]);

// A. Exact circular-arc geometry.
approx(geometry.radiusM, R, 1e-14, 'radius');
approx(geometry.includedAngleRad, PI / 2, 1e-14, 'included angle');
approx(geometry.arcLengthM, R * PI / 2, 1e-14, 'arc length');
assert.equal(geometry.evidence.segmentedBeamApproximationUsed, false);
assert.deepEqual(reverseCircularElbowGeometry(reverseCircularElbowGeometry(geometry)).semanticHash, geometry.semanticHash);

// B. Pointwise force/moment transport sign convention.
const xAtStart = buildCircularElbowUnitLoadAction({ geometry, loadCase: caseX, thetaRad: 0 });
approx(xAtStart.axialN, -1, 1e-14, 'x case axial at start');
approx(xAtStart.inPlaneBendingMomentNm, R, 1e-14, 'x case start bend moment');
const yAtStart = buildCircularElbowUnitLoadAction({ geometry, loadCase: caseY, thetaRad: 0 });
approx(yAtStart.axialN, 0, 1e-14, 'y case axial at start');
approx(yAtStart.inPlaneBendingMomentNm, -R, 1e-14, 'y case start bend moment');

// C. Independent closed-form quarter-circle compliance oracles.
const expectedFxx = R * (PI / 4) / (E * A)
  + K * R ** 3 * (PI / 4) / (E * I);
const expectedFyy = R * (PI / 4) / (E * A)
  + K * R ** 3 * (3 * PI / 4 - 2) / (E * I);
const expectedFxy = R * 0.5 / (E * A)
  - K * R ** 3 * 0.5 / (E * I);
const expectedFzz = R ** 3 * (
  K * (PI / 4) / (E * I)
  + (3 * PI / 4 - 2) / (G * J)
);
const fxx = elbowContribution(caseX, caseX);
const fyy = elbowContribution(caseY, caseY);
const fxy = elbowContribution(caseX, caseY);
const fyx = elbowContribution(caseY, caseX);
const fzz = elbowContribution(caseZ, caseZ);
approx(fxx.total, expectedFxx, 2e-13, 'quarter-circle fxx');
approx(fyy.total, expectedFyy, 2e-13, 'quarter-circle fyy');
approx(fxy.total, expectedFxy, 2e-13, 'quarter-circle fxy');
approx(fyx.total, expectedFxy, 2e-13, 'quarter-circle fyx reciprocity');
approx(fzz.total, expectedFzz, 2e-13, 'quarter-circle fzz');
approx(fxy.total, fyx.total, 1e-15, 'Maxwell-Betti reciprocity');
for (const result of [fxx, fyy, fxy, fyx, fzz]) {
  assert.equal(result.convergence.satisfied, true);
  assert.equal(result.evidence.segmentedBeamApproximationUsed, false);
  assert.equal(result.evidence.sifConsumedAsFlexibility, false);
  assert.equal(result.evidence.finiteElementRouteUsed, false);
}

// D. k-factor acts only on elbow bending energy.
const unityAuthority = createAuthority({ inPlane: 1, outOfPlane: 1, torsion: 1 });
const unityX = calculateCircularElbowVirtualWorkContribution({
  geometry,
  properties,
  flexibilityAuthority: unityAuthority,
  caseA: caseX,
  caseB: caseX,
});
approx(fxx.terms.axial, unityX.terms.axial, 1e-15, 'k leaves axial flexibility unchanged');
approx(
  fxx.terms.inPlaneBending / unityX.terms.inPlaneBending,
  K,
  2e-13,
  'k multiplies in-plane bending flexibility',
);

// E. Uniform thermal expansion of a curved centerline.
const thermalEnd = buildCircularElbowThermalEndTranslation({
  geometry,
  expansionCoefficientPerK: thermal.expansionCoefficientPerK,
  referenceTemperatureC: thermal.referenceTemperatureC,
  analysisTemperatureC: thermal.analysisTemperatureC,
});
approx(thermalEnd.strain, EPS, 1e-15, 'thermal strain');
approx(thermalEnd.endTranslationM[0], EPS * R, 1e-15, 'thermal chord x');
approx(thermalEnd.endTranslationM[1], EPS * R, 1e-15, 'thermal chord y');
approx(thermalEnd.endTranslationM[2], 0, 1e-15, 'thermal chord z');
approx(thermalEnd.arcLengthExpansionM, EPS * R * PI / 2, 1e-15, 'thermal arc extension');

// F. Mixed-component rooted tree uses the same continuous elbow contribution.
const nodes = [
  { id: 'N0', pointM: geometry.startPointM },
  { id: 'N1', pointM: geometry.endPointM },
];
const elbowComponent = {
  componentId: 'ELBOW-1',
  kind: 'CIRCULAR_ELBOW',
  nodeAId: 'N0',
  nodeBId: 'N1',
  properties,
  thermal,
  geometry,
  flexibilityAuthority: authority,
};
const assembled = assembleRootedTreeComponentFlexibility({
  nodes,
  components: [elbowComponent],
  rootNodeId: 'N0',
  cases: [
    { caseId: 'UX', nodeId: 'N1', direction: [1, 0, 0] },
    { caseId: 'UY', nodeId: 'N1', direction: [0, 1, 0] },
    { caseId: 'UZ', nodeId: 'N1', direction: [0, 0, 1] },
  ],
});
approx(assembled.matrixMPerN[0][0], expectedFxx, 2e-13, 'assembled fxx');
approx(assembled.matrixMPerN[1][1], expectedFyy, 2e-13, 'assembled fyy');
approx(assembled.matrixMPerN[0][1], expectedFxy, 2e-13, 'assembled fxy');
approx(assembled.matrixMPerN[2][2], expectedFzz, 2e-13, 'assembled fzz');
assert.equal(assembled.evidence.globalNodalStiffnessMatrixAssembled, false);
assert.equal(assembled.evidence.finiteElementRouteUsed, false);

// G. Thermal compatibility: independent 2x2 force-method inversion.
const solved = solveRootedTreeComponentThermalCompatibility({
  nodes,
  components: [elbowComponent],
  rootNodeId: 'N0',
  coordinates: [
    { coordinateId: 'UX', nodeId: 'N1', direction: [1, 0, 0], targetDisplacementM: 0, supportStiffnessNPerM: null },
    { coordinateId: 'UY', nodeId: 'N1', direction: [0, 1, 0], targetDisplacementM: 0, supportStiffnessNPerM: null },
  ],
  options: {},
});
const determinant = expectedFxx * expectedFyy - expectedFxy ** 2;
const bx = -EPS * R;
const by = -EPS * R;
const expectedRx = (expectedFyy * bx - expectedFxy * by) / determinant;
const expectedRy = (-expectedFxy * bx + expectedFxx * by) / determinant;
approx(solved.compatibility.rows.find((row) => row.coordinateId === 'UX').reactionN, expectedRx, 2e-10, 'thermal compatibility Rx');
approx(solved.compatibility.rows.find((row) => row.coordinateId === 'UY').reactionN, expectedRy, 2e-10, 'thermal compatibility Ry');
assert.equal(solved.compatibility.compatibility.satisfied, true);
assert.equal(solved.compatibility.energy.satisfied, true);
assert.equal(solved.evidence.directThermalForceInjected, false);

// H. B31J smooth-90 k independently reproduced from h and bridged without SIF reuse.
const D = 0.2191;
const t = 0.01509;
const Rb = 0.3048;
const Eb31 = 184e9;
const b31Arc = normalizeCircularElbowGeometry({
  componentId: 'ELBOW-B31J-1',
  startPointM: { x: 0, y: 0, z: 0 },
  endPointM: { x: Rb, y: Rb, z: 0 },
  centerPointM: { x: 0, y: Rb, z: 0 },
  planeNormal: [0, 0, 1],
});
const b31Request = bendFactorRequest({
  componentId: 'ELBOW-B31J-1',
  bendAngleDegrees: 90,
  smooth90FlexibilityCorrection: true,
  outerDiameter: D,
  wallThickness: t,
  bendRadius: Rb,
  elasticModulus: Eb31,
  pressure: 0,
});
const bridge = buildEmpiricalElbowFlexibilityAuthorityFromB31J({
  authorityId: 'AUTH-B31J-ELBOW-1',
  factorCalculationRequest: b31Request,
  circularElbowGeometry: b31Arc,
});
const rm = (D - t) / 2;
const h = t * Rb / rm ** 2;
const expectedSmooth90K = Math.max(1, 1.3 / h);
approx(bridge.authority.inPlaneFlexibilityFactor, expectedSmooth90K, 2e-13, 'B31J smooth-90 k');
approx(bridge.authority.outOfPlaneFlexibilityFactor, expectedSmooth90K, 2e-13, 'B31J smooth-90 out-of-plane k');
approx(bridge.authority.torsionalFlexibilityFactor, 1, 1e-15, 'B31J torsional k');
assert.equal(bridge.evidence.displacementSifConsumedAsFlexibility, false);
assert.equal(bridge.evidence.sustainedIndexConsumedAsFlexibility, false);

// I. Pressure correction is independently reproduced and remains a k-source effect only.
const pressure = 10e6;
const pressuredBridge = buildEmpiricalElbowFlexibilityAuthorityFromB31J({
  authorityId: 'AUTH-B31J-ELBOW-P',
  factorCalculationRequest: bendFactorRequest({
    componentId: 'ELBOW-B31J-1',
    bendAngleDegrees: 90,
    smooth90FlexibilityCorrection: true,
    outerDiameter: D,
    wallThickness: t,
    bendRadius: Rb,
    elasticModulus: Eb31,
    pressure,
  }),
  circularElbowGeometry: b31Arc,
});
const pressureDenominator = 1
  + 6 * (pressure / Eb31) * (rm / t) ** (7 / 3) * (Rb / rm) ** (1 / 3);
approx(
  pressuredBridge.authority.inPlaneFlexibilityFactor,
  Math.max(1, expectedSmooth90K / pressureDenominator),
  2e-13,
  'B31J pressure-corrected k',
);
assert.equal(pressuredBridge.evidence.pressureCorrectionApplied, true);

// J. Fail-closed gates.
assert.throws(() => normalizeCircularElbowGeometry({
  ...geometryInput,
  endPointM: { x: 1.3, y: R, z: 0 },
}), /radii differ/u);
assert.throws(() => normalizeCircularElbowGeometry({
  ...geometryInput,
  planeNormal: [0, 1, 0],
}), /declared plane/u);
assert.throws(() => buildCircularElbowUnitLoadAction({
  geometry,
  loadCase: { ...caseX, direction: [2, 0, 0] },
  thetaRad: 0,
}), /unit length/u);
assert.throws(() => calculateCircularElbowVirtualWorkContribution({
  geometry,
  properties: { ...properties, secondMomentZM4: 1.1 * I },
  flexibilityAuthority: authority,
  caseA: caseX,
  caseB: caseX,
}), /axisymmetric/u);
assert.throws(() => calculateCircularElbowVirtualWorkContribution({
  geometry,
  properties,
  flexibilityAuthority: createEmpiricalElbowFlexibilityAuthority({
    schema: 'empirical-elbow-flexibility-authority/v1',
    authorityId: 'AUTH-WRONG-R',
    componentId: 'ELBOW-1',
    basis: 'CODE_COMPONENT_FLEXIBILITY',
    inPlaneFlexibilityFactor: K,
    outOfPlaneFlexibilityFactor: K,
    torsionalFlexibilityFactor: 1,
    source: {
      standard: 'ASME_B31J', edition: '2023', ruleId: 'TEST',
      sourceSemanticHash: 'fnv1a64:3333333333333333',
      factorResultSemanticHash: 'fnv1a64:4444444444444444',
    },
    geometryBinding: {
      bendRadiusM: 1.01 * R,
      outerDiameterM: 0.2191,
      wallThicknessM: 0.01509,
      pressurePa: 0,
      elasticModulusPa: E,
    },
  }),
  caseA: caseX,
  caseB: caseX,
}), /radius does not match/u);
assert.throws(() => buildEmpiricalElbowFlexibilityAuthorityFromB31J({
  authorityId: 'AUTH-ANGLE-MISMATCH',
  factorCalculationRequest: bendFactorRequest({
    componentId: 'ELBOW-B31J-1',
    bendAngleDegrees: 80,
    smooth90FlexibilityCorrection: false,
    outerDiameter: D,
    wallThickness: t,
    bendRadius: Rb,
    elasticModulus: Eb31,
    pressure: 0,
  }),
  circularElbowGeometry: b31Arc,
}), /does not match arc angle/u);
assert.throws(() => buildEmpiricalElbowFlexibilityAuthorityFromB31J({
  authorityId: 'AUTH-OUTSIDE-B31J',
  factorCalculationRequest: bendFactorRequest({
    componentId: 'ELBOW-B31J-1',
    bendAngleDegrees: 90,
    smooth90FlexibilityCorrection: true,
    outerDiameter: D,
    wallThickness: 0.001,
    bendRadius: Rb,
    elasticModulus: Eb31,
    pressure: 0,
  }),
  circularElbowGeometry: b31Arc,
}), /QUALIFIED BEND factor/u);

// K. Static source guard: SIFs and old empirical compliance multipliers are absent from the new route.
const bridgeSource = fs.readFileSync(
  new URL('../src/workspace/engineering-loads/adapters/b31j-elbow-to-empirical-flexibility.js', import.meta.url),
  'utf8',
);
const kernelSource = fs.readFileSync(
  new URL('../src/core/empirical-piping-mechanics/circular-elbow-flexibility.js', import.meta.url),
  'utf8',
);
const mixedSource = fs.readFileSync(
  new URL('../src/core/empirical-piping-mechanics/rooted-tree-component-flexibility.js', import.meta.url),
  'utf8',
);
assert.ok(!bridgeSource.includes('result.factors.displacementSifs'));
for (const source of [kernelSource, mixedSource]) {
  for (const prohibited of [
    'axialComplianceMultiplier',
    'bendingComplianceMultiplier',
    'topologyInteractionMultiplier',
    'assemblePlanarSystem',
    'solveAssembledPlanarSystem',
  ]) assert.ok(!source.includes(prohibited), `prohibited marker found: ${prohibited}`);
}

console.log('PASS: continuous circular elbow ROM analytical checks');
console.log(JSON.stringify({
  expectedFxx,
  expectedFyy,
  expectedFxy,
  expectedFzz,
  expectedRx,
  expectedRy,
  expectedSmooth90K,
  pressuredK: pressuredBridge.authority.inPlaneFlexibilityFactor,
}, null, 2));

function elbowContribution(caseA, caseB) {
  return calculateCircularElbowVirtualWorkContribution({
    geometry,
    properties,
    flexibilityAuthority: authority,
    caseA,
    caseB,
  });
}
function createAuthority({ inPlane, outOfPlane, torsion }) {
  return createEmpiricalElbowFlexibilityAuthority({
    schema: 'empirical-elbow-flexibility-authority/v1',
    authorityId: `AUTH-K-${inPlane}-${outOfPlane}-${torsion}`,
    componentId: 'ELBOW-1',
    basis: 'CODE_COMPONENT_FLEXIBILITY',
    inPlaneFlexibilityFactor: inPlane,
    outOfPlaneFlexibilityFactor: outOfPlane,
    torsionalFlexibilityFactor: torsion,
    source: {
      standard: 'ASME_B31J',
      edition: '2023',
      ruleId: 'INDEPENDENT-QUALIFICATION-K',
      sourceSemanticHash: 'fnv1a64:5555555555555555',
      factorResultSemanticHash: 'fnv1a64:6666666666666666',
    },
    geometryBinding: {
      bendRadiusM: R,
      outerDiameterM: 0.2191,
      wallThicknessM: 0.01509,
      pressurePa: 0,
      elasticModulusPa: E,
    },
  });
}
function unitCase(caseId, loadPointM, direction) {
  return Object.freeze({ caseId, loadPointM, direction, active: true });
}
function bendFactorRequest({
  componentId,
  bendAngleDegrees,
  smooth90FlexibilityCorrection,
  outerDiameter,
  wallThickness,
  bendRadius,
  elasticModulus,
  pressure,
}) {
  return {
    schema: 'fea-b31-factor-calculation-request/v1',
    calculationId: `CALC-${componentId}`,
    componentId,
    editionProfileId: 'B31_3_2024_B31J_2023',
    componentType: 'BEND',
    geometry: {
      schema: 'fea-b31-component-geometry/v1',
      componentType: 'BEND',
      lengthUnit: 'm',
      outerDiameter,
      wallThickness,
      bendRadius,
      pressure,
      elasticModulus,
      sourceEvidence: { sourceId: 'INDEPENDENT-QUALIFICATION', sourceRevision: '1' },
      bendAngleDegrees,
      smooth90FlexibilityCorrection,
    },
    momentDirectionMapping: { inPlaneField: 'mz', outOfPlaneField: 'my' },
    semanticHash: '',
  };
}
function approx(actual, expected, relativeTolerance, label) {
  const scale = Math.max(Math.abs(actual), Math.abs(expected), 1e-30);
  const residual = Math.abs(actual - expected) / scale;
  assert.ok(residual <= relativeTolerance, `${label}: ${actual} vs ${expected}, rel=${residual}`);
}
