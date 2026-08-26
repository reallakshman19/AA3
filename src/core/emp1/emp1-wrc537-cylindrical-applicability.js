import {
  EMP1_WRC537_APPLICABILITY_SOURCE_QUALIFIED,
  emp1Wrc537ApplicabilityEvidenceFromAuthority,
  requireEmp1Wrc537QualifiedApplicabilitySourceAuthority,
} from './emp1-wrc537-applicability-source-authority.js';

export const EMP1_WRC537_CYLINDRICAL_APPLICABILITY_SCHEMA =
  'emp1-wrc537-cylindrical-applicability/v1';
export const EMP1_WRC537_STRESS_DOMAIN =
  'HOST_CYLINDRICAL_SHELL_AT_ATTACHMENT_SHELL_JUNCTURE';
export const EMP1_WRC537_MIN_CYLINDER_LENGTH_RATIO_FOR_RADIAL_LOAD = 1;
export const EMP1_WRC537_MIN_END_DISTANCE_RATIO_FOR_EXTERNAL_MOMENT = 0.5;
export const EMP1_WRC537_APPLICABILITY_SOURCE_QUALIFICATION =
  'UNQUALIFIED_FOR_PRODUCTION';

export const EMP1_WRC537_STRESS_SCOPE = deepFreeze({
  domain: EMP1_WRC537_STRESS_DOMAIN,
  shellStressesCalculated: true,
  attachmentStressesCalculated: false,
  nozzleStressesCalculated: false,
  recoveryLocation: 'ATTACHMENT_SHELL_JUNCTURE',
  sourceSection: 'WRC537_4.5.3',
});

/**
 * Evaluate the explicit WRC 537 cylindrical-shell applicability facts retained
 * from Section 4.5. This gate is deliberately load-conditional:
 * - 4.5.1 cylinder-length exclusion is applied when radial load P is active;
 * - 4.5.2 end-distance limit is applied when overturning moments Mc/Ml are active;
 * - no new geometric limit is invented here for Vc/Vl/Mt.
 *
 * Comparison callers may still provide legacy evidence, but production-qualified
 * use must provide the typed geometry source authority. The nearest end distance
 * in that path is derived from cylinder length + WRC attachment station; it is
 * never trusted as a caller-authored production datum.
 */
export function evaluateEmp1Wrc537CylindricalApplicability(input = {}) {
  const meanRadius = positive(input.meanRadius, 'MEAN_RADIUS');
  const loads = normalizeLoads(input.loads);
  const radialLoadActive = Math.abs(loads.P) > 0;
  const externalMomentActive = Math.abs(loads.Mc) > 0 || Math.abs(loads.Ml) > 0;
  if (input.sourceAuthority != null && input.evidence != null) {
    throw applicabilityError('EMP1_WRC537_CYLINDRICAL_APPLICABILITY_AUTHORITY_AND_LEGACY_EVIDENCE_CONFLICT');
  }
  const sourceAuthority = input.sourceAuthority == null
    ? null
    : requireEmp1Wrc537QualifiedApplicabilitySourceAuthority(input.sourceAuthority);
  const evidence = sourceAuthority
    ? emp1Wrc537ApplicabilityEvidenceFromAuthority(sourceAuthority)
    : normalizeLegacyEvidence(input.evidence);

  const radialLoad = evaluateRadialLoadRule({
    active: radialLoadActive,
    meanRadius,
    cylinderLength: evidence?.cylinderLength,
  });
  const externalMoment = evaluateExternalMomentRule({
    active: externalMomentActive,
    meanRadius,
    nearestCylinderEndDistance: evidence?.nearestCylinderEndDistance,
  });

  const reasons = [];
  if (!evidence) reasons.push('WRC537_4_5_APPLICABILITY_EVIDENCE_REQUIRED');
  if (radialLoad.status === 'OUTSIDE_SOURCE_LIMIT') {
    reasons.push('WRC537_4_5_1_CYLINDER_LENGTH_LT_RM');
  } else if (radialLoad.status === 'SOURCE_EVIDENCE_REQUIRED') {
    reasons.push('WRC537_4_5_1_CYLINDER_LENGTH_EVIDENCE_REQUIRED');
  }
  if (externalMoment.status === 'OUTSIDE_SOURCE_LIMIT') {
    reasons.push('WRC537_4_5_2_END_DISTANCE_LT_0P5_RM');
  } else if (externalMoment.status === 'SOURCE_EVIDENCE_REQUIRED') {
    reasons.push('WRC537_4_5_2_END_DISTANCE_EVIDENCE_REQUIRED');
  }

  const outsideSourceLimits = reasons.some((reason) => reason.includes('LT_'));
  const sourceEvidenceComplete = Boolean(evidence)
    && (!radialLoadActive || radialLoad.status === 'PASS_SOURCE_LIMIT')
    && (!externalMomentActive || externalMoment.status === 'PASS_SOURCE_LIMIT');
  const sourceQualified = sourceAuthority != null
    && evidence?.sourceQualification === EMP1_WRC537_APPLICABILITY_SOURCE_QUALIFIED;
  const qualifiedForBoundedRoute = sourceQualified && sourceEvidenceComplete && !outsideSourceLimits;
  const status = outsideSourceLimits
    ? 'OUTSIDE_WRC537_4_5_SOURCE_LIMITS'
    : qualifiedForBoundedRoute
      ? 'PASS_WRC537_4_5_SOURCE_LIMITS_QUALIFIED'
      : sourceEvidenceComplete
        ? 'PASS_WRC537_4_5_SOURCE_LIMITS_COMPARISON_ONLY'
        : 'INCOMPLETE_WRC537_4_5_SOURCE_EVIDENCE';

  return deepFreeze({
    schema: EMP1_WRC537_CYLINDRICAL_APPLICABILITY_SCHEMA,
    status,
    comparisonApplicabilitySatisfied: sourceEvidenceComplete && !outsideSourceLimits,
    engineeringUseAuthorized: qualifiedForBoundedRoute,
    productionUseAuthorized: qualifiedForBoundedRoute,
    sourceQualification: evidence?.sourceQualification
      ?? EMP1_WRC537_APPLICABILITY_SOURCE_QUALIFICATION,
    sourceAuthoritySemanticHash: sourceAuthority?.semanticHash ?? null,
    meanRadius,
    loadsConsidered: { P: loads.P, Mc: loads.Mc, Ml: loads.Ml },
    evidence,
    rules: { radialLoad, externalMoment },
    reasons,
    stressScope: EMP1_WRC537_STRESS_SCOPE,
  });
}

