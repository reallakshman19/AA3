export const EMP1_PROFESSIONAL_WORKFLOW_SCHEMA = 'emp1-professional-workflow/v1';

export const EMP1_PROFESSIONAL_WORKFLOW_STEPS = Object.freeze([
  Object.freeze({ stepId: 'BASIS_SOURCE', ordinal: 1, label: 'Basis & Source', backingStepIds: Object.freeze(['A', 'B', 'C']), preferredBackingStageId: 'LAFEA.1', targetRole: 'source' }),
  Object.freeze({ stepId: 'GEOMETRY', ordinal: 2, label: 'Geometry', backingStepIds: Object.freeze(['A', 'C']), preferredBackingStageId: null, targetRole: 'emp1-c-run-configuration' }),
  Object.freeze({ stepId: 'LOADS', ordinal: 3, label: 'Loads', backingStepIds: Object.freeze(['A']), preferredBackingStageId: 'LAFEA.1', targetRole: 'source' }),
  Object.freeze({ stepId: 'LOAD_TRANSFER', ordinal: 4, label: 'Load Transfer', backingStepIds: Object.freeze(['A']), preferredBackingStageId: 'LAFEA.1', targetRole: 'results' }),
  Object.freeze({ stepId: 'SECTION_SCREENING', ordinal: 5, label: 'Section Screening', backingStepIds: Object.freeze(['B']), preferredBackingStageId: 'LAFEA.2', targetRole: 'results' }),
  Object.freeze({ stepId: 'LOCAL_CORRELATION', ordinal: 6, label: 'Local Correlation', backingStepIds: Object.freeze(['C']), preferredBackingStageId: null, targetRole: 'emp1-c-run-configuration' }),
  Object.freeze({ stepId: 'REVIEW_EVIDENCE', ordinal: 7, label: 'Review & Evidence', backingStepIds: Object.freeze(['A', 'B', 'C']), preferredBackingStageId: null, targetRole: 'emp1-product-execution-summary' }),
]);

export function buildEmp1ProfessionalWorkflowPresentation(projection) {
  if (projection?.schema !== 'emp1-product-projection/v1') {
    throw new TypeError('EMP1_PROFESSIONAL_WORKFLOW_PROJECTION_INVALID');
  }
  const byShortId = Object.fromEntries((projection.steps ?? []).map((step) => [step.shortId, step]));
  const a = requireBacking(byShortId.A, 'A');
  const b = requireBacking(byShortId.B, 'B');
  const c = requireBacking(byShortId.C, 'C');
  const cLabel = c.currentnessBadge ?? c.state ?? 'UNRESOLVED';

  const statusByStep = Object.freeze({
    BASIS_SOURCE: sourceBasisStatus(a, b),
    GEOMETRY: cLabel,
    LOADS: a.state,
    LOAD_TRANSFER: a.state,
    SECTION_SCREENING: b.state,
    LOCAL_CORRELATION: cLabel,
    REVIEW_EVIDENCE: reviewEvidenceStatus(a, b, c),
  });

  return Object.freeze({
    schema: EMP1_PROFESSIONAL_WORKFLOW_SCHEMA,
    productId: projection.product?.productId ?? 'EMP.1',
    steps: Object.freeze(EMP1_PROFESSIONAL_WORKFLOW_STEPS.map((definition) => Object.freeze({
      ...definition,
      statusLabel: statusByStep[definition.stepId],
      canOpen: true,
      createsEngineeringAuthority: false,
      exposesNumericalResult: false,
    }))),
    backingCalculators: Object.freeze([
      backingDisclosure(a),
      backingDisclosure(b),
      backingDisclosure(c),
    ]),
    authorityBoundary: Object.freeze({
      presentationOnly: true,
      createsEngineeringAuthority: false,
      createsRouteAuthority: false,
      createsCodeCompliance: false,
      createsReleaseAuthority: false,
      staleNumericalResultMayBecomeCurrent: false,
    }),
  });
}

function sourceBasisStatus(a, b) {
  if (a.documentLoaded === false && b.documentLoaded === false) return 'SOURCE INPUT REQUIRED';
  if (a.documentLoaded === false || b.documentLoaded === false) return 'SOURCE BASIS PARTIAL';
  if (a.resultAvailable === true && b.resultAvailable === true) return 'SOURCE EVIDENCE RETAINED';
  return 'SOURCE LOADED';
}

function reviewEvidenceStatus(a, b, c) {
  if (c.resultAvailable === true) return 'CURRENT LOCAL RESULT';
  if (c.retainedResultAvailable === true) return 'HISTORICAL LOCAL RESULT / NOT REPORTABLE';
  if (b.resultAvailable === true) return 'SECTION SCREENING EVIDENCE ONLY';
  if (a.resultAvailable === true) return 'LOAD TRANSFER EVIDENCE ONLY';
  return 'NO RETAINED RESULT';
}

function backingDisclosure(step) {
  return Object.freeze({
    shortId: step.shortId,
    stepId: step.stepId,
    label: step.label,
    state: step.currentnessBadge ?? step.state,
    backingStageId: step.backingStageId ?? null,
    runAuthorized: step.runAuthorized === true,
  });
}

function requireBacking(step, shortId) {
  if (!step || step.shortId !== shortId) {
    throw new TypeError(`EMP1_PROFESSIONAL_WORKFLOW_BACKING_STEP_REQUIRED:${shortId}`);
  }
  return step;
}
