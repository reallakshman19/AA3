import { readFileSync } from 'node:fs';
import {
  CalibrationBiasError,
  authorityFromReferenceCase,
  runCalibrationBiasReference,
} from './lib/lafea-uq-reference-calibration-bias.mjs';

const fixture = JSON.parse(readFileSync(
  new URL('../validation/lafea-benchmark-data/UQ/reference/UQ-REF-CALIBRATION-BIAS-01.json', import.meta.url),
  'utf8',
));

const clone = (value) => JSON.parse(JSON.stringify(value));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const nearlyEqual = (actual, expected, tolerance = 1e-12) => {
  const scale = Math.max(1, Math.abs(expected));
  return Math.abs(actual - expected) <= tolerance * scale;
};
const arrayNearlyEqual = (actual, expected, tolerance = 1e-12) => (
  Array.isArray(actual)
  && Array.isArray(expected)
  && actual.length === expected.length
  && actual.every((value, index) => nearlyEqual(value, expected[index], tolerance))
);

assert(fixture.schema === 'lafea-uq-reference-calibration-bias/v1', 'unexpected reference schema');
assert(fixture.issue === 1697, 'unexpected issue id');
assert(fixture.parentIssue === 1673, 'unexpected parent issue id');
assert(fixture.dependencyIssue === 1694, 'unexpected dependency issue id');
assert(fixture.caseId === 'UQ-REF-CALIBRATION-BIAS-01', 'unexpected case id');
assert(fixture.scope === 'REFERENCE_BENCHMARK_ONLY', 'reference scope must remain isolated');
assert(fixture.universalCalibrationAcceptanceThreshold === null, 'universal calibration threshold must remain undefined');
assert(fixture.productionApplicabilityBlocker === 'ENGINEERING_POPULATION_APPLICABILITY_REQUIRED', 'production applicability blocker changed');
assert(fixture.oracle.rmseReductionIsAcceptanceCriterion === false, 'RMSE reduction must not become a universal acceptance criterion');

const authority = authorityFromReferenceCase(fixture);
const baseInput = () => ({
  pairs: clone(fixture.pairs),
  plan: clone(fixture.plan),
  authority: clone(authority),
});

const positive = runCalibrationBiasReference(baseInput());
const oracle = fixture.oracle;
assert(positive.unit === fixture.plan.unit, 'unit mismatch');
assert(JSON.stringify(positive.canonicalPairIds) === JSON.stringify(fixture.plan.requiredPairIds), 'canonical pair order mismatch');
assert(arrayNearlyEqual(positive.ratios, oracle.ratios), 'ratio oracle mismatch');
assert(nearlyEqual(positive.biasFactor, oracle.biasFactor), 'bias-factor oracle mismatch');
assert(nearlyEqual(positive.selectedSampleRatioStandardDeviation, oracle.selectedSampleRatioStandardDeviation), 'selected sample-scatter oracle mismatch');
assert(nearlyEqual(positive.populationRatioStandardDeviationCrosscheck, oracle.populationRatioStandardDeviationCrosscheck), 'population-scatter cross-check mismatch');
assert(arrayNearlyEqual(positive.calibratedModelValues, oracle.calibratedModelValues), 'calibrated-model oracle mismatch');
assert(arrayNearlyEqual(positive.rawResiduals, oracle.rawResiduals), 'raw-residual oracle mismatch');
assert(arrayNearlyEqual(positive.calibratedResiduals, oracle.calibratedResiduals), 'calibrated-residual oracle mismatch');
assert(nearlyEqual(positive.rawResidualRmse, oracle.rawResidualRmse), 'raw-RMSE oracle mismatch');
assert(nearlyEqual(positive.calibratedResidualRmse, oracle.calibratedResidualRmse), 'calibrated-RMSE oracle mismatch');
assert(positive.calibratedResidualRmse < positive.rawResidualRmse, 'frozen reference RMSE reduction observable changed');
assert(positive.ratioOrientation === 'TEST_OVER_MODEL', 'ratio orientation changed');
assert(positive.biasEstimator === 'ARITHMETIC_MEAN_OF_PAIR_RATIOS', 'bias estimator changed');
assert(positive.scatterConvention === 'SAMPLE_STANDARD_DEVIATION_N_MINUS_1', 'scatter convention changed');
assert(positive.scatterDenominator === 'N_MINUS_1', 'scatter denominator changed');
assert(positive.residualSign === 'TEST_MINUS_CALIBRATED_MODEL', 'residual sign changed');

