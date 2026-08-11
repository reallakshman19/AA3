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
import { createLfeaPersistenceAdapter, getLfeaBrowserStorage } from './persistence.js';
import { clearLfeaStandaloneLayout, renderLfeaStandaloneLayout } from './standalone-layout.js';

export const LFEA_STANDALONE_APPLICATION_SCHEMA = 'lfea-standalone-application/v1';

/** Standalone LFEA composition root with governed execution, recovery, History, Compare, and bounded UI persistence. */
export function bootstrapLfeaStandalone(rootElement, options = {}) {
  if (!rootElement?.ownerDocument) throw new TypeError('Standalone LFEA application root was not found.');

  const identity = createApplicationIdentity(options.identity);
  const storage = Object.hasOwn(options, 'storage')
    ? options.storage
    : getLfeaBrowserStorage(rootElement.ownerDocument.defaultView);
  const persistence = createLfeaPersistenceAdapter(storage);
  let persistedState = persistence.load();
  const layout = renderLfeaStandaloneLayout(rootElement, identity, {
    initialViewId: persistedState.activeView,
    onViewActivated(viewId) {
      persistence.saveActiveView(viewId);
      persistedState = persistence.load();
    },
  });
  const executionAuthority = createLfeaNativeExecutionAuthority();
  const resultsAuthority = createLfeaNativeResultsAuthority();
  const runHistory = createLfeaNativeRunHistory();
  const comparisonController = createLfeaNativeComparisonController(layout.comparisonRoot, {
    lookupRun: (runId) => runHistory.getRecord(runId),
  });
  const journeyView = mountLfeaGovernedJourneyView({
    reviewRoot: layout.reviewRoot,
    modelRoot: layout.modelRoot,
    analysisRoot: layout.analysisRoot,
    onRunNativeAnalysis: () => executeNativeAnalysis(),
  });
  const resultsView = mountLfeaNativeResultsView(layout.resultsRoot);
  const historyView = mountLfeaNativeHistoryView(layout.historyRoot, {
    onSelectRun: (runId) => selectHistoryRun(runId),
  });
  let governedJourney = createLfeaGovernedJourneyProjection({
    executionState: executionAuthority.getState(),
  });
  let historySnapshot = runHistory.getSnapshot();
  journeyView.update(governedJourney);
  resultsView.update(executionAuthority.getState(), resultsAuthority.getState());
  historyView.update(historySnapshot);
  comparisonController.refresh(historySnapshot);

  const refreshJourney = (sourceSnapshot, preFlight) => {
    persistRecentSource(sourceSnapshot);
    executionAuthority.reconcile(preFlight);
    resultsAuthority.reconcile(preFlight, executionAuthority.getState());
    governedJourney = createLfeaGovernedJourneyProjection({
      sourceSnapshot,
      preFlight,
      executionState: executionAuthority.getState(),
    });
    journeyView.update(governedJourney);
    resultsView.update(executionAuthority.getState(), resultsAuthority.getState());
    historySnapshot = currentHistorySnapshot(sourceSnapshot, preFlight);
    historyView.update(historySnapshot);
    comparisonController.refresh(historySnapshot);
    layout.statusRoot.textContent = journeyStatus(
      governedJourney,
      resultsAuthority.getState(),
      persistedState.recentSourceMetadata,
    );
    return governedJourney;
  };

  const sourceController = new LfeaStandaloneInputXmlSourceController(
    layout.sourceRoot,
    rootElement.ownerDocument,
    refreshJourney,
  );
  const workbenchController = new LfeaWorkbenchController(layout.workbenchRoot, options.workbench);
  let destroyed = false;

  sourceController.init();
  workbenchController.init();
  refreshJourney(sourceController.getSnapshot(), sourceController.getPreFlight());

  const requireActive = () => {
    if (destroyed) {
      const error = new Error('Standalone LFEA application has been destroyed.');
      error.code = 'LFEA_STANDALONE_DESTROYED';
      throw error;
    }
  };
  const refreshCurrent = () => refreshJourney(
    sourceController.getSnapshot(),
    sourceController.getPreFlight(),
  );

  function persistRecentSource(snapshot) {
    if (!snapshot?.fileName || !snapshot.contentSha256 || !snapshot.sourceUnit) return;
    const metadata = { fileName: snapshot.fileName, contentSha256: snapshot.contentSha256, sourceUnit: snapshot.sourceUnit };
    try { persistence.saveRecentSourceMetadata(metadata); } catch { return; }
    persistedState = persistence.load();
  }

  function currentHistorySnapshot(sourceSnapshot, preFlight) {
    return runHistory.getSnapshot({
      sourceSnapshot,
      preFlight,
      executionState: executionAuthority.getState(),
      resultsState: resultsAuthority.getState(),
    });
  }

  function archiveCurrentRun() {
    return runHistory.archive({
      applicationIdentity: identity,
      sourceSnapshot: sourceController.getSnapshot(),
      preFlight: sourceController.getPreFlight(),
      executionState: executionAuthority.getState(),
      resultsState: resultsAuthority.getState(),
    });
  }

  function selectHistoryRun(runId) {
    requireActive();
    const currentExecution = executionAuthority.getState();
    const currentResults = resultsAuthority.getState();
    const record = runHistory.selectRun(runId);
    historySnapshot = currentHistorySnapshot(
      sourceController.getSnapshot(),
      sourceController.getPreFlight(),
    );
    historyView.update(historySnapshot);
    comparisonController.refresh(historySnapshot);
    assertAuthorityUnchanged(currentExecution, currentResults, 'History selection');
    return record;
  }

  function compareHistoryRuns(leftRunId, rightRunId) {
    requireActive();
    const currentExecution = executionAuthority.getState();
    const currentResults = resultsAuthority.getState();
    const comparison = comparisonController.compare(leftRunId, rightRunId);
    assertAuthorityUnchanged(currentExecution, currentResults, 'Run comparison');
    return comparison;
  }

  function assertAuthorityUnchanged(expectedExecution, expectedResults, operation) {
    if (executionAuthority.getState() !== expectedExecution || resultsAuthority.getState() !== expectedResults) {
      const error = new Error(`${operation} changed native engineering authority.`);
      error.code = 'LFEA_VIEW_CONTEXT_AUTHORITY_MUTATION';
      throw error;
    }
  }

  function executeNativeAnalysis(runOptions = {}) {
    requireActive();
    try {
      const state = executionAuthority.run(sourceController.getPreFlight(), runOptions);
      resultsAuthority.recover(sourceController.getPreFlight(), state);
      archiveCurrentRun();
      refreshCurrent();
      layout.activate('results');
      return state;
    } catch (error) {
      refreshCurrent();
      layout.statusRoot.textContent = `Native analysis/Results/History blocked: ${error?.code ?? error?.message ?? 'UNKNOWN_ERROR'}`;
      throw error;
    }
  }

  function recoverCurrentResults() {
    requireActive();
    const state = resultsAuthority.recover(
      sourceController.getPreFlight(),
      executionAuthority.getState(),
    );
    archiveCurrentRun();
    refreshCurrent();
    layout.activate('results');
    return state;
  }

  return Object.freeze({
    getIdentity: () => identity,
    getApplicationState() {
      requireActive();
      return Object.freeze({
        identity,
        activeView: layout.getActiveView(),
        source: sourceController.getSnapshot(),
        governedJourney,
        nativeExecution: executionAuthority.getState(),
        nativeResults: resultsAuthority.getState(),
        nativeHistory: historySnapshot,
        nativeComparison: comparisonController.getState(),
        nonAuthoritativePersistence: persistedState,
      });
    },
    activateView(viewId) { requireActive(); return layout.activate(viewId); },
    getActiveView() { requireActive(); return layout.getActiveView(); },
    getGovernedJourney() { requireActive(); return governedJourney; },
    getNonAuthoritativePersistenceState() { requireActive(); return persistedState; },
    loadInputXmlSource(input, sourceOptions) { requireActive(); return sourceController.loadSource(input, sourceOptions); },
    authorizeInputXmlSourceUnit(unit) { requireActive(); return sourceController.authorizeUnit(unit); },
    authorizeInputXmlPreFlight(approval) { requireActive(); return sourceController.authorizePreFlight(approval); },
    getInputXmlSourceState() { requireActive(); return sourceController.getSnapshot(); },
    getInputXmlPreFlight() { requireActive(); return sourceController.getPreFlight(); },
    clearInputXmlSource() {
      requireActive();
      sourceController.clear();
      refreshCurrent();
      return sourceController.getSnapshot();
    },
    runNativeAnalysis(runOptions = {}) { return executeNativeAnalysis(runOptions); },
    recoverNativeResults() { return recoverCurrentResults(); },
    getNativeExecutionState() { requireActive(); return executionAuthority.getState(); },
    getCurrentNativeExecution() { requireActive(); return executionAuthority.getCurrentExecution(); },
    getCurrentQualifiedNativeExecution() { requireActive(); return executionAuthority.getCurrentQualifiedExecution(); },
    getNativeResultsState() { requireActive(); return resultsAuthority.getState(); },
    getCurrentNativeResults() { requireActive(); return resultsAuthority.getCurrentResults(); },
    getNativeRunHistory() { requireActive(); return historySnapshot; },
    getNativeRunRecord(runId) { requireActive(); return runHistory.getRecord(runId); },
    getSelectedNativeRunRecord() { requireActive(); return runHistory.getSelectedRecord(); },
    selectNativeRun(runId) { return selectHistoryRun(runId); },
    compareNativeRuns(leftRunId, rightRunId) { return compareHistoryRuns(leftRunId, rightRunId); },
    getNativeRunComparison() { requireActive(); return comparisonController.getState(); },

    // Verification-workbench compatibility API. It is not native piping execution.
    getState() { requireActive(); return workbenchController.getState(); },
    importDocument(value) { requireActive(); return workbenchController.importDocument(value); },
    exportDocument() { requireActive(); return workbenchController.exportDocument(); },
    exportPackage() { requireActive(); return workbenchController.exportPackage(); },
    exportEvidence() { requireActive(); return workbenchController.exportEvidence(); },
    loadMockData() { requireActive(); return workbenchController.loadMockData(); },
    run() { requireActive(); return workbenchController.run(); },
    cancelRun() { requireActive(); return workbenchController.cancelRun(); },
    runBenchmark() { requireActive(); return workbenchController.runBenchmark(); },
    getBenchmarkReport() { requireActive(); return workbenchController.getBenchmarkReport(); },
    undo() { requireActive(); return workbenchController.undo(); },
    redo() { requireActive(); return workbenchController.redo(); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      comparisonController.destroy();
      resultsAuthority.clearCurrentAuthority();
      executionAuthority.clearCurrentAuthority();
      runHistory.clear();
      sourceController.destroy();
      historyView.destroy();
      resultsView.destroy();
      journeyView.destroy();
      workbenchController.destroy();
      clearLfeaStandaloneLayout(rootElement);
    },
  });
}

