import { createStagedJsonToInputXmlWorkerClient } from '../core/geometry/adapters/stagedjson-to-inputxml-worker-client.js';
import { renderStagedJsonConversionDiagnostics } from './stagedjson-conversion-diagnostics-view.js';

export const LFEA_PIPELINE_STAGEDJSON_INPUT_PANEL_SCHEMA = 'lfea-pipeline-stagedjson-input-panel/v1';

/**
 * Mount the StagedJSON -> InputXML conversion panel into the LFEA pipeline
 * shell's SOURCE host, as a sibling of the existing InputXML source panel.
 * Converts real StagedJSON to real CAESAR II InputXML text (via a
 * Pyodide-run, already-governed converter -- see
 * stagedjson-to-inputxml-worker-client.js) and hands the result to the
 * InputXML panel's own, completely unmodified `loadSource()` entry point:
 * from that point on it is indistinguishable from a manual InputXML
 * upload.
 */
export function mountLfeaPipelineStagedJsonInputPanel(sourceHostElement, options = {}) {
  if (!sourceHostElement || typeof sourceHostElement.append !== 'function') {
    throw new TypeError('StagedJSON input panel requires a source host element.');
  }
  if (typeof options.onConversionComplete !== 'function') {
    throw new TypeError('StagedJSON input panel requires options.onConversionComplete.');
  }
  const documentRef = options.documentRef ?? sourceHostElement.ownerDocument ?? document;
  return new LfeaPipelineStagedJsonInputPanelController(sourceHostElement, documentRef, options).init();
}

export class LfeaPipelineStagedJsonInputPanelController {
  constructor(hostElement, documentRef, options = {}) {
    this.hostElement = hostElement;
    this.documentRef = documentRef;
    this.options = options;
    this.createWorkerClient = options.createWorkerClient ?? (() => createStagedJsonToInputXmlWorkerClient());
    this.workerClient = null;
    this.elements = null;
    this.initialized = false;
    this.fileName = null;
    this.outputName = null;
    this.diagnostics = null;
    this.message = 'Import a StagedJSON (SJSON) source to convert it to CAESAR II InputXML.';
    this.error = '';
  }

  init() {
    if (this.initialized) return this;
    this.workerClient = this.createWorkerClient();
    this.elements = createStagedJsonInputPanelSection(this.documentRef);
    this.hostElement.append(this.elements.section);
    this.elements.importButton.addEventListener('click', () => this.elements.fileInput.click());
    this.elements.fileInput.addEventListener('change', () => this.convertSelectedFile());
    this.elements.clearButton.addEventListener('click', () => this.clear());
    this.initialized = true;
    this.render();
    return this;
  }

  async convertSelectedFile() {
    const file = this.elements?.fileInput.files?.[0];
    if (!file) return;
    if (this.workerClient.isRunning()) return;

    this.fileName = file.name;
    this.outputName = null;
    this.diagnostics = null;
    this.error = '';
    this.message = `Converting ${file.name} to InputXML…`;
    this.setBusy(true);
    this.render();

    try {
      const stagedJsonText = await file.text();
      const result = await this.workerClient.convert({
        stagedJsonText,
        sourceName: file.name,
        options: { inferOdFromNominalBore: this.elements.odInferCheckbox.checked },
      });
      this.outputName = result.outputName;
      this.diagnostics = result.diagnostics;
      const warningCount = result.diagnostics?.summary?.warning ?? '?';
      try {
        this.options.onConversionComplete(result);
        this.message = `Converted ${file.name} → ${result.outputName}: 0 errors, ${warningCount} warnings. Handed to the InputXML source panel below for pre-flight.`;
      } catch (handoffError) {
        this.error = `Conversion succeeded but the InputXML pre-flight panel rejected the result: ${errorMessage(handoffError)}`;
        this.message = `Converted ${file.name} → ${result.outputName}, but handoff to pre-flight failed.`;
      }
    } catch (error) {
      this.diagnostics = error?.diagnostics ?? null;
      this.message = 'StagedJSON → InputXML conversion failed.';
      this.error = errorMessage(error);
    } finally {
      this.setBusy(false);
      if (this.elements) this.elements.fileInput.value = '';
      this.render();
    }
  }

