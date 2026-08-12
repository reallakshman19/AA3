/**
 * Dimensionally consistent convergence metrics for the M047 friction active set.
 *
 * Friction state changes are driven by tangential translations. Rotations are
 * not part of the Coulomb constitutive law and must never be mixed with metres
 * in one Euclidean update norm.
 */

export function buildCaesarFrictionTangentialTranslationVector(
  restraintsInput,
  relativeTranslationsByRestraint,
) {
  if (!Array.isArray(restraintsInput) || restraintsInput.length === 0) {
    throw new TypeError('friction convergence requires a non-empty restraint array.');
  }
  if (!relativeTranslationsByRestraint || typeof relativeTranslationsByRestraint !== 'object') {
    throw new TypeError('relativeTranslationsByRestraint must be an object.');
  }
  return Object.freeze(restraintsInput.flatMap((restraint, index) => {
    const restraintId = String(restraint?.restraintId ?? '').trim();
    if (!restraintId) throw new TypeError(`restraints[${index}].restraintId is required.`);
    const normal = unit3(restraint.normalDirection, `${restraintId}.normalDirection`);
    const translation = vector3(
      relativeTranslationsByRestraint[restraintId],
      `${restraintId}.relativeTranslation`,
    );
    const normalComponent = dot3(translation, normal);
    return translation.map((value, axis) => clean(value - normalComponent * normal[axis]));
  }));
}

/**
 * Dimensionless relative update with a one-metre scale floor, matching the
 * prior Stage 2 normalization convention without mixing physical dimensions.
 */
export function normalizedCaesarFrictionTranslationUpdate(currentInput, previousInput) {
  const current = finiteVector(currentInput, 'currentTangentialTranslations');
  const previous = finiteVector(previousInput, 'previousTangentialTranslations');
  if (current.length !== previous.length) {
    throw new TypeError('friction translation update vectors must have the same length.');
  }
  const delta = Math.hypot(...current.map((value, index) => value - previous[index]));
  const scale = Math.max(1, Math.hypot(...current));
  return delta / scale;
}

function vector3(value, field) {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new TypeError(`${field} must contain exactly three translations.`);
  }
  return finiteVector(value, field);
}

function finiteVector(value, field) {
  if (!Array.isArray(value)) throw new TypeError(`${field} must be an array.`);
  const result = value.map(Number);
  if (result.some((entry) => !Number.isFinite(entry))) {
    throw new TypeError(`${field} must contain only finite values.`);
  }
  return result;
}

function unit3(value, field) {
  const vector = vector3(value, field);
  const magnitude = Math.hypot(...vector);
  if (!(magnitude > 0)) throw new TypeError(`${field} must be nonzero.`);
  return vector.map((entry) => entry / magnitude);
}

function dot3(left, right) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function clean(value) {
  return Object.is(value, -0) || Math.abs(value) < 1e-15 ? 0 : value;
}
