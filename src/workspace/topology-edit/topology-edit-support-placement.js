import { deepFreeze, semanticHash, stringValue } from '../../core/shared-piping-model/index.js';
import {
  resolveTopologyEditSupportHostEdge,
} from './professional/topology-edit-support-geometry-dependency.js';

export const CERTIFIED_SUPPORT_PLACEMENT_AUTHORITY = 'CERTIFIED_TABLE_OVERRIDE';
const STRAIGHT_HOST_TYPES = new Set(['PIPE', 'STRAIGHT', 'STRAIGHT_ELEMENT']);
const EPSILON_MM = 1e-9;

export function certifiedTopologyEditSupportPlacementOrigin(support) {
  return certifiedOverride(support?.placementOverride)?.origin ?? null;
}

export function effectiveTopologyEditSupportOrigin(support) {
  return certifiedTopologyEditSupportPlacementOrigin(support) ?? finitePoint(support?.origin);
}

export function topologyEditSupportPlacementContext(topology, supportInput) {
  const support = exact(topology?.supports, supportInput?.id, 'support');
  const host = resolveSupportHostGeometry(topology, support);
  const override = certifiedOverride(support.placementOverride);
  const declaredStation = finiteNonNegative(support.stationMm);
  const attachmentParameter = finiteUnitInterval(support.attachmentSegmentParameter);
  const parameterStation = attachmentParameter === null ? null : attachmentParameter * host.lengthMm;
  const attachmentOrigin = support.originAuthority === 'ATTACHMENT_PROJECTED_POINT'
    ? finitePoint(support.origin) : null;
  const pointStation = attachmentOrigin ? stationForPoint(host, attachmentOrigin) : null;
  if (!override && parameterStation !== null && pointStation !== null
      && Math.abs(parameterStation - pointStation) > EPSILON_MM) {
    throw new RangeError(
      `TopologyEditSupportPlacement: support ${support.id} has conflicting attachment segment and projected-point evidence.`,
    );
  }
  const attachmentStation = parameterStation ?? pointStation;
  if (!override && declaredStation !== null && declaredStation > host.lengthMm + EPSILON_MM) {
    throw new RangeError(
      `TopologyEditSupportPlacement: support ${support.id} declared station exceeds host length.`,
    );
  }
  if (!override && declaredStation !== null && attachmentStation !== null
      && Math.abs(declaredStation - attachmentStation) > EPSILON_MM) {
    throw new RangeError(
      `TopologyEditSupportPlacement: support ${support.id} has conflicting station and attachment evidence.`,
    );
  }
  let currentStationMm = null;
  let stationAuthority = 'UNRESOLVED';
  if (override) {
    currentStationMm = override.stationMm;
    stationAuthority = CERTIFIED_SUPPORT_PLACEMENT_AUTHORITY;
  } else if (declaredStation !== null) {
    currentStationMm = Math.min(declaredStation, host.lengthMm);
    stationAuthority = 'DECLARED_SUPPORT_STATION';
  } else if (parameterStation !== null) {
    currentStationMm = parameterStation;
    stationAuthority = 'ATTACHMENT_SEGMENT_PARAMETER';
  } else if (pointStation !== null) {
    currentStationMm = pointStation;
    stationAuthority = 'ATTACHMENT_PROJECTED_POINT';
  }
  const currentOrigin = override?.origin
    ?? finitePoint(support.origin)
    ?? (currentStationMm === null ? null : interpolate(host.from.position, host.to.position, currentStationMm / host.lengthMm));
  return deepFreeze({
    supportId: support.id,
    hostEdgeId: host.edge.id,
    hostEntityId: host.edge.componentKey ?? support.hostEntityId ?? null,
    hostType: stringValue(host.edge.entityType).toUpperCase(),
    hostLengthMm: host.lengthMm,
    fromNodeId: host.from.id,
    toNodeId: host.to.id,
    currentStationMm,
    stationAuthority,
    currentOrigin,
  });
}

