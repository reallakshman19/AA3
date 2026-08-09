import { curveLength } from '../lafea-geometry/vertex-curve.js';

/**
 * Conservative logical-quadrilateral recognition for a closed planar loop.
 *
 * A declared curve junction with a real tangent discontinuity is a mandatory
 * logical corner and is never merged away. Tangent-continuous junctions are
 * allowed to remain inside one logical side, which lets feature/load vertices
 * split a side without destroying mapped-mesh eligibility.
 *
 * A regular single Coons block requires four non-tangent boundary corners. A
 * filleted-away corner is therefore not manufactured from a tangent point: at
 * such a point the two parametric boundary directions are collinear and the
 * mapped Jacobian is singular by construction. Filleted regions that no longer
 * retain four hard corners require a later multi-block decomposition and fall
 * back to the unstructured path here.
 */
export const LAFEA_LOGICAL_FOUR_SIDE_REVISION = 'LAFEA.10.LOGICAL-4-SIDE.V1';

const HARD_CORNER_ANGLE_TOLERANCE = 1e-8;

/**
 * @param {Readonly<{curveIds:readonly string[]}>} loop
 * @param {Map<string,Readonly<object>>} curveById
 * @param {Map<string,Readonly<object>>} vertexById
 * @returns {ReadonlyArray<ReadonlyArray<Readonly<object>>> | null}
 */
export function logicalFourSideCurveChains(loop, curveById, vertexById) {
  const curveIds = [...(loop?.curveIds ?? [])];
  if (curveIds.length < 4) return null;
  const curves = curveIds.map((curveId) => curveById.get(curveId));
  if (curves.some((curve) => !curve)) return null;

  const hardCorners = [];
  for (let index = 0; index < curves.length; index += 1) {
    const previous = curves[(index - 1 + curves.length) % curves.length];
    const current = curves[index];
    if (junctionTurnMagnitude(previous, current, vertexById) > HARD_CORNER_ANGLE_TOLERANCE) {
      hardCorners.push(index);
    }
  }
  if (hardCorners.length !== 4) return null;

  const cornerIndices = hardCorners.sort((left, right) => left - right);
  const chains = cornerIndices.map((start, chainIndex) => {
    const end = cornerIndices[(chainIndex + 1) % cornerIndices.length];
    const indices = cyclicCurveIndices(start, end, curves.length);
    return Object.freeze(indices.map((index) => curves[index]));
  });
  if (chains.some((chain) => chain.length === 0)) return null;
  if (chains.some((chain) => chain.reduce(
    (sum, curve) => sum + curveLength(curve, vertexById), 0,
  ) <= 0)) return null;
  return Object.freeze(chains);
}

function cyclicCurveIndices(start, end, count) {
  const indices = [];
  let index = start;
  do {
    indices.push(index);
    index = (index + 1) % count;
  } while (index !== end && indices.length <= count);
  return index === end ? indices : [];
}

function junctionTurnMagnitude(previous, current, vertexById) {
  const incoming = curveTraversalTangent(previous, vertexById, true);
  const outgoing = curveTraversalTangent(current, vertexById, false);
  const cross = incoming.x * outgoing.y - incoming.y * outgoing.x;
  const dot = incoming.x * outgoing.x + incoming.y * outgoing.y;
  return Math.abs(Math.atan2(cross, dot));
}

function curveTraversalTangent(curve, vertexById, atEnd) {
  const start = vertexById.get(curve.startVertexId);
  const end = vertexById.get(curve.endVertexId);
  if (curve.type === 'LINE') return normalize({ x: end.x - start.x, y: end.y - start.y });
  const point = atEnd ? end : start;
  const radial = normalize({ x: point.x - curve.arc.center.x, y: point.y - curve.arc.center.y });
  return curve.arc.direction === 'CCW'
    ? { x: -radial.y, y: radial.x }
    : { x: radial.y, y: -radial.x };
}

function normalize(vector) {
  const length = Math.hypot(vector.x, vector.y);
  if (!(length > 0)) return { x: 0, y: 0 };
  return { x: vector.x / length, y: vector.y / length };
}
