/** Pure UI projection of the canonical LAFEA workbench orchestration state. */
import {
  LAFEA_WORKBENCH_ORCHESTRATION_SCHEMA,
  LAFEA_WORKBENCH_ORCHESTRATION_STATES,
} from './lafea-workbench-orchestration-projection.js';
import { requireLafeaStageAnalysisAdapter } from './lafea-stage-analysis-adapter.js';

export const LAFEA_GUIDED_WORKFLOW_SCHEMA = 'lafea-guided-workflow/v1';
export const LAFEA_GUIDED_STEP_STATUSES = Object.freeze([
  'NOT_STARTED', 'READY', 'WARNING', 'BLOCKED', 'COMPLETE',
]);

const STEP_DEFINITIONS = Object.freeze([
  ['SOURCE_IDENTITY', 'Source and model identity'],
  ['MODEL_DIAGNOSTICS', 'Model diagnostics'],
  ['ANALYSIS_PROFILE', 'Analysis profile'],
  ['MATERIALS_SECTIONS', 'Materials and sections'],
  ['RESTRAINTS_BCS', 'Restraints and boundary conditions'],
  ['LOADS_CASES', 'Loads and physical cases'],
  ['DISCRETIZATION', 'Discretization / analysis mesh'],
  ['NUMERICAL_PREFLIGHT', 'Numerical preflight'],
  ['AUTHORIZATION', 'Authorization'],
  ['RUN', 'Run'],
  ['CONVERGENCE', 'Convergence'],
  ['RESULTS_EVIDENCE', 'Results and evidence'],
]);

const INPUT_CAPABILITY_BY_STEP = Object.freeze({
  MATERIALS_SECTIONS: 'materials',
  RESTRAINTS_BCS: 'restraints',
  LOADS_CASES: 'loads',
});

export function buildLafeaGuidedWorkflow(stateValue) {
  const state = requireState(stateValue);
  const stage = state.stages[state.activeStageId];
  const orchestration = requireOrchestration(stage);
  const adapter = requireLafeaStageAnalysisAdapter(stage.stageId);
  const executionSupported = adapter.execution.qualifiedRouteRegistered;
  const steps = STEP_DEFINITIONS.map(([stepId, label]) => {
    const projected = stepStatus(
      stepId,
      stage,
      orchestration,
      adapter,
      executionSupported,
    );
    return freeze({
      stepId,
      label,
      status: projected.status,
      reasons: projected.reasons,
      focusTarget: focusTarget(stepId),
    });
  });
  const authorization = section(orchestration, 'AUTHORIZATION');
  const release = section(orchestration, 'RELEASE');
  return freeze({
    schema: LAFEA_GUIDED_WORKFLOW_SCHEMA,
    stageId: stage.stageId,
    stageAdapterId: orchestration.stageAdapterId,
    analysisRouteFamily: adapter.routeFamily,
    meshApplicable: adapter.discretization.applicable,
    executionSupported,
    canonicalOrchestrationSchema: orchestration.schema,
    steps,
    activeBlockingStepId: steps.find((step) => step.status === 'BLOCKED')?.stepId ?? null,
    runEligibleByCurrentUiGate: executionSupported
      && Boolean(stage.document)
      && authorization.state === 'READY',
    executionBoundary: {
      mode: 'SYNCHRONOUS_RETAINED_STAGE_EXECUTION',
      progressProtocol: 'NOT_AVAILABLE',
      cancellationSupported: false,
      resultEvidenceStatus: stage.execution?.status ?? 'CALCULATION_NOT_RUN',
    },
    releaseQualified: release.state === 'COMPLETE',
  });
}

function stepStatus(stepId, stage, orchestration, adapter, executionSupported) {
  const documentReady = Boolean(stage.document);
  if (stepId === 'SOURCE_IDENTITY') {
    return combineSections(section(orchestration, 'SOURCE'), section(orchestration, 'MODEL'));
  }
  if (stepId === 'MODEL_DIAGNOSTICS' || stepId === 'NUMERICAL_PREFLIGHT') {
    return fromSection(section(orchestration, 'PREPARATION'));
  }
  if (stepId === 'ANALYSIS_PROFILE') {
    return analysisProfileStatus(stage, documentReady);
  }
  if (INPUT_CAPABILITY_BY_STEP[stepId]) {
    return governedInputStepStatus(stepId, stage, adapter, documentReady);
  }
  if (stepId === 'DISCRETIZATION') {
    return fromSection(section(orchestration, 'DISCRETIZATION'));
  }
  if (stepId === 'AUTHORIZATION') {
    return fromSection(section(orchestration, 'AUTHORIZATION'));
  }
  if (stepId === 'RUN') {
    const authorization = section(orchestration, 'AUTHORIZATION');
    const execution = section(orchestration, 'EXECUTION');
    if (!executionSupported) return status('BLOCKED', ['UNSUPPORTED_STAGE_ENGINE_NOT_IMPLEMENTED']);
    if (!documentReady) return status('NOT_STARTED', ['SOURCE_DOCUMENT_REQUIRED']);
    if (stage.execution?.status === 'QUALIFIED') return status('COMPLETE');
    if (authorization.state !== 'READY') return status('BLOCKED', authorization.reasons);
    if (execution.state === 'BLOCKED') return status('BLOCKED', execution.reasons);
    return status('READY', execution.reasons);
  }
  if (stepId === 'CONVERGENCE') {
    return convergenceStepStatus(stage, executionSupported);
  }
  if (stepId === 'RESULTS_EVIDENCE') {
    return fromSection(section(orchestration, 'RESULTS'));
  }
  return status('NOT_STARTED');
}

