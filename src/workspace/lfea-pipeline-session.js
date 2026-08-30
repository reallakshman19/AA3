/** Shared UI-only session state for the unified LFEA pipeline shell. */
export const LFEA_PIPELINE_SESSION_SCHEMA = 'lfea-pipeline-session/v1';

export function createLfeaPipelineSession(steps) {
  if (!Array.isArray(steps) || steps.length === 0) throw new TypeError('LFEA pipeline session requires a non-empty step list.');
  const listeners = new Set();
  let state = withGuidance(steps, {
    schema: LFEA_PIPELINE_SESSION_SCHEMA,
    activeStepId: steps[0].stepId,
    stepAvailability: Object.fromEntries(steps.map((step) => [step.stepId, {
      available: true, complete: false, detail: null, blockedReason: null,
    }])),
  });

  function publish(next) {
    state = withGuidance(steps, next);
    listeners.forEach((listener) => listener(state));
    return state;
  }

  function setActiveStep(stepId) {
    if (!steps.some((step) => step.stepId === stepId)) throw new TypeError(`Unknown LFEA pipeline step: ${String(stepId)}.`);
    if (stepId === state.activeStepId) return state;
    return publish({ ...state, activeStepId: stepId });
  }

  function setStepStatus(stepId, status) {
    if (!steps.some((step) => step.stepId === stepId)) throw new TypeError(`Unknown LFEA pipeline step: ${String(stepId)}.`);
    const current = state.stepAvailability[stepId];
    const next = {
      available: status.available ?? current.available,
      complete: status.complete ?? current.complete,
      detail: status.detail ?? null,
      blockedReason: status.blockedReason ?? null,
    };
    if (next.available === current.available && next.complete === current.complete
      && next.detail === current.detail && next.blockedReason === current.blockedReason) return state;
    return publish({ ...state, stepAvailability: { ...state.stepAvailability, [stepId]: next } });
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('LFEA pipeline session subscriber must be a function.');
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return Object.freeze({ getState: () => state, setActiveStep, setStepStatus, subscribe, destroy: () => listeners.clear() });
}

/**
 * Label each stage and name the next unfinished reachable task.
 *
 * CURRENT wins over COMPLETE for the status label because the completion
 * overlay is rendered independently. This lets an engineer remain visibly in
 * Output after a run while the rail still records that Output evidence exists
 * and Export is the next task.
 */
export function deriveLfeaPipelineStepGuidance(steps, stepAvailability, activeStepId) {
  const statuses = {};
  for (const step of steps) {
    const row = stepAvailability[step.stepId];
    statuses[step.stepId] = step.stepId === activeStepId
      ? 'CURRENT'
      : row.complete
        ? 'COMPLETE'
        : row.available ? 'READY' : 'BLOCKED';
  }
  const nextStep = steps.find((step) => {
    const row = stepAvailability[step.stepId];
    return row.available && !row.complete;
  }) ?? null;
  const firstBlocked = steps.find((step) => {
    const row = stepAvailability[step.stepId];
    return !row.available && !row.complete && row.blockedReason;
  }) ?? null;
  const completedCount = steps.filter((step) => stepAvailability[step.stepId].complete).length;
  let nextActionText;
  if (nextStep) {
    const detail = stepAvailability[nextStep.stepId].detail;
    nextActionText = detail ? `Next: ${nextStep.label} — ${detail}` : `Next: ${nextStep.label}`;
  } else if (firstBlocked) {
    nextActionText = `Blocked at ${firstBlocked.label}: ${stepAvailability[firstBlocked.stepId].blockedReason}`;
  } else {
    nextActionText = 'All available steps are complete.';
  }
  return Object.freeze({
    stepStatusById: Object.freeze(statuses),
    nextStepId: nextStep?.stepId ?? null,
    nextActionText,
    completedCount,
    stepCount: steps.length,
  });
}

function withGuidance(steps, value) {
  return Object.freeze({ ...value, guidance: deriveLfeaPipelineStepGuidance(steps, value.stepAvailability, value.activeStepId) });
}
