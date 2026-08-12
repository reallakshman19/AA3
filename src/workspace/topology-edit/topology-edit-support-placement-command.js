import { deepFreeze, semanticHash, stringValue } from '../../core/shared-piping-model/index.js';
import {
  CERTIFIED_SUPPORT_PLACEMENT_AUTHORITY,
  resolveTopologyEditSupportPlacement,
  topologyEditSupportNonPlacementMaterial,
  topologyEditSupportPlacementOverride,
} from './topology-edit-support-placement.js';

export function normalizeTopologyEditSupportPlacementPayload(value = {}) {
  const stationMm = Number(value.stationMm);
  if (!Number.isFinite(stationMm) || stationMm < 0) {
    throw new RangeError('TopologyEditSupportPlacementCommand: stationMm must be finite and non-negative.');
  }
  return deepFreeze({
    supportId: requiredText(value.supportId, 'supportId'),
    hostEdgeId: requiredText(value.hostEdgeId, 'hostEdgeId'),
    stationMm,
    authority: CERTIFIED_SUPPORT_PLACEMENT_AUTHORITY,
  });
}

export function resolveTopologyEditSupportPlacementTargets(topology, request) {
  const support = exact(topology.supports, request.payload.supportId, 'support');
  const placement = resolveTopologyEditSupportPlacement(
    topology,
    support,
    request.payload.stationMm,
    request.payload.hostEdgeId,
  );
  return {
    nodes: [
      target(topology.nodes, placement.fromNode.id, 'NODE', 'HOST_FROM'),
      target(topology.nodes, placement.toNode.id, 'NODE', 'HOST_TO'),
    ],
    edges: [target(topology.edges, placement.hostEdge.id, 'EDGE', 'SUPPORT_HOST')],
    supports: [{
      kind: 'SUPPORT', role: 'RELOCATED_SUPPORT', id: support.id,
      revision: semanticHash({ kind: 'SUPPORT', record: support }), record: support,
    }],
    endpointPortKeys: [],
  };
}

export function applyTopologyEditSupportPlacement(topology, command) {
  const support = exact(topology.supports, command.payload.supportId, 'support');
  const placement = resolveTopologyEditSupportPlacement(
    topology,
    support,
    command.payload.stationMm,
    command.payload.hostEdgeId,
  );
  support.placementOverride = topologyEditSupportPlacementOverride({
    resolvedPlacement: placement,
    commandId: command.commandId,
  });
  support.updatedByCommandId = command.commandId;
  support.topologyOperation = 'UPDATE_SUPPORT_PLACEMENT';
  return topology;
}

export function validateTopologyEditSupportPlacementEffect(candidate) {
  const delta = candidate.topologyDelta;
  const changed = delta.supports?.changedIds ?? [];
  const other = [
    delta.nodes, delta.edges, delta.junctions, delta.boundaries, delta.rigids, delta.bends,
  ].flatMap(changes);
  const payload = candidate.resolvedPayload ?? {};
  const prior = candidate.resolvedTargets?.supports?.find((row) => row.id === payload.supportId)?.record;
  const support = candidate.canonicalTopology.supports?.find((row) => row.id === payload.supportId);
  const override = support?.placementOverride;
  const sourceMaterialPreserved = prior && support
    && semanticHash(topologyEditSupportNonPlacementMaterial(prior))
      === semanticHash(topologyEditSupportNonPlacementMaterial(support));
  const valid = changed.length === 1
    && changed[0] === payload.supportId
    && (delta.supports?.addedIds ?? []).length === 0
    && (delta.supports?.removedIds ?? []).length === 0
    && other.length === 0
    && sourceMaterialPreserved
    && override?.authority === CERTIFIED_SUPPORT_PLACEMENT_AUTHORITY
    && override?.hostEdgeId === payload.hostEdgeId
    && Number(override?.stationMm) === Number(payload.stationMm)
    && finitePoint(override?.origin)
    && Number.isFinite(Number(override?.segmentParameter))
    && support?.updatedByCommandId === candidate.commandId
    && support?.topologyOperation === 'UPDATE_SUPPORT_PLACEMENT';
  return valid ? [] : [{
    code: 'UPDATE_SUPPORT_PLACEMENT_DELTA_INVALID',
    message: 'UPDATE_SUPPORT_PLACEMENT must change exactly one support placement override while preserving imported support evidence.',
    targetIds: [...new Set([payload.supportId, payload.hostEdgeId, ...changed, ...other].filter(Boolean))].sort(),
  }];
}

function target(rows, id, kind, role) {
  const record = exact(rows, id, kind.toLowerCase());
  return { kind, role, id, revision: semanticHash({ kind, record }), record };
}
function exact(rows, id, label) {
  const matches = (rows ?? []).filter((row) => row?.id === id);
  if (matches.length !== 1) {
    throw new RangeError(
      `TopologyEditSupportPlacementCommand: ${label} ${id} resolved ${matches.length} records.`,
    );
  }
  return matches[0];
}
function changes(value = {}) {
  return [...(value.addedIds ?? []), ...(value.removedIds ?? []), ...(value.changedIds ?? [])];
}
function requiredText(value, label) {
  const text = stringValue(value);
  if (!text) throw new TypeError(`TopologyEditSupportPlacementCommand: ${label} is required.`);
  return text;
}
function finitePoint(value) {
  return value && [value.x, value.y, value.z].every(Number.isFinite);
}
