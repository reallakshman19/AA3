/**
 * Shared session state for the unified LFEA pipeline shell.
 *
 * Owns only navigation/UI state (active step, per-step availability
 * projected from existing controllers). It does not re-implement or
 * duplicate any sealed/hashed authority chain — each wrapped controller
 * keeps owning its own state; this store only mirrors a read-only
 * projection of it for the stepper chrome to render.
 */
export const LFEA_PIPELINE_SESSION_SCHEMA = 'lfea-pipeline-session/v1';

export function createLfeaPipelineSession(steps) {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new TypeError('LFEA pipeline session requires a non-empty step list.');
  }
  const listeners = new Set();
  let state = freeze({
    schema: LFEA_PIPELINE_SESSION_SCHEMA,
    activeStepId: steps[0].stepId,
    stepAvailability: Object.fromEntries(steps.map((step) => [step.stepId, { available: true, complete: false, detail: null }])),
  });

  function publish(next) {
    state = freeze(next);
    listeners.forEach((listener) => listener(state));
    return state;
  }

  function setActiveStep(stepId) {
    if (!steps.some((step) => step.stepId === stepId)) {
      throw new TypeError(`Unknown LFEA pipeline step: ${String(stepId)}.`);
    }
    if (stepId === state.activeStepId) return state;
    return publish({ ...state, activeStepId: stepId });
  }

  function setStepStatus(stepId, status) {
    if (!steps.some((step) => step.stepId === stepId)) {
      throw new TypeError(`Unknown LFEA pipeline step: ${String(stepId)}.`);
    }
    const current = state.stepAvailability[stepId];
    const next = {
      available: status.available ?? current.available,
      complete: status.complete ?? current.complete,
      detail: status.detail ?? null,
    };
    if (next.available === current.available && next.complete === current.complete && next.detail === current.detail) return state;
    return publish({
      ...state,
      stepAvailability: { ...state.stepAvailability, [stepId]: next },
    });
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('LFEA pipeline session subscriber must be a function.');
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return Object.freeze({
    getState: () => state,
    setActiveStep,
    setStepStatus,
    subscribe,
    destroy: () => listeners.clear(),
  });
}

function freeze(value) {
  return Object.freeze(value);
}
