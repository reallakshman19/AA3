import { smoothInteriorPoints } from './mesh-smoothing.js';
import { LafeaMeshingError } from './errors.js';
import { discretizeLoop } from './boundary-discretization.js';
import {
  boundaryEdgeLookup,
  edgeKey,
  lawsonFlip,
  triangulateRegionAsIndexTriples,
} from './constrained-delaunay-t6.js';
import { lafeaHoleFrontGradingPolicy } from './hole-front-grading-policy.js';

/**
 * Deterministic constrained-Delaunay refinement for a planar LAFEA.3 region.
 *
 * The outer loop is triangulated first. Every hole-loop corner is then inserted
 * as a true triangulation vertex, and every consecutive hole edge is recovered
 * by deterministic edge flipping before triangles inside the hole are removed.
 * The resulting multiply-connected material domain is refined with a staggered
 * triangular Steiner lattice. Hole boundaries whose local constrained spacing
 * is materially finer than the global interior spacing then receive a bounded,
 * deterministic two-layer material-side transition front before the final
 * Lawson pass. Straight boundaries already discretized near the target size do
 * not receive an unnecessary front.
 *
 * No artificial bridge/seam is introduced. Boundary midsides remain owned by
 * their analytic source curve through `edgesByCornerPair`, so T6/Q8 upgrade can
 * place a circular-hole midside on the true arc rather than on its chord.
 */
export const LAFEA_INTERIOR_REFINEMENT_REVISION = 'LAFEA.10.CDT-HOLES-TRI.V5';

const EPS = 1e-12;
const TRIANGULAR_ROW_HEIGHT_FACTOR = Math.sqrt(3) / 2;
const BOUNDARY_CLEARANCE_FACTOR = 0.25;
const POINT_CLEARANCE_FACTOR = 0.12;
const HOLE_FRONT_LAYER_COUNT = 2;
const HOLE_FRONT_TARGET_CLEARANCE_FACTOR = 0.18;
const HOLE_FRONT_EDGE_CLEARANCE_FACTOR = 0.45;
/** Fixed round count keeps smoothing deterministic; quality is monotone per round. */
const SMOOTHING_ROUNDS = 3;

/**
 * @param {Readonly<object>} topology Canonical core topology.
 * @param {string} regionId Region identifier.
 * @param {{targetSize:number,chordErrorLimit:number,minimumSegmentsByCurveId?:Map<string,number>,
 *   adjacentSizeRatioMax?:number}} options
 */
