/**
 * MEC-21 pressure-expansion free movements for a circular pipe bend.
 *
 * Inputs use SI units. MEC-21 Part II equation (2.25) reports the final-point
 * translation and rotation components in that final station's local a-b-c
 * basis: `a` is tangent toward the far end, `b` is normal to the bend plane,
 * and `c = a x b` points toward the bend centre.
 *
 * A discretized structural model also needs a cumulative nodal free field.
 * `deriveMec21BendPressureFreeState` therefore resolves the same physical
 * station state into the physical bend's INITIAL a-b-c basis. That initial
 * basis is fixed for the bend and can be mapped once into global coordinates.
 *
 * Source: MEC-21 Part II, section 2.3.5.2, equation (2.25). These helpers
 * supply free movement only; callers convert it to an initial-strain load with
 * the stiffness actually assembled for the bend element.
 */

export const MEC21_BEND_PRESSURE_EXPANSION_FORMULATION =
  'MEC21_PART_II_EQ_2_25_BEND_PRESSURE_FREE_MOVEMENT_V1';

/**
 * Derive one positive-angle bend arc's pressure-induced free end movement in
 * the MEC-21 FINAL-STATION local a-b-c basis exactly as equation (2.25).
 */
export function deriveMec21BendPressureFreeMovement(input) {
  const bendAngle = positive(input?.bendAngle, 'bendAngle');
  const localFinal = deriveMec21BendPressureLocalFinalState(input, bendAngle);
  return Object.freeze({
    ...localFinal,
    basis: 'STATION_FINAL_ABC',
  });
}

/**
 * Derive the physical free state at a cumulative station angle measured from
 * one physical bend's initial point. This accepts `bendAngle = 0`, where the
 * free state is zero.
 *
 * `translationAbc` and `rotationAbc` are resolved in the BEND-INITIAL a-b-c
 * basis. The original equation (2.25) station-local components are retained as
 * `localFinalTranslationAbc` and `localFinalRotationAbc` for qualification.
 *
 * This cumulative-state contract prevents a numerical bend mesh from
 * restarting equation (2.25) independently on every stiffness chord.
 */
export function deriveMec21BendPressureFreeState(input) {
  const bendAngle = nonnegative(input?.bendAngle, 'bendAngle');
  const localFinal = deriveMec21BendPressureLocalFinalState(input, bendAngle);
  const cosine = Math.cos(bendAngle);
  const sine = Math.sin(bendAngle);
  const [ua, ub, uc] = localFinal.translationAbc;
  const [ra, rb, rc] = localFinal.rotationAbc;

  // Station basis relative to bend-initial basis:
  // a(theta) = cos(theta) a0 + sin(theta) c0
  // b(theta) = b0
  // c(theta) = -sin(theta) a0 + cos(theta) c0
  const translationInitialAbc = Object.freeze([
    cosine * ua - sine * uc,
    ub,
    sine * ua + cosine * uc,
  ]);
  const rotationInitialAbc = Object.freeze([
    cosine * ra - sine * rc,
    rb,
    sine * ra + cosine * rc,
  ]);

  return Object.freeze({
    formulation: localFinal.formulation,
    basis: 'BEND_INITIAL_ABC',
    translationAbc: translationInitialAbc,
    rotationAbc: rotationInitialAbc,
    localFinalTranslationAbc: localFinal.translationAbc,
    localFinalRotationAbc: localFinal.rotationAbc,
    curvatureChangeRatio: localFinal.curvatureChangeRatio,
    shellCorrection: localFinal.shellCorrection,
  });
}

function deriveMec21BendPressureLocalFinalState(input, bendAngle) {
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
