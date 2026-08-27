/**
 * Q8 serendipity quadratic-quadrilateral formulation (spec §7). Node order:
 * corners 1(-1,-1), 2(1,-1), 3(1,1), 4(-1,1) CCW in natural coordinates,
 * midsides 5(1-2), 6(2-3), 7(3-4), 8(4-1). DOF order per node: UX, UY.
 * Independent of `element-fea`'s Q4 (per explicit direction — see
 * `t6-element.js` for the same rationale); reuses only this kernel's own
 * `matrix.js`/`numeric.js`/`constitutive.js` primitives.
 *
 * 3x3 Gauss quadrature (9 points) is the standard full-integration rule used
 * by this Q8 formulation. It is not claimed mathematically exact for an
 * arbitrary distorted isoparametric mapping: B contains J^-1, so B^T D B detJ
 * is generally not a fixed-degree biquadratic polynomial. Mapping positivity
 * and distortion therefore remain independent mesh/formulation qualifications.
 *
 * Q8 is wired through `element.js` into the public local-continuum calculation
 * route. Integration-point stress is retained as numerical recovery authority;
 * nodal projection, where provided by presentation layers, is display-only.
 */
import { numericalError } from './errors.js';
import {
  matrixScale, multiply, scaleMatrix, symmetryResidual, transpose, zeros,
} from './matrix.js';
import { canonicalNumber, maxAbs, tolerance } from './numeric.js';
import { constitutiveEvidence } from './constitutive.js';
import { bbarStiffnessMatrix, isBbarPlaneStrain } from './bbar-plane-strain.js';

export const Q8_FORMULA_IDS = Object.freeze({
  SHAPE_FUNCTIONS: 'Q8_SERENDIPITY_SHAPE_FUNCTIONS_V1',
  GAUSS_QUADRATURE: 'Q8_THREE_BY_THREE_GAUSS_QUADRATURE_V1',
  STIFFNESS: 'Q8_GAUSS_INTEGRATED_STIFFNESS_V1',
});

const GAUSS_1D = Object.freeze([
  Object.freeze({ point: -Math.sqrt(3 / 5), weight: 5 / 9 }),
  Object.freeze({ point: 0, weight: 8 / 9 }),
  Object.freeze({ point: Math.sqrt(3 / 5), weight: 5 / 9 }),
]);

export const Q8_GAUSS_POINTS = Object.freeze(
  GAUSS_1D.flatMap((gxi, i) => GAUSS_1D.map((geta, j) => Object.freeze({
    pointId: `GP${i * 3 + j + 1}`, xi: gxi.point, eta: geta.point, weight: gxi.weight * geta.weight,
  }))),
);

export function q8ShapeFunctionsAndDerivatives(xi, eta) {
  const N = [
    -(1 - xi) * (1 - eta) * (1 + xi + eta) / 4,
    -(1 + xi) * (1 - eta) * (1 - xi + eta) / 4,
    -(1 + xi) * (1 + eta) * (1 - xi - eta) / 4,
    -(1 - xi) * (1 + eta) * (1 + xi - eta) / 4,
    (1 - xi * xi) * (1 - eta) / 2,
    (1 + xi) * (1 - eta * eta) / 2,
    (1 - xi * xi) * (1 + eta) / 2,
    (1 - xi) * (1 - eta * eta) / 2,
  ];
  const dNdXi = [
    (1 - eta) * (2 * xi + eta) / 4,
    (1 - eta) * (2 * xi - eta) / 4,
    (1 + eta) * (2 * xi + eta) / 4,
    (1 + eta) * (2 * xi - eta) / 4,
    -xi * (1 - eta),
    (1 - eta * eta) / 2,
    -xi * (1 + eta),
    -(1 - eta * eta) / 2,
  ];
  const dNdEta = [
    (1 - xi) * (xi + 2 * eta) / 4,
    -(1 + xi) * (xi - 2 * eta) / 4,
    (1 + xi) * (xi + 2 * eta) / 4,
    -(1 - xi) * (xi - 2 * eta) / 4,
    -(1 - xi * xi) / 2,
    -eta * (1 + xi),
    (1 - xi * xi) / 2,
    -eta * (1 - xi),
  ];
  return { N, dNdXi, dNdEta };
}

