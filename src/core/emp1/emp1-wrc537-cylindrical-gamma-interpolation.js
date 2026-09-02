/**
 * EMP.1 WRC 537 cylindrical non-tabulated gamma interpolation.
 *
 * AUTHORITY BOUNDARY — read before using any result from this module.
 *
 * WRC Bulletin 537 (2013) does not retain a primary-source instruction defining
 * whether gamma interpolation is permitted, which quantity is interpolated, or in
 * which coordinate. `docs/emp1/WRC537_2013_Gamma_Interpolation_Authority.md`
 * therefore records the source position as:
 *
 *   BLOCKED_PRIMARY_GAMMA_INTERPOLATION_RULE_UNQUALIFIED
 *
 * This module does NOT overturn that finding and does not claim to. It implements
 * an explicitly owner-directed engineering-judgement policy so that non-tabulated
 * gamma can be evaluated, and it stamps every result as NOT source-qualified. The
 * exact-tabulated selector in `emp1-wrc537-cylindrical-index.js` remains the only
 * source-qualified gamma path and is delegated to unchanged whenever the requested
 * gamma lands on a tabulated row.
 *
 * Consequently every interpolated result carries:
 *   sourceQualifiedGammaSelection : false
 *   wrcMethodFidelityClaim        : false
 *   productionAuthority           : false
 *   fullMethodAuthority           : false
 *
 * Callers must not promote these results to code compliance or release
 * qualification, and must not present them as WRC-source output.
 */
import {
  evaluateEmp1Wrc537DatasetCurve,
  getEmp1Wrc537AvailableGammas,
  selectEmp1Wrc537CylindricalDatasetCurve,
} from './emp1-wrc537-cylindrical-index.js';

export const EMP1_WRC537_GAMMA_INTERPOLATION_SCHEMA =
  'emp1-wrc537-cylindrical-gamma-interpolation/v1';

/** Roundoff band inside which a requested gamma is treated as an exact source row. */
const ROUND_OFF_RELATIVE_TOLERANCE = 1e-12;

/**
 * The declared policy. Each entry answers one of the questions the source
 * authority record lists as unresolved, and records the engineering reason for
 * the choice. These are owner-directed selections, not WRC instructions.
 */
