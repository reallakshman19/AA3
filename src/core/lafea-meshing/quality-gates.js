import { LafeaMeshingError } from './errors.js';
import {
  Q8_CORNER_NATURAL_POINTS,
  T6_CORNER_NATURAL_POINTS,
  jacobianAt,
  q8ShapeFunctions,
  scaledJacobianAt,
  t6ShapeFunctions,
} from './element-geometry.js';

/**
 * The full §10.3 default mesh-control gate table. Every threshold is a
 * caller-declared `meshProfile` value (from `lafea-profile-contract`) —
 * nothing here hard-codes a number; each function only classifies a computed
 * quantity against thresholds the caller supplies.
 */

export const GATE_STATUSES = Object.freeze(['OK', 'WARNING', 'BLOCK']);

const T6_INTEGRATION_NATURAL_POINTS = Object.freeze([
  Object.freeze({ xi: 1 / 6, eta: 1 / 6 }),
  Object.freeze({ xi: 2 / 3, eta: 1 / 6 }),
  Object.freeze({ xi: 1 / 6, eta: 2 / 3 }),
]);
const Q8_GAUSS_COORDINATES = Object.freeze([
  -Math.sqrt(3 / 5), 0, Math.sqrt(3 / 5),
]);
const Q8_INTEGRATION_NATURAL_POINTS = Object.freeze(
  Q8_GAUSS_COORDINATES.flatMap((xi) => Q8_GAUSS_COORDINATES.map((eta) => (
    Object.freeze({ xi, eta })
  ))),
);

function classify(value, { warnAt, blockAt, worseIsHigher }) {
  const worse = worseIsHigher ? (a, b) => a > b : (a, b) => a < b;
  if (worse(value, blockAt) || value === blockAt) return 'BLOCK';
  if (worse(value, warnAt) || value === warnAt) return 'WARNING';
  return 'OK';
}

/** Aspect ratio: longest edge / shortest edge of the element's corner polygon. */
export function aspectRatioOf(cornerPoints) {
  const edgeLengths = edgeLengthsOf(cornerPoints);
  const longest = Math.max(...edgeLengths);
  const shortest = Math.min(...edgeLengths);
  if (!(shortest > 0)) throw new LafeaMeshingError('Degenerate element: zero-length edge', 'DEGENERATE_ELEMENT');
  return longest / shortest;
}

export function qualifyAspectRatio(cornerPoints, { warn, block }) {
  const value = aspectRatioOf(cornerPoints);
  return Object.freeze({ metric: 'ASPECT_RATIO', value, status: classify(value, { warnAt: warn, blockAt: block, worseIsHigher: true }) });
}

function edgeLengthsOf(cornerPoints) {
  return cornerPoints.map((point, index) => {
    const next = cornerPoints[(index + 1) % cornerPoints.length];
    return Math.hypot(next.x - point.x, next.y - point.y);
  });
}

/** Minimum interior angle of a triangle's corner points, in degrees (spec §10.3: triangles only). */
export function minimumAngleDegreesOf(triangleCorners) {
  if (triangleCorners.length !== 3) throw new LafeaMeshingError('minimumAngleDegreesOf requires exactly 3 corner points', 'NOT_A_TRIANGLE');
  const angles = [0, 1, 2].map((i) => {
    const a = triangleCorners[i];
    const b = triangleCorners[(i + 1) % 3];
    const c = triangleCorners[(i + 2) % 3];
    const ab = { x: b.x - a.x, y: b.y - a.y };
    const ac = { x: c.x - a.x, y: c.y - a.y };
    const dot = ab.x * ac.x + ab.y * ac.y;
    const cross = ab.x * ac.y - ab.y * ac.x;
    return Math.atan2(Math.abs(cross), dot) * (180 / Math.PI);
  });
  return Math.min(...angles);
}

export function qualifyMinimumAngle(triangleCorners, { warn, block }) {
  const value = minimumAngleDegreesOf(triangleCorners);
  return Object.freeze({ metric: 'MINIMUM_ANGLE_DEGREES', value, status: classify(value, { warnAt: warn, blockAt: block, worseIsHigher: false }) });
}

function highOrderQualitySampling(nodeType) {
  return nodeType === 'T6'
    ? {
      shapeFn: t6ShapeFunctions,
      samplePoints: [...T6_CORNER_NATURAL_POINTS, ...T6_INTEGRATION_NATURAL_POINTS],
    }
    : {
      shapeFn: q8ShapeFunctions,
      samplePoints: [...Q8_CORNER_NATURAL_POINTS, ...Q8_INTEGRATION_NATURAL_POINTS],
    };
}

/**
 * Determinant mapping statistics on the exact natural-point set used by the
 * high-order scaled-Jacobian gate. This is inspection evidence only: no
 * determinant-ratio acceptance threshold is defined here.
 *
 * `positiveDeterminantRatio` is min(detJ)/max(detJ) only when every sampled
 * determinant is strictly positive. If any sampled determinant is nonpositive
 * the ratio is null; the existing scaled-Jacobian gate remains the qualified
 * fail-closed authority for inversion/nonpositive mapping.
 */
