import {
  EMP1_WRC537_BOUNDED_BETA_MAX,
  EMP1_WRC537_BOUNDED_BETA_MIN,
  EMP1_WRC537_BOUNDED_DATASET_HASH,
  EMP1_WRC537_BOUNDED_GAMMA,
  EMP1_WRC537_BOUNDED_SOURCE_SHA256,
  EMP1_WRC537_BOUNDED_VARIANT,
} from './emp1-wrc537-cylindrical-bounded-domain.js';
import {
  EMP1_WRC537_CYLINDRICAL_AXIS_AUTHORITY_ID,
  EMP1_WRC537_CYLINDRICAL_AXIS_SOURCE_SHA256,
} from './emp1-wrc537-cylindrical-axis-authority.js';
import {
  EMP1_WRC537_APPLICABILITY_SOURCE_AUTHORITY,
  EMP1_WRC537_APPLICABILITY_SOURCE_QUALIFIED,
  EMP1_WRC537_ATTACHMENT_STATION_BASIS,
  EMP1_WRC537_CYLINDER_LENGTH_BASIS,
} from './emp1-wrc537-applicability-source-authority.js';
import {
  EMP1_WRC537_GENERAL_SCF_AUTHORITY_STATE,
  EMP1_WRC537_UNITY_SCF_AUTHORITY,
} from './emp1-wrc537-stress-concentration-authority.js';
import {
  EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY_ID,
} from './emp1-wrc537-longitudinal-moment-curve-selection.js';

export const EMP1_C_BOUNDED_ROUTE_REGISTRY_SCHEMA = 'emp1-c-bounded-route-registry/v1';
export const EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID =
  'EMP1.C.WRC537.CYLINDRICAL.ORIGINAL.GAMMA5.ZERO_DP';
export const EMP1_C_WRC537_GAMMA5_ZERO_DP_QUALIFICATION_SHA256 =
  '9ea591a1918175b3e415d77f1adc4398645ca0503a699cfe8139d9dd3c69b4c7';
export const EMP1_C_WRC537_ZERO_DP_LOAD_PRODUCER_SHA256 =
  '47a9157ba88a5646021fabd41cd803028e1880c8d6f712095afda429f2c2622b';
export const EMP1_C_WRC537_INTERPOLATED_GAMMA_ROUTE_ID =
  'EMP1.C.WRC537.CYLINDRICAL.ORIGINAL.INTERPOLATED_GAMMA.ZERO_DP';
export const EMP1_C_WRC537_INTERPOLATED_GAMMA_SUSPENSION_REASON =
  'NON_TABULATED_GAMMA_INTERPOLATION_RULE_NOT_SOURCE_QUALIFIED';
export const EMP1_C_WRC537_INTERPOLATED_GAMMA_LIMITATION =
  'GAMMA_INTERPOLATED_BETWEEN_SOURCE_ROWS_BY_OWNER_DIRECTED_POLICY';
export const EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON =
  'WRC_CYLINDRICAL_LOAD_AXIS_SIGN_UNRESOLVED';
export const EMP1_C_WRC537_AXIS_AUTHORITY_STATE =
  'SOURCE_QUALIFIED_RUNTIME_POLARITY_REQUIRED';
/** Historical blocker code retained for audit compatibility; resolved by EMP1-14. */
export const EMP1_C_WRC537_LONGITUDINAL_CURVE_SUSPENSION_REASON =
  'WRC_LONGITUDINAL_MOMENT_CURVE_SELECTION_AUTHORITY_UNRESOLVED';
export const EMP1_C_WRC537_LONGITUDINAL_EIGHT_POINT_AUTHORITY_STATE =
  'SOURCE_QUALIFIED_TABLE5_EIGHT_POINT_AXIS_OF_SYMMETRY';
/** Historical blocker code retained for audit compatibility; resolved by EMP1-13. */
export const EMP1_C_WRC537_R0_SOURCE_SUSPENSION_REASON =
  'WRC_ATTACHMENT_OUTSIDE_RADIUS_SOURCE_BASIS_UNQUALIFIED';
export const EMP1_C_WRC537_R0_SOURCE_AUTHORITY_STATE =
  'TYPED_ENGINEERING_SOURCE_BINDING_RUNTIME_REQUIRED';
