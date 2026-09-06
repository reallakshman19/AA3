import { readFileSync } from 'node:fs';
import {
  ModelDiscrepancyError,
  authorityFromReferenceCase,
  runModelDiscrepancyReference,
} from './lib/lafea-uq-reference-model-discrepancy.mjs';
import { runCalibrationUncertaintyReference } from './lib/lafea-uq-reference-calibration-uncertainty.mjs';

const fixture = JSON.parse(readFileSync(
  new URL('../validation/lafea-benchmark-data/UQ/reference/UQ-REF-MODEL-DISCREPANCY-01.json', import.meta.url),
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
    assert(nearlyEqual(actual[index], expected[index]), `${label}[${index}] mismatch: ${actual[index]} vs ${expected[index]}`);
  }
};
const halfWidths = (result) => result.upperBounds.map((upper, index) => upper - result.propagatedMeans[index]);
const predictionSignature = (result) => JSON.stringify({
  factorVarianceContributions: result.factorVarianceContributions,
  discrepancyVarianceContributions: result.discrepancyVarianceContributions,
  combinedVariances: result.combinedVariances,
  propagatedMeans: result.propagatedMeans,
  propagatedStandardDeviations: result.propagatedStandardDeviations,
  lowerBounds: result.lowerBounds,
  upperBounds: result.upperBounds,
});

assert(fixture.schema === 'lafea-uq-reference-model-discrepancy/v1', 'unexpected reference schema');
assert(fixture.issue === 1704, 'unexpected issue id');
assert(fixture.parentIssue === 1673, 'unexpected parent issue id');
assert(fixture.dependencyIssue === 1702, 'unexpected dependency issue id');
assert(fixture.caseId === 'UQ-REF-MODEL-DISCREPANCY-01', 'unexpected case id');
assert(fixture.scope === 'REFERENCE_BENCHMARK_ONLY', 'reference scope must remain isolated');
assert(fixture.universalProductionCoverageTarget === null, 'production coverage target must remain undefined');
assert(fixture.productionApplicabilityBlocker === 'ENGINEERING_POPULATION_APPLICABILITY_REQUIRED', 'production applicability blocker changed');

const authority = authorityFromReferenceCase(fixture);
const baseInput = () => ({
  factorDistribution: clone(fixture.factorDistribution),
  discrepancyDistribution: clone(fixture.discrepancyDistribution),
  holdoutPairs: clone(fixture.holdoutPairs),
  plan: clone(fixture.plan),
  authority: clone(authority),
});

const positive = runModelDiscrepancyReference(baseInput());
const oracle = fixture.oracle;
assertNumericArray(positive.factorVarianceContributions, oracle.factorVarianceContributions, 'factor variance contributions');
assertNumericArray(positive.discrepancyVarianceContributions, oracle.discrepancyVarianceContributions, 'discrepancy variance contributions');
assertNumericArray(positive.combinedVariances, oracle.combinedVariances, 'combined variances');
assertNumericArray(positive.propagatedMeans, oracle.propagatedMeans, 'propagated means');
assertNumericArray(positive.propagatedStandardDeviations, oracle.propagatedStandardDeviations, 'propagated SDs');
assertNumericArray(positive.lowerBounds, oracle.lowerBounds, 'lower bounds');
assertNumericArray(positive.upperBounds, oracle.upperBounds, 'upper bounds');
assertNumericArray(positive.standardizedResiduals, oracle.standardizedResiduals, 'standardized residuals');
assert(JSON.stringify(positive.standardizedResidualApplicability) === JSON.stringify(oracle.standardizedResidualApplicability), 'standardized-residual applicability mismatch');
assert(JSON.stringify(positive.coverageIndicators) === JSON.stringify(oracle.coverageIndicators), 'coverage indicators mismatch');
assert(nearlyEqual(positive.observedDiagnosticCoverageFraction, oracle.observedDiagnosticCoverageFraction), 'diagnostic coverage fraction mismatch');

