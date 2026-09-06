import assert from 'node:assert/strict';
import fs from 'node:fs';

import { runInverseEReferenceSampling } from './lib/lafea-uq-reference-sampler.mjs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
const referenceCase = readJson('../validation/lafea-benchmark-data/UQ/reference/UQ-REF-E-INVERSE-01.json');
const plan = readJson('../validation/lafea-benchmark-data/UQ/reference/UQ-REF-E-INVERSE-01-sampling-plan.json');
const sourceRegistry = readJson('../validation/lafea-benchmark-data/UQ/sources/source-registry.json');
const productionInputs = readJson('../validation/lafea-benchmark-data/UQ/inputs/uncertainty-models.json');
const productionCorrelations = readJson('../validation/lafea-benchmark-data/UQ/inputs/correlation-models.json');
const program = readJson('../validation/lafea-benchmark-program/program.json');

assert.equal(referenceCase.schema, 'lafea-uq-reference-case/v1');
assert.equal(plan.schema, 'lafea-uq-reference-sampling-plan/v1');
assert.equal(referenceCase.caseId, 'UQ-REF-E-INVERSE-01');
assert.equal(plan.caseId, referenceCase.caseId);
assert.equal(plan.definitionState, 'FROZEN_BEFORE_SAMPLER_EXECUTION');
assert.equal(plan.authorityClass, 'REFERENCE_BENCHMARK_ONLY');
assert.equal(plan.productionStatisticalExecutionAuthorized, false);
assert.equal(plan.activeProductionNumericStochasticSourceCountExpected, 0);
assert.equal(plan.randomGenerator.algorithm, 'XORSHIFT32');
assert.equal(plan.randomGenerator.normalTransform, 'BOX_MULLER_COS_SIN_PAIR');
assert.equal(plan.randomGenerator.sameSeedReplayMustMatchExactly, true);
assert.equal(plan.randomGenerator.differentSeedMustChangeSummary, true);
assert.deepEqual(plan.sampling.sampleCounts, [4096, 16384, 65536, 262144]);
assert.equal(plan.sampling.finalSampleCount, 262144);
assert.equal(plan.sampling.prefixNested, true);
assert.equal(plan.sampling.sampleStandardDeviationDenominator, 'N_MINUS_1');
assert.equal(plan.sampling.empiricalQuantileEstimator, 'HYNDMAN_FAN_TYPE_7_LINEAR_INTERPOLATION');
assert.deepEqual(plan.sampling.quantileProbabilities, [0.05, 0.5, 0.95]);
assert.equal(plan.acceptance.finalNormalizedErrorMaximum, 5);
assert.equal(plan.acceptance.monotonicRawErrorReductionRequired, false);
assert.equal(plan.acceptance.sameSeedReplayExactSummaryRequired, true);
assert.equal(plan.acceptance.differentSeedSummaryDifferenceRequired, true);
assert.equal(plan.authority.referenceSamplerExecutionAuthorized, true);
assert.equal(plan.authority.productionStatisticalExecutionAuthorized, false);
assert.equal(plan.authority.productionSensitivityAuthorized, false);
assert.equal(plan.authority.reliabilityTargetAuthorized, false);
assert.equal(plan.authority.codeQualificationAuthorized, false);
assert.equal(plan.authority.releaseAuthorityGranted, false);
assert.equal(plan.authority.temperatureAuthorityGranted, false);

assert.equal(sourceRegistry.numericStochasticSourceCount, 0);
assert.equal(sourceRegistry.statisticalExecutionAuthorized, false);
assert.equal(productionInputs.statisticalExecutionAuthorized, false);
assert.equal(productionCorrelations.statisticalExecutionAuthorized, false);
for (const input of productionInputs.inputs) {
  assert.equal(input.stochasticSourceId, null, `production stochastic source unexpectedly activated: ${input.inputId}`);
  assert.equal(input.sourceAuthorityState, 'BLOCKED_SOURCE_AUTHORITY', `production source state changed: ${input.inputId}`);
}
for (const pair of productionCorrelations.correlationCandidates) {
  assert.equal(pair.correlationCoefficient, null, `production correlation unexpectedly activated: ${pair.pairId}`);
  assert.equal(pair.stochasticSourceId, null, `production correlation source unexpectedly activated: ${pair.pairId}`);
}

assert.equal(program.activeCaseId, 'B02');
assert.deepEqual(program.futureQueue.map((row) => row.caseId), ['B03', 'B04', 'B05', 'B06']);
assert.equal(program.evidencePolicy.releaseAuthorityGrantedByProgram, false);
assert.equal(program.evidencePolicy.temperatureAuthorityGrantedByProgram, false);

const samplingArgs = {
  seedUint32: plan.randomGenerator.seedUint32,
  sampleCounts: plan.sampling.sampleCounts,
  logMeanE: referenceCase.inputModel.logMean,
  logStandardDeviationE: referenceCase.inputModel.logStandardDeviation,
  responseConstantK_MPa_mm: referenceCase.deterministicReference.responseConstantK_MPa_mm,
};

const firstRun = runInverseEReferenceSampling(samplingArgs);
const replayRun = runInverseEReferenceSampling(samplingArgs);
assert.deepEqual(replayRun, firstRun, 'same-seed reference replay must match exactly');

const alternateSeedRun = runInverseEReferenceSampling({
  ...samplingArgs,
  seedUint32: (samplingArgs.seedUint32 + 1) >>> 0,
});
assert.notDeepEqual(
  alternateSeedRun.at(-1),
  firstRun.at(-1),
  'different seed must change the retained reference summary',
);

for (const summary of firstRun) {
  assert.ok(summary.minimumMm > 0 && Number.isFinite(summary.minimumMm), 'sample minimum must be finite positive');
  assert.ok(summary.maximumMm > 0 && Number.isFinite(summary.maximumMm), 'sample maximum must be finite positive');
  assert.ok(Number.isFinite(summary.meanMm) && summary.meanMm > 0, 'sample mean must be finite positive');
  assert.ok(Number.isFinite(summary.sampleStandardDeviationMm) && summary.sampleStandardDeviationMm > 0, 'sample SD must be finite positive');
  assert.ok(summary.p05Mm <= summary.p50Mm && summary.p50Mm <= summary.p95Mm, 'sample quantiles must be ordered');
}

const oracle = referenceCase.closedFormOracle;
const n = plan.sampling.finalSampleCount;
const final = firstRun.at(-1);
assert.equal(final.n, n);

const sigmaLog = referenceCase.inputModel.logStandardDeviation;
const muLogD = Math.log(referenceCase.deterministicReference.responseConstantK_MPa_mm) - referenceCase.inputModel.logMean;
const rawMoment = (order) => Math.exp(order * muLogD + 0.5 * order * order * sigmaLog * sigmaLog);
const exactMean = rawMoment(1);
const raw2 = rawMoment(2);
const raw3 = rawMoment(3);
const raw4 = rawMoment(4);
const exactVariance = raw2 - exactMean * exactMean;
const exactSd = Math.sqrt(exactVariance);
const fourthCentralMoment = raw4 - 4 * exactMean * raw3 + 6 * exactMean * exactMean * raw2 - 3 * exactMean ** 4;

const relative = (actual, expected) => Math.abs(actual - expected) / Math.max(Math.abs(expected), Number.MIN_VALUE);
assert.ok(relative(exactMean, oracle.meanMm) <= referenceCase.acceptance.analyticReconstructionRelativeTolerance, 'analytic mean reconstruction drift');
assert.ok(relative(exactVariance, oracle.varianceMm2) <= referenceCase.acceptance.analyticReconstructionRelativeTolerance, 'analytic variance reconstruction drift');
assert.ok(relative(exactSd, oracle.standardDeviationMm) <= referenceCase.acceptance.analyticReconstructionRelativeTolerance, 'analytic SD reconstruction drift');

const meanSe = oracle.standardDeviationMm / Math.sqrt(n);
const sdSe = Math.sqrt((fourthCentralMoment - oracle.varianceMm2 ** 2) / (4 * n * oracle.varianceMm2));
const lognormalDensity = (value) => (
  Math.exp(-0.5 * ((Math.log(value) - muLogD) / sigmaLog) ** 2)
  / (value * sigmaLog * Math.sqrt(2 * Math.PI))
);
const quantileSe = (probability, oracleQuantile) => (
  Math.sqrt(probability * (1 - probability) / (n * lognormalDensity(oracleQuantile) ** 2))
);

const normalizedErrors = {
  mean: Math.abs(final.meanMm - oracle.meanMm) / meanSe,
  standardDeviation: Math.abs(final.sampleStandardDeviationMm - oracle.standardDeviationMm) / sdSe,
  p05: Math.abs(final.p05Mm - oracle.p05Mm) / quantileSe(0.05, oracle.p05Mm),
  p50: Math.abs(final.p50Mm - oracle.p50Mm) / quantileSe(0.5, oracle.p50Mm),
  p95: Math.abs(final.p95Mm - oracle.p95Mm) / quantileSe(0.95, oracle.p95Mm),
};

for (const [metric, normalizedError] of Object.entries(normalizedErrors)) {
  assert.ok(Number.isFinite(normalizedError), `${metric} normalized error must be finite`);
  assert.ok(
    normalizedError <= plan.acceptance.finalNormalizedErrorMaximum,
    `${metric} normalized error ${normalizedError} exceeds ${plan.acceptance.finalNormalizedErrorMaximum}`,
  );
}

console.log(JSON.stringify({
  schema: 'lafea-uq-reference-sampler-check/v1',
  issue: 1673,
  caseId: referenceCase.caseId,
  status: 'PASS',
  seedUint32: plan.randomGenerator.seedUint32,
  sampleCounts: plan.sampling.sampleCounts,
  finalSummary: final,
  closedFormOracle: {
    meanMm: oracle.meanMm,
    standardDeviationMm: oracle.standardDeviationMm,
    p05Mm: oracle.p05Mm,
    p50Mm: oracle.p50Mm,
    p95Mm: oracle.p95Mm,
  },
  finalNormalizedErrors: normalizedErrors,
  normalizedErrorMaximum: plan.acceptance.finalNormalizedErrorMaximum,
  sameSeedReplayExact: true,
  differentSeedSummaryChanged: true,
  referenceSamplerQualified: true,
  referenceStatisticalExecutionAuthorized: true,
  productionStatisticalExecutionAuthorized: false,
  activeProductionNumericStochasticSourceCount: sourceRegistry.numericStochasticSourceCount,
  productionApplicabilityBlocker: 'ENGINEERING_POPULATION_APPLICABILITY_REQUIRED',
  nextReferenceBoundary: 'ADD_CORRELATED_GAUSSIAN_REFERENCE_CASE_AND_COVARIANCE_FAIL_CLOSED_NEGATIVES',
}));
