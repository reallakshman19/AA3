import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SUPPORT_GEOMETRY_POLICY_REQUIRED,
  assertNoTopologyEditSupportGeometryDependencies,
  resolveTopologyEditSupportHostEdge,
  topologyEditAffectedEdgeIds,
  topologyEditSupportGeometryDependencies,
} from '../src/workspace/topology-edit/professional/topology-edit-support-geometry-dependency.js';

function topology() {
  return {
    nodes: [
      { id: 'node:a', position: { x: 0, y: 0, z: 0 } },
      { id: 'node:b', position: { x: 100, y: 0, z: 0 } },
      { id: 'node:c', position: { x: 200, y: 0, z: 0 } },
      { id: 'node:d', position: { x: 300, y: 0, z: 0 } },
    ],
    edges: [
      { id: 'edge:ab', componentKey: 'P-AB', fromNodeId: 'node:a', toNodeId: 'node:b' },
      { id: 'edge:bc', componentKey: 'P-BC', fromNodeId: 'node:b', toNodeId: 'node:c' },
      { id: 'edge:cd', componentKey: 'P-CD', fromNodeId: 'node:c', toNodeId: 'node:d' },
    ],
    supports: [
      { id: 'support:node', entityId: 'S-NODE', nodeId: 'node:a' },
      { id: 'support:host', entityId: 'S-HOST', hostEntityId: 'P-BC', stationMm: 50 },
      { id: 'support:other', entityId: 'S-OTHER', hostEntityId: 'edge:cd', stationMm: 25 },
    ],
  };
}

test('support host resolution uses explicit edge/component identity and exact node fallback', () => {
  const model = topology();
  const explicit = resolveTopologyEditSupportHostEdge(model, model.supports[1]);
  assert.equal(explicit.status, 'RESOLVED');
  assert.equal(explicit.source, 'EXPLICIT');
  assert.equal(explicit.edgeId, 'edge:bc');

  const fallback = resolveTopologyEditSupportHostEdge(model, model.supports[0]);
  assert.equal(fallback.status, 'RESOLVED');
  assert.equal(fallback.source, 'INCIDENT_NODE');
  assert.equal(fallback.edgeId, 'edge:ab');
});

test('geometry dependency authority finds node-linked and edge-hosted supports only in affected scope', () => {
  const model = topology();
  const movedNodeIds = ['node:b'];
  const affectedEdgeIds = topologyEditAffectedEdgeIds(model, movedNodeIds);
  assert.deepEqual(affectedEdgeIds, ['edge:ab', 'edge:bc']);

  const dependencies = topologyEditSupportGeometryDependencies(model, {
    movedNodeIds,
    affectedEdgeIds,
  });
  assert.deepEqual(dependencies.map((row) => row.supportId), [
    'support:host', 'support:node',
  ]);
  assert.deepEqual(dependencies.find((row) => row.supportId === 'support:host').reasons, ['HOST_EDGE']);
  assert.deepEqual(dependencies.find((row) => row.supportId === 'support:node').reasons, ['HOST_EDGE']);
  assert.equal(dependencies.some((row) => row.supportId === 'support:other'), false);
});

test('direct node attachment blocks even when host resolution is ambiguous', () => {
  const model = topology();
  model.edges.push({
    id: 'edge:ax', componentKey: 'P-AX', fromNodeId: 'node:a', toNodeId: 'node:c',
  });
  const dependencies = topologyEditSupportGeometryDependencies(model, {
    movedNodeIds: ['node:a'],
    affectedEdgeIds: ['edge:ab'],
  });
  const dependency = dependencies.find((row) => row.supportId === 'support:node');
  assert.equal(dependency.hostStatus, 'AMBIGUOUS');
  assert.ok(dependency.reasons.includes('MOVED_NODE'));
});

test('ambiguous explicit host matching an affected candidate fails closed with stable code', () => {
  const model = topology();
  model.edges.push({
    id: 'edge:duplicate', componentKey: 'P-BC', fromNodeId: 'node:c', toNodeId: 'node:d',
  });
  const dependencies = topologyEditSupportGeometryDependencies(model, {
    affectedEdgeIds: ['edge:bc'],
  });
  const dependency = dependencies.find((row) => row.supportId === 'support:host');
  assert.equal(dependency.hostStatus, 'AMBIGUOUS');
  assert.deepEqual(dependency.reasons, ['HOST_EDGE_AUTHORITY']);

  assert.throws(() => assertNoTopologyEditSupportGeometryDependencies(model, {
    affectedEdgeIds: ['edge:bc'],
  }), (error) => (
    error instanceof RangeError
    && error.code === SUPPORT_GEOMETRY_POLICY_REQUIRED
    && /SUPPORT_GEOMETRY_POLICY_REQUIRED/.test(error.message)
  ));
});
