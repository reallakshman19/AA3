import { deepFreeze, semanticHash, stringValue } from '../../core/shared-piping-model/index.js';
import { finalizeCanonicalTopology } from './topology-edit-canonical-state.js';
import {
  applyCanonicalTopologyToWorkspaceEntities as applyLegacyWriteback,
  buildCanonicalTopologyFromWorkspaceDataset as buildLegacyCanonicalTopology,
} from './topology-edit-source-adapter.js';
import {
  CERTIFIED_SUPPORT_PLACEMENT_AUTHORITY,
  certifiedTopologyEditSupportPlacementOrigin,
  topologyEditSupportPlacementAtStation,
  topologyEditSupportPlacementOverride,
} from './topology-edit-support-placement.js';
import {
  createNativePipeWorkspaceEntity,
} from './topology-edit-native-pipe-writeback.js';

const AUDIT = Object.freeze({
  authority: 'TOPOLOGY_EDIT_SUPPORT_PLACEMENT_AUTHORITY',
  station: 'TOPOLOGY_EDIT_SUPPORT_STATION_MM',
  parameter: 'TOPOLOGY_EDIT_SUPPORT_SEGMENT_PARAMETER',
  hostEdge: 'TOPOLOGY_EDIT_SUPPORT_HOST_EDGE_ID',
  hostEntity: 'TOPOLOGY_EDIT_SUPPORT_HOST_ENTITY_ID',
  command: 'TOPOLOGY_EDIT_SUPPORT_PLACEMENT_COMMAND_ID',
  hash: 'TOPOLOGY_EDIT_SUPPORT_PLACEMENT_HASH',
});
const EPSILON = 1e-9;

export function buildCanonicalTopologyFromWorkspaceDataset(
  dataset,
  topologyGraph,
  attachmentModel = null,
  restraintModel = null,
) {
  const canonical = buildLegacyCanonicalTopology(
    dataset,
    topologyGraph,
    attachmentModel,
    restraintModel,
  );
  const entities = new Map((dataset?.entities ?? []).map((entity) => [entity.entityId, entity]));
  const audited = (canonical.supports ?? []).filter((support) => (
    entityAttributes(entities.get(support.entityId))?.[AUDIT.authority]
      === CERTIFIED_SUPPORT_PLACEMENT_AUTHORITY
  ));
  if (!audited.length) return canonical;

  const draft = JSON.parse(JSON.stringify(canonical));
  const draftSupports = new Map(draft.supports.map((support) => [support.id, support]));
  for (const support of audited) {
    const entity = entities.get(support.entityId);
    const attributes = entityAttributes(entity);
    const stationMm = finiteNonNegative(attributes[AUDIT.station], AUDIT.station);
    const hostEdgeId = requiredText(attributes[AUDIT.hostEdge], AUDIT.hostEdge);
    const commandId = requiredText(attributes[AUDIT.command], AUDIT.command);
    const placement = topologyEditSupportPlacementAtStation(
      canonical,
      support,
      stationMm,
      hostEdgeId,
    );
    const parameter = finiteUnit(attributes[AUDIT.parameter], AUDIT.parameter);
    if (Math.abs(parameter - placement.segmentParameter) > EPSILON) {
      throw new Error('TopologyEditSourceAdapterDispatch: support placement parameter differs from canonical host geometry.');
    }
    const center = finitePoint(entity?.properties?.geometry?.center, 'support geometry center');
    if (pointDistance(center, placement.origin) > EPSILON) {
      throw new Error('TopologyEditSourceAdapterDispatch: support placement center differs from canonical host station.');
    }
    const override = topologyEditSupportPlacementOverride({
      resolvedPlacement: placement,
      commandId,
    });
    const expectedHash = stringValue(attributes[AUDIT.hash]);
    if (expectedHash && expectedHash !== override.placementHash) {
      throw new Error('TopologyEditSourceAdapterDispatch: support placement audit hash mismatch.');
    }
    const target = draftSupports.get(support.id);
    target.placementOverride = override;
    target.updatedByCommandId = commandId;
    target.topologyOperation = 'UPDATE_SUPPORT_PLACEMENT';
  }
  return finalizeCanonicalTopology(draft);
}

