/**
 * The collinear-backtrack rule, independent of where the geometry came from.
 *
 * A short element whose declared translation opposes the run it sits in walks
 * backwards over centreline a neighbour already owns, so two elements claim the
 * same physical interval. That is what
 * TOPOLOGY_COLLINEAR_SEGMENT_OVERLAP reports, and negating the short element's
 * vector is the correction.
 *
 * This was extracted from the InputXML repair so an ACCDB import can be told
 * the same thing about itself. The rule is identical in both; only the source
 * of the vectors and what may be done about it differ. An ACCDB model's
 * geometry is owned by the file -- accdb-field-overrides.js excludes
 * DELTA_X/Y/Z precisely so an override can never silently move a model -- so
 * that path diagnoses and does not rewrite.
 */

const PARALLEL_RELATIVE_TOLERANCE = 1e-9;

/**
 * @param {Array<Array<number>>} vectors Declared translations, in source order.
 * @param {number} shortLengthLimit Below this a vector is a repair candidate;
 *   above it the vector is long enough to define the run's direction.
 * @returns {Array<object>} `{ index, vector, length, before, after }` per match.
 */
export function findCollinearBacktracks(vectors, shortLengthLimit) {
  const matches = [];
  for (let index = 0; index < vectors.length; index += 1) {
    const vector = vectors[index];
    const length = magnitude(vector);
    if (length === 0 || length > shortLengthLimit) continue;
    const before = nearestLong(vectors, index, -1, shortLengthLimit);
    const after = nearestLong(vectors, index, 1, shortLengthLimit);
    if (before === null || after === null) continue;
    if (!isParallel(vector, before) || !isParallel(vector, after)) continue;
    // Opposing BOTH neighbours is what distinguishes a backtrack from a
    // legitimate short element at a direction change.
    if (dot(vector, before) >= 0 || dot(vector, after) >= 0) continue;
    matches.push({ index, vector, length, before, after });
  }
  return matches;
}

export function magnitude(vector) {
  return Math.hypot(...vector);
}

export function dot(left, right) {
  return left.reduce((sum, value, axis) => sum + value * right[axis], 0);
}

/** Parallel means the cross product vanishes; both vectors are non-zero here. */
export function isParallel(left, right) {
  const cross = [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
  return magnitude(cross) <= PARALLEL_RELATIVE_TOLERANCE * magnitude(left) * magnitude(right);
}

function nearestLong(vectors, from, step, shortLengthLimit) {
  for (let index = from + step; index >= 0 && index < vectors.length; index += step) {
    if (magnitude(vectors[index]) > shortLengthLimit) return vectors[index];
  }
  return null;
}
