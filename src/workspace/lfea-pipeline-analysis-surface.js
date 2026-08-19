import { createLfeaPipelineAnalysisController } from './lfea-pipeline-analysis-controller.js';
import { mountLfeaPipelineCaseSelectionPanel } from './lfea-pipeline-case-selection-panel.js';
import { mountLfeaPipelineLayoutPanel } from './lfea-pipeline-layout-panel.js';
import { mountLfeaPipelineResultsPanel } from './lfea-pipeline-results-panel.js';
import { mountLfeaPipelineLoadCaseAuthoringPanel } from './lfea-pipeline-load-case-authoring-panel.js';
import { mountLfeaPipelineModelRepairPanel } from './lfea-pipeline-model-repair-panel.js';

/**
 * Everything the Load-case and Output steps need, behind one entry point.
 *
 * main.js loads this with a dynamic import so Rollup gives it its own chunk
 * rather than folding it into the application entry -- the production
 * bundle-chunk ceiling is a hard limit, and the check that enforces it
 * deliberately forbids forcing workspace chunks by name, leaving graph-aware
 * splitting (this) as the sanctioned route. Nothing here is needed until a
 * user opens the F LFEA tab and loads a model, so deferring it costs nothing.
 */
export function mountLfeaPipelineAnalysisSurface(options) {
  const analysisController = createLfeaPipelineAnalysisController({});
  // The Load-case step leads with the model's own standard analysis cases
  // (W / W+P1 / W+T1 / W+P1+T1). Authored nodal loads stay available below
  // them for wind or seismic point loads, but they are not the headline: a
  // piping engineer picks a case, they do not type force components.
  const caseSelectionPanel = mountLfeaPipelineCaseSelectionPanel(options.loadCaseHost, {
    documentRef: options.documentRef,
    getPreFlight: options.getPreFlight,
    onApplyCaseSelection: options.onApplyCaseSelection,
    onAnalyze: options.onAnalyze,
  });
  // The model as an element table, collapsed by default: the case selector is
  // what the Load-case step is for, and the layout is there to check against.
  const layoutPanel = mountLfeaPipelineLayoutPanel(options.loadCaseHost, {
    documentRef: options.documentRef,
    getPreFlight: options.getPreFlight,
  });
  // Authored nodal loads live with the rest of the Load-case step, below the
  // case selector: useful for a wind or seismic point load, not the headline.
  const loadCaseAuthoringPanel = mountLfeaPipelineLoadCaseAuthoringPanel(options.loadCaseHost, {
    documentRef: options.documentRef,
    getNodeIds: options.getNodeIds,
  });
  const resultsPanel = mountLfeaPipelineResultsPanel(options.resultsHost, {
    documentRef: options.documentRef,
    onExportCsv: options.onExportCsv,
  });

  // Offered on the Error-check step, and only when the loaded model actually
  // has the fault it corrects.
  const modelRepairPanel = mountLfeaPipelineModelRepairPanel(options.sourceHost, {
    documentRef: options.documentRef,
    getSourceText: options.getSourceText,
    onRepaired: options.onRepaired,
  });

  return Object.freeze({
    analysisController,
    modelRepairPanel,
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
    },
    destroy() {
      caseSelectionPanel.destroy();
      layoutPanel.destroy();
      resultsPanel.destroy();
      loadCaseAuthoringPanel.destroy();
      modelRepairPanel.destroy();
    },
  });
}
