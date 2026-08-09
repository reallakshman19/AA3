/**
 * MEC-21 pressure-expansion free movements for a circular pipe bend.
 *
 * Inputs use SI units. MEC-21 Part II section 2.3 defines element
 * flexibility/free movement at the final point in the element's local a-b-c
 * system. The ACCDB frame-load assembler, however, stores the bend segment's
 * a-b-c basis at its initial point. This module therefore retains the exact
 * Eq. (2.25) final-point components as evidence and also returns the same
 * physical movement resolved into the initial-point basis consumed by that
 * assembler.
 *
 * Source: MEC-21 Part II, section 2.3.5.2, equation (2.25). The equation
 * supplies free movement only; the caller converts it to an initial-strain
 * load with the stiffness actually assembled for the bend element.
 */

export const MEC21_BEND_PRESSURE_EXPANSION_FORMULATION =
  'MEC21_PART_II_EQ_2_25_BEND_PRESSURE_FREE_MOVEMENT_FINAL_TO_INITIAL_AXES_V2';

/** Derive one bend arc's pressure-induced free end movement. */
export function deriveMec21BendPressureFreeMovement(input) {
  const pressure = nonnegative(input?.pressure, 'pressure');
  const innerRadius = positive(input?.innerRadius, 'innerRadius');
  const bendRadius = positive(input?.bendRadius, 'bendRadius');
  const elasticModulus = positive(input?.elasticModulus, 'elasticModulus');
  const secondMoment = positive(input?.secondMoment, 'secondMoment');
  const poissonRatio = poisson(input?.poissonRatio);
  const bendAngle = positive(input?.bendAngle, 'bendAngle');
  if (!(bendAngle < Math.PI)) throw new TypeError('bendAngle must be less than pi radians.');

  const radiusRatioSquared = (innerRadius / bendRadius) ** 2;
  const shellCorrection = (1 - poissonRatio)
    + 0.75 * (2 - poissonRatio) * radiusRatioSquared;
  const curvatureChangeRatio = Math.PI * pressure * innerRadius ** 4
    * shellCorrection / (elasticModulus * secondMoment);
  const translationScale = curvatureChangeRatio * bendRadius;
  const equationTranslationFinalAbc = Object.freeze([
    translationScale * (Math.sin(bendAngle) - bendAngle),
    0,
    translationScale * (Math.cos(bendAngle) - 1),
  ]);

  // Along the directed circular bend, the final-point basis is related to the
  // initial-point basis by
  //   a_f = cos(B) a_i + sin(B) c_i
  //   c_f = -sin(B) a_i + cos(B) c_i
  // for b = c x a. Resolve the published final-basis translation into the
  // initial basis used by buildBourdonSegments. No physical magnitude, MEC-21
  // coefficient, pressure, stiffness or rotation is changed.
  const cosine = Math.cos(bendAngle);
  const sine = Math.sin(bendAngle);
  const translationAbc = Object.freeze([
    cosine * equationTranslationFinalAbc[0] - sine * equationTranslationFinalAbc[2],
    0,
    sine * equationTranslationFinalAbc[0] + cosine * equationTranslationFinalAbc[2],
  ]);

  return Object.freeze({
    formulation: MEC21_BEND_PRESSURE_EXPANSION_FORMULATION,
    equationTranslationFinalAbc,
    equationRotationFinalAbc: Object.freeze([0, curvatureChangeRatio * bendAngle, 0]),
    translationAbc,
    translationAbcFrame: 'INITIAL_POINT_EQUIVALENT_OF_MEC21_FINAL_POINT_AXES',
    rotationAbc: Object.freeze([0, curvatureChangeRatio * bendAngle, 0]),
    rotationAbcFrame: 'COMMON_BEND_PLANE_NORMAL',
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
