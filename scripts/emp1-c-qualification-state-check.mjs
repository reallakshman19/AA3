import assert from 'node:assert/strict';
import {
  EMP1_C_BLOCKER_CODES,
  EMP1_C_CURRENT_QUALIFICATION_EVIDENCE,
  EMP1_C_QUALIFICATION_SCHEMA,
  evaluateEmp1CQualificationState,
} from '../src/core/emp1/emp1-c-qualification-state.js';

const WRC_SOURCE_SHA256 = '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';
const CAUX_SOURCE_SHA256 = 'c1e92798a7bc172d649007ad88f6be548651f07a01cb2fbf83343e2283e0e83e';

const current = evaluateEmp1CQualificationState();
assert.equal(current.schema, EMP1_C_QUALIFICATION_SCHEMA);
assert.equal(current.state, 'BLOCKED');
assert.equal(current.technicalQualificationReady, false);
assert.equal(current.engineeringUseAuthorized, false);
assert.equal(current.runAuthorized, false);
assert.deepEqual(current.blockerCodes, [
  EMP1_C_BLOCKER_CODES.WRC_DATASET_NOT_READY,
  EMP1_C_BLOCKER_CODES.WRC_DIMENSIONAL_CONTRACT_UNRESOLVED,
  EMP1_C_BLOCKER_CODES.WRC_RUNTIME_CONTRACTS_UNRESOLVED,
  EMP1_C_BLOCKER_CODES.WRC_NUMERICAL_COEFFICIENTS_MISSING,
  EMP1_C_BLOCKER_CODES.WRC_SIGN_ARBITRATION_OPEN,
  EMP1_C_BLOCKER_CODES.CAUX_PP24_31_NOT_FROZEN,
]);
assert.equal(current.evidence.derivation.mode, 'RETAINED_ARTIFACT_DERIVATION');
assert.equal(current.evidence.derivation.manualSummaryPermitted, false);
assert.equal(current.evidence.derivation.retainedAuditObservedMatch, true);
assert.equal(current.evidence.derivation.retainedExtractionPinVerified, true);
assert.equal(current.evidence.wrcDataset.unresolvedJsonPathCount, 21);
assert.equal(current.evidence.wrcDataset.openIssueCount, 7);
assert.equal(current.evidence.wrcDataset.dimensionalContractStatus, 'BLOCKED');
assert.equal(current.evidence.wrcDataset.dimensionalViolationCount, 3);
assert.deepEqual(current.evidence.wrcDataset.dimensionalViolationIds, [
  'SP_RADIAL_MEMBRANE_STRESS_DIMENSION_MISMATCH',
  'SM_MOMENT_MEMBRANE_STRESS_DIMENSION_MISMATCH',
  'STRESS_INTENSITY_OUTPUT_DIMENSION_MISMATCH',
]);
assert.equal(current.evidence.wrcDataset.coefficientCurveRows, 120);
assert.equal(current.evidence.wrcDataset.coefficientsPerCurve, 10);
assert.equal(current.evidence.wrcDataset.requiredScalarCoefficientCount, 1200);
assert.equal(current.evidence.wrcDataset.numericScalarCoefficientCount, 0);
assert.equal(current.evidence.wrcDataset.unresolvedScalarCoefficientCount, 0);
assert.equal(current.evidence.wrcDataset.missingScalarCoefficientCount, 1200);
assert.equal(current.evidence.wrcDataset.coefficientSchema, 'LEGACY_SINGLE_VALUE_PER_CURVE');
assert.equal(current.evidence.wrcDataset.coefficientSchemaQualified, false);
assert.equal(current.evidence.wrcDataset.independentVariable, 'U');
assert.equal(current.evidence.wrcDataset.independentVariableRepresentation, 'LEGACY_PARAMETER_3_ROW_ORDINATE');
assert.equal(current.evidence.wrcDataset.independentVariableQualified, false);
assert.equal(current.evidence.wrcDataset.sourceCustodyQualified, true);
assert.equal(current.evidence.wrcDataset.sourceCustodyState, 'VERIFIED');
assert.equal(current.evidence.wrcDataset.sourceQualificationState, 'PASS_SOURCE_CUSTODY');
assert.equal(current.evidence.wrcDataset.sourceRawPdfSha256, WRC_SOURCE_SHA256);
assert.equal(current.evidence.signArbitration.openConflicts.length, 2);
assert.equal(current.evidence.signArbitration.sourceCustodyQualified, true);
assert.equal(current.evidence.runtimeContracts.status, 'NOT_RUN');
assert.equal(current.evidence.runtimeContracts.sourceCustodyQualified, true);
assert.equal(current.evidence.runtimeContracts.sourceRawPdfSha256, WRC_SOURCE_SHA256);
assert.equal(current.evidence.runtimeContracts.loadAxisMappingStatus, 'BLOCKED');
assert.equal(current.evidence.runtimeContracts.pressureThrustStatus, 'BLOCKED');
assert.equal(current.evidence.runtimeContracts.pressureThrustMode, null);
assert.equal(current.evidence.runtimeContracts.pressureThrustDoubleCountGuardQualified, false);
assert.equal(current.evidence.runtimeContracts.stressIntensityDefinitionStatus, 'BLOCKED');
assert.equal(current.evidence.runtimeContracts.stressIntensityOutputDimension, null);
assert.equal(current.evidence.runtimeContracts.qualificationRecordHash, null);
assert.equal(current.evidence.cauxBenchmark.pageRange, '24-31');
assert.equal(current.evidence.cauxBenchmark.sourceCustodyQualified, true);
assert.equal(current.evidence.cauxBenchmark.sourceCustodyState, 'VERIFIED');
assert.equal(current.evidence.cauxBenchmark.sourceQualificationState, 'PASS_SOURCE_CUSTODY');
assert.equal(current.evidence.cauxBenchmark.sourceRawPdfSha256, CAUX_SOURCE_SHA256);
assert.equal(current.evidence.cauxBenchmark.expectedValuesFrozen, false);
assert.equal(current.evidence.cauxBenchmark.independentHandCalculationStatus, 'NOT_RUN');
assert.equal(current.evidence.cauxBenchmark.supplementalPrecheckMaySatisfyCauxA4, false);
assert.match(current.blockers[0].message, /21 unresolved fields; 7 open issues/u);
assert.match(current.blockers[0].message, /sourceCustody=VERIFIED\/PASS_SOURCE_CUSTODY/u);
assert.match(current.blockers[1].message, /3 contradiction\(s\)/u);
assert.match(current.blockers[1].message, /STRESS_INTENSITY_OUTPUT_DIMENSION_MISMATCH/u);
assert.match(current.blockers[2].message, /axisMapping=BLOCKED/u);
assert.match(current.blockers[2].message, /pressureThrust=BLOCKED\/UNRESOLVED/u);
assert.match(current.blockers[2].message, /stressIntensity=BLOCKED\/UNRESOLVED/u);
assert.match(current.blockers[3].message, /0\/1200 named scalar coefficients numeric across 120 response-curve rows/u);
assert.match(current.blockers[3].message, /schema=LEGACY_SINGLE_VALUE_PER_CURVE\/BLOCKED/u);
assert.match(current.blockers[3].message, /independentVariable=U\/LEGACY_PARAMETER_3_ROW_ORDINATE\/BLOCKED/u);
assert.match(current.blockers[5].message, /sourceCustody=VERIFIED\/PASS_SOURCE_CUSTODY/u);

const technicallyReady = readyEvidence({ methodAuthorized: false, routeRegistered: false });
const technical = evaluateEmp1CQualificationState(technicallyReady);
assert.equal(technical.technicalQualificationReady, true);
assert.equal(technical.engineeringUseAuthorized, false);
assert.equal(technical.runAuthorized, false);
assert.deepEqual(technical.blockerCodes, [EMP1_C_BLOCKER_CODES.METHOD_AUTHORITY_NOT_GRANTED]);

const methodAuthorized = readyEvidence({ methodAuthorized: true, routeRegistered: false });
const awaitingRoute = evaluateEmp1CQualificationState(methodAuthorized);
assert.equal(awaitingRoute.technicalQualificationReady, true);
assert.equal(awaitingRoute.engineeringUseAuthorized, true);
assert.equal(awaitingRoute.runAuthorized, false);
assert.deepEqual(awaitingRoute.blockerCodes, [EMP1_C_BLOCKER_CODES.EXECUTION_ROUTE_NOT_REGISTERED]);

const executable = evaluateEmp1CQualificationState(readyEvidence({
  methodAuthorized: true,
  routeRegistered: true,
}));
assert.equal(executable.state, 'READY_TO_RUN');
assert.equal(executable.technicalQualificationReady, true);
assert.equal(executable.engineeringUseAuthorized, true);
assert.equal(executable.runAuthorized, true);
assert.deepEqual(executable.blockerCodes, []);

const dimensionalConflict = readyEvidence({ methodAuthorized: true, routeRegistered: true });
dimensionalConflict.wrcDataset.dimensionalContractStatus = 'BLOCKED';
dimensionalConflict.wrcDataset.dimensionalViolationCount = 1;
dimensionalConflict.wrcDataset.dimensionalViolationIds = ['SP_RADIAL_MEMBRANE_STRESS_DIMENSION_MISMATCH'];
assert.deepEqual(
  evaluateEmp1CQualificationState(dimensionalConflict).blockerCodes,
  [EMP1_C_BLOCKER_CODES.WRC_DIMENSIONAL_CONTRACT_UNRESOLVED],
);

const missingRuntimeContracts = readyEvidence({ methodAuthorized: true, routeRegistered: true });
missingRuntimeContracts.runtimeContracts.status = 'NOT_RUN';
missingRuntimeContracts.runtimeContracts.loadAxisMappingStatus = 'BLOCKED';
missingRuntimeContracts.runtimeContracts.loadAxisMappingContractHash = null;
missingRuntimeContracts.runtimeContracts.canonicalFrameContractHash = null;
missingRuntimeContracts.runtimeContracts.loadAxisSourceLocator = null;
missingRuntimeContracts.runtimeContracts.pressureThrustStatus = 'BLOCKED';
missingRuntimeContracts.runtimeContracts.pressureThrustMode = null;
missingRuntimeContracts.runtimeContracts.pressureThrustDoubleCountGuardQualified = false;
missingRuntimeContracts.runtimeContracts.pressureThrustIndependentCheckStatus = 'NOT_RUN';
missingRuntimeContracts.runtimeContracts.pressureThrustPolicyRecordHash = null;
missingRuntimeContracts.runtimeContracts.stressIntensityDefinitionStatus = 'BLOCKED';
missingRuntimeContracts.runtimeContracts.stressIntensityDefinitionContractHash = null;
missingRuntimeContracts.runtimeContracts.stressIntensitySourceLocator = null;
missingRuntimeContracts.runtimeContracts.stressIntensityOutputDimension = null;
missingRuntimeContracts.runtimeContracts.stressIntensityIndependentCheckStatus = 'NOT_RUN';
missingRuntimeContracts.runtimeContracts.qualificationRecordHash = null;
assert.deepEqual(
  evaluateEmp1CQualificationState(missingRuntimeContracts).blockerCodes,
  [EMP1_C_BLOCKER_CODES.WRC_RUNTIME_CONTRACTS_UNRESOLVED],
);

const unsafePressurePolicy = readyEvidence({ methodAuthorized: true, routeRegistered: true });
unsafePressurePolicy.runtimeContracts.pressureThrustMode = 'UNRESOLVED';
assert.deepEqual(
  evaluateEmp1CQualificationState(unsafePressurePolicy).blockerCodes,
  [EMP1_C_BLOCKER_CODES.WRC_RUNTIME_CONTRACTS_UNRESOLVED],
);

const missingStressDefinition = readyEvidence({ methodAuthorized: true, routeRegistered: true });
missingStressDefinition.runtimeContracts.stressIntensityDefinitionStatus = 'BLOCKED';
missingStressDefinition.runtimeContracts.stressIntensityOutputDimension = null;
assert.deepEqual(
  evaluateEmp1CQualificationState(missingStressDefinition).blockerCodes,
  [EMP1_C_BLOCKER_CODES.WRC_RUNTIME_CONTRACTS_UNRESOLVED],
);

const missingCoefficient = readyEvidence({ methodAuthorized: true, routeRegistered: true });
missingCoefficient.wrcDataset.numericScalarCoefficientCount = 0;
missingCoefficient.wrcDataset.missingScalarCoefficientCount = 1200;
assert.deepEqual(
  evaluateEmp1CQualificationState(missingCoefficient).blockerCodes,
  [EMP1_C_BLOCKER_CODES.WRC_NUMERICAL_COEFFICIENTS_MISSING],
);

const incompleteCoverage = readyEvidence({ methodAuthorized: true, routeRegistered: true });
incompleteCoverage.wrcDataset.numericScalarCoefficientCount = 1199;
incompleteCoverage.wrcDataset.missingScalarCoefficientCount = 1;
assert.deepEqual(
  evaluateEmp1CQualificationState(incompleteCoverage).blockerCodes,
  [EMP1_C_BLOCKER_CODES.WRC_NUMERICAL_COEFFICIENTS_MISSING],
);

const anonymousCurveValues = readyEvidence({ methodAuthorized: true, routeRegistered: true });
anonymousCurveValues.wrcDataset.coefficientSchema = 'LEGACY_SINGLE_VALUE_PER_CURVE';
anonymousCurveValues.wrcDataset.coefficientSchemaQualified = false;
assert.deepEqual(
  evaluateEmp1CQualificationState(anonymousCurveValues).blockerCodes,
  [EMP1_C_BLOCKER_CODES.WRC_NUMERICAL_COEFFICIENTS_MISSING],
);

const rowOrdinateU = readyEvidence({ methodAuthorized: true, routeRegistered: true });
rowOrdinateU.wrcDataset.independentVariableRepresentation = 'LEGACY_PARAMETER_3_ROW_ORDINATE';
rowOrdinateU.wrcDataset.independentVariableQualified = false;
assert.deepEqual(
  evaluateEmp1CQualificationState(rowOrdinateU).blockerCodes,
  [EMP1_C_BLOCKER_CODES.WRC_NUMERICAL_COEFFICIENTS_MISSING],
);

const missingWrcSourceCustody = readyEvidence({ methodAuthorized: true, routeRegistered: true });
missingWrcSourceCustody.wrcDataset.sourceCustodyQualified = false;
missingWrcSourceCustody.wrcDataset.sourceRawPdfSha256 = null;
assert.deepEqual(
  evaluateEmp1CQualificationState(missingWrcSourceCustody).blockerCodes,
  [EMP1_C_BLOCKER_CODES.WRC_DATASET_NOT_READY],
);

const unresolvedSign = readyEvidence({ methodAuthorized: true, routeRegistered: true });
unresolvedSign.signArbitration.resolutionAuthority = 'HEXAGON_SECONDARY_REFERENCE';
assert.deepEqual(
  evaluateEmp1CQualificationState(unresolvedSign).blockerCodes,
  [EMP1_C_BLOCKER_CODES.WRC_SIGN_ARBITRATION_OPEN],
);

const signWithoutSourceCustody = readyEvidence({ methodAuthorized: true, routeRegistered: true });
signWithoutSourceCustody.signArbitration.sourceCustodyQualified = false;
assert.deepEqual(
  evaluateEmp1CQualificationState(signWithoutSourceCustody).blockerCodes,
  [EMP1_C_BLOCKER_CODES.WRC_SIGN_ARBITRATION_OPEN],
);

const incompleteCaux = readyEvidence({ methodAuthorized: true, routeRegistered: true });
incompleteCaux.cauxBenchmark.independentHandCalculationStatus = 'NOT_RUN';
assert.deepEqual(
  evaluateEmp1CQualificationState(incompleteCaux).blockerCodes,
  [EMP1_C_BLOCKER_CODES.CAUX_PP24_31_NOT_FROZEN],
);

const cauxWithoutSourceCustody = readyEvidence({ methodAuthorized: true, routeRegistered: true });
cauxWithoutSourceCustody.cauxBenchmark.sourceCustodyQualified = false;
cauxWithoutSourceCustody.cauxBenchmark.sourceRawPdfSha256 = null;
assert.deepEqual(
  evaluateEmp1CQualificationState(cauxWithoutSourceCustody).blockerCodes,
  [EMP1_C_BLOCKER_CODES.CAUX_PP24_31_NOT_FROZEN],
);

assert.equal(Object.isFrozen(current), true);
assert.equal(Object.isFrozen(current.blockers), true);
assert.equal(Object.isFrozen(EMP1_C_CURRENT_QUALIFICATION_EVIDENCE), true);

console.log(JSON.stringify({
  schema: 'emp1-c-qualification-state-check/v5',
  status: 'PASS',
  currentState: current.state,
  currentBlockers: current.blockerCodes,
  currentMetrics: {
    unresolvedJsonPaths: current.evidence.wrcDataset.unresolvedJsonPathCount,
    openIssues: current.evidence.wrcDataset.openIssueCount,
    dimensionalContractStatus: current.evidence.wrcDataset.dimensionalContractStatus,
    dimensionalViolationIds: current.evidence.wrcDataset.dimensionalViolationIds,
    runtimeContractsStatus: current.evidence.runtimeContracts.status,
    loadAxisMappingStatus: current.evidence.runtimeContracts.loadAxisMappingStatus,
    pressureThrustStatus: current.evidence.runtimeContracts.pressureThrustStatus,
    stressIntensityDefinitionStatus: current.evidence.runtimeContracts.stressIntensityDefinitionStatus,
    coefficientCurveRows: current.evidence.wrcDataset.coefficientCurveRows,
    requiredScalarCoefficientCount: current.evidence.wrcDataset.requiredScalarCoefficientCount,
    numericScalarCoefficientCount: current.evidence.wrcDataset.numericScalarCoefficientCount,
    missingScalarCoefficientCount: current.evidence.wrcDataset.missingScalarCoefficientCount,
    coefficientSchema: current.evidence.wrcDataset.coefficientSchema,
    independentVariableRepresentation: current.evidence.wrcDataset.independentVariableRepresentation,
    wrcSourceCustodyQualified: current.evidence.wrcDataset.sourceCustodyQualified,
    signConflicts: current.evidence.signArbitration.openConflicts.length,
    cauxSourceCustodyQualified: current.evidence.cauxBenchmark.sourceCustodyQualified,
    cauxIndependentHandCalculation: current.evidence.cauxBenchmark.independentHandCalculationStatus,
  },
  syntheticPromotionSequence: [
    'TECHNICAL_READY_METHOD_AUTHORITY_REQUIRED',
    'METHOD_AUTHORIZED_EXECUTION_ROUTE_REQUIRED',
    'READY_TO_RUN',
  ],
}, null, 2));