function jacobianAt(nodes, dNdXi, dNdEta) {
  let dxDxi = 0; let dyDxi = 0; let dxDeta = 0; let dyDeta = 0;
  for (let i = 0; i < 8; i += 1) {
    dxDxi += dNdXi[i] * nodes[i].x; dyDxi += dNdXi[i] * nodes[i].y;
    dxDeta += dNdEta[i] * nodes[i].x; dyDeta += dNdEta[i] * nodes[i].y;
  }
  const determinant = dxDxi * dyDeta - dxDeta * dyDxi;
  return { dxDxi, dyDxi, dxDeta, dyDeta, determinant };
}

function physicalDerivatives(dNdXi, dNdEta, jacobian) {
  const invDet = 1 / jacobian.determinant;
  const dNdx = []; const dNdy = [];
  for (let i = 0; i < dNdXi.length; i += 1) {
    dNdx.push(invDet * (jacobian.dyDeta * dNdXi[i] - jacobian.dyDxi * dNdEta[i]));
    dNdy.push(invDet * (-jacobian.dxDeta * dNdXi[i] + jacobian.dxDxi * dNdEta[i]));
  }
  return { dNdx, dNdy };
}

export function q8BMatrixAt(nodes, xi, eta) {
  const { dNdXi, dNdEta } = q8ShapeFunctionsAndDerivatives(xi, eta);
  const jacobian = jacobianAt(nodes, dNdXi, dNdEta);
  if (!(jacobian.determinant > 0)) {
    throw numericalError('Q8_NONPOSITIVE_JACOBIAN', 'element formulation', `Q8 Jacobian determinant ${jacobian.determinant} is not positive at (${xi},${eta}).`);
  }
  const { dNdx, dNdy } = physicalDerivatives(dNdXi, dNdEta, jacobian);
  const B = zeros(3, 16);
  for (let i = 0; i < 8; i += 1) {
    B[0][2 * i] = dNdx[i];
    B[1][2 * i + 1] = dNdy[i];
    B[2][2 * i] = dNdy[i]; B[2][2 * i + 1] = dNdx[i];
  }
  return { B: B.map((row) => row.map((value) => canonicalNumber(value, 'Q8 B matrix'))), jacobianDeterminant: canonicalNumber(jacobian.determinant, 'Q8 Jacobian') };
}

export function q8StiffnessMatrix(nodes, dMatrix, thickness) {
  let stiffness = zeros(16, 16);
  const gaussEvidence = [];
  for (const gp of Q8_GAUSS_POINTS) {
    const { B, jacobianDeterminant } = q8BMatrixAt(nodes, gp.xi, gp.eta);
    const contribution = scaleMatrix(multiply(multiply(transpose(B), dMatrix), B), thickness * jacobianDeterminant * gp.weight);
    stiffness = stiffness.map((row, i) => row.map((value, j) => value + contribution[i][j]));
    gaussEvidence.push(Object.freeze({ pointId: gp.pointId, xi: gp.xi, eta: gp.eta, weight: gp.weight, jacobianDeterminant, B: Object.freeze(B.map((row) => Object.freeze(row))) }));
  }
  return { stiffness: stiffness.map((row) => row.map((value) => canonicalNumber(value, 'Q8 stiffness'))), gaussEvidence: Object.freeze(gaussEvidence) };
}

