import assert from 'node:assert/strict';
import {
  createEmpiricalV3AuditJsonExport,
  requireEmpiricalV3CoupledCalculationEvidence,
  sealEmpiricalV3CalculationAuthorization,
  sealEmpiricalV3CoupledCalculationEvidence,
  sealEngineeringRiskSet,
} from '../src/core/empirical-v3-safety/index.js';

const ids = ['COORD-B', 'COORD-A'];
const riskSet = sealEngineeringRiskSet({ runId: 'RUN:EVIDENCE', risks: [] });
const authorization = sealEmpiricalV3CalculationAuthorization({
  runId: 'RUN:EVIDENCE',
  policyId: 'EMP_V3_RISK_POLICY',
  policyVersion: '1',
  dependencies: [
    { kind: 'COMPONENT', ref: 'P1', semanticHash: 'fnv1a64:1111111111111111' },
    { kind: 'ROM_EXECUTION_REQUEST', ref: 'fixture', semanticHash: 'fnv1a64:2222222222222222' },
  ],
  riskSet,
  confirmations: [],
});

const componentMechanics = {
  schema: 'empirical-rooted-component-thermal-compatibility/v1',
  rootNodeId: 'N0',
  coordinateIds: ids,
  flexibility: {
    schema: 'empirical-rooted-component-flexibility/v1',
    rootNodeId: 'N0',
    caseIds: ids,
    matrixMPerN: [[1e-5, 2e-6], [2e-6, 3e-5]],
    coefficientUnit: 'm/N',
    components: [],
    pairEvidence: componentPairs(),
    reciprocity: { maximumResidual: 0, construction: 'PAIRWISE_IDENTICAL_VIRTUAL_WORK_INTEGRALS' },
    evidence: { formulaTrace: ['EMP-016'] },
  },
  thermalReference: {
    rootNodeId: 'N0',
    rows: [
      { coordinateId: 'COORD-B', nodeId: 'N2', direction: [1, 0, 0], displacementVectorM: [0.001, 0, 0], referenceDisplacementM: 0.001 },
      { coordinateId: 'COORD-A', nodeId: 'N3', direction: [0, 1, 0], displacementVectorM: [0, 0.002, 0], referenceDisplacementM: 0.002 },
    ],
    componentEvidence: [],
    evidence: { thermalGradientSolved: false },
  },
  compatibility: compatibilitySolve(),
  evidence: { solutionClass: 'ANALYTICAL_FLEXIBILITY_FORCE_METHOD_ROM', formulaTrace: ['EMP-018'] },
};

const evidence = sealEmpiricalV3CoupledCalculationEvidence({
  runId: 'RUN:EVIDENCE',
  authorization,
  mechanics: componentMechanics,
  romOutputRef: { ref: 'ROM:COMPONENT', semanticHash: 'fnv1a64:3333333333333333' },
  authorityRefs: [
    { ref: 'B', semanticHash: 'fnv1a64:5555555555555555' },
    { ref: 'A', semanticHash: 'fnv1a64:4444444444444444' },
  ],
  coordinateBindings: [
    { coordinateId: 'COORD-B', nodeId: 'N2', supportId: 'S2', branchId: 'BR1', componentIds: ['P2', 'E1'] },
    { coordinateId: 'COORD-A', nodeId: 'N3', supportId: 'S3', branchId: 'BR1', componentIds: ['P3'] },
  ],
});
assert.deepEqual(evidence.coupledSystem.coordinateIds, ids, 'matrix coordinate order is semantic and must be preserved');
assert.deepEqual(evidence.coupledSystem.flexibilityMatrixMPerN, componentMechanics.flexibility.matrixMPerN);
assert.equal(evidence.coupledSystem.reactionVectorN[0], -123.456, 'evidence must preserve ROM reactions instead of solving them again');
assert.equal(evidence.coordinates[0].pairEvidence[0].componentContributions[0].componentId, 'E1');
assert.equal(evidence.equations.compatibility, '(F+S) R = delta_target - delta_reference');
assert.equal(evidence.equations.pipeRecovery, 'delta_pipe,i = delta_reference,i + sum_j(F_ij R_j)');
assert.equal(evidence.equations.flexibilityDecomposition, 'F_ij = sum_m(f_ij^(m))');
assert.deepEqual(evidence.evidencePolicy, {
  mechanicsRecomputed: false,
  flexibilityRecomputed: false,
  reactionRecomputed: false,
  thermalReferenceRecomputed: false,
  componentContributionRecomputed: false,
  uiOrReportMayResolveMechanics: false,
});

