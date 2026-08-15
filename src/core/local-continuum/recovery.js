import { ELEMENT_TYPES, FORMULA_IDS, FORMULATIONS } from './constants.js';
import { numericalError } from './errors.js';
import { dot, matrixVector } from './matrix.js';
import { canonicalNumber, tolerance } from './numeric.js';
import { reducedThermalStrainVector } from './temperature-strain-loads.js';
import {
  BBAR_FORMULA_IDS,
  bbarElementElasticEnergy,
  bbarMeanDilatation,
  isBbarPlaneStrain,
  isPlaneStrainFormulation,
  recoverBbarPlaneStrainStress,
} from './bbar-plane-strain.js';

export function recoverLoadCase(model, mesh, elementEvidence, load, solution) {
  const dofIndex = new Map(mesh.dofOrdering.map((id, i) => [id, i]));
  const materialMap = new Map(model.materials.map((row) => [row.materialId, row]));
  const thermalStrainByElement = new Map(
    load.temperatureLoads.map((row) => [row.elementId, row.thermalStrain]),
  );
  const elementResults = elementEvidence.map((element) => dispatchRecoverElement(
    model,
    element,
    materialMap.get(element.materialId),
    solution.displacementVector,
    dofIndex,
    thermalStrainByElement.get(element.elementId) ?? 0,
  ));
  const elementSum = canonicalNumber(
    elementResults.reduce((sum, row) => sum + row.strainEnergy, 0),
    'element elastic energy sum',
  );
  const ku = matrixVector(mesh.globalStiffnessMatrix, solution.displacementVector);
  const quadraticEnergy = 0.5 * dot(solution.displacementVector, ku);
  const thermalWork = dot(
    solution.displacementVector,
    load.thermalForceVector ?? Array(solution.displacementVector.length).fill(0),
  );
  const thermalInitialEnergy = load.thermalInitialStrainEnergy ?? 0;
  const globalEnergy = canonicalNumber(
    quadraticEnergy - thermalWork + thermalInitialEnergy,
    'global elastic strain energy',
  );
  const limit = tolerance(
    model.qualificationProfile,
    'strainEnergy',
    elementSum,
    globalEnergy,
  );
  const residual = canonicalNumber(elementSum - globalEnergy, 'energy residual');
  if (Math.abs(residual) > limit) {
    throw numericalError(
      'STRAIN_ENERGY_RECONSTRUCTION_FAILURE',
      `loadCases.${load.loadCaseId}`,
      'Element and global elastic strain energy do not reconstruct.',
    );
  }
  return {
    loadCaseId: load.loadCaseId,
    loadCaseInputSemanticHash: load.loadCaseInputSemanticHash,
    forceEvidence: {
      forceVector: load.forceVector,
      thermalForceVector: load.thermalForceVector,
      thermalInitialStrainEnergy,
      contributions: load.contributions,
      sourceReference: load.sourceReference,
    },
    nodalDisplacements: displacements(model, solution, mesh),
    supportReactions: solution.reactions,
    freeDofResiduals: solution.freeDofResiduals,
    solverEvidence: {
      ...solution.solverEvidence,
      freeDofIdentities: solution.freeDofIdentities,
      constrainedDofIdentities: solution.constrainedDofIdentities,
    },
    equilibrium: solution.equilibrium,
    elementResults,
    totalStrainEnergy: globalEnergy,
    energyQualification: {
      scale: Math.max(1, Math.abs(elementSum), Math.abs(globalEnergy)),
      elementEnergySum: elementSum,
      globalEnergy,
      quadraticDisplacementEnergy: canonicalNumber(quadraticEnergy, 'quadratic displacement energy'),
      thermalEquivalentLoadWork: canonicalNumber(thermalWork, 'thermal equivalent load work'),
      thermalInitialStrainEnergy,
      residual,
      tolerance: limit,
      accepted: true,
      energyDefinition: isBbarPlaneStrain(model.formulation)
        ? 'MEAN_DILATATION_BBAR_PHYSICAL_ELASTIC_STRAIN_ENERGY'
        : 'PHYSICAL_ELASTIC_STRAIN_ENERGY',
    },
    formulaIds: [...new Set([
      ...load.formulaIds,
      ...solution.formulaIds,
      ...elementResults.flatMap((row) => row.formulaIds),
      FORMULA_IDS.ENERGY,
    ])].sort(),
  };
}

function dispatchRecoverElement(model, element, material, u, dofIndex, appliedThermalStrain) {
  if (element.elementType === ELEMENT_TYPES.T6 || element.elementType === ELEMENT_TYPES.Q8) {
    return recoverGaussPointElement(
      model,
      element,
      material,
      u,
      dofIndex,
      appliedThermalStrain,
    );
  }
  return recoverElement(model, element, material, u, dofIndex, appliedThermalStrain);
}

