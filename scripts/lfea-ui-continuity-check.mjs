import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const registry = read('src/workspace/lfea-pipeline-step-registry.js');
const sprite = read('src/workspace/lfea-pipeline-icon-sprite.js');
const view = read('src/workspace/lfea-pipeline-shell-view.js');
const css = read('src/workspace/lfea-pipeline-shell.css');
const session = read('src/workspace/lfea-pipeline-session.js');
const shellController = read('src/workspace/lfea-pipeline-shell-controller.js');
const casePanel = read('src/workspace/lfea-pipeline-case-selection-panel.js');
const runPanel = read('src/workspace/lfea-pipeline-run-panel.js');
const exportPanel = read('src/workspace/lfea-pipeline-export-panel.js');
const visibility = read('src/workspace/lfea-pipeline-results-task-visibility.js');
const analysisController = read('src/workspace/lfea-pipeline-analysis-controller.js');

const STEPS = [
  ['INPUT', 'icon-step-input'],
  ['ERROR_CHECK', 'icon-step-error-check'],
  ['LOAD_CASE', 'icon-step-load-case'],
  ['RUN', 'icon-step-run'],
  ['OUTPUT', 'icon-step-output'],
  ['EXPORT', 'icon-step-export'],
];

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

for (const [stepId, iconId] of STEPS) {
  assert(registry.includes(`stepId: '${stepId}'`), `registry missing ${stepId}`);
  assert(registry.includes(`iconId: '${iconId}'`), `registry missing ${stepId} icon ${iconId}`);
  assert(sprite.includes(`symbol('${iconId}'`), `sprite missing ${iconId}`);
}
for (const toolbarIcon of ['icon-load-sample', 'icon-authority-supplement', 'icon-code-checks', 'icon-verification', 'icon-status-complete']) {
  assert(sprite.includes(`symbol('${toolbarIcon}'`), `sprite missing ${toolbarIcon}`);
}

assert(!view.includes("innerHTML = '<svg"), 'shell view still embeds a hard-coded toolbar SVG');
assert(view.includes("dataset.role = 'lfea-pipeline-step-connector'"), 'step connector DOM contract missing');
assert(view.includes("dataset.role = 'lfea-pipeline-active-step-context'"), 'active-step context DOM contract missing');
assert(view.includes("host.dataset.activeStep = state.activeStepId"), 'all hosts do not retain active step identity');
assert(view.includes("completeIcon.hidden = !status.complete"), 'completion state does not preserve step identity');
assert(view.includes("indexCell.textContent = String(index + 1)"), 'step ordinal is not stable across completion');
assert(view.includes("aria-label', `${step.label} — ${stepStatus.toLowerCase()}"), 'step accessibility status label missing');
assert(css.includes('.lfea-pipeline-shell__connector[data-connector-status="COMPLETE"]'), 'complete connector styling missing');
assert(css.includes('.lfea-pipeline-shell__connector[data-connector-status="BLOCKED"]'), 'blocked connector styling missing');
assert(css.includes('.lfea-pipeline-shell__context[data-step-status="CURRENT"]'), 'active context state styling missing');
assert(view.includes('index < LFEA_PIPELINE_STEPS.length - 1'), 'connector count is not tied to registry sequence');

// Task continuity: selection is not execution, and later stages require real
// retained evidence rather than becoming available with pre-flight alone.
assert(!casePanel.includes("dataset.action = 'lfea-pipeline-analyze'"), 'Load case still owns the Analyze action');
assert(casePanel.includes('getAppliedCaseIds()'), 'Load case does not expose the current sealed case custody');
assert(runPanel.includes("dataset.action = 'lfea-pipeline-analyze'"), 'Run does not own the Analyze action');
assert(runPanel.includes("preparation?.requestedCaseIds"), 'Run is not reading cases from the retained pre-flight');
assert(runPanel.includes("'lfea-pipeline-analysis-completed'"), 'Run does not publish successful analysis custody');
assert(shellController.includes("stepId === 'OUTPUT' && !this.flow.analysisComplete"), 'Output is not fail-closed before analysis');
assert(shellController.includes("stepId === 'EXPORT' && !this.flow.analysisComplete"), 'Export is not fail-closed before analysis');
assert(shellController.includes("'lfea-pipeline-export-completed'"), 'Export completion is not retained in UI flow custody');
assert(exportPanel.includes('panel.csvFor(active)'), 'Export is recomputing or bypassing the existing CSV producer');
assert(visibility.includes("activeStep !== 'RUN'"), 'RESULTS host does not distinguish Run');
assert(visibility.includes("activeStep !== 'OUTPUT'"), 'RESULTS host does not distinguish Output');
assert(visibility.includes("activeStep !== 'EXPORT'"), 'RESULTS host does not distinguish Export');
assert(visibility.includes('legacyExport.hidden = true'), 'legacy inline export affordance can still duplicate Export');
assert(session.includes("step.stepId === activeStepId\n      ? 'CURRENT'"), 'active completed steps do not remain visibly current');

// Solver authority remains unchanged: the UI still hands the exact sealed
// pre-flight and requested case IDs to the existing native execution path.
assert(analysisController.includes('executionAuthority.run(authorized, { requestedCaseIds })'), 'analysis execution authority call changed or disappeared');
assert(analysisController.includes("status: 'CURRENT'"), 'retained analysis-state contract changed or disappeared');

if (failures.length > 0) {
  console.error('LFEA UI continuity check: FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`LFEA UI continuity check: PASS (${STEPS.length} stable steps, ${STEPS.length - 1} connectors, distinct Load case/Run/Output/Export custody)`);
}
