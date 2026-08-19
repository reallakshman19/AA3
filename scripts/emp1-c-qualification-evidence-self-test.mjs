#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  deriveEmp1CQualificationEvidence,
  loadEmp1CRetainedArtifacts,
  projectWrcFrozenAudit,
} from './emp1-c-qualification-evidence-lib.mjs';
import {
  EMP1_C_BLOCKER_CODES,
  evaluateEmp1CQualificationState,
} from '../src/core/emp1/emp1-c-qualification-state.js';

const retained = loadEmp1CRetainedArtifacts();
const qualifiedArtifacts = fullyQualifiedSyntheticArtifacts(retained);
const derived = deriveEmp1CQualificationEvidence(qualifiedArtifacts);

assert.equal(derived.derivation.retainedAuditObservedMatch, true);
assert.equal(derived.derivation.retainedExtractionPinVerified, true);
assert.equal(derived.wrcDataset.status, 'PASS');
assert.equal(derived.wrcDataset.sourceCustodyQualified, true);
assert.equal(derived.wrcDataset.dimensionalContractStatus, 'PASS');
assert.equal(derived.wrcDataset.dimensionalViolationCount, 0);
assert.deepEqual(derived.wrcDataset.dimensionalViolationIds, []);
assert.equal(derived.wrcDataset.coefficientCurveRows, 120);
assert.equal(derived.wrcDataset.coefficientsPerCurve, 10);
assert.equal(derived.wrcDataset.requiredScalarCoefficientCount, 1200);
assert.equal(derived.wrcDataset.numericScalarCoefficientCount, 1200);
assert.equal(derived.wrcDataset.coefficientSchemaQualified, true);
assert.equal(derived.wrcDataset.independentVariable, 'U');
assert.equal(derived.wrcDataset.independentVariableQualified, true);
assert.deepEqual(derived.signArbitration.openConflicts, []);
assert.equal(derived.signArbitration.resolutionAuthority, 'PINNED_WRC_PDF');
assert.equal(derived.runtimeContracts.status, 'PASS');
assert.equal(derived.runtimeContracts.loadAxisMappingStatus, 'PASS');
assert.equal(derived.runtimeContracts.pressureThrustStatus, 'PASS');
assert.equal(derived.runtimeContracts.pressureThrustMode, 'ADD_PRESSURE_THRUST_FROM_NOZZLE_ID');
assert.equal(derived.runtimeContracts.pressureThrustDoubleCountGuardQualified, true);
assert.equal(derived.runtimeContracts.stressIntensityDefinitionStatus, 'PASS');
assert.equal(derived.runtimeContracts.stressIntensityOutputDimension, 'STRESS');
assert.equal(derived.cauxBenchmark.status, 'PASS');
assert.equal(derived.cauxBenchmark.sourceCustodyQualified, true);
assert.equal(derived.cauxBenchmark.expectedValuesFrozen, true);
assert.equal(derived.cauxBenchmark.independentHandCalculationStatus, 'PASS');
assert.equal(derived.methodAuthorization.engineeringUseAuthorized, true);

const awaitingRoute = evaluateEmp1CQualificationState(derived);
assert.equal(awaitingRoute.technicalQualificationReady, true);
assert.equal(awaitingRoute.engineeringUseAuthorized, true);
assert.equal(awaitingRoute.runAuthorized, false);
assert.deepEqual(awaitingRoute.blockerCodes, [EMP1_C_BLOCKER_CODES.EXECUTION_ROUTE_NOT_REGISTERED]);

const executable = evaluateEmp1CQualificationState({
  ...derived,
  execution: { routeRegistered: true },
});
assert.equal(executable.state, 'READY_TO_RUN');
assert.equal(executable.technicalQualificationReady, true);
assert.equal(executable.engineeringUseAuthorized, true);
assert.equal(executable.runAuthorized, true);
assert.deepEqual(executable.blockerCodes, []);

const dimensionallyBlocked = fullyQualifiedSyntheticArtifacts(retained);
dimensionallyBlocked.wrcAudit.metrics.dimensionalContractStatus = 'BLOCKED';
dimensionallyBlocked.wrcAudit.metrics.dimensionalViolationCount = 3;
dimensionallyBlocked.wrcAudit.metrics.dimensionalViolationIds = [
  'SP_RADIAL_MEMBRANE_STRESS_DIMENSION_MISMATCH',
  'SM_MOMENT_MEMBRANE_STRESS_DIMENSION_MISMATCH',
  'STRESS_INTENSITY_OUTPUT_DIMENSION_MISMATCH',
];
dimensionallyBlocked.wrcAudit.expectedBlockerCodes = ['BLOCK_METHOD_DIMENSIONAL_CONTRACT'];
dimensionallyBlocked.wrcAudit.expectedCheckerStatus = 'BLOCKED';
dimensionallyBlocked.wrcAudit.status = 'BLOCKED';
syncObserved(dimensionallyBlocked);
const dimensionalState = evaluateEmp1CQualificationState(
  deriveEmp1CQualificationEvidence(dimensionallyBlocked),
);
assert.equal(dimensionalState.technicalQualificationReady, false);
assert.equal(dimensionalState.gateStatus.wrcDimensionalContractReady, false);
assert.ok(dimensionalState.blockerCodes.includes(
  EMP1_C_BLOCKER_CODES.WRC_DIMENSIONAL_CONTRACT_UNRESOLVED,
));

