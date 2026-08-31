/*
 * Verify finite CNODE spring assembly and production execution. Inputs are a
 * self-authored two-cantilever InputXML plus an explicit second-component
 * origin; outputs are constitutive, equilibrium, topology, and solve guards.
 * Invalid or unsupported declarations fail by assertion without a fallback.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
import { buildDofMap, dofIndexOf } from '../src/core/linear-fea-solver/dof-map.js';
import { assembleGlobalSystem } from '../src/core/linear-fea-solver/assembly.js';
import {
  forceEquilibriumCheck,
  momentEquilibriumCheck,
} from '../src/core/linear-fea-solver/qualification.js';
import { createLinearPipingInputXmlIntake } from '../src/workspace/linear-piping-inputxml-intake.js';
import {
  authorizeLinearPipingInputXmlPreFlight,
  prepareLinearPipingInputXmlPreFlight,
} from '../src/workspace/linear-piping-inputxml-prefea.js';
import { buildInputXmlRunRequestCase } from '../src/core/linear-piping-analysis-consumer/inputxml-run-request-cases.js';
import { compileLinearPipingInputXmlAnalysisContext } from '../src/core/linear-piping-analysis-consumer/index.js';

const TOL = 1e-12;
const K = 2000;
const N = Object.freeze([0.6, 0.8, 0]);
const element = Object.freeze({ fromNodeId: '20', toNodeId: '30' });
const segment = Object.freeze({ startNodeId: '20', endNodeId: '30' });
const deliberateBreak = process.argv.includes('--deliberate-break');
const EQUILIBRIUM_POLICIES = Object.freeze({
  equilibriumAbsoluteForceFloor: Object.freeze({ value: 1, source: 'SELF_AUTHORED_CNODE_CHECK' }),
  equilibriumAbsoluteForceLimit: Object.freeze({ value: 1e-9, source: 'SELF_AUTHORED_CNODE_CHECK' }),
  equilibriumAbsoluteMomentFloor: Object.freeze({ value: 1, source: 'SELF_AUTHORED_CNODE_CHECK' }),
  equilibriumRelativeLimit: Object.freeze({ value: 1e-12, source: 'SELF_AUTHORED_CNODE_CHECK' }),
});

function sourceAttributes(stiffness = String(K)) {
  return {
    TYPE: '2.000000', NODE: '30.000000', CNODE: '40.000000', STIFFNESS: stiffness,
    XCOSINE: '0.600000', YCOSINE: '0.800000', ZCOSINE: '0.000000',
    GAP: '-1.010100', FRIC_COEF: '-1.010100',
  };
}

function close(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) <= TOL * Math.max(1, Math.abs(expected)),
    `${label}: expected ${expected}, got ${actual}`);
}

const cnode = classifyRestraint(sourceAttributes(), element, segment, 1);
const dispositions = restraintDispositions(cnode);
assert.equal(cnode.connectingNodeId, '40');
assert.equal(dispositions[STRICT].disposition, 'IMPLEMENTED_EXACTLY');
assert.equal(dispositions[APPROXIMATE].disposition, 'IMPLEMENTED_EXACTLY');
assert.ok(restraintApproximationCodes(cnode).includes('DRAFT_SPRING_SUPPORT_NO_REFERENCE'));

const rigid = classifyRestraint(sourceAttributes('-1.010100'), element, segment, 1);
for (const profile of [STRICT, APPROXIMATE]) {
  const refusal = restraintDispositions(rigid)[profile];
  assert.equal(refusal.disposition, 'UNSUPPORTED_BY_GENERIC_SOLVER');
  assert.equal(refusal.limitationCode, 'MODEL_RESTRAINT_CONNECTING_NODE_UNSUPPORTED');
}

const inventory = [Object.freeze({
  active: true,
  sourceKind: 'RESTRAINT',
  inventoryId: 'IXF.RESTRAINT.CNODE',
  sourceFeatureId: 'PIPINGELEMENT-0-RESTRAINT-0',
  sourceRecordSemanticHash: 'cnode-source',
  classification: cnode,
  dispositionByProfile: dispositions,
})];
const structural = compileInputXmlStructuralConstraints({
  inventory,
  modelId: 'CNODE',
  analysisProfileId: STRICT,
  conditionedNodeIds: ['30', '40'],
});
assert.equal(structural.declarations.length, 1);
assert.deepEqual(structural.declarations[0], {
  declarationId: 'CNODE-C-PIPINGELEMENT-0-RESTRAINT-0-CNODE',
  kind: 'PARTIAL_RELEASE_SPRING',
  nodeId: 'CNODE.N30',
  connectedNodeId: 'CNODE.N40',
  dof: null,
  direction: N,
  stiffness: K,
});
assert.equal(structural.bindings[0].connectedSourceNodeId, '40');
assert.equal(structural.bindings[0].connectedTargetNodeId, '40');

const accepted = requireConstraintDeclarations(structural.declarations)[0];
assert.equal(accepted.behavior, 'LINEAR_SPRING');
assert.equal(accepted.connectedNodeId, 'CNODE.N40');
assert.deepEqual(accepted.direction, N);

function node(nodeId, conditionedNodeId, sourceId) {
  const connected = nodeId.endsWith('40');
  return {
    nodeId,
    // The self-authored connector is collinear with n. This prevents the
    // spring-only equilibrium fixture from injecting an artificial free couple.
    position: connected ? { x: N[0], y: N[1], z: N[2] } : { x: 0, y: 0, z: 0 },
    sourceAncestry: {
      conditionedNodeId,
      sourceNodeIds: [sourceId],
      sourceComponentIds: ['PIPINGELEMENT-0'],
      creationBasis: 'SOURCE-ENDPOINT',
    },
  };
}
const constraint = {
  constraintId: accepted.declarationId,
  nodeId: accepted.nodeId,
  connectedNodeId: accepted.connectedNodeId,
  dof: null,
  behavior: accepted.behavior,
  basis: 'GLOBAL',
  stiffness: accepted.stiffness,
  direction: accepted.direction,
};
const model = sealLinearFeaModel({
  schema: LINEAR_FEA_MODEL_SCHEMA,
  modelIdentity: 'CNODE.MODEL',
  modelRevision: 1,
  units: LINEAR_FEA_UNITS,
  conventions: LINEAR_FEA_CONVENTIONS,
  ancestry: {
    sourceSemanticHash: 'fnv1a64:0000000000000011',
    conditionedGeometrySemanticHash: 'fnv1a64:0000000000000012',
    compilerProfileSemanticHash: 'fnv1a64:0000000000000013',
  },
  formulationRegistryVersion: LINEAR_FEA_FORMULATION_REGISTRY_VERSION,
  validationProfile: { ...LINEAR_FEA_VALIDATION_PROFILE, semanticHash: '' },
  nodes: [node('CNODE.N30', 'CN-30', '30'), node('CNODE.N40', 'CN-40', '40')],
  materialStates: [], sectionStates: [], elements: [], constraints: [constraint],
  limitations: [], diagnostics: [], stiffnessStateHash: '', semanticHash: '', evidenceHash: '',
});
assert.equal(model.constraints[0].connectedNodeId, 'CNODE.N40');

const map = buildDofMap(model);
const assembled = assembleGlobalSystem({ model, dofMap: map, elementContributions: [] });
const primary = ['UX', 'UY', 'UZ'].map((dof) => dofIndexOf(map, 'CNODE.N30', dof));
const connected = ['UX', 'UY', 'UZ'].map((dof) => dofIndexOf(map, 'CNODE.N40', dof));
const at = (row, col) => assembled.K[row * assembled.n + col];
const B = [
  [720, 960, 0],
  [960, 1280, 0],
  [0, 0, 0],
];
for (let row = 0; row < 3; row += 1) {
  for (let col = 0; col < 3; col += 1) {
    close(at(primary[row], primary[col]), B[row][col], `Kii[${row},${col}]`);
    close(at(primary[row], connected[col]), -B[row][col], `Kij[${row},${col}]`);
    close(at(connected[row], primary[col]), -B[row][col], `Kji[${row},${col}]`);
    close(at(connected[row], connected[col]), B[row][col], `Kjj[${row},${col}]`);
  }
}
assert.equal(assembled.symmetryResidual, 0);

const ui = [0.01, -0.02, 0];
const uj = [-0.005, 0.005, 0];
const relative = ui.map((value, index) => value - uj[index]);
const q = N.reduce((sum, value, index) => sum + value * relative[index], 0);
close(q, -0.011, 'relative directional displacement');
const fi = N.map((value) => K * q * value);
const fj = fi.map((value) => -value);
close(fi[0], -13.2, 'Fi.x');
close(fi[1], -17.6, 'Fi.y');
close(fj[0], 13.2, 'Fj.x');
close(fj[1], 17.6, 'Fj.y');
for (let i = 0; i < 3; i += 1) close(fi[i] + fj[i], 0, `equal/opposite[${i}]`);

const translation = [4.2, -7.1, 2.5];
const shiftedI = ui.map((value, i) => value + translation[i]);
const shiftedJ = uj.map((value, i) => value + translation[i]);
const shiftedQ = N.reduce((sum, value, i) => sum + value * (shiftedI[i] - shiftedJ[i]), 0);
close(shiftedQ, q, 'common rigid-body translation invariance');
close(0.5 * K * q * q, 0.121, 'spring strain energy');

// ---------------------------------------------------- qualification equilibrium
const Ufull = new Array(assembled.n).fill(0);
ui.forEach((value, index) => { Ufull[primary[index]] = value; });
uj.forEach((value, index) => { Ufull[connected[index]] = value; });
const Ffull = new Array(assembled.n).fill(0);
for (let row = 0; row < assembled.n; row += 1) {
  for (let col = 0; col < assembled.n; col += 1) {
    Ffull[row] += assembled.K[row * assembled.n + col] * Ufull[col];
  }
}
for (let index = 0; index < 3; index += 1) {
  close(Ffull[primary[index]], fi[index], `qualified Fi[${index}]`);
  close(Ffull[connected[index]], fj[index], `qualified Fj[${index}]`);
}
// Deliberate break reproduces a prohibited fallback: drop connected-node
// custody and treat the relative spring as a ground spring. Qualification must
// then see a nonzero external support resultant and fail force equilibrium.
const qualificationModel = deliberateBreak
  ? {
      ...model,
      constraints: [{
        constraintId: 'BROKEN-CNODE-AS-GROUND', nodeId: constraint.nodeId, dof: null,
        behavior: 'LINEAR_SPRING', basis: 'GLOBAL', stiffness: K, direction: N,
      }],
    }
  : model;
const forceEquilibrium = forceEquilibriumCheck({
  model: qualificationModel,
  dofMap: map,
  K: assembled.K,
  n: assembled.n,
  Ufull,
  Ffull,
  policies: EQUILIBRIUM_POLICIES,
});
assert.equal(forceEquilibrium.status, 'PASS',
  'an exact connected spring is internal stiffness and must preserve global force equilibrium');
assert.equal(forceEquilibrium.groundedSpringCount, 0,
  'CNODE spring must not be re-counted as a ground support');
close(forceEquilibrium.groundedSpringForceMagnitude, 0, 'CNODE grounded support magnitude');
const momentEquilibrium = momentEquilibriumCheck({
  model: qualificationModel,
  dofMap: map,
  K: assembled.K,
  n: assembled.n,
  Ufull,
  Ffull,
  policies: EQUILIBRIUM_POLICIES,
});
assert.equal(momentEquilibrium.status, 'PASS',
  'collinear equal/opposite CNODE actions must preserve global moment equilibrium');
assert.equal(momentEquilibrium.groundedSpringCount, 0);

assert.throws(
  () => compileInputXmlStructuralConstraints({
    inventory,
    modelId: 'CNODE',
    analysisProfileId: STRICT,
    nodeRetargeting: { 30: { nearestNodeId: '35' }, 40: { nearestNodeId: '35' } },
    conditionedNodeIds: ['35'],
  }),
  (error) => error?.code === 'INPUTXML_STRUCTURAL_CONNECTING_NODE_COLLAPSED',
  'primary and connecting nodes may not silently collapse onto one retained node',
);

// ------------------------------------------------------ full production exercise
const exerciseXml = readFileSync('benchmarks/LFEA/SPRING_DRAFT/CnodeSpringSupports.xml', 'utf8');
const intake = createLinearPipingInputXmlIntake(
  {
    fileName: 'CnodeSpringSupports.xml',
    content: exerciseXml,
  },
  {
    fallbackUnit: 'mm',
    componentOrigins: { 50: { x: 6006, y: -3992, z: 0 } },
    requestedProfileId: STRICT,
    requestedCaseIds: ['IXP-W'],
  },
);
const initial = prepareLinearPipingInputXmlPreFlight(intake);
assert.notEqual(initial.status, 'BLOCK',
  `CNODE spring exercise must prepare: ${JSON.stringify(initial.preparation.findings)}`);
const authorized = initial.solveAuthorized ? initial : authorizeLinearPipingInputXmlPreFlight(initial, {
  approverIdentity: 'LFEA-CNODE-DRAFT-CHECK',
  reason: 'Self-authored CNODE spring exercise; does not clear DRAFT status.',
});
const productionConstraint = authorized.preparation.structuralPreparation.compilation.model.constraints
  .find((row) => row.behavior === 'LINEAR_SPRING' && row.connectedNodeId);
assert.ok(productionConstraint, 'production preparation must compile the finite CNODE spring');
assert.deepEqual(productionConstraint.direction, N);
assert.equal(productionConstraint.stiffness, 100000000,
  '100000 N/mm must compile as 1e8 N/m');
const productionModel = authorized.preparation.structuralPreparation.compilation.model;
const productionNodeI = productionModel.nodes.find((row) => row.nodeId === productionConstraint.nodeId);
const productionNodeJ = productionModel.nodes.find((row) => row.nodeId === productionConstraint.connectedNodeId);
assert.ok(productionNodeI && productionNodeJ, 'production CNODE endpoints must both be retained');
const productionConnectorOffset = ['x', 'y', 'z']
  .map((axis) => productionNodeJ.position[axis] - productionNodeI.position[axis]);
for (let index = 0; index < 3; index += 1) {
  close(productionConnectorOffset[index], 0.01 * N[index], `production CNODE offset[${index}]`);
}
const request = buildInputXmlRunRequestCase({
  intake: authorized.intake,
  preparation: authorized.preparation,
  caseId: 'IXP-W',
  analysisIdentity: 'CNODE-SPRING-DRAFT-W',
  analysisRevision: 1,
});
const result = compileLinearPipingInputXmlAnalysisContext(request, { factorizationCache: null })
  .sourceAnalysisContext.analysisResult;
assert.equal(result.status, 'QUALIFIED', 'CNODE spring exercise must qualify through the production solver');
assert.ok(result.limitations.some((row) => row.limitation?.code === 'DRAFT_SPRING_SUPPORT_NO_REFERENCE'),
  'CNODE solve must retain DRAFT disclosure');
assert.equal(result.execution.diagnostics.forceEquilibrium.groundedSpringCount, 0,
  'production qualification must retain CNODE as internal stiffness');
assert.equal(result.execution.diagnostics.momentEquilibrium.groundedSpringCount, 0);
const execution = result.execution;
const displacementAt = (nodeId, dof) => {
  const row = execution.displacement.find((entry) => entry.nodeId === nodeId && entry.dof === dof);
  assert.ok(row, `missing ${nodeId}:${dof} displacement`);
  return row.value;
};
const solvedI = ['UX', 'UY', 'UZ'].map((dof) => displacementAt(productionConstraint.nodeId, dof));
const solvedJ = ['UX', 'UY', 'UZ'].map((dof) => displacementAt(productionConstraint.connectedNodeId, dof));
const solvedQ = N.reduce(
  (sum, component, index) => sum + component * (solvedI[index] - solvedJ[index]),
  0,
);
const internalForceMagnitude = Math.abs(productionConstraint.stiffness * solvedQ);
assert.ok(Math.abs(solvedQ) > 0 && internalForceMagnitude > 0,
  'CNODE spring must develop nonzero relative extension and internal force');
assert.equal(execution.reactions.some((row) => (
  row.nodeId === productionConstraint.nodeId || row.nodeId === productionConstraint.connectedNodeId
)), false, 'CNODE internal spring must not publish either node as a grounded support reaction');
const totalVerticalGroundReaction = execution.reactions
  .filter((row) => row.dof === 'UY').reduce((sum, row) => sum + Math.abs(row.value), 0);
const internalVerticalShare = Math.abs(internalForceMagnitude * N[1]) / totalVerticalGroundReaction;
assert.ok(internalVerticalShare > 0.1,
  `CNODE spring internal vertical force must exceed 10% of ground vertical reaction, got ${(100 * internalVerticalShare).toFixed(2)}%`);

console.log(JSON.stringify({
  check: 'lfea-cnode-spring',
  status: 'PASS',
  stiffness: K,
  direction: N,
  block: B,
  ui,
  uj,
  q,
  primaryForce: fi,
  connectedForce: fj,
  equalOpposite: true,
  commonTranslationInvariant: true,
  qualificationForceEquilibrium: forceEquilibrium.status,
  qualificationMomentEquilibrium: momentEquilibrium.status,
  qualificationGroundedSpringCount: forceEquilibrium.groundedSpringCount,
  productionSolveStatus: result.status,
  productionCompiledStiffnessNPerM: productionConstraint.stiffness,
  productionConnectorOffsetM: productionConnectorOffset,
  productionRelativeExtensionM: solvedQ,
  productionInternalForceN: internalForceMagnitude,
  productionInternalVerticalSharePercent: Number((100 * internalVerticalShare).toFixed(2)),
  rigidCnodeRefusal: 'MODEL_RESTRAINT_CONNECTING_NODE_UNSUPPORTED',
  disclosure: 'DRAFT_SPRING_SUPPORT_NO_REFERENCE',
  deliberateBreakMode: '--deliberate-break drops connected-node custody and must fail force equilibrium',
}, null, 2));