const permutedInput = baseInput();
permutedInput.pairs.reverse();
const permuted = runCalibrationBiasReference(permutedInput);
assert(JSON.stringify(permuted) === JSON.stringify(positive), 'consistent semantic pair permutation must be exact');

const expectFailure = (label, mutator, expectedCode) => {
  const candidate = baseInput();
  mutator(candidate);
  try {
    runCalibrationBiasReference(candidate);
  } catch (error) {
    assert(error instanceof CalibrationBiasError, `${label}: expected CalibrationBiasError`);
    assert(error.code === expectedCode, `${label}: expected ${expectedCode}, received ${error.code}`);
    assert(typeof error.path === 'string' && error.path.startsWith('$.'), `${label}: structured path missing`);
    return { label, code: error.code, path: error.path };
  }
  throw new Error(`${label}: expected fail-closed rejection`);
};

const negativeCases = [
  expectFailure('duplicate-pair-id', (x) => { x.pairs[1].id = 'P1'; }, 'DUPLICATE_PAIR_ID'),
  expectFailure('missing-pair-id', (x) => { x.pairs.pop(); }, 'MISSING_PAIR_ID'),
  expectFailure('inconsistent-pair-binding', (x) => { x.pairs[0].test = clone(x.pairs[1].test); }, 'PAIR_BINDING_MISMATCH'),
  expectFailure('unit-mismatch', (x) => { x.pairs[0].test.unit = 'OTHER_QOI'; }, 'UNIT_MISMATCH'),
  expectFailure('zero-model-denominator', (x) => { x.pairs[0].model.value = 0; }, 'ZERO_MODEL_DENOMINATOR'),
  expectFailure('nonfinite-model-value', (x) => { x.pairs[0].model.value = Number.POSITIVE_INFINITY; }, 'NON_FINITE_NUMBER'),
  expectFailure('nonfinite-test-value', (x) => { x.pairs[0].test.value = Number.NaN; }, 'NON_FINITE_NUMBER'),
  expectFailure('unsupported-ratio-orientation', (x) => { x.plan.ratioOrientation = 'MODEL_OVER_TEST'; }, 'UNSUPPORTED_RATIO_ORIENTATION'),
  expectFailure('unsupported-bias-estimator', (x) => { x.plan.biasEstimator = 'RATIO_OF_MEANS'; }, 'UNSUPPORTED_BIAS_ESTIMATOR'),
  expectFailure('unsupported-scatter-convention', (x) => { x.plan.scatterConvention = 'POPULATION_STANDARD_DEVIATION_N'; }, 'UNSUPPORTED_SCATTER_CONVENTION'),
  expectFailure('insufficient-sample-count', (x) => { x.pairs = [x.pairs[0]]; }, 'INSUFFICIENT_SAMPLE_COUNT'),
  expectFailure('duplicate-provenance', (x) => { x.pairs[1].model.provenance = x.pairs[0].model.provenance; }, 'DUPLICATE_PROVENANCE'),
  expectFailure('missing-provenance', (x) => { x.pairs[0].model.provenance = ''; }, 'MISSING_STRING'),
  expectFailure('scatter-denominator-mismatch', (x) => { x.plan.scatterDenominator = 'N'; }, 'SCATTER_DENOMINATOR_MISMATCH'),
  expectFailure('reference-authority-missing', (x) => { x.authority.referenceCalibrationBiasExecutionAuthorized = false; }, 'REFERENCE_AUTHORITY_REQUIRED'),
  expectFailure('production-calibration-authority-leak', (x) => { x.authority.productionCalibrationFactorAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-statistical-authority-leak', (x) => { x.authority.productionStatisticalExecutionAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-source-authority-leak', (x) => { x.authority.activeProductionNumericStochasticSourceCount = 1; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-sensitivity-authority-leak', (x) => { x.authority.productionSensitivityAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-validation-authority-leak', (x) => { x.authority.productionValidationAcceptanceAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-reliability-target-leak', (x) => { x.authority.productionReliabilityTargetAuthority = 'SYNTHETIC_TARGET'; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('b03-authority-leak', (x) => { x.authority.b03ActivationAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('release-authority-leak', (x) => { x.authority.programReleaseAuthority = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('temperature-authority-leak', (x) => { x.authority.programTemperatureAuthority = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
];

assert(negativeCases.length === fixture.negativeCaseCount, 'negative-case count mismatch');
assert(fixture.referenceCalibrationBiasExecutionAuthorized === true, 'reference calibration execution authority must be true');
assert(fixture.productionCalibrationFactorAuthorized === false, 'production calibration factor must remain unauthorized');
assert(fixture.productionStatisticalExecutionAuthorized === false, 'production statistical execution must remain false');
assert(fixture.activeProductionNumericStochasticSourceCount === 0, 'production stochastic-source count must remain zero');
assert(fixture.productionSensitivityAuthorized === false, 'production sensitivity must remain false');
assert(fixture.productionValidationAcceptanceAuthorized === false, 'production validation acceptance must remain false');
assert(fixture.productionReliabilityTargetAuthority === 'NONE', 'production reliability-target authority must remain NONE');
assert(fixture.b03ActivationAuthorized === false, 'B03 activation must remain false');
assert(fixture.programReleaseAuthority === false, 'release authority must remain false');
assert(fixture.programTemperatureAuthority === false, 'temperature authority must remain false');

const output = {
  schema: 'lafea-uq-reference-calibration-bias-check/v1',
  issue: fixture.issue,
  parentIssue: fixture.parentIssue,
  dependencyIssue: fixture.dependencyIssue,
  caseId: fixture.caseId,
  status: 'PASS',
  referenceCalibrationBiasQualified: true,
  referenceCalibrationBiasExecutionAuthorized: true,
  productionCalibrationFactorAuthorized: false,
  productionStatisticalExecutionAuthorized: false,
  activeProductionNumericStochasticSourceCount: 0,
  productionSensitivityAuthorized: false,
  productionValidationAcceptanceAuthorized: false,
  productionReliabilityTargetAuthority: 'NONE',
  analyticalOracle: {
    ratios: positive.ratios,
    biasFactor: positive.biasFactor,
    selectedSampleRatioStandardDeviation: positive.selectedSampleRatioStandardDeviation,
    populationRatioStandardDeviationCrosscheck: positive.populationRatioStandardDeviationCrosscheck,
    calibratedModelValues: positive.calibratedModelValues,
    rawResiduals: positive.rawResiduals,
    calibratedResiduals: positive.calibratedResiduals,
    rawResidualRmse: positive.rawResidualRmse,
    calibratedResidualRmse: positive.calibratedResidualRmse,
  },
  consistentPairPermutationExact: true,
  rmseReductionObservedReferenceOnly: true,
  negativeCaseCount: negativeCases.length,
  calibrationBiasPlanFailClosedQualified: true,
  universalCalibrationAcceptanceThreshold: null,
  productionApplicabilityBlocker: fixture.productionApplicabilityBlocker,
  nextBoundary: fixture.nextBoundary,
};

process.stdout.write(`${JSON.stringify(output)}\n`);
