import { semanticHash } from '../empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../shared-primitives/immutable.js';
import { requireEmpiricalV3CoupledCalculationEvidence } from './coupled-calculation-evidence.js';
import { requireCurrentEmpiricalV3ResultReview } from './result-review-receipt.js';

export const EMPIRICAL_V3_AUDIT_READINESS_SCHEMA = 'empirical-v3-audit-readiness/v1';

export function sealEmpiricalV3AuditReadiness(input) {
  const evidence = requireEmpiricalV3CoupledCalculationEvidence(input?.evidence);
  const resultReview = requireCurrentEmpiricalV3ResultReview(input?.resultReview, evidence);
  const material = {
    schema: EMPIRICAL_V3_AUDIT_READINESS_SCHEMA,
    runId: evidence.runId,
    evidenceRef: { evidenceId: evidence.evidenceId, semanticHash: evidence.semanticHash },
    resultReviewRef: {
      receiptId: resultReview.receiptId,
      semanticHash: resultReview.semanticHash,
      evidenceHash: resultReview.evidenceHash,
    },
  };
  const hash = semanticHash(material);
  return deepFreeze({
    ...material,
    readinessId: `audit-ready:${hash.slice('fnv1a64:'.length)}`,
    semanticHash: hash,
  });
}

export function requireEmpiricalV3AuditReadiness(value, context = {}) {
  if (!value || value.schema !== EMPIRICAL_V3_AUDIT_READINESS_SCHEMA) {
    throw new TypeError(`Expected schema ${EMPIRICAL_V3_AUDIT_READINESS_SCHEMA}.`);
  }
  const material = {
    schema: value.schema,
    runId: requireText(value.runId, 'runId'),
    evidenceRef: normalizeEvidenceRef(value.evidenceRef),
    resultReviewRef: normalizeReviewRef(value.resultReviewRef),
  };
  const expectedHash = semanticHash(material);
  const expectedId = `audit-ready:${expectedHash.slice('fnv1a64:'.length)}`;
  if (value.semanticHash !== expectedHash || value.readinessId !== expectedId) {
    throw new Error('Empirical V3 audit readiness identity mismatch.');
  }
  if (context.evidence) {
    const evidence = requireEmpiricalV3CoupledCalculationEvidence(context.evidence);
    if (material.runId !== evidence.runId
        || material.evidenceRef.evidenceId !== evidence.evidenceId
        || material.evidenceRef.semanticHash !== evidence.semanticHash) {
      throw new Error('Empirical V3 audit readiness is stale for calculation evidence.');
    }
  }
  if (context.resultReview) {
    const review = requireCurrentEmpiricalV3ResultReview(context.resultReview, context.evidence);
    if (material.resultReviewRef.receiptId !== review.receiptId
        || material.resultReviewRef.semanticHash !== review.semanticHash
        || material.resultReviewRef.evidenceHash !== review.evidenceHash) {
      throw new Error('Empirical V3 audit readiness is stale for result review.');
    }
  }
  return deepFreeze({ ...material, readinessId: expectedId, semanticHash: expectedHash });
}

function normalizeEvidenceRef(value) {
  if (!value || typeof value !== 'object') throw new TypeError('evidenceRef must be an object.');
  return { evidenceId: requireText(value.evidenceId, 'evidenceRef.evidenceId'), semanticHash: requireText(value.semanticHash, 'evidenceRef.semanticHash') };
}
function normalizeReviewRef(value) {
  if (!value || typeof value !== 'object') throw new TypeError('resultReviewRef must be an object.');
  return {
    receiptId: requireText(value.receiptId, 'resultReviewRef.receiptId'),
    semanticHash: requireText(value.semanticHash, 'resultReviewRef.semanticHash'),
    evidenceHash: requireText(value.evidenceHash, 'resultReviewRef.evidenceHash'),
  };
}
function requireText(value, fieldName) { const text = String(value ?? '').trim(); if (!text) throw new TypeError(`${fieldName} is required.`); return text; }
