#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  deriveEmp1CQualificationEvidence,
  loadEmp1CRetainedArtifacts,
  renderEmp1CQualificationEvidenceModule,
} from './emp1-c-qualification-evidence-lib.mjs';
import { EMP1_C_RETAINED_QUALIFICATION_EVIDENCE } from '../src/core/emp1/emp1-c-qualification-evidence.generated.js';

const root = process.cwd();
const retained = loadEmp1CRetainedArtifacts(root);
const derived = deriveEmp1CQualificationEvidence(retained);
const generatedPath = path.join(root, 'src/core/emp1/emp1-c-qualification-evidence.generated.js');
const generatedText = fs.readFileSync(generatedPath, 'utf8');
const expectedGeneratedText = renderEmp1CQualificationEvidenceModule(derived);

assert.equal(
  generatedText,
  expectedGeneratedText,
  'Generated EMP.1.C module text drifted from deterministic retained-artifact rendering',
);
assert.deepEqual(
  EMP1_C_RETAINED_QUALIFICATION_EVIDENCE,
  derived,
  'Generated EMP.1.C evidence object drifted from retained qualification artifacts',
);

assert.equal(derived.derivation.mode, 'RETAINED_ARTIFACT_DERIVATION');
assert.equal(derived.derivation.manualSummaryPermitted, false);
assert.equal(derived.derivation.retainedAuditObservedMatch, true);
assert.equal(derived.derivation.retainedExtractionPinVerified, true);
assert.equal(derived.wrcDataset.unresolvedJsonPathCount, 21);
assert.equal(derived.wrcDataset.openIssueCount, 7);
assert.equal(derived.wrcDataset.dimensionalContractStatus, 'BLOCKED');
assert.equal(derived.wrcDataset.dimensionalViolationCount, 3);
assert.deepEqual(derived.wrcDataset.dimensionalViolationIds, [
  'SP_RADIAL_MEMBRANE_STRESS_DIMENSION_MISMATCH',
  'SM_MOMENT_MEMBRANE_STRESS_DIMENSION_MISMATCH',
  'STRESS_INTENSITY_OUTPUT_DIMENSION_MISMATCH',
]);
assert.equal(derived.wrcDataset.coefficientCurveRows, 120);
assert.equal(derived.wrcDataset.requiredScalarCoefficientCount, 1200);
assert.equal(derived.wrcDataset.numericScalarCoefficientCount, 0);
assert.equal(derived.wrcDataset.missingScalarCoefficientCount, 1200);
assert.equal(derived.wrcDataset.coefficientSchema, 'LEGACY_SINGLE_VALUE_PER_CURVE');
assert.equal(derived.wrcDataset.independentVariable, 'U');
assert.equal(derived.wrcDataset.independentVariableRepresentation, 'LEGACY_PARAMETER_3_ROW_ORDINATE');
assert.equal(derived.wrcDataset.sourceCustodyQualified, true);
assert.equal(derived.signArbitration.openConflicts.length, 2);
assert.equal(derived.runtimeContracts.status, 'NOT_RUN');
assert.equal(derived.runtimeContracts.sourceCustodyQualified, true);
assert.equal(derived.runtimeContracts.loadAxisMappingStatus, 'BLOCKED');
assert.equal(derived.runtimeContracts.pressureThrustStatus, 'BLOCKED');
assert.equal(derived.runtimeContracts.pressureThrustMode, null);
assert.equal(derived.runtimeContracts.pressureThrustDoubleCountGuardQualified, false);
assert.equal(derived.runtimeContracts.stressIntensityDefinitionStatus, 'BLOCKED');
assert.equal(derived.runtimeContracts.stressIntensityOutputDimension, null);
assert.equal(derived.runtimeContracts.qualificationRecordHash, null);
assert.equal(derived.cauxBenchmark.pageRange, '24-31');
assert.equal(derived.cauxBenchmark.sourceCustodyQualified, true);
assert.equal(derived.cauxBenchmark.supplementalPrecheckMaySatisfyCauxA4, false);
assert.equal(derived.cauxBenchmark.expectedValuesFrozen, false);
assert.equal(derived.cauxBenchmark.independentHandCalculationStatus, 'NOT_RUN');
assert.equal(derived.methodAuthorization.engineeringUseAuthorized, false);

assert.equal(retained.wrcObservedAudit.status, 'BLOCKED');
assert.deepEqual(retained.wrcObservedAudit.blockerCodes, retained.wrcAudit.expectedBlockerCodes);
assert.deepEqual(retained.wrcObservedAudit.failureCodes, []);
assert.deepEqual(retained.wrcObservedAudit.metrics, retained.wrcAudit.metrics);
assert.deepEqual(retained.wrcObservedAudit.unresolvedJsonPaths, retained.wrcAudit.unresolvedJsonPaths);
assert.deepEqual(retained.wrcObservedAudit.openIssues, retained.wrcAudit.openIssues);

const changedMetric = clone(retained);
changedMetric.wrcAudit.metrics.unresolvedJsonPathCount = 20;
assert.throws(
  () => deriveEmp1CQualificationEvidence(changedMetric),
  /EMP1_C_WRC_FROZEN_AUDIT_OBSERVED_DRIFT/u,
  'A hand-edited frozen WRC audit must not change runtime qualification without observed retained-byte evidence',
);

const forgedManifest = clone(retained);
forgedManifest.wrcManifest.artifacts.find((item) => item.id === 'DATASET').gitBlobSha1 = '0'.repeat(40);
assert.throws(
  () => deriveEmp1CQualificationEvidence(forgedManifest),
  /EMP1_WRC_MANIFEST_ARTIFACT_PIN_MISMATCH:DATASET:gitBlobSha1/u,
  'The extraction manifest cannot move the frozen blob baseline',
);

