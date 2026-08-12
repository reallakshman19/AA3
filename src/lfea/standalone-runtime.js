import { LfeaWorkbenchController } from '../workspace/lfea-workbench-controller.js';
import { createLfeaGovernedJourneyProjection } from './governed-journey-projection.js';
import { mountLfeaGovernedJourneyView } from './governed-journey-view.js';
import { LfeaStandaloneInputXmlSourceController } from './inputxml-source-controller.js';
import { createLfeaNativeComparisonController } from './native-comparison-controller.js';
import { createLfeaNativeExecutionAuthority } from './native-execution-authority.js';
import { mountLfeaNativeHistoryView } from './native-history-view.js';
import { createLfeaNativePublicationReadiness } from './native-publication-readiness.js';
import { createLfeaNativeResultsAuthority } from './native-results-authority.js';
import { mountLfeaNativeResultsView } from './native-results-view.js';
import { createLfeaNativeRunHistory } from './native-run-history.js';
import { createLfeaNativeSupportPublicationAuthority } from './native-support-publication-authority.js';
import { createLfeaNativeVerificationController } from './native-verification-controller.js';
import { buildLfeaStandalonePublicApi } from './standalone-runtime-api.js';
import { lfeaStandaloneJourneyStatus } from './standalone-status.js';
import { clearLfeaStandaloneLayout, renderLfeaStandaloneLayout } from './standalone-layout.js';

export function createLfeaStandaloneRuntime(rootElement, options) {
  return buildLfeaStandalonePublicApi(new LfeaStandaloneRuntime(rootElement, options));
}

class LfeaStandaloneRuntime {
  constructor(rootElement, options) {
    this.rootElement = rootElement;
    this.identity = options.identity;
    this.persistence = options.persistence;
    this.persistedState = this.persistence.load();
    this.destroyed = false;
    this.executionAuthority = createLfeaNativeExecutionAuthority();
    this.resultsAuthority = createLfeaNativeResultsAuthority();
    this.supportPublicationAuthority = createLfeaNativeSupportPublicationAuthority();
    this.runHistory = createLfeaNativeRunHistory();
    this.layout = this.#createLayout();
    this.#createViews();
    this.#createControllers(options.workbench);
    this.#initialize();
  }

