const WRC537_SHA256 = '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';
const CURVE_MODEL = 'RATIONAL_5_OVER_6';
const GAMMA_POLICY = 'EXACT_SOURCE_TABULATED_GAMMA_ONLY';
const ROUND_OFF_RELATIVE_TOLERANCE = 1e-12;
const COEFFICIENT_NAMES = Object.freeze(['a','b','c','d','e','f','g','h','i','j']);
const VARIANTS = Object.freeze(['ORIGINAL','EXTRAPOLATED']);

export const EMP1_WRC537_EXACT_GAMMA_CORE_SCHEMA = 'emp1-wrc537-exact-gamma-core-result/v1';

/**
 * Production-core arithmetic for the bounded EMP.1.C cylindrical WRC537 route.
 *
 * This function intentionally does not select/interpolate source curves. A caller
 * must provide one already source-bound exact-gamma curve. The function rechecks
 * all capability-boundary facts before evaluating the WRC537 rational beta fit.
 */
export function evaluateEmp1Wrc537ExactGammaCurve(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw exactGammaError('EMP1_WRC537_EXACT_GAMMA_INPUT_REQUIRED');
  }
  if (input.sourceDocumentSha256 !== WRC537_SHA256) {
    throw exactGammaError('EMP1_WRC537_EXACT_GAMMA_SOURCE_SHA_MISMATCH');
  }
  if (input.curveFitModel !== CURVE_MODEL) {
    throw exactGammaError('EMP1_WRC537_EXACT_GAMMA_CURVE_MODEL_INVALID');
  }
  if (input.gammaSelectionPolicy !== GAMMA_POLICY) {
    throw exactGammaError('EMP1_WRC537_EXACT_GAMMA_SELECTION_POLICY_INVALID');
  }
  if (!VARIANTS.includes(input.variant)) {
    throw exactGammaError('EMP1_WRC537_EXACT_GAMMA_VARIANT_INVALID');
  }
  if (input.sourceParameterResolved !== true) {
    throw exactGammaError('EMP1_WRC537_EXACT_GAMMA_SOURCE_PARAMETER_UNRESOLVED');
  }
  if (input.interpolationUsed !== false) {
    throw exactGammaError('EMP1_WRC537_EXACT_GAMMA_INTERPOLATION_PROHIBITED');
  }
  if (input.extrapolationFallbackUsed !== false) {
    throw exactGammaError('EMP1_WRC537_EXACT_GAMMA_VARIANT_FALLBACK_PROHIBITED');
  }
  requireText(input.figure, 'FIGURE');
  const gamma = requirePositiveFinite(input.gamma, 'GAMMA');
  const sourceGamma = requirePositiveFinite(input.sourceGamma, 'SOURCE_GAMMA');
  if (!gammaRoundOffEquivalent(gamma, sourceGamma)) {
    throw exactGammaError('EMP1_WRC537_NON_TABULATED_GAMMA_BLOCKED');
  }
  const beta = requireFinite(input.beta, 'BETA');
  if (beta < 0) throw exactGammaError('EMP1_WRC537_BETA_DOMAIN_INVALID');

  const coefficients = normalizeCoefficients(input.coefficients);
  const numerator = coefficients.a
    + coefficients.c * beta
    + coefficients.e * beta ** 2
    + coefficients.g * beta ** 3
    + coefficients.i * beta ** 4;
  const denominator = 1
    + coefficients.b * beta
    + coefficients.d * beta ** 2
    + coefficients.f * beta ** 3
    + coefficients.h * beta ** 4
    + coefficients.j * beta ** 5;
  if (!Number.isFinite(denominator) || denominator === 0) {
    throw exactGammaError('EMP1_WRC537_RATIONAL_DENOMINATOR_INVALID');
  }
  const y = numerator / denominator;
  if (!Number.isFinite(y)) throw exactGammaError('EMP1_WRC537_RATIONAL_RESULT_INVALID');

  return deepFreeze({
    schema: EMP1_WRC537_EXACT_GAMMA_CORE_SCHEMA,
    state: 'EVALUATED_WITHIN_BOUNDED_DOMAIN',
    engineeringUseAuthorized: true,
    globalRouteAuthority: false,
    fullDomainAuthority: false,
    sourceDocumentSha256: WRC537_SHA256,
    figure: input.figure.trim(),
    variant: input.variant,
    gamma,
    sourceGamma,
    beta,
    gammaSelectionPolicy: GAMMA_POLICY,
    interpolationUsed: false,
    extrapolationFallbackUsed: false,
    numerator,
    denominator,
    y,
  });
}

export function isEmp1Wrc537ExactGammaIdentity(gamma, sourceGamma) {
  if (!Number.isFinite(gamma) || !Number.isFinite(sourceGamma) || gamma <= 0 || sourceGamma <= 0) return false;
  return gammaRoundOffEquivalent(gamma, sourceGamma);
}

function normalizeCoefficients(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw exactGammaError('EMP1_WRC537_COEFFICIENTS_REQUIRED');
  }
  const result = {};
  for (const name of COEFFICIENT_NAMES) result[name] = requireFinite(value[name], `COEFFICIENT_${name.toUpperCase()}`);
  return result;
}

function gammaRoundOffEquivalent(actual, source) {
  const tolerance = Math.max(1, Math.abs(source)) * ROUND_OFF_RELATIVE_TOLERANCE;
  return Math.abs(actual - source) <= tolerance;
}
function requireFinite(value, label) {
  if (!Number.isFinite(value)) throw exactGammaError(`EMP1_WRC537_${label}_INVALID`);
  return value;
}
function requirePositiveFinite(value, label) {
  const number = requireFinite(value, label);
  if (number <= 0) throw exactGammaError(`EMP1_WRC537_${label}_INVALID`);
  return number;
}
function requireText(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw exactGammaError(`EMP1_WRC537_${label}_INVALID`);
  return value.trim();
}
function exactGammaError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