const precheckEscalation = clone(retained);
precheckEscalation.cauxSupplementalPrecheck.maySatisfyCauxA4 = true;
assert.throws(
  () => deriveEmp1CQualificationEvidence(precheckEscalation),
  /EMP1_C_CAUX_PRECHECK_AUTHORITY_ESCALATION/u,
);

const partialSourceCustody = clone(retained);
partialSourceCustody.wrcSourceLedger.rawPdfSha256 = null;
assert.equal(
  deriveEmp1CQualificationEvidence(partialSourceCustody).wrcDataset.sourceCustodyQualified,
  false,
  'VERIFIED/PASS_SOURCE_CUSTODY without the frozen raw SHA must not remain source-qualified',
);

const runtimeWithoutSourceCustody = clone(retained);
runtimeWithoutSourceCustody.wrcSourceLedger.qualificationState = 'PASS';
runtimeWithoutSourceCustody.runtimeContractQualification = {
  schema: 'emp1-c-runtime-contract-qualification/v1',
  status: 'PASS',
  wrcSourceRawPdfSha256: retained.wrcSourceLedger.rawPdfSha256,
  productionObservationUsedToSetContract: false,
  qualificationRecordHash: 'sha256:synthetic-runtime-contract',
  loadAxisMapping: {
    status: 'PASS',
    mappingContractHash: 'sha256:synthetic-load-map',
    canonicalFrameContractHash: 'sha256:synthetic-canonical-frame',
    sourceLocator: 'SYNTHETIC_TEST_ONLY',
  },
  pressureThrust: {
    status: 'PASS',
    mode: 'ADD_PRESSURE_THRUST_FROM_NOZZLE_ID',
    doubleCountGuardQualified: true,
    independentCheckStatus: 'PASS',
    policyRecordHash: 'sha256:synthetic-thrust-policy',
  },
  stressIntensity: {
    status: 'PASS',
    definitionContractHash: 'sha256:synthetic-stress-intensity',
    sourceLocator: 'SYNTHETIC_TEST_ONLY',
    outputDimension: 'STRESS',
    independentCheckStatus: 'PASS',
  },
};
assert.throws(
  () => deriveEmp1CQualificationEvidence(runtimeWithoutSourceCustody),
  /EMP1_C_RUNTIME_CONTRACT_WITHOUT_WRC_SOURCE_CUSTODY/u,
);

const cauxWithoutSourceCustody = clone(retained);
cauxWithoutSourceCustody.cauxSourceLedger.qualificationState = 'PASS';
cauxWithoutSourceCustody.cauxBenchmarkQualification = {
  schema: 'emp1-caux-pp24-31-benchmark-qualification/v1',
  sourceId: retained.cauxSourceLedger.sourceId,
  sourceRawPdfSha256: retained.cauxSourceLedger.rawPdfSha256,
  status: 'PASS',
  expectedValuesFrozen: true,
  independentHandCalculation: { status: 'PASS' },
  benchmarkHash: 'sha256:synthetic',
  productionObservationUsedToSetExpectedValues: false,
};
assert.throws(
  () => deriveEmp1CQualificationEvidence(cauxWithoutSourceCustody),
  /EMP1_C_CAUX_QUALIFICATION_WITHOUT_SOURCE_CUSTODY/u,
);

console.log(JSON.stringify({
  schema: 'emp1-c-qualification-evidence-check/v4',
  status: 'PASS',
  derivationMode: derived.derivation.mode,
  generatedArtifactExact: true,
  retainedAuditObservedMatch: derived.derivation.retainedAuditObservedMatch,
  retainedExtractionPinVerified: derived.derivation.retainedExtractionPinVerified,
  wrcDataset: {
    unresolvedJsonPathCount: derived.wrcDataset.unresolvedJsonPathCount,
    openIssueCount: derived.wrcDataset.openIssueCount,
    dimensionalContractStatus: derived.wrcDataset.dimensionalContractStatus,
    dimensionalViolationIds: derived.wrcDataset.dimensionalViolationIds,
    responseCurveRows: derived.wrcDataset.coefficientCurveRows,
    namedScalarCoefficientCoverage: `${derived.wrcDataset.numericScalarCoefficientCount}/${derived.wrcDataset.requiredScalarCoefficientCount}`,
    coefficientSchema: derived.wrcDataset.coefficientSchema,
    independentVariableRepresentation: derived.wrcDataset.independentVariableRepresentation,
    sourceCustodyQualified: derived.wrcDataset.sourceCustodyQualified,
  },
  runtimeContracts: {
    status: derived.runtimeContracts.status,
    sourceCustodyQualified: derived.runtimeContracts.sourceCustodyQualified,
    loadAxisMappingStatus: derived.runtimeContracts.loadAxisMappingStatus,
    pressureThrustStatus: derived.runtimeContracts.pressureThrustStatus,
    stressIntensityDefinitionStatus: derived.runtimeContracts.stressIntensityDefinitionStatus,
  },
  signConflicts: derived.signArbitration.openConflicts,
  caux: {
    sourceCustodyQualified: derived.cauxBenchmark.sourceCustodyQualified,
    expectedValuesFrozen: derived.cauxBenchmark.expectedValuesFrozen,
    independentHandCalculationStatus: derived.cauxBenchmark.independentHandCalculationStatus,
    supplementalPrecheckMaySatisfyCauxA4: derived.cauxBenchmark.supplementalPrecheckMaySatisfyCauxA4,
  },
}, null, 2));

function clone(value) {
  return structuredClone(value);
}
