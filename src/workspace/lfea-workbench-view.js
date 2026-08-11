/**
 * DOM view for LFEA mesh editing, solving, result review, and evidence export.
 */
import {
  LFEA_COLLECTION_PATHS,
  LFEA_RESULT_MODES,
  lfeaDisplayGeometry,
  lfeaPreviewPackage,
} from './lfea-workbench-model.js';
import { renderLfeaWorkbenchSvg } from './lfea-workbench-svg.js';
import {
  captureWorkbenchFocus,
  restoreWorkbenchFocus,
  workbenchButton as actionButton,
  workbenchCard as card,
  workbenchElement as element,
  valueAtPath as valueAt,
} from './workbench-dom.js';
import {
  lfeaRecordTable as recordTable,
} from './lfea-workbench-tables.js';
import {
  renderLfeaAnalysisSettings,
  renderLfeaNodeDraftEditor,
  renderLfeaResults,
  renderLfeaToolbar,
} from './lfea-workbench-panels.js';

const PACKAGE_SHAPE_CODES = new Set([
  'LFEA_IMPORT_REJECTED',
  'LFEA_PACKAGE_REJECTED',
  'MESH_PACKAGE_REJECTED',
  'UNSUPPORTED_PACKAGE_SCHEMA',
  'INVALID_RECORD',
  'INVALID_ARRAY',
  'INVALID_TEXT',
  'MISSING_FIELD',
  'UNSUPPORTED_FIELD',
]);
const ENGINEERING_VALUE_CODES = new Set([
  'NONFINITE_VALUE',
  'NONPOSITIVE_VALUE',
  'INVALID_INTEGER',
  'INVALID_MATERIAL',
  'INVALID_ELEMENT_CONNECTIVITY',
]);
const LOCAL_EDIT_CODES = new Set([
  'LFEA_EDIT_REJECTED',
  'LFEA_RECORD_EDIT_REJECTED',
]);

