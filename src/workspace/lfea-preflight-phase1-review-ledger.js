import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import {
  LFEA_PREFLIGHT_ENGINEERING_FIELDS,
  requireLfeaPreflightFieldOrdinal,
} from './lfea-preflight-phase1-schema.js';

export const LFEA_PREFLIGHT_REVIEW_LEDGER_SCHEMA = 'lfea-preflight-review-ledger/v1';
export const LFEA_PREFLIGHT_REVIEW_PROPOSAL_SCHEMA = 'lfea-preflight-review-proposal/v1';
export const LFEA_PREFLIGHT_REVIEW_EVENT_SCHEMA = 'lfea-preflight-review-event/v1';

export const LFEA_PREFLIGHT_REVIEW_ACTION = Object.freeze({
  ACCEPT: 'ACCEPT',
  REJECT: 'REJECT',
  OVERRIDE: 'OVERRIDE',
  DEFER: 'DEFER',
  UNDO: 'UNDO',
});

/** A proposal is immutable evidence, never an applied engineering mutation. */
export function createLfeaPreflightReviewProposal(input) {
  requireRecord(input, 'proposal');
  const fieldId = requireField(input.fieldId);
  const identity = {
    datasetIdentity: requireText(input.datasetIdentity, 'datasetIdentity'),
    targetId: requireText(input.targetId, 'targetId'),
    fieldId,
    proposedValue: normalizeJsonValue(input.proposedValue),
    method: requireText(input.method, 'method'),
    sourceEvidence: normalizeEvidence(input.sourceEvidence),
    createdAt: requireTimestamp(input.createdAt, 'createdAt'),
  };
  const proposalId = `PRP-${semanticHash(identity).slice('fnv1a64:'.length).toUpperCase()}`;
  return Object.freeze({
    schema: LFEA_PREFLIGHT_REVIEW_PROPOSAL_SCHEMA,
    proposalId,
    ...identity,
    semanticHash: semanticHash({ schema: LFEA_PREFLIGHT_REVIEW_PROPOSAL_SCHEMA, proposalId, ...identity }),
  });
}

export function createLfeaPreflightReviewLedger({ datasetIdentity, reviewerPolicyId }) {
  const draft = {
    schema: LFEA_PREFLIGHT_REVIEW_LEDGER_SCHEMA,
    datasetIdentity: requireText(datasetIdentity, 'datasetIdentity'),
    reviewerPolicyId: requireText(reviewerPolicyId, 'reviewerPolicyId'),
    events: Object.freeze([]),
    semanticHash: '',
  };
  draft.semanticHash = ledgerHash(draft);
  return Object.freeze(draft);
}

/**
 * Append one immutable review event. Time, actor and reason are explicit input;
 * this package never reads Date.now(), locale state, randomUUID or Math.random.
 */
export function appendLfeaPreflightReviewEvent(ledger, input) {
  const accepted = requireLfeaPreflightReviewLedger(ledger);
  requireRecord(input, 'reviewEvent');
  const action = requireAction(input.action);
  const actor = requireText(input.actor, 'actor');
  const reason = requireText(input.reason, 'reason');
  const occurredAt = requireTimestamp(input.occurredAt, 'occurredAt');
  const targetId = requireText(input.targetId, 'targetId');
  const fieldId = requireField(input.fieldId);
  const proposalId = nullableText(input.proposalId);
  const value = normalizeJsonValue(input.value);
  const evidence = normalizeEvidence(input.evidence);
  const compensatesEventId = action === LFEA_PREFLIGHT_REVIEW_ACTION.UNDO
    ? requireUndoTarget(accepted, input.compensatesEventId, targetId, fieldId)
    : null;

  if (action === LFEA_PREFLIGHT_REVIEW_ACTION.OVERRIDE && value === null) {
    throw ledgerError('E_P06_REVIEW_OVERRIDE_VALUE_REQUIRED', 'OVERRIDE requires an explicit non-null replacement value.');
  }
  if ([LFEA_PREFLIGHT_REVIEW_ACTION.ACCEPT, LFEA_PREFLIGHT_REVIEW_ACTION.REJECT]
    .includes(action) && proposalId === null) {
    throw ledgerError('E_P06_REVIEW_PROPOSAL_REQUIRED', `${action} requires proposalId.`);
  }

  const sequence = accepted.events.length + 1;
  const eventIdentity = {
    priorLedgerHash: accepted.semanticHash,
    sequence,
    action,
    targetId,
    fieldId,
    proposalId,
    value,
    actor,
    reason,
    occurredAt,
    evidence,
    compensatesEventId,
  };
  const eventId = `REV-${semanticHash(eventIdentity).slice('fnv1a64:'.length).toUpperCase()}`;
  if (accepted.events.some((event) => event.eventId === eventId)) {
    throw ledgerError('E_P06_REVIEW_EVENT_DUPLICATE', `Review event identity already exists: ${eventId}`);
  }
  const event = Object.freeze({
    schema: LFEA_PREFLIGHT_REVIEW_EVENT_SCHEMA,
    eventId,
    sequence,
    action,
    targetId,
    fieldId,
    fieldOrdinal: requireLfeaPreflightFieldOrdinal(fieldId),
    proposalId,
    value,
    actor,
    reason,
    occurredAt,
    evidence,
    compensatesEventId,
    semanticHash: semanticHash({ schema: LFEA_PREFLIGHT_REVIEW_EVENT_SCHEMA, eventId, ...eventIdentity }),
  });
  const next = {
    ...accepted,
    events: Object.freeze([...accepted.events, event]),
    semanticHash: '',
  };
  next.semanticHash = ledgerHash(next);
  return Object.freeze(next);
}

