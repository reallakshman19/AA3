import { readFileSync } from 'node:fs';
import {
  CalibrationHoldoutError,
  authorityFromReferenceCase,
  runCalibrationHoldoutReference,
} from './lib/lafea-uq-reference-calibration-holdout.mjs';

const fixture = JSON.parse(readFileSync(
  new URL('../validation/lafea-benchmark-data/UQ/reference/UQ-REF-CALIBRATION-HOLDOUT-01.json', import.meta.url),
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
const arrayNearlyEqual = (actual, expected, label) => {
  assert(Array.isArray(actual) && actual.length === expected.length, `${label}: length mismatch`);
  actual.forEach((value, index) => assert(nearlyEqual(value, expected[index]), `${label}[${index}] mismatch`));
};

assert(fixture.schema === 'lafea-uq-reference-calibration-holdout/v1', 'unexpected reference schema');
assert(fixture.issue === 1699, 'unexpected issue id');
assert(fixture.parentIssue === 1673, 'unexpected parent issue id');
assert(fixture.dependencyIssue === 1697, 'unexpected dependency issue id');
assert(fixture.caseId === 'UQ-REF-CALIBRATION-HOLDOUT-01', 'unexpected case id');
assert(fixture.scope === 'REFERENCE_BENCHMARK_ONLY', 'reference scope must remain isolated');
assert(fixture.universalHoldoutAcceptanceThreshold === null, 'universal holdout threshold must remain undefined');
assert(fixture.productionApplicabilityBlocker === 'ENGINEERING_POPULATION_APPLICABILITY_REQUIRED', 'production applicability blocker changed');

const authority = authorityFromReferenceCase(fixture);
const baseInput = () => ({
  calibrationPairs: clone(fixture.calibrationPairs),
  holdoutPairs: clone(fixture.holdoutPairs),
  plan: clone(fixture.plan),
  authority: clone(authority),
});

const positive = runCalibrationHoldoutReference(baseInput());
const oracle = fixture.oracle;
arrayNearlyEqual(positive.calibrationRatios, oracle.calibrationRatios, 'calibration ratios');
assert(nearlyEqual(positive.calibrationBiasFactor, oracle.calibrationBiasFactor), 'calibration bias-factor oracle mismatch');
arrayNearlyEqual(positive.holdoutRatios, oracle.holdoutRatios, 'holdout ratios');
assert(nearlyEqual(positive.holdoutRatioMeanPostHocOnly, oracle.holdoutRatioMeanPostHocOnly), 'post-hoc holdout ratio mean mismatch');
arrayNearlyEqual(positive.calibratedHoldoutModelValues, oracle.calibratedHoldoutModelValues, 'calibrated holdout model');
arrayNearlyEqual(positive.rawHoldoutResiduals, oracle.rawHoldoutResiduals, 'raw holdout residuals');
arrayNearlyEqual(positive.calibratedHoldoutResiduals, oracle.calibratedHoldoutResiduals, 'calibrated holdout residuals');
assert(nearlyEqual(positive.rawHoldoutMeanSignedResidual, oracle.rawHoldoutMeanSignedResidual), 'raw holdout mean residual mismatch');
assert(nearlyEqual(positive.calibratedHoldoutMeanSignedResidual, oracle.calibratedHoldoutMeanSignedResidual), 'calibrated holdout mean residual mismatch');
assert(nearlyEqual(positive.rawHoldoutRmse, oracle.rawHoldoutRmse), 'raw holdout RMSE mismatch');
assert(nearlyEqual(positive.calibratedHoldoutRmse, oracle.calibratedHoldoutRmse), 'calibrated holdout RMSE mismatch');
assert(nearlyEqual(positive.calibratedToRawRmseRatio, oracle.calibratedToRawRmseRatio), 'holdout RMSE ratio mismatch');
assert(positive.factorSource === 'CALIBRATION_SPLIT_ONLY', 'factor source changed');
assert(positive.holdoutRefitAuthorized === false, 'holdout refit must remain forbidden');
assert(Math.abs(positive.holdoutRatioMeanPostHocOnly - positive.calibrationBiasFactor) > 1e-6, 'post-hoc holdout ratio mean must not silently replace calibration factor');

const permutedInput = baseInput();
permutedInput.calibrationPairs.reverse();
permutedInput.holdoutPairs.reverse();
const permuted = runCalibrationHoldoutReference(permutedInput);
assert(JSON.stringify(permuted) === JSON.stringify(positive), 'consistent within-split permutation must be exact');

const holdoutPerturbedInput = baseInput();
holdoutPerturbedInput.holdoutPairs[0].test.value += 1;
const holdoutPerturbed = runCalibrationHoldoutReference(holdoutPerturbedInput);
assert(holdoutPerturbed.calibrationBiasFactor === positive.calibrationBiasFactor, 'holdout perturbation must not change calibration factor');
assert(!nearlyEqual(holdoutPerturbed.calibratedHoldoutRmse, positive.calibratedHoldoutRmse), 'holdout perturbation must change held-out metrics');

const calibrationPerturbedInput = baseInput();
calibrationPerturbedInput.calibrationPairs[0].test.value += 1;
const calibrationPerturbed = runCalibrationHoldoutReference(calibrationPerturbedInput);
assert(!nearlyEqual(calibrationPerturbed.calibrationBiasFactor, positive.calibrationBiasFactor), 'calibration perturbation must change calibration factor');
assert(!nearlyEqual(calibrationPerturbed.calibratedHoldoutModelValues[0], positive.calibratedHoldoutModelValues[0]), 'calibration perturbation must propagate to holdout prediction');

const expectFailure = (label, mutator, expectedCode) => {
  const candidate = baseInput();
  mutator(candidate);
  try {
    runCalibrationHoldoutReference(candidate);
  } catch (error) {
    assert(error instanceof CalibrationHoldoutError, `${label}: expected CalibrationHoldoutError`);
    assert(error.code === expectedCode, `${label}: expected ${expectedCode}, received ${error.code}`);
    assert(typeof error.path === 'string' && error.path.startsWith('$.'), `${label}: structured path missing`);
    return { label, code: error.code, path: error.path };
  }
  throw new Error(`${label}: expected fail-closed rejection`);
};

const negativeCases = [
  expectFailure('split-id-overlap', (x) => { x.plan.holdoutRequiredPairIds[0] = 'P1'; }, 'SPLIT_ID_OVERLAP'),
  expectFailure('duplicate-calibration-required-id', (x) => { x.plan.calibrationRequiredPairIds[1] = 'P1'; }, 'DUPLICATE_REQUIRED_PAIR_ID'),
  expectFailure('duplicate-calibration-pair-id', (x) => { x.calibrationPairs[1].id = 'P1'; }, 'DUPLICATE_PAIR_ID'),
  expectFailure('missing-calibration-pair-id', (x) => { x.calibrationPairs.pop(); }, 'MISSING_PAIR_ID'),
  expectFailure('duplicate-holdout-pair-id', (x) => { x.holdoutPairs[1].id = 'H1'; }, 'DUPLICATE_PAIR_ID'),
  expectFailure('missing-holdout-pair-id', (x) => { x.holdoutPairs.pop(); }, 'MISSING_PAIR_ID'),
  expectFailure('cross-split-provenance-reuse', (x) => { x.holdoutPairs[0].model.provenance = x.calibrationPairs[0].model.provenance; }, 'DUPLICATE_PROVENANCE'),
  expectFailure('calibration-split-label-mismatch', (x) => { x.calibrationPairs[0].split = 'HOLDOUT'; }, 'SPLIT_LABEL_MISMATCH'),
  expectFailure('holdout-split-label-mismatch', (x) => { x.holdoutPairs[0].split = 'CALIBRATION'; }, 'SPLIT_LABEL_MISMATCH'),
  expectFailure('holdout-to-calibration-migration', (x) => { x.calibrationPairs[0] = clone(x.holdoutPairs[0]); }, 'SPLIT_MEMBERSHIP_MISMATCH'),
  expectFailure('calibration-to-holdout-migration', (x) => { x.holdoutPairs[0] = clone(x.calibrationPairs[0]); }, 'SPLIT_MEMBERSHIP_MISMATCH'),
  expectFailure('calibration-unit-mismatch', (x) => { x.calibrationPairs[0].test.unit = 'OTHER_QOI'; }, 'UNIT_MISMATCH'),
  expectFailure('holdout-unit-mismatch', (x) => { x.holdoutPairs[0].model.unit = 'OTHER_QOI'; }, 'UNIT_MISMATCH'),
  expectFailure('zero-calibration-model', (x) => { x.calibrationPairs[0].model.value = 0; }, 'ZERO_MODEL_DENOMINATOR'),
  expectFailure('zero-holdout-model', (x) => { x.holdoutPairs[0].model.value = 0; }, 'ZERO_MODEL_DENOMINATOR'),
  expectFailure('nonfinite-calibration-model', (x) => { x.calibrationPairs[0].model.value = Number.NaN; }, 'NON_FINITE_NUMBER'),
  expectFailure('nonfinite-holdout-test', (x) => { x.holdoutPairs[0].test.value = Number.POSITIVE_INFINITY; }, 'NON_FINITE_NUMBER'),
  expectFailure('unsupported-ratio-orientation', (x) => { x.plan.ratioOrientation = 'MODEL_OVER_TEST'; }, 'UNSUPPORTED_RATIO_ORIENTATION'),
  expectFailure('unsupported-bias-estimator', (x) => { x.plan.biasEstimator = 'RATIO_OF_MEANS'; }, 'UNSUPPORTED_BIAS_ESTIMATOR'),
  expectFailure('unsupported-raw-residual-sign', (x) => { x.plan.rawResidualSign = 'MODEL_MINUS_TEST'; }, 'UNSUPPORTED_RESIDUAL_SIGN'),
  expectFailure('unsupported-holdout-residual-sign', (x) => { x.plan.holdoutResidualSign = 'CALIBRATED_MODEL_MINUS_TEST'; }, 'UNSUPPORTED_RESIDUAL_SIGN'),
  expectFailure('unsupported-rmse-convention', (x) => { x.plan.rmseConvention = 'ROOT_SUM_SQUARE'; }, 'UNSUPPORTED_RMSE_CONVENTION'),
  expectFailure('illegal-holdout-refit', (x) => { x.plan.holdoutRefitAuthorized = true; }, 'HOLDOUT_REFIT_FORBIDDEN'),
  expectFailure('invalid-factor-source', (x) => { x.plan.factorSource = 'CALIBRATION_PLUS_HOLDOUT'; }, 'INVALID_FACTOR_SOURCE'),
  expectFailure('reference-authority-missing', (x) => { x.authority.referenceCalibrationHoldoutExecutionAuthorized = false; }, 'REFERENCE_AUTHORITY_REQUIRED'),
  expectFailure('production-calibration-factor-leak', (x) => { x.authority.productionCalibrationFactorAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-statistical-leak', (x) => { x.authority.productionStatisticalExecutionAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-source-leak', (x) => { x.authority.activeProductionNumericStochasticSourceCount = 1; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-validation-leak', (x) => { x.authority.productionValidationAcceptanceAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-reliability-leak', (x) => { x.authority.productionReliabilityTargetAuthority = 'SYNTHETIC_TARGET'; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-sensitivity-leak', (x) => { x.authority.productionSensitivityAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('b03-leak', (x) => { x.authority.b03ActivationAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('release-leak', (x) => { x.authority.programReleaseAuthority = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('temperature-leak', (x) => { x.authority.programTemperatureAuthority = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
];

assert(negativeCases.length === fixture.negativeCaseCount, 'negative-case count mismatch');
assert(fixture.referenceCalibrationHoldoutExecutionAuthorized === true, 'reference holdout execution authority must be true');
assert(fixture.productionCalibrationFactorAuthorized === false, 'production calibration factor authority must remain false');
assert(fixture.productionStatisticalExecutionAuthorized === false, 'production statistical execution must remain false');
assert(fixture.activeProductionNumericStochasticSourceCount === 0, 'production stochastic-source count must remain zero');
assert(fixture.productionSensitivityAuthorized === false, 'production sensitivity must remain false');
assert(fixture.productionValidationAcceptanceAuthorized === false, 'production validation acceptance must remain false');
assert(fixture.productionReliabilityTargetAuthority === 'NONE', 'production reliability target authority must remain NONE');
assert(fixture.b03ActivationAuthorized === false, 'B03 activation must remain false');
assert(fixture.programReleaseAuthority === false, 'release authority must remain false');
assert(fixture.programTemperatureAuthority === false, 'temperature authority must remain false');

const output = {
  schema: 'lafea-uq-reference-calibration-holdout-check/v1',
  issue: fixture.issue,
  parentIssue: fixture.parentIssue,
  dependencyIssue: fixture.dependencyIssue,
  caseId: fixture.caseId,
  status: 'PASS',
  referenceCalibrationHoldoutQualified: true,
  referenceCalibrationHoldoutExecutionAuthorized: true,
  calibrationBiasFactor: positive.calibrationBiasFactor,
  calibrationRatios: positive.calibrationRatios,
  holdoutSummary: {
    holdoutRatios: positive.holdoutRatios,
    holdoutRatioMeanPostHocOnly: positive.holdoutRatioMeanPostHocOnly,
    calibratedHoldoutModelValues: positive.calibratedHoldoutModelValues,
    rawHoldoutResiduals: positive.rawHoldoutResiduals,
    calibratedHoldoutResiduals: positive.calibratedHoldoutResiduals,
    rawHoldoutMeanSignedResidual: positive.rawHoldoutMeanSignedResidual,
    calibratedHoldoutMeanSignedResidual: positive.calibratedHoldoutMeanSignedResidual,
    rawHoldoutRmse: positive.rawHoldoutRmse,
    calibratedHoldoutRmse: positive.calibratedHoldoutRmse,
    calibratedToRawRmseRatio: positive.calibratedToRawRmseRatio,
  },
  rmseReductionObservedReferenceOnly: positive.calibratedHoldoutRmse < positive.rawHoldoutRmse,
  consistentWithinSplitPermutationExact: true,
  calibrationFactorInvariantToHoldoutPerturbation: true,
  holdoutPerturbationChangesHeldoutMetrics: true,
  calibrationPerturbationChangesFactor: true,
  calibrationPerturbationPropagatesToHoldoutPrediction: true,
  splitLeakageFailClosedQualified: true,
  negativeCaseCount: negativeCases.length,
  holdoutRefitAuthorized: false,
  universalHoldoutAcceptanceThreshold: null,
  productionCalibrationFactorAuthorized: false,
  productionStatisticalExecutionAuthorized: false,
  activeProductionNumericStochasticSourceCount: 0,
  productionSensitivityAuthorized: false,
  productionValidationAcceptanceAuthorized: false,
  productionReliabilityTargetAuthority: 'NONE',
  productionApplicabilityBlocker: fixture.productionApplicabilityBlocker,
  nextBoundary: fixture.nextBoundary,
};

process.stdout.write(`${JSON.stringify(output)}\n`);
