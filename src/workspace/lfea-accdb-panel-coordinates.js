
import { applyAccdbFieldOverrides } from '../core/linear-piping-analysis-consumer/accdb-field-overrides.js';
import { previewAccdbNodeCoordinateEdit, replayAccdbCoordinateDraft, requireAccdbCoordinateDraft, ACCDB_COORDINATE_DRAFT_SCHEMA } from '../core/linear-piping-analysis-consumer/accdb-coordinate-overrides.js';

import { LINEAR_PIPING_ACCDB_LENGTH_UNITS } from './linear-piping-accdb-intake.js';

export class AccdbCoordinatesMethods {
  coordinateDraft(edits = this.coordinateEdits.slice(0, this.coordinateCursor), approver = this.coordinateApprover, reason = this.coordinateReason) {
    return {
      schema: ACCDB_COORDINATE_DRAFT_SCHEMA,
      sourceIdentity: this.sourceBaseIdentity,
      originalAccdbByteSha256: this.originalAccdbByteSha256,
      approver, reason,
      edits: edits.map((edit) => ({ nodeId: edit.nodeId, axis: edit.axis, value: edit.value, unit: edit.unit })),
    };
  }

  withCoordinateEdits(tables, edits = this.coordinateEdits.slice(0, this.coordinateCursor),
    approver = this.coordinateApprover, reason = this.coordinateReason) {
    if (!edits.length) return { tables, disclosures: Object.freeze([]) };
    return replayAccdbCoordinateDraft(tables, this.coordinateDraft(edits, approver, reason), this.sourceBaseIdentity);
  }

  getCoordinateEditorSnapshot() {
    return Object.freeze({
      sourceIdentity: this.sourceBaseIdentity,
      originalAccdbByteSha256: this.originalAccdbByteSha256,
      revision: this.coordinateRevision,
      unit: LINEAR_PIPING_ACCDB_LENGTH_UNITS[
        String(this.sourceBundle?.unitSystem?.declared?.length ?? '').trim().toUpperCase()
      ] ?? null,
      undoCount: this.coordinateCursor,
      redoCount: this.coordinateEdits.length - this.coordinateCursor,
      editedNodeCount: new Set(this.coordinateEdits.slice(0, this.coordinateCursor)
        .map((row) => row.nodeId)).size,
      disclosures: this.coordinateDisclosures,
    });
  }

  getCoordinateRawValue(sourceNodeId, axis) {
    const id = String(sourceNodeId);
    const letter = String(axis).toUpperCase();
    const rows = this.effectiveTables?.INPUT_NODAL_COORDINATES?.rows ?? [];
    for (const row of rows) {
      for (const side of ['FROM', 'TO']) {
        if (String(row[side + '_NODE']) === id) return row[side + '_NODE_' + letter] ?? null;
      }
    }
    return null;
  }

  previewCoordinateEdit(request) {
    if (!this.tables || !this.sourceBaseIdentity) throw new TypeError('Load a supported ACCDB before editing.');
    const snapshot = this.getCoordinateEditorSnapshot();
    const preview = previewAccdbNodeCoordinateEdit(this.effectiveTables, {
      ...request,
      sourceIdentity: this.sourceBaseIdentity,
      expectedSourceIdentity: request.expectedSourceIdentity,
      revision: this.coordinateRevision,
      expectedRevision: request.expectedRevision,
      unit: request.unit ?? snapshot.unit,
    });
    if (!preview.changed) return preview;
    // Preview the actual next governed preparation without crossing the
    // live-controller boundary. This makes failures visible before Apply.
    const prepared = this.prepareCandidate(preview.tables);
    const previous = this.preFlight?.preparation?.findings ?? [];
    const proposed = prepared.preFlight?.preparation?.findings ?? [];
    const countCodes = (rows) => {
      const counts = new Map();
      for (const row of rows) counts.set(row.code, (counts.get(row.code) ?? 0) + 1);
      return counts;
    };
    const before = countCodes(previous);
    const after = countCodes(proposed);
    const changedCodes = [...new Set([...before.keys(), ...after.keys()])]
      .filter((code) => (before.get(code) ?? 0) !== (after.get(code) ?? 0))
      .sort()
      .map((code) => Object.freeze({ code, before: before.get(code) ?? 0, after: after.get(code) ?? 0 }));
    return Object.freeze({
      ...preview,
      diagnosticPreview: Object.freeze({
        previousFindingCount: previous.length,
        proposedFindingCount: proposed.length,
        previousStatus: this.preFlight?.status ?? 'UNAVAILABLE',
        proposedStatus: prepared.preFlight?.status ?? 'UNAVAILABLE',
        previousPreparationSemanticHash: this.preFlight?.semanticHash ?? null,
        proposedPreparationSemanticHash: prepared.preFlight?.semanticHash ?? null,
        changedCodes: Object.freeze(changedCodes),
      }),
    });
  }

