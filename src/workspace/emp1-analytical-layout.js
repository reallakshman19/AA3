/**
 * Presentation-only task-shell composition contract for the EMP.1 analytical workbench.
 *
 * The registry classifies already-rendered child surfaces into stable task-shell
 * regions. It never derives engineering state, calls a calculator, clones a child
 * surface, or decides whether an engineering surface is authoritative.
 */

export const EMP1_ANALYTICAL_LAYOUT_SCHEMA = 'emp1-analytical-layout/v2';

export const EMP1_ANALYTICAL_LAYOUT_REGIONS = Object.freeze({
  WORKFLOW: 'COMPACT_WORKFLOW_NAV',
  PRIMARY_WORK: 'ACTIVE_TASK',
  ENGINEERING_BASIS: 'BASIS_RAIL',
  FULL_WIDTH_DETAIL: 'EVIDENCE_WORKSPACE',
});

const REGION_DEFINITIONS = Object.freeze({
  COMPACT_WORKFLOW_NAV: Object.freeze({
    role: 'emp1-analytical-workflow-region',
    label: 'Assessment workflow navigation',
  }),
  ACTIVE_TASK: Object.freeze({
    role: 'emp1-analytical-primary-work',
    label: 'Active engineering task',
  }),
  BASIS_RAIL: Object.freeze({
    role: 'emp1-analytical-engineering-basis',
    label: 'Engineering basis and authority',
  }),
  EVIDENCE_WORKSPACE: Object.freeze({
    role: 'emp1-analytical-full-width-detail',
    label: 'Results and evidence workspace',
  }),
});

/**
 * The order remains the retained EMP.1 surface custody order. Region placement
 * is explicit; nothing is classified by append position.
 */
export const EMP1_ANALYTICAL_SURFACE_ORDER = Object.freeze([
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
]);

export const EMP1_ANALYTICAL_SURFACE_PLACEMENT = Object.freeze({
  workflow: EMP1_ANALYTICAL_LAYOUT_REGIONS.WORKFLOW,
  route: EMP1_ANALYTICAL_LAYOUT_REGIONS.PRIMARY_WORK,
  source: EMP1_ANALYTICAL_LAYOUT_REGIONS.PRIMARY_WORK,
  engineeringEvidence: EMP1_ANALYTICAL_LAYOUT_REGIONS.ENGINEERING_BASIS,
  screeningCustody: EMP1_ANALYTICAL_LAYOUT_REGIONS.FULL_WIDTH_DETAIL,
  correlationAvailability: EMP1_ANALYTICAL_LAYOUT_REGIONS.ENGINEERING_BASIS,
  boundedCorrelation: EMP1_ANALYTICAL_LAYOUT_REGIONS.ENGINEERING_BASIS,
  runConfiguration: EMP1_ANALYTICAL_LAYOUT_REGIONS.PRIMARY_WORK,
  transactionSummary: EMP1_ANALYTICAL_LAYOUT_REGIONS.FULL_WIDTH_DETAIL,
  correlationResult: EMP1_ANALYTICAL_LAYOUT_REGIONS.FULL_WIDTH_DETAIL,
  settings: EMP1_ANALYTICAL_LAYOUT_REGIONS.ENGINEERING_BASIS,
  results: EMP1_ANALYTICAL_LAYOUT_REGIONS.FULL_WIDTH_DETAIL,
  lineage: EMP1_ANALYTICAL_LAYOUT_REGIONS.FULL_WIDTH_DETAIL,
  benchmarkEvidence: EMP1_ANALYTICAL_LAYOUT_REGIONS.FULL_WIDTH_DETAIL,
  benchmark: EMP1_ANALYTICAL_LAYOUT_REGIONS.FULL_WIDTH_DETAIL,
});

export const EMP1_TASK_SHELL_TASK_SURFACES = Object.freeze({
  BASIS_SOURCE: Object.freeze(['route', 'source']),
  GEOMETRY: Object.freeze(['runConfiguration']),
  LOADS: Object.freeze(['route', 'source']),
  LOAD_TRANSFER: Object.freeze(['route']),
  SECTION_SCREENING: Object.freeze(['route', 'source']),
  LOCAL_CORRELATION: Object.freeze(['runConfiguration']),
  REVIEW_EVIDENCE: Object.freeze(['route']),
});

