/**
 * MEC-21 / CAESAR pressure-expansion free movements for a circular pipe bend.
 *
 * Inputs use SI units. MEC-21 Part II equation (2.25) reports the bend-opening
 * contribution at the final point in that final station's local a-b-c basis:
 * `a` is tangent toward the far end, `b` is normal to the bend plane, and
 * `c = a x b` points toward the bend centre.
 *
 * CAESAR's Translational + Rotational Bourdon option retains the translational
 * pressure-elongation effect and adds bend opening/rotation. A discretized
 * structural model therefore needs a cumulative physical nodal free field that
 * combines:
 *   1. uniform closed-end pressure axial strain integrated along the bend arc;
 *   2. MEC-21 equation (2.25) bend-opening translation and rotation.
 *
 * `deriveMec21BendPressureFreeState` resolves that composite state into the
 * physical bend's INITIAL a-b-c basis. The original equation (2.25) components
 * remain exposed separately for qualification.
 */

export const MEC21_BEND_PRESSURE_EXPANSION_FORMULATION =
  'MEC21_PART_II_EQ_2_25_BEND_PRESSURE_FREE_MOVEMENT_V1';

/**
 * Derive one positive-angle bend arc's MEC-21 equation (2.25) bend-opening
 * movement in the FINAL-STATION local a-b-c basis. This helper intentionally
 * excludes the separate uniform pressure-elongation contribution.
 */
export function deriveMec21BendPressureFreeMovement(input) {
  const bendAngle = positive(input?.bendAngle, 'bendAngle');
  const localFinal = deriveMec21BendOpeningLocalFinalState(input, bendAngle);
  return Object.freeze({
    ...localFinal,
    basis: 'STATION_FINAL_ABC',
  });
}

/**
 * Derive the composite pressure free state at a cumulative station angle
 * measured from one physical bend's initial point. This accepts
 * `bendAngle = 0`, where the free state is zero.
 *
 * `translationAbc` and `rotationAbc` are resolved in the BEND-INITIAL a-b-c
 * basis and represent the CAESAR Translational + Rotational decomposition:
 * uniform pressure elongation plus MEC-21 bend opening. The two contributions
 * and the literal final-local equation (2.25) values are retained separately
 * so qualification can prove there is neither omission nor double counting.
 */
export function deriveMec21BendPressureFreeState(input) {
  const bendAngle = nonnegative(input?.bendAngle, 'bendAngle');
  const bendOpening = deriveMec21BendOpeningLocalFinalState(input, bendAngle);
  const innerRadius = positive(input?.innerRadius, 'innerRadius');
  const bendRadius = positive(input?.bendRadius, 'bendRadius');
  const elasticModulus = positive(input?.elasticModulus, 'elasticModulus');
  const secondMoment = positive(input?.secondMoment, 'secondMoment');
  const pressure = nonnegative(input?.pressure, 'pressure');
  const poissonRatio = poisson(input?.poissonRatio);
  const outerRadius = annulusOuterRadius(innerRadius, secondMoment);
  const uniformPressureAxialStrain = pressure === 0
    ? 0
    : (1 - 2 * poissonRatio) * pressure * innerRadius ** 2
      / (elasticModulus * (outerRadius ** 2 - innerRadius ** 2));

  const cosine = Math.cos(bendAngle);
  const sine = Math.sin(bendAngle);
  const [ua, ub, uc] = bendOpening.translationAbc;
  const [ra, rb, rc] = bendOpening.rotationAbc;

  // Station basis relative to bend-initial basis:
  // a(theta) = cos(theta) a0 + sin(theta) c0
  // b(theta) = b0
  // c(theta) = -sin(theta) a0 + cos(theta) c0
  const bendOpeningTranslationInitialAbc = Object.freeze([
    cosine * ua - sine * uc,
    ub,
    sine * ua + cosine * uc,
  ]);
  const bendOpeningRotationInitialAbc = Object.freeze([
    cosine * ra - sine * rc,
    rb,
    sine * ra + cosine * rc,
  ]);

  // Uniform pressure strain follows the original centreline tangent. Its
  // integrated displacement is epsilon_p times the original station position
  // measured from the bend initial point.
  const uniformPressureTranslationInitialAbc = Object.freeze([
    uniformPressureAxialStrain * bendRadius * sine,
    0,
    uniformPressureAxialStrain * bendRadius * (1 - cosine),
  ]);
  const translationInitialAbc = Object.freeze(
    bendOpeningTranslationInitialAbc.map((value, index) =>
      value + uniformPressureTranslationInitialAbc[index]),
  );

  return Object.freeze({
    formulation: bendOpening.formulation,
    basis: 'BEND_INITIAL_ABC',
    translationAbc: translationInitialAbc,
    rotationAbc: bendOpeningRotationInitialAbc,
    uniformPressureAxialStrain,
    uniformPressureTranslationAbc: uniformPressureTranslationInitialAbc,
    bendOpeningTranslationAbc: bendOpeningTranslationInitialAbc,
    bendOpeningRotationAbc: bendOpeningRotationInitialAbc,
    localFinalTranslationAbc: bendOpening.translationAbc,
    localFinalRotationAbc: bendOpening.rotationAbc,
    curvatureChangeRatio: bendOpening.curvatureChangeRatio,
    shellCorrection: bendOpening.shellCorrection,
    inferredOuterRadius: outerRadius,
  });
}

function deriveMec21BendOpeningLocalFinalState(input, bendAngle) {
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

function annulusOuterRadius(innerRadius, secondMoment) {
  const fourthPower = innerRadius ** 4 + 4 * secondMoment / Math.PI;
  const outerRadius = fourthPower ** 0.25;
  if (!(outerRadius > innerRadius)) {
    throw new TypeError('secondMoment does not define a valid circular annulus for the supplied innerRadius.');
  }
  return outerRadius;
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
