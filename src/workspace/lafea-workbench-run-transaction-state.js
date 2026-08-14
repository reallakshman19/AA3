/**
 * Orchestrator-owned run transaction custody for LAFEA.3.
 *
 * Transactions bind the exact source/domain/geometry/mesh/solver identities that
 * were current at run start. A superseded or parent-mismatched transaction is
 * rejected before its execution can become current engineering authority.
 */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_RUN_TRANSACTION_SCHEMA = 'lafea-run-transaction/v1';
export const LAFEA_RUN_TRANSACTION_RECEIPT_SCHEMA = 'lafea-run-transaction-receipt/v1';
export const LAFEA_RUN_TRANSACTION_STATUSES = Object.freeze([
  'RUNNING', 'COMPLETED', 'REJECTED', 'SUPERSEDED',
]);

const PARENT_KEYS = Object.freeze([
  'sourceHash',
  'analysisDomainHash',
  'analysisGeometryHash',
  'meshHash',
  'meshProfileHash',
  'solverModelHash',
]);

export function createLafeaWorkbenchRunTransactionState(stageIds) {
  const states = new Map(stageIds.map((stageId) => [stageId, {
    sequence: 0,
    completionSequence: 0,
    active: null,
    latestReceipt: null,
  }]));

  function begin(stageId, preflightValue) {
    const state = requireState(states, stageId);
    const preflight = requirePreflight(preflightValue, stageId);
    if (state.active) {
      state.latestReceipt = terminalReceipt(state, state.active, 'SUPERSEDED', {
        reasonCode: 'LAFEA_RUN_TRANSACTION_REPLACED_BY_NEWER_START',
        executionHash: null,
        runtimeDiagnosticsHash: null,
      });
    }
    state.sequence += 1;
    const parents = parentsFromPreflight(preflight);
    const solverConfigHash = solverConfigurationHash(preflight);
    const base = {
      schema: LAFEA_RUN_TRANSACTION_SCHEMA,
      stageId,
      startSequence: state.sequence,
      status: 'RUNNING',
      parents,
      solverConfigHash,
      preflightHash: preflight.semanticHash,
      executionRoute: 'DOMAIN_FIRST_COMPILED_SOLVER_MODEL',
      releaseQualified: false,
    };
    const transactionHash = canonicalLafeaSha256({
      schema: 'lafea-run-transaction-hash-input/v1',
      transaction: base,
    });
    state.active = freeze({
      ...base,
      transactionId: `LAFEA-TX-${String(state.sequence).padStart(6, '0')}-${transactionHash.slice(7, 19).toUpperCase()}`,
      transactionHash,
    });
    return state.active;
  }

  function complete(stageId, transactionId, stageValue, executionValue, runtimeDiagnosticsValue) {
    const state = requireState(states, stageId);
    const active = requireActive(state, transactionId);
    assertCurrentParents(active.parents, stageValue);
    const execution = requireExecution(executionValue, stageId);
    if (execution.sourceHash !== active.parents.sourceHash
      || execution.analysisDomainHash !== active.parents.analysisDomainHash
      || execution.analysisGeometryHash !== active.parents.analysisGeometryHash
      || execution.meshHash !== active.parents.meshHash
      || execution.meshProfileHash !== active.parents.meshProfileHash
      || execution.solverModelHash !== active.parents.solverModelHash) {
      state.latestReceipt = terminalReceipt(state, active, 'REJECTED', {
        reasonCode: 'LAFEA_RUN_TRANSACTION_EXECUTION_PARENT_MISMATCH',
        executionHash: execution.compiledExecutionHash ?? null,
        runtimeDiagnosticsHash: runtimeDiagnosticsValue?.semanticHash ?? null,
      });
      state.active = null;
      fail('LAFEA_RUN_TRANSACTION_EXECUTION_PARENT_MISMATCH');
    }
    const receipt = terminalReceipt(state, active, 'COMPLETED', {
      reasonCode: null,
      executionHash: execution.compiledExecutionHash,
      runtimeDiagnosticsHash: runtimeDiagnosticsValue?.semanticHash ?? null,
    });
    state.latestReceipt = receipt;
    state.active = null;
    return receipt;
  }

  function reject(stageId, transactionId, reasonCode, executionHash = null) {
    const state = requireState(states, stageId);
    if (!state.active) return state.latestReceipt;
    if (transactionId && state.active.transactionId !== transactionId) {
      fail('LAFEA_RUN_TRANSACTION_SUPERSEDED');
    }
    const receipt = terminalReceipt(state, state.active, 'REJECTED', {
      reasonCode: text(reasonCode) ?? 'LAFEA_RUN_TRANSACTION_REJECTED',
      executionHash,
      runtimeDiagnosticsHash: null,
    });
    state.latestReceipt = receipt;
    state.active = null;
    return receipt;
  }

  function invalidate(stageId, reasonCode = 'LAFEA_RUN_TRANSACTION_PARENT_INVALIDATED') {
    const state = requireState(states, stageId);
    if (!state.active) return state.latestReceipt;
    const receipt = terminalReceipt(state, state.active, 'SUPERSEDED', {
      reasonCode,
      executionHash: null,
      runtimeDiagnosticsHash: null,
    });
    state.latestReceipt = receipt;
    state.active = null;
    return receipt;
  }

  function fields(stageId) {
    const state = requireState(states, stageId);
    return freeze({
      activeRunTransaction: state.active,
      latestRunTransactionReceipt: state.latestReceipt,
    });
  }

  return Object.freeze({ begin, complete, reject, invalidate, fields });
}

