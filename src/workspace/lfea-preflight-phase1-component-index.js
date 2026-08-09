import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { getLfeaPreflightPhase1LineOrdinal } from './lfea-preflight-phase1-index.js';

export const LFEA_PREFLIGHT_PHASE1_COMPONENT_INDEX_SCHEMA = 'lfea-preflight-phase1-component-index/v1';

const COMPONENT_STATE = new WeakMap();

/**
 * Index stable component identities below already-indexed stable line targets.
 * Component input order is irrelevant: a typed source-ordinal permutation is
 * sorted by parent line ordinal then ASCII component target ID. No transient
 * per-component object graph is created during the million-component build.
 */
export function buildLfeaPreflightPhase1ComponentIndex(lineIndex, input) {
  requireInput(input);
  const count = input.targetIdByOrdinal.length;
  const lineCount = lineIndex.targetCount;
  const componentOrdinalById = new Map();
  const lineOrdinalBySource = new Uint32Array(count);
  const countByLine = new Uint32Array(lineCount);
  const order = new Uint32Array(count);

  for (let sourceOrdinal = 0; sourceOrdinal < count; sourceOrdinal += 1) {
    const targetId = requireText(input.targetIdByOrdinal[sourceOrdinal], `componentTargetId[${sourceOrdinal}]`);
    if (componentOrdinalById.has(targetId)) {
      throw componentIndexError('E_P06_DUPLICATE_COMPONENT_TARGET_ID', `Duplicate Phase-1 component target ID: ${targetId}`);
    }
    const lineTargetId = requireText(input.parentLineTargetIdByOrdinal[sourceOrdinal], `parentLineTargetId[${sourceOrdinal}]`);
    const lineOrdinal = getLfeaPreflightPhase1LineOrdinal(lineIndex, lineTargetId);
    if (lineOrdinal === null) {
      throw componentIndexError('E_P06_COMPONENT_PARENT_UNKNOWN', `Component ${targetId} references unknown line target ${lineTargetId}.`);
    }
    componentOrdinalById.set(targetId, -1);
    lineOrdinalBySource[sourceOrdinal] = lineOrdinal;
    countByLine[lineOrdinal] += 1;
    order[sourceOrdinal] = sourceOrdinal;
  }

  order.sort((leftSourceOrdinal, rightSourceOrdinal) => {
    const lineDifference = lineOrdinalBySource[leftSourceOrdinal] - lineOrdinalBySource[rightSourceOrdinal];
    if (lineDifference !== 0) return lineDifference;
    return compareAscii(
      input.targetIdByOrdinal[leftSourceOrdinal],
      input.targetIdByOrdinal[rightSourceOrdinal],
    );
  });

  const offsets = new Uint32Array(lineCount + 1);
  for (let lineOrdinal = 0; lineOrdinal < lineCount; lineOrdinal += 1) {
    offsets[lineOrdinal + 1] = offsets[lineOrdinal] + countByLine[lineOrdinal];
  }
  const targetIds = new Array(count);
  const parentLineTargetIds = new Array(count);
  const sourceOrdinals = new Uint32Array(count);
  for (let canonicalOrdinal = 0; canonicalOrdinal < count; canonicalOrdinal += 1) {
    const sourceOrdinal = order[canonicalOrdinal];
    const targetId = input.targetIdByOrdinal[sourceOrdinal];
    targetIds[canonicalOrdinal] = targetId;
    parentLineTargetIds[canonicalOrdinal] = input.parentLineTargetIdByOrdinal[sourceOrdinal];
    sourceOrdinals[canonicalOrdinal] = sourceOrdinal;
    componentOrdinalById.set(targetId, canonicalOrdinal);
  }

  const structuralHash = semanticHash({
    schema: LFEA_PREFLIGHT_PHASE1_COMPONENT_INDEX_SCHEMA,
    lineIndexStructuralHash: lineIndex.structuralHash,
    targetIds,
    parentLineTargetIds,
  });
  const store = Object.freeze({
    schema: LFEA_PREFLIGHT_PHASE1_COMPONENT_INDEX_SCHEMA,
    lineIndexStructuralHash: lineIndex.structuralHash,
    componentCount: count,
    lineCount,
    structuralHash,
  });
  COMPONENT_STATE.set(store, {
    componentOrdinalById,
    targetIds,
    sourceOrdinals,
    offsets,
  });
  return store;
}

export function getLfeaPreflightPhase1ComponentOrdinal(store, targetId) {
  const state = requireStore(store);
  const ordinal = state.componentOrdinalById.get(String(targetId));
  return ordinal === undefined ? null : ordinal;
}

export function getLfeaPreflightPhase1ComponentsForLine(store, lineIndex, lineTargetId, start, count) {
  const state = requireStore(store);
  if (store.lineIndexStructuralHash !== lineIndex.structuralHash) {
    throw componentIndexError('E_P06_COMPONENT_INDEX_PARENT_STALE', 'Phase-1 component index no longer matches the line index.');
  }
  const lineOrdinal = getLfeaPreflightPhase1LineOrdinal(lineIndex, lineTargetId);
  if (lineOrdinal === null) {
    throw componentIndexError('E_P06_TARGET_UNKNOWN', `Unknown Phase-1 line target: ${lineTargetId}`);
  }
  const safeStart = requireNonnegativeInteger(start, 'start');
  const safeCount = requireNonnegativeInteger(count, 'count');
  const begin = state.offsets[lineOrdinal];
  const end = state.offsets[lineOrdinal + 1];
  const from = Math.min(end, begin + safeStart);
  const to = Math.min(end, from + safeCount);
  const targetIds = Object.freeze(state.targetIds.slice(from, to));
  const sourceOrdinals = Object.freeze(Array.from(state.sourceOrdinals.slice(from, to)));
  return Object.freeze({
    lineTargetId: String(lineTargetId),
    totalComponentCount: end - begin,
    start: safeStart,
    count: targetIds.length,
    targetIds,
    sourceOrdinals,
    digest: semanticHash({ lineTargetId, targetIds }),
  });
}

export function getLfeaPreflightPhase1ComponentSourceOrdinal(store, targetId) {
  const state = requireStore(store);
  const ordinal = state.componentOrdinalById.get(String(targetId));
  return ordinal === undefined ? null : state.sourceOrdinals[ordinal];
}

function requireInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !Array.isArray(value.targetIdByOrdinal)
    || !Array.isArray(value.parentLineTargetIdByOrdinal)
    || value.targetIdByOrdinal.length !== value.parentLineTargetIdByOrdinal.length) {
    throw componentIndexError('E_P06_COMPONENT_INDEX_INPUT_INVALID', 'Phase-1 component identity input is invalid.');
  }
}

function requireNonnegativeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw componentIndexError('E_P06_VIEWPORT_RANGE', `${field} must be a non-negative safe integer.`);
  }
  return value;
}

function requireText(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw componentIndexError('E_P06_COMPONENT_IDENTITY_REQUIRED', `${field} must be a non-empty string.`);
  return text;
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requireStore(store) {
  const state = COMPONENT_STATE.get(store);
  if (!state) throw componentIndexError('E_P06_COMPONENT_INDEX_REQUIRED', 'A Phase-1 component index is required.');
  return state;
}

function componentIndexError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_PREFLIGHT_PHASE1_COMPONENT_INDEX';
  return error;
}
