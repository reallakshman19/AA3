import assert from 'node:assert/strict';
import {
  createEmpiricalV3ResultReviewReceipt,
  requireEmpiricalV3CoupledCalculationEvidence,
  sealEmpiricalV3AuditReadiness,
  sealEmpiricalV3CalculationAuthorization,
  sealEmpiricalV3CoupledCalculationEvidence,
  sealEngineeringRiskSet,
} from '../src/core/empirical-v3-safety/index.js';

const ids = ['COORD-B', 'COORD-A'];
const riskSet = sealEngineeringRiskSet({ runId: 'RUN:EVIDENCE', risks: [] });
const authorization = sealEmpiricalV3CalculationAuthorization({
  runId: 'RUN:EVIDENCE', policyId: 'EMP_V3_RISK_POLICY', policyVersion: '1',
  dependencies: [
    { kind: 'COMPONENT', ref: 'P1', semanticHash: 'fnv1a64:1111111111111111' },
    { kind: 'ROM_EXECUTION_REQUEST', ref: 'fixture', semanticHash: 'fnv1a64:2222222222222222' },
  ], riskSet, confirmations: [],
});
const mechanics = componentMechanics();
const input = {
  runId: 'RUN:EVIDENCE', authorization, mechanics,
  romOutputRef: { ref: 'ROM:COMPONENT', semanticHash: 'fnv1a64:3333333333333333' },
  authorityRefs: [
    { ref: 'B', semanticHash: 'fnv1a64:5555555555555555' },
    { ref: 'A', semanticHash: 'fnv1a64:4444444444444444' },
  ],
  coordinateBindings: [
    { coordinateId: 'COORD-B', nodeId: 'N2', supportId: 'S2', branchId: 'BR1', componentIds: ['P2', 'E1'] },
    { coordinateId: 'COORD-A', nodeId: 'N3', supportId: 'S3', branchId: 'BR1', componentIds: ['P3'] },
  ],
};
const evidence = sealEmpiricalV3CoupledCalculationEvidence(input);
assert.deepEqual(evidence.coupledSystem.coordinateIds, ids);
assert.deepEqual(evidence.coupledSystem.flexibilityMatrixMPerN, mechanics.flexibility.matrixMPerN);
assert.equal(evidence.coupledSystem.reactionVectorN[0], -123.456, 'evidence preserves ROM reaction; it does not re-solve');
assert.equal(evidence.coordinates[0].pairEvidence[0].componentContributions[0].componentId, 'E1');
assert.equal(evidence.equations.compatibility, '(F+S) R = delta_target - delta_reference');
assert.equal(evidence.equations.pipeRecovery, 'delta_pipe,i = delta_reference,i + sum_j(F_ij R_j)');
assert.equal(evidence.equations.flexibilityDecomposition, 'F_ij = sum_m(f_ij^(m))');
assert.equal(evidence.evidencePolicy.uiOrReportMayResolveMechanics, false);

const reordered = sealEmpiricalV3CoupledCalculationEvidence({
  ...input, authorityRefs: [...input.authorityRefs].reverse(),
  coordinateBindings: [...input.coordinateBindings].reverse().map((row) => ({ ...row, componentIds: [...row.componentIds].reverse() })),
});
assert.equal(evidence.semanticHash, reordered.semanticHash, 'presentation/ref ordering must not alter evidence identity');
assert.equal(requireEmpiricalV3CoupledCalculationEvidence(evidence).semanticHash, evidence.semanticHash);

const straight = sealEmpiricalV3CoupledCalculationEvidence({
  runId: 'RUN:EVIDENCE', authorization, mechanics: straightMechanics(),
  romOutputRef: { ref: 'ROM:STRAIGHT', semanticHash: 'fnv1a64:6666666666666666' }, authorityRefs: [], coordinateBindings: [],
});
assert.equal(straight.sourceMechanicsSchema, 'empirical-rooted-tree-thermal-restraint-compatibility/v1');
assert.equal(straight.coordinates[0].pairEvidence[0].componentContributions[0].componentId, 'SEG-1');

const badOrder = structuredClone(mechanics); badOrder.compatibility.rows.reverse();
assert.throws(() => sealEmpiricalV3CoupledCalculationEvidence({
  runId: 'RUN:EVIDENCE', authorization, mechanics: badOrder,
  romOutputRef: { ref: 'ROM:BAD', semanticHash: 'fnv1a64:7777777777777777' }, authorityRefs: [], coordinateBindings: [],
}), /row order/);
const tampered = structuredClone(evidence); tampered.coordinates[0].reactionN += 1;
assert.throws(() => requireEmpiricalV3CoupledCalculationEvidence(tampered), /identity mismatch/);

