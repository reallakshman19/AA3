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
  EMP1_WRC537_GENERAL_SCF_AUTHORITY_STATE,
  EMP1_WRC537_UNITY_SCF_AUTHORITY,
} from './emp1-wrc537-stress-concentration-authority.js';

export const EMP1_C_BOUNDED_ROUTE_REGISTRY_SCHEMA = 'emp1-c-bounded-route-registry/v1';
export const EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID = 'EMP1.C.WRC537.CYLINDRICAL.ORIGINAL.GAMMA5.ZERO_DP';
export const EMP1_C_WRC537_GAMMA5_ZERO_DP_QUALIFICATION_SHA256 = '3b4375407dc9484c80144f2d9a5b555000d0257021108cd799923ed6fede1a8e';
export const EMP1_C_WRC537_ZERO_DP_LOAD_PRODUCER_SHA256 = '47a9157ba88a5646021fabd41cd803028e1880c8d6f712095afda429f2c2622b';
export const EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON = 'WRC_CYLINDRICAL_LOAD_AXIS_SIGN_UNRESOLVED';
export const EMP1_C_WRC537_AXIS_AUTHORITY_STATE = 'SOURCE_QUALIFIED_RUNTIME_POLARITY_REQUIRED';
export const EMP1_C_WRC537_LONGITUDINAL_CURVE_SUSPENSION_REASON = 'WRC_LONGITUDINAL_MOMENT_CURVE_SELECTION_AUTHORITY_UNRESOLVED';
export const EMP1_C_WRC537_R0_SOURCE_SUSPENSION_REASON = 'WRC_ATTACHMENT_OUTSIDE_RADIUS_SOURCE_BASIS_UNQUALIFIED';
export const EMP1_C_WRC537_R0_SOURCE_AUTHORITY_STATE = 'TYPED_ENGINEERING_SOURCE_BINDING_RUNTIME_REQUIRED';
export const EMP1_C_WRC537_APPLICABILITY_SOURCE_SUSPENSION_REASON = 'WRC_CYLINDRICAL_4_5_APPLICABILITY_SOURCE_BASIS_UNQUALIFIED';
export const EMP1_C_WRC537_EXTREMA_LIMITATION = 'WRC_TABLE5_EIGHT_POINTS_NOT_GLOBAL_ABSOLUTE_MAXIMUM';
export const EMP1_C_WRC537_UNITY_SCF_LIMITATION = 'UNITY_STRESS_CONCENTRATION_MULTIPLIERS_ONLY';
export const EMP1_C_WRC537_APPENDIX_B_SCF_LIMITATION = 'WRC_APPENDIX_B_GENERAL_SCF_NOT_SOURCE_QUALIFIED';

export const EMP1_C_BOUNDED_PRODUCTION_ROUTES = Object.freeze([Object.freeze({
  schema: EMP1_C_BOUNDED_ROUTE_REGISTRY_SCHEMA,
  routeId: EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
  registered: false,
  engineeringUseAuthorized: false,
  comparisonQualificationAvailable: true,
  suspensionReasons: Object.freeze([
    EMP1_C_WRC537_LONGITUDINAL_CURVE_SUSPENSION_REASON,
    EMP1_C_WRC537_APPLICABILITY_SOURCE_SUSPENSION_REASON,
  ]),
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
    stressConcentrationEngineeringMeaning: EMP1_WRC537_GENERAL_SCF_AUTHORITY_STATE.engineeringMeaning,
    appendixBStressConcentrationQualified: EMP1_WRC537_GENERAL_SCF_AUTHORITY_STATE.generalAppendixBAuthority,
    nonUnityStressConcentrationAuthorized: EMP1_WRC537_GENERAL_SCF_AUTHORITY_STATE.nonUnityAuthorized,
    stressConcentrationSourceQualification: EMP1_WRC537_GENERAL_SCF_AUTHORITY_STATE.sourceQualification.retainedExtractionState,
    interpolationAllowed: false,
    crossVariantFallbackAllowed: false,
    longitudinalMomentBendingSelection: 'SOURCE_GOVERNED_REQUIRED',
    attachmentRadiusBasis: 'OUTSIDE_RADIUS_AT_SHELL_JUNCTURE',
    attachmentRadiusSourceAuthority: 'EMP1_TYPED_ENGINEERING_SOURCE_BINDING_V1',
    attachmentRadiusSourceAuthorityState: EMP1_C_WRC537_R0_SOURCE_AUTHORITY_STATE,
    attachmentRadiusSourceQualification: 'QUALIFIED_FOR_BOUNDED_R0_CUSTODY',
    runtimeAttachmentSourceEvidenceRequired: true,
    legacyAttachmentSourceAuthorized: false,
    radialLoadCylinderLengthRule: 'P_REQUIRES_L_GE_RM',
    externalMomentEndDistanceRule: 'MC_OR_ML_REQUIRES_NEAREST_END_DISTANCE_GE_0P5_RM',
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
    EMP1_C_WRC537_LONGITUDINAL_CURVE_SUSPENSION_REASON,
    EMP1_C_WRC537_APPLICABILITY_SOURCE_SUSPENSION_REASON,
    'NONZERO_DIFFERENTIAL_PRESSURE',
    'NONUNITY_STRESS_CONCENTRATION',
    EMP1_C_WRC537_APPENDIX_B_SCF_LIMITATION,
    'GAMMA_OTHER_THAN_5',
    'BETA_OUTSIDE_0P05_TO_0P5',
    'NON_TABULATED_GAMMA',
    'GLOBAL_EMP1_C_ROUTE',
  ]),
})]);

export function emp1CBoundedRoute(routeId) {
  return EMP1_C_BOUNDED_PRODUCTION_ROUTES.find((route) => route.routeId === routeId) ?? null;
}