export function jacobianDeterminantStatisticsOf(nodeType, physicalNodes) {
  if (nodeType !== 'T6' && nodeType !== 'Q8') {
    throw new LafeaMeshingError(
      'jacobianDeterminantStatisticsOf requires T6 or Q8',
      'HIGH_ORDER_ELEMENT_REQUIRED',
    );
  }
  const { shapeFn, samplePoints } = highOrderQualitySampling(nodeType);
  const determinants = samplePoints.map(({ xi, eta }) => (
    jacobianAt(shapeFn(xi, eta), physicalNodes).determinant
  ));
  if (determinants.some((value) => !Number.isFinite(value))) {
    throw new LafeaMeshingError(
      'Non-finite Jacobian determinant in high-order mapping inspection',
      'NONFINITE_JACOBIAN_DETERMINANT',
    );
  }
  const minimum = Math.min(...determinants);
  const maximum = Math.max(...determinants);
  const nonPositiveSampleCount = determinants.filter((value) => value <= 0).length;
  return Object.freeze({
    sampleCount: determinants.length,
    minimum,
    maximum,
    positiveDeterminantRatio: minimum > 0 && maximum > 0 ? minimum / maximum : null,
    nonPositiveSampleCount,
  });
}

/**
 * Minimum scaled Jacobian for a high-order element. The mesh-quality gate
 * samples both the natural corners and every integration point used by the
 * corresponding LAFEA.3 stiffness formulation. This keeps upstream mesh
 * acceptance at least as strict as the downstream element-map requirement:
 * a mesh cannot be retained as PASS while the solver later discovers a
 * non-positive mapping at one of its own Gauss points.
 */
export function minimumScaledJacobianOf(nodeType, physicalNodes) {
  const { shapeFn, samplePoints } = highOrderQualitySampling(nodeType);
  const values = samplePoints.map(({ xi, eta }) => (
    scaledJacobianAt(shapeFn(xi, eta), physicalNodes)
  ));
  return Math.min(...values);
}

export function qualifyScaledJacobian(nodeType, physicalNodes, { warn, block }) {
  const value = minimumScaledJacobianOf(nodeType, physicalNodes);
  return Object.freeze({
    metric: 'SCALED_JACOBIAN',
    value,
    status: value <= 0 ? 'BLOCK' : classify(value, { warnAt: warn, blockAt: block, worseIsHigher: false }),
  });
}

/**
 * Shell warpage: the dihedral angle in degrees between the two triangular
 * subfaces of a quad split along one diagonal (spec §10.3). For a planar 2D
 * continuum mesh (z always 0) this is always exactly 0 — the metric is
 * shared, ready for the shell mesher a later phase adds.
 *
 * @param {readonly {x:number,y:number,z:number}[]} quadCorners Exactly 4, CCW.
 */
export function shellWarpageDegreesOf(quadCorners) {
  if (quadCorners.length !== 4) throw new LafeaMeshingError('shellWarpageDegreesOf requires exactly 4 corner points', 'NOT_A_QUAD');
  const [a, b, c, d] = quadCorners;
  const normal1 = crossProduct(subtract(b, a), subtract(c, a));
  const normal2 = crossProduct(subtract(c, a), subtract(d, a));
  const cosTheta = dotProduct(normal1, normal2) / (normOf(normal1) * normOf(normal2));
  const clamped = Math.max(-1, Math.min(1, cosTheta));
  return Math.acos(clamped) * (180 / Math.PI);
}

export function qualifyShellWarpage(quadCorners, { warn, block }) {
  const value = shellWarpageDegreesOf(quadCorners);
  return Object.freeze({ metric: 'SHELL_WARPAGE_DEGREES', value, status: classify(value, { warnAt: warn, blockAt: block, worseIsHigher: true }) });
}

function subtract(p, q) { return { x: p.x - q.x, y: p.y - q.y, z: (p.z ?? 0) - (q.z ?? 0) }; }
function crossProduct(u, v) { return { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x }; }
function dotProduct(u, v) { return u.x * v.x + u.y * v.y + u.z * v.z; }
function normOf(v) { return Math.hypot(v.x, v.y, v.z); }

/** Circumferential quadratic-edge count around a discretized boundary loop (holes, weld/attachment footprints). */
export function qualifyBoundarySegmentCount(segmentCount, minimum) {
  return Object.freeze({ metric: 'BOUNDARY_SEGMENT_COUNT', value: segmentCount, status: segmentCount >= minimum ? 'OK' : 'BLOCK', minimum });
}

/** Shell element size relative to declared thickness: spec §10.3 default band is 0.5t-2t near local attachments. */
export function qualifyShellSizeToThicknessRatio(elementSize, thickness, { minimumMultiple, maximumMultiple }) {
  const ratio = elementSize / thickness;
  const status = ratio < minimumMultiple || ratio > maximumMultiple ? 'WARNING' : 'OK';
  return Object.freeze({ metric: 'SHELL_SIZE_TO_THICKNESS_RATIO', value: ratio, status, minimumMultiple, maximumMultiple });
}

/** Worst (highest-severity) status among a list of gate results — BLOCK > WARNING > OK. */
export function worstStatus(results) {
  const severity = { OK: 0, WARNING: 1, BLOCK: 2 };
  return results.reduce((worst, result) => (severity[result.status] > severity[worst] ? result.status : worst), 'OK');
}
