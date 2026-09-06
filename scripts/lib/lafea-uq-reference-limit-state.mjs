import { createXorShift32, nextNormalPair } from './lafea-uq-reference-correlated-gaussian.mjs';

export class ReferenceLimitStateValidationError extends Error {
  constructor(code, path, message) {
    super(message);
    this.name = 'ReferenceLimitStateValidationError';
    this.code = code;
    this.path = path;
  }
}

const fail = (code, path, message) => {
  throw new ReferenceLimitStateValidationError(code, path, message);
};

const finiteNumber = (value, path) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail('NON_NUMERIC_PARAMETER', path, 'value must be a finite number');
};

const validateIds = (variableIds) => {
  if (!Array.isArray(variableIds) || variableIds.length === 0) fail('MISSING_VARIABLE_ID', '$.variableIds', 'variableIds must be non-empty');
  const seen = new Set();
  variableIds.forEach((id, index) => {
    if (typeof id !== 'string' || id.length === 0) fail('MISSING_VARIABLE_ID', `$.variableIds[${index}]`, 'variable identifier is required');
    if (seen.has(id)) fail('DUPLICATE_VARIABLE_ID', `$.variableIds[${index}]`, `duplicate variable id ${id}`);
    seen.add(id);
  });
  return seen;
};

const validateSamplePlan = ({ seedUint32, sampleCounts }) => {
  if (!Number.isInteger(seedUint32) || seedUint32 < 1 || seedUint32 > 0xffffffff) {
    fail('INVALID_RANDOM_SEED', '$.seedUint32', 'seed must be an integer in [1, 2^32-1]');
  }
  if (!Array.isArray(sampleCounts) || sampleCounts.length === 0 || sampleCounts.some((n) => !Number.isInteger(n) || n < 2)) {
    fail('INVALID_SAMPLE_PLAN', '$.sampleCounts', 'sample counts must be integers >= 2');
  }
  for (let i = 1; i < sampleCounts.length; i += 1) {
    if (sampleCounts[i] <= sampleCounts[i - 1]) fail('INVALID_SAMPLE_PLAN', '$.sampleCounts', 'sample ladder must be strictly increasing');
  }
};

const validateLimitState = ({ variableIds, coefficients, offset, failureOperator, failureThreshold }) => {
  if (!Array.isArray(coefficients) || coefficients.length !== variableIds.length) {
    fail('DIMENSION_MISMATCH', '$.coefficients', 'coefficient dimension must match variableIds');
  }
  coefficients.forEach((value, index) => finiteNumber(value, `$.coefficients[${index}]`));
  finiteNumber(offset, '$.offset');
  finiteNumber(failureThreshold, '$.failureThreshold');
  if (failureOperator !== '<=' || failureThreshold !== 0) {
    fail('INVALID_FAILURE_EVENT', '$.failureOperator', 'reference case requires failure event g <= 0');
  }
};

const validateDistributions = ({ variableIds, expectedVariableIds, canonicalDrawOrder, distributions, allowZeroStandardDeviation = false }) => {
  const ids = validateIds(variableIds);
  if (JSON.stringify(variableIds) !== JSON.stringify(expectedVariableIds)) {
    fail('VARIABLE_ORDER_MISMATCH', '$.variableIds', 'variable ordering does not match expected ordering metadata');
  }
  if (!Array.isArray(canonicalDrawOrder) || canonicalDrawOrder.length !== variableIds.length || canonicalDrawOrder.some((id) => !ids.has(id))) {
    fail('DIMENSION_MISMATCH', '$.canonicalDrawOrder', 'canonical draw order must contain exactly the retained variable ids');
  }
  if (!Array.isArray(distributions) || distributions.length !== variableIds.length) {
    fail('DIMENSION_MISMATCH', '$.distributions', 'distribution dimension must match variableIds');
  }
  distributions.forEach((distribution, index) => {
    if (!distribution || distribution.variableId !== variableIds[index]) {
      fail('VARIABLE_ORDER_MISMATCH', `$.distributions[${index}].variableId`, 'distribution order must match variableIds');
    }
    if (distribution.family !== 'NORMAL') fail('UNSUPPORTED_DISTRIBUTION', `$.distributions[${index}].family`, 'only NORMAL is qualified in this reference case');
    finiteNumber(distribution.mean, `$.distributions[${index}].mean`);
    finiteNumber(distribution.standardDeviation, `$.distributions[${index}].standardDeviation`);
    if (distribution.standardDeviation < 0) fail('NEGATIVE_STANDARD_DEVIATION', `$.distributions[${index}].standardDeviation`, 'standard deviation must not be negative');
    if (!allowZeroStandardDeviation && distribution.standardDeviation === 0) {
      fail('ZERO_STANDARD_DEVIATION_STOCHASTIC', `$.distributions[${index}].standardDeviation`, 'zero-variance controls use the deterministic control path');
    }
  });
};

export function standardNormalPdf(x) {
  finiteNumber(x, '$.x');
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function erfcApprox(x) {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const value = t * Math.exp(
    -z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806
      + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))),
  );
  return x >= 0 ? value : 2 - value;
}

export function standardNormalCdf(x) {
  finiteNumber(x, '$.x');
  return 0.5 * erfcApprox(-x / Math.SQRT2);
}

