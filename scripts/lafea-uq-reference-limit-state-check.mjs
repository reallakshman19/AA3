import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  ReferenceLimitStateValidationError,
  evaluateZeroVarianceControl,
  inverseStandardNormal,
  reconstructIndependentGaussianLimitState,
  runGaussianLimitStateSampling,
  standardNormalPdf,
  validateReferenceAuthority,
} from './lib/lafea-uq-reference-limit-state.mjs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
const referenceCase = readJson('../validation/lafea-benchmark-data/UQ/reference/UQ-REF-GAUSSIAN-LIMIT-01.json');
const sourceRegistry = readJson('../validation/lafea-benchmark-data/UQ/sources/source-registry.json');
const productionInputs = readJson('../validation/lafea-benchmark-data/UQ/inputs/uncertainty-models.json');
const productionCorrelations = readJson('../validation/lafea-benchmark-data/UQ/inputs/correlation-models.json');
const program = readJson('../validation/lafea-benchmark-program/program.json');

const close = (actual, expected, tolerance, label) => {
  const scale = Math.max(1, Math.abs(expected));
  assert.ok(Math.abs(actual - expected) <= tolerance * scale, `${label}: ${actual} != ${expected}`);
};

assert.equal(referenceCase.schema, 'lafea-uq-reference-limit-state/v1');
assert.equal(referenceCase.issue, 1689);
assert.equal(referenceCase.parentIssue, 1673);
assert.equal(referenceCase.dependencyIssue, 1685);
assert.equal(referenceCase.caseId, 'UQ-REF-GAUSSIAN-LIMIT-01');
assert.equal(referenceCase.definitionState, 'FROZEN_BEFORE_EXECUTION');
assert.equal(referenceCase.authorityClass, 'REFERENCE_BENCHMARK_ONLY');
assert.equal(referenceCase.productionOutputUsedToChooseDefinition, false);
assert.equal(referenceCase.authority.referenceLimitStateStatisticalExecutionAuthorized, true);
assert.equal(referenceCase.authority.productionStatisticalExecutionAuthorized, false);
assert.equal(referenceCase.authority.productionReliabilityTargetAuthorized, false);
assert.equal(referenceCase.authority.productionSensitivityAuthorized, false);
assert.equal(referenceCase.authority.codeQualificationAuthorized, false);
assert.equal(referenceCase.authority.releaseAuthorityGranted, false);
assert.equal(referenceCase.authority.temperatureAuthorityGranted, false);
validateReferenceAuthority({ productionReliabilityTarget: null });

assert.equal(sourceRegistry.numericStochasticSourceCount, 0);
assert.equal(sourceRegistry.statisticalExecutionAuthorized, false);
assert.equal(productionInputs.statisticalExecutionAuthorized, false);
for (const input of productionInputs.inputs) {
  assert.equal(input.stochasticSourceId, null, `production stochastic source unexpectedly activated: ${input.inputId}`);
  assert.equal(input.sourceAuthorityState, 'BLOCKED_SOURCE_AUTHORITY', `production source authority changed: ${input.inputId}`);
}
assert.equal(productionCorrelations.defaultCorrelationPolicy, 'UNSPECIFIED_IS_UNKNOWN_NOT_ZERO');
assert.equal(productionCorrelations.statisticalExecutionAuthorized, false);
for (const pair of productionCorrelations.correlationCandidates) {
  assert.equal(pair.correlationCoefficient, null, `production correlation unexpectedly activated: ${pair.pairId}`);
  assert.equal(pair.stochasticSourceId, null, `production correlation source unexpectedly activated: ${pair.pairId}`);
  assert.equal(pair.authorityState, 'BLOCKED_SOURCE_AUTHORITY', `production correlation authority changed: ${pair.pairId}`);
}
assert.equal(program.activeCaseId, 'B02');
assert.deepEqual(program.futureQueue.map((row) => row.caseId), ['B03', 'B04', 'B05', 'B06']);
assert.equal(program.evidencePolicy.releaseAuthorityGrantedByProgram, false);
assert.equal(program.evidencePolicy.temperatureAuthorityGrantedByProgram, false);

const analytic = reconstructIndependentGaussianLimitState({
  distributions: referenceCase.inputModel.distributions,
  coefficients: referenceCase.limitState.coefficients,
  offset: referenceCase.limitState.offset,
});
const tolerance = referenceCase.acceptance.analyticReconstructionRelativeTolerance;
close(analytic.mean, referenceCase.analyticalOracle.limitStateMean, tolerance, 'limit-state mean');
close(analytic.variance, referenceCase.analyticalOracle.limitStateVariance, tolerance, 'limit-state variance');
close(analytic.standardDeviation, referenceCase.analyticalOracle.limitStateStandardDeviation, tolerance, 'limit-state standard deviation');
close(analytic.beta, referenceCase.analyticalOracle.reliabilityIndexBeta, tolerance, 'analytical beta');
assert.ok(
  Math.abs(analytic.failureProbability - referenceCase.analyticalOracle.failureProbability) <= referenceCase.acceptance.normalTailAbsoluteTolerance,
  `analytical Pf ${analytic.failureProbability} != ${referenceCase.analyticalOracle.failureProbability}`,
);
assert.ok(
  Math.abs(-inverseStandardNormal(referenceCase.analyticalOracle.failureProbability) - referenceCase.analyticalOracle.reliabilityIndexBeta) <= 1e-8,
  'beta = -Phi^-1(Pf) reconstruction failed',
);

