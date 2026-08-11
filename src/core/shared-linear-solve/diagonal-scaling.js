import { LinearSolvePrimitiveError } from './errors.js';

export function diagonalScaleFactors(matrix) {
  const { size, rows } = matrix;
  const factors = new Array(size).fill(1);
  for (let i = 0; i < size; i += 1) {
    const diagonal = rows[i].get(i) ?? 0;
    if (!(diagonal > 0)) {
      throw new LinearSolvePrimitiveError(
        `Diagonal scaling requires a positive diagonal at DOF ${i}, got ${diagonal}`,
        'NON_POSITIVE_DIAGONAL',
      );
    }
    factors[i] = 1 / Math.sqrt(diagonal);
  }
  return Object.freeze(factors);
}

export function applyDiagonalScalingToMatrix(matrix, factors) {
  const { size, rows } = matrix;
  const scaledRows = rows.map((row, rowIndex) => {
    const scaled = new Map();
    for (const [column, value] of row) {
      scaled.set(column, value * factors[rowIndex] * factors[column]);
    }
    return Object.freeze(scaled);
  });
  return Object.freeze({ size, rows: Object.freeze(scaledRows) });
}

export function applyDiagonalScalingToVector(vector, factors) {
  return Object.freeze(vector.map((value, index) => value * factors[index]));
}

export function undoDiagonalScaling(scaledSolution, factors) {
  return Object.freeze(scaledSolution.map((value, index) => value * factors[index]));
}
