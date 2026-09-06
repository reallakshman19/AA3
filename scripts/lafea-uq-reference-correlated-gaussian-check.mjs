import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  CovarianceValidationError,
  correlationToCovariance,
  runCorrelatedGaussianReferenceSampling,
  validateCorrelationSpec,
  validateCovarianceSpec,
} from './lib/lafea-uq-reference-correlated-gaussian.mjs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
const referenceCase = readJson('../validation/lafea-benchmark-data/UQ/reference/UQ-REF-CORRELATED-GAUSSIAN-01.json');
const sourceRegistry = readJson('../validation/lafea-benchmark-data/UQ/sources/source-registry.json');
const productionInputs = readJson('../validation/lafea-benchmark-data/UQ/inputs/uncertainty-models.json');
const productionCorrelations = readJson('../validation/lafea-benchmark-data/UQ/inputs/correlation-models.json');
const program = readJson('../validation/lafea-benchmark-program/program.json');

const close = (actual, expected, tolerance, label) => {
  const scale = Math.max(1, Math.abs(expected));
  assert.ok(Math.abs(actual - expected) <= tolerance * scale, `${label}: ${actual} != ${expected}`);
};
const matrixClose = (actual, expected, tolerance, label) => {
  assert.equal(actual.length, expected.length, `${label} row dimension`);
  for (let i = 0; i < expected.length; i += 1) {
    assert.equal(actual[i].length, expected[i].length, `${label}[${i}] column dimension`);
    for (let j = 0; j < expected[i].length; j += 1) close(actual[i][j], expected[i][j], tolerance, `${label}[${i}][${j}]`);
  }
};
const matVec = (matrix, vector, offset) => matrix.map((row, i) => row.reduce((sum, value, j) => sum + value * vector[j], offset[i]));
const matMul = (a, b) => a.map((row) => b[0].map((_, j) => row.reduce((sum, value, k) => sum + value * b[k][j], 0)));
const transpose = (matrix) => matrix[0].map((_, j) => matrix.map((row) => row[j]));

assert.equal(referenceCase.schema, 'lafea-uq-correlated-gaussian-reference/v1');
assert.equal(referenceCase.issue, 1685);
assert.equal(referenceCase.parentIssue, 1673);
assert.equal(referenceCase.caseId, 'UQ-REF-CORRELATED-GAUSSIAN-01');
assert.equal(referenceCase.definitionState, 'FROZEN_BEFORE_EXECUTION');
assert.equal(referenceCase.authorityClass, 'REFERENCE_BENCHMARK_ONLY');
assert.equal(referenceCase.productionOutputUsedToChooseDefinition, false);
assert.equal(referenceCase.authority.referenceCorrelatedStatisticalExecutionAuthorized, true);
assert.equal(referenceCase.authority.productionStatisticalExecutionAuthorized, false);
assert.equal(referenceCase.authority.productionSensitivityAuthorized, false);
assert.equal(referenceCase.authority.reliabilityTargetAuthorized, false);
assert.equal(referenceCase.authority.codeQualificationAuthorized, false);
assert.equal(referenceCase.authority.releaseAuthorityGranted, false);
assert.equal(referenceCase.authority.temperatureAuthorityGranted, false);

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

const tolerance = referenceCase.acceptance.analyticReconstructionRelativeTolerance;
const covarianceFromCorrelation = correlationToCovariance({
  variableIds: referenceCase.variableIds,
  standardDeviation: referenceCase.inputModel.standardDeviation,
  correlation: referenceCase.inputModel.correlation,
  symmetryTolerance: referenceCase.acceptance.symmetryAbsoluteTolerance,
});
matrixClose(covarianceFromCorrelation, referenceCase.inputModel.covariance, tolerance, 'input covariance reconstruction');
validateCovarianceSpec({
  variableIds: referenceCase.variableIds,
  covariance: referenceCase.inputModel.covariance,
  symmetryTolerance: referenceCase.acceptance.symmetryAbsoluteTolerance,
  requirePositiveDefinite: true,
});

