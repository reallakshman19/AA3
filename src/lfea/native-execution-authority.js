import { solveInputXmlLinearAnalysis } from '../core/linear-piping-analysis-consumer/inputxml-linear-governed-solve.js';
import { executeInputXmlAuthorizedRawCases } from '../core/linear-piping-analysis-consumer/inputxml-linear-production-executor.js';
import { requireLinearPipingInputXmlPreFlight } from '../workspace/linear-piping-inputxml-prefea.js';

export const LFEA_NATIVE_EXECUTION_CURRENTNESS = Object.freeze({
  NONE: 'NONE',
  CURRENT: 'CURRENT',
  STALE: 'STALE',
});

/**
 * Own current/stale application state separately from immutable solver evidence.
 * Historic retention/ledger semantics are deliberately out of scope here.
 */
export function createLfeaNativeExecutionAuthority() {
  let state = emptyState();

  function run(preFlightRecord, options = {}) {
    const preFlight = requireLinearPipingInputXmlPreFlight(preFlightRecord);
    if (!preFlight.solveAuthorized || preFlight.authorization === null) {
      throw authorityError(
        'LFEA_NATIVE_EXECUTION_AUTHORIZATION_REQUIRED',
        'A sealed current native InputXML solve authorization is required before execution.',
      );
    }
    const requestedCaseIds = normalizeRequestedCases(
      options.requestedCaseIds ?? preFlight.authorization.authorizedPhysicalCaseIds,
    );
    const execution = solveInputXmlLinearAnalysis(
      preFlight.preparation,
      preFlight.authorization,
      {
        requestedCaseIds,
        executeAuthorizedCases: executeInputXmlAuthorizedRawCases,
      },
    );
    state = Object.freeze({
      currentness: LFEA_NATIVE_EXECUTION_CURRENTNESS.CURRENT,
      execution,
      staleReasonCodes: Object.freeze([]),
      parent: parentIdentity(preFlight),
    });
    return state;
  }

  function reconcile(preFlightRecord) {
    if (state.execution === null) return state;
    if (preFlightRecord === null || preFlightRecord === undefined) {
      state = staleState(state, ['SOURCE_OR_PREFLIGHT_CLEARED']);
      return state;
    }

    let preFlight;
    try {
      preFlight = requireLinearPipingInputXmlPreFlight(preFlightRecord);
    } catch {
      state = staleState(state, ['CURRENT_PREFLIGHT_INVALID']);
      return state;
    }
    const expected = state.parent;
    const current = parentIdentity(preFlight);
    const reasons = [];
    compare(reasons, 'PREFLIGHT_CHANGED', expected.preFlightSemanticHash, current.preFlightSemanticHash);
    compare(reasons, 'PREPARATION_CHANGED', expected.preparationSemanticHash, current.preparationSemanticHash);
    compare(reasons, 'AUTHORIZATION_CHANGED', expected.authorizationSemanticHash, current.authorizationSemanticHash);
    compare(reasons, 'SOURCE_CHANGED', expected.sourceBundleSemanticHash, current.sourceBundleSemanticHash);
    compare(reasons, 'MODEL_CHANGED', expected.modelSemanticHash, current.modelSemanticHash);
    compare(reasons, 'STIFFNESS_CHANGED', expected.stiffnessStateHash, current.stiffnessStateHash);
    compare(reasons, 'LOAD_CHANGED', expected.loadStateHash, current.loadStateHash);
    compare(reasons, 'PROFILE_CHANGED', expected.requestedProfileId, current.requestedProfileId);

    if (!preFlight.solveAuthorized || preFlight.authorization === null) {
      reasons.push('AUTHORIZATION_NO_LONGER_CURRENT');
    } else {
      const allowed = new Set(preFlight.authorization.authorizedPhysicalCaseIds);
      if (state.execution.requestedCaseIds.some((caseId) => !allowed.has(caseId))) {
        reasons.push('EXECUTED_CASE_NO_LONGER_AUTHORIZED');
      }
    }

    state = reasons.length > 0
      ? staleState(state, reasons)
      : Object.freeze({
        currentness: LFEA_NATIVE_EXECUTION_CURRENTNESS.CURRENT,
        execution: state.execution,
        staleReasonCodes: Object.freeze([]),
        parent: state.parent,
      });
    return state;
  }

  function clearCurrentAuthority() {
    if (state.execution === null) return state;
    state = staleState(state, ['CURRENT_AUTHORITY_CLEARED']);
    return state;
  }

  return Object.freeze({
    run,
    reconcile,
    clearCurrentAuthority,
    getState: () => state,
    getCurrentExecution: () => state.currentness === LFEA_NATIVE_EXECUTION_CURRENTNESS.CURRENT
      ? state.execution
      : null,
    getCurrentQualifiedExecution: () => state.currentness === LFEA_NATIVE_EXECUTION_CURRENTNESS.CURRENT
      && ['QUALIFIED', 'CONDITIONAL'].includes(state.execution?.status)
      ? state.execution
      : null,
  });
}

function emptyState() {
  return Object.freeze({
    currentness: LFEA_NATIVE_EXECUTION_CURRENTNESS.NONE,
    execution: null,
    staleReasonCodes: Object.freeze([]),
    parent: null,
  });
}

function staleState(previous, reasons) {
  return Object.freeze({
    currentness: LFEA_NATIVE_EXECUTION_CURRENTNESS.STALE,
    execution: previous.execution,
    staleReasonCodes: Object.freeze([...new Set(reasons)].sort(compareAscii)),
    parent: previous.parent,
  });
}

function parentIdentity(preFlight) {
  return Object.freeze({
    preFlightSemanticHash: preFlight.semanticHash,
    preparationSemanticHash: preFlight.preparation.semanticHash,
    authorizationSemanticHash: preFlight.authorization?.semanticHash ?? null,
    sourceBundleSemanticHash: preFlight.preparation.sourceBundleSemanticHash,
    modelSemanticHash: preFlight.preparation.modelSemanticHash,
    stiffnessStateHash: preFlight.preparation.stiffnessStateHash,
    loadStateHash: preFlight.preparation.loadStateHash,
    requestedProfileId: preFlight.preparation.requestedProfileId,
  });
}

function normalizeRequestedCases(value) {
  if (!Array.isArray(value) || value.length === 0
    || value.some((caseId) => typeof caseId !== 'string' || caseId.trim() === '')) {
    throw authorityError(
      'LFEA_NATIVE_EXECUTION_CASE_SET_INVALID',
      'Native execution requires a non-empty requested physical-case set.',
    );
  }
  return Object.freeze([...new Set(value.map((caseId) => caseId.trim()))].sort(compareAscii));
}

function compare(reasons, code, expected, actual) {
  if (expected !== actual) reasons.push(code);
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function authorityError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_NATIVE_EXECUTION_AUTHORITY';
  return error;
}
