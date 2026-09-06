export class CovarianceValidationError extends Error {
  constructor(code, path, message) {
    super(message);
    this.name = 'CovarianceValidationError';
    this.code = code;
    this.path = path;
  }
}

const fail = (code, path, message) => {
  throw new CovarianceValidationError(code, path, message);
};

const finiteNumber = (value, path) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail('NON_NUMERIC_ENTRY', path, 'matrix/vector entries must be finite numbers');
  }
};

export function validateVariableIds(variableIds) {
  if (!Array.isArray(variableIds) || variableIds.length === 0) {
    fail('MISSING_VARIABLE_ID', '$.variableIds', 'variableIds must be a non-empty array');
  }
  const seen = new Set();
  variableIds.forEach((id, index) => {
    if (typeof id !== 'string' || id.length === 0) {
      fail('MISSING_VARIABLE_ID', `$.variableIds[${index}]`, 'variable identifier is missing');
    }
    if (seen.has(id)) {
      fail('DUPLICATE_VARIABLE_ID', `$.variableIds[${index}]`, `duplicate variable identifier: ${id}`);
    }
    seen.add(id);
  });
  return variableIds.length;
}

function validateSquareMatrix(matrix, variableCount, matrixName) {
  const root = `$.${matrixName}`;
  if (!Array.isArray(matrix) || matrix.length === 0) {
    fail('NON_SQUARE_MATRIX', root, `${matrixName} must be a non-empty square matrix`);
  }
  const n = matrix.length;
  for (let i = 0; i < n; i += 1) {
    if (!Array.isArray(matrix[i]) || matrix[i].length !== n) {
      fail('NON_SQUARE_MATRIX', `${root}[${i}]`, `${matrixName} must be square`);
    }
  }
  if (n !== variableCount) {
    fail('DIMENSION_MISMATCH', root, `${matrixName} dimension must match variableIds`);
  }
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) finiteNumber(matrix[i][j], `${root}[${i}][${j}]`);
  }
  return n;
}

function validateSymmetry(matrix, matrixName, tolerance) {
  for (let i = 0; i < matrix.length; i += 1) {
    for (let j = i + 1; j < matrix.length; j += 1) {
      if (Math.abs(matrix[i][j] - matrix[j][i]) > tolerance) {
        fail('NON_SYMMETRIC_MATRIX', `$.${matrixName}[${i}][${j}]`, `${matrixName} must be symmetric`);
      }
    }
  }
}

export function choleskyPositiveDefinite(matrix, { tolerance = 1e-12, path = '$.covariance' } = {}) {
  const n = matrix.length;
  const lower = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let sum = matrix[i][j];
      for (let k = 0; k < j; k += 1) sum -= lower[i][k] * lower[j][k];
      if (i === j) {
        if (!(sum > tolerance)) {
          fail('NOT_POSITIVE_DEFINITE', path, 'matrix is not positive definite for the selected Cholesky factorization');
        }
        lower[i][j] = Math.sqrt(sum);
      } else {
        lower[i][j] = sum / lower[j][j];
      }
    }
  }
  return lower;
}

export function validateCovarianceSpec({ variableIds, covariance, symmetryTolerance = 1e-12, requirePositiveDefinite = true }) {
  const n = validateVariableIds(variableIds);
  validateSquareMatrix(covariance, n, 'covariance');
  validateSymmetry(covariance, 'covariance', symmetryTolerance);
  for (let i = 0; i < n; i += 1) {
    if (covariance[i][i] < 0) fail('NEGATIVE_VARIANCE', `$.covariance[${i}][${i}]`, 'variance must not be negative');
  }
  const factor = requirePositiveDefinite
    ? choleskyPositiveDefinite(covariance, { tolerance: symmetryTolerance, path: '$.covariance' })
    : null;
  return { dimension: n, factor };
}

export function validateCorrelationSpec({ variableIds, correlation, symmetryTolerance = 1e-12, requirePositiveDefinite = true }) {
  const n = validateVariableIds(variableIds);
  validateSquareMatrix(correlation, n, 'correlation');
  validateSymmetry(correlation, 'correlation', symmetryTolerance);
  for (let i = 0; i < n; i += 1) {
    if (Math.abs(correlation[i][i] - 1) > symmetryTolerance) {
      fail('NON_UNIT_DIAGONAL', `$.correlation[${i}][${i}]`, 'correlation diagonal must equal one');
    }
    for (let j = 0; j < n; j += 1) {
      if (correlation[i][j] < -1 - symmetryTolerance || correlation[i][j] > 1 + symmetryTolerance) {
        fail('CORRELATION_OUT_OF_RANGE', `$.correlation[${i}][${j}]`, 'correlation coefficient must lie in [-1, 1]');
      }
    }
  }
  const factor = requirePositiveDefinite
    ? choleskyPositiveDefinite(correlation, { tolerance: symmetryTolerance, path: '$.correlation' })
    : null;
  return { dimension: n, factor };
}