export const EMP1_TASK_SHELL_EVIDENCE_ORDER = Object.freeze([
  'results',
  'transactionSummary',
  'correlationResult',
  'screeningCustody',
  'lineage',
  'benchmarkEvidence',
  'benchmark',
]);

const EVIDENCE_LABELS = Object.freeze({
  results: 'Current result',
  transactionSummary: 'Execution summary',
  correlationResult: 'Correlation evidence',
  screeningCustody: 'Screening custody',
  lineage: 'Lineage',
  benchmarkEvidence: 'Benchmark evidence',
  benchmark: 'Verification',
});

const TASK_DEFAULT_EVIDENCE = Object.freeze({
  BASIS_SOURCE: 'results',
  GEOMETRY: 'results',
  LOADS: 'results',
  LOAD_TRANSFER: 'results',
  SECTION_SCREENING: 'results',
  LOCAL_CORRELATION: 'correlationResult',
  REVIEW_EVIDENCE: 'transactionSummary',
});

const TASK_SHELL_SELECTION = new WeakMap();
const TASK_SHELL_RUNTIME = new WeakMap();

/**
 * Resolve or create presentation-only task-shell state for a persistent host.
 * The host is normally the LAFEA consumer root, so task/evidence selection can
 * survive a backing-stage rerender without entering engineering/controller state.
 */
export function emp1TaskShellSelection(selectionHost, initialTaskStep = 'BASIS_SOURCE') {
  if (!selectionHost || typeof selectionHost !== 'object') {
    throw new TypeError('EMP1_TASK_SHELL_SELECTION_HOST_REQUIRED');
  }
  assertTaskStep(initialTaskStep);
  let state = TASK_SHELL_SELECTION.get(selectionHost);
  if (!state) {
    state = { activeTaskStep: initialTaskStep, evidenceView: TASK_DEFAULT_EVIDENCE[initialTaskStep] };
    TASK_SHELL_SELECTION.set(selectionHost, state);
  }
  return Object.freeze({ ...state });
}

/** Presentation-only selection update; no engineering/controller state is mutated. */
export function selectEmp1TaskShellTask(selectionHost, shell, stepId) {
  assertTaskStep(stepId);
  const state = mutableSelection(selectionHost, stepId);
  state.activeTaskStep = stepId;
  state.evidenceView = TASK_DEFAULT_EVIDENCE[stepId] ?? state.evidenceView;
  const runtime = TASK_SHELL_RUNTIME.get(shell);
  if (runtime) applyTaskShellState(runtime);
  return Object.freeze({ ...state });
}

/**
 * Move each supplied, already-rendered surface exactly once into its declared
 * presentation region. Optional null surfaces remain absent. Heavy evidence is
 * retained in DOM custody but only one selected view participates in layout.
 */
