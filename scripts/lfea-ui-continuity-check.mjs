import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));
const registry = read('src/workspace/lfea-pipeline-step-registry.js');
const sprite = read('src/workspace/lfea-pipeline-icon-sprite.js');
const view = read('src/workspace/lfea-pipeline-shell-view.js');
const css = read('src/workspace/lfea-pipeline-shell.css');
const session = read('src/workspace/lfea-pipeline-session.js');
const shellController = read('src/workspace/lfea-pipeline-shell-controller.js');
const analysisSurface = read('src/workspace/lfea-pipeline-analysis-surface.js');
const casePanel = read('src/workspace/lfea-pipeline-case-selection-panel.js');
const runPanel = read('src/workspace/lfea-pipeline-run-panel.js');
const resultsPanel = read('src/workspace/lfea-pipeline-results-panel.js');
const exportPanel = read('src/workspace/lfea-pipeline-export-panel.js');
const sourceAcquisition = read('src/workspace/lfea-source-acquisition.js');
const analysisController = read('src/workspace/lfea-pipeline-analysis-controller.js');
const main = read('src/main.js');
const accdbE2e = read('e2e/lfea-pipeline-accdb-real-model.spec.js');
const continuityE2e = read('e2e/lfea-pipeline-continuity.spec.js');

const STEPS = [
  ['INPUT', 'SOURCE', 'icon-step-input'],
  ['ERROR_CHECK', 'SOURCE', 'icon-step-error-check'],
  ['LOAD_CASE', 'LOAD_CASE', 'icon-step-load-case'],
  ['RUN', 'RUN', 'icon-step-run'],
  ['OUTPUT', 'OUTPUT', 'icon-step-output'],
  ['EXPORT', 'EXPORT', 'icon-step-export'],
];

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

for (const [stepId, hostGroup, iconId] of STEPS) {
  assert(registry.includes(`stepId: '${stepId}'`), `registry missing ${stepId}`);
  assert(registry.includes(`hostGroup: '${hostGroup}'`), `registry missing native ${stepId} host ${hostGroup}`);
  assert(registry.includes(`iconId: '${iconId}'`), `registry missing ${stepId} icon ${iconId}`);
  assert(sprite.includes(`symbol('${iconId}'`), `sprite missing ${iconId}`);
}
for (const iconId of [
  'icon-load-sample', 'icon-authority-supplement', 'icon-code-checks', 'icon-verification',
  'icon-status-complete', 'icon-sort-asc', 'icon-sort-desc',
]) {
  assert(sprite.includes(`symbol('${iconId}'`), `sprite missing ${iconId}`);
}

assert(!view.includes("innerHTML = '<svg"), 'shell view still embeds a hard-coded toolbar SVG');
assert(view.includes("dataset.role = 'lfea-pipeline-step-connector'"), 'step connector DOM contract missing');
assert(view.includes("dataset.role = 'lfea-pipeline-active-step-context'"), 'active-step context DOM contract missing');
assert(view.includes("taskHost(doc, 'RUN')"), 'Run native host missing');
assert(view.includes("taskHost(doc, 'OUTPUT')"), 'Output native host missing');
assert(view.includes("taskHost(doc, 'EXPORT')"), 'Export native host missing');
assert(view.includes("host.hidden = host.dataset.hostGroup !== activeHostGroup"), 'native host visibility is not shell-owned');
assert(view.includes("completeIcon.hidden = !status.complete"), 'completion state does not preserve step identity');
assert(view.includes("indexCell.textContent = String(index + 1)"), 'step ordinal is not stable across completion');
assert(view.includes("data-role = 'lfea-pipeline-optional-tools-label'") || view.includes("dataset.role = 'lfea-pipeline-optional-tools-label'"), 'optional tools hierarchy is not shell-owned');
assert(css.includes('.lfea-pipeline-shell__connector[data-connector-status="COMPLETE"]'), 'complete connector styling missing');
assert(css.includes('.lfea-pipeline-shell__connector[data-connector-status="BLOCKED"]'), 'blocked connector styling missing');
assert(session.includes("step.stepId === activeStepId\n      ? 'CURRENT'"), 'active completed steps do not remain visibly current');

