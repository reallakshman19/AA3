#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HP_NUMERICAL_AUDIT_SCHEMA = 'high-pr-master-data-numerical-audit/v1';
export const HP_NUMERICAL_AUTHORITY = 'ARITHMETIC_AND_CROSS_TABLE_INTEGRITY_ONLY_NOT_CODE_QUALIFICATION';

const REQUIRED_FILES = Object.freeze([
  'benchmark_case.csv',
  'cycle_spectrum.csv',
  'cycle_transition.csv',
  'component_qualification.csv',
  'pipe_product.csv',
]);

function text(value) {
  return String(value ?? '').trim();
}

function number(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function close(actual, expected, toleranceType = 'RELATIVE', toleranceValue = 1e-9) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
  if (toleranceType === 'EXACT') return Object.is(actual, expected) || actual === expected;
  const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
  return Math.abs(actual - expected) <= Number(toleranceValue) * scale;
}

export function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    if (row.some((cell) => cell.length > 0)) rows.push(row);
    row = [];
  };

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    if (quoted) {
      if (char === '"' && csvText[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      pushField();
    } else if (char === '\n') {
      pushField();
      pushRow();
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field.length || row.length) {
    pushField();
    pushRow();
  }
  if (!rows.length) return [];
  const headers = rows[0].map(text);
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])));
}

function readCsv(directory, name) {
  const file = path.join(directory, name);
  if (!fs.existsSync(file)) throw new Error(`Required High Pr master-data file missing: ${name}`);
  return parseCsv(fs.readFileSync(file, 'utf8'));
}

function parseJsonCell(row, field, issues, id) {
  try {
    return JSON.parse(row[field] || '{}');
  } catch (error) {
    issues.push({
      code: 'HP_MASTER_JSON_PARSE_FAILED',
      recordId: id,
      field,
      message: error.message,
    });
    return {};
  }
}

export function calculateStraightPipeBenchmark(inputs) {
  const D = number(inputs.od_mm);
  const P = number(inputs.design_p_mpa);
  const S = number(inputs.allowable_s_mpa);
  const ci = number(inputs.ci_mm);
  const co = number(inputs.co_mm);
  const tol = number(inputs.minus_tol_pct);
  const tnom = number(inputs.tnom_mm);
  const pmin = number(inputs.pmin_mpa);
  const pmax = number(inputs.pmax_mpa);

  const required = { D, P, S, ci, co, tol, tnom, pmin, pmax };
  const missing = Object.entries(required).filter(([, value]) => value === null).map(([key]) => key);
  if (missing.length) return { ok: false, code: 'HP_ANALYTICAL_INPUT_INCOMPLETE', missing };
  if (!(D > 0) || !(S > 0) || !(tnom > 0) || !(tol >= 0 && tol < 100) || pmax < pmin) {
    return { ok: false, code: 'HP_ANALYTICAL_INPUT_INVALID' };
  }

  const tPressure = (D / 2) * (1 - Math.exp(-P / S));
  const tm = tPressure + ci + co;
  const tMinM = tnom * (1 - tol / 100);
  const tEff = tMinM - ci - co;
  if (!(tEff > 0) || !(D > 2 * tEff)) return { ok: false, code: 'HP_EFFECTIVE_WALL_INVALID' };

  const Y = D / (D - 2 * tEff);
  const pressureRating = S * Math.log(Y);
  const stressState = (pressure) => {
    const y2 = Y ** 2;
    const denominator = y2 - 1;
    return {
      pressure_mpa: pressure,
      sigma_hoop_mpa: pressure * (y2 + 1) / denominator,
      sigma_axial_mpa: pressure / denominator,
      sigma_radial_mpa: -pressure,
      stress_intensity_mpa: pressure * 2 * y2 / denominator,
    };
  };
  const minState = stressState(pmin);
  const maxState = stressState(pmax);
  const deltaSp = maxState.stress_intensity_mpa - minState.stress_intensity_mpa;

  return {
    ok: true,
    t_pressure_mm: tPressure,
    tm_mm: tm,
    t_min_m_mm: tMinM,
    t_eff_mm: tEff,
    diameter_ratio_y: Y,
    pressure_rating_mpa: pressureRating,
    sp_min_mpa: minState.stress_intensity_mpa,
    sp_max_mpa: maxState.stress_intensity_mpa,
    delta_sp_mpa: deltaSp,
    salt_mpa: deltaSp / 2,
    sigma_axial_mpa: maxState.sigma_axial_mpa,
    sigma_hoop_mpa: maxState.sigma_hoop_mpa,
    sigma_radial_mpa: maxState.sigma_radial_mpa,
  };
}

