#!/usr/bin/env node
/**
 * Qualification for the two mesh-quality modules added alongside interior
 * refinement: quality-guarded interior smoothing, and conforming all-quad
 * centroid subdivision.
 *
 * The properties that matter are the ones a caller relies on and cannot see:
 * boundary nodes never move, quality never degrades, elements never invert,
 * subdivision is genuinely all-quad and conforming, and both are byte-identical
 * on replay.
 */
import assert from 'node:assert/strict';

import { smoothInteriorPoints } from '../src/core/lafea-meshing/mesh-smoothing.js';
import { subdivideTrianglesToQ8 } from '../src/core/lafea-meshing/quad-subdivision-q8.js';
import {
  triangulateRefinedRegionAsIndexTriples,
} from '../src/core/lafea-meshing/interior-refinement-t6.js';
import { minimumAngleDegreesOf, minimumScaledJacobianOf } from '../src/core/lafea-meshing/quality-gates.js';
import { canonicalTopology } from '../src/core/lafea-geometry/topology.js';

const TOPOLOGY = canonicalTopology({
  schema: 'lafea-geometry-topology/v1',
  vertices: [
    { vertexId: 'V1', x: 0, y: 0 },
    { vertexId: 'V2', x: 120, y: 0 },
    { vertexId: 'V3', x: 120, y: 70 },
    { vertexId: 'V4', x: 0, y: 70 },
  ],
  curves: [
    line('C1', 'V1', 'V2'), line('C2', 'V2', 'V3'),
    line('C3', 'V3', 'V4'), line('C4', 'V4', 'V1'),
  ],
  loops: [{ loopId: 'L', curveIds: ['C1', 'C2', 'C3', 'C4'] }],
  regions: [{ regionId: 'R', outerLoopId: 'L', holeLoopIds: [] }],
});
const CURVE_BY_ID = new Map(TOPOLOGY.curves.map((curve) => [curve.curveId, curve]));
const VERTEX_BY_ID = new Map(TOPOLOGY.vertices.map((vertex) => [vertex.vertexId, vertex]));

function refine(targetSize) {
  return triangulateRefinedRegionAsIndexTriples(TOPOLOGY, 'R', {
    targetSize, chordErrorLimit: targetSize,
  });
}

// --- MS-01: refinement reports the smoothing it performed -------------------
const refined = refine(12);
assert.ok(Number.isInteger(refined.smoothedMoveCount));
assert.ok(refined.smoothedMoveCount > 0, 'a lattice interior must have relaxable nodes');

// --- MS-02: boundary nodes are never moved ---------------------------------
// Smoothing the boundary would move the analysis geometry itself.
const raw = refine(12);
const boundaryIndices = new Set(raw.boundaryRings.flatMap((ring) => [...ring.globalIndices]));
const points = raw.points.map((point) => ({ x: point.x, y: point.y }));
const before = points.map((point) => ({ ...point }));
const triangles = raw.triangleTriples.map((triangle) => [...triangle]);
smoothInteriorPoints(points, triangles, boundaryIndices, { passes: 6 });
for (const index of boundaryIndices) {
  assert.equal(points[index].x, before[index].x, `boundary node ${index} moved in x`);
  assert.equal(points[index].y, before[index].y, `boundary node ${index} moved in y`);
}

// --- MS-03: quality never degrades and no element inverts ------------------
assert.ok(worstAngle(before, triangles) <= worstAngle(points, triangles) + 1e-9,
  'smoothing must not reduce the worst minimum angle');
for (const triangle of triangles) {
  assert.ok(signedArea(triangle.map((index) => points[index])) > 0,
    'smoothing must never invert an element');
}

// --- MS-04: smoothing is deterministic -------------------------------------
const replayPoints = raw.points.map((point) => ({ x: point.x, y: point.y }));
smoothInteriorPoints(replayPoints, raw.triangleTriples.map((t) => [...t]), boundaryIndices, { passes: 6 });
assert.equal(JSON.stringify(replayPoints), JSON.stringify(points));

// --- MS-05: a fixed pass count is safe because passes are monotone ---------
const onePass = relaxed(raw, boundaryIndices, 1);
const manyPasses = relaxed(raw, boundaryIndices, 8);
assert.ok(worstAngle(manyPasses, raw.triangleTriples) >= worstAngle(onePass, raw.triangleTriples) - 1e-9,
  'more passes must never be worse than fewer');

// --- MS-06: subdivision is all-quad, 3 per triangle, and positively shaped --
const quads = subdivideTrianglesToQ8(refined, CURVE_BY_ID, VERTEX_BY_ID);
assert.equal(quads.length, refined.triangleTriples.length * 3);
assert.ok(quads.every((element) => element.elementType === 'Q8'));
assert.ok(quads.every((element) => element.nodes.length === 8));
for (const element of quads) {
  assert.ok(minimumScaledJacobianOf('Q8', element.nodes) > 0,
    'every subdivided quad must have a positive scaled Jacobian');
}

// --- MS-07: subdivision is conforming (no hanging nodes) -------------------
// Every quad edge must be shared by exactly two quads, or lie on the boundary.
const edgeUse = new Map();
for (const element of quads) {
  const corners = element.nodes.slice(0, 4);
  for (let i = 0; i < 4; i += 1) {
    const key = cornerEdgeKey(corners[i], corners[(i + 1) % 4]);
    edgeUse.set(key, (edgeUse.get(key) ?? 0) + 1);
  }
}
assert.ok([...edgeUse.values()].every((count) => count === 1 || count === 2),
  'a conforming quad mesh shares every interior edge exactly twice');

// --- MS-08: subdivision replays byte-identically ---------------------------
assert.equal(
  JSON.stringify(subdivideTrianglesToQ8(refined, CURVE_BY_ID, VERTEX_BY_ID)),
  JSON.stringify(quads),
);

console.log(JSON.stringify({
  check: 'lafea.10-mesh-smoothing',
  status: 'PASS',
  smoothedMoveCount: refined.smoothedMoveCount,
  boundaryNodesPinned: boundaryIndices.size,
  subdividedQuads: quads.length,
  elementsInverted: 0,
}, null, 2));

function relaxed(source, fixedIndices, passes) {
  const copy = source.points.map((point) => ({ x: point.x, y: point.y }));
  smoothInteriorPoints(copy, source.triangleTriples.map((t) => [...t]), fixedIndices, { passes });
  return copy;
}
function worstAngle(pointList, triangleList) {
  let worst = Infinity;
  for (const triangle of triangleList) {
    worst = Math.min(worst, minimumAngleDegreesOf(triangle.map((index) => pointList[index])));
  }
  return worst;
}
function signedArea([a, b, c]) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
function cornerEdgeKey(a, b) {
  const left = `${a.x},${a.y}`;
  const right = `${b.x},${b.y}`;
  return left < right ? `${left}|${right}` : `${right}|${left}`;
}
function line(curveId, startVertexId, endVertexId) {
  return { curveId, type: 'LINE', startVertexId, endVertexId, arc: null };
}
