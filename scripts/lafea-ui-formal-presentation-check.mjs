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
assert.equal(workflow.steps[0].status, 'BLOCKED');

const mutableWorkflow = {
  schema: 'lafea-guided-workflow/v1',
  steps: workflow.steps.map((value) => ({ ...value, reasons: [...value.reasons] })),
};
buildLafeaWorkflowAreaPresentation(mutableWorkflow);
assert.equal(Object.isFrozen(mutableWorkflow.steps[0]), false, 'presentation must not freeze canonical caller state');
assert.equal(Object.isFrozen(mutableWorkflow.steps[0].reasons), false, 'presentation must not freeze canonical reason arrays');

const allComplete = buildLafeaWorkflowAreaPresentation({
  schema: 'lafea-guided-workflow/v1',
  steps: workflow.steps.map((value) => ({ ...value, status: 'COMPLETE', reasons: [] })),
});
assert.equal(allComplete.every((area) => area.status === 'COMPLETE'), true);

const rendererPath = fileURLToPath(new URL('../src/workspace/lafea-guided-workflow-view.js', import.meta.url));
const renderer = readFileSync(rendererPath, 'utf8');
const informalGlyphs = ['✓', '○', '⚠', '🚫', '⚡'];
for (const glyph of informalGlyphs) {
  assert.equal(renderer.includes(glyph), false, `informal workflow glyph remains: ${glyph}`);
}
assert.equal(renderer.includes('friendlyStatus'), false, 'renderer must not reinterpret canonical status');
assert.equal(renderer.includes("friendlyStatus = 'PENDING'"), false, 'BLOCKED must not be relabelled as PENDING');
assert.match(renderer, /buildLafeaWorkflowAreaPresentation\(workflow\)/u);
assert.match(renderer, /dataset\.workflowArea/u);
assert.match(renderer, /button\.dataset\.status = step\.status/u);
assert.match(renderer, /lafea-guided-workflow__technical/u);
assert.match(renderer, /lafeaUiIcon\(doc, lafeaWorkflowAreaIconId\(area\.areaId\)\)/u);
assert.match(renderer, /button\.append\(icon, label, state\)/u);

const iconsPath = fileURLToPath(new URL('../src/workspace/lafea-ui-icons.js', import.meta.url));
const icons = readFileSync(iconsPath, 'utf8');
assert.match(icons, /createElementNS\('http:\/\/www\.w3\.org\/2000\/svg', 'svg'\)/u);
assert.match(icons, /aria-hidden/u);
for (const glyph of informalGlyphs) {
  assert.equal(icons.includes(glyph), false, `formal icon registry must not contain emoji glyph ${glyph}`);
}

const stylesPath = fileURLToPath(new URL('../src/workspace/lafea-guided-workbench-styles.js', import.meta.url));
const styles = readFileSync(stylesPath, 'utf8');
assert.match(styles, /Primary-action hierarchy: one dominant contextual CTA/u);
assert.match(styles, /\.lafea-next-action-banner\{/u);
assert.match(styles, /\.lafea-next-action-banner__button\{/u);
assert.match(styles, /\.lafea-engineering-overview__run,\[data-lafea-slot="toolbar"\] \[data-role="lafea-run"\]/u);
assert.match(styles, /background:#0b1628!important/u);
assert.equal(styles.includes('linear-gradient'), false, 'guided action hierarchy must not add decorative gradients');

const modernStylesPath = fileURLToPath(new URL('../src/workspace/lafea-ui-modernization-styles.js', import.meta.url));
const modernStyles = readFileSync(modernStylesPath, 'utf8');
assert.match(modernStyles, /\.lafea-ui-icon/u);
assert.match(modernStyles, /\.lafea-engineering-evidence-drawer/u);
assert.match(modernStyles, /\.lafea-diagnostics__item/u);

const overviewPath = fileURLToPath(new URL('../src/workspace/lafea-engineering-overview.js', import.meta.url));
const overview = readFileSync(overviewPath, 'utf8');
assert.match(overview, /dataset\.role = 'lafea-engineering-summary'/u);
assert.match(overview, /dataset\.role = 'lafea-technical-evidence'/u);
assert.match(overview, /technicalEvidenceDisclosure\(root, model\)/u);
assert.equal(overview.includes("['Engine', model.solver.engine]"), false, 'raw solver package must not be a primary overview row');
assert.equal(overview.includes("['Authority', model.solver.authority]"), false, 'raw solver authority must not be a primary overview row');
assert.equal(overview.includes("['Profile', model.solver.qualificationProfile]"), false, 'raw qualification profile must not be a primary overview row');
assert.match(overview, /\['Solver authority', model\.solver\.authority\]/u);
assert.match(overview, /\['Engine state', model\.solver\.engineState\]/u);

const settingsPath = fileURLToPath(new URL('../src/workspace/lafea-analysis-settings-view.js', import.meta.url));
const settings = readFileSync(settingsPath, 'utf8');
assert.match(settings, /solverSummaryRows/u);
assert.match(settings, /settingsGroup\(root, 'Solver contract', 'GOVERNED_SOLVER', model\.solverSummaryRows\)/u);
assert.equal(
  settings.includes("settingsGroup(root, 'Governed solver settings', 'GOVERNED_SOLVER', model.solverRows)"),
  false,
  'raw solver rows must not be rendered as the primary solver group',
);
assert.match(settings, /technicalSettings\(root, model\.solverRows\)/u);
assert.match(settings, /Technical identifiers and lifecycle custody/u);
assert.match(settings, /dataset\.role = 'lafea-technical-evidence'/u);

const evidencePath = fileURLToPath(new URL('../src/workspace/lafea-workbench-evidence.js', import.meta.url));
const evidence = readFileSync(evidencePath, 'utf8');
assert.match(evidence, /dataset\.role = 'lafea-engineering-evidence-drawer'/u);
assert.match(evidence, /body\.dataset\.role = 'lafea-technical-evidence'/u);
assert.match(evidence, /if \(parent\.tagName === 'DETAILS'\) parent\.open = true/u);
assert.match(evidence, /lafeaUiIcon\(root\.ownerDocument, 'evidence'\)/u);

const contentPath = fileURLToPath(new URL('../src/workspace/lafea-workbench-content.js', import.meta.url));
const content = readFileSync(contentPath, 'utf8');
assert.match(content, /renderLafeaEngineeringEvidenceDrawer\(/u);
assert.match(content, /\[numericalCard\.section, lifecycleCard\.section, ncCard\.section\]/u);
assert.match(content, /banner\.dataset\.guidedTarget = 'run'/u);
assert.match(content, /lafeaUiStatusPresentation\(step\.status\)\.label/u);
assert.match(content, /'Not generated'/u);
assert.equal(content.includes('banner.style.'), false, 'legacy inline action-banner presentation must be removed');
assert.equal(content.includes('btn.style.'), false, 'legacy inline action-button presentation must be removed');

const controllerIoPath = fileURLToPath(new URL('../src/workspace/lafea-workbench-controller-io.js', import.meta.url));
const controllerIo = readFileSync(controllerIoPath, 'utf8');
assert.match(controllerIo, /LAFEA_UI_MODERNIZATION_STYLES/u);

console.log('LAFEA formal UI status, workflow, action hierarchy, evidence hierarchy, icon, and terminology boundary check: PASS');

function step(stepId, status, reasons = []) {
  return Object.freeze({
    stepId,
    label: stepId,
    status,
    reasons: Object.freeze([...reasons]),
    focusTarget: stepId.toLowerCase(),
  });
}
