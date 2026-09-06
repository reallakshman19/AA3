import { readFileSync } from 'node:fs';
import {
  CorrelatedModelDiscrepancyError,
  authorityFromCorrelatedReferenceCase,
  runCorrelatedModelDiscrepancyReference,
} from './lib/lafea-uq-reference-correlated-model-discrepancy.mjs';
import { runModelDiscrepancyReference } from './lib/lafea-uq-reference-model-discrepancy.mjs';
import { runCalibrationUncertaintyReference } from './lib/lafea-uq-reference-calibration-uncertainty.mjs';

const fixture = JSON.parse(readFileSync(
  new URL('../validation/lafea-benchmark-data/UQ/reference/UQ-REF-CORRELATED-MODEL-DISCREPANCY-01.json', import.meta.url),
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
  covarianceCrossTermContributions: result.covarianceCrossTermContributions,
  combinedVariances: result.combinedVariances,
  propagatedMeans: result.propagatedMeans,
  propagatedStandardDeviations: result.propagatedStandardDeviations,
  lowerBounds: result.lowerBounds,
  upperBounds: result.upperBounds,
});

assert(fixture.schema === 'lafea-uq-reference-correlated-model-discrepancy/v1', 'unexpected reference schema');
assert(fixture.issue === 1706, 'unexpected issue id');
assert(fixture.parentIssue === 1673, 'unexpected parent issue id');
assert(fixture.dependencyIssue === 1704, 'unexpected dependency issue id');
assert(fixture.caseId === 'UQ-REF-CORRELATED-MODEL-DISCREPANCY-01', 'unexpected case id');
assert(fixture.scope === 'REFERENCE_BENCHMARK_ONLY', 'reference scope must remain isolated');
assert(fixture.universalProductionCoverageTarget === null, 'production coverage target must remain undefined');
assert(fixture.productionApplicabilityBlocker === 'ENGINEERING_POPULATION_APPLICABILITY_REQUIRED', 'production applicability blocker changed');

const authority = authorityFromCorrelatedReferenceCase(fixture);
const baseInput = () => ({
  factorDistribution: clone(fixture.factorDistribution),
  discrepancyDistribution: clone(fixture.discrepancyDistribution),
  holdoutPairs: clone(fixture.holdoutPairs),
  plan: clone(fixture.plan),
  authority: clone(authority),
});

const positive = runCorrelatedModelDiscrepancyReference(baseInput());
const oracle = fixture.oracle;
assert(nearlyEqual(positive.correlationCoefficient, fixture.plan.correlationCoefficient), 'rho mismatch');
assert(nearlyEqual(positive.factorDiscrepancyCovariance, fixture.plan.factorDiscrepancyCovariance), 'covariance mismatch');
assert(JSON.stringify(positive.covarianceMatrix) === JSON.stringify(fixture.plan.covarianceMatrix), 'covariance matrix mismatch');
assert(nearlyEqual(positive.covarianceDeterminant, oracle.covarianceDeterminant), 'covariance determinant mismatch');
assertNumericArray(positive.factorVarianceContributions, oracle.factorVarianceContributions, 'factor variance contributions');
assertNumericArray(positive.discrepancyVarianceContributions, oracle.discrepancyVarianceContributions, 'discrepancy variance contributions');
assertNumericArray(positive.covarianceCrossTermContributions, oracle.covarianceCrossTermContributions, 'covariance cross-term contributions');
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
    positive.factorVarianceContributions[index]
      + positive.discrepancyVarianceContributions[index]
      + positive.covarianceCrossTermContributions[index],
  ), `variance decomposition ${index} mismatch`);
  const modelValue = fixture.holdoutPairs[index].model.value;
  assert(nearlyEqual(
    positive.covarianceCrossTermContributions[index],
    2 * modelValue * fixture.plan.factorDiscrepancyCovariance,
  ), `covariance cross-term ${index} mismatch`);
  const lowerHalf = positive.propagatedMeans[index] - positive.lowerBounds[index];
  const upperHalf = positive.upperBounds[index] - positive.propagatedMeans[index];
  assert(nearlyEqual(lowerHalf, upperHalf), `interval ${index} is not symmetric`);
  assert(nearlyEqual(upperHalf, fixture.plan.normalQuantileZ * positive.propagatedStandardDeviations[index]), `interval ${index} half-width mismatch`);
}

