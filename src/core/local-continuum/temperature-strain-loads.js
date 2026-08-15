/**
 * Isotropic thermal initial-strain mechanics for the LAFEA.3 2D continuum.
 *
 * The caller declares `thermalStrain = alpha * deltaT` as a dimensionless
 * free isotropic 3D strain. Plane stress and plane strain require different
 * reduced 2D initial-strain vectors when the same in-plane constitutive matrix
 * is used in the weak form:
 *
 *   plane stress: epsilon0_2d = [e, e, 0]
 *   plane strain: epsilon0_2d = [(1 + nu)e, (1 + nu)e, 0]
 *
 * The latter is the exact reduced initial-strain representation that produces
 * the correct in-plane stresses for epsilon_z = 0. The out-of-plane thermal
 * elastic strain is retained separately during recovery/energy evaluation.
 */
import { ELEMENT_TYPES, FORMULATIONS } from './constants.js';
import { matrixVector, transpose } from './matrix.js';
import { canonicalNumber } from './numeric.js';

export function reducedThermalStrainVector(formulation, material, thermalStrain) {
  const factor = formulation === FORMULATIONS.PLANE_STRAIN
    ? 1 + material.poissonRatio
    : 1;
  return [
    canonicalNumber(factor * thermalStrain, 'reduced thermal strain x'),
    canonicalNumber(factor * thermalStrain, 'reduced thermal strain y'),
    0,
  ];
}

export function thermalEquivalentNodalForces(
  elementEvidence,
  thermalStrain,
  formulation,
  material,
) {
  const epsilonTheta = reducedThermalStrainVector(formulation, material, thermalStrain);
  const thermalStress = matrixVector(elementEvidence.dMatrix, epsilonTheta);
  if (elementEvidence.elementType === ELEMENT_TYPES.T3) {
    const nodal = matrixVector(transpose(elementEvidence.bMatrix), thermalStress);
    const scale = elementEvidence.canonicalArea * elementEvidence.thickness;
    return groupByNode(nodal.map((value) => canonicalNumber(
      value * scale,
      'thermal equivalent nodal force',
    )));
  }
  const dofCount = elementEvidence.gaussEvidence[0].B[0].length;
  const totals = Array(dofCount).fill(0);
  elementEvidence.gaussEvidence.forEach((gp) => {
    const nodal = matrixVector(transpose(gp.B), thermalStress);
    nodal.forEach((value, i) => {
      totals[i] += value * gp.weight * gp.jacobianDeterminant * elementEvidence.thickness;
    });
  });
  return groupByNode(totals.map((value) => canonicalNumber(
    value,
    'thermal equivalent nodal force',
  )));
}

/**
 * Exact elastic-energy constant at zero total displacement for the declared
 * isotropic thermal strain. This is required because the reduced initial-
 * strain vector used in plane strain is an equilibrium-equivalent 2D vector;
 * simply evaluating 0.5 * epsilon0_2d^T D epsilon0_2d would omit the physical
 * out-of-plane elastic contribution.
 */
export function thermalInitialStrainEnergy(
  elementEvidence,
  thermalStrain,
  formulation,
  material,
) {
  if (!thermalStrain) return 0;
  const reduced = reducedThermalStrainVector(formulation, material, thermalStrain);
  const inPlaneThermalStress = matrixVector(elementEvidence.dMatrix, reduced);
  const sigmaX = -inPlaneThermalStress[0];
  const sigmaY = -inPlaneThermalStress[1];
  const sigmaZ = formulation === FORMULATIONS.PLANE_STRAIN
    ? material.poissonRatio * (sigmaX + sigmaY) - material.elasticModulus * thermalStrain
    : 0;
  const elasticX = -thermalStrain;
  const elasticY = -thermalStrain;
  const elasticZ = formulation === FORMULATIONS.PLANE_STRAIN ? -thermalStrain : 0;
  const density = 0.5 * (
    sigmaX * elasticX
    + sigmaY * elasticY
    + sigmaZ * elasticZ
  );
  return canonicalNumber(
    density * elementVolume(elementEvidence),
    'thermal initial strain energy',
  );
}

function elementVolume(elementEvidence) {
  if (elementEvidence.elementType === ELEMENT_TYPES.T3) {
    return elementEvidence.canonicalArea * elementEvidence.thickness;
  }
  return elementEvidence.gaussEvidence.reduce(
    (sum, gp) => sum + gp.weight * gp.jacobianDeterminant * elementEvidence.thickness,
    0,
  );
}

function groupByNode(dofVector) {
  const forces = [];
  for (let i = 0; i < dofVector.length; i += 2) forces.push([dofVector[i], dofVector[i + 1]]);
  return forces;
}