export function composeEmp1AnalyticalLayout(shell, surfaces, options = {}) {
  if (!shell?.ownerDocument) throw new TypeError('EMP1_ANALYTICAL_LAYOUT_SHELL_REQUIRED');
  exactSurfaceKeys(surfaces);
  if (!nodeLike(surfaces.workflow)) {
    throw new TypeError('EMP1_ANALYTICAL_LAYOUT_WORKFLOW_REQUIRED');
  }

  const present = EMP1_ANALYTICAL_SURFACE_ORDER
    .map((surfaceId) => [surfaceId, surfaces[surfaceId]])
    .filter(([, surface]) => surface != null);
  const unique = new Set();
  present.forEach(([surfaceId, surface]) => {
    if (!nodeLike(surface)) {
      throw new TypeError(`EMP1_ANALYTICAL_LAYOUT_SURFACE_INVALID:${surfaceId}`);
    }
    if (unique.has(surface)) {
      throw new TypeError(`EMP1_ANALYTICAL_LAYOUT_SURFACE_DUPLICATE:${surfaceId}`);
    }
    unique.add(surface);
  });

  const selectionHost = options.selectionHost ?? shell;
  const initialTaskStep = options.initialTaskStep ?? 'BASIS_SOURCE';
  const state = mutableSelection(selectionHost, initialTaskStep);
  const regions = Object.fromEntries(Object.entries(REGION_DEFINITIONS).map(
    ([regionId, definition]) => [regionId, createRegion(shell.ownerDocument, regionId, definition)],
  ));

  const taskEntries = [];
  const evidenceEntries = [];
  present.forEach(([surfaceId, surface]) => {
    const regionId = EMP1_ANALYTICAL_SURFACE_PLACEMENT[surfaceId];
    surface.dataset.emp1LayoutSurface = surfaceId;
    surface.dataset.emp1LayoutRegion = regionId;
    if (regionId === EMP1_ANALYTICAL_LAYOUT_REGIONS.PRIMARY_WORK) taskEntries.push([surfaceId, surface]);
    if (regionId === EMP1_ANALYTICAL_LAYOUT_REGIONS.FULL_WIDTH_DETAIL) {
      evidenceEntries.push([surfaceId, surface]);
      return;
    }
    regions[regionId].append(surface);
  });

  const evidenceRegion = regions[EMP1_ANALYTICAL_LAYOUT_REGIONS.FULL_WIDTH_DETAIL];
  const orderedEvidence = EMP1_TASK_SHELL_EVIDENCE_ORDER
    .map((surfaceId) => evidenceEntries.find(([candidate]) => candidate === surfaceId))
    .filter(Boolean);
  const tabs = createEvidenceTabs(shell.ownerDocument, selectionHost, shell, orderedEvidence);
  evidenceRegion.append(tabs.tablist, ...orderedEvidence.map(([, surface]) => surface));

  const lanes = shell.ownerDocument.createElement('div');
  lanes.className = 'emp1-analytical-layout__lanes';
  lanes.dataset.role = 'emp1-analytical-layout-lanes';
  lanes.append(
    regions[EMP1_ANALYTICAL_LAYOUT_REGIONS.PRIMARY_WORK],
    regions[EMP1_ANALYTICAL_LAYOUT_REGIONS.ENGINEERING_BASIS],
  );

  shell.dataset.emp1TaskShell = 'true';
  shell.append(
    regions[EMP1_ANALYTICAL_LAYOUT_REGIONS.WORKFLOW],
    lanes,
    evidenceRegion,
  );

  const runtime = {
    selectionHost,
    shell,
    state,
    regions,
    taskEntries,
    evidenceEntries: orderedEvidence,
    tabs: tabs.buttons,
  };
  TASK_SHELL_RUNTIME.set(shell, runtime);
  applyTaskShellState(runtime);

  return Object.freeze({
    schema: EMP1_ANALYTICAL_LAYOUT_SCHEMA,
    presentSurfaceCount: present.length,
    regions: Object.freeze({ ...regions }),
    lanes,
    evidenceTabs: tabs.tablist,
    selectTask: (stepId) => selectEmp1TaskShellTask(selectionHost, shell, stepId),
    selectEvidence: (surfaceId) => selectEvidenceView(selectionHost, shell, surfaceId),
  });
}

export function emp1AnalyticalLayoutPlacementManifest() {
  return Object.freeze(EMP1_ANALYTICAL_SURFACE_ORDER.map((surfaceId) => Object.freeze({
    surfaceId,
    regionId: EMP1_ANALYTICAL_SURFACE_PLACEMENT[surfaceId],
  })));
}

function createEvidenceTabs(documentRef, selectionHost, shell, entries) {
  const tablist = documentRef.createElement('div');
  tablist.className = 'emp1-task-shell__evidence-tabs';
  tablist.dataset.role = 'emp1-evidence-tabs';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'EMP.1 results and evidence');
  const buttons = [];

  entries.forEach(([surfaceId, surface], index) => {
    const label = EVIDENCE_LABELS[surfaceId] ?? surfaceId;
    const button = documentRef.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.dataset.role = 'emp1-evidence-tab';
    button.dataset.emp1EvidenceView = surfaceId;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', 'false');
    button.tabIndex = index === 0 ? 0 : -1;
    button.addEventListener('click', () => selectEvidenceView(selectionHost, shell, surfaceId));
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const next = (index + direction + buttons.length) % buttons.length;
      buttons[next]?.focus?.();
      buttons[next]?.click?.();
    });
    buttons.push(button);
    tablist.append(button);

    surface.dataset.emp1EvidenceView = surfaceId;
    surface.setAttribute('role', 'tabpanel');
    surface.setAttribute('aria-label', label);
  });

  return { tablist, buttons };
}

