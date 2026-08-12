const STATUS = Object.freeze({
  READY_LINEAR_BYPASS: 'READY_LINEAR_BYPASS',
  READY_NONLINEAR_INTEGRATION: 'READY_NONLINEAR_INTEGRATION',
  BLOCKED_AUTHORITY: 'BLOCKED_AUTHORITY',
});

export const FRICTION_EXECUTION_READINESS_STATUS = STATUS;

const BLOCKERS = Object.freeze({
  SOURCE_MAP: 'FRICTION_SOURCE_MAP_AUTHORITY_REQUIRED',
  STIFFNESS: 'FRICTION_STIFFNESS_AUTHORITY_REQUIRED',
  STIFFNESS_UNIT: 'FRICTION_STIFFNESS_UNIT_NORMALIZATION_REQUIRED',
  ANGLE: 'FRICTION_ANGLE_VARIATION_AUTHORITY_REQUIRED',
  NORMAL_FORCE: 'FRICTION_NORMAL_FORCE_VARIATION_AUTHORITY_REQUIRED',
  SLIDE: 'FRICTION_SLIDE_MULTIPLIER_AUTHORITY_REQUIRED',
  STATE_HISTORY: 'FRICTION_STATE_HISTORY_SEMANTICS_AUTHORITY_REQUIRED',
  GAP_CONTACT: 'GAP_CONTACT_STATE_SEMANTICS_AUTHORITY_REQUIRED',
  RESPONSE_FITTED: 'RESPONSE_FITTED_AUTHORITY_PROHIBITED',
});

export const FRICTION_EXECUTION_READINESS_BLOCKERS = BLOCKERS;

/**
 * Determine whether a case remains on the qualified linear path, may proceed
 * to governed nonlinear integration, or must fail closed on missing authority.
 * No FE solve occurs here and response rows are never accepted as parameter
 * or state-semantics authority.
 */
export function assessFrictionExecutionReadiness(input) {
  const caseId = requiredString(input?.caseId, 'caseId');
  const frictionMultiplier = nonnegativeFinite(input?.frictionMultiplier, 'frictionMultiplier');

  if (frictionMultiplier === 0) {
    return freezeResult({
      status: STATUS.READY_LINEAR_BYPASS,
      caseId,
      frictionMultiplier,
      route: 'QUALIFIED_LINEAR_SOLVER',
      requiresNonlinearSolve: false,
      blockerCodes: [],
      evidence: {
        nonlinearAuthorityInspected: false,
        sourceMapInspected: false,
        exactZeroFrictionIdentity: true,
      },
    });
  }

  const blockers = [];
  const sourceMap = input?.sourceMap;
  if (!validSourceMap(sourceMap)) blockers.push(BLOCKERS.SOURCE_MAP);

  const authority = input?.authority ?? {};
  requireResolvedFrictionStiffness(authority.frictionStiffness, blockers);
  requireResolvedScalar(authority.frictionAngleVariationDeg, BLOCKERS.ANGLE, blockers);
  requireResolvedScalar(authority.frictionNormalForceVariation, BLOCKERS.NORMAL_FORCE, blockers);
  requireResolvedScalar(authority.frictionSlideMultiplier, BLOCKERS.SLIDE, blockers, { strictlyPositive: true });
  requireResolvedSemantics(authority.frictionStateHistorySemantics, BLOCKERS.STATE_HISTORY, blockers);

  const gapCoupled = validSourceMap(sourceMap)
    && (sourceMap.positiveGapFrictionSiteCount > 0 || sourceMap.positiveGapCompanionCount > 0);
  if (gapCoupled) {
    requireResolvedSemantics(authority.gapContactStateSemantics, BLOCKERS.GAP_CONTACT, blockers);
  }

  const responseFitted = authorityEntries(authority).some((entry) =>
    String(entry?.provenanceClass ?? '').toUpperCase() === 'RESPONSE_FITTED'
    || String(entry?.source ?? '').toUpperCase().includes('RESPONSE_FITTED'));
  if (responseFitted) blockers.push(BLOCKERS.RESPONSE_FITTED);

  const blockerCodes = [...new Set(blockers)].sort();
  if (blockerCodes.length > 0) {
    return freezeResult({
      status: STATUS.BLOCKED_AUTHORITY,
      caseId,
      frictionMultiplier,
      route: null,
      requiresNonlinearSolve: true,
      blockerCodes,
      evidence: {
        nonlinearAuthorityInspected: true,
        sourceMapInspected: validSourceMap(sourceMap),
        gapCoupled,
        exactZeroFrictionIdentity: false,
      },
    });
  }

  return freezeResult({
    status: STATUS.READY_NONLINEAR_INTEGRATION,
    caseId,
    frictionMultiplier,
    route: 'GOVERNED_FRICTION_ITERATION',
    requiresNonlinearSolve: true,
    blockerCodes: [],
    evidence: {
      nonlinearAuthorityInspected: true,
      sourceMapInspected: true,
      gapCoupled,
      exactZeroFrictionIdentity: false,
    },
  });
}

function validSourceMap(value) {
  return value?.schema === 'm047-bm4l-friction-source-map-snapshot/v1'
    && Number.isInteger(value.frictionSiteCount)
    && value.frictionSiteCount > 0
    && Array.isArray(value.frictionNodeIds)
    && value.frictionNodeIds.length === value.frictionSiteCount;
}

function requireResolvedFrictionStiffness(entry, blockers) {
  if (!resolved(entry) || !Number.isFinite(entry.value) || !(entry.value > 0)) {
    blockers.push(BLOCKERS.STIFFNESS);
    return;
  }
  if (entry.unit !== 'N/m') blockers.push(BLOCKERS.STIFFNESS_UNIT);
}

function requireResolvedScalar(entry, blocker, blockers, options = {}) {
  if (!resolved(entry) || !Number.isFinite(entry.value)
    || (options.strictlyPositive ? !(entry.value > 0) : entry.value < 0)) {
    blockers.push(blocker);
  }
}

function requireResolvedSemantics(entry, blocker, blockers) {
  if (!resolved(entry) || !requiredStringOrNull(entry.method)) blockers.push(blocker);
}

function resolved(entry) {
  return entry?.status === 'RESOLVED'
    && requiredStringOrNull(entry.source)
    && String(entry.provenanceClass ?? 'INDEPENDENT_AUTHORITY').toUpperCase() !== 'RESPONSE_FITTED';
}

function authorityEntries(authority) {
  return Object.values(authority).filter((value) => value && typeof value === 'object');
}

function requiredString(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${label} is required.`);
  return text;
}

function requiredStringOrNull(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

function nonnegativeFinite(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${label} must be finite and >= 0.`);
  return Number(value);
}

function freezeResult(value) {
  Object.freeze(value.blockerCodes);
  Object.freeze(value.evidence);
  return Object.freeze(value);
}
