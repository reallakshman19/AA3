export const LFEA_ENGINEERING_SESSION_SCHEMA = 'lfea-engineering-session/v1';

export const LFEA_ENGINEERING_SOURCE_KINDS = Object.freeze({
  NONE: 'NONE',
  INPUTXML: 'INPUTXML',
  ACCDB: 'ACCDB',
  STAGED_JSON: 'STAGED_JSON',
});

export const LFEA_ENGINEERING_PREPARATION_OWNERS = Object.freeze({
  INPUTXML: 'INPUTXML',
  ACCDB: 'ACCDB',
});

const SOURCE_KINDS = new Set(Object.values(LFEA_ENGINEERING_SOURCE_KINDS));
const PREPARATION_OWNERS = new Set(Object.values(LFEA_ENGINEERING_PREPARATION_OWNERS));

/**
 * Presentation/session ownership for the LFEA pipeline.
 *
 * This store deliberately owns no parsing, pre-flight detection, engineering
 * disposition, solve authorization, execution currentness, solver mechanics,
 * or recovery. It retains references to the immutable records produced by
 * those existing authorities and answers only: which source does this UI
 * session mean, which exact pre-flight is current for it, and is a previously
 * displayed analysis still parented to that pre-flight?
 */
export function createLfeaEngineeringSession() {
  const listeners = new Set();
  let state = emptyState();

  function publish(next, event) {
    state = freezeState({ ...next, revision: state.revision + 1 });
    listeners.forEach((listener) => listener(state, event));
    return state;
  }

  function setSource(value) {
    const nextSource = requireSource(value);
    const nextPreparation = preparationFrom(value);
    const sourceChanged = !sameSource(state.source, nextSource);
    const preparationChanged = !samePreparation(state.preparation, nextPreparation);
    if (!sourceChanged && !preparationChanged) return state;

    const eventType = sourceChanged
      ? (state.source.kind === LFEA_ENGINEERING_SOURCE_KINDS.NONE ? 'SOURCE_LOADED' : 'SOURCE_REPLACED')
      : 'PREFLIGHT_CHANGED';
    return publish({
      ...state,
      source: nextSource,
      preparation: nextPreparation,
      analysis: emptyAnalysis(),
      lastInvalidationReason: eventType,
    }, Object.freeze({
      type: eventType,
      analysisInvalidated: state.analysis.result !== null,
      previousSourceKind: state.source.kind,
      sourceKind: nextSource.kind,
    }));
  }

  function refreshPreparation(value) {
    if (state.source.kind === LFEA_ENGINEERING_SOURCE_KINDS.NONE) {
      throw new TypeError('Cannot refresh LFEA preparation without an active source.');
    }
    const owner = requirePreparationOwner(value?.preparationOwner);
    if (owner !== state.source.preparationOwner) {
      throw new TypeError(`Preparation owner ${owner} does not own active source ${state.source.kind}.`);
    }
    const nextPreparation = preparationFrom({ ...value, preparationOwner: owner });
    if (samePreparation(state.preparation, nextPreparation)) return state;
    return publish({
      ...state,
      preparation: nextPreparation,
      analysis: emptyAnalysis(),
      lastInvalidationReason: 'PREFLIGHT_CHANGED',
    }, Object.freeze({
      type: 'PREFLIGHT_CHANGED',
      analysisInvalidated: state.analysis.result !== null,
      previousSourceKind: state.source.kind,
      sourceKind: state.source.kind,
    }));
  }

  function clearSource(preparationOwner) {
    const owner = requirePreparationOwner(preparationOwner);
    if (state.source.kind === LFEA_ENGINEERING_SOURCE_KINDS.NONE
      || state.source.preparationOwner !== owner) return state;
    return publish(emptyState(), Object.freeze({
      type: 'SOURCE_CLEARED',
      analysisInvalidated: state.analysis.result !== null,
      previousSourceKind: state.source.kind,
      sourceKind: LFEA_ENGINEERING_SOURCE_KINDS.NONE,
    }));
  }

  function bindAnalysisResult(result) {
    if (result === null || result === undefined) {
      throw new TypeError('A completed LFEA analysis result is required.');
    }
    if (state.preparation.preFlight === null) {
      throw new TypeError('Cannot bind an LFEA analysis result without a current pre-flight.');
    }
    const analysis = Object.freeze({
      result,
      parentPreFlightSemanticHash: state.preparation.preFlightSemanticHash,
    });
    return publish({
      ...state,
      analysis,
      lastInvalidationReason: null,
    }, Object.freeze({
      type: 'ANALYSIS_RESULT_BOUND',
      analysisInvalidated: false,
      previousSourceKind: state.source.kind,
      sourceKind: state.source.kind,
    }));
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('LFEA engineering-session subscriber must be a function.');
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return Object.freeze({
    getState: () => state,
    setSource,
    refreshPreparation,
    clearSource,
    bindAnalysisResult,
    subscribe,
    destroy: () => listeners.clear(),
  });
}

export function lfeaSessionPreFlight(state) {
  return state?.preparation?.preFlight ?? null;
}

export function lfeaSessionPreparationOwner(state) {
  return state?.source?.preparationOwner ?? null;
}

export function lfeaSessionSourceKind(state) {
  return state?.source?.kind ?? LFEA_ENGINEERING_SOURCE_KINDS.NONE;
}

function requireSource(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('LFEA engineering source is required.');
  }
  const kind = String(value.kind ?? '').trim().toUpperCase();
  if (!SOURCE_KINDS.has(kind) || kind === LFEA_ENGINEERING_SOURCE_KINDS.NONE) {
    throw new TypeError(`Unknown active LFEA source kind ${String(value.kind)}.`);
  }
  const identityKey = requireText(value.identityKey, 'source identityKey');
  const providerIdentityKey = requireText(value.providerIdentityKey ?? identityKey, 'providerIdentityKey');
  const preparationOwner = requirePreparationOwner(value.preparationOwner);
  const fileName = requireText(value.fileName, 'source fileName');
  return Object.freeze({
    kind,
    identityKey,
    providerIdentityKey,
    preparationOwner,
    fileName,
    provenance: freezeRecord(value.provenance),
  });
}

