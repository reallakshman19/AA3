export const LFEA_PIPELINE_LOAD_CASE_AUTHORING_PANEL_SCHEMA = 'lfea-pipeline-load-case-authoring-panel/v1';

/**
 * Mount the Load-case authoring panel into the LFEA pipeline shell's
 * LOAD_CASE host. Lets an engineer author a nodal force/moment physical
 * case bound to a real node ID from the currently-loaded InputXML model,
 * on top of the auto-synthesized W/WP/WT/WPT cases.
 *
 * Reuses the LFEA Workbench's record-editor *interaction convention* --
 * a picker over a growing list of drafts, Add/Update/Delete against that
 * list -- but not its raw-JSON-textarea input mechanism: a fixed, small,
 * well-typed record (nodeId + force + moment) is a better fit for labeled
 * numeric form fields than free-form JSON.
 *
 * Only a GLOBAL basis is supported (declared local bases are deferred,
 * disclosed scope narrowing); force/moment must already be SI (N, N*m) --
 * this panel does not convert units, matching
 * inputxml-linear-authored-physical-cases.js's own "works in SI, converts
 * nothing" contract.
 *
 * options.getNodeIds() must return the currently-loaded model's real node
 * IDs (e.g. from getPreFlight().preparation.structuralPreparation
 * .conditionedTopology.geometry.nodes) -- empty/unavailable until a
 * source is loaded and pre-flight is authorized.
 */
export function mountLfeaPipelineLoadCaseAuthoringPanel(loadCaseHostElement, options = {}) {
  if (!loadCaseHostElement || typeof loadCaseHostElement.append !== 'function') {
    throw new TypeError('Load-case authoring panel requires a host element.');
  }
  if (typeof options.getNodeIds !== 'function') {
    throw new TypeError('Load-case authoring panel requires options.getNodeIds.');
  }
  const documentRef = options.documentRef ?? loadCaseHostElement.ownerDocument ?? document;
  return new LfeaPipelineLoadCaseAuthoringPanelController(loadCaseHostElement, documentRef, options).init();
}

export class LfeaPipelineLoadCaseAuthoringPanelController {
  constructor(hostElement, documentRef, options = {}) {
    this.hostElement = hostElement;
    this.documentRef = documentRef;
    this.options = options;
    this.elements = null;
    this.initialized = false;
    this.loads = [];
    this.editingIndex = null;
    this.message = 'No authored loads yet. Pick a node and enter a force/moment, then Add.';
    this.error = '';
  }

  init() {
    if (this.initialized) return this;
    this.elements = createLoadCaseAuthoringSection(this.documentRef);
    this.hostElement.append(this.elements.section);
    this.elements.addButton.addEventListener('click', () => this.addOrUpdateFromForm());
    this.elements.clearFormButton.addEventListener('click', () => this.resetForm());
    this.elements.clearAllButton.addEventListener('click', () => this.clearAll());
    this.initialized = true;
    this.render();
    return this;
  }

  addOrUpdateFromForm() {
    this.error = '';
    try {
      const record = readFormRecord(this.elements);
      if (this.editingIndex === null) {
        this.loads = [...this.loads, record];
        this.message = `Added a load on node ${record.nodeId}.`;
      } else {
        this.loads = this.loads.map((row, index) => (index === this.editingIndex ? record : row));
        this.message = `Updated the load on node ${record.nodeId}.`;
        this.editingIndex = null;
      }
      this.resetForm({ keepMessage: true });
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      this.render();
    }
  }

  editRow(index) {
    const record = this.loads[index];
    if (!record) return;
    this.editingIndex = index;
    writeFormRecord(this.elements, record);
    this.render();
  }

  deleteRow(index) {
    this.loads = this.loads.filter((_row, rowIndex) => rowIndex !== index);
    if (this.editingIndex === index) this.editingIndex = null;
    this.message = 'Removed a load.';
    this.render();
  }

  resetForm(config = {}) {
    this.editingIndex = null;
    if (this.elements) {
      this.elements.forceInputs.forEach((input) => { input.value = '0'; });
      this.elements.momentInputs.forEach((input) => { input.value = '0'; });
    }
    if (!config.keepMessage) this.message = 'No authored loads yet. Pick a node and enter a force/moment, then Add.';
    this.render();
  }