for (let index = 0; index < positive.combinedVariances.length; index += 1) {
  assert(nearlyEqual(
    positive.combinedVariances[index],
    positive.factorVarianceContributions[index] + positive.discrepancyVarianceContributions[index],
  ), `variance decomposition ${index} mismatch`);
  const lowerHalf = positive.propagatedMeans[index] - positive.lowerBounds[index];
  const upperHalf = positive.upperBounds[index] - positive.propagatedMeans[index];
  assert(nearlyEqual(lowerHalf, upperHalf), `interval ${index} is not symmetric`);
  assert(nearlyEqual(upperHalf, fixture.plan.normalQuantileZ * positive.propagatedStandardDeviations[index]), `interval ${index} half-width mismatch`);
}

const permutedInput = baseInput();
permutedInput.holdoutPairs.reverse();
const permuted = runModelDiscrepancyReference(permutedInput);
assert(JSON.stringify(permuted) === JSON.stringify(positive), 'consistent holdout permutation must be exact');

const reductionInput = baseInput();
reductionInput.discrepancyDistribution.mean = fixture.componentReductionControl.discrepancyMean;
reductionInput.discrepancyDistribution.standardDeviation = fixture.componentReductionControl.discrepancyStandardDeviation;
const reduced = runModelDiscrepancyReference(reductionInput);
const predecessor = runCalibrationUncertaintyReference({
  factorDistribution: clone(fixture.factorDistribution),
  holdoutPairs: clone(fixture.holdoutPairs),
  plan: {
    unit: fixture.plan.unit,
    requiredHoldoutIds: clone(fixture.plan.requiredHoldoutIds),
    propagationEquation: 'Y_EQUALS_FACTOR_TIMES_DETERMINISTIC_MODEL',
    intervalConstruction: fixture.plan.intervalConstruction,
    nominalIntervalLevel: fixture.plan.nominalIntervalLevel,
    normalQuantileZ: fixture.plan.normalQuantileZ,
    standardizedResidualConvention: 'TEST_MINUS_MEAN_OVER_PROPAGATED_SD',
    holdoutDerivedFactorParametersAuthorized: false,
  },
  authority: {
    referenceCalibrationUncertaintyExecutionAuthorized: true,
    productionCalibrationFactorAuthorized: false,
    productionStatisticalExecutionAuthorized: false,
    activeProductionNumericStochasticSourceCount: 0,
    productionSensitivityAuthorized: false,
    productionValidationAcceptanceAuthorized: false,
    productionReliabilityTargetAuthority: 'NONE',
    b03ActivationAuthorized: false,
    programReleaseAuthority: false,
    programTemperatureAuthority: false,
  },
});
assertNumericArray(reduced.propagatedMeans, predecessor.propagatedMeans, 'reduction predecessor means');
assertNumericArray(reduced.propagatedStandardDeviations, predecessor.propagatedStandardDeviations, 'reduction predecessor SDs');
assertNumericArray(reduced.lowerBounds, predecessor.lowerBounds, 'reduction predecessor lower bounds');
assertNumericArray(reduced.upperBounds, predecessor.upperBounds, 'reduction predecessor upper bounds');
assertNumericArray(reduced.standardizedResiduals, predecessor.standardizedResiduals, 'reduction predecessor standardized residuals');

const discrepancyOnlyInput = baseInput();
discrepancyOnlyInput.factorDistribution.standardDeviation = 0;
const discrepancyOnly = runModelDiscrepancyReference(discrepancyOnlyInput);
assert(discrepancyOnly.propagatedStandardDeviations.every((value) => nearlyEqual(value, fixture.discrepancyDistribution.standardDeviation)), 'zero factor SD must leave finite discrepancy SD');
assert(discrepancyOnly.standardizedResidualApplicability.every((value) => value === 'APPLICABLE'), 'discrepancy-only standardized residuals must remain applicable');

