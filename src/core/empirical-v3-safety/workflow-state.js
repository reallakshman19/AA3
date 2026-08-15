import { semanticHash } from '../empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../shared-primitives/immutable.js';

export const EMPIRICAL_V3_WORKFLOW_SCHEMA = 'empirical-v3-workflow-projection/v1';
export const EMPIRICAL_V3_WORKFLOW_STATES = Object.freeze([
  'NO_SOURCE','SOURCE_READY','AUTHORITY_BUILD_REQUIRED','BRANCH_REVIEW_REQUIRED','SAFETY_REVIEW_REQUIRED',
  'HIGH_BLOCK_PRESENT','HIGH_CONFIRM_PENDING','SAFETY_CLEARED','CALCULATION_AUTHORIZED','CALCULATED',
  'RESULT_REVIEW_REQUIRED','RESULT_REVIEWED','AUDIT_EXPORT_READY',
]);
export const EMPIRICAL_V3_WORKFLOW_ACTIONS = Object.freeze({
  BUILD_AUTHORITIES:'BUILD_AUTHORITIES',REVIEW_BRANCH_BASIS:'REVIEW_BRANCH_BASIS',REVIEW_SAFETY:'REVIEW_SAFETY',
  REVIEW_HIGH_CONFIRM:'REVIEW_HIGH_CONFIRM',RUN_CALCULATION:'RUN_CALCULATION',REQUIRE_RESULT_REVIEW:'REQUIRE_RESULT_REVIEW',
  REVIEW_RESULT:'REVIEW_RESULT',EXPORT_AUDIT:'EXPORT_AUDIT',
});
const ACTION_STATES = Object.freeze({
  BUILD_AUTHORITIES:new Set(['SOURCE_READY','AUTHORITY_BUILD_REQUIRED']),
  REVIEW_BRANCH_BASIS:new Set(['BRANCH_REVIEW_REQUIRED']),
  REVIEW_SAFETY:new Set(['SAFETY_REVIEW_REQUIRED','HIGH_BLOCK_PRESENT','HIGH_CONFIRM_PENDING']),
  REVIEW_HIGH_CONFIRM:new Set(['HIGH_CONFIRM_PENDING']),RUN_CALCULATION:new Set(['CALCULATION_AUTHORIZED']),
  REQUIRE_RESULT_REVIEW:new Set(['CALCULATED']),REVIEW_RESULT:new Set(['RESULT_REVIEW_REQUIRED']),EXPORT_AUDIT:new Set(['AUDIT_EXPORT_READY']),
});

/** Projects the owner-locked workflow from sealed, already-verified domain facts. */
export function projectEmpiricalV3Workflow(input = {}) {
  const facts = normalizeVerifiedFacts(input);
  const state = selectState(facts);
  const reasonCodes = reasonsForState(state, facts);
  const identityFields = { schema: EMPIRICAL_V3_WORKFLOW_SCHEMA, state, facts, reasonCodes };
  return deepFreeze({
    schema:EMPIRICAL_V3_WORKFLOW_SCHEMA,state,reasonCodes,facts,
    canRunCalculation:state==='CALCULATION_AUTHORIZED',
    calculationAuthorizationRef:state==='CALCULATION_AUTHORIZED'?facts.calculationAuthorization.semanticHash:null,
    semanticHash:semanticHash(identityFields),
  });
}

/** Reprojects carried facts so a UI/package cannot fabricate a trusted workflow state string. */
export function requireEmpiricalV3WorkflowProjection(value) {
  if (!value || value.schema !== EMPIRICAL_V3_WORKFLOW_SCHEMA || !value.facts || typeof value.facts !== 'object') {
    throw new TypeError('A self-contained Empirical V3 workflow projection is required.');
  }
  const expected = projectEmpiricalV3Workflow(value.facts);
  if (value.state !== expected.state
      || JSON.stringify(value.reasonCodes) !== JSON.stringify(expected.reasonCodes)
      || value.canRunCalculation !== expected.canRunCalculation
      || (value.calculationAuthorizationRef ?? null) !== expected.calculationAuthorizationRef
      || value.semanticHash !== expected.semanticHash) {
    throw new Error('Empirical V3 workflow projection identity/state mismatch.');
  }
  return expected;
}

export function canPerformEmpiricalV3WorkflowAction(projection, action) {
  const current = requireEmpiricalV3WorkflowProjection(projection);
  const allowedStates=ACTION_STATES[action];
  if(!allowedStates)throw new RangeError(`Unsupported Empirical V3 workflow action: ${action}`);
  return allowedStates.has(current.state);
}
export function requireEmpiricalV3WorkflowAction(projection, action) {
  const current=requireEmpiricalV3WorkflowProjection(projection);
  if(!canPerformEmpiricalV3WorkflowAction(current,action))throw new Error(`Empirical V3 action ${action} is not permitted from ${current.state}.`);
  return current;
}

