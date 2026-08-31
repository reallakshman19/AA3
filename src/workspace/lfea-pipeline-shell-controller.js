import { createLfeaPipelineSession } from './lfea-pipeline-session.js';
import { LFEA_PIPELINE_STEPS } from './lfea-pipeline-step-registry.js';
import { LfeaPipelineShellView } from './lfea-pipeline-shell-view.js';
import {
  buildLfeaSourceAcquisitionModel,
  createLfeaSourceAcquisitionController,
} from './lfea-source-acquisition.js';

/**
 * Composes the unified LFEA pipeline shell and owns presentation-only task
 * sequencing. Engineering controllers remain authoritative for pre-flight,
 * analysis and results.
 */
export class LfeaPipelineShellController {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.session = createLfeaPipelineSession(LFEA_PIPELINE_STEPS);
    this.view = new LfeaPipelineShellView(rootElement);
    this.sourceAcquisition = null;
    this.unsubscribe = null;
    this.assemblyHandlers = null;
    this.flow = {
      runReady: false,
      runBlockedReason: 'Clear Error check and apply at least one load case first.',
      analysisComplete: false,
      exportComplete: false,
    };
    this.handleRunReadiness = (event) => this.onRunReadiness(event);
    this.handleAnalysisCompleted = () => this.onAnalysisCompleted();
    this.handleExportCompleted = () => this.onExportCompleted();
  }

  init() {
    if (this.unsubscribe) return this;
    this.view.init({
      onStepSelected: (stepId) => this.setActiveStep(stepId),
      onAuthoritySupplementSelected: (file) => this.assemblyHandlers?.onAuthoritySupplementSelected?.(file),
      onAssembleAndSendToRun: () => this.assemblyHandlers?.onAssembleAndSendToRun?.(),
      onLoadSample: () => this.assemblyHandlers?.onLoadSample?.(),
    });
    this.rootElement.addEventListener('lfea-pipeline-run-readiness-changed', this.handleRunReadiness);
    this.rootElement.addEventListener('lfea-pipeline-analysis-completed', this.handleAnalysisCompleted);
    this.rootElement.addEventListener('lfea-pipeline-export-completed', this.handleExportCompleted);
    this.sourceAcquisition = createLfeaSourceAcquisitionController(this.view.getSourceHost());
    let previousActiveStepId = null;
    this.unsubscribe = this.session.subscribe((state) => {
      this.view.render(state);
      if (state.activeStepId !== previousActiveStepId) {
        previousActiveStepId = state.activeStepId;
        this.dispatchTaskActivated(state.activeStepId);
        this.assemblyHandlers?.onStepActivated?.(state.activeStepId);
      }
    });
    this.view.render(this.session.getState());
    return this;
  }

  setAssemblyHandlers(handlers) { this.assemblyHandlers = handlers; }

  setActiveSourceKind(kind) {
    const engineeringState = globalThis.AnalysisWorkspace?.getLfeaEngineeringSessionState?.() ?? null;
    const model = buildLfeaSourceAcquisitionModel(engineeringState, kind);
    this.view.setActiveSourceKind(model.sourceKind);
    this.sourceAcquisition?.render(model);
    const sourceHost = this.view.getSourceHost();
    const EventCtor = sourceHost?.ownerDocument?.defaultView?.Event ?? globalThis.Event;
    if (sourceHost && typeof sourceHost.dispatchEvent === 'function' && typeof EventCtor === 'function') {
      sourceHost.dispatchEvent(new EventCtor('lfea-source-presentation-refresh'));
    }
  }

  setAuthoritySupplementStatus(text) { this.view.setAuthoritySupplementStatus(text); }
  setAssembleStatus(text, isError) { this.view.setAssembleStatus(text, isError); }
  getSourceHost() { return this.view.getSourceHost(); }
  getLoadCaseHost() { return this.view.getLoadCaseHost(); }
  getRunHost() { return this.view.getRunHost(); }
  getOutputHost() { return this.view.getOutputHost(); }
  getResultsHost() { return this.view.getResultsHost(); }
  getExportHost() { return this.view.getExportHost(); }
  getVerificationDrawerHost() { return this.view.getVerificationDrawerHost(); }

  setStepStatus(stepId, status) {
    if (stepId === 'RUN' && status.complete === false) this.resetDownstreamFlow();
    if (stepId === 'RUN') {
      const upstreamAvailable = status.available ?? this.session.getState().stepAvailability.RUN.available;
      return this.session.setStepStatus('RUN', {
        ...status,
        available: Boolean(upstreamAvailable && this.flow.runReady),
        blockedReason: upstreamAvailable && !this.flow.runReady ? this.flow.runBlockedReason : status.blockedReason,
      });
    }
    if (stepId === 'OUTPUT' && !this.flow.analysisComplete) {
      return this.session.setStepStatus('OUTPUT', {
        ...status,
        available: false,
        complete: false,
        blockedReason: 'Run the current authorized case selection first.',
      });
    }
    if (stepId === 'EXPORT' && !this.flow.analysisComplete) {
      return this.session.setStepStatus('EXPORT', {
        ...status,
        available: false,
        complete: false,
        blockedReason: 'Run and review an analysis result before exporting.',
      });
    }
    return this.session.setStepStatus(stepId, status);
  }

  setActiveStep(stepId) {
    if (stepId === 'OUTPUT' && this.flow.analysisComplete) {
      this.session.setStepStatus('OUTPUT', { available: true, complete: true });
    }
    if (stepId === 'EXPORT' && this.flow.exportComplete) {
      this.session.setStepStatus('EXPORT', { available: true, complete: true });
    }
    return this.session.setActiveStep(stepId);
  }

  onRunReadiness(event) {
    const ready = Boolean(event?.detail?.ready);
    this.flow.runReady = ready;
    this.flow.runBlockedReason = event?.detail?.reason ?? this.flow.runBlockedReason;
    this.session.setStepStatus('RUN', {
      available: ready,
      blockedReason: ready ? null : this.flow.runBlockedReason,
    });
  }

  onAnalysisCompleted() {
    this.flow.analysisComplete = true;
    this.flow.exportComplete = false;
    this.session.setStepStatus('RUN', { available: true, complete: true });
    this.session.setStepStatus('OUTPUT', { available: true, complete: true, blockedReason: null });
    this.session.setStepStatus('EXPORT', { available: true, complete: false, blockedReason: null });
  }

  onExportCompleted() {
    if (!this.flow.analysisComplete) return;
    this.flow.exportComplete = true;
    this.session.setStepStatus('EXPORT', { available: true, complete: true, blockedReason: null });
  }

  dispatchTaskActivated(stepId) {
    const EventCtor = this.rootElement?.ownerDocument?.defaultView?.CustomEvent ?? globalThis.CustomEvent;
    if (typeof EventCtor !== 'function') return;
    this.rootElement.dispatchEvent(new EventCtor('lfea-pipeline-task-activated', {
      detail: Object.freeze({ stepId }),
    }));
  }

  resetDownstreamFlow() {
    this.flow.analysisComplete = false;
    this.flow.exportComplete = false;
  }

  getState() { return this.session.getState(); }

  destroy() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.rootElement.removeEventListener('lfea-pipeline-run-readiness-changed', this.handleRunReadiness);
    this.rootElement.removeEventListener('lfea-pipeline-analysis-completed', this.handleAnalysisCompleted);
    this.rootElement.removeEventListener('lfea-pipeline-export-completed', this.handleExportCompleted);
    this.sourceAcquisition?.destroy();
    this.sourceAcquisition = null;
    this.session.destroy();
    this.view.destroy();
    this.rootElement = null;
  }
}
