import { semanticHash } from '../empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../shared-primitives/immutable.js';
import { requireEmpiricalV3AuditReadiness } from './audit-readiness.js';
import { requireEmpiricalV3CoupledCalculationEvidence } from './coupled-calculation-evidence.js';
import { requireCurrentEmpiricalV3ResultReview } from './result-review-receipt.js';

export const EMPIRICAL_V3_AUDIT_EXPORT_SCHEMA = 'empirical-v3-audit-export/v1';

/** JSON audit serializes sealed evidence only after current result review/readiness. */
export function createEmpiricalV3AuditJsonExport(input) {
  const evidence = requireEmpiricalV3CoupledCalculationEvidence(input?.evidence);
  const resultReview = requireCurrentEmpiricalV3ResultReview(input?.resultReview, evidence);
  const readiness = requireEmpiricalV3AuditReadiness(input?.auditReadiness, {
    evidence,
    resultReview,
  });
  const payload = {
    schema: EMPIRICAL_V3_AUDIT_EXPORT_SCHEMA,
    runId: evidence.runId,
    evidenceId: evidence.evidenceId,
    evidenceSemanticHash: evidence.semanticHash,
    resultReviewRef: {
      receiptId: resultReview.receiptId,
      semanticHash: resultReview.semanticHash,
      evidenceHash: resultReview.evidenceHash,
    },
    auditReadinessRef: {
      readinessId: readiness.readinessId,
      semanticHash: readiness.semanticHash,
    },
    calculationEvidence: evidence,
  };
  const exportSemanticHash = semanticHash(payload);
  return deepFreeze({
    schema: EMPIRICAL_V3_AUDIT_EXPORT_SCHEMA,
    fileName: `empirical-v3-${safeName(evidence.runId)}-${safeName(evidence.evidenceId)}.json`,
    mimeType: 'application/json',
    exportSemanticHash,
    text: JSON.stringify({ ...payload, exportSemanticHash }, null, 2),
  });
}

function safeName(value) {
  return String(value).replace(/[^A-Za-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '') || 'record';
}
