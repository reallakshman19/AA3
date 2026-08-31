export const LFEA_PIPELINE_EXPORT_PANEL_SCHEMA = 'lfea-pipeline-export-panel/v1';

/** Presentation-only Export step. CSV values remain owned by the results panel. */
export function mountLfeaPipelineExportPanel(hostElement, options = {}) {
  if (!hostElement || typeof hostElement.append !== 'function') throw new TypeError('Export panel requires a host element.');
  if (typeof options.getResultsPanel !== 'function') throw new TypeError('Export panel requires options.getResultsPanel.');
  const documentRef = options.documentRef ?? hostElement.ownerDocument ?? document;
  return new LfeaPipelineExportPanelController(hostElement, documentRef, options).init();
}

export class LfeaPipelineExportPanelController {
  constructor(hostElement, documentRef, options) {
    this.hostElement = hostElement;
    this.documentRef = documentRef;
    this.options = options;
    this.elements = null;
    this.message = '';
    this.error = '';
  }

  init() {
    if (this.elements) return this;
    this.elements = createExportSection(this.documentRef);
    this.elements.downloadButton.addEventListener('click', () => this.download());
    this.hostElement.append(this.elements.section);
    this.refresh();
    return this;
  }

  exportPackage() {
    const panel = this.options.getResultsPanel();
    const snapshot = panel?.getSnapshot?.() ?? null;
    const active = panel?.activeCase?.() ?? null;
    if (!snapshot || !active) return null;
    const view = snapshot.activeView;
    return Object.freeze({
      caseId: active.caseId,
      caseLabel: caseLabel(active.caseId),
      view,
      viewLabel: viewLabel(view),
      fileName: `${active.caseId}-${String(view).toLowerCase()}.csv`,
      csvText: panel.csvFor(active),
      filter: panel.nodeFilter ?? '',
      sortColumn: panel.sortColumn ?? 'nodeId',
      sortDirection: panel.sortDirection ?? 'ASC',
    });
  }

  download() {
    this.error = '';
    const payload = this.exportPackage();
    if (!payload) {
      this.error = 'Run an analysis and review an output before exporting.';
      this.refresh();
      return;
    }
    try {
      const completed = this.options.onExportCsv?.(payload.csvText, payload.fileName);
      if (completed === false) throw new Error('The browser could not create the CSV download.');
      this.message = `Exported ${payload.fileName}.`;
      this.options.onExportCompleted?.(payload);
      this.dispatch('lfea-pipeline-export-completed', payload);
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    }
    this.refresh();
  }

  refresh() {
    const payload = this.exportPackage();
    const { summary, downloadButton, status } = this.elements;
    summary.replaceChildren();
    if (!payload) {
      summary.append(emptyParagraph(this.documentRef, 'No reviewed result is available to export yet.'));
      downloadButton.disabled = true;
      status.textContent = this.error;
      status.dataset.status = this.error ? 'error' : 'blocked';
      return this;
    }
    summary.append(summaryRow(this.documentRef, 'Case', payload.caseLabel));
    summary.append(summaryRow(this.documentRef, 'Result view', payload.viewLabel));
    summary.append(summaryRow(this.documentRef, 'Node filter', payload.filter || 'None'));
    summary.append(summaryRow(this.documentRef, 'Sort', `${payload.sortColumn} · ${payload.sortDirection}`));
    summary.append(summaryRow(this.documentRef, 'File', payload.fileName));
    downloadButton.disabled = false;
    status.textContent = this.error || this.message || 'Exports the exact case/view/filter/sort currently reviewed on Output.';
    status.dataset.status = this.error ? 'error' : this.message ? 'complete' : 'ready';
    return this;
  }

  dispatch(type, detail) {
    const EventCtor = this.documentRef.defaultView?.CustomEvent ?? globalThis.CustomEvent;
    if (typeof EventCtor !== 'function') return;
    this.elements?.section.dispatchEvent(new EventCtor(type, { bubbles: true, detail }));
  }

  getSnapshot() {
    const payload = this.exportPackage();
    return Object.freeze({
      schema: LFEA_PIPELINE_EXPORT_PANEL_SCHEMA,
      ready: payload !== null,
      caseId: payload?.caseId ?? null,
      view: payload?.view ?? null,
      fileName: payload?.fileName ?? null,
    });
  }

  destroy() { this.elements?.section.remove(); this.elements = null; }
}

function createExportSection(doc) {
  const section = doc.createElement('section');
  section.className = 'lfea-pipeline-export-panel lfea-pipeline-results';
  section.dataset.role = 'lfea-pipeline-export-panel';
  const heading = doc.createElement('h2');
  heading.textContent = 'Export results';
  const intro = doc.createElement('p');
  intro.className = 'lfea-pipeline-export-panel__intro';
  intro.textContent = 'Export exactly what is currently reviewed on Output. Return there to change case, view, filter or sort.';
  const summary = doc.createElement('dl');
  summary.className = 'lfea-pipeline-export-panel__summary';
  summary.dataset.role = 'lfea-pipeline-export-summary';
  const downloadButton = doc.createElement('button');
  downloadButton.type = 'button';
  downloadButton.dataset.action = 'lfea-pipeline-results-csv';
  downloadButton.textContent = 'Download CSV';
  const status = doc.createElement('output');
  status.dataset.role = 'lfea-pipeline-export-status';
  section.append(heading, intro, summary, downloadButton, status);
  return { section, summary, downloadButton, status };
}

function summaryRow(doc, label, value) {
  const wrapper = doc.createDocumentFragment();
  const dt = doc.createElement('dt');
  dt.textContent = label;
  const dd = doc.createElement('dd');
  dd.textContent = value;
  wrapper.append(dt, dd);
  return wrapper;
}

function emptyParagraph(doc, text) {
  const p = doc.createElement('p');
  p.className = 'panel-empty';
  p.textContent = text;
  return p;
}

function caseLabel(caseId) {
  const token = String(caseId).slice(String(caseId).indexOf('-') + 1);
  return token.replace(/^WPT$/u, 'W+P1+T1').replace(/^WP$/u, 'W+P1').replace(/^WT$/u, 'W+T1');
}

function viewLabel(view) {
  return ({ DISPLACEMENTS: 'Displacements', REACTIONS: 'Support loads', ELEMENT_FORCES: 'Element forces' })[view] ?? String(view);
}
