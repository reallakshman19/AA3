export function buildLfeaStandalonePublicApi(runtime) {
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
    activateView: (viewId) => active(runtime, () => runtime.layout.activate(viewId)),
    getActiveView: () => active(runtime, () => runtime.layout.getActiveView()),
    getGovernedJourney: () => active(runtime, () => runtime.governedJourney),
    getNonAuthoritativePersistenceState: () => active(runtime, () => runtime.persistedState),
    loadInputXmlSource: (input, options) => active(runtime, () => runtime.sourceController.loadSource(input, options)),
    authorizeInputXmlSourceUnit: (unit) => active(runtime, () => runtime.sourceController.authorizeUnit(unit)),
    authorizeInputXmlPreFlight: (approval) => active(runtime, () => runtime.sourceController.authorizePreFlight(approval)),
    getInputXmlSourceState: () => active(runtime, () => runtime.sourceController.getSnapshot()),
    getInputXmlPreFlight: () => active(runtime, () => runtime.sourceController.getPreFlight()),
    clearInputXmlSource: () => runtime.clearInputXmlSource(),
    runNativeAnalysis: (options = {}) => runtime.executeNativeAnalysis(options),
    recoverNativeResults: () => runtime.recoverCurrentResults(),
    getNativeExecutionState: () => active(runtime, () => runtime.executionAuthority.getState()),
    getCurrentNativeExecution: () => active(runtime, () => runtime.executionAuthority.getCurrentExecution()),
    getCurrentQualifiedNativeExecution: () => active(runtime, () => runtime.executionAuthority.getCurrentQualifiedExecution()),
    getNativeResultsState: () => active(runtime, () => runtime.resultsAuthority.getState()),
    getCurrentNativeResults: () => active(runtime, () => runtime.resultsAuthority.getCurrentResults()),
    getNativePublicationReadiness: () => active(runtime, () => runtime.publicationReadiness),
    getNativeRunHistory: () => active(runtime, () => runtime.historySnapshot),
    getNativeRunRecord: (runId) => active(runtime, () => runtime.runHistory.getRecord(runId)),
    getSelectedNativeRunRecord: () => active(runtime, () => runtime.runHistory.getSelectedRecord()),
    selectNativeRun: (runId) => runtime.selectHistoryRun(runId),
    compareNativeRuns: (left, right) => runtime.compareHistoryRuns(left, right),
    getNativeRunComparison: () => active(runtime, () => runtime.comparisonController.getState()),
    getNativeVerification: () => active(runtime, () => runtime.verificationController.getVerification()),
    getNativeEvidenceDossier: () => active(runtime, () => runtime.verificationController.getDossier()),
    createNativeEvidenceDossier: () => active(runtime, () => runtime.verificationController.createDossier()),
  };
}

function buildVerificationApi(runtime) {
  const workbench = runtime.workbenchController;
  return {
    getState: () => active(runtime, () => workbench.getState()),
    importDocument: (value) => active(runtime, () => workbench.importDocument(value)),
    exportDocument: () => active(runtime, () => workbench.exportDocument()),
    exportPackage: () => active(runtime, () => workbench.exportPackage()),
    exportEvidence: () => active(runtime, () => workbench.exportEvidence()),
    loadMockData: () => active(runtime, () => workbench.loadMockData()),
    run: () => active(runtime, () => workbench.run()),
    cancelRun: () => active(runtime, () => workbench.cancelRun()),
    runBenchmark: () => active(runtime, () => workbench.runBenchmark()),
    getBenchmarkReport: () => active(runtime, () => workbench.getBenchmarkReport()),
    undo: () => active(runtime, () => workbench.undo()),
    redo: () => active(runtime, () => workbench.redo()),
  };
}

function active(runtime, body) {
  runtime.requireActive();
  return body();
}
