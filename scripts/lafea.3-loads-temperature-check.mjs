import assert from 'node:assert/strict';
import {
  calculateLocalContinuum,
  createCanonicalLocalContinuumModel,
  FORMULATIONS,
  QUALIFICATION_STATES,
} from '../src/core/local-continuum/index.js';
import { triangleSource } from './lafea.3-fixtures.mjs';

const thermalStrain = 0.001;
const elasticModulus = 200000;
const poissonRatio = 0.3;
const volume = 0.5 * 100 * 100 * 10;

// Plane stress: a rigid-body-stabilized element under uniform free thermal
// strain expands without elastic stress or stored elastic energy.
const t3Model = thermalTriangle(FORMULATIONS.PLANE_STRESS);
const t3Result = calculateLocalContinuum(createCanonicalLocalContinuumModel(t3Model));
assert.equal(t3Result.qualification.state, QUALIFICATION_STATES.ACCEPTED);
const t3Case = t3Result.loadCaseResults[0];
const t3Element = t3Case.elementResults[0];
close(t3Element.strain.epsilonX, thermalStrain);
close(t3Element.strain.epsilonY, thermalStrain);
tiny(t3Element.strain.gammaXY);
tiny(t3Element.stress.sigmaX);
tiny(t3Element.stress.sigmaY);
tiny(t3Element.stress.sigmaZ);
tiny(t3Element.stress.tauXY);
tiny(t3Element.strainEnergy);
tiny(t3Case.totalStrainEnergy);
assert.equal(t3Case.energyQualification.energyDefinition, 'PHYSICAL_ELASTIC_STRAIN_ENERGY');
assert.equal(t3Case.energyQualification.accepted, true);

// Plane strain: in-plane boundaries remain traction-free, but epsilon_z = 0
// is the formulation constraint. The exact isotropic thermoelastic solution is
// epsilon_x = epsilon_y = (1 + nu) alpha*dT, sigma_x=sigma_y=0 and
// sigma_z = -E alpha*dT. Stored energy is therefore non-zero solely because
// the out-of-plane free thermal strain is restrained by plane strain.
const psnModel = thermalTriangle(FORMULATIONS.PLANE_STRAIN);
const psnResult = calculateLocalContinuum(createCanonicalLocalContinuumModel(psnModel));
assert.equal(psnResult.qualification.state, QUALIFICATION_STATES.ACCEPTED);
const psnCase = psnResult.loadCaseResults[0];
const psnElement = psnCase.elementResults[0];
const expectedInPlaneStrain = (1 + poissonRatio) * thermalStrain;
close(psnElement.strain.epsilonX, expectedInPlaneStrain);
close(psnElement.strain.epsilonY, expectedInPlaneStrain);
tiny(psnElement.strain.gammaXY);
tiny(psnElement.stress.sigmaX);
tiny(psnElement.stress.sigmaY);
close(psnElement.stress.sigmaZ, -elasticModulus * thermalStrain);
tiny(psnElement.stress.tauXY);
close(psnElement.elasticStrain.epsilonX, poissonRatio * thermalStrain);
close(psnElement.elasticStrain.epsilonY, poissonRatio * thermalStrain);
close(psnElement.elasticStrain.epsilonZ, -thermalStrain);
const expectedPlaneStrainEnergy = 0.5 * elasticModulus * thermalStrain ** 2 * volume;
close(psnElement.strainEnergy, expectedPlaneStrainEnergy);
close(psnCase.totalStrainEnergy, expectedPlaneStrainEnergy);
assert.equal(psnCase.energyQualification.accepted, true);