const oneNamedCoefficientMissing = fullyQualifiedSyntheticArtifacts(retained);
oneNamedCoefficientMissing.wrcAudit.metrics.numericScalarCoefficientCount = 1199;
oneNamedCoefficientMissing.wrcAudit.metrics.missingScalarCoefficientCount = 1;
syncObserved(oneNamedCoefficientMissing);
const partialDerived = deriveEmp1CQualificationEvidence(oneNamedCoefficientMissing);
const partialState = evaluateEmp1CQualificationState(partialDerived);
assert.equal(partialState.technicalQualificationReady, false);
assert.equal(partialState.gateStatus.numericalCoefficientsReady, false);
assert.ok(partialState.blockerCodes.includes(EMP1_C_BLOCKER_CODES.WRC_NUMERICAL_COEFFICIENTS_MISSING));

const legacyAnonymousPayload = fullyQualifiedSyntheticArtifacts(retained);
legacyAnonymousPayload.wrcAudit.metrics.coefficientSchema = 'LEGACY_SINGLE_VALUE_PER_CURVE';
legacyAnonymousPayload.wrcAudit.metrics.coefficientSchemaQualified = false;
legacyAnonymousPayload.wrcAudit.metrics.numericScalarCoefficientCount = 0;
legacyAnonymousPayload.wrcAudit.metrics.missingScalarCoefficientCount = 1200;
legacyAnonymousPayload.wrcAudit.metrics.legacyAnonymousCoefficientRows = 120;
legacyAnonymousPayload.wrcAudit.metrics.legacyNumericValueRows = 120;
legacyAnonymousPayload.wrcAudit.metrics.independentVariableRepresentation = 'LEGACY_PARAMETER_3_ROW_ORDINATE';
legacyAnonymousPayload.wrcAudit.metrics.independentVariableQualified = false;
syncObserved(legacyAnonymousPayload);
const legacyDerived = deriveEmp1CQualificationEvidence(legacyAnonymousPayload);
const legacyState = evaluateEmp1CQualificationState(legacyDerived);
assert.equal(legacyState.gateStatus.numericalCoefficientsReady, false);
assert.ok(legacyState.blockerCodes.includes(EMP1_C_BLOCKER_CODES.WRC_NUMERICAL_COEFFICIENTS_MISSING));

const runtimeContractMissing = fullyQualifiedSyntheticArtifacts(retained);
runtimeContractMissing.runtimeContractQualification = null;
assert.throws(
  () => deriveEmp1CQualificationEvidence(runtimeContractMissing),
  /EMP1_C_METHOD_AUTHORIZATION_WITHOUT_RUNTIME_CONTRACT_PASS/u,
);

const runtimeContractContaminated = fullyQualifiedSyntheticArtifacts(retained);
runtimeContractContaminated.runtimeContractQualification.productionObservationUsedToSetContract = true;
assert.throws(
  () => deriveEmp1CQualificationEvidence(runtimeContractContaminated),
  /EMP1_C_RUNTIME_CONTRACT_PRODUCTION_CONTAMINATED/u,
);

const invalidPressureMode = fullyQualifiedSyntheticArtifacts(retained);
invalidPressureMode.runtimeContractQualification.pressureThrust.mode = 'GUESS_PRESSURE_THRUST_SIGN';
assert.throws(
  () => deriveEmp1CQualificationEvidence(invalidPressureMode),
  /EMP1_C_PRESSURE_THRUST_MODE_INVALID/u,
);

const falseRuntimePass = fullyQualifiedSyntheticArtifacts(retained);
falseRuntimePass.runtimeContractQualification.loadAxisMapping.sourceLocator = '';
assert.throws(
  () => deriveEmp1CQualificationEvidence(falseRuntimePass),
  /EMP1_C_RUNTIME_CONTRACT_FALSE_PASS/u,
);

const forgedAudit = fullyQualifiedSyntheticArtifacts(retained);
forgedAudit.wrcAudit.metrics.numericScalarCoefficientCount = 1199;
forgedAudit.wrcAudit.metrics.missingScalarCoefficientCount = 1;
assert.throws(
  () => deriveEmp1CQualificationEvidence(forgedAudit),
  /EMP1_C_WRC_FROZEN_AUDIT_OBSERVED_DRIFT/u,
  'Changing frozen audit claims without independently observed retained-byte evidence must fail closed',
);

const productionContaminatedBenchmark = fullyQualifiedSyntheticArtifacts(retained);
productionContaminatedBenchmark.cauxBenchmarkQualification.productionObservationUsedToSetExpectedValues = true;
assert.throws(
  () => deriveEmp1CQualificationEvidence(productionContaminatedBenchmark),
  /EMP1_C_CAUX_EXPECTED_VALUES_PRODUCTION_CONTAMINATED/u,
);

const wrongRuntimeHash = fullyQualifiedSyntheticArtifacts(retained);
wrongRuntimeHash.methodAuthorization.runtimeContractQualificationHash = 'sha256:different-runtime-contract';
assert.throws(
  () => deriveEmp1CQualificationEvidence(wrongRuntimeHash),
  /EMP1_C_METHOD_AUTHORIZATION_RUNTIME_CONTRACT_HASH_MISMATCH/u,
);

const wrongMethodBenchmark = fullyQualifiedSyntheticArtifacts(retained);
wrongMethodBenchmark.methodAuthorization.cauxBenchmarkHash = 'sha256:different-benchmark';
assert.throws(
  () => deriveEmp1CQualificationEvidence(wrongMethodBenchmark),
  /EMP1_C_METHOD_AUTHORIZATION_CAUX_HASH_MISMATCH/u,
);

const brokenManifestBinding = fullyQualifiedSyntheticArtifacts(retained);
brokenManifestBinding.wrcManifest.artifacts.find((item) => item.id === 'DATASET').gitBlobSha1 = '0'.repeat(40);
assert.throws(
  () => deriveEmp1CQualificationEvidence(brokenManifestBinding),
  /EMP1_WRC_MANIFEST_ARTIFACT_PIN_MISMATCH:DATASET:gitBlobSha1/u,
);

const brokenScalarAccounting = fullyQualifiedSyntheticArtifacts(retained);
brokenScalarAccounting.wrcAudit.metrics.numericScalarCoefficientCount = 1199;
assert.throws(
  () => deriveEmp1CQualificationEvidence(brokenScalarAccounting),
  /EMP1_C_WRC_SCALAR_COEFFICIENT_ACCOUNTING_INVALID/u,
);

console.log(JSON.stringify({
  schema: 'emp1-c-qualification-evidence-self-test/v4',
  status: 'PASS',
  fixtureClassification: 'SOFTWARE_CONTRACT_ONLY_NOT_ENGINEERING_EVIDENCE',
  syntheticTechnicalQualificationReady: awaitingRoute.technicalQualificationReady,
  syntheticMethodAuthorized: awaitingRoute.engineeringUseAuthorized,
  syntheticRouteGate: awaitingRoute.blockerCodes,
  syntheticExecutableState: executable.state,
  negativeCases: [
    'three retained dimensional contradictions remain blocked',
    '1199/1200 named a-j coefficients remains blocked',
    '120 anonymous per-curve values cannot satisfy named a-j coverage',
    'method authority without runtime-contract qualification rejected',
    'production-contaminated runtime-contract evidence rejected',
    'unrecognized pressure-thrust policy rejected',
    'false PASS runtime-contract artifact rejected',
    'runtime-contract hash mismatch rejected by method authorization',
    'frozen WRC audit mutation without independently observed retained bytes rejected',
    'retained extraction manifest blob mutation rejected against immutable code pin',
    'production-derived CAUx expected values rejected',
    'method authorization benchmark mismatch rejected',
    'scalar coefficient accounting mismatch rejected',
  ],
}, null, 2));

