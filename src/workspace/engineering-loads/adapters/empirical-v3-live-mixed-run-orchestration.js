import {
  EMPIRICAL_V3_ENGINEERING_EVENT_SCHEMA,
  EMPIRICAL_V3_WORKFLOW_ACTIONS,
  projectEmpiricalV3Workflow,
  requireEmpiricalV3SafetyPresentationPackage,
  requireEmpiricalV3WorkflowAction,
  sealEmpiricalV3EngineeringEvent,
  sealEmpiricalV3SafetyPresentationPackage,
} from '../../../core/empirical-v3-safety/index.js';
import {
  executeAuthorizedEmpiricalV3MixedComponentThermalRom,
  requireEmpiricalV3AuthorizedMixedComponentExecution,
} from './empirical-v3-authorized-mixed-component-execution.js';

/**
 * Non-UI mixed execution orchestration. The browser does not import this module.
 * It advances only CALCULATION_AUTHORIZED -> RESULT_REVIEW_REQUIRED.
 */
export function executeEmpiricalV3LiveMixedComponentRun(input) {
  const packageValue = requireEmpiricalV3SafetyPresentationPackage(input?.packageValue);
  const before = requireEmpiricalV3WorkflowAction(
    packageValue.workflow,
    EMPIRICAL_V3_WORKFLOW_ACTIONS.RUN_CALCULATION,
  );
  const authorization = packageValue.calculationAuthorization;
  if (!authorization) throw new Error('Live mixed V3 run requires the package calculation authorization.');

  const started = event({
    eventType: 'CALC_STARTED',
    runId: packageValue.runId,
    fromWorkflowState: before.state,
    toWorkflowState: before.state,
    authorityRefs: [authorizationRef(authorization)],
    riskRefs: riskRefs(packageValue),
    confirmationRefs: confirmationRefs(packageValue),
    messageCode: 'EMP_V3_MIXED_CALC_STARTED',
    auditMetadata: input?.auditMetadata,
  });

  let execution;
  try {
    execution = executeAuthorizedEmpiricalV3MixedComponentThermalRom({
      runId: packageValue.runId,
      authorization,
      currentAuthorization: input?.currentAuthorization,
      producer: input?.producer,
    });
  } catch (error) {
    error.empiricalV3EngineeringEvent = event({
      eventType: 'CALC_BLOCKED',
      severity: 'ERROR',
      runId: packageValue.runId,
      fromWorkflowState: before.state,
      toWorkflowState: before.state,
      authorityRefs: [authorizationRef(authorization)],
      riskRefs: riskRefs(packageValue),
      confirmationRefs: confirmationRefs(packageValue),
      messageCode: 'EMP_V3_MIXED_CALC_BLOCKED',
      messageParameters: { code: error?.code ?? 'MIXED_EXECUTION_REJECTED' },
      auditMetadata: input?.auditMetadata,
    });
    throw error;
  }

  const sealedExecution = requireEmpiricalV3AuthorizedMixedComponentExecution(execution);
  const evidence = sealedExecution.evidence;
  const workflow = projectEmpiricalV3Workflow({
    ...before.facts,
    calculationResult: {
      present: true,
      current: true,
      reviewRequired: true,
      semanticHash: evidence.semanticHash,
    },
    resultReview: { present: false, current: false, semanticHash: null },
    audit: { ready: false, current: false, semanticHash: null },
  });
  if (workflow.state !== 'RESULT_REVIEW_REQUIRED') {
    throw new Error(`Live mixed V3 run projected unexpected workflow ${workflow.state}.`);
  }

  const completed = event({
    eventType: 'CALC_COMPLETED',
    runId: packageValue.runId,
    fromWorkflowState: before.state,
    toWorkflowState: workflow.state,
    authorityRefs: [authorizationRef(authorization)],
    riskRefs: riskRefs(packageValue),
    confirmationRefs: confirmationRefs(packageValue),
    calculationEvidenceRefs: [evidenceRef(evidence)],
    messageCode: 'EMP_V3_MIXED_CALC_COMPLETED',
    auditMetadata: input?.auditMetadata,
  });

  const nextPackage = resealPackage(packageValue, workflow, [
    record('CALCULATION_EVIDENCE', evidence.evidenceId, evidence),
    record('ENGINEERING_EVENT', started.eventId, started),
    record('ENGINEERING_EVENT', completed.eventId, completed),
  ]);
  return Object.freeze({
    execution: sealedExecution,
    evidence,
    events: [started, completed],
    nextPackage,
  });
}

function resealPackage(packageValue, workflow, additions) {
  return sealEmpiricalV3SafetyPresentationPackage({
    runId: packageValue.runId,
    workflow,
    branches: packageValue.branches,
    components: packageValue.components,
    riskSet: packageValue.riskSet,
    confirmations: packageValue.confirmations,
    calculationAuthorization: packageValue.calculationAuthorization,
    records: mergeRecords(packageValue.records, additions),
  });
}
function mergeRecords(existing, additions) {
  const map = new Map(existing.map((row) => [`${row.kind}\u0000${row.ref}`, row]));
  for (const row of additions) map.set(`${row.kind}\u0000${row.ref}`, row);
  return [...map.values()];
}
function record(kind, ref, value) {
  return {
    kind,
    ref,
    semanticHash: value.semanticHash,
    evidenceHash: value.evidenceHash ?? null,
    record: value,
  };
}
function event(input) {
  return sealEmpiricalV3EngineeringEvent({
    schema: EMPIRICAL_V3_ENGINEERING_EVENT_SCHEMA,
    severity: input.severity ?? 'INFO',
    branchId: null,
    entityIds: [],
    quantityIds: [],
    authorityRefs: [],
    riskRefs: [],
    confirmationRefs: [],
    calculationEvidenceRefs: [],
    messageParameters: {},
    ...input,
  });
}
function riskRefs(packageValue) {
  return packageValue.riskSet.risks.map((risk) => ({
    ref: risk.riskId,
    semanticHash: risk.semanticHash,
  }));
}
function confirmationRefs(packageValue) {
  return packageValue.confirmations.map((receipt) => ({
    ref: receipt.receiptId,
    semanticHash: receipt.semanticHash,
  }));
}
function authorizationRef(value) {
  return { ref: value.authorizationId, semanticHash: value.semanticHash };
}
function evidenceRef(value) {
  return { ref: value.evidenceId, semanticHash: value.semanticHash };
}