  clear() {
    if (this.workerClient.isRunning()) this.workerClient.cancel();
    this.fileName = null;
    this.outputName = null;
    this.diagnostics = null;
    this.error = '';
    this.message = 'Import a StagedJSON (SJSON) source to convert it to CAESAR II InputXML.';
    if (this.elements) {
      this.elements.fileInput.value = '';
      this.elements.odInferCheckbox.checked = false;
    }
    this.options.onClear?.();
    this.render();
  }

  getSnapshot() {
    return Object.freeze({
      schema: LFEA_PIPELINE_STAGEDJSON_INPUT_PANEL_SCHEMA,
      fileName: this.fileName,
      outputName: this.outputName,
      diagnosticsSummary: this.diagnostics?.summary ?? null,
      message: this.message,
      error: this.error || null,
    });
  }

  destroy() {
    if (this.workerClient?.isRunning()) this.workerClient.cancel();
    this.elements?.section.remove();
    this.elements = null;
    this.initialized = false;
  }

  setBusy(busy) {
    if (!this.elements) return;
    this.elements.importButton.disabled = busy;
    this.elements.odInferCheckbox.disabled = busy;
    this.elements.clearButton.disabled = busy;
  }

  render() {
    if (!this.elements) return;
    this.elements.status.textContent = this.message;
    this.elements.error.hidden = !this.error;
    this.elements.error.textContent = this.error;
    renderStagedJsonConversionDiagnostics(this.documentRef, this.elements.diagnosticsRoot, this.diagnostics);
    this.elements.section.dataset.fileName = this.fileName ?? '';
    this.elements.section.dataset.outputReady = this.diagnostics?.outputReady ? 'true' : 'false';
  }
}

function createStagedJsonInputPanelSection(doc) {
  const section = doc.createElement('section');
  section.className = 'properties-accordion-section linear-piping-results-workbench';
  section.dataset.sectionId = 'lfea-pipeline-stagedjson-input';
  section.dataset.role = 'lfea-pipeline-stagedjson-input-panel';

  const header = doc.createElement('header');
  header.className = 'accordion-section-header';
  const title = doc.createElement('span');
  title.className = 'accordion-section-title';
  title.textContent = 'StagedJSON → InputXML (native SJSON)';
  header.append(title);

  const body = doc.createElement('div');
  body.className = 'accordion-section-body';
  const toolbar = doc.createElement('div');
  toolbar.className = 'linear-piping-results-workbench__toolbar';

  const importButton = button(doc, 'Import StagedJSON');
  importButton.dataset.action = 'import-lfea-pipeline-stagedjson-source';
  const fileInput = doc.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.hidden = true;
  fileInput.dataset.role = 'lfea-pipeline-stagedjson-source-file';

  const odInferLabel = doc.createElement('label');
  odInferLabel.textContent = 'Infer missing OD from nominal bore (compatibility opt-in) ';
  const odInferCheckbox = doc.createElement('input');
  odInferCheckbox.type = 'checkbox';
  odInferCheckbox.dataset.role = 'lfea-pipeline-stagedjson-infer-od';
  odInferLabel.append(odInferCheckbox);

  const clearButton = button(doc, 'Clear');
  clearButton.dataset.action = 'clear-lfea-pipeline-stagedjson-source';

  toolbar.append(importButton, fileInput, odInferLabel, clearButton);

  const status = doc.createElement('output');
  status.className = 'linear-piping-results-workbench__status';
  status.dataset.role = 'lfea-pipeline-stagedjson-status';
  status.setAttribute('aria-live', 'polite');
  const error = doc.createElement('p');
  error.className = 'linear-piping-results-workbench__error';
  error.dataset.role = 'lfea-pipeline-stagedjson-error';
  error.hidden = true;
  const diagnosticsRoot = doc.createElement('div');
  diagnosticsRoot.dataset.role = 'lfea-pipeline-stagedjson-diagnostics';

  body.append(toolbar, status, error, diagnosticsRoot);
  section.append(header, body);
  return {
    section,
    importButton,
    fileInput,
    odInferCheckbox,
    clearButton,
    status,
    error,
    diagnosticsRoot,
  };
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
