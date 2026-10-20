
import { applyAccdbFieldOverrides } from '../core/linear-piping-analysis-consumer/accdb-field-overrides.js';

import { errorMessage } from './lfea-accdb-panel-utils.js';
export class AccdbPropertiesMethods {
  setOverrideDraft(accdbElementId, field, rawText) {
    const key = `${accdbElementId}:${field}`;
    const text = String(rawText ?? '').trim();
    if (text === '') this.overrideDrafts.delete(key);
    else this.overrideDrafts.set(key, text);
  }

  togglePropertyTable() {
    this.showProperties = !this.showProperties;
    this.render();
  }

  /**
   * Apply every drafted override as one authorized edit.
   *
   * The edit is applied to the as-imported tables, never to the previously
   * overridden ones, so the drafted values always mean what the table shows
   * the engineer -- an override can be revised or withdrawn without
   * compounding onto an earlier edit. The full import runs again from the
   * edited tables, so the resulting verdict is a real verdict on the edited
   * model, not the old verdict with values swapped underneath it.
   */
  applyOverrides() {
    if (!this.tables) throw new TypeError('No ACCDB source is loaded.');
    const overrides = [...this.overrideDrafts.entries()].map(([key, rawValue]) => {
      const separator = key.lastIndexOf(':');
      return { accdbElementId: key.slice(0, separator), field: key.slice(separator + 1), rawValue };
    });
    this.error = '';
    try {
      const applied = applyAccdbFieldOverrides(this.tables, {
        approver: this.overrideApprover,
        reason: this.overrideReason,
        overrides,
      });
      const effective = this.withCoordinateEdits(applied.tables);
      const prepared = this.prepareCandidate(effective.tables);
      this.adoptCandidate(prepared);
      this.overrideSet = applied.overrideSet;
      this.overrideDisclosures = applied.disclosures;
      this.coordinateDisclosures = effective.disclosures;
      this.message = `Applied ${applied.disclosures.length} engineer override(s) to ${this.fileName} and re-ran extraction.`;
    } catch (error) {
      this.error = errorMessage(error);
      this.message = 'Overrides were not applied; the imported values are unchanged.';
    }
    this.render();
    this.notifyStateChanged();
  }

  /** Withdraw every override and return to the values exactly as imported. */
  resetOverrides() {
    if (!this.tables) return;
    this.overrideDrafts.clear();
    this.overrideSet = null;
    this.overrideDisclosures = Object.freeze([]);
    this.error = '';
    const effective = this.withCoordinateEdits(this.tables);
    this.adoptCandidate(this.prepareCandidate(effective.tables));
    this.coordinateDisclosures = effective.disclosures;
    this.message = this.coordinateCursor
      ? 'Element overrides withdrawn; source-bound coordinate corrections remain in force.'
      : 'Overrides withdrawn; ' + this.fileName + ' is back to its imported values.';
    this.render();
    this.notifyStateChanged();
  }

  /** Draft edits are bound to the original model tables, not an already-edited intake. */
  previewPropertyFieldEdit(request) {
    if (!this.tables || !this.sourceBaseIdentity
        || request?.expectedSourceIdentity !== this.sourceBaseIdentity
        || request?.expectedCoordinateRevision !== this.coordinateRevision
        || request?.expectedPreparationHash !== this.preFlight?.semanticHash) {
      throw new TypeError('Property edit is stale for this ACCDB preparation.');
    }
    const id = String(request.accdbElementId ?? '').trim();
    const field = String(request.field ?? '').trim();
    const drafts = new Map(this.overrideDrafts);
    drafts.set(id + ':' + field, String(request.rawValue ?? '').trim());
    const overrides = [...drafts.entries()].map(([key, rawValue]) => {
      const sep = key.lastIndexOf(':');
      return { accdbElementId: key.slice(0, sep), field: key.slice(sep + 1), rawValue };
    });
    const applied = applyAccdbFieldOverrides(this.tables, {
      approver: request.approver, reason: request.reason, overrides,
    });
    const candidate = this.prepareCandidate(this.withCoordinateEdits(applied.tables).tables);
    const changed = applied.disclosures.find((entry) => entry.data.accdbElementId === id
      && entry.data.field === field);
    if (!changed) throw new TypeError('No exact source property row was changed.');
    const datum = changed.data;
    return Object.freeze({
      sourceIdentity: this.sourceBaseIdentity, revision: this.coordinateRevision,
      expectedPreparationHash: this.preFlight?.semanticHash ?? null,
      elementId: id, field, before: datum.originalRawValue, after: datum.overrideRawValue,
      changed: String(datum.originalRawValue ?? '') !== String(datum.overrideRawValue ?? ''),
      statusBefore: this.preFlight?.status ?? 'UNAVAILABLE',
      statusAfter: candidate.preFlight?.status ?? 'UNAVAILABLE',
      findingCountBefore: this.preFlight?.preparation?.findings?.length ?? 0,
      findingCountAfter: candidate.preFlight?.preparation?.findings?.length ?? 0,
      preparationWillChange: candidate.preFlight?.semanticHash !== this.preFlight?.semanticHash,
      overrideCount: applied.disclosures.length,
    });
  }

  applyPropertyFieldEdit(request) {
    const preview = this.previewPropertyFieldEdit(request);
    if (!preview.changed) throw new TypeError('The source property is unchanged; no correction to Apply.');
    this.setOverrideDraft(preview.elementId, preview.field, preview.after);
    this.overrideApprover = String(request.approver ?? '').trim();
    this.overrideReason = String(request.reason ?? '').trim();
    this.applyOverrides();
    if (this.error) throw new TypeError(this.error);
    return preview;
  }

  /** A successful Apply changes the exact tables that the analysis intake seals. */
}
