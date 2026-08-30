import { createLfeaPipelineAnalysisController } from './lfea-pipeline-analysis-controller.js';
import { mountLfeaPipelineCaseSelectionPanel } from './lfea-pipeline-case-selection-panel.js';
import { mountLfeaPipelineLayoutPanel } from './lfea-pipeline-layout-panel.js';
import { mountLfeaPipelineResultsPanel } from './lfea-pipeline-results-panel.js';
import { mountLfeaPipelineRunPanel } from './lfea-pipeline-run-panel.js';
import { mountLfeaPipelineExportPanel } from './lfea-pipeline-export-panel.js';
import { mountLfeaPipelineLoadCaseAuthoringPanel } from './lfea-pipeline-load-case-authoring-panel.js';
import { mountLfeaPipelineModelRepairPanel } from './lfea-pipeline-model-repair-panel.js';
import { mountLfeaModelReviewPanel } from './lfea-model-review/lfea-model-review-panel.js';
import { mountLfeaCommonErrorCheckPanel } from './lfea-diagnostics/lfea-error-check-panel.js';
import { mountLfeaResultsAuthorityPanel } from './lfea-results-authority/lfea-results-authority-panel.js';

/** Shared presentation surface for the LFEA pipeline. */
export function mountLfeaPipelineAnalysisSurface(options) {
  const shell = options.resultsHost?.closest?.('[data-role="lfea-pipeline-shell"]') ?? null;
  const runHost = options.runHost ?? shell?.querySelector?.('[data-host-group="RUN"]');
  const outputHost = options.outputHost ?? options.resultsHost;
  const exportHost = options.exportHost ?? shell?.querySelector?.('[data-host-group="EXPORT"]');
  if (!runHost || !outputHost || !exportHost) {
    throw new TypeError('LFEA analysis surface requires native Run, Output and Export hosts.');
  }

  const analysisController = createLfeaPipelineAnalysisController({});
  let runPanel = null;
  const caseSelectionPanel = mountLfeaPipelineCaseSelectionPanel(options.loadCaseHost, {
    documentRef: options.documentRef,
    getPreFlight: options.getPreFlight,
    onApplyCaseSelection(caseIds) {
      const result = options.onApplyCaseSelection?.(caseIds);
      runPanel?.refresh();
      return result;
    },
  });
  const layoutPanel = mountLfeaPipelineLayoutPanel(options.loadCaseHost, {
    documentRef: options.documentRef,
    getPreFlight: options.getPreFlight,
  });
  const loadCaseAuthoringPanel = mountLfeaPipelineLoadCaseAuthoringPanel(options.loadCaseHost, {
    documentRef: options.documentRef,
    getNodeIds: options.getNodeIds,
  });
  runPanel = mountLfeaPipelineRunPanel(runHost, {
    documentRef: options.documentRef,
    getPreFlight: options.getPreFlight,
    onAnalyze: options.onAnalyze,
  });
  const resultsPanel = mountLfeaPipelineResultsPanel(outputHost, {
    documentRef: options.documentRef,
    onExportCsv: options.onExportCsv,
  });
  const resultsAuthorityPanel = mountLfeaResultsAuthorityPanel(outputHost, {
    documentRef: options.documentRef,
  });
  const exportPanel = mountLfeaPipelineExportPanel(exportHost, {
    documentRef: options.documentRef,
    getResultsPanel: () => resultsPanel,
    onExportCsv: options.onExportCsv,
    onExportCompleted: options.onExportCompleted,
  });
  const modelRepairPanel = mountLfeaPipelineModelRepairPanel(options.sourceHost, {
    documentRef: options.documentRef,
    getSourceText: options.getSourceText,
    onRepaired: options.onRepaired,
  });
  const modelReviewPanel = mountLfeaModelReviewPanel(options.sourceHost, {
    documentRef: options.documentRef,
    getPreFlight: options.getPreFlight,
  });
  const errorCheckPanel = mountLfeaCommonErrorCheckPanel(options.sourceHost, {
    documentRef: options.documentRef,
    getPreFlight: options.getPreFlight,
  });

  const onSourceRefresh = () => runPanel.refresh();
  const onTaskActivated = (event) => {
    const stepId = event?.detail?.stepId;
    if (stepId === 'RUN') runPanel.refresh();
    if (stepId === 'OUTPUT') resultsAuthorityPanel.refresh();
    if (stepId === 'EXPORT') exportPanel.refresh();
  };
  options.sourceHost.addEventListener?.('lfea-source-presentation-refresh', onSourceRefresh);
  shell?.addEventListener?.('lfea-pipeline-task-activated', onTaskActivated);

  return Object.freeze({
    analysisController,
    modelRepairPanel,
    modelReviewPanel,
    errorCheckPanel,
    caseSelectionPanel,
    layoutPanel,
    runPanel,
    resultsPanel,
    exportPanel,
    resultsAuthorityPanel,
    loadCaseAuthoringPanel,
    refreshLoadCaseStep() {
      caseSelectionPanel.refresh();
      layoutPanel.refresh();
      loadCaseAuthoringPanel.refresh();
      runPanel.refresh();
    },
    refreshRunStep() { runPanel.refresh(); },
    refreshSourceStep() {
      modelRepairPanel.refresh();
      modelReviewPanel.refresh();
      errorCheckPanel.refresh();
      runPanel.refresh();
    },
    refreshResultsStep() {
      resultsAuthorityPanel.refresh();
      exportPanel.refresh();
    },
    destroy() {
      options.sourceHost.removeEventListener?.('lfea-source-presentation-refresh', onSourceRefresh);
      shell?.removeEventListener?.('lfea-pipeline-task-activated', onTaskActivated);
      caseSelectionPanel.destroy();
      layoutPanel.destroy();
      runPanel.destroy();
      resultsPanel.destroy();
      exportPanel.destroy();
      resultsAuthorityPanel.destroy();
      loadCaseAuthoringPanel.destroy();
      modelRepairPanel.destroy();
      modelReviewPanel.destroy();
      errorCheckPanel.destroy();
    },
  });
}
