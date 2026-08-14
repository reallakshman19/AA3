import { deepFreeze, semanticHash, stringValue } from '../../../core/shared-piping-model/index.js';
import {
  resolveTopologyEditSupportPlacement,
  topologyEditSupportPlacementAtStation,
  topologyEditSupportPlacementContext,
} from '../topology-edit-support-placement.js';

export const TOPOLOGY_EDIT_TRANSIENT_SUPPORT_PLACEMENT_DRAFT_SCHEMA =
  'TopologyEditTransientSupportPlacementDraft.v1';

const SOURCES = new Set(['CANVAS_DRAG', 'CANVAS_NUMERIC']);
const EPSILON_MM = 1e-9;

export function createTopologyEditTransientSupportPlacementDraft(input = {}) {
  const topology = requireTopology(input.topology);
  const supportId = requiredText(input.supportId, 'supportId');
  const support = exact(topology.supports, supportId, 'support');
  const source = requiredEnum(input.source ?? 'CANVAS_DRAG', SOURCES, 'source');
  const context = topologyEditSupportPlacementContext(topology, support);
  const requestedPoint = input.targetPoint === undefined || input.targetPoint === null
    ? null
    : finitePoint(input.targetPoint, 'targetPoint');
  const requestedStation = finiteMaybe(input.stationMm);
  if ((requestedPoint === null) === (requestedStation === null)) {
    throw new TypeError(
      'TopologyEditTransientSupportPlacementDraft: provide exactly one of targetPoint or stationMm.',
    );
  }

  const projected = requestedPoint
    ? projectPointToHost(topology, context, requestedPoint)
    : {
      stationMm: requestedStation,
      requestedPoint: null,
      orthogonalDistanceMm: 0,
    };
  const placement = resolveTopologyEditSupportPlacement(
    topology,
    support,
    projected.stationMm,
    context.hostEdgeId,
  );
  const material = {
    schema: TOPOLOGY_EDIT_TRANSIENT_SUPPORT_PLACEMENT_DRAFT_SCHEMA,
    basisHash: topology.canonicalTopologyHash,
    supportId,
    hostEdgeId: context.hostEdgeId,
    source,
    requestedPoint: projected.requestedPoint,
    stationMm: placement.stationMm,
    segmentParameter: placement.segmentParameter,
    targetOrigin: placement.origin,
    orthogonalDistanceMm: projected.orthogonalDistanceMm,
    previewHash: optionalText(input.previewHash),
  };
  return deepFreeze({ ...material, draftHash: semanticHash(material) });
}

export function assertCurrentTopologyEditTransientSupportPlacementDraft(draftInput, topologyInput) {
  const draft = assertTopologyEditTransientSupportPlacementDraft(draftInput);
  const topology = requireTopology(topologyInput);
  if (draft.basisHash !== topology.canonicalTopologyHash) {
    throw new RangeError(
      'TopologyEditTransientSupportPlacementDraft: draft basis differs from current canonical topology.',
    );
  }
  const support = exact(topology.supports, draft.supportId, 'support');
  const context = topologyEditSupportPlacementContext(topology, support);
  if (context.hostEdgeId !== draft.hostEdgeId) {
    throw new RangeError(
      `TopologyEditTransientSupportPlacementDraft: support host changed from ${draft.hostEdgeId} to ${context.hostEdgeId}.`,
    );
  }
  const placement = topologyEditSupportPlacementAtStation(
    topology,
    support,
    draft.stationMm,
    draft.hostEdgeId,
  );
  if (Math.abs(placement.segmentParameter - draft.segmentParameter) > EPSILON_MM
      || distance(placement.origin, draft.targetOrigin) > EPSILON_MM) {
    throw new RangeError(
      'TopologyEditTransientSupportPlacementDraft: target placement differs from current host geometry.',
    );
  }
  return draft;
}

