import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isTopologyEditTableResolvedEngineeringKey,
  isTopologyEditTableVirtualGeometryKey,
  topologyEditTableResolvedEngineeringFields,
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

test('resolved specification fields come from governed edge geometry and exact catalogue custody', () => {
  const target = row();
  target.custody = { catalogue: { recordId: 'PIPE-DN100-S40' } };
  const fields = topologyEditTableResolvedEngineeringFields(target, {
    ...topology,
    edges: [{
      id: 'edge:pipe',
      outsideDiameterMm: 114.3,
      wallThicknessMm: 6.02,
    }],
  });
  assert.equal(fields.outsideDiameterMm, 114.3);
  assert.equal(fields.wallThicknessMm, 6.02);
  assert.equal(fields.insideDiameterMm, 102.26);
  assert.equal(fields.catalogueRecordId, 'PIPE-DN100-S40');
  assert.equal(Object.isFrozen(fields), true);
});

test('virtual and resolved engineering keys remain explicit', () => {
  assert.equal(isTopologyEditTableVirtualGeometryKey('fromX'), true);
  assert.equal(isTopologyEditTableVirtualGeometryKey('deltaZ'), true);
  assert.equal(isTopologyEditTableVirtualGeometryKey('outsideDiameterMm'), false);
  assert.equal(isTopologyEditTableResolvedEngineeringKey('outsideDiameterMm'), true);
  assert.equal(isTopologyEditTableResolvedEngineeringKey('supportX'), true);
  assert.equal(isTopologyEditTableResolvedEngineeringKey('lengthMm'), false);
});
