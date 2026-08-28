import {
  INPUTXML_BACKTRACK_REPAIR_LENGTH_LIMIT_MM,
  findInputXmlBacktrackingElements,
  repairInputXmlCollinearBacktracks,
} from '../core/geometry/adapters/inputxml-collinear-backtrack-repair.js';

export const LFEA_PIPELINE_MODEL_REPAIR_PANEL_SCHEMA = 'lfea-pipeline-model-repair-panel/v1';

/**
 * Offer the one source-model correction this pipeline can make safely, when
 * the loaded model actually needs it.
 *
 * TOPOLOGY_COLLINEAR_SEGMENT_OVERLAP is a correct finding: short elements that
 * declare a direction opposing the run they sit in walk backwards over
 * centreline a neighbour already owns, so two elements genuinely claim the same
 * physical interval. The detector is not relaxed to clear it. Instead the
 * engineer is shown exactly which elements are wrong, exactly what would
 * change, and asked to authorize it -- the correction is a model edit they
 * make, not something applied behind them.
 *
 * The panel appears only when the rule matches. If a model blocks on overlap
 * for some other reason, it stays silent rather than offering a fix that would
 * not address it.
 */
export function mountLfeaPipelineModelRepairPanel(hostElement, options = {}) {
  if (!hostElement || typeof hostElement.append !== 'function') {
    throw new TypeError('Model repair panel requires a host element.');
  }
  if (typeof options.getSourceText !== 'function') {
    throw new TypeError('Model repair panel requires options.getSourceText.');
  }
  const documentRef = options.documentRef ?? hostElement.ownerDocument ?? document;
  return new LfeaPipelineModelRepairPanelController(hostElement, documentRef, options).init();
}

export class LfeaPipelineModelRepairPanelController {
  constructor(hostElement, documentRef, options) {
    this.hostElement = hostElement;
    this.documentRef = documentRef;
    this.options = options;
    this.elements = null;
    this.initialized = false;
    this.candidates = [];
    this.message = '';
    this.error = '';
  }

  init() {
    if (this.initialized) return this;
    this.elements = createRepairSection(this.documentRef);
    this.hostElement.append(this.elements.section);
    this.elements.applyButton.addEventListener('click', () => this.applyRepair());
    this.initialized = true;
    this.refresh();
    return this;
  }

  /** Candidates in the currently loaded source, or none. */
  detect() {
    // An ACCDB import gets the same diagnosis and no Apply button. Its geometry
    // is owned by the file -- accdb-field-overrides.js excludes DELTA_X/Y/Z so
    // an override can never silently move a model -- so the engineer is told
    // exactly which elements are wrong and makes the edit in CAESAR. Reporting
    // it is strictly better than the previous behaviour, which was to raise the
    // overlap finding and offer nothing.
    const accdb = this.options.getAccdbDiagnosis?.() ?? null;
    if (accdb !== null) {
      this.repairable = false;
      return accdb.findings.map((finding) => ({
        elementNumber: finding.elementId,
        length: finding.lengthM,
        declared: finding.declared,
        corrected: finding.corrected,
      }));
    }
    this.repairable = true;
    const source = this.options.getSourceText();
    if (typeof source !== 'string' || source.length === 0) return [];
    try {
      return findInputXmlBacktrackingElements(source).map((repair) => ({
        elementNumber: repair.element.index + 1,
        length: repair.length,
        declared: repair.vector,
        corrected: repair.vector.map((value) => -value),
      }));
    } catch {
      // A source this rule cannot read is simply not a candidate for it.
      return [];
    }
  }

  applyRepair() {
    this.error = '';
    try {
      const source = this.options.getSourceText();
      const { xml, repairs } = repairInputXmlCollinearBacktracks(source);
      if (repairs.length === 0) throw new Error('No backtracking elements remain to correct.');
      this.options.onRepaired?.(xml, repairs.length);
      this.message = `Corrected ${repairs.length} element(s). The model was re-checked with the correction applied.`;
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    }
    this.refresh();
  }

