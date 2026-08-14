import { createTopologyEditTableBatch } from '../topology-edit/table/topology-edit-table-batch.js';
import { planTopologyEditTableBatch } from '../topology-edit/table/topology-edit-table-batch-planner.js';
import { createTopologyEditTableIntent } from '../topology-edit/table/topology-edit-table-intent.js';

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
    const intents = [
      ...runtime.intents.filter((row) => row.target.canonicalId !== canonicalId),
      intent,
    ];
    const batch = createTopologyEditTableBatch({ intents });
    const batchPlan = planTopologyEditTableBatch({
      batch,
      projection: runtime.projection,
      canonicalTopology: runtime.controller.session.currentTopology(),
    });
    runtime.intents = intents;
    runtime.batch = batch;
    runtime.batchPlan = batchPlan;
    runtime.staleResult = null;
    runtime.clearCandidate();
    runtime.error = null;
    runtime.message = `${batch.intentCount} table change(s) staged against the exact certified revision.`;
    return Object.freeze({ ok: true, intent });
  } catch (error) {
    runtime.error = errorMessage(error);
    return Object.freeze({ ok: false, error: runtime.error });
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}