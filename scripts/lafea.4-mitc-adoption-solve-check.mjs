import assert from 'node:assert/strict';
import { CANONICAL_UNITS } from '../src/core/local-shell/constants.js';
import {
  MITC4_TOPOLOGY,
  MITC_ADOPTION_MODEL_SCHEMA,
  MITC_ADOPTION_ROUTE_STATUS,
  createExperimentalMitcAdoptionModel,
} from '../src/core/local-shell/mitc-adoption-model.js';
import {
  MITC_ADOPTION_EXECUTION_SCHEMA,
  solveExperimentalMitcLoadCase,
} from '../src/core/local-shell/mitc-adoption-solve.js';
import { MITC4_FORMULATION } from '../src/core/local-shell/mitc4-element.js';
import { flatNode, qualificationProfile } from './lafea.4-fixtures.mjs';

const nodes = [
  flatNode('A', 0, 0),
  flatNode('B', 100, 0),
  flatNode('C', 100, 50),
  flatNode('D', 0, 50),
];
const model = createExperimentalMitcAdoptionModel({
  schema: MITC_ADOPTION_MODEL_SCHEMA,
  modelIdentity: 'MITC4-ADOPTION-SOLVE',
  modelVersion: '1',
  sourceAncestry: ['fixture/local-shell-mitc-adoption-solve/v1'],
  units: { ...CANONICAL_UNITS },
  materials: [{
    materialId: 'MAT', elasticModulus: 200000, poissonRatio: 0.3, sourceReference: 'MAT-SRC',
  }],
  nodes,
  elements: [{
    elementId: 'Q1', formulation: MITC4_FORMULATION, topology: MITC4_TOPOLOGY,
    nodeIds: ['A', 'B', 'C', 'D'], materialId: 'MAT', thickness: 2, sourceReference: 'Q1-SRC',
  }],
  qualificationProfile: qualificationProfile(),
  mitcQualification: {
    quadPlanarity: { absolute: 1e-9, relative: 1e-8 },
    rigidBodyEnergy: { absolute: 1e-9, relative: 1e-9 },
  },
  routeStatus: MITC_ADOPTION_ROUTE_STATUS,
  contributesToLafea4ProductionQualification: false,
});

// Fully fixed pressure: q=0 exactly, so R=Kq-F=-F is an independent reaction
// oracle. This simultaneously checks pressure-vector custody, global DOF order,
// reaction sign and force/moment equilibrium without relying on a displacement
// solution as its own expected value.
{
  const result = solveExperimentalMitcLoadCase(model, execution({
    loadCaseId: 'FIXED-PRESSURE',
    constraints: fullyFixed(nodes),
    pressureLoads: [pressureLoad('P1', 2)],
  }));
  assert.equal(result.routeStatus, MITC_ADOPTION_ROUTE_STATUS);
  assert.equal(result.contributesToLafea4ProductionQualification, false);
  assert.equal(result.meshEvidence.stiffnessStorage, 'DENSE');
  assert.equal(result.solverEvidence.method, 'FULLY_CONSTRAINED_NO_FREE_SOLVE');
  assert.equal(result.freeDofIdentities.length, 0);
  result.displacement.forEach((value) => close(value, 0));
  result.reaction.forEach((value, index) => close(value, -result.appliedLoadEvidence.forceVector[index]));
  assert.equal(result.forceEquilibrium.qualification.accepted, true);
  assert.equal(result.momentEquilibrium.qualification.accepted, true);
  vectorClose(result.appliedLoadEvidence.appliedForce, [0, 0, 10000]);
  vectorClose(result.appliedLoadEvidence.appliedMomentAboutOrigin, [250000, -500000, 0]);
  console.log('✅ Fully fixed MITC4 pressure case satisfies the independent R=-F and global force/moment equilibrium oracle.');
}

// Fully fixed nodal force + tangent moments checks the exact generalized-load
// order [FX,FY,FZ,M1,M2]. With q=0 every constrained reaction component is the
// exact negative of its applied generalized component.
{
  const result = solveExperimentalMitcLoadCase(model, execution({
    loadCaseId: 'FIXED-NODAL',
    constraints: fullyFixed(nodes),
    nodalLoads: [{
      loadId: 'N1', nodeId: 'C', fx: 11, fy: -7, fz: 5, m1: 13, m2: -17,
      sourceReference: 'N1-SRC',
    }],
  }));
  const offset = result.meshEvidence.dofOrdering.indexOf('C:UX');
  assert.deepEqual(
    result.appliedLoadEvidence.forceVector.slice(offset, offset + 5),
    [11, -7, 5, 13, -17],
  );
  assert.deepEqual(
    result.reaction.slice(offset, offset + 5),
    [-11, 7, -5, -13, 17],
  );
  assert.equal(result.forceEquilibrium.qualification.accepted, true);
  assert.equal(result.momentEquilibrium.qualification.accepted, true);
  console.log('✅ MITC nodal force/tangent-moment mapping preserves the existing five-generalized-DOF load convention.');
}