export function assertTopologyEditTransientSupportPlacementDraft(value) {
  if (!value || value.schema !== TOPOLOGY_EDIT_TRANSIENT_SUPPORT_PLACEMENT_DRAFT_SCHEMA) {
    throw new TypeError(
      `TopologyEditTransientSupportPlacementDraft: draft must use ${TOPOLOGY_EDIT_TRANSIENT_SUPPORT_PLACEMENT_DRAFT_SCHEMA}.`,
    );
  }
  const material = { ...value };
  delete material.draftHash;
  if (value.draftHash !== semanticHash(material)) {
    throw new RangeError('TopologyEditTransientSupportPlacementDraft: draftHash mismatch.');
  }
  requiredText(value.basisHash, 'basisHash');
  requiredText(value.supportId, 'supportId');
  requiredText(value.hostEdgeId, 'hostEdgeId');
  requiredEnum(value.source, SOURCES, 'source');
  finitePoint(value.targetOrigin, 'targetOrigin');
  if (!(Number.isFinite(value.stationMm) && value.stationMm >= 0)) {
    throw new RangeError('TopologyEditTransientSupportPlacementDraft: stationMm must be finite and non-negative.');
  }
  if (!(Number.isFinite(value.segmentParameter)
      && value.segmentParameter >= 0 && value.segmentParameter <= 1)) {
    throw new RangeError('TopologyEditTransientSupportPlacementDraft: segmentParameter must be within [0, 1].');
  }
  if (!(Number.isFinite(value.orthogonalDistanceMm) && value.orthogonalDistanceMm >= 0)) {
    throw new RangeError('TopologyEditTransientSupportPlacementDraft: orthogonalDistanceMm must be finite and non-negative.');
  }
  return value;
}

export function topologyEditTransientSupportPlacementDraftMap(drafts = []) {
  const result = {};
  for (const draftInput of drafts ?? []) {
    const draft = assertTopologyEditTransientSupportPlacementDraft(draftInput);
    const existing = result[draft.supportId];
    if (existing && existing.draftHash !== draft.draftHash) {
      throw new RangeError(
        `TopologyEditTransientSupportPlacementDraft: conflicting drafts for ${draft.supportId}.`,
      );
    }
    result[draft.supportId] = draft;
  }
  return deepFreeze(result);
}

function projectPointToHost(topology, context, point) {
  const from = exact(topology.nodes, context.fromNodeId, 'host FROM node').position;
  const to = exact(topology.nodes, context.toNodeId, 'host TO node').position;
  const a = finitePoint(from, 'host FROM position');
  const b = finitePoint(to, 'host TO position');
  const axis = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const offset = { x: point.x - a.x, y: point.y - a.y, z: point.z - a.z };
  const lengthSquared = (axis.x ** 2) + (axis.y ** 2) + (axis.z ** 2);
  if (!(lengthSquared > EPSILON_MM)) {
    throw new RangeError('TopologyEditTransientSupportPlacementDraft: host must have positive length.');
  }
  const rawParameter = ((offset.x * axis.x) + (offset.y * axis.y) + (offset.z * axis.z))
    / lengthSquared;
  const parameter = Math.min(1, Math.max(0, rawParameter));
  const stationMm = parameter * Math.sqrt(lengthSquared);
  const projected = {
    x: a.x + (axis.x * parameter),
    y: a.y + (axis.y * parameter),
    z: a.z + (axis.z * parameter),
  };
  return {
    stationMm,
    requestedPoint: point,
    orthogonalDistanceMm: distance(point, projected),
  };
}

function requireTopology(value) {
  if (!value || !requiredText(value.canonicalTopologyHash, 'topology.canonicalTopologyHash')) {
    throw new TypeError('TopologyEditTransientSupportPlacementDraft: canonical topology is required.');
  }
  return value;
}
function exact(rows, id, label) {
  const matches = (rows ?? []).filter((row) => row?.id === id);
  if (matches.length !== 1) {
    throw new RangeError(
      `TopologyEditTransientSupportPlacementDraft: ${label} ${id} resolved ${matches.length} records.`,
    );
  }
  return matches[0];
}
function finitePoint(value, label) {
  const point = { x: Number(value?.x), y: Number(value?.y), z: Number(value?.z) };
  if (!Object.values(point).every(Number.isFinite)) {
    throw new RangeError(
      `TopologyEditTransientSupportPlacementDraft: ${label} requires finite x, y and z.`,
    );
  }
  return deepFreeze(point);
}
function finiteMaybe(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new RangeError(
      'TopologyEditTransientSupportPlacementDraft: stationMm must be finite and non-negative.',
    );
  }
  return number;
}
function requiredEnum(value, allowed, label) {
  const text = requiredText(value, label).toUpperCase();
  if (!allowed.has(text)) {
    throw new RangeError(`TopologyEditTransientSupportPlacementDraft: ${label} ${text} is unsupported.`);
  }
  return text;
}
function requiredText(value, label) {
  const text = stringValue(value);
  if (!text) throw new TypeError(`TopologyEditTransientSupportPlacementDraft: ${label} is required.`);
  return text;
}
function optionalText(value) {
  const text = stringValue(value);
  return text || null;
}
function distance(left, right) {
  return Math.hypot(right.x - left.x, right.y - left.y, right.z - left.z);
}
