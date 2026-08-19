#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  deriveEmp1CQualificationEvidence,
  loadEmp1CRetainedArtifacts,
} from './emp1-c-qualification-evidence-lib.mjs';
import {
  EMP1_C_BLOCKER_CODES,
  evaluateEmp1CQualificationState,
} from '../src/core/emp1/emp1-c-qualification-state.js';

const retained = loadEmp1CRetainedArtifacts();
const qualifiedArtifacts = fullyQualifiedSyntheticArtifacts(retained);
const derived = deriveEmp1CQualificationEvidence(qualifiedArtifacts);

assert.equal(derived.wrcDataset.status, 'PASS');
assert.equal(derived.wrcDataset.sourceCustodyQualified, true);
assert.equal(derived.wrcDataset.numericCoefficientRows, 120);
assert.equal(derived.wrcDataset.coefficientInventoryRows, 120);
assert.deepEqual(derived.signArbitration.openConflicts, []);
assert.equal(derived.signArbitration.resolutionAuthority, 'PINNED_WRC_PDF');
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

const productionContaminatedBenchmark = fullyQualifiedSyntheticArtifacts(retained);
productionContaminatedBenchmark.cauxBenchmarkQualification.productionObservationUsedToSetExpectedValues = true;
assert.throws(
  () => deriveEmp1CQualificationEvidence(productionContaminatedBenchmark),
  /EMP1_C_CAUX_EXPECTED_VALUES_PRODUCTION_CONTAMINATED/u,
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
  /EMP1_C_WRC_AUDIT_MANIFEST_BINDING_MISMATCH:DATASET/u,
);

const brokenRowAccounting = fullyQualifiedSyntheticArtifacts(retained);
brokenRowAccounting.wrcAudit.metrics.numericCoefficientRows = 119;
assert.throws(
  () => deriveEmp1CQualificationEvidence(brokenRowAccounting),
  /EMP1_C_WRC_COEFFICIENT_ROW_ACCOUNTING_INVALID/u,
);

console.log(JSON.stringify({
  schema: 'emp1-c-qualification-evidence-self-test/v1',
  status: 'PASS',
  fixtureClassification: 'SOFTWARE_CONTRACT_ONLY_NOT_ENGINEERING_EVIDENCE',
  syntheticTechnicalQualificationReady: awaitingRoute.technicalQualificationReady,
  syntheticMethodAuthorized: awaitingRoute.engineeringUseAuthorized,
  syntheticRouteGate: awaitingRoute.blockerCodes,
  syntheticExecutableState: executable.state,
  negativeCases: [
    'production-derived CAUx expected values rejected',
    'method authorization benchmark mismatch rejected',
    'WRC manifest/audit binding mismatch rejected',
    'coefficient row-accounting mismatch rejected',
  ],
}, null, 2));

function fullyQualifiedSyntheticArtifacts(source) {
  const value = structuredClone(source);
  value.wrcAudit.status = 'PASS';
  value.wrcAudit.metrics.methodStatus = 'READY_FOR_IMPLEMENTATION';
  value.wrcAudit.metrics.datasetExtractionStatus = 'READY_FOR_IMPLEMENTATION';
  value.wrcAudit.metrics.semanticHash = 'sha256:synthetic-qualified-wrc-dataset';
  value.wrcAudit.metrics.numericalDataCount = 1;
  value.wrcAudit.metrics.unresolvedJsonPathCount = 0;
  value.wrcAudit.metrics.openIssueCount = 0;
  value.wrcAudit.metrics.numericCoefficientRows = 120;
  value.wrcAudit.metrics.unresolvedCoefficientRows = 0;
  value.wrcAudit.metrics.unresolvedParameter3Rows = 0;

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
    cauxBenchmarkHash: value.cauxBenchmarkQualification.benchmarkHash,
  };
  return value;
}