export const EMP1_WRC537_GAMMA_INTERPOLATION_POLICY = deepFreeze({
  schema: EMP1_WRC537_GAMMA_INTERPOLATION_SCHEMA,
  basis: 'OWNER_DIRECTED_ENGINEERING_JUDGEMENT_NOT_WRC_SOURCE_RULE',
  sourceRuleQualified: false,
  interpolatedQuantity: 'NONDIMENSIONAL_ORDINATE_Y',
  interpolatedQuantityReason:
    'The rational a..j coefficients are a fitted representation, not a physical quantity. '
    + 'Blending them can move the denominator root between bracket rows and produce a pole '
    + 'inside the interpolated band. Evaluating each bracket row at the requested beta first, '
    + 'then blending the resulting ordinate, cannot introduce a pole that neither row has.',
  defaultCoordinate: 'LINEAR_GAMMA',
  defaultCoordinateReason:
    'Chosen for error direction, not error size. A leave-one-out measurement over the three interior '
    + 'grid rows and beta 0.05..0.50 (57 eight-point-envelope cases, scripts/emp1-wrc537-gamma-'
    + 'interpolation-accuracy-check.mjs) found LOG_GAMMA more accurate on average (median 5.5%, p95 '
    + '11.0%) but unconservative in 18 of 57 cases, understating the envelope by up to 11.0%. '
    + 'LINEAR_GAMMA was roughly half as accurate (median 9.8%, p95 26.2%) yet overestimated in every '
    + 'one of the 57 cases. A screening tool that must not overstate safety is better served by the '
    + 'coordinate that errs high, so LINEAR_GAMMA is the default and LOG_GAMMA remains selectable '
    + 'for best-estimate work. The a priori argument for log spacing was reasonable but is beaten by '
    + 'the measurement.',
  supportedCoordinates: Object.freeze(['LOG_GAMMA', 'LINEAR_GAMMA', 'RECIPROCAL_GAMMA']),
  coordinateAccuracyBasis: ({
    method: 'LEAVE_ONE_OUT_OVER_INTERIOR_GRID_ROWS',
    cases: 57,
    note: 'Leave-one-out removes a row, so each bracket spans two grid gaps and overstates the error '
      + 'of real use. Genuine non-tabulated targets inside one gap (gamma 25 and 35 within 15->50) '
      + 'moved only 2.2% and 3.9% when the bracket was widened to 15->100.',
    LOG_GAMMA: { medianAbsolutePercent: 5.5, p95AbsolutePercent: 11.0, unconservativeCases: 18, worstUnconservativePercent: -11.0 },
    LINEAR_GAMMA: { medianAbsolutePercent: 9.8, p95AbsolutePercent: 26.2, unconservativeCases: 0, worstUnconservativePercent: 0 },
  }),
  bracketing: 'NEAREST_ENCLOSING_COMMON_TABULATED_ROWS',
  bracketingReason:
    'A Table-5 route consumes every required figure, so the usable gamma grid is the intersection '
    + 'of rows available across all required figures for the selected variant. Bracketing one figure '
    + 'on rows another figure cannot supply would evaluate the eight points on inconsistent gammas.',
  extrapolation: 'BLOCKED',
  variantMixing: 'BLOCKED',
  betaDomainAcrossBracket: 'INTERSECTION_OF_BRACKET_ROW_DOMAINS',
  betaOuterLimitSource: 'UNRESOLVED_FOR_GAMMA_ABOVE_5',
  betaOuterLimitReason:
    'WRC 537 section 4.4 prohibits using Original curves beyond their plotted limits, and the '
    + 'higher-gamma curve termination beta values are not numerically printed in the source. '
    + 'Any bracket touching gamma > 5 therefore requires an explicit owner beta declaration.',
  signChangeAcrossBracket: 'BLOCKED_ONLY_WHEN_MATERIAL_TO_THE_ORDINATE_SET',
  signChangeReason:
    'Ordinates are blended signed and the magnitude is taken afterwards, so a curve passing through '
    + 'zero between bracket rows blends continuously. The real hazard is destructive cancellation: '
    + 'two large opposed ordinates blend towards zero and understate the stress. Whether that matters '
    + 'depends on the term\'s size relative to the terms driving the answer, so materiality is judged '
    + 'against the largest ordinate in the same family, not against the term\'s own bracket partner. '
    + 'Figure 2C is the observed benign case: it reaches -0.0026 at gamma=50, beta=0.436 against '
    + '+0.0197 at gamma=15, both negligible beside family ordinates of order 1.',
  signChangeMaterialityFractionOfFamilyMaximum: 0.05,
  exactRowBehavior: 'DELEGATE_TO_SOURCE_QUALIFIED_EXACT_SELECTOR',
});

/**
 * Classify a sign change between bracket ordinates.
 *
 * `referenceMagnitude` is the largest ordinate magnitude in the same Table-5 family;
 * a sign change is material only when both bracket rows are non-negligible against it,
 * i.e. a genuine reversal capable of cancelling a load-bearing term. Omit the
 * reference to get classification without a materiality verdict.
 */
export function classifyEmp1Wrc537BracketSignChange(
  lowerY,
  upperY,
  referenceMagnitude,
  fraction = EMP1_WRC537_GAMMA_INTERPOLATION_POLICY.signChangeMaterialityFractionOfFamilyMaximum,
) {
  const changed = Math.sign(lowerY) !== Math.sign(upperY) && lowerY !== 0 && upperY !== 0;
  if (!changed) return deepFreeze({ signChange: false, material: false, lowerY, upperY });
  if (!Number.isFinite(referenceMagnitude) || referenceMagnitude <= 0) {
    return deepFreeze({ signChange: true, material: null, materialityAssessed: false, lowerY, upperY });
  }
  const smaller = Math.min(Math.abs(lowerY), Math.abs(upperY));
  return deepFreeze({
    schema: EMP1_WRC537_GAMMA_INTERPOLATION_SCHEMA,
    signChange: true,
    material: smaller > fraction * referenceMagnitude,
    materialityAssessed: true,
    lowerY,
    upperY,
    referenceMagnitude,
    materialityFraction: fraction,
  });
}