export function requireLfeaPreflightReviewLedger(value) {
  requireRecord(value, 'reviewLedger');
  if (value.schema !== LFEA_PREFLIGHT_REVIEW_LEDGER_SCHEMA
    || !Array.isArray(value.events)
    || value.events.some((event, index) => event?.schema !== LFEA_PREFLIGHT_REVIEW_EVENT_SCHEMA
      || event.sequence !== index + 1)) {
    throw ledgerError('E_P06_REVIEW_LEDGER_INVALID', 'Phase-1 review ledger structure is invalid.');
  }
  requireText(value.datasetIdentity, 'datasetIdentity');
  requireText(value.reviewerPolicyId, 'reviewerPolicyId');
  const expected = ledgerHash(value);
  if (value.semanticHash !== expected) {
    throw ledgerError('E_P06_REVIEW_LEDGER_HASH_INVALID', 'Phase-1 review ledger semantic hash is stale.');
  }
  for (const event of value.events) validateEvent(event);
  return value;
}

/**
 * Project current review state without deleting history. UNDO is a compensating
 * event: it marks a prior event inactive and replay continues deterministically.
 */
export function projectLfeaPreflightReviewState(ledger, targetId, fieldId) {
  const accepted = requireLfeaPreflightReviewLedger(ledger);
  const target = requireText(targetId, 'targetId');
  const field = requireField(fieldId);
  const relevant = accepted.events.filter((event) => event.targetId === target && event.fieldId === field);
  const compensated = new Set(relevant
    .filter((event) => event.action === LFEA_PREFLIGHT_REVIEW_ACTION.UNDO)
    .map((event) => event.compensatesEventId));
  let disposition = 'UNREVIEWED';
  let proposalId = null;
  let overrideValue = null;
  let lastEventId = null;
  for (const event of relevant) {
    if (event.action === LFEA_PREFLIGHT_REVIEW_ACTION.UNDO || compensated.has(event.eventId)) continue;
    lastEventId = event.eventId;
    proposalId = event.proposalId ?? proposalId;
    if (event.action === LFEA_PREFLIGHT_REVIEW_ACTION.ACCEPT) disposition = 'ACCEPTED';
    if (event.action === LFEA_PREFLIGHT_REVIEW_ACTION.REJECT) disposition = 'REJECTED';
    if (event.action === LFEA_PREFLIGHT_REVIEW_ACTION.DEFER) disposition = 'DEFERRED';
    if (event.action === LFEA_PREFLIGHT_REVIEW_ACTION.OVERRIDE) {
      disposition = 'OVERRIDDEN';
      overrideValue = event.value;
    }
  }
  return Object.freeze({
    targetId: target,
    fieldId: field,
    disposition,
    proposalId,
    overrideValue,
    lastEventId,
    eventCount: relevant.length,
    compensatedEventIds: Object.freeze([...compensated].sort(compareAscii)),
  });
}

export function reviewLedgerEventIds(ledger) {
  return Object.freeze(requireLfeaPreflightReviewLedger(ledger).events.map((event) => event.eventId));
}

