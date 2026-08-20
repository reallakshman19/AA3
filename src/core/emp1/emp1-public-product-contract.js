import {
  EMP1_B_SOURCE_CUSTODY_STATES,
  classifyEmp1BSourceCustody,
} from './emp1-a-to-b-refresh.js';
import { EMP1_C_BOUNDED_PRODUCTION_ROUTES } from './emp1-c-bounded-route-registry.js';

export const EMP1_PUBLIC_PRODUCT = Object.freeze({
  productId: 'EMP.1',
  label: 'Local Attachment Analytical Assessment',
  purpose: 'One analytical assessment: load/reference transfer, nominal section screening, then governed local correlation.',
});

export const EMP1_BACKING_STAGE_IDS = Object.freeze(['LAFEA.1', 'LAFEA.2']);

export const EMP1_LOCAL_CORRELATION_BLOCKERS = Object.freeze([
  'GLOBAL_EMP1_C_ROUTE_NOT_REGISTERED',
  'EMP1_C_WORKSPACE_EXECUTION_NOT_WIRED',
]);

export const EMP1_STEPS = Object.freeze([
  Object.freeze({ stepId: 'EMP.1.A', shortId: 'A', label: 'Load & reference', backingStageId: 'LAFEA.1', authority: 'LOAD_TRANSFER_AND_PRESSURE_BASELINE_ONLY' }),
  Object.freeze({ stepId: 'EMP.1.B', shortId: 'B', label: 'Section screening', backingStageId: 'LAFEA.2', authority: 'NOMINAL_PIPE_SECTION_SCREENING_ONLY' }),
  Object.freeze({ stepId: 'EMP.1.C', shortId: 'C', label: 'Local correlation', backingStageId: null, authority: 'BOUNDED_ROUTE_REGISTERED_GLOBAL_ROUTE_BLOCKED' }),
]);

export function isEmp1BackingStage(stageId) {
  return EMP1_BACKING_STAGE_IDS.includes(stageId);
}

export function emp1StepForBackingStage(stageId) {
  return EMP1_STEPS.find((step) => step.backingStageId === stageId) ?? null;
}

export function buildEmp1ProductProjection(state) {
  const stages = state?.stages ?? {};
  const aStage = stages['LAFEA.1'];
  const bStage = stages['LAFEA.2'];
  const a = projectExecutableStep(EMP1_STEPS[0], aStage);
  const bCustody = classifyEmp1BSourceCustody({
    aDocument: aStage?.document,
    aExecution: aStage?.execution,
    bDocument: bStage?.document,
  });
  const b = projectBStep(projectExecutableStep(EMP1_STEPS[1], bStage), bCustody);
  const c = Object.freeze({
    ...EMP1_STEPS[2],
    state: 'BOUNDED_ROUTE_AVAILABLE',
    documentLoaded: false,
    resultAvailable: false,
    runAuthorized: false,
    workspaceExecutionWired: false,
    boundedProductionRoutes: EMP1_C_BOUNDED_PRODUCTION_ROUTES,
    boundedRouteCount: EMP1_C_BOUNDED_PRODUCTION_ROUTES.length,
    blockers: EMP1_LOCAL_CORRELATION_BLOCKERS,
  });
  return Object.freeze({
    schema: 'emp1-product-projection/v1',
    product: EMP1_PUBLIC_PRODUCT,
    activeBackingStageId: isEmp1BackingStage(state?.activeStageId) ? state.activeStageId : null,
    activeStepId: emp1StepForBackingStage(state?.activeStageId)?.stepId ?? null,
    state: 'BOUNDED_LOCAL_CORRELATION_AVAILABLE',
    steps: Object.freeze([a, b, c]),
    custody: Object.freeze({
      bSourceEvidenceState: bCustody.state,
      automaticAToBSynchronization: false,
      governedAToBRefresh: true,
      canRefreshBFromCurrentA: bCustody.canRefresh,
      refreshBlockerCode: bCustody.blockerCode,
      userAction: custodyMessage(bCustody),
    }),
    qualificationBoundary: Object.freeze({
      emp1AProductionAuthority: 'RETAINED_EXISTING_ENGINE',
      emp1BProductionAuthority: 'RETAINED_EXISTING_ENGINE',
      emp1CProductionAuthority: 'BOUNDED_ROUTE_ONLY',
      emp1CWorkspaceExecutionWired: false,
      emp1CBoundedProductionRoutes: EMP1_C_BOUNDED_PRODUCTION_ROUTES,
      emp1CBoundedRouteCount: EMP1_C_BOUNDED_PRODUCTION_ROUTES.length,
      globalEmp1CRouteAuthority: false,
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

function projectBStep(step, custody) {
  if (!step.documentLoaded || custody.state === EMP1_B_SOURCE_CUSTODY_STATES.CURRENT) return step;
  const state = custody.state === EMP1_B_SOURCE_CUSTODY_STATES.A_NOT_QUALIFIED
    ? 'AWAITING_CURRENT_A'
    : custody.state === EMP1_B_SOURCE_CUSTODY_STATES.MISSING
      ? 'A_EVIDENCE_REQUIRED'
      : 'STALE_A_EVIDENCE';
  return Object.freeze({
    ...step,
    state,
    retainedResultAvailable: step.resultAvailable,
    resultAvailable: false,
    runAuthorized: false,
  });
}

function custodyMessage(custody) {
  if (custody.state === EMP1_B_SOURCE_CUSTODY_STATES.CURRENT) {
    return 'B is bound to the current qualified A model/result. Its retained snapshot of EMP.1.A foundation evidence is current. If A changes, refresh/re-import B evidence before relying on B. B-owned screening cases, factors and evaluation locations remain independently governed.';
  }
  if (custody.state === EMP1_B_SOURCE_CUSTODY_STATES.STALE_REFRESH_AVAILABLE) {
    return 'B retains different A evidence. Refresh B from current A before relying on the unified EMP.1 chain; B-owned screening inputs will be preserved.';
  }
  if (custody.state === EMP1_B_SOURCE_CUSTODY_STATES.STALE_REFRESH_BLOCKED) {
    return `B retains different A evidence, but refresh is blocked (${custody.blockerCode}). Resolve the incompatible B reference instead of substituting data.`;
  }
  if (custody.state === EMP1_B_SOURCE_CUSTODY_STATES.A_NOT_QUALIFIED) {
    return 'Run the current EMP.1.A source successfully before refreshing or relying on B as the next step in this EMP.1 assessment.';
  }
  return 'Load an EMP.1.B request that defines B-owned screening cases and evaluation locations; EMP.1 will not invent those inputs.';
}