function preparationFrom(value) {
  const preFlight = value?.preFlight ?? null;
  const requestedProfileId = nullableText(value?.requestedProfileId);
  const requestedCaseIds = normalizeCaseIds(value?.requestedCaseIds ?? preFlight?.preparation?.requestedCaseIds ?? []);
  return Object.freeze({
    preparationOwner: value?.preparationOwner ?? null,
    preFlight,
    preFlightSemanticHash: nullableText(preFlight?.semanticHash),
    authorizationSemanticHash: nullableText(preFlight?.authorization?.semanticHash),
    requestedProfileId,
    requestedCaseIds,
  });
}

function sameSource(left, right) {
  return left.kind === right.kind
    && left.identityKey === right.identityKey
    && left.providerIdentityKey === right.providerIdentityKey
    && left.preparationOwner === right.preparationOwner
    && left.fileName === right.fileName;
}

function samePreparation(left, right) {
  return left.preparationOwner === right.preparationOwner
    && left.preFlight === right.preFlight
    && left.preFlightSemanticHash === right.preFlightSemanticHash
    && left.authorizationSemanticHash === right.authorizationSemanticHash
    && left.requestedProfileId === right.requestedProfileId
    && arraysEqual(left.requestedCaseIds, right.requestedCaseIds);
}

function emptyState() {
  return freezeState({
    schema: LFEA_ENGINEERING_SESSION_SCHEMA,
    revision: 0,
    source: Object.freeze({
      kind: LFEA_ENGINEERING_SOURCE_KINDS.NONE,
      identityKey: null,
      providerIdentityKey: null,
      preparationOwner: null,
      fileName: null,
      provenance: Object.freeze({}),
    }),
    preparation: Object.freeze({
      preparationOwner: null,
      preFlight: null,
      preFlightSemanticHash: null,
      authorizationSemanticHash: null,
      requestedProfileId: null,
      requestedCaseIds: Object.freeze([]),
    }),
    analysis: emptyAnalysis(),
    lastInvalidationReason: null,
  });
}

function emptyAnalysis() {
  return Object.freeze({ result: null, parentPreFlightSemanticHash: null });
}

function freezeState(value) {
  return Object.freeze({ ...value });
}

function freezeRecord(value) {
  if (value === undefined || value === null) return Object.freeze({});
  if (typeof value !== 'object' || Array.isArray(value)) throw new TypeError('LFEA source provenance must be an object.');
  return Object.freeze({ ...value });
}

function normalizeCaseIds(value) {
  if (!Array.isArray(value)) throw new TypeError('requestedCaseIds must be an array.');
  return Object.freeze([...new Set(value.map((id) => requireText(id, 'caseId')))].sort());
}

function requirePreparationOwner(value) {
  const owner = String(value ?? '').trim().toUpperCase();
  if (!PREPARATION_OWNERS.has(owner)) throw new TypeError(`Unknown LFEA preparation owner ${String(value)}.`);
  return owner;
}

function requireText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${label} is required.`);
  return text;
}

function nullableText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
