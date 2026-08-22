import { createLfeaPipelineAnalysisController } from './lfea-pipeline-analysis-controller.js';
import { mountLfeaPipelineCaseSelectionPanel } from './lfea-pipeline-case-selection-panel.js';
import { mountLfeaPipelineLayoutPanel } from './lfea-pipeline-layout-panel.js';
import { mountLfeaPipelineResultsPanel } from './lfea-pipeline-results-panel.js';
import { mountLfeaPipelineLoadCaseAuthoringPanel } from './lfea-pipeline-load-case-authoring-panel.js';
import { mountLfeaPipelineModelRepairPanel } from './lfea-pipeline-model-repair-panel.js';
import { mountLfeaModelReviewPanel } from './lfea-model-review/lfea-model-review-panel.js';
import { mountLfeaCommonErrorCheckPanel } from './lfea-diagnostics/lfea-error-check-panel.js';

/**
 * Everything the Load-case, Input review and Output steps need, behind one entry point.
 *
 * main.js loads this with a dynamic import so Rollup gives it its own chunk
 * rather than folding it into the application entry. Model Review and Error
 * Check are read-only projections of already-prepared records; neither adds a
 * second parse/compile/solve path.
 */
export function mountLfeaPipelineAnalysisSurface(options) {
  const analysisController = createLfeaPipelineAnalysisController({});
  const caseSelectionPanel = mountLfeaPipelineCaseSelectionPanel(options.loadCaseHost, {
    documentRef: options.documentRef,
    getPreFlight: options.getPreFlight,
    onApplyCaseSelection: options.onApplyCaseSelection,
    onAnalyze: options.onAnalyze,
  });
  // Retained as a collapsed compatibility view for existing checks/API users.
  // UI04's first-class engineering review lives on Input below.
  const layoutPanel = mountLfeaPipelineLayoutPanel(options.loadCaseHost, {
    documentRef: options.documentRef,
    getPreFlight: options.getPreFlight,
  });
  const loadCaseAuthoringPanel = mountLfeaPipelineLoadCaseAuthoringPanel(options.loadCaseHost, {
    documentRef: options.documentRef,
    getNodeIds: options.getNodeIds,
  });
  const resultsPanel = mountLfeaPipelineResultsPanel(options.resultsHost, {
    documentRef: options.documentRef,
    onExportCsv: options.onExportCsv,
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

  return Object.freeze({
    analysisController,
    modelRepairPanel,
    modelReviewPanel,
    errorCheckPanel,
    caseSelectionPanel,
    layoutPanel,
    resultsPanel,
    loadCaseAuthoringPanel,
    refreshLoadCaseStep() {
      caseSelectionPanel.refresh();
      layoutPanel.refresh();
      loadCaseAuthoringPanel.refresh();
    },
    refreshSourceStep() {
      modelRepairPanel.refresh();
      modelReviewPanel.refresh();
      errorCheckPanel.refresh();
    },
    destroy() {
      caseSelectionPanel.destroy();
      layoutPanel.destroy();
      resultsPanel.destroy();
      loadCaseAuthoringPanel.destroy();
      modelRepairPanel.destroy();
      modelReviewPanel.destroy();
      errorCheckPanel.destroy();
    },
  });
}
