import { LafeaMeshingError } from './errors.js';
import { discretizeLoop } from './boundary-discretization.js';
import {
  boundaryEdgeLookup,
  lawsonFlip,
  triangulateRegionAsIndexTriples,
} from './constrained-delaunay-t6.js';

/**
 * Deterministic interior-point refinement for a hole-free LAFEA.3 region.
 *
 * The legacy constrained-Delaunay path only refines the boundary ring. This
 * layer adds true interior corner vertices before the final Lawson pass. A
 * regular, canonically ordered seed lattice is derived from the declared
 * target element length; every accepted seed is inserted into the containing
 * triangle, then the complete triangulation is restored to constrained
 * Delaunay form with the original boundary edges held fixed.
 *
 * This is intentionally P1-5 only. Hole loops remain an explicit rejection
 * until their constrained edges can be recovered and classified without
 * introducing a hidden seam.
 */
export const LAFEA_INTERIOR_REFINEMENT_REVISION = 'LAFEA.10.STEINER-GRID.V1';

const EPS = 1e-12;
const GRID_SPACING_FACTOR = 1 / Math.SQRT2;
const BOUNDARY_CLEARANCE_FACTOR = 0.18;
const POINT_CLEARANCE_FACTOR = 0.12;

/**
 * @param {Readonly<object>} topology Canonical core topology.
 * @param {string} regionId Region identifier.
 * @param {{targetSize:number,chordErrorLimit:number,minimumSegmentsByCurveId?:Map<string,number>}} options
 * @returns {Readonly<{points:readonly object[],triangleTriples:readonly number[][],
 *   boundaryEdgeKeys:Set<string>,ringCorners:readonly object[],edgesByCornerPair:Map<string,object>,
 *   boundarySegmentCount:number,interiorPointCount:number}>}
 */
export function triangulateRefinedRegionAsIndexTriples(topology, regionId, options) {
  const region = topology.regions.find((candidate) => candidate.regionId === regionId);
  if (!region) throw new LafeaMeshingError(`Unresolved region: ${regionId}`, 'UNRESOLVED_REGION');
  if (region.holeLoopIds.length > 0) {
    throw new LafeaMeshingError(
      `Region ${regionId} has holes; constrained hole recovery is not yet qualified in this refinement pass`,
      'HOLES_NOT_YET_SUPPORTED',
    );
  }
  if (!(options?.targetSize > 0)) {
    throw new LafeaMeshingError('targetSize must be positive', 'INVALID_TARGET_SIZE');
  }

  const curveById = new Map(topology.curves.map((curve) => [curve.curveId, curve]));
  const vertexById = new Map(topology.vertices.map((vertex) => [vertex.vertexId, vertex]));
  const outerLoop = topology.loops.find((loop) => loop.loopId === region.outerLoopId);
  if (!outerLoop) throw new LafeaMeshingError('Outer loop is unresolved', 'UNRESOLVED_OUTER_LOOP');

  const discretized = discretizeLoop(outerLoop, curveById, vertexById, options);
  const edgesByCornerPair = boundaryEdgeLookup(discretized.edges, discretized.ringCorners);
  const base = triangulateRegionAsIndexTriples(discretized.ringCorners);
  const points = base.points.map((point) => ({ x: point.x, y: point.y }));
  const triangles = base.triangleTriples.map((triangle) => [...triangle]);
  const boundaryEdgeKeys = new Set(base.boundaryEdgeKeys);

  const candidates = interiorSeedPoints(discretized.ringCorners, options.targetSize);
  let interiorPointCount = 0;
  for (const candidate of candidates) {
    if (!farEnoughFromBoundary(candidate, discretized.ringCorners, options.targetSize)) continue;
    if (!farEnoughFromExisting(candidate, points, options.targetSize)) continue;
    if (insertInteriorPoint(points, triangles, candidate)) interiorPointCount += 1;
  }

  const restored = lawsonFlip(points, triangles, boundaryEdgeKeys);
  return Object.freeze({
    points: Object.freeze(points.map((point) => Object.freeze(point))),
    triangleTriples: Object.freeze(restored.map((triangle) => Object.freeze([...triangle]))),
    boundaryEdgeKeys,
    ringCorners: discretized.ringCorners,
    edgesByCornerPair,
    boundarySegmentCount: discretized.edges.length,
    interiorPointCount,
  });
}

/**
 * Seed spacing is target/sqrt(2), so a square lattice cell diagonal is no
 * larger than the requested target before boundary effects. The lattice uses
 * equal subdivisions of the region bounding box and excludes the boundary
 * rows/columns; candidates are returned in x/y total order independent of
 * object or map insertion order.
 */
export function interiorSeedPoints(ringCorners, targetSize) {
  const polygon = ringCorners.map((corner) => corner.point ?? corner);
  const xs = polygon.map((point) => point.x);
  const ys = polygon.map((point) => point.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const width = maxX - minX; const height = maxY - minY;
  if (!(width > 0) || !(height > 0)) return Object.freeze([]);

  const requestedSpacing = targetSize * GRID_SPACING_FACTOR;
  const nx = Math.max(1, Math.ceil(width / requestedSpacing));
  const ny = Math.max(1, Math.ceil(height / requestedSpacing));
  const dx = width / nx; const dy = height / ny;
  const candidates = [];
  for (let ix = 1; ix < nx; ix += 1) {
    const x = minX + ix * dx;
    for (let iy = 1; iy < ny; iy += 1) {
      const point = { x, y: minY + iy * dy };
      if (pointInPolygonStrict(point, polygon)) candidates.push(point);
    }
  }
  candidates.sort((left, right) => left.x - right.x || left.y - right.y);
  return Object.freeze(candidates.map((point) => Object.freeze(point)));
}

/** Split one containing triangle into three. Boundary edges are unchanged. */
export function insertInteriorPoint(points, triangles, point) {
  for (let index = 0; index < triangles.length; index += 1) {
    const triangle = triangles[index];
    const a = points[triangle[0]]; const b = points[triangle[1]]; const c = points[triangle[2]];
    const relation = pointTriangleRelation(point, a, b, c);
    if (relation !== 'INSIDE') continue;
    const inserted = points.length;
    points.push({ x: point.x, y: point.y });
    triangles.splice(index, 1,
      [triangle[0], triangle[1], inserted],
      [triangle[1], triangle[2], inserted],
      [triangle[2], triangle[0], inserted]);
    return true;
  }
  return false;
}

function farEnoughFromBoundary(point, ringCorners, targetSize) {
  const polygon = ringCorners.map((corner) => corner.point ?? corner);
  const clearance = targetSize * BOUNDARY_CLEARANCE_FACTOR;
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index]; const b = polygon[(index + 1) % polygon.length];
    if (distancePointToSegment(point, a, b) < clearance - scaledEps(point, a, b)) return false;
  }
  return true;
}

function farEnoughFromExisting(point, points, targetSize) {
  const clearance = targetSize * POINT_CLEARANCE_FACTOR;
  return points.every((existing) => Math.hypot(point.x - existing.x, point.y - existing.y)
    >= clearance - scaledEps(point, existing));
}

function pointTriangleRelation(point, a, b, c) {
  const s1 = orient(a, b, point);
  const s2 = orient(b, c, point);
  const s3 = orient(c, a, point);
  const tolerance = scaledEps(point, a, b, c);
  if (s1 < -tolerance || s2 < -tolerance || s3 < -tolerance) return 'OUTSIDE';
  if (Math.abs(s1) <= tolerance || Math.abs(s2) <= tolerance || Math.abs(s3) <= tolerance) {
    return 'ON_EDGE';
  }
  return 'INSIDE';
}

function pointInPolygonStrict(point, polygon) {
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
