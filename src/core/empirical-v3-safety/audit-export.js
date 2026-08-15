import { semanticHash } from '../empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../shared-primitives/immutable.js';
import { requireEmpiricalV3AuditReadiness } from './audit-readiness.js';
import { requireEmpiricalV3CoupledCalculationEvidence } from './coupled-calculation-evidence.js';
import { requireEmpiricalV3SafetyPresentationPackage } from './presentation-package.js';
import { requireCurrentEmpiricalV3ResultReview } from './result-review-receipt.js';

export const EMPIRICAL_V3_AUDIT_EXPORT_SCHEMA = 'empirical-v3-audit-export/v1';

/** JSON audit serializes the same sealed package/evidence only after governed review/readiness. */
export function createEmpiricalV3AuditJsonExport(input) {
  const packageValue = requireEmpiricalV3SafetyPresentationPackage(input?.safetyPackage);
  const evidence = requireEmpiricalV3CoupledCalculationEvidence(input?.evidence);
  const resultReview = requireCurrentEmpiricalV3ResultReview(input?.resultReview, evidence);
  const readiness = requireEmpiricalV3AuditReadiness(input?.auditReadiness, {
    evidence,
    resultReview,
  });
  if (packageValue.workflow.state !== 'AUDIT_EXPORT_READY') {
    throw new Error('Empirical V3 audit export requires AUDIT_EXPORT_READY workflow.');
  }
  if (packageValue.runId !== evidence.runId
      || !packageValue.calculationAuthorization
      || packageValue.calculationAuthorization.semanticHash !== evidence.authorizationRef.semanticHash) {
    throw new Error('Empirical V3 audit package/evidence authorization identity mismatch.');
  }
  requirePackageRecord(packageValue, 'CALCULATION_EVIDENCE', evidence.evidenceId, evidence.semanticHash);
  requirePackageRecord(packageValue, 'RESULT_REVIEW', resultReview.receiptId, resultReview.semanticHash);
  requirePackageRecord(packageValue, 'AUDIT_READINESS', readiness.readinessId, readiness.semanticHash);

  const payload = {
    schema: EMPIRICAL_V3_AUDIT_EXPORT_SCHEMA,
    runId: evidence.runId,
    safetyPackageRef: {
      semanticHash: packageValue.semanticHash,
      workflowState: packageValue.workflow.state,
    },
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
    governedSafetyPackage: packageValue,
    resultReview,
    auditReadiness: readiness,
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

function requirePackageRecord(packageValue, kind, ref, semanticHashValue) {
  const row = packageValue.records.find((entry) => (
    entry.kind === kind && entry.ref === ref && entry.semanticHash === semanticHashValue
  ));
  if (!row) throw new Error(`Empirical V3 audit package is missing current ${kind} record ${ref}.`);
  return row;
}
function safeName(value) {
  return String(value).replace(/[^A-Za-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '') || 'record';
}