  refresh() {
    this.candidates = this.detect();
    const { section, body, applyButton, status } = this.elements;
    section.hidden = this.candidates.length === 0 && this.message === '' && this.error === '';
    body.replaceChildren();
    if (this.candidates.length > 0) {
      body.append(explanation(this.documentRef, this.candidates.length));
      body.append(candidateTable(this.documentRef, this.candidates));
    }
    applyButton.hidden = this.candidates.length === 0 || this.repairable === false;
    if (this.candidates.length > 0 && this.repairable === false) {
      body.append(sourceOwnedNotice(this.documentRef));
    }
    status.textContent = this.error === '' ? this.message : this.error;
    status.dataset.status = this.error === '' ? 'ok' : 'error';
    return this;
  }

  getSnapshot() {
    return Object.freeze({
      schema: LFEA_PIPELINE_MODEL_REPAIR_PANEL_SCHEMA,
      candidateCount: this.candidates.length,
      repairable: this.repairable !== false,
      elementNumbers: Object.freeze(this.candidates.map((row) => row.elementNumber)),
    });
  }

  destroy() {
    if (this.elements) this.elements.section.remove();
    this.elements = null;
    this.initialized = false;
  }
}

function createRepairSection(doc) {
  const section = doc.createElement('section');
  section.className = 'lfea-pipeline-model-repair';
  section.dataset.role = 'lfea-pipeline-model-repair-panel';
  section.hidden = true;
  const title = doc.createElement('h3');
  title.textContent = 'Suggested source correction';
  const body = doc.createElement('div');
  const applyButton = doc.createElement('button');
  applyButton.type = 'button';
  applyButton.dataset.action = 'lfea-pipeline-apply-model-repair';
  applyButton.textContent = 'Apply correction and re-check';
  const status = doc.createElement('output');
  status.dataset.role = 'lfea-pipeline-model-repair-status';
  section.append(title, body, applyButton, status);
  return { section, body, applyButton, status };
}

function explanation(doc, count) {
  const p = doc.createElement('p');
  p.dataset.role = 'lfea-pipeline-model-repair-explanation';
  p.textContent = `${count} element(s) shorter than ${INPUTXML_BACKTRACK_REPAIR_LENGTH_LIMIT_MM} mm `
    + 'declare a direction opposite to the long runs on both sides of them, so they retrace centreline '
    + 'a neighbouring element already covers. That is what the collinear-overlap findings are reporting, '
    + 'and it is a sign error in the source model rather than a false positive. '
    + 'Applying the correction flips only the delta sign on the elements listed below; nothing else in '
    + 'the file changes, and the model is re-checked afterwards so you see the result.';
  return p;
}

function candidateTable(doc, candidates) {
  const table = doc.createElement('table');
  table.className = 'lfea-pipeline-model-repair__table';
  table.dataset.role = 'lfea-pipeline-model-repair-table';
  const head = doc.createElement('tr');
  for (const label of ['Element', 'Length [mm]', 'Declared', 'Corrected']) {
    const th = doc.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    head.append(th);
  }
  table.append(head);
  for (const row of candidates) {
    const tr = doc.createElement('tr');
    for (const cell of [
      row.elementNumber,
      row.length,
      `(${row.declared.join(', ')})`,
      `(${row.corrected.join(', ')})`,
    ]) {
      const td = doc.createElement('td');
      td.textContent = String(cell);
      tr.append(td);
    }
    table.append(tr);
  }
  return table;
}

/** Why an ACCDB import is shown the diagnosis but not an Apply button. */
function sourceOwnedNotice(doc) {
  const note = doc.createElement('p');
  note.dataset.role = 'lfea-pipeline-model-repair-source-owned';
  note.textContent = 'This model came from a CAESAR II database, whose geometry stays owned by '
    + 'the file — this tool will not rewrite element coordinates behind you. Correct these '
    + 'elements in CAESAR and re-import.';
  return note;
}