function sourceAuthority(row) {
  if (text(row.source_id) === 'SRC-TEST-SYNTH') return 'DEVELOPMENT_EVIDENCE_ONLY';
  return 'SOURCE_AUTHORITY_NOT_EVALUATED_BY_THIS_AUDITOR';
}

function compareStoredValues({ row, expectedIntermediates, expectedResult, calculated, issues }) {
  const toleranceType = text(row.tolerance_type) || 'RELATIVE';
  const toleranceValue = number(row.tolerance_value) ?? 0;
  const stored = { ...expectedIntermediates, ...expectedResult };
  const fields = [
    't_pressure_mm',
    'tm_mm',
    't_min_m_mm',
    't_eff_mm',
    'sp_min_mpa',
    'sp_max_mpa',
    'delta_sp_mpa',
    'salt_mpa',
    'sigma_axial_mpa',
    'sigma_hoop_mpa',
    'sigma_radial_mpa',
    'pressure_rating_mpa',
  ];
  const comparisons = [];
  for (const field of fields) {
    if (!Object.hasOwn(stored, field)) continue;
    const storedValue = number(stored[field]);
    const calculatedValue = number(calculated[field]);
    const pass = close(storedValue, calculatedValue, toleranceType, toleranceValue);
    comparisons.push({ field, stored: storedValue, calculated: calculatedValue, pass });
    if (!pass) {
      issues.push({
        code: 'HP_MASTER_DATA_NUMERICAL_INCONSISTENCY',
        benchmarkId: row.benchmark_id,
        field,
        stored: storedValue,
        calculated: calculatedValue,
        absoluteDelta: storedValue === null || calculatedValue === null ? null : storedValue - calculatedValue,
        relativeDelta: storedValue === null || calculatedValue === null || calculatedValue === 0 ? null : (storedValue - calculatedValue) / calculatedValue,
        storedStatus: row.status,
      });
    }
  }
  return comparisons;
}

function benchmarkAudit(rows, issues) {
  const results = [];
  for (const row of rows) {
    const inputs = parseJsonCell(row, 'inputs_json', issues, row.benchmark_id);
    const requiredInputKeys = ['od_mm', 'design_p_mpa', 'allowable_s_mpa', 'ci_mm', 'co_mm', 'minus_tol_pct', 'tnom_mm', 'pmin_mpa', 'pmax_mpa'];
    if (!requiredInputKeys.every((key) => Object.hasOwn(inputs, key))) continue;
    const expectedIntermediates = parseJsonCell(row, 'expected_intermediates_json', issues, row.benchmark_id);
    const expectedResult = parseJsonCell(row, 'expected_result_json', issues, row.benchmark_id);
    const calculated = calculateStraightPipeBenchmark(inputs);
    if (!calculated.ok) {
      issues.push({ code: calculated.code, benchmarkId: row.benchmark_id, missing: calculated.missing ?? [] });
      results.push({ benchmarkId: row.benchmark_id, numericalIntegrity: 'BLOCKED', sourceAuthority: sourceAuthority(row), calculated });
      continue;
    }
    const comparisons = compareStoredValues({ row, expectedIntermediates, expectedResult, calculated, issues });
    const pass = comparisons.every((comparison) => comparison.pass);
    results.push({
      benchmarkId: row.benchmark_id,
      numericalIntegrity: pass ? 'PASS' : 'BLOCKED_NUMERICAL_EVIDENCE',
      sourceAuthority: sourceAuthority(row),
      storedStatus: row.status,
      calculated,
      comparisons,
    });
  }
  return results;
}

function cycleAudit(spectra, transitions, issues) {
  const lifeBySpectrum = new Map(spectra.map((row) => [text(row.spectrum_id), number(row.design_life_years)]));
  return transitions.map((row) => {
    const life = lifeBySpectrum.get(text(row.spectrum_id));
    const rate = number(row.cycles_per_year);
    const stored = number(row.total_cycles);
    if (life === undefined || life === null) {
      issues.push({ code: 'HP_CYCLE_SPECTRUM_NOT_FOUND', spectrumId: row.spectrum_id, cycleId: row.cycle_id });
      return { spectrumId: row.spectrum_id, cycleId: row.cycle_id, pass: false };
    }
    if (rate === null || stored === null) {
      issues.push({ code: 'HP_CYCLE_COUNT_INVALID', spectrumId: row.spectrum_id, cycleId: row.cycle_id });
      return { spectrumId: row.spectrum_id, cycleId: row.cycle_id, pass: false };
    }
    const expected = rate * life;
    const pass = close(stored, expected, 'RELATIVE', 1e-12);
    if (!pass) {
      issues.push({
        code: 'HP_CYCLE_LIFETIME_COUNT_MISMATCH',
        spectrumId: row.spectrum_id,
        cycleId: row.cycle_id,
        designLifeYears: life,
        cyclesPerYear: rate,
        storedTotalCycles: stored,
        expectedTotalCycles: expected,
        storedStatus: row.status,
      });
    }
    return { spectrumId: row.spectrum_id, cycleId: row.cycle_id, pass, designLifeYears: life, cyclesPerYear: rate, storedTotalCycles: stored, expectedTotalCycles: expected };
  });
}

