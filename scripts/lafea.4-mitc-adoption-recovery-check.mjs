import assert from 'node:assert/strict';
import { CANONICAL_UNITS } from '../src/core/local-shell/constants.js';
import {
  MITC3_TOPOLOGY,
  MITC4_TOPOLOGY,
  MITC_ADOPTION_MODEL_SCHEMA,
  MITC_ADOPTION_ROUTE_STATUS,
  createExperimentalMitcAdoptionModel,
} from '../src/core/local-shell/mitc-adoption-model.js';
import {
  recoverExperimentalMitcLoadCase,
} from '../src/core/local-shell/mitc-adoption-recovery.js';
import {
  MITC_ADOPTION_EXECUTION_SCHEMA,
  solveExperimentalMitcLoadCase,
} from '../src/core/local-shell/mitc-adoption-solve.js';
import { MITC3_FORMULATION } from '../src/core/local-shell/mitc3-element.js';
import { MITC4_FORMULATION } from '../src/core/local-shell/mitc4-element.js';
import { flatNode, qualificationProfile } from './lafea.4-fixtures.mjs';

const E = 200000;
const NU = 0.3;
const D0 = E / (1 - NU ** 2);

// Closed-form affine membrane oracle on a rectangular MITC4. Bilinear Q4
// interpolation reproduces this field exactly, so every Gauss point must have
// the same membrane strain/stress, zero curvature and zero transverse shear.
{
  const model = mitc4Model();
  const epsilonX = 0.001;
  const epsilonY = -0.0002;
  const constraints = model.nodes.flatMap((node) => {
    const [x, y] = node.position;
    const values = [epsilonX * x, epsilonY * y, 0, 0, 0];
    return ['UX', 'UY', 'UZ', 'R1', 'R2'].map((dof, index) =>
      constraint(node.nodeId, dof, values[index]));
  });
  const solved = solveExperimentalMitcLoadCase(model, execution('MEMBRANE', constraints));
  const recovery = recoverExperimentalMitcLoadCase(model, solved);
  const element = recovery.elementResults[0];
  const expectedStress = [
    D0 * (epsilonX + NU * epsilonY),
    D0 * (NU * epsilonX + epsilonY),
    0,
  ];
  for (const point of element.integrationPoints) {
    close(point.membraneStrain.epsilonX, epsilonX);
    close(point.membraneStrain.epsilonY, epsilonY);
    close(point.membraneStrain.gammaXY, 0);
    close(point.curvature.kappaX, 0);
    close(point.curvature.kappaY, 0);
    close(point.curvature.kappaXY, 0);
    close(point.transverseShearStrain.gammaXZ, 0);
    close(point.transverseShearStrain.gammaYZ, 0);
    close(point.transverseShearResultant.qX, 0);
    close(point.transverseShearResultant.qY, 0);
    for (const surface of point.surfaces) {
      close(surface.combinedStress.sigmaX, expectedStress[0]);
      close(surface.combinedStress.sigmaY, expectedStress[1]);
      close(surface.combinedStress.tauXY, 0);
      const vm = Math.sqrt(
        expectedStress[0] ** 2
        - expectedStress[0] * expectedStress[1]
        + expectedStress[1] ** 2,
      );
      close(surface.vonMises, vm);
      assert.equal(surface.invariantAuthority, 'PLANE_STRESS_SAME_POINT_IN_PLANE_ONLY');
    }
  }
  const strainVector = [epsilonX, epsilonY, 0];
  const stressVector = expectedStress;
  const densityTwice = strainVector.reduce(
    (sum, value, index) => sum + value * stressVector[index],
    0,
  );
  const expectedEnergy = 0.5 * 5000 * 2 * densityTwice;
  close(recovery.membraneStrainEnergy, expectedEnergy, 1e-8);
  close(recovery.bendingStrainEnergy, 0);
  close(recovery.transverseShearStrainEnergy, 0);
  close(recovery.totalStrainEnergy, expectedEnergy, 1e-8);
  assert.equal(recovery.energyQualification.accepted, true);
  assert.equal(recovery.transverseShearIncludedInInPlaneVonMises, false);
  console.log('✅ MITC4 affine membrane recovery matches closed-form plane-stress strain, stress, von Mises and energy.');
}

