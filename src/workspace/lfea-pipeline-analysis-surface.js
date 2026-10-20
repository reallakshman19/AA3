import { createLfeaPipelineAnalysisController } from './lfea-pipeline-analysis-controller.js';
import { mountLfeaPipelineCaseSelectionPanel } from './lfea-pipeline-case-selection-panel.js';
import { mountLfeaPipelineLayoutPanel } from './lfea-pipeline-layout-panel.js';
import { mountLfeaPipelineResultsPanel } from './lfea-pipeline-results-panel.js';
import { mountLfeaPipelineRunPanel } from './lfea-pipeline-run-panel.js';
import { mountLfeaPipelineExportPanel } from './lfea-pipeline-export-panel.js';
import { mountLfeaPipelineResultsTaskVisibility } from './lfea-pipeline-results-task-visibility.js';
import { mountLfeaPipelineResultsSortPresentation } from './lfea-pipeline-results-sort-presentation.js';
import { mountLfeaPipelineLoadCaseAuthoringPanel } from './lfea-pipeline-load-case-authoring-panel.js';
import { mountLfeaPipelineModelRepairPanel } from './lfea-pipeline-model-repair-panel.js';
import { mountLfeaModelReviewPanel } from './lfea-model-review/lfea-model-review-panel.js';
import { mountLfeaCommonErrorCheckPanel } from './lfea-diagnostics/lfea-error-check-panel.js';
import { mountLfeaAccdbRepairWorkspace } from './lfea-diagnostics/lfea-accdb-repair-workspace.js';
import { mountLfeaResultsAuthorityPanel } from './lfea-results-authority/lfea-results-authority-panel.js';

