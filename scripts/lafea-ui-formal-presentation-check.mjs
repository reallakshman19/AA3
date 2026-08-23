import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildLafeaWorkflowAreaPresentation } from '../src/workspace/lafea-guided-workflow-presentation.js';
import { lafeaWorkflowAreaIconId } from '../src/workspace/lafea-ui-icons.js';
import { lafeaUiStatusPresentation } from '../src/workspace/lafea-ui-status.js';

const expectations = Object.freeze({
  NOT_STARTED: ['Not started', 'neutral'],
  READY: ['Ready', 'positive'],
  WARNING: ['Attention required', 'warning'],
  BLOCKED: ['Blocked', 'critical'],
  COMPLETE: ['Complete', 'positive'],
  CURRENT: ['Current', 'positive'],
  CURRENT_PASS: ['Qualified', 'positive'],
  CURRENT_WARNING: ['Qualified with warnings', 'warning'],
  CURRENT_BLOCK: ['Blocked', 'critical'],
  STALE: ['Stale evidence', 'warning'],
  LOADED: ['Loaded', 'positive'],
  NOT_LOADED: ['Not loaded', 'neutral'],
  PASS: ['Qualified', 'positive'],
  ACCEPTED: ['Accepted', 'positive'],
  QUALIFIED_SOURCE_INPUT: ['Qualified source', 'positive'],
  ADVISORY: ['Advisory', 'warning'],
  MESH_REQUIRED: ['Mesh required', 'warning'],
  MESH_REGENERATION_REQUIRED: ['Mesh regeneration required', 'warning'],
  QUALIFIED_NOT_CURRENT: ['Previous result — stale', 'warning'],
  ENGINE_NOT_IMPLEMENTED: ['Unavailable', 'neutral'],
  QUALIFIED_ROUTE_REGISTERED: ['Engine available', 'positive'],
  EXACT_HEAD_QUALIFICATION_REQUIRED: ['External qualification required', 'warning'],
  NOT_GATED: ['Informational only', 'neutral'],
  NOT_RETAINED: ['Not generated', 'neutral'],
  'Not retained': ['Not generated', 'neutral'],
});

for (const [canonical, [label, tone]] of Object.entries(expectations)) {
  const presentation = lafeaUiStatusPresentation(canonical);
  assert.equal(presentation.canonical, canonical);
  assert.equal(presentation.label, label);
  assert.equal(presentation.tone, tone);
}

const unknown = lafeaUiStatusPresentation('FUTURE_INTERNAL_STATE');
assert.equal(unknown.label, 'Unknown state');
assert.equal(unknown.canonical, 'FUTURE_INTERNAL_STATE');
assert.deepEqual(
  ['MODEL', 'MESH', 'SOLVE', 'RESULTS'].map(lafeaWorkflowAreaIconId),
  ['model', 'mesh', 'solve', 'results'],
);

const workflow = Object.freeze({
  schema: 'lafea-guided-workflow/v1',
  steps: Object.freeze([
    step('SOURCE_IDENTITY', 'BLOCKED', ['SOURCE_DOCUMENT_REQUIRED']),
    step('MODEL_DIAGNOSTICS', 'NOT_STARTED'),
    step('ANALYSIS_PROFILE', 'BLOCKED', ['LIFECYCLE_NOT_INITIALIZED']),
    step('MATERIALS_SECTIONS', 'NOT_STARTED'),
    step('RESTRAINTS_BCS', 'NOT_STARTED'),
    step('LOADS_CASES', 'NOT_STARTED'),
    step('DISCRETIZATION', 'READY'),
    step('NUMERICAL_PREFLIGHT', 'WARNING', ['PREFLIGHT_REVIEW_REQUIRED']),
    step('AUTHORIZATION', 'READY'),
    step('RUN', 'BLOCKED', ['RUN_NOT_AUTHORIZED']),
    step('RESULTS_EVIDENCE', 'NOT_STARTED'),
  ]),
});

const areas = buildLafeaWorkflowAreaPresentation(workflow);
assert.deepEqual(areas.map((area) => area.areaId), ['MODEL', 'MESH', 'SOLVE', 'RESULTS']);
assert.deepEqual(areas.map((area) => area.label), ['Model', 'Mesh', 'Solve', 'Results']);
assert.equal(areas[0].steps.length, 6);
assert.equal(areas[0].status, 'BLOCKED');
assert.equal(areas[0].targetStep.stepId, 'SOURCE_IDENTITY');
assert.equal(areas[1].status, 'READY');
assert.equal(areas[1].targetStep.stepId, 'DISCRETIZATION');
assert.equal(areas[2].status, 'BLOCKED');
assert.equal(areas[2].targetStep.stepId, 'RUN');
assert.equal(areas[3].status, 'NOT_STARTED');

const mutableWorkflow = {
  schema: 'lafea-guided-workflow/v1',
  steps: workflow.steps.map((value) => ({ ...value, reasons: [...value.reasons] })),
};
buildLafeaWorkflowAreaPresentation(mutableWorkflow);
assert.equal(Object.isFrozen(mutableWorkflow.steps[0]), false);
assert.equal(Object.isFrozen(mutableWorkflow.steps[0].reasons), false);

const allComplete = buildLafeaWorkflowAreaPresentation({
  schema: 'lafea-guided-workflow/v1',
  steps: workflow.steps.map((value) => ({ ...value, status: 'COMPLETE', reasons: [] })),
});
assert.equal(allComplete.every((area) => area.status === 'COMPLETE'), true);

