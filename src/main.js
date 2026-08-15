import './index.css';
import './workspace/workspace.css';
import './workspace/dataset.css';
import './workspace/viewport-renderer.css';
import './workspace/analysis-session.css';
import './workspace/analysis-ledger.css';
import './workspace/enrichment/first-cut-workbench.css';
import './workspace/linear-piping-results-workbench.css';
import './workspace/lfea-preflight-phase1.css';
import './workspace/empirical-v3-safety-workbench.css';
import { bootstrapAnalysisWorkspace } from './workspace/bootstrap.js';
import { WORKSPACE_ANALYSIS_TARGET_ID } from './workspace/analysis-context.js';
import { authorizedEnrichmentConsumerController } from './workspace/enrichment/authorized-enrichment-runtime.js';
import { createAuthorizedEnrichmentWorkspaceApi } from './workspace/enrichment/authorized-enrichment-workspace-api.js';
import {
  clearEmpiricalV3GovernedPreparedExecution,
  EMPIRICAL_V3_ANALYSIS_CAPABILITY_ID,
  getEmpiricalV3GovernedPreparedExecution,
  setEmpiricalV3GovernedPreparedExecution,
} from './workspace/engineering-loads/adapters/empirical-v3-analysis-capability.js';
import { buildEmpiricalV3SourceBoundExecutionDependency } from './workspace/engineering-loads/adapters/empirical-v3-authorized-source-bound-execution.js';
import {
  applyEmpiricalV3LiveAuditReadiness,
  applyEmpiricalV3LiveResultReview,
  createEmpiricalV3LiveAuditExport,
  reconcileEmpiricalV3LiveAuthorization,
} from './workspace/engineering-loads/adapters/empirical-v3-live-run-orchestration.js';
import { ENGINEERING_MODEL_EVENTS } from './workspace/engineering-model-controller.js';
import { EventBus } from './workspace/event-bus.js';
import { retireStandaloneInputXmlAnalyzerEntry } from './workspace/linear-piping-analyzer-integration.js';
import { mountLinearPipingInputXmlSourceWorkflow } from './workspace/linear-piping-inputxml-source-workflow.js';
import { mountLinearPipingResultsWorkbench } from './workspace/linear-piping-results-workbench.js';
import { mountLfeaPreflightUi } from './workspace/lfea-preflight-ui.js';
import { mountEmpiricalV3SafetyWorkbench } from './workspace/empirical-v3-safety-workbench.js';
import { EVENT_TOPICS } from './workspace/event-topics.js';

const applicationRoot = document.getElementById('root');
const coreWorkspace = bootstrapAnalysisWorkspace(applicationRoot);
const authorizedEnrichmentApi = createAuthorizedEnrichmentWorkspaceApi({
  documentRef: applicationRoot.ownerDocument,
  controller: authorizedEnrichmentConsumerController,
  onEmpiricalAuthorizationChanged(state) { EventBus.publish(ENGINEERING_MODEL_EVENTS.CHANGED, { reason: 'authorization-changed', authorizationState: state }); },
  onEmpiricalChanged(execution) { EventBus.publish(ENGINEERING_MODEL_EVENTS.CHANGED, { reason: 'calculated', distribution: execution.distribution, execution }); },
  onEmpiricalFailed(error) { EventBus.publish(ENGINEERING_MODEL_EVENTS.FAILED, { message: error instanceof Error ? error.message : String(error), code: error?.code || 'EMPIRICAL_RUNTIME_EXECUTION_FAILED' }); },
});
const linearPipingInputXmlSource = mountLinearPipingInputXmlSourceWorkflow(applicationRoot, { documentRef: applicationRoot.ownerDocument });
const linearPipingResults = mountLinearPipingResultsWorkbench(applicationRoot, { documentRef: applicationRoot.ownerDocument, urlApi: applicationRoot.ownerDocument.defaultView?.URL });
let empiricalV3ObservedDatasetBasis = null;
const empiricalV3Safety = mountEmpiricalV3SafetyWorkbench(applicationRoot, {
  documentRef: applicationRoot.ownerDocument,
  urlApi: applicationRoot.ownerDocument.defaultView?.URL,
  isRunReady(packageValue) { return preparedExecutionMatchesPackage(getEmpiricalV3GovernedPreparedExecution(), packageValue); },
  onRunRequested({ packageValue }) {
    return runPreparedEmpiricalV3ThroughAnalysisCoordinator(packageValue);
  },
  onResultReviewCreated(receipt, packageValue, evidence) {
    return applyEmpiricalV3LiveResultReview({ packageValue, evidence, resultReview: receipt, auditMetadata: receipt.auditMetadata }).nextPackage;
  },
  onAuditReadinessCreated(readiness, resultReview, packageValue, evidence) {
    return applyEmpiricalV3LiveAuditReadiness({ packageValue, evidence, resultReview, auditReadiness: readiness }).nextPackage;
  },
  onAuditExportRequested({ packageValue, evidence, resultReview, auditReadiness }) {
    return createEmpiricalV3LiveAuditExport({ packageValue, evidence, resultReview, auditReadiness });
  },
});
const empiricalV3SourceSubscriptions = [
  EventBus.subscribe(EVENT_TOPICS.WORKSPACE_SNAPSHOT_CHANGED, ({ snapshot }) => {
    const nextBasis = empiricalV3DatasetBasis(snapshot);
    if (empiricalV3ObservedDatasetBasis !== null && nextBasis !== empiricalV3ObservedDatasetBasis) {
      invalidateEmpiricalV3ForGoverningChange();
    }
    empiricalV3ObservedDatasetBasis = nextBasis;
  }),
  EventBus.subscribe(ENGINEERING_MODEL_EVENTS.CHANGED, ({ reason }) => {
    if (reason === 'project-data-changed' || reason === 'master-data-changed') {
      invalidateEmpiricalV3ForGoverningChange();
    }
  }),
];
const linearPipingAnalyzerIntegration = retireStandaloneInputXmlAnalyzerEntry(applicationRoot);
const preflightUi = mountLfeaPreflightUi(applicationRoot, { getModel: () => ({ sharedModel: coreWorkspace.getSharedModel() }) });
const preflightSubscriptions = [EventBus.subscribe(EVENT_TOPICS.DATASET_LOADED, () => preflightUi.render()), EventBus.subscribe(EVENT_TOPICS.DATASET_CLEARED, () => preflightUi.render())];