export class LfeaWorkbenchView {
  /**
   * @param {Element|null} rootElement Workbench host.
   */
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.handlers = null;
    this.collectionPath = LFEA_COLLECTION_PATHS[0];
    this.selectedIndex = -1;
    this.documentDraft = null;
    this.recordDrafts = new Map();
    this.modelIdentity = null;
    this.benchmarkHost = null;
    this.convergenceHost = null;
    this.section = null;
    this.slots = null;
  }

  /**
   * Attach the persistent benchmark host element.
   *
   * @param {Element} hostElement Host owned by the controller.
   * @returns {void}
   */
  setBenchmarkHost(hostElement) {
    this.benchmarkHost = hostElement;
  }

  setConvergenceHost(hostElement) {
    this.convergenceHost = hostElement;
  }

  init(handlers) {
    this.handlers = handlers;
  }

  render(state) {
    if (!this.rootElement || !this.handlers) return;
    const focused = captureWorkbenchFocus(this.rootElement);
    this.ensureShell();
    this.captureEditorDrafts();
    this.syncDraftModelIdentity(state);
    this.slots.header.replaceChildren(this.header(state));
    this.slots.toolbar.replaceChildren(renderLfeaToolbar(
      this.rootElement,
      state,
      LFEA_RESULT_MODES,
      this.handlers,
    ));
    this.slots.content.replaceChildren(this.content(state));
    restoreWorkbenchFocus(this.rootElement, focused);
  }

  ensureShell() {
    if (this.section) return;
    this.section = element(this.rootElement, 'section', 'lfea-workbench');
    this.section.dataset.role = 'lfea-workbench';
    this.slots = Object.fromEntries(
      ['header', 'toolbar', 'content'].map((name) => {
        const slot = element(this.rootElement, 'div');
        slot.dataset.lfeaSlot = name;
        this.section.append(slot);
        return [name, slot];
      }),
    );
    this.rootElement.append(this.section);
  }

  destroy() {
    this.rootElement?.replaceChildren();
    this.section = null;
    this.slots = null;
    this.handlers = null;
    this.documentDraft = null;
    this.recordDrafts.clear();
    this.modelIdentity = null;
  }

  captureEditorDrafts() {
    if (!this.slots?.content) return;
    const documentEditor = this.slots.content.querySelector('[data-role="lfea-package-json"]');
    if (documentEditor) this.documentDraft = documentEditor.value;
    const recordEditor = this.slots.content.querySelector('[data-role="lfea-record-json"]');
    const draftKey = recordEditor?.dataset?.draftKey;
    if (recordEditor && draftKey) this.recordDrafts.set(draftKey, recordEditor.value);
  }

  syncDraftModelIdentity(state) {
    const nextIdentity = this.committedModelIdentity(state);
    if (this.modelIdentity !== null && nextIdentity !== this.modelIdentity) {
      this.documentDraft = null;
      this.recordDrafts.clear();
    }
    this.modelIdentity = nextIdentity;
  }

  committedModelIdentity(state) {
    return `${state.modelVersion ?? 'NONE'}:${state.packageValue?.semanticHash ?? 'NONE'}`;
  }

  recordDraftKey(collectionPath, selectedIndex) {
    return JSON.stringify([collectionPath, selectedIndex]);
  }

  header(state) {
    const header = element(this.rootElement, 'header', 'lfea-workbench__header');
    const block = element(this.rootElement, 'div');
    block.append(
      element(this.rootElement, 'span', 'panel-eyebrow', 'Independent mesh-to-evidence pipeline'),
      element(this.rootElement, 'h1', null, 'LFEA Workbench'),
      element(this.rootElement, 'p', null, 'Edit T3/Q4 mesh packages, solve, review raw evidence, and export deterministically.'),
    );
    const statusGroup = element(this.rootElement, 'div', 'lfea-workbench__status-group');
    const status = element(this.rootElement, 'output', 'lfea-workbench__status', state.status);
    status.dataset.status = state.status;
    status.setAttribute('aria-live', 'polite');
    statusGroup.append(status);
    header.append(block, statusGroup);

    if (state.status === 'FAILED' && Array.isArray(state.diagnostics) && state.diagnostics.length > 0) {
      header.append(this.failureBanner(state.diagnostics));
    }
    return header;
  }

  failureBanner(diagnostics) {
    const presentation = failurePresentation(diagnostics);
    const errorBanner = element(
      this.rootElement,
      'div',
      'lfea-workbench__error-banner',
    );
    errorBanner.dataset.code = presentation.code;
    errorBanner.title = presentation.codes.join(', ');
    errorBanner.setAttribute('role', 'alert');
    errorBanner.setAttribute('aria-live', 'assertive');
    errorBanner.append(
      element(this.rootElement, 'strong', null, `⚠️ ${presentation.summary}`),
      element(this.rootElement, 'p', null, presentation.action),
      element(
        this.rootElement,
        'p',
        'lfea-workbench__error-detail',
        `Diagnostic ${presentation.code}: ${presentation.detail}`,
      ),
    );
    return errorBanner;
  }

  content(state) {
    const grid = element(this.rootElement, 'div', 'lfea-workbench__grid');
    const documentCard = card(this.rootElement, 'Validated lfea-mesh-package/v1');
    documentCard.body.append(this.documentEditor(state.packageValue));
    const recordsCard = card(this.rootElement, 'Mesh, materials, assignments, loads and constraints');
    recordsCard.body.append(this.recordEditor(state));
    const settingsCard = card(this.rootElement, 'Analysis settings and authority');
    settingsCard.body.append(renderLfeaAnalysisSettings(this.rootElement, state.packageValue));
    const svgCard = card(this.rootElement, 'Mesh and result field');
    const svg = element(this.rootElement, 'div', 'lfea-workbench__svg');
    const previewPackage = lfeaPreviewPackage(
      state.packageValue,
      state.nodeDraft,
    );
    const geometry = lfeaDisplayGeometry(
      previewPackage,
      state.execution,
      state.display.resultMode,
      {
        deformation: {
          enabled: state.display.resultMode === 'DEFORMED',
          scale: state.display.deformationScale,
        },
      },
    );
    renderLfeaWorkbenchSvg(svg, geometry, previewPackage, {
      onMoveNode: this.handlers.onPreviewNode,
      onCancelNode: this.handlers.onCancelNode,
    });
    svgCard.body.append(
      svg,
      element(
        this.rootElement,
        'p',
        'lfea-workbench__authority',
        geometry.authority,
      ),
      renderLfeaNodeDraftEditor(
        this.rootElement,
        state.nodeDraft,
        this.handlers,
      ),
    );
    const resultsCard = card(this.rootElement, 'Qualified results, review and diagnostics');
    resultsCard.body.append(renderLfeaResults(this.rootElement, state));
    grid.append(
      documentCard.section,
      recordsCard.section,
      settingsCard.section,
      svgCard.section,
      resultsCard.section,
    );
    if (this.benchmarkHost) {
      const benchmarkCard = element(this.rootElement, 'div', 'lfea-workbench__benchmark');
      benchmarkCard.append(this.benchmarkHost);
      grid.append(benchmarkCard);
    }
    if (this.convergenceHost) {
      const convergenceCard = element(
        this.rootElement,
        'div',
        'lfea-workbench__convergence',
      );
      convergenceCard.append(this.convergenceHost);
      grid.append(convergenceCard);
    }
    return grid;
  }

  documentEditor(packageValue) {
    const wrapper = element(this.rootElement, 'div', 'lfea-workbench__editor');
    const textarea = element(this.rootElement, 'textarea');
    textarea.dataset.role = 'lfea-package-json';
    textarea.spellcheck = false;
    const committedText = packageValue ? JSON.stringify(packageValue, null, 2) : '';
    textarea.value = this.documentDraft ?? committedText;
    textarea.placeholder = 'Import a hash-valid lfea-mesh-package/v1.';
    const apply = actionButton(this.rootElement, 'Apply and reseal local edit', () => this.handlers.onApplyJson(textarea.value));
    apply.disabled = !packageValue;
    wrapper.append(textarea, apply);
    return wrapper;
  }

  recordEditor(state) {
    const wrapper = element(this.rootElement, 'div', 'lfea-workbench__records');
    if (!state.packageValue) {
      wrapper.append(element(this.rootElement, 'p', null, 'No mesh package is loaded.'));
      return wrapper;
    }
    const select = element(this.rootElement, 'select');
    for (const path of LFEA_COLLECTION_PATHS) {
      const option = element(this.rootElement, 'option', null, path);
      option.value = path;
      option.selected = path === this.collectionPath;
      select.append(option);
    }
    select.addEventListener('change', () => {
      this.collectionPath = select.value;
      this.selectedIndex = -1;
      this.render(state);
    });
    const rows = valueAt(state.packageValue, this.collectionPath);
    const table = recordTable(this.rootElement, rows, this.selectedIndex, (index) => {
      this.selectedIndex = index;
      this.render(state);
    });
    const textarea = element(this.rootElement, 'textarea');
    textarea.dataset.role = 'lfea-record-json';
    const draftKey = this.recordDraftKey(this.collectionPath, this.selectedIndex);
    textarea.dataset.draftKey = draftKey;
    const committedText = this.selectedIndex >= 0
      ? JSON.stringify(rows[this.selectedIndex], null, 2)
      : '{}';
    textarea.value = this.recordDrafts.get(draftKey) ?? committedText;

    const add = element(this.rootElement, 'button', null, 'Add record');
    add.type = 'button';
    add.addEventListener('click', () => this.handlers.onAddRecord(this.collectionPath, textarea.value));
    const update = element(this.rootElement, 'button', null, 'Update record');
    update.type = 'button';
    update.addEventListener('click', () => this.handlers.onUpdateRecord(this.collectionPath, this.selectedIndex, textarea.value));
    const validity = element(
      this.rootElement,
      'p',
      'lfea-workbench__record-validation',
    );
    validity.dataset.role = 'lfea-record-validation';
    validity.setAttribute('role', 'status');
    validity.setAttribute('aria-live', 'polite');
    const syncValidity = () => {
      const result = recordJsonValidity(textarea.value);
      textarea.setAttribute('aria-invalid', String(!result.valid));
      textarea.dataset.jsonValidity = result.valid ? 'VALID_OBJECT' : result.code;
      validity.dataset.valid = String(result.valid);
      validity.textContent = result.message;
      add.disabled = !result.valid;
      update.disabled = this.selectedIndex < 0 || !result.valid;
    };
    textarea.addEventListener('input', syncValidity);
    syncValidity();

    const remove = element(this.rootElement, 'button', null, 'Delete record');
    remove.type = 'button';
    remove.addEventListener('click', () => {
      const deletedIndex = this.selectedIndex;
      const previousIdentity = this.modelIdentity;
      this.selectedIndex = -1;
      const nextState = this.handlers.onDeleteRecord(this.collectionPath, deletedIndex);
      if (nextState && this.committedModelIdentity(nextState) === previousIdentity) {
        this.selectedIndex = deletedIndex;
        this.render(nextState);
      }
    });
    remove.disabled = this.selectedIndex < 0;
    const actions = element(this.rootElement, 'div', 'lfea-workbench__record-actions');
    actions.append(add, update, remove);
    wrapper.append(select, table, textarea, validity, actions);
    return wrapper;
  }
}