/**
 * Stress is elastic stress only. Plane strain uses the formulation-correct
 * reduced thermal vector for the in-plane constitutive relation and retains
 * the true out-of-plane thermal elastic strain in sigma_z and energy recovery.
 */
function recoverElement(model, element, material, u, dofIndex, appliedThermalStrain) {
  const indices = element.localDofOrdering.map((id) => dofIndex.get(id));
  const ue = indices.map((index) => u[index]);
  const strain = matrixVector(element.bMatrix, ue);
  const reducedThermal = reducedThermalStrainVector(
    model.formulation,
    material,
    appliedThermalStrain,
  );
  const constitutiveStrain = subtractVector(strain, reducedThermal);
  const inPlane = matrixVector(element.dMatrix, constitutiveStrain);
  const [sigmaX, sigmaY, tauXY] = inPlane;
  const sigmaZ = recoverSigmaZ(
    model.formulation,
    material,
    sigmaX,
    sigmaY,
    appliedThermalStrain,
  );
  const principal = principalStress(sigmaX, sigmaY, tauXY);
  const vonMises = vonMisesStress(sigmaX, sigmaY, sigmaZ, tauXY);
  const energy = canonicalNumber(
    elasticEnergyDensity(
      model.formulation,
      strain,
      { sigmaX, sigmaY, sigmaZ, tauXY },
      appliedThermalStrain,
    ) * element.canonicalArea * element.thickness,
    'element elastic strain energy',
  );
  return {
    elementId: element.elementId,
    nodeIds: [...element.nodeIds],
    strain: { epsilonX: strain[0], epsilonY: strain[1], gammaXY: strain[2] },
    elasticStrain: physicalElasticStrain(model.formulation, strain, appliedThermalStrain),
    stress: { sigmaX, sigmaY, sigmaZ, tauXY },
    principalMaximum: principal.maximum,
    principalMinimum: principal.minimum,
    maximumInPlaneShear: principal.radius,
    vonMises,
    strainEnergy: energy,
    sourceReferences: element.sourceReferences,
    formulaIds: [
      FORMULA_IDS.STRAIN,
      FORMULA_IDS.STRESS,
      FORMULA_IDS.SIGMA_Z,
      FORMULA_IDS.PRINCIPAL,
      FORMULA_IDS.VON_MISES,
      FORMULA_IDS.ENERGY,
    ],
  };
}

/**
 * T6/Q8 stress recovery: integration-point values remain numerical authority.
 * For PLANE_STRAIN_BBAR, the deviatoric strain remains pointwise while the
 * volumetric stress uses the exact retained element-mean dilatation row that
 * generated the stiffness. Temperature is source-blocked for this formulation.
 */
function recoverGaussPointElement(
  model,
  element,
  material,
  u,
  dofIndex,
  appliedThermalStrain,
) {
  const indices = element.localDofOrdering.map((id) => dofIndex.get(id));
  const ue = indices.map((index) => u[index]);
  const bbar = isBbarPlaneStrain(model.formulation);
  if (bbar && appliedThermalStrain !== 0) {
    throw numericalError(
      'PLANE_STRAIN_BBAR_TEMPERATURE_RECOVERY_NOT_QUALIFIED',
      `elements.${element.elementId}`,
      'B-bar thermal/eigenstrain recovery is outside the qualified formulation envelope.',
    );
  }
  if (bbar && !element.bbarEvidence?.meanVolumetricRow) {
    throw numericalError(
      'PLANE_STRAIN_BBAR_EVIDENCE_MISSING',
      `elements.${element.elementId}`,
      'B-bar recovery requires the retained mean-dilatation element evidence used for stiffness.',
    );
  }
  const thetaBar = bbar
    ? bbarMeanDilatation(element.bbarEvidence.meanVolumetricRow, ue)
    : null;
  let standardEnergy = 0;
  const gaussPointResults = element.gaussEvidence.map((gp) => {
    const strain = matrixVector(gp.B, ue);
    let stress;
    let elasticStrain;
    if (bbar) {
      stress = recoverBbarPlaneStrainStress(strain, thetaBar, material);
      elasticStrain = physicalElasticStrain(model.formulation, strain, 0);
    } else {
      const reducedThermal = reducedThermalStrainVector(
        model.formulation,
        material,
        appliedThermalStrain,
      );
      const constitutiveStrain = subtractVector(strain, reducedThermal);
      const inPlane = matrixVector(element.dMatrix, constitutiveStrain);
      const [sigmaX, sigmaY, tauXY] = inPlane;
      const sigmaZ = recoverSigmaZ(
        model.formulation,
        material,
        sigmaX,
        sigmaY,
        appliedThermalStrain,
      );
      stress = { sigmaX, sigmaY, sigmaZ, tauXY };
      elasticStrain = physicalElasticStrain(model.formulation, strain, appliedThermalStrain);
      const density = elasticEnergyDensity(
        model.formulation,
        strain,
        stress,
        appliedThermalStrain,
      );
      standardEnergy += density * gp.weight * gp.jacobianDeterminant * element.thickness;
    }
    const principal = principalStress(stress.sigmaX, stress.sigmaY, stress.tauXY);
    const vonMises = vonMisesStress(
      stress.sigmaX,
      stress.sigmaY,
      stress.sigmaZ,
      stress.tauXY,
    );
    return {
      pointId: gp.pointId,
      xi: gp.xi,
      eta: gp.eta,
      weight: gp.weight,
      jacobianDeterminant: gp.jacobianDeterminant,
      strain: { epsilonX: strain[0], epsilonY: strain[1], gammaXY: strain[2] },
      elasticStrain,
      stress,
      ...(bbar ? { meanDilatation: thetaBar } : {}),
      principalMaximum: principal.maximum,
      principalMinimum: principal.minimum,
      maximumInPlaneShear: principal.radius,
      vonMises,
    };
  });
  const bbarEnergy = bbar
    ? bbarElementElasticEnergy(
      element.gaussEvidence,
      ue,
      element.bbarEvidence.meanVolumetricRow,
      material,
      element.thickness,
    )
    : null;
  return {
    elementId: element.elementId,
    elementType: element.elementType,
    nodeIds: [...element.nodeIds],
    recoveryLayer: 'INTEGRATION_POINT',
    gaussPointResults,
    strainEnergy: bbarEnergy?.strainEnergy
      ?? canonicalNumber(standardEnergy, 'element elastic strain energy'),
    ...(bbarEnergy ? {
      bbarEnergy: {
        meanDilatation: bbarEnergy.meanDilatation,
        deviatoricEnergy: bbarEnergy.deviatoricEnergy,
        volumetricEnergy: bbarEnergy.volumetricEnergy,
      },
    } : {}),
    sourceReferences: element.sourceReferences,
    formulaIds: [
      FORMULA_IDS.STRAIN,
      ...(bbar ? [BBAR_FORMULA_IDS.STRESS, BBAR_FORMULA_IDS.ENERGY] : [FORMULA_IDS.STRESS]),
      FORMULA_IDS.SIGMA_Z,
      FORMULA_IDS.PRINCIPAL,
      FORMULA_IDS.VON_MISES,
      FORMULA_IDS.ENERGY,
    ],
  };
}