const workspace = Object.freeze({
  ...coreWorkspace,
  ...authorizedEnrichmentApi,
  loadLinearPipingInputXmlSource(input, options) { return linearPipingInputXmlSource.loadSource(input, options); },
  authorizeLinearPipingInputXmlSourceUnit(unit) { return linearPipingInputXmlSource.authorizeUnit(unit); },
  authorizeLinearPipingInputXmlPreFlight(approval) { return linearPipingInputXmlSource.authorizePreFlight(approval); },
  getLinearPipingInputXmlSourceState() { return linearPipingInputXmlSource.getSnapshot(); },
  getLinearPipingInputXmlPreFlight() { return linearPipingInputXmlSource.getPreFlight(); },
  getLinearPipingInputXmlAnalyzerIntegrationPolicy() { return linearPipingAnalyzerIntegration; },
  clearLinearPipingInputXmlSource() { linearPipingInputXmlSource.clear(); },
  importLinearPipingResultPackage(value) { return linearPipingResults.loadPackage(value); },
  checkLinearPipingRunRequest(value) { return linearPipingResults.checkRequest(value); },
  getLinearPipingPreRunCheck() { return linearPipingResults.getPreRunCheck(); },
  clearLinearPipingResultPackage() { linearPipingResults.clear(); },
  getLinearPipingResultState() { return linearPipingResults.getSnapshot(); },
  getLinearPipingPresentation() { return linearPipingResults.getPresentation(); },
  createLinearPipingAuditExportRecord() { return linearPipingResults.createAuditExport(); },
  createLinearPipingEngineeringExportRecords() { return linearPipingResults.createEngineeringExports(); },
  loadEmpiricalV3SafetyPresentationPackage(value) {
    const packageValue = empiricalV3Safety.loadPackage(value);
    if (!preparedExecutionMatchesPackage(getEmpiricalV3GovernedPreparedExecution(), packageValue)) clearEmpiricalV3GovernedPreparedExecution();
    empiricalV3Safety.refresh();
    return packageValue;
  },
  loadEmpiricalV3CalculationEvidence(value) { return empiricalV3Safety.loadCalculationEvidence(value); },
  loadEmpiricalV3ResultReviewReceipt(value) { return empiricalV3Safety.loadResultReviewReceipt(value); },
  loadEmpiricalV3AuditReadiness(value) { return empiricalV3Safety.loadAuditReadiness(value); },
  reviewEmpiricalV3CalculationResult(review) { return empiricalV3Safety.reviewResult(review); },
  prepareEmpiricalV3Audit() { return empiricalV3Safety.prepareAudit(); },
  clearEmpiricalV3SafetyPresentationPackage() { clearEmpiricalV3GovernedPreparedExecution(); empiricalV3Safety.clear(); },
  getEmpiricalV3SafetyState() { return empiricalV3Safety.getSnapshot(); },
  getEmpiricalV3SafetyPresentationPackage() { return empiricalV3Safety.getPackage(); },
  getEmpiricalV3CalculationEvidence() { return empiricalV3Safety.getCalculationEvidence(); },
  getEmpiricalV3ResultReviewReceipt() { return empiricalV3Safety.getResultReviewReceipt(); },
  getEmpiricalV3AuditReadiness() { return empiricalV3Safety.getAuditReadiness(); },
  getEmpiricalV3LastConfirmationReceipt() { return empiricalV3Safety.getLastConfirmationReceipt(); },
  openEmpiricalV3SafetyRisk(riskId) { return empiricalV3Safety.openRisk(riskId); },
  buildEmpiricalV3SourceBoundExecutionDependency(romInput) { return buildEmpiricalV3SourceBoundExecutionDependency(romInput); },
  prepareEmpiricalV3SourceBoundExecution(input) { return prepareEmpiricalV3SourceBoundExecution(input); },
  clearEmpiricalV3PreparedExecution() { clearEmpiricalV3GovernedPreparedExecution(); empiricalV3Safety.refresh(); },
  getEmpiricalV3PreparedExecutionDependency() { return getEmpiricalV3GovernedPreparedExecution()?.dependency ?? null; },
  executeEmpiricalV3SourceBoundThermalRom(input) {
    const packageValue = empiricalV3Safety.getPackage();
    prepareEmpiricalV3SourceBoundExecution(input);
    return runPreparedEmpiricalV3ThroughAnalysisCoordinator(packageValue).then((result) => {
      empiricalV3Safety.loadPackage(result.nextPackage);
      empiricalV3Safety.loadCalculationEvidence(result.evidence);
      return result.execution;
    });
  },
  reconcileEmpiricalV3CurrentAuthorization(currentAuthorization, auditMetadata) {
    const result = reconcileEmpiricalV3LiveAuthorization({ packageValue: empiricalV3Safety.getPackage(), currentAuthorization, auditMetadata });
    if (!result.current) clearEmpiricalV3GovernedPreparedExecution();
    empiricalV3Safety.loadPackage(result.nextPackage); return result;
  },
  createEmpiricalV3AuditExportRecord() { return empiricalV3Safety.createAuditExport(); },
  getPreflightReviewModel() { return preflightUi.getProjection(); },
  destroy() { preflightSubscriptions.forEach((unsubscribe) => unsubscribe()); empiricalV3SourceSubscriptions.forEach((unsubscribe) => unsubscribe()); clearEmpiricalV3GovernedPreparedExecution(); empiricalV3Safety.destroy(); preflightUi.destroy(); linearPipingResults.destroy(); linearPipingInputXmlSource.destroy(); coreWorkspace.destroy(); },
});