// Fully restrained plane stress: epsilon_x=epsilon_y=0 and the exact biaxial
// compressive thermal stress is -E*e/(1-nu). The physical elastic energy must
// include both in-plane normal components and no sigma_z contribution.
const restrainedStress = restrainedThermalTriangle(FORMULATIONS.PLANE_STRESS);
const restrainedStressResult = calculateLocalContinuum(
  createCanonicalLocalContinuumModel(restrainedStress),
);
assert.equal(restrainedStressResult.qualification.state, QUALIFICATION_STATES.ACCEPTED);
const restrainedStressCase = restrainedStressResult.loadCaseResults[0];
const restrainedStressElement = restrainedStressCase.elementResults[0];
const expectedPlaneStressSigma = -elasticModulus * thermalStrain / (1 - poissonRatio);
close(restrainedStressElement.strain.epsilonX, 0);
close(restrainedStressElement.strain.epsilonY, 0);
close(restrainedStressElement.stress.sigmaX, expectedPlaneStressSigma);
close(restrainedStressElement.stress.sigmaY, expectedPlaneStressSigma);
tiny(restrainedStressElement.stress.sigmaZ);
const expectedRestrainedPlaneStressEnergy = (
  elasticModulus * thermalStrain ** 2 / (1 - poissonRatio)
) * volume;
close(restrainedStressElement.strainEnergy, expectedRestrainedPlaneStressEnergy);
close(restrainedStressCase.totalStrainEnergy, expectedRestrainedPlaneStressEnergy);
assert.equal(restrainedStressCase.freeDofResiduals.length, 0);
assert.equal(restrainedStressCase.energyQualification.accepted, true);

// Fully restrained plane strain: all three normal thermal strains are blocked.
// The exact triaxial stress is -E*e/(1-2nu) in x,y,z and the physical elastic
// energy density is 3/2 * E*e^2/(1-2nu).
const restrainedStrain = restrainedThermalTriangle(FORMULATIONS.PLANE_STRAIN);
const restrainedStrainResult = calculateLocalContinuum(
  createCanonicalLocalContinuumModel(restrainedStrain),
);
assert.equal(restrainedStrainResult.qualification.state, QUALIFICATION_STATES.ACCEPTED);
const restrainedStrainCase = restrainedStrainResult.loadCaseResults[0];
const restrainedStrainElement = restrainedStrainCase.elementResults[0];
const expectedPlaneStrainSigma = -elasticModulus * thermalStrain / (1 - 2 * poissonRatio);
close(restrainedStrainElement.stress.sigmaX, expectedPlaneStrainSigma);
close(restrainedStrainElement.stress.sigmaY, expectedPlaneStrainSigma);
close(restrainedStrainElement.stress.sigmaZ, expectedPlaneStrainSigma);
const expectedRestrainedPlaneStrainEnergy = (
  1.5 * elasticModulus * thermalStrain ** 2 / (1 - 2 * poissonRatio)
) * volume;
close(restrainedStrainElement.strainEnergy, expectedRestrainedPlaneStrainEnergy);
close(restrainedStrainCase.totalStrainEnergy, expectedRestrainedPlaneStrainEnergy);
assert.equal(restrainedStrainCase.freeDofResiduals.length, 0);
assert.equal(restrainedStrainCase.energyQualification.accepted, true);

// Same zero-stress / zero-elastic-energy free-expansion check for a T6 plane
// stress element, exercising integration-point recovery and energy quadrature.
const t6Model = t6ThermalSource();
const t6Result = calculateLocalContinuum(createCanonicalLocalContinuumModel(t6Model));
assert.equal(t6Result.qualification.state, QUALIFICATION_STATES.ACCEPTED);
const t6Case = t6Result.loadCaseResults[0];
const t6Element = t6Case.elementResults[0];
t6Element.gaussPointResults.forEach((gp) => {
  close(gp.strain.epsilonX, thermalStrain);
  close(gp.strain.epsilonY, thermalStrain);
  tiny(gp.strain.gammaXY);
  tiny(gp.stress.sigmaX);
  tiny(gp.stress.sigmaY);
  tiny(gp.stress.sigmaZ);
  tiny(gp.stress.tauXY);
});
tiny(t6Element.strainEnergy);
tiny(t6Case.totalStrainEnergy);

console.log('LAFEA.3 thermoelastic load — free and fully restrained plane-stress/plane-strain analytical stress-energy checks plus T6 IP recovery passed.');

