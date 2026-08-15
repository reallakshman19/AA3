import { semanticHash } from '../empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../shared-primitives/immutable.js';

export const EMPIRICAL_V3_ENGINEERING_EVENT_SCHEMA = 'empirical-v3-engineering-event/v1';

export const EMPIRICAL_V3_ENGINEERING_EVENT_TYPES = Object.freeze([
  'SOURCE_BOUND',
  'SOURCE_STALE',
  'AUTHORITY_RESOLVED',
  'AUTHORITY_UNRESOLVED',
  'BRANCH_CREATED',
  'BRANCH_INVALIDATED',
  'COMPONENT_RESOLVED',
  'RISK_RAISED',
  'RISK_CLEARED',
  'CONFIRMATION_CREATED',
  'CONFIRMATION_INVALIDATED',
  'CALC_AUTHORIZED',
  'CALC_AUTHORIZATION_INVALIDATED',
  'CALC_STARTED',
  'CALC_COMPLETED',
  'CALC_BLOCKED',
  'RESULT_REVIEWED',
  'AUDIT_READY',
  'RESULT_VIEWED',
  'AUDIT_EXPORTED',
]);

export const EMPIRICAL_V3_ENGINEERING_EVENT_SEVERITIES = Object.freeze([
  'ERROR',
  'REVIEW',
  'WARNING',
  'INFO',
]);

export function sealEmpiricalV3EngineeringEvent(input) {
  const normalized = normalizeEvent(input, false);
  const hash = semanticHash(engineeringEventSemanticProjection(normalized));
  const eventId = `event:${hash.slice('fnv1a64:'.length)}`;
  const evidenceHash = semanticHash({
    semanticHash: hash,
    eventId,
    auditMetadata: normalized.auditMetadata,
  });
  return deepFreeze({
    ...normalized,
    eventId,
    semanticHash: hash,
    evidenceHash,
  });
}

export function requireEmpiricalV3EngineeringEvent(value) {
  const normalized = normalizeEvent(value, true);
  const expectedHash = semanticHash(engineeringEventSemanticProjection(normalized));
  const expectedId = `event:${expectedHash.slice('fnv1a64:'.length)}`;
  if (normalized.semanticHash !== expectedHash || normalized.eventId !== expectedId) {
    throw new Error('Engineering event identity mismatch.');
  }
  const expectedEvidenceHash = semanticHash({
    semanticHash: expectedHash,
    eventId: expectedId,
    auditMetadata: normalized.auditMetadata,
  });
  if (normalized.evidenceHash !== expectedEvidenceHash) {
    throw new Error('Engineering event evidence hash mismatch.');
  }
  return deepFreeze(normalized);
}

export function engineeringEventSemanticProjection(value) {
  return {
    schema: value.schema,
    eventType: value.eventType,
    severity: value.severity,
    runId: value.runId,
    branchId: value.branchId,
    entityIds: value.entityIds,
    quantityIds: value.quantityIds,
    fromWorkflowState: value.fromWorkflowState,
    toWorkflowState: value.toWorkflowState,
    authorityRefs: value.authorityRefs,
    riskRefs: value.riskRefs,
    confirmationRefs: value.confirmationRefs,
    calculationEvidenceRefs: value.calculationEvidenceRefs,
    messageCode: value.messageCode,
    messageParameters: value.messageParameters,
  };
}

export function empiricalV3SeverityForRiskClass(riskClass) {
  switch (riskClass) {
    case 'HIGH_BLOCK': return 'ERROR';
    case 'HIGH_CONFIRM': return 'REVIEW';
    case 'MEDIUM': return 'WARNING';
    case 'LOW': return 'INFO';
    default: throw new RangeError(`Unsupported engineering risk class: ${riskClass}`);
  }
}

function normalizeEvent(input, sealed) {
  if (!input || typeof input !== 'object') throw new TypeError('Engineering event must be an object.');
  if (input.schema !== EMPIRICAL_V3_ENGINEERING_EVENT_SCHEMA) {
    throw new TypeError(`Expected schema ${EMPIRICAL_V3_ENGINEERING_EVENT_SCHEMA}.`);
  }
  return {
    schema: input.schema,
    eventType: requireEnum(input.eventType, EMPIRICAL_V3_ENGINEERING_EVENT_TYPES, 'eventType'),
    severity: requireEnum(input.severity, EMPIRICAL_V3_ENGINEERING_EVENT_SEVERITIES, 'severity'),
    runId: requireText(input.runId, 'runId'),
    branchId: optionalText(input.branchId),
    entityIds: uniqueTexts(input.entityIds ?? [], 'entityIds'),
    quantityIds: uniqueTexts(input.quantityIds ?? [], 'quantityIds'),
    fromWorkflowState: optionalText(input.fromWorkflowState),
    toWorkflowState: optionalText(input.toWorkflowState),
    authorityRefs: normalizeRefs(input.authorityRefs ?? [], 'authorityRefs'),
    riskRefs: normalizeRefs(input.riskRefs ?? [], 'riskRefs'),
    confirmationRefs: normalizeRefs(input.confirmationRefs ?? [], 'confirmationRefs'),
    calculationEvidenceRefs: normalizeRefs(input.calculationEvidenceRefs ?? [], 'calculationEvidenceRefs'),
    messageCode: requireText(input.messageCode, 'messageCode'),
    messageParameters: normalizeJsonRecord(input.messageParameters ?? {}, 'messageParameters'),
    auditMetadata: normalizeAuditMetadata(input.auditMetadata),
    eventId: sealed ? requireText(input.eventId, 'eventId') : '',
    semanticHash: sealed ? requireText(input.semanticHash, 'semanticHash') : '',
    evidenceHash: sealed ? requireText(input.evidenceHash, 'evidenceHash') : '',
  };
}

function normalizeRefs(value, fieldName) {
  if (!Array.isArray(value)) throw new TypeError(`${fieldName} must be an array.`);
  const refs = value.map((item, index) => {
    if (!item || typeof item !== 'object') throw new TypeError(`${fieldName}[${index}] must be an object.`);
    return {
      ref: requireText(item.ref, `${fieldName}[${index}].ref`),
      semanticHash: requireText(item.semanticHash, `${fieldName}[${index}].semanticHash`),
    };
  });
  const map = new Map();
  for (const ref of refs) map.set(`${ref.ref}\u0000${ref.semanticHash}`, ref);
  return [...map.values()].sort((a, b) => (
    a.ref.localeCompare(b.ref) || a.semanticHash.localeCompare(b.semanticHash)
  ));
}

function normalizeAuditMetadata(value) {
  const record = value && typeof value === 'object' ? value : {};
  return {
    actor: optionalText(record.actor),
    timestamp: optionalText(record.timestamp),
  };
}

function normalizeJsonRecord(value, fieldName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an object.`);
  }
  const normalized = JSON.parse(JSON.stringify(value));
  semanticHash(normalized);
  return normalized;
}

function uniqueTexts(value, fieldName) {
  if (!Array.isArray(value)) throw new TypeError(`${fieldName} must be an array.`);
  return [...new Set(value.map((item, index) => requireText(item, `${fieldName}[${index}]`)))].sort();
}

function requireEnum(value, allowed, fieldName) {
  if (!allowed.includes(value)) throw new TypeError(`${fieldName} is invalid.`);
  return value;
}

function requireText(value, fieldName) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${fieldName} is required.`);
  return text;
}

function optionalText(value) {
  const text = String(value ?? '').trim();
  return text || null;
}