/** Historical blocker code retained for audit compatibility; resolved by EMP1-15. */
export const EMP1_C_WRC537_APPLICABILITY_SOURCE_SUSPENSION_REASON =
  'WRC_CYLINDRICAL_4_5_APPLICABILITY_SOURCE_BASIS_UNQUALIFIED';
export const EMP1_C_WRC537_APPLICABILITY_SOURCE_AUTHORITY_STATE =
  'QUALIFIED_TYPED_GEOMETRY_SOURCE_BINDING_RUNTIME_REQUIRED';
export const EMP1_C_WRC537_ROUTE_REQUALIFICATION_SUSPENSION_REASON =
  'WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE';
export const EMP1_C_WRC537_EXTREMA_LIMITATION =
  'WRC_TABLE5_EIGHT_POINTS_NOT_GLOBAL_ABSOLUTE_MAXIMUM';
export const EMP1_C_WRC537_UNITY_SCF_LIMITATION =
  'UNITY_STRESS_CONCENTRATION_MULTIPLIERS_ONLY';
export const EMP1_C_WRC537_APPENDIX_B_SCF_LIMITATION =
  'WRC_APPENDIX_B_GENERAL_SCF_NOT_SOURCE_QUALIFIED';

const EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE = Object.freeze({
  schema: EMP1_C_BOUNDED_ROUTE_REGISTRY_SCHEMA,
  routeId: EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
  registered: true,
  engineeringUseAuthorized: true,
  comparisonQualificationAvailable: true,
  suspensionReasons: Object.freeze([]),
  limitations: Object.freeze([
    EMP1_C_WRC537_EXTREMA_LIMITATION,
    EMP1_C_WRC537_UNITY_SCF_LIMITATION,
    EMP1_C_WRC537_APPENDIX_B_SCF_LIMITATION,
  ]),
  globalEmp1CRouteAuthority: false,
  releaseQualified: false,
  runtimeEligibilityRequired: true,
  method: Object.freeze({
    identity: 'WRC537_2013_CYLINDRICAL_ORIGINAL_GAMMA5_TABLE5_ZERO_DP',
    edition: '2013',
    sourceDocumentSha256: EMP1_WRC537_BOUNDED_SOURCE_SHA256,
    datasetHash: EMP1_WRC537_BOUNDED_DATASET_HASH,
    qualificationRecordSha256: EMP1_C_WRC537_GAMMA5_ZERO_DP_QUALIFICATION_SHA256,
    qualificationRecordRole: 'POST_SOURCE_AUTHORITY_EXACT_HEAD_BOUNDED_REQUALIFICATION',
    routeRequalificationRequired: false,
    loadProducerQualificationSha256: EMP1_C_WRC537_ZERO_DP_LOAD_PRODUCER_SHA256,
  }),
  scope: Object.freeze({
    shellFamily: 'CYLINDRICAL',
    attachmentShape: 'ROUND',
    variant: EMP1_WRC537_BOUNDED_VARIANT,
    gamma: EMP1_WRC537_BOUNDED_GAMMA,
    betaMinimum: EMP1_WRC537_BOUNDED_BETA_MIN,
    betaMaximum: EMP1_WRC537_BOUNDED_BETA_MAX,
    differentialPressure: 0,
    canonicalLengthUnit: 'mm',
    cylindricalLoadAxisAuthority: EMP1_C_WRC537_AXIS_AUTHORITY_STATE,
    cylindricalLoadAxisAuthorityId: EMP1_WRC537_CYLINDRICAL_AXIS_AUTHORITY_ID,
    cylindricalLoadAxisSourceSha256: EMP1_WRC537_CYLINDRICAL_AXIS_SOURCE_SHA256,
    wrcPositivePRule: 'SOURCE_REFERENCE_TOWARD_ATTACHMENT_TARGET',
    rawFoundationRadialHintIsPolarityAuthority: false,
    runtimeSourcePolarityEvidenceRequired: true,
    Kn: EMP1_WRC537_UNITY_SCF_AUTHORITY.Kn,
    Kb: EMP1_WRC537_UNITY_SCF_AUTHORITY.Kb,
    stressConcentrationMode: EMP1_WRC537_GENERAL_SCF_AUTHORITY_STATE.mode,
    stressConcentrationAuthority: EMP1_WRC537_GENERAL_SCF_AUTHORITY_STATE.routeAuthority,
    stressConcentrationCustodyAuthority: EMP1_WRC537_UNITY_SCF_AUTHORITY.authority,
    stressConcentrationEngineeringMeaning:
      EMP1_WRC537_GENERAL_SCF_AUTHORITY_STATE.engineeringMeaning,
    appendixBStressConcentrationQualified:
      EMP1_WRC537_GENERAL_SCF_AUTHORITY_STATE.generalAppendixBAuthority,
    nonUnityStressConcentrationAuthorized:
      EMP1_WRC537_GENERAL_SCF_AUTHORITY_STATE.nonUnityAuthorized,
    stressConcentrationSourceQualification:
      EMP1_WRC537_GENERAL_SCF_AUTHORITY_STATE.sourceQualification.retainedExtractionState,
    interpolationAllowed: false,
    crossVariantFallbackAllowed: false,
    longitudinalMomentBendingSelection:
      'TABLE5_EIGHT_POINT_AXIS_OF_SYMMETRY_1B_2B',
    longitudinalMomentCurveSelectionAuthority:
      EMP1_C_WRC537_LONGITUDINAL_EIGHT_POINT_AUTHORITY_STATE,
    longitudinalMomentCurveSelectionAuthorityId:
      EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY_ID,
    longitudinalMomentCircumferentialFigure: '1B',
    longitudinalMomentLongitudinalFigure: '2B',
    offAxisLongitudinalMomentMaximumAuthorized: false,
    offAxisLongitudinalMomentFigures: Object.freeze(['1B-1', '2B-1']),
    attachmentRadiusBasis: 'OUTSIDE_RADIUS_AT_SHELL_JUNCTURE',
    attachmentRadiusSourceAuthority: 'EMP1_TYPED_ENGINEERING_SOURCE_BINDING_V1',
    attachmentRadiusSourceAuthorityState: EMP1_C_WRC537_R0_SOURCE_AUTHORITY_STATE,
    attachmentRadiusSourceQualification: 'QUALIFIED_FOR_BOUNDED_R0_CUSTODY',
    runtimeAttachmentSourceEvidenceRequired: true,
    legacyAttachmentSourceAuthorized: false,
    radialLoadCylinderLengthRule: 'P_REQUIRES_L_GE_RM',
    externalMomentEndDistanceRule:
      'MC_OR_ML_REQUIRES_NEAREST_END_DISTANCE_GE_0P5_RM',
    applicabilitySourceAuthority: EMP1_WRC537_APPLICABILITY_SOURCE_AUTHORITY,
    applicabilitySourceAuthorityState: EMP1_C_WRC537_APPLICABILITY_SOURCE_AUTHORITY_STATE,
    applicabilitySourceQualification: EMP1_WRC537_APPLICABILITY_SOURCE_QUALIFIED,
    cylinderLengthBasis: EMP1_WRC537_CYLINDER_LENGTH_BASIS,
    attachmentStationBasis: EMP1_WRC537_ATTACHMENT_STATION_BASIS,
    nearestEndDistanceBasis: 'DERIVED_MIN_X_L_MINUS_X',
    runtimeApplicabilitySourceEvidenceRequired: true,
    legacyApplicabilityEvidenceAuthorizedForProduction: false,
    stressOutputDomain: 'HOST_CYLINDRICAL_SHELL_AT_ATTACHMENT_SHELL_JUNCTURE',
    attachmentStressCalculated: false,
    nozzleStressCalculated: false,
    evaluatedStressLocations: 'WRC_TABLE5_EIGHT_SHELL_JUNCTURE_POINTS',
    eightPointEnvelopeBasis: 'MAXIMUM_OVER_EVALUATED_TABLE5_EIGHT_POINTS_ONLY',
    absoluteShellMaximumAssured: false,
    continuousJunctureSearchPerformed: false,
    arbitraryLoadingExtremaRequiresEngineeringJudgment: true,
  }),
  remainingBlocked: Object.freeze([
    'NONZERO_DIFFERENTIAL_PRESSURE',
    'NONUNITY_STRESS_CONCENTRATION',
    EMP1_C_WRC537_APPENDIX_B_SCF_LIMITATION,
    'OFF_AXIS_LONGITUDINAL_MOMENT_MAXIMUM',
    'GAMMA_OTHER_THAN_5',
    'BETA_OUTSIDE_0P05_TO_0P5',
    'NON_TABULATED_GAMMA',
    'GLOBAL_EMP1_C_ROUTE',
  ]),
});

