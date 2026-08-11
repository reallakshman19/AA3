import { deepFreeze, stringValue } from '../../../core/shared-piping-model/index.js';

export const SUPPORT_GEOMETRY_POLICY_REQUIRED = 'SUPPORT_GEOMETRY_POLICY_REQUIRED';

export function resolveTopologyEditSupportHostEdge(topology, support) {
  const edges = Array.isArray(topology?.edges) ? topology.edges : [];
  const supportId = requiredText(support?.id, 'support.id');
  const explicit = stringValue(
    support?.hostEntityId || support?.edgeId || support?.attachedEdgeId,
  );
  if (explicit) {
    const matches = edges.filter((edge) => edgeMatchesHost(edge, explicit));
    return resolution(supportId, 'EXPLICIT', explicit, matches);
  }
  const nodeId = stringValue(support?.nodeId);
  if (!nodeId) return resolution(supportId, 'NONE', null, []);
  const matches = edges.filter((edge) => (
    edge?.fromNodeId === nodeId || edge?.toNodeId === nodeId
  ));
  return resolution(supportId, 'INCIDENT_NODE', nodeId, matches);
}

export function topologyEditAffectedEdgeIds(topology, movedNodeIds = []) {
  const moved = new Set(normalizeIds(movedNodeIds));
  return uniqueSorted((topology?.edges ?? []).filter((edge) => (
    moved.has(edge?.fromNodeId) || moved.has(edge?.toNodeId)
  )).map((edge) => edge.id));
}

export function topologyEditSupportGeometryDependencies(topology, input = {}) {
  const moved = new Set(normalizeIds(input.movedNodeIds));
  const affectedEdges = new Set(normalizeIds(input.affectedEdgeIds));
  const result = [];
  for (const support of topology?.supports ?? []) {
    const nodeId = stringValue(support?.nodeId) || null;
    const host = resolveTopologyEditSupportHostEdge(topology, support);
    const directNode = Boolean(nodeId && moved.has(nodeId));
    const candidateHostAffected = host.candidateEdgeIds.some((id) => affectedEdges.has(id));
    if (!directNode && !candidateHostAffected) continue;
    const reasons = [];
    if (directNode) reasons.push('MOVED_NODE');
    if (candidateHostAffected) {
      reasons.push(host.status === 'RESOLVED' ? 'HOST_EDGE' : 'HOST_EDGE_AUTHORITY');
    }
    result.push(deepFreeze({
      supportId: support.id,
      nodeId,
      hostStatus: host.status,
      hostSource: host.source,
      hostToken: host.hostToken,
      hostEdgeId: host.edgeId,
      candidateEdgeIds: host.candidateEdgeIds,
      reasons: uniqueSorted(reasons),
    }));
  }
  return deepFreeze(result.sort((left, right) => left.supportId.localeCompare(right.supportId)));
}

export function assertNoTopologyEditSupportGeometryDependencies(topology, input = {}) {
  const dependencies = topologyEditSupportGeometryDependencies(topology, input);
  if (!dependencies.length) return dependencies;
  const first = dependencies[0];
  const reason = first.reasons.join('+');
  const host = first.hostEdgeId ?? first.hostToken ?? '<unresolved-host>';
  const error = new RangeError(
    `TopologyEditSupportGeometryDependency: ${SUPPORT_GEOMETRY_POLICY_REQUIRED}: `
      + `support ${first.supportId} depends on affected geometry (${reason}; ${host}).`,
  );
  error.code = SUPPORT_GEOMETRY_POLICY_REQUIRED;
  error.dependencies = dependencies;
  throw error;
}

function resolution(supportId, source, hostToken, matches) {
  const candidateEdgeIds = uniqueSorted(matches.map((edge) => edge.id));
  const status = matches.length === 1 ? 'RESOLVED'
    : matches.length > 1 ? 'AMBIGUOUS' : 'UNRESOLVED';
  return deepFreeze({
    supportId,
    status,
    source,
    hostToken,
    edgeId: matches.length === 1 ? matches[0].id : null,
    candidateEdgeIds,
  });
}
function edgeMatchesHost(edge, token) {
  return [edge?.id, edge?.componentKey].map(stringValue).includes(token);
}
function normalizeIds(values) {
  return uniqueSorted((Array.isArray(values) ? values : []).map(stringValue).filter(Boolean));
}
function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
function requiredText(value, label) {
  const text = stringValue(value);
  if (!text) throw new TypeError(`TopologyEditSupportGeometryDependency: ${label} is required.`);
  return text;
}