// Global rigid motion must recover zero physical strains and zero energy after
// the beta-slope transformation. This is a direct falsifier for the original
// incorrect betaX/betaY-as-physical-rotation mapping.
{
  const model = mitc4Model();
  const constraints = prescribedRigidMotion(model.nodes, [1, -2, 0.5], [0.002, -0.001, 0.003]);
  const solved = solveExperimentalMitcLoadCase(model, execution('RIGID', constraints));
  const recovery = recoverExperimentalMitcLoadCase(model, solved);
  for (const point of recovery.elementResults[0].integrationPoints) {
    close(point.membraneStrain.epsilonX, 0, 1e-8);
    close(point.membraneStrain.epsilonY, 0, 1e-8);
    close(point.membraneStrain.gammaXY, 0, 1e-8);
    close(point.curvature.kappaX, 0, 1e-8);
    close(point.curvature.kappaY, 0, 1e-8);
    close(point.curvature.kappaXY, 0, 1e-8);
    close(point.transverseShearStrain.gammaXZ, 0, 1e-8);
    close(point.transverseShearStrain.gammaYZ, 0, 1e-8);
  }
  close(recovery.totalStrainEnergy, 0, 1e-8);
  assert.equal(recovery.energyQualification.accepted, true);
  console.log('✅ MITC4 rigid-body motion recovers zero membrane/bending/shear strain and zero energy.');
}

// A pressure-loaded cantilever must retain non-zero Reissner-Mindlin shear
// evidence, and the independently integrated membrane+bending+shear energies
// must reconstruct 0.5*q^T*K*q. The in-plane von Mises identity remains
// separate from transverse shear.
{
  const model = mitc4Model();
  const fixed = ['A', 'D'].flatMap((nodeId) =>
    ['UX', 'UY', 'UZ', 'R1', 'R2'].map((dof) => constraint(nodeId, dof, 0)));
  const solved = solveExperimentalMitcLoadCase(model, execution(
    'PRESSURE',
    fixed,
    [],
    [{
      pressureLoadId: 'P1', elementId: 'Q1', pressure: 0.01,
      sense: 'ALONG_ELEMENT_NORMAL', sourceReference: 'P1-SRC',
    }],
  ));
  const recovery = recoverExperimentalMitcLoadCase(model, solved);
  assert.ok(recovery.totalStrainEnergy > 0);
  assert.ok(recovery.transverseShearStrainEnergy > 0);
  assert.equal(recovery.energyQualification.accepted, true);
  const shearValues = recovery.elementResults[0].integrationPoints.flatMap((point) => [
    point.transverseShearResultant.qX,
    point.transverseShearResultant.qY,
  ]);
  assert.ok(Math.max(...shearValues.map(Math.abs)) > 0);
  for (const point of recovery.elementResults[0].integrationPoints) {
    for (const surface of point.surfaces) {
      assert.ok(Number.isFinite(surface.vonMises));
      assert.equal(surface.invariantAuthority, 'PLANE_STRESS_SAME_POINT_IN_PLANE_ONLY');
    }
  }
  assert.equal(recovery.transverseShearIncludedInInPlaneVonMises, false);
  console.log('✅ Pressure-loaded MITC4 retains nonzero shear resultants and reconstructs total elastic energy without redefining in-plane von Mises.');
}

// MITC3 recovery uses its explicit TRI3 formulation and constant membrane B,
// not a hidden MITC4 substitution. Affine membrane strain is again exact.
{
  const model = mitc3Model();
  const epsilonX = 0.0005;
  const constraints = model.nodes.flatMap((node) => {
    const [x] = node.position;
    const values = [epsilonX * x, 0, 0, 0, 0];
    return ['UX', 'UY', 'UZ', 'R1', 'R2'].map((dof, index) =>
      constraint(node.nodeId, dof, values[index]));
  });
  const solved = solveExperimentalMitcLoadCase(model, execution('MITC3-MEMBRANE', constraints));
  const recovery = recoverExperimentalMitcLoadCase(model, solved);
  assert.equal(recovery.elementResults[0].formulation, MITC3_FORMULATION);
  for (const point of recovery.elementResults[0].integrationPoints) {
    close(point.membraneStrain.epsilonX, epsilonX);
    close(point.membraneStrain.epsilonY, 0);
    close(point.membraneStrain.gammaXY, 0);
    close(point.transverseShearStrain.gammaXZ, 0);
    close(point.transverseShearStrain.gammaYZ, 0);
  }
  assert.equal(recovery.energyQualification.accepted, true);
  console.log('✅ MITC3 affine membrane recovery remains explicit TRI3 evidence with zero spurious shear.');
}