function requireUndoTarget(ledger, eventId, targetId, fieldId) {
  const id = requireText(eventId, 'compensatesEventId');
  const prior = ledger.events.find((event) => event.eventId === id) ?? null;
  if (prior === null || prior.action === LFEA_PREFLIGHT_REVIEW_ACTION.UNDO) {
    throw ledgerError('E_P06_REVIEW_UNDO_TARGET_INVALID', `UNDO target is invalid: ${id}`);
  }
  if (prior.targetId !== targetId || prior.fieldId !== fieldId) {
    throw ledgerError('E_P06_REVIEW_UNDO_TARGET_INVALID', 'UNDO must compensate an event for the same target and field.');
  }
  if (ledger.events.some((event) => event.action === LFEA_PREFLIGHT_REVIEW_ACTION.UNDO
    && event.compensatesEventId === id)) {
    throw ledgerError('E_P06_REVIEW_UNDO_ALREADY_COMPENSATED', `Review event is already compensated: ${id}`);
  }
  return id;
}

function validateEvent(event) {
  if (event.schema !== LFEA_PREFLIGHT_REVIEW_EVENT_SCHEMA
    || !Number.isSafeInteger(event.sequence) || event.sequence < 1) {
    throw ledgerError('E_P06_REVIEW_EVENT_INVALID', 'Phase-1 review event is invalid.');
  }
  requireAction(event.action);
  requireText(event.targetId, 'targetId');
  const fieldId = requireField(event.fieldId);
  if (event.fieldOrdinal !== requireLfeaPreflightFieldOrdinal(fieldId)) {
    throw ledgerError('E_P06_REVIEW_EVENT_INVALID', 'Phase-1 review event field ordinal is stale.');
  }
  requireText(event.actor, 'actor');
  requireText(event.reason, 'reason');
  requireTimestamp(event.occurredAt, 'occurredAt');
}

function ledgerHash(value) {
  return semanticHash({
    schema: value.schema,
    datasetIdentity: value.datasetIdentity,
    reviewerPolicyId: value.reviewerPolicyId,
    events: value.events.map((event) => ({
      eventId: event.eventId,
      semanticHash: event.semanticHash,
    })),
  });
}

function requireField(value) {
  const fieldId = requireText(value, 'fieldId');
  if (!LFEA_PREFLIGHT_ENGINEERING_FIELDS.includes(fieldId)) {
    throw ledgerError('E_P06_FIELD_UNKNOWN', `Unknown Phase-1 review field: ${fieldId}`);
  }
  return fieldId;
}

function requireAction(value) {
  const action = String(value ?? '').trim().toUpperCase();
  if (!Object.values(LFEA_PREFLIGHT_REVIEW_ACTION).includes(action)) {
    throw ledgerError('E_P06_REVIEW_ACTION_INVALID', `Unknown Phase-1 review action: ${value}`);
  }
  return action;
}

function normalizeEvidence(value) {
  if (value === undefined || value === null) return Object.freeze({});
  requireRecord(value, 'evidence');
  return deepFreezeClone(value);
}

function normalizeJsonValue(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return Object.is(value, -0) ? 0 : value;
  if (Array.isArray(value) || (value && typeof value === 'object')) return deepFreezeClone(value);
  throw ledgerError('E_P06_REVIEW_VALUE_INVALID', 'Phase-1 review value must be canonical JSON data.');
}

function deepFreezeClone(value) {
  const clone = structuredClone(value);
  freezeRecursive(clone);
  return clone;
}

function freezeRecursive(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  if (Array.isArray(value)) value.forEach(freezeRecursive);
  else Object.values(value).forEach(freezeRecursive);
  return Object.freeze(value);
}

function requireTimestamp(value, field) {
  const text = requireText(value, field);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(text)) {
    throw ledgerError('E_P06_REVIEW_TIMESTAMP_INVALID', `${field} must be an explicit UTC ISO-8601 timestamp.`);
  }
  return text;
}

function nullableText(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  return String(value).trim();
}

function requireText(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw ledgerError('E_P06_REVIEW_FIELD_REQUIRED', `${field} must be a non-empty string.`);
  return text;
}

function requireRecord(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw ledgerError('E_P06_REVIEW_RECORD_REQUIRED', `${field} must be a record.`);
  }
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function ledgerError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_PREFLIGHT_PHASE1_REVIEW_LEDGER';
  return error;
}
