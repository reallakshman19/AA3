import { LfeaWorkbenchController } from '../workspace/lfea-workbench-controller.js';
import { createLfeaGovernedJourneyProjection } from './governed-journey-projection.js';
import { mountLfeaGovernedJourneyView } from './governed-journey-view.js';
import { LfeaStandaloneInputXmlSourceController } from './inputxml-source-controller.js';
import { createLfeaNativeComparisonController } from './native-comparison-controller.js';
import { createLfeaNativeExecutionAuthority } from './native-execution-authority.js';
import { mountLfeaNativeHistoryView } from './native-history-view.js';
import { createLfeaNativeResultsAuthority } from './native-results-authority.js';
import { mountLfeaNativeResultsView } from './native-results-view.js';
import { createLfeaNativeRunHistory } from './native-run-history.js';
import { clearLfeaStandaloneLayout, renderLfeaStandaloneLayout } from './standalone-layout.js';

export function createLfeaStandaloneRuntime(rootElement, options) {
  const runtime = new LfeaStandaloneRuntime(rootElement, options);
  return buildPublicApi(runtime);
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
      (sourceSnapshot, preFlight) => this.refreshJourney(sourceSnapshot, preFlight),
    );
    this.workbenchController = new LfeaWorkbenchController(this.layout.workbenchRoot, workbenchOptions);
  }

  #initialize() {
    this.governedJourney = createLfeaGovernedJourneyProjection({
      executionState: this.executionAuthority.getState(),
    });
    this.historySnapshot = this.runHistory.getSnapshot();
    this.journeyView.update(this.governedJourney);
    this.resultsView.update(this.executionAuthority.getState(), this.resultsAuthority.getState());
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
    return this.refreshJourney(
      this.sourceController.getSnapshot(),
      this.sourceController.getPreFlight(),
    );
  }

  refreshJourney(sourceSnapshot, preFlight) {
    this.#persistRecentSource(sourceSnapshot);
    this.executionAuthority.reconcile(preFlight);
    this.resultsAuthority.reconcile(preFlight, this.executionAuthority.getState());
    this.governedJourney = createLfeaGovernedJourneyProjection({
      sourceSnapshot,
      preFlight,
      executionState: this.executionAuthority.getState(),
    });
    this.journeyView.update(this.governedJourney);
    this.resultsView.update(this.executionAuthority.getState(), this.resultsAuthority.getState());
    this.historySnapshot = this.#currentHistorySnapshot(sourceSnapshot, preFlight);
    this.historyView.update(this.historySnapshot);
    this.comparisonController.refresh(this.historySnapshot);
    this.layout.statusRoot.textContent = journeyStatus(
      this.governedJourney,
      this.resultsAuthority.getState(),
      this.persistedState.recentSourceMetadata,
    );
    return this.governedJourney;
  }

  #persistRecentSource(snapshot) {
    if (!snapshot?.fileName || !snapshot.contentSha256 || !snapshot.sourceUnit) return;
    const metadata = {
      fileName: snapshot.fileName,
      contentSha256: snapshot.contentSha256,
      sourceUnit: snapshot.sourceUnit,
    };
    try { this.persistence.saveRecentSourceMetadata(metadata); } catch { return; }
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

  selectHistoryRun(runId) {
    this.requireActive();
    const before = this.#engineeringStatePair();
    const record = this.runHistory.selectRun(runId);
    this.historySnapshot = this.#currentHistorySnapshot(
      this.sourceController.getSnapshot(),
      this.sourceController.getPreFlight(),
    );
    this.historyView.update(this.historySnapshot);
    this.comparisonController.refresh(this.historySnapshot);
    this.#assertAuthorityUnchanged(before, 'History selection');
    return record;
  }

  compareHistoryRuns(leftRunId, rightRunId) {
    this.requireActive();
    const before = this.#engineeringStatePair();
    const comparison = this.comparisonController.compare(leftRunId, rightRunId);
    this.#assertAuthorityUnchanged(before, 'Run comparison');
    return comparison;
  }

  #engineeringStatePair() {
    return Object.freeze({
      execution: this.executionAuthority.getState(),
      results: this.resultsAuthority.getState(),
    });
  }

  #assertAuthorityUnchanged(before, operation) {
    if (this.executionAuthority.getState() === before.execution
      && this.resultsAuthority.getState() === before.results) return;
    const error = new Error(`${operation} changed native engineering authority.`);
    error.code = 'LFEA_VIEW_CONTEXT_AUTHORITY_MUTATION';
    throw error;
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
      this.sourceController.getPreFlight(),
      this.executionAuthority.getState(),
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
      nativeHistory: this.historySnapshot,
      nativeComparison: this.comparisonController.getState(),
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

function buildPublicApi(runtime) {
  return Object.freeze({
    ...buildNativeApi(runtime),
    ...buildVerificationApi(runtime),
    destroy: () => runtime.destroy(),
  });
}