const baseArgs = {
  seedUint32: referenceCase.samplingPlan.seedUint32,
  sampleCounts: referenceCase.samplingPlan.sampleCounts,
  variableIds: referenceCase.variableIds,
  expectedVariableIds: referenceCase.variableIds,
  canonicalDrawOrder: referenceCase.canonicalDrawOrder,
  distributions: referenceCase.inputModel.distributions,
  coefficients: referenceCase.limitState.coefficients,
  offset: referenceCase.limitState.offset,
  failureOperator: referenceCase.limitState.failureOperator,
  failureThreshold: referenceCase.limitState.failureThreshold,
};

const firstRun = runGaussianLimitStateSampling(baseArgs);
const replayRun = runGaussianLimitStateSampling(baseArgs);
assert.deepEqual(replayRun, firstRun, 'same-seed limit-state replay must match exactly');
const alternateSeedRun = runGaussianLimitStateSampling({ ...baseArgs, seedUint32: baseArgs.seedUint32 + 1 });
assert.notDeepEqual(alternateSeedRun.at(-1), firstRun.at(-1), 'different seed must change the retained limit-state summary');

const final = firstRun.at(-1);
const n = referenceCase.samplingPlan.finalSampleCount;
assert.equal(final.n, n);
assert.ok(final.failureCount > 0, 'final sample must contain observed failures for finite beta estimation');
assert.ok(final.failureCount < n, 'final sample must contain non-failures for finite beta estimation');
const expectedFailureCount = referenceCase.analyticalOracle.failureProbability * n;
assert.ok(expectedFailureCount >= referenceCase.acceptance.minimumExpectedFailureCount, 'sample plan has insufficient expected failures');

const pfOracle = referenceCase.analyticalOracle.failureProbability;
const betaOracle = referenceCase.analyticalOracle.reliabilityIndexBeta;
const varianceOracle = referenceCase.analyticalOracle.limitStateVariance;
const meanSe = Math.sqrt(varianceOracle / n);
const varianceSe = Math.sqrt((2 * varianceOracle * varianceOracle) / (n - 1));
const pfSe = Math.sqrt((pfOracle * (1 - pfOracle)) / n);
const betaSe = pfSe / standardNormalPdf(betaOracle);
const normalizedErrors = {
  limitStateMean: Math.abs(final.limitStateMean - referenceCase.analyticalOracle.limitStateMean) / meanSe,
  limitStateVariance: Math.abs(final.limitStateVariance - varianceOracle) / varianceSe,
  failureProbability: Math.abs(final.failureProbability - pfOracle) / pfSe,
  reliabilityIndexBeta: Math.abs(final.beta - betaOracle) / betaSe,
};
for (const [metric, value] of Object.entries(normalizedErrors)) {
  assert.ok(Number.isFinite(value), `${metric} normalized error must be finite`);
  assert.ok(value <= referenceCase.acceptance.finalNormalizedErrorMaximum, `${metric} normalized error ${value} exceeds ${referenceCase.acceptance.finalNormalizedErrorMaximum}`);
}
const bernoulliRelativeStandardError = Math.sqrt((1 - pfOracle) / (n * pfOracle));

const zeroControl = evaluateZeroVarianceControl(referenceCase.zeroVarianceControl);
assert.equal(zeroControl.g, referenceCase.zeroVarianceControl.expectedG);
assert.equal(zeroControl.variance, referenceCase.zeroVarianceControl.expectedVariance);
assert.equal(zeroControl.failureProbability, referenceCase.zeroVarianceControl.expectedFailureProbability);
assert.equal(zeroControl.beta, null);
assert.equal(zeroControl.betaApplicability, referenceCase.zeroVarianceControl.betaApplicability);

const permutation = referenceCase.permutationControl;
const permutedRun = runGaussianLimitStateSampling({
  ...baseArgs,
  variableIds: permutation.permutedVariableIds,
  expectedVariableIds: permutation.permutedVariableIds,
  distributions: permutation.permutedDistributions,
  coefficients: permutation.permutedCoefficients,
});
assert.deepEqual(permutedRun, firstRun, 'consistent semantic permutation must preserve exact retained summaries');