/** Table-5 figures consumed by a full cylindrical evaluation, excluding the ML bending pair. */
export const EMP1_WRC537_TABLE5_REQUIRED_FIGURES = deepFreeze([
  '1A', '2A', '3A', '4A', '3B', '4B', '1C', '1C-1', '2C', '2C-1', '3C', '4C',
]);

/** Gamma=5 is the only row whose beta band is source-qualified. */
export const EMP1_WRC537_GAMMA5_QUALIFIED_BETA = deepFreeze({ minimum: 0.05, maximum: 0.5 });

/**
 * Gamma rows available for every supplied figure under one variant.
 * This is the only grid an interpolated Table-5 route may bracket on.
 */
export function emp1Wrc537CommonTabulatedGammas(variant, figures = EMP1_WRC537_TABLE5_REQUIRED_FIGURES) {
  requireVariant(variant);
  const lists = figures.map((figure) => getEmp1Wrc537AvailableGammas(figure, variant));
  if (!lists.length) throw interpolationError('EMP1_WRC537_GAMMA_INTERP_FIGURE_SET_EMPTY');
  const [first, ...rest] = lists;
  const common = first.filter((gamma) => rest.every((list) => list.some((row) => sameGamma(row, gamma))));
  return deepFreeze([...common].sort((a, b) => a - b));
}

/**
 * Resolve the bracket for a requested gamma without evaluating any curve.
 * Returns an exact-row plan, an interpolated plan, or a blocked plan with reasons.
 */
export function planEmp1Wrc537GammaInterpolation({
  variant,
  gamma,
  coordinate = EMP1_WRC537_GAMMA_INTERPOLATION_POLICY.defaultCoordinate,
  figures = EMP1_WRC537_TABLE5_REQUIRED_FIGURES,
} = {}) {
  requireVariant(variant);
  const resolvedCoordinate = requireCoordinate(coordinate);
  if (!Number.isFinite(gamma) || gamma <= 0) {
    return blockedPlan(['EMP1_WRC537_GAMMA_INTERP_GAMMA_INVALID'], { variant, gamma, coordinate: resolvedCoordinate });
  }
  const grid = emp1Wrc537CommonTabulatedGammas(variant, figures);
  if (grid.length < 2) {
    return blockedPlan(['EMP1_WRC537_GAMMA_INTERP_COMMON_GRID_INSUFFICIENT'], { variant, gamma, coordinate: resolvedCoordinate, grid });
  }

  const exact = grid.find((row) => sameGamma(row, gamma));
  if (exact !== undefined) {
    return deepFreeze({
      schema: EMP1_WRC537_GAMMA_INTERPOLATION_SCHEMA,
      status: 'EXACT_SOURCE_TABULATED_ROW',
      interpolationUsed: false,
      sourceQualifiedGammaSelection: true,
      variant,
      requestedGamma: gamma,
      exactGamma: exact,
      coordinate: resolvedCoordinate,
      commonGrid: grid,
      reasons: [],
    });
  }

  if (gamma < grid[0] || gamma > grid[grid.length - 1]) {
    return blockedPlan(['EMP1_WRC537_GAMMA_INTERP_EXTRAPOLATION_BLOCKED'], {
      variant, gamma, coordinate: resolvedCoordinate, grid,
    });
  }

  let lower = grid[0];
  let upper = grid[grid.length - 1];
  for (let i = 0; i < grid.length - 1; i += 1) {
    if (gamma > grid[i] && gamma < grid[i + 1]) { lower = grid[i]; upper = grid[i + 1]; break; }
  }
  const weight = coordinateWeight(resolvedCoordinate, gamma, lower, upper);
  return deepFreeze({
    schema: EMP1_WRC537_GAMMA_INTERPOLATION_SCHEMA,
    status: 'INTERPOLATION_PLANNED',
    interpolationUsed: true,
    sourceQualifiedGammaSelection: false,
    wrcMethodFidelityClaim: false,
    variant,
    requestedGamma: gamma,
    coordinate: resolvedCoordinate,
    bracket: { lowerGamma: lower, upperGamma: upper, upperWeight: weight, lowerWeight: 1 - weight },
    commonGrid: grid,
    betaOuterLimitSourceResolved: false,
    reasons: [],
  });
}