globalThis.AnalysisWorkspace = workspace;
if (import.meta.hot) import.meta.hot.dispose(() => workspace.destroy());

function prepareEmpiricalV3SourceBoundExecution(input) {
  const packageValue = empiricalV3Safety.getPackage();
  if (!packageValue?.workflow.canRunCalculation || !packageValue.calculationAuthorization) throw new Error('Prepare execution only from CALCULATION_AUTHORIZED workflow.');
  if (input?.currentAuthorization?.runId !== packageValue.runId) throw new Error('Prepared current authorization basis belongs to another run.');
  const dependency = buildEmpiricalV3SourceBoundExecutionDependency(input?.romInput);
  requireExecutionDependencyMatchesActiveWorkspace(dependency);
  const authorized = packageValue.calculationAuthorization.dependencies.find((row) => row.kind === dependency.kind && row.ref === dependency.ref);
  if (!authorized || authorized.semanticHash !== dependency.semanticHash) throw new Error('Prepared source-bound execution request is not in the sealed calculation authorization.');
  const snapshot = coreWorkspace.getSnapshot();
  if (snapshot.status !== 'ready' || !snapshot.dataset) throw new Error('Prepared V3 execution requires an active workspace dataset.');
  setEmpiricalV3GovernedPreparedExecution({
    authorizationSemanticHash: packageValue.calculationAuthorization.semanticHash,
    currentAuthorization: input.currentAuthorization,
    romInput: input.romInput,
    auditMetadata: input.auditMetadata ?? null,
    dependency,
    packageValue,
    datasetId: snapshot.dataset.datasetId,
    workspaceVersion: snapshot.engineeringVersion,
  });
  empiricalV3Safety.refresh();
  return dependency;
}

