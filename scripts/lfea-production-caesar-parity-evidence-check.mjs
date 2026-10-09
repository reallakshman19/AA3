#!/usr/bin/env node
/**
 * Validate that BM4_L production-to-CAESAR parity was MEASURED, without
 * pretending a measurement-only exit code certifies engineering agreement.
 * Does not alter existing numerical tolerances, source values, or result data.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const BM4L_SHA256 = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const BM4L_BYTES = 5_136_384;
const REQUIRED_CASES = ['L2', 'L5', 'L6'];
const REQUIRED_QUANTITIES = ['DISPLACEMENT', 'ROTATION', 'FORCE', 'MOMENT'];
const CAPTURE = /(?:^|\n)(\{\s*"check"\s*:\s*"lfea-production-caesar-parity")/gu;

export function extractMeasurement(log) {
  assert.equal(typeof log, 'string');
  const matches = [...log.matchAll(CAPTURE)];
  assert.equal(matches.length, 1,
    'BM4L_PRODUCTION_PARITY_EXACTLY_ONE_MEASUREMENT_REQUIRED: do not accept a skipped, absent, or duplicated report');
  const marker = matches[0];
  const start = marker.index + (log[marker.index] === '\n' ? 1 : 0);
  const report = JSON.parse(log.slice(start).trim());
  assert.equal(report.check, 'lfea-production-caesar-parity');
  assert.equal(report.status, 'MEASURED',
    'BM4L_PRODUCTION_PARITY_MEASURED_REQUIRED: a SKIPPED_MODEL_NOT_PRESENT run is not evidence');
  return report;
}

export function validateMeasurement(report) {
  assert.equal(report.status, 'MEASURED');
  assert.equal(report.editionProfileId, 'B31_3_2022_B31J_2017');
  assert.deepEqual(report.caseMapping, {
    'IXP-W': 'L2',
    'IXP-WP': 'L6',
    'IXP-WPT': 'L5',
  }, 'BM4L_PRODUCTION_PARITY_CASE_MAPPING_DRIFT');
  assert.ok(Array.isArray(report.perCase));
  const actualCases = report.perCase.map((item) => item.caseId).sort();
  assert.deepEqual(actualCases, [...REQUIRED_CASES].sort(),
    'BM4L_PRODUCTION_PARITY_CASE_COVERAGE_REQUIRED');
  assert.ok(Number.isInteger(report.sourceElementChains) && report.sourceElementChains > 0,
    'BM4L_PRODUCTION_PARITY_SOURCE_ELEMENT_CHAIN_COVERAGE_REQUIRED');
  assert.ok(Array.isArray(report.solverEvidence) && report.solverEvidence.length >= 3,
    'BM4L_PRODUCTION_PARITY_SOLVER_EVIDENCE_REQUIRED');
  assert.ok(report.thermalIntervalAuthority?.semanticHash,
    'BM4L_PRODUCTION_PARITY_EXPLICIT_THERMAL_AUTHORITY_REQUIRED');

  let comparedComponents = 0;
  let failedComponents = 0;
  const rows = [];
  for (const row of report.perCase) {
    assert.ok(Number.isInteger(row.comparedComponents) && row.comparedComponents > 0,
      `BM4L_PARITY_EMPTY_CASE:${row.caseId}`);
    assert.ok(Number.isInteger(row.failing) && row.failing >= 0 && row.failing <= row.comparedComponents);
    for (const family of REQUIRED_QUANTITIES) {
      const familyResult = row.byQuantity?.[family];
      assert.ok(Number.isInteger(familyResult?.compared) && familyResult.compared > 0,
        `BM4L_PARITY_QUANTITY_NOT_MEASURED:${row.caseId}:${family}`);
      assert.ok(Number.isInteger(familyResult.failing)
        && familyResult.failing >= 0 && familyResult.failing <= familyResult.compared,
      `BM4L_PARITY_INVALID_FAILURE_COUNT:${row.caseId}:${family}`);
    }
    const subtotal = Object.values(row.byQuantity)
      .reduce((total, value) => total + value.compared, 0);
    assert.equal(subtotal, row.comparedComponents,
      `BM4L_PARITY_COMPONENT_TOTAL_INCONSISTENT:${row.caseId}`);
    comparedComponents += row.comparedComponents;
    failedComponents += row.failing;
    rows.push({
      caseId: row.caseId, comparedComponents: row.comparedComponents,
      failing: row.failing, passRatePercent: row.passRatePercent,
      worstPercentError: row.worstPercentError,
      byQuantity: row.byQuantity, worstRows: row.worstRows,
    });
  }
  assert.ok(comparedComponents > 0);
  // A green measurement workflow is never a claim of numerical qualification:
  // tolerances still belong to the source comparator and its engineering reviewer.
  return {
    schema: 'lfea-production-caesar-parity-ci-measurement/v1',
    status: 'MEASUREMENT_CAPTURED_ENGINEERING_PARITY_UNQUALIFIED',
    authenticBM4LSourceSha256: BM4L_SHA256,
    benchmarkId: 'BM4_L',
    scopedCaesarCases: [...REQUIRED_CASES],
    explicitEditionProfileId: report.editionProfileId,
    sourceElementChains: report.sourceElementChains,
    elementActionsMeasured: report.elementActionsMeasured,
    elementActionsWithheldBecause: report.elementActionsWithheldBecause,
    thermalAuthoritySemanticHash: report.thermalIntervalAuthority.semanticHash,
    solverEvidence: report.solverEvidence,
    qualificationStatusReportedByComparator: report.qualificationStatus,
    comparedComponents,
    failedComponents,
    passRatePercent: Number((100 * (comparedComponents - failedComponents) / comparedComponents).toFixed(4)),
    overFivePercent: report.overFivePercent,
    substantialReferenceOverFivePercent: report.substantialReferenceOverFivePercent,
    perCase: rows,
    engineeringQualificationClaimed: false,
    thresholdsModifiedByThisCheck: false,
    sourceValuesModifiedByThisCheck: false,
  };
}

function main(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 2) {
    if (!['--log', '--accdb', '--out'].includes(argv[i]) || !argv[i + 1])
      throw new TypeError(`Unexpected or incomplete argument: ${argv[i]}`);
    args.set(argv[i], argv[i + 1]);
  }
  if (!args.has('--log') || !args.has('--accdb') || !args.has('--out'))
    throw new TypeError('Usage: --log <capture.log> --accdb <BM4_L.ACCDB> --out <measurement.json>');
  const accdb = resolve(args.get('--accdb'));
  assert.equal(statSync(accdb).size, BM4L_BYTES, 'BM4L_SOURCE_BYTE_LENGTH_CHANGED');
  const digest = createHash('sha256').update(readFileSync(accdb)).digest('hex');
  assert.equal(digest, BM4L_SHA256, 'BM4L_SOURCE_SHA256_CHANGED');
  const data = validateMeasurement(extractMeasurement(readFileSync(resolve(args.get('--log')), 'utf8')));
  const payload = { ...data, capturedSourceSha256: digest };
  writeFileSync(resolve(args.get('--out')), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    status: data.status, cases: data.scopedCaesarCases,
    sourceElementChains: data.sourceElementChains,
    elementActionsMeasured: data.elementActionsMeasured,
    comparedComponents: data.comparedComponents, failedComponents: data.failedComponents,
    qualificationStatusReportedByComparator: data.qualificationStatusReportedByComparator,
    engineeringQualificationClaimed: false,
  }, null, 2));
  // Produce a compact per-case CI ledger without reformatting or smoothing the
  // CAESAR comparator's real failures. Full rows remain in the artifact.
  for (const row of data.perCase) {
    console.log('BM4L_PARITY_CASE ' + JSON.stringify({
      caseId: row.caseId, compared: row.comparedComponents, failing: row.failing,
      passRatePercent: row.passRatePercent,
      byQuantity: Object.fromEntries(Object.entries(row.byQuantity)
        .filter(([, result]) => result.compared > 0)
        .map(([quantity, result]) => [quantity, {
          compared: result.compared, failing: result.failing,
        }])),
      worstRows: row.worstRows,
    }));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main(process.argv.slice(2));
