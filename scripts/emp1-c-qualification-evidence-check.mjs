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
assert.equal(derived.wrcDataset.dimensionalViolationCount, 2);
assert.deepEqual(derived.wrcDataset.dimensionalViolationIds, [
  'SP_RADIAL_MEMBRANE_STRESS_DIMENSION_MISMATCH',
  'SM_MOMENT_MEMBRANE_STRESS_DIMENSION_MISMATCH',
]);
assert.equal(derived.wrcDataset.coefficientCurveRows, 120);
assert.equal(derived.wrcDataset.requiredScalarCoefficientCount, 1200);
assert.equal(derived.wrcDataset.numericScalarCoefficientCount, 0);
assert.equal(derived.wrcDataset.missingScalarCoefficientCount, 1200);
assert.equal(derived.wrcDataset.coefficientSchema, 'LEGACY_SINGLE_VALUE_PER_CURVE');
assert.equal(derived.wrcDataset.independentVariable, 'U');
assert.equal(derived.wrcDataset.independentVariableRepresentation, 'LEGACY_PARAMETER_3_ROW_ORDINATE');
assert.equal(derived.wrcDataset.sourceCustodyQualified, false);
assert.equal(derived.signArbitration.openConflicts.length, 2);
assert.equal(derived.cauxBenchmark.pageRange, '24-31');
assert.equal(derived.cauxBenchmark.sourceCustodyQualified, false);
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
partialSourceCustody.wrcSourceLedger.rawPdfSha256 = 'a'.repeat(64);
assert.equal(
  deriveEmp1CQualificationEvidence(partialSourceCustody).wrcDataset.sourceCustodyQualified,
  false,
  'A raw SHA alone must not promote source custody without VERIFIED/PASS ledger state',
);

const cauxWithoutSourceCustody = clone(retained);
cauxWithoutSourceCustody.cauxBenchmarkQualification = {
  schema: 'emp1-caux-pp24-31-benchmark-qualification/v1',
  sourceId: retained.cauxSourceLedger.sourceId,
  sourceRawPdfSha256: 'b'.repeat(64),
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
  schema: 'emp1-c-qualification-evidence-check/v2',
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
