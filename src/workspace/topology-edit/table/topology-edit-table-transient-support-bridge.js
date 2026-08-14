import { deepFreeze, semanticHash } from '../../../core/shared-piping-model/index.js';
import {
  assertCurrentTopologyEditTransientSupportPlacementDraft,
} from '../draft/topology-edit-transient-support-placement-draft.js';
import {
  createTopologyEditTableIntent,
} from './topology-edit-table-intent.js';
import {
  assertTopologyEditTableProjection,
} from './topology-edit-table-projection.js';

export const TOPOLOGY_EDIT_TABLE_TRANSIENT_SUPPORT_BRIDGE_SCHEMA =
  'TopologyEditTableTransientSupportBridge.v1';

export function createTopologyEditTableSupportIntentFromTransientDraft({
  draft: draftInput,
  projection: projectionInput,
  sessionSnapshot,
  canonicalTopology,
} = {}) {
  const draft = assertCurrentTopologyEditTransientSupportPlacementDraft(
    draftInput,
    canonicalTopology,
  );
  const projection = assertTopologyEditTableProjection(projectionInput);
  if (projection.authority.canonicalTopologyHash !== draft.basisHash) {
    throw new RangeError(
      'TopologyEditTableTransientSupportBridge: projection basis differs from transient draft.',
    );
  }
  const rows = projection.rows.filter((row) => (
    row.identity?.canonicalKind === 'SUPPORT'
    && row.identity?.canonicalId === draft.supportId
  ));
  if (rows.length !== 1) {
    throw new RangeError(
      `TopologyEditTableTransientSupportBridge: support ${draft.supportId} resolved ${rows.length} Table rows.`,
    );
  }
  const intent = createTopologyEditTableIntent({
    projection,
    sessionSnapshot,
    canonicalId: draft.supportId,
    intentKind: 'SUPPORT_PLACEMENT',
    requestedValue: {
      hostEdgeId: draft.hostEdgeId,
      stationMm: draft.stationMm,
    },
  });
  const material = {
    schema: TOPOLOGY_EDIT_TABLE_TRANSIENT_SUPPORT_BRIDGE_SCHEMA,
    draftHash: draft.draftHash,
    projectionHash: projection.projectionHash,
    intentHash: intent.intentHash,
    supportId: draft.supportId,
    hostEdgeId: draft.hostEdgeId,
    stationMm: draft.stationMm,
  };
  return deepFreeze({
    ...material,
    bridgeHash: semanticHash(material),
    intent,
  });
}
