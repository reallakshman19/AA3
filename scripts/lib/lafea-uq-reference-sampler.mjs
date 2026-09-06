import assert from 'node:assert/strict';

const UINT32_RANGE = 2 ** 32;

export function createXorShift32(seedUint32) {
  let state = Number(seedUint32) >>> 0;
  assert.notEqual(state, 0, 'xorshift32 seed must be nonzero');

  return function nextUint32() {
    let x = state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    state = x >>> 0;
    return state;
  };
}

export function createStandardNormalGenerator(seedUint32) {
  const nextUint32 = createXorShift32(seedUint32);
  let spare = null;

  return function nextStandardNormal() {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }

    const u1 = (nextUint32() + 0.5) / UINT32_RANGE;
    const u2 = (nextUint32() + 0.5) / UINT32_RANGE;
    const radius = Math.sqrt(-2 * Math.log(u1));
    const angle = 2 * Math.PI * u2;
    const z0 = radius * Math.cos(angle);
    const z1 = radius * Math.sin(angle);
    spare = z1;
    return z0;
  };
}

export function quantileType7(sortedValues, probability) {
  assert.ok(sortedValues.length > 0, 'quantile requires at least one value');
  assert.ok(probability >= 0 && probability <= 1, 'quantile probability must be in [0,1]');

  if (sortedValues.length === 1) return sortedValues[0];
  const h = (sortedValues.length - 1) * probability;
  const lower = Math.floor(h);
  const upper = Math.ceil(h);
  if (lower === upper) return sortedValues[lower];
  const fraction = h - lower;
  return sortedValues[lower] + fraction * (sortedValues[upper] - sortedValues[lower]);
}

function summarize(values, runningMean, runningM2) {
  const n = values.length;
  assert.ok(n > 1, 'reference summary requires at least two samples');
  const sorted = [...values].sort((a, b) => a - b);
  const sampleVariance = runningM2 / (n - 1);
  const sampleStandardDeviation = Math.sqrt(sampleVariance);

  return {
    n,
    meanMm: runningMean,
    sampleStandardDeviationMm: sampleStandardDeviation,
    p05Mm: quantileType7(sorted, 0.05),
    p50Mm: quantileType7(sorted, 0.5),
    p95Mm: quantileType7(sorted, 0.95),
    minimumMm: sorted[0],
    maximumMm: sorted[sorted.length - 1],
  };
}

export function runInverseEReferenceSampling({
  seedUint32,
  sampleCounts,
  logMeanE,
  logStandardDeviationE,
  responseConstantK_MPa_mm,
}) {
  assert.ok(Array.isArray(sampleCounts) && sampleCounts.length > 0, 'sampleCounts required');
  const counts = [...sampleCounts];
  for (let index = 0; index < counts.length; index += 1) {
    assert.ok(Number.isInteger(counts[index]) && counts[index] > 1, 'sample count must be integer > 1');
    if (index > 0) assert.ok(counts[index] > counts[index - 1], 'sample counts must increase');
  }
  assert.ok(Number.isFinite(logMeanE), 'finite logMeanE required');
  assert.ok(Number.isFinite(logStandardDeviationE) && logStandardDeviationE > 0, 'positive finite logStandardDeviationE required');
  assert.ok(Number.isFinite(responseConstantK_MPa_mm) && responseConstantK_MPa_mm > 0, 'positive finite response constant required');

  const nextNormal = createStandardNormalGenerator(seedUint32);
  const values = [];
  const summaries = [];
  let mean = 0;
  let m2 = 0;
  let checkpointIndex = 0;
  const finalCount = counts[counts.length - 1];

  for (let i = 1; i <= finalCount; i += 1) {
    const z = nextNormal();
    const elasticModulusMPa = Math.exp(logMeanE + logStandardDeviationE * z);
    const deflectionMm = responseConstantK_MPa_mm / elasticModulusMPa;
    assert.ok(Number.isFinite(elasticModulusMPa) && elasticModulusMPa > 0, 'generated E must be finite and positive');
    assert.ok(Number.isFinite(deflectionMm) && deflectionMm > 0, 'generated D must be finite and positive');

    values.push(deflectionMm);
    const delta = deflectionMm - mean;
    mean += delta / i;
    const delta2 = deflectionMm - mean;
    m2 += delta * delta2;

    if (i === counts[checkpointIndex]) {
      summaries.push(summarize(values, mean, m2));
      checkpointIndex += 1;
    }
  }

  assert.equal(checkpointIndex, counts.length, 'all sample checkpoints must be summarized');
  return summaries;
}
