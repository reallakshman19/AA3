import {
  deriveTopologyEditChangedScope,
} from '../professional/topology-edit-change-scope.js';
import {
  createTopologyEditOperationPlan,
} from '../professional/topology-edit-operation-plan.js';
import { planMoveConnectedRun } from '../professional/topology-edit-route-operations.js';

const EPSILON_MM = 1e-9;
const NODE_DEPENDANT_COLLECTIONS = Object.freeze([
  'junctions', 'supports', 'boundaries', 'rigids', 'bends',
]);

export function compileTopologyEditTableNodePosition(intent, topology) {
  const edge = exact(topology.edges, intent.target.canonicalId, 'EDGE');
  const endpoint = intent.requestedValue.endpoint;
  const endpointKey = endpoint === 'FROM' ? 'fromNodeId' : 'toNodeId';
  const anchorKey = endpoint === 'FROM' ? 'toNodeId' : 'fromNodeId';
  if (edge[endpointKey] !== intent.requestedValue.nodeId) {
    throw new Error(
      `TopologyEditTableEngineeringPlanner: ${endpoint} endpoint binding changed before NODE_POSITION planning.`,
    );
  }
  const node = exact(topology.nodes, intent.requestedValue.nodeId, 'node');
  if (!samePoint(node.position, intent.requestedValue.expectedPosition)) {
    throw new Error(
      `TopologyEditTableEngineeringPlanner: node ${node.id} position changed before NODE_POSITION planning.`,
    );
  }
  const deltaMm = subtract(intent.requestedValue.position, node.position);
  if (!(magnitude(deltaMm) > EPSILON_MM)) {
    throw new RangeError(`TopologyEditTableEngineeringPlanner: NODE_POSITION for ${node.id} is a no-op.`);
  }
  return intent.geometryPolicy.movementMode === 'NODE_ONLY'
    ? planNodeOnly(intent, topology, edge, node)
    : planConnectedRun(intent, topology, edge, node, deltaMm);
}

function planNodeOnly(intent, topology, edge, node) {
  assertNoNodeDependants(topology, new Set([node.id]));
  const edgeIds = incidentEdgeIds(topology, new Set([node.id]));
  const changedScope = deriveTopologyEditChangedScope(topology, {
    basisHash: topology.canonicalTopologyHash,
    nodeIds: [node.id],
    edgeIds,
  });
  return createTopologyEditOperationPlan({
    operationType: 'COMPOSITE_ENGINEERING_EDIT',
    basisHash: topology.canonicalTopologyHash,
    targetIds: uniqueSorted([edge.id, node.id, ...edgeIds]),
    parameters: parameters(intent, edge, node, 'TABLE_NODE_POSITION'),
    commandIntents: [{
      commandType: 'MOVE_NODE',
      payload: { nodeId: node.id, position: intent.requestedValue.position },
    }],
    changedScope,
    unresolvedEvidence: [],
  });
}

function planConnectedRun(intent, topology, edge, node, deltaMm) {
  if (intent.geometryPolicy.movementMode !== 'CONNECTED_RUN') {
    throw new RangeError(
      `TopologyEditTableEngineeringPlanner: unsupported NODE_POSITION movement mode ${intent.geometryPolicy.movementMode}.`,
    );
  }
  const endpoint = intent.requestedValue.endpoint;
  const anchorNodeId = endpoint === 'FROM' ? edge.toNodeId : edge.fromNodeId;
  const movedNodeIds = edgeComponentWithout(topology, node.id, edge.id);
  if (movedNodeIds.includes(anchorNodeId)) {
    throw new RangeError(
      `TopologyEditTableEngineeringPlanner: ${edge.id} lies on a cycle; connected-run translation is ambiguous.`,
    );
  }
  assertNoNodeDependants(topology, new Set(movedNodeIds));
  const movement = planMoveConnectedRun({
    topology,
    basisHash: topology.canonicalTopologyHash,
    nodeIds: movedNodeIds,
    boundaryNodeIds: [anchorNodeId],
    deltaMm,
  });
  return createTopologyEditOperationPlan({
    operationType: 'MOVE_CONNECTED_RUN',
    basisHash: topology.canonicalTopologyHash,
    targetIds: uniqueSorted([edge.id, ...movement.targetIds]),
    parameters: {
      ...parameters(intent, edge, node, 'TABLE_NODE_POSITION_CONNECTED_RUN'),
      deltaMm,
    },
    commandIntents: movement.commandIntents,
    changedScope: movement.changedScope,
    unresolvedEvidence: movement.unresolvedEvidence ?? [],
  });
}

function parameters(intent, edge, node, aggregateKind) {
  return {
    aggregateKind,
    movementMode: intent.geometryPolicy.movementMode,
    sourceEdgeId: edge.id,
    endpoint: intent.requestedValue.endpoint,
    nodeId: node.id,
    priorPosition: node.position,
    requestedPosition: intent.requestedValue.position,
  };
}
function edgeComponentWithout(topology, startNodeId, blockedEdgeId) {
  const adjacency = new Map((topology.nodes ?? []).map((node) => [node.id, []]));
  for (const edge of topology.edges ?? []) {
    if (edge.id === blockedEdgeId) continue;
    adjacency.get(edge.fromNodeId)?.push(edge.toNodeId);
    adjacency.get(edge.toNodeId)?.push(edge.fromNodeId);
  }
  const visited = new Set([startNodeId]);
  const queue = [startNodeId];
  while (queue.length) {
    const current = queue.shift();
    for (const peer of [...(adjacency.get(current) ?? [])].sort()) {
      if (visited.has(peer)) continue;
      visited.add(peer);
      queue.push(peer);
    }
  }
  return [...visited].sort();
}
function assertNoNodeDependants(topology, moved) {
  for (const collection of NODE_DEPENDANT_COLLECTIONS) {
    for (const record of topology[collection] ?? []) {
      if (!recordNodeIds(record).some((id) => moved.has(id))) continue;
      throw new RangeError(
        `TopologyEditTableEngineeringPlanner: NODE_POSITION crosses ${collection} record ${record.id}; certified dependent geometry policy is required.`,
      );
    }
  }
}
function incidentEdgeIds(topology, moved) {
  return uniqueSorted((topology.edges ?? []).filter((edge) => (
    moved.has(edge.fromNodeId) || moved.has(edge.toNodeId)
  )).map((edge) => edge.id));
}
function recordNodeIds(record) {
  return uniqueSorted([
    record?.nodeId, record?.fromNodeId, record?.toNodeId,
    ...(record?.nodeIds ?? []), ...(record?.fromNodeIds ?? []), ...(record?.toNodeIds ?? []),
  ].filter(Boolean));
}
function exact(rows, id, label) {
  const matches = (rows ?? []).filter((row) => row?.id === id);
  if (matches.length !== 1) {
    throw new RangeError(`TopologyEditTableEngineeringPlanner: ${label} ${id} resolved ${matches.length} records.`);
  }
  return matches[0];
}
function uniqueSorted(values) { return [...new Set(values)].sort((a, b) => a.localeCompare(b)); }
function subtract(left, right) { return { x: left.x - right.x, y: left.y - right.y, z: left.z - right.z }; }
function magnitude(value) { return Math.hypot(value.x, value.y, value.z); }
function samePoint(left, right) {
  return left && right
    && nearlyEqual(left.x, right.x)
    && nearlyEqual(left.y, right.y)
    && nearlyEqual(left.z, right.z);
}
function nearlyEqual(left, right) {
  return Math.abs(Number(left) - Number(right)) <= EPSILON_MM;
}
