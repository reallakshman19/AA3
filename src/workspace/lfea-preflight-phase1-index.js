import {
  hashBytes,
  semanticHash,
} from '../core/shared-piping-model/canonical-json.js';
import {
  LFEA_PREFLIGHT_ENGINEERING_FIELDS,
  LFEA_PREFLIGHT_EXCEPTION_QUEUE,
  LFEA_PREFLIGHT_FACET_MODE,
  LFEA_PREFLIGHT_FIELD_STATUS,
  LFEA_PREFLIGHT_PHASE1_SCHEMA,
  requireLfeaPreflightFieldStatus,
} from './lfea-preflight-phase1-schema.js';
import {
  andPhase1Bitsets,
  clonePhase1Bitset,
  countPhase1Bits,
  createPhase1Bitset,
  orPhase1Bitsets,
  phase1BitsetOrdinals,
  setPhase1Bit,
} from './lfea-preflight-phase1-bitset.js';

export const LFEA_PREFLIGHT_PHASE1_SNAPSHOT_SCHEMA = 'lfea-preflight-phase1-index-snapshot/v1';
export const LFEA_PREFLIGHT_PHASE1_INDEX_SCHEMA = 'lfea-preflight-phase1-index/v1';

const STORE_STATE = new WeakMap();
const FACET_IDS = Object.freeze(['service', 'rating', 'pipingClass', 'readiness']);
const QUEUE_IDS = Object.freeze(Object.values(LFEA_PREFLIGHT_EXCEPTION_QUEUE));

/** Stable target identity derived only from retained source identity/provenance. */
export function createLfeaPreflightPhase1TargetId({
  sourceModelId,
  sourceEntityId,
  targetKind,
  provenancePath,
}) {
  const identity = {
    sourceModelId: requireText(sourceModelId, 'sourceModelId'),
    sourceEntityId: requireText(sourceEntityId, 'sourceEntityId'),
    targetKind: requireText(targetKind, 'targetKind').toUpperCase(),
    provenancePath: requireText(provenancePath, 'provenancePath'),
  };
  return `P1-${identity.targetKind}-${semanticHash(identity).slice('fnv1a64:'.length).toUpperCase()}`;
}

/**
 * Build one caller-immutable line index. Typed arrays, Maps and bitsets live in
 * a WeakMap and are never exposed; public queries return frozen value DTOs.
 */