  clearAll() {
    this.loads = [];
    this.editingIndex = null;
    this.error = '';
    this.message = 'Cleared all authored loads.';
    this.resetForm({ keepMessage: true });
  }

  /** Returns null when nothing has been authored, or the authoredCase payload mergeAuthoredInputXmlLinearPhysicalCase expects. */
  getAuthoredCasePayload() {
    if (this.loads.length === 0) return null;
    return Object.freeze({
      label: this.elements?.labelInput.value.trim() || 'Authored case',
      description: this.elements?.descriptionInput.value.trim() || 'Engineer-authored nodal force/moment physical case.',
      loads: this.loads.map((row) => Object.freeze({ ...row })),
    });
  }

  getSnapshot() {
    return Object.freeze({
      schema: LFEA_PIPELINE_LOAD_CASE_AUTHORING_PANEL_SCHEMA,
      loadCount: this.loads.length,
      loads: Object.freeze(this.loads.map((row) => Object.freeze({ ...row }))),
      message: this.message,
      error: this.error || null,
    });
  }

  /** Re-reads options.getNodeIds() and re-renders -- call after the source InputXML changes (load/clear/re-authorize), since this panel has no subscription of its own to that state. */
  refresh() {
    this.render();
  }

  destroy() {
    this.elements?.section.remove();
    this.elements = null;
    this.initialized = false;
  }

  render() {
    if (!this.elements) return;
    this.elements.status.textContent = this.message;
    this.elements.error.hidden = !this.error;
    this.elements.error.textContent = this.error;
    this.elements.addButton.textContent = this.editingIndex === null ? 'Add load' : 'Update load';

    const nodeIds = this.options.getNodeIds() ?? [];
    const previousValue = this.elements.nodeSelect.value;
    this.elements.nodeSelect.replaceChildren();
    if (nodeIds.length === 0) {
      const option = this.documentRef.createElement('option');
      option.value = '';
      option.textContent = 'No source loaded';
      this.elements.nodeSelect.append(option);
      this.elements.nodeSelect.disabled = true;
      this.elements.addButton.disabled = true;
    } else {
      this.elements.nodeSelect.disabled = false;
      this.elements.addButton.disabled = false;
      for (const nodeId of nodeIds) {
        const option = this.documentRef.createElement('option');
        option.value = String(nodeId);
        option.textContent = String(nodeId);
        this.elements.nodeSelect.append(option);
      }
      if (nodeIds.map(String).includes(previousValue)) this.elements.nodeSelect.value = previousValue;
    }

    this.elements.list.replaceChildren();
    this.loads.forEach((row, index) => {
      const item = this.documentRef.createElement('li');
      item.dataset.role = 'lfea-load-case-authoring-row';
      const label = this.documentRef.createElement('span');
      label.textContent = `Node ${row.nodeId}: F(${row.force.fx}, ${row.force.fy}, ${row.force.fz}) N `
        + `M(${row.moment.mx}, ${row.moment.my}, ${row.moment.mz}) N·m`;
      const editButton = this.documentRef.createElement('button');
      editButton.type = 'button';
      editButton.textContent = 'Edit';
      editButton.addEventListener('click', () => this.editRow(index));
      const deleteButton = this.documentRef.createElement('button');
      deleteButton.type = 'button';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => this.deleteRow(index));
      item.append(label, editButton, deleteButton);
      this.elements.list.append(item);
    });
    this.elements.section.dataset.loadCount = String(this.loads.length);
  }
}