const renderer = read('../src/workspace/lafea-guided-workflow-view.js');
for (const glyph of ['✓', '○', '⚠', '🚫', '⚡']) {
  assert.equal(renderer.includes(glyph), false, `informal workflow glyph remains: ${glyph}`);
}
assert.equal(renderer.includes('friendlyStatus'), false);
assert.match(renderer, /buildLafeaWorkflowAreaPresentation\(workflow\)/u);
assert.match(renderer, /dataset\.workflowArea/u);
assert.match(renderer, /button\.dataset\.status = step\.status/u);
assert.match(renderer, /lafea-guided-workflow__technical/u);
assert.match(renderer, /lafeaUiIcon\(doc, lafeaWorkflowAreaIconId\(area\.areaId\)\)/u);

const icons = read('../src/workspace/lafea-ui-icons.js');
assert.match(icons, /createElementNS\('http:\/\/www\.w3\.org\/2000\/svg', 'svg'\)/u);
assert.match(icons, /aria-hidden/u);

const styles = read('../src/workspace/lafea-guided-workbench-styles.js');
assert.match(styles, /Primary-action hierarchy: one dominant contextual CTA/u);
assert.match(styles, /\.lafea-next-action-banner\{/u);
assert.match(styles, /\.lafea-next-action-banner__button\{/u);
assert.equal(styles.includes('linear-gradient'), false);

const modernStyles = read('../src/workspace/lafea-ui-modernization-styles.js');
assert.match(modernStyles, /\.lafea-ui-icon/u);
assert.match(modernStyles, /\.lafea-engineering-evidence-drawer/u);
assert.match(modernStyles, /\.lafea-diagnostics__item/u);

const overview = read('../src/workspace/lafea-engineering-overview.js');
assert.match(overview, /dataset\.role = 'lafea-engineering-summary'/u);
assert.match(overview, /dataset\.role = 'lafea-technical-evidence'/u);
assert.equal(overview.includes("['Engine', model.solver.engine]"), false);
assert.equal(overview.includes("['Authority', model.solver.authority]"), false);

const settings = read('../src/workspace/lafea-analysis-settings-view.js');
assert.match(settings, /createLafeaInfoDisclosure/u);
assert.match(settings, /Source metadata/u);
assert.match(settings, /Continuum formulation basis/u);
assert.match(settings, /visibleRows: model\.solverSummaryRows\.filter/u);
assert.match(settings, /Technical identifiers and lifecycle custody/u);
assert.match(settings, /dataset\.role = 'lafea-technical-evidence'/u);

const evidence = read('../src/workspace/lafea-workbench-evidence.js');
assert.match(evidence, /dataset\.role = 'lafea-engineering-evidence-drawer'/u);
assert.match(evidence, /body\.dataset\.role = 'lafea-technical-evidence'/u);
assert.match(evidence, /if \(parent\.tagName === 'DETAILS'\) parent\.open = true/u);

const content = read('../src/workspace/lafea-workbench-content.js');
assert.match(content, /renderLafeaEngineeringEvidenceDrawer\(/u);
assert.match(content, /renderLafeaSolveReadiness\(/u);
assert.match(content, /compactLafeaRefinementWorkspace\(/u);
assert.match(content, /banner\.dataset\.guidedTarget = 'run'/u);
assert.match(content, /'Not generated'/u);
assert.equal(content.includes('workflowSummary('), false, 'duplicated solve summary renderer must be removed');
assert.equal(content.includes('diagnosticList('), false, 'raw diagnostic list must not remain primary solve content');

const solve = read('../src/workspace/lafea-solve-readiness-panel.js');
assert.match(solve, /LAFEA_SOLVE_READINESS_VIEW_SCHEMA/u);
assert.match(solve, /Solve: \$\{model\.label\}/u);
assert.match(solve, /Why\? \(i\)/u);
assert.match(solve, /lafea-solve-readiness-primary/u);
assert.match(solve, /lafea-solve-readiness-evidence/u);
assert.match(solve, /lafea-diagnostics/u);

const discretization = read('../src/workspace/lafea-discretization-panel.js');
assert.match(discretization, /meshWorkspaceSummary\(doc, model\)/u);
assert.match(discretization, /generationSection\(doc, model, handlers\)/u);
assert.match(discretization, /qualitySection\(doc, model, handlers\)/u);
assert.match(discretization, /primaryActionSection\(doc, model, handlers\)/u);
assert.match(discretization, /advancedEvidence\(doc, model, handlers\)/u);
assert.match(discretization, /Technical mesh identifiers/u);
assert.match(discretization, /MAX_INLINE_FOCUS_ACTIONS = 6/u);
assert.match(discretization, /Diagnostic only\./u);

const refinement = read('../src/workspace/lafea-refinement-disclosure.js');
assert.match(refinement, /data-role|dataset\.role = 'lafea-refinement-disclosure'/u);
assert.match(refinement, /qualification pending/u);
assert.match(refinement, /productEvidence\.open = false/u);
assert.match(refinement, /refinement\.replaceWith\(details\)/u);

const controllerIo = read('../src/workspace/lafea-workbench-controller-io.js');
assert.match(controllerIo, /LAFEA_UI_MODERNIZATION_STYLES/u);

console.log('LAFEA formal UI hierarchy, decision-first solve, on-demand refinement, evidence, icon, and terminology boundary check: PASS');

function read(relative) {
  return readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');
}
function step(stepId, status, reasons = []) {
  return Object.freeze({
    stepId,
    label: stepId,
    status,
    reasons: Object.freeze([...reasons]),
    focusTarget: stepId.toLowerCase(),
  });
}
