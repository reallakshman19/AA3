/** Orchestrator-owned authoritative execution state for domain-first workbench routes. */
export const LAFEA_DOMAIN_FIRST_EXECUTION_STATE_SCHEMA =
  'lafea-domain-first-workbench-execution/v1';

export function createLafeaWorkbenchDomainFirstExecutionState(stageIds) {
  const states = Object.fromEntries(stageIds.map((stageId) => [stageId, {
    execution: null,
    latestRunTransactionReceipt: null,
  }]));

  function retain(stageId, value) {
    const state = requireStage(stageId);
    if (!value || value.stageId !== stageId
      || !['RUNNING', 'QUALIFIED', 'FAILED'].includes(value.status)
      || value.schema !== LAFEA_DOMAIN_FIRST_EXECUTION_STATE_SCHEMA
      || (value.status === 'RUNNING' && value.runTransaction?.status !== 'RUNNING')) {
      fail('LAFEA_DOMAIN_FIRST_EXECUTION_STATE_INVALID');
    }
    retainRunTransactionReceiptValue(state, state.execution?.runTransactionReceipt);
    retainRunTransactionReceiptValue(state, value.runTransactionReceipt);
    state.execution = freeze(structuredClone(value));
    return state.execution;
  }

  function retainRunTransactionReceipt(stageId, receipt) {
    const state = requireStage(stageId);
    retainRunTransactionReceiptValue(state, receipt, true);
    return state.latestRunTransactionReceipt;
  }

  function clear(stageId) {
    const state = requireStage(stageId);
    retainRunTransactionReceiptValue(state, state.execution?.runTransactionReceipt);
    const changed = state.execution !== null;
    state.execution = null;
    return changed;
  }

  function select(stageId) {
    return requireStage(stageId).execution;
  }

  function fields(stageId) {
    const state = requireStage(stageId);
    return freeze({
      ...(state.execution ? { execution: state.execution } : {}),
      latestRunTransactionReceipt: state.latestRunTransactionReceipt,
    });
  }

  function requireStage(stageId) {
    const state = states[stageId];
    if (!state) fail('LAFEA_DOMAIN_FIRST_EXECUTION_STAGE_INVALID');
    return state;
  }

  return Object.freeze({
    retain,
    retainRunTransactionReceipt,
    clear,
    select,
    fields,
  });
}

function retainRunTransactionReceiptValue(state, receipt, required = false) {
  const valid = receipt
    && receipt.schema === 'lafea-run-transaction-receipt/v1'
    && ['COMPLETED', 'SUPERSEDED'].includes(receipt.status)
    && typeof receipt.semanticHash === 'string';
  if (!valid) {
    if (required) fail('LAFEA_DOMAIN_FIRST_RUN_TRANSACTION_RECEIPT_INVALID');
    return;
  }
  state.latestRunTransactionReceipt = freeze(structuredClone(receipt));
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
