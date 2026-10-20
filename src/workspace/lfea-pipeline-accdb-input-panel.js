import { AccdbWorkbenchMethods, invalidateWorkbench } from './lfea-accdb-workbench-batch.js';
import { readAccdbNamedTables } from '../core/fea-benchmarks/caesar-accdb-reader-core.js';

import { subscribeLfeaBendFactorAuthoritySelection } from './lfea-bend-factor-authority-control.js';

import { LFEA_PIPELINE_ACCDB_DEFAULT_PROFILE_ID } from './lfea-pipeline-accdb-view-model.js';
import { topStatus, requireProfileId } from './lfea-accdb-panel-utils.js';
import { createAccdbInputPanelSection } from './lfea-accdb-view-section.js';
import { renderAccdbSourceSummary } from './lfea-accdb-view-summary.js';
import { AccdbSourceMethods } from './lfea-accdb-panel-source.js';
import { AccdbPreparationMethods } from './lfea-accdb-panel-preparation.js';
import { AccdbPropertiesMethods } from './lfea-accdb-panel-properties.js';
import { AccdbCoordinatesMethods } from './lfea-accdb-panel-coordinates.js';
import { AccdbLifecycleMethods } from './lfea-accdb-panel-lifecycle.js';
export { LFEA_PIPELINE_ACCDB_INPUT_PANEL_SCHEMA, LFEA_PIPELINE_ACCDB_MODEL_TABLES } from './lfea-accdb-panel-constants.js';
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
    this.tables = null;
    this.effectiveTables = null;
    this.preFlight = null;
    this.preFlightError = '';
    this.sourceBundle = null;
    this.modelHealth = null;
    this.healthView = null;
    this.propertyRows = Object.freeze([]);
    this.engineeringSanity = null;
    this.reviewerIdentity = '';
    this.reviewReason = '';
    this.requestedCaseIds = null;
    this.requestedProfileId = requireProfileId(options.requestedProfileId ?? LFEA_PIPELINE_ACCDB_DEFAULT_PROFILE_ID);
    this.overrideSet = null;
    this.overrideDisclosures = Object.freeze([]);
    this.overrideDrafts = new Map();
    this.sourceBaseIdentity = null;
    this.originalAccdbByteSha256 = null;
    this.coordinateEdits = [];
    this.coordinateCursor = 0;
    this.coordinateRevision = 0;
    this.coordinateApprover = '';
    this.coordinateReason = '';
    this.coordinateDisclosures = Object.freeze([]);
    this.overrideApprover = '';
    this.overrideReason = '';
    this.showProperties = false;
    this.message = 'Import a CAESAR II ACCDB source for geometry/model-health extraction.';
    this.error = '';
    this.busy = false;
    this.importEpoch = 0;
    this.unsubscribeComponentBasis = null;
    this.lastComponentBasisRefresh = null;
  }

  init() {
    if (this.initialized) return this;
    this.elements = createAccdbInputPanelSection(this.documentRef);
    this.hostElement.append(this.elements.section);
    this.elements.importButton.addEventListener('click', () => this.elements.fileInput.click());
    this.elements.fileInput.addEventListener('change', () => this.loadSelectedFile());
    this.elements.clearButton.addEventListener('click', () => this.clear());
    this.elements.profileSelect.addEventListener('change', () => {
      this.setRequestedProfile(this.elements.profileSelect.value);
    });
    // A direct subscription, not a synthetic DOM/profile change, rebuilds
    // *the current effective table intake* even after source-coordinate edits
    // and Error Check inline control replacement. A detached candidate is
    // adopted only on successful real preparation; no BLOCK is hidden.
    this.unsubscribeComponentBasis = subscribeLfeaBendFactorAuthoritySelection(
      (selection) => this.refreshForComponentFactorAuthority(selection));
    this.initialized = true;
    this.render();
    return this;
  }

  render() {
    if (!this.elements) return;
    this.elements.status.textContent = this.message;
    this.elements.section.setAttribute('aria-busy', this.busy ? 'true' : 'false');
    this.elements.error.hidden = !this.error;
    this.elements.error.textContent = this.error;
    this.elements.importButton.disabled = this.busy;
    this.elements.clearButton.disabled = this.busy;
    this.elements.profileSelect.value = this.requestedProfileId;
    renderAccdbSourceSummary(this.documentRef, this.elements.summaryRoot, this);
    this.elements.section.dataset.fileName = this.fileName ?? '';
    this.elements.section.dataset.modelHealthStatus = topStatus(this.modelHealth);
    this.elements.section.dataset.requestedProfile = this.requestedProfileId;
    this.elements.section.dataset.overrideCount = String(this.overrideSet?.overrides.length ?? 0);
  }
}
for (const name of Object.getOwnPropertyNames(AccdbSourceMethods.prototype)) {
  if (name !== 'constructor') Object.defineProperty(LfeaPipelineAccdbInputPanelController.prototype, name, Object.getOwnPropertyDescriptor(AccdbSourceMethods.prototype, name));
}
for (const name of Object.getOwnPropertyNames(AccdbPreparationMethods.prototype)) {
  if (name !== 'constructor') Object.defineProperty(LfeaPipelineAccdbInputPanelController.prototype, name, Object.getOwnPropertyDescriptor(AccdbPreparationMethods.prototype, name));
}
for (const name of Object.getOwnPropertyNames(AccdbPropertiesMethods.prototype)) {
  if (name !== 'constructor') Object.defineProperty(LfeaPipelineAccdbInputPanelController.prototype, name, Object.getOwnPropertyDescriptor(AccdbPropertiesMethods.prototype, name));
}
for (const name of Object.getOwnPropertyNames(AccdbCoordinatesMethods.prototype)) {
  if (name !== 'constructor') Object.defineProperty(LfeaPipelineAccdbInputPanelController.prototype, name, Object.getOwnPropertyDescriptor(AccdbCoordinatesMethods.prototype, name));
}
for (const name of Object.getOwnPropertyNames(AccdbLifecycleMethods.prototype)) {
  if (name !== 'constructor') Object.defineProperty(LfeaPipelineAccdbInputPanelController.prototype, name, Object.getOwnPropertyDescriptor(AccdbLifecycleMethods.prototype, name));
}

for (const name of Object.getOwnPropertyNames(AccdbWorkbenchMethods.prototype)) {
  if (name !== 'constructor') Object.defineProperty(LfeaPipelineAccdbInputPanelController.prototype, name, Object.getOwnPropertyDescriptor(AccdbWorkbenchMethods.prototype, name));
}
// Owner mutations invalidate pending transactions even across change-return cycles.
for (const name of ['loadFile', 'clear', 'refreshForComponentFactorAuthority',
  'setRequestedCaseIds', 'authorizePreFlight', 'setRequestedProfile', 'setOverrideDraft',
  'applyOverrides', 'resetOverrides', 'applyCoordinateEdit', 'navigateCoordinateHistory',
  'applyImportedCoordinateDraft', 'invalidatePendingImport', 'destroy', 'adoptCandidate']) {
  const mutate = LfeaPipelineAccdbInputPanelController.prototype[name];
  LfeaPipelineAccdbInputPanelController.prototype[name] = function (...args) {
    invalidateWorkbench(this);
    return mutate.apply(this, args);
  };
}
