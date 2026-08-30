export const LFEA_PIPELINE_RESULTS_TASK_VISIBILITY_SCHEMA = 'lfea-pipeline-results-task-visibility/v1';

/** Presentation-only visibility coordinator for RUN / OUTPUT / EXPORT. */
export function mountLfeaPipelineResultsTaskVisibility(hostElement, options = {}) {
  if (!hostElement || typeof hostElement.querySelector !== 'function') throw new TypeError('Results task visibility requires a results host.');
  const Observer = hostElement.ownerDocument?.defaultView?.MutationObserver ?? globalThis.MutationObserver;
  let previousActiveStep = null;

  const sync = () => {
    const activeStep = hostElement.dataset.activeStep ?? 'RUN';
    setHidden(hostElement, '[data-role="lfea-pipeline-run-panel"]', activeStep !== 'RUN');
    setHidden(hostElement, '[data-role="lfea-pipeline-results-panel"]', activeStep !== 'OUTPUT');
    setHidden(hostElement, '[data-role="lfea-results-authority-panel"]', activeStep !== 'OUTPUT');
    setHidden(hostElement, '[data-role="lfea-pipeline-export-panel"]', activeStep !== 'EXPORT');
    const legacyExport = hostElement.querySelector('.lfea-pipeline-results__export');
    if (legacyExport) legacyExport.hidden = true;
    if (activeStep !== previousActiveStep) {
      previousActiveStep = activeStep;
      options.onTaskChanged?.(activeStep);
    }
  };

  const observer = typeof Observer === 'function' ? new Observer(() => sync()) : null;
  // Only the host's step stamp controls task visibility. Observing subtree
  // mutations would feed panel refreshes back into this observer.
  observer?.observe(hostElement, { attributes: true, attributeFilter: ['data-active-step'] });
  sync();

  return Object.freeze({ schema: LFEA_PIPELINE_RESULTS_TASK_VISIBILITY_SCHEMA, refresh: sync, destroy() { observer?.disconnect(); } });
}

function setHidden(host, selector, hidden) {
  const node = host.querySelector(selector);
  if (node) node.hidden = hidden;
}
