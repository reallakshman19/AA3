import { curvePointAt } from '../lafea-geometry/vertex-curve.js';

/**
 * Conforming all-quad subdivision of a triangulation (spec §10.2 quadratic
 * continuum default).
 *
 * Greedy T6-pair recombination is partial by construction: triangles it cannot
 * pair stay triangular, so a uniform-Q8 request over a region that is not a
 * logical quadrilateral could only be rejected. This provides the general
 * path: every triangle is split into exactly three quads about its centroid,
 * which is all-quad by construction rather than by luck.
 *
 *        C
 *        |\                 A -- Mab -- G -- Mca
 *      Mca Mbc              B -- Mbc -- G -- Mab
 *        | G \              C -- Mca -- G -- Mbc
 *        A-Mab-B
 *
 * Conformity: the split introduces one new node per triangle edge (its
 * midpoint) and one per triangle (its centroid). Two triangles sharing an edge
 * derive that edge's midpoint from the same two endpoints by the same
 * expression, so they agree exactly and the result has no hanging nodes.
 *
 * Boundary fidelity: a sub-edge lying on a declared boundary curve takes its
 * corner and midside positions from the analytic curve at the corresponding
 * parameter, never from the chord. Subdividing an arc-bounded region would
 * otherwise quietly replace the arc with a finer polyline — the exact class of
 * silent approximation the boundary discretization exists to prevent.
 */

/**
 * @param {Readonly<object>} refined Output of `triangulateRefinedRegionAsIndexTriples`.
 * @param {Map<string,object>} curveById
 * @param {Map<string,object>} vertexById
 * @returns {readonly object[]} Q8 elements, 3 per input triangle.
 */
export function subdivideTrianglesToQ8(refined, curveById, vertexById) {
  const { points, triangleTriples, edgesByCornerPair } = refined;
  const elements = [];

  for (const triangle of triangleTriples) {
    const [ia, ib, ic] = triangle;
    const a = points[ia];
    const b = points[ib];
    const c = points[ic];

    const ab = edgeGeometry(ia, ib, points, edgesByCornerPair, curveById, vertexById);
    const bc = edgeGeometry(ib, ic, points, edgesByCornerPair, curveById, vertexById);
    const ca = edgeGeometry(ic, ia, points, edgesByCornerPair, curveById, vertexById);

    // The centroid of the three corners: interior by construction for a
    // non-degenerate triangle, so it needs no boundary treatment.
    const g = Object.freeze({
      x: (a.x + b.x + c.x) / 3,
      y: (a.y + b.y + c.y) / 3,
    });

    // Each quad is listed corner-first in CCW order, matching the incoming
    // CCW triangle, so the scaled Jacobian stays positive.
    elements.push(
      quad(elements.length, a, ab.mid, g, ca.mid, ab.firstQuarter, midpoint(ab.mid, g), midpoint(g, ca.mid), ca.lastQuarter),
      quad(elements.length + 1, b, bc.mid, g, ab.mid, bc.firstQuarter, midpoint(bc.mid, g), midpoint(g, ab.mid), ab.lastQuarter),
      quad(elements.length + 2, c, ca.mid, g, bc.mid, ca.firstQuarter, midpoint(ca.mid, g), midpoint(g, bc.mid), bc.lastQuarter),
    );
  }

  return Object.freeze(elements);
}

/**
 * Midpoint and quarter points of the triangle edge `from`->`to`.
 *
 * On a declared boundary edge these come from the analytic curve; elsewhere
 * the edge is a straight interior chord and the chord points are exact.
 */
function edgeGeometry(from, to, points, edgesByCornerPair, curveById, vertexById) {
  const start = points[from];
  const end = points[to];
  const boundary = edgesByCornerPair?.get(edgeKeyOf(from, to)) ?? null;
  const curve = boundary ? curveById?.get(boundary.curveId) ?? null : null;

  if (!boundary || !curve) {
    const mid = midpoint(start, end);
    return { mid, firstQuarter: midpoint(start, mid), lastQuarter: midpoint(mid, end) };
  }

  // `edgesByCornerPair` is keyed on an unordered corner pair, so establish
  // which end of the stored edge this traversal actually starts from.
  const forward = samePoint(boundary.startCorner.point, start);
  const tStart = forward ? boundary.startCorner.t : boundary.endCorner.t;
  const tEnd = forward ? boundary.endCorner.t : boundary.startCorner.t;
  const tMid = (tStart + tEnd) / 2;

  return {
    mid: boundary.midPoint.point,
    firstQuarter: curvePointAt(curve, vertexById, (tStart + tMid) / 2),
    lastQuarter: curvePointAt(curve, vertexById, (tMid + tEnd) / 2),
  };
}

function quad(elementIndex, c0, c1, c2, c3, m01, m12, m23, m30) {
  return Object.freeze({
    elementIndex,
    elementType: 'Q8',
    nodes: Object.freeze([
      point(c0), point(c1), point(c2), point(c3),
      point(m01), point(m12), point(m23), point(m30),
    ]),
  });
}

function point(value) { return Object.freeze({ x: value.x, y: value.y }); }
function midpoint(a, b) { return Object.freeze({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }); }
function samePoint(a, b) { return a.x === b.x && a.y === b.y; }
function edgeKeyOf(a, b) { return a < b ? `${a}:${b}` : `${b}:${a}`; }