const zeroCombinedInput = baseInput();
zeroCombinedInput.factorDistribution.standardDeviation = fixture.zeroCombinedUncertaintyControl.factorStandardDeviation;
zeroCombinedInput.discrepancyDistribution.standardDeviation = fixture.zeroCombinedUncertaintyControl.discrepancyStandardDeviation;
const zeroCombined = runModelDiscrepancyReference(zeroCombinedInput);
assert(zeroCombined.propagatedStandardDeviations.every((value) => value === 0), 'zero combined uncertainty must propagate zero SD');
assert(zeroCombined.lowerBounds.every((value, index) => value === zeroCombined.propagatedMeans[index]), 'zero combined lower bounds must collapse to means');
assert(zeroCombined.upperBounds.every((value, index) => value === zeroCombined.propagatedMeans[index]), 'zero combined upper bounds must collapse to means');
assert(zeroCombined.standardizedResiduals.every((value) => value === null), 'zero combined standardized residuals must be null');
assert(zeroCombined.standardizedResidualApplicability.every((value) => value === fixture.zeroCombinedUncertaintyControl.expectedStandardizedResidualApplicability), 'zero combined applicability mismatch');

const holdoutPerturbInput = baseInput();
holdoutPerturbInput.holdoutPairs[0].test.value += 20;
const holdoutPerturbed = runModelDiscrepancyReference(holdoutPerturbInput);
assert(predictionSignature(holdoutPerturbed) === predictionSignature(positive), 'holdout-test perturbation must not change prediction distribution');
assert(JSON.stringify(holdoutPerturbed.coverageIndicators) !== JSON.stringify(positive.coverageIndicators), 'holdout-test perturbation must change coverage diagnostics');

const discrepancyMeanPerturbInput = baseInput();
discrepancyMeanPerturbInput.discrepancyDistribution.mean += 1;
const discrepancyMeanPerturbed = runModelDiscrepancyReference(discrepancyMeanPerturbInput);
assert(JSON.stringify(discrepancyMeanPerturbed.propagatedMeans) !== JSON.stringify(positive.propagatedMeans), 'discrepancy-mean perturbation must change means');
assertNumericArray(discrepancyMeanPerturbed.propagatedStandardDeviations, positive.propagatedStandardDeviations, 'discrepancy mean perturbation SD invariance');
assertNumericArray(halfWidths(discrepancyMeanPerturbed), halfWidths(positive), 'discrepancy mean perturbation half-width invariance');

const discrepancySdPerturbInput = baseInput();
discrepancySdPerturbInput.discrepancyDistribution.standardDeviation += 1;
const discrepancySdPerturbed = runModelDiscrepancyReference(discrepancySdPerturbInput);
assertNumericArray(discrepancySdPerturbed.propagatedMeans, positive.propagatedMeans, 'discrepancy SD perturbation mean invariance');
assert(JSON.stringify(discrepancySdPerturbed.propagatedStandardDeviations) !== JSON.stringify(positive.propagatedStandardDeviations), 'discrepancy-SD perturbation must change combined SDs');
assert(JSON.stringify(halfWidths(discrepancySdPerturbed)) !== JSON.stringify(halfWidths(positive)), 'discrepancy-SD perturbation must change interval half-widths');

const factorSdPerturbInput = baseInput();
factorSdPerturbInput.factorDistribution.standardDeviation += 0.01;
const factorSdPerturbed = runModelDiscrepancyReference(factorSdPerturbInput);
assertNumericArray(factorSdPerturbed.propagatedMeans, positive.propagatedMeans, 'factor SD perturbation mean invariance');
assert(JSON.stringify(factorSdPerturbed.factorVarianceContributions) !== JSON.stringify(positive.factorVarianceContributions), 'factor-SD perturbation must change factor variance contributions');
assertNumericArray(factorSdPerturbed.discrepancyVarianceContributions, positive.discrepancyVarianceContributions, 'factor SD perturbation discrepancy variance invariance');

