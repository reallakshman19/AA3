import { createLfeaPipelineSession } from './lfea-pipeline-session.js';
import { LFEA_PIPELINE_STEPS } from './lfea-pipeline-step-registry.js';
import { LfeaPipelineShellView } from './lfea-pipeline-shell-view.js';
import {
  buildLfeaSourceAcquisitionModel,
  createLfeaSourceAcquisitionController,
} from './lfea-source-acquisition.js';

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
    this.sourceAcquisition = null;
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
      onLoadSample: () => this.assemblyHandlers?.onLoadSample?.(),
    });
    this.sourceAcquisition = createLfeaSourceAcquisitionController(this.view.getSourceHost());
    let previousActiveStepId = null;
    this.unsubscribe = this.session.subscribe((state) => {
      this.view.render(state);
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

  setActiveSourceKind(kind) {
    // main.js still calls this legacy method with the preparation owner.
    // UI03 resolves the read-only engineering session when available so a
    // StagedJSON source is presented as StagedJSON rather than relabelled as
    // its derived InputXML preparation provider. During bootstrap the passed
    // kind remains the safe fallback.
    const engineeringState = globalThis.AnalysisWorkspace?.getLfeaEngineeringSessionState?.() ?? null;
    const model = buildLfeaSourceAcquisitionModel(engineeringState, kind);
    this.view.setActiveSourceKind(model.sourceKind);
    this.sourceAcquisition?.render(model);
    // UI04 read-only consumers refresh from the same already-current pre-flight
    // after every source/preparation projection. This is a presentation event;
    // it carries no engineering values and creates no second state authority.
    const sourceHost = this.view.getSourceHost();
    const EventCtor = sourceHost?.ownerDocument?.defaultView?.Event ?? globalThis.Event;
    if (sourceHost && typeof sourceHost.dispatchEvent === 'function' && typeof EventCtor === 'function') {
      sourceHost.dispatchEvent(new EventCtor('lfea-source-presentation-refresh'));
    }
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

  getVerificationDrawerHost() {
    return this.view.getVerificationDrawerHost();
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
    this.sourceAcquisition?.destroy();
    this.sourceAcquisition = null;
    this.session.destroy();
    this.view.destroy();
    this.rootElement = null;
  }
}
