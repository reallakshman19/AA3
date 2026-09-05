import assert from 'node:assert/strict';
import {
  EMP1_ANALYTICAL_LAYOUT_REGIONS,
  EMP1_ANALYTICAL_LAYOUT_SCHEMA,
  EMP1_ANALYTICAL_SURFACE_ORDER,
  EMP1_ANALYTICAL_SURFACE_PLACEMENT,
  EMP1_TASK_SHELL_EVIDENCE_ORDER,
  EMP1_TASK_SHELL_INPUT_GROUPS,
  EMP1_TASK_SHELL_TASK_SURFACES,
  composeEmp1AnalyticalLayout,
  emp1AnalyticalLayoutPlacementManifest,
} from '../src/workspace/emp1-analytical-layout.js';

class FakeDocument {
  createElement(tagName) {
    return new FakeNode(this, tagName);
  }
}

class FakeNode {
  constructor(ownerDocument, tagName) {
    this.ownerDocument = ownerDocument;
    this.tagName = String(tagName).toUpperCase();
    this.nodeType = 1;
    this.dataset = {};
    this.className = '';
    this.attributes = {};
    this.children = [];
    this.parentNode = null;
    this.hidden = false;
    this.listeners = new Map();
    this.textContent = '';
    this.tabIndex = 0;
  }

