export const LFEA_PIPELINE_CASE_SELECTION_PANEL_SCHEMA = 'lfea-pipeline-case-selection-panel/v1';

/**
 * The Load-case step's primary control: pick which of the model's own
 * analysis cases to run.
 *
 * A piping engineer expects to choose W, W+P1, W+T1, W+P1+T1 -- the standard
 * weight/pressure/thermal combinations -- not to type force components. Those
 * cases are already synthesized by compileInputXmlLinearPhysicalCases from the
 * model's own declared data, so this panel selects among them rather than
 * inventing anything. Applying a selection re-runs governed preparation via
 * setRequestedCaseIds, because the requested case set is sealed into
 * preparation identity and cannot be changed after the fact.
 *
 * Cases the model itself declares as applied force vectors (F1..Fn, from
 * CAESAR FORCESMOMENTS records) are listed separately: CAESAR numbers them
 * into sets that are commonly ALTERNATIVE occasional directions, so they are
 * never summed together and are not offered as a default.
 */
const EMPTY_MESSAGE = 'Load a model and run Error check to see its analysis cases.';

const CASE_PRESENTATION = Object.freeze({
  WEIGHT_BASE: { label: 'W', description: 'Weight', category: 'STANDARD' },
  WEIGHT_PRESSURE: { label: 'W+P1', description: 'Weight + pressure', category: 'STANDARD' },
  WEIGHT_TEMPERATURE: { label: 'W+T1', description: 'Weight + thermal', category: 'STANDARD' },
  WEIGHT_PRESSURE_TEMPERATURE: { label: 'W+P1+T1', description: 'Weight + pressure + thermal', category: 'STANDARD' },
  APPLIED_FORCE_SET: { label: null, description: 'Declared applied force set', category: 'FORCE_SET' },
  AUTHORED_APPLIED_MECHANICAL: { label: null, description: 'Authored nodal load', category: 'AUTHORED' },
});

export function mountLfeaPipelineCaseSelectionPanel(hostElement, options = {}) {
  if (!hostElement || typeof hostElement.append !== 'function') {
    throw new TypeError('Case selection panel requires a host element.');
  }
  if (typeof options.getPreFlight !== 'function') {
    throw new TypeError('Case selection panel requires options.getPreFlight.');
  }
  const documentRef = options.documentRef ?? hostElement.ownerDocument ?? document;
  return new LfeaPipelineCaseSelectionPanelController(hostElement, documentRef, options).init();
}

export class LfeaPipelineCaseSelectionPanelController {
  constructor(hostElement, documentRef, options) {
    this.hostElement = hostElement;
    this.documentRef = documentRef;
    this.options = options;
    this.elements = null;
    this.initialized = false;
    this.selected = new Set();
    this.message = EMPTY_MESSAGE;
    this.error = '';
  }

  init() {
    if (this.initialized) return this;
    this.elements = createCaseSelectionSection(this.documentRef);
    this.hostElement.append(this.elements.section);
    this.elements.applyButton.addEventListener('click', () => this.applySelection());
    this.elements.analyzeButton.addEventListener('click', () => this.requestAnalysis());
    this.initialized = true;
    this.refresh();
    return this;
  }

  availableCases() {
    const cases = this.options.getPreFlight()?.preparation?.physicalPreparation?.physicalCases;
    if (!Array.isArray(cases)) return [];
    return cases
      .map((row) => {
        const presentation = CASE_PRESENTATION[row.caseRole] ?? null;
        const token = row.caseId.slice(row.caseId.indexOf('-') + 1);
        return {
          caseId: row.caseId,
          label: presentation?.label ?? token,
          description: presentation?.description ?? row.caseRole,
          category: presentation?.category ?? 'OTHER',
        };
      })
      .sort((left, right) => compareCases(left, right));
  }

  /** Selected case IDs, defaulting to the standard cases when nothing is set. */
  getSelectedCaseIds() {
    const available = this.availableCases();
    const live = available.filter((row) => this.selected.has(row.caseId)).map((row) => row.caseId);
    if (live.length > 0) return live;
    return available.filter((row) => row.category === 'STANDARD').map((row) => row.caseId);
  }

  applySelection() {
    this.error = '';
    try {
      const caseIds = this.getSelectedCaseIds();
      if (caseIds.length === 0) throw new Error('Select at least one analysis case.');
      this.options.onApplyCaseSelection?.(caseIds);
      this.message = `Requested ${caseIds.length} case(s). Pre-flight was regenerated for this selection.`;
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    }
    this.refresh();
  }

  requestAnalysis() {
    this.error = '';
    try {
      this.options.onAnalyze?.(this.getSelectedCaseIds());
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      this.refresh();
    }
  }