function buildNativeApi(runtime) {
  return {
    getIdentity: () => runtime.identity,
    getApplicationState: () => runtime.applicationState(),
    activateView: (viewId) => { runtime.requireActive(); return runtime.layout.activate(viewId); },
    getActiveView: () => { runtime.requireActive(); return runtime.layout.getActiveView(); },
    getGovernedJourney: () => { runtime.requireActive(); return runtime.governedJourney; },
    getNonAuthoritativePersistenceState: () => { runtime.requireActive(); return runtime.persistedState; },
    loadInputXmlSource: (input, options) => { runtime.requireActive(); return runtime.sourceController.loadSource(input, options); },
    authorizeInputXmlSourceUnit: (unit) => { runtime.requireActive(); return runtime.sourceController.authorizeUnit(unit); },
    authorizeInputXmlPreFlight: (approval) => { runtime.requireActive(); return runtime.sourceController.authorizePreFlight(approval); },
    getInputXmlSourceState: () => { runtime.requireActive(); return runtime.sourceController.getSnapshot(); },
    getInputXmlPreFlight: () => { runtime.requireActive(); return runtime.sourceController.getPreFlight(); },
    clearInputXmlSource: () => runtime.clearInputXmlSource(),
    runNativeAnalysis: (options = {}) => runtime.executeNativeAnalysis(options),
    recoverNativeResults: () => runtime.recoverCurrentResults(),
    getNativeExecutionState: () => { runtime.requireActive(); return runtime.executionAuthority.getState(); },
    getCurrentNativeExecution: () => { runtime.requireActive(); return runtime.executionAuthority.getCurrentExecution(); },
    getCurrentQualifiedNativeExecution: () => { runtime.requireActive(); return runtime.executionAuthority.getCurrentQualifiedExecution(); },
    getNativeResultsState: () => { runtime.requireActive(); return runtime.resultsAuthority.getState(); },
    getCurrentNativeResults: () => { runtime.requireActive(); return runtime.resultsAuthority.getCurrentResults(); },
    getNativeRunHistory: () => { runtime.requireActive(); return runtime.historySnapshot; },
    getNativeRunRecord: (runId) => { runtime.requireActive(); return runtime.runHistory.getRecord(runId); },
    getSelectedNativeRunRecord: () => { runtime.requireActive(); return runtime.runHistory.getSelectedRecord(); },
    selectNativeRun: (runId) => runtime.selectHistoryRun(runId),
    compareNativeRuns: (left, right) => runtime.compareHistoryRuns(left, right),
    getNativeRunComparison: () => { runtime.requireActive(); return runtime.comparisonController.getState(); },
  };
}

function buildVerificationApi(runtime) {
  const workbench = runtime.workbenchController;
  const active = (body) => (...args) => { runtime.requireActive(); return body(...args); };
  return {
    getState: active(() => workbench.getState()),
    importDocument: active((value) => workbench.importDocument(value)),
    exportDocument: active(() => workbench.exportDocument()),
    exportPackage: active(() => workbench.exportPackage()),
    exportEvidence: active(() => workbench.exportEvidence()),
    loadMockData: active(() => workbench.loadMockData()),
    run: active(() => workbench.run()),
    cancelRun: active(() => workbench.cancelRun()),
    runBenchmark: active(() => workbench.runBenchmark()),
    getBenchmarkReport: active(() => workbench.getBenchmarkReport()),
    undo: active(() => workbench.undo()),
    redo: active(() => workbench.redo()),
  };
}

function journeyStatus(journey, resultsState, recentSourceMetadata) {
  if (journey.source.status === 'EMPTY') return emptyJourneyStatus(recentSourceMetadata);
  if (resultsState?.currentness === 'STALE') return 'Retained recovered Results are STALE relative to current raw/source/model authority; current engineering values are hidden.';
  if (resultsState?.currentness === 'CURRENT') return 'Current governed B-3.4 recovery is available in Results. Raw and recovered quantities remain separate authorities.';
  if (journey.analysis.executionCurrentness === 'STALE') return 'A retained native execution is STALE relative to current source/review/model authority; it is not current evidence.';
  if (journey.analysis.currentQualifiedExecutionAvailable) return 'Current native raw solver execution is qualified. Governed B-3.4 recovery can produce current Results.';
  if (journey.analysis.status === 'BLOCKED') return 'Native InputXML pre-FEA is BLOCKED. Review retained findings; no solve authorization exists.';
  if (journey.analysis.readyToRun) return 'Reviewed pre-FEA authorization is sealed. Native raw solve execution is ready.';
  if (journey.review.status === 'REVIEW_REQUIRED') return 'Native InputXML pre-FEA requires explicit engineering review before solve authorization can be sealed.';
  return 'Native InputXML source is retained; complete governed pre-FEA preparation before execution.';
}

function emptyJourneyStatus(recent) {
  if (!recent) return 'Import a governed CAESAR II InputXML source to begin Source → Review → Model preparation.';
  return `No governed source is loaded. Recent source metadata only: ${recent.fileName} · ${recent.contentSha256.slice(0, 12)}…. Re-import is required before Review or Analysis.`;
}
