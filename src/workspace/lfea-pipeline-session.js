/**
 * Shared session state for the unified LFEA pipeline shell.
 *
 * Owns only navigation/UI state (active step, per-step availability
 * projected from existing controllers). It does not re-implement or
 * duplicate any sealed/hashed authority chain — each wrapped controller
 * keeps owning its own state; this store only mirrors a read-only
 * projection of it for the stepper chrome to render.
 *
 * It also derives, from that same projection, which step the engineer is
 * actually meant to do next. The six steps carry a real order, but nothing
 * in the chrome said which of them were finished, which was waiting, or why
 * a disabled one was disabled -- a disabled Load-case step looked identical
 * whether the model had not been checked yet or whether this source type
 * cannot reach it at all. The derivation is one place so the stepper, the
 * next-action line, and any panel asking "can I proceed" cannot disagree.
 */
export const LFEA_PIPELINE_SESSION_SCHEMA = 'lfea-pipeline-session/v1';

export function createLfeaPipelineSession(steps) {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new TypeError('LFEA pipeline session requires a non-empty step list.');
  }
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
      // Why a step cannot be reached, in the engineer's terms. A step that is
      // unavailable without one renders as a bare disabled button, which is
      // the state this field exists to stop.
      blockedReason: status.blockedReason ?? null,
    };
    if (next.available === current.available && next.complete === current.complete
      && next.detail === current.detail && next.blockedReason === current.blockedReason) return state;
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

/**
 * Label each step and name the one to do next.
 *
 * COMPLETE  — the step's own controller reported it done.
 * CURRENT   — the step being viewed.
 * READY     — reachable, not yet done.
 * BLOCKED   — not reachable; blockedReason says what would unblock it.
 *
 * "Next" is the first step that is reachable and not yet complete, which is
 * the one honest answer available from a projection this thin: it never
 * claims a later step is reachable just because an earlier one finished.
 * When every reachable step is complete there is no next step, and when the
 * next one is blocked the guidance says so rather than pointing at a button
 * that will not respond.
 */
export function deriveLfeaPipelineStepGuidance(steps, stepAvailability, activeStepId) {
  const statuses = {};
  for (const step of steps) {
    const row = stepAvailability[step.stepId];
    statuses[step.stepId] = row.complete
      ? 'COMPLETE'
      : step.stepId === activeStepId
        ? 'CURRENT'
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
  return Object.freeze({
    ...value,
    guidance: deriveLfeaPipelineStepGuidance(steps, value.stepAvailability, value.activeStepId),
  });
}