  /** Prospective governed raw-property edit on detached source tables. */
  applyCoordinateEdit(request) {
    const preview = this.previewCoordinateEdit(request);
    if (!preview.changed) return preview;
    const approver = String(request.approver ?? '').trim();
    const reason = String(request.reason ?? '').trim();
    if (!approver || !reason) throw new TypeError('A coordinate correction requires approver and reason.');
    const edits = [...this.coordinateEdits.slice(0, this.coordinateCursor), {
      nodeId: preview.nodeId, axis: preview.axis, value: preview.after, unit: preview.unit,
    }];
    let input = this.tables;
    if (this.overrideSet) input = applyAccdbFieldOverrides(input, this.overrideSet).tables;
    const effective = this.withCoordinateEdits(input, edits, approver, reason);
    const candidate = this.prepareCandidate(effective.tables);
    this.adoptCandidate(candidate);
    this.coordinateEdits = edits;
    this.coordinateCursor = edits.length;
    this.coordinateRevision += 1;
    this.coordinateApprover = approver;
    this.coordinateReason = reason;
    this.coordinateDisclosures = effective.disclosures;
    this.error = '';
    this.message = 'Applied source-bound coordinate correction; diagnostics and preparation regenerated. Previous run authorization was invalidated.';
    this.render();
    this.notifyStateChanged();
    return preview;
  }

  navigateCoordinateHistory(direction) {
    const cursor = this.coordinateCursor + direction;
    if (direction !== -1 && direction !== 1) throw new TypeError('Undo/redo direction must be -1 or +1.');
    if (cursor < 0 || cursor > this.coordinateEdits.length) return false;
    let input = this.tables;
    if (this.overrideSet) input = applyAccdbFieldOverrides(input, this.overrideSet).tables;
    const effective = this.withCoordinateEdits(input, this.coordinateEdits.slice(0, cursor));
    const candidate = this.prepareCandidate(effective.tables);
    this.adoptCandidate(candidate);
    this.coordinateCursor = cursor;
    this.coordinateRevision += 1;
    this.coordinateDisclosures = effective.disclosures;
    this.message = (direction === -1 ? 'Undo' : 'Redo') + ' applied to prepared model; diagnostics regenerated and prior authorization not reused.';
    this.render();
    this.notifyStateChanged();
    return true;
  }

  /** Save as a source-bound JSON overlay, never as a modified ACCDB binary. */
  exportCoordinateDraft() {
    if (!this.sourceBaseIdentity) throw new TypeError('No ACCDB source to export.');
    return JSON.stringify(this.coordinateDraft(), null, 2);
  }

  previewImportedCoordinateDraft(json) {
    if (!this.sourceBaseIdentity) throw new TypeError('Import an ACCDB before loading a repair draft.');
    const draft = typeof json === 'string' ? JSON.parse(json) : json;
    requireAccdbCoordinateDraft(draft, this.sourceBaseIdentity);
    if (!draft.originalAccdbByteSha256
        || draft.originalAccdbByteSha256 !== this.originalAccdbByteSha256) {
      throw new TypeError('Saved correction does not match the original ACCDB binary SHA-256; reload the exact source file.');
    }
    let input = this.tables;
    if (this.overrideSet) input = applyAccdbFieldOverrides(input, this.overrideSet).tables;
    const replay = replayAccdbCoordinateDraft(input, draft, this.sourceBaseIdentity);
    this.prepareCandidate(replay.tables);
    return { draft, replay };
  }

  applyImportedCoordinateDraft(json, approval) {
    const { draft, replay } = this.previewImportedCoordinateDraft(json);
    const approver = String(approval?.approver ?? '').trim();
    const reason = String(approval?.reason ?? '').trim();
    if (!approver || !reason) throw new TypeError('Review and supply a current approver and reason to apply the imported draft.');
    const candidate = this.prepareCandidate(replay.tables);
    this.adoptCandidate(candidate);
    this.coordinateEdits = draft.edits.map((edit) => ({ ...edit }));
    this.coordinateCursor = draft.edits.length;
    this.coordinateRevision += 1;
    this.coordinateApprover = approver;
    this.coordinateReason = reason;
    this.coordinateDisclosures = replay.disclosures;
    this.message = 'Imported source-bound correction applied; fresh diagnostic authority required.';
    this.render();
    this.notifyStateChanged();
    return replay;
  }

}
