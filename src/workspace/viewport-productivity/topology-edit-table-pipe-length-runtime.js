import { planTopologyEditTableDraft } from '../topology-edit/table/topology-edit-table-draft-plan.js';
import { createTopologyEditTableIntent } from '../topology-edit/table/topology-edit-table-intent.js';
import { requestTopologyEditTableAutoPreview } from './topology-edit-table-workflow.js';

export function stageTopologyEditTablePipeLength(runtime, input = {}) {
  try {
    const draft = planPipeLengthInput(runtime, runtime.intents, input);
    commitPipeLengthDraft(runtime, draft);
    return Object.freeze({ ok: true, intent: draft.intent });
  } catch (error) {
    runtime.error = errorMessage(error);
    return Object.freeze({ ok: false, error: runtime.error });
  }
}

export function stageTopologyEditTablePipeLengthRange(runtime, inputs = []) {
  try {
    if (!Array.isArray(inputs) || inputs.length === 0) {
      throw new TypeError('Engineering Table PIPE length range: at least one staged value is required.');
    }
    let intents = [...runtime.intents];
    let draft = null;
    const staged = [];
    for (const input of inputs) {
      draft = planPipeLengthInput(runtime, intents, input);
      intents = [...draft.intents];
      staged.push(draft.intent);
    }
    commitPipeLengthDraft(runtime, draft);
    runtime.message = `${staged.length} PIPE length value(s) staged atomically with explicit geometry policy; governed Preview refresh queued.`;
    return Object.freeze({ ok: true, intents: Object.freeze(staged) });
  } catch (error) {
    runtime.error = errorMessage(error);
    return Object.freeze({ ok: false, error: runtime.error });
  }
}

function planPipeLengthInput(runtime, currentIntents, input) {
  const canonicalId = String(input.canonicalId ?? '').trim();
  const intent = createTopologyEditTableIntent({
    projection: runtime.projection,
    sessionSnapshot: runtime.controller.session.snapshot(),
    canonicalId,
    intentKind: 'PIPE_LENGTH',
    requestedValue: { lengthMm: Number(input.lengthMm) },
    geometryPolicy: {
      anchor: input.anchor,
      propagation: input.propagation,
    },
  });
  return planTopologyEditTableDraft({
    intents: currentIntents,
    intent,
    projection: runtime.projection,
    canonicalTopology: runtime.controller.session.currentTopology(),
  });
}

function commitPipeLengthDraft(runtime, draft) {
  if (!draft) throw new TypeError('Engineering Table PIPE length range: certified draft is required.');
  runtime.intents = [...draft.intents];
  runtime.batch = draft.batch;
  runtime.batchPlan = draft.batchPlan;
  runtime.staleResult = null;
  runtime.clearCandidate();
  runtime.error = null;
  runtime.message = `${draft.batch.intentCount} table change(s) staged against the exact certified revision; governed Preview refresh queued.`;
  requestTopologyEditTableAutoPreview(runtime);
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