const reorderedRefs = sealEmpiricalV3CoupledCalculationEvidence({
  runId: 'RUN:EVIDENCE', authorization, mechanics: componentMechanics,
  romOutputRef: { ref: 'ROM:COMPONENT', semanticHash: 'fnv1a64:3333333333333333' },
  authorityRefs: [
    { ref: 'A', semanticHash: 'fnv1a64:4444444444444444' },
    { ref: 'B', semanticHash: 'fnv1a64:5555555555555555' },
  ],
  coordinateBindings: [
    { coordinateId: 'COORD-A', nodeId: 'N3', supportId: 'S3', branchId: 'BR1', componentIds: ['P3'] },
    { coordinateId: 'COORD-B', nodeId: 'N2', supportId: 'S2', branchId: 'BR1', componentIds: ['E1', 'P2'] },
  ],
});
assert.equal(evidence.semanticHash, reorderedRefs.semanticHash, 'presentation/ref input ordering must not change evidence identity');
assert.equal(requireEmpiricalV3CoupledCalculationEvidence(evidence).semanticHash, evidence.semanticHash);

const straightEvidence = sealEmpiricalV3CoupledCalculationEvidence({
  runId: 'RUN:EVIDENCE', authorization,
  mechanics: straightMechanics(),
  romOutputRef: { ref: 'ROM:STRAIGHT', semanticHash: 'fnv1a64:6666666666666666' },
  authorityRefs: [], coordinateBindings: [],
});
assert.equal(straightEvidence.sourceMechanicsSchema, 'empirical-rooted-tree-thermal-restraint-compatibility/v1');
assert.equal(straightEvidence.coordinates[0].pairEvidence[0].componentContributions[0].componentId, 'SEG-1');

const badOrder = structuredClone(componentMechanics);
badOrder.compatibility.rows.reverse();
assert.throws(() => sealEmpiricalV3CoupledCalculationEvidence({
  runId: 'RUN:EVIDENCE', authorization, mechanics: badOrder,
  romOutputRef: { ref: 'ROM:BAD', semanticHash: 'fnv1a64:7777777777777777' },
  authorityRefs: [], coordinateBindings: [],
}), /row order/);

const tampered = structuredClone(evidence);
tampered.coordinates[0].reactionN += 1;
assert.throws(() => requireEmpiricalV3CoupledCalculationEvidence(tampered), /identity mismatch/);

const audit = createEmpiricalV3AuditJsonExport(evidence);
const auditPayload = JSON.parse(audit.text);
assert.equal(auditPayload.evidenceSemanticHash, evidence.semanticHash);
assert.equal(auditPayload.calculationEvidence.semanticHash, evidence.semanticHash);
assert.equal(auditPayload.calculationEvidence.evidencePolicy.uiOrReportMayResolveMechanics, false);

console.log('PASS empirical v3 coupled calculation evidence / audit contract');

function compatibilitySolve() {
  return {
    schema: 'empirical-linear-restraint-compatibility/v1',
    coordinateIds: ids,
    reactionConvention: 'REACTION_ON_PIPE_POSITIVE_ALONG_COORDINATE_DIRECTION',
    compatibilityEquation: '(F+S)R=TARGET_MINUS_REFERENCE',
    coefficientUnit: 'm/N', displacementUnit: 'm', reactionUnit: 'N',
    flexibilityMatrixMPerN: [[1e-5, 2e-6], [2e-6, 3e-5]],
    supportFlexibilityMPerN: [0, 0],
    systemMatrixMPerN: [[1e-5, 2e-6], [2e-6, 3e-5]],
    rhsDisplacementM: [-0.001, -0.002],
    rows: [
      { coordinateId: 'COORD-B', referenceDisplacementM: 0.001, targetDisplacementM: 0, supportStiffnessNPerM: null, supportFlexibilityMPerN: 0, reactionN: -123.456, pipeDisplacementM: 0.00025, supportDeformationM: 0, compatibilityResidualM: 1e-15 },
      { coordinateId: 'COORD-A', referenceDisplacementM: 0.002, targetDisplacementM: 0, supportStiffnessNPerM: null, supportFlexibilityMPerN: 0, reactionN: -78.9, pipeDisplacementM: 0.0005, supportDeformationM: 0, compatibilityResidualM: -1e-15 },
    ],
    numerical: { scaledResidual: 1e-16, reciprocalConditionEstimate: 0.1 },
    reciprocity: { maximumResidual: 0, tolerance: 1e-15, satisfied: true },
    positiveDefinite: { structuralFlexibility: { satisfied: true }, compatibilitySystem: { satisfied: true } },
    compatibility: { maximumResidualM: 1e-15, toleranceM: 1e-10, satisfied: true },
    energy: { structuralStrainEnergyJ: 1, supportStrainEnergyJ: 0, totalStrainEnergyJ: 1, generalizedWorkJ: 1, residualJ: 0, relativeResidual: 0, tolerance: 1e-10, satisfied: true },
    options: {}, formulaTrace: ['EMP-017', 'EMP-018'],
  };
}
function componentPairs() {
  const matrix = [[1e-5, 2e-6], [2e-6, 3e-5]];
  return ids.flatMap((rowId, i) => ids.map((columnId, j) => ({
    rowCaseId: rowId, columnCaseId: columnId, value: matrix[i][j],
    componentContributions: [
      { componentId: 'P1', kind: 'STRAIGHT', total: matrix[i][j] * 0.4, terms: { axial: matrix[i][j] * 0.4 }, evidence: { formulaTrace: ['EMP-010'] } },
      { componentId: 'E1', kind: 'CIRCULAR_ELBOW', total: matrix[i][j] * 0.6, terms: { bendingY: matrix[i][j] * 0.6 }, evidence: { formulaTrace: ['EMP-015'] } },
    ],
  })));
}
function straightMechanics() {
  const solve = compatibilitySolve();
  const pairEvidence = componentPairs().map((pair) => ({
    rowCaseId: pair.rowCaseId, columnCaseId: pair.columnCaseId, value: pair.value,
    segmentContributions: [{ segmentId: 'SEG-1', total: pair.value, terms: { bendingY: pair.value }, formulaTrace: ['EMP-011'] }],
  }));
  return {
    schema: 'empirical-rooted-tree-thermal-restraint-compatibility/v1', rootNodeId: 'N0', coordinateIds: ids,
    thermalReference: componentMechanics.thermalReference,
    compatibility: {
      schema: 'empirical-rooted-tree-restraint-compatibility/v1', rootNodeId: 'N0', coordinateIds: ids,
      actions: {},
      flexibility: { caseIds: ids, unitConvention: 'UNIT_TRANSLATIONAL_FORCE_CASES_SI', coefficientUnit: 'm/N', matrix: [[1e-5, 2e-6], [2e-6, 3e-5]], reciprocity: { satisfied: true }, pairEvidence, formulaTrace: ['EMP-014'] },
      compatibility: solve,
      evidence: {},
    },
    evidence: { solutionClass: 'ANALYTICAL_FLEXIBILITY_FORCE_METHOD_ROM', formulaTrace: ['EMP-018'] },
  };
}