  #createLayout() {
    return renderLfeaStandaloneLayout(this.rootElement, this.identity, {
      initialViewId: this.persistedState.activeView,
      onViewActivated: (viewId) => {
        this.persistence.saveActiveView(viewId);
        this.persistedState = this.persistence.load();
      },
    });
  }

  #createViews() {
    this.comparisonController = createLfeaNativeComparisonController(this.layout.comparisonRoot, {
      lookupRun: (runId) => this.runHistory.getRecord(runId),
    });
    this.verificationController = createLfeaNativeVerificationController(this.layout.nativeVerificationRoot);
    this.journeyView = mountLfeaGovernedJourneyView({
      reviewRoot: this.layout.reviewRoot,
      modelRoot: this.layout.modelRoot,
      analysisRoot: this.layout.analysisRoot,
      onRunNativeAnalysis: () => this.executeNativeAnalysis(),
    });
    this.resultsView = mountLfeaNativeResultsView(this.layout.resultsRoot);
    this.historyView = mountLfeaNativeHistoryView(this.layout.historyRoot, {
      onSelectRun: (runId) => this.selectHistoryRun(runId),
    });
  }

  #createControllers(workbenchOptions) {
    this.sourceController = new LfeaStandaloneInputXmlSourceController(
      this.layout.sourceRoot,
      this.rootElement.ownerDocument,
      (snapshot, preFlight) => this.refreshJourney(snapshot, preFlight),
    );
    this.workbenchController = new LfeaWorkbenchController(this.layout.workbenchRoot, workbenchOptions);
  }

  #initialize() {
    this.governedJourney = createLfeaGovernedJourneyProjection({
      executionState: this.executionAuthority.getState(),
    });
    this.historySnapshot = this.runHistory.getSnapshot();
    this.publicationReadiness = createLfeaNativePublicationReadiness({
      resultsState: this.resultsAuthority.getState(),
    });
    this.journeyView.update(this.governedJourney);
    this.#updateResultsView();
    this.historyView.update(this.historySnapshot);
    this.comparisonController.refresh(this.historySnapshot);
    this.sourceController.init();
    this.workbenchController.init();
    this.refreshCurrent();
  }

  requireActive() {
    if (!this.destroyed) return;
    const error = new Error('Standalone LFEA application has been destroyed.');
    error.code = 'LFEA_STANDALONE_DESTROYED';
    throw error;
  }

  refreshCurrent() {
    return this.refreshJourney(this.sourceController.getSnapshot(), this.sourceController.getPreFlight());
  }

  refreshJourney(sourceSnapshot, preFlight) {
    this.#persistRecentSource(sourceSnapshot);
    const executionState = this.executionAuthority.reconcile(preFlight);
    const resultsState = this.resultsAuthority.reconcile(preFlight, executionState);
    this.supportPublicationAuthority.reconcile(preFlight, executionState, resultsState);
    this.governedJourney = createLfeaGovernedJourneyProjection({
      sourceSnapshot, preFlight, executionState,
    });
    this.publicationReadiness = createLfeaNativePublicationReadiness({
      preFlight,
      resultsState,
      supportAuthority: this.supportPublicationAuthority.readinessAuthority(
        preFlight, executionState, resultsState,
      ),
    });
    this.journeyView.update(this.governedJourney);
    this.#updateResultsView();
    this.historySnapshot = this.#currentHistorySnapshot(sourceSnapshot, preFlight);
    this.historyView.update(this.historySnapshot);
    this.comparisonController.refresh(this.historySnapshot);
    this.verificationController.refresh({
      applicationIdentity: this.identity,
      sourceSnapshot,
      preFlight,
      executionState,
      resultsState,
      supportPublicationState: this.supportPublicationAuthority.getState(),
      historySnapshot: this.historySnapshot,
      publicationReadiness: this.publicationReadiness,
    });
    this.layout.statusRoot.textContent = lfeaStandaloneJourneyStatus(
      this.governedJourney, resultsState, this.persistedState.recentSourceMetadata,
    );
    return this.governedJourney;
  }

  #updateResultsView() {
    this.resultsView.update(
      this.executionAuthority.getState(),
      this.resultsAuthority.getState(),
      this.publicationReadiness,
      this.supportPublicationAuthority.getState(),
    );
  }

  #persistRecentSource(snapshot) {
    if (!snapshot?.fileName || !snapshot.contentSha256 || !snapshot.sourceUnit) return;
    try {
      this.persistence.saveRecentSourceMetadata({
        fileName: snapshot.fileName,
        contentSha256: snapshot.contentSha256,
        sourceUnit: snapshot.sourceUnit,
      });
    } catch { return; }
    this.persistedState = this.persistence.load();
  }

  #currentHistorySnapshot(sourceSnapshot, preFlight) {
    return this.runHistory.getSnapshot({
      sourceSnapshot,
      preFlight,
      executionState: this.executionAuthority.getState(),
      resultsState: this.resultsAuthority.getState(),
    });
  }

  #archiveCurrentRun() {
    return this.runHistory.archive({
      applicationIdentity: this.identity,
      sourceSnapshot: this.sourceController.getSnapshot(),
      preFlight: this.sourceController.getPreFlight(),
      executionState: this.executionAuthority.getState(),
      resultsState: this.resultsAuthority.getState(),
    });
  }

  #engineeringStateSet() {
    return Object.freeze({
      execution: this.executionAuthority.getState(),
      results: this.resultsAuthority.getState(),
      support: this.supportPublicationAuthority.getState(),
    });
  }

  #assertAuthorityUnchanged(before, operation) {
    if (this.executionAuthority.getState() === before.execution
      && this.resultsAuthority.getState() === before.results
      && this.supportPublicationAuthority.getState() === before.support) return;
    const error = new Error(`${operation} changed native engineering authority.`);
    error.code = 'LFEA_VIEW_CONTEXT_AUTHORITY_MUTATION';
    throw error;
  }

  selectHistoryRun(runId) {
    this.requireActive();
    const before = this.#engineeringStateSet();
    const record = this.runHistory.selectRun(runId);
    this.historySnapshot = this.#currentHistorySnapshot(
      this.sourceController.getSnapshot(), this.sourceController.getPreFlight(),
    );
    this.historyView.update(this.historySnapshot);
    this.comparisonController.refresh(this.historySnapshot);
    this.#assertAuthorityUnchanged(before, 'History selection');
    return record;
  }

  compareHistoryRuns(leftRunId, rightRunId) {
    this.requireActive();
    const before = this.#engineeringStateSet();
    const comparison = this.comparisonController.compare(leftRunId, rightRunId);
    this.#assertAuthorityUnchanged(before, 'Run comparison');
    return comparison;
  }

  // Evidence dossier creation remains current-only and fail-closed.
  createNativeEvidenceDossier() {
    this.requireActive();
    return this.verificationController.createDossier();
  }

  stageNativeSupportAuthority(input) {
    this.requireActive();
    const state = this.supportPublicationAuthority.stage(this.sourceController.getPreFlight(), input);
    this.refreshCurrent();
    return state;
  }

  authorizeNativeSupportAuthority(approval) {
    this.requireActive();
    const state = this.supportPublicationAuthority.authorize(
      this.sourceController.getPreFlight(), approval,
    );
    this.refreshCurrent();
    return state;
  }

  publishNativeSupportActions() {
    this.requireActive();
    const state = this.supportPublicationAuthority.publish(
      this.sourceController.getPreFlight(),
      this.executionAuthority.getState(),
      this.resultsAuthority.getState(),
    );
    this.refreshCurrent();
    this.layout.activate('results');
    return state;
  }

  executeNativeAnalysis(runOptions = {}) {
    this.requireActive();
    try {
      const state = this.executionAuthority.run(this.sourceController.getPreFlight(), runOptions);
      this.resultsAuthority.recover(this.sourceController.getPreFlight(), state);
      this.#archiveCurrentRun();
      this.refreshCurrent();
      this.layout.activate('results');
      return state;
    } catch (error) {
      this.refreshCurrent();
      this.layout.statusRoot.textContent = `Native analysis/Results/History blocked: ${error?.code ?? error?.message ?? 'UNKNOWN_ERROR'}`;
      throw error;
    }
  }

  recoverCurrentResults() {
    this.requireActive();
    const state = this.resultsAuthority.recover(
      this.sourceController.getPreFlight(), this.executionAuthority.getState(),
    );
    this.#archiveCurrentRun();
    this.refreshCurrent();
    this.layout.activate('results');
    return state;
  }

  applicationState() {
    this.requireActive();
    return Object.freeze({
      identity: this.identity,
      activeView: this.layout.getActiveView(),
      source: this.sourceController.getSnapshot(),
      governedJourney: this.governedJourney,
      nativeExecution: this.executionAuthority.getState(),
      nativeResults: this.resultsAuthority.getState(),
      nativeSupportPublication: this.supportPublicationAuthority.getState(),
      nativeHistory: this.historySnapshot,
      nativeComparison: this.comparisonController.getState(),
      nativePublicationReadiness: this.publicationReadiness,
      nativeVerification: this.verificationController.getState(),
      nonAuthoritativePersistence: this.persistedState,
    });
  }

  clearInputXmlSource() {
    this.requireActive();
    this.sourceController.clear();
    this.refreshCurrent();
    return this.sourceController.getSnapshot();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.comparisonController.destroy();
    this.verificationController.destroy();
    this.supportPublicationAuthority.clearCurrentAuthority();
    this.resultsAuthority.clearCurrentAuthority();
    this.executionAuthority.clearCurrentAuthority();
    this.runHistory.clear();
    this.sourceController.destroy();
    this.historyView.destroy();
    this.resultsView.destroy();
    this.journeyView.destroy();
    this.workbenchController.destroy();
    clearLfeaStandaloneLayout(this.rootElement);
  }
}
