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
import { authorizedEnrichmentConsumerController } from './workspace/enrichment/authorized-enrichment-runtime.js';
import { createAuthorizedEnrichmentWorkspaceApi } from './workspace/enrichment/authorized-enrichment-workspace-api.js';
import { buildEmpiricalV3SourceBoundExecutionDependency, executeAuthorizedEmpiricalV3SourceBoundThermalRom } from './workspace/engineering-loads/adapters/empirical-v3-authorized-source-bound-execution.js';
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
const empiricalV3Safety = mountEmpiricalV3SafetyWorkbench(applicationRoot, { documentRef: applicationRoot.ownerDocument, urlApi: applicationRoot.ownerDocument.defaultView?.URL });
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
  loadEmpiricalV3SafetyPresentationPackage(value) { return empiricalV3Safety.loadPackage(value); },
  loadEmpiricalV3CalculationEvidence(value) { return empiricalV3Safety.loadCalculationEvidence(value); },
  loadEmpiricalV3ResultReviewReceipt(value) { return empiricalV3Safety.loadResultReviewReceipt(value); },
  loadEmpiricalV3AuditReadiness(value) { return empiricalV3Safety.loadAuditReadiness(value); },
  reviewEmpiricalV3CalculationResult(review) { return empiricalV3Safety.reviewResult(review); },
  clearEmpiricalV3SafetyPresentationPackage() { empiricalV3Safety.clear(); },
  getEmpiricalV3SafetyState() { return empiricalV3Safety.getSnapshot(); },
  getEmpiricalV3SafetyPresentationPackage() { return empiricalV3Safety.getPackage(); },
  getEmpiricalV3CalculationEvidence() { return empiricalV3Safety.getCalculationEvidence(); },
  getEmpiricalV3ResultReviewReceipt() { return empiricalV3Safety.getResultReviewReceipt(); },
  getEmpiricalV3AuditReadiness() { return empiricalV3Safety.getAuditReadiness(); },
  getEmpiricalV3LastConfirmationReceipt() { return empiricalV3Safety.getLastConfirmationReceipt(); },
  openEmpiricalV3SafetyRisk(riskId) { return empiricalV3Safety.openRisk(riskId); },
  buildEmpiricalV3SourceBoundExecutionDependency(romInput) { return buildEmpiricalV3SourceBoundExecutionDependency(romInput); },
  executeEmpiricalV3SourceBoundThermalRom(input) {
    const packageValue = empiricalV3Safety.getPackage();
    if (!packageValue?.calculationAuthorization || packageValue.calculationAuthorization.semanticHash !== input?.authorization?.semanticHash) {
      throw new Error('Workspace execution requires the matching current sealed Empirical V3 safety package.');
    }
    const execution = executeAuthorizedEmpiricalV3SourceBoundThermalRom(input);
    empiricalV3Safety.loadCalculationEvidence(execution.evidence);
    return execution;
  },
  createEmpiricalV3AuditExportRecord() { return empiricalV3Safety.createAuditExport(); },
  getPreflightReviewModel() { return preflightUi.getProjection(); },
  destroy() {
    preflightSubscriptions.forEach((unsubscribe) => unsubscribe()); empiricalV3Safety.destroy(); preflightUi.destroy(); linearPipingResults.destroy(); linearPipingInputXmlSource.destroy(); coreWorkspace.destroy();
  },
});

globalThis.AnalysisWorkspace = workspace;
if (import.meta.hot) import.meta.hot.dispose(() => workspace.destroy());