/**
 * Evaluate one figure's ordinate at a requested (gamma, beta).
 * Exact rows delegate to the source-qualified selector untouched.
 */
export function evaluateEmp1Wrc537InterpolatedOrdinate({
  figure,
  variant,
  gamma,
  beta,
  coordinate = EMP1_WRC537_GAMMA_INTERPOLATION_POLICY.defaultCoordinate,
  betaDomain,
  figures = EMP1_WRC537_TABLE5_REQUIRED_FIGURES,
} = {}) {
  const plan = planEmp1Wrc537GammaInterpolation({ variant, gamma, coordinate, figures });
  if (plan.status === 'BLOCKED') throw interpolationError(`EMP1_WRC537_GAMMA_INTERP_BLOCKED:${plan.reasons.join(',')}`);
  if (!Number.isFinite(beta) || beta < 0) throw interpolationError('EMP1_WRC537_GAMMA_INTERP_BETA_INVALID');

  if (plan.status === 'EXACT_SOURCE_TABULATED_ROW') {
    const curve = selectEmp1Wrc537CylindricalDatasetCurve({ figure, variant, gamma });
    const evaluated = evaluateEmp1Wrc537DatasetCurve(curve, beta);
    return deepFreeze({
      schema: EMP1_WRC537_GAMMA_INTERPOLATION_SCHEMA,
      figure: curve.figure,
      variant,
      requestedGamma: gamma,
      beta,
      y: evaluated.y,
      interpolationUsed: false,
      sourceQualifiedGammaSelection: true,
      wrcMethodFidelityClaim: true,
      productionAuthority: false,
      fullMethodAuthority: false,
      plan,
    });
  }

  const domain = resolveBetaDomain(plan, betaDomain);
  if (domain.reasons.length) {
    throw interpolationError(`EMP1_WRC537_GAMMA_INTERP_BETA_DOMAIN_BLOCKED:${domain.reasons.join(',')}`);
  }
  if (beta < domain.minimum || beta > domain.maximum) {
    throw interpolationError('EMP1_WRC537_GAMMA_INTERP_BETA_OUTSIDE_DECLARED_DOMAIN');
  }

  const { lowerGamma, upperGamma, lowerWeight, upperWeight } = plan.bracket;
  const lowerCurve = selectEmp1Wrc537CylindricalDatasetCurve({ figure, variant, gamma: lowerGamma });
  const upperCurve = selectEmp1Wrc537CylindricalDatasetCurve({ figure, variant, gamma: upperGamma });
  const lowerY = evaluateEmp1Wrc537DatasetCurve(lowerCurve, beta).y;
  const upperY = evaluateEmp1Wrc537DatasetCurve(upperCurve, beta).y;

  // Signed blend, magnitude taken by the caller, so a curve crossing zero between
  // bracket rows is continuous. Materiality needs the family scale, which only the
  // ordinate-set builder knows, so it is recorded here and adjudicated there.
  const signChange = classifyEmp1Wrc537BracketSignChange(lowerY, upperY);
  const y = lowerWeight * lowerY + upperWeight * upperY;
  if (!Number.isFinite(y)) throw interpolationError('EMP1_WRC537_GAMMA_INTERP_RESULT_INVALID');

  return deepFreeze({
    schema: EMP1_WRC537_GAMMA_INTERPOLATION_SCHEMA,
    figure: lowerCurve.figure,
    variant,
    requestedGamma: gamma,
    beta,
    y,
    interpolationUsed: true,
    sourceQualifiedGammaSelection: false,
    wrcMethodFidelityClaim: false,
    productionAuthority: false,
    fullMethodAuthority: false,
    betaDomain: domain,
    bracketOrdinates: { lowerGamma, lowerY, upperGamma, upperY },
    signChange,
    plan,
  });
}

