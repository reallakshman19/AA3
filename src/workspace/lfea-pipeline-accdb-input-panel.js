import { readAccdbNamedTables } from '../core/fea-benchmarks/caesar-accdb-reader-core.js';
import { parseAccdbModelHealthSource } from '../core/linear-piping-analysis-consumer/accdb-source-binding.js';
import { diagnoseInputXmlLinearModelHealth } from '../core/linear-piping-analysis-consumer/inputxml-linear-model-health.js';
import { diagnoseInputXmlLinearPreFeaEngineeringSanity } from '../core/linear-piping-analysis-consumer/inputxml-linear-prefea-engineering-checks.js';

export const LFEA_PIPELINE_ACCDB_INPUT_PANEL_SCHEMA = 'lfea-pipeline-accdb-input-panel/v1';

/** The full ACCDB model table set (11 tables) -- matches caesar-accdb-package.js's MODEL_TABLES. */
export const LFEA_PIPELINE_ACCDB_MODEL_TABLES = Object.freeze([
  'INPUT_BASIC_ELEMENT_DATA', 'INPUT_BENDS', 'INPUT_CONTROL', 'INPUT_FORCMNT',
  'INPUT_NODAL_COORDINATES', 'INPUT_OFFSETS', 'INPUT_REDUCERS', 'INPUT_RESTRAINTS',
  'INPUT_RIGIDS', 'INPUT_SIFTEES', 'INPUT_UNITS',
]);

/**
 * Mount the ACCDB (CAESAR II database) source panel into the LFEA pipeline
 * shell's SOURCE host, alongside the InputXML and StagedJSON panels.
 *
 * Unlike StagedJSON, there is no ACCDB -> InputXML-text conversion this
 * adapter can reuse (see accdb-to-canonical-geometry.js's header), so this
 * panel does not hand off into the InputXML source panel's loadSource().
 * Instead it reads the ACCDB's full model table set in-browser, builds
 * canonical geometry directly (accdbTablesToCanonicalGeometry), wraps it in
 * a source bundle satisfying the same InputXmlModelHealthSource contract
 * (accdb-source-binding.js) via synthetic PIPINGELEMENT[i] identities, and
 * renders the resulting model-health/representability verdict here.
 *
 * Scope, disclosed rather than silently implied: this is geometry/model-
 * health extraction only -- linear-static representability, not a sealed
 * pre-FEA authorization or a solve. No nonlinear/friction analysis is
 * performed. The synthetic identity is surfaced explicitly (dataset-role
 * accdb-identity-disclosure) rather than left to look like a native
 * CAESAR II PIPINGELEMENT tag.
 */
export function mountLfeaPipelineAccdbInputPanel(sourceHostElement, options = {}) {
  if (!sourceHostElement || typeof sourceHostElement.append !== 'function') {
    throw new TypeError('ACCDB input panel requires a source host element.');
  }
  const documentRef = options.documentRef ?? sourceHostElement.ownerDocument ?? document;
  return new LfeaPipelineAccdbInputPanelController(sourceHostElement, documentRef, options).init();
}

export class LfeaPipelineAccdbInputPanelController {
  constructor(hostElement, documentRef, options = {}) {
    this.hostElement = hostElement;
    this.documentRef = documentRef;
    this.options = options;
    this.readTables = options.readTables ?? readAccdbNamedTables;
    this.elements = null;
    this.initialized = false;
    this.fileName = null;
    this.sourceBundle = null;
    this.modelHealth = null;
    this.engineeringSanity = null;
    this.message = 'Import a CAESAR II ACCDB source for geometry/model-health extraction.';
    this.error = '';
    this.busy = false;
  }

  init() {
    if (this.initialized) return this;
    this.elements = createAccdbInputPanelSection(this.documentRef);
    this.hostElement.append(this.elements.section);
    this.elements.importButton.addEventListener('click', () => this.elements.fileInput.click());
    this.elements.fileInput.addEventListener('change', () => this.loadSelectedFile());
    this.elements.clearButton.addEventListener('click', () => this.clear());
    this.initialized = true;
    this.render();
    return this;
  }

  async loadSelectedFile() {
    const file = this.elements?.fileInput.files?.[0];
    if (!file) return;
    if (this.busy) return;
    await this.loadFile(file);
  }

