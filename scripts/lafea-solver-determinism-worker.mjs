#!/usr/bin/env node

/**
 * Cross-process determinism worker for `lafea.11-determinism-check.mjs`.
 * Assembles and solves a fixed sparse system with all governed linear-solver
 * backends and prints the result as JSON; the parent script runs this twice
 * in separate `node` invocations and diffs the output.
 */

import {
  assembleSparseSymmetric,
  solveDeterministicJacobiPcg,
  sparseCholeskyFactorize,
  sparseCholeskySolve,
  sparseLdltFactorize,
  sparseLdltSolve,
  sparseMultiply,
} from '../src/core/lafea-linear-solve/index.js';

const A = [[10, 1, 0, 2], [1, 8, 0.5, 0], [0, 0.5, 6, 1], [2, 0, 1, 12]];
const matrix = assembleSparseSymmetric(4, [{ indices: [0, 1, 2, 3], localMatrix: A }]);
const b = [1, 2, 3, 4];

const cholesky = sparseCholeskySolve(sparseCholeskyFactorize(matrix, 1e-10), b);
const ldlt = sparseLdltSolve(sparseLdltFactorize(matrix, 1e-10), b);
const pcg = solveDeterministicJacobiPcg({
  size: matrix.size,
  diagonal: matrix.rows.map((row, index) => row.get(index) ?? 0),
  rightHandSide: b,
  multiply: (vector) => sparseMultiply(matrix, vector),
  diagonalTolerance: 1e-10,
  residualTolerance: 1e-9,
});

process.stdout.write(JSON.stringify({ cholesky, ldlt, pcg }));
