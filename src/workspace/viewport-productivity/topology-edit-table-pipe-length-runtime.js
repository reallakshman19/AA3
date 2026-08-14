import { planTopologyEditTableDraft } from '../topology-edit/table/topology-edit-table-draft-plan.js';
import { createTopologyEditTableIntent } from '../topology-edit/table/topology-edit-table-intent.js';
import { requestTopologyEditTableAutoPreview } from './topology-edit-table-workflow.js';

export function stageTopologyEditTablePipeLength(runtime, input = {}) {
  try {
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
    const draft = planTopologyEditTableDraft({
      intents: runtime.intents,
      intent,
      projection: runtime.projection,
      canonicalTopology: runtime.controller.session.currentTopology(),
    });
    runtime.intents = [...draft.intents];
    runtime.batch = draft.batch;
    runtime.batchPlan = draft.batchPlan;
    runtime.staleResult = null;
    runtime.clearCandidate();
    runtime.error = null;
    runtime.message = `${draft.batch.intentCount} table change(s) staged against the exact certified revision; governed Preview refresh queued.`;
    requestTopologyEditTableAutoPreview(runtime);
    return Object.freeze({ ok: true, intent: draft.intent });
  } catch (error) {
    runtime.error = errorMessage(error);
    return Object.freeze({ ok: false, error: runtime.error });
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
