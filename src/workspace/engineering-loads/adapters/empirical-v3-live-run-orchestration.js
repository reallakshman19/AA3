import {
  EMPIRICAL_V3_ENGINEERING_EVENT_SCHEMA,
  EMPIRICAL_V3_WORKFLOW_ACTIONS,
  assessEmpiricalV3CalculationAuthorizationCurrent,
  createEmpiricalV3AuditJsonExport,
  projectEmpiricalV3Workflow,
  requireCurrentEmpiricalV3ResultReview,
  requireEmpiricalV3AuditReadiness,
  requireEmpiricalV3CoupledCalculationEvidence,
  requireEmpiricalV3SafetyPresentationPackage,
  requireEmpiricalV3WorkflowAction,
  sealEmpiricalV3EngineeringEvent,
  sealEmpiricalV3SafetyPresentationPackage,
} from '../../../core/empirical-v3-safety/index.js';
import {
  executeAuthorizedEmpiricalV3SourceBoundThermalRom,
  requireEmpiricalV3AuthorizedSourceBoundExecution,
} from './empirical-v3-authorized-source-bound-execution.js';

/** Executes the qualified source-bound ROM and advances to RESULT_REVIEW_REQUIRED. */
export function executeEmpiricalV3LiveSourceBoundRun(input) {
  const packageValue = requireEmpiricalV3SafetyPresentationPackage(input?.packageValue);
  const before = requireEmpiricalV3WorkflowAction(packageValue.workflow, EMPIRICAL_V3_WORKFLOW_ACTIONS.RUN_CALCULATION);
  const authorization = packageValue.calculationAuthorization;
  if (!authorization) throw new Error('Live V3 run requires the package calculation authorization.');
  const started = event({
    eventType:'CALC_STARTED',runId:packageValue.runId,fromWorkflowState:before.state,toWorkflowState:before.state,
    authorityRefs:[authorizationRef(authorization)],riskRefs:riskRefs(packageValue),confirmationRefs:confirmationRefs(packageValue),
    messageCode:'EMP_V3_CALC_STARTED',auditMetadata:input?.auditMetadata,
  });
  let execution;
  try {
    execution = executeAuthorizedEmpiricalV3SourceBoundThermalRom({
      runId: packageValue.runId,
      authorization,
      currentAuthorization: input?.currentAuthorization,
      romInput: input?.romInput,
    });
  } catch (error) {
    error.empiricalV3EngineeringEvent = event({
      eventType:'CALC_BLOCKED',severity:'ERROR',runId:packageValue.runId,fromWorkflowState:before.state,toWorkflowState:before.state,
      authorityRefs:[authorizationRef(authorization)],riskRefs:riskRefs(packageValue),confirmationRefs:confirmationRefs(packageValue),
      messageCode:'EMP_V3_CALC_BLOCKED',messageParameters:{code:error?.code??'EXECUTION_REJECTED'},auditMetadata:input?.auditMetadata,
    });
    throw error;
  }
  const sealedExecution = requireEmpiricalV3AuthorizedSourceBoundExecution(execution);
  const evidence = sealedExecution.evidence;
  const workflow = projectEmpiricalV3Workflow({
    ...before.facts,
    calculationResult:{present:true,current:true,reviewRequired:true,semanticHash:evidence.semanticHash},
    resultReview:{present:false,current:false,semanticHash:null},
    audit:{ready:false,current:false,semanticHash:null},
  });
  if (workflow.state !== 'RESULT_REVIEW_REQUIRED') throw new Error(`Live V3 run projected unexpected workflow ${workflow.state}.`);
  const completed = event({
    eventType:'CALC_COMPLETED',runId:packageValue.runId,fromWorkflowState:before.state,toWorkflowState:workflow.state,
    authorityRefs:[authorizationRef(authorization)],riskRefs:riskRefs(packageValue),confirmationRefs:confirmationRefs(packageValue),
    calculationEvidenceRefs:[evidenceRef(evidence)],messageCode:'EMP_V3_CALC_COMPLETED',auditMetadata:input?.auditMetadata,
  });
  const nextPackage = resealPackage(packageValue, workflow, [
    record('CALCULATION_EVIDENCE',evidence.evidenceId,evidence),
    record('ENGINEERING_EVENT',started.eventId,started),
    record('ENGINEERING_EVENT',completed.eventId,completed),
  ]);
  return Object.freeze({execution:sealedExecution,evidence,events:[started,completed],nextPackage});
}

