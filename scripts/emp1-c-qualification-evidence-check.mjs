#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  deriveEmp1CQualificationEvidence,
  loadEmp1CRetainedArtifacts,
} from './emp1-c-qualification-evidence-lib.mjs';
import { EMP1_C_RETAINED_QUALIFICATION_EVIDENCE } from '../src/core/emp1/emp1-c-qualification-evidence.generated.js';

const retained = loadEmp1CRetainedArtifacts();
const derived = deriveEmp1CQualificationEvidence(retained);
assert.deepEqual(
  EMP1_C_RETAINED_QUALIFICATION_EVIDENCE,
  derived,
  'Generated EMP.1.C evidence drifted from retained qualification artifacts',
);

assert.equal(derived.derivation.mode, 'RETAINED_ARTIFACT_DERIVATION');
assert.equal(derived.derivation.manualSummaryPermitted, false);
assert.equal(derived.wrcDataset.unresolvedJsonPathCount, 21);
assert.equal(derived.wrcDataset.openIssueCount, 7);
assert.equal(derived.wrcDataset.coefficientInventoryRows, 120);
assert.equal(derived.wrcDataset.numericCoefficientRows, 0);
assert.equal(derived.wrcDataset.unresolvedCoefficientRows, 120);
assert.equal(derived.wrcDataset.unresolvedParameterRows, 120);
assert.equal(derived.wrcDataset.sourceCustodyQualified, false);
assert.equal(derived.signArbitration.openConflicts.length, 2);
assert.equal(derived.cauxBenchmark.pageRange, '24-31');
assert.equal(derived.cauxBenchmark.sourceCustodyQualified, false);
assert.equal(derived.cauxBenchmark.supplementalPrecheckMaySatisfyCauxA4, false);
assert.equal(derived.cauxBenchmark.expectedValuesFrozen, false);
assert.equal(derived.cauxBenchmark.independentHandCalculationStatus, 'NOT_RUN');
assert.equal(derived.methodAuthorization.engineeringUseAuthorized, false);

const changedMetric = clone(retained);
changedMetric.wrcAudit.metrics.unresolvedJsonPathCount = 20;
assert.notDeepEqual(
  deriveEmp1CQualificationEvidence(changedMetric),
  EMP1_C_RETAINED_QUALIFICATION_EVIDENCE,
  'Changing retained WRC audit evidence must make the generated artifact stale',
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
  schema: 'emp1-c-qualification-evidence-check/v1',
  status: 'PASS',
  derivationMode: derived.derivation.mode,
  wrcDataset: {
    unresolvedJsonPathCount: derived.wrcDataset.unresolvedJsonPathCount,
    openIssueCount: derived.wrcDataset.openIssueCount,
    coefficientCoverage: `${derived.wrcDataset.numericCoefficientRows}/${derived.wrcDataset.coefficientInventoryRows}`,
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