export function solverConfigurationHash(preflightValue) {
  const preflight = requirePreflight(preflightValue, preflightValue?.stageId);
  return canonicalLafeaSha256({
    schema: 'lafea-solver-configuration-binding/v1',
    compilerId: preflight.compilerId,
    compilerRevision: preflight.compilerRevision,
    solverModelHash: preflight.solverModelHash,
    requestedCaseIds: [...preflight.requestedCaseIds],
  });
}

function terminalReceipt(state, transaction, status, details) {
  state.completionSequence += 1;
  const base = {
    schema: LAFEA_RUN_TRANSACTION_RECEIPT_SCHEMA,
    stageId: transaction.stageId,
    transactionId: transaction.transactionId,
    transactionHash: transaction.transactionHash,
    startSequence: transaction.startSequence,
    completionSequence: state.completionSequence,
    status,
    parents: transaction.parents,
    solverConfigHash: transaction.solverConfigHash,
    preflightHash: transaction.preflightHash,
    executionRoute: transaction.executionRoute,
    executionHash: details.executionHash,
    runtimeDiagnosticsHash: details.runtimeDiagnosticsHash,
    reasonCode: details.reasonCode,
    releaseQualified: false,
  };
  return freeze({
    ...base,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-run-transaction-receipt-hash-input/v1',
      receipt: base,
    }),
  });
}

function assertCurrentParents(expected, stage) {
  const current = parentsFromStage(stage);
  for (const key of PARENT_KEYS) {
    if (current[key] !== expected[key]) {
      fail(`LAFEA_RUN_TRANSACTION_PARENT_STALE:${key}`);
    }
  }
}

function parentsFromPreflight(value) {
  return freeze(Object.fromEntries(PARENT_KEYS.map((key) => [key, value[key]])));
}

function parentsFromStage(stage) {
  return freeze({
    sourceHash: stage?.sourceAuthority?.sourceHash ?? stage?.lifecycle?.source?.sourceHash ?? null,
    analysisDomainHash: stage?.analysisDomainProjection?.analysisDomainHash
      ?? stage?.retainedAnalysisDomain?.semanticHash
      ?? null,
    analysisGeometryHash: stage?.analysisGeometryProjection?.analysisGeometryHash
      ?? stage?.retainedAnalysisGeometryEvidence?.analysisGeometryHash
      ?? null,
    meshHash: stage?.analysisMeshCustodyProjection?.meshHash ?? null,
    meshProfileHash: stage?.retainedAnalysisMeshEvidenceV2?.meshProfileHash
      ?? stage?.retainedAnalysisMeshProfile?.semanticHash
      ?? null,
    solverModelHash: stage?.retainedContinuumPreflightEvidence?.solverModelHash ?? null,
  });
}

function requirePreflight(value, stageId) {
  if (!value || typeof value !== 'object' || value.stageId !== stageId
    || value.status !== 'PASS' || value.executionAuthorized !== true
    || typeof value.semanticHash !== 'string') {
    fail('LAFEA_RUN_TRANSACTION_PREFLIGHT_INVALID');
  }
  for (const key of PARENT_KEYS) {
    if (typeof value[key] !== 'string' || !value[key]) {
      fail(`LAFEA_RUN_TRANSACTION_PREFLIGHT_PARENT_INVALID:${key}`);
    }
  }
  return value;
}

function requireExecution(value, stageId) {
  if (!value || typeof value !== 'object' || value.stageId !== stageId
    || !['QUALIFIED', 'FAILED'].includes(value.status)) {
    fail('LAFEA_RUN_TRANSACTION_EXECUTION_INVALID');
  }
  return value;
}

function requireActive(state, transactionId) {
  if (!state.active) fail('LAFEA_RUN_TRANSACTION_NOT_ACTIVE');
  if (state.active.transactionId !== transactionId) fail('LAFEA_RUN_TRANSACTION_SUPERSEDED');
  return state.active;
}

function requireState(states, stageId) {
  const state = states.get(stageId);
  if (!state) fail('LAFEA_RUN_TRANSACTION_STAGE_NOT_FOUND');
  return state;
}

function text(value) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
