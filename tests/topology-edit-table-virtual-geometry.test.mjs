import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isTopologyEditTableVirtualGeometryKey,
  topologyEditTableVirtualGeometryFields,
} from '../src/workspace/topology-edit/table/topology-edit-table-virtual-geometry.js';

function row() {
  return {
    identity: {
      canonicalKind: 'EDGE',
      canonicalId: 'edge:pipe',
      portBindings: [
        { endpoint: 'FROM', nodeId: 'node:a', portKey: 'pipe:start' },
        { endpoint: 'TO', nodeId: 'node:b', portKey: 'pipe:end' },
      ],
    },
  };
}

const topology = {
  nodes: [
    { id: 'node:a', position: { x: 10, y: 20, z: 30 } },
    { id: 'node:b', position: { x: 110, y: -30, z: 55 } },
  ],
};

test('virtual endpoint geometry resolves only exact row bindings and canonical nodes', () => {
  const fields = topologyEditTableVirtualGeometryFields(row(), topology);
  assert.deepEqual(fields, {
    fromNodeId: 'node:a', fromPortKey: 'pipe:start',
    fromX: 10, fromY: 20, fromZ: 30,
    toNodeId: 'node:b', toPortKey: 'pipe:end',
    toX: 110, toY: -30, toZ: 55,
    deltaX: 100, deltaY: -50, deltaZ: 25,
  });
  assert.equal(Object.isFrozen(fields), true);
});

test('ambiguous endpoint binding fails closed to unresolved presentation values', () => {
  const ambiguous = row();
  ambiguous.identity.portBindings.push({ endpoint: 'FROM', nodeId: 'node:b', portKey: 'other:start' });
  const fields = topologyEditTableVirtualGeometryFields(ambiguous, topology);
  assert.equal(fields.fromNodeId, null);
  assert.equal(fields.fromX, null);
  assert.equal(fields.deltaX, null);
  assert.equal(fields.toNodeId, 'node:b');
});

test('virtual geometry keys are explicit and do not claim unrelated fields', () => {
  assert.equal(isTopologyEditTableVirtualGeometryKey('fromX'), true);
  assert.equal(isTopologyEditTableVirtualGeometryKey('deltaZ'), true);
  assert.equal(isTopologyEditTableVirtualGeometryKey('lengthMm'), false);
});
