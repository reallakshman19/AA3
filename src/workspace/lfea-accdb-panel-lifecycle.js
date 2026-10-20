import { LFEA_PIPELINE_ACCDB_INPUT_PANEL_SCHEMA } from './lfea-accdb-panel-constants.js';

export class AccdbLifecycleMethods {
  invalidatePendingImport() {
    if (!this.busy) return;
    ++this.importEpoch;
    this.busy = false;
    this.message = 'The previous ACCDB import was superseded by a newer source selection.';
    this.render();
  }

  clear() {
    ++this.importEpoch;
    this.busy = false;
    this.fileName = null;
    this.tables = null;
    this.effectiveTables = null;
    this.lastComponentBasisRefresh = null;
    this.sourceBundle = null;
    this.modelHealth = null;
    this.healthView = null;
    this.propertyRows = Object.freeze([]);
    this.engineeringSanity = null;
    this.overrideSet = null;
    this.overrideDisclosures = Object.freeze([]);
    this.overrideDrafts.clear();
    this.sourceBaseIdentity = null;
    this.originalAccdbByteSha256 = null;
    this.coordinateEdits = [];
    this.coordinateCursor = 0;
    this.coordinateRevision += 1;
    this.coordinateApprover = '';
    this.coordinateReason = '';
    this.coordinateDisclosures = Object.freeze([]);
    this.overrideApprover = '';
    this.overrideReason = '';
    this.reviewerIdentity = '';
    this.reviewReason = '';
    this.requestedCaseIds = null;
    this.showProperties = false;
    this.error = '';
    this.message = 'Import a CAESAR II ACCDB source for geometry/model-health extraction.';
    if (this.elements) this.elements.fileInput.value = '';
    this.render();
    this.notifyStateChanged();
  }

  /** The loaded element table, for diagnostics that read raw geometry. */
  getElementRows() {
    return this.effectiveTables?.INPUT_BASIC_ELEMENT_DATA?.rows ?? null;
  }

  getSnapshot() {
    return Object.freeze({
      schema: LFEA_PIPELINE_ACCDB_INPUT_PANEL_SCHEMA,
      fileName: this.fileName,
      elementCount: this.sourceBundle?.elementRecords.length ?? null,
      nodeCount: this.sourceBundle?.geometry.nodes.length ?? null,
      capabilityStatusById: this.modelHealth?.summary.capabilityStatusById ?? null,
      requestedProfileId: this.requestedProfileId,
      scopedCapabilityStatusById: this.healthView === null ? null : Object.freeze(Object.fromEntries(
        this.healthView.capabilities.map((row) => [row.capabilityId, row.status]),
      )),
      scopedBlockingFindingCount: this.healthView?.blockingCount ?? null,
      findingGroupCount: this.healthView?.findingGroups.length ?? null,
      preFlightStatus: this.preFlight?.status ?? (this.preFlightError ? 'FAILED' : 'NOT_PREPARED'),
      preFlightSolveAuthorized: this.preFlight?.solveAuthorized ?? false,
      availableCaseIds: this.preFlight?.sourceSummary.availableCaseIds ?? Object.freeze([]),
      preFlightError: this.preFlightError || null,
      preFlightApprover: this.preFlight?.approverIdentity ?? null,
      // Read-only sealing trace for correction-first regression diagnostics.
      // Selection values alone do not establish consumed native authority.
      componentBasisRefresh: this.lastComponentBasisRefresh?.preFlightSemanticHash === this.preFlight?.semanticHash
        ? this.lastComponentBasisRefresh : null,
      overrideCount: this.overrideSet?.overrides.length ?? 0,
      coordinateEditCount: this.coordinateCursor,
      sourceBaseIdentity: this.sourceBaseIdentity,
      originalAccdbByteSha256: this.originalAccdbByteSha256,
      overrideApprover: this.overrideSet?.approver ?? null,
      engineeringSanityFindingCount: this.engineeringSanity?.summary.findingCount ?? null,
      message: this.message,
      error: this.error || null,
    });
  }

  destroy() {
    this.unsubscribeComponentBasis?.();
    this.unsubscribeComponentBasis = null;
    this.elements?.section.remove();
    this.elements = null;
    this.initialized = false;
  }

  /**
   * Announce a real state change to the host shell.
   *
   * Deliberately not called from render(): init() renders once while the
   * caller's own `const panel = mount(...)` binding is still being assigned,
   * so a listener that reads the panel back would hit it in the temporal
   * dead zone. Every genuine state transition notifies below instead.
   */
  notifyStateChanged() {
    this.options.onStateChanged?.(this.getSnapshot());
  }

}
