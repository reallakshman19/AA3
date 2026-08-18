#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  lafeaQuadraticEdgeControlPoint,
  lafeaRetainedMeshDisplayBoundary,
} from '../src/workspace/lafea-canvas/retained-mesh-display-topology.js';

const t6Nodes = new Map([
  ['C1', point('C1', 0, 0)],
  ['C2', point('C2', 2, 0)],
  ['C3', point('C3', 0, 2)],
  ['M12', point('M12', 1, 0.5)],
  ['M23', point('M23', 1, 1)],
  ['M31', point('M31', 0, 1)],
]);
const t6 = lafeaRetainedMeshDisplayBoundary({
  elementId: 'T6-1',
  elementType: 'T6',
  nodeIds: ['C1', 'C2', 'C3', 'M12', 'M23', 'M31'],
}, t6Nodes);
assert.equal(t6.kind, 'QUADRATIC_LOOP');
assert.equal(t6.edges.length, 3);
assert.deepEqual(t6.edges.map((edge) => edge.midside.nodeId), ['M12', 'M23', 'M31']);
for (const edge of t6.edges) assertMidpointInterpolation(edge);
assert.deepEqual(t6.edges[0].control, { x: 1, y: 1 });

const q8Nodes = new Map([
  ['Q1', point('Q1', 0, 0)],
  ['Q2', point('Q2', 4, 0)],
  ['Q3', point('Q3', 4, 3)],
  ['Q4', point('Q4', 0, 3)],
  ['M12', point('M12', 2, -0.5)],
  ['M23', point('M23', 4, 1.5)],
  ['M34', point('M34', 2, 3)],
  ['M41', point('M41', 0, 1.5)],
]);
const q8 = lafeaRetainedMeshDisplayBoundary({
  elementId: 'Q8-1',
  elementType: 'Q8',
  nodeIds: ['Q1', 'Q2', 'Q3', 'Q4', 'M12', 'M23', 'M34', 'M41'],
}, q8Nodes);
assert.equal(q8.kind, 'QUADRATIC_LOOP');
assert.equal(q8.edges.length, 4);
assert.deepEqual(q8.edges.map((edge) => edge.midside.nodeId), ['M12', 'M23', 'M34', 'M41']);
for (const edge of q8.edges) assertMidpointInterpolation(edge);
assert.deepEqual(q8.edges[0].control, { x: 2, y: -1 });

const t3Nodes = new Map([
  ['A', point('A', 0, 0)], ['B', point('B', 1, 0)], ['C', point('C', 0, 1)],
]);
const t3 = lafeaRetainedMeshDisplayBoundary({
  elementId: 'T3-1', elementType: 'T3', nodeIds: ['A', 'B', 'C'],
}, t3Nodes);
assert.equal(t3.kind, 'POLYGON');
assert.deepEqual(t3.points.map((node) => node.nodeId), ['A', 'B', 'C']);

assert.throws(
  () => lafeaRetainedMeshDisplayBoundary({
    elementId: 'BAD-T6', elementType: 'T6', nodeIds: ['C1', 'C2', 'C3', 'M12', 'M23'],
  }, t6Nodes),
  /LAFEA_RETAINED_MESH_DISPLAY_T6_NODE_COUNT_INVALID/u,
);
assert.throws(
  () => lafeaQuadraticEdgeControlPoint({ x: 0, y: 0 }, { x: Number.NaN, y: 0 }, { x: 1, y: 0 }),
  /LAFEA_RETAINED_MESH_DISPLAY_MIDSIDE_INVALID/u,
);

console.log(JSON.stringify({
  check: 'lafea-retained-mesh-display-topology',
  status: 'PASS',
  t6QuadraticEdges: 3,
  q8QuadraticEdges: 4,
  exactMidsideInterpolationAtHalfCoordinate: true,
  rawHighOrderStorageOrderNotUsedAsPolygonBoundary: true,
}));

function assertMidpointInterpolation(edge) {
  const pointAtHalf = {
    x: 0.25 * edge.start.x + 0.5 * edge.control.x + 0.25 * edge.end.x,
    y: 0.25 * edge.start.y + 0.5 * edge.control.y + 0.25 * edge.end.y,
  };
  assert.ok(Math.abs(pointAtHalf.x - edge.midside.x) <= 1e-12);
  assert.ok(Math.abs(pointAtHalf.y - edge.midside.y) <= 1e-12);
}

function point(nodeId, x, y) { return Object.freeze({ nodeId, x, y, z: 0 }); }
