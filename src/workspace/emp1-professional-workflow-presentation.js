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

const B_SOURCE_STALE_STATES = new Set([
  'AWAITING_CURRENT_A',
  'A_EVIDENCE_REQUIRED',
  'STALE_A_EVIDENCE',
]);

export function buildEmp1ProfessionalWorkflowPresentation(projection) {
  if (projection?.schema !== 'emp1-product-projection/v1') {
    throw new TypeError('EMP1_PROFESSIONAL_WORKFLOW_PROJECTION_INVALID');
  }
  const byShortId = Object.fromEntries((projection.steps ?? []).map((step) => [step.shortId, step]));
  const a = requireBacking(byShortId.A, 'A');
  const b = requireBacking(byShortId.B, 'B');
  const c = requireBacking(byShortId.C, 'C');
  const authoritySummary = buildAuthoritySummary(projection, a, b, c);

  const statusByStep = Object.freeze({
    BASIS_SOURCE: authoritySummary.sourceCurrentness,
    GEOMETRY: geometryStatus(c, authoritySummary.sourceCurrentness),
    LOADS: authoritySummary.sourceCurrentness,
    LOAD_TRANSFER: authoritySummary.transferCurrentness,
    SECTION_SCREENING: authoritySummary.screeningCurrentness,
    LOCAL_CORRELATION: `${authoritySummary.localMethod} · ${authoritySummary.localResult}`,
    REVIEW_EVIDENCE: `${authoritySummary.localResult} · ${authoritySummary.releaseProfile}`,
  });

  return Object.freeze({
    schema: EMP1_PROFESSIONAL_WORKFLOW_SCHEMA,
    productId: projection.product?.productId ?? 'EMP.1',
    authoritySummary,
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

function buildAuthoritySummary(projection, a, b, c) {
  return Object.freeze({
    sourceCurrentness: sourceCurrentness(a, b),
    transferCurrentness: transferCurrentness(a),
    screeningCurrentness: screeningCurrentness(b),
    localMethod: c.runAuthorized === true ? 'LOCAL METHOD QUALIFIED' : 'LOCAL METHOD BLOCKED',
    localResult: localResultCurrentness(c),
    releaseProfile: projection.qualificationBoundary?.releaseQualified === true
      ? 'RELEASE PROFILE QUALIFIED'
      : 'RELEASE PROFILE NOT QUALIFIED',
    codeCompliance: 'CODE COMPLIANCE NOT ASSESSED',
  });
}

function sourceCurrentness(a, b) {
  if (a.documentLoaded === false && b.documentLoaded === false) return 'SOURCE INPUT REQUIRED';
  if (a.documentLoaded === false || b.documentLoaded === false) return 'SOURCE INCOMPLETE';
  if (B_SOURCE_STALE_STATES.has(b.state)) return 'SOURCE STALE';
  return 'SOURCE CURRENT';
}

function transferCurrentness(a) {
  if (a.resultAvailable === true) return 'TRANSFER CURRENT';
  if (a.documentLoaded === false) return 'TRANSFER INPUT REQUIRED';
  return 'TRANSFER NOT CALCULATED';
}

function screeningCurrentness(b) {
  if (b.resultAvailable === true) return 'SCREENING CURRENT';
  if (b.retainedResultAvailable === true || B_SOURCE_STALE_STATES.has(b.state)) return 'SCREENING STALE';
  if (b.documentLoaded === false) return 'SCREENING INPUT REQUIRED';
  return 'SCREENING NOT CALCULATED';
}

function localResultCurrentness(c) {
  if (c.resultAvailable === true) return 'LOCAL RESULT CURRENT';
  if (c.retainedResultAvailable === true) return 'LOCAL RESULT STALE';
  return 'LOCAL RESULT NOT CALCULATED';
}

function geometryStatus(c, sourceStatus) {
  if (c.state === 'SOURCE_INCOMPLETE') return 'SOURCE INCOMPLETE';
  return sourceStatus;
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