/**
 * Non-tabulated gamma, evaluated by bracketing the two enclosing source rows.
 *
 * Registered so the capability is described and governed rather than sitting
 * outside the registry, but NOT authorized for engineering use. WRC 537 does not
 * state whether gamma may be interpolated, which quantity to interpolate, or in
 * which coordinate; docs/emp1/WRC537_2013_Gamma_Interpolation_Authority.md records
 * the source position as BLOCKED_PRIMARY_GAMMA_INTERPOLATION_RULE_UNQUALIFIED and
 * lists the evidence a future authorization would need. Nothing here supplies that
 * evidence, so engineeringUseAuthorized stays false.
 *
 * What it does carry is comparison qualification: the interpolated path reproduces
 * the independent CAUx 2017 WRC01f pp.24-31 case at gamma=48.03 within 2.0% at all
 * eight points, on or above the reference at every point, with the governing
 * location matching. That is why comparisonQualificationAvailable is true while
 * engineering use is not.
 *
 * Everything the two routes share — axis authority, SCF custody, r0 basis,
 * applicability rules, stress-output scope — is inherited rather than restated, so
 * the two cannot drift apart on the parts that are genuinely the same method.
 */
const EMP1_C_WRC537_INTERPOLATED_GAMMA_ROUTE = Object.freeze({
  ...EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE,
  routeId: EMP1_C_WRC537_INTERPOLATED_GAMMA_ROUTE_ID,
  registered: true,
  engineeringUseAuthorized: false,
  comparisonQualificationAvailable: true,
  suspensionReasons: Object.freeze([EMP1_C_WRC537_INTERPOLATED_GAMMA_SUSPENSION_REASON]),
  limitations: Object.freeze([
    ...EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE.limitations,
    EMP1_C_WRC537_INTERPOLATED_GAMMA_LIMITATION,
  ]),
  method: Object.freeze({
    ...EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE.method,
    identity: 'WRC537_2013_CYLINDRICAL_ORIGINAL_INTERPOLATED_GAMMA_TABLE5_ZERO_DP',
    qualificationRecordRole: 'OWNER_DIRECTED_INTERPOLATION_POLICY_NOT_WRC_SOURCE_RULE',
    routeRequalificationRequired: true,
  }),
  scope: Object.freeze({
    ...EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE.scope,
    // Spans the rows every required Table-5 figure provides, rather than one row.
    gamma: null,
    tabulatedGammaRows: Object.freeze([5, 15, 50, 100, 300]),
    gammaSelection: 'NEAREST_ENCLOSING_TABULATED_ROWS',
    // Section 4.4 forbids using an Original curve past its plotted limit and the
    // higher-gamma termination beta is not printed, so the band cannot be inferred.
    betaMinimum: null,
    betaMaximum: null,
    betaDomainBasis: 'OWNER_DECLARED_REQUIRED_ABOVE_GAMMA_5',
    interpolationAllowed: true,
    interpolatedQuantity: 'NONDIMENSIONAL_ORDINATE_Y',
    interpolationCoordinate: 'LINEAR_GAMMA',
    extrapolationAllowed: false,
    sourceQualifiedGammaSelection: false,
    wrcMethodFidelityClaim: false,
  }),
  remainingBlocked: Object.freeze([
    'NONZERO_DIFFERENTIAL_PRESSURE',
    'NONUNITY_STRESS_CONCENTRATION',
    EMP1_C_WRC537_APPENDIX_B_SCF_LIMITATION,
    'OFF_AXIS_LONGITUDINAL_MOMENT_MAXIMUM',
    'GAMMA_OUTSIDE_TABULATED_RANGE',
    'BETA_OUTER_LIMIT_NOT_SOURCE_RESOLVED',
    EMP1_C_WRC537_INTERPOLATED_GAMMA_SUSPENSION_REASON,
    'GLOBAL_EMP1_C_ROUTE',
  ]),
});

export const EMP1_C_BOUNDED_PRODUCTION_ROUTES = Object.freeze([
  EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE,
  EMP1_C_WRC537_INTERPOLATED_GAMMA_ROUTE,
]);

export function emp1CBoundedRoute(routeId) {
  return EMP1_C_BOUNDED_PRODUCTION_ROUTES.find((route) => route.routeId === routeId) ?? null;
}
