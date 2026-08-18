import { canonicalNumber, maxAbs, tolerance } from './numeric.js';
import { sparseMatrixVectorCompensatedRaw } from './sparse-matrix.js';

const REFINEMENT_STEPS = 3;

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
      if (column <= row) first = Math.min(first, column);
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

  const pivots = factorSkyline(rows, firstColumns, pivotTolerance);
  const transposeColumns = buildTransposeColumns(rows, firstColumns);
  let solution = solveFactored(rows, firstColumns, transposeColumns, rightHandSide);
  let residual = exactResidual(matrix, rightHandSide, solution);
  let residualInfinity = maxAbs(residual);
  const residualHistory = [residualInfinity];
  let refinementStepsPerformed = 0;
  for (let step = 0; step < REFINEMENT_STEPS; step += 1) {
    if (residualInfinity === 0) break;
    const correction = solveFactored(rows, firstColumns, transposeColumns, residual);
    const candidate = solution.map((value, index) => value + correction[index]);
    const candidateResidual = exactResidual(matrix, rightHandSide, candidate);
    const candidateInfinity = maxAbs(candidateResidual);
    if (!(candidateInfinity < residualInfinity)) break;
    solution = candidate;
    residual = candidateResidual;
    residualInfinity = candidateInfinity;
    refinementStepsPerformed += 1;
    residualHistory.push(candidateInfinity);
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
      iterativeRefinement: {
        method: 'DETERMINISTIC_SKYLINE_CHOLESKY_ITERATIVE_REFINEMENT',
        maximumSteps: REFINEMENT_STEPS,
        stepsPerformed: refinementStepsPerformed,
        initialResidualInfinity: canonicalNumber(residualHistory[0]),
        finalResidualInfinity: canonicalNumber(residualInfinity),
        residualHistory: residualHistory.map((value) => canonicalNumber(value)),
      },
      accepted: true,
    },
  };
}

function factorSkyline(rows, firstColumns, pivotTolerance) {
  const pivots = [];
  for (let row = 0; row < rows.length; row += 1) {
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
    rowValues[row - first] = Math.sqrt(pivotSquare);
    pivots.push(pivotSquare);
  }
  return pivots;
}

function buildTransposeColumns(rows, firstColumns) {
  const transposeColumns = Array.from({ length: rows.length }, () => []);
  for (let row = 0; row < rows.length; row += 1) {
    const first = firstColumns[row];
    for (let column = first; column < row; column += 1) {
      const value = rows[row][column - first];
      if (value !== 0) transposeColumns[column].push([row, value]);
    }
  }
  return transposeColumns;
}

function solveFactored(rows, firstColumns, transposeColumns, rightHandSide) {
  const forward = Array(rows.length).fill(0);
  for (let row = 0; row < rows.length; row += 1) {
    const first = firstColumns[row];
    const rowValues = rows[row];
    let sum = rightHandSide[row];
    for (let column = first; column < row; column += 1) {
      sum -= rowValues[column - first] * forward[column];
    }
    forward[row] = sum / rowValues[row - first];
  }
  const solution = Array(rows.length).fill(0);
  for (let row = rows.length - 1; row >= 0; row -= 1) {
    let sum = forward[row];
    for (const [dependentRow, factor] of transposeColumns[row]) {
      sum -= factor * solution[dependentRow];
    }
    solution[row] = sum / rows[row][row - firstColumns[row]];
  }
  return solution;
}

function exactResidual(matrix, rightHandSide, solution) {
  const action = sparseMatrixVectorCompensatedRaw(matrix, solution);
  return rightHandSide.map((value, index) => value - action[index]);
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
