/**
 * Pure resolution core for the source enrichment pre-flight review.
 *
 * No DOM, no storage, no singletons: importable in Node so the duplicate and
 * ambiguity invariants can be asserted behaviourally rather than by grepping
 * the view layer. See docs/enrichment-ui-phase0-inventory.md for the
 * dispositions these functions implement.
 */
import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { deriveXmlCiiServiceFromBranchName } from '../calc-workspace/cii-standalone-port/core/service-process-fallback.js';
import { deriveLineKeyFromBranchName } from '../calc-workspace/cii-standalone-port/core/regex-line-key.js';

/** Resolution outcomes. Blocked outcomes never carry a selected row. */
export const PREFLIGHT_MATCH_STATUS = Object.freeze({
  EXACT: 'EXACT',
  BLOCKED_AMBIGUOUS: 'BLOCKED_AMBIGUOUS',
  BLOCKED_MISSING: 'BLOCKED_MISSING',
});

/** NUL cannot occur in a service, rating, class or line-key token, so a
 * composite group key built with it cannot collide with a different tuple. */
const GROUP_KEY_SEPARATOR = '\u0000';

export function deriveWallThicknessFromDtxr(boreMm, pipingClass, dtxrAttr) {
  if (!Number.isFinite(Number.parseFloat(boreMm)) || !dtxrAttr || typeof dtxrAttr !== 'object') return null;
  const explicitWt = Number.parseFloat(
    dtxrAttr.WT || dtxrAttr.WALL_THICKNESS || dtxrAttr.WALLTHK || dtxrAttr.THK || dtxrAttr.THICKNESS,
  );
  if (Number.isFinite(explicitWt) && explicitWt > 0) return explicitWt;
  return null;
}

export function buildNormalizedKeyBuckets(lineRows) {
  const buckets = new Map();
  const rows = Array.isArray(lineRows) ? lineRows : [];
  rows.forEach((row, ordinal) => {
    for (const key of normalizedKeysForRow(row)) {
      const existing = buckets.get(key);
      if (existing) existing.push(ordinal);
      else buckets.set(key, [ordinal]);
    }
  });
  return buckets;
}

function normalizedKeysForRow(row) {
  const keys = new Set();
  const primary = normalizeKey(row?.lineKey ?? row?.lineNoKey ?? row?.lineNo ?? row?.lineSeqNo);
  if (primary.length >= 3) keys.add(primary);
  const secondary = normalizeKey(row?.lineKey2 ?? row?.lineSeqNo ?? row?.lineNo);
  if (secondary.length >= 3) keys.add(secondary);
  const prefix = normalizeKey(row?.lineKey1);
  if (prefix && secondary && (prefix + secondary).length >= 3) keys.add(prefix + secondary);
  return keys;
}

function normalizeKey(value) {
  return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/gu, '');
}

export function resolveLineKeyCandidates(buckets, normalizedLineKey) {
  const key = normalizeKey(normalizedLineKey);
  if (!key || key.length < 3) return blocked(PREFLIGHT_MATCH_STATUS.BLOCKED_MISSING, []);
  const exact = buckets.get(key) ?? [];
  if (exact.length === 1) {
    return Object.freeze({
      status: PREFLIGHT_MATCH_STATUS.EXACT,
      candidateOrdinals: Object.freeze([...exact]),
      selectedOrdinal: exact[0],
    });
  }
  if (exact.length > 1) return blocked(PREFLIGHT_MATCH_STATUS.BLOCKED_AMBIGUOUS, exact);

  const candidates = new Set();
  for (const [candidateKey, ordinals] of buckets) {
    if (candidateKey.length < 3) continue;
    if (key.includes(candidateKey) || candidateKey.includes(key)) {
      for (const ordinal of ordinals) candidates.add(ordinal);
    }
  }
  const ordered = [...candidates].sort((left, right) => left - right);
  if (ordered.length === 0) return blocked(PREFLIGHT_MATCH_STATUS.BLOCKED_MISSING, []);
  return blocked(PREFLIGHT_MATCH_STATUS.BLOCKED_AMBIGUOUS, ordered);
}

function blocked(status, ordinals) {
  return Object.freeze({
    status,
    candidateOrdinals: Object.freeze([...ordinals]),
    selectedOrdinal: null,
  });
}

