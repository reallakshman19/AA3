import { FORMULA_IDS } from './constants.js';
import { constitutiveEvidence } from './constitutive.js';
import { canonicalFacet, canonicalQuadFacet, frameResidual, localCoordinates } from './geometry.js';
import {
  addMatrices,
  matrixScale,
  matrixVector,
  multiply,
  scaleMatrix,
  symmetryResidual,
  transpose,
} from './matrix.js';
import { maxAbs, qualification } from './numeric.js';
import { fiveDofTransformation } from './transformation.js';
import { cross, dot, subtract } from './vector.js';
import {
  MITC_ADOPTION_PRODUCTION_QUALIFICATION,
  MITC_ADOPTION_ROUTE_STATUS,
  validateExperimentalMitcAdoptionModel,
} from './mitc-adoption-model.js';
import {
  MITC3_FORMULA_IDS,
  MITC3_FORMULATION,
  SHEAR_CORRECTION_FACTOR as MITC3_SHEAR_CORRECTION_FACTOR,
  mitc3StiffnessMatrix,
} from './mitc3-element.js';
import {
  MITC4_FORMULA_IDS,
  MITC4_FORMULATION,
  SHEAR_CORRECTION_FACTOR as MITC4_SHEAR_CORRECTION_FACTOR,
  mitc4StiffnessMatrix,
} from './mitc4-element.js';

const MITC_BETA_TRANSFORMATION_FORMULA_ID =
  'LAFEA4.MITC_BETA_FROM_PHYSICAL_TANGENT_ROTATION/v1';

export function buildExperimentalMitcElementEvidence(model) {
  const canonical = validateExperimentalMitcAdoptionModel(model);
  const nodeMap = new Map(canonical.nodes.map((node) => [node.nodeId, node]));
  const materialMap = new Map(canonical.materials.map((material) => [material.materialId, material]));
  return canonical.elements.map((element) => buildElement(
    canonical,
    element,
    nodeMap,
    materialMap,
  ));
}

function buildElement(model, element, nodeMap, materialMap) {
  const material = materialMap.get(element.materialId);
  const geometryProfile = {
    ...model.qualificationProfile,
    quadPlanarity: model.mitcQualification.quadPlanarity,
  };
  const geometry = element.formulation === MITC4_FORMULATION
    ? canonicalQuadFacet(element.nodeIds, nodeMap, geometryProfile, element.elementId)
    : canonicalFacet(element.nodeIds, nodeMap, geometryProfile, element.elementId);
  const orderedNodes = geometry.nodeIds.map((nodeId) => nodeMap.get(nodeId));
  const coordinates = localCoordinates(orderedNodes, geometry.frame);
  const constitutive = constitutiveEvidence(material, element.thickness, model.qualificationProfile);
  const shearModulus = material.elasticModulus / (2 * (1 + material.poissonRatio));
  const formulation = formulationStiffness(
    element.formulation,
    coordinates,
    constitutive.membraneMaterial,
    element.thickness,
    shearModulus,
  );
  const transformation = mitcFiveDofTransformation(
    orderedNodes,
    geometry.frame,
    model.qualificationProfile,
  );
  const globalStiffness = multiply(
    transpose(transformation.matrix),
    multiply(formulation.stiffness, transformation.matrix),
  );
  return elementPayload({
    model,
    element,
    geometry,
    orderedNodes,
    material,
    constitutive,
    coordinates,
    shearModulus,
    formulation,
    transformation,
    globalStiffness,
  });
}

/**
 * `fiveDofTransformation()` maps the two retained nodal rotational DOFs to
 * physical element-tangent rotation components [omega_x, omega_y]. MITC's
 * Reissner-Mindlin variables are director slopes, not those physical rotation
 * components:
 *
 *   u = u0 + z*betaX, v = v0 + z*betaY
 *   betaX = omega_y, betaY = -omega_x
 *
 * For a rigid rotation this gives w_,x=-omega_y and w_,y=omega_x, hence
 * gamma_xz=betaX+w_,x=0 and gamma_yz=betaY+w_,y=0. Reusing the physical
 * rotation rows without this 90-degree signed map would create spurious
 * transverse shear energy under rigid-body rotation.
 */
function mitcFiveDofTransformation(nodes, frame, profile) {
  const physical = fiveDofTransformation(nodes, frame, profile);
  const matrix = physical.matrix.map((row) => [...row]);
  for (let node = 0; node < nodes.length; node += 1) {
    const betaX = 5 * node + 3;
    const betaY = 5 * node + 4;
    matrix[betaX] = [...physical.matrix[betaY]];
    matrix[betaY] = physical.matrix[betaX].map((value) => -value);
  }
  const rotationMapping = betaRows(physical.rotationMapping);
  const desiredRigid = betaRows(physical.desiredRigid);
  const reproductionResidual = maxAbs(addMatrices(
    multiply(rotationMapping, physical.tangentSampling),
    scaleMatrix(desiredRigid, -1),
  ));
  const rigidReproduction = qualification(
    reproductionResidual,
    1,
    profile.rigidRotation,
  );
  return {
    matrix,
    rotationMapping,
    physicalRotationMapping: physical.rotationMapping,
    tangentSampling: physical.tangentSampling,
    desiredRigid,
    physicalDesiredRigid: physical.desiredRigid,
    eigenvalues: physical.eigenvalues,
    rank: physical.rank,
    rankTolerance: physical.rankTolerance,
    rigidReproduction,
    physicalRigidReproduction: physical.rigidReproduction,
  };
}

function betaRows(physicalRows) {
  const result = [];
  for (let node = 0; node < physicalRows.length / 2; node += 1) {
    const omegaX = physicalRows[2 * node];
    const omegaY = physicalRows[2 * node + 1];
    result.push([...omegaY], omegaX.map((value) => -value));
  }
  return result;
}

function elementPayload(context) {
  const {
    model, element, geometry, orderedNodes, material, constitutive,
    coordinates, shearModulus, formulation, transformation, globalStiffness,
  } = context;
  const qualificationEvidence = qualifyElement(
    model,
    orderedNodes,
    formulation.stiffness,
    globalStiffness,
    transformation,
  );
  rejectFailedQualification(element.elementId, qualificationEvidence);
  return Object.freeze({
    elementId: element.elementId,
    formulation: element.formulation,
    topology: element.topology,
    nodeIds: Object.freeze([...geometry.nodeIds]),
    materialId: element.materialId,
    thickness: element.thickness,
    routeStatus: MITC_ADOPTION_ROUTE_STATUS,
    contributesToLafea4ProductionQualification: MITC_ADOPTION_PRODUCTION_QUALIFICATION,
    area: geometry.frame.area,
    geometryScale: geometry.geometryScale,
    localCoordinates: freezeMatrix(coordinates),
    localFrame: freezeRecordOfArrays(geometry.frame),
    frameResidual: frameResidual(geometry.frame),
    areaQualification: geometry.areaQualification,
    planarityQualification: geometry.planarityQualification ?? null,
    directorAlignment: Object.freeze(geometry.alignments),
    membraneMaterialMatrix: freezeMatrix(constitutive.membraneMaterial),
    shearModulus,
    shearCorrectionFactor: shearCorrectionFactor(element.formulation),
    integrationEvidence: formulation.gaussEvidence,
    localStiffness: freezeMatrix(formulation.stiffness),
    nodalBasisTransformation: freezeTransformation(transformation),
    globalStiffness: freezeMatrix(globalStiffness),
    localDofOrdering: Object.freeze(localDofOrdering(geometry.nodeIds)),
    globalDofOrdering: Object.freeze(globalDofOrdering(geometry.nodeIds)),
    qualification: Object.freeze(qualificationEvidence),
    sourceReferences: Object.freeze([
      element.sourceReference,
      material.sourceReference,
      ...orderedNodes.map((node) => node.sourceReference),
    ]),
    formulaIds: Object.freeze(formulaIds(element.formulation)),
  });
}

function formulationStiffness(formulation, coordinates, membraneMaterial, thickness, shearModulus) {
  if (formulation === MITC4_FORMULATION) {
    return mitc4StiffnessMatrix(coordinates, membraneMaterial, thickness, shearModulus);
  }
  if (formulation === MITC3_FORMULATION) {
    return mitc3StiffnessMatrix(coordinates, membraneMaterial, thickness, shearModulus);
  }
  throw new TypeError(`Unsupported MITC adoption formulation: ${formulation}`);
}

function shearCorrectionFactor(formulation) {
  return formulation === MITC4_FORMULATION
    ? MITC4_SHEAR_CORRECTION_FACTOR
    : MITC3_SHEAR_CORRECTION_FACTOR;
}

