import { LFEA_PIPELINE_ACCDB_MODEL_TABLES } from './lfea-accdb-panel-constants.js';

import { lfeaBendFactorAuthoritySelection } from './lfea-bend-factor-authority-control.js';

import { hashOriginalAccdbBytes, errorMessage } from './lfea-accdb-panel-utils.js';
export class AccdbSourceMethods {
  async loadSelectedFile() {
    const file = this.elements?.fileInput.files?.[0];
    if (!file) return;
    this.options.onImportIntent?.('ACCDB');
    await this.loadFile(file);
  }

  /**
   * Parse into a separate candidate so a failed or stale import cannot retire the
   * current engineering source, pre-flight, or approvals before the replacement
   * is successfully prepared. The newest selected file wins.
   */
  // Exception to the usual small-method limit: keep the asynchronous import
  // epoch checks, detached adoption and finally cleanup in one custody boundary.
  async loadFile(file) {
    if (!file || typeof file.arrayBuffer !== 'function') {
      throw new TypeError('An ACCDB File is required.');
    }
    const epoch = ++this.importEpoch;
    this.error = '';
    this.message = 'Reading ' + file.name + '… The active source remains unchanged until preparation completes.';
    this.busy = true;
    this.render();

    try {
      const buffer = await file.arrayBuffer();
      if (epoch !== this.importEpoch) return false;
      const bytes = new Uint8Array(buffer);
      const readLog = [];
      const tables = await this.readTables(bytes, LFEA_PIPELINE_ACCDB_MODEL_TABLES, readLog);
      if (epoch !== this.importEpoch) return false;
      // Bind the detached 11-table intake to the exact read-only original file
      // bytes. The browser never rewrites/repackages the source ACCDB.
      const originalByteSha256 = await hashOriginalAccdbBytes(bytes);
      if (epoch !== this.importEpoch) return false;

      // Reuse the exact existing extraction/pre-flight methods on detached state.
      // Only the successful candidate crosses into the live controller.
      const prepared = Object.create(Object.getPrototypeOf(this));
      prepared.fileName = file.name;
      prepared.requestedProfileId = this.requestedProfileId;
      prepared.requestedCaseIds = null;
      prepared.extract(tables);
      if (epoch !== this.importEpoch) return false;

      this.fileName = file.name;
      this.tables = tables;
      this.sourceBaseIdentity = prepared.preFlight?.intake?.contentSha256 ?? null;
      this.originalAccdbByteSha256 = originalByteSha256;
      this.lastComponentBasisRefresh = null;
      this.coordinateEdits = [];
      this.coordinateCursor = 0;
      this.coordinateRevision += 1;
      this.coordinateApprover = '';
      this.coordinateReason = '';
      this.coordinateDisclosures = Object.freeze([]);
      this.effectiveTables = prepared.effectiveTables;
      this.sourceBundle = prepared.sourceBundle;
      this.modelHealth = prepared.modelHealth;
      this.healthView = prepared.healthView;
      this.propertyRows = prepared.propertyRows;
      this.engineeringSanity = prepared.engineeringSanity;
      this.preFlight = prepared.preFlight;
      this.preFlightError = prepared.preFlightError;
      this.requestedCaseIds = null;
      this.overrideSet = null;
      this.overrideDisclosures = Object.freeze([]);
      this.overrideDrafts.clear();
      this.overrideApprover = '';
      this.overrideReason = '';
      this.reviewerIdentity = '';
      this.reviewReason = '';
      this.showProperties = false;
      this.error = '';
      this.message = 'Loaded ' + file.name + ': ' + this.sourceBundle.elementRecords.length
        + ' element(s), ' + this.sourceBundle.geometry.nodes.length
        + ' node(s). See the model-health verdict below.';
      return true;
    } catch (error) {
      if (epoch !== this.importEpoch) return false;
      this.error = errorMessage(error);
      this.message = 'ACCDB extraction failed for ' + file.name + '. The previous engineering source remains unchanged.';
      return false;
    } finally {
      if (epoch === this.importEpoch) {
        this.busy = false;
        if (this.elements) this.elements.fileInput.value = '';
        this.render();
        if (!this.error && this.fileName === file.name) this.notifyStateChanged();
      }
    }
  }

  /**
   * A basis change must consume the same effective ACCDB tables as the latest
   * successful Apply/Undo/Redo, with the selected explicit authority read by
   * the native preparation gateway. No editor approval is a run approval.
   */
  refreshForComponentFactorAuthority(selection = lfeaBendFactorAuthoritySelection()) {
    if (!this.effectiveTables || !this.fileName) return;
    try {
      const candidate = this.prepareCandidate(this.effectiveTables);
      this.adoptCandidate(candidate);
      this.error = '';
      this.lastComponentBasisRefresh = Object.freeze({
        editionProfileId: selection.editionProfileId,
        smooth90FlexibilityCorrection: selection.smooth90FlexibilityCorrection,
        intakeSemanticHash: this.preFlight?.intake?.semanticHash ?? null,
        sealedAuthorityHash: this.preFlight?.preparation?.stiffnessPreflight?.bendFactorAuthority?.semanticHash ?? null,
        preFlightSemanticHash: this.preFlight?.semanticHash ?? null,
        status: this.preFlight?.status ?? 'UNAVAILABLE',
      });
      this.message = 'The current corrected ACCDB was re-prepared for the explicit component basis. '
        + 'Review the current Error Check; previous diagnostic acceptance does not transfer.';
    } catch (error) {
      // Preserve the former BLOCK and surface the actual preparation failure;
      // a visibly selected basis must not silently promote a failed seal.
      this.error = errorMessage(error);
      this.message = 'Component basis selected, but the current ACCDB could not be re-prepared: ' + this.error;
      this.lastComponentBasisRefresh = Object.freeze({
        editionProfileId: selection.editionProfileId,
        smooth90FlexibilityCorrection: selection.smooth90FlexibilityCorrection,
        status: 'FAILED',
        error: this.error,
      });
    }
    this.render();
    this.notifyStateChanged();
  }

  /** Build every derived record from one exact table set. */
}