  async loadFile(file) {
    if (!file || typeof file.arrayBuffer !== 'function') {
      throw new TypeError('An ACCDB File is required.');
    }
    this.fileName = file.name;
    this.sourceBundle = null;
    this.modelHealth = null;
    this.engineeringSanity = null;
    this.error = '';
    this.message = `Reading ${file.name}…`;
    this.busy = true;
    this.render();
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const readLog = [];
      const tables = await this.readTables(bytes, LFEA_PIPELINE_ACCDB_MODEL_TABLES, readLog);
      this.sourceBundle = parseAccdbModelHealthSource(tables, { source: `accdb-panel-${file.name}`, fileName: file.name });
      this.modelHealth = diagnoseInputXmlLinearModelHealth(this.sourceBundle, {});
      this.engineeringSanity = diagnoseInputXmlLinearPreFeaEngineeringSanity(this.sourceBundle);
      this.message = `Loaded ${file.name}: ${this.sourceBundle.elementRecords.length} element(s), `
        + `${this.sourceBundle.geometry.nodes.length} node(s). See the model-health verdict below.`;
    } catch (error) {
      this.error = errorMessage(error);
      this.message = `ACCDB extraction failed for ${file.name}.`;
    } finally {
      this.busy = false;
      if (this.elements) this.elements.fileInput.value = '';
      this.render();
    }
  }

  clear() {
    this.fileName = null;
    this.sourceBundle = null;
    this.modelHealth = null;
    this.engineeringSanity = null;
    this.error = '';
    this.message = 'Import a CAESAR II ACCDB source for geometry/model-health extraction.';
    if (this.elements) this.elements.fileInput.value = '';
    this.render();
  }

  getSnapshot() {
    return Object.freeze({
      schema: LFEA_PIPELINE_ACCDB_INPUT_PANEL_SCHEMA,
      fileName: this.fileName,
      elementCount: this.sourceBundle?.elementRecords.length ?? null,
      nodeCount: this.sourceBundle?.geometry.nodes.length ?? null,
      capabilityStatusById: this.modelHealth?.summary.capabilityStatusById ?? null,
      engineeringSanityFindingCount: this.engineeringSanity?.summary.findingCount ?? null,
      message: this.message,
      error: this.error || null,
    });
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
    this.elements.importButton.disabled = this.busy;
    this.elements.clearButton.disabled = this.busy;
    renderAccdbSourceSummary(this.documentRef, this.elements.summaryRoot, this);
    this.elements.section.dataset.fileName = this.fileName ?? '';
    this.elements.section.dataset.modelHealthStatus = topStatus(this.modelHealth);
  }
}

function createAccdbInputPanelSection(doc) {
  const section = doc.createElement('section');
  section.className = 'properties-accordion-section linear-piping-results-workbench';
  section.dataset.sectionId = 'lfea-pipeline-accdb-input';
  section.dataset.role = 'lfea-pipeline-accdb-input-panel';

  const header = doc.createElement('header');
  header.className = 'accordion-section-header';
  const title = doc.createElement('span');
  title.className = 'accordion-section-title';
  title.textContent = 'ACCDB — CAESAR II database (linear geometry only)';
  header.append(title);

  const body = doc.createElement('div');
  body.className = 'accordion-section-body';
  const toolbar = doc.createElement('div');
  toolbar.className = 'linear-piping-results-workbench__toolbar';

  const importButton = button(doc, 'Import CAESAR II ACCDB');
  importButton.dataset.action = 'import-lfea-pipeline-accdb-source';
  const fileInput = doc.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.accdb,.mdb';
  fileInput.hidden = true;
  fileInput.dataset.role = 'lfea-pipeline-accdb-source-file';

  const clearButton = button(doc, 'Clear');
  clearButton.dataset.action = 'clear-lfea-pipeline-accdb-source';

  toolbar.append(importButton, fileInput, clearButton);

  const status = doc.createElement('output');
  status.className = 'linear-piping-results-workbench__status';
  status.dataset.role = 'lfea-pipeline-accdb-status';
  status.setAttribute('aria-live', 'polite');
  const error = doc.createElement('p');
  error.className = 'linear-piping-results-workbench__error';
  error.dataset.role = 'lfea-pipeline-accdb-error';
  error.hidden = true;
  const summaryRoot = doc.createElement('div');
  summaryRoot.dataset.role = 'lfea-pipeline-accdb-summary';

  body.append(toolbar, status, error, summaryRoot);
  section.append(header, body);
  return { section, importButton, fileInput, clearButton, status, error, summaryRoot };
}