/** Shared presentation surface for the LFEA pipeline. */
export function mountLfeaPipelineAnalysisSurface(options) {
  const analysisController = createLfeaPipelineAnalysisController({});
  const safeExportCsv = (csvText, fileName) => {
    if (typeof document !== 'undefined') {
      const doc = options.documentRef ?? document;
      const view = doc.defaultView;
      const urlApi = view?.URL;
      if (urlApi?.createObjectURL && typeof view.Blob === 'function') {
        const url = urlApi.createObjectURL(new view.Blob([csvText], { type: 'text/csv;charset=utf-8' }));
        const anchor = doc.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.hidden = true;
        const parent = doc.body ?? doc.documentElement;
        parent?.append(anchor);
        try {
          anchor.click();
        } finally {
          anchor.remove();
          if (view?.setTimeout) {
            view.setTimeout(() => urlApi.revokeObjectURL(url), 1000);
          } else {
            urlApi.revokeObjectURL(url);
          }
        }
        return true;
      }
    }
    return options.onExportCsv?.(csvText, fileName);
  };

  const caseSelectionPanel = mountLfeaPipelineCaseSelectionPanel(options.loadCaseHost, {
    documentRef: options.documentRef,
    getPreFlight: options.getPreFlight,
    onApplyCaseSelection: options.onApplyCaseSelection,
  });
  const layoutPanel = mountLfeaPipelineLayoutPanel(options.loadCaseHost, { documentRef: options.documentRef, getPreFlight: options.getPreFlight });
  const loadCaseAuthoringPanel = mountLfeaPipelineLoadCaseAuthoringPanel(options.loadCaseHost, { documentRef: options.documentRef, getNodeIds: options.getNodeIds });
  const resultsPanel = mountLfeaPipelineResultsPanel(options.resultsHost, { documentRef: options.documentRef, onExportCsv: safeExportCsv });
  const runPanel = mountLfeaPipelineRunPanel(options.resultsHost, {
    documentRef: options.documentRef,
    getPreFlight: options.getPreFlight,
    getCaseSelectionCustody: () => caseSelectionPanel.getRunCaseCustody(),
    onAnalyze: options.onAnalyze,
  });
  const exportPanel = mountLfeaPipelineExportPanel(options.resultsHost, {
    documentRef: options.documentRef,
    getResultsPanel: () => resultsPanel,
    onExportCsv: safeExportCsv,
    onExportCompleted: options.onExportCompleted,
  });
  const resultsAuthorityPanel = mountLfeaResultsAuthorityPanel(options.resultsHost, { documentRef: options.documentRef });
  const sortPresentation = mountLfeaPipelineResultsSortPresentation(options.resultsHost);
  const taskVisibility = mountLfeaPipelineResultsTaskVisibility(options.resultsHost, {
    onTaskChanged(stepId) {
      if (stepId === 'RUN') runPanel.refresh();
      if (stepId === 'OUTPUT') { resultsAuthorityPanel.refresh(); sortPresentation.refresh(); }
      if (stepId === 'EXPORT') exportPanel.refresh();
    },
  });
  const modelRepairPanel = mountLfeaPipelineModelRepairPanel(options.sourceHost, { documentRef: options.documentRef, getSourceText: options.getSourceText, onRepaired: options.onRepaired });
  const modelReviewPanel = mountLfeaModelReviewPanel(options.sourceHost, { documentRef: options.documentRef, getPreFlight: options.getPreFlight });
  let repairWorkspace = null;
  const errorCheckPanel = mountLfeaCommonErrorCheckPanel(options.sourceHost, {
    documentRef: options.documentRef,
    getPreFlight: options.getPreFlight,
    onAuthorizePreFlight: options.onAuthorizePreFlight,
    onContinue: options.onContinueFromErrorCheck,
    onNavigatePrerequisite: options.onNavigatePrerequisite,
    onLocateOccurrence: (finding, locateOptions) => repairWorkspace?.locateOccurrence(finding, locateOptions),
    onAnalyze: options.onAnalyze,
    getAccdbController: options.getAccdbRepairController,
    onRunPrototype: (caseIds) => {
      const pre = options.getPreFlight?.();
      const cases = caseIds ?? pre?.preparation?.requestedCaseIds ?? ['IXP-W'];
      if (typeof options.onAnalyze === 'function') {
        const result = options.onAnalyze(cases);
        options.sourceHost?.dispatchEvent(new CustomEvent('lfea-pipeline-analysis-completed', { bubbles: true }));
        return result;
      }
      options.onContinueFromErrorCheck?.();
      return null;
    },
  });
  repairWorkspace = mountLfeaAccdbRepairWorkspace(errorCheckPanel.getWorkspaceHost(), {
    documentRef: options.documentRef,
    getPreFlight: options.getPreFlight,
    getAccdbController: options.getAccdbRepairController,
    onRevealFinding: (findingId, preparationHash) =>
      errorCheckPanel.revealOccurrence(findingId, preparationHash),
  });

  return Object.freeze({
    analysisController, modelRepairPanel, modelReviewPanel, errorCheckPanel, repairWorkspace,
    caseSelectionPanel, layoutPanel, runPanel, resultsPanel, exportPanel,
    resultsAuthorityPanel, taskVisibility, sortPresentation, loadCaseAuthoringPanel,
    refreshLoadCaseStep() {
      caseSelectionPanel.refresh();
      layoutPanel.refresh();
      loadCaseAuthoringPanel.refresh();
      runPanel.refresh();
    },
    refreshRunStep() { runPanel.refresh(); },
    refreshSourceStep() { modelRepairPanel.refresh(); modelReviewPanel.refresh(); errorCheckPanel.refresh(); repairWorkspace.refresh(); },
    refreshResultsStep() { resultsAuthorityPanel.refresh(); exportPanel.refresh(); sortPresentation.refresh(); taskVisibility.refresh(); },
    destroy() {
      taskVisibility.destroy();
      sortPresentation.destroy();
      caseSelectionPanel.destroy();
      layoutPanel.destroy();
      runPanel.destroy();
      resultsPanel.destroy();
      exportPanel.destroy();
      resultsAuthorityPanel.destroy();
      loadCaseAuthoringPanel.destroy();
      modelRepairPanel.destroy();
      modelReviewPanel.destroy();
      repairWorkspace.destroy();
      errorCheckPanel.destroy();
    },
  });
}