function legacyEditEntityId(dataset, editSessionId, edgeId) {
  return `edit:${semanticHash({
    datasetId: dataset.datasetId,
    version: dataset.version || 0,
    editSessionId,
    edgeId,
  }).slice(0, 20)}`;
}
function isNewNativePipe(edge, dataset, baseTopology) {
  return edge?.identityKind === 'NATIVE_COMMAND'
    && edge?.topologyOperation === 'INSERT_PIPE_SEGMENT'
    && !dataset.entities.some((entity) => entity.entityId === edge.componentKey)
    && !(baseTopology.edges ?? []).some((row) => row.id === edge.id);
}

export function applyCanonicalTopologyToWorkspaceEntities(
  dataset,
  baseCanonicalTopology,
  editedCanonicalTopology,
  editSessionId,
) {
  const legacy = applyLegacyWriteback(
    dataset,
    baseCanonicalTopology,
    editedCanonicalTopology,
    editSessionId,
  );
  const result = new Map(legacy.map((entity) => [entity.entityId, entity]));
  for (const edge of editedCanonicalTopology.edges ?? []) {
    if (!isNewNativePipe(edge, dataset, baseCanonicalTopology)) continue;
    result.delete(legacyEditEntityId(dataset, editSessionId, edge.id));
    const nativeEntity = createNativePipeWorkspaceEntity(editedCanonicalTopology, edge.id);
    if (result.has(nativeEntity.entityId)) {
      throw new Error(
        `TopologyEditSourceAdapterDispatch: duplicate native entity ${nativeEntity.entityId}.`,
      );
    }
    result.set(nativeEntity.entityId, nativeEntity);
  }
  for (const support of editedCanonicalTopology.supports ?? []) {
    const override = support.placementOverride;
    if (override?.authority !== CERTIFIED_SUPPORT_PLACEMENT_AUTHORITY) continue;
    const entity = result.get(support.entityId);
    if (!entity) {
      throw new Error(`TopologyEditSourceAdapterDispatch: support entity ${support.entityId} is unavailable.`);
    }
    const origin = certifiedTopologyEditSupportPlacementOrigin(support);
    if (!origin) {
      throw new Error(`TopologyEditSourceAdapterDispatch: support ${support.id} certified origin is invalid.`);
    }
    result.set(entity.entityId, supportPlacementEntity(entity, support, origin, editSessionId));
  }
  return [...result.values()];
}

function supportPlacementEntity(entity, support, origin, editSessionId) {
  return deepFreeze({
    ...entity,
    properties: {
      ...entity.properties,
      geometry: { ...entity.properties?.geometry, center: origin, start: origin, end: origin },
      attributes: {
        ...entity.properties?.attributes,
        TOPOLOGY_EDIT_SESSION_ID: editSessionId,
        [AUDIT.authority]: CERTIFIED_SUPPORT_PLACEMENT_AUTHORITY,
        [AUDIT.station]: support.placementOverride.stationMm,
        [AUDIT.parameter]: support.placementOverride.segmentParameter,
        [AUDIT.hostEdge]: support.placementOverride.hostEdgeId,
        [AUDIT.hostEntity]: support.placementOverride.hostEntityId,
        [AUDIT.command]: support.placementOverride.updatedByCommandId,
        [AUDIT.hash]: support.placementOverride.placementHash,
      },
    },
  });
}
function entityAttributes(entity) { return entity?.properties?.attributes ?? null; }
function finiteNonNegative(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new RangeError(`TopologyEditSourceAdapterDispatch: ${label} must be finite and non-negative.`);
  }
  return number;
}
function finiteUnit(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1) {
    throw new RangeError(`TopologyEditSourceAdapterDispatch: ${label} must be in [0, 1].`);
  }
  return number;
}
function finitePoint(value, label) {
  if (!value || ![value.x, value.y, value.z].every(Number.isFinite)) {
    throw new RangeError(`TopologyEditSourceAdapterDispatch: ${label} must be finite.`);
  }
  return { x: value.x, y: value.y, z: value.z };
}
function requiredText(value, label) {
  const text = stringValue(value);
  if (!text) throw new TypeError(`TopologyEditSourceAdapterDispatch: ${label} is required.`);
  return text;
}
function pointDistance(left, right) {
  return Math.hypot(right.x - left.x, right.y - left.y, right.z - left.z);
}
