export const LFEA_PIPELINE_RUN_PANEL_SCHEMA = 'lfea-pipeline-run-panel/v1';

/** Presentation-only execution surface for the Run step. */
export function mountLfeaPipelineRunPanel(hostElement, options = {}) {
  if (!hostElement || typeof hostElement.append !== 'function') throw new TypeError('Run panel requires a host element.');
  if (typeof options.getPreFlight !== 'function') throw new TypeError('Run panel requires options.getPreFlight.');
  const documentRef = options.documentRef ?? hostElement.ownerDocument ?? document;
  return new LfeaPipelineRunPanelController(hostElement, documentRef, options).init();
}

export class LfeaPipelineRunPanelController {
  constructor(hostElement, documentRef, options) {
    this.hostElement = hostElement;
    this.documentRef = documentRef;
    this.options = options;
    this.elements = null;
    this.error = '';
  }

  init() {
    if (this.elements) return this;
    this.elements = createRunSection(this.documentRef);
    this.elements.analyzeButton.addEventListener('click', () => this.requestAnalysis());
    this.hostElement.append(this.elements.section);
    this.refresh();
    return this;
  }

  requestedCaseIds() {
    const ids = this.options.getPreFlight()?.preparation?.requestedCaseIds;
    return Array.isArray(ids) ? [...ids] : [];
  }

  runAvailability() {
    const preFlight = this.options.getPreFlight();
    const caseIds = this.requestedCaseIds();
    if (!preFlight) return { ready: false, reason: 'Load a model and clear Error check first.', caseIds };
    if (!preFlight.solveAuthorized || preFlight.authorization === null) return { ready: false, reason: 'The current pre-flight is not authorized. Return to Error check.', caseIds };
    if (caseIds.length === 0) return { ready: false, reason: 'No cases are sealed into the current pre-flight. Apply a selection on Load case.', caseIds };
    const caseCustody = this.options.getCaseSelectionCustody?.() ?? null;
    if (caseCustody?.ready === false) {
      return {
        ready: false,
        reason: caseCustody.reason ?? 'The Load-case selection is not sealed into the current pre-flight.',
        caseIds,
      };
    }
    return { ready: true, reason: `${caseIds.length} authorized case(s) are ready to analyze.`, caseIds };
  }

  requestAnalysis() {
    this.error = '';
    const availability = this.runAvailability();
    if (!availability.ready) {
      this.error = availability.reason;
      this.refresh();
      return;
    }
    try {
      const state = this.options.onAnalyze?.(availability.caseIds);
      this.dispatch('lfea-pipeline-analysis-completed', { caseIds: availability.caseIds, resultStatus: state?.status ?? 'CURRENT' });
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      this.refresh();
    }
  }

  refresh() {
    const availability = this.runAvailability();
    this.elements.caseList.replaceChildren();
    for (const caseId of availability.caseIds) {
      const item = this.documentRef.createElement('li');
      item.textContent = caseLabel(caseId);
      item.dataset.caseId = caseId;
      this.elements.caseList.append(item);
    }
    if (availability.caseIds.length === 0) {
      const item = this.documentRef.createElement('li');
      item.className = 'panel-empty';
      item.textContent = 'No applied cases.';
      this.elements.caseList.append(item);
    }
    this.elements.status.textContent = this.error || availability.reason;
    this.elements.status.dataset.status = this.error ? 'error' : availability.ready ? 'ready' : 'blocked';
    this.elements.analyzeButton.disabled = !availability.ready;
    this.dispatch('lfea-pipeline-run-readiness-changed', { ready: availability.ready, reason: availability.reason, caseIds: availability.caseIds });
    return this;
  }

  dispatch(type, detail) {
    const EventCtor = this.documentRef.defaultView?.CustomEvent ?? globalThis.CustomEvent;
    if (typeof EventCtor !== 'function') return;
    this.elements?.section.dispatchEvent(new EventCtor(type, { bubbles: true, detail }));
  }

  getSnapshot() {
    const availability = this.runAvailability();
    return Object.freeze({ schema: LFEA_PIPELINE_RUN_PANEL_SCHEMA, ready: availability.ready, requestedCaseIds: Object.freeze(availability.caseIds) });
  }

  destroy() { this.elements?.section.remove(); this.elements = null; }
}

function createRunSection(doc) {
  const section = doc.createElement('section');
  section.className = 'lfea-pipeline-run';
  section.dataset.role = 'lfea-pipeline-run-panel';
  const heading = doc.createElement('h2');
  heading.textContent = 'Run analysis';
  const intro = doc.createElement('p');
  intro.className = 'lfea-pipeline-run__intro';
  intro.textContent = 'Execute the cases already sealed into the authorized pre-flight. Change cases on Load case, not here.';
  const caseHeading = doc.createElement('h3');
  caseHeading.textContent = 'Cases to run';
  const caseList = doc.createElement('ul');
  caseList.className = 'lfea-pipeline-run__cases';
  caseList.dataset.role = 'lfea-pipeline-run-cases';
  const analyzeButton = doc.createElement('button');
  analyzeButton.type = 'button';
  analyzeButton.className = 'lfea-pipeline-run__analyze';
  analyzeButton.dataset.action = 'lfea-pipeline-analyze';
  analyzeButton.textContent = 'Analyze';
  const status = doc.createElement('output');
  status.dataset.role = 'lfea-pipeline-run-status';
  section.append(heading, intro, caseHeading, caseList, analyzeButton, status);
  return { section, caseList, analyzeButton, status };
}

function caseLabel(caseId) {
  const token = String(caseId).slice(String(caseId).indexOf('-') + 1);
  return token
    .replace(/^WPTH$/u, 'W+P1+T1+H')
    .replace(/^WPH$/u, 'W+P1+H')
    .replace(/^WTH$/u, 'W+T1+H')
    .replace(/^WH$/u, 'W+H')
    .replace(/^WPT$/u, 'W+P1+T1')
    .replace(/^WP$/u, 'W+P1')
    .replace(/^WT$/u, 'W+T1');
}
