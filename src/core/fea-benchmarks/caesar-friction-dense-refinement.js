import {
  dot,
  matVec,
  norm2,
  solveCholesky,
  solveLdlt,
} from '../linear-fea-solver/linear-algebra.js';
import { applyDiagonalScalingToVector } from '../linear-fea-solver/scaling.js';

/**
 * Dense direct residual refinement for the M047 friction linearizations.
 *
 * This intentionally mirrors the qualified dense path in
 * linear-fea-solver/solve.js: solve the scaled direct system, compute a
 * product-error-compensated residual, solve residual corrections with the same
 * factorization, and retain the best finite iterate. Stage 2 must not accept a
 * numerically weaker nonlinear linearization than the frozen linear controls.
 *
 * The helper also applies the same normalized-residual, energy-balance and
 * conditioning thresholds as the qualified solver. A base-solver BLOCK is a
 * hard failure for a friction iteration; WARN is retained as conditional
 * evidence, matching the existing linear execution contract.
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

  const numericalQualification = qualifyDenseLinearization({
    factorization,
    matrix,
    rhs,
    solution: bestSolution,
    relativeResidual: bestRelativeResidual,
    policies,
  });
  if (numericalQualification.status === 'BLOCK') {
    const error = new Error(
      `M047 friction linearization failed base-solver numerical qualification: ${JSON.stringify(numericalQualification)}.`,
    );
    error.code = 'CAESAR_FRICTION_LINEARIZATION_NUMERICALLY_BLOCKED';
    error.qualification = numericalQualification;
    throw error;
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
      numericalQualification,
    }),
  });
}

function qualifyDenseLinearization({
  factorization,
  matrix,
  rhs,
  solution,
  relativeResidual,
  policies,
}) {
  const residualPass = policyNumber(policies, 'normalizedResidualLimit', { nonnegative: true });
  const residualWarn = policyNumber(policies, 'normalizedResidualWarnLimit', { nonnegative: true });
  const conditionWarn = policyNumber(policies, 'conditionWarning', { nonnegative: true });
  const conditionBlock = policyNumber(policies, 'conditionBlock', { nonnegative: true });
  const energyLimit = policyNumber(policies, 'energyBalanceLimit', { nonnegative: true });
  if (residualWarn < residualPass) {
    throw new TypeError('normalizedResidualWarnLimit must be greater than or equal to normalizedResidualLimit.');
  }
  if (conditionBlock < conditionWarn) {
    throw new TypeError('conditionBlock must be greater than or equal to conditionWarning.');
  }
  const residualStatus = thresholdStatus(relativeResidual, residualPass, residualWarn);
  const conditionStatus = thresholdStatus(
    Number(factorization.conditionEstimate),
    conditionWarn,
    conditionBlock,
  );
  const energy = freePartitionEnergyBalance(matrix, factorization.m, solution, rhs, energyLimit);
  return Object.freeze({
    status: worstQualificationStatus(residualStatus, conditionStatus, energy.status),
    residual: Object.freeze({
      checkId: 'ALGEBRAIC_RESIDUAL_NORMALIZED',
      value: relativeResidual,
      passLimit: residualPass,
      warnLimit: residualWarn,
      status: residualStatus,
      limitSource: policies.normalizedResidualLimit.source,
      warnLimitSource: policies.normalizedResidualWarnLimit.source,
    }),
    energyBalance: Object.freeze({
      ...energy,
      limitSource: policies.energyBalanceLimit.source,
    }),
    conditioning: Object.freeze({
      checkId: 'CONDITION_ESTIMATE',
      value: Number(factorization.conditionEstimate),
      passLimit: conditionWarn,
      blockLimit: conditionBlock,
      status: conditionStatus,
      limitSource: policies.conditionWarning.source,
      blockLimitSource: policies.conditionBlock.source,
    }),
  });
}

/**
 * BM4_L has no nonzero prescribed displacement. Therefore the qualified
 * solver's full-system energy identity reduces exactly to this free-partition
 * form: grounded normal/friction springs are already in Kff and constrained
 * DOFs contribute zero work.
 */
function freePartitionEnergyBalance(matrix, size, solution, rhs, limit) {
  const predicted = matVec(matrix, size, solution);
  const residual = predicted.map((value, index) => value - rhs[index]);
  const internalEnergy = 0.5 * dot(solution, predicted);
  const externalWork = 0.5 * dot(solution, rhs) + 0.5 * dot(solution, residual);
  const reference = Math.max(Math.abs(internalEnergy), Math.abs(externalWork), Number.MIN_VALUE);
  const relativeMismatch = Math.abs(internalEnergy - externalWork) / reference;
  return {
    checkId: 'ENERGY_BALANCE_RELATIVE',
    value: relativeMismatch,
    limit,
    status: Number.isFinite(relativeMismatch) && relativeMismatch <= limit ? 'PASS' : 'BLOCK',
    internalEnergy,
    externalWork,
  };
}

function thresholdStatus(value, passLimit, blockLimit) {
  if (!Number.isFinite(value)) return 'BLOCK';
  if (value <= passLimit) return 'PASS';
  if (value <= blockLimit) return 'WARN';
  return 'BLOCK';
}

function worstQualificationStatus(...statuses) {
  if (statuses.includes('BLOCK')) return 'BLOCK';
  if (statuses.includes('WARN')) return 'WARN';
  return 'PASS';
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