function selectEvidenceView(selectionHost, shell, surfaceId) {
  const runtime = TASK_SHELL_RUNTIME.get(shell);
  if (!runtime) return false;
  if (!runtime.evidenceEntries.some(([candidate]) => candidate === surfaceId)) return false;
  const state = mutableSelection(selectionHost, runtime.state.activeTaskStep);
  state.evidenceView = surfaceId;
  applyEvidenceSelection(runtime);
  return true;
}

function applyTaskShellState(runtime) {
  const state = runtime.state;
  const visibleTaskSurfaces = new Set(EMP1_TASK_SHELL_TASK_SURFACES[state.activeTaskStep] ?? []);
  runtime.regions[EMP1_ANALYTICAL_LAYOUT_REGIONS.PRIMARY_WORK].dataset.emp1ActiveTask = state.activeTaskStep;
  runtime.shell.dataset.emp1ProfessionalTask = state.activeTaskStep;

  runtime.taskEntries.forEach(([surfaceId, surface]) => {
    const visible = visibleTaskSurfaces.has(surfaceId);
    surface.hidden = !visible;
    surface.dataset.emp1TaskActive = String(visible);
  });

  const desiredEvidence = TASK_DEFAULT_EVIDENCE[state.activeTaskStep];
  if (desiredEvidence && runtime.evidenceEntries.some(([surfaceId]) => surfaceId === desiredEvidence)) {
    state.evidenceView = desiredEvidence;
  }
  applyEvidenceSelection(runtime);
}

function applyEvidenceSelection(runtime) {
  const available = runtime.evidenceEntries.map(([surfaceId]) => surfaceId);
  if (!available.length) return;
  const selected = available.includes(runtime.state.evidenceView)
    ? runtime.state.evidenceView
    : available.includes('results') ? 'results' : available[0];
  runtime.state.evidenceView = selected;
  const region = runtime.regions[EMP1_ANALYTICAL_LAYOUT_REGIONS.FULL_WIDTH_DETAIL];
  region.dataset.emp1EvidenceView = selected;

  runtime.evidenceEntries.forEach(([surfaceId, surface]) => {
    const visible = surfaceId === selected;
    surface.hidden = !visible;
    surface.dataset.emp1EvidenceActive = String(visible);
  });
  runtime.tabs.forEach((button) => {
    const selectedButton = button.dataset.emp1EvidenceView === selected;
    button.setAttribute('aria-selected', String(selectedButton));
    button.tabIndex = selectedButton ? 0 : -1;
  });
}

function mutableSelection(selectionHost, initialTaskStep) {
  if (!selectionHost || typeof selectionHost !== 'object') {
    throw new TypeError('EMP1_TASK_SHELL_SELECTION_HOST_REQUIRED');
  }
  assertTaskStep(initialTaskStep);
  let state = TASK_SHELL_SELECTION.get(selectionHost);
  if (!state) {
    state = { activeTaskStep: initialTaskStep, evidenceView: TASK_DEFAULT_EVIDENCE[initialTaskStep] };
    TASK_SHELL_SELECTION.set(selectionHost, state);
  }
  return state;
}

function assertTaskStep(stepId) {
  if (!Object.prototype.hasOwnProperty.call(EMP1_TASK_SHELL_TASK_SURFACES, stepId)) {
    throw new TypeError(`EMP1_TASK_SHELL_STEP_UNSUPPORTED:${stepId}`);
  }
}

function createRegion(documentRef, regionId, definition) {
  const section = documentRef.createElement('section');
  section.className = 'emp1-analytical-layout__region';
  section.dataset.role = definition.role;
  section.dataset.emp1LayoutRegion = regionId;
  section.dataset.emp1TaskShellRegion = regionId;
  section.setAttribute('aria-label', definition.label);
  return section;
}

function exactSurfaceKeys(surfaces) {
  if (!surfaces || typeof surfaces !== 'object' || Array.isArray(surfaces)) {
    throw new TypeError('EMP1_ANALYTICAL_LAYOUT_SURFACES_REQUIRED');
  }
  const expected = [...EMP1_ANALYTICAL_SURFACE_ORDER].sort();
  const actual = Object.keys(surfaces).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new TypeError('EMP1_ANALYTICAL_LAYOUT_SURFACE_KEYS_MISMATCH');
  }
}

function nodeLike(value) {
  return Boolean(value)
    && typeof value === 'object'
    && Number.isInteger(value.nodeType)
    && typeof value.append === 'function';
}