export function buildLfeaPreflightPhase1Index(snapshot) {
  validateSnapshot(snapshot);
  const lineCount = snapshot.lines.targetIdByOrdinal.length;
  const sourceOrder = [...Array(lineCount).keys()];
  sourceOrder.sort((left, right) => compareAscii(
    snapshot.lines.targetIdByOrdinal[left],
    snapshot.lines.targetIdByOrdinal[right],
  ));

  const sourceToCanonical = new Uint32Array(lineCount);
  const targetIds = new Array(lineCount);
  const normalizedKeys = new Array(lineCount);
  const services = new Array(lineCount);
  const ratings = new Array(lineCount);
  const pipingClasses = new Array(lineCount);
  const readiness = new Array(lineCount);
  const targetOrdinalById = new Map();
  const keyBuckets = new Map();
  const queueBitsets = new Map(QUEUE_IDS.map((queueId) => [queueId, createPhase1Bitset(lineCount)]));
  const facetBitsets = new Map(FACET_IDS.map((facetId) => [facetId, new Map()]));

  for (let canonicalOrdinal = 0; canonicalOrdinal < lineCount; canonicalOrdinal += 1) {
    const sourceOrdinal = sourceOrder[canonicalOrdinal];
    sourceToCanonical[sourceOrdinal] = canonicalOrdinal;
    const targetId = requireText(snapshot.lines.targetIdByOrdinal[sourceOrdinal], `targetId[${sourceOrdinal}]`);
    if (targetOrdinalById.has(targetId)) {
      throw phase1IndexError('E_P06_DUPLICATE_TARGET_ID', `Duplicate Phase-1 target ID: ${targetId}`);
    }
    targetOrdinalById.set(targetId, canonicalOrdinal);
    targetIds[canonicalOrdinal] = targetId;
    normalizedKeys[canonicalOrdinal] = normalizeLineKey(snapshot.lines.normalizedKeyByOrdinal[sourceOrdinal]);
    services[canonicalOrdinal] = facetValue(snapshot.lines.serviceByOrdinal[sourceOrdinal]);
    ratings[canonicalOrdinal] = facetValue(snapshot.lines.ratingByOrdinal[sourceOrdinal]);
    pipingClasses[canonicalOrdinal] = facetValue(snapshot.lines.classByOrdinal[sourceOrdinal]);

    appendBucket(keyBuckets, normalizedKeys[canonicalOrdinal], canonicalOrdinal);
    setFacet(facetBitsets.get('service'), services[canonicalOrdinal], canonicalOrdinal, lineCount);
    setFacet(facetBitsets.get('rating'), ratings[canonicalOrdinal], canonicalOrdinal, lineCount);
    setFacet(facetBitsets.get('pipingClass'), pipingClasses[canonicalOrdinal], canonicalOrdinal, lineCount);

    const statusSummary = summarizeStatuses(snapshot, sourceOrdinal);
    readiness[canonicalOrdinal] = statusSummary.readiness;
    setFacet(facetBitsets.get('readiness'), statusSummary.readiness, canonicalOrdinal, lineCount);
    for (const queueId of statusSummary.queues) setPhase1Bit(queueBitsets.get(queueId), canonicalOrdinal);
  }

  // A duplicate normalized key is a first-class ambiguity queue condition, but
  // the duplicate-preserving bucket remains available for diagnosis.
  for (const ordinals of keyBuckets.values()) {
    if (ordinals.length < 2) continue;
    for (const ordinal of ordinals) setPhase1Bit(queueBitsets.get(LFEA_PREFLIGHT_EXCEPTION_QUEUE.AMBIGUOUS), ordinal);
  }

  for (const targetId of snapshot.deferredTargetIds ?? []) {
    const ordinal = targetOrdinalById.get(String(targetId));
    if (ordinal === undefined) {
      throw phase1IndexError('E_P06_DEFERRED_TARGET_UNKNOWN', `Deferred target is not indexed: ${targetId}`);
    }
    setPhase1Bit(queueBitsets.get(LFEA_PREFLIGHT_EXCEPTION_QUEUE.DEFERRED), ordinal);
  }

  const componentAdjacency = buildComponentAdjacency(snapshot.components, sourceToCanonical, lineCount);
  const frozenBuckets = new Map();
  for (const [key, ordinals] of keyBuckets) frozenBuckets.set(key, new Uint32Array(ordinals));

  const queueCounts = Object.freeze(Object.fromEntries(QUEUE_IDS.map((queueId) => [
    queueId,
    countPhase1Bits(queueBitsets.get(queueId), lineCount),
  ])));
  const facetValues = Object.freeze(Object.fromEntries(FACET_IDS.map((facetId) => [
    facetId,
    Object.freeze([...facetBitsets.get(facetId).keys()].sort(compareAscii)),
  ])));
  const componentCountsByLine = componentAdjacency.offsets.slice(1).map(
    (end, index) => end - componentAdjacency.offsets[index],
  );

  const structuralHash = semanticHash({
    schema: LFEA_PREFLIGHT_PHASE1_INDEX_SCHEMA,
    datasetIdentity: snapshot.datasetIdentity,
    targetIds,
    normalizedKeys,
    services,
    ratings,
    pipingClasses,
    readiness,
    keyBuckets: hashBucketMap(frozenBuckets),
    queues: hashBitsetMap(queueBitsets),
    facets: hashFacetMap(facetBitsets),
    componentCount: snapshot.components.count,
    componentCountsByLineHash: typedArrayHash(componentCountsByLine),
  });

  const store = Object.freeze({
    schema: LFEA_PREFLIGHT_PHASE1_INDEX_SCHEMA,
    phaseSchema: LFEA_PREFLIGHT_PHASE1_SCHEMA,
    datasetIdentity: snapshot.datasetIdentity,
    targetCount: lineCount,
    componentCount: snapshot.components.count,
    targetIds: Object.freeze([...targetIds]),
    queueIds: QUEUE_IDS,
    queueCounts,
    facetIds: FACET_IDS,
    facetValues,
    structuralHash,
  });
  STORE_STATE.set(store, {
    targetOrdinalById,
    targetIds,
    normalizedKeys,
    services,
    ratings,
    pipingClasses,
    readiness,
    keyBuckets: frozenBuckets,
    queueBitsets,
    facetBitsets,
    componentAdjacency,
  });
  return store;
}

