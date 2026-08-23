import {
  LFEA_RESULTS_AUTHORITY_PRESENTATION_SCHEMA,
  buildLfeaResultsAuthorityPresentation,
} from './lfea-results-authority-presentation.js';

export const LFEA_RESULTS_AUTHORITY_PANEL_SCHEMA = 'lfea-results-authority-panel/v1';

export function mountLfeaResultsAuthorityPanel(hostElement, options = {}) {
  if (!hostElement || typeof hostElement.append !== 'function') {
    throw new TypeError('LFEA results authority panel requires a results host.');
  }
  const documentRef = options.documentRef ?? hostElement.ownerDocument ?? document;
  return new LfeaResultsAuthorityPanelController(hostElement, documentRef, options).init();
}

export class LfeaResultsAuthorityPanelController {
  constructor(hostElement, documentRef, options) {
    this.hostElement = hostElement;
    this.documentRef = documentRef;
    this.options = options;
    this.section = null;
    this.stepObserver = null;
    this.workbenchObserver = null;
    this.observedWorkbench = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return this;
    this.section = this.documentRef.createElement('section');
    this.section.className = 'lfea-results-authority';
    this.section.dataset.role = 'lfea-results-authority-panel';
    this.section.dataset.schema = LFEA_RESULTS_AUTHORITY_PANEL_SCHEMA;
    this.hostElement.append(this.section);
    this.observeStepState();
    this.syncActiveStep();
    this.refresh();
    this.initialized = true;
    return this;
  }

  refresh() {
    if (!this.section) return this;
    this.ensureWorkbenchObserver();
    const workspace = this.options.workspace ?? globalThis.AnalysisWorkspace ?? null;
    const presentation = buildLfeaResultsAuthorityPresentation({
      analysisState: workspace?.getLfeaAnalysisState?.() ?? null,
      applicationState: workspace?.getLinearPipingResultState?.() ?? null,
      applicationPresentation: workspace?.getLinearPipingPresentation?.() ?? null,
    });
    this.render(presentation);
    return this;
  }

  render(presentation) {
    if (!presentation || presentation.schema !== LFEA_RESULTS_AUTHORITY_PRESENTATION_SCHEMA) {
      throw new TypeError('LFEA results authority panel requires the read-only authority presentation.');
    }
    const title = heading(this.documentRef, 'Engineering result authority');
    const note = paragraph(
      this.documentRef,
      'Linear analysis, optional code assessment, and application qualification are separate authorities. A successful solve is not a code-compliance statement.',
    );
    note.className = 'lfea-results-authority__note';
    this.section.replaceChildren(
      title,
      note,
      renderExecution(this.documentRef, presentation.execution),
      renderCodeAssessment(this.documentRef, presentation.codeAssessment),
      renderQualification(this.documentRef, presentation.qualification),
    );
    this.section.dataset.executionStatus = presentation.execution.status;
    this.section.dataset.codeAssessmentStatus = presentation.codeAssessment.status;
    this.section.dataset.qualificationAvailability = presentation.qualification.availability;
  }

  observeStepState() {
    const Observer = this.documentRef.defaultView?.MutationObserver ?? globalThis.MutationObserver;
    const shell = this.hostElement.closest?.('[data-role="lfea-pipeline-shell"]') ?? null;
    const stepper = shell?.querySelector?.('.lfea-pipeline-shell__stepper') ?? null;
    if (!Observer || !stepper) return;
    this.stepObserver = new Observer(() => {
      this.syncActiveStep();
      this.refresh();
    });
    this.stepObserver.observe(stepper, {
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-current'],
    });
  }

  syncActiveStep() {
    const shell = this.hostElement.closest?.('[data-role="lfea-pipeline-shell"]') ?? null;
    const active = shell?.querySelector?.('[data-role="lfea-pipeline-step"][aria-current="step"]') ?? null;
    if (active?.dataset?.stepId) this.hostElement.dataset.activeStep = active.dataset.stepId;
  }

