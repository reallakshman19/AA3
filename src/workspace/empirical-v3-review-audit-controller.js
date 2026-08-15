import {
  createEmpiricalV3AuditJsonExport,
  createEmpiricalV3ResultReviewReceipt,
  requireCurrentEmpiricalV3ResultReview,
  requireEmpiricalV3AuditReadiness,
  sealEmpiricalV3AuditReadiness,
} from '../core/empirical-v3-safety/index.js';

export class EmpiricalV3ReviewAuditController {
  constructor(options = {}) {
    this.options = options;
    this.resultReview = null;
    this.auditReadiness = null;
  }

  clear() {
    this.resultReview = null;
    this.auditReadiness = null;
  }

  invalidateForEvidence(evidence) {
    if (!evidence || !this.resultReview) return this.clear();
    try {
      requireCurrentEmpiricalV3ResultReview(this.resultReview, evidence);
      if (this.auditReadiness) {
        requireEmpiricalV3AuditReadiness(this.auditReadiness, {
          evidence,
          resultReview: this.resultReview,
        });
      }
    } catch {
      this.clear();
    }
  }

  review(evidence, review = {}) {
    const actor = requiredText(review.actor, 'Reviewer');
    const comment = requiredText(review.comment, 'Review conclusion / comment');
    const receipt = createEmpiricalV3ResultReviewReceipt({
      evidence,
      basisCode: 'ENGINEER_REVIEWED_SEALED_COUPLED_RESULT',
      basisParameters: {
        evidenceSemanticHash: evidence.semanticHash,
        compatibilityResidualM: evidence.coupledSystem.compatibility.maximumResidualM,
        energyRelativeResidual: evidence.coupledSystem.energy.relativeResidual,
      },
      auditMetadata: { actor, timestamp: new Date().toISOString(), comment },
    });
    this.resultReview = receipt;
    this.auditReadiness = null;
    return {
      receipt,
      nextPackage: this.options.onResultReviewCreated?.(receipt) ?? null,
    };
  }

  prepareAudit(evidence) {
    if (!this.resultReview) throw new Error('Current result review is required before audit readiness.');
    const resultReview = requireCurrentEmpiricalV3ResultReview(this.resultReview, evidence);
    const readiness = sealEmpiricalV3AuditReadiness({ evidence, resultReview });
    this.auditReadiness = readiness;
    return {
      readiness,
      nextPackage: this.options.onAuditReadinessCreated?.(readiness, resultReview) ?? null,
    };
  }

  loadResultReview(value, evidence) {
    this.resultReview = requireCurrentEmpiricalV3ResultReview(value, evidence);
    this.auditReadiness = null;
    return this.resultReview;
  }

  loadAuditReadiness(value, evidence) {
    if (!this.resultReview) throw new Error('Current result review is required before audit readiness.');
    this.auditReadiness = requireEmpiricalV3AuditReadiness(value, {
      evidence,
      resultReview: this.resultReview,
    });
    return this.auditReadiness;
  }

  canExport(workflowState, evidence) {
    if (workflowState !== 'AUDIT_EXPORT_READY' || !evidence || !this.resultReview || !this.auditReadiness) return false;
    try {
      requireCurrentEmpiricalV3ResultReview(this.resultReview, evidence);
      requireEmpiricalV3AuditReadiness(this.auditReadiness, { evidence, resultReview: this.resultReview });
      return true;
    } catch {
      return false;
    }
  }

  createAuditExport(workflowState, evidence, safetyPackage) {
    if (!this.canExport(workflowState, evidence)) {
      throw new Error('Audit export requires AUDIT_EXPORT_READY workflow, current result review, and current audit readiness.');
    }
    return createEmpiricalV3AuditJsonExport({
      safetyPackage,
      evidence,
      resultReview: this.resultReview,
      auditReadiness: this.auditReadiness,
    });
  }
}

function requiredText(value, fieldName) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${fieldName} is required.`);
  return text;
}