export function inverseStandardNormal(p) {
  if (typeof p !== 'number' || !Number.isFinite(p) || !(p > 0 && p < 1)) {
    fail('INVALID_PF_DOMAIN', '$.failureProbability', 'inverse normal requires 0 < p < 1');
  }
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q;
  let r;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5])
      / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5])
      / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  q = p - 0.5;
  r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q
    / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

export function validateReferenceAuthority({ productionReliabilityTarget }) {
  if (productionReliabilityTarget !== null && productionReliabilityTarget !== undefined) {
    fail('PRODUCTION_RELIABILITY_TARGET_NOT_AUTHORIZED', '$.productionReliabilityTarget', 'synthetic reference cases cannot supply production reliability targets');
  }
  return true;
}

export function reconstructIndependentGaussianLimitState({ distributions, coefficients, offset = 0 }) {
  if (!Array.isArray(distributions) || !Array.isArray(coefficients) || distributions.length !== coefficients.length || distributions.length === 0) {
    fail('DIMENSION_MISMATCH', '$.distributions', 'distribution and coefficient dimensions must match');
  }
  let mean = offset;
  let variance = 0;
  distributions.forEach((distribution, index) => {
    if (distribution.family !== 'NORMAL') fail('UNSUPPORTED_DISTRIBUTION', `$.distributions[${index}].family`, 'only NORMAL is supported');
    finiteNumber(distribution.mean, `$.distributions[${index}].mean`);
    finiteNumber(distribution.standardDeviation, `$.distributions[${index}].standardDeviation`);
    finiteNumber(coefficients[index], `$.coefficients[${index}]`);
    if (distribution.standardDeviation < 0) fail('NEGATIVE_STANDARD_DEVIATION', `$.distributions[${index}].standardDeviation`, 'standard deviation must not be negative');
    mean += coefficients[index] * distribution.mean;
    variance += coefficients[index] * coefficients[index] * distribution.standardDeviation * distribution.standardDeviation;
  });
  if (!(variance > 0)) fail('ZERO_VARIANCE_RELIABILITY_METRIC_NOT_APPLICABLE', '$.distributions', 'stochastic beta/Pf require positive limit-state variance');
  const standardDeviation = Math.sqrt(variance);
  const beta = mean / standardDeviation;
  const failureProbability = standardNormalCdf(-beta);
  return { mean, variance, standardDeviation, beta, failureProbability };
}

export function evaluateZeroVarianceControl({ values, coefficients, offset = 0, failureOperator, failureThreshold }) {
  if (!Array.isArray(values) || !Array.isArray(coefficients) || values.length !== coefficients.length || values.length === 0) {
    fail('DIMENSION_MISMATCH', '$.values', 'deterministic values and coefficients must have equal nonzero length');
  }
  values.forEach((value, index) => finiteNumber(value, `$.values[${index}]`));
  coefficients.forEach((value, index) => finiteNumber(value, `$.coefficients[${index}]`));
  finiteNumber(offset, '$.offset');
  finiteNumber(failureThreshold, '$.failureThreshold');
  if (failureOperator !== '<=' || failureThreshold !== 0) fail('INVALID_FAILURE_EVENT', '$.failureOperator', 'reference control requires g <= 0');
  const g = values.reduce((sum, value, index) => sum + coefficients[index] * value, offset);
  return {
    g,
    variance: 0,
    failureProbability: g <= failureThreshold ? 1 : 0,
    beta: null,
    betaApplicability: 'NOT_APPLICABLE_ZERO_VARIANCE',
  };
}

export function runGaussianLimitStateSampling({
  seedUint32,
  sampleCounts,
  variableIds,
  expectedVariableIds,
  canonicalDrawOrder,
  distributions,
  coefficients,
  offset = 0,
  failureOperator,
  failureThreshold,
}) {
  if (variableIds.length !== 2) fail('DIMENSION_MISMATCH', '$.variableIds', 'qualified reference sampler requires exactly two variables');
  validateDistributions({ variableIds, expectedVariableIds, canonicalDrawOrder, distributions });
  validateLimitState({ variableIds, coefficients, offset, failureOperator, failureThreshold });
  validateSamplePlan({ seedUint32, sampleCounts });

  const distributionById = new Map(distributions.map((distribution) => [distribution.variableId, distribution]));
  const coefficientById = new Map(variableIds.map((id, index) => [id, coefficients[index]]));
  const nextUniform = createXorShift32(seedUint32);
  const targets = new Set(sampleCounts);
  const maxCount = sampleCounts.at(-1);
  let sumG = 0;
  let sumG2 = 0;
  let failureCount = 0;
  const summaries = [];

  for (let count = 1; count <= maxCount; count += 1) {
    const normals = nextNormalPair(nextUniform);
    const zById = new Map(canonicalDrawOrder.map((id, index) => [id, normals[index]]));
    let g = offset;
    for (const id of variableIds) {
      const distribution = distributionById.get(id);
      const value = distribution.mean + distribution.standardDeviation * zById.get(id);
      g += coefficientById.get(id) * value;
    }
    sumG += g;
    sumG2 += g * g;
    if (g <= failureThreshold) failureCount += 1;

    if (targets.has(count)) {
      const mean = sumG / count;
      const variance = (sumG2 - count * mean * mean) / (count - 1);
      const failureProbability = failureCount / count;
      const beta = failureProbability > 0 && failureProbability < 1 ? -inverseStandardNormal(failureProbability) : null;
      summaries.push({ n: count, limitStateMean: mean, limitStateVariance: variance, failureCount, failureProbability, beta });
    }
  }
  return summaries;
}