export function triangulateRefinedRegionAsIndexTriples(topology, regionId, options) {
  const region = topology.regions.find((candidate) => candidate.regionId === regionId);
  if (!region) throw new LafeaMeshingError(`Unresolved region: ${regionId}`, 'UNRESOLVED_REGION');
  if (!(options?.targetSize > 0)) {
    throw new LafeaMeshingError('targetSize must be positive', 'INVALID_TARGET_SIZE');
  }
  const holeFrontPolicy = lafeaHoleFrontGradingPolicy(options?.adjacentSizeRatioMax);

  const curveById = new Map(topology.curves.map((curve) => [curve.curveId, curve]));
  const vertexById = new Map(topology.vertices.map((vertex) => [vertex.vertexId, vertex]));
  const outerLoop = topology.loops.find((loop) => loop.loopId === region.outerLoopId);
  if (!outerLoop) throw new LafeaMeshingError('Outer loop is unresolved', 'UNRESOLVED_OUTER_LOOP');

  const outer = discretizeLoop(outerLoop, curveById, vertexById, options);
  const base = triangulateRegionAsIndexTriples(outer.ringCorners);
  const points = base.points.map((point) => ({ x: point.x, y: point.y }));
  const triangles = base.triangleTriples.map((triangle) => [...triangle]);
  const constrainedEdgeKeys = new Set(base.boundaryEdgeKeys);
  const edgesByCornerPair = boundaryEdgeLookup(outer.edges, outer.ringCorners);
  const boundaryRings = [{
    role: 'OUTER',
    loopId: outerLoop.loopId,
    ringCorners: outer.ringCorners,
    globalIndices: outer.ringCorners.map((_, index) => index),
  }];

  for (const holeLoopId of region.holeLoopIds) {
    const holeLoop = topology.loops.find((loop) => loop.loopId === holeLoopId);
    if (!holeLoop) throw new LafeaMeshingError(`Unresolved hole loop: ${holeLoopId}`, 'UNRESOLVED_HOLE_LOOP');
    const hole = discretizeLoop(holeLoop, curveById, vertexById, options);
    const globalIndices = [];
    for (const corner of hole.ringCorners) {
      globalIndices.push(insertConstraintPoint(points, triangles, constrainedEdgeKeys, corner.point));
    }
    for (let index = 0; index < globalIndices.length; index += 1) {
      const a = globalIndices[index];
      const b = globalIndices[(index + 1) % globalIndices.length];
      recoverConstraintEdge(points, triangles, constrainedEdgeKeys, a, b);
      constrainedEdgeKeys.add(edgeKey(a, b));
      edgesByCornerPair.set(edgeKey(a, b), hole.edges[index]);
    }
    boundaryRings.push({
      role: 'HOLE', holeLoopId, ringCorners: hole.ringCorners, globalIndices,
    });
  }

  const holePolygons = boundaryRings
    .filter((ring) => ring.role === 'HOLE')
    .map((ring) => ring.globalIndices.map((index) => points[index]));
  if (holePolygons.length) {
    const retained = triangles.filter((triangle) => {
      const centroid = triangleCentroid(triangle, points);
      return !holePolygons.some((polygon) => pointInPolygonStrict(centroid, polygon));
    });
    triangles.splice(0, triangles.length, ...retained);
    verifyHoleBoundaryOwnership(triangles, constrainedEdgeKeys, boundaryRings);
  }

  const candidates = interiorSeedPoints(outer.ringCorners, options.targetSize);
  let interiorPointCount = 0;
  for (const candidate of candidates) {
    if (holePolygons.some((polygon) => pointInPolygonStrict(candidate, polygon))) continue;
    if (!farEnoughFromBoundaries(candidate, boundaryRings, points, options.targetSize)) continue;
    if (!farEnoughFromExisting(candidate, points, options.targetSize)) continue;
    if (insertInteriorPoint(points, triangles, constrainedEdgeKeys, candidate)) interiorPointCount += 1;
  }

  let restored = lawsonFlip(points, triangles, constrainedEdgeKeys);
  if (holePolygons.length) {
    const frontTriangles = restored.map((triangle) => [...triangle]);
    interiorPointCount += insertHoleBoundaryFront(
      points,
      frontTriangles,
      constrainedEdgeKeys,
      boundaryRings,
      holePolygons,
      options.targetSize,
      holeFrontPolicy,
    );
    restored = lawsonFlip(points, frontTriangles, constrainedEdgeKeys);
    verifyHoleBoundaryOwnership(restored, constrainedEdgeKeys, boundaryRings);
  }

  // Relax the interior lattice against the boundary discretization, then
  // restore the Delaunay property for the moved nodes. Boundary nodes are
  // pinned: they carry the true analytic curve position and moving them would
  // move the analysis geometry itself.
  const fixedIndices = new Set();
  for (const ring of boundaryRings) {
    for (const index of ring.globalIndices) fixedIndices.add(index);
  }
  let smoothedMoveCount = 0;
  for (let round = 0; round < SMOOTHING_ROUNDS; round += 1) {
    const working = restored.map((triangle) => [...triangle]);
    smoothedMoveCount += smoothInteriorPoints(points, working, fixedIndices).movedCount;
    restored = lawsonFlip(points, working, constrainedEdgeKeys);
  }
  if (holePolygons.length) {
    verifyHoleBoundaryOwnership(restored, constrainedEdgeKeys, boundaryRings);
  }

  return Object.freeze({
    points: Object.freeze(points.map((point) => Object.freeze(point))),
    triangleTriples: Object.freeze(restored.map((triangle) => Object.freeze([...triangle]))),
    smoothedMoveCount,
    boundaryEdgeKeys: constrainedEdgeKeys,
    ringCorners: outer.ringCorners,
    boundaryRings: Object.freeze(boundaryRings.map((ring) => Object.freeze({
      ...ring,
      globalIndices: Object.freeze([...ring.globalIndices]),
    }))),
    edgesByCornerPair,
    boundarySegmentCount: boundaryRings.reduce((sum, ring) => sum + ring.globalIndices.length, 0),
    holeCount: region.holeLoopIds.length,
    interiorPointCount,
  });
}

