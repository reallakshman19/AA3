const SHA256_HEX = /^[a-f0-9]{64}$/u;
const EXACT_GAMMA_POLICY = 'EXACT_SOURCE_TABULATED_GAMMA_ONLY';
const EXACT_GAMMA_SCOPE = 'CYLINDRICAL_EXACT_SOURCE_TABULATED_GAMMA';
const VARIANTS = Object.freeze(['ORIGINAL','EXTRAPOLATED']);

export function evaluateEmp1LocalMethodScope(method, source) {
  const scope = method?.scopeContract ?? null;
  if (!scope) {
    return freeze({ status: 'PASS_NO_SCOPE_CONTRACT', bounded: false, reasons: [] });
  }
  const reasons = [];
  if (scope.schema !== 'emp1-local-method-scope/v1') reasons.push('EMP1_LOCAL_METHOD_SCOPE_SCHEMA_INVALID');
  if (scope.type !== EXACT_GAMMA_SCOPE) reasons.push('EMP1_LOCAL_METHOD_SCOPE_TYPE_UNSUPPORTED');
  if (scope.gammaSelectionPolicy !== EXACT_GAMMA_POLICY) reasons.push('EMP1_LOCAL_METHOD_SCOPE_GAMMA_POLICY_INVALID');
  if (scope.nonTabulatedGamma !== 'BLOCKED') reasons.push('EMP1_LOCAL_METHOD_SCOPE_NON_TABULATED_POLICY_INVALID');
  if (scope.interpolationAllowed !== false) reasons.push('EMP1_LOCAL_METHOD_SCOPE_INTERPOLATION_MUST_BE_FALSE');
  if (scope.crossVariantFallbackAllowed !== false) reasons.push('EMP1_LOCAL_METHOD_SCOPE_VARIANT_FALLBACK_MUST_BE_FALSE');
  if (!Number.isFinite(scope.machineRoundOffRelativeTolerance) || scope.machineRoundOffRelativeTolerance <= 0 || scope.machineRoundOffRelativeTolerance > 1e-12) {
    reasons.push('EMP1_LOCAL_METHOD_SCOPE_ROUNDOFF_TOLERANCE_INVALID');
  }
  if (!SHA256_HEX.test(scope.sourceDocumentSha256 ?? '') || scope.sourceDocumentSha256 !== method.sourceDocumentSha256) {
    reasons.push('EMP1_LOCAL_METHOD_SCOPE_SOURCE_SHA_MISMATCH');
  }
  if (!nonEmpty(scope.scopeContractHash)) reasons.push('EMP1_LOCAL_METHOD_SCOPE_HASH_REQUIRED');

  const local = source?.localMethod;
  if (!source || !local || typeof local !== 'object') {
    reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_SOURCE_REQUIRED');
  } else {
    if (local.requested !== true) reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_NOT_REQUESTED');
    if (local.sourceSha256 !== scope.sourceDocumentSha256) reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_SOURCE_SHA_MISMATCH');
    if (local.shellFamily !== 'CYLINDRICAL') reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_SHELL_FAMILY_INVALID');
    if (local.gammaSelectionPolicy !== EXACT_GAMMA_POLICY) reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_GAMMA_POLICY_INVALID');
    if (local.sourceParameterResolved !== true) reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_SOURCE_PARAMETER_UNRESOLVED');
    if (local.interpolationUsed !== false) reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_INTERPOLATION_PROHIBITED');
    if (local.extrapolationFallbackUsed !== false) reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_VARIANT_FALLBACK_PROHIBITED');
    if (!VARIANTS.includes(local.variant)) reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_VARIANT_INVALID');
    if (!positiveFinite(local.gamma) || !positiveFinite(local.sourceGamma)) {
      reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_GAMMA_INVALID');
    } else if (!roundOffEquivalent(local.gamma, local.sourceGamma, scope.machineRoundOffRelativeTolerance)) {
      reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_NON_TABULATED_GAMMA');
    }
  }

  return freeze({
    status: reasons.length ? 'BLOCKED_SCOPE_MISMATCH' : 'PASS_BOUNDED_SCOPE',
    bounded: true,
    scopeType: EXACT_GAMMA_SCOPE,
    gammaSelectionPolicy: EXACT_GAMMA_POLICY,
    reasons,
  });
}

function roundOffEquivalent(actual, source, relativeTolerance) {
  return Math.abs(actual - source) <= Math.max(1, Math.abs(source)) * relativeTolerance;
}
function positiveFinite(value) { return Number.isFinite(value) && value > 0; }
function nonEmpty(value) { return typeof value === 'string' && value.trim().length > 0; }
function freeze(value) { Object.values(value).forEach((child) => { if (child && typeof child === 'object') Object.freeze(child); }); return Object.freeze(value); }