  append(...nodes) {
    nodes.forEach((node) => {
      if (node.parentNode) {
        const index = node.parentNode.children.indexOf(node);
        if (index >= 0) node.parentNode.children.splice(index, 1);
      }
      node.parentNode = this;
      this.children.push(node);
    });
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  querySelectorAll(selector) {
    const result = [];
    const visit = (node) => {
      node.children.forEach((child) => {
        if (matchesSelector(child, selector)) result.push(child);
        visit(child);
      });
    };
    visit(this);
    return result;
  }
}

function matchesSelector(node, selector) {
  if (selector === '[data-role="emp1-professional-step"]') {
    return node.dataset.role === 'emp1-professional-step';
  }
  if (selector === '.lafea-doc-table-section[data-input-group]') {
    return String(node.className).split(/\s+/u).includes('lafea-doc-table-section')
      && typeof node.dataset.inputGroup === 'string';
  }
  return false;
}

const expectedOrder = [
  'workflow',
  'route',
  'source',
  'engineeringEvidence',
  'screeningCustody',
  'correlationAvailability',
  'boundedCorrelation',
  'runConfiguration',
  'transactionSummary',
  'correlationResult',
  'settings',
  'results',
  'lineage',
  'benchmarkEvidence',
  'benchmark',
];
const workflowStepIds = [
  'BASIS_SOURCE', 'GEOMETRY', 'LOADS', 'LOAD_TRANSFER', 'SECTION_SCREENING',
  'LOCAL_CORRELATION', 'REVIEW_EVIDENCE',
];
const inputGroupIds = [
  'PIPE_GEOMETRY', 'THICKNESS', 'PRESSURE', 'LOAD_CASES', 'REFERENCE_POINTS',
  'SCREENING_CASES', 'EVALUATION_LOCATIONS',
];

assert.equal(EMP1_ANALYTICAL_LAYOUT_SCHEMA, 'emp1-analytical-layout/v2');
assert.deepEqual(EMP1_ANALYTICAL_SURFACE_ORDER, expectedOrder,
  'task-shell recovery must retain every analytical surface and formal benchmark evidence');
assert.deepEqual(Object.keys(EMP1_ANALYTICAL_SURFACE_PLACEMENT).sort(), [...expectedOrder].sort(),
  'every retained surface must still have exactly one declared region');
assert.deepEqual(EMP1_ANALYTICAL_LAYOUT_REGIONS, {
  WORKFLOW: 'COMPACT_WORKFLOW_NAV',
  PRIMARY_WORK: 'ACTIVE_TASK',
  ENGINEERING_BASIS: 'BASIS_RAIL',
  FULL_WIDTH_DETAIL: 'EVIDENCE_WORKSPACE',
});

const regionCounts = {};
for (const entry of emp1AnalyticalLayoutPlacementManifest()) {
  (regionCounts[entry.regionId] ??= []).push(entry);
}
assert.equal(regionCounts.COMPACT_WORKFLOW_NAV.length, 1);
assert.equal(regionCounts.ACTIVE_TASK.length, 3);
assert.equal(regionCounts.BASIS_RAIL.length, 4);
assert.equal(regionCounts.EVIDENCE_WORKSPACE.length, 7);
assert.deepEqual(
  regionCounts.ACTIVE_TASK.map((entry) => entry.surfaceId),
  ['route', 'source', 'runConfiguration'],
);
assert.deepEqual(
  regionCounts.BASIS_RAIL.map((entry) => entry.surfaceId),
  ['engineeringEvidence', 'correlationAvailability', 'boundedCorrelation', 'settings'],
);
assert.deepEqual(
  regionCounts.EVIDENCE_WORKSPACE.map((entry) => entry.surfaceId),
  ['screeningCustody', 'transactionSummary', 'correlationResult', 'results', 'lineage', 'benchmarkEvidence', 'benchmark'],
);
assert.deepEqual(EMP1_TASK_SHELL_TASK_SURFACES.LOADS, ['source']);
assert.deepEqual(EMP1_TASK_SHELL_TASK_SURFACES.GEOMETRY, ['source', 'runConfiguration']);
assert.deepEqual(EMP1_TASK_SHELL_TASK_SURFACES.LOAD_TRANSFER, ['source']);
assert.deepEqual(EMP1_TASK_SHELL_INPUT_GROUPS.GEOMETRY, ['PIPE_GEOMETRY', 'THICKNESS']);
assert.deepEqual(EMP1_TASK_SHELL_INPUT_GROUPS.LOADS, ['PRESSURE', 'LOAD_CASES']);
assert.deepEqual(EMP1_TASK_SHELL_INPUT_GROUPS.LOAD_TRANSFER, ['REFERENCE_POINTS']);
assert.deepEqual(EMP1_TASK_SHELL_INPUT_GROUPS.SECTION_SCREENING, ['SCREENING_CASES', 'EVALUATION_LOCATIONS']);
assert.deepEqual(EMP1_TASK_SHELL_EVIDENCE_ORDER,
  ['results', 'transactionSummary', 'correlationResult', 'screeningCustody', 'lineage', 'benchmarkEvidence', 'benchmark']);

const { documentRef, shell, surfaces, workflowSteps } = fixture('A');
const layout = composeEmp1AnalyticalLayout(shell, surfaces, { selectionHost: documentRef });
assert.equal(layout.schema, 'emp1-analytical-layout/v2');
assert.equal(layout.presentSurfaceCount, expectedOrder.length);
assert.equal(shell.children.length, 3, 'compact workflow, lanes and bounded evidence workspace are shell children');
assert.equal(layout.lanes.children.length, 2, 'desktop lanes own active task and basis rail only');

for (const surfaceId of expectedOrder) {
  const surface = surfaces[surfaceId];
  const regionId = EMP1_ANALYTICAL_SURFACE_PLACEMENT[surfaceId];
  assert.equal(surface.dataset.emp1LayoutSurface, surfaceId);
  assert.equal(surface.dataset.emp1LayoutRegion, regionId);
  assert.equal(surface.parentNode?.dataset.emp1LayoutRegion, regionId,
    `${surfaceId} must be moved exactly once to its declared task-shell region`);
}

assert.equal(surfaces.route.hidden, false, 'Basis & Source keeps compact route context visible');
assert.equal(surfaces.source.hidden, false, 'Basis & Source keeps source surface available');
assert.equal(surfaces.runConfiguration.hidden, true, 'inactive Local Correlation configuration contributes no height');
assert.equal(visibleEvidence(surfaces).length, 1, 'exactly one heavy evidence surface participates in layout');
assert.equal(visibleEvidence(surfaces)[0], 'results', 'Basis & Source defaults to current result evidence');
assert.equal(workflowSteps.find((button) => button.dataset.emp1ProfessionalStep === 'BASIS_SOURCE').attributes['aria-current'], 'step');
assert.equal(visibleInputGroups(surfaces.source).length, 0,
  'Basis & Source does not dump every governed input group into the active task');

layout.selectTask('GEOMETRY');
assert.equal(surfaces.source.hidden, false);
assert.equal(surfaces.runConfiguration.hidden, false);
assert.deepEqual(visibleInputGroups(surfaces.source), ['PIPE_GEOMETRY', 'THICKNESS']);
assert.equal(visibleEvidence(surfaces).length, 1);

layout.selectTask('LOADS');
assert.equal(surfaces.route.hidden, true);
assert.equal(surfaces.source.hidden, false);
assert.equal(surfaces.runConfiguration.hidden, true);
assert.deepEqual(visibleInputGroups(surfaces.source), ['PRESSURE', 'LOAD_CASES']);
assert.equal(surfaces.source.dataset.emp1TaskInputGroupCount, '2');

layout.selectTask('LOAD_TRANSFER');
assert.deepEqual(visibleInputGroups(surfaces.source), ['REFERENCE_POINTS']);

layout.selectTask('SECTION_SCREENING');
assert.deepEqual(visibleInputGroups(surfaces.source), ['SCREENING_CASES', 'EVALUATION_LOCATIONS']);
assert.equal(visibleEvidence(surfaces)[0], 'screeningCustody',
  'Section Screening must foreground existing editable screening custody rather than hiding it');

layout.selectTask('LOCAL_CORRELATION');
assert.equal(surfaces.source.hidden, true);
assert.equal(surfaces.runConfiguration.hidden, false);
assert.equal(visibleEvidence(surfaces)[0], 'correlationResult');

layout.selectTask('REVIEW_EVIDENCE');
assert.equal(visibleEvidence(surfaces)[0], 'transactionSummary');
assert.equal(workflowSteps.find((button) => button.dataset.emp1ProfessionalStep === 'REVIEW_EVIDENCE').attributes['aria-current'], 'step');

assert.equal(layout.selectEvidence('benchmarkEvidence'), true);
assert.deepEqual(visibleEvidence(surfaces), ['benchmarkEvidence'],
  'benchmark selection must remove every other heavy evidence surface from layout without deleting it');
assert.equal(surfaces.results.parentNode?.dataset.emp1LayoutRegion, 'EVIDENCE_WORKSPACE',
  'hidden evidence remains in DOM custody');
assert.equal(layout.selectEvidence('not-a-view'), false);
assert.throws(() => layout.selectTask('UNSUPPORTED'), /EMP1_TASK_SHELL_STEP_UNSUPPORTED/u);

// Legacy backing-stage A/B navigation does not emit a professional task event.
// Reconcile only presentation state so existing A/B interactions remain visible.
const legacySelectionHost = new FakeDocument();
const aLegacy = fixture('A', legacySelectionHost);
const aLegacyLayout = composeEmp1AnalyticalLayout(aLegacy.shell, aLegacy.surfaces,
  { selectionHost: legacySelectionHost });
aLegacyLayout.selectTask('LOADS');
const bLegacy = fixture('B', legacySelectionHost);
composeEmp1AnalyticalLayout(bLegacy.shell, bLegacy.surfaces,
  { selectionHost: legacySelectionHost });
assert.equal(bLegacy.shell.dataset.emp1ProfessionalTask, 'SECTION_SCREENING');
assert.deepEqual(visibleInputGroups(bLegacy.surfaces.source), ['SCREENING_CASES', 'EVALUATION_LOCATIONS']);
assert.deepEqual(visibleEvidence(bLegacy.surfaces), ['screeningCustody'],
  'legacy entry to backing B must expose existing screening custody/edit surface');
const aReturn = fixture('A', legacySelectionHost);
composeEmp1AnalyticalLayout(aReturn.shell, aReturn.surfaces,
  { selectionHost: legacySelectionHost });
assert.equal(aReturn.shell.dataset.emp1ProfessionalTask, 'BASIS_SOURCE');
assert.deepEqual(visibleEvidence(aReturn.surfaces), ['results']);

const optionalAbsent = Object.fromEntries(expectedOrder.map((surfaceId) => [
  surfaceId,
  surfaceId === 'benchmark' || surfaceId === 'screeningCustody'
    ? null
    : documentRef.createElement('section'),
]));
assert.equal(composeEmp1AnalyticalLayout(documentRef.createElement('div'), optionalAbsent).presentSurfaceCount, 13,
  'conditional surfaces may be absent without inventing replacement content');

const duplicate = Object.fromEntries(expectedOrder.map((surfaceId) => [
  surfaceId,
  documentRef.createElement('section'),
]));
duplicate.results = duplicate.source;
assert.throws(
  () => composeEmp1AnalyticalLayout(documentRef.createElement('div'), duplicate),
  /EMP1_ANALYTICAL_LAYOUT_SURFACE_DUPLICATE/u,
  'duplicate engineering surfaces must fail instead of rendering in two task-shell regions',
);

const duplicateBenchmark = Object.fromEntries(expectedOrder.map((surfaceId) => [
  surfaceId,
  documentRef.createElement('section'),
]));
duplicateBenchmark.benchmark = duplicateBenchmark.benchmarkEvidence;
assert.throws(
  () => composeEmp1AnalyticalLayout(documentRef.createElement('div'), duplicateBenchmark),
  /EMP1_ANALYTICAL_LAYOUT_SURFACE_DUPLICATE/u,
  'formal benchmark evidence must not be duplicated through the optional benchmark host slot',
);

const missing = { ...surfaces };
delete missing.benchmarkEvidence;
assert.throws(
  () => composeEmp1AnalyticalLayout(documentRef.createElement('div'), missing),
  /EMP1_ANALYTICAL_LAYOUT_SURFACE_KEYS_MISMATCH/u,
  'omitting the formal benchmark surface key must fail the layout contract',
);

console.log(JSON.stringify({
  schema: 'emp1-analytical-layout-check/v2',
  status: 'EMP1_TASK_SHELL_LAYOUT_CHECK_PASS',
  professionalTasks: Object.keys(EMP1_TASK_SHELL_TASK_SURFACES).length,
  visibleHeavyEvidenceMaximum: 1,
  backingStageReconciliation: true,
  sectionScreeningDefaultEvidence: 'screeningCustody',
  inputTaskGroups: EMP1_TASK_SHELL_INPUT_GROUPS,
  presentationOnly: true,
}, null, 2));

function fixture(backingStep, ownerDocument = new FakeDocument()) {
  const shell = ownerDocument.createElement('div');
  shell.dataset.emp1Step = backingStep;
  const surfaces = Object.fromEntries(expectedOrder.map((surfaceId) => [
    surfaceId,
    ownerDocument.createElement('section'),
  ]));
  const workflowSteps = workflowStepIds.map((stepId) => {
    const button = ownerDocument.createElement('button');
    button.dataset.role = 'emp1-professional-step';
    button.dataset.emp1ProfessionalStep = stepId;
    surfaces.workflow.append(button);
    return button;
  });
  for (const groupId of inputGroupIds) {
    const group = ownerDocument.createElement('section');
    group.className = 'lafea-doc-table-section';
    group.dataset.inputGroup = groupId;
    surfaces.source.append(group);
  }
  return { documentRef: ownerDocument, shell, surfaces, workflowSteps };
}

function visibleEvidence(surfaceMap) {
  return EMP1_TASK_SHELL_EVIDENCE_ORDER.filter((surfaceId) => surfaceMap[surfaceId] && !surfaceMap[surfaceId].hidden);
}

function visibleInputGroups(source) {
  return source.querySelectorAll('.lafea-doc-table-section[data-input-group]')
    .filter((group) => !group.hidden)
    .map((group) => group.dataset.inputGroup);
}
