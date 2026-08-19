#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EMP1_WRC_EXPECTED_CURVE_COUNT,
  EMP1_WRC_EXPECTED_SCALAR_COUNT,
  auditWrcCoefficientTranscription,
  buildWrcCoefficientTranscriptionTemplate,
} from './emp1-wrc-coefficient-transcription-lib.mjs';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const numericalCsv = await readFile(resolve(repoRoot, 'docs/04_WRC537_NUMERICAL_TABLES.csv'), 'utf8');
const template = buildWrcCoefficientTranscriptionTemplate(numericalCsv);
const baseline = auditWrcCoefficientTranscription(template);

assert.equal(baseline.structuralStatus, 'PASS');
assert.equal(baseline.qualificationStatus, 'BLOCKED');
assert.equal(baseline.metrics.curveCount, EMP1_WRC_EXPECTED_CURVE_COUNT);
assert.equal(baseline.metrics.tableCount, 20);
assert.equal(baseline.metrics.slotCount, EMP1_WRC_EXPECTED_SCALAR_COUNT);
assert.equal(baseline.metrics.numericSlotCount, 0);
assert.equal(baseline.metrics.qualifiedSlotCount, 0);
assert.deepEqual(
  baseline.blockers.map((row) => row.code),
  [
    'BLOCK_PRIMARY_PDF_CUSTODY',
    'BLOCK_NUMERIC_SCALAR_COMPLETENESS',
    'BLOCK_SOURCE_QUALIFIED_SCALAR_COMPLETENESS',
  ],
);

const duplicateCurve = structuredClone(template);
duplicateCurve.curves[1].curveId = duplicateCurve.curves[0].curveId;
assert.equal(auditWrcCoefficientTranscription(duplicateCurve).structuralStatus, 'FAIL');

const missingSlot = structuredClone(template);
missingSlot.curves[0].slots.pop();
const missingSlotAudit = auditWrcCoefficientTranscription(missingSlot);
assert.equal(missingSlotAudit.structuralStatus, 'FAIL');
assert(missingSlotAudit.failures.some((row) => row.code === 'FAIL_SLOT_COUNT_PER_CURVE'));
assert(missingSlotAudit.failures.some((row) => row.code === 'FAIL_SCALAR_COUNT'));

const wrongIndependentVariable = structuredClone(template);
wrongIndependentVariable.curves[0].independentVariable = 'rho';
assert(auditWrcCoefficientTranscription(wrongIndependentVariable).failures.some((row) => row.code === 'FAIL_INDEPENDENT_VARIABLE'));

const fakeValuesWithoutCustody = structuredClone(template);
for (const curve of fakeValuesWithoutCustody.curves) {
  for (const slot of curve.slots) {
    slot.value = 1;
    slot.publishedPrecision = 'SYNTHETIC_TEST_ONLY';
    slot.primarySourceVerified = true;
    slot.primarySourceRawPdfSha256 = 'b'.repeat(64);
    slot.reviewStatus = 'QUALIFIED';
  }
}
const fakeAudit = auditWrcCoefficientTranscription(fakeValuesWithoutCustody);
assert.equal(fakeAudit.structuralStatus, 'PASS');
assert.equal(fakeAudit.metrics.numericSlotCount, EMP1_WRC_EXPECTED_SCALAR_COUNT);
assert.equal(fakeAudit.metrics.qualifiedSlotCount, 0);
assert(fakeAudit.blockers.some((row) => row.code === 'BLOCK_PRIMARY_PDF_CUSTODY'));
assert(fakeAudit.blockers.some((row) => row.code === 'BLOCK_SOURCE_QUALIFIED_SCALAR_COMPLETENESS'));

const wrongHashAfterCustody = structuredClone(fakeValuesWithoutCustody);
wrongHashAfterCustody.primarySource.rawPdfSha256 = 'a'.repeat(64);
wrongHashAfterCustody.primarySource.custodyState = 'PASS_SOURCE_CUSTODY';
const wrongHashAudit = auditWrcCoefficientTranscription(wrongHashAfterCustody);
assert.equal(wrongHashAudit.metrics.qualifiedSlotCount, 0, 'slot SHA must equal the frozen source SHA');
assert(wrongHashAudit.blockers.some((row) => row.code === 'BLOCK_SOURCE_QUALIFIED_SCALAR_COMPLETENESS'));

const syntheticQualified = structuredClone(template);
syntheticQualified.primarySource.rawPdfSha256 = 'a'.repeat(64);
syntheticQualified.primarySource.custodyState = 'PASS_SOURCE_CUSTODY';
for (const curve of syntheticQualified.curves) {
  for (const slot of curve.slots) {
    slot.value = 1;
    slot.publishedPrecision = 'SYNTHETIC_TEST_ONLY';
    slot.primarySourceVerified = true;
    slot.primarySourceRawPdfSha256 = syntheticQualified.primarySource.rawPdfSha256;
    slot.reviewStatus = 'QUALIFIED';
    slot.qualificationState = 'QUALIFIED';
  }
}
const syntheticQualifiedAudit = auditWrcCoefficientTranscription(syntheticQualified);
assert.equal(syntheticQualifiedAudit.structuralStatus, 'PASS');
assert.equal(syntheticQualifiedAudit.qualificationStatus, 'PASS');
assert.equal(syntheticQualifiedAudit.metrics.qualifiedSlotCount, EMP1_WRC_EXPECTED_SCALAR_COUNT);

console.log(JSON.stringify({
  schema: 'emp1-wrc-coefficient-transcription-self-test/v1',
  status: 'PASS',
  baseline: {
    structuralStatus: baseline.structuralStatus,
    qualificationStatus: baseline.qualificationStatus,
    metrics: baseline.metrics,
  },
  negativeProofs: [
    'DUPLICATE_CURVE_REJECTED',
    'MISSING_SCALAR_SLOT_REJECTED',
    'WRONG_RUNTIME_INDEPENDENT_VARIABLE_REJECTED',
    'NUMERIC_VALUES_WITHOUT_FROZEN_PRIMARY_CUSTODY_REMAIN_BLOCKED',
    'QUALIFIED_SLOT_SHA_MUST_EQUAL_FROZEN_PRIMARY_SHA256',
  ],
  positiveSoftwareContractProof: 'SYNTHETIC_1200_SLOT_SOURCE_COMPLETE_PACKAGE_CAN_PASS',
  authorityNote: 'Synthetic values/hashes exist only inside this self-test. They are not WRC engineering data or benchmark authority.',
}, null, 2));