export function effectiveTopologyEditSupportStationMm(topology, support) {
  return topologyEditSupportPlacementContext(topology, support).currentStationMm;
}

export function topologyEditSupportPlacementAtStation(
  topology,
  supportInput,
  stationInput,
  expectedHostEdgeId = null,
) {
  const support = exact(topology?.supports, supportInput?.id, 'support');
  const host = resolveSupportHostGeometry(topology, support);
  const expected = stringValue(expectedHostEdgeId);
  if (expected && host.edge.id !== expected) {
    throw new RangeError(
      `TopologyEditSupportPlacement: support ${support.id} host changed from ${expected} to ${host.edge.id}.`,
    );
  }
  const stationMm = finiteNonNegative(stationInput);
  if (stationMm === null) {
    throw new RangeError('TopologyEditSupportPlacement: stationMm must be finite and non-negative.');
  }
  if (stationMm > host.lengthMm + EPSILON_MM) {
    throw new RangeError(
      `TopologyEditSupportPlacement: stationMm ${stationMm} exceeds host length ${host.lengthMm}.`,
    );
  }
  const boundedStationMm = Math.min(stationMm, host.lengthMm);
  const segmentParameter = boundedStationMm / host.lengthMm;
  return deepFreeze({
    support: { id: support.id, hostEntityId: support.hostEntityId ?? null },
    hostEdge: { id: host.edge.id, componentKey: host.edge.componentKey ?? null },
    fromNode: { id: host.from.id },
    toNode: { id: host.to.id },
    hostLengthMm: host.lengthMm,
    stationMm: boundedStationMm,
    segmentParameter,
    origin: interpolate(host.from.position, host.to.position, segmentParameter),
  });
}

export function resolveTopologyEditSupportPlacement(topology, supportInput, stationInput, expectedHostEdgeId = null) {
  const placement = topologyEditSupportPlacementAtStation(
    topology,
    supportInput,
    stationInput,
    expectedHostEdgeId,
  );
  const context = topologyEditSupportPlacementContext(topology, placement.support);
  if (context.currentStationMm !== null
      && Math.abs(context.currentStationMm - placement.stationMm) <= EPSILON_MM) {
    throw new RangeError(`TopologyEditSupportPlacement: support ${placement.support.id} placement is a no-op.`);
  }
  if (context.currentOrigin && distance(context.currentOrigin, placement.origin) <= EPSILON_MM) {
    throw new RangeError(`TopologyEditSupportPlacement: support ${placement.support.id} placement is a no-op.`);
  }
  return placement;
}

export function topologyEditSupportPlacementOverride({ resolvedPlacement, commandId }) {
  if (!resolvedPlacement?.support?.id || !resolvedPlacement?.hostEdge?.id) {
    throw new TypeError('TopologyEditSupportPlacement: resolvedPlacement is required.');
  }
  const material = {
    authority: CERTIFIED_SUPPORT_PLACEMENT_AUTHORITY,
    hostEdgeId: resolvedPlacement.hostEdge.id,
    hostEntityId: resolvedPlacement.hostEdge.componentKey ?? resolvedPlacement.support.hostEntityId ?? null,
    stationMm: resolvedPlacement.stationMm,
    segmentParameter: resolvedPlacement.segmentParameter,
    origin: resolvedPlacement.origin,
    updatedByCommandId: requiredText(commandId, 'commandId'),
  };
  return deepFreeze({ ...material, placementHash: semanticHash(material) });
}

export function topologyEditSupportNonPlacementMaterial(record) {
  const material = JSON.parse(JSON.stringify(record ?? {}));
  delete material.placementOverride;
  delete material.updatedByCommandId;
  delete material.topologyOperation;
  return deepFreeze(material);
}

