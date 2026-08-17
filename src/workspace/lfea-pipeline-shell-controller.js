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
    // Bound lazily via setAssemblyHandlers(), after main.js constructs the
    // source/results controllers this shell wraps — those don't exist yet
    // at init() time, since they mount *into* the hosts init() creates.
    this.assemblyHandlers = null;
  }

  init() {
    if (this.unsubscribe) return this;
    this.view.init({
      onStepSelected: (stepId) => this.session.setActiveStep(stepId),
      onAuthoritySupplementSelected: (file) => this.assemblyHandlers?.onAuthoritySupplementSelected?.(file),
      onAssembleAndSendToRun: () => this.assemblyHandlers?.onAssembleAndSendToRun?.(),
    });
    let previousActiveStepId = null;
    this.unsubscribe = this.session.subscribe((state) => {
      this.view.render(state);
      // Fires on both a user's step-button click and a programmatic
      // setActiveStep() (e.g. from the "Assemble & send to Run" flow) --
      // panels with no subscription of their own to source-controller
      // state (e.g. the Load-case authoring panel's node list) use this
      // as their one reliable "become visible" refresh point.
      if (state.activeStepId !== previousActiveStepId) {
        previousActiveStepId = state.activeStepId;
        this.assemblyHandlers?.onStepActivated?.(state.activeStepId);
      }
    });
    this.view.render(this.session.getState());
    return this;
  }

  setAssemblyHandlers(handlers) {
    this.assemblyHandlers = handlers;
  }

  setAuthoritySupplementStatus(text) {
    this.view.setAuthoritySupplementStatus(text);
  }

  setAssembleStatus(text, isError) {
    this.view.setAssembleStatus(text, isError);
  }

  getSourceHost() {
    return this.view.getSourceHost();
  }

  getResultsHost() {
    return this.view.getResultsHost();
  }

  getLoadCaseHost() {
    return this.view.getLoadCaseHost();
  }

  setStepStatus(stepId, status) {
    return this.session.setStepStatus(stepId, status);
  }

  setActiveStep(stepId) {
    return this.session.setActiveStep(stepId);
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