export function requireEmp1Wrc537CylindricalApplicabilityForNumerics(value) {
  if (!value || value.schema !== EMP1_WRC537_CYLINDRICAL_APPLICABILITY_SCHEMA) {
    throw applicabilityError('EMP1_WRC537_CYLINDRICAL_APPLICABILITY_REQUIRED');
  }
  if (value.status === 'OUTSIDE_WRC537_4_5_SOURCE_LIMITS') {
    const error = applicabilityError('EMP1_WRC537_CYLINDRICAL_APPLICABILITY_OUTSIDE_SOURCE_LIMITS');
    error.reasons = [...value.reasons];
    throw error;
  }
  return value;
}

export function requireEmp1Wrc537QualifiedCylindricalApplicability(value) {
  requireEmp1Wrc537CylindricalApplicabilityForNumerics(value);
  if (value.status !== 'PASS_WRC537_4_5_SOURCE_LIMITS_QUALIFIED'
    || value.sourceQualification !== EMP1_WRC537_APPLICABILITY_SOURCE_QUALIFIED
    || value.engineeringUseAuthorized !== true
    || value.productionUseAuthorized !== true
    || !value.sourceAuthoritySemanticHash) {
    throw applicabilityError('EMP1_WRC537_CYLINDRICAL_APPLICABILITY_QUALIFIED_SOURCE_AUTHORITY_REQUIRED');
  }
  return value;
}

function evaluateRadialLoadRule({ active, meanRadius, cylinderLength }) {
  if (!active) return deepFreeze({
    sourceSection: 'WRC537_4.5.1',
    status: 'NOT_TRIGGERED_BY_LOAD_COMPONENTS',
    limit: 'l >= Rm when radial load P is evaluated',
    actualRatio: null,
    minimumRatio: EMP1_WRC537_MIN_CYLINDER_LENGTH_RATIO_FOR_RADIAL_LOAD,
  });
  if (!Number.isFinite(cylinderLength)) return deepFreeze({
    sourceSection: 'WRC537_4.5.1',
    status: 'SOURCE_EVIDENCE_REQUIRED',
    limit: 'l >= Rm when radial load P is evaluated',
    actualRatio: null,
    minimumRatio: EMP1_WRC537_MIN_CYLINDER_LENGTH_RATIO_FOR_RADIAL_LOAD,
  });
  const actualRatio = cylinderLength / meanRadius;
  return deepFreeze({
    sourceSection: 'WRC537_4.5.1',
    status: actualRatio >= EMP1_WRC537_MIN_CYLINDER_LENGTH_RATIO_FOR_RADIAL_LOAD
      ? 'PASS_SOURCE_LIMIT' : 'OUTSIDE_SOURCE_LIMIT',
    limit: 'l >= Rm when radial load P is evaluated',
    cylinderLength,
    actualRatio,
    minimumRatio: EMP1_WRC537_MIN_CYLINDER_LENGTH_RATIO_FOR_RADIAL_LOAD,
  });
}

