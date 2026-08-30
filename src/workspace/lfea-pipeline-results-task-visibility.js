export const LFEA_PIPELINE_RESULTS_TASK_VISIBILITY_SCHEMA = 'lfea-pipeline-results-task-visibility/v1';

/**
 * Presentation-only visibility coordinator for the three steps that share the
 * RESULTS host. It never changes result data; it only ensures each step shows
 * the task surface it owns.
 */
export function mountLfeaPipelineResultsTaskVisibility(hostElement) {
  if (!hostElement || typeof hostElement.querySelector !== 'function') {
    throw new TypeError('Results task visibility requires a results host.');
  }
  const Observer = hostElement.ownerDocument?.defaultView?.MutationObserver ?? globalThis.MutationObserver;

  const sync = () => {
    const activeStep = hostElement.dataset.activeStep ?? 'RUN';
    setHidden(hostElement, '[data-role="lfea-pipeline-run-panel"]', activeStep !== 'RUN');
    setHidden(hostElement, '[data-role="lfea-pipeline-results-panel"]', activeStep !== 'OUTPUT');
    setHidden(hostElement, '[data-role="lfea-results-authority-panel"]', activeStep !== 'OUTPUT');
    setHidden(hostElement, '[data-role="lfea-pipeline-export-panel"]', activeStep !== 'EXPORT');
    // The legacy inline CSV action remains available to API consumers but is
    // never a second visible export affordance; Export owns that action now.
    const legacyExport = hostElement.querySelector('.lfea-pipeline-results__export');
    if (legacyExport) legacyExport.hidden = true;
  };

  const observer = typeof Observer === 'function'
    ? new Observer(() => sync())
    : null;
  observer?.observe(hostElement, { attributes: true, attributeFilter: ['data-active-step'], childList: true, subtree: true });
  sync();

  return Object.freeze({
    schema: LFEA_PIPELINE_RESULTS_TASK_VISIBILITY_SCHEMA,
    refresh: sync,
    destroy() { observer?.disconnect(); },
  });
}

function setHidden(host, selector, hidden) {
  const node = host.querySelector(selector);
  if (node) node.hidden = hidden;
}