/** Advances RESULT_REVIEW_REQUIRED -> RESULT_REVIEWED with one current review receipt. */
export function applyEmpiricalV3LiveResultReview(input) {
  const packageValue = requireEmpiricalV3SafetyPresentationPackage(input?.packageValue);
  requireEmpiricalV3WorkflowAction(packageValue.workflow, EMPIRICAL_V3_WORKFLOW_ACTIONS.REVIEW_RESULT);
  const evidence = requireEvidenceMatchesPackage(input?.evidence, packageValue);
  const review = requireCurrentEmpiricalV3ResultReview(input?.resultReview, evidence);
  const workflow = projectEmpiricalV3Workflow({
    ...packageValue.workflow.facts,
    calculationResult:{present:true,current:true,reviewRequired:true,semanticHash:evidence.semanticHash},
    resultReview:{present:true,current:true,semanticHash:review.semanticHash},
    audit:{ready:false,current:false,semanticHash:null},
  });
  if (workflow.state !== 'RESULT_REVIEWED') throw new Error(`Result review projected unexpected workflow ${workflow.state}.`);
  const reviewed = event({
    eventType:'RESULT_REVIEWED',runId:packageValue.runId,fromWorkflowState:packageValue.workflow.state,toWorkflowState:workflow.state,
    authorityRefs:[authorizationRef(packageValue.calculationAuthorization)],calculationEvidenceRefs:[evidenceRef(evidence)],
    messageCode:'EMP_V3_RESULT_REVIEWED',auditMetadata:input?.auditMetadata,
  });
  return Object.freeze({
    resultReview:review,event:reviewed,
    nextPackage:resealPackage(packageValue,workflow,[record('RESULT_REVIEW',review.receiptId,review),record('ENGINEERING_EVENT',reviewed.eventId,reviewed)]),
  });
}

/** Advances RESULT_REVIEWED -> AUDIT_EXPORT_READY with a separately sealed readiness artifact. */
export function applyEmpiricalV3LiveAuditReadiness(input) {
  const packageValue = requireEmpiricalV3SafetyPresentationPackage(input?.packageValue);
  if (packageValue.workflow.state !== 'RESULT_REVIEWED') throw new Error('Audit readiness requires RESULT_REVIEWED workflow.');
  const evidence = requireEvidenceMatchesPackage(input?.evidence, packageValue);
  const review = requireCurrentEmpiricalV3ResultReview(input?.resultReview, evidence);
  const readiness = requireEmpiricalV3AuditReadiness(input?.auditReadiness, {evidence,resultReview:review});
  const workflow = projectEmpiricalV3Workflow({
    ...packageValue.workflow.facts,
    calculationResult:{present:true,current:true,reviewRequired:true,semanticHash:evidence.semanticHash},
    resultReview:{present:true,current:true,semanticHash:review.semanticHash},
    audit:{ready:true,current:true,semanticHash:readiness.semanticHash},
  });
  if (workflow.state !== 'AUDIT_EXPORT_READY') throw new Error(`Audit readiness projected unexpected workflow ${workflow.state}.`);
  const ready = event({
    eventType:'AUDIT_READY',runId:packageValue.runId,fromWorkflowState:packageValue.workflow.state,toWorkflowState:workflow.state,
    calculationEvidenceRefs:[evidenceRef(evidence)],messageCode:'EMP_V3_AUDIT_READY',auditMetadata:input?.auditMetadata,
  });
  return Object.freeze({
    auditReadiness:readiness,event:ready,
    nextPackage:resealPackage(packageValue,workflow,[record('AUDIT_READINESS',readiness.readinessId,readiness),record('ENGINEERING_EVENT',ready.eventId,ready)]),
  });
}

/** Reconciles a changed authorization basis and moves backward without deleting old evidence. */
export function reconcileEmpiricalV3LiveAuthorization(input) {
  const packageValue = requireEmpiricalV3SafetyPresentationPackage(input?.packageValue);
  const authorization = packageValue.calculationAuthorization;
  if (!authorization) return Object.freeze({current:false,reasons:['CALCULATION_AUTHORIZATION_MISSING'],nextPackage:packageValue,event:null});
  const assessment = assessEmpiricalV3CalculationAuthorizationCurrent(authorization, input?.currentAuthorization);
  if (assessment.current) return Object.freeze({...assessment,nextPackage:packageValue,event:null});
  const workflow = projectEmpiricalV3Workflow({
    ...packageValue.workflow.facts,
    calculationAuthorization:{present:true,current:false,semanticHash:authorization.semanticHash},
    calculationResult:staleFact(packageValue.workflow.facts.calculationResult),
    resultReview:staleFact(packageValue.workflow.facts.resultReview),
    audit:{ready:false,current:false,semanticHash:packageValue.workflow.facts.audit.semanticHash},
  });
  const invalidated = event({
    eventType:'CALC_AUTHORIZATION_INVALIDATED',severity:'ERROR',runId:packageValue.runId,
    fromWorkflowState:packageValue.workflow.state,toWorkflowState:workflow.state,authorityRefs:[authorizationRef(authorization)],
    messageCode:'EMP_V3_CALC_AUTHORIZATION_INVALIDATED',messageParameters:{reasons:assessment.reasons},auditMetadata:input?.auditMetadata,
  });
  return Object.freeze({...assessment,event:invalidated,nextPackage:resealPackage(packageValue,workflow,[record('ENGINEERING_EVENT',invalidated.eventId,invalidated)])});
}