export function correlationToCovariance({ variableIds, standardDeviation, correlation, symmetryTolerance = 1e-12 }) {
  const n = validateVariableIds(variableIds);
  if (!Array.isArray(standardDeviation) || standardDeviation.length !== n) {
    fail('DIMENSION_MISMATCH', '$.standardDeviation', 'standardDeviation dimension must match variableIds');
  }
  standardDeviation.forEach((value, index) => {
    finiteNumber(value, `$.standardDeviation[${index}]`);
    if (!(value > 0)) fail('NON_POSITIVE_STANDARD_DEVIATION', `$.standardDeviation[${index}]`, 'standard deviation must be positive');
  });
  validateCorrelationSpec({ variableIds, correlation, symmetryTolerance, requirePositiveDefinite: true });
  const covariance = Array.from({ length: n }, (_, i) => (
    Array.from({ length: n }, (_, j) => standardDeviation[i] * standardDeviation[j] * correlation[i][j])
  ));
  validateCovarianceSpec({ variableIds, covariance, symmetryTolerance, requirePositiveDefinite: true });
  return covariance;
}

function createXorShift32(seedUint32) {
  let state = seedUint32 >>> 0;
  if (state === 0) fail('INVALID_RANDOM_SEED', '$.seedUint32', 'xorshift32 requires a nonzero seed');
  return () => {
    state ^= (state << 13) >>> 0;
    state ^= state >>> 17;
    state ^= (state << 5) >>> 0;
    state >>>= 0;
    return (state + 0.5) / 4294967296;
  };
}

function nextNormalPair(nextUniform) {
  const u1 = nextUniform();
  const u2 = nextUniform();
  const radius = Math.sqrt(-2 * Math.log(u1));
  const angle = 2 * Math.PI * u2;
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

const zeroMatrix = () => [[0, 0], [0, 0]];

function summarize(count, sums, crossSums) {
  const mean = sums.map((value) => value / count);
  const covariance = zeroMatrix();
  for (let i = 0; i < 2; i += 1) {
    for (let j = 0; j < 2; j += 1) {
      covariance[i][j] = (crossSums[i][j] - count * mean[i] * mean[j]) / (count - 1);
    }
  }
  return { mean, covariance };
}

export function runCorrelatedGaussianReferenceSampling({
  seedUint32,
  sampleCounts,
  variableIds,
  expectedVariableIds,
  mean,
  covariance,
  transformMatrix,
  transformOffset,
  symmetryTolerance = 1e-12,
}) {
  if (JSON.stringify(variableIds) !== JSON.stringify(expectedVariableIds)) {
    fail('VARIABLE_ORDER_MISMATCH', '$.variableIds', 'variable ordering does not match the frozen reference order');
  }
  if (!Array.isArray(mean) || mean.length !== 2 || variableIds.length !== 2) {
    fail('DIMENSION_MISMATCH', '$.mean', 'reference sampler currently requires exactly two variables');
  }
  mean.forEach((value, index) => finiteNumber(value, `$.mean[${index}]`));
  if (!Array.isArray(transformMatrix) || transformMatrix.length !== 2 || transformMatrix.some((row) => !Array.isArray(row) || row.length !== 2)) {
    fail('DIMENSION_MISMATCH', '$.transformMatrix', 'reference transform must be 2x2');
  }
  transformMatrix.forEach((row, i) => row.forEach((value, j) => finiteNumber(value, `$.transformMatrix[${i}][${j}]`)));
  if (!Array.isArray(transformOffset) || transformOffset.length !== 2) fail('DIMENSION_MISMATCH', '$.transformOffset', 'reference transform offset must have length two');
  transformOffset.forEach((value, index) => finiteNumber(value, `$.transformOffset[${index}]`));
  if (!Array.isArray(sampleCounts) || sampleCounts.length === 0 || sampleCounts.some((value) => !Number.isInteger(value) || value < 2)) {
    fail('INVALID_SAMPLE_PLAN', '$.sampleCounts', 'sample counts must be integers >= 2');
  }
  for (let i = 1; i < sampleCounts.length; i += 1) {
    if (sampleCounts[i] <= sampleCounts[i - 1]) fail('INVALID_SAMPLE_PLAN', '$.sampleCounts', 'sample counts must be strictly increasing');
  }
  const { factor: lower } = validateCovarianceSpec({ variableIds, covariance, symmetryTolerance, requirePositiveDefinite: true });
  const nextUniform = createXorShift32(seedUint32);
  const maxCount = sampleCounts.at(-1);
  const targets = new Set(sampleCounts);
  const sumX = [0, 0];
  const sumY = [0, 0];
  const crossX = zeroMatrix();
  const crossY = zeroMatrix();
  const summaries = [];
  for (let count = 1; count <= maxCount; count += 1) {
    const [z0, z1] = nextNormalPair(nextUniform);
    const x0 = mean[0] + lower[0][0] * z0;
    const x1 = mean[1] + lower[1][0] * z0 + lower[1][1] * z1;
    const y0 = transformMatrix[0][0] * x0 + transformMatrix[0][1] * x1 + transformOffset[0];
    const y1 = transformMatrix[1][0] * x0 + transformMatrix[1][1] * x1 + transformOffset[1];
    const x = [x0, x1];
    const y = [y0, y1];
    for (let i = 0; i < 2; i += 1) {
      sumX[i] += x[i];
      sumY[i] += y[i];
      for (let j = 0; j < 2; j += 1) {
        crossX[i][j] += x[i] * x[j];
        crossY[i][j] += y[i] * y[j];
      }
    }
    if (targets.has(count)) {
      const input = summarize(count, sumX, crossX);
      const output = summarize(count, sumY, crossY);
      const inputCorrelationX1X2 = input.covariance[0][1] / Math.sqrt(input.covariance[0][0] * input.covariance[1][1]);
      summaries.push({ n: count, input, output, inputCorrelationX1X2 });
    }
  }
  return summaries;
}
