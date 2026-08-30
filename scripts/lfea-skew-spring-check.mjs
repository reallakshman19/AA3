import assert from 'node:assert/strict';
import {
  classifyRestraint,
  restraintApproximationCodes,
  restraintDispositions,
} from '../src/core/linear-piping-analysis-consumer/inputxml-feature-inventory-restraints.js';
import { compileInputXmlStructuralConstraints } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-structural-constraints.js';
import {
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE as APPROXIMATE,
  STRICT_INPUTXML_LINEAR_STATIC_PROFILE as STRICT,
} from '../src/core/linear-piping-analysis-consumer/inputxml-model-health-profile.js';
import { requireConstraintDeclarations } from '../src/core/linear-fea-model-compiler/model-compiler-intake.js';
import {
  LINEAR_FEA_CONVENTIONS,
  LINEAR_FEA_FORMULATION_REGISTRY_VERSION,
  LINEAR_FEA_MODEL_SCHEMA,
  LINEAR_FEA_UNITS,
  LINEAR_FEA_VALIDATION_PROFILE,
  sealLinearFeaModel,
} from '../src/core/linear-fea-contract/index.js';
import { buildDofMap } from '../src/core/linear-fea-solver/dof-map.js';
import { assembleGlobalSystem } from '../src/core/linear-fea-solver/assembly.js';

const TOL = 1e-12;
const K = 1000;
const N = Object.freeze([0.6, 0.8, 0]);
const element = Object.freeze({ fromNodeId: '20', toNodeId: '30' });
const segment = Object.freeze({ startNodeId: '20', endNodeId: '30' });

function sourceAttributes(stiffness = '1000') {
  return {
    TYPE: '2.000000', NODE: '30.000000', STIFFNESS: stiffness,
    XCOSINE: '0.600000', YCOSINE: '0.800000', ZCOSINE: '0.000000',
    GAP: '-1.010100', FRIC_COEF: '-1.010100', CNODE: '-1.010100',
  };
}

function close(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) <= TOL * Math.max(1, Math.abs(expected)),
    `${label}: expected ${expected}, got ${actual}`);
}

// ---------------------------------------------------------------- source gate
const skew = classifyRestraint(sourceAttributes(), element, segment, 1);
const dispositions = restraintDispositions(skew);
assert.deepEqual(skew.direction.unit, N);
assert.equal(skew.stiffnessValue, K);
assert.equal(dispositions[STRICT].disposition, 'IMPLEMENTED_EXACTLY');
assert.equal(dispositions[APPROXIMATE].disposition, 'IMPLEMENTED_EXACTLY');
assert.ok(restraintApproximationCodes(skew).includes('DRAFT_SPRING_SUPPORT_NO_REFERENCE'),
  'self-authored skew spring evidence must remain DRAFT');

const rigidSkew = classifyRestraint(sourceAttributes('-1.010100'), element, segment, 1);
const rigidDispositions = restraintDispositions(rigidSkew);
for (const profile of [STRICT, APPROXIMATE]) {
  assert.equal(rigidDispositions[profile].disposition, 'UNSUPPORTED_BY_GENERIC_SOLVER');
  assert.equal(rigidDispositions[profile].limitationCode, 'MODEL_RESTRAINT_SKEW_DIRECTION_UNSUPPORTED');
}

// ----------------------------------------------------------- declaration path
const inventory = [Object.freeze({
  active: true,
  sourceKind: 'RESTRAINT',
  inventoryId: 'IXF.RESTRAINT.SKEW',
  sourceFeatureId: 'PIPINGELEMENT-0-RESTRAINT-0',
  sourceRecordSemanticHash: 'skew-source',
  classification: skew,
  dispositionByProfile: dispositions,
})];
const structural = compileInputXmlStructuralConstraints({
  inventory,
  modelId: 'SKEW',
  analysisProfileId: STRICT,
  conditionedNodeIds: ['30'],
});
assert.equal(structural.declarations.length, 1);
assert.deepEqual(structural.declarations[0], {
  declarationId: 'SKEW-C-PIPINGELEMENT-0-RESTRAINT-0-DIR',
  kind: 'PARTIAL_RELEASE_SPRING',
  nodeId: 'SKEW.N30',
  dof: null,
  direction: N,
  stiffness: K,
});
const accepted = requireConstraintDeclarations(structural.declarations);
assert.equal(accepted[0].behavior, 'LINEAR_SPRING');
assert.deepEqual(accepted[0].direction, N);

