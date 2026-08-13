import { deepFreeze } from '../../../core/shared-piping-model/index.js';
import { createTopologyEditTableBatch } from './topology-edit-table-batch.js';
import { planTopologyEditTableBatch } from './topology-edit-table-batch-planner.js';
import { assertTopologyEditTableIntent } from './topology-edit-table-intent.js';

export const TOPOLOGY_EDIT_TABLE_DRAFT_PLAN_SCHEMA = 'TopologyEditTableDraftPlan.v1';

export function planTopologyEditTableDraft({
  intents: currentIntents = [],
  intent: intentInput,
  projection,
  canonicalTopology,
} = {}) {
  const intent = assertTopologyEditTableIntent(intentInput);
  const intents = [
    ...currentIntents.filter((entry) => !sameIntentSlot(entry, intent)),
    intent,
  ];
  const batch = createTopologyEditTableBatch({ intents });
  const batchPlan = planTopologyEditTableBatch({
    batch,
    projection,
    canonicalTopology,
  });
  return deepFreeze({
    schema: TOPOLOGY_EDIT_TABLE_DRAFT_PLAN_SCHEMA,
    intent,
    intents,
    batch,
    batchPlan,
  });
}

export function topologyEditTableDraftIntentKey(intentInput) {
  const intent = assertTopologyEditTableIntent(intentInput);
  return `${intent.target.canonicalId}\u0000${intent.intentKind}`;
}

function sameIntentSlot(leftInput, right) {
  const left = assertTopologyEditTableIntent(leftInput);
  return left.target.canonicalId === right.target.canonicalId
    && left.intentKind === right.intentKind;
}