function recoverSigmaZ(formulation, material, sigmaX, sigmaY, thermalStrain) {
  if (!isPlaneStrainFormulation(formulation)) return 0;
  return canonicalNumber(
    material.poissonRatio * (sigmaX + sigmaY)
      - material.elasticModulus * thermalStrain,
    'plane strain sigma z',
  );
}

function physicalElasticStrain(formulation, strain, thermalStrain) {
  return {
    epsilonX: canonicalNumber(strain[0] - thermalStrain, 'elastic strain x'),
    epsilonY: canonicalNumber(strain[1] - thermalStrain, 'elastic strain y'),
    epsilonZ: isPlaneStrainFormulation(formulation)
      ? canonicalNumber(-thermalStrain, 'elastic strain z')
      : null,
    gammaXY: canonicalNumber(strain[2], 'elastic shear strain'),
  };
}

function elasticEnergyDensity(formulation, strain, stress, thermalStrain) {
  const epsilonX = strain[0] - thermalStrain;
  const epsilonY = strain[1] - thermalStrain;
  const epsilonZ = isPlaneStrainFormulation(formulation) ? -thermalStrain : 0;
  return 0.5 * (
    stress.sigmaX * epsilonX
    + stress.sigmaY * epsilonY
    + stress.sigmaZ * epsilonZ
    + stress.tauXY * strain[2]
  );
}

function subtractVector(left, right) {
  return left.map((value, index) => value - right[index]);
}

export function principalStress(sigmaX, sigmaY, tauXY) {
  const average = (sigmaX + sigmaY) / 2;
  const radius = Math.hypot((sigmaX - sigmaY) / 2, tauXY);
  return {
    maximum: canonicalNumber(average + radius, 'principal maximum'),
    minimum: canonicalNumber(average - radius, 'principal minimum'),
    radius: canonicalNumber(radius, 'maximum in-plane shear'),
  };
}

export function vonMisesStress(sigmaX, sigmaY, sigmaZ, tauXY) {
  return canonicalNumber(
    Math.sqrt(
      0.5 * (
        (sigmaX - sigmaY) ** 2
        + (sigmaY - sigmaZ) ** 2
        + (sigmaZ - sigmaX) ** 2
      ) + 3 * tauXY ** 2,
    ),
    'von Mises stress',
  );
}

function displacements(model, solution, mesh) {
  const index = new Map(mesh.dofOrdering.map((id, i) => [id, i]));
  return model.nodes.map((node) => ({
    nodeId: node.nodeId,
    ux: solution.displacementVector[index.get(`${node.nodeId}:UX`)],
    uy: solution.displacementVector[index.get(`${node.nodeId}:UY`)],
    sourceReference: node.sourceReference,
  }));
}
