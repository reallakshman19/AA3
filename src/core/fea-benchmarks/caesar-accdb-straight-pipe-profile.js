import { sealFrameElementProfile } from '../linear-fea-frame-element/index.js';

export const CAESAR_ACCDB_STRAIGHT_PIPE_MODES = Object.freeze([
  'EULER_BERNOULLI',
  'COWPER_HOLLOW_CIRCLE_TIMOSHENKO',
]);

const PROFILE_SOURCE = 'CAESAR_ACCDB_STRAIGHT_PIPE_PROFILE_V1';

/**
 * Cowper transverse-shear correction for a hollow circular section.
 *
 * Geometry and Poisson ratio are supplied by the caller. The function does
 * not contain benchmark-specific constants and does not consume reference
 * result errors.
 */
export function cowperHollowCircleShearCorrection(input) {
  const outerDiameter = positive(input?.outerDiameter, 'outerDiameter');
  const innerDiameter = nonnegative(input?.innerDiameter, 'innerDiameter');
  const poissonRatio = finite(input?.poissonRatio, 'poissonRatio');
  if (!(innerDiameter < outerDiameter)) {
    throw new TypeError('innerDiameter must be smaller than outerDiameter.');
  }
  if (!(poissonRatio > -1 && poissonRatio < 0.5)) {
    throw new TypeError('poissonRatio must lie in the isotropic elastic range (-1, 0.5).');
  }
  const a = innerDiameter / outerDiameter;
  const onePlusA2 = 1 + a * a;
  const onePlusA2Squared = onePlusA2 * onePlusA2;
  const kappa = (6 * (1 + poissonRatio) * onePlusA2Squared)
    / ((7 + 6 * poissonRatio) * onePlusA2Squared + (20 + 12 * poissonRatio) * a * a);
  if (!(kappa > 0 && kappa < 1)) {
    throw new TypeError(`Cowper hollow-circle shear correction is invalid: ${kappa}.`);
  }
  return kappa;
}

/** Build the qualified Timoshenko frame profile for an ACCDB straight pipe. */
export function cowperAccdbStraightPipeFrameProfile(input) {
  const material = input?.materialResolution?.materialState;
  const dimensions = input?.sectionResolution?.dimensions;
  if (!material || !dimensions) {
    throw new TypeError('Cowper ACCDB straight-pipe profile requires resolved material and section states.');
  }
  const source = String(input?.source ?? '').trim();
  if (!source) throw new TypeError('Cowper ACCDB straight-pipe profile requires source authority.');
  const kappa = cowperHollowCircleShearCorrection({
    outerDiameter: dimensions.outerDiameter,
    innerDiameter: dimensions.innerDiameter,
    poissonRatio: material.poissonRatio,
  });
  return sealFrameElementProfile({
    schema: 'fea-linear-frame-element-profile/v1',
    profileId: 'LINEAR-FRAME-ELEMENT-R1',
    straightPipeFormulation: 'PIPE_FRAME3D_TIMOSHENKO_V1',
    shearDeformation: true,
    shearCorrectionFactorY: { value: kappa, source },
    shearCorrectionFactorZ: { value: kappa, source },
    releaseRule: 'STATIC_CONDENSATION_V1',
    thermalStrainApproximation: 'UNIFORM_TEMPERATURE_ALPHA_DELTA_T_V1',
    releaseSingularityTolerance: { value: 1e-12, source: PROFILE_SOURCE },
    semanticHash: '',
  });
}

function finite(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${field} must be finite.`);
  return number;
}

function positive(value, field) {
  const number = finite(value, field);
  if (!(number > 0)) throw new TypeError(`${field} must be positive.`);
  return number;
}

function nonnegative(value, field) {
  const number = finite(value, field);
  if (number < 0) throw new TypeError(`${field} must be nonnegative.`);
  return number;
}