/**
 * Build a deterministic staggered triangular/equilateral lattice over the
 * outer-loop bounding box. Material-domain and boundary-clearance filtering is
 * performed by the caller after hole constraints have been recovered.
 */
export function interiorSeedPoints(ringCorners, targetSize) {
  const polygon = ringCorners.map((corner) => corner.point ?? corner);
  const xs = polygon.map((point) => point.x);
  const ys = polygon.map((point) => point.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const width = maxX - minX; const height = maxY - minY;
  if (!(width > 0) || !(height > 0)) return Object.freeze([]);

  const rowHeight = targetSize * TRIANGULAR_ROW_HEIGHT_FACTOR;
  const candidates = [];
  for (let row = 1; ; row += 1) {
    const y = minY + row * rowHeight;
    if (!(y < maxY - scaledEps({ x: minX, y }, { x: maxX, y: maxY }))) break;
    const xOffset = row % 2 === 1 ? targetSize / 2 : 0;
    for (let column = 0; ; column += 1) {
      const x = minX + xOffset + column * targetSize;
      if (!(x < maxX - scaledEps({ x, y }, { x: maxX, y: maxY }))) break;
      if (x <= minX + scaledEps({ x, y }, { x: minX, y: minY })) continue;
      const point = { x, y };
      if (pointInPolygonStrict(point, polygon)) candidates.push(point);
    }
  }
  candidates.sort((left, right) => left.y - right.y || left.x - right.x);
  return Object.freeze(candidates.map((point) => Object.freeze(point)));
}

/**
 * Insert a point without changing existing constrained boundary topology.
 * Strict triangle insertion is 1 -> 3; insertion on an unconstrained interior
 * edge is a deterministic two-owner 2 -> 4 split.
 */
export function insertInteriorPoint(points, triangles, constrainedEdgeKeys, point) {
  for (let index = 0; index < triangles.length; index += 1) {
    const triangle = triangles[index];
    const a = points[triangle[0]]; const b = points[triangle[1]]; const c = points[triangle[2]];
    const relation = pointTriangleRelation(point, a, b, c);
    if (relation === 'INSIDE') {
      const inserted = points.length;
      points.push({ x: point.x, y: point.y });
      triangles.splice(index, 1,
        [triangle[0], triangle[1], inserted],
        [triangle[1], triangle[2], inserted],
        [triangle[2], triangle[0], inserted]);
      return true;
    }
    if (relation !== 'ON_EDGE') continue;
    const edge = triangleEdgeContainingPoint(triangle, points, point);
    if (!edge) continue;
    const key = edgeKey(edge.a, edge.b);
    if (constrainedEdgeKeys.has(key)) return false;
    return splitInteriorEdge(points, triangles, key, point);
  }
  return false;
}

/** Insert a required hole-boundary point and return its global point index. */
function insertConstraintPoint(points, triangles, constrainedEdgeKeys, point) {
  const existing = exactPointIndex(points, point);
  if (existing >= 0) return existing;
  const before = points.length;
  if (!insertInteriorPoint(points, triangles, constrainedEdgeKeys, point)) {
    throw new LafeaMeshingError('Hole boundary point could not be inserted', 'HOLE_POINT_INSERTION_FAILED');
  }
  if (points.length !== before + 1) {
    throw new LafeaMeshingError('Hole point insertion did not create exactly one vertex', 'HOLE_POINT_INSERTION_INVALID');
  }
  return points.length - 1;
}

/**
 * Recover one straight corner-to-corner hole constraint by flipping only
 * unconstrained edges that properly intersect the requested segment. A flip is
 * accepted only when its replacement diagonal no longer intersects that
 * segment, so the crossing count decreases monotonically.
 */
export function recoverConstraintEdge(points, triangles, constrainedEdgeKeys, a, b) {
  const targetKey = edgeKey(a, b);
  if (edgePresent(triangles, targetKey)) return;
  const maxPasses = Math.max(200, triangles.length * triangles.length * 2);
  for (let pass = 0; pass < maxPasses; pass += 1) {
    if (edgePresent(triangles, targetKey)) return;
    const owners = buildEdgeOwners(triangles);
    const crossing = [...owners.keys()]
      .filter((key) => !constrainedEdgeKeys.has(key))
      .filter((key) => {
        const [u, v] = key.split(':').map(Number);
        if (u === a || u === b || v === a || v === b) return false;
        return properSegmentIntersection(points[a], points[b], points[u], points[v]);
      })
      .sort();
    let flipped = false;
    for (const key of crossing) {
      const [u, v] = key.split(':').map(Number);
      const ownerRows = owners.get(key);
      if (ownerRows.length !== 2) continue;
      const apexA = triangles[ownerRows[0]].find((index) => index !== u && index !== v);
      const apexB = triangles[ownerRows[1]].find((index) => index !== u && index !== v);
      if (apexA === undefined || apexB === undefined) continue;
      if (properSegmentIntersection(points[a], points[b], points[apexA], points[apexB])) continue;
      if (!convexForFlip(points, u, v, apexA, apexB)) continue;
      triangles[ownerRows[0]] = normalizeTriangle([apexA, apexB, u], points);
      triangles[ownerRows[1]] = normalizeTriangle([apexB, apexA, v], points);
      flipped = true;
      break;
    }
    if (!flipped) {
      throw new LafeaMeshingError(
        `Constrained edge ${targetKey} recovery stalled`,
        'CONSTRAINED_EDGE_RECOVERY_STALLED',
      );
    }
  }
  throw new LafeaMeshingError(
    `Constrained edge ${targetKey} recovery exceeded pass limit`,
    'CONSTRAINED_EDGE_RECOVERY_LIMIT',
  );
}

function insertHoleBoundaryFront(
  points,
  triangles,
  constrainedEdgeKeys,
  boundaryRings,
  holePolygons,
  targetSize,
  gradingPolicy,
) {
  const outerRing = boundaryRings.find((ring) => ring.role === 'OUTER');
  const outerPolygon = outerRing.globalIndices.map((index) => points[index]);
  const holeRings = boundaryRings.filter((ring) => ring.role === 'HOLE');
  let insertedCount = 0;

  for (let layer = 0; layer < HOLE_FRONT_LAYER_COUNT; layer += 1) {
    for (const ring of holeRings) {
      for (let edgeIndex = 0; edgeIndex < ring.globalIndices.length; edgeIndex += 1) {
        const a = points[ring.globalIndices[edgeIndex]];
        const b = points[ring.globalIndices[(edgeIndex + 1) % ring.globalIndices.length]];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const edgeLength = Math.hypot(dx, dy);
        if (!(edgeLength > 0)) continue;
        // The front is a grading mechanism, not a universal second lattice.
        // When an adjacency policy is supplied, activation and layer growth are
        // derived from that longest-edge policy instead of the legacy heuristic.
        if (!(targetSize / edgeLength > gradingPolicy.activationRatio + EPS)) continue;
        const offset = holeFrontOffset(edgeLength, layer, gradingPolicy.layerGrowth);
        const candidate = {
          x: (a.x + b.x) / 2 + (-dy / edgeLength) * offset,
          y: (a.y + b.y) / 2 + (dx / edgeLength) * offset,
        };
        if (!pointInPolygonStrict(candidate, outerPolygon)) continue;
        if (holePolygons.some((polygon) => pointInPolygonStrict(candidate, polygon))) continue;
        const clearance = Math.min(
          targetSize * HOLE_FRONT_TARGET_CLEARANCE_FACTOR,
          edgeLength * HOLE_FRONT_EDGE_CLEARANCE_FACTOR * (gradingPolicy.layerGrowth ** layer),
        );
        if (!farEnoughByDistance(candidate, points, clearance)) continue;
        if (insertInteriorPoint(points, triangles, constrainedEdgeKeys, candidate)) insertedCount += 1;
      }
    }
  }
  return insertedCount;
}

function holeFrontOffset(edgeLength, layer, layerGrowth) {
  const baseHeight = edgeLength * TRIANGULAR_ROW_HEIGHT_FACTOR;
  let offset = 0;
  for (let index = 0; index <= layer; index += 1) {
    offset += baseHeight * (layerGrowth ** index);
  }
  return offset;
}

function splitInteriorEdge(points, triangles, key, point) {
  const owners = [];
  for (let triangleIndex = 0; triangleIndex < triangles.length; triangleIndex += 1) {
    const triangle = triangles[triangleIndex];
    for (let edgeIndex = 0; edgeIndex < 3; edgeIndex += 1) {
      const a = triangle[edgeIndex];
      const b = triangle[(edgeIndex + 1) % 3];
      if (edgeKey(a, b) === key) {
        owners.push({ triangleIndex, edgeIndex });
        break;
      }
    }
  }
  if (owners.length !== 2) return false;

  const inserted = points.length;
  points.push({ x: point.x, y: point.y });
  const ownerByIndex = new Map(owners.map((owner) => [owner.triangleIndex, owner]));
  const replacement = [];
  for (let triangleIndex = 0; triangleIndex < triangles.length; triangleIndex += 1) {
    const owner = ownerByIndex.get(triangleIndex);
    if (!owner) {
      replacement.push(triangles[triangleIndex]);
      continue;
    }
    const triangle = triangles[triangleIndex];
    const a = triangle[owner.edgeIndex];
    const b = triangle[(owner.edgeIndex + 1) % 3];
    const apex = triangle[(owner.edgeIndex + 2) % 3];
    replacement.push(
      normalizeTriangle([a, inserted, apex], points),
      normalizeTriangle([inserted, b, apex], points),
    );
  }
  triangles.splice(0, triangles.length, ...replacement);
  return true;
}

function verifyHoleBoundaryOwnership(triangles, constrainedEdgeKeys, boundaryRings) {
  const owners = buildEdgeOwners(triangles);
  for (const ring of boundaryRings.filter((candidate) => candidate.role === 'HOLE')) {
    for (let index = 0; index < ring.globalIndices.length; index += 1) {
      const key = edgeKey(
        ring.globalIndices[index],
        ring.globalIndices[(index + 1) % ring.globalIndices.length],
      );
      if (!constrainedEdgeKeys.has(key) || (owners.get(key)?.length ?? 0) !== 1) {
        throw new LafeaMeshingError('Recovered hole edge is not a cavity boundary', 'HOLE_BOUNDARY_OWNERSHIP_INVALID');
      }
    }
  }
}

function farEnoughFromBoundaries(point, boundaryRings, points, targetSize) {
  const clearance = targetSize * BOUNDARY_CLEARANCE_FACTOR;
  for (const ring of boundaryRings) {
    for (let index = 0; index < ring.globalIndices.length; index += 1) {
      const a = points[ring.globalIndices[index]];
      const b = points[ring.globalIndices[(index + 1) % ring.globalIndices.length]];
      if (distancePointToSegment(point, a, b) < clearance - scaledEps(point, a, b)) return false;
    }
  }
  return true;
}

function farEnoughFromExisting(point, points, targetSize) {
  const clearance = targetSize * POINT_CLEARANCE_FACTOR;
  return points.every((existing) => Math.hypot(point.x - existing.x, point.y - existing.y)
    >= clearance - scaledEps(point, existing));
}

function farEnoughByDistance(point, points, clearance) {
  return points.every((existing) => Math.hypot(point.x - existing.x, point.y - existing.y)
    >= clearance - scaledEps(point, existing));
}

function triangleEdgeContainingPoint(triangle, points, point) {
  for (let edgeIndex = 0; edgeIndex < 3; edgeIndex += 1) {
    const aIndex = triangle[edgeIndex];
    const bIndex = triangle[(edgeIndex + 1) % 3];
    const a = points[aIndex]; const b = points[bIndex];
    const tolerance = scaledEps(point, a, b);
    if (Math.abs(orient(a, b, point)) > tolerance) continue;
    if (!pointWithinSegmentBounds(point, a, b, tolerance)) continue;
    return { a: aIndex, b: bIndex };
  }
  return null;
}

function pointTriangleRelation(point, a, b, c) {
  const s1 = orient(a, b, point);
  const s2 = orient(b, c, point);
  const s3 = orient(c, a, point);
  const tolerance = scaledEps(point, a, b, c);
  const hasNegative = s1 < -tolerance || s2 < -tolerance || s3 < -tolerance;
  const hasPositive = s1 > tolerance || s2 > tolerance || s3 > tolerance;
  if (hasNegative && hasPositive) return 'OUTSIDE';
  if (Math.abs(s1) <= tolerance || Math.abs(s2) <= tolerance || Math.abs(s3) <= tolerance) {
    return 'ON_EDGE';
  }
  return 'INSIDE';
}

function convexForFlip(points, u, v, apexA, apexB) {
  const tolerance = scaledEps(points[u], points[v], points[apexA], points[apexB]);
  const sideU = orient(points[apexA], points[apexB], points[u]);
  const sideV = orient(points[apexA], points[apexB], points[v]);
  const sideA = orient(points[u], points[v], points[apexA]);
  const sideB = orient(points[u], points[v], points[apexB]);
  return sideU * sideV < -(tolerance * tolerance)
    && sideA * sideB < -(tolerance * tolerance);
}

function properSegmentIntersection(a, b, c, d) {
  const tolerance = scaledEps(a, b, c, d);
  const o1 = orient(a, b, c); const o2 = orient(a, b, d);
  const o3 = orient(c, d, a); const o4 = orient(c, d, b);
  return o1 * o2 < -(tolerance * tolerance) && o3 * o4 < -(tolerance * tolerance);
}

function buildEdgeOwners(triangles) {
  const owners = new Map();
  triangles.forEach((triangle, triangleIndex) => {
    for (let edgeIndex = 0; edgeIndex < 3; edgeIndex += 1) {
      const key = edgeKey(triangle[edgeIndex], triangle[(edgeIndex + 1) % 3]);
      if (!owners.has(key)) owners.set(key, []);
      owners.get(key).push(triangleIndex);
    }
  });
  return owners;
}

function edgePresent(triangles, key) {
  return triangles.some((triangle) => [0, 1, 2]
    .some((edgeIndex) => edgeKey(triangle[edgeIndex], triangle[(edgeIndex + 1) % 3]) === key));
}

function normalizeTriangle(triangle, points) {
  if (orient(points[triangle[0]], points[triangle[1]], points[triangle[2]]) < 0) {
    return [triangle[0], triangle[2], triangle[1]];
  }
  return triangle;
}

function exactPointIndex(points, point) {
  return points.findIndex((candidate) => candidate.x === point.x && candidate.y === point.y);
}

function triangleCentroid(triangle, points) {
  return {
    x: (points[triangle[0]].x + points[triangle[1]].x + points[triangle[2]].x) / 3,
    y: (points[triangle[0]].y + points[triangle[1]].y + points[triangle[2]].y) / 3,
  };
}

function pointWithinSegmentBounds(point, a, b, tolerance) {
  return point.x >= Math.min(a.x, b.x) - tolerance
    && point.x <= Math.max(a.x, b.x) + tolerance
    && point.y >= Math.min(a.y, b.y) - tolerance
    && point.y <= Math.max(a.y, b.y) + tolerance;
}

export function pointInPolygonStrict(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]; const b = polygon[j];
    if (distancePointToSegment(point, a, b) <= scaledEps(point, a, b)) return false;
    const crosses = (a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function distancePointToSegment(point, a, b) {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  if (!(length2 > 0)) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1,
    ((point.x - a.x) * dx + (point.y - a.y) * dy) / length2));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

function orient(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function scaledEps(...points) {
  return EPS * Math.max(1, ...points.flatMap((point) => [Math.abs(point.x), Math.abs(point.y)]));
}