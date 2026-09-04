export const EMP1_PVELITE_BENCHMARK_PROGRAMME_SCHEMA =
  'emp1-pvelite-benchmark-programme/v1';

const FALSE_AUTHORITY = Object.freeze({
  wrcMethodAuthority: false,
  engineeringUseAuthorized: false,
  productionUseAuthorized: false,
  codeComplianceAuthorized: false,
  releaseAuthorityGranted: false,
});

const RECOVERY_POINTS = Object.freeze(['Au', 'Al', 'Bu', 'Bl', 'Cu', 'Cl', 'Du', 'Dl']);

const REQUIRED_SOURCE_FREEZE_FIELDS = Object.freeze([
  'PV_ELITE_PRODUCT_VERSION',
  'EXACT_REPORT_IDENTITY',
  'EXACT_REPORT_SHA256',
  'UNIT_SYSTEM',
  'LOCAL_STRESS_METHOD_AND_EDITION_CONTEXT',
  'GEOMETRY_AND_DIMENSION_BASIS',
  'SHELL_THICKNESS_AND_RADIUS_BASIS',
  'ATTACHMENT_GEOMETRY',
  'LOCAL_WRC_LOADS_AND_COORDINATE_REFERENCE',
  'PRESSURE_INCLUSION_AND_PRESSURE_THRUST_SETTINGS',
  'KN_KB_SETTINGS',
  'RECOVERY_POINT_IDENTITIES',
  'REPORTED_LOCAL_STRESSES_OR_INTENSITIES',
  'SOURCE_DISPLAY_PRECISION',
]);

const CONDITIONAL_SOURCE_FREEZE_FIELDS = Object.freeze([
  'PV_ELITE_BUILD_OR_RELEASE',
  'EXACT_INPUT_IDENTITY_AND_SHA256_WHEN_SEPARATELY_EXPORTED',
  'REPORTED_DIMENSIONLESS_FACTORS_WHEN_AVAILABLE',
]);

/**
 * Source-free programme for the first PV Elite comparison.
 *
 * This is policy metadata only. It contains no PV Elite expected values,
 * source hashes, EMP results, or tolerance value and creates no engineering
 * or method authority.
 */
export const EMP1_PVELITE_BENCHMARK_PROGRAMME = deepFreeze({
  schema: EMP1_PVELITE_BENCHMARK_PROGRAMME_SCHEMA,
  programmeId: 'EMP1_PVELITE_WRC107537_PRIMARY_GAMMA5_V1',
  comparator: {
    id: 'PV_ELITE',
    name: 'PV Elite',
    versionState: 'REQUIRED_FROM_RETAINED_SOURCE',
    authorityRole: 'INDEPENDENT_COMMERCIAL_SOFTWARE_COMPARISON_NOT_WRC_METHOD_AUTHORITY',
  },
  reference: {
    state: 'REFERENCE_NOT_AVAILABLE',
    sourceCustodyState: 'SOURCE_NOT_RETAINED',
    expectedValuesState: 'NOT_AVAILABLE',
    reportIdentity: null,
    reportSha256: null,
    inputIdentity: null,
    inputSha256: null,
  },
  primaryCase: {
    shellFamily: 'CYLINDRICAL',
    attachmentClass: 'SOURCE_QUALIFIED_ROUND_CLASS',
    variant: 'ORIGINAL',
    gamma: {
      selection: 'EXACT_SOURCE_ROW',
      value: 5,
    },
    betaRequirement: 'WITHIN_CURRENT_AUTHORIZED_DOMAIN',
    differentialPressure: {
      condition: 'ZERO_DIFFERENTIAL_PRESSURE',
      value: 0,
    },
    stressMultipliers: {
      Kn: 1,
      Kb: 1,
    },
    recoveryPoints: RECOVERY_POINTS,
    comparisonTarget: 'LOCAL_HOST_SHELL_WRC_STRESS_QUANTITIES',
    routeIntent: 'EXISTING_ENGINEERING_USE_AUTHORIZED_GAMMA5_ROUTE',
    interpolationPolicy: 'NOT_USED_IN_PRIMARY_CASE',
  },
  sourceFreeze: {
    state: 'BLOCKED_SOURCE_NOT_RETAINED',
    mustCompleteBeforeCorrespondingEmpObservation: true,
    requiredFields: REQUIRED_SOURCE_FREEZE_FIELDS,
    conditionalFields: CONDITIONAL_SOURCE_FREEZE_FIELDS,
    expectedValuesMustCarryStableSourceLocators: true,
  },
  antiCircularity: {
    expectedValuesMustBeFrozenBeforeEmpObservation: true,
    productionOutputMaySelectExpectedValues: false,
    productionOutputMayChooseDefinition: false,
    toleranceMustBeFrozenBeforeEmpObservation: true,
    productionOutputMaySelectTolerance: false,
  },
  tolerancePolicy: {
    state: 'UNRESOLVED_MUST_FREEZE_BEFORE_EMP_OBSERVATION',
    value: null,
    basis: null,
    qualificationIfUnresolved: 'BLOCKED_TOLERANCE_BASIS_UNRESOLVED',
    cauxThreePercentMayBeCopiedByDefault: false,
    mustInspectRetainedSourcePrecision: true,
    mustClassifyMethodEditionVersionDifferences: true,
  },
  downstreamBoundary: {
    codeComplianceState: 'NOT_ASSESSED',
    compareLocalHostShellQuantitiesOnly: true,
    downstreamPvEliteCodeChecksInScope: false,
  },
  limitations: [
    'NO_RETAINED_PV_ELITE_SOURCE_OR_NUMERICAL_REFERENCE',
    'NO_TOLERANCE_VALUE_FROZEN',
    'PRIMARY_CASE_PROGRAMME_ONLY',
    'COMPARISON_EVIDENCE_CANNOT_CREATE_WRC_METHOD_OR_ENGINEERING_USE_AUTHORITY',
  ],
  authority: FALSE_AUTHORITY,
  authorityBoundary: {
    programmeOnly: true,
    createsReferenceValues: false,
    createsToleranceValue: false,
    createsWrcMethodAuthority: false,
    createsEngineeringUseAuthority: false,
    createsProductionAuthority: false,
    createsCodeComplianceAuthority: false,
    createsReleaseAuthority: false,
  },
});

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
