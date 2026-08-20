import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { auditHighPrMasterData, calculateStraightPipeBenchmark } from '../scripts/high-pr-master-data-numerical-audit.mjs';

const FIXTURE = path.resolve('docs/High Pr');

function copyFixture() {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'hp-master-audit-'));
  for (const name of ['benchmark_case.csv', 'cycle_spectrum.csv', 'cycle_transition.csv', 'component_qualification.csv', 'pipe_product.csv']) {
    fs.copyFileSync(path.join(FIXTURE, name), path.join(target, name));
  }
  return target;
}

function replace(file, before, after) {
  const text = fs.readFileSync(file, 'utf8');
  assert(text.includes(before), `fixture text not found: ${before}`);
  fs.writeFileSync(file, text.replace(before, after));
}

test('corrected High Pr master data passes the bounded numerical-integrity audit', () => {
  const result = auditHighPrMasterData(FIXTURE);
  assert.equal(result.ok, true);
  assert.equal(result.numericalIntegrity, 'PASS');
  assert.equal(result.sourceAuthority, 'NOT_EVALUATED_FOR_CODE_QUALIFICATION');
  assert.equal(result.numericallyBlockedQualifiedRecords.length, 0);
  assert.equal(result.benchmarks.length, 5);
  assert(result.benchmarks.every((row) => row.numericalIntegrity === 'PASS'));
});

test('independent hand calculation reproduces the corrected HP-AN-003 values', () => {
  const result = calculateStraightPipeBenchmark({
    od_mm: 168.3,
    design_p_mpa: 35,
    allowable_s_mpa: 150,
    ci_mm: 3,
    co_mm: 1,
    minus_tol_pct: 12.5,
    tnom_mm: 22.23,
    pmin_mpa: 0,
    pmax_mpa: 35,
  });
  assert.equal(result.ok, true);
  assert(Math.abs(result.t_pressure_mm - 17.512492992759825) < 1e-12);
  assert(Math.abs(result.tm_mm - 21.512492992759825) < 1e-12);
  assert(Math.abs(result.pressure_rating_mpa - 30.430487493748416) < 1e-12);
  assert(Math.abs(result.delta_sp_mpa - 209.88469463437045) < 1e-12);
  assert(Math.abs(result.salt_mpa - 104.94234731718522) < 1e-12);
});

test('independent hand calculation reproduces the corrected HP-AN-004 values and zero cycle', () => {
  const result = calculateStraightPipeBenchmark({
    od_mm: 88.9,
    design_p_mpa: 15,
    allowable_s_mpa: 120,
    ci_mm: 2,
    co_mm: 0.5,
    minus_tol_pct: 0,
    tnom_mm: 8.56,
    pmin_mpa: 15,
    pmax_mpa: 15,
  });
  assert.equal(result.ok, true);
  assert(Math.abs(result.t_pressure_mm - 5.223012680114732) < 1e-12);
  assert(Math.abs(result.tm_mm - 7.723012680114732) < 1e-12);
  assert(Math.abs(result.pressure_rating_mpa - 17.588154353664866) < 1e-12);
  assert.equal(result.delta_sp_mpa, 0);
  assert.equal(result.salt_mpa, 0);
});

test('re-admitting the stale HP-AN-003 pressure thickness fails even when status remains QUALIFIED', () => {
  const dir = copyFixture();
  replace(path.join(dir, 'benchmark_case.csv'), '""t_pressure_mm"":17.512492993', '""t_pressure_mm"":17.304383');
  const result = auditHighPrMasterData(dir);
  assert.equal(result.ok, false);
  assert(result.issues.some((issue) => issue.code === 'HP_MASTER_DATA_NUMERICAL_INCONSISTENCY' && issue.benchmarkId === 'HP-AN-003' && issue.field === 't_pressure_mm'));
  assert(result.numericallyBlockedQualifiedRecords.some((row) => row.recordId === 'HP-AN-003' && row.storedStatus === 'QUALIFIED'));
});

test('lifetime cycle arithmetic fails closed for the old TR-003 total', () => {
  const dir = copyFixture();
  replace(path.join(dir, 'cycle_transition.csv'), 'TR-003,OP-04,OP-03,PROCESS_CYCLE,500.0,12500.0', 'TR-003,OP-04,OP-03,PROCESS_CYCLE,500.0,10000.0');
  const result = auditHighPrMasterData(dir);
  const issue = result.issues.find((row) => row.code === 'HP_CYCLE_LIFETIME_COUNT_MISMATCH' && row.cycleId === 'TR-003');
  assert(issue);
  assert.equal(issue.designLifeYears, 25);
  assert.equal(issue.cyclesPerYear, 500);
  assert.equal(issue.expectedTotalCycles, 12500);
  assert.equal(issue.storedTotalCycles, 10000);
});

test('stale NPS6 qualification pressure cannot override its analytical source rating', () => {
  const dir = copyFixture();
  replace(path.join(dir, 'component_qualification.csv'), 'QUAL-PIPE-NPS6-HEAVY,COMP-PIPE-NPS6-HEAVY,1.0.0,EOL_NET,-29.0,200.0,30.430487', 'QUAL-PIPE-NPS6-HEAVY,COMP-PIPE-NPS6-HEAVY,1.0.0,EOL_NET,-29.0,200.0,30.84');
  const result = auditHighPrMasterData(dir);
  const issue = result.issues.find((row) => row.code === 'HP_COMPONENT_PRESSURE_RATING_SOURCE_MISMATCH' && row.qualificationId === 'QUAL-PIPE-NPS6-HEAVY');
  assert(issue);
  assert(Math.abs(issue.calculatedPressureRatingMpa - 30.430487493748416) < 1e-12);
  assert.equal(issue.storedPressureMaxMpa, 30.84);
  assert.equal(issue.storedStatus, 'PREQUALIFIED');
});
