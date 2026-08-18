import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildLafeaWorkflowAreaPresentation } from '../src/workspace/lafea-guided-workflow-presentation.js';
import { lafeaUiStatusPresentation } from '../src/workspace/lafea-ui-status.js';

const expectations = Object.freeze({
  NOT_STARTED: ['Not started', 'neutral'],
  READY: ['Ready', 'positive'],
  WARNING: ['Attention required', 'warning'],
  BLOCKED: ['Blocked', 'critical'],
  COMPLETE: ['Complete', 'positive'],
  CURRENT_PASS: ['Qualified', 'positive'],
  CURRENT_WARNING: ['Qualified with warnings', 'warning'],
  CURRENT_BLOCK: ['Blocked', 'critical'],
  STALE: ['Stale evidence', 'warning'],
  QUALIFIED_NOT_CURRENT: ['Previous result — stale', 'warning'],
  ENGINE_NOT_IMPLEMENTED: ['Unavailable', 'neutral'],
  QUALIFIED_ROUTE_REGISTERED: ['Engine available', 'positive'],
  EXACT_HEAD_QUALIFICATION_REQUIRED: ['External qualification required', 'warning'],
  NOT_GATED: ['Informational only', 'neutral'],
  NOT_RETAINED: ['Not generated', 'neutral'],
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

const stylesPath = fileURLToPath(new URL('../src/workspace/lafea-guided-workbench-styles.js', import.meta.url));
const styles = readFileSync(stylesPath, 'utf8');
assert.match(styles, /Primary-action hierarchy: one dominant contextual CTA/u);
assert.match(styles, /\.lafea-next-action-banner\{/u);
assert.match(styles, /\.lafea-next-action-banner__button\{/u);
assert.match(styles, /\.lafea-engineering-overview__run,\[data-lafea-slot="toolbar"\] \[data-role="lafea-run"\]/u);
assert.match(styles, /background:#0b1628!important/u);
assert.equal(styles.includes('linear-gradient'), false, 'guided action hierarchy must not add decorative gradients');

console.log('LAFEA formal UI status, four-area presentation, and action hierarchy check: PASS');

function step(stepId, status, reasons = []) {
  return Object.freeze({
    stepId,
    label: stepId,
    status,
    reasons: Object.freeze([...reasons]),
    focusTarget: stepId.toLowerCase(),
  });
}
