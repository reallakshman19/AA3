import test from 'node:test';
import assert from 'node:assert/strict';
import { solveCaesarFrictionRefinedDenseSystem } from '../src/core/fea-benchmarks/caesar-friction-dense-refinement.js';

function policies(maximumIterations = 5, relativeTolerance = 1e-12) {
  return {
    iterativeRefinementMaximumIterations: { value: maximumIterations },
    iterativeRefinementRelativeTolerance: { value: relativeTolerance },
  };
}

test('residual refinement retains a better finite iterate than the initial direct solve', () => {
  const approximate = Math.sqrt(0.9);
  const factorization = {
    m: 2,
    kind: 'CHOLESKY',
    L: [approximate, 0, 0, approximate],
    scaling: { factors: [1, 1] },
  };
  const result = solveCaesarFrictionRefinedDenseSystem({
    factorization,
    matrix: [1, 0, 0, 1],
    rhs: [1, -2],
    policies: policies(),
  });

  assert.equal(result.evidence.method, 'DIRECT_RESIDUAL_CORRECTION_BEST_ITERATE_V2');
  assert.equal(result.evidence.numericalParityTarget, 'LINEAR_FEA_SOLVER_DENSE_REFINEMENT');
  assert.ok(result.evidence.completedIterations > 0);
  assert.ok(result.evidence.bestIteration > 0);
  assert.ok(result.evidence.finalRelativeResidual < result.evidence.initialRelativeResidual);
  assert.ok(Math.abs(result.solution[0] - 1) < Math.abs((1 / 0.9) - 1));
  assert.ok(Math.abs(result.solution[1] + 2) < Math.abs((-2 / 0.9) + 2));
});

test('zero refinement iterations preserves the direct scaled solution and records the policy', () => {
  const factorization = {
    m: 1,
    kind: 'CHOLESKY',
    L: [2],
    scaling: { factors: [1] },
  };
  const result = solveCaesarFrictionRefinedDenseSystem({
    factorization,
    matrix: [4],
    rhs: [8],
    policies: policies(0, 0),
  });

  assert.deepEqual(result.solution, [2]);
  assert.equal(result.evidence.maximumIterations, 0);
  assert.equal(result.evidence.completedIterations, 0);
  assert.equal(result.evidence.bestIteration, 0);
  assert.equal(result.evidence.finalRelativeResidual, 0);
});

test('refinement fails closed on a matrix/factorization dimension mismatch', () => {
  assert.throws(
    () => solveCaesarFrictionRefinedDenseSystem({
      factorization: {
        m: 2,
        kind: 'CHOLESKY',
        L: [1, 0, 0, 1],
        scaling: { factors: [1, 1] },
      },
      matrix: [1],
      rhs: [1, 1],
      policies: policies(),
    }),
    /dense free matrix does not match/,
  );
});
