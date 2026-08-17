import { createLfeaPipelineSession } from './lfea-pipeline-session.js';
import { LFEA_PIPELINE_STEPS } from './lfea-pipeline-step-registry.js';
import { LfeaPipelineShellView } from './lfea-pipeline-shell-view.js';

/**
 * Composes the unified LFEA pipeline stepper shell around whichever
 * existing source/results panels are mounted into it. Owns only
 * navigation chrome — it has no knowledge of how to run any analysis.
 */
export class LfeaPipelineShellController {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.session = createLfeaPipelineSession(LFEA_PIPELINE_STEPS);
    this.view = new LfeaPipelineShellView(rootElement);
    this.unsubscribe = null;
  }

  init() {
    if (this.unsubscribe) return this;
    this.view.init({ onStepSelected: (stepId) => this.session.setActiveStep(stepId) });
    this.unsubscribe = this.session.subscribe((state) => this.view.render(state));
    this.view.render(this.session.getState());
    return this;
  }

  getSourceHost() {
    return this.view.getSourceHost();
  }

  getResultsHost() {
    return this.view.getResultsHost();
  }

  setStepStatus(stepId, status) {
    return this.session.setStepStatus(stepId, status);
  }

  getState() {
    return this.session.getState();
  }

  destroy() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.session.destroy();
    this.view.destroy();
    this.rootElement = null;
  }
}