function resolveSupportHostGeometry(topology, support) {
  const host = resolveTopologyEditSupportHostEdge(topology, support);
  if (host.status !== 'RESOLVED' || !host.edgeId) {
    throw new RangeError(
      `TopologyEditSupportPlacement: support ${support.id} host authority is ${host.status}.`,
    );
  }
  const edge = exact(topology?.edges, host.edgeId, 'host edge');
  const type = stringValue(edge.entityType).toUpperCase();
  if (!STRAIGHT_HOST_TYPES.has(type)) {
    throw new RangeError(
      `TopologyEditSupportPlacement: host ${edge.id} type ${type || '<unset>'} has no certified station parameterization.`,
    );
  }
  const from = exact(topology?.nodes, edge.fromNodeId, 'host FROM node');
  const to = exact(topology?.nodes, edge.toNodeId, 'host TO node');
  if (!finitePoint(from.position) || !finitePoint(to.position)) {
    throw new RangeError(`TopologyEditSupportPlacement: host ${edge.id} endpoints must be finite.`);
  }
  const lengthMm = distance(from.position, to.position);
  if (!(lengthMm > EPSILON_MM)) {
    throw new RangeError(`TopologyEditSupportPlacement: host ${edge.id} must have positive length.`);
  }
  return { edge, from, to, lengthMm };
}

function stationForPoint(host, point) {
  const from = host.from.position; const to = host.to.position;
  const axis = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
  const offset = { x: point.x - from.x, y: point.y - from.y, z: point.z - from.z };
  const lengthSquared = (axis.x ** 2) + (axis.y ** 2) + (axis.z ** 2);
  const parameter = ((offset.x * axis.x) + (offset.y * axis.y) + (offset.z * axis.z)) / lengthSquared;
  if (parameter < -EPSILON_MM || parameter > 1 + EPSILON_MM) {
    throw new RangeError('TopologyEditSupportPlacement: attachment projected point lies outside the exact host segment.');
  }
  const bounded = Math.min(1, Math.max(0, parameter));
  const projected = interpolate(from, to, bounded);
  if (distance(projected, point) > EPSILON_MM) {
    throw new RangeError('TopologyEditSupportPlacement: attachment projected point is not on the exact host centerline.');
  }
  return bounded * host.lengthMm;
}
function certifiedOverride(value) {
  if (value?.authority !== CERTIFIED_SUPPORT_PLACEMENT_AUTHORITY) return null;
  const stationMm = finiteNonNegative(value.stationMm);
  const segmentParameter = finiteUnitInterval(value.segmentParameter);
  const origin = finitePoint(value.origin);
  return stationMm === null || segmentParameter === null || !origin
    ? null
    : { stationMm, segmentParameter, origin };
}
function interpolate(from, to, factor) {
  return deepFreeze({
    x: from.x + ((to.x - from.x) * factor),
    y: from.y + ((to.y - from.y) * factor),
    z: from.z + ((to.z - from.z) * factor),
  });
}
function finitePoint(value) {
  return value && [value.x, value.y, value.z].every(Number.isFinite)
    ? deepFreeze({ x: value.x, y: value.y, z: value.z })
    : null;
}
function finiteNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function finiteNonNegative(value) {
  const number = finiteNumber(value);
  return number !== null && number >= 0 ? number : null;
}
function finiteUnitInterval(value) {
  const number = finiteNumber(value);
  return number !== null && number >= 0 && number <= 1 ? number : null;
}
function distance(left, right) {
  return Math.hypot(right.x - left.x, right.y - left.y, right.z - left.z);
}
function exact(rows, id, label) {
  const matches = (rows ?? []).filter((row) => row?.id === id);
  if (matches.length !== 1) {
    throw new RangeError(`TopologyEditSupportPlacement: ${label} ${id} resolved ${matches.length} records.`);
  }
  return matches[0];
}
function requiredText(value, label) {
  const text = stringValue(value);
  if (!text) throw new TypeError(`TopologyEditSupportPlacement: ${label} is required.`);
  return text;
}
