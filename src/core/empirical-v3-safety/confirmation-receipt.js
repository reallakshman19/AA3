import { semanticHash } from '../empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../shared-primitives/immutable.js';
import { requireEngineeringRiskFinding } from './risk-finding.js';

export const ENGINEERING_CONFIRMATION_RECEIPT_SCHEMA = 'engineering-confirmation-receipt/v1';

/**
 * Creates one governed confirmation receipt for exactly one HIGH_CONFIRM risk.
 * There is deliberately no array/bulk confirmation API.
 *
 * actor/timestamp/comment are audit metadata. They do not participate in the
 * deterministic engineering semantic hash, but they are sealed by evidenceHash.
 */
export function createEngineeringConfirmationReceipt(input) {
  const risk = requireEngineeringRiskFinding(input?.risk);
  if (risk.riskClass !== 'HIGH_CONFIRM') {
    throw new Error(`Only HIGH_CONFIRM risks are confirmable; received ${risk.riskClass}.`);
  }

  const normalized = {
    schema: ENGINEERING_CONFIRMATION_RECEIPT_SCHEMA,
    riskRef: {
      riskId: risk.riskId,
      riskCode: risk.riskCode,
      riskSemanticHash: risk.semanticHash,
    },
    basisCode: requireText(input?.basisCode, 'basisCode'),
    basisParameters: normalizeJsonRecord(input?.basisParameters ?? {}, 'basisParameters'),
    authorityRefs: normalizeRefs(input?.authorityRefs ?? [], 'authorityRefs'),
    auditMetadata: normalizeAuditMetadata(input?.auditMetadata),
  };
  const engineeringHash = semanticHash(confirmationSemanticProjection(normalized));
  const receiptId = `confirmation:${engineeringHash.slice('fnv1a64:'.length)}`;
  const evidenceHash = semanticHash({
    engineeringHash,
    receiptId,
    auditMetadata: normalized.auditMetadata,
  });

  return deepFreeze({
    ...normalized,
    receiptId,
    semanticHash: engineeringHash,
    evidenceHash,
  });
}

export function requireEngineeringConfirmationReceipt(value) {
  if (!value || typeof value !== 'object') throw new TypeError('Confirmation receipt must be an object.');
  if (value.schema !== ENGINEERING_CONFIRMATION_RECEIPT_SCHEMA) {
    throw new TypeError(`Expected schema ${ENGINEERING_CONFIRMATION_RECEIPT_SCHEMA}.`);
  }
  const normalized = {
    schema: value.schema,
    riskRef: normalizeRiskRef(value.riskRef),
    basisCode: requireText(value.basisCode, 'basisCode'),
    basisParameters: normalizeJsonRecord(value.basisParameters ?? {}, 'basisParameters'),
    authorityRefs: normalizeRefs(value.authorityRefs ?? [], 'authorityRefs'),
    auditMetadata: normalizeAuditMetadata(value.auditMetadata),
    receiptId: requireText(value.receiptId, 'receiptId'),
    semanticHash: requireText(value.semanticHash, 'semanticHash'),
    evidenceHash: requireText(value.evidenceHash, 'evidenceHash'),
  };
  const expectedSemanticHash = semanticHash(confirmationSemanticProjection(normalized));
  const expectedReceiptId = `confirmation:${expectedSemanticHash.slice('fnv1a64:'.length)}`;
  if (normalized.semanticHash !== expectedSemanticHash || normalized.receiptId !== expectedReceiptId) {
    throw new Error('Confirmation receipt engineering identity mismatch.');
  }
  const expectedEvidenceHash = semanticHash({
    engineeringHash: expectedSemanticHash,
    receiptId: expectedReceiptId,
    auditMetadata: normalized.auditMetadata,
  });
  if (normalized.evidenceHash !== expectedEvidenceHash) {
    throw new Error('Confirmation receipt evidence hash mismatch.');
  }
  return deepFreeze(normalized);
}

export function confirmationSemanticProjection(value) {
  return {
    schema: value.schema,
    riskRef: value.riskRef,
    basisCode: value.basisCode,
    basisParameters: value.basisParameters,
    authorityRefs: value.authorityRefs,
  };
}

export function isEngineeringConfirmationCurrent(receiptValue, riskValue) {
  const receipt = requireEngineeringConfirmationReceipt(receiptValue);
  const risk = requireEngineeringRiskFinding(riskValue);
  return risk.riskClass === 'HIGH_CONFIRM'
    && receipt.riskRef.riskId === risk.riskId
    && receipt.riskRef.riskSemanticHash === risk.semanticHash;
}

export function requireCurrentEngineeringConfirmation(receiptValue, riskValue) {
  const receipt = requireEngineeringConfirmationReceipt(receiptValue);
  const risk = requireEngineeringRiskFinding(riskValue);
  if (!isEngineeringConfirmationCurrent(receipt, risk)) {
    throw new Error(`Confirmation ${receipt.receiptId} is stale for risk ${risk.riskId}.`);
  }
  return receipt;
}

function normalizeRiskRef(value) {
  if (!value || typeof value !== 'object') throw new TypeError('riskRef must be an object.');
  return {
    riskId: requireText(value.riskId, 'riskRef.riskId'),
    riskCode: requireText(value.riskCode, 'riskRef.riskCode'),
    riskSemanticHash: requireText(value.riskSemanticHash, 'riskRef.riskSemanticHash'),
  };
}

function normalizeAuditMetadata(value) {
  const record = value && typeof value === 'object' ? value : {};
  return {
    actor: optionalText(record.actor),
    timestamp: optionalText(record.timestamp),
    comment: optionalText(record.comment),
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

function normalizeJsonRecord(value, fieldName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an object.`);
  }
  const normalized = JSON.parse(JSON.stringify(value));
  semanticHash(normalized);
  return normalized;
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