export function lookupLfeaPreflightPhase1NormalizedKey(store, value) {
  const state = requireStore(store);
  const key = normalizeLineKey(value);
  const ordinals = state.keyBuckets.get(key) ?? new Uint32Array(0);
  const targetIds = Object.freeze(Array.from(ordinals, (ordinal) => state.targetIds[ordinal]));
  return Object.freeze({
    normalizedKey: key,
    status: targetIds.length === 0
      ? 'NO_MATCH'
      : targetIds.length === 1 ? 'EXACT_ONE' : 'BLOCKED_AMBIGUOUS',
    selectedTargetId: targetIds.length === 1 ? targetIds[0] : null,
    candidateTargetIds: targetIds,
  });
}

/** Query indexed facets/queues with explicit intra-clause and inter-clause semantics. */
export function queryLfeaPreflightPhase1Index(store, filter = {}) {
  const state = requireStore(store);
  const bitset = filterBitset(store, state, filter);
  const ordinals = phase1BitsetOrdinals(bitset, store.targetCount);
  const targetIds = Object.freeze(ordinals.map((ordinal) => state.targetIds[ordinal]));
  return Object.freeze({
    combine: normalizeMode(filter.combine ?? LFEA_PREFLIGHT_FACET_MODE.AND),
    clauses: Object.freeze((filter.clauses ?? []).map(freezeClause)),
    count: targetIds.length,
    ordinals,
    targetIds,
    digest: semanticHash({ targetIds }),
  });
}

/** Complete-index facet counts, optionally scoped by another indexed filter. */
export function countLfeaPreflightPhase1Facet(store, facetId, filter = {}) {
  const state = requireStore(store);
  const facet = state.facetBitsets.get(String(facetId));
  if (!facet) throw phase1IndexError('E_P06_FACET_UNKNOWN', `Unknown Phase-1 facet: ${facetId}`);
  const base = filterBitset(store, state, filter);
  const counts = {};
  for (const value of [...facet.keys()].sort(compareAscii)) {
    counts[value] = countPhase1Bits(andPhase1Bitsets(base, facet.get(value)), store.targetCount);
  }
  return Object.freeze(counts);
}

export function getLfeaPreflightPhase1Queue(store, queueId) {
  const state = requireStore(store);
  const id = requireQueueId(queueId);
  const ordinals = phase1BitsetOrdinals(state.queueBitsets.get(id), store.targetCount);
  return Object.freeze({
    queueId: id,
    count: ordinals.length,
    ordinals,
    targetIds: Object.freeze(ordinals.map((ordinal) => state.targetIds[ordinal])),
    digest: semanticHash({ queueId: id, ordinals }),
  });
}

export function getLfeaPreflightPhase1LineOrdinal(store, targetId) {
  const state = requireStore(store);
  const ordinal = state.targetOrdinalById.get(String(targetId));
  return ordinal === undefined ? null : ordinal;
}

