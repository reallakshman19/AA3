import { canonicalNumber, maxAbs } from './numeric.js';
import { SPARSE_STIFFNESS_SCHEMA, sparseMatrixVector } from './sparse-matrix.js';

export function zeros(rows, columns) {
  return Array.from({ length: rows }, () => Array(columns).fill(0));
}

export function transpose(matrix) {
  return matrix[0].map((_, column) => matrix.map((row) => row[column]));
}

export function multiply(left, right) {
  const out = zeros(left.length, right[0].length);
  for (let i = 0; i < left.length; i += 1) {
    for (let k = 0; k < right.length; k += 1) {
      for (let j = 0; j < right[0].length; j += 1) {
        out[i][j] += left[i][k] * right[k][j];
      }
    }
  }
  return canonicalMatrix(out);
}

export function matrixVector(matrix, vector) {
  if (matrix?.schema === SPARSE_STIFFNESS_SCHEMA) {
    return sparseMatrixVector(matrix, vector);
  }
  return matrix.map((row) => canonicalNumber(
    compensatedProductSum(row, vector),
    'matrix-vector product',
  ));
}

export function scaleMatrix(matrix, factor) {
  return canonicalMatrix(matrix.map((row) => row.map((value) => value * factor)));
}

export function dot(left, right) {
  return canonicalNumber(
    left.reduce((sum, value, index) => sum + value * right[index], 0),
    'vector dot product',
  );
}

export function symmetryResidual(matrix) {
  let residual = 0;
  for (let i = 0; i < matrix.length; i += 1) {
    for (let j = i + 1; j < matrix.length; j += 1) {
      residual = Math.max(residual, Math.abs(matrix[i][j] - matrix[j][i]));
    }
  }
  return canonicalNumber(residual, 'symmetry residual');
}

export function matrixScale(matrix) {
  return maxAbs(matrix);
}

export function canonicalMatrix(matrix) {
  return matrix.map((row) => row.map((value) =>
    canonicalNumber(value, 'matrix value')));
}

/**
 * Neumaier-compensated sum of pairwise products. The B01 nonzero rigid-body
 * field exposed cancellation loss in dense `K*u`: the displacement/strain/
 * stress field was already at machine precision while the residual grew with
 * row width. Preserve the exact same matrix and solution; improve only the
 * deterministic floating-point accumulation used to evaluate the dense
 * stiffness action.
 */
function compensatedProductSum(left, right) {
  let sum = 0;
  let compensation = 0;
  for (let index = 0; index < left.length; index += 1) {
    const term = left[index] * right[index];
    const next = sum + term;
    compensation += Math.abs(sum) >= Math.abs(term)
      ? (sum - next) + term
      : (term - next) + sum;
    sum = next;
  }
  return sum + compensation;
}