function qualifyElement(model, nodes, localStiffness, globalStiffness, transformation) {
  const localScale = matrixScale(localStiffness);
  const globalScale = matrixScale(globalStiffness);
  return {
    localStiffnessSymmetry: qualification(
      symmetryResidual(localStiffness),
      localScale,
      model.qualificationProfile.elementStiffnessSymmetry,
    ),
    globalStiffnessSymmetry: qualification(
      symmetryResidual(globalStiffness),
      globalScale,
      model.qualificationProfile.elementStiffnessSymmetry,
    ),
    betaRigidRotation: transformation.rigidReproduction,
    rigidBodyEnergy: qualification(
      rigidBodyEnergyResidual(nodes, globalStiffness, globalScale),
      1,
      model.mitcQualification.rigidBodyEnergy,
    ),
  };
}

function rejectFailedQualification(elementId, evidence) {
  if (Object.values(evidence).some((item) => item?.accepted !== true)) {
    const error = new TypeError(`Experimental MITC element ${elementId} failed adoption qualification`);
    error.code = 'MITC_ADOPTION_ELEMENT_QUALIFICATION_FAILED';
    error.evidence = evidence;
    throw error;
  }
}

function rigidBodyEnergyResidual(nodes, stiffness, stiffnessScale) {
  const origin = nodes[0].position;
  const modes = [];
  for (let axis = 0; axis < 3; axis += 1) {
    modes.push(nodes.flatMap(() => [
      axis === 0 ? 1 : 0,
      axis === 1 ? 1 : 0,
      axis === 2 ? 1 : 0,
      0,
      0,
    ]));
  }
  for (let axis = 0; axis < 3; axis += 1) {
    const omega = [0, 0, 0];
    omega[axis] = 1;
    modes.push(nodes.flatMap((node) => {
      const translation = cross(omega, subtract(node.position, origin));
      return [
        ...translation,
        dot(omega, node.rotationBasis1),
        dot(omega, node.rotationBasis2),
      ];
    }));
  }
  let residual = 0;
  for (const mode of modes) {
    const action = matrixVector(stiffness, mode);
    const energyTwice = Math.abs(mode.reduce(
      (sum, value, index) => sum + value * action[index],
      0,
    ));
    const normSquared = mode.reduce((sum, value) => sum + value * value, 0);
    residual = Math.max(
      residual,
      energyTwice / Math.max(1, stiffnessScale * normSquared),
      maxAbs(action) / Math.max(1, stiffnessScale * Math.sqrt(normSquared)),
    );
  }
  return residual;
}

function localDofOrdering(nodeIds) {
  return nodeIds.flatMap((nodeId) => [
    'U_LOCAL_X', 'U_LOCAL_Y', 'W_LOCAL_Z', 'BETA_LOCAL_X', 'BETA_LOCAL_Y',
  ].map((dof) => `${nodeId}:${dof}`));
}

function globalDofOrdering(nodeIds) {
  return nodeIds.flatMap((nodeId) => [
    'UX', 'UY', 'UZ', 'R1', 'R2',
  ].map((dof) => `${nodeId}:${dof}`));
}

function formulaIds(formulation) {
  const formulationIds = formulation === MITC4_FORMULATION
    ? Object.values(MITC4_FORMULA_IDS)
    : Object.values(MITC3_FORMULA_IDS);
  return [
    ...formulationIds,
    FORMULA_IDS.BASIS_TRANSFORMATION,
    MITC_BETA_TRANSFORMATION_FORMULA_ID,
  ].sort();
}

function freezeMatrix(matrix) {
  return Object.freeze(matrix.map((row) => Object.freeze([...row])));
}

function freezeTransformation(value) {
  return Object.freeze({
    matrix: freezeMatrix(value.matrix),
    rotationMapping: freezeMatrix(value.rotationMapping),
    physicalRotationMapping: freezeMatrix(value.physicalRotationMapping),
    tangentSampling: freezeMatrix(value.tangentSampling),
    desiredRigid: freezeMatrix(value.desiredRigid),
    physicalDesiredRigid: freezeMatrix(value.physicalDesiredRigid),
    eigenvalues: Object.freeze([...value.eigenvalues]),
    rank: value.rank,
    rankTolerance: value.rankTolerance,
    rigidReproduction: value.rigidReproduction,
    physicalRigidReproduction: value.physicalRigidReproduction,
  });
}

function freezeRecordOfArrays(record) {
  return Object.freeze(Object.fromEntries(Object.entries(record).map(([key, value]) => [
    key,
    Array.isArray(value) ? Object.freeze([...value]) : value,
  ])));
}
