import { canonicalNumber, tolerance } from './numeric.js';

export function skylineCholeskySolve(matrix, rightHandSide, profile) {
  requireInputs(matrix, rightHandSide);
  const scale = Math.max(1, ...matrix.diagonal.map((value) => Math.abs(value)));
  const pivotTolerance = tolerance(profile, 'choleskyPivot', scale);
  const firstColumns = Array(matrix.size).fill(0);
  const rows = Array(matrix.size);
  let storageCount = 0;
  let maximumHalfBandwidth = 0;

  for (let row = 0; row < matrix.size; row += 1) {
    let first = row;
    for (
      let offset = matrix.rowPointers[row];
      offset < matrix.rowPointers[row + 1];
      offset += 1
    ) {
      const column = matrix.columnIndices[offset];
      if (column <= row) {
        first = Math.min(first, column);
      }
    }
    firstColumns[row] = first;
    const values = Array(row - first + 1).fill(0);
    for (
      let offset = matrix.rowPointers[row];
      offset < matrix.rowPointers[row + 1];
      offset += 1
    ) {
      const column = matrix.columnIndices[offset];
      if (column > row) break;
      values[column - first] = matrix.values[offset];
    }
    rows[row] = values;
    storageCount += values.length;
    maximumHalfBandwidth = Math.max(maximumHalfBandwidth, row - first);
  }

  const pivots = [];
  for (let row = 0; row < matrix.size; row += 1) {
    const first = firstColumns[row];
    const rowValues = rows[row];
    for (let column = first; column < row; column += 1) {
      let sum = rowValues[column - first];
      const start = Math.max(first, firstColumns[column]);
      const columnValues = rows[column];
      for (let prior = start; prior < column; prior += 1) {
        sum -= rowValues[prior - first]
          * columnValues[prior - firstColumns[column]];
      }
      const pivot = columnValues[column - firstColumns[column]];
      if (!(pivot > 0) || !Number.isFinite(pivot)) {
        throw factorError('SKYLINE_CHOLESKY_INVALID_PRIOR_PIVOT', row, column, pivot);
      }
      rowValues[column - first] = sum / pivot;
    }
    let pivotSquare = rowValues[row - first];
    for (let column = first; column < row; column += 1) {
      const factor = rowValues[column - first];
      pivotSquare -= factor * factor;
    }
    if (!(pivotSquare > pivotTolerance) || !Number.isFinite(pivotSquare)) {
      throw factorError('SKYLINE_CHOLESKY_NONPOSITIVE_PIVOT', row, row, pivotSquare);
    }
    const pivot = Math.sqrt(pivotSquare);
    rowValues[row - first] = pivot;
    pivots.push(pivotSquare);
  }

  const forward = Array(matrix.size).fill(0);
  for (let row = 0; row < matrix.size; row += 1) {
    const first = firstColumns[row];
    const rowValues = rows[row];
    let sum = rightHandSide[row];
    for (let column = first; column < row; column += 1) {
      sum -= rowValues[column - first] * forward[column];
    }
    forward[row] = sum / rowValues[row - first];
  }

  const transposeColumns = Array.from({ length: matrix.size }, () => []);
  for (let row = 0; row < matrix.size; row += 1) {
    const first = firstColumns[row];
    for (let column = first; column < row; column += 1) {
      const value = rows[row][column - first];
      if (value !== 0) transposeColumns[column].push([row, value]);
    }
  }
  const solution = Array(matrix.size).fill(0);
  for (let row = matrix.size - 1; row >= 0; row -= 1) {
    let sum = forward[row];
    for (const [dependentRow, factor] of transposeColumns[row]) {
      sum -= factor * solution[dependentRow];
    }
    solution[row] = sum / rows[row][row - firstColumns[row]];
  }

  const minimumPivot = Math.min(...pivots);
  const maximumPivot = Math.max(...pivots);
  return {
    solution: solution.map((value) => canonicalNumber(value, 'solved skyline displacement')),
    evidence: {
      method: 'DETERMINISTIC_SKYLINE_CHOLESKY',
      pivotScale: canonicalNumber(scale),
      pivotTolerance: canonicalNumber(pivotTolerance),
      minimumPivot: canonicalNumber(minimumPivot),
      maximumPivot: canonicalNumber(maximumPivot),
      pivotRatio: canonicalNumber(minimumPivot / maximumPivot),
      storageCount,
      maximumHalfBandwidth,
      accepted: true,
    },
  };
}

function factorError(code, row, column, value) {
  const error = new Error(`${code} at ${row},${column}: ${value}`);
  error.code = code;
  return error;
}

function requireInputs(matrix, rightHandSide) {
  if (!matrix || !Number.isInteger(matrix.size) || matrix.size < 1
    || !Array.isArray(matrix.rowPointers)
    || !Array.isArray(matrix.columnIndices)
    || !Array.isArray(matrix.values)
    || !Array.isArray(matrix.diagonal)
    || !Array.isArray(rightHandSide)
    || rightHandSide.length !== matrix.size) {
    throw new TypeError('Skyline Cholesky requires the local-continuum CSR system contract.');
  }
}
