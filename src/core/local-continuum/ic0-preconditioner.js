export function buildIncompleteCholesky0(matrix, pivotTolerance) {
  requireMatrix(matrix);
  if (!Number.isFinite(pivotTolerance) || pivotTolerance < 0) {
    throw new TypeError('IC(0) pivot tolerance must be finite and non-negative.');
  }
  const lowerRows = Array(matrix.size);
  const transposeColumns = Array.from({ length: matrix.size }, () => []);
  const diagonal = Array(matrix.size).fill(0);
  let minimumPivotSquare = Infinity;
  let maximumPivotSquare = 0;

  for (let row = 0; row < matrix.size; row += 1) {
    const values = new Map();
    let inputDiagonal = null;
    for (
      let offset = matrix.rowPointers[row];
      offset < matrix.rowPointers[row + 1];
      offset += 1
    ) {
      const column = matrix.columnIndices[offset];
      if (column > row) break;
      const value = matrix.values[offset];
      values.set(column, value);
      if (column === row) inputDiagonal = value;
    }
    if (!Number.isFinite(inputDiagonal)) {
      throw new TypeError(`IC(0) row ${row} has no finite diagonal.`);
    }

    const lowerColumns = [...values.keys()].filter((column) => column < row);
    for (const column of lowerColumns) {
      let sum = values.get(column);
      const columnRow = lowerRows[column];
      for (const priorColumn of lowerColumns) {
        if (priorColumn >= column) break;
        const priorInColumn = columnRow.get(priorColumn);
        if (priorInColumn !== undefined) {
          sum -= values.get(priorColumn) * priorInColumn;
        }
      }
      const factor = sum / diagonal[column];
      if (!Number.isFinite(factor)) {
        throw new TypeError(`IC(0) non-finite factor at ${row},${column}.`);
      }
      values.set(column, factor);
      transposeColumns[column].push([row, factor]);
    }

    let pivotSquare = inputDiagonal;
    for (const column of lowerColumns) {
      const factor = values.get(column);
      pivotSquare -= factor * factor;
    }
    if (!(pivotSquare > pivotTolerance) || !Number.isFinite(pivotSquare)) {
      const error = new Error(
        `IC(0) pivot square ${pivotSquare} at row ${row} does not exceed ${pivotTolerance}.`,
      );
      error.code = 'IC0_NONPOSITIVE_PIVOT';
      throw error;
    }
    const pivot = Math.sqrt(pivotSquare);
    values.set(row, pivot);
    diagonal[row] = pivot;
    minimumPivotSquare = Math.min(minimumPivotSquare, pivotSquare);
    maximumPivotSquare = Math.max(maximumPivotSquare, pivotSquare);
    lowerRows[row] = values;
  }

  return Object.freeze({
    size: matrix.size,
    lowerRows: Object.freeze(lowerRows.map((row) => Object.freeze([...row.entries()]))),
    transposeColumns: Object.freeze(
      transposeColumns.map((column) => Object.freeze(column.map((entry) => Object.freeze(entry)))),
    ),
    diagonal: Object.freeze(diagonal),
    minimumPivotSquare,
    maximumPivotSquare,
  });
}

export function applyIncompleteCholesky0(factorization, residual) {
  if (!factorization || !Number.isInteger(factorization.size)
    || !Array.isArray(residual) || residual.length !== factorization.size) {
    throw new TypeError('IC(0) preconditioner dimensions differ.');
  }
  const forward = Array(factorization.size).fill(0);
  for (let row = 0; row < factorization.size; row += 1) {
    let sum = residual[row];
    for (const [column, factor] of factorization.lowerRows[row]) {
      if (column >= row) break;
      sum -= factor * forward[column];
    }
    forward[row] = sum / factorization.diagonal[row];
  }

  const output = Array(factorization.size).fill(0);
  for (let row = factorization.size - 1; row >= 0; row -= 1) {
    let sum = forward[row];
    for (const [dependentRow, factor] of factorization.transposeColumns[row]) {
      sum -= factor * output[dependentRow];
    }
    output[row] = sum / factorization.diagonal[row];
  }
  return output;
}

function requireMatrix(matrix) {
  if (!matrix || !Number.isInteger(matrix.size) || matrix.size < 1
    || !Array.isArray(matrix.rowPointers)
    || !Array.isArray(matrix.columnIndices)
    || !Array.isArray(matrix.values)
    || !Array.isArray(matrix.diagonal)) {
    throw new TypeError('IC(0) requires the local-continuum CSR matrix contract.');
  }
}