/**
 * Project the active model into the grouped, resolved review model.
 * Engineering concepts stay separate: hydro pressure is never design pressure,
 * and mixed density is never substituted for operating density.
 */
export function projectPreflightModel(model, lineRows) {
  const elements = sourceElements(model);
  if (elements.length === 0) {
    return Object.freeze({
      blocked: 'No active shared model is loaded. Load a dataset in the Workspace tab; this screen shows no synthetic data.',
      groups: Object.freeze([]),
      lineKeyCount: 0,
      componentCount: 0,
    });
  }
  const buckets = buildNormalizedKeyBuckets(lineRows);
  const rows = Array.isArray(lineRows) ? lineRows : [];
  const byLineKey = new Map();
  for (const item of flattenItems(elements)) {
    const parsed = parseItem(item);
    const groupKey = [parsed.service, parsed.rating, parsed.cls, parsed.isolatedLineKeyToken].join(GROUP_KEY_SEPARATOR);
    let entry = byLineKey.get(groupKey);
    if (!entry) {
      const resolution = resolveLineKeyCandidates(buckets, parsed.isolatedLineKeyToken);
      const selected = resolution.selectedOrdinal === null ? null : rows[resolution.selectedOrdinal] ?? null;
      entry = {
        ...parsed,
        sourcePipingClass: sourceCodeOrNull(parsed.cls, 'UNKNOWN_SPEC'),
        sourceRating: sourceCodeOrNull(parsed.rating, 'UNKNOWN_RATING'),
        masterPipingClass: selected ? textOrNull(selected.pipingClass) : null,
        masterRating: selected ? textOrNull(selected.rating) : null,
        masterRowHash: selected ? masterRowSemanticHash(selected) : null,
        resolution,
        candidateCount: resolution.candidateOrdinals.length,
        designPressure: selected ? numberOrNull(selected.p1) : null,
        hydroTestPressure: selected ? numberOrNull(selected.hydroPressure) : null,
        designTemperature: selected ? numberOrNull(selected.t1) : null,
        operatingTemperature: selected ? numberOrNull(selected.t2) : null,
        minimumTemperature: selected ? numberOrNull(selected.t3) : null,
        phase: selected ? textOrNull(selected.phase) : null,
        materialCode: selected ? textOrNull(selected.material) : null,
        operatingDensity: selected ? numberOrNull(selected.density) : null,
        gasDensity: selected ? numberOrNull(selected.densityGas) : null,
        liquidDensity: selected ? numberOrNull(selected.densityLiquid) : null,
        mixedDensity: selected ? numberOrNull(selected.densityMixed) : null,
        insulationThickness: selected ? numberOrNull(selected.insThk) : null,
        metalDensity: null,
        items: [],
        wallThicknessCandidates: [],
        wallThickness: null,
        wallThicknessConflict: false,
      };
      pushWallThicknessCandidate(entry, parsed.wallThickness);
      byLineKey.set(groupKey, entry);
    }
    entry.items.push(parsed);
    pushWallThicknessCandidate(entry, parsed.wallThickness);
  }

  const groups = [...byLineKey.values()].sort(compareLineKeyEntries);
  return Object.freeze({
    blocked: null,
    groups: Object.freeze(groups),
    lineKeyCount: groups.length,
    componentCount: groups.reduce((total, entry) => total + entry.items.length, 0),
  });
}

function sourceElements(model) {
  if (Array.isArray(model)) return model;
  const sharedModel = model?._context?.contracts?.sharedModel ?? model?.sharedModel ?? null;
  if (sharedModel) return [...(sharedModel.components ?? []), ...(sharedModel.supports ?? [])];
  if (model?.components || model?.branches) return [...(model.branches ?? []), ...(model.components ?? [])];
  return [];
}

function flattenItems(elements) {
  const items = [];
  for (const element of elements) {
    if (Array.isArray(element.children) && element.children.length > 0) {
      for (const child of element.children) {
        const lineKeyName = child.identity?.lineId
          || element.identity?.lineId
          || child.attributes?.OWNER
          || element.attributes?.OWNER
          || element.owner
          || element.branchName
          || element.name
          || element.id
          || 'UNASSIGNED_LINEKEY';
        items.push({ ...child, lineKeyName });
      }
      continue;
    }
    const owner = element.identity?.lineId
      || element.attributes?.OWNER
      || element.owner
      || element.branchName
      || element.name
      || 'UNASSIGNED_LINEKEY';
    items.push({ ...element, lineKeyName: owner });
  }
  return items;
}

