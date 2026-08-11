import { compareLfeaNativeRunRecords } from './native-run-comparison.js';
import { mountLfeaNativeComparisonView } from './native-comparison-view.js';

/** Comparison selection is product view state only; it never mutates current engineering authority. */
export function createLfeaNativeComparisonController(root, options = {}) {
  const lookupRun = typeof options.lookupRun === 'function' ? options.lookupRun : () => null;
  let historySnapshot = null;
  let state = freezeState(null, null, null);
  const view = mountLfeaNativeComparisonView(root, {
    onCompare: (leftRunId, rightRunId) => compare(leftRunId, rightRunId),
  });

  function refresh(snapshot) {
    historySnapshot = snapshot;
    const available = new Set((snapshot?.entries ?? []).map((entry) => entry.runId));
    const leftRunId = available.has(state.leftRunId) ? state.leftRunId : null;
    const rightRunId = available.has(state.rightRunId) ? state.rightRunId : null;
    const comparison = leftRunId && rightRunId ? state.comparison : null;
    state = freezeState(leftRunId, rightRunId, comparison);
    view.update(historySnapshot, state);
    return state;
  }

  function compare(leftRunId, rightRunId) {
    const left = requireRun(lookupRun(leftRunId), leftRunId);
    const right = requireRun(lookupRun(rightRunId), rightRunId);
    if (left.runId === right.runId) {
      const error = new TypeError('Semantic Compare requires two distinct retained run identities.');
      error.code = 'LFEA_COMPARISON_DISTINCT_RUNS_REQUIRED';
      throw error;
    }
    const comparison = compareLfeaNativeRunRecords(left, right);
    state = freezeState(left.runId, right.runId, comparison);
    view.update(historySnapshot, state);
    return comparison;
  }

  return Object.freeze({
    refresh,
    compare,
    getState: () => state,
    clear() {
      state = freezeState(null, null, null);
      view.update(historySnapshot, state);
    },
    destroy() {
      state = freezeState(null, null, null);
      historySnapshot = null;
      view.destroy();
    },
  });
}

function freezeState(leftRunId, rightRunId, comparison) {
  return Object.freeze({ leftRunId, rightRunId, comparison });
}

function requireRun(record, runId) {
  if (record) return record;
  const error = new TypeError(`Retained LFEA run is not available for comparison: ${String(runId ?? '')}.`);
  error.code = 'LFEA_COMPARISON_RUN_NOT_FOUND';
  throw error;
}
