/**
 * Domain gate for the interpolated cylindrical route.
 *
 * This is a SEPARATE gate from `emp1-wrc537-cylindrical-bounded-domain.js`, which
 * remains the qualified gamma=5 zero-dp gate and is deliberately not modified or
 * relaxed by this file. Passing this gate authorizes engineering comparison only:
 * it never grants production route authority, WRC method-fidelity standing, code
 * compliance or release qualification.
 *
 * The gate is deliberately narrower than the arithmetic. The curve fits will return
 * a value for any beta, and past the plotted end of an Original curve they return a
 * smooth, plausible, and generally *smaller* value — WRC 537 section 4.4 records
 * those outer regions as "appreciably unconservative". Since the higher-gamma
 * termination beta values are not numerically printed in the source, a bracket that
 * touches gamma > 5 cannot resolve its own beta limit and must be told one
 * explicitly by the owner.
 */
import {
  EMP1_WRC537_GAMMA5_QUALIFIED_BETA,
  emp1Wrc537CommonTabulatedGammas,
  planEmp1Wrc537GammaInterpolation,
} from './emp1-wrc537-cylindrical-gamma-interpolation.js';

export const EMP1_WRC537_INTERPOLATED_DOMAIN_SCHEMA =
  'emp1-wrc537-cylindrical-interpolated-domain/v1';
export const EMP1_WRC537_INTERPOLATED_SOURCE_SHA256 =
  '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';

export function evaluateEmp1Wrc537InterpolatedDomain({
  shellFamily,
  attachmentShape,
  sourceDocumentSha256,
  datasetHash,
  expectedDatasetHash,
  variant,
  gamma,
  beta,
  coordinate,
  betaDomain,
} = {}) {
  const reasons = [];
  if (shellFamily !== 'CYLINDRICAL') reasons.push('EMP1_WRC537_INTERPOLATED_SHELL_FAMILY');
  if (attachmentShape !== 'ROUND') reasons.push('EMP1_WRC537_INTERPOLATED_ATTACHMENT_SHAPE');
  if (sourceDocumentSha256 !== EMP1_WRC537_INTERPOLATED_SOURCE_SHA256) {
    reasons.push('EMP1_WRC537_INTERPOLATED_SOURCE_SHA');
  }
  if (expectedDatasetHash !== undefined && datasetHash !== expectedDatasetHash) {
    reasons.push('EMP1_WRC537_INTERPOLATED_DATASET_HASH');
  }
  if (variant !== 'ORIGINAL' && variant !== 'EXTRAPOLATED') {
    reasons.push('EMP1_WRC537_INTERPOLATED_VARIANT');
  }

  let plan = null;
  let grid = null;
  if (!reasons.length) {
    grid = emp1Wrc537CommonTabulatedGammas(variant);
    plan = planEmp1Wrc537GammaInterpolation({ variant, gamma, coordinate });
    if (plan.status === 'BLOCKED') reasons.push(...plan.reasons);
  }

  // Beta. An exact gamma=5 row carries the only source-qualified band; anything
  // that brackets above it needs the owner to state the limit and own it.
  const touchesUnresolvedBetaLimit = plan
    ? plan.status !== 'EXACT_SOURCE_TABULATED_ROW' || plan.exactGamma > 5
    : true;
  let resolvedBeta = null;
  if (!reasons.length) {
    if (!Number.isFinite(beta) || beta <= 0) {
      reasons.push('EMP1_WRC537_INTERPOLATED_BETA_INVALID');
    } else if (!touchesUnresolvedBetaLimit) {
      resolvedBeta = {
        basis: 'GAMMA5_SOURCE_QUALIFIED_BAND',
        minimum: EMP1_WRC537_GAMMA5_QUALIFIED_BETA.minimum,
        maximum: EMP1_WRC537_GAMMA5_QUALIFIED_BETA.maximum,
        outerLimitSourceResolved: true,
      };
    } else if (betaDomain?.basis === 'OWNER_DECLARED'
      && Number.isFinite(betaDomain.minimum)
      && Number.isFinite(betaDomain.maximum)
      && betaDomain.maximum > betaDomain.minimum
      && betaDomain.minimum >= 0) {
      resolvedBeta = {
        basis: 'OWNER_DECLARED',
        minimum: betaDomain.minimum,
        maximum: betaDomain.maximum,
        outerLimitSourceResolved: false,
        ownerAcceptsUnresolvedOuterLimit: true,
      };
    } else {
      reasons.push('EMP1_WRC537_INTERPOLATED_BETA_OUTER_LIMIT_UNRESOLVED');
    }
    if (resolvedBeta && (beta < resolvedBeta.minimum || beta > resolvedBeta.maximum)) {
      reasons.push('EMP1_WRC537_INTERPOLATED_BETA_OUTSIDE_DOMAIN');
    }
  }

  const interpolationUsed = plan?.status === 'INTERPOLATION_PLANNED';
  return deepFreeze({
    schema: EMP1_WRC537_INTERPOLATED_DOMAIN_SCHEMA,
    status: reasons.length ? 'BLOCKED_OUTSIDE_INTERPOLATED_DOMAIN' : 'PASS_INTERPOLATED_DOMAIN',
    engineeringComparisonAuthorized: reasons.length === 0,
    interpolationUsed,
    sourceQualifiedGammaSelection: plan?.sourceQualifiedGammaSelection === true,
    wrcMethodFidelityClaim: plan?.sourceQualifiedGammaSelection === true,
    productionRouteAuthority: false,
    globalEmp1CRouteAuthority: false,
    fullMethodAuthority: false,
    codeComplianceAuthority: false,
    reasons: deepFreeze([...reasons]),
    observed: { shellFamily, attachmentShape, sourceDocumentSha256, datasetHash, variant, gamma, beta },
    commonTabulatedGammas: grid,
    plan,
    betaDomain: resolvedBeta,
  });
}

export function requireEmp1Wrc537InterpolatedDomain(input) {
  const result = evaluateEmp1Wrc537InterpolatedDomain(input);
  if (result.status !== 'PASS_INTERPOLATED_DOMAIN') {
    const error = new TypeError(`EMP1_WRC537_OUTSIDE_INTERPOLATED_DOMAIN:${result.reasons.join(',')}`);
    error.code = 'EMP1_WRC537_OUTSIDE_INTERPOLATED_DOMAIN';
    error.reasons = result.reasons;
    throw error;
  }
  return result;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