/** Adds AUDIT_EXPORTED to the governed package before serializing that exact package. */
export function createEmpiricalV3LiveAuditExport(input) {
  const packageValue = requireEmpiricalV3SafetyPresentationPackage(input?.packageValue);
  requireEmpiricalV3WorkflowAction(packageValue.workflow, EMPIRICAL_V3_WORKFLOW_ACTIONS.EXPORT_AUDIT);
  const evidence = requireEvidenceMatchesPackage(input?.evidence, packageValue);
  const review = requireCurrentEmpiricalV3ResultReview(input?.resultReview, evidence);
  const readiness = requireEmpiricalV3AuditReadiness(input?.auditReadiness, {evidence,resultReview:review});
  const exported = event({
    eventType:'AUDIT_EXPORTED',runId:packageValue.runId,fromWorkflowState:packageValue.workflow.state,toWorkflowState:packageValue.workflow.state,
    calculationEvidenceRefs:[evidenceRef(evidence)],messageCode:'EMP_V3_AUDIT_EXPORTED',auditMetadata:input?.auditMetadata,
  });
  const nextPackage = resealPackage(packageValue,packageValue.workflow,[record('ENGINEERING_EVENT',exported.eventId,exported)]);
  const recordValue = createEmpiricalV3AuditJsonExport({
    safetyPackage:nextPackage,evidence,resultReview:review,auditReadiness:readiness,
  });
  return Object.freeze({record:recordValue,event:exported,nextPackage});
}

function resealPackage(packageValue,workflow,additions){return sealEmpiricalV3SafetyPresentationPackage({runId:packageValue.runId,workflow,branches:packageValue.branches,components:packageValue.components,riskSet:packageValue.riskSet,confirmations:packageValue.confirmations,calculationAuthorization:packageValue.calculationAuthorization,records:mergeRecords(packageValue.records,additions)});}
function mergeRecords(existing,additions){const map=new Map(existing.map((row)=>[`${row.kind}\u0000${row.ref}`,row]));for(const row of additions)map.set(`${row.kind}\u0000${row.ref}`,row);return[...map.values()];}
function record(kind,ref,value){return{kind,ref,semanticHash:value.semanticHash,evidenceHash:value.evidenceHash??null,record:value};}
function event(input){return sealEmpiricalV3EngineeringEvent({schema:EMPIRICAL_V3_ENGINEERING_EVENT_SCHEMA,severity:input.severity??'INFO',branchId:null,entityIds:[],quantityIds:[],authorityRefs:[],riskRefs:[],confirmationRefs:[],calculationEvidenceRefs:[],messageParameters:{},...input});}
function riskRefs(packageValue){return packageValue.riskSet.risks.map((risk)=>({ref:risk.riskId,semanticHash:risk.semanticHash}));}
function confirmationRefs(packageValue){return packageValue.confirmations.map((receipt)=>({ref:receipt.receiptId,semanticHash:receipt.semanticHash}));}
function authorizationRef(value){return{ref:value.authorizationId,semanticHash:value.semanticHash};}
function evidenceRef(value){return{ref:value.evidenceId,semanticHash:value.semanticHash};}
function requireEvidenceMatchesPackage(value,packageValue){const evidence=requireEmpiricalV3CoupledCalculationEvidence(value);if(evidence.runId!==packageValue.runId||evidence.authorizationRef.semanticHash!==packageValue.calculationAuthorization?.semanticHash)throw new Error('Calculation evidence is stale or belongs to another package authorization.');return evidence;}
function staleFact(value={}){return{present:value.present===true,current:false,reviewRequired:value.reviewRequired===true,semanticHash:value.semanticHash??null};}
