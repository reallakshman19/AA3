import { LinearSolvePrimitiveError } from './errors.js';

export function assembleSparseSymmetric(size, contributions) {
  if (!Number.isInteger(size) || size < 1) throw new LinearSolvePrimitiveError('size must be a positive integer', 'INVALID_SIZE');
  const rows = Array.from({ length: size }, () => new Map());
  contributions.forEach((contribution, contributionIndex) => {
    assertContribution(contribution, size, contributionIndex);
    const { indices, localMatrix } = contribution;
    for (let a = 0; a < indices.length; a += 1) {
      for (let b = 0; b < indices.length; b += 1) {
        const row = indices[a]; const column = indices[b];
        if (row < column) continue;
        const value = localMatrix[a][b];
        if (!Number.isFinite(value)) throw new LinearSolvePrimitiveError(`Non-finite contribution at contribution[${contributionIndex}][${a}][${b}]`, 'NON_FINITE_CONTRIBUTION');
        rows[row].set(column, (rows[row].get(column) ?? 0) + value);
      }
    }
  });
  return Object.freeze({ size, rows: Object.freeze(rows.map((row) => Object.freeze(new Map([...row].sort((x, y) => x[0] - y[0]))))) });
}

function assertContribution(contribution, size, index) {
  const { indices, localMatrix } = contribution;
  if (!Array.isArray(indices) || indices.length === 0) throw new LinearSolvePrimitiveError(`contribution[${index}].indices must be a non-empty array`, 'INVALID_CONTRIBUTION');
  if (indices.some((value) => !Number.isInteger(value) || value < 0 || value >= size)) throw new LinearSolvePrimitiveError(`contribution[${index}].indices out of range`, 'INDEX_OUT_OF_RANGE');
  if (!Array.isArray(localMatrix) || localMatrix.length !== indices.length || localMatrix.some((row) => row.length !== indices.length)) throw new LinearSolvePrimitiveError(`contribution[${index}].localMatrix must be square and match indices length`, 'INVALID_CONTRIBUTION');
}

export function sparseEntry(matrix, row, column) {
  const [r, c] = row >= column ? [row, column] : [column, row];
  return matrix.rows[r].get(c) ?? 0;
}

export function sparseMultiply(matrix, vector) {
  const output = new Array(matrix.size).fill(0);
  for (let row = 0; row < matrix.size; row += 1) {
    for (const [column, value] of matrix.rows[row]) {
      output[row] += value * vector[column];
      if (column !== row) output[column] += value * vector[row];
    }
  }
  return output;
}

export function sparseNonzeroCount(matrix) {
  return matrix.rows.reduce((sum, row) => sum + row.size, 0);
}