  ensureWorkbenchObserver() {
    const workbench = this.hostElement.querySelector?.('[data-role="linear-piping-results-workbench"]') ?? null;
    if (workbench === this.observedWorkbench) return;
    this.workbenchObserver?.disconnect();
    this.workbenchObserver = null;
    this.observedWorkbench = workbench;
    const Observer = this.documentRef.defaultView?.MutationObserver ?? globalThis.MutationObserver;
    if (!Observer || !workbench) return;
    this.workbenchObserver = new Observer(() => this.refresh());
    this.workbenchObserver.observe(workbench, {
      attributes: true,
      attributeFilter: ['data-current', 'data-run-status', 'data-pre-run-status', 'data-qualification-status'],
    });
  }

  getSnapshot() {
    return Object.freeze({
      schema: LFEA_RESULTS_AUTHORITY_PANEL_SCHEMA,
      activeStep: this.hostElement?.dataset?.activeStep ?? null,
      executionStatus: this.section?.dataset?.executionStatus ?? null,
      codeAssessmentStatus: this.section?.dataset?.codeAssessmentStatus ?? null,
      qualificationAvailability: this.section?.dataset?.qualificationAvailability ?? null,
      editable: false,
    });
  }

  destroy() {
    this.stepObserver?.disconnect();
    this.workbenchObserver?.disconnect();
    this.stepObserver = null;
    this.workbenchObserver = null;
    this.observedWorkbench = null;
    this.section?.remove();
    this.section = null;
    this.initialized = false;
  }
}

function renderExecution(doc, value) {
  const section = viewSection(doc, 'RUN', 'Analysis execution', 'lfea-results-authority-execution-view');
  if (value.status !== 'CURRENT') {
    section.append(paragraph(doc, 'No current linear-analysis result is retained.'));
    return section;
  }
  section.append(keyValueTable(doc, [
    ['Result currentness', value.status],
    ['Cases retained', value.caseCount],
    ['Cases with blocking execution checks', value.blockedCaseCount],
  ]));
  const table = tableFromRows(doc, ['Case', 'Execution status', 'Blocking check IDs'], value.cases.map((row) => [
    row.caseId,
    row.executionStatus,
    row.blockingCheckIds.join(', ') || 'None',
  ]));
  section.append(table);
  const note = paragraph(doc, 'Execution status describes the linear solve/recovery chain only. It does not imply code compliance.');
  note.className = 'lfea-results-authority__disclosure';
  section.append(note);
  return section;
}

function renderCodeAssessment(doc, value) {
  const section = viewSection(doc, 'OUTPUT', 'Code Assessment (optional)', 'lfea-results-authority-code-view');
  const state = paragraph(doc, `B31.3 code assessment: ${value.status}`);
  state.dataset.role = 'lfea-results-authority-code-status';
  section.append(state);
  if (value.status !== 'PERFORMED') {
    const note = paragraph(doc, value.status === 'NOT_CURRENT'
      ? 'A code-assessment presentation exists but is not current. No code result is presented as usable.'
      : 'No sealed B31.3 code-check result is current. A successful linear analysis must not be read as code compliance.');
    note.className = 'lfea-results-authority__disclosure';
    section.append(note);
  } else {
    section.append(keyValueTable(doc, [
      ['Code checks', value.codeCheckCount],
      ['Exact retained result statuses', statusText(value.codeStatusCounts)],
    ]));
    section.append(tableFromRows(
      doc,
      ['Check', 'Category', 'Component', 'Code point', 'Combination', 'Profile', 'Calculated [Pa]', 'Allowable [Pa]', 'Utilization', 'Status', 'Result hash'],
      value.codeRows.map((row) => [
        row.checkId, row.category ?? '', row.componentId ?? '', row.codePointId ?? '', row.combinationId ?? '',
        row.codeProfileId ?? '', scalar(row.calculatedStress), scalar(row.allowableStress), scalar(row.utilization),
        row.status, row.semanticHash ?? '',
      ]),
    ));
  }

  const nozzleHeading = heading(doc, 'Configured nozzle assessment');
  nozzleHeading.className = 'lfea-results-authority__subheading';
  section.append(nozzleHeading);
  if (value.nozzleAssessmentCount === 0) {
    section.append(paragraph(doc, 'No current configured nozzle-assessment rows are retained.'));
  } else {
    section.append(tableFromRows(
      doc,
      ['Nozzle', 'Case', 'Assessment', 'Qualification', 'Utilization', 'Assessment hash'],
      value.nozzleRows.map((row) => [
        row.interfaceId, row.loadCaseId ?? '', row.assessmentStatus, row.qualificationStatus ?? '',
        scalar(row.utilization), row.semanticHash ?? '',
      ]),
    ));
  }
  return section;
}