function recordJsonValidity(text) {
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {
        valid: false,
        code: 'NOT_JSON_OBJECT',
        message: 'Record input must be a JSON object. Arrays, null, and scalar values cannot be submitted.',
      };
    }
    return {
      valid: true,
      code: 'VALID_OBJECT',
      message: 'JSON object syntax is valid. Engineering fields are checked when the record is submitted.',
    };
  } catch {
    return {
      valid: false,
      code: 'INVALID_JSON',
      message: 'Enter valid JSON object syntax before using Add record or Update record.',
    };
  }
}

function failurePresentation(diagnostics) {
  const rows = diagnostics.filter((row) => row && typeof row === 'object');
  const primary = rows.find((row) => row.severity === 'ERROR') ?? rows[0] ?? {};
  const code = typeof primary.code === 'string' && primary.code
    ? primary.code
    : 'LFEA_WORKBENCH_FAILURE';
  const detail = rows
    .map((row) => row.message)
    .filter((message) => typeof message === 'string' && message.trim())
    .join(' ') || 'No additional diagnostic detail was supplied.';
  const codes = [...new Set(rows
    .map((row) => row.code)
    .filter((value) => typeof value === 'string' && value))];
  if (!codes.length) codes.push(code);
  return { code, codes, detail, ...failureGuidance(code) };
}