function renderAccdbSourceSummary(doc, root, controller) {
  root.replaceChildren();

  const disclosure = doc.createElement('p');
  disclosure.dataset.role = 'accdb-identity-disclosure';
  disclosure.textContent = [
    'ACCDB elements never carried a native CAESAR II PIPINGELEMENT XML tag.',
    'This panel assigns each ACCDB element a synthetic PIPINGELEMENT[i] identity',
    'only to satisfy the shared model-health contract InputXML and StagedJSON already use.',
    'Node/element geometry itself is read directly from the ACCDB tables, not fabricated.',
  ].join(' ');
  root.append(disclosure);

  if (!controller.sourceBundle) {
    const empty = doc.createElement('p');
    empty.textContent = 'No ACCDB source is loaded.';
    root.append(empty);
    return;
  }

  const rows = [];
  rows.push(['File', controller.fileName]);
  rows.push(['Format', 'CAESAR II ACCDB (linear geometry extraction only)']);
  rows.push(['Elements', String(controller.sourceBundle.elementRecords.length)]);
  rows.push(['Nodes', String(controller.sourceBundle.geometry.nodes.length)]);
  rows.push(['Segments', String(controller.sourceBundle.geometry.segments.length)]);
  rows.push(['Length unit', controller.sourceBundle.unitSystem.lengthUnit]);

  const table = doc.createElement('table');
  for (const [label, value] of rows) {
    const tr = doc.createElement('tr');
    const th = doc.createElement('th');
    th.scope = 'row';
    th.textContent = label;
    const td = doc.createElement('td');
    td.textContent = value;
    tr.append(th, td);
    table.append(tr);
  }
  root.append(table);

  if (controller.modelHealth) {
    const heading = doc.createElement('strong');
    heading.textContent = 'Model-health capabilities';
    root.append(heading);
    const capTable = doc.createElement('table');
    capTable.dataset.role = 'lfea-pipeline-accdb-capabilities';
    for (const capability of controller.modelHealth.capabilities) {
      const tr = doc.createElement('tr');
      tr.dataset.status = capability.status;
      const th = doc.createElement('th');
      th.scope = 'row';
      th.textContent = capability.capabilityId;
      const td = doc.createElement('td');
      td.textContent = capability.status;
      tr.append(th, td);
      capTable.append(tr);
    }
    root.append(capTable);

    const findingHeading = doc.createElement('strong');
    findingHeading.textContent = `Findings — ${controller.modelHealth.findings.length}`;
    root.append(findingHeading);
    if (controller.modelHealth.findings.length === 0) {
      const none = doc.createElement('p');
      none.textContent = 'No findings.';
      root.append(none);
    } else {
      const list = doc.createElement('ul');
      for (const finding of controller.modelHealth.findings.slice(0, 50)) {
        const item = doc.createElement('li');
        item.dataset.severity = finding.severity;
        item.textContent = `${finding.severity.toUpperCase()} · ${finding.code} · ${finding.message}`;
        list.append(item);
      }
      root.append(list);
      if (controller.modelHealth.findings.length > 50) {
        const more = doc.createElement('p');
        more.textContent = `…and ${controller.modelHealth.findings.length - 50} more.`;
        root.append(more);
      }
    }
  }

  if (controller.engineeringSanity) {
    const sanityHeading = doc.createElement('strong');
    sanityHeading.textContent = `Engineering sanity findings — ${controller.engineeringSanity.summary.findingCount}`;
    root.append(sanityHeading);
  }

  const execution = doc.createElement('p');
  execution.dataset.role = 'lfea-pipeline-accdb-execution-boundary';
  execution.textContent = 'Execution custody: NOT CONNECTED. This ACCDB source panel reports geometry/model-health representability only; it does not seal a pre-FEA authorization or run a solve.';
  root.append(execution);
}

function topStatus(modelHealth) {
  if (!modelHealth) return 'NOT_LOADED';
  const source = modelHealth.summary.capabilityStatusById?.SOURCE_ACCEPTANCE ?? 'UNKNOWN';
  const topology = modelHealth.summary.capabilityStatusById?.TOPOLOGY_ACCEPTANCE ?? 'UNKNOWN';
  if (source === 'BLOCK' || topology === 'BLOCK') return 'BLOCK';
  if (source === 'CONDITIONAL' || topology === 'CONDITIONAL') return 'CONDITIONAL';
  return 'PASS';
}

function button(doc, label) {
  const value = doc.createElement('button');
  value.type = 'button';
  value.textContent = label;
  return value;
}

function errorMessage(error) {
  const prefix = error?.code ? `${error.code}: ` : '';
  return `${prefix}${error?.message ?? String(error)}`;
}