function renderQualification(doc, value) {
  const section = viewSection(doc, 'EXPORT', 'Application Qualification & export evidence', 'lfea-results-authority-qualification-view');
  const status = paragraph(doc, `Application qualification evidence: ${value.availability}`);
  status.dataset.role = 'lfea-results-authority-qualification-status';
  section.append(status);
  if (value.availability !== 'CURRENT') {
    section.append(paragraph(doc, value.availability === 'NOT_CURRENT'
      ? 'A retained application presentation is not current. Engineering export authority is not claimed here.'
      : 'No CURRENT sealed application package is available. Analysis-result CSV export remains separate below.'));
    return section;
  }
  section.append(keyValueTable(doc, [
    ['Application', value.applicationId ?? 'UNAVAILABLE'],
    ['Application status', value.applicationStatus ?? 'UNAVAILABLE'],
    ['Export eligibility', value.exportEligibility ?? 'UNAVAILABLE'],
    ['Currency', value.currency ?? 'UNAVAILABLE'],
    ['Application result hash', value.applicationResultSemanticHash ?? 'UNAVAILABLE'],
    ['Presentation hash', value.presentationSemanticHash ?? 'UNAVAILABLE'],
    ['Presentation evidence hash', value.presentationEvidenceHash ?? 'UNAVAILABLE'],
  ]));
  const note = paragraph(doc, 'Application qualification governs the sealed application package/currentness/export path. Individual B31.3 check status remains in Code Assessment and is not inferred from this application status.');
  note.className = 'lfea-results-authority__disclosure';
  section.append(note);
  if (value.notConfigured.length > 0) {
    section.append(listWithHeading(doc, 'Not configured', value.notConfigured));
  }
  if (value.limitations.length > 0) {
    section.append(listWithHeading(doc, 'Retained limitations', value.limitations.map((row) => (
      `${row.sourceKind ?? 'UNKNOWN'}:${row.sourceId ?? 'UNKNOWN'} — ${row.disclosure ?? 'No disclosure text retained'}`
    ))));
  }
  return section;
}

function viewSection(doc, stepId, titleText, role) {
  const section = doc.createElement('section');
  section.className = 'lfea-results-authority__view';
  section.dataset.role = role;
  section.dataset.stepId = stepId;
  section.append(heading(doc, titleText));
  return section;
}

function heading(doc, text) {
  const node = doc.createElement('h3');
  node.textContent = text;
  return node;
}

function paragraph(doc, text) {
  const node = doc.createElement('p');
  node.textContent = text;
  return node;
}

function keyValueTable(doc, rows) {
  return tableFromRows(doc, ['Evidence', 'Retained value'], rows);
}

function tableFromRows(doc, headings, rows) {
  const wrap = doc.createElement('div');
  wrap.className = 'lfea-results-authority__scroll';
  const table = doc.createElement('table');
  const head = doc.createElement('tr');
  for (const label of headings) {
    const th = doc.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    head.append(th);
  }
  table.append(head);
  for (const row of rows) {
    const tr = doc.createElement('tr');
    for (const value of row) {
      const td = doc.createElement('td');
      td.textContent = String(value);
      tr.append(td);
    }
    table.append(tr);
  }
  wrap.append(table);
  return wrap;
}

function listWithHeading(doc, label, rows) {
  const root = doc.createElement('div');
  const title = doc.createElement('strong');
  title.textContent = label;
  const list = doc.createElement('ul');
  for (const row of rows) {
    const item = doc.createElement('li');
    item.textContent = row;
    list.append(item);
  }
  root.append(title, list);
  return root;
}

function statusText(counts) {
  const entries = Object.entries(counts);
  return entries.length === 0 ? 'None' : entries.map(([status, count]) => `${status} ${count}`).join(' · ');
}

function scalar(value) {
  return value === null || value === undefined ? '' : String(value);
}