const reconstructedOutputMean = matVec(
  referenceCase.linearTransform.matrixA,
  referenceCase.inputModel.mean,
  referenceCase.linearTransform.offsetD,
);
const reconstructedOutputCovariance = matMul(
  matMul(referenceCase.linearTransform.matrixA, referenceCase.inputModel.covariance),
  transpose(referenceCase.linearTransform.matrixA),
);
reconstructedOutputMean.forEach((value, index) => close(value, referenceCase.analyticalOracle.outputMean[index], tolerance, `output mean[${index}]`));
matrixClose(reconstructedOutputCovariance, referenceCase.analyticalOracle.outputCovariance, tolerance, 'output covariance');

const args = {
  seedUint32: referenceCase.samplingPlan.seedUint32,
  sampleCounts: referenceCase.samplingPlan.sampleCounts,
  variableIds: referenceCase.variableIds,
  expectedVariableIds: referenceCase.variableIds,
  mean: referenceCase.inputModel.mean,
  covariance: referenceCase.inputModel.covariance,
  transformMatrix: referenceCase.linearTransform.matrixA,
  transformOffset: referenceCase.linearTransform.offsetD,
  symmetryTolerance: referenceCase.acceptance.symmetryAbsoluteTolerance,
};
const firstRun = runCorrelatedGaussianReferenceSampling(args);
const replayRun = runCorrelatedGaussianReferenceSampling(args);
assert.deepEqual(replayRun, firstRun, 'same-seed correlated reference replay must match exactly');
const alternateSeedRun = runCorrelatedGaussianReferenceSampling({ ...args, seedUint32: (args.seedUint32 + 1) >>> 0 });
assert.notDeepEqual(alternateSeedRun.at(-1), firstRun.at(-1), 'different seed must change the retained correlated-reference summary');

const final = firstRun.at(-1);
const n = referenceCase.samplingPlan.finalSampleCount;
assert.equal(final.n, n);
const inputOracle = referenceCase.analyticalOracle.inputCovariance;
const outputOracle = referenceCase.analyticalOracle.outputCovariance;
const normalizedErrors = {};
for (let i = 0; i < 2; i += 1) {
  const inputMeanSe = Math.sqrt(inputOracle[i][i] / n);
  normalizedErrors[`inputMean${i}`] = Math.abs(final.input.mean[i] - referenceCase.analyticalOracle.inputMean[i]) / inputMeanSe;
  const outputMeanSe = Math.sqrt(outputOracle[i][i] / n);
  normalizedErrors[`outputMean${i}`] = Math.abs(final.output.mean[i] - referenceCase.analyticalOracle.outputMean[i]) / outputMeanSe;
  for (let j = i; j < 2; j += 1) {
    const inputCovSe = Math.sqrt((inputOracle[i][j] ** 2 + inputOracle[i][i] * inputOracle[j][j]) / (n - 1));
    normalizedErrors[`inputCov${i}${j}`] = Math.abs(final.input.covariance[i][j] - inputOracle[i][j]) / inputCovSe;
    const outputCovSe = Math.sqrt((outputOracle[i][j] ** 2 + outputOracle[i][i] * outputOracle[j][j]) / (n - 1));
    normalizedErrors[`outputCov${i}${j}`] = Math.abs(final.output.covariance[i][j] - outputOracle[i][j]) / outputCovSe;
  }
}
const targetRho = referenceCase.analyticalOracle.inputCorrelationX1X2;
normalizedErrors.inputCorrelationX1X2 = Math.abs(Math.atanh(final.inputCorrelationX1X2) - Math.atanh(targetRho)) * Math.sqrt(n - 3);
for (const [metric, value] of Object.entries(normalizedErrors)) {
  assert.ok(Number.isFinite(value), `${metric} normalized error must be finite`);
  assert.ok(value <= referenceCase.acceptance.finalNormalizedErrorMaximum, `${metric} normalized error ${value} exceeds ${referenceCase.acceptance.finalNormalizedErrorMaximum}`);
}

const expectCode = (fn, code, path) => {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof CovarianceValidationError);
    assert.equal(error.code, code);
    if (path) assert.equal(error.path, path);
    return true;
  });
};