function fullyQualifiedSyntheticArtifacts(source) {
  const value = structuredClone(source);
  value.wrcAudit.status = 'PASS';
  value.wrcAudit.expectedCheckerStatus = 'PASS';
  value.wrcAudit.expectedBlockerCodes = [];
  value.wrcAudit.unresolvedJsonPaths = [];
  value.wrcAudit.openIssues = [];
  value.wrcAudit.metrics.methodStatus = 'READY_FOR_IMPLEMENTATION';
  value.wrcAudit.metrics.datasetExtractionStatus = 'READY_FOR_IMPLEMENTATION';
  value.wrcAudit.metrics.semanticHash = 'sha256:synthetic-qualified-wrc-dataset';
  value.wrcAudit.metrics.numericalDataCount = 1;
  value.wrcAudit.metrics.unresolvedJsonPathCount = 0;
  value.wrcAudit.metrics.openIssueCount = 0;
  value.wrcAudit.metrics.dimensionalContractStatus = 'PASS';
  value.wrcAudit.metrics.dimensionalViolationCount = 0;
  value.wrcAudit.metrics.dimensionalViolationIds = [];
  value.wrcAudit.metrics.numericalCsvCurveRows = 120;
  value.wrcAudit.metrics.coefficientSchema = 'WIDE_A_TO_J_PER_CURVE';
  value.wrcAudit.metrics.coefficientSchemaQualified = true;
  value.wrcAudit.metrics.coefficientsPerCurve = 10;
  value.wrcAudit.metrics.requiredScalarCoefficientCount = 1200;
  value.wrcAudit.metrics.numericScalarCoefficientCount = 1200;
  value.wrcAudit.metrics.unresolvedScalarCoefficientCount = 0;
  value.wrcAudit.metrics.missingScalarCoefficientCount = 0;
  value.wrcAudit.metrics.invalidScalarCoefficientCount = 0;
  value.wrcAudit.metrics.legacyAnonymousCoefficientRows = 0;
  value.wrcAudit.metrics.legacyNumericValueRows = 0;
  value.wrcAudit.metrics.legacyUnresolvedValueRows = 0;
  value.wrcAudit.metrics.independentVariable = 'U';
  value.wrcAudit.metrics.independentVariableRepresentation = 'EXPLICIT_RUNTIME_INDEPENDENT_VARIABLE';
  value.wrcAudit.metrics.independentVariableQualified = true;
  value.wrcAudit.metrics.legacyParameter3UnresolvedRows = 0;
  value.wrcAudit.metrics.reviewStatusCounts = { VERIFIED: 120 };
  syncObserved(value);

  value.wrcSourceLedger.rawPdfSha256 = 'a'.repeat(64);
  value.wrcSourceLedger.custodyState = 'VERIFIED';
  value.wrcSourceLedger.qualificationState = 'PASS';

  value.signCrosscheck.status = 'PASS';
  value.signCrosscheck.resolutionAuthority = 'PINNED_WRC_PDF';
  value.signCrosscheck.comparison = {
    V1: 'CONSISTENT',
    V2: 'CONSISTENT',
    M1: 'CONSISTENT',
    M2: 'CONSISTENT',
  };

  value.runtimeContractQualification = {
    schema: 'emp1-c-runtime-contract-qualification/v1',
    status: 'PASS',
    wrcSourceRawPdfSha256: value.wrcSourceLedger.rawPdfSha256,
    productionObservationUsedToSetContract: false,
    qualificationRecordHash: 'sha256:synthetic-runtime-contract',
    loadAxisMapping: {
      status: 'PASS',
      mappingContractHash: 'sha256:synthetic-load-axis-map',
      canonicalFrameContractHash: 'sha256:synthetic-canonical-frame',
      sourceLocator: 'SYNTHETIC_TEST_ONLY',
    },
    pressureThrust: {
      status: 'PASS',
      mode: 'ADD_PRESSURE_THRUST_FROM_NOZZLE_ID',
      doubleCountGuardQualified: true,
      independentCheckStatus: 'PASS',
      policyRecordHash: 'sha256:synthetic-pressure-thrust-policy',
    },
    stressIntensity: {
      status: 'PASS',
      definitionContractHash: 'sha256:synthetic-stress-intensity-definition',
      sourceLocator: 'SYNTHETIC_TEST_ONLY',
      outputDimension: 'STRESS',
      independentCheckStatus: 'PASS',
    },
  };

  value.cauxSourceLedger.rawPdfSha256 = 'b'.repeat(64);
  value.cauxSourceLedger.custodyState = 'VERIFIED';
  value.cauxSourceLedger.qualificationState = 'PASS';
  value.cauxBenchmarkQualification = {
    schema: 'emp1-caux-pp24-31-benchmark-qualification/v1',
    sourceId: value.cauxSourceLedger.sourceId,
    sourceRawPdfSha256: value.cauxSourceLedger.rawPdfSha256,
    status: 'PASS',
    expectedValuesFrozen: true,
    independentHandCalculation: { status: 'PASS' },
    benchmarkHash: 'sha256:synthetic-qualified-caux-benchmark',
    productionObservationUsedToSetExpectedValues: false,
  };
  value.methodAuthorization = {
    schema: 'emp1-c-method-authorization/v1',
    engineeringUseAuthorized: true,
    qualificationRecordHash: 'sha256:synthetic-qualified-method-record',
    wrcSourceRawPdfSha256: value.wrcSourceLedger.rawPdfSha256,
    runtimeContractQualificationHash: value.runtimeContractQualification.qualificationRecordHash,
    cauxBenchmarkHash: value.cauxBenchmarkQualification.benchmarkHash,
  };
  return value;
}

function syncObserved(value) {
  value.wrcObservedAudit = projectWrcFrozenAudit(value.wrcAudit);
}
