export const BEND_RETOPOLOGY_RELATIVE_TOLERANCE = 1e-9;
export const BEND_RETOPOLOGY_TYPES = Object.freeze(['BEND', 'ELBOW']);
/**
 * Types that are not bends but can still declare a bend arc.
 *
 * A bend element carrying a tee at its node is classified by that tee, and the
 * classification says nothing about whether the element curves.
 */
export const ARC_BEARING_COMPONENT_TYPES = Object.freeze(['TEE']);

export class BendRetopologyError extends Error {
  constructor(message, code, data = null) {
    super(message);
    this.name = 'BendRetopologyError';
    this.code = code;
    this.data = data;
  }
}

export function failBendRetopology(code, message, data) {
  throw new BendRetopologyError(message, code, data);
}

export function requireBendRetopologyGeometry(geometry) {
  if (!geometry || geometry.schemaVersion !== 'canonical-geometry-v1'
    || !Array.isArray(geometry.nodes) || !Array.isArray(geometry.segments)) {
    throw new TypeError('retopologiseDeclaredBends requires canonical-geometry-v1 nodes and segments.');
  }
}

export function requireBendRetopologyChordCount(profile) {
  const value = profile?.bendSeedingSegments?.value;
  if (!Number.isInteger(value) || value < 2 || value % 2 !== 0) {
    failBendRetopology(
      'BEND_RETOPOLOGY_CHORD_COUNT_INVALID',
      'bendSeedingSegments.value must be an even integer >= 2 so a mid-arc station exists.',
      { value },
    );
  }
  return value;
}

export function requireBendRetopologyLengthErrorLimit(profile) {
  const value = profile?.bendLengthErrorLimit?.value;
  if (typeof value !== 'number' || !Number.isFinite(value) || !(value > 0)) {
    failBendRetopology(
      'BEND_RETOPOLOGY_PROFILE_INVALID',
      'bendLengthErrorLimit.value must be declared and positive.',
      { key: 'bendLengthErrorLimit', value },
    );
  }
  return value;
}

export function compareAscii(left, right) {
  const a = String(left);
  const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}
