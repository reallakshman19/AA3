import test from 'node:test';
import assert from 'node:assert/strict';
import { solveCaesarFrictionRefinedDenseSystem } from '../src/core/fea-benchmarks/caesar-friction-dense-refinement.js';

function policies(maximumIterations = 5, relativeTolerance = 1e-12, overrides = {}) {
  return {
    iterativeRefinementMaximumIterations: { value: maximumIterations, source: 'TEST' },
    iterativeRefinementRelativeTolerance: { value: relativeTolerance, source: 'TEST' },
    normalizedResidualLimit: { value: 1e-5, source: 'TEST' },
    normalizedResidualWarnLimit: { value: 1e-3, source: 'TEST' },
    energyBalanceLimit: { value: 1e-12, source: 'TEST' },
    conditionWarning: { value: 1e8, source: 'TEST' },
    conditionBlock: { value: 1e12, source: 'TEST' },
    ...overrides,
  };
}

test('residual refinement retains a better finite iterate and passes governing numerical qualification', () => {
  const approximate = Math.sqrt(0.9);
  const factorization = {
    m: 2,
    kind: 'CHOLESKY',
    L: [approximate, 0, 0, approximate],
    scaling: { factors: [1, 1] },
    conditionEstimate: 1,
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
  assert.equal(result.evidence.numericalQualification.status, 'PASS');
  assert.equal(result.evidence.numericalQualification.residual.status, 'PASS');
  assert.equal(result.evidence.numericalQualification.conditioning.status, 'PASS');
  assert.equal(result.evidence.numericalQualification.energyIdentity.status, 'INFORMATIONAL');
  assert.equal(
    result.evidence.numericalQualification.energyIdentity.checkId,
    'ENERGY_IDENTITY_RELATIVE_INFORMATIONAL',
  );
  assert.equal(
    result.evidence.numericalQualification.energyIdentity.qualificationContribution,
    'NONE_INFORMATIONAL_ALGEBRAIC_IDENTITY',
  );
  assert.ok(Math.abs(result.solution[0] - 1) < Math.abs((1 / 0.9) - 1));
  assert.ok(Math.abs(result.solution[1] + 2) < Math.abs((-2 / 0.9) + 2));
});

test('zero refinement iterations preserves the direct scaled solution and records informational energy parity', () => {
  const factorization = {
    m: 1,
    kind: 'CHOLESKY',
    L: [2],
    scaling: { factors: [1] },
    conditionEstimate: 1,
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
  assert.equal(result.evidence.numericalQualification.status, 'PASS');
  assert.equal(result.evidence.numericalQualification.energyIdentity.status, 'INFORMATIONAL');
});

test('conditioning WARN is retained as evidence and controls numerical qualification', () => {
  const result = solveCaesarFrictionRefinedDenseSystem({
    factorization: {
      m: 1,
      kind: 'CHOLESKY',
      L: [1],
      scaling: { factors: [1] },
      conditionEstimate: 5,
    },
    matrix: [1],
    rhs: [1],
    policies: policies(0, 0, {
      conditionWarning: { value: 2, source: 'TEST' },
      conditionBlock: { value: 10, source: 'TEST' },
    }),
  });
  assert.equal(result.evidence.numericalQualification.status, 'WARN');
  assert.equal(result.evidence.numericalQualification.conditioning.status, 'WARN');
  assert.equal(result.evidence.numericalQualification.energyIdentity.status, 'INFORMATIONAL');
});

test('a base-solver conditioning BLOCK fails the friction linearization immediately', () => {
  assert.throws(
    () => solveCaesarFrictionRefinedDenseSystem({
      factorization: {
        m: 1,
        kind: 'CHOLESKY',
        L: [1],
        scaling: { factors: [1] },
        conditionEstimate: 11,
      },
      matrix: [1],
      rhs: [1],
      policies: policies(0, 0, {
        conditionWarning: { value: 2, source: 'TEST' },
        conditionBlock: { value: 10, source: 'TEST' },
      }),
    }),
    (error) => error?.code === 'CAESAR_FRICTION_LINEARIZATION_NUMERICALLY_BLOCKED'
      && error.qualification?.conditioning?.status === 'BLOCK',
  );
});

test('a normalized residual beyond the base warn limit blocks the friction linearization', () => {
  const approximate = Math.sqrt(0.9);
  assert.throws(
    () => solveCaesarFrictionRefinedDenseSystem({
      factorization: {
        m: 1,
        kind: 'CHOLESKY',
        L: [approximate],
        scaling: { factors: [1] },
        conditionEstimate: 1,
      },
      matrix: [1],
      rhs: [1],
      policies: policies(0, 0, {
        normalizedResidualLimit: { value: 0.01, source: 'TEST' },
        normalizedResidualWarnLimit: { value: 0.05, source: 'TEST' },
      }),
    }),
    (error) => error?.code === 'CAESAR_FRICTION_LINEARIZATION_NUMERICALLY_BLOCKED'
      && error.qualification?.residual?.status === 'BLOCK',
  );
});

test('refinement fails closed on a matrix/factorization dimension mismatch', () => {
  assert.throws(
    () => solveCaesarFrictionRefinedDenseSystem({
      factorization: {
        m: 2,
        kind: 'CHOLESKY',
        L: [1, 0, 0, 1],
        scaling: { factors: [1, 1] },
        conditionEstimate: 1,
      },
      matrix: [1],
      rhs: [1, 1],
      policies: policies(),
    }),
    /dense free matrix does not match/,
  );
});
