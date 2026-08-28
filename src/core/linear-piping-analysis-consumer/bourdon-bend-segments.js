import { failLinearPipingAnalysis } from './validation.js';

/**
 * Per-chord geometry for the Bourdon (bend-opening) pressure effect.
 *
 * The MEC-21 free field is cumulative along the arc: a chord's initial load
 * comes from the difference between the swept state at its two ends, both
 * measured from the physical bend's start rather than from the chord itself.
 * Sampling that way is what makes a free bend give q = K(d - d0) = 0 and keeps
 * its external endpoint independent of how finely the arc was subdivided.
 *
 * The reference triad is fixed once per bend, from the incoming tangent
 * direction and the first arc point, so every chord's state is expressed in one
 * frame that can be transformed to global exactly once.
 *
 * This is a port of the geometry `caesar-accdb-linear-solve.js` already uses;
 * the physics itself lives in the shared piping-component kernel and is not
 * re-implemented here.
 */
const CLOSURE_RELATIVE_TOLERANCE = 1e-10;

export function buildBourdonBendSegments(input) {
  const { points, centre, bendRadius, totalBendAngle, incomingDirection, bendId } = input;
  if (!Array.isArray(points) || points.length < 2) {
    fail(`Bend ${bendId} needs at least two arc points to build Bourdon segments.`, { bendId });
  }

  const referenceAAxis = unit(incomingDirection, bendId, 'reference a-axis');
  const referenceCAxis = unit(subtract(centre, points[0]), bendId, 'reference c-axis');
  const referenceAxes = Object.freeze({
    aAxis: Object.freeze([...referenceAAxis]),
    bAxis: Object.freeze([...unit(cross(referenceCAxis, referenceAAxis), bendId, 'reference b-axis')]),
    cAxis: Object.freeze([...referenceCAxis]),
  });

  const segments = [];
  let cumulativeAngle = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const pointI = points[index];
    const pointJ = points[index + 1];
    const cAxis = unit(subtract(centre, pointI), bendId, `chord ${index} c-axis`);
    const nextCAxis = unit(subtract(centre, pointJ), bendId, `chord ${index} next c-axis`);
    const chordDirection = unit(subtract(pointJ, pointI), bendId, `chord ${index} direction`);
    const tangentProjection = subtract(chordDirection, scale(cAxis, dot(chordDirection, cAxis)));
    const aAxis = unit(tangentProjection, bendId, `chord ${index} a-axis`);
    const bendAngle = Math.acos(clamp(dot(cAxis, nextCAxis), -1, 1));
    if (!(bendAngle > 0)) {
      fail(`Bend ${bendId} chord ${index} sweeps no angle.`, { bendId, chordIndex: index });
    }
    const startAngle = cumulativeAngle;
    // The last chord closes on the declared total rather than on accumulated
    // arc-cosines, so rounding cannot leave the bend fractionally open.
    const endAngle = index === points.length - 2 ? totalBendAngle : cumulativeAngle + bendAngle;
    cumulativeAngle = endAngle;
    segments.push(Object.freeze({
      aAxis: Object.freeze([...aAxis]),
      bAxis: Object.freeze([...unit(cross(cAxis, aAxis), bendId, `chord ${index} b-axis`)]),
      cAxis: Object.freeze([...cAxis]),
      bendAngle,
      bendRadius,
      startAngle,
      endAngle,
      referenceAxes,
    }));
  }

  const closureError = Math.abs(cumulativeAngle - totalBendAngle);
  if (closureError > CLOSURE_RELATIVE_TOLERANCE * Math.max(1, totalBendAngle)) {
    fail(
      `Bend ${bendId} discretized angle ${cumulativeAngle} does not close its declared angle ${totalBendAngle}.`,
      { bendId, cumulativeAngle, totalBendAngle, closureError },
    );
  }
  return Object.freeze(segments);
}

/** Express an (a, b, c) triad vector in global coordinates. */
export function bourdonAbcVectorToGlobal(axes, vector) {
  return [0, 1, 2].map((axis) =>
    axes.aAxis[axis] * vector[0]
    + axes.bAxis[axis] * vector[1]
    + axes.cAxis[axis] * vector[2]);
}

function subtract(left, right) {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function scale(vector, factor) {
  return [vector[0] * factor, vector[1] * factor, vector[2] * factor];
}

function dot(left, right) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

function unit(vector, bendId, label) {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (!(length > 0) || !Number.isFinite(length)) {
    fail(`Bend ${bendId} ${label} is degenerate and cannot be normalized.`, { bendId, label });
  }
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function fail(message, evidence) {
  failLinearPipingAnalysis(message, 'BOURDON_BEND_GEOMETRY_INVALID', evidence);
}