/**
 * Build the full circ/long ordinate set Table 5 consumes, at a requested gamma.
 * Ordinate magnitudes are returned; Table 5 owns the sign matrix.
 */
export function buildEmp1Wrc537InterpolatedTable5Ordinates({
  variant,
  gamma,
  beta,
  coordinate = EMP1_WRC537_GAMMA_INTERPOLATION_POLICY.defaultCoordinate,
  betaDomain,
  // WRC 537 section 4.4 distinguishes the -1 curves as off-axis maxima limited to a
  // round flexible nozzle. The retained eight A/B/C/D shell-juncture locations are
  // axis-of-symmetry values, so the qualified selection is 1B/2B — see
  // EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY, whose offAxisMaximum
  // block carries 1B-1/2B-1 with authorizedByThisRoute false. Callers evaluating a
  // different retained figure map (a frozen oracle, say) must pass it explicitly.
  longitudinalMomentFigures = { circumferential: '1B', longitudinal: '2B' },
} = {}) {
  const circFigure = longitudinalMomentFigures?.circumferential;
  const longFigure = longitudinalMomentFigures?.longitudinal;
  if (typeof circFigure !== 'string' || typeof longFigure !== 'string') {
    throw interpolationError('EMP1_WRC537_GAMMA_INTERP_ML_BENDING_FIGURES_REQUIRED');
  }
  const figures = deepFreeze([...EMP1_WRC537_TABLE5_REQUIRED_FIGURES, circFigure, longFigure]);
  const map = {
    circ: { Pmem_AB: '4C', Pmem_CD: '3C', Pbend_AB: '2C-1', Pbend_CD: '1C', Mcmem: '3A', Mcbend: '1A', Mlmem: '3B', Mlbend: circFigure },
    long: { Pmem_AB: '3C', Pmem_CD: '4C', Pbend_AB: '1C-1', Pbend_CD: '2C', Mcmem: '4A', Mcbend: '2A', Mlmem: '4B', Mlbend: longFigure },
  };
  const ordinates = {};
  const provenance = {};
  const raw = {};
  let interpolationUsed = false;
  let sourceQualified = true;
  for (const family of ['circ', 'long']) {
    ordinates[family] = {};
    provenance[family] = {};
    raw[family] = {};
    for (const [key, figure] of Object.entries(map[family])) {
      const evaluated = evaluateEmp1Wrc537InterpolatedOrdinate({ figure, variant, gamma, beta, coordinate, betaDomain, figures });
      ordinates[family][key] = Math.abs(evaluated.y);
      provenance[family][key] = { figure: evaluated.figure, y: evaluated.y, interpolationUsed: evaluated.interpolationUsed };
      raw[family][key] = evaluated;
      interpolationUsed = interpolationUsed || evaluated.interpolationUsed;
      sourceQualified = sourceQualified && evaluated.sourceQualifiedGammaSelection;
    }
  }

  // Adjudicate bracket sign changes against the family scale. A term that reverses
  // while carrying a non-negligible share of the family's magnitude can cancel
  // towards zero and understate the stress; that fails closed.
  const signChanges = [];
  for (const family of ['circ', 'long']) {
    const familyMaximum = Math.max(...Object.values(ordinates[family]));
    for (const [key, evaluated] of Object.entries(raw[family])) {
      if (!evaluated.signChange?.signChange) continue;
      const verdict = classifyEmp1Wrc537BracketSignChange(
        evaluated.bracketOrdinates.lowerY,
        evaluated.bracketOrdinates.upperY,
        familyMaximum,
      );
      signChanges.push(deepFreeze({ family, key, figure: evaluated.figure, familyMaximum, ...verdict }));
    }
  }
  const materialSignChanges = signChanges.filter((row) => row.material === true);
  if (materialSignChanges.length) {
    throw interpolationError(
      `EMP1_WRC537_GAMMA_INTERP_MATERIAL_SIGN_CHANGE_ACROSS_BRACKET:${
        materialSignChanges.map((row) => `${row.family}.${row.key}`).join(',')}`,
    );
  }
  return deepFreeze({
    schema: EMP1_WRC537_GAMMA_INTERPOLATION_SCHEMA,
    variant,
    requestedGamma: gamma,
    beta,
    coordinate: requireCoordinate(coordinate),
    ordinates,
    provenance,
    signChanges: deepFreeze(signChanges),
    interpolationUsed,
    sourceQualifiedGammaSelection: sourceQualified,
    wrcMethodFidelityClaim: sourceQualified,
    productionAuthority: false,
    fullMethodAuthority: false,
    policy: EMP1_WRC537_GAMMA_INTERPOLATION_POLICY,
  });
}

