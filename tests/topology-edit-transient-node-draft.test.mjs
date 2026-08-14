import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTopologyEditTransientNodeDraft,
  topologyEditTransientNodeDraftMap,
} from '../src/workspace/topology-edit/draft/topology-edit-transient-node-draft.js';
import {
  topologyEditTableVirtualGeometryFields,
} from '../src/workspace/topology-edit/table/topology-edit-table-virtual-geometry.js';

const topology = {
  canonicalTopologyHash: 'sha256:transient-node-basis',
  nodes: [
    { id: 'node:a', position: { x: 0, y: 0, z: 0 } },
    { id: 'node:b', position: { x: 1000, y: 0, z: 0 } },
  ],
};
const row = {
  identity: {
    canonicalKind: 'EDGE',
    canonicalId: 'edge:pipe',
    portBindings: [
      { endpoint: 'FROM', nodeId: 'node:a', portKey: 'pipe:start' },
      { endpoint: 'TO', nodeId: 'node:b', portKey: 'pipe:end' },
    ],
  },
};

test('transient interaction draft changes virtual display only', () => {
  const draft = createTopologyEditTransientNodeDraft({
    basisHash: topology.canonicalTopologyHash,
    nodeId: 'node:b',
    targetPosition: { x: 1200, y: 40, z: -10 },
    previewHash: 'fnv1a64:interaction-preview',
    source: 'INTERACTION',
  });
  const fields = topologyEditTableVirtualGeometryFields(
    row,
    topology,
    topologyEditTransientNodeDraftMap([draft]),
  );
  assert.equal(fields.toX, 1200);
  assert.equal(fields.toY, 40);
  assert.equal(fields.toZ, -10);
  assert.equal(fields.deltaX, 1200);
  assert.deepEqual(topology.nodes[1].position, { x: 1000, y: 0, z: 0 });
});

test('stale transient interaction draft fails closed to canonical display', () => {
  const draft = createTopologyEditTransientNodeDraft({
    basisHash: 'sha256:old-basis',
    nodeId: 'node:b',
    targetPosition: { x: 9999, y: 9999, z: 9999 },
    source: 'INTERACTION',
  });
  const fields = topologyEditTableVirtualGeometryFields(
    row,
    topology,
    topologyEditTransientNodeDraftMap([draft]),
  );
  assert.equal(fields.toX, 1000);
  assert.equal(fields.toY, 0);
  assert.equal(fields.toZ, 0);
});

test('transient node draft rejects non-canonical identity and non-finite coordinates', () => {
  assert.throws(() => createTopologyEditTransientNodeDraft({
    basisHash: topology.canonicalTopologyHash,
    nodeId: 'edge:not-a-node',
    targetPosition: { x: 1, y: 2, z: 3 },
  }), /exact node identity/);
  assert.throws(() => createTopologyEditTransientNodeDraft({
    basisHash: topology.canonicalTopologyHash,
    nodeId: 'node:b',
    targetPosition: { x: Number.NaN, y: 2, z: 3 },
  }), /finite x, y and z/);
});
