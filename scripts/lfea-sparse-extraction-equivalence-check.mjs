import assert from 'node:assert/strict';
import {
  assembleSparseSymmetric as oldAssemble,
  sparseEntry as oldEntry,
  sparseMultiply as oldMultiply,
} from '../src/core/lafea-linear-solve/sparse-matrix.js';
import {
  sparseCholeskyFactorize as oldCholeskyFactorize,
  sparseCholeskySolve as oldCholeskySolve,
} from '../src/core/lafea-linear-solve/sparse-cholesky.js';
import {
  sparseLdltFactorize as oldLdltFactorize,
  sparseLdltSolve as oldLdltSolve,
} from '../src/core/lafea-linear-solve/sparse-ldlt.js';
import { partitionSparseSystem as oldPartition } from '../src/core/lafea-linear-solve/bc-elimination.js';
import { estimateConditionNumber as oldCondition } from '../src/core/lafea-linear-solve/condition-estimate.js';
import { applyDiagonalScalingToMatrix as oldScale } from '../src/core/lafea-linear-solve/diagonal-scaling.js';

import {
  assembleSparseSymmetric as newAssemble,
  sparseEntry as newEntry,
  sparseMultiply as newMultiply,
} from '../src/core/shared-linear-solve/sparse-matrix.js';
import {
  sparseCholeskyFactorize as newCholeskyFactorize,
  sparseCholeskySolve as newCholeskySolve,
} from '../src/core/shared-linear-solve/sparse-cholesky.js';
import {
  sparseLdltFactorize as newLdltFactorize,
  sparseLdltSolve as newLdltSolve,
} from '../src/core/shared-linear-solve/sparse-ldlt.js';
import { partitionSparseSystem as newPartition } from '../src/core/shared-linear-solve/bc-elimination.js';
import { estimateConditionNumber as newCondition } from '../src/core/shared-linear-solve/condition-estimate.js';
import { applyDiagonalScalingToMatrix as newScale } from '../src/core/shared-linear-solve/diagonal-scaling.js';

const contributions = [
  { indices: [0, 1], localMatrix: [[6, 2], [2, 5]] },
  { indices: [1, 2], localMatrix: [[4, 1], [1, 3]] },
  { indices: [0], localMatrix: [[2]] },
];
const oldMatrix = oldAssemble(3, contributions);
const newMatrix = newAssemble(3, contributions);
assert.deepEqual(matrixEntries(newMatrix), matrixEntries(oldMatrix));
for (let row = 0; row < 3; row += 1) {
  for (let column = 0; column < 3; column += 1) {
    assert.equal(newEntry(newMatrix, row, column), oldEntry(oldMatrix, row, column));
  }
}
const vector = [1.25, -2.5, 3.75];
assert.deepEqual(newMultiply(newMatrix, vector), oldMultiply(oldMatrix, vector));
console.log('LFEA-SPARSE-EXTRACT-01 PASS sparse matrix assembly/access/multiply are identical');

const factors = [0.5, 0.25, 0.2];
const oldScaled = oldScale(oldMatrix, factors);
const newScaled = newScale(newMatrix, factors);
assert.deepEqual(matrixEntries(newScaled), matrixEntries(oldScaled));
console.log('LFEA-SPARSE-EXTRACT-02 PASS diagonal scaling is identical');

const prescribed = new Map([[0, 0.125]]);
const oldPartitioned = oldPartition(oldMatrix, [1, 2, 3], prescribed);
const newPartitioned = newPartition(newMatrix, [1, 2, 3], prescribed);
assert.deepEqual(newPartitioned.freeIndices, oldPartitioned.freeIndices);
assert.deepEqual(newPartitioned.rightHandSide, oldPartitioned.rightHandSide);
assert.deepEqual(matrixEntries(newPartitioned.freeMatrix), matrixEntries(oldPartitioned.freeMatrix));
console.log('LFEA-SPARSE-EXTRACT-03 PASS prescribed/free partitioning is identical');

const rhs = [7, -3, 4];
const oldCholesky = oldCholeskyFactorize(oldMatrix, 1e-14);
const newCholesky = newCholeskyFactorize(newMatrix, 1e-14);
assert.deepEqual(newCholesky.pivots, oldCholesky.pivots);
assert.deepEqual(newCholeskySolve(newCholesky, rhs), oldCholeskySolve(oldCholesky, rhs));
const oldConditionEvidence = oldCondition(oldMatrix, (b) => oldCholeskySolve(oldCholesky, b));
const newConditionEvidence = newCondition(newMatrix, (b) => newCholeskySolve(newCholesky, b));
assert.deepEqual(newConditionEvidence, oldConditionEvidence);
console.log('LFEA-SPARSE-EXTRACT-04 PASS Cholesky and condition estimate are identical');

const indefiniteContributions = [
  { indices: [0], localMatrix: [[-4]] },
  { indices: [1], localMatrix: [[3]] },
  { indices: [2], localMatrix: [[2]] },
  { indices: [0, 1], localMatrix: [[0, 0.25], [0.25, 0]] },
];
const oldIndefinite = oldAssemble(3, indefiniteContributions);
const newIndefinite = newAssemble(3, indefiniteContributions);
const oldLdlt = oldLdltFactorize(oldIndefinite, 1e-14);
const newLdlt = newLdltFactorize(newIndefinite, 1e-14);
assert.deepEqual(newLdlt.permutation, oldLdlt.permutation);
assert.deepEqual(newLdlt.D, oldLdlt.D);
assert.deepEqual(newLdltSolve(newLdlt, rhs), oldLdltSolve(oldLdlt, rhs));
console.log('LFEA-SPARSE-EXTRACT-05 PASS pivoted LDLT is numerically identical');

assert.throws(
  () => newCholeskyFactorize(newIndefinite, 1e-14),
  (error) => error?.code === 'NON_POSITIVE_PIVOT',
);
try {
  newLdltFactorize(newAssemble(2, [
    { indices: [0], localMatrix: [[0]] },
    { indices: [1], localMatrix: [[0]] },
  ]), 1e-14);
  assert.fail('Expected neutral LDLT to fail closed on zero pivots.');
} catch (error) {
  assert.equal(error.code, 'NO_STABLE_DIAGONAL_PIVOT');
  assert.ok(error.evidence && Number.isInteger(error.evidence.step));
}
console.log('LFEA-SPARSE-EXTRACT-06 PASS fail-closed error codes/evidence remain compatible');

console.log(JSON.stringify({
  check: 'lfea-sparse-extraction-equivalence',
  status: 'PASS',
  migrationOnly: true,
  numericalLogicChanged: false,
}));

function matrixEntries(matrix) {
  return matrix.rows.map((row) => [...row.entries()]);
}