/** Component descendants remain compressed until an explicit bounded viewport asks for ordinals. */
export function getLfeaPreflightPhase1ComponentViewport(store, lineTargetId, start, count) {
  const state = requireStore(store);
  const lineOrdinal = state.targetOrdinalById.get(String(lineTargetId));
  if (lineOrdinal === undefined) {
    throw phase1IndexError('E_P06_TARGET_UNKNOWN', `Unknown Phase-1 line target: ${lineTargetId}`);
  }
  const safeStart = requireNonnegativeInteger(start, 'start');
  const safeCount = requireNonnegativeInteger(count, 'count');
  const begin = state.componentAdjacency.offsets[lineOrdinal];
  const end = state.componentAdjacency.offsets[lineOrdinal + 1];
  const from = Math.min(end, begin + safeStart);
  const to = Math.min(end, from + safeCount);
  const ordinals = Object.freeze(Array.from(state.componentAdjacency.componentOrdinals.slice(from, to)));
  return Object.freeze({
    lineTargetId: String(lineTargetId),
    totalComponentCount: end - begin,
    start: safeStart,
    count: ordinals.length,
    componentOrdinals: ordinals,
  });
}

function filterBitset(store, state, filter) {
  const clauses = Array.isArray(filter.clauses) ? filter.clauses : [];
  if (clauses.length === 0) return createPhase1Bitset(store.targetCount, true);
  const clauseBitsets = clauses.map((clause) => clauseBitset(store, state, clause));
  const combine = normalizeMode(filter.combine ?? LFEA_PREFLIGHT_FACET_MODE.AND);
  return combine === LFEA_PREFLIGHT_FACET_MODE.OR
    ? orPhase1Bitsets(clauseBitsets, Math.ceil(store.targetCount / 32))
    : clauseBitsets.reduce((left, right) => andPhase1Bitsets(left, right));
}

function clauseBitset(store, state, clause) {
  if (!clause || typeof clause !== 'object' || Array.isArray(clause)) {
    throw phase1IndexError('E_P06_FILTER_CLAUSE_INVALID', 'Phase-1 filter clause must be a record.');
  }
  const values = Array.isArray(clause.values) ? clause.values.map(facetValue) : [];
  if (values.length === 0) return createPhase1Bitset(store.targetCount, true);
  const mode = normalizeMode(clause.mode ?? LFEA_PREFLIGHT_FACET_MODE.OR);
  let source;
  if (clause.facetId !== undefined) {
    source = state.facetBitsets.get(String(clause.facetId));
    if (!source) throw phase1IndexError('E_P06_FACET_UNKNOWN', `Unknown Phase-1 facet: ${clause.facetId}`);
  } else if (clause.queueId !== undefined) {
    const queueId = requireQueueId(clause.queueId);
    source = new Map([[queueId, state.queueBitsets.get(queueId)]]);
  } else {
    throw phase1IndexError('E_P06_FILTER_CLAUSE_INVALID', 'Phase-1 clause requires facetId or queueId.');
  }
  const selected = values.map((value) => source.get(value)).filter(Boolean);
  if (selected.length === 0) return createPhase1Bitset(store.targetCount);
  if (mode === LFEA_PREFLIGHT_FACET_MODE.OR) {
    return orPhase1Bitsets(selected, Math.ceil(store.targetCount / 32));
  }
  return selected.reduce((left, right) => andPhase1Bitsets(left, right));
}

function buildComponentAdjacency(components, sourceToCanonical, lineCount) {
  const offsets = new Uint32Array(lineCount + 1);
  for (let componentOrdinal = 0; componentOrdinal < components.count; componentOrdinal += 1) {
    const sourceLineOrdinal = components.parentLineOrdinal[componentOrdinal];
    if (sourceLineOrdinal >= lineCount) {
      throw phase1IndexError('E_P06_COMPONENT_PARENT_INVALID', `Component ${componentOrdinal} has an invalid parent line ordinal.`);
    }
    offsets[sourceToCanonical[sourceLineOrdinal] + 1] += 1;
  }
  for (let index = 1; index < offsets.length; index += 1) offsets[index] += offsets[index - 1];
  const componentOrdinals = new Uint32Array(components.count);
  const cursor = offsets.slice(0, lineCount);
  for (let componentOrdinal = 0; componentOrdinal < components.count; componentOrdinal += 1) {
    const canonicalLineOrdinal = sourceToCanonical[components.parentLineOrdinal[componentOrdinal]];
    componentOrdinals[cursor[canonicalLineOrdinal]] = componentOrdinal;
    cursor[canonicalLineOrdinal] += 1;
  }
  return { offsets, componentOrdinals };
}

