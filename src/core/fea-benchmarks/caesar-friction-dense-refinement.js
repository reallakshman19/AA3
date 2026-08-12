import { norm2, solveCholesky, solveLdlt } from '../linear-fea-solver/linear-algebra.js';
import { applyDiagonalScalingToVector } from '../linear-fea-solver/scaling.js';

/**
 * Dense direct residual refinement for the M047 friction linearizations.
 *
 * This intentionally mirrors the qualified dense path in
 * linear-fea-solver/solve.js: solve the scaled direct system, compute a
 * product-error-compensated residual, solve residual corrections with the same
 * factorization, and retain the best finite iterate. Stage 2 must not accept a
 * numerically weaker nonlinear linearization than the frozen linear controls.
 */
export function solveCaesarFrictionRefinedDenseSystem({ factorization, matrix, rhs, policies }) {
  if (!factorization || !Number.isInteger(factorization.m) || factorization.m < 0) {
    throw new TypeError('A dense free-partition factorization is required.');
  }
  if (!Array.isArray(matrix) || matrix.length !== factorization.m * factorization.m) {
    throw new TypeError('The dense free matrix does not match the factorization order.');
  }
  if (!Array.isArray(rhs) || rhs.length !== factorization.m) {
    throw new TypeError('The dense refinement RHS does not match the factorization order.');
  }
  const maximumIterations = policyNumber(
    policies,
    'iterativeRefinementMaximumIterations',
    { integer: true, nonnegative: true },
  );
  const targetRelativeResidual = policyNumber(
    policies,
    'iterativeRefinementRelativeTolerance',
    { nonnegative: true },
  );

  const reference = Math.max(norm2(rhs), Number.MIN_VALUE);
  let currentSolution = solveScaledDenseSystem(factorization, rhs);
  let currentResidual = denseFreeResidual(matrix, factorization.m, currentSolution, rhs);
  let currentRelativeResidual = norm2(currentResidual) / reference;
  let bestSolution = currentSolution;
  let bestRelativeResidual = currentRelativeResidual;
  let bestIteration = 0;
  const history = [currentRelativeResidual];
  let completedIterations = 0;

  for (
    let iteration = 0;
    iteration < maximumIterations && bestRelativeResidual > targetRelativeResidual;
    iteration += 1
  ) {
    const correction = solveScaledDenseSystem(
      factorization,
      currentResidual.map((value) => -value),
    );
    currentSolution = currentSolution.map((value, index) => value + correction[index]);
    currentResidual = denseFreeResidual(matrix, factorization.m, currentSolution, rhs);
    currentRelativeResidual = norm2(currentResidual) / reference;
    if (!Number.isFinite(currentRelativeResidual)) break;
    completedIterations += 1;
    history.push(currentRelativeResidual);
    if (currentRelativeResidual < bestRelativeResidual) {
      bestSolution = currentSolution;
      bestRelativeResidual = currentRelativeResidual;
      bestIteration = completedIterations;
    }
  }

  return Object.freeze({
    solution: Object.freeze([...bestSolution]),
    evidence: Object.freeze({
      method: 'DIRECT_RESIDUAL_CORRECTION_BEST_ITERATE_V2',
      numericalParityTarget: 'LINEAR_FEA_SOLVER_DENSE_REFINEMENT',
      maximumIterations,
      completedIterations,
      bestIteration,
      targetRelativeResidual,
      initialRelativeResidual: history[0],
      finalRelativeResidual: bestRelativeResidual,
      history: Object.freeze(history),
    }),
  });
}

function solveScaledDenseSystem(factorization, rhs) {
  const scaledRhs = applyDiagonalScalingToVector(rhs, factorization.scaling.factors);
  const scaledSolution = factorization.kind === 'CHOLESKY'
    ? solveCholesky(factorization.L, factorization.m, scaledRhs)
    : factorization.kind === 'LDLT'
      ? solveLdlt(factorization.L, factorization.D, factorization.m, scaledRhs)
      : unsupportedFactorization(factorization.kind);
  return applyDiagonalScalingToVector(scaledSolution, factorization.scaling.factors);
}

function denseFreeResidual(matrix, size, solution, rhs) {
  const predicted = accurateDenseMatVec(matrix, size, solution);
  return predicted.map((value, index) => value - rhs[index]);
}

function accurateDenseMatVec(matrix, size, vector) {
  return Array.from({ length: size }, (_, row) => accurateDenseDot(matrix, size, vector, row));
}

function accurateDenseDot(matrix, size, vector, row) {
  let high = 0;
  let low = 0;
  for (let column = 0; column < size; column += 1) {
    const [product, productError] = twoProduct(matrix[row * size + column], vector[column]);
    const next = high + product;
    const virtualProduct = next - high;
    low += productError + (high - (next - virtualProduct)) + (product - virtualProduct);
    high = next;
    const normalized = high + low;
    low -= normalized - high;
    high = normalized;
  }
  return high + low;
}

function twoProduct(left, right) {
  const product = left * right;
  const splitter = 134217729;
  const leftSplit = splitter * left;
  const rightSplit = splitter * right;
  const leftHigh = leftSplit - (leftSplit - left);
  const rightHigh = rightSplit - (rightSplit - right);
  const error = ((leftHigh * rightHigh - product)
    + leftHigh * (right - rightHigh)
    + (left - leftHigh) * rightHigh)
    + (left - leftHigh) * (right - rightHigh);
  return [product, error];
}

function policyNumber(policies, key, options) {
  const value = Number(policies?.[key]?.value);
  if (!Number.isFinite(value)) throw new TypeError(`Missing finite solver policy ${key}.`);
  if (options.nonnegative && value < 0) throw new TypeError(`${key} must be nonnegative.`);
  if (options.integer && !Number.isInteger(value)) throw new TypeError(`${key} must be an integer.`);
  return value;
}

function unsupportedFactorization(kind) {
  throw new TypeError(`Unsupported dense factorization kind ${String(kind)}.`);
}
