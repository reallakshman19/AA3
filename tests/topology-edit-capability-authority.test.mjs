import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deriveTopologyEditCommandCapability,
  deriveTopologyEditProfessionalCapability,
} from '../src/workspace/topology-edit/editor-state/topology-edit-capability-authority.js';
import {
  deriveTopologyEditTableCellCapability,
} from '../src/workspace/topology-edit/table/topology-edit-table-edit-capability.js';

function topology(edges) {
  const ids = new Set(edges.flatMap((edge) => [edge.fromNodeId, edge.toNodeId]));
  const nodes = [...ids].sort().map((id, index) => ({
    id,
    position: { x: index * 100, y: 0, z: 0 },
  }));
  return {
    canonicalTopologyHash: `canonical:${edges.length}:${nodes.length}`,
    nodes, edges, junctions: [], supports: [], boundaries: [], rigids: [], bends: [],
  };
}

test('exact-gap command is blocked for nodes in the same connected component', () => {
  const model = topology([{ id: 'edge:a-b', fromNodeId: 'node:a', toNodeId: 'node:b' }]);
  const receipt = deriveTopologyEditCommandCapability({
    actionId: 'set-gap-3', selection: { nodeIds: ['node:a', 'node:b'], edgeId: null }, topology: model,
  });
  assert.equal(receipt.status, 'BLOCKED');
  assert.equal(receipt.reasonCode, 'EXACT_GAP_CONTEXT_INVALID');
});

test('exact-gap command is available for graph-open endpoints in separate components', () => {
  const model = topology([
    { id: 'edge:a-x', fromNodeId: 'node:a', toNodeId: 'node:x' },
    { id: 'edge:b-y', fromNodeId: 'node:b', toNodeId: 'node:y' },
  ]);
  const receipt = deriveTopologyEditCommandCapability({
    actionId: 'set-gap-3', selection: { nodeIds: ['node:a', 'node:b'], edgeId: null }, topology: model,
  });
  assert.equal(receipt.status, 'AVAILABLE');
});

test('node move capability is truthful about support-host geometry policy', () => {
  const model = topology([
    { id: 'edge:a-b', componentKey: 'P-AB', fromNodeId: 'node:a', toNodeId: 'node:b' },
    { id: 'edge:c-d', componentKey: 'P-CD', fromNodeId: 'node:c', toNodeId: 'node:d' },
  ]);
  model.supports.push({ id: 'support:s1', hostEntityId: 'P-AB', stationMm: 20 });
  const blocked = deriveTopologyEditCommandCapability({
    actionId: 'move-positive-z', selection: { nodeIds: ['node:a'] }, topology: model,
  });
  assert.equal(blocked.status, 'UNREPRESENTABLE');
  assert.equal(blocked.reasonCode, 'SUPPORT_GEOMETRY_POLICY_REQUIRED');
  const available = deriveTopologyEditCommandCapability({
    actionId: 'move-positive-z', selection: { nodeIds: ['node:c'] }, topology: model,
  });
  assert.equal(available.status, 'AVAILABLE');
});

test('professional offset without an isolated corner is unrepresentable, not a generic failure', () => {
  const model = topology([
    { id: 'edge:a-x', fromNodeId: 'node:a', toNodeId: 'node:x' },
    { id: 'edge:b-y', fromNodeId: 'node:b', toNodeId: 'node:y' },
  ]);
  const receipt = deriveTopologyEditProfessionalCapability({
    topology: model, selection: { nodeIds: ['node:a', 'node:b'], edgeId: null },
    values: { operationType: 'CREATE_ORTHOGONAL_OFFSET' },
  });
  assert.equal(receipt.status, 'UNREPRESENTABLE');
  assert.equal(receipt.reasonCode, 'ARBITRARY_CORNER_NODE_CREATION_UNAVAILABLE');
});

test('extend operation is blocked when selected endpoint is not graph-open', () => {
  const model = topology([
    { id: 'edge:a-b', fromNodeId: 'node:a', toNodeId: 'node:b' },
    { id: 'edge:b-c', fromNodeId: 'node:b', toNodeId: 'node:c' },
  ]);
  const receipt = deriveTopologyEditProfessionalCapability({
    topology: model, selection: { nodeIds: [], edgeId: 'edge:a-b' },
    values: { operationType: 'EXTEND_EDGE', edgeId: 'edge:a-b', endpoint: 'TO', distanceMm: 100 },
  });
  assert.equal(receipt.status, 'BLOCKED');
  assert.equal(receipt.reasonCode, 'ENDPOINT_NOT_GRAPH_OPEN');
});

test('Table exposes certified restraint and station editors while host rebinding stays read-only', () => {
  const pipe = row('PIPE', 'EDGE', { lengthMm: 1000 });
  const bend = row('ELBOW', 'BEND', { radiusMm: 250 });
  const support = row('SUPPORT', 'SUPPORT', { gapMm: 2, stationMm: 40, hostEntityId: 'pipe:p1' });
  assert.equal(deriveTopologyEditTableCellCapability({ row: pipe, columnKey: 'lengthMm' }).status, 'AVAILABLE');
  const bendCapability = deriveTopologyEditTableCellCapability({ row: bend, columnKey: 'radiusMm' });
  assert.equal(bendCapability.status, 'UNREPRESENTABLE');
  assert.equal(bendCapability.reasonCode, 'TABLE_INTENT_NOT_CERTIFIED');
  const restraint = deriveTopologyEditTableCellCapability({ row: support, columnKey: 'gapMm' });
  assert.equal(restraint.status, 'NEEDS_INPUT');
  assert.equal(restraint.reasonCode, 'EXPLICIT_SUPPORT_RESTRAINT_REQUIRED');
  assert.equal(restraint.details.intentKind, 'SUPPORT_RESTRAINT');
  const station = deriveTopologyEditTableCellCapability({ row: support, columnKey: 'stationMm' });
  assert.equal(station.status, 'NEEDS_INPUT');
  assert.equal(station.reasonCode, 'EXPLICIT_SUPPORT_STATION_REQUIRED');
  assert.equal(station.details.intentKind, 'SUPPORT_PLACEMENT');
  const host = deriveTopologyEditTableCellCapability({ row: support, columnKey: 'hostEntityId' });
  assert.equal(host.status, 'BLOCKED');
  assert.equal(host.reasonCode, 'READ_ONLY_PROPERTY');
});

function row(elementType, canonicalKind, fields) {
  return { elementType, identity: { canonicalKind, canonicalId: `${elementType.toLowerCase()}:fixture` }, fields };
}
