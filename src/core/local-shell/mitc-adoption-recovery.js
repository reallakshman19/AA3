import { SURFACES } from './constants.js';
import {
  MITC_ADOPTION_PRODUCTION_QUALIFICATION,
  MITC_ADOPTION_ROUTE_STATUS,
  validateExperimentalMitcAdoptionModel,
} from './mitc-adoption-model.js';
import { MITC_ADOPTION_EXECUTION_SCHEMA } from './mitc-adoption-solve.js';
import {
  bendingBMatrix as mitc3BendingBMatrix,
  membraneBMatrix as mitc3MembraneBMatrix,
  MITC3_FORMULATION,
} from './mitc3-element.js';
import { deepFreeze } from './json.js';
import { matrixVector, quadratic } from './matrix.js';
import { cleanNumber, qualification } from './numeric.js';
import { stressInvariants } from './recovery.js';

export const MITC_ADOPTION_RECOVERY_SCHEMA = 'local-shell-mitc-adoption-recovery/v1';
export const MITC_ADOPTION_RECOVERY_FORMULA_IDS = Object.freeze({
  IN_PLANE: 'LAFEA4.MITC_IN_PLANE_THROUGH_THICKNESS_RECOVERY/v1',
  TRANSVERSE_SHEAR: 'LAFEA4.MITC_EFFECTIVE_TRANSVERSE_SHEAR_RECOVERY/v1',
  ENERGY: 'LAFEA4.MITC_MEMBRANE_BENDING_SHEAR_ENERGY_RECONSTRUCTION/v1',
});

/**
 * Recover explicitly experimental MITC evidence from an already-solved
 * adoption execution. This module does not alter the solve or publish a
 * registered local-shell result contract.
 */
export function recoverExperimentalMitcLoadCase(model, solved) {
  const canonical = validateExperimentalMitcAdoptionModel(model);
  requireCompatibleExecution(canonical, solved);
  const dofIndex = new Map(
    solved.meshEvidence.dofOrdering.map((identity, index) => [identity, index]),
  );
  const elementResults = solved.meshEvidence.elements.map((element) =>
    recoverElement(canonical, solved, element, dofIndex));
  const energyTotal = cleanNumber(elementResults.reduce(
    (sum, element) => sum + element.energy.total,
    0,
  ));
  const stiffnessEnergyTotal = cleanNumber(elementResults.reduce(
    (sum, element) => sum + element.energy.stiffness,
    0,
  ));
  const energyScale = Math.max(1, Math.abs(energyTotal), Math.abs(stiffnessEnergyTotal));
  const energyQualification = qualification(
    Math.abs(energyTotal - stiffnessEnergyTotal),
    energyScale,
    canonical.qualificationProfile.strainEnergyReconstruction,
  );
  if (!energyQualification.accepted) {
    const error = new TypeError('Experimental MITC global recovery energy reconstruction failed');
    error.code = 'MITC_ADOPTION_RECOVERY_ENERGY_FAILED';
    error.evidence = energyQualification;
    throw error;
  }
  return deepFreeze({
    schema: MITC_ADOPTION_RECOVERY_SCHEMA,
    modelIdentity: canonical.modelIdentity,
    modelVersion: canonical.modelVersion,
    loadCaseId: solved.loadCaseId,
    routeStatus: MITC_ADOPTION_ROUTE_STATUS,
    contributesToLafea4ProductionQualification: MITC_ADOPTION_PRODUCTION_QUALIFICATION,
    inPlaneInvariantAuthority: 'PLANE_STRESS_SAME_POINT_IN_PLANE_ONLY',
    transverseShearAuthority: 'EFFECTIVE_AVERAGE_REISSNER_MINDLIN_SHEAR',
    transverseShearIncludedInInPlaneVonMises: false,
    elementResults,
    membraneStrainEnergy: cleanNumber(elementResults.reduce((sum, row) => sum + row.energy.membrane, 0)),
    bendingStrainEnergy: cleanNumber(elementResults.reduce((sum, row) => sum + row.energy.bending, 0)),
    transverseShearStrainEnergy: cleanNumber(elementResults.reduce((sum, row) => sum + row.energy.transverseShear, 0)),
    totalStrainEnergy: energyTotal,
    stiffnessStrainEnergy: stiffnessEnergyTotal,
    energyQualification,
    formulaIds: Object.values(MITC_ADOPTION_RECOVERY_FORMULA_IDS),
  });
}