const permutedInput = baseInput();
permutedInput.holdoutPairs.reverse();
const permuted = runCorrelatedModelDiscrepancyReference(permutedInput);
assert(JSON.stringify(permuted) === JSON.stringify(positive), 'consistent holdout permutation must be exact');

const independenceInput = baseInput();
independenceInput.plan.correlationCoefficient = fixture.independenceReductionControl.correlationCoefficient;
independenceInput.plan.factorDiscrepancyCovariance = fixture.independenceReductionControl.factorDiscrepancyCovariance;
independenceInput.plan.covarianceMatrix = clone(fixture.independenceReductionControl.covarianceMatrix);
const independenceReduced = runCorrelatedModelDiscrepancyReference(independenceInput);
const predecessorDiscrepancy = clone(fixture.discrepancyDistribution);
predecessorDiscrepancy.meanSource = 'SYNTHETIC_REFERENCE_INDEPENDENT_DISCREPANCY_FREEZE';
predecessorDiscrepancy.standardDeviationSource = 'SYNTHETIC_REFERENCE_INDEPENDENT_DISCREPANCY_FREEZE';
const predecessorIndependent = runModelDiscrepancyReference({
  factorDistribution: clone(fixture.factorDistribution),
  discrepancyDistribution: predecessorDiscrepancy,
  holdoutPairs: clone(fixture.holdoutPairs),
  plan: {
    unit: fixture.plan.unit,
    requiredHoldoutIds: clone(fixture.plan.requiredHoldoutIds),
    propagationEquation: fixture.plan.propagationEquation,
    factorDiscrepancyDependence: 'INDEPENDENT_REFERENCE_ONLY',
    factorDiscrepancyCovariance: 0,
    intervalConstruction: fixture.plan.intervalConstruction,
    nominalIntervalLevel: fixture.plan.nominalIntervalLevel,
    normalQuantileZ: fixture.plan.normalQuantileZ,
    standardizedResidualConvention: fixture.plan.standardizedResidualConvention,
    holdoutDerivedFactorParametersAuthorized: false,
    holdoutDerivedDiscrepancyParametersAuthorized: false,
  },
  authority: {
    referenceModelDiscrepancyExecutionAuthorized: true,
    productionModelDiscrepancyAuthorized: false,
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
assertNumericArray(independenceReduced.factorVarianceContributions, predecessorIndependent.factorVarianceContributions, 'rho=0 predecessor factor variances');
assertNumericArray(independenceReduced.discrepancyVarianceContributions, predecessorIndependent.discrepancyVarianceContributions, 'rho=0 predecessor discrepancy variances');
assert(independenceReduced.covarianceCrossTermContributions.every((value) => value === 0), 'rho=0 cross terms must be zero');
assertNumericArray(independenceReduced.combinedVariances, predecessorIndependent.combinedVariances, 'rho=0 predecessor combined variances');
assertNumericArray(independenceReduced.propagatedMeans, predecessorIndependent.propagatedMeans, 'rho=0 predecessor means');
assertNumericArray(independenceReduced.propagatedStandardDeviations, predecessorIndependent.propagatedStandardDeviations, 'rho=0 predecessor SDs');
assertNumericArray(independenceReduced.lowerBounds, predecessorIndependent.lowerBounds, 'rho=0 predecessor lower bounds');
assertNumericArray(independenceReduced.upperBounds, predecessorIndependent.upperBounds, 'rho=0 predecessor upper bounds');
assertNumericArray(independenceReduced.standardizedResiduals, predecessorIndependent.standardizedResiduals, 'rho=0 predecessor standardized residuals');

const signInput = baseInput();
signInput.plan.correlationCoefficient = fixture.covarianceSignControl.correlationCoefficient;
signInput.plan.factorDiscrepancyCovariance = fixture.covarianceSignControl.factorDiscrepancyCovariance;
signInput.plan.covarianceMatrix = clone(fixture.covarianceSignControl.covarianceMatrix);
const signReversed = runCorrelatedModelDiscrepancyReference(signInput);
assertNumericArray(signReversed.propagatedMeans, positive.propagatedMeans, 'covariance sign reversal mean invariance');
assertNumericArray(signReversed.factorVarianceContributions, positive.factorVarianceContributions, 'covariance sign reversal factor variance invariance');
assertNumericArray(signReversed.discrepancyVarianceContributions, positive.discrepancyVarianceContributions, 'covariance sign reversal discrepancy variance invariance');
assertNumericArray(signReversed.covarianceCrossTermContributions, fixture.covarianceSignControl.expectedCrossTermContributions, 'covariance sign reversal cross terms');
assertNumericArray(signReversed.combinedVariances, fixture.covarianceSignControl.expectedCombinedVariances, 'covariance sign reversal combined variances');
assert(JSON.stringify(halfWidths(signReversed)) !== JSON.stringify(halfWidths(positive)), 'covariance sign reversal must change interval widths');

const factorOnlyInput = baseInput();
factorOnlyInput.discrepancyDistribution.mean = fixture.factorOnlyReductionControl.discrepancyMean;
factorOnlyInput.discrepancyDistribution.standardDeviation = fixture.factorOnlyReductionControl.discrepancyStandardDeviation;
factorOnlyInput.plan.correlationCoefficient = fixture.factorOnlyReductionControl.correlationCoefficient;
factorOnlyInput.plan.factorDiscrepancyCovariance = fixture.factorOnlyReductionControl.factorDiscrepancyCovariance;
factorOnlyInput.plan.covarianceMatrix = clone(fixture.factorOnlyReductionControl.covarianceMatrix);
const factorOnly = runCorrelatedModelDiscrepancyReference(factorOnlyInput);
const predecessorFactorOnly = runCalibrationUncertaintyReference({
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
assert(factorOnly.discrepancyVarianceContributions.every((value) => value === 0), 'factor-only discrepancy variance must be zero');
assert(factorOnly.covarianceCrossTermContributions.every((value) => value === 0), 'factor-only covariance cross term must be zero');
assertNumericArray(factorOnly.propagatedMeans, predecessorFactorOnly.propagatedMeans, 'factor-only predecessor means');
assertNumericArray(factorOnly.propagatedStandardDeviations, predecessorFactorOnly.propagatedStandardDeviations, 'factor-only predecessor SDs');
assertNumericArray(factorOnly.lowerBounds, predecessorFactorOnly.lowerBounds, 'factor-only predecessor lower bounds');
assertNumericArray(factorOnly.upperBounds, predecessorFactorOnly.upperBounds, 'factor-only predecessor upper bounds');
assertNumericArray(factorOnly.standardizedResiduals, predecessorFactorOnly.standardizedResiduals, 'factor-only predecessor standardized residuals');

const zeroCombinedInput = baseInput();
zeroCombinedInput.factorDistribution.standardDeviation = fixture.zeroCombinedUncertaintyControl.factorStandardDeviation;
zeroCombinedInput.discrepancyDistribution.standardDeviation = fixture.zeroCombinedUncertaintyControl.discrepancyStandardDeviation;
zeroCombinedInput.plan.correlationCoefficient = fixture.zeroCombinedUncertaintyControl.correlationCoefficient;
zeroCombinedInput.plan.factorDiscrepancyCovariance = fixture.zeroCombinedUncertaintyControl.factorDiscrepancyCovariance;
zeroCombinedInput.plan.covarianceMatrix = clone(fixture.zeroCombinedUncertaintyControl.covarianceMatrix);
const zeroCombined = runCorrelatedModelDiscrepancyReference(zeroCombinedInput);
assert(zeroCombined.propagatedStandardDeviations.every((value) => value === 0), 'zero combined uncertainty must propagate zero SD');
assert(zeroCombined.lowerBounds.every((value, index) => value === zeroCombined.propagatedMeans[index]), 'zero combined lower bounds must collapse to means');
assert(zeroCombined.upperBounds.every((value, index) => value === zeroCombined.propagatedMeans[index]), 'zero combined upper bounds must collapse to means');
assert(zeroCombined.standardizedResiduals.every((value) => value === null), 'zero combined standardized residuals must be null');
assert(zeroCombined.standardizedResidualApplicability.every((value) => value === fixture.zeroCombinedUncertaintyControl.expectedStandardizedResidualApplicability), 'zero combined applicability mismatch');

const holdoutPerturbInput = baseInput();
holdoutPerturbInput.holdoutPairs[0].test.value += 50;
const holdoutPerturbed = runCorrelatedModelDiscrepancyReference(holdoutPerturbInput);
assert(predictionSignature(holdoutPerturbed) === predictionSignature(positive), 'holdout-test perturbation must not change prediction distribution');
assert(JSON.stringify(holdoutPerturbed.coverageIndicators) !== JSON.stringify(positive.coverageIndicators), 'holdout-test perturbation must change coverage diagnostics');

const correlationPerturbInput = baseInput();
correlationPerturbInput.plan.correlationCoefficient = 0.2;
correlationPerturbInput.plan.factorDiscrepancyCovariance = 0.012;
correlationPerturbInput.plan.covarianceMatrix = [[0.0004, 0.012], [0.012, 9]];
const correlationPerturbed = runCorrelatedModelDiscrepancyReference(correlationPerturbInput);
assertNumericArray(correlationPerturbed.propagatedMeans, positive.propagatedMeans, 'correlation perturbation mean invariance');
assertNumericArray(correlationPerturbed.factorVarianceContributions, positive.factorVarianceContributions, 'correlation perturbation factor variance invariance');
assertNumericArray(correlationPerturbed.discrepancyVarianceContributions, positive.discrepancyVarianceContributions, 'correlation perturbation discrepancy variance invariance');
assert(JSON.stringify(correlationPerturbed.covarianceCrossTermContributions) !== JSON.stringify(positive.covarianceCrossTermContributions), 'correlation perturbation must change cross terms');
assert(JSON.stringify(correlationPerturbed.combinedVariances) !== JSON.stringify(positive.combinedVariances), 'correlation perturbation must change combined variances');
assert(JSON.stringify(halfWidths(correlationPerturbed)) !== JSON.stringify(halfWidths(positive)), 'correlation perturbation must change interval widths');

const factorMeanPerturbInput = baseInput();
factorMeanPerturbInput.factorDistribution.mean += 0.01;
const factorMeanPerturbed = runCorrelatedModelDiscrepancyReference(factorMeanPerturbInput);
assert(JSON.stringify(factorMeanPerturbed.propagatedMeans) !== JSON.stringify(positive.propagatedMeans), 'factor-mean perturbation must change means');
assertNumericArray(factorMeanPerturbed.combinedVariances, positive.combinedVariances, 'factor mean perturbation variance invariance');

const factorSdPerturbInput = baseInput();
factorSdPerturbInput.factorDistribution.standardDeviation = 0.03;
factorSdPerturbInput.plan.factorDiscrepancyCovariance = 0.027;
factorSdPerturbInput.plan.covarianceMatrix = [[0.0009, 0.027], [0.027, 9]];
const factorSdPerturbed = runCorrelatedModelDiscrepancyReference(factorSdPerturbInput);
assertNumericArray(factorSdPerturbed.propagatedMeans, positive.propagatedMeans, 'factor SD perturbation mean invariance');
assert(JSON.stringify(factorSdPerturbed.factorVarianceContributions) !== JSON.stringify(positive.factorVarianceContributions), 'factor-SD perturbation must change factor variances');
assertNumericArray(factorSdPerturbed.discrepancyVarianceContributions, positive.discrepancyVarianceContributions, 'factor SD perturbation discrepancy variance invariance');
assert(JSON.stringify(factorSdPerturbed.covarianceCrossTermContributions) !== JSON.stringify(positive.covarianceCrossTermContributions), 'factor-SD perturbation must change covariance cross terms');

const discrepancyMeanPerturbInput = baseInput();
discrepancyMeanPerturbInput.discrepancyDistribution.mean += 1;
const discrepancyMeanPerturbed = runCorrelatedModelDiscrepancyReference(discrepancyMeanPerturbInput);
assert(JSON.stringify(discrepancyMeanPerturbed.propagatedMeans) !== JSON.stringify(positive.propagatedMeans), 'discrepancy-mean perturbation must change means');
assertNumericArray(discrepancyMeanPerturbed.combinedVariances, positive.combinedVariances, 'discrepancy mean perturbation variance invariance');

const discrepancySdPerturbInput = baseInput();
discrepancySdPerturbInput.discrepancyDistribution.standardDeviation = 4;
discrepancySdPerturbInput.plan.factorDiscrepancyCovariance = 0.024;
discrepancySdPerturbInput.plan.covarianceMatrix = [[0.0004, 0.024], [0.024, 16]];
const discrepancySdPerturbed = runCorrelatedModelDiscrepancyReference(discrepancySdPerturbInput);
assertNumericArray(discrepancySdPerturbed.propagatedMeans, positive.propagatedMeans, 'discrepancy SD perturbation mean invariance');
assertNumericArray(discrepancySdPerturbed.factorVarianceContributions, positive.factorVarianceContributions, 'discrepancy SD perturbation factor variance invariance');
assert(JSON.stringify(discrepancySdPerturbed.discrepancyVarianceContributions) !== JSON.stringify(positive.discrepancyVarianceContributions), 'discrepancy-SD perturbation must change discrepancy variances');
assert(JSON.stringify(discrepancySdPerturbed.covarianceCrossTermContributions) !== JSON.stringify(positive.covarianceCrossTermContributions), 'discrepancy-SD perturbation must change covariance cross terms');

const modelPerturbInput = baseInput();
modelPerturbInput.holdoutPairs[0].model.value += 1;
const modelPerturbed = runCorrelatedModelDiscrepancyReference(modelPerturbInput);
assert(modelPerturbed.propagatedMeans[0] !== positive.propagatedMeans[0], 'model perturbation must change its propagated mean');
assert(modelPerturbed.factorVarianceContributions[0] !== positive.factorVarianceContributions[0], 'model perturbation must change its factor variance contribution');
assert(modelPerturbed.covarianceCrossTermContributions[0] !== positive.covarianceCrossTermContributions[0], 'model perturbation must change its covariance cross term');
assert(nearlyEqual(modelPerturbed.discrepancyVarianceContributions[0], positive.discrepancyVarianceContributions[0]), 'model perturbation must not change discrepancy variance');
assert(nearlyEqual(modelPerturbed.propagatedMeans[1], positive.propagatedMeans[1]), 'model perturbation must not change other propagated means');

const expectFailure = (label, mutator, expectedCode) => {
  const candidate = baseInput();
  mutator(candidate);
  try {
    runCorrelatedModelDiscrepancyReference(candidate);
  } catch (error) {
    assert(error instanceof CorrelatedModelDiscrepancyError, `${label}: expected CorrelatedModelDiscrepancyError`);
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
  expectFailure('unsupported-factor-mean-source', (x) => { x.factorDistribution.meanSource = 'HOLDOUT_DERIVED'; }, 'UNSUPPORTED_FACTOR_MEAN_SOURCE'),
  expectFailure('unsupported-factor-sd-source', (x) => { x.factorDistribution.standardDeviationSource = 'HOLDOUT_DERIVED'; }, 'UNSUPPORTED_FACTOR_STANDARD_DEVIATION_SOURCE'),
  expectFailure('unsupported-discrepancy-family', (x) => { x.discrepancyDistribution.family = 'UNIFORM'; }, 'UNSUPPORTED_DISCREPANCY_DISTRIBUTION'),
  expectFailure('nonfinite-discrepancy-mean', (x) => { x.discrepancyDistribution.mean = Number.NaN; }, 'NON_FINITE_NUMBER'),
  expectFailure('negative-discrepancy-sd', (x) => { x.discrepancyDistribution.standardDeviation = -1; }, 'NEGATIVE_DISCREPANCY_STANDARD_DEVIATION'),
  expectFailure('nonfinite-discrepancy-sd', (x) => { x.discrepancyDistribution.standardDeviation = Number.POSITIVE_INFINITY; }, 'NON_FINITE_NUMBER'),
  expectFailure('unsupported-discrepancy-mean-source', (x) => { x.discrepancyDistribution.meanSource = 'HOLDOUT_DERIVED'; }, 'UNSUPPORTED_DISCREPANCY_MEAN_SOURCE'),
  expectFailure('unsupported-discrepancy-sd-source', (x) => { x.discrepancyDistribution.standardDeviationSource = 'HOLDOUT_DERIVED'; }, 'UNSUPPORTED_DISCREPANCY_STANDARD_DEVIATION_SOURCE'),
  expectFailure('invalid-required-holdout-ids', (x) => { x.plan.requiredHoldoutIds = []; }, 'INVALID_REQUIRED_HOLDOUT_IDS'),
  expectFailure('duplicate-required-holdout-id', (x) => { x.plan.requiredHoldoutIds = ['H1', 'H1']; }, 'DUPLICATE_REQUIRED_HOLDOUT_ID'),
  expectFailure('unsupported-propagation-equation', (x) => { x.plan.propagationEquation = 'OTHER'; }, 'UNSUPPORTED_PROPAGATION_EQUATION'),
  expectFailure('unsupported-dependence', (x) => { x.plan.factorDiscrepancyDependence = 'INDEPENDENT_REFERENCE_ONLY'; }, 'UNSUPPORTED_FACTOR_DISCREPANCY_DEPENDENCE'),
  expectFailure('nonfinite-rho', (x) => { x.plan.correlationCoefficient = Number.NaN; }, 'NON_FINITE_NUMBER'),
  expectFailure('invalid-rho', (x) => { x.plan.correlationCoefficient = 1; }, 'INVALID_CORRELATION_COEFFICIENT'),
  expectFailure('unsupported-correlation-source', (x) => { x.plan.correlationSource = 'HOLDOUT_DERIVED'; }, 'UNSUPPORTED_CORRELATION_SOURCE'),
  expectFailure('nonfinite-covariance', (x) => { x.plan.factorDiscrepancyCovariance = Number.NaN; }, 'NON_FINITE_NUMBER'),
  expectFailure('unsupported-covariance-source', (x) => { x.plan.covarianceSource = 'HOLDOUT_DERIVED'; }, 'UNSUPPORTED_COVARIANCE_SOURCE'),
  expectFailure('invalid-covariance-matrix-shape', (x) => { x.plan.covarianceMatrix = [[0.0004, 0.018], [0.018]]; }, 'INVALID_COVARIANCE_MATRIX_SHAPE'),
  expectFailure('nonfinite-covariance-matrix', (x) => { x.plan.covarianceMatrix[0][0] = Number.NaN; }, 'NON_FINITE_NUMBER'),
  expectFailure('nonsymmetric-covariance-matrix', (x) => { x.plan.covarianceMatrix[1][0] = 0.017; }, 'NON_SYMMETRIC_COVARIANCE_MATRIX'),
  expectFailure('covariance-marginal-variance-mismatch', (x) => { x.plan.covarianceMatrix[0][0] = 0.0005; }, 'COVARIANCE_MARGINAL_VARIANCE_MISMATCH'),
  expectFailure('covariance-plan-mismatch', (x) => { x.plan.covarianceMatrix[0][1] = 0.017; x.plan.covarianceMatrix[1][0] = 0.017; }, 'COVARIANCE_PLAN_MISMATCH'),
  expectFailure('correlation-covariance-mismatch', (x) => { x.plan.correlationCoefficient = 0.4; }, 'CORRELATION_COVARIANCE_MISMATCH'),
  expectFailure('non-positive-definite-covariance', (x) => { x.plan.correlationCoefficient = 0.99; x.plan.factorDiscrepancyCovariance = 0.0594; x.plan.covarianceMatrix[0][1] = 0.061; x.plan.covarianceMatrix[1][0] = 0.061; }, 'NON_POSITIVE_DEFINITE_COVARIANCE_MATRIX'),
  expectFailure('zero-marginal-rho-incompatibility', (x) => { x.discrepancyDistribution.standardDeviation = 0; x.plan.factorDiscrepancyCovariance = 0; x.plan.covarianceMatrix = [[0.0004, 0], [0, 0]]; }, 'CORRELATION_INCOMPATIBLE_WITH_ZERO_MARGINAL_SD'),
  expectFailure('zero-marginal-covariance-incompatibility', (x) => { x.discrepancyDistribution.standardDeviation = 0; x.plan.correlationCoefficient = 0; x.plan.factorDiscrepancyCovariance = 0.001; x.plan.covarianceMatrix = [[0.0004, 0.001], [0.001, 0]]; }, 'COVARIANCE_INCOMPATIBLE_WITH_ZERO_MARGINAL_SD'),
  expectFailure('unsupported-cross-term-convention', (x) => { x.plan.covarianceCrossTermConvention = 'OTHER'; }, 'UNSUPPORTED_COVARIANCE_CROSS_TERM_CONVENTION'),
  expectFailure('unsupported-interval-construction', (x) => { x.plan.intervalConstruction = 'ONE_SIDED'; }, 'UNSUPPORTED_INTERVAL_CONSTRUCTION'),
  expectFailure('invalid-nominal-level', (x) => { x.plan.nominalIntervalLevel = 0; }, 'INVALID_NOMINAL_INTERVAL_LEVEL'),
  expectFailure('unsupported-nominal-level', (x) => { x.plan.nominalIntervalLevel = 0.9; }, 'UNSUPPORTED_NOMINAL_INTERVAL_LEVEL'),
  expectFailure('nonfinite-normal-quantile', (x) => { x.plan.normalQuantileZ = Number.NaN; }, 'NON_FINITE_NUMBER'),
  expectFailure('invalid-normal-quantile', (x) => { x.plan.normalQuantileZ = 0; }, 'INVALID_NORMAL_QUANTILE'),
  expectFailure('unsupported-normal-quantile', (x) => { x.plan.normalQuantileZ = 1.6448536269514722; }, 'UNSUPPORTED_NORMAL_QUANTILE'),
  expectFailure('unsupported-residual-convention', (x) => { x.plan.standardizedResidualConvention = 'OTHER'; }, 'UNSUPPORTED_STANDARDIZED_RESIDUAL_CONVENTION'),
  expectFailure('holdout-derived-factor-parameters', (x) => { x.plan.holdoutDerivedFactorParametersAuthorized = true; }, 'HOLDOUT_DERIVED_FACTOR_PARAMETERS_FORBIDDEN'),
  expectFailure('holdout-derived-discrepancy-parameters', (x) => { x.plan.holdoutDerivedDiscrepancyParametersAuthorized = true; }, 'HOLDOUT_DERIVED_DISCREPANCY_PARAMETERS_FORBIDDEN'),
  expectFailure('holdout-derived-covariance-parameters', (x) => { x.plan.holdoutDerivedCovarianceParametersAuthorized = true; }, 'HOLDOUT_DERIVED_COVARIANCE_PARAMETERS_FORBIDDEN'),
  expectFailure('missing-holdout-pairs', (x) => { x.holdoutPairs = null; }, 'MISSING_HOLDOUT_PAIRS'),
  expectFailure('duplicate-holdout-id', (x) => { x.holdoutPairs[1].id = 'H1'; }, 'DUPLICATE_HOLDOUT_ID'),
  expectFailure('unexpected-holdout-id', (x) => { x.holdoutPairs[0].id = 'HX'; }, 'UNEXPECTED_HOLDOUT_ID'),
  expectFailure('missing-required-holdout-id', (x) => { x.holdoutPairs.pop(); }, 'MISSING_HOLDOUT_ID'),
  expectFailure('pair-binding-mismatch', (x) => { x.holdoutPairs[0].model.pairId = 'H2'; }, 'PAIR_BINDING_MISMATCH'),
  expectFailure('unit-mismatch', (x) => { x.holdoutPairs[0].model.unit = 'OTHER'; }, 'UNIT_MISMATCH'),
  expectFailure('duplicate-provenance', (x) => { x.holdoutPairs[1].model.provenance = x.holdoutPairs[0].model.provenance; }, 'DUPLICATE_PROVENANCE'),
  expectFailure('nonfinite-model-value', (x) => { x.holdoutPairs[0].model.value = Number.NaN; }, 'NON_FINITE_NUMBER'),
  expectFailure('nonfinite-test-value', (x) => { x.holdoutPairs[0].test.value = Number.POSITIVE_INFINITY; }, 'NON_FINITE_NUMBER'),
  expectFailure('missing-reference-authority', (x) => { x.authority.referenceCorrelatedModelDiscrepancyExecutionAuthorized = false; }, 'REFERENCE_AUTHORITY_REQUIRED'),
  expectFailure('production-correlation-leak', (x) => { x.authority.productionCorrelationModelAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-discrepancy-leak', (x) => { x.authority.productionModelDiscrepancyAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-calibration-leak', (x) => { x.authority.productionCalibrationFactorAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-statistical-leak', (x) => { x.authority.productionStatisticalExecutionAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-source-count-leak', (x) => { x.authority.activeProductionNumericStochasticSourceCount = 1; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-sensitivity-leak', (x) => { x.authority.productionSensitivityAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-validation-leak', (x) => { x.authority.productionValidationAcceptanceAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-reliability-target-leak', (x) => { x.authority.productionReliabilityTargetAuthority = 'SYNTHETIC'; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-code-design-leak', (x) => { x.authority.productionCodeDesignBasisAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('b03-leak', (x) => { x.authority.b03ActivationAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('release-leak', (x) => { x.authority.programReleaseAuthority = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('temperature-leak', (x) => { x.authority.programTemperatureAuthority = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
];

assert(negativeCases.length === fixture.negativeCaseCount, `negative-case count mismatch: ${negativeCases.length} vs ${fixture.negativeCaseCount}`);

console.log(JSON.stringify({
  schema: 'lafea-uq-reference-correlated-model-discrepancy-check/v1',
  issue: fixture.issue,
  parentIssue: fixture.parentIssue,
  dependencyIssue: fixture.dependencyIssue,
  caseId: fixture.caseId,
  status: 'PASS',
  referenceCorrelatedModelDiscrepancyQualified: true,
  referenceCorrelatedModelDiscrepancyExecutionAuthorized: fixture.referenceCorrelatedModelDiscrepancyExecutionAuthorized,
  factorDistribution: positive.factorDistribution,
  discrepancyDistribution: positive.discrepancyDistribution,
  correlationSummary: {
    correlationCoefficient: positive.correlationCoefficient,
    factorDiscrepancyCovariance: positive.factorDiscrepancyCovariance,
    covarianceMatrix: positive.covarianceMatrix,
    covarianceDeterminant: positive.covarianceDeterminant,
  },
  propagationSummary: {
    factorVarianceContributions: positive.factorVarianceContributions,
    discrepancyVarianceContributions: positive.discrepancyVarianceContributions,
    covarianceCrossTermContributions: positive.covarianceCrossTermContributions,
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
  covarianceMatrixQualified: true,
  varianceDecompositionQualified: true,
  intervalSymmetryQualified: true,
  consistentHoldoutPermutationExact: true,
  independenceReductionToModelDiscrepancyReferenceExact: true,
  covarianceSignCausalityQualified: true,
  factorOnlyReductionExact: true,
  zeroCombinedUncertaintyControlQualified: true,
  zeroCombinedUncertaintyStandardizedResidualApplicability: fixture.zeroCombinedUncertaintyControl.expectedStandardizedResidualApplicability,
  holdoutPerturbationLeavesPredictionDistributionExact: true,
  holdoutPerturbationChangesCoverageDiagnostics: true,
  correlationPerturbationCausalityQualified: true,
  factorMeanPerturbationCausalityQualified: true,
  factorStandardDeviationPerturbationCausalityQualified: true,
  discrepancyMeanPerturbationCausalityQualified: true,
  discrepancyStandardDeviationPerturbationCausalityQualified: true,
  modelPerturbationCausalityQualified: true,
  negativeCaseCount: negativeCases.length,
  correlatedModelDiscrepancyPlanFailClosedQualified: true,
  universalProductionCoverageTarget: fixture.universalProductionCoverageTarget,
  productionCorrelationModelAuthorized: fixture.productionCorrelationModelAuthorized,
  productionModelDiscrepancyAuthorized: fixture.productionModelDiscrepancyAuthorized,
  productionCalibrationFactorAuthorized: fixture.productionCalibrationFactorAuthorized,
  productionStatisticalExecutionAuthorized: fixture.productionStatisticalExecutionAuthorized,
  activeProductionNumericStochasticSourceCount: fixture.activeProductionNumericStochasticSourceCount,
  productionSensitivityAuthorized: fixture.productionSensitivityAuthorized,
  productionValidationAcceptanceAuthorized: fixture.productionValidationAcceptanceAuthorized,
  productionReliabilityTargetAuthority: fixture.productionReliabilityTargetAuthority,
  productionCodeDesignBasisAuthorized: fixture.productionCodeDesignBasisAuthorized,
  productionApplicabilityBlocker: fixture.productionApplicabilityBlocker,
  nextBoundary: fixture.nextBoundary,
}));
