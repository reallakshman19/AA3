import { recoverInputXmlAuthorizedRawCases } from '../core/linear-piping-analysis-consumer/inputxml-linear-production-recovery.js';
import { requireLinearPipingInputXmlPreFlight } from '../workspace/linear-piping-inputxml-prefea.js';

export const LFEA_NATIVE_RESULTS_CURRENTNESS = Object.freeze({
  NONE: 'NONE',
  CURRENT: 'CURRENT',
  STALE: 'STALE',
});

/** Own current/stale recovered Results separately from immutable recovery evidence. */
export function createLfeaNativeResultsAuthority(options = {}) {
  const recoverAuthorizedCases = options.recoverAuthorizedCases ?? recoverInputXmlAuthorizedRawCases;
  let state = emptyState();

  function recover(preFlightRecord, executionState) {
    const preFlight = requireLinearPipingInputXmlPreFlight(preFlightRecord);
    const raw = requireCurrentQualifiedExecution(executionState);
    const results = recoverAuthorizedCases({
      preparation: preFlight.preparation,
      rawExecutionBatch: raw,
    });
    state = Object.freeze({
      currentness: LFEA_NATIVE_RESULTS_CURRENTNESS.CURRENT,
      results,
      staleReasonCodes: Object.freeze([]),
      parent: parentIdentity(preFlight, raw),
    });
    return state;
  }

  function reconcile(preFlightRecord, executionState) {
    if (state.results === null) return state;
    const reasons = currentnessReasons(preFlightRecord, executionState, state.parent);
    state = reasons.length > 0
      ? staleState(state, reasons)
      : Object.freeze({ ...state, currentness: LFEA_NATIVE_RESULTS_CURRENTNESS.CURRENT, staleReasonCodes: Object.freeze([]) });
    return state;
  }

  function clearCurrentAuthority() {
    if (state.results === null) return state;
    state = staleState(state, ['CURRENT_RESULTS_AUTHORITY_CLEARED']);
    return state;
  }

  return Object.freeze({
    recover,
    reconcile,
    clearCurrentAuthority,
    getState: () => state,
    getCurrentResults: () => state.currentness === LFEA_NATIVE_RESULTS_CURRENTNESS.CURRENT
      ? state.results
      : null,
  });
}

function requireCurrentQualifiedExecution(executionState) {
  const raw = executionState?.execution ?? null;
  if (executionState?.currentness !== 'CURRENT' || raw === null) {
    throw resultsError('LFEA_NATIVE_RESULTS_CURRENT_EXECUTION_REQUIRED',
      'Governed Results require a CURRENT native raw execution.');
  }
  if (!['QUALIFIED', 'CONDITIONAL'].includes(raw.status)) {
    throw resultsError('LFEA_NATIVE_RESULTS_QUALIFIED_EXECUTION_REQUIRED',
      `Raw execution status ${raw.status ?? 'UNKNOWN'} cannot authorize Results recovery.`);
  }
  return raw;
}

function currentnessReasons(preFlightRecord, executionState, expected) {
  const reasons = [];
  if (executionState?.currentness !== 'CURRENT' || executionState?.execution === null) {
    reasons.push('RAW_EXECUTION_NO_LONGER_CURRENT');
    return reasons;
  }
  let preFlight;
  try { preFlight = requireLinearPipingInputXmlPreFlight(preFlightRecord); }
  catch { reasons.push('CURRENT_PREFLIGHT_INVALID'); return reasons; }
  const raw = executionState.execution;
  compare(reasons, 'PREFLIGHT_CHANGED', expected.preFlightSemanticHash, preFlight.semanticHash);
  compare(reasons, 'PREPARATION_CHANGED', expected.preparationSemanticHash, preFlight.preparation.semanticHash);
  compare(reasons, 'RAW_EXECUTION_CHANGED', expected.rawExecutionBatchSemanticHash, raw.semanticHash);
  compare(reasons, 'RAW_EXECUTION_BATCH_CHANGED', expected.rawExecutionBatchId, raw.executionBatchId);
  compare(reasons, 'MODEL_CHANGED', expected.modelSemanticHash, preFlight.preparation.modelSemanticHash);
  compare(reasons, 'LOAD_CHANGED', expected.loadStateHash, preFlight.preparation.loadStateHash);
  return reasons;
}

function parentIdentity(preFlight, raw) {
  return Object.freeze({
    preFlightSemanticHash: preFlight.semanticHash,
    preparationSemanticHash: preFlight.preparation.semanticHash,
    rawExecutionBatchId: raw.executionBatchId,
    rawExecutionBatchSemanticHash: raw.semanticHash,
    modelSemanticHash: preFlight.preparation.modelSemanticHash,
    loadStateHash: preFlight.preparation.loadStateHash,
  });
}

function emptyState() {
  return Object.freeze({
    currentness: LFEA_NATIVE_RESULTS_CURRENTNESS.NONE,
    results: null,
    staleReasonCodes: Object.freeze([]),
    parent: null,
  });
}

function staleState(previous, reasons) {
  return Object.freeze({
    currentness: LFEA_NATIVE_RESULTS_CURRENTNESS.STALE,
    results: previous.results,
    staleReasonCodes: Object.freeze([...new Set(reasons)].sort()),
    parent: previous.parent,
  });
}

function compare(reasons, code, expected, actual) {
  if (expected !== actual) reasons.push(code);
}

function resultsError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_NATIVE_RESULTS_AUTHORITY';
  return error;
}