function requireCompatibleExecution(model, solved) {
  if (!solved || solved.schema !== MITC_ADOPTION_EXECUTION_SCHEMA) {
    throw new TypeError(`MITC recovery requires ${MITC_ADOPTION_EXECUTION_SCHEMA}`);
  }
  if (solved.routeStatus !== MITC_ADOPTION_ROUTE_STATUS
    || solved.contributesToLafea4ProductionQualification !== false) {
    throw new TypeError('MITC recovery accepts experimental/nonproduction execution evidence only');
  }
  if (solved.modelIdentity !== model.modelIdentity || solved.modelVersion !== model.modelVersion) {
    throw new TypeError('MITC recovery execution/model identity mismatch');
  }
}

function recoverElement(model, solved, element, dofIndex) {
  const global = element.globalDofOrdering.map((identity) => {
    const index = dofIndex.get(identity);
    if (!Number.isInteger(index)) throw new TypeError(`Missing solved MITC DOF ${identity}`);
    return solved.displacement[index];
  });
  const local = matrixVector(element.nodalBasisTransformation.matrix, global);
  const pointOperators = operatorsForElement(element);
  const points = pointOperators.map((point) => recoverPoint(element, local, point));
  const energy = reconstructElementEnergy(model, element, local, pointOperators);
  return {
    elementId: element.elementId,
    formulation: element.formulation,
    topology: element.topology,
    nodeIds: [...element.nodeIds],
    localGeneralizedDisplacement: local,
    integrationPoints: points,
    energy,
    formulaIds: Object.values(MITC_ADOPTION_RECOVERY_FORMULA_IDS),
  };
}

function operatorsForElement(element) {
  if (element.formulation !== MITC3_FORMULATION) {
    return element.integrationEvidence.map((point) => ({
      pointId: point.pointId,
      naturalCoordinates: { xi: point.xi, eta: point.eta },
      weight: point.weight,
      jacobianDeterminant: point.jacobianDeterminant,
      membraneB: point.membraneB,
      bendingB: point.bendingB,
      shearB: point.shearB,
    }));
  }
  const membraneB = mitc3MembraneBMatrix(element.localCoordinates);
  const bendingB = mitc3BendingBMatrix(element.localCoordinates);
  return element.integrationEvidence.map((point) => ({
    pointId: point.pointId,
    naturalCoordinates: { r: point.r, s: point.s },
    weight: point.weight,
    jacobianDeterminant: point.jacobianDeterminant,
    membraneB,
    bendingB,
    shearB: point.shearB,
  }));
}

function recoverPoint(element, local, point) {
  const membraneStrain = matrixVector(point.membraneB, local);
  const curvature = matrixVector(point.bendingB, local);
  const transverseShearStrain = matrixVector(point.shearB, local);
  const transverseShearStressAverage = transverseShearStrain.map((value) => cleanNumber(
    element.shearCorrectionFactor * element.shearModulus * value,
  ));
  const transverseShearResultant = transverseShearStressAverage.map((value) => cleanNumber(
    element.thickness * value,
  ));
  return {
    integrationPointId: point.pointId,
    naturalCoordinates: point.naturalCoordinates,
    membraneStrain: strainRecord(membraneStrain),
    curvature: curvatureRecord(curvature),
    transverseShearStrain: shearRecord(transverseShearStrain),
    transverseShearStressAverage: shearStressRecord(transverseShearStressAverage),
    transverseShearResultant: shearResultantRecord(transverseShearResultant),
    surfaces: SURFACES.map((surface) => recoverSurface(
      element,
      surface,
      membraneStrain,
      curvature,
    )),
  };
}

