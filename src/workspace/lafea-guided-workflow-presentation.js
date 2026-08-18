/** UI-only grouping of canonical LAFEA workflow steps into operator-facing areas. */

export const LAFEA_WORKFLOW_AREA_SCHEMA = 'lafea-workflow-area-presentation/v1';

const AREA_DEFINITIONS = Object.freeze([
  Object.freeze({
    areaId: 'MODEL',
    label: 'Model',
    stepIds: Object.freeze([
      'SOURCE_IDENTITY',
      'MODEL_DIAGNOSTICS',
      'ANALYSIS_PROFILE',
      'MATERIALS_SECTIONS',
      'RESTRAINTS_BCS',
      'LOADS_CASES',
    ]),
  }),
  Object.freeze({
    areaId: 'MESH',
    label: 'Mesh',
    stepIds: Object.freeze(['DISCRETIZATION']),
  }),
  Object.freeze({
    areaId: 'SOLVE',
    label: 'Solve',
    stepIds: Object.freeze(['NUMERICAL_PREFLIGHT', 'AUTHORIZATION', 'RUN']),
  }),
  Object.freeze({
    areaId: 'RESULTS',
    label: 'Results',
    stepIds: Object.freeze(['RESULTS_EVIDENCE']),
  }),
]);

const STATUS_PRIORITY = Object.freeze([
  'BLOCKED',
  'WARNING',
  'READY',
  'NOT_STARTED',
  'COMPLETE',
]);

export function buildLafeaWorkflowAreaPresentation(workflow) {
  if (!workflow || workflow.schema !== 'lafea-guided-workflow/v1' || !Array.isArray(workflow.steps)) {
    throw new TypeError('LAFEA_WORKFLOW_AREA_PRESENTATION_INPUT_INVALID');
  }
  const byId = new Map(workflow.steps.map((step) => [step.stepId, step]));
  return Object.freeze(AREA_DEFINITIONS.map((definition) => {
    const steps = Object.freeze(definition.stepIds.map((stepId) => requireStep(byId, stepId)));
    return Object.freeze({
      schema: LAFEA_WORKFLOW_AREA_SCHEMA,
      areaId: definition.areaId,
      label: definition.label,
      status: aggregateStatus(steps),
      steps,
      targetStep: selectTargetStep(steps),
      reasons: Object.freeze(unique(steps
        .filter((step) => step.status !== 'COMPLETE')
        .flatMap((step) => step.reasons))),
    });
  }));
}

function aggregateStatus(steps) {
  const statuses = new Set(steps.map((step) => step.status));
  return STATUS_PRIORITY.find((status) => statuses.has(status)) ?? 'NOT_STARTED';
}

function selectTargetStep(steps) {
  for (const status of STATUS_PRIORITY) {
    const match = steps.find((step) => step.status === status);
    if (match) return match;
  }
  return steps[0];
}

function requireStep(byId, stepId) {
  const step = byId.get(stepId);
  if (!step || !Array.isArray(step.reasons)) {
    throw new TypeError(`LAFEA_WORKFLOW_AREA_STEP_REQUIRED:${stepId}`);
  }
  return step;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