function resolveBetaDomain(plan, betaDomain) {
  const reasons = [];
  const touchesUnresolved = plan.bracket.lowerGamma > 5 || plan.bracket.upperGamma > 5;
  if (!touchesUnresolved) {
    return deepFreeze({
      basis: 'GAMMA5_SOURCE_QUALIFIED_BAND',
      minimum: EMP1_WRC537_GAMMA5_QUALIFIED_BETA.minimum,
      maximum: EMP1_WRC537_GAMMA5_QUALIFIED_BETA.maximum,
      outerLimitSourceResolved: true,
      reasons,
    });
  }
  if (!betaDomain || betaDomain.basis !== 'OWNER_DECLARED') {
    reasons.push('EMP1_WRC537_GAMMA_INTERP_BETA_OUTER_LIMIT_UNRESOLVED');
    return deepFreeze({ basis: 'UNRESOLVED', outerLimitSourceResolved: false, reasons: deepFreeze(reasons) });
  }
  const minimum = betaDomain.minimum;
  const maximum = betaDomain.maximum;
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum < 0 || maximum <= minimum) {
    reasons.push('EMP1_WRC537_GAMMA_INTERP_BETA_DECLARATION_INVALID');
  }
  return deepFreeze({
    basis: 'OWNER_DECLARED',
    minimum,
    maximum,
    outerLimitSourceResolved: false,
    ownerAcceptsUnresolvedOuterLimit: true,
    reasons: deepFreeze(reasons),
  });
}

function coordinateWeight(coordinate, gamma, lower, upper) {
  if (coordinate === 'LINEAR_GAMMA') return (gamma - lower) / (upper - lower);
  if (coordinate === 'RECIPROCAL_GAMMA') return (1 / gamma - 1 / lower) / (1 / upper - 1 / lower);
  return (Math.log(gamma) - Math.log(lower)) / (Math.log(upper) - Math.log(lower));
}

function blockedPlan(reasons, observed) {
  return deepFreeze({
    schema: EMP1_WRC537_GAMMA_INTERPOLATION_SCHEMA,
    status: 'BLOCKED',
    interpolationUsed: false,
    sourceQualifiedGammaSelection: false,
    wrcMethodFidelityClaim: false,
    reasons: deepFreeze([...reasons]),
    observed: deepFreeze({ ...observed }),
  });
}

function requireVariant(variant) {
  if (variant !== 'ORIGINAL' && variant !== 'EXTRAPOLATED') {
    throw interpolationError('EMP1_WRC537_GAMMA_INTERP_VARIANT_REQUIRED');
  }
  return variant;
}

function requireCoordinate(coordinate) {
  if (!EMP1_WRC537_GAMMA_INTERPOLATION_POLICY.supportedCoordinates.includes(coordinate)) {
    throw interpolationError('EMP1_WRC537_GAMMA_INTERP_COORDINATE_UNSUPPORTED');
  }
  return coordinate;
}

function sameGamma(actual, requested) {
  return Math.abs(actual - requested) <= Math.max(1, Math.abs(requested)) * ROUND_OFF_RELATIVE_TOLERANCE;
}

function interpolationError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
