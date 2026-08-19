export const EMP1_PUBLIC_PRODUCT = Object.freeze({
  productId: 'EMP.1',
  label: 'Local Attachment Analytical Assessment',
  purpose: 'One analytical assessment: load/reference transfer, nominal section screening, then governed local correlation.',
});

export const EMP1_BACKING_STAGE_IDS = Object.freeze(['LAFEA.1', 'LAFEA.2']);

export const EMP1_LOCAL_CORRELATION_BLOCKERS = Object.freeze([
  'WRC_DATASET_NOT_READY',
  'WRC_NUMERICAL_COEFFICIENTS_MISSING',
  'WRC_SIGN_ARBITRATION_OPEN',
  'CAUX_PP24_31_NOT_FROZEN',
]);

export const EMP1_STEPS = Object.freeze([
  Object.freeze({ stepId: 'EMP.1.A', shortId: 'A', label: 'Load & reference', backingStageId: 'LAFEA.1', authority: 'LOAD_TRANSFER_AND_PRESSURE_BASELINE_ONLY' }),
  Object.freeze({ stepId: 'EMP.1.B', shortId: 'B', label: 'Section screening', backingStageId: 'LAFEA.2', authority: 'NOMINAL_PIPE_SECTION_SCREENING_ONLY' }),
  Object.freeze({ stepId: 'EMP.1.C', shortId: 'C', label: 'Local correlation', backingStageId: null, authority: 'BLOCKED_PENDING_WRC_AND_CAUX_QUALIFICATION' }),
]);

export function isEmp1BackingStage(stageId) {
  return EMP1_BACKING_STAGE_IDS.includes(stageId);
}

export function emp1StepForBackingStage(stageId) {
  return EMP1_STEPS.find((step) => step.backingStageId === stageId) ?? null;
}

export function buildEmp1ProductProjection(state) {
  const stages = state?.stages ?? {};
  const a = projectExecutableStep(EMP1_STEPS[0], stages['LAFEA.1']);
  const b = projectExecutableStep(EMP1_STEPS[1], stages['LAFEA.2']);
  const c = Object.freeze({
    ...EMP1_STEPS[2],
    state: 'BLOCKED',
    documentLoaded: false,
    resultAvailable: false,
    runAuthorized: false,
    blockers: EMP1_LOCAL_CORRELATION_BLOCKERS,
  });
  const bSourceEvidenceState = stages['LAFEA.2']?.document?.sourceEvidence?.foundationResult
    ? 'RETAINED_A_EVIDENCE_SNAPSHOT'
    : 'MISSING_A_EVIDENCE_SNAPSHOT';
  return Object.freeze({
    schema: 'emp1-product-projection/v1',
    product: EMP1_PUBLIC_PRODUCT,
    activeBackingStageId: isEmp1BackingStage(state?.activeStageId) ? state.activeStageId : null,
    activeStepId: emp1StepForBackingStage(state?.activeStageId)?.stepId ?? null,
    state: 'BLOCKED_LOCAL_CORRELATION',
    steps: Object.freeze([a, b, c]),
    custody: Object.freeze({
      bSourceEvidenceState,
      automaticAToBSynchronization: false,
      userAction: bSourceEvidenceState === 'RETAINED_A_EVIDENCE_SNAPSHOT'
        ? 'B is based on retained A evidence. If A changes, refresh/re-import B evidence before relying on B.'
        : 'Load or create B from a source-qualified A evidence package before relying on B.',
    }),
    qualificationBoundary: Object.freeze({
      emp1AProductionAuthority: 'RETAINED_EXISTING_ENGINE',
      emp1BProductionAuthority: 'RETAINED_EXISTING_ENGINE',
      emp1CProductionAuthority: 'NOT_AUTHORIZED',
      passIsCodeCompliance: false,
      releaseQualified: false,
    }),
  });
}

function projectExecutableStep(definition, stage) {
  const documentLoaded = Boolean(stage?.document);
  const resultAvailable = Boolean(stage?.execution);
  const runAuthorized = stage?.orchestration?.sections?.AUTHORIZATION?.state === 'READY';
  return Object.freeze({
    ...definition,
    state: resultAvailable ? 'CALCULATED' : documentLoaded ? (runAuthorized ? 'READY_TO_RUN' : 'SOURCE_LOADED') : 'INPUT_REQUIRED',
    documentLoaded,
    resultAvailable,
    runAuthorized,
    blockers: Object.freeze([]),
  });
}
