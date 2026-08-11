import { LinearSolvePrimitiveError } from './errors.js';

export function sparseLdltFactorize(matrix, pivotTolerance) {
  const n = matrix.size;
  const dense = denseSymmetric(matrix);
  const permutation = Array.from({ length: n }, (_, i) => i);
  const L = Array.from({ length: n }, () => new Map());
  const D = new Array(n).fill(0);
  for (let step = 0; step < n; step += 1) {
    const pivot = selectPivot(dense, L, D, step, n);
    if (pivot !== step) swapSymmetric(dense, L, permutation, step, pivot, n);
    const diagonal = schurDiagonal(dense, L, D, step, step);
    if (Math.abs(diagonal) <= pivotTolerance) {
      throw new LinearSolvePrimitiveError('No stable diagonal LDLT pivot.', 'NO_STABLE_DIAGONAL_PIVOT', {
        step, diagonal, pivotTolerance, permutation: [...permutation],
      });
    }
    D[step] = diagonal;
    L[step].set(step, 1);
    for (let row = step + 1; row < n; row += 1) {
      let value = dense[row][step];
      for (let k = 0; k < step; k += 1) value -= (L[row].get(k) ?? 0) * D[k] * (L[step].get(k) ?? 0);
      if (value !== 0) L[row].set(step, value / diagonal);
    }
  }
  return Object.freeze({
    size: n,
    permutation: Object.freeze([...permutation]),
    L: Object.freeze(L.map((row) => Object.freeze(row))),
    D: Object.freeze([...D]),
  });
}

export function sparseLdltSolve(factor, rhs) {
  const { size, permutation, L, D } = factor;
  const permuted = permutation.map((original) => rhs[original]);
  const y = new Array(size).fill(0);
  for (let i = 0; i < size; i += 1) {
    let value = permuted[i];
    for (const [k, lik] of L[i]) if (k < i) value -= lik * y[k];
    y[i] = value;
  }
  const z = y.map((value, i) => value / D[i]);
  const x = new Array(size).fill(0);
  for (let i = size - 1; i >= 0; i -= 1) {
    let value = z[i];
    for (let row = i + 1; row < size; row += 1) {
      const lri = L[row].get(i);
      if (lri !== undefined) value -= lri * x[row];
    }
    x[i] = value;
  }
  const solution = new Array(size).fill(0);
  permutation.forEach((original, i) => { solution[original] = x[i]; });
  return solution;
}

function denseSymmetric(matrix) {
  const dense = Array.from({ length: matrix.size }, () => new Array(matrix.size).fill(0));
  for (let row = 0; row < matrix.size; row += 1) {
    for (const [column, value] of matrix.rows[row]) {
      dense[row][column] = value;
      dense[column][row] = value;
    }
  }
  return dense;
}
function schurDiagonal(dense, L, D, step, row) {
  let value = dense[row][row];
  for (let k = 0; k < step; k += 1) { const lrk = L[row].get(k) ?? 0; value -= lrk * lrk * D[k]; }
  return value;
}
function selectPivot(dense, L, D, step, n) {
  let best = step;
  let magnitude = Math.abs(schurDiagonal(dense, L, D, step, step));
  for (let row = step + 1; row < n; row += 1) {
    const candidate = Math.abs(schurDiagonal(dense, L, D, step, row));
    if (candidate > magnitude) { best = row; magnitude = candidate; }
  }
  return best;
}
function swapSymmetric(dense, L, permutation, a, b, n) {
  [dense[a], dense[b]] = [dense[b], dense[a]];
  for (let row = 0; row < n; row += 1) [dense[row][a], dense[row][b]] = [dense[row][b], dense[row][a]];
  [L[a], L[b]] = [L[b], L[a]];
  [permutation[a], permutation[b]] = [permutation[b], permutation[a]];
}
