/**
 * Routing table for the unified LFEA pipeline shell.
 *
 * Step identity is deliberately presentation-only: the registry tells the
 * shell which existing host owns a concern and how to describe that concern
 * consistently. It does not authorize source intake, pre-flight, solve,
 * recovery, publication or export.
 */
export const LFEA_PIPELINE_STEPS = Object.freeze([
  Object.freeze({
    stepId: 'INPUT', label: 'Input', hostGroup: 'SOURCE', iconId: 'icon-step-input',
    description: 'Load the engineering model and confirm which source owns the session.',
  }),
  Object.freeze({
    stepId: 'ERROR_CHECK', label: 'Error check', hostGroup: 'SOURCE', iconId: 'icon-step-error-check',
    description: 'Review pre-flight findings, limitations and authorization before analysis.',
  }),
  Object.freeze({
    stepId: 'LOAD_CASE', label: 'Load case', hostGroup: 'LOAD_CASE', iconId: 'icon-step-load-case',
    description: 'Choose the physical cases to analyze and keep the current pre-flight in view.',
  }),
  Object.freeze({
    stepId: 'RUN', label: 'Run', hostGroup: 'RESULTS', iconId: 'icon-step-run',
    description: 'Execute the authorized analysis and surface its qualification state.',
  }),
  Object.freeze({
    stepId: 'OUTPUT', label: 'Output', hostGroup: 'RESULTS', iconId: 'icon-step-output',
    description: 'Review displacements, support loads, element forces and governing values.',
  }),
  Object.freeze({
    stepId: 'EXPORT', label: 'Export', hostGroup: 'RESULTS', iconId: 'icon-step-export',
    description: 'Export the currently reviewed result view without changing engineering values.',
  }),
]);

const HOST_GROUPS = Object.freeze(['SOURCE', 'LOAD_CASE', 'RESULTS']);

export function requireLfeaPipelineStep(stepId) {
  const step = LFEA_PIPELINE_STEPS.find((candidate) => candidate.stepId === stepId);
  if (!step) throw new TypeError(`Unknown LFEA pipeline step: ${String(stepId)}.`);
  return step;
}

export function lfeaPipelineHostGroupFor(stepId) {
  return requireLfeaPipelineStep(stepId).hostGroup;
}

export { HOST_GROUPS as LFEA_PIPELINE_HOST_GROUPS };