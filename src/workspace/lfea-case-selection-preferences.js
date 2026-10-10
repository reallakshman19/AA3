// Non-authoritative browser preference only. Stored choices do not re-import
// a source, change pre-flight, acknowledge findings or grant Run approval.
export const LFEA_CASE_SELECTION_PREFERENCE_KEY = 'aa3.lfea.caseSelection.v1';
export const LFEA_CASE_SELECTION_PREFERENCE_SCHEMA = 'lfea-case-selection-preference/v1';

export function lfeaCaseSelectionBrowserStorage(windowRef) {
  try {
    return windowRef?.localStorage ?? null;
  } catch {
    // Private modes and policy-restricted environments may deny access.
    return null;
  }
}

function validText(value) {
  return typeof value === 'string' && value.trim().length > 0
    && value.length <= 256 && !/[\u0000-\u001f]/u.test(value);
}

function validIds(ids) {
  return Array.isArray(ids) && ids.length <= 256
    && ids.every(validText) && new Set(ids).size === ids.length;
}

/**
 * Only the user's checkbox draft, tied to an exact source semantic identity,
 * crosses this boundary. Never serialize pre-flight, approvals or source bytes.
 */
export function createLfeaCaseSelectionPreferences(storage) {
  return Object.freeze({
    load(sourceSemanticHash, availableCaseIds) {
      if (!validText(sourceSemanticHash) || !validIds(availableCaseIds) || !storage) return null;
      try {
        const raw = storage.getItem(LFEA_CASE_SELECTION_PREFERENCE_KEY);
        if (typeof raw !== 'string' || raw.length > 65536) return null;
        const record = JSON.parse(raw);
        if (!record || typeof record !== 'object' || Array.isArray(record)
          || Object.keys(record).sort().join(',') !== 'schema,selectedCaseIds,sourceSemanticHash'
          || record.schema !== LFEA_CASE_SELECTION_PREFERENCE_SCHEMA
          || record.sourceSemanticHash !== sourceSemanticHash
          || !validIds(record.selectedCaseIds)) return null;
        const available = new Set(availableCaseIds);
        if (!record.selectedCaseIds.every((id) => available.has(id))) return null;
        return Object.freeze([...record.selectedCaseIds]);
      } catch {
        return null;
      }
    },
    save(sourceSemanticHash, selectedCaseIds) {
      if (!validText(sourceSemanticHash) || !validIds(selectedCaseIds) || !storage) return false;
      try {
        storage.setItem(LFEA_CASE_SELECTION_PREFERENCE_KEY, JSON.stringify({
          schema: LFEA_CASE_SELECTION_PREFERENCE_SCHEMA,
          sourceSemanticHash,
          selectedCaseIds: [...selectedCaseIds].sort(),
        }));
        return true;
      } catch {
        // A failed preference write must never prevent explicit engineering UI input.
        return false;
      }
    },
  });
}