// ------------------------------------------------------------- sealed contract
const directionalConstraint = {
  constraintId: accepted[0].declarationId,
  nodeId: accepted[0].nodeId,
  dof: accepted[0].dof,
  behavior: accepted[0].behavior,
  basis: 'GLOBAL',
  stiffness: accepted[0].stiffness,
  direction: accepted[0].direction,
};
function modelCandidate(constraint = directionalConstraint) {
  return {
    schema: LINEAR_FEA_MODEL_SCHEMA,
    modelIdentity: 'SKEW.MODEL',
    modelRevision: 1,
    units: LINEAR_FEA_UNITS,
    conventions: LINEAR_FEA_CONVENTIONS,
    ancestry: {
      sourceSemanticHash: 'fnv1a64:0000000000000001',
      conditionedGeometrySemanticHash: 'fnv1a64:0000000000000002',
      compilerProfileSemanticHash: 'fnv1a64:0000000000000003',
    },
    formulationRegistryVersion: LINEAR_FEA_FORMULATION_REGISTRY_VERSION,
    validationProfile: { ...LINEAR_FEA_VALIDATION_PROFILE, semanticHash: '' },
    nodes: [{
      nodeId: 'SKEW.N30',
      position: { x: 0, y: 0, z: 0 },
      sourceAncestry: {
        conditionedNodeId: 'CN-30',
        sourceNodeIds: ['30'],
        sourceComponentIds: ['PIPINGELEMENT-0'],
        creationBasis: 'SOURCE-ENDPOINT',
      },
    }],
    materialStates: [], sectionStates: [], elements: [], constraints: [constraint],
    limitations: [], diagnostics: [],
    stiffnessStateHash: '', semanticHash: '', evidenceHash: '',
  };
}
const model = sealLinearFeaModel(modelCandidate());
assert.deepEqual(model.constraints[0].direction, N);
assert.throws(
  () => sealLinearFeaModel(modelCandidate({ ...directionalConstraint, direction: [0.6, 0.7, 0] })),
  (error) => error?.code === 'NONUNIT_CONSTRAINT_DIRECTION',
  'the model contract must never renormalize a non-unit support direction',
);

// ------------------------------------------------------------ exact k(n x n)
const dofMap = buildDofMap(model);
const assembled = assembleGlobalSystem({ model, dofMap, elementContributions: [] });
const at = (row, col) => assembled.K[row * assembled.n + col];
const expected = [
  [360, 480, 0],
  [480, 640, 0],
  [0, 0, 0],
];
for (let row = 0; row < 3; row += 1) {
  for (let col = 0; col < 3; col += 1) close(at(row, col), expected[row][col], `K[${row},${col}]`);
}
assert.equal(assembled.springCount, 1);
assert.equal(assembled.symmetryResidual, 0);
close(expected[0][0] + expected[1][1] + expected[2][2], K, 'trace / nonzero eigenvalue');
close(expected[0][0] * expected[1][1] - expected[0][1] * expected[1][0], 0, 'rank-one minor');

// f = k(n.u)n for u=(0.01,-0.02,0): n.u=-0.01, so f=(-6,-8,0) N.
const u = [0.01, -0.02, 0];
const force = expected.map((row) => row.reduce((sum, value, col) => sum + value * u[col], 0));
close(force[0], -6, 'fx');
close(force[1], -8, 'fy');
close(force[2], 0, 'fz');
close(N[0] * force[1] - N[1] * force[0], 0, 'force parallel to direction');
const q = N[0] * u[0] + N[1] * u[1] + N[2] * u[2];
close(q, -0.01, 'directional displacement');
close(force[0], K * q * N[0], 'constitutive fx');
close(force[1], K * q * N[1], 'constitutive fy');
close(0.5 * u.reduce((sum, value, row) => sum + value * force[row], 0), 0.5 * K * q * q, 'strain energy');

// ------------------------------------------- exact axis-aligned reduction proof
for (const [dof, direction] of [
  ['UX', [1, 0, 0]], ['UY', [0, 1, 0]], ['UZ', [0, 0, 1]],
]) {
  const directionalModel = {
    nodes: [{ nodeId: 'N1' }], elements: [],
    constraints: [{ constraintId: `D-${dof}`, nodeId: 'N1', dof: null,
      behavior: 'LINEAR_SPRING', basis: 'GLOBAL', stiffness: K, direction }],
  };
  const axisModel = {
    nodes: [{ nodeId: 'N1' }], elements: [],
    constraints: [{ constraintId: `A-${dof}`, nodeId: 'N1', dof,
      behavior: 'LINEAR_SPRING', basis: 'GLOBAL', stiffness: K }],
  };
  const directionalMap = buildDofMap(directionalModel);
  const axisMap = buildDofMap(axisModel);
  const directionalK = assembleGlobalSystem({ model: directionalModel, dofMap: directionalMap, elementContributions: [] }).K;
  const axisK = assembleGlobalSystem({ model: axisModel, dofMap: axisMap, elementContributions: [] }).K;
  assert.deepEqual(directionalK, axisK, `${dof} directional reduction must exactly equal the legacy axis spring`);
}

console.log(JSON.stringify({
  check: 'lfea-skew-spring',
  status: 'PASS',
  stiffness: K,
  direction: N,
  matrix: expected,
  displacement: u,
  force,
  scalarExtension: q,
  strainEnergy: 0.5 * K * q * q,
  axisAlignedReductionExact: true,
  rigidSkewRefusal: 'MODEL_RESTRAINT_SKEW_DIRECTION_UNSUPPORTED',
  disclosure: 'DRAFT_SPRING_SUPPORT_NO_REFERENCE',
}, null, 2));