function runPreparedEmpiricalV3ThroughAnalysisCoordinator(packageValue) {
  const prepared = getEmpiricalV3GovernedPreparedExecution();
  if (!preparedExecutionMatchesPackage(prepared, packageValue)) throw new Error('Prepare the exact current source-bound V3 execution request before Run.');

  EventBus.publish(EVENT_TOPICS.ANALYSIS_SESSION_OPEN_REQUESTED, {
    analysisType: EMPIRICAL_V3_ANALYSIS_CAPABILITY_ID,
    targetId: WORKSPACE_ANALYSIS_TARGET_ID,
  });
  const session = coreWorkspace.getAnalysisSession()?.session;
  if (!session
    || session.analysisType !== EMPIRICAL_V3_ANALYSIS_CAPABILITY_ID
    || session.targetId !== WORKSPACE_ANALYSIS_TARGET_ID
    || session.status !== 'ready') {
    throw new Error('Empirical V3 governed analysis session is not ready.');
  }

  return new Promise((resolve, reject) => {
    let unsubscribeCompleted = () => {};
    let unsubscribeFailed = () => {};
    const matches = (payload) => payload.analysisType === EMPIRICAL_V3_ANALYSIS_CAPABILITY_ID
      && payload.targetId === WORKSPACE_ANALYSIS_TARGET_ID
      && payload.sessionId === session.sessionId;
    const cleanup = () => {
      unsubscribeCompleted();
      unsubscribeFailed();
    };
    const closeSession = () => {
      try { EventBus.publish(EVENT_TOPICS.ANALYSIS_SESSION_CLOSE_REQUESTED, {}); } catch { /* lifecycle cleanup only */ }
    };

    unsubscribeCompleted = EventBus.subscribe(EVENT_TOPICS.ANALYSIS_COMPLETED, (payload) => {
      if (!matches(payload)) return;
      cleanup();
      clearEmpiricalV3GovernedPreparedExecution();
      closeSession();
      const liveResult = payload.result?.results;
      if (!liveResult?.nextPackage || !liveResult?.evidence || !liveResult?.execution) {
        reject(new Error('Empirical V3 governed analysis completed without the sealed V3 result bundle.'));
        return;
      }
      resolve(liveResult);
    });
    unsubscribeFailed = EventBus.subscribe(EVENT_TOPICS.ANALYSIS_FAILED, (payload) => {
      if (!matches(payload)) return;
      cleanup();
      clearEmpiricalV3GovernedPreparedExecution();
      closeSession();
      const error = new Error(payload.message || 'Empirical V3 governed analysis failed.');
      error.code = payload.code || 'EMP_V3_GOVERNED_ANALYSIS_FAILED';
      error.details = payload.details || {};
      reject(error);
    });

    try {
      EventBus.publish(EVENT_TOPICS.ANALYSIS_REQUESTED, {
        analysisType: EMPIRICAL_V3_ANALYSIS_CAPABILITY_ID,
        targetId: WORKSPACE_ANALYSIS_TARGET_ID,
        sessionId: session.sessionId,
      });
    } catch (error) {
      cleanup();
      clearEmpiricalV3GovernedPreparedExecution();
      closeSession();
      reject(error);
    }
  });
}

function preparedExecutionMatchesPackage(prepared, packageValue) {
  if (!prepared || !packageValue?.workflow.canRunCalculation || !packageValue.calculationAuthorization) return false;
  if (prepared.authorizationSemanticHash !== packageValue.calculationAuthorization.semanticHash) return false;
  if (!executionDependencyMatchesActiveWorkspace(prepared.dependency)) return false;
  return packageValue.calculationAuthorization.dependencies.some((row) => (
    row.kind === prepared.dependency.kind && row.ref === prepared.dependency.ref && row.semanticHash === prepared.dependency.semanticHash
  ));
}

function empiricalV3DatasetBasis(snapshot) {
  const dataset = snapshot?.status === 'ready' ? snapshot.dataset : null;
  if (!dataset) return 'NO_ACTIVE_DATASET';
  return JSON.stringify([
    dataset.datasetId ?? null,
    dataset.version ?? null,
    dataset.sourceSha256 ?? null,
    dataset.sourceSnapshot?.sourceSemanticHash ?? null,
  ]);
}

function executionDependencyMatchesActiveWorkspace(dependency) {
  if (!dependency?.request?.dataset || !empiricalV3ObservedDatasetBasis || empiricalV3ObservedDatasetBasis === 'NO_ACTIVE_DATASET') return false;
  let active;
  try { active = JSON.parse(empiricalV3ObservedDatasetBasis); } catch { return false; }
  const requestDataset = dependency.request.dataset;
  const activeSharedModelSemanticHash = coreWorkspace.getSharedModel()?.semanticHash ?? null;
  return requestDataset.datasetId === active[0]
    && requestDataset.sourceSemanticHash === active[3]
    && Boolean(activeSharedModelSemanticHash)
    && requestDataset.sharedModelSemanticHash === activeSharedModelSemanticHash;
}

function requireExecutionDependencyMatchesActiveWorkspace(dependency) {
  if (!executionDependencyMatchesActiveWorkspace(dependency)) {
    throw new Error('Empirical V3 source-bound execution request does not match the active workspace dataset/shared-model authority.');
  }
}

function invalidateEmpiricalV3ForGoverningChange() {
  clearEmpiricalV3GovernedPreparedExecution();
  if (empiricalV3Safety.getPackage() || empiricalV3Safety.getCalculationEvidence()) empiricalV3Safety.clear();
}