function summarizeStatuses(snapshot, sourceOrdinal) {
  const queues = new Set();
  let dominant = LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT;
  for (const fieldId of LFEA_PREFLIGHT_ENGINEERING_FIELDS) {
    const status = requireLfeaPreflightFieldStatus(snapshot.lines.engineeringStatusByField[fieldId][sourceOrdinal]);
    if (status === LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING) queues.add(LFEA_PREFLIGHT_EXCEPTION_QUEUE.MISSING);
    if (status === LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_AMBIGUOUS) queues.add(LFEA_PREFLIGHT_EXCEPTION_QUEUE.AMBIGUOUS);
    if (status === LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_CONFLICT) queues.add(LFEA_PREFLIGHT_EXCEPTION_QUEUE.CONFLICTING);
    if (status === LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_STALE_SOURCE) queues.add(LFEA_PREFLIGHT_EXCEPTION_QUEUE.STALE);
    if (status === LFEA_PREFLIGHT_FIELD_STATUS.PROPOSED_REVIEW) queues.add(LFEA_PREFLIGHT_EXCEPTION_QUEUE.PROPOSED);
    dominant = dominantStatus(dominant, status);
  }
  return { readiness: statusName(dominant), queues };
}

function dominantStatus(left, right) {
  const priority = new Map([
    [LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_CONFLICT, 80],
    [LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_AMBIGUOUS, 70],
    [LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING, 60],
    [LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_STALE_SOURCE, 50],
    [LFEA_PREFLIGHT_FIELD_STATUS.PROPOSED_REVIEW, 40],
    [LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_DERIVED, 30],
    [LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT, 20],
    [LFEA_PREFLIGHT_FIELD_STATUS.NOT_APPLICABLE, 10],
  ]);
  return priority.get(right) > priority.get(left) ? right : left;
}

function statusName(status) {
  for (const [name, value] of Object.entries(LFEA_PREFLIGHT_FIELD_STATUS)) {
    if (value === status) return name;
  }
  throw phase1IndexError('E_P06_FIELD_STATUS_INVALID', `Unknown Phase-1 status: ${status}`);
}

function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)
    || snapshot.schema !== LFEA_PREFLIGHT_PHASE1_SNAPSHOT_SCHEMA) {
    throw phase1IndexError('E_P06_SNAPSHOT_SCHEMA', 'Phase-1 index snapshot schema is invalid.');
  }
  requireText(snapshot.datasetIdentity, 'datasetIdentity');
  const lines = snapshot.lines;
  if (!lines || typeof lines !== 'object' || Array.isArray(lines)) {
    throw phase1IndexError('E_P06_SNAPSHOT_SCHEMA', 'Phase-1 line snapshot is required.');
  }
  const lineCount = lines.targetIdByOrdinal?.length;
  if (!Number.isSafeInteger(lineCount) || lineCount < 0) {
    throw phase1IndexError('E_P06_SNAPSHOT_SCHEMA', 'Phase-1 targetIdByOrdinal is invalid.');
  }
  for (const [field, values] of [
    ['normalizedKeyByOrdinal', lines.normalizedKeyByOrdinal],
    ['serviceByOrdinal', lines.serviceByOrdinal],
    ['ratingByOrdinal', lines.ratingByOrdinal],
    ['classByOrdinal', lines.classByOrdinal],
  ]) {
    if (!values || values.length !== lineCount) {
      throw phase1IndexError('E_P06_SNAPSHOT_SCHEMA', `Phase-1 ${field} length is invalid.`);
    }
  }
  if (!lines.engineeringStatusByField || typeof lines.engineeringStatusByField !== 'object') {
    throw phase1IndexError('E_P06_SNAPSHOT_SCHEMA', 'Phase-1 engineering status columns are required.');
  }
  for (const fieldId of LFEA_PREFLIGHT_ENGINEERING_FIELDS) {
    const statuses = lines.engineeringStatusByField[fieldId];
    if (!statuses || statuses.length !== lineCount) {
      throw phase1IndexError('E_P06_SNAPSHOT_SCHEMA', `Phase-1 status column is invalid: ${fieldId}`);
    }
  }
  if (!snapshot.components || !Number.isSafeInteger(snapshot.components.count)
    || snapshot.components.count < 0
    || !(snapshot.components.parentLineOrdinal instanceof Uint32Array)
    || snapshot.components.parentLineOrdinal.length !== snapshot.components.count) {
    throw phase1IndexError('E_P06_SNAPSHOT_SCHEMA', 'Phase-1 component adjacency snapshot is invalid.');
  }
}