function recoverSurface(element, surface, membraneStrain, curvature) {
  const z = surfaceCoordinate(surface, element.thickness);
  const bendingStrain = curvature.map((value) => cleanNumber(z * value));
  const combinedStrain = membraneStrain.map((value, index) => cleanNumber(
    value + bendingStrain[index],
  ));
  const combinedStress = matrixVector(element.membraneMaterialMatrix, combinedStrain);
  return {
    surface,
    z,
    membraneStrain: strainRecord(membraneStrain),
    bendingStrain: strainRecord(bendingStrain),
    combinedStrain: strainRecord(combinedStrain),
    combinedStress: stressRecord(combinedStress),
    ...stressInvariants(combinedStress[0], combinedStress[1], combinedStress[2]),
    invariantAuthority: 'PLANE_STRESS_SAME_POINT_IN_PLANE_ONLY',
  };
}

function reconstructElementEnergy(model, element, local, points) {
  let membrane = 0;
  let bending = 0;
  let transverseShear = 0;
  for (const point of points) {
    const membraneStrain = matrixVector(point.membraneB, local);
    const curvature = matrixVector(point.bendingB, local);
    const shear = matrixVector(point.shearB, local);
    const areaWeight = point.weight * point.jacobianDeterminant;
    membrane += 0.5 * areaWeight * element.thickness
      * vectorQuadratic(membraneStrain, element.membraneMaterialMatrix);
    bending += 0.5 * areaWeight * element.thickness ** 3 / 12
      * vectorQuadratic(curvature, element.membraneMaterialMatrix);
    transverseShear += 0.5 * areaWeight
      * element.shearCorrectionFactor * element.shearModulus * element.thickness
      * shear.reduce((sum, value) => sum + value * value, 0);
  }
  const total = cleanNumber(membrane + bending + transverseShear);
  const stiffness = cleanNumber(0.5 * quadratic(local, element.localStiffness));
  const scale = Math.max(1, Math.abs(total), Math.abs(stiffness));
  const parity = qualification(
    Math.abs(total - stiffness),
    scale,
    model.qualificationProfile.strainEnergyReconstruction,
  );
  if (!parity.accepted) {
    const error = new TypeError(`Experimental MITC element ${element.elementId} recovery energy failed`);
    error.code = 'MITC_ADOPTION_ELEMENT_RECOVERY_ENERGY_FAILED';
    error.evidence = parity;
    throw error;
  }
  return {
    membrane: cleanNumber(membrane),
    bending: cleanNumber(bending),
    transverseShear: cleanNumber(transverseShear),
    total,
    stiffness,
    parity,
  };
}

function vectorQuadratic(vector, matrix) {
  const product = matrixVector(matrix, vector);
  return vector.reduce((sum, value, index) => sum + value * product[index], 0);
}

function surfaceCoordinate(surface, thickness) {
  if (surface === 'BOTTOM') return cleanNumber(-thickness / 2);
  if (surface === 'TOP') return cleanNumber(thickness / 2);
  return 0;
}

function strainRecord(values) {
  return { epsilonX: values[0], epsilonY: values[1], gammaXY: values[2] };
}

function curvatureRecord(values) {
  return { kappaX: values[0], kappaY: values[1], kappaXY: values[2] };
}

function shearRecord(values) {
  return { gammaXZ: values[0], gammaYZ: values[1] };
}

function shearStressRecord(values) {
  return { tauXZEffectiveAverage: values[0], tauYZEffectiveAverage: values[1] };
}

function shearResultantRecord(values) {
  return { qX: values[0], qY: values[1] };
}

function stressRecord(values) {
  return { sigmaX: values[0], sigmaY: values[1], tauXY: values[2] };
}
