export const LFEA_PIPELINE_RESULTS_TASK_VISIBILITY_SCHEMA = 'lfea-pipeline-results-task-visibility/v1';

/** Presentation-only visibility coordinator for RUN / OUTPUT / EXPORT. */
export function mountLfeaPipelineResultsTaskVisibility(hostElement, options = {}) {
  if (!hostElement || typeof hostElement.querySelector !== 'function') throw new TypeError('Results task visibility requires a results host.');
  const Observer = hostElement.ownerDocument?.defaultView?.MutationObserver ?? globalThis.MutationObserver;
  let previousActiveStep = null;

  const sync = () => {
    const activeStep = hostElement.dataset.activeStep ?? 'RUN';
    const runPanel = hostElement.querySelector('[data-role="lfea-pipeline-run-panel"]');
    const outputPanel = hostElement.querySelector('[data-role="lfea-pipeline-results-panel"]');
    const authorityPanel = hostElement.querySelector('[data-role="lfea-results-authority-panel"]');
    const exportPanel = hostElement.querySelector('[data-role="lfea-pipeline-export-panel"]');
    runPanel?.classList.add('lfea-pipeline-results');
    exportPanel?.classList.add('lfea-pipeline-results');
    if (runPanel) runPanel.hidden = activeStep !== 'RUN';
    if (outputPanel) outputPanel.hidden = activeStep !== 'OUTPUT';
    if (authorityPanel) authorityPanel.hidden = activeStep !== 'OUTPUT';
    if (exportPanel) exportPanel.hidden = activeStep !== 'EXPORT';
    const legacyExport = hostElement.querySelector('.lfea-pipeline-results__export');
    if (legacyExport) legacyExport.hidden = true;
    if (activeStep !== previousActiveStep) {
      previousActiveStep = activeStep;
      options.onTaskChanged?.(activeStep);
    }
  };

  const observer = typeof Observer === 'function' ? new Observer(() => sync()) : null;
  observer?.observe(hostElement, { attributes: true, attributeFilter: ['data-active-step'] });
  sync();

  return Object.freeze({ schema: LFEA_PIPELINE_RESULTS_TASK_VISIBILITY_SCHEMA, refresh: sync, destroy() { observer?.disconnect(); } });
}
