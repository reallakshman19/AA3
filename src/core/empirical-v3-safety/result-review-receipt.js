import { semanticHash } from '../empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../shared-primitives/immutable.js';
import { requireEmpiricalV3CoupledCalculationEvidence } from './coupled-calculation-evidence.js';

export const EMPIRICAL_V3_RESULT_REVIEW_RECEIPT_SCHEMA = 'empirical-v3-result-review-receipt/v1';

/** One immutable review receipt for one exact calculation evidence artifact. */
export function createEmpiricalV3ResultReviewReceipt(input) {
  const evidence = requireEmpiricalV3CoupledCalculationEvidence(input?.evidence);
  const normalized = {
    schema: EMPIRICAL_V3_RESULT_REVIEW_RECEIPT_SCHEMA,
    runId: evidence.runId,
    evidenceRef: { evidenceId: evidence.evidenceId, semanticHash: evidence.semanticHash },
    authorizationRef: evidence.authorizationRef,
    disposition: 'REVIEWED_FOR_AUDIT',
    basisCode: requireText(input?.basisCode, 'basisCode'),
    basisParameters: normalizeJsonRecord(input?.basisParameters ?? {}, 'basisParameters'),
    auditMetadata: normalizeAuditMetadata(input?.auditMetadata),
  };
  const engineeringHash = semanticHash(resultReviewSemanticProjection(normalized));
  const receiptId = `result-review:${engineeringHash.slice('fnv1a64:'.length)}`;
  const evidenceHash = semanticHash({ engineeringHash, receiptId, auditMetadata: normalized.auditMetadata });
  return deepFreeze({ ...normalized, receiptId, semanticHash: engineeringHash, evidenceHash });
}

export function requireEmpiricalV3ResultReviewReceipt(value) {
  if (!value || value.schema !== EMPIRICAL_V3_RESULT_REVIEW_RECEIPT_SCHEMA) {
    throw new TypeError(`Expected schema ${EMPIRICAL_V3_RESULT_REVIEW_RECEIPT_SCHEMA}.`);
  }
  const normalized = {
    schema: value.schema,
    runId: requireText(value.runId, 'runId'),
    evidenceRef: normalizeEvidenceRef(value.evidenceRef),
    authorizationRef: normalizeAuthorizationRef(value.authorizationRef),
    disposition: requireDisposition(value.disposition),
    basisCode: requireText(value.basisCode, 'basisCode'),
    basisParameters: normalizeJsonRecord(value.basisParameters ?? {}, 'basisParameters'),
    auditMetadata: normalizeAuditMetadata(value.auditMetadata),
    receiptId: requireText(value.receiptId, 'receiptId'),
    semanticHash: requireText(value.semanticHash, 'semanticHash'),
    evidenceHash: requireText(value.evidenceHash, 'evidenceHash'),
  };
  const expectedHash = semanticHash(resultReviewSemanticProjection(normalized));
  const expectedId = `result-review:${expectedHash.slice('fnv1a64:'.length)}`;
  if (normalized.semanticHash !== expectedHash || normalized.receiptId !== expectedId) {
    throw new Error('Empirical V3 result review engineering identity mismatch.');
  }
  const expectedEvidenceHash = semanticHash({
    engineeringHash: expectedHash,
    receiptId: expectedId,
    auditMetadata: normalized.auditMetadata,
  });
  if (normalized.evidenceHash !== expectedEvidenceHash) throw new Error('Empirical V3 result review evidence hash mismatch.');
  return deepFreeze(normalized);
}

export function isEmpiricalV3ResultReviewCurrent(receiptValue, evidenceValue) {
  const receipt = requireEmpiricalV3ResultReviewReceipt(receiptValue);
  const evidence = requireEmpiricalV3CoupledCalculationEvidence(evidenceValue);
  return receipt.runId === evidence.runId
    && receipt.evidenceRef.evidenceId === evidence.evidenceId
    && receipt.evidenceRef.semanticHash === evidence.semanticHash
    && receipt.authorizationRef.semanticHash === evidence.authorizationRef.semanticHash;
}

export function requireCurrentEmpiricalV3ResultReview(receiptValue, evidenceValue) {
  const receipt = requireEmpiricalV3ResultReviewReceipt(receiptValue);
  const evidence = requireEmpiricalV3CoupledCalculationEvidence(evidenceValue);
  if (!isEmpiricalV3ResultReviewCurrent(receipt, evidence)) {
    throw new Error(`Result review ${receipt.receiptId} is stale for evidence ${evidence.evidenceId}.`);
  }
  return receipt;
}

export function resultReviewSemanticProjection(value) {
  return {
    schema: value.schema,
    runId: value.runId,
    evidenceRef: value.evidenceRef,
    authorizationRef: value.authorizationRef,
    disposition: value.disposition,
    basisCode: value.basisCode,
    basisParameters: value.basisParameters,
  };
}

function normalizeEvidenceRef(value) {
  if (!value || typeof value !== 'object') throw new TypeError('evidenceRef must be an object.');
  return { evidenceId: requireText(value.evidenceId, 'evidenceRef.evidenceId'), semanticHash: requireText(value.semanticHash, 'evidenceRef.semanticHash') };
}
function normalizeAuthorizationRef(value) {
  if (!value || typeof value !== 'object') throw new TypeError('authorizationRef must be an object.');
  return { authorizationId: requireText(value.authorizationId, 'authorizationRef.authorizationId'), semanticHash: requireText(value.semanticHash, 'authorizationRef.semanticHash') };
}
function normalizeAuditMetadata(value) {
  const record = value && typeof value === 'object' ? value : {};
  return { actor: optionalText(record.actor), timestamp: optionalText(record.timestamp), comment: optionalText(record.comment) };
}
function normalizeJsonRecord(value, fieldName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${fieldName} must be an object.`);
  const normalized = JSON.parse(JSON.stringify(value)); semanticHash(normalized); return normalized;
}
function requireDisposition(value) { if (value !== 'REVIEWED_FOR_AUDIT') throw new TypeError('Result review disposition is invalid.'); return value; }
function optionalText(value) { const text = String(value ?? '').trim(); return text || null; }
function requireText(value, fieldName) { const text = String(value ?? '').trim(); if (!text) throw new TypeError(`${fieldName} is required.`); return text; }