function failureGuidance(code) {
  if (code === 'LFEA_EVIDENCE_EXPORT_REJECTED') {
    return {
      summary: 'Evidence export did not complete.',
      action: 'Only current QUALIFIED_EXPORT evidence may be downloaded. Re-run or requalify the current model if needed, then retry. The failed path is not treated as a successful evidence export.',
    };
  }
  if (code === 'STALE_PACKAGE_SEMANTIC_HASH') {
    return {
      summary: 'Imported package identity does not match its content.',
      action: 'Re-export or rebuild the package from the authoritative source and retry. Imported semantic hashes are intentionally not repaired in the workbench.',
    };
  }
  if (PACKAGE_SHAPE_CODES.has(code)) {
    return {
      summary: 'The input is not a valid LFEA mesh-package shape.',
      action: 'Check the lfea-mesh-package/v1 schema and required fields. Piping project datasets such as Sjson.json or .inputxml belong in the 3D Piping Workspace (W) tab.',
    };
  }
  if (code === 'UNSUPPORTED_UNITS'
    || code === 'UNSUPPORTED_COORDINATE_SYSTEM'
    || code.startsWith('UNSUPPORTED_')) {
    return {
      summary: 'The package uses an unsupported analysis declaration.',
      action: 'Correct or convert the declared units, coordinate system, formulation, element, selector, or constraint upstream. The workbench will not silently coerce unsupported engineering authority.',
    };
  }
  if (ENGINEERING_VALUE_CODES.has(code)) {
    return {
      summary: 'An engineering value or connectivity definition is invalid.',
      action: 'Correct the value or connectivity identified in the diagnostic detail and retry; invalid numerical/model data is not accepted into committed state.',
    };
  }
  if (code.startsWith('DUPLICATE_') || code.startsWith('EMPTY_')) {
    return {
      summary: 'The package structure contains a duplicate or required-empty collection.',
      action: 'Correct the identified identities or required collection contents in the authoritative package and retry.',
    };
  }
  if (LOCAL_EDIT_CODES.has(code)) {
    return {
      summary: 'The local engineering edit was rejected.',
      action: 'Correct the JSON or record data and retry. The rejected edit was not accepted as committed package authority.',
    };
  }
  return {
    summary: 'The LFEA operation failed validation or execution.',
    action: 'Review the diagnostic code and detail below, correct the identified condition, and retry. Do not bypass or silently coerce an unknown engineering failure.',
  };
}