/**
 * `item.engineeringProperties` fields may be plain scalars or evidence-wrapped
 * objects (`{ value, unit, sourceKind, sourcePath }`, per the common-enriched-
 * properties field shape). Unwrap the latter so a stringified evidence object
 * never leaks into the read-only review grid as literal "[object Object]".
 */
function scalarOrNull(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return 'value' in value ? scalarOrNull(value.value) : null;
  return value;
}

function parseItem(item) {
  const rawFullName = item.lineKeyName || item.name || item.id || '';
  const cleanFullName = rawFullName.startsWith('/') ? rawFullName.slice(1) : rawFullName;
  let isolatedLineKeyToken = deriveLineKeyFromBranchName(cleanFullName, {})
    || deriveLineKeyFromBranchName(rawFullName, {});
  if (!isolatedLineKeyToken) {
    const stripped = cleanFullName.replace(/\/B\d+.*$/iu, '');
    const match = stripped.match(/(?:S|D|PL|HC)?\d{4,}/iu);
    isolatedLineKeyToken = match ? match[0] : stripped;
  }
  let cls = item.attributes?.SPEC || 'UNKNOWN_SPEC';
  const parts = cleanFullName.split('-');
  if (parts.length > 3 && cls === 'UNKNOWN_SPEC') cls = parts[4] || parts[3] || cls;
  let bore = item.boreMm ?? item._boreValue ?? item.bore ?? scalarOrNull(item.engineeringProperties?.nominalBoreMm);
  if (typeof bore === 'string') bore = Number.parseFloat(bore) || null;
  return {
    id: item.id || item.componentKey || item.sourceEntityId || item.name || item.supportKey || item.type || 'ITEM',
    itemName: item.name || item.id || item.componentKey || item.supportKey || item.type || 'ITEM',
    itemType: item.type || item.componentType || item.RAW_TYPE || 'ITEM',
    isolatedLineKeyToken,
    fullLineKeyName: cleanFullName.replace(/\/B\d+.*$/iu, ''),
    service: deriveXmlCiiServiceFromBranchName(cleanFullName, {}) || 'UNKNOWN',
    rating: item.attributes?.RATING || scalarOrNull(item.engineeringProperties?.ratingClassCode) || 'UNKNOWN_RATING',
    cls: item.attributes?.SPEC || scalarOrNull(item.engineeringProperties?.pipingClassCode) || cls,
    bore,
    wallThickness: deriveWallThicknessFromDtxr(bore, cls, item.attributes ?? item.engineeringProperties ?? null),
  };
}

function pushWallThicknessCandidate(entry, value) {
  if (value === null || value === undefined) return;
  if (!entry.wallThicknessCandidates.includes(value)) {
    entry.wallThicknessCandidates.push(value);
    entry.wallThicknessCandidates.sort((left, right) => left - right);
  }
  entry.wallThicknessConflict = entry.wallThicknessCandidates.length > 1;
  entry.wallThickness = entry.wallThicknessConflict ? null : entry.wallThicknessCandidates[0];
}

function masterRowSemanticHash(row) {
  const stable = {};
  for (const key of Object.keys(row ?? {}).sort()) {
    if (key === '_sourceRowIndex' || key === '_sourceProvenance') continue;
    if (row[key] !== undefined) stable[key] = row[key];
  }
  return semanticHash(stable);
}

function sourceCodeOrNull(value, unavailableToken) {
  const text = textOrNull(value);
  return text === unavailableToken ? null : text;
}

function textOrNull(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function compareLineKeyEntries(left, right) {
  const leftKey = [left.service, left.rating, left.cls, left.isolatedLineKeyToken].join(GROUP_KEY_SEPARATOR);
  const rightKey = [right.service, right.rating, right.cls, right.isolatedLineKeyToken].join(GROUP_KEY_SEPARATOR);
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

function numberOrNull(value) {
  const number = Number(value);
  return value !== '' && value !== null && value !== undefined && Number.isFinite(number) ? number : null;
}
