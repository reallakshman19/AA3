/**
 * MEC-21 pressure-expansion free movements for a circular pipe bend.
 *
 * Inputs use SI units. The returned translations and rotations use the
 * CAESAR/MEC bend axes: `a` is tangent toward the far end, `b` is normal to
 * the bend plane, and `c = a x b` points toward the bend centre.
 *
 * Source: MEC-21 Part II, section 2.3.5.2, equation (2.25). The equation
 * supplies free movement only; the caller converts it to an initial-strain
 * load with the stiffness actually assembled for the bend element.
 */

export const MEC21_BEND_PRESSURE_EXPANSION_FORMULATION =
  'MEC21_PART_II_EQ_2_25_BEND_PRESSURE_FREE_MOVEMENT_V1';

/** Derive one positive-angle bend arc's pressure-induced free end movement. */
export function deriveMec21BendPressureFreeMovement(input) {
  const bendAngle = positive(input?.bendAngle, 'bendAngle');
  return deriveMec21BendPressureState(input, bendAngle);
}

/**
 * Derive the free state at a cumulative station angle measured from one
 * physical bend's initial point. Unlike the standalone movement helper this
 * accepts the initial station `bendAngle = 0`, where the free state is zero.
 *
 * This exists so a discretized stiffness model can sample one physical
 * bend-level MEC-21 field at all analysis stations instead of restarting
 * equation (2.25) independently on every numerical chord.
 */
export function deriveMec21BendPressureFreeState(input) {
  const bendAngle = nonnegative(input?.bendAngle, 'bendAngle');
  return deriveMec21BendPressureState(input, bendAngle);
}

function deriveMec21BendPressureState(input, bendAngle) {
  const pressure = nonnegative(input?.pressure, 'pressure');
  const innerRadius = positive(input?.innerRadius, 'innerRadius');
  const bendRadius = positive(input?.bendRadius, 'bendRadius');
  const elasticModulus = positive(input?.elasticModulus, 'elasticModulus');
  const secondMoment = positive(input?.secondMoment, 'secondMoment');
  const poissonRatio = poisson(input?.poissonRatio);
  if (!(bendAngle < Math.PI)) throw new TypeError('bendAngle must be less than pi radians.');

  const radiusRatioSquared = (innerRadius / bendRadius) ** 2;
  const shellCorrection = (1 - poissonRatio)
    + 0.75 * (2 - poissonRatio) * radiusRatioSquared;
  const curvatureChangeRatio = Math.PI * pressure * innerRadius ** 4
    * shellCorrection / (elasticModulus * secondMoment);
  const translationScale = curvatureChangeRatio * bendRadius;

  return Object.freeze({
    formulation: MEC21_BEND_PRESSURE_EXPANSION_FORMULATION,
    translationAbc: Object.freeze([
      translationScale * (Math.sin(bendAngle) - bendAngle),
      0,
      translationScale * (Math.cos(bendAngle) - 1),
    ]),
    rotationAbc: Object.freeze([0, curvatureChangeRatio * bendAngle, 0]),
    curvatureChangeRatio,
    shellCorrection,
  });
}

function nonnegative(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new TypeError(`${field} must be finite and nonnegative.`);
  }
  return number;
}

function positive(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new TypeError(`${field} must be finite and positive.`);
  }
  return number;
}

function poisson(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number >= 0.5) {
    throw new TypeError('poissonRatio must be finite and in [0, 0.5).');
  }
  return number;
}