function readyEvidence({ methodAuthorized, routeRegistered }) {
  return {
    schema: 'emp1-c-qualification-evidence/v1',
    derivation: {
      mode: 'SYNTHETIC_TEST_ONLY',
      manualSummaryPermitted: false,
      retainedAuditObservedMatch: true,
      retainedExtractionPinVerified: true,
    },
    wrcDataset: {
      status: 'PASS',
      extractionStatus: 'READY_FOR_IMPLEMENTATION',
      unresolvedJsonPathCount: 0,
      openIssueCount: 0,
      numericalDataCount: 1,
      dimensionalContractStatus: 'PASS',
      dimensionalViolationCount: 0,
      dimensionalViolationIds: [],
      coefficientCurveRows: 120,
      coefficientSchema: 'WIDE_A_TO_J_PER_CURVE',
      coefficientSchemaQualified: true,
      coefficientsPerCurve: 10,
      requiredScalarCoefficientCount: 1200,
      numericScalarCoefficientCount: 1200,
      unresolvedScalarCoefficientCount: 0,
      missingScalarCoefficientCount: 0,
      invalidScalarCoefficientCount: 0,
      independentVariable: 'U',
      independentVariableRepresentation: 'EXPLICIT_RUNTIME_INDEPENDENT_VARIABLE',
      independentVariableQualified: true,
      semanticHash: 'sha256:qualified-dataset',
      sourceCustodyQualified: true,
      sourceCustodyState: 'VERIFIED',
      sourceQualificationState: 'PASS_SOURCE_CUSTODY',
      sourceRawPdfSha256: 'a'.repeat(64),
    },
    signArbitration: {
      status: 'PASS',
      resolutionAuthority: 'PINNED_WRC_PDF',
      openConflicts: [],
      sourceCustodyQualified: true,
    },
    runtimeContracts: {
      status: 'PASS',
      sourceCustodyQualified: true,
      sourceRawPdfSha256: 'a'.repeat(64),
      loadAxisMappingStatus: 'PASS',
      loadAxisMappingContractHash: 'sha256:qualified-load-axis-map',
      canonicalFrameContractHash: 'sha256:qualified-canonical-frame',
      loadAxisSourceLocator: 'SYNTHETIC_TEST_ONLY',
      pressureThrustStatus: 'PASS',
      pressureThrustMode: 'ADD_PRESSURE_THRUST_FROM_NOZZLE_ID',
      pressureThrustDoubleCountGuardQualified: true,
      pressureThrustIndependentCheckStatus: 'PASS',
      pressureThrustPolicyRecordHash: 'sha256:qualified-pressure-thrust-policy',
      stressIntensityDefinitionStatus: 'PASS',
      stressIntensityDefinitionContractHash: 'sha256:qualified-stress-intensity',
      stressIntensitySourceLocator: 'SYNTHETIC_TEST_ONLY',
      stressIntensityOutputDimension: 'STRESS',
      stressIntensityIndependentCheckStatus: 'PASS',
      qualificationRecordHash: 'sha256:qualified-runtime-contract',
    },
    cauxBenchmark: {
      status: 'PASS',
      sourceIdentityVerified: true,
      sourceCustodyQualified: true,
      sourceCustodyState: 'VERIFIED',
      sourceQualificationState: 'PASS_SOURCE_CUSTODY',
      sourceRawPdfSha256: 'b'.repeat(64),
      pageRange: '24-31',
      expectedValuesFrozen: true,
      independentHandCalculationStatus: 'PASS',
      benchmarkHash: 'sha256:qualified-caux-benchmark',
      supplementalPrecheckVerdict: 'QUALIFIED_FOR_BOUNDED_SANITY_CHECK_ONLY',
      supplementalPrecheckMaySatisfyCauxA4: false,
    },
    methodAuthorization: {
      engineeringUseAuthorized: methodAuthorized,
      qualificationRecordHash: methodAuthorized ? 'sha256:qualified-method-record' : null,
      authoritySource: methodAuthorized ? 'SYNTHETIC_TEST_ONLY' : 'NONE',
    },
    execution: { routeRegistered },
  };
}
