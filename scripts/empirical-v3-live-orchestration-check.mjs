import assert from 'node:assert/strict';
import {
  EMPIRICAL_V3_BRANCH_AUTHORITY_SCHEMA,
  bindComponentToBranch,
  createEmpiricalV3ResultReviewReceipt,
  projectEmpiricalV3Workflow,
  sealEmpiricalV3AuditReadiness,
  sealEmpiricalV3BranchAuthority,
  sealEmpiricalV3CalculationAuthorization,
  sealEmpiricalV3CoupledCalculationEvidence,
  sealEmpiricalV3SafetyPresentationPackage,
  sealEngineeringRiskSet,
} from '../src/core/empirical-v3-safety/index.js';
import {
  applyEmpiricalV3LiveAuditReadiness,
  applyEmpiricalV3LiveResultReview,
  createEmpiricalV3LiveAuditExport,
  reconcileEmpiricalV3LiveAuthorization,
} from '../src/workspace/engineering-loads/adapters/empirical-v3-live-run-orchestration.js';

const runId = 'RUN:LIVE:1';
const riskSet = sealEngineeringRiskSet({ runId, risks: [] });
const dependency = { kind: 'ROM_EXECUTION_REQUEST', ref: 'fixture:run', semanticHash: 'fnv1a64:1111111111111111' };
const authorization = sealEmpiricalV3CalculationAuthorization({
  runId, policyId: 'EMP_V3_POLICY', policyVersion: '1', dependencies: [dependency], riskSet, confirmations: [],
});
const branch = sealEmpiricalV3BranchAuthority({
  schema: EMPIRICAL_V3_BRANCH_AUTHORITY_SCHEMA,
  runId,
  topologyRef: { ref: 'topology:T1', semanticHash: 'fnv1a64:2222222222222222', authority: 'EXACT', toleranceInferred: false },
  branchTopologyRef: { ref: 'branch-topology:B1', semanticHash: 'fnv1a64:3333333333333333' },
  componentIds: ['P1'],
  commonAuthorityRefs: [{ kind: 'PROCESS', ref: 'process:B1', semanticHash: 'fnv1a64:4444444444444444' }],
  sourceEvidenceRefs: [], riskRefs: [],
});
const component = bindComponentToBranch({
  componentId: 'P1', componentType: 'PIPE',
  topologyComponentRef: { ref: 'route:P1', semanticHash: 'fnv1a64:5555555555555555' },
  localAuthorityRefs: [{ kind: 'WT', ref: 'Q:P1:WT', semanticHash: 'fnv1a64:6666666666666666' }],
  sourceEvidenceRefs: [], riskRefs: [],
}, branch);
const evidence = sealEmpiricalV3CoupledCalculationEvidence({
  runId, authorization, mechanics: mechanics(),
  romOutputRef: { ref: 'rom-output:fixture', semanticHash: 'fnv1a64:7777777777777777' },
  authorityRefs: [{ ref: 'COMPONENT:P1', semanticHash: component.semanticHash }],
  coordinateBindings: [{ coordinateId: 'C1', nodeId: 'N1', supportId: 'S1', branchId: branch.branchId, componentIds: ['P1'] }],
});
const resultRequired = projectEmpiricalV3Workflow({
  source: { bound: true, current: true, semanticHash: 'source:1' },
  authorities: { built: true, current: true, semanticHash: 'authorities:1' },
  branches: { built: true, current: true, reviewCurrent: true, semanticHash: branch.semanticHash, reviewSemanticHash: 'branch-review:1' },
  riskSet: { evaluated: true, current: true, semanticHash: riskSet.semanticHash, highBlockCount: 0, highConfirmPendingCount: 0 },
  calculationAuthorization: { present: true, current: true, semanticHash: authorization.semanticHash },
  calculationResult: { present: true, current: true, reviewRequired: true, semanticHash: evidence.semanticHash },
  resultReview: { present: false, current: false, semanticHash: null },
  audit: { ready: false, current: false, semanticHash: null },
});
assert.equal(resultRequired.state, 'RESULT_REVIEW_REQUIRED');
let packageValue = sealEmpiricalV3SafetyPresentationPackage({
  runId, workflow: resultRequired, branches: [branch], components: [component], riskSet, confirmations: [], calculationAuthorization: authorization,
  records: [{ kind: 'CALCULATION_EVIDENCE', ref: evidence.evidenceId, semanticHash: evidence.semanticHash, record: evidence }],
});
const review = createEmpiricalV3ResultReviewReceipt({
  evidence, basisCode: 'ENGINEER_REVIEWED_SEALED_COUPLED_RESULT', basisParameters: { conclusion: 'reviewed' },
  auditMetadata: { actor: 'engineer', timestamp: '2026-08-15T11:30:00Z', comment: 'reviewed' },
});
const reviewed = applyEmpiricalV3LiveResultReview({ packageValue, evidence, resultReview: review });
packageValue = reviewed.nextPackage;
assert.equal(packageValue.workflow.state, 'RESULT_REVIEWED');
assert.equal(reviewed.event.eventType, 'RESULT_REVIEWED');
assert.ok(packageValue.records.some((row) => row.kind === 'RESULT_REVIEW' && row.semanticHash === review.semanticHash));
assert.equal(packageValue.workflow.facts.audit.ready, false, 'result review must not silently create audit readiness');

