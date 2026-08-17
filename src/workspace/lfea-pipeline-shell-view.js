import { LFEA_PIPELINE_STEPS, lfeaPipelineHostGroupFor } from './lfea-pipeline-step-registry.js';

/** Renders the unified LFEA pipeline stepper chrome around existing panel hosts. */
export class LfeaPipelineShellView {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.documentRef = rootElement.ownerDocument;
    this.elements = null;
  }

  init(handlers) {
    const doc = this.documentRef;
    const shell = doc.createElement('section');
    shell.className = 'lfea-pipeline-shell';
    shell.dataset.role = 'lfea-pipeline-shell';

    const toolbar = doc.createElement('div');
    toolbar.className = 'lfea-pipeline-shell__toolbar';
    const loadSample = doc.createElement('button');
    loadSample.type = 'button';
    loadSample.className = 'lfea-pipeline-shell__load-sample';
    loadSample.dataset.action = 'lfea-pipeline-load-sample';
    loadSample.disabled = true;
    loadSample.title = 'Sample fixtures for each input type land in a later phase of the LFEA revamp.';
    loadSample.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14"/></svg><span>Load sample</span>';
    toolbar.append(loadSample);

    const nav = doc.createElement('nav');
    nav.className = 'lfea-pipeline-shell__stepper';
    nav.setAttribute('aria-label', 'LFEA pipeline steps');
    const stepButtons = new Map();
    LFEA_PIPELINE_STEPS.forEach((step, index) => {
      const stepButton = doc.createElement('button');
      stepButton.type = 'button';
      stepButton.className = 'lfea-pipeline-shell__step';
      stepButton.dataset.role = 'lfea-pipeline-step';
      stepButton.dataset.stepId = step.stepId;
      stepButton.innerHTML = `<span class="lfea-pipeline-shell__step-index">${index + 1}</span><span class="lfea-pipeline-shell__step-label">${step.label}</span>`;
      stepButton.addEventListener('click', () => handlers.onStepSelected(step.stepId));
      nav.append(stepButton);
      stepButtons.set(step.stepId, stepButton);
    });

    const content = doc.createElement('div');
    content.className = 'lfea-pipeline-shell__content';
    const sourceHost = doc.createElement('div');
    sourceHost.className = 'lfea-pipeline-shell__host';
    sourceHost.dataset.hostGroup = 'SOURCE';
    const resultsHost = doc.createElement('div');
    resultsHost.className = 'lfea-pipeline-shell__host';
    resultsHost.dataset.hostGroup = 'RESULTS';
    content.append(sourceHost, resultsHost);

    shell.append(toolbar, nav, content);
    this.rootElement.append(shell);
    this.elements = { shell, toolbar, loadSample, nav, stepButtons, content, sourceHost, resultsHost };
    return this;
  }

  render(state) {
    const { stepButtons } = this.elements;
    LFEA_PIPELINE_STEPS.forEach((step) => {
      const stepButton = stepButtons.get(step.stepId);
      const status = state.stepAvailability[step.stepId];
      const isActive = state.activeStepId === step.stepId;
      stepButton.classList.toggle('lfea-pipeline-shell__step--active', isActive);
      stepButton.classList.toggle('lfea-pipeline-shell__step--complete', Boolean(status.complete));
      stepButton.setAttribute('aria-current', isActive ? 'step' : 'false');
      stepButton.disabled = !status.available;
      if (status.detail) stepButton.title = status.detail;
    });
    const activeHostGroup = lfeaPipelineHostGroupFor(state.activeStepId);
    this.elements.sourceHost.hidden = activeHostGroup !== 'SOURCE';
    this.elements.resultsHost.hidden = activeHostGroup !== 'RESULTS';
  }

  getSourceHost() {
    return this.elements.sourceHost;
  }

  getResultsHost() {
    return this.elements.resultsHost;
  }

  destroy() {
    this.elements?.shell.remove();
    this.elements = null;
  }
}
