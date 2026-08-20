import {
  EMP1_WRC537_BOUNDED_BETA_MAX,
  EMP1_WRC537_BOUNDED_BETA_MIN,
  EMP1_WRC537_BOUNDED_DATASET_HASH,
  EMP1_WRC537_BOUNDED_GAMMA,
  EMP1_WRC537_BOUNDED_SOURCE_SHA256,
  EMP1_WRC537_BOUNDED_VARIANT,
} from './emp1-wrc537-cylindrical-bounded-domain.js';

export const EMP1_C_BOUNDED_ROUTE_REGISTRY_SCHEMA = 'emp1-c-bounded-route-registry/v1';
export const EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID = 'EMP1.C.WRC537.CYLINDRICAL.ORIGINAL.GAMMA5.ZERO_DP';
export const EMP1_C_WRC537_GAMMA5_ZERO_DP_QUALIFICATION_SHA256 =
  '3b4375407dc9484c80144f2d9a5b555000d0257021108cd799923ed6fede1a8e';
export const EMP1_C_WRC537_ZERO_DP_LOAD_PRODUCER_SHA256 =
  '47a9157ba88a5646021fabd41cd803028e1880c8d6f712095afda429f2c2622b';
export const EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON = 'WRC_CYLINDRICAL_LOAD_AXIS_SIGN_UNRESOLVED';

export const EMP1_C_BOUNDED_PRODUCTION_ROUTES = Object.freeze([
  Object.freeze({
    schema: EMP1_C_BOUNDED_ROUTE_REGISTRY_SCHEMA,
    routeId: EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
    registered: false,
    engineeringUseAuthorized: false,
    comparisonQualificationAvailable: true,
    suspensionReasons: Object.freeze([EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON]),
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
      Kn: 1,
      Kb: 1,
      interpolationAllowed: false,
      crossVariantFallbackAllowed: false,
    }),
    remainingBlocked: Object.freeze([
      EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON,
      'NONZERO_DIFFERENTIAL_PRESSURE',
      'NONUNITY_STRESS_CONCENTRATION',
      'GAMMA_OTHER_THAN_5',
      'BETA_OUTSIDE_0P05_TO_0P5',
      'NON_TABULATED_GAMMA',
      'GLOBAL_EMP1_C_ROUTE',
    ]),
  }),
]);

export function emp1CBoundedRoute(routeId) {
  return EMP1_C_BOUNDED_PRODUCTION_ROUTES.find((route) => route.routeId === routeId) ?? null;
}