function journeyStatus(journey, resultsState, recentSourceMetadata) {
  if (journey.source.status === 'EMPTY') {
    if (recentSourceMetadata) {
      return `No governed source is loaded. Recent source metadata only: ${recentSourceMetadata.fileName} · ${recentSourceMetadata.contentSha256.slice(0, 12)}…. Re-import is required before Review or Analysis.`;
    }
    return 'Import a governed CAESAR II InputXML source to begin Source → Review → Model preparation.';
  }
  if (resultsState?.currentness === 'STALE') return 'Retained recovered Results are STALE relative to current raw/source/model authority; current engineering values are hidden.';
  if (resultsState?.currentness === 'CURRENT') return 'Current governed B-3.4 recovery is available in Results. Raw and recovered quantities remain separate authorities.';
  if (journey.analysis.executionCurrentness === 'STALE') return 'A retained native execution is STALE relative to current source/review/model authority; it is not current evidence.';
  if (journey.analysis.currentQualifiedExecutionAvailable) return 'Current native raw solver execution is qualified. Governed B-3.4 recovery can produce current Results.';
  if (journey.analysis.status === 'BLOCKED') return 'Native InputXML pre-FEA is BLOCKED. Review retained findings; no solve authorization exists.';
  if (journey.analysis.readyToRun) return 'Reviewed pre-FEA authorization is sealed. Native raw solve execution is ready.';
  if (journey.review.status === 'REVIEW_REQUIRED') return 'Native InputXML pre-FEA requires explicit engineering review before solve authorization can be sealed.';
  return 'Native InputXML source is retained; complete governed pre-FEA preparation before execution.';
}

function createApplicationIdentity(value = {}) {
  const buildTime = text(value.buildTime) ?? (typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : null);
  return Object.freeze({
    schema: LFEA_STANDALONE_APPLICATION_SCHEMA,
    application: 'LFEA',
    mode: 'STANDALONE',
    applicationVersion: text(value.applicationVersion) ?? '0.0.0',
    buildSha: text(value.buildSha),
    buildTime,
  });
}
function text(value) { const result = String(value ?? '').trim(); return result || null; }