function evaluateExternalMomentRule({ active, meanRadius, nearestCylinderEndDistance }) {
  if (!active) return deepFreeze({
    sourceSection: 'WRC537_4.5.2',
    status: 'NOT_TRIGGERED_BY_LOAD_COMPONENTS',
    limit: 'nearest end distance >= 0.5*Rm when Mc or Ml is evaluated',
    actualRatio: null,
    minimumRatio: EMP1_WRC537_MIN_END_DISTANCE_RATIO_FOR_EXTERNAL_MOMENT,
  });
  if (!Number.isFinite(nearestCylinderEndDistance)) return deepFreeze({
    sourceSection: 'WRC537_4.5.2',
    status: 'SOURCE_EVIDENCE_REQUIRED',
    limit: 'nearest end distance >= 0.5*Rm when Mc or Ml is evaluated',
    actualRatio: null,
    minimumRatio: EMP1_WRC537_MIN_END_DISTANCE_RATIO_FOR_EXTERNAL_MOMENT,
  });
  const actualRatio = nearestCylinderEndDistance / meanRadius;
  return deepFreeze({
    sourceSection: 'WRC537_4.5.2',
    status: actualRatio >= EMP1_WRC537_MIN_END_DISTANCE_RATIO_FOR_EXTERNAL_MOMENT
      ? 'PASS_SOURCE_LIMIT' : 'OUTSIDE_SOURCE_LIMIT',
    limit: 'nearest end distance >= 0.5*Rm when Mc or Ml is evaluated',
    nearestCylinderEndDistance,
    actualRatio,
    minimumRatio: EMP1_WRC537_MIN_END_DISTANCE_RATIO_FOR_EXTERNAL_MOMENT,
  });
}

function normalizeLegacyEvidence(value) {
  if (value == null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw applicabilityError('EMP1_WRC537_CYLINDRICAL_APPLICABILITY_EVIDENCE_INVALID');
  }
  const cylinderLength = positive(value.cylinderLength, 'CYLINDER_LENGTH');
  const nearestCylinderEndDistance = nonNegative(
    value.nearestCylinderEndDistance,
    'NEAREST_CYLINDER_END_DISTANCE',
  );
  const sourceReferences = value.sourceReferences;
  if (!sourceReferences || typeof sourceReferences !== 'object' || Array.isArray(sourceReferences)) {
    throw applicabilityError('EMP1_WRC537_CYLINDRICAL_APPLICABILITY_SOURCE_REFERENCES_REQUIRED');
  }
  return deepFreeze({
    cylinderLength,
    nearestCylinderEndDistance,
    sourceReferences: {
      cylinderLength: requiredString(sourceReferences.cylinderLength, 'CYLINDER_LENGTH_SOURCE'),
      nearestCylinderEndDistance: requiredString(
        sourceReferences.nearestCylinderEndDistance,
        'NEAREST_END_DISTANCE_SOURCE',
      ),
    },
    basisAuthority: requiredString(
      value.basisAuthority ?? 'CALLER_DECLARED_SOURCE_LOCATOR_ONLY',
      'BASIS_AUTHORITY',
    ),
    sourceQualification: EMP1_WRC537_APPLICABILITY_SOURCE_QUALIFICATION,
  });
}

function normalizeLoads(value = {}) {
  return {
    P: finite(value.P, 'LOAD_P'),
    Mc: finite(value.Mc, 'LOAD_MC'),
    Ml: finite(value.Ml, 'LOAD_ML'),
  };
}
function positive(value, label) {
  const number = finite(value, label);
  if (number <= 0) throw applicabilityError(`EMP1_WRC537_CYLINDRICAL_${label}_NONPOSITIVE`);
  return number;
}
function nonNegative(value, label) {
  const number = finite(value, label);
  if (number < 0) throw applicabilityError(`EMP1_WRC537_CYLINDRICAL_${label}_NEGATIVE`);
  return number;
}
function finite(value, label) {
  if (!Number.isFinite(value)) throw applicabilityError(`EMP1_WRC537_CYLINDRICAL_${label}_INVALID`);
  return Number(value);
}
function requiredString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw applicabilityError(`EMP1_WRC537_CYLINDRICAL_${label}_REQUIRED`);
  }
  return value.trim();
}
function applicabilityError(code) { const error = new TypeError(code); error.code = code; return error; }
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
