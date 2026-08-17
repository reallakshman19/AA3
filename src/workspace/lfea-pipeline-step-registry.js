/**
 * Routing table for the unified LFEA pipeline shell.
 *
 * Today the piping track is still two independently-governed engines
 * (InputXML source/pre-flight vs. results workbench check/run/output/
 * export) — see the LFEA revamp plan for why. Steps route honestly onto
 * whichever existing engine currently owns that concern, rather than
 * pretending a single engine already spans all six steps.
 */
export const LFEA_PIPELINE_STEPS = Object.freeze([
  Object.freeze({ stepId: 'INPUT', label: 'Input', hostGroup: 'SOURCE' }),
  Object.freeze({ stepId: 'ERROR_CHECK', label: 'Error check', hostGroup: 'SOURCE' }),
  Object.freeze({ stepId: 'LOAD_CASE', label: 'Load case', hostGroup: 'RESULTS' }),
  Object.freeze({ stepId: 'RUN', label: 'Run', hostGroup: 'RESULTS' }),
  Object.freeze({ stepId: 'OUTPUT', label: 'Output', hostGroup: 'RESULTS' }),
  Object.freeze({ stepId: 'EXPORT', label: 'Export', hostGroup: 'RESULTS' }),
]);

const HOST_GROUPS = Object.freeze(['SOURCE', 'RESULTS']);

export function requireLfeaPipelineStep(stepId) {
  const step = LFEA_PIPELINE_STEPS.find((candidate) => candidate.stepId === stepId);
  if (!step) throw new TypeError(`Unknown LFEA pipeline step: ${String(stepId)}.`);
  return step;
}

export function lfeaPipelineHostGroupFor(stepId) {
  return requireLfeaPipelineStep(stepId).hostGroup;
}

export { HOST_GROUPS as LFEA_PIPELINE_HOST_GROUPS };