expectCode(() => validateCovarianceSpec({ variableIds: ['X1', 'X2'], covariance: [[1, 0], [0]], requirePositiveDefinite: true }), 'NON_SQUARE_MATRIX', '$.covariance[1]');
expectCode(() => validateCovarianceSpec({ variableIds: ['X1', 'X2'], covariance: [[1]], requirePositiveDefinite: true }), 'DIMENSION_MISMATCH', '$.covariance');
expectCode(() => validateCovarianceSpec({ variableIds: ['X1', 'X2'], covariance: [[1, 0.2], [0.3, 1]], requirePositiveDefinite: true }), 'NON_SYMMETRIC_MATRIX', '$.covariance[0][1]');
expectCode(() => validateCovarianceSpec({ variableIds: ['X1', 'X2'], covariance: [[-1, 0], [0, 1]], requirePositiveDefinite: true }), 'NEGATIVE_VARIANCE', '$.covariance[0][0]');
expectCode(() => validateCorrelationSpec({ variableIds: ['X1', 'X2'], correlation: [[1, 1.2], [1.2, 1]], requirePositiveDefinite: true }), 'CORRELATION_OUT_OF_RANGE', '$.correlation[0][1]');
expectCode(() => validateCorrelationSpec({ variableIds: ['X1', 'X2'], correlation: [[1, 0.2], [0.2, 0.9]], requirePositiveDefinite: true }), 'NON_UNIT_DIAGONAL', '$.correlation[1][1]');
expectCode(() => validateCorrelationSpec({ variableIds: ['X1', 'X2', 'X3'], correlation: [[1, 0.9, 0.9], [0.9, 1, -0.9], [0.9, -0.9, 1]], requirePositiveDefinite: true }), 'NOT_POSITIVE_DEFINITE', '$.correlation');
expectCode(() => validateCovarianceSpec({ variableIds: ['X1', 'X1'], covariance: [[1, 0], [0, 1]], requirePositiveDefinite: true }), 'DUPLICATE_VARIABLE_ID', '$.variableIds[1]');
expectCode(() => validateCovarianceSpec({ variableIds: ['X1', ''], covariance: [[1, 0], [0, 1]], requirePositiveDefinite: true }), 'MISSING_VARIABLE_ID', '$.variableIds[1]');
expectCode(() => validateCovarianceSpec({ variableIds: ['X1', 'X2'], covariance: [[1, Number.NaN], [Number.NaN, 1]], requirePositiveDefinite: true }), 'NON_NUMERIC_ENTRY', '$.covariance[0][1]');
expectCode(() => validateCovarianceSpec({ variableIds: ['X1', 'X2'], covariance: [[1, 1], [1, 1]], requirePositiveDefinite: true }), 'NOT_POSITIVE_DEFINITE', '$.covariance');
expectCode(() => runCorrelatedGaussianReferenceSampling({ ...args, expectedVariableIds: ['X2', 'X1'] }), 'VARIABLE_ORDER_MISMATCH', '$.variableIds');

console.log(JSON.stringify({
  schema: 'lafea-uq-reference-correlated-gaussian-check/v1',
  issue: 1685,
  parentIssue: 1673,
  caseId: referenceCase.caseId,
  status: 'PASS',
  referenceCorrelatedStatisticalExecutionAuthorized: true,
  productionStatisticalExecutionAuthorized: false,
  finalSampleCount: final.n,
  finalSummary: final,
  analyticalOracle: referenceCase.analyticalOracle,
  finalNormalizedErrors: normalizedErrors,
  normalizedErrorMaximum: referenceCase.acceptance.finalNormalizedErrorMaximum,
  sameSeedReplayExact: true,
  differentSeedSummaryChanged: true,
  negativeCaseCount: 12,
  covarianceFailClosedQualified: true,
  activeProductionNumericStochasticSourceCount: sourceRegistry.numericStochasticSourceCount,
  productionApplicabilityBlocker: 'ENGINEERING_POPULATION_APPLICABILITY_REQUIRED',
  nextBoundary: 'RECONCILE_REFERENCE_CORRELATED_PASS_TO_PARENT_1673_AND_PLAN_NEXT_REFERENCE_ENGINE_CASE',
}));
