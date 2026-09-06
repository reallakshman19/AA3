import { readFileSync } from 'node:fs';
import {
  CalibrationUncertaintyError,
  authorityFromReferenceCase,
  runCalibrationUncertaintyReference,
} from './lib/lafea-uq-reference-calibration-uncertainty.mjs';

const fixture = JSON.parse(readFileSync(
  new URL('../validation/lafea-benchmark-data/UQ/reference/UQ-REF-CALIBRATION-UNCERTAINTY-01.json', import.meta.url),
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
const assertNumericArray = (actual, expected, label) => {
  assert(actual.length === expected.length, `${label}: length mismatch`);
  for (let index = 0; index < actual.length; index += 1) {
    assert(nearlyEqual(actual[index], expected[index]), `${label}[${index}] mismatch`);
  }
};
const predictionSignature = (result) => JSON.stringify({
  propagatedMeans: result.propagatedMeans,
  propagatedStandardDeviations: result.propagatedStandardDeviations,
  lowerBounds: result.lowerBounds,
  upperBounds: result.upperBounds,
});
const halfWidths = (result) => result.upperBounds.map((upper, index) => upper - result.propagatedMeans[index]);

assert(fixture.schema === 'lafea-uq-reference-calibration-uncertainty/v1', 'unexpected reference schema');
assert(fixture.issue === 1702, 'unexpected issue id');
assert(fixture.parentIssue === 1673, 'unexpected parent issue id');
assert(fixture.dependencyIssue === 1699, 'unexpected dependency issue id');
assert(fixture.caseId === 'UQ-REF-CALIBRATION-UNCERTAINTY-01', 'unexpected case id');
assert(fixture.scope === 'REFERENCE_BENCHMARK_ONLY', 'reference scope must remain isolated');
assert(fixture.universalProductionCoverageTarget === null, 'production coverage target must remain undefined');
assert(fixture.productionApplicabilityBlocker === 'ENGINEERING_POPULATION_APPLICABILITY_REQUIRED', 'production applicability blocker changed');

const authority = authorityFromReferenceCase(fixture);
const baseInput = () => ({
  factorDistribution: clone(fixture.factorDistribution),
  holdoutPairs: clone(fixture.holdoutPairs),
  plan: clone(fixture.plan),
  authority: clone(authority),
});

const positive = runCalibrationUncertaintyReference(baseInput());
const oracle = fixture.oracle;
assertNumericArray(positive.propagatedMeans, oracle.propagatedMeans, 'propagated means');
assertNumericArray(positive.propagatedStandardDeviations, oracle.propagatedStandardDeviations, 'propagated SDs');
assertNumericArray(positive.lowerBounds, oracle.lowerBounds, 'lower bounds');
assertNumericArray(positive.upperBounds, oracle.upperBounds, 'upper bounds');
assertNumericArray(positive.standardizedResiduals, oracle.standardizedResiduals, 'standardized residuals');
assert(JSON.stringify(positive.standardizedResidualApplicability) === JSON.stringify(oracle.standardizedResidualApplicability), 'standardized-residual applicability mismatch');
assert(JSON.stringify(positive.coverageIndicators) === JSON.stringify(oracle.coverageIndicators), 'coverage indicators mismatch');
assert(nearlyEqual(positive.observedDiagnosticCoverageFraction, oracle.observedDiagnosticCoverageFraction), 'diagnostic coverage fraction mismatch');

for (let index = 0; index < positive.propagatedMeans.length; index += 1) {
  const lowerHalf = positive.propagatedMeans[index] - positive.lowerBounds[index];
  const upperHalf = positive.upperBounds[index] - positive.propagatedMeans[index];
  assert(nearlyEqual(lowerHalf, upperHalf), `interval ${index} is not symmetric`);
  assert(nearlyEqual(upperHalf, fixture.plan.normalQuantileZ * positive.propagatedStandardDeviations[index]), `interval ${index} half-width mismatch`);
}

const permutedInput = baseInput();
permutedInput.holdoutPairs.reverse();
const permuted = runCalibrationUncertaintyReference(permutedInput);
assert(JSON.stringify(permuted) === JSON.stringify(positive), 'consistent holdout permutation must be exact');

const zeroInput = baseInput();
zeroInput.factorDistribution.standardDeviation = fixture.zeroUncertaintyControl.standardDeviation;
const zero = runCalibrationUncertaintyReference(zeroInput);
assert(zero.propagatedStandardDeviations.every((value) => value === 0), 'zero-factor-SD control must propagate zero SD');
assert(zero.lowerBounds.every((value, index) => value === zero.propagatedMeans[index]), 'zero-factor-SD lower bounds must collapse to means');
assert(zero.upperBounds.every((value, index) => value === zero.propagatedMeans[index]), 'zero-factor-SD upper bounds must collapse to means');
assert(zero.standardizedResiduals.every((value) => value === null), 'zero-factor-SD standardized residuals must be null');
assert(zero.standardizedResidualApplicability.every((value) => value === fixture.zeroUncertaintyControl.expectedStandardizedResidualApplicability), 'zero-factor-SD applicability mismatch');

const holdoutPerturbInput = baseInput();
holdoutPerturbInput.holdoutPairs[0].test.value += 20;
const holdoutPerturbed = runCalibrationUncertaintyReference(holdoutPerturbInput);
assert(predictionSignature(holdoutPerturbed) === predictionSignature(positive), 'holdout-test perturbation must not change prediction distribution');
assert(JSON.stringify(holdoutPerturbed.coverageIndicators) !== JSON.stringify(positive.coverageIndicators), 'holdout-test perturbation must change coverage diagnostics');

const meanPerturbInput = baseInput();
meanPerturbInput.factorDistribution.mean += 0.01;
const meanPerturbed = runCalibrationUncertaintyReference(meanPerturbInput);
assert(JSON.stringify(meanPerturbed.propagatedMeans) !== JSON.stringify(positive.propagatedMeans), 'factor-mean perturbation must change propagated means');
assertNumericArray(meanPerturbed.propagatedStandardDeviations, positive.propagatedStandardDeviations, 'mean perturbation SD invariance');
assertNumericArray(halfWidths(meanPerturbed), halfWidths(positive), 'mean perturbation half-width invariance');

const sdPerturbInput = baseInput();
sdPerturbInput.factorDistribution.standardDeviation += 0.01;
const sdPerturbed = runCalibrationUncertaintyReference(sdPerturbInput);
assertNumericArray(sdPerturbed.propagatedMeans, positive.propagatedMeans, 'SD perturbation mean invariance');
assert(JSON.stringify(sdPerturbed.propagatedStandardDeviations) !== JSON.stringify(positive.propagatedStandardDeviations), 'factor-SD perturbation must change propagated SDs');
assert(JSON.stringify(halfWidths(sdPerturbed)) !== JSON.stringify(halfWidths(positive)), 'factor-SD perturbation must change interval half-widths');

const modelPerturbInput = baseInput();
modelPerturbInput.holdoutPairs[0].model.value += 1;
const modelPerturbed = runCalibrationUncertaintyReference(modelPerturbInput);
assert(modelPerturbed.propagatedMeans[0] !== positive.propagatedMeans[0], 'model perturbation must change its propagated mean');
assert(modelPerturbed.propagatedStandardDeviations[0] !== positive.propagatedStandardDeviations[0], 'model perturbation must change its propagated SD');
assert(nearlyEqual(modelPerturbed.propagatedMeans[1], positive.propagatedMeans[1]), 'model perturbation must not change other propagated means');

const expectFailure = (label, mutator, expectedCode) => {
  const candidate = baseInput();
  mutator(candidate);
  try {
    runCalibrationUncertaintyReference(candidate);
  } catch (error) {
    assert(error instanceof CalibrationUncertaintyError, `${label}: expected CalibrationUncertaintyError`);
    assert(error.code === expectedCode, `${label}: expected ${expectedCode}, received ${error.code}`);
    assert(typeof error.path === 'string' && error.path.startsWith('$.'), `${label}: structured path missing`);
    return { label, code: error.code, path: error.path };
  }
  throw new Error(`${label}: expected fail-closed rejection`);
};

const negativeCases = [
  expectFailure('unsupported-factor-family', (x) => { x.factorDistribution.family = 'LOGNORMAL'; }, 'UNSUPPORTED_FACTOR_DISTRIBUTION'),
  expectFailure('nonfinite-factor-mean', (x) => { x.factorDistribution.mean = Number.NaN; }, 'NON_FINITE_NUMBER'),
  expectFailure('negative-factor-sd', (x) => { x.factorDistribution.standardDeviation = -0.01; }, 'NEGATIVE_FACTOR_STANDARD_DEVIATION'),
  expectFailure('nonfinite-factor-sd', (x) => { x.factorDistribution.standardDeviation = Number.POSITIVE_INFINITY; }, 'NON_FINITE_NUMBER'),
  expectFailure('holdout-derived-factor-mean-source', (x) => { x.factorDistribution.meanSource = 'HOLDOUT_DERIVED'; }, 'UNSUPPORTED_FACTOR_MEAN_SOURCE'),
  expectFailure('holdout-derived-factor-sd-source', (x) => { x.factorDistribution.standardDeviationSource = 'HOLDOUT_DERIVED'; }, 'UNSUPPORTED_FACTOR_STANDARD_DEVIATION_SOURCE'),
  expectFailure('invalid-nominal-level', (x) => { x.plan.nominalIntervalLevel = 0; }, 'INVALID_NOMINAL_INTERVAL_LEVEL'),
  expectFailure('unsupported-nominal-level', (x) => { x.plan.nominalIntervalLevel = 0.9; }, 'UNSUPPORTED_NOMINAL_INTERVAL_LEVEL'),
  expectFailure('nonfinite-normal-quantile', (x) => { x.plan.normalQuantileZ = Number.NaN; }, 'NON_FINITE_NUMBER'),
  expectFailure('invalid-normal-quantile', (x) => { x.plan.normalQuantileZ = 0; }, 'INVALID_NORMAL_QUANTILE'),
  expectFailure('unsupported-normal-quantile', (x) => { x.plan.normalQuantileZ = 1.6448536269514722; }, 'UNSUPPORTED_NORMAL_QUANTILE'),
  expectFailure('unsupported-interval-construction', (x) => { x.plan.intervalConstruction = 'ONE_SIDED'; }, 'UNSUPPORTED_INTERVAL_CONSTRUCTION'),
  expectFailure('unsupported-propagation-equation', (x) => { x.plan.propagationEquation = 'Y_EQUALS_FACTOR_PLUS_MODEL'; }, 'UNSUPPORTED_PROPAGATION_EQUATION'),
  expectFailure('duplicate-required-holdout-id', (x) => { x.plan.requiredHoldoutIds[1] = x.plan.requiredHoldoutIds[0]; }, 'DUPLICATE_REQUIRED_HOLDOUT_ID'),
  expectFailure('duplicate-holdout-id', (x) => { x.holdoutPairs[1].id = x.holdoutPairs[0].id; }, 'DUPLICATE_HOLDOUT_ID'),
  expectFailure('missing-holdout-id', (x) => { x.holdoutPairs.pop(); }, 'MISSING_HOLDOUT_ID'),
  expectFailure('pair-binding-mismatch', (x) => { x.holdoutPairs[0].model.pairId = 'WRONG'; }, 'PAIR_BINDING_MISMATCH'),
  expectFailure('unit-mismatch', (x) => { x.holdoutPairs[0].test.unit = 'OTHER_QOI'; }, 'UNIT_MISMATCH'),
  expectFailure('nonfinite-model-value', (x) => { x.holdoutPairs[0].model.value = Number.NaN; }, 'NON_FINITE_NUMBER'),
  expectFailure('nonfinite-test-value', (x) => { x.holdoutPairs[0].test.value = Number.POSITIVE_INFINITY; }, 'NON_FINITE_NUMBER'),
  expectFailure('duplicate-provenance', (x) => { x.holdoutPairs[1].test.provenance = x.holdoutPairs[0].model.provenance; }, 'DUPLICATE_PROVENANCE'),
  expectFailure('unsupported-standardized-residual-convention', (x) => { x.plan.standardizedResidualConvention = 'ABSOLUTE_ERROR_OVER_SD'; }, 'UNSUPPORTED_STANDARDIZED_RESIDUAL_CONVENTION'),
  expectFailure('holdout-derived-factor-parameters-authorized', (x) => { x.plan.holdoutDerivedFactorParametersAuthorized = true; }, 'HOLDOUT_DERIVED_FACTOR_PARAMETERS_FORBIDDEN'),
  expectFailure('reference-authority-missing', (x) => { x.authority.referenceCalibrationUncertaintyExecutionAuthorized = false; }, 'REFERENCE_AUTHORITY_REQUIRED'),
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
assert(fixture.referenceCalibrationUncertaintyExecutionAuthorized === true, 'reference calibration uncertainty execution authority must be true');
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
  schema: 'lafea-uq-reference-calibration-uncertainty-check/v1',
  issue: fixture.issue,
  parentIssue: fixture.parentIssue,
  dependencyIssue: fixture.dependencyIssue,
  caseId: fixture.caseId,
  status: 'PASS',
  referenceCalibrationUncertaintyQualified: true,
  referenceCalibrationUncertaintyExecutionAuthorized: true,
  factorDistribution: positive.factorDistribution,
  propagationSummary: {
    propagatedMeans: positive.propagatedMeans,
    propagatedStandardDeviations: positive.propagatedStandardDeviations,
    lowerBounds: positive.lowerBounds,
    upperBounds: positive.upperBounds,
    standardizedResiduals: positive.standardizedResiduals,
    coverageIndicators: positive.coverageIndicators,
    observedDiagnosticCoverageFraction: positive.observedDiagnosticCoverageFraction,
  },
  nominalIntervalLevelReferenceOnly: positive.nominalIntervalLevel,
  normalQuantileZ: positive.normalQuantileZ,
  intervalSymmetryQualified: true,
  consistentHoldoutPermutationExact: true,
  zeroFactorUncertaintyControlQualified: true,
  zeroFactorUncertaintyStandardizedResidualApplicability: fixture.zeroUncertaintyControl.expectedStandardizedResidualApplicability,
  holdoutPerturbationLeavesPredictionDistributionExact: true,
  holdoutPerturbationChangesCoverageDiagnostics: true,
  factorMeanPerturbationCausalityQualified: true,
  factorStandardDeviationPerturbationCausalityQualified: true,
  modelPerturbationCausalityQualified: true,
  negativeCaseCount: negativeCases.length,
  calibrationUncertaintyPlanFailClosedQualified: true,
  universalProductionCoverageTarget: null,
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
