import {
  planTopologyEditTableDraft,
} from '../topology-edit/table/topology-edit-table-draft-plan.js';
import {
  assertTopologyEditTableIntent,
} from '../topology-edit/table/topology-edit-table-intent.js';
import {
  requestTopologyEditTableAutoPreview,
} from './topology-edit-table-workflow.js';

/**
 * Stage an already-certified Table intent through the same shared draft planner
 * and automatic Preview queue used by interactive Table editors.
 *
 * This helper owns no command or topology mutation authority. It only updates
 * the Table runtime's transient staged state.
 */
export function stageTopologyEditPreparedTableIntent(runtime, intentInput) {
  try {
    if (!runtime?.projection || !runtime?.controller?.session) {
      throw new TypeError(
        'TopologyEditPreparedTableIntentRuntime: active Table projection and certified session are required.',
      );
    }
    const intent = assertTopologyEditTableIntent(intentInput);
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
    runtime.render();
    return Object.freeze({ ok: true, intent: draft.intent, draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (runtime) {
      runtime.error = message;
      runtime.render?.();
    }
    return Object.freeze({ ok: false, error: message });
  }
}