function convergenceStepStatus(stage, executionSupported) {
  if (stage.stageId !== 'LAFEA.3' || stage.domainFirstProfileActive !== true) {
    return status('COMPLETE', ['WORKFLOW_STEP_NOT_APPLICABLE']);
  }
  if (!executionSupported) return status('BLOCKED', ['UNSUPPORTED_STAGE_ENGINE_NOT_IMPLEMENTED']);
  if (stage.execution?.status !== 'QUALIFIED') return status('NOT_STARTED', ['EXECUTION_REQUIRED']);
  const convergence = stage.continuumConvergenceProjection;
  if (!convergence || convergence.state === 'ABSENT') {
    return status('READY', convergence?.reasons ?? ['CONVERGENCE_STUDY_REQUIRED']);
  }
  if (convergence.state === 'CURRENT_PASS') return status('COMPLETE', convergence.reasons);
  if (['CURRENT_BLOCK', 'FAILED', 'STALE'].includes(convergence.state)) {
    return status('BLOCKED', convergence.reasons);
  }
  return status('BLOCKED', ['CONVERGENCE_STATE_INVALID']);
}

function analysisProfileStatus(stage, documentReady) {
  if (!documentReady) return status('NOT_STARTED', ['SOURCE_DOCUMENT_REQUIRED']);
  if (!stage.lifecycle) return status('BLOCKED', ['LIFECYCLE_NOT_INITIALIZED']);
  if (stage.lifecycleBinding?.status !== 'CURRENT') {
    return status('BLOCKED', [
      `LIFECYCLE_SOURCE_BINDING_${stage.lifecycleBinding?.status ?? 'UNKNOWN'}`,
    ]);
  }
  if (typeof stage.lifecycle.profileId !== 'string' || !stage.lifecycle.profileId) {
    return status('BLOCKED', ['ANALYSIS_PROFILE_BINDING_REQUIRED']);
  }
  return status('COMPLETE');
}

function governedInputStepStatus(stepId, stage, adapter, documentReady) {
  if (!documentReady) return status('NOT_STARTED', ['SOURCE_DOCUMENT_REQUIRED']);
  const capabilityId = INPUT_CAPABILITY_BY_STEP[stepId];
  const requirementValue = adapter.input.requirements?.[capabilityId];
  if (requirementValue === null) {
    return status('COMPLETE', ['WORKFLOW_STEP_NOT_APPLICABLE']);
  }
  if (!requirementValue) {
    return status('BLOCKED', ['WORKFLOW_INPUT_CONTRACT_NOT_DECLARED']);
  }
  const missing = requirementValue.paths.filter(
    (path) => !hasNonEmptyCollection(stage.document, path),
  );
  return missing.length
    ? status('BLOCKED', [requirementValue.missingReason])
    : status('READY');
}

function hasNonEmptyCollection(documentValue, path) {
  const value = path.split('.').reduce(
    (current, key) => current && typeof current === 'object' ? current[key] : undefined,
    documentValue,
  );
  return Array.isArray(value) && value.length > 0;
}

function combineSections(...sections) {
  const states = sections.map((value) => value.state);
  const reasons = sections.flatMap((value) => value.state === 'COMPLETE' ? [] : value.reasons);
  if (states.includes('BLOCKED')) return status('BLOCKED', reasons);
  if (states.includes('WARNING')) return status('WARNING', reasons);
  if (states.includes('NOT_STARTED')) return status('NOT_STARTED', reasons);
  if (states.includes('READY')) return status('READY', reasons);
  return status('COMPLETE', reasons);
}

function fromSection(value) { return status(value.state, value.reasons); }
function section(orchestration, sectionId) {
  const value = orchestration.sections?.[sectionId];
  if (!value || !LAFEA_WORKBENCH_ORCHESTRATION_STATES.includes(value.state)
    || !Array.isArray(value.reasons)) {
    throw new TypeError(`LAFEA_GUIDED_WORKFLOW_SECTION_INVALID:${sectionId}`);
  }
  return value;
}
function status(value, reasons = []) {
  if (!LAFEA_GUIDED_STEP_STATUSES.includes(value)) {
    throw new TypeError('LAFEA_GUIDED_WORKFLOW_STATUS_INVALID');
  }
  return { status: value, reasons: [...new Set(reasons.filter(Boolean))] };
}
function focusTarget(stepId) {
  return {
    SOURCE_IDENTITY: 'source',
    MODEL_DIAGNOSTICS: 'findings',
    ANALYSIS_PROFILE: 'profile',
    MATERIALS_SECTIONS: 'source',
    RESTRAINTS_BCS: 'source',
    LOADS_CASES: 'source',
    DISCRETIZATION: 'discretization',
    NUMERICAL_PREFLIGHT: 'numerical-verification',
    AUTHORIZATION: 'lineage',
    RUN: 'run',
    CONVERGENCE: 'convergence',
    RESULTS_EVIDENCE: 'results',
  }[stepId];
}
function requireOrchestration(stage) {
  const value = stage.orchestration;
  if (!value || value.schema !== LAFEA_WORKBENCH_ORCHESTRATION_SCHEMA
    || value.stageId !== stage.stageId || !value.sections) {
    throw new TypeError('LAFEA_GUIDED_WORKFLOW_CANONICAL_ORCHESTRATION_REQUIRED');
  }
  return value;
}
function requireState(value) {
  if (!value || typeof value !== 'object' || typeof value.activeStageId !== 'string'
    || !value.stages?.[value.activeStageId]) {
    throw new TypeError('LAFEA_GUIDED_WORKFLOW_STATE_REQUIRED');
  }
  return value;
}
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