function productQualificationKey(productId) {
  const match = text(productId).match(/NPS[0-9.]+(?:-[A-Z0-9.]+)+/i);
  if (!match) return null;
  return match[0].replace(/-\d+(?:\.\d+)?$/u, '').toUpperCase();
}

function qualificationKey(qualificationId) {
  const match = text(qualificationId).match(/NPS[0-9.]+(?:-[A-Z0-9.]+)+/i);
  return match ? match[0].toUpperCase() : null;
}

function componentPropagationAudit(products, qualifications, benchmarkResults, issues) {
  const benchmarkById = new Map(benchmarkResults.map((row) => [row.benchmarkId, row]));
  const candidates = [];
  for (const product of products) {
    const locatorMatch = text(product.source_locator).match(/^(HP-AN-\d+)\s+Spec$/u);
    if (!locatorMatch) continue;
    const benchmark = benchmarkById.get(locatorMatch[1]);
    if (!benchmark?.calculated?.ok) continue;
    const key = productQualificationKey(product.product_id);
    if (!key) continue;
    const matches = qualifications.filter((row) => qualificationKey(row.qualification_id) === key);
    for (const qualification of matches) {
      const stored = number(qualification.pressure_max_mpa);
      const calculated = benchmark.calculated.pressure_rating_mpa;
      const pass = close(stored, calculated, 'RELATIVE', 5e-5);
      const result = {
        benchmarkId: benchmark.benchmarkId,
        productId: product.product_id,
        qualificationId: qualification.qualification_id,
        storedPressureMaxMpa: stored,
        calculatedPressureRatingMpa: calculated,
        pass,
      };
      candidates.push(result);
      if (!pass) {
        issues.push({
          code: 'HP_COMPONENT_PRESSURE_RATING_SOURCE_MISMATCH',
          ...result,
          storedStatus: qualification.status,
        });
      }
    }
  }
  return candidates;
}

export function auditHighPrMasterData(directory) {
  const tables = Object.fromEntries(REQUIRED_FILES.map((name) => [name, readCsv(directory, name)]));
  const issues = [];
  const benchmarks = benchmarkAudit(tables['benchmark_case.csv'], issues);
  const cycles = cycleAudit(tables['cycle_spectrum.csv'], tables['cycle_transition.csv'], issues);
  const componentPropagation = componentPropagationAudit(
    tables['pipe_product.csv'],
    tables['component_qualification.csv'],
    benchmarks,
    issues,
  );
  const numericallyBlockedQualifiedRecords = issues
    .filter((issue) => /^HP_(?:MASTER_DATA_NUMERICAL_INCONSISTENCY|CYCLE_LIFETIME_COUNT_MISMATCH|COMPONENT_PRESSURE_RATING_SOURCE_MISMATCH)$/u.test(issue.code))
    .filter((issue) => ['QUALIFIED', 'APPROVED', 'PREQUALIFIED'].includes(text(issue.storedStatus)))
    .map((issue) => ({ code: issue.code, recordId: issue.benchmarkId ?? issue.cycleId ?? issue.qualificationId, storedStatus: issue.storedStatus }));

  return {
    schema: HP_NUMERICAL_AUDIT_SCHEMA,
    ok: issues.length === 0,
    authority: HP_NUMERICAL_AUTHORITY,
    numericalIntegrity: issues.length === 0 ? 'PASS' : 'BLOCKED',
    sourceAuthority: 'NOT_EVALUATED_FOR_CODE_QUALIFICATION',
    benchmarks,
    cycles,
    componentPropagation,
    numericallyBlockedQualifiedRecords,
    issues,
  };
}

function main() {
  const directory = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve('docs/High Pr');
  try {
    const result = auditHighPrMasterData(directory);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 2;
  } catch (error) {
    console.error(JSON.stringify({ ok: false, code: 'HP_MASTER_DATA_AUDIT_FAILED', message: error.message }, null, 2));
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath && invokedPath === fileURLToPath(import.meta.url)) main();