const reviewA = createEmpiricalV3ResultReviewReceipt({
  evidence, basisCode: 'ENGINEER_REVIEWED_SEALED_COUPLED_RESULT', basisParameters: { conclusion: 'reviewed' },
  auditMetadata: { actor: 'engineer-a', timestamp: '2026-08-15T10:00:00Z', comment: 'review A' },
});
const reviewB = createEmpiricalV3ResultReviewReceipt({
  evidence, basisCode: 'ENGINEER_REVIEWED_SEALED_COUPLED_RESULT', basisParameters: { conclusion: 'reviewed' },
  auditMetadata: { actor: 'engineer-b', timestamp: '2026-08-15T11:00:00Z', comment: 'review B' },
});
assert.equal(reviewA.semanticHash, reviewB.semanticHash, 'audit metadata must not change engineering review identity');
assert.notEqual(reviewA.evidenceHash, reviewB.evidenceHash, 'audit metadata remains sealed');
const readiness = sealEmpiricalV3AuditReadiness({ evidence, resultReview: reviewA });
assert.equal(readiness.evidenceRef.semanticHash, evidence.semanticHash);
assert.equal(readiness.resultReviewRef.semanticHash, reviewA.semanticHash);

console.log('PASS empirical v3 coupled evidence / result-review / readiness contract');

function componentMechanics() {
  return {
    schema: 'empirical-rooted-component-thermal-compatibility/v1', rootNodeId: 'N0', coordinateIds: ids,
    flexibility: { schema: 'empirical-rooted-component-flexibility/v1', rootNodeId: 'N0', caseIds: ids,
      matrixMPerN: [[1e-5, 2e-6], [2e-6, 3e-5]], coefficientUnit: 'm/N', components: [], pairEvidence: componentPairs(),
      reciprocity: { maximumResidual: 0 }, evidence: { formulaTrace: ['EMP-016'] } },
    thermalReference: thermalReference(), compatibility: compatibilitySolve(),
    evidence: { solutionClass: 'ANALYTICAL_FLEXIBILITY_FORCE_METHOD_ROM', formulaTrace: ['EMP-018'] },
  };
}
function compatibilitySolve() {
  return { schema: 'empirical-linear-restraint-compatibility/v1', coordinateIds: ids,
    flexibilityMatrixMPerN: [[1e-5, 2e-6], [2e-6, 3e-5]], supportFlexibilityMPerN: [0, 0],
    systemMatrixMPerN: [[1e-5, 2e-6], [2e-6, 3e-5]], rhsDisplacementM: [-0.001, -0.002],
    rows: [
      { coordinateId: 'COORD-B', referenceDisplacementM: 0.001, targetDisplacementM: 0, supportStiffnessNPerM: null, supportFlexibilityMPerN: 0, reactionN: -123.456, pipeDisplacementM: 0.00025, supportDeformationM: 0, compatibilityResidualM: 1e-15 },
      { coordinateId: 'COORD-A', referenceDisplacementM: 0.002, targetDisplacementM: 0, supportStiffnessNPerM: null, supportFlexibilityMPerN: 0, reactionN: -78.9, pipeDisplacementM: 0.0005, supportDeformationM: 0, compatibilityResidualM: -1e-15 },
    ], numerical: { scaledResidual: 1e-16 }, reciprocity: { maximumResidual: 0, satisfied: true },
    positiveDefinite: { structuralFlexibility: { satisfied: true }, compatibilitySystem: { satisfied: true } },
    compatibility: { maximumResidualM: 1e-15, toleranceM: 1e-10, satisfied: true },
    energy: { totalStrainEnergyJ: 1, generalizedWorkJ: 1, residualJ: 0, relativeResidual: 0, tolerance: 1e-10, satisfied: true },
    formulaTrace: ['EMP-017', 'EMP-018'] };
}
function componentPairs() {
  const matrix = [[1e-5, 2e-6], [2e-6, 3e-5]];
  return ids.flatMap((rowId, i) => ids.map((columnId, j) => ({ rowCaseId: rowId, columnCaseId: columnId, value: matrix[i][j], componentContributions: [
    { componentId: 'P1', kind: 'STRAIGHT', total: matrix[i][j] * 0.4, terms: { axial: matrix[i][j] * 0.4 } },
    { componentId: 'E1', kind: 'CIRCULAR_ELBOW', total: matrix[i][j] * 0.6, terms: { bendingY: matrix[i][j] * 0.6 } },
  ] })));
}
function thermalReference() { return { rootNodeId: 'N0', rows: [
  { coordinateId: 'COORD-B', nodeId: 'N2', direction: [1, 0, 0], referenceDisplacementM: 0.001 },
  { coordinateId: 'COORD-A', nodeId: 'N3', direction: [0, 1, 0], referenceDisplacementM: 0.002 },
], componentEvidence: [], evidence: {} }; }
function straightMechanics() {
  const pairs = componentPairs().map((pair) => ({ rowCaseId: pair.rowCaseId, columnCaseId: pair.columnCaseId, value: pair.value, segmentContributions: [{ segmentId: 'SEG-1', total: pair.value, terms: { bendingY: pair.value } }] }));
  return { schema: 'empirical-rooted-tree-thermal-restraint-compatibility/v1', rootNodeId: 'N0', coordinateIds: ids, thermalReference: thermalReference(), compatibility: {
    schema: 'empirical-rooted-tree-restraint-compatibility/v1', rootNodeId: 'N0', coordinateIds: ids, actions: {},
    flexibility: { caseIds: ids, matrix: [[1e-5, 2e-6], [2e-6, 3e-5]], pairEvidence: pairs, formulaTrace: ['EMP-014'] },
    compatibility: compatibilitySolve(), evidence: {} }, evidence: { formulaTrace: ['EMP-018'] } };
}