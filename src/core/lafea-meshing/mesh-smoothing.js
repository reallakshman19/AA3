import { minimumAngleDegreesOf } from './quality-gates.js';

/**
 * Deterministic interior-node smoothing (spec §10.2 mesh quality).
 *
 * Interior point insertion fixes the sliver collapse that a boundary-only
 * triangulation suffers, but it seeds interior nodes on a fixed lattice, so
 * the elements where that lattice meets the boundary discretization stay
 * poorly shaped. Smoothing relaxes those nodes.
 *
 * This is *smart* Laplacian smoothing, not plain Laplacian: a node only moves
 * when the move does not reduce the minimum angle of any triangle touching it.
 * Plain Laplacian smoothing is well known to invert elements near concave
 * boundaries, which would turn a WARNING mesh into an invalid one — so the
 * relocation is accepted only when it is demonstrably not worse.
 *
 * Determinism (`BYTE_IDENTICAL_CANONICAL_MESH_V1`): nodes are visited in
 * ascending index order with sequential (Gauss-Seidel) updates, for a fixed
 * pass count, and every arithmetic step runs in a fixed order. No PRNG, no
 * convergence-dependent stopping criterion, no iteration over unordered
 * collections.
 *
 * Boundary nodes are never moved. Doing so would move the analysis geometry
 * itself, and boundary nodes carry the true analytic curve position.
 */

const DEFAULT_PASSES = 4;
/** Nothing is gained by relaxing a node onto a position that barely differs. */
const MOVE_EPSILON_FACTOR = 1e-9;

/**
 * @param {Array<{x:number,y:number}>} points Mutated in place.
 * @param {ReadonlyArray<ReadonlyArray<number>>} triangles Corner index triples.
 * @param {Set<number>} fixedIndices Point indices that must not move.
 * @param {{passes?:number}} [options]
 * @returns {Readonly<{movedCount:number, passes:number}>}
 */
export function smoothInteriorPoints(points, triangles, fixedIndices, options = {}) {
  const passes = Number.isInteger(options.passes) && options.passes > 0
    ? options.passes
    : DEFAULT_PASSES;

  const incidentTriangles = buildIncidence(points.length, triangles);
  const neighbours = buildNeighbours(points.length, triangles);
  let movedCount = 0;

  for (let pass = 0; pass < passes; pass += 1) {
    for (let index = 0; index < points.length; index += 1) {
      if (fixedIndices.has(index)) continue;
      const adjacent = neighbours[index];
      if (!adjacent || adjacent.length < 3) continue;

      const current = points[index];
      const proposed = centroidOf(adjacent, points);
      const shift = Math.hypot(proposed.x - current.x, proposed.y - current.y);
      if (shift <= MOVE_EPSILON_FACTOR * scaleOf(adjacent, points)) continue;

      const before = minimumIncidentAngle(index, incidentTriangles, points);
      const restoreX = current.x;
      const restoreY = current.y;
      current.x = proposed.x;
      current.y = proposed.y;
      const after = minimumIncidentAngle(index, incidentTriangles, points);

      // Strictly-better acceptance keeps the pass monotone, which is what
      // makes a fixed pass count safe: quality can never oscillate downward.
      if (after > before) {
        movedCount += 1;
      } else {
        current.x = restoreX;
        current.y = restoreY;
      }
    }
  }

  return Object.freeze({ movedCount, passes });
}

/** The worst minimum-angle over every triangle touching `index`. */
function minimumIncidentAngle(index, incidentTriangles, points) {
  let worst = Infinity;
  for (const triangle of incidentTriangles[index]) {
    const corners = [points[triangle[0]], points[triangle[1]], points[triangle[2]]];
    if (signedArea(corners) <= 0) return -Infinity;
    const angle = minimumAngleDegreesOf(corners);
    if (angle < worst) worst = angle;
  }
  return worst;
}

function buildIncidence(pointCount, triangles) {
  const incidence = Array.from({ length: pointCount }, () => []);
  for (const triangle of triangles) {
    for (const corner of triangle) incidence[corner].push(triangle);
  }
  return incidence;
}

/**
 * Adjacency in ascending index order, so the centroid below sums in a fixed
 * order and reproduces bit-for-bit across runs.
 */
function buildNeighbours(pointCount, triangles) {
  const sets = Array.from({ length: pointCount }, () => new Set());
  for (const triangle of triangles) {
    for (let i = 0; i < 3; i += 1) {
      const self = triangle[i];
      sets[self].add(triangle[(i + 1) % 3]);
      sets[self].add(triangle[(i + 2) % 3]);
    }
  }
  return sets.map((set) => [...set].sort((left, right) => left - right));
}

function centroidOf(indices, points) {
  let x = 0;
  let y = 0;
  for (const index of indices) {
    x += points[index].x;
    y += points[index].y;
  }
  return { x: x / indices.length, y: y / indices.length };
}

function scaleOf(indices, points) {
  let longest = 0;
  for (const index of indices) {
    longest = Math.max(longest, Math.abs(points[index].x), Math.abs(points[index].y));
  }
  return Math.max(1, longest);
}

function signedArea([a, b, c]) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