function createLoadCaseAuthoringSection(doc) {
  const section = doc.createElement('section');
  section.className = 'properties-accordion-section linear-piping-results-workbench';
  section.dataset.sectionId = 'lfea-pipeline-load-case-authoring';
  section.dataset.role = 'lfea-pipeline-load-case-authoring-panel';

  const header = doc.createElement('header');
  header.className = 'accordion-section-header';
  const title = doc.createElement('span');
  title.className = 'accordion-section-title';
  title.textContent = 'Load case — author a nodal force/moment case';
  header.append(title);

  const body = doc.createElement('div');
  body.className = 'accordion-section-body';

  const caseLabelRow = doc.createElement('div');
  const labelLabel = doc.createElement('label');
  labelLabel.textContent = 'Case label ';
  const labelInput = doc.createElement('input');
  labelInput.type = 'text';
  labelInput.dataset.role = 'lfea-load-case-label';
  labelLabel.append(labelInput);
  const descriptionLabel = doc.createElement('label');
  descriptionLabel.textContent = 'Description ';
  const descriptionInput = doc.createElement('input');
  descriptionInput.type = 'text';
  descriptionInput.dataset.role = 'lfea-load-case-description';
  descriptionLabel.append(descriptionInput);
  caseLabelRow.append(labelLabel, descriptionLabel);

  const form = doc.createElement('div');
  form.className = 'linear-piping-results-workbench__toolbar';
  const nodeLabel = doc.createElement('label');
  nodeLabel.textContent = 'Node ';
  const nodeSelect = doc.createElement('select');
  nodeSelect.dataset.role = 'lfea-load-case-node';
  nodeLabel.append(nodeSelect);

  const forceInputs = ['fx', 'fy', 'fz'].map((key) => numberField(doc, `Force ${key} (N)`, `lfea-load-case-${key}`));
  const momentInputs = ['mx', 'my', 'mz'].map((key) => numberField(doc, `Moment ${key} (N·m)`, `lfea-load-case-${key}`));

  const addButton = button(doc, 'Add load');
  addButton.dataset.action = 'add-lfea-load-case-load';
  const clearFormButton = button(doc, 'Clear form');
  clearFormButton.dataset.action = 'clear-lfea-load-case-form';
  const clearAllButton = button(doc, 'Clear all');
  clearAllButton.dataset.action = 'clear-lfea-load-case-all';

  form.append(
    nodeLabel,
    ...forceInputs.map((f) => f.label),
    ...momentInputs.map((m) => m.label),
    addButton, clearFormButton, clearAllButton,
  );

  const status = doc.createElement('output');
  status.className = 'linear-piping-results-workbench__status';
  status.dataset.role = 'lfea-load-case-status';
  status.setAttribute('aria-live', 'polite');
  const error = doc.createElement('p');
  error.className = 'linear-piping-results-workbench__error';
  error.dataset.role = 'lfea-load-case-error';
  error.hidden = true;

  const list = doc.createElement('ul');
  list.dataset.role = 'lfea-load-case-authoring-list';

  body.append(caseLabelRow, form, status, error, list);
  section.append(header, body);
  return {
    section,
    labelInput,
    descriptionInput,
    nodeSelect,
    forceInputs: forceInputs.map((f) => f.input),
    momentInputs: momentInputs.map((m) => m.input),
    addButton,
    clearFormButton,
    clearAllButton,
    status,
    error,
    list,
  };
}

function numberField(doc, labelText, role) {
  const label = doc.createElement('label');
  label.textContent = `${labelText} `;
  const input = doc.createElement('input');
  input.type = 'number';
  input.step = 'any';
  input.value = '0';
  input.dataset.role = role;
  label.append(input);
  return { label, input };
}

function readFormRecord(elements) {
  const nodeId = elements.nodeSelect.value;
  if (!nodeId) throw new TypeError('Pick a node before adding a load.');
  const [fx, fy, fz] = elements.forceInputs.map(readNumber);
  const [mx, my, mz] = elements.momentInputs.map(readNumber);
  return Object.freeze({ nodeId, force: Object.freeze({ fx, fy, fz }), moment: Object.freeze({ mx, my, mz }) });
}

function writeFormRecord(elements, record) {
  elements.nodeSelect.value = record.nodeId;
  const [fxInput, fyInput, fzInput] = elements.forceInputs;
  fxInput.value = String(record.force.fx);
  fyInput.value = String(record.force.fy);
  fzInput.value = String(record.force.fz);
  const [mxInput, myInput, mzInput] = elements.momentInputs;
  mxInput.value = String(record.moment.mx);
  myInput.value = String(record.moment.my);
  mzInput.value = String(record.moment.mz);
}

function readNumber(input) {
  const numeric = Number(input.value);
  if (!Number.isFinite(numeric)) throw new TypeError(`${input.dataset.role} must be a finite number.`);
  return numeric;
}

function button(doc, label) {
  const value = doc.createElement('button');
  value.type = 'button';
  value.textContent = label;
  return value;
}