const expectCode = (fn, code, path) => {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof ReferenceLimitStateValidationError);
    assert.equal(error.code, code);
    if (path) assert.equal(error.path, path);
    return true;
  });
};
const cloneDistributions = () => referenceCase.inputModel.distributions.map((row) => ({ ...row }));

{
  const distributions = cloneDistributions();
  distributions[0].family = 'LOGNORMAL';
  expectCode(() => runGaussianLimitStateSampling({ ...baseArgs, distributions }), 'UNSUPPORTED_DISTRIBUTION', '$.distributions[0].family');
}
{
  const distributions = cloneDistributions();
  distributions[0].mean = Number.NaN;
  expectCode(() => runGaussianLimitStateSampling({ ...baseArgs, distributions }), 'NON_NUMERIC_PARAMETER', '$.distributions[0].mean');
}
{
  const distributions = cloneDistributions();
  distributions[0].standardDeviation = -1;
  expectCode(() => runGaussianLimitStateSampling({ ...baseArgs, distributions }), 'NEGATIVE_STANDARD_DEVIATION', '$.distributions[0].standardDeviation');
}
expectCode(() => runGaussianLimitStateSampling({ ...baseArgs, distributions: [cloneDistributions()[0]] }), 'DIMENSION_MISMATCH', '$.distributions');
expectCode(() => runGaussianLimitStateSampling({ ...baseArgs, variableIds: ['R', 'R'], expectedVariableIds: ['R', 'R'], canonicalDrawOrder: ['R', 'R'] }), 'DUPLICATE_VARIABLE_ID', '$.variableIds[1]');
expectCode(() => runGaussianLimitStateSampling({ ...baseArgs, variableIds: ['R', ''], expectedVariableIds: ['R', ''], canonicalDrawOrder: ['R', ''] }), 'MISSING_VARIABLE_ID', '$.variableIds[1]');
expectCode(() => runGaussianLimitStateSampling({ ...baseArgs, expectedVariableIds: ['S', 'R'] }), 'VARIABLE_ORDER_MISMATCH', '$.variableIds');
expectCode(() => runGaussianLimitStateSampling({ ...baseArgs, sampleCounts: [0] }), 'INVALID_SAMPLE_PLAN', '$.sampleCounts');
expectCode(() => runGaussianLimitStateSampling({ ...baseArgs, seedUint32: 0 }), 'INVALID_RANDOM_SEED', '$.seedUint32');
expectCode(() => runGaussianLimitStateSampling({ ...baseArgs, sampleCounts: [4096, 4096] }), 'INVALID_SAMPLE_PLAN', '$.sampleCounts');
expectCode(() => runGaussianLimitStateSampling({ ...baseArgs, failureOperator: '<' }), 'INVALID_FAILURE_EVENT', '$.failureOperator');
expectCode(() => inverseStandardNormal(0), 'INVALID_PF_DOMAIN', '$.failureProbability');
expectCode(() => validateReferenceAuthority({ productionReliabilityTarget: 3.8 }), 'PRODUCTION_RELIABILITY_TARGET_NOT_AUTHORIZED', '$.productionReliabilityTarget');
{
  const distributions = cloneDistributions();
  distributions[0].standardDeviation = 0;
  expectCode(() => runGaussianLimitStateSampling({ ...baseArgs, distributions }), 'ZERO_STANDARD_DEVIATION_STOCHASTIC', '$.distributions[0].standardDeviation');
}

console.log(JSON.stringify({
  schema: 'lafea-uq-reference-limit-state-check/v1',
  issue: 1689,
  parentIssue: 1673,
  dependencyIssue: 1685,
  caseId: referenceCase.caseId,
  status: 'PASS',
  referenceLimitStateQualified: true,
  referenceLimitStateStatisticalExecutionAuthorized: true,
  productionStatisticalExecutionAuthorized: false,
  activeProductionNumericStochasticSourceCount: sourceRegistry.numericStochasticSourceCount,
  analyticalOracle: referenceCase.analyticalOracle,
  finalSampleCount: final.n,
  finalSummary: final,
  expectedFailureCount,
  bernoulliRelativeStandardError,
  finalNormalizedErrors: normalizedErrors,
  normalizedErrorMaximum: referenceCase.acceptance.finalNormalizedErrorMaximum,
  sameSeedReplayExact: true,
  differentSeedSummaryChanged: true,
  zeroVarianceControlQualified: true,
  zeroVarianceBetaApplicability: zeroControl.betaApplicability,
  consistentPermutationExact: true,
  inconsistentOrderFailClosed: true,
  negativeCaseCount: 14,
  distributionSamplePlanFailClosedQualified: true,
  productionApplicabilityBlocker: 'ENGINEERING_POPULATION_APPLICABILITY_REQUIRED',
  productionReliabilityTargetAuthority: 'NONE',
  nextBoundary: 'RECONCILE_REFERENCE_LIMIT_STATE_PASS_TO_PARENT_1673_AND_PLAN_NEXT_REFERENCE_ENGINE_CASE',
}));