function selectState(f) {
  if(!f.source.bound)return'NO_SOURCE'; if(!f.source.current)return'SOURCE_READY';
  if(!f.authorities.built||!f.authorities.current)return'AUTHORITY_BUILD_REQUIRED';
  if(!f.branches.built||!f.branches.current||!f.branches.reviewCurrent)return'BRANCH_REVIEW_REQUIRED';
  if(!f.riskSet.evaluated||!f.riskSet.current)return'SAFETY_REVIEW_REQUIRED';
  if(f.riskSet.highBlockCount>0)return'HIGH_BLOCK_PRESENT'; if(f.riskSet.highConfirmPendingCount>0)return'HIGH_CONFIRM_PENDING';
  if(!f.calculationAuthorization.present||!f.calculationAuthorization.current)return'SAFETY_CLEARED';
  if(!f.calculationResult.present||!f.calculationResult.current)return'CALCULATION_AUTHORIZED';
  if(!f.calculationResult.reviewRequired)return'CALCULATED';
  if(!f.resultReview.present||!f.resultReview.current)return'RESULT_REVIEW_REQUIRED';
  if(!f.audit.ready||!f.audit.current)return'RESULT_REVIEWED'; return'AUDIT_EXPORT_READY';
}
function reasonsForState(state,f){switch(state){
  case'NO_SOURCE':return['SOURCE_NOT_BOUND'];case'SOURCE_READY':return['SOURCE_REBIND_OR_CURRENTNESS_REQUIRED'];
  case'AUTHORITY_BUILD_REQUIRED':return['AUTHORITY_SET_MISSING_OR_STALE'];case'BRANCH_REVIEW_REQUIRED':return['BRANCH_BASIS_MISSING_STALE_OR_UNREVIEWED'];
  case'SAFETY_REVIEW_REQUIRED':return['RISK_SET_MISSING_OR_STALE'];case'HIGH_BLOCK_PRESENT':return[`HIGH_BLOCK_COUNT:${f.riskSet.highBlockCount}`];
  case'HIGH_CONFIRM_PENDING':return[`HIGH_CONFIRM_PENDING_COUNT:${f.riskSet.highConfirmPendingCount}`];case'SAFETY_CLEARED':return['CALCULATION_AUTHORIZATION_MISSING_OR_STALE'];
  case'CALCULATION_AUTHORIZED':return['CURRENT_SEALED_CALCULATION_AUTHORIZATION'];case'CALCULATED':return['CURRENT_RESULT_AWAITS_REVIEW_REQUIREMENT'];
  case'RESULT_REVIEW_REQUIRED':return['CURRENT_RESULT_REVIEW_REQUIRED'];case'RESULT_REVIEWED':return['CURRENT_RESULT_REVIEWED_AUDIT_NOT_READY'];
  case'AUDIT_EXPORT_READY':return['CURRENT_AUDIT_EXPORT_READY'];default:throw new RangeError(`Unsupported Empirical V3 workflow state: ${state}`);}}

function normalizeVerifiedFacts(input){
  const source=normalizeRecord(input.source,['bound','current'],['semanticHash']);
  const authorities=normalizeRecord(input.authorities,['built','current'],['semanticHash']);
  const branches=normalizeRecord(input.branches,['built','current','reviewCurrent'],['semanticHash','reviewSemanticHash']);
  const riskSet=normalizeRecord(input.riskSet,['evaluated','current'],['semanticHash']);
  const calculationAuthorization=normalizeRecord(input.calculationAuthorization,['present','current'],['semanticHash']);
  const calculationResult=normalizeRecord(input.calculationResult,['present','current','reviewRequired'],['semanticHash']);
  const resultReview=normalizeRecord(input.resultReview,['present','current'],['semanticHash']);
  const audit=normalizeRecord(input.audit,['ready','current'],['semanticHash']);
  requireHashWhen(source,source.bound&&source.current,'source.semanticHash'); requireHashWhen(authorities,authorities.built&&authorities.current,'authorities.semanticHash');
  requireHashWhen(branches,branches.built&&branches.current,'branches.semanticHash'); requireHashWhen(branches,branches.reviewCurrent,'branches.reviewSemanticHash');
  requireHashWhen(riskSet,riskSet.evaluated&&riskSet.current,'riskSet.semanticHash'); requireHashWhen(calculationAuthorization,calculationAuthorization.present&&calculationAuthorization.current,'calculationAuthorization.semanticHash');
  requireHashWhen(calculationResult,calculationResult.present&&calculationResult.current,'calculationResult.semanticHash'); requireHashWhen(resultReview,resultReview.present&&resultReview.current,'resultReview.semanticHash'); requireHashWhen(audit,audit.ready&&audit.current,'audit.semanticHash');
  return deepFreeze({source,authorities,branches,riskSet:{...riskSet,highBlockCount:requireNonNegativeInteger(input.riskSet?.highBlockCount??0,'riskSet.highBlockCount'),highConfirmPendingCount:requireNonNegativeInteger(input.riskSet?.highConfirmPendingCount??0,'riskSet.highConfirmPendingCount')},calculationAuthorization,calculationResult,resultReview,audit});
}
function normalizeRecord(value,booleanFields,stringFields=[]){const record=value&&typeof value==='object'?value:{};const normalized={};for(const field of booleanFields)normalized[field]=record[field]===true;for(const field of stringFields)normalized[field]=optionalText(record[field]);return normalized;}
function requireHashWhen(record,required,fieldName){const field=fieldName.split('.').at(-1);if(required&&!record[field])throw new TypeError(`${fieldName} is required for a current sealed record.`);}
function optionalText(value){const text=String(value??'').trim();return text||null;}
function requireNonNegativeInteger(value,fieldName){if(!Number.isInteger(value)||value<0)throw new TypeError(`${fieldName} must be a non-negative integer.`);return value;}