const readiness = sealEmpiricalV3AuditReadiness({ evidence, resultReview: review });
const auditReady = applyEmpiricalV3LiveAuditReadiness({ packageValue, evidence, resultReview: review, auditReadiness: readiness });
packageValue = auditReady.nextPackage;
assert.equal(packageValue.workflow.state, 'AUDIT_EXPORT_READY');
assert.equal(auditReady.event.eventType, 'AUDIT_READY');
assert.ok(packageValue.records.some((row) => row.kind === 'AUDIT_READINESS' && row.semanticHash === readiness.semanticHash));

const exported = createEmpiricalV3LiveAuditExport({ packageValue, evidence, resultReview: review, auditReadiness: readiness });
packageValue = exported.nextPackage;
const payload = JSON.parse(exported.record.text);
assert.equal(exported.event.eventType, 'AUDIT_EXPORTED');
assert.equal(payload.governedSafetyPackage.semanticHash, packageValue.semanticHash);
assert.equal(payload.governedSafetyPackage.riskSet.semanticHash, riskSet.semanticHash);
assert.equal(payload.governedSafetyPackage.calculationAuthorization.semanticHash, authorization.semanticHash);
assert.equal(payload.calculationEvidence.semanticHash, evidence.semanticHash);
assert.ok(payload.governedSafetyPackage.records.some((row) => row.kind === 'ENGINEERING_EVENT' && row.record.eventType === 'AUDIT_EXPORTED'));

const current = currentAuthorizationBasis(dependency);
assert.equal(reconcileEmpiricalV3LiveAuthorization({ packageValue, currentAuthorization: current }).current, true);
const mutated = currentAuthorizationBasis({ ...dependency, semanticHash: 'fnv1a64:8888888888888888' });
const stale = reconcileEmpiricalV3LiveAuthorization({ packageValue, currentAuthorization: mutated });
assert.equal(stale.current, false);
assert.equal(stale.nextPackage.workflow.state, 'SAFETY_CLEARED');
assert.equal(stale.event.eventType, 'CALC_AUTHORIZATION_INVALIDATED');
assert.ok(stale.reasons.includes('DEPENDENCY_IDENTITY_CHANGED'));
assert.ok(stale.nextPackage.records.some((row) => row.kind === 'CALCULATION_EVIDENCE' && row.semanticHash === evidence.semanticHash), 'stale evidence remains auditable');
assert.equal(stale.nextPackage.workflow.facts.calculationResult.current, false);
assert.equal(stale.nextPackage.workflow.facts.resultReview.current, false);
assert.equal(stale.nextPackage.workflow.facts.audit.current, false);

console.log('PASS empirical v3 live post-run orchestration / stale rollback');

function currentAuthorizationBasis(dep) {
  return { runId, policyId: 'EMP_V3_POLICY', policyVersion: '1', dependencies: [dep], riskSet, confirmations: [] };
}
function mechanics() {
  const matrix = [[1e-5]];
  return {
    schema: 'empirical-rooted-component-thermal-compatibility/v1', rootNodeId: 'N0', coordinateIds: ['C1'],
    flexibility: {
      schema: 'empirical-rooted-component-flexibility/v1', rootNodeId: 'N0', caseIds: ['C1'], matrixMPerN: matrix, coefficientUnit: 'm/N', components: [],
      pairEvidence: [{ rowCaseId: 'C1', columnCaseId: 'C1', value: 1e-5, componentContributions: [{ componentId: 'P1', kind: 'STRAIGHT', total: 1e-5, terms: { axial: 1e-5 } }] }],
      reciprocity: { maximumResidual: 0 }, evidence: {},
    },
    thermalReference: { rootNodeId: 'N0', rows: [{ coordinateId: 'C1', nodeId: 'N1', direction: [1, 0, 0], referenceDisplacementM: 0.001 }], componentEvidence: [], evidence: {} },
    compatibility: {
      schema: 'empirical-linear-restraint-compatibility/v1', coordinateIds: ['C1'], flexibilityMatrixMPerN: matrix, supportFlexibilityMPerN: [0], systemMatrixMPerN: matrix,
      rhsDisplacementM: [-0.001], rows: [{ coordinateId: 'C1', referenceDisplacementM: 0.001, targetDisplacementM: 0, supportStiffnessNPerM: null, supportFlexibilityMPerN: 0, reactionN: -100, pipeDisplacementM: 0, supportDeformationM: 0, compatibilityResidualM: 0 }],
      numerical: { scaledResidual: 0 }, reciprocity: { maximumResidual: 0, satisfied: true }, positiveDefinite: { structuralFlexibility: { satisfied: true }, compatibilitySystem: { satisfied: true } },
      compatibility: { maximumResidualM: 0, toleranceM: 1e-10, satisfied: true }, energy: { totalStrainEnergyJ: 0.05, generalizedWorkJ: 0.05, residualJ: 0, relativeResidual: 0, tolerance: 1e-10, satisfied: true }, formulaTrace: [],
    },
    evidence: { solutionClass: 'ANALYTICAL_FLEXIBILITY_FORCE_METHOD_ROM', formulaTrace: [] },
  };
}