function thermalTriangle(formulation) {
  const model = triangleSource({ formulation, elasticModulus });
  model.materials[0].poissonRatio = poissonRatio;
  model.loadCases = [thermalLoadCase()];
  model.resultRequests = { loadCaseIds: ['THERMAL'] };
  return model;
}

function restrainedThermalTriangle(formulation) {
  const model = thermalTriangle(formulation);
  model.constraints = model.nodes.flatMap((row) => [
    c(row.nodeId, 'UX'),
    c(row.nodeId, 'UY'),
  ]);
  return model;
}

function thermalLoadCase() {
  return {
    loadCaseId: 'THERMAL',
    nodalForces: [],
    edgeTractions: [],
    pressureLoads: [],
    bodyForces: [],
    temperatureLoads: [{
      temperatureLoadId: 'T1',
      elementId: 'E1',
      thermalStrain,
      sourceReference: 'THERMAL#T1',
    }],
    imposedDisplacements: [],
    sourceReference: 'CASE#THERMAL',
  };
}

function t6ThermalSource() {
  return {
    schema: 'local-continuum-model/v1',
    modelIdentity: 'T6_THERMAL',
    modelVersion: '1',
    sourceAncestry: {
      sourceModelIdentity: 'FIXTURE',
      sourceVersion: '1',
      adapterIdentity: 'LAFEA3_LOADS_TEST',
      adapterVersion: '1',
    },
    units: { length: 'mm', force: 'N', stress: 'MPa', modulus: 'MPa' },
    formulation: 'PLANE_STRESS',
    materials: [{
      materialId: 'MAT',
      elasticModulus,
      poissonRatio,
      sourceReference: 'MATERIAL#MAT',
    }],
    nodes: [
      n('A', 0, 0), n('B', 2, 0), n('C', 0, 2),
      n('D', 1, 0), n('E', 1, 1), n('F', 0, 1),
    ],
    elements: [{
      elementId: 'E1',
      elementType: 'T6',
      nodeIds: ['A', 'B', 'C', 'D', 'E', 'F'],
      materialId: 'MAT',
      thickness: 1,
      sourceReference: 'ELEMENT#E1',
    }],
    elementTypePolicy: { allowT3Fallback: false, sourceReference: 'T6_ONLY' },
    constraints: [c('A', 'UX'), c('A', 'UY'), c('B', 'UY'), c('D', 'UY')],
    loadCases: [thermalLoadCase()],
    resultRequests: { loadCaseIds: ['THERMAL'] },
    qualificationProfile: {
      schema: 'local-continuum-qualification-profile/v1',
      identity: 'LOADS_TEST_PROFILE',
      tolerances: toleranceTable(),
    },
    limitations: [],
  };
}
function n(nodeId, x, y) {
  return { nodeId, x, y, sourceReference: `NODE#${nodeId}` };
}
function c(nodeId, dof) {
  return {
    constraintId: `${nodeId}-${dof}`,
    nodeId,
    dof,
    value: 0,
    sourceReference: `CONSTRAINT#${nodeId}-${dof}`,
  };
}
function toleranceTable() {
  const tight = { absolute: 1e-9, relative: 1e-9 };
  const loose = { absolute: 1e-6, relative: 1e-6 };
  return {
    minimumElementArea: tight,
    stiffnessSymmetry: tight,
    constitutiveSymmetry: tight,
    choleskyPivot: tight,
    freeDofResidual: loose,
    reactionEquilibrium: loose,
    strainEnergy: loose,
    rigidBodyStrain: tight,
    patchTestStress: tight,
  };
}
function close(actual, expected) {
  assert.ok(
    Math.abs(actual - expected) <= 1e-6 * Math.max(1, Math.abs(expected)),
    `${actual} != ${expected}`,
  );
}
function tiny(value) {
  assert.ok(Math.abs(value) <= 1e-6, `expected near-zero, got ${value}`);
}
