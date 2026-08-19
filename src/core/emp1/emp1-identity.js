export const EMP1_PRODUCT_ID = 'EMP.1';
export const EMP1_PRODUCT_LABEL = 'Local Attachment Analytical Assessment';

export const EMP1_COMPONENTS = Object.freeze({
  LOAD_TRANSFER: 'EMP.1.A',
  SECTION_SCREENING: 'EMP.1.B',
  LOCAL_CORRELATION: 'EMP.1.C',
  ASSESSMENT: 'EMP.1',
});

export const EMP1_SCHEMAS = Object.freeze({
  SOURCE: 'emp1-source/v1',
  LOAD_TRANSFER_RESULT: 'emp1-load-transfer-result/v1',
  SECTION_SCREENING_RESULT: 'emp1-section-screening-result/v1',
  LOCAL_CORRELATION_RESULT: 'emp1-local-correlation-result/v1',
  ASSESSMENT: 'emp1-assessment/v1',
  EVIDENCE_EXPORT: 'emp1-evidence-export/v1',
});

export const EMP1_DECISION_STATES = Object.freeze(['PASS', 'ESCALATE', 'BLOCKED']);

export const EMP1_AUTHORITY_BOUNDARY = Object.freeze({
  wrcEngineeringUseAuthorizedByScaffold: false,
  codeComplianceProduced: false,
  releaseQualified: false,
});

export function requireEmp1DecisionState(value) {
  if (!EMP1_DECISION_STATES.includes(value)) {
    throw new TypeError(`EMP1_DECISION_STATE_UNSUPPORTED:${value}`);
  }
  return value;
}
