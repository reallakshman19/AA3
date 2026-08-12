import { deepFreeze, semanticHash, stringValue } from '../../core/shared-piping-model/index.js';
import {
  resolveTopologyEditSupportHostEdge,
} from './professional/topology-edit-support-geometry-dependency.js';

const SUPPORT_FAMILIES = new Set([
  'REST', 'HOLDOWN', 'GUIDE', 'LINE_STOP', 'LIMIT', 'CAN',
  'SPRING_WARNING', 'U_BOLT', 'SHOE', 'TRUNNION', 'HANGER',
  'SPRING_HANGER', 'ANCHOR',
]);
const DIRECTION_TOKENS = new Set([
  '+X', '-X', '+Y', '-Y', '+Z', '-Z',
  'LOCAL_X', 'LOCAL_Y', 'LOCAL_Z', 'GLOBAL_VERTICAL',
]);

export function normalizeTopologyEditSupportRestraintPayload(value = {}) {
  const supportId = requiredText(value.supportId, 'supportId');
  const family = requiredEnum(value.family, SUPPORT_FAMILIES, 'family');
  const direction = optionalEnum(value.direction, DIRECTION_TOKENS, 'direction');
  if (family !== 'ANCHOR' && !direction) {
    throw new TypeError('TopologyEditSupportRestraint: direction is required outside ANCHOR.');
  }
  const restraintId = stringValue(value.restraintId)
    || `restraint:table:${semanticHash({ supportId, authority: 'CERTIFIED_TABLE_OVERRIDE' }).split(':').at(-1)}`;
  return deepFreeze({
    supportId,
    restraintId,
    family,
    direction,
    gapMm: optionalNonNegative(value.gapMm, 'gapMm'),
    travelMm: optionalNonNegative(value.travelMm, 'travelMm'),
    authority: 'CERTIFIED_TABLE_OVERRIDE',
  });
}

export function resolveTopologyEditSupportRestraintTargets(topology, request) {
  const support = exact(topology.supports, request.payload.supportId, 'support');
  const host = resolveTopologyEditSupportHostEdge(topology, support);
  if (host.status !== 'RESOLVED' || !host.edgeId) {
    throw new RangeError(
      `TopologyEditSupportRestraint: support ${support.id} host authority is ${host.status}.`,
    );
  }
  const nodes = support.nodeId
    ? [target(topology.nodes, support.nodeId, 'NODE', 'SUPPORT_NODE')]
    : [];
  const hostEdge = target(topology.edges, host.edgeId, 'EDGE', 'SUPPORT_HOST');
  return {
    nodes,
    edges: [hostEdge],
    supports: [{
      kind: 'SUPPORT', role: 'UPDATED_SUPPORT', id: support.id,
      revision: semanticHash({ kind: 'SUPPORT', record: support }), record: support,
    }],
    endpointPortKeys: [],
  };
}

export function applyTopologyEditSupportRestraint(topology, command) {
  const support = exact(topology.supports, command.payload.supportId, 'support');
  support.restraint = {
    id: command.payload.restraintId,
    restraintId: command.payload.restraintId,
    type: command.payload.family,
    direction: command.payload.direction,
    gapMm: command.payload.gapMm,
    travelMm: command.payload.travelMm,
    authority: command.payload.authority,
    sourcePaths: [],
    updatedByCommandId: command.commandId,
  };
  support.restraintAuthority = command.payload.authority;
  support.updatedByCommandId = command.commandId;
  support.topologyOperation = 'UPDATE_SUPPORT_RESTRAINT';
  return topology;
}

export function validateTopologyEditSupportRestraintEffect(candidate) {
  const delta = candidate.topologyDelta;
  const changed = delta.supports?.changedIds ?? [];
  const other = [
    delta.nodes, delta.edges, delta.junctions, delta.boundaries, delta.rigids, delta.bends,
  ].flatMap(changes);
  const payload = candidate.resolvedPayload ?? {};
  const support = candidate.canonicalTopology.supports?.find((row) => (
    row.id === payload.supportId
  ));
  const valid = changed.length === 1
    && changed[0] === payload.supportId
    && (delta.supports?.addedIds ?? []).length === 0
    && (delta.supports?.removedIds ?? []).length === 0
    && other.length === 0
    && support?.restraint?.restraintId === payload.restraintId
    && support?.restraint?.type === payload.family
    && support?.restraint?.direction === payload.direction
    && numericOrNull(support?.restraint?.gapMm) === numericOrNull(payload.gapMm)
    && numericOrNull(support?.restraint?.travelMm) === numericOrNull(payload.travelMm)
    && support?.restraint?.authority === 'CERTIFIED_TABLE_OVERRIDE'
    && support?.updatedByCommandId === candidate.commandId;
  return valid ? [] : [{
    code: 'UPDATE_SUPPORT_RESTRAINT_DELTA_INVALID',
    message: 'UPDATE_SUPPORT_RESTRAINT must change exactly one canonical support with exact certified override evidence.',
    targetIds: [...new Set([payload.supportId, ...changed, ...other].filter(Boolean))].sort(),
  }];
}

function target(rows, id, kind, role) {
  const record = exact(rows, id, kind.toLowerCase());
  return {
    kind, role, id,
    revision: semanticHash({ kind, record }),
    record,
  };
}
function exact(rows, id, label) {
  const matches = (rows ?? []).filter((row) => row?.id === id);
  if (matches.length !== 1) {
    throw new RangeError(
      `TopologyEditSupportRestraint: ${label} ${id} resolved ${matches.length} records.`,
    );
  }
  return matches[0];
}
function changes(delta = {}) {
  return [...(delta.addedIds ?? []), ...(delta.removedIds ?? []), ...(delta.changedIds ?? [])];
}
function requiredText(value, label) {
  const text = stringValue(value);
  if (!text) throw new TypeError(`TopologyEditSupportRestraint: ${label} is required.`);
  return text;
}
function requiredEnum(value, allowed, label) {
  const token = requiredText(value, label).toUpperCase();
  if (!allowed.has(token)) {
    throw new RangeError(`TopologyEditSupportRestraint: unsupported ${label} ${token}.`);
  }
  return token;
}
function optionalEnum(value, allowed, label) {
  const text = stringValue(value);
  if (!text) return null;
  return requiredEnum(text, allowed, label);
}
function optionalNonNegative(value, label) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new RangeError(`TopologyEditSupportRestraint: ${label} must be non-negative.`);
  }
  return number;
}
function numericOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  return Number(value);
}
