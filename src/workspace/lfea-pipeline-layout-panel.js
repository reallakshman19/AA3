import {
  LFEA_PIPELINE_LAYOUT_COLUMNS,
  buildLfeaPipelineLayoutGrid,
} from './lfea-pipeline-layout-grid.js';

export const LFEA_PIPELINE_LAYOUT_PANEL_SCHEMA = 'lfea-pipeline-layout-panel/v1';

/**
 * The Layout grid: the model as an element table, the way a piping engineer
 * reads one.
 *
 * Read-only in this pass, and it says so rather than implying otherwise. The
 * writeback library that would make coordinates editable
 * (prepareTopologyEditInputXmlWriteback) exists and is proven, but wiring it
 * needs a canonicalGeometry -> CanonicalTopology.v1 adapter, and even then it
 * only patches DELTA_X/Y/Z -- diameter, wall, material and adding or deleting
 * an element are separate, unsolved work. Claiming an editable grid before
 * that is done would be claiming more than is true.
 */
export function mountLfeaPipelineLayoutPanel(hostElement, options = {}) {
  if (!hostElement || typeof hostElement.append !== 'function') {
    throw new TypeError('Layout panel requires a host element.');
  }
  if (typeof options.getPreFlight !== 'function') {
    throw new TypeError('Layout panel requires options.getPreFlight.');
  }
  const documentRef = options.documentRef ?? hostElement.ownerDocument ?? document;
  return new LfeaPipelineLayoutPanelController(hostElement, documentRef, options).init();
}

export class LfeaPipelineLayoutPanelController {
  constructor(hostElement, documentRef, options) {
    this.hostElement = hostElement;
    this.documentRef = documentRef;
    this.options = options;
    this.elements = null;
    this.initialized = false;
    this.grid = null;
  }

  init() {
    if (this.initialized) return this;
    this.elements = createLayoutSection(this.documentRef);
    this.hostElement.append(this.elements.section);
    this.initialized = true;
    this.refresh();
    return this;
  }

  refresh() {
    this.grid = buildLfeaPipelineLayoutGrid(this.options.getPreFlight());
    const { summary, body } = this.elements;
    body.replaceChildren();
    if (this.grid.rows.length === 0) {
      summary.textContent = 'Layout';
      body.append(emptyParagraph(this.documentRef, 'Load a model to see its element layout.'));
      return this;
    }
    summary.textContent = `Layout — ${this.grid.elementCount} elements, ${this.grid.nodeCount} nodes`;
    body.append(layoutTable(this.documentRef, this.grid.rows));
    body.append(readOnlyNote(this.documentRef));
    return this;
  }

  getSnapshot() {
    return Object.freeze({
      schema: LFEA_PIPELINE_LAYOUT_PANEL_SCHEMA,
      elementCount: this.grid?.elementCount ?? 0,
      nodeCount: this.grid?.nodeCount ?? 0,
      editable: false,
    });
  }

  destroy() {
    if (this.elements) this.elements.section.remove();
    this.elements = null;
    this.initialized = false;
  }
}

function createLayoutSection(doc) {
  const section = doc.createElement('details');
  section.className = 'lfea-pipeline-layout';
  section.dataset.role = 'lfea-pipeline-layout-panel';
  const summary = doc.createElement('summary');
  summary.dataset.role = 'lfea-pipeline-layout-summary';
  summary.textContent = 'Layout';
  const body = doc.createElement('div');
  body.className = 'lfea-pipeline-layout__body';
  section.append(summary, body);
  return { section, summary, body };
}

function layoutTable(doc, rows) {
  const table = doc.createElement('table');
  table.className = 'lfea-pipeline-layout__table';
  table.dataset.role = 'lfea-pipeline-layout-table';
  const head = doc.createElement('tr');
  for (const column of LFEA_PIPELINE_LAYOUT_COLUMNS) {
    const th = doc.createElement('th');
    th.scope = 'col';
    th.textContent = column.label;
    th.dataset.align = column.align;
    head.append(th);
  }
  table.append(head);
  for (const row of rows) {
    const tr = doc.createElement('tr');
    tr.dataset.segmentId = row.segmentId;
    for (const column of LFEA_PIPELINE_LAYOUT_COLUMNS) {
      const td = doc.createElement('td');
      td.dataset.align = column.align;
      td.textContent = cellText(row[column.key]);
      tr.append(td);
    }
    table.append(tr);
  }
  const wrap = doc.createElement('div');
  wrap.className = 'lfea-pipeline-layout__scroll';
  wrap.append(table);
  return wrap;
}

function readOnlyNote(doc) {
  const note = doc.createElement('p');
  note.className = 'lfea-pipeline-layout__note';
  note.dataset.role = 'lfea-pipeline-layout-readonly-note';
  note.textContent = 'Read-only. Edit the model in CAESAR II and re-import; '
    + 'coordinate editing here is not available yet.';
  return note;
}

function cellText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'number') return String(value);
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
}

function emptyParagraph(doc, text) {
  const p = doc.createElement('p');
  p.className = 'panel-empty';
  p.textContent = text;
  return p;
}