function setFacet(map, value, ordinal, size) {
  let bitset = map.get(value);
  if (!bitset) {
    bitset = createPhase1Bitset(size);
    map.set(value, bitset);
  }
  setPhase1Bit(bitset, ordinal);
}

function appendBucket(map, key, ordinal) {
  let values = map.get(key);
  if (!values) {
    values = [];
    map.set(key, values);
  }
  values.push(ordinal);
}

function hashBucketMap(map) {
  return [...map.entries()].sort(([left], [right]) => compareAscii(left, right)).map(([key, values]) => [
    key,
    typedArrayHash(values),
  ]);
}

function hashBitsetMap(map) {
  return [...map.entries()].sort(([left], [right]) => compareAscii(left, right)).map(([key, values]) => [
    key,
    typedArrayHash(values),
  ]);
}

function hashFacetMap(facets) {
  return [...facets.entries()].sort(([left], [right]) => compareAscii(left, right)).map(([facetId, values]) => [
    facetId,
    [...values.entries()].sort(([left], [right]) => compareAscii(left, right)).map(([value, bitset]) => [
      value,
      typedArrayHash(bitset),
    ]),
  ]);
}

function typedArrayHash(value) {
  const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return hashBytes(bytes);
}

function freezeClause(clause) {
  return Object.freeze({
    facetId: clause.facetId === undefined ? undefined : String(clause.facetId),
    queueId: clause.queueId === undefined ? undefined : String(clause.queueId),
    mode: normalizeMode(clause.mode ?? LFEA_PREFLIGHT_FACET_MODE.OR),
    values: Object.freeze((clause.values ?? []).map(facetValue)),
  });
}

function normalizeMode(value) {
  const mode = String(value).toUpperCase();
  if (!Object.values(LFEA_PREFLIGHT_FACET_MODE).includes(mode)) {
    throw phase1IndexError('E_P06_FACET_MODE_INVALID', `Unknown Phase-1 facet mode: ${value}`);
  }
  return mode;
}

function requireQueueId(value) {
  const queueId = String(value).toUpperCase();
  if (!QUEUE_IDS.includes(queueId)) {
    throw phase1IndexError('E_P06_QUEUE_UNKNOWN', `Unknown Phase-1 queue: ${value}`);
  }
  return queueId;
}

function normalizeLineKey(value) {
  return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/gu, '');
}

function facetValue(value) {
  return String(value ?? '').trim() || 'UNSPECIFIED';
}

function requireText(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw phase1IndexError('E_P06_IDENTITY_REQUIRED', `${field} must be a non-empty string.`);
  return text;
}

function requireNonnegativeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw phase1IndexError('E_P06_VIEWPORT_RANGE', `${field} must be a non-negative safe integer.`);
  }
  return value;
}

function compareAscii(left, right) {
  const a = String(left);
  const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

function requireStore(store) {
  const state = STORE_STATE.get(store);
  if (!state) throw phase1IndexError('E_P06_INDEX_REQUIRED', 'A Phase-1 indexed review store is required.');
  return state;
}

function phase1IndexError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_PREFLIGHT_PHASE1_INDEX';
  return error;
}