  refresh() {
    const available = this.availableCases();
    const selected = new Set(this.getSelectedCaseIds());
    const { list } = this.elements;
    list.replaceChildren();
    if (available.length === 0) {
      list.append(emptyRow(this.documentRef, 'No analysis cases yet.'));
    } else {
      let lastCategory = null;
      for (const row of available) {
        if (row.category !== lastCategory) {
          list.append(categoryHeading(this.documentRef, row.category));
          lastCategory = row.category;
        }
        list.append(caseRow(this.documentRef, row, selected.has(row.caseId), (caseId, checked) => {
          if (checked) this.selected.add(caseId); else this.selected.delete(caseId);
        }));
      }
    }
    // Keep the standing message honest: it was written for the empty state and
    // would otherwise still say "load a model" with the model's cases listed
    // right above it.
    if (this.error === '' && available.length > 0 && this.message === EMPTY_MESSAGE) {
      this.message = `${available.length} case(s) available. Choose which to analyze, then Apply selection.`;
    }
    if (available.length === 0) this.message = EMPTY_MESSAGE;
    this.elements.status.textContent = this.error === '' ? this.message : this.error;
    this.elements.status.dataset.status = this.error === '' ? 'ok' : 'error';
    this.elements.applyButton.disabled = available.length === 0;
    this.elements.analyzeButton.disabled = available.length === 0;
    return this;
  }

  getSnapshot() {
    return Object.freeze({
      schema: LFEA_PIPELINE_CASE_SELECTION_PANEL_SCHEMA,
      availableCaseIds: Object.freeze(this.availableCases().map((row) => row.caseId)),
      selectedCaseIds: Object.freeze(this.getSelectedCaseIds()),
    });
  }

  destroy() {
    if (this.elements) this.elements.section.remove();
    this.elements = null;
    this.initialized = false;
  }
}

const CATEGORY_ORDER = Object.freeze({ STANDARD: 0, FORCE_SET: 1, AUTHORED: 2, OTHER: 3 });
const CATEGORY_LABELS = Object.freeze({
  STANDARD: 'Analysis cases',
  FORCE_SET: 'Declared force sets — alternative directions, never summed together',
  AUTHORED: 'Authored nodal loads',
  OTHER: 'Other cases',
});

function compareCases(left, right) {
  const byCategory = CATEGORY_ORDER[left.category] - CATEGORY_ORDER[right.category];
  if (byCategory !== 0) return byCategory;
  return left.caseId < right.caseId ? -1 : left.caseId > right.caseId ? 1 : 0;
}

function createCaseSelectionSection(doc) {
  const section = doc.createElement('section');
  section.className = 'lfea-pipeline-case-selection';
  section.dataset.role = 'lfea-pipeline-case-selection-panel';
  const title = doc.createElement('h2');
  title.textContent = 'Load cases';
  const list = doc.createElement('div');
  list.className = 'lfea-pipeline-case-selection__list';
  list.dataset.role = 'lfea-pipeline-case-list';
  const toolbar = doc.createElement('div');
  toolbar.className = 'lfea-pipeline-case-selection__toolbar';
  const applyButton = doc.createElement('button');
  applyButton.type = 'button';
  applyButton.dataset.action = 'lfea-pipeline-apply-cases';
  applyButton.textContent = 'Apply selection';
  const analyzeButton = doc.createElement('button');
  analyzeButton.type = 'button';
  analyzeButton.dataset.action = 'lfea-pipeline-analyze';
  analyzeButton.textContent = 'Analyze';
  toolbar.append(applyButton, analyzeButton);
  const status = doc.createElement('output');
  status.dataset.role = 'lfea-pipeline-case-selection-status';
  section.append(title, list, toolbar, status);
  return { section, list, toolbar, applyButton, analyzeButton, status };
}

function categoryHeading(doc, category) {
  const heading = doc.createElement('p');
  heading.className = 'lfea-pipeline-case-selection__category';
  heading.textContent = CATEGORY_LABELS[category] ?? category;
  return heading;
}

function caseRow(doc, row, checked, onToggle) {
  const label = doc.createElement('label');
  label.className = 'lfea-pipeline-case-selection__row';
  label.dataset.caseId = row.caseId;
  const input = doc.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.dataset.role = 'lfea-pipeline-case-checkbox';
  input.addEventListener('change', () => onToggle(row.caseId, input.checked));
  const name = doc.createElement('strong');
  name.textContent = row.label;
  const description = doc.createElement('span');
  description.textContent = row.description;
  label.append(input, name, description);
  return label;
}

function emptyRow(doc, text) {
  const p = doc.createElement('p');
  p.className = 'panel-empty';
  p.textContent = text;
  return p;
}
