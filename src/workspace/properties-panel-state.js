/**
 * Pure state helpers for the properties panel.
 *
 * Extracted so properties-panel.js stays inside the 300 physical line budget.
 * These are value functions with no DOM, no event bus and no retained state.
 */
export function lifecycleState(status, payload) {
  return {
    status,
    requestId: payload.requestId,
    sessionId: payload.sessionId || '',
    analysisType: payload.analysisType,
    targetId: payload.targetId,
  };
}

export function idleAnalysis() {
  return Object.freeze({ status: 'idle', requestId: '', sessionId: '', analysisType: '', targetId: '' });
}

export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