console.log('\n✅ LAFEA.4 experimental MITC recovery adoption check passed.');

function mitc4Model() {
  return modelFrom({
    modelIdentity: 'MITC4-RECOVERY',
    nodes: [
      flatNode('A', 0, 0), flatNode('B', 100, 0),
      flatNode('C', 100, 50), flatNode('D', 0, 50),
    ],
    elements: [{
      elementId: 'Q1', formulation: MITC4_FORMULATION, topology: MITC4_TOPOLOGY,
      nodeIds: ['A', 'B', 'C', 'D'], materialId: 'MAT', thickness: 2, sourceReference: 'Q1-SRC',
    }],
  });
}

function mitc3Model() {
  return modelFrom({
    modelIdentity: 'MITC3-RECOVERY',
    nodes: [flatNode('A', 0, 0), flatNode('B', 100, 0), flatNode('C', 0, 50)],
    elements: [{
      elementId: 'T1', formulation: MITC3_FORMULATION, topology: MITC3_TOPOLOGY,
      nodeIds: ['A', 'B', 'C'], materialId: 'MAT', thickness: 2, sourceReference: 'T1-SRC',
    }],
  });
}

function modelFrom({ modelIdentity, nodes, elements }) {
  return createExperimentalMitcAdoptionModel({
    schema: MITC_ADOPTION_MODEL_SCHEMA,
    modelIdentity,
    modelVersion: '1',
    sourceAncestry: ['fixture/local-shell-mitc-adoption-recovery/v1'],
    units: { ...CANONICAL_UNITS },
    materials: [{
      materialId: 'MAT', elasticModulus: E, poissonRatio: NU, sourceReference: 'MAT-SRC',
    }],
    nodes,
    elements,
    qualificationProfile: qualificationProfile(),
    mitcQualification: {
      quadPlanarity: { absolute: 1e-9, relative: 1e-8 },
      rigidBodyEnergy: { absolute: 1e-9, relative: 1e-9 },
    },
    routeStatus: MITC_ADOPTION_ROUTE_STATUS,
    contributesToLafea4ProductionQualification: false,
  });
}

function execution(loadCaseId, constraints, nodalLoads = [], pressureLoads = []) {
  return {
    schema: MITC_ADOPTION_EXECUTION_SCHEMA,
    loadCaseId,
    constraints,
    nodalLoads,
    pressureLoads,
    sourceReference: `${loadCaseId}-SRC`,
  };
}

function prescribedRigidMotion(nodes, translation, omega) {
  return nodes.flatMap((node) => {
    const displacement = add3(translation, cross3(omega, node.position));
    const values = [
      ...displacement,
      dot3(omega, node.rotationBasis1),
      dot3(omega, node.rotationBasis2),
    ];
    return ['UX', 'UY', 'UZ', 'R1', 'R2'].map((dof, index) =>
      constraint(node.nodeId, dof, values[index]));
  });
}

function constraint(nodeId, dof, value) {
  return {
    constraintId: `C-${nodeId}-${dof}`,
    nodeId,
    dof,
    value,
    sourceReference: `C-${nodeId}-${dof}-SRC`,
  };
}

function add3(a, b) { return a.map((value, index) => value + b[index]); }
function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function dot3(a, b) { return a.reduce((sum, value, index) => sum + value * b[index], 0); }

function close(actual, expected, tolerance = 1e-9) {
  const scale = Math.max(1, Math.abs(expected));
  assert.ok(Math.abs(actual - expected) <= tolerance * scale, `${actual} != ${expected}`);
}