const modelPerturbInput = baseInput();
modelPerturbInput.holdoutPairs[0].model.value += 1;
const modelPerturbed = runModelDiscrepancyReference(modelPerturbInput);
assert(modelPerturbed.propagatedMeans[0] !== positive.propagatedMeans[0], 'model perturbation must change its propagated mean');
assert(modelPerturbed.factorVarianceContributions[0] !== positive.factorVarianceContributions[0], 'model perturbation must change its factor variance contribution');
assert(nearlyEqual(modelPerturbed.discrepancyVarianceContributions[0], positive.discrepancyVarianceContributions[0]), 'model perturbation must not change discrepancy variance');
assert(nearlyEqual(modelPerturbed.propagatedMeans[1], positive.propagatedMeans[1]), 'model perturbation must not change other propagated means');

const expectFailure = (label, mutator, expectedCode) => {
  const candidate = baseInput();
  mutator(candidate);
  try {
    runModelDiscrepancyReference(candidate);
  } catch (error) {
    assert(error instanceof ModelDiscrepancyError, `${label}: expected ModelDiscrepancyError`);
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
  expectFailure('unsupported-discrepancy-family', (x) => { x.discrepancyDistribution.family = 'UNIFORM'; }, 'UNSUPPORTED_DISCREPANCY_DISTRIBUTION'),
  expectFailure('nonfinite-discrepancy-mean', (x) => { x.discrepancyDistribution.mean = Number.NaN; }, 'NON_FINITE_NUMBER'),
  expectFailure('negative-discrepancy-sd', (x) => { x.discrepancyDistribution.standardDeviation = -1; }, 'NEGATIVE_DISCREPANCY_STANDARD_DEVIATION'),
  expectFailure('nonfinite-discrepancy-sd', (x) => { x.discrepancyDistribution.standardDeviation = Number.POSITIVE_INFINITY; }, 'NON_FINITE_NUMBER'),
  expectFailure('holdout-derived-discrepancy-mean-source', (x) => { x.discrepancyDistribution.meanSource = 'HOLDOUT_DERIVED'; }, 'UNSUPPORTED_DISCREPANCY_MEAN_SOURCE'),
  expectFailure('holdout-derived-discrepancy-sd-source', (x) => { x.discrepancyDistribution.standardDeviationSource = 'HOLDOUT_DERIVED'; }, 'UNSUPPORTED_DISCREPANCY_STANDARD_DEVIATION_SOURCE'),
  expectFailure('unsupported-factor-discrepancy-dependence', (x) => { x.plan.factorDiscrepancyDependence = 'CORRELATED'; }, 'UNSUPPORTED_FACTOR_DISCREPANCY_DEPENDENCE'),
  expectFailure('nonfinite-factor-discrepancy-covariance', (x) => { x.plan.factorDiscrepancyCovariance = Number.NaN; }, 'NON_FINITE_NUMBER'),
  expectFailure('nonzero-factor-discrepancy-covariance', (x) => { x.plan.factorDiscrepancyCovariance = 0.1; }, 'UNSUPPORTED_FACTOR_DISCREPANCY_COVARIANCE'),
  expectFailure('invalid-nominal-level', (x) => { x.plan.nominalIntervalLevel = 0; }, 'INVALID_NOMINAL_INTERVAL_LEVEL'),
  expectFailure('unsupported-nominal-level', (x) => { x.plan.nominalIntervalLevel = 0.9; }, 'UNSUPPORTED_NOMINAL_INTERVAL_LEVEL'),
  expectFailure('nonfinite-normal-quantile', (x) => { x.plan.normalQuantileZ = Number.NaN; }, 'NON_FINITE_NUMBER'),
  expectFailure('invalid-normal-quantile', (x) => { x.plan.normalQuantileZ = 0; }, 'INVALID_NORMAL_QUANTILE'),
  expectFailure('unsupported-normal-quantile', (x) => { x.plan.normalQuantileZ = 1.6448536269514722; }, 'UNSUPPORTED_NORMAL_QUANTILE'),
  expectFailure('unsupported-interval-construction', (x) => { x.plan.intervalConstruction = 'ONE_SIDED'; }, 'UNSUPPORTED_INTERVAL_CONSTRUCTION'),
  expectFailure('unsupported-propagation-equation', (x) => { x.plan.propagationEquation = 'Y_EQUALS_FACTOR_TIMES_MODEL'; }, 'UNSUPPORTED_PROPAGATION_EQUATION'),
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
  expectFailure('holdout-derived-discrepancy-parameters-authorized', (x) => { x.plan.holdoutDerivedDiscrepancyParametersAuthorized = true; }, 'HOLDOUT_DERIVED_DISCREPANCY_PARAMETERS_FORBIDDEN'),
  expectFailure('reference-authority-missing', (x) => { x.authority.referenceModelDiscrepancyExecutionAuthorized = false; }, 'REFERENCE_AUTHORITY_REQUIRED'),
  expectFailure('production-discrepancy-authority-leak', (x) => { x.authority.productionModelDiscrepancyAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
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

assert(negativeCases.length === fixture.negativeCaseCount, `negative-case count mismatch: ${negativeCases.length} vs ${fixture.negativeCaseCount}`);
assert(fixture.referenceModelDiscrepancyExecutionAuthorized === true, 'reference model-discrepancy execution authority must be true');
assert(fixture.productionModelDiscrepancyAuthorized === false, 'production model-discrepancy authority must remain false');
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
  schema: 'lafea-uq-reference-model-discrepancy-check/v1',
  issue: fixture.issue,
  parentIssue: fixture.parentIssue,
  dependencyIssue: fixture.dependencyIssue,
  caseId: fixture.caseId,
  status: 'PASS',
  referenceModelDiscrepancyQualified: true,
  referenceModelDiscrepancyExecutionAuthorized: true,
  factorDistribution: positive.factorDistribution,
  discrepancyDistribution: positive.discrepancyDistribution,
  propagationSummary: {
    factorVarianceContributions: positive.factorVarianceContributions,
    discrepancyVarianceContributions: positive.discrepancyVarianceContributions,
    combinedVariances: positive.combinedVariances,
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
  varianceDecompositionQualified: true,
  intervalSymmetryQualified: true,
  consistentHoldoutPermutationExact: true,
  reductionToCalibrationUncertaintyReferenceExact: true,
  discrepancyOnlyUncertaintyControlQualified: true,
  zeroCombinedUncertaintyControlQualified: true,
  zeroCombinedUncertaintyStandardizedResidualApplicability: fixture.zeroCombinedUncertaintyControl.expectedStandardizedResidualApplicability,
  holdoutPerturbationLeavesPredictionDistributionExact: true,
  holdoutPerturbationChangesCoverageDiagnostics: true,
  discrepancyMeanPerturbationCausalityQualified: true,
  discrepancyStandardDeviationPerturbationCausalityQualified: true,
  factorStandardDeviationPerturbationCausalityQualified: true,
  modelPerturbationCausalityQualified: true,
  negativeCaseCount: negativeCases.length,
  modelDiscrepancyPlanFailClosedQualified: true,
  universalProductionCoverageTarget: null,
  productionModelDiscrepancyAuthorized: false,
  productionCalibrationFactorAuthorized: false,
  productionStatisticalExecutionAuthorized: false,
  activeProductionNumericStochasticSourceCount: 0,
  productionSensitivityAuthorized: false,
  productionValidationAcceptanceAuthorized: false,
  productionReliabilityTargetAuthority: 'NONE',
  productionApplicabilityBlocker: fixture.productionApplicabilityBlocker,
  nextBoundary: fixture.nextBoundary,
};

console.log(JSON.stringify(output));
