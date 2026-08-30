import { createLfeaPipelineAnalysisController } from './lfea-pipeline-analysis-controller.js';
import { mountLfeaPipelineCaseSelectionPanel } from './lfea-pipeline-case-selection-panel.js';
import { mountLfeaPipelineLayoutPanel } from './lfea-pipeline-layout-panel.js';
import { mountLfeaPipelineResultsPanel } from './lfea-pipeline-results-panel.js';
import { mountLfeaPipelineRunPanel } from './lfea-pipeline-run-panel.js';
import { mountLfeaPipelineExportPanel } from './lfea-pipeline-export-panel.js';
import { mountLfeaPipelineResultsTaskVisibility } from './lfea-pipeline-results-task-visibility.js';
import { mountLfeaPipelineLoadCaseAuthoringPanel } from './lfea-pipeline-load-case-authoring-panel.js';
import { mountLfeaPipelineModelRepairPanel } from './lfea-pipeline-model-repair-panel.js';
import { mountLfeaModelReviewPanel } from './lfea-model-review/lfea-model-review-panel.js';
import { mountLfeaCommonErrorCheckPanel } from './lfea-diagnostics/lfea-error-check-panel.js';
import { mountLfeaResultsAuthorityPanel } from './lfea-results-authority/lfea-results-authority-panel.js';

/** Shared presentation surface for the LFEA pipeline. */
export function mountLfeaPipelineAnalysisSurface(options) {
  const analysisController = createLfeaPipelineAnalysisController({});
  const caseSelectionPanel = mountLfeaPipelineCaseSelectionPanel(options.loadCaseHost, {
    documentRef: options.documentRef,
    getPreFlight: options.getPreFlight,
    onApplyCaseSelection: options.onApplyCaseSelection,
  });
  const layoutPanel = mountLfeaPipelineLayoutPanel(options.loadCaseHost, { documentRef: options.documentRef, getPreFlight: options.getPreFlight });
  const loadCaseAuthoringPanel = mountLfeaPipelineLoadCaseAuthoringPanel(options.loadCaseHost, { documentRef: options.documentRef, getNodeIds: options.getNodeIds });
  const resultsPanel = mountLfeaPipelineResultsPanel(options.resultsHost, { documentRef: options.documentRef, onExportCsv: options.onExportCsv });
  const runPanel = mountLfeaPipelineRunPanel(options.resultsHost, { documentRef: options.documentRef, getPreFlight: options.getPreFlight, onAnalyze: options.onAnalyze });
  const exportPanel = mountLfeaPipelineExportPanel(options.resultsHost, {
    documentRef: options.documentRef,
    getResultsPanel: () => resultsPanel,
    onExportCsv: options.onExportCsv,
    onExportCompleted: options.onExportCompleted,
  });
  const resultsAuthorityPanel = mountLfeaResultsAuthorityPanel(options.resultsHost, { documentRef: options.documentRef });
  const taskVisibility = mountLfeaPipelineResultsTaskVisibility(options.resultsHost, {
    onTaskChanged(stepId) {
      if (stepId === 'RUN') runPanel.refresh();
      if (stepId === 'OUTPUT') resultsAuthorityPanel.refresh();
      if (stepId === 'EXPORT') exportPanel.refresh();
    },
  });
  const modelRepairPanel = mountLfeaPipelineModelRepairPanel(options.sourceHost, { documentRef: options.documentRef, getSourceText: options.getSourceText, onRepaired: options.onRepaired });
  const modelReviewPanel = mountLfeaModelReviewPanel(options.sourceHost, { documentRef: options.documentRef, getPreFlight: options.getPreFlight });
  const errorCheckPanel = mountLfeaCommonErrorCheckPanel(options.sourceHost, { documentRef: options.documentRef, getPreFlight: options.getPreFlight });

  return Object.freeze({
    analysisController, modelRepairPanel, modelReviewPanel, errorCheckPanel,
    caseSelectionPanel, layoutPanel, runPanel, resultsPanel, exportPanel,
    resultsAuthorityPanel, taskVisibility, loadCaseAuthoringPanel,
    refreshLoadCaseStep() {
      caseSelectionPanel.refresh();
      layoutPanel.refresh();
      loadCaseAuthoringPanel.refresh();
      runPanel.refresh();
    },
    refreshRunStep() { runPanel.refresh(); },
    refreshSourceStep() { modelRepairPanel.refresh(); modelReviewPanel.refresh(); errorCheckPanel.refresh(); },
    refreshResultsStep() { resultsAuthorityPanel.refresh(); exportPanel.refresh(); taskVisibility.refresh(); },
    destroy() {
      taskVisibility.destroy();
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
