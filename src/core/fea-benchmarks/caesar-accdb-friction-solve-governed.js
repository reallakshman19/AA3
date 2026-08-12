/**
 * Governed public boundary for M047 CAESAR ACCDB friction qualification.
 *
 * The nonlinear mechanics remain in caesar-accdb-friction-solve.js. This layer
 * validates case semantics that must be true before those mechanics are invoked,
 * particularly the L1 hydrotest mapping used to reuse the frozen W/P1 assembly.
 */
import { deepFreeze } from '../shared-piping-model/immutable.js';
import {
  CAESAR_ACCDB_FRICTION_SOLVER_PROFILE,
  solveCaesarAccdbFrictionBenchmark as solveRawCaesarAccdbFrictionBenchmark,
} from './caesar-accdb-friction-solve.js';

export { CAESAR_ACCDB_FRICTION_SOLVER_PROFILE };

export const CAESAR_ACCDB_HYDROTEST_AUTHORITY_SCHEMA =
  'caesar-accdb-hydrotest-qualification-authority/v1';

/**
 * Resolve the exact governed L1 hydrotest interpretation used by Stage 2.
 *
 * The source case must remain the pinned CAESAR HYD case `WW+HP`. The frozen
 * linear mechanics understand W/P1 primitives, so the nonlinear adapter may use
 * a counterfactual zero-friction W+P1 base only after this authority gate passes.
 * Stored L1 ACCDB output remains the comparison authority.
 */
export function resolveCaesarHydrotestQualificationAuthority(benchmarkPackage) {
  requireBenchmarkPackage(benchmarkPackage);
  const sourceCase = benchmarkPackage.cases.find((entry) => entry.caseId === 'L1');
  if (!sourceCase) {
    throw hydrotestError('BM4_L Stage 2 requires selected case L1.', 'CAESAR_ACCDB_HYDROTEST_CASE_MISSING');
  }
  const caseClass = String(sourceCase.caseClass ?? '').trim().toUpperCase();
  const formula = String(sourceCase.formula ?? '').replace(/\s+/gu, '').toUpperCase();
  if (caseClass !== 'HYD' || formula !== 'WW+HP') {
    throw hydrotestError(
      `L1 hydrotest qualification requires exact HYD WW+HP; got ${String(sourceCase.caseClass)} ${String(sourceCase.formula)}.`,
      'CAESAR_ACCDB_HYDROTEST_CASE_UNQUALIFIED',
    );
  }
  return deepFreeze({
    schema: CAESAR_ACCDB_HYDROTEST_AUTHORITY_SCHEMA,
    caseId: 'L1',
    sourceCaseClass: caseClass,
    sourceFormula: formula,
    weightTerm: 'WW',
    weightAuthority: 'CAESAR_WW_MEANS_PIPE_PLUS_WATER_AS_FLUID',
    waterDensityKgPerM3: 1000,
    waterDensityKgPerCm3: 0.001,
    waterDensityRule: 'WW_WATER_FILLED_LOAD_BASIS',
    insulationIncluded: false,
    insulationAuthority: 'CAESAR_INCLUDE_INSULATION_IN_HYDROTEST_DEFAULT_FALSE',
    pressureTerm: 'HP',
    pressureField: 'HYDRO_PRESSURE',
    pressureAuthority: 'CAESAR_HP_MEANS_HYDROSTATIC_TEST_PRESSURE',
    frozenPrimitiveFormula: 'W+P1',
    transformationRule: 'WW_TO_W_WITH_WATER_FLUID_DENSITY_AND_HP_HYDRO_PRESSURE_TO_P1_PRESSURE1',
    benchmarkReferenceRule: 'STORED_ACCDB_L1_OUTPUT_REMAINS_THE_ONLY_BENCHMARK_REFERENCE',
    counterfactualBaseRule: 'ZERO_FRICTION_BASE_IS_ASSEMBLY_INPUT_ONLY_NOT_CAESAR_REFERENCE_AUTHORITY',
  });
}

/** Public governed nonlinear friction solver. */
export function solveCaesarAccdbFrictionBenchmark(benchmarkPackage, selectedCaseIds, options = {}) {
  requireBenchmarkPackage(benchmarkPackage);
  const requested = selectedCaseIds === undefined
    ? ['L13', 'L7', 'L15', 'L1']
    : selectedCaseIds.map(String);
  if (requested.includes('L1')) resolveCaesarHydrotestQualificationAuthority(benchmarkPackage);
  return solveRawCaesarAccdbFrictionBenchmark(benchmarkPackage, requested, options);
}

function requireBenchmarkPackage(value) {
  if (!value || value.schema !== 'caesar-accdb-benchmark-package/v1') {
    throw new TypeError('A canonical CAESAR ACCDB benchmark package is required.');
  }
}

function hydrotestError(message, code) {
  const error = new TypeError(message);
  error.code = code;
  return error;
}
