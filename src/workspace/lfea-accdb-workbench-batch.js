import {
  lfeaBendFactorAuthoritySelection,
  commitLfeaComponentBasisSelection,
  normalizeLfeaComponentBasisSelection,
} from './lfea-bend-factor-authority-control.js';
import { applyAccdbFieldOverrides } from '../core/linear-piping-analysis-consumer/accdb-field-overrides.js';
import { LFEA_PIPELINE_ACCDB_PROFILE_IDS } from './lfea-pipeline-accdb-view-model.js';
const owners = new WeakMap();
const scope = 'ACCDB raw DIAMETER/WALL_THICK in source-declared units';
function state(owner) {
  if (!owners.has(owner)) owners.set(owner, { generation: 0, tokens: new WeakMap(), history: [] });
  return owners.get(owner);
}
export function invalidateWorkbench(owner) { state(owner).generation++; }
function fingerprint(owner) {
  return JSON.stringify([owner.preFlight, owner.overrideSet, owner.coordinateEdits,
    owner.coordinateCursor, owner.requestedProfileId, owner.requestedCaseIds,
    owner.sourceBaseIdentity, owner.originalAccdbByteSha256, lfeaBendFactorAuthoritySelection()]);
}
function unit(owner) { return owner.sourceBundle?.unitSystem?.declared?.length ?? null; }
function currentSettings(owner) {
  return {
    requestedProfileId: owner.requestedProfileId,
    requestedCaseIds: owner.requestedCaseIds,
    componentBasis: lfeaBendFactorAuthoritySelection(),
  };
}
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function normalizeCases(ids) {
  if (ids === null) return null;
  if (!Array.isArray(ids) || !ids.length || ids.some(id => !String(id).trim())) throw new TypeError('Select explicit load cases.');
  return [...new Set(ids.map(id => String(id).trim()))].sort();
}
function guards(owner, request) {
  const snapshot = snapshotFor(owner);
  for (const key of Object.keys(snapshot)) {
    if (!same(request[key], snapshot[key])) throw new TypeError(`Workbench state is stale or lacks ${key}.`);
  }
  if (owner.busy) throw new TypeError('Wait for the source import to finish.');
  if (!owner.tables || !owner.sourceBaseIdentity || !snapshot.expectedSourceUnit) throw new TypeError('A source with declared units is required.');
  if ((request.propertyPatches ?? []).length && (!String(request.approver ?? '').trim() || !String(request.reason ?? '').trim())) throw new TypeError('Property corrections require approver and reason.');
}
function snapshotFor(owner) {
  return Object.freeze({ expectedSourceIdentity: owner.sourceBaseIdentity,
    expectedPreparationHash: owner.preFlight?.semanticHash ?? null,
    expectedCoordinateRevision: owner.coordinateRevision,
    expectedGeneration: state(owner).generation,
    expectedStateFingerprint: fingerprint(owner), expectedSourceUnit: unit(owner), expectedScope: scope });
}
function mergedOverrides(owner, patches, approval) {
  if (!Array.isArray(patches)) throw new TypeError('Property patches must be an array.');
  const existingMeta = new Map((owner.overrideDisclosures ?? []).map((d) => [
    `${d.data.accdbElementId}:${d.data.field}`,
    { approver: d.data.approver, reason: d.data.reason },
  ]));
  const merged = new Map((owner.overrideSet?.overrides ?? []).map((row) => {
    const key = `${row.accdbElementId}:${row.field}`;
    const meta = existingMeta.get(key);
    return [key, {
      ...row,
      approver: row.approver ?? meta?.approver ?? owner.overrideApprover,
      reason: row.reason ?? meta?.reason ?? owner.overrideReason,
    }];
  }));
  const seen = new Set();
  const rows = owner.tables.INPUT_BASIC_ELEMENT_DATA?.rows ?? [];
  for (const patch of patches) {
    const id = String(patch?.accdbElementId ?? '').trim();
    const field = String(patch?.field ?? '').trim();
    const key = id + ':' + field;
    if (seen.has(key)) throw new TypeError('Duplicate property target.');
    seen.add(key);
    if (!['DIAMETER', 'WALL_THICK'].includes(field)) throw new TypeError('Unsupported workbench property field.');
    if (rows.filter(row => String(row.ELEMENTID) === id).length !== 1) throw new TypeError('Missing or duplicate source target.');
    const rawValue = Number(patch.rawValue);
    if (patch.rawValue == null || String(patch.rawValue).trim() === '' || !Number.isFinite(rawValue) || rawValue <= 0) throw new TypeError('Property value must be positive and finite in source units.');
    const current = owner.effectiveTables?.INPUT_BASIC_ELEMENT_DATA?.rows.find(row => String(row.ELEMENTID) === id);
    if (Number(current?.[field]) !== rawValue) {
      merged.set(key, {
        accdbElementId: id,
        field,
        rawValue,
        approver: patch.approver ?? approval?.approver,
        reason: patch.reason ?? approval?.reason,
      });
    }
  }
  return [...merged.values()];
}
function effective(owner, overrides, approval) {
  const lineage = { approver: approval.approver || owner.overrideSet?.approver || overrides[0]?.approver,
    reason: approval.reason || owner.overrideSet?.reason || overrides[0]?.reason };
  const applied = overrides.length ? applyAccdbFieldOverrides(owner.tables, { ...lineage, overrides })
    : { tables: owner.tables, overrideSet: null, disclosures: Object.freeze([]) };
  const replay = owner.withCoordinateEdits(applied.tables);
  return { ...applied, tables: replay.tables, coordinateDisclosures: replay.disclosures };
}
function disclosure(owner, prepared, changed, token, applied = null) {
  return Object.freeze({ token, changed, scope, sourceUnit: unit(owner),
    originalAccdbByteSha256: owner.originalAccdbByteSha256,
    disclosures: applied?.disclosures ?? Object.freeze([]),
    proposedPreparationHash: prepared?.preFlight?.semanticHash ?? owner.preFlight?.semanticHash ?? null,
    statusBefore: owner.preFlight?.status ?? 'UNAVAILABLE',
    statusAfter: prepared?.preFlight?.status ?? owner.preFlight?.status ?? 'UNAVAILABLE',
    requestedProfileId: prepared?.requestedProfileId ?? owner.requestedProfileId,
    requestedCaseIds: Object.freeze([...(prepared?.requestedCaseIds ?? owner.requestedCaseIds ?? [])]),
    componentBasis: prepared?.componentBasis ?? lfeaBendFactorAuthoritySelection() });
}
export class AccdbWorkbenchMethods {
  getWorkbenchSnapshot() { return snapshotFor(this); }
  previewWorkbenchBatch(request) {
    guards(this, request);
    const approval = { approver: String(request.approver ?? '').trim(), reason: String(request.reason ?? '').trim() };
    const overrides = mergedOverrides(this, request.propertyPatches, approval);
    const currentBasis = lfeaBendFactorAuthoritySelection();
    const nextBasis = request.componentBasis !== undefined
      ? normalizeLfeaComponentBasisSelection(request.componentBasis)
      : currentBasis;
    const settings = {
      requestedProfileId: request.requestedProfileId ?? this.requestedProfileId,
      requestedCaseIds: request.requestedCaseIds === undefined ? this.requestedCaseIds : normalizeCases(request.requestedCaseIds),
      componentBasis: nextBasis,
    };
    if (!LFEA_PIPELINE_ACCDB_PROFILE_IDS.includes(settings.requestedProfileId)) throw new TypeError('Unknown analysis profile.');
    const applied = effective(this, overrides, approval);
    const basisChanged = !same(nextBasis, currentBasis);
    if (same(applied.tables, this.effectiveTables) && same(settings, currentSettings(this))) return disclosure(this, null, false, null);
    const candidate = this.prepareCandidate(applied.tables, settings);
    const token = Object.freeze(Object.create(null));
    const s = state(this);
    s.tokens.set(token, {
      generation: s.generation,
      fingerprint: fingerprint(this),
      candidate,
      applied,
      settings,
      componentBasis: basisChanged ? nextBasis : null,
      expectedComponentBasis: currentBasis,
      approval,
      propertyEdits: request.propertyPatches.length > 0,
      previous: {
        overrides: structuredClone(this.overrideSet),
        settings: structuredClone(currentSettings(this)),
        componentBasis: structuredClone(currentBasis),
      },
    });
    return disclosure(this, candidate, true, token, applied);
  }
  cancelWorkbenchBatch(token) { if (token && typeof token === 'object') state(this).tokens.delete(token); }
  applyWorkbenchBatch(token) {
    const s = state(this);
    const transaction = token && typeof token === 'object' ? s.tokens.get(token) : null;
    if (!transaction || transaction.generation !== s.generation || transaction.fingerprint !== fingerprint(this)) throw new TypeError('Workbench token is stale, used or unknown.');
    s.tokens.delete(token);

    const adoptSettings = () => {
      this.adoptCandidate(transaction.candidate);
      this.requestedProfileId = transaction.settings.requestedProfileId;
      this.requestedCaseIds = transaction.settings.requestedCaseIds;
      this.overrideSet = transaction.applied.overrideSet;
      this.overrideDisclosures = transaction.applied.disclosures;
      this.coordinateDisclosures = transaction.applied.coordinateDisclosures;
      // Preserve existing property-author attribution on settings-only changes.
      if (transaction.propertyEdits) {
        this.overrideApprover = transaction.approval.approver;
        this.overrideReason = transaction.approval.reason;
      }
      s.history.push(transaction.previous);
      invalidateWorkbench(this);
      this.error = '';
      this.message = 'Applied one source-bound workbench correction batch; review current preparation before acceptance.';
      this.render();
      this.notifyStateChanged();
    };

    if (transaction.componentBasis) {
      commitLfeaComponentBasisSelection(transaction.componentBasis, {
        expectedSelection: transaction.expectedComponentBasis,
        owner: this,
        onAdopt: adoptSettings,
      });
    } else {
      adoptSettings();
    }
    return this.getWorkbenchSnapshot();
  }
  undoWorkbenchBatch() {
    const s = state(this);
    const previous = s.history.at(-1);
    if (!previous) throw new TypeError('No workbench batch to undo.');
    const applied = effective(this, previous.overrides?.overrides ?? [],
      { approver: previous.overrides?.approver, reason: previous.overrides?.reason });
    const candidate = this.prepareCandidate(applied.tables, previous.settings);
    const undoAdopt = () => {
      this.adoptCandidate(candidate);
      this.requestedProfileId = previous.settings.requestedProfileId;
      this.requestedCaseIds = previous.settings.requestedCaseIds;
      this.overrideSet = applied.overrideSet;
      this.overrideDisclosures = applied.disclosures;
      this.coordinateDisclosures = applied.coordinateDisclosures;
      s.history.pop();
      invalidateWorkbench(this);
      this.render();
      this.notifyStateChanged();
    };

    if (previous.componentBasis && !same(previous.componentBasis, lfeaBendFactorAuthoritySelection())) {
      commitLfeaComponentBasisSelection(previous.componentBasis, {
        expectedSelection: lfeaBendFactorAuthoritySelection(),
        owner: this,
        onAdopt: undoAdopt,
      });
    } else {
      undoAdopt();
    }
    return this.getWorkbenchSnapshot();
  }
  canUndoWorkbenchBatch() {
    return state(this).history.length > 0;
  }
}
