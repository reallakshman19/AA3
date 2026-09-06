import assert from 'node:assert/strict';
import {
  EMP1_ANALYTICAL_LAYOUT_REGIONS,
  EMP1_ANALYTICAL_LAYOUT_SCHEMA,
  EMP1_ANALYTICAL_SURFACE_ORDER,
  EMP1_ANALYTICAL_SURFACE_PLACEMENT,
  EMP1_SPLIT_CONSOLE_MODES,
  EMP1_SPLIT_CONSOLE_SCHEMA,
  EMP1_TASK_SHELL_EVIDENCE_ORDER,
  EMP1_TASK_SHELL_INPUT_GROUPS,
  EMP1_TASK_SHELL_INSPECTOR_ORDER,
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
    this.open = false;
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
  if (selector === 'details') return node.tagName === 'DETAILS';
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
const workflowLabels = {
  BASIS_SOURCE: 'Basis & Source',
  GEOMETRY: 'Geometry',
  LOADS: 'Loads',
  LOAD_TRANSFER: 'Load Transfer',
  SECTION_SCREENING: 'Section Screening',
  LOCAL_CORRELATION: 'Local Correlation',
  REVIEW_EVIDENCE: 'Review & Evidence',
};
const inputGroupIds = [
  'PIPE_GEOMETRY', 'THICKNESS', 'PRESSURE', 'LOAD_CASES', 'REFERENCE_POINTS',
  'SCREENING_CASES', 'EVALUATION_LOCATIONS',
];

assert.equal(EMP1_ANALYTICAL_LAYOUT_SCHEMA, 'emp1-analytical-layout/v2');
assert.equal(EMP1_SPLIT_CONSOLE_SCHEMA, 'emp1-split-console/v1');
assert.deepEqual(EMP1_SPLIT_CONSOLE_MODES, ['WORK', 'BASIS', 'EVIDENCE']);
assert.deepEqual(EMP1_ANALYTICAL_SURFACE_ORDER, expectedOrder,
  'split-console recovery must retain every analytical surface and formal benchmark evidence');
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
assert.deepEqual(regionCounts.ACTIVE_TASK.map((entry) => entry.surfaceId),
  ['route', 'source', 'runConfiguration']);
assert.deepEqual(regionCounts.BASIS_RAIL.map((entry) => entry.surfaceId),
  ['engineeringEvidence', 'correlationAvailability', 'boundedCorrelation', 'settings']);
assert.deepEqual(regionCounts.EVIDENCE_WORKSPACE.map((entry) => entry.surfaceId),
  ['screeningCustody', 'transactionSummary', 'correlationResult', 'results', 'lineage', 'benchmarkEvidence', 'benchmark']);
assert.deepEqual(EMP1_TASK_SHELL_INSPECTOR_ORDER,
  ['engineeringEvidence', 'boundedCorrelation', 'correlationAvailability', 'settings']);
assert.deepEqual(EMP1_TASK_SHELL_EVIDENCE_ORDER,
  ['results', 'transactionSummary', 'correlationResult', 'screeningCustody', 'lineage', 'benchmarkEvidence', 'benchmark']);
assert.deepEqual(EMP1_TASK_SHELL_TASK_SURFACES.LOADS, ['source']);
assert.deepEqual(EMP1_TASK_SHELL_TASK_SURFACES.GEOMETRY, ['source', 'runConfiguration']);
assert.deepEqual(EMP1_TASK_SHELL_TASK_SURFACES.REVIEW_EVIDENCE, [],
  'Review & Evidence must not expose a backing-stage card as the active presentation task');
assert.deepEqual(EMP1_TASK_SHELL_INPUT_GROUPS.GEOMETRY, ['PIPE_GEOMETRY', 'THICKNESS']);
assert.deepEqual(EMP1_TASK_SHELL_INPUT_GROUPS.LOADS, ['PRESSURE', 'LOAD_CASES']);
assert.deepEqual(EMP1_TASK_SHELL_INPUT_GROUPS.LOAD_TRANSFER, ['REFERENCE_POINTS']);
assert.deepEqual(EMP1_TASK_SHELL_INPUT_GROUPS.SECTION_SCREENING, ['SCREENING_CASES', 'EVALUATION_LOCATIONS']);

const { documentRef, shell, surfaces, workflowSteps } = fixture('A');
const layout = composeEmp1AnalyticalLayout(shell, surfaces, { selectionHost: documentRef });
assert.equal(layout.schema, 'emp1-analytical-layout/v2');
assert.equal(layout.splitConsoleSchema, 'emp1-split-console/v1');
assert.equal(layout.presentSurfaceCount, expectedOrder.length);
assert.equal(shell.dataset.emp1SplitConsole, 'emp1-split-console/v1');
assert.equal(shell.children.length, 4,
  'workflow, narrow mode tabs, split lanes and evidence console are shell children');
assert.equal(layout.lanes.children.length, 2,
  'desktop split owns active workspace and engineering inspector only');
assert.equal(layout.modeTabs.children.length, 3, 'narrow console exposes Work/Basis/Evidence modes');
assert.equal(layout.inspectorTabs.children.length, 4, 'inspector retains four governed supporting domains in DOM custody');

for (const surfaceId of expectedOrder) {
  const surface = surfaces[surfaceId];
  const regionId = EMP1_ANALYTICAL_SURFACE_PLACEMENT[surfaceId];
  assert.equal(surface.dataset.emp1LayoutSurface, surfaceId);
  assert.equal(surface.dataset.emp1LayoutRegion, regionId);
  assert.equal(surface.parentNode?.dataset.emp1LayoutRegion, regionId,
    `${surfaceId} must be moved exactly once to its declared region`);
}

assert.equal(shell.dataset.emp1ConsoleMode, 'WORK');
assert.equal(surfaces.route.hidden, false);
assert.equal(surfaces.source.hidden, false);
assert.equal(surfaces.runConfiguration.hidden, true);
assert.deepEqual(visibleInspector(surfaces), ['engineeringEvidence'],
  'Basis & Source defaults to one custody inspector surface');
assert.deepEqual(selectedEvidence(surfaces), ['results']);
assert.equal(layout.regions.EVIDENCE_WORKSPACE.dataset.emp1EvidenceOpen, 'false',
  'evidence console is collapsed by default');
assert.equal(workflowSteps.find((button) => button.dataset.emp1ProfessionalStep === 'BASIS_SOURCE').attributes['aria-current'], 'step');
assert.equal(visibleInputGroups(surfaces.source).length, 0);
assert.equal(layout.selectInspector('boundedCorrelation'), false,
  'Basis & Source must refuse unrelated Local Correlation authority in its Inspector');
assert.deepEqual(visibleInspector(surfaces), ['engineeringEvidence']);
assert.equal(layout.selectInspector('settings'), true,
  'Basis & Source may inspect supporting settings without exposing WRC authority');
assert.deepEqual(visibleInspector(surfaces), ['settings']);
assert.equal(layout.selectInspector('not-an-inspector'), false);

layout.selectTask('GEOMETRY');
assert.equal(surfaces.source.hidden, false);
assert.equal(surfaces.runConfiguration.hidden, false);
assert.deepEqual(visibleInputGroups(surfaces.source), ['PIPE_GEOMETRY', 'THICKNESS']);
assert.deepEqual(visibleInspector(surfaces), ['settings']);
assert.deepEqual(selectedEvidence(surfaces), ['results']);
assert.equal(layout.regions.EVIDENCE_WORKSPACE.dataset.emp1EvidenceOpen, 'false');

layout.selectTask('LOADS');
assert.equal(surfaces.route.hidden, true);
assert.equal(surfaces.source.hidden, false);
assert.equal(surfaces.runConfiguration.hidden, true);
assert.deepEqual(visibleInputGroups(surfaces.source), ['PRESSURE', 'LOAD_CASES']);
assert.equal(surfaces.source.dataset.emp1TaskInputGroupCount, '2');
assert.deepEqual(visibleInspector(surfaces), ['engineeringEvidence']);
assert.equal(layout.selectInspector('boundedCorrelation'), false,
  'Loads must not permit EMP.1.C route authority as task-default context');

layout.selectTask('LOAD_TRANSFER');
assert.deepEqual(visibleInputGroups(surfaces.source), ['REFERENCE_POINTS']);

layout.selectTask('SECTION_SCREENING');
assert.deepEqual(visibleInputGroups(surfaces.source), ['SCREENING_CASES', 'EVALUATION_LOCATIONS']);
assert.equal(selectedEvidence(surfaces)[0], 'screeningCustody');

layout.selectTask('LOCAL_CORRELATION');
assert.equal(surfaces.source.hidden, true);
assert.equal(surfaces.runConfiguration.hidden, false);
assert.deepEqual(visibleInspector(surfaces), ['boundedCorrelation'],
  'Local Correlation defaults to the bounded-route Authority inspector');
assert.equal(selectedEvidence(surfaces)[0], 'correlationResult');

layout.selectTask('REVIEW_EVIDENCE');
assert.equal(selectedEvidence(surfaces)[0], 'transactionSummary');
assert.equal(shell.dataset.emp1ConsoleMode, 'EVIDENCE');
assert.equal(layout.regions.EVIDENCE_WORKSPACE.dataset.emp1EvidenceOpen, 'true');
assert.equal(surfaces.route.hidden, true,
  'Review must not leave the backing A/B route card visible as an active task');
assert.equal(surfaces.source.hidden, true);
assert.equal(surfaces.runConfiguration.hidden, true);
assert.equal(workflowSteps.find((button) => button.dataset.emp1ProfessionalStep === 'REVIEW_EVIDENCE').attributes['aria-current'], 'step');

assert.equal(layout.selectEvidence('benchmarkEvidence'), true);
assert.deepEqual(selectedEvidence(surfaces), ['benchmarkEvidence']);
assert.equal(surfaces.results.parentNode?.dataset.emp1LayoutRegion, 'EVIDENCE_WORKSPACE');
assert.equal(layout.selectEvidence('not-a-view'), false);
assert.equal(layout.setEvidenceOpen(false), true);
assert.equal(layout.regions.EVIDENCE_WORKSPACE.dataset.emp1EvidenceOpen, 'false');
assert.equal(layout.selectMode('BASIS'), true);
assert.equal(shell.dataset.emp1ConsoleMode, 'BASIS');
assert.equal(layout.selectMode('WORK'), true);
assert.equal(shell.dataset.emp1ConsoleMode, 'WORK');
assert.throws(() => layout.selectMode('STACK_ALL'), /EMP1_SPLIT_CONSOLE_MODE_UNSUPPORTED/u);
assert.throws(() => layout.selectTask('UNSUPPORTED'), /EMP1_TASK_SHELL_STEP_UNSUPPORTED/u);

// Backing stage may seed initial presentation only. Once a professional task is
// explicit, subsequent A/B rerenders cannot replace that selection.
const explicitSelectionHost = new FakeDocument();
const aExplicit = fixture('A', explicitSelectionHost);
const aExplicitLayout = composeEmp1AnalyticalLayout(aExplicit.shell, aExplicit.surfaces,
  { selectionHost: explicitSelectionHost });
aExplicitLayout.selectTask('LOADS');
const bAfterExplicit = fixture('B', explicitSelectionHost);
composeEmp1AnalyticalLayout(bAfterExplicit.shell, bAfterExplicit.surfaces,
  { selectionHost: explicitSelectionHost });
assert.equal(bAfterExplicit.shell.dataset.emp1ProfessionalTask, 'LOADS',
  'backing B rerender must not replace an explicitly selected Loads presentation task');
assert.deepEqual(visibleInputGroups(bAfterExplicit.surfaces.source), ['PRESSURE', 'LOAD_CASES']);
const aReturn = fixture('A', explicitSelectionHost);
composeEmp1AnalyticalLayout(aReturn.shell, aReturn.surfaces,
  { selectionHost: explicitSelectionHost });
assert.equal(aReturn.shell.dataset.emp1ProfessionalTask, 'LOADS');

// With no explicit professional selection, backing B remains a valid bootstrap
// hint so legacy A/B navigation still opens Section Screening coherently.
const bootstrapSelectionHost = new FakeDocument();
const bBootstrap = fixture('B', bootstrapSelectionHost);
composeEmp1AnalyticalLayout(bBootstrap.shell, bBootstrap.surfaces,
  { selectionHost: bootstrapSelectionHost });
assert.equal(bBootstrap.shell.dataset.emp1ProfessionalTask, 'SECTION_SCREENING');
assert.deepEqual(visibleInputGroups(bBootstrap.surfaces.source), ['SCREENING_CASES', 'EVALUATION_LOCATIONS']);
assert.deepEqual(selectedEvidence(bBootstrap.surfaces), ['screeningCustody']);

const optionalAbsent = Object.fromEntries(expectedOrder.map((surfaceId) => [
  surfaceId,
  surfaceId === 'benchmark' || surfaceId === 'screeningCustody'
    ? null
    : documentRef.createElement('section'),
]));
assert.equal(composeEmp1AnalyticalLayout(documentRef.createElement('div'), optionalAbsent).presentSurfaceCount, 13);

const duplicate = Object.fromEntries(expectedOrder.map((surfaceId) => [
  surfaceId,
  documentRef.createElement('section'),
]));
duplicate.results = duplicate.source;
assert.throws(() => composeEmp1AnalyticalLayout(documentRef.createElement('div'), duplicate),
  /EMP1_ANALYTICAL_LAYOUT_SURFACE_DUPLICATE/u);

const duplicateBenchmark = Object.fromEntries(expectedOrder.map((surfaceId) => [
  surfaceId,
  documentRef.createElement('section'),
]));
duplicateBenchmark.benchmark = duplicateBenchmark.benchmarkEvidence;
assert.throws(() => composeEmp1AnalyticalLayout(documentRef.createElement('div'), duplicateBenchmark),
  /EMP1_ANALYTICAL_LAYOUT_SURFACE_DUPLICATE/u);

const missing = { ...surfaces };
delete missing.benchmarkEvidence;
assert.throws(() => composeEmp1AnalyticalLayout(documentRef.createElement('div'), missing),
  /EMP1_ANALYTICAL_LAYOUT_SURFACE_KEYS_MISMATCH/u);

console.log(JSON.stringify({
  schema: 'emp1-analytical-layout-check/v4',
  status: 'EMP1_SPLIT_CONSOLE_LAYOUT_CHECK_PASS',
  professionalTasks: Object.keys(EMP1_TASK_SHELL_TASK_SURFACES).length,
  inspectorVisibleMaximum: 1,
  evidenceSelectedMaximum: 1,
  narrowModes: EMP1_SPLIT_CONSOLE_MODES,
  evidenceCollapsedByDefault: true,
  backingStageReconciliation: 'BOOTSTRAP_ONLY_AFTER_EXPLICIT_TASK_SELECTION',
  unrelatedInspectorAuthorityRejected: true,
  reviewBackingCardHidden: true,
  presentationOnly: true,
}, null, 2));

function fixture(backingStep, ownerDocument = new FakeDocument()) {
  const shell = ownerDocument.createElement('div');
  shell.dataset.emp1Step = backingStep;
  const surfaces = Object.fromEntries(expectedOrder.map((surfaceId) => [
    surfaceId,
    ownerDocument.createElement('section'),
  ]));
  const workflowSteps = workflowStepIds.map((stepId, index) => {
    const button = ownerDocument.createElement('button');
    button.dataset.role = 'emp1-professional-step';
    button.dataset.emp1ProfessionalStep = stepId;
    button.textContent = `${index + 1} ${workflowLabels[stepId]} · SOURCE STATE`;
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

function selectedEvidence(surfaceMap) {
  return EMP1_TASK_SHELL_EVIDENCE_ORDER.filter((surfaceId) => surfaceMap[surfaceId] && !surfaceMap[surfaceId].hidden);
}

function visibleInspector(surfaceMap) {
  return EMP1_TASK_SHELL_INSPECTOR_ORDER.filter((surfaceId) => surfaceMap[surfaceId] && !surfaceMap[surfaceId].hidden);
}

function visibleInputGroups(source) {
  return source.querySelectorAll('.lafea-doc-table-section[data-input-group]')
    .filter((group) => !group.hidden)
    .map((group) => group.dataset.inputGroup);
}
