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

export const MEC21_BEND_PRESSURE_CUMULATIVE_FIELD_FORMULATION =
  'MEC21_PART_II_EQ_2_25_COMPATIBLE_CUMULATIVE_NODAL_FIELD_V1';

const AXIS_TOLERANCE = 1e-9;

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

/**
 * Sample one compatible physical bend free-deformation field at the I and J
 * cumulative arc stations of a discretized bend segment.
 *
 * Eq. (2.25) is referenced to the physical bend tangent-start a-b-c system.
 * Therefore every discretization station must be sampled in that same system;
 * resetting the Eq. (2.25) I-end movement to zero independently for every
 * sub-element creates an incompatible translation field under subdivision.
 */
export function deriveMec21BendPressureCumulativeField(input) {
  const referenceAxes = requireAbcAxes(input?.referenceAxes);
  const cumulativeAngleI = nonnegative(input?.cumulativeAngleI, 'cumulativeAngleI');
  const cumulativeAngleJ = positive(input?.cumulativeAngleJ, 'cumulativeAngleJ');
  if (!(cumulativeAngleJ < Math.PI)) {
    throw new TypeError('cumulativeAngleJ must be less than pi radians.');
  }
  if (!(cumulativeAngleJ > cumulativeAngleI)) {
    throw new TypeError('cumulativeAngleJ must be greater than cumulativeAngleI.');
  }

  const common = {
    pressure: input?.pressure,
    innerRadius: input?.innerRadius,
    bendRadius: input?.bendRadius,
    elasticModulus: input?.elasticModulus,
    secondMoment: input?.secondMoment,
    poissonRatio: input?.poissonRatio,
  };
  const atI = cumulativeAngleI === 0
    ? zeroStationMovement(common)
    : deriveMec21BendPressureFreeMovement({ ...common, bendAngle: cumulativeAngleI });
  const atJ = deriveMec21BendPressureFreeMovement({ ...common, bendAngle: cumulativeAngleJ });
  const translationGlobalI = abcTranslationToGlobal(referenceAxes, atI.translationAbc);
  const translationGlobalJ = abcTranslationToGlobal(referenceAxes, atJ.translationAbc);
  const rotationGlobalI = abcRotationToGlobal(referenceAxes, atI.rotationAbc);
  const rotationGlobalJ = abcRotationToGlobal(referenceAxes, atJ.rotationAbc);

  return Object.freeze({
    formulation: MEC21_BEND_PRESSURE_CUMULATIVE_FIELD_FORMULATION,
    cumulativeAngleI,
    cumulativeAngleJ,
    referenceAxes,
    translationGlobalI,
    translationGlobalJ,
    rotationGlobalI,
    rotationGlobalJ,
    incrementalTranslationGlobal: frozenVector(subtract(translationGlobalJ, translationGlobalI)),
    incrementalRotationGlobal: frozenVector(subtract(rotationGlobalJ, rotationGlobalI)),
    incrementalRotationRadians: atJ.rotationAbc[1] - atI.rotationAbc[1],
    curvatureChangeRatio: atJ.curvatureChangeRatio,
    shellCorrection: atJ.shellCorrection,
  });
}

function zeroStationMovement(input) {
  const probe = deriveMec21BendPressureFreeMovement({ ...input, bendAngle: Number.EPSILON });
  return Object.freeze({
    formulation: MEC21_BEND_PRESSURE_EXPANSION_FORMULATION,
    translationAbc: Object.freeze([0, 0, 0]),
    rotationAbc: Object.freeze([0, 0, 0]),
    curvatureChangeRatio: probe.curvatureChangeRatio,
    shellCorrection: probe.shellCorrection,
  });
}

function abcTranslationToGlobal(axes, translationAbc) {
  return frozenVector(add(
    scale(axes.a, translationAbc[0]),
    scale(axes.c, translationAbc[2]),
  ));
}

function abcRotationToGlobal(axes, rotationAbc) {
  return frozenVector(scale(axes.b, rotationAbc[1]));
}

function requireAbcAxes(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('referenceAxes must be an object containing a, b and c vectors.');
  }
  const a = unitVector(value.a, 'referenceAxes.a');
  const b = unitVector(value.b, 'referenceAxes.b');
  const c = unitVector(value.c, 'referenceAxes.c');
  if (Math.abs(dot(a, b)) > AXIS_TOLERANCE
    || Math.abs(dot(a, c)) > AXIS_TOLERANCE
    || Math.abs(dot(b, c)) > AXIS_TOLERANCE) {
    throw new TypeError('referenceAxes must be mutually orthogonal.');
  }
  const expectedC = cross(a, b);
  if (norm(subtract(expectedC, c)) > AXIS_TOLERANCE) {
    throw new TypeError('referenceAxes must be right-handed with c = a x b.');
  }
  return Object.freeze({ a, b, c });
}

function unitVector(value, field) {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new TypeError(`${field} must contain three components.`);
  }
  const vector = value.map((entry) => Number(entry));
  if (vector.some((entry) => !Number.isFinite(entry))) {
    throw new TypeError(`${field} must contain finite components.`);
  }
  if (Math.abs(norm(vector) - 1) > AXIS_TOLERANCE) {
    throw new TypeError(`${field} must be a unit vector.`);
  }
  return Object.freeze(vector);
}

function frozenVector(value) {
  return Object.freeze(value.map((entry) => Object.is(entry, -0) ? 0 : entry));
}

function add(left, right) {
  return left.map((value, index) => value + right[index]);
}

function subtract(left, right) {
  return left.map((value, index) => value - right[index]);
}

function scale(vector, factor) {
  return vector.map((value) => value * factor);
}

function dot(left, right) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function norm(vector) {
  return Math.hypot(...vector);
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