export function q8ElementEvidence(elementId, nodes, material, formulation, thickness, profile) {
  const constitutive = constitutiveEvidence(material, formulation, profile);
  const standard = q8StiffnessMatrix(nodes, constitutive.matrix, thickness);
  const bbar = isBbarPlaneStrain(formulation)
    ? bbarStiffnessMatrix(standard.gaussEvidence, material, thickness)
    : null;
  const stiffness = bbar?.stiffness ?? standard.stiffness;
  const gaussEvidence = standard.gaussEvidence;
  const stiffnessQualification = qualifyQ8Stiffness(stiffness, elementId, profile);
  const rigidBodyQualification = qualifyQ8RigidBody(nodes, gaussEvidence, profile);
  const affinePatchQualification = qualifyQ8AffinePatch(nodes, gaussEvidence, constitutive.matrix, profile);
  return Object.freeze({
    elementId,
    elementType: 'Q8',
    dMatrix: constitutive.matrix,
    localStiffnessMatrix: stiffness,
    gaussEvidence,
    ...(bbar ? {
      bbarEvidence: Object.freeze({
        integrationArea: bbar.meanDilatation.integrationArea,
        meanVolumetricRow: bbar.meanDilatation.meanVolumetricRow,
        integrationPointCount: bbar.meanDilatation.integrationPointCount,
        shearModulus: bbar.moduli.shearModulus,
        bulkModulus: bbar.moduli.bulkModulus,
        translationNullspace: bbar.translationNullspace,
        formulaIds: bbar.formulaIds,
      }),
    } : {}),
    stiffnessSymmetry: stiffnessQualification,
    rigidBodyQualification,
    affinePatchQualification,
    formulaIds: Object.freeze([
      Q8_FORMULA_IDS.SHAPE_FUNCTIONS,
      Q8_FORMULA_IDS.GAUSS_QUADRATURE,
      ...(bbar ? bbar.formulaIds : [Q8_FORMULA_IDS.STIFFNESS]),
      ...constitutive.formulaIds,
    ].sort()),
  });
}

function qualifyQ8Stiffness(stiffness, elementId, profile) {
  const residual = symmetryResidual(stiffness);
  const scale = matrixScale(stiffness);
  const limit = tolerance(profile, 'stiffnessSymmetry', scale);
  if (residual > limit) throw numericalError('ELEMENT_STIFFNESS_SYMMETRY_FAILURE', `elements.${elementId}`, 'Q8 element stiffness symmetry did not qualify.');
  return { residual, scale, tolerance: limit, accepted: true };
}

function qualifyQ8RigidBody(nodes, gaussEvidence, profile) {
  const translationX = nodes.flatMap(() => [1, 0]);
  const translationY = nodes.flatMap(() => [0, 1]);
  const rotation = nodes.flatMap((node) => [-node.y, node.x]);
  const residuals = [translationX, translationY, rotation].flatMap((field) => gaussEvidence.map((gp) => maxAbs(matrixTimesVector(gp.B, field))));
  const residual = maxAbs(residuals);
  const scale = Math.max(1, ...nodes.flatMap((node) => [Math.abs(node.x), Math.abs(node.y)]));
  const limit = tolerance(profile, 'rigidBodyStrain', scale);
  if (residual > limit) throw numericalError('RIGID_BODY_STRAIN_FAILURE', 'Q8 element formulation', 'Q8 rigid-body strain did not qualify.');
  return { maximumStrainResidual: residual, scale, tolerance: limit, accepted: true };
}

function qualifyQ8AffinePatch(nodes, gaussEvidence, dMatrix, profile) {
  const fields = [
    nodes.flatMap((node) => [node.x, 0]),
    nodes.flatMap((node) => [0, node.y]),
    nodes.flatMap((node) => [node.y / 2, node.x / 2]),
  ];
  const expectedStrains = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const residuals = fields.flatMap((field, index) => gaussEvidence.map((gp) => {
    const strain = matrixTimesVector(gp.B, field);
    const actualStress = matrixTimesVector(dMatrix, strain);
    const targetStress = matrixTimesVector(dMatrix, expectedStrains[index]);
    return maxAbs(actualStress.map((value, component) => value - targetStress[component]));
  }));
  const residual = maxAbs(residuals);
  const scale = Math.max(1, matrixScale(dMatrix));
  const limit = tolerance(profile, 'patchTestStress', scale);
  if (residual > limit) throw numericalError('AFFINE_PATCH_STRESS_FAILURE', 'Q8 element formulation', 'Q8 affine patch stress did not qualify.');
  return { maximumStressResidual: canonicalNumber(residual), scale, tolerance: limit, accepted: true };
}

function matrixTimesVector(matrix, vector) {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0));
}