assert(!casePanel.includes("dataset.action = 'lfea-pipeline-analyze'"), 'Load case still owns Analyze');
assert(casePanel.includes('getAppliedCaseIds()'), 'Load case does not expose current sealed case custody');
assert(casePanel.includes('then Apply selection.'), 'Load case does not instruct the engineer to Apply selection');
assert(runPanel.includes("dataset.action = 'lfea-pipeline-analyze'"), 'Run does not own Analyze');
assert(runPanel.includes("preparation?.requestedCaseIds"), 'Run is not reading cases from retained pre-flight');
assert(runPanel.includes("'lfea-pipeline-analysis-completed'"), 'Run does not publish successful analysis custody');
assert(main.includes("Apply selection, then continue to Run."), 'InputXML Load case guidance does not point from Apply selection to Run');
assert(main.includes("case(s), then Apply selection and continue to Run."), 'ACCDB Load case guidance does not point from Apply selection to Run');
assert(main.includes("use Load case to Apply selection, then Analyze on Run instead"), 'optional code-check guidance does not preserve Run as Analyze owner');
assert(!main.includes("Choose the cases to analyze, then Analyze."), 'stale InputXML Load case Analyze guidance remains');
assert(!main.includes('case(s), then Analyze.'), 'stale ACCDB Load case Analyze guidance remains');
assert(!main.includes('use Analyze on the Load case step instead'), 'stale optional-code-check Load case Analyze guidance remains');
assert(shellController.includes("stepId === 'OUTPUT' && !this.flow.analysisComplete"), 'Output is not fail-closed before analysis');
assert(shellController.includes("stepId === 'EXPORT' && !this.flow.analysisComplete"), 'Export is not fail-closed before analysis');
assert(shellController.includes("'lfea-pipeline-export-completed'"), 'Export completion is not retained in UI flow custody');
assert(analysisSurface.includes('mountLfeaPipelineRunPanel(runHost'), 'Run panel is not mounted on the native Run host');
assert(analysisSurface.includes('mountLfeaPipelineResultsPanel(outputHost'), 'Results panel is not mounted on the native Output host');
assert(analysisSurface.includes('mountLfeaPipelineExportPanel(exportHost'), 'Export panel is not mounted on the native Export host');
assert(exportPanel.includes('panel.csvFor(active)'), 'Export bypasses the existing CSV producer');
assert(!resultsPanel.includes('lfea-pipeline-results__export'), 'Output still exposes a duplicate inline export action');

assert(resultsPanel.includes("'icon-sort-asc'"), 'ascending sort icon is not natively rendered');
assert(resultsPanel.includes("'icon-sort-desc'"), 'descending sort icon is not natively rendered');
assert(resultsPanel.includes("setAttribute('aria-sort'"), 'sort state is not exposed with aria-sort');
assert(!resultsPanel.includes('▲') && !resultsPanel.includes('▼'), 'legacy raw sort triangles remain in Output');
assert(sourceAcquisition.includes("dataset.role = 'lfea-source-acquisition-staged-options'"), 'StagedJSON options disclosure is not source-owned');

for (const adapter of [
  'src/workspace/lfea-pipeline-continuity-presentation.js',
  'src/workspace/lfea-pipeline-results-sort-presentation.js',
  'src/workspace/lfea-pipeline-results-task-visibility.js',
]) {
  assert(!exists(adapter), `obsolete UI adapter still exists: ${adapter}`);
}

assert(accdbE2e.includes("data-step-id=\"RUN\""), 'ACCDB E2E does not enter Run');
assert(accdbE2e.includes("runPanel.locator('[data-action=\"lfea-pipeline-analyze\"]')"), 'ACCDB E2E does not Analyze from Run');
assert(accdbE2e.includes("data-step-id=\"EXPORT\""), 'ACCDB E2E does not enter Export');
assert(continuityE2e.includes('toHaveCount(5)'), 'fixture-free E2E does not assert five connectors');
assert(continuityE2e.includes('lfea-pipeline-active-step-context'), 'fixture-free E2E does not assert persistent step context');

// Solver authority remains unchanged.
assert(analysisController.includes('executionAuthority.run(authorized, { requestedCaseIds })'), 'analysis execution authority call changed or disappeared');
assert(analysisController.includes("status: 'CURRENT'"), 'retained analysis-state contract changed or disappeared');

if (failures.length > 0) {
  console.error('LFEA UI continuity check: FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`LFEA UI continuity check: PASS (${STEPS.length} steps, ${STEPS.length - 1} connectors, 3 adapters removed, native Run/Output/Export ownership)`);
}