// Prescribed global rigid motion with no external load is an independent Kq=0
// oracle for the complete local->global element transformation plus assembly.
{
  const result = solveExperimentalMitcLoadCase(model, execution({
    loadCaseId: 'RIGID-MOTION',
    constraints: prescribedRigidMotion(nodes, [1, -2, 0.5], [0.002, -0.001, 0.003]),
  }));
  assert.equal(result.solverEvidence.method, 'FULLY_CONSTRAINED_NO_FREE_SOLVE');
  const maximumReaction = Math.max(...result.reaction.map(Math.abs));
  assert.ok(maximumReaction < 1e-4, `rigid motion must have near-zero Kq action; got ${maximumReaction}`);
  assert.equal(result.forceEquilibrium.qualification.accepted, true);
  assert.equal(result.momentEquilibrium.qualification.accepted, true);
  console.log('✅ Prescribed global rigid motion remains an energy-free assembled MITC mode.');
}

// A real free-DOF solve: left edge fixed, right edge pressure-loaded. The
// numerical method must be the existing parent dense Cholesky owner, with free
// residual and support equilibrium qualifications retained.
{
  const constraints = ['A', 'D'].flatMap((nodeId) =>
    ['UX', 'UY', 'UZ', 'R1', 'R2'].map((dof) => constraint(nodeId, dof, 0)));
  const result = solveExperimentalMitcLoadCase(model, execution({
    loadCaseId: 'CANTILEVER-PRESSURE',
    constraints,
    pressureLoads: [pressureLoad('P1', 0.01)],
  }));
  assert.equal(result.solverEvidence.method, 'DETERMINISTIC_DENSE_CHOLESKY');
  assert.ok(result.freeDofIdentities.length > 0);
  assert.equal(result.freeDofResidualQualification.accepted, true);
  assert.equal(result.forceEquilibrium.qualification.accepted, true);
  assert.equal(result.momentEquilibrium.qualification.accepted, true);
  assert.ok(Math.max(...result.displacement.map(Math.abs)) > 0);
  console.log('✅ MITC free-DOF solve reuses parent dense Cholesky and preserves residual/equilibrium evidence.');
}

// Under-constrained MITC must fail through the existing shell singular-system
// gate. No stabilization, drilling penalty, regularization or formulation
// fallback is authorized by the adoption adapter.
assert.throws(
  () => solveExperimentalMitcLoadCase(model, execution({
    loadCaseId: 'SINGULAR',
    constraints: [],
    pressureLoads: [pressureLoad('P1', 0.01)],
  })),
  /singular, indefinite or under-constrained/,
);
console.log('✅ Under-constrained MITC model fails closed through the parent solver authority.');

console.log('\n✅ LAFEA.4 experimental MITC assembly/solve adoption check passed.');

function execution(overrides) {
  return {
    schema: MITC_ADOPTION_EXECUTION_SCHEMA,
    loadCaseId: overrides.loadCaseId,
    constraints: overrides.constraints ?? [],
    nodalLoads: overrides.nodalLoads ?? [],
    pressureLoads: overrides.pressureLoads ?? [],
    sourceReference: `${overrides.loadCaseId}-SRC`,
  };
}

function pressureLoad(pressureLoadId, pressure) {
  return {
    pressureLoadId,
    elementId: 'Q1',
    pressure,
    sense: 'ALONG_ELEMENT_NORMAL',
    sourceReference: `${pressureLoadId}-SRC`,
  };
}

function fullyFixed(allNodes) {
  return allNodes.flatMap((node) =>
    ['UX', 'UY', 'UZ', 'R1', 'R2'].map((dof) => constraint(node.nodeId, dof, 0)));
}

function prescribedRigidMotion(allNodes, translation, omega) {
  return allNodes.flatMap((node) => {
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

function vectorClose(actual, expected) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => close(value, expected[index]));
}

function close(actual, expected, tolerance = 1e-9) {
  const scale = Math.max(1, Math.abs(expected));
  assert.ok(Math.abs(actual - expected) <= tolerance * scale, `${actual} != ${expected}`);
}
