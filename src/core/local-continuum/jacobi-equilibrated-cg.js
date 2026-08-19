import { canonicalNumber, maxAbs, tolerance } from './numeric.js';
import {
  sparseMatrixVectorCompensatedRaw,
  sparseMatrixVectorDoubleDoubleRaw,
  sparseMatrixVectorRaw,
} from './sparse-matrix.js';

const RELIABLE_RESIDUAL_INTERVAL = 100;
const POST_CAP_REFINEMENT_LIMIT = 3;
const POST_CAP_REFINEMENT_METHOD = 'JACOBI_SCALED_MINIMUM_RESIDUAL_RICHARDSON';
const ERROR_FREE_PRODUCT_RESIDUAL = 'ERROR_FREE_PRODUCT_EXPANSION';
const COMPENSATED_CSR_RESIDUAL = 'COMPENSATED_CSR';

export function jacobiEquilibratedCgSolve(matrix, rightHandSide, profile) {
  requireInputs(matrix, rightHandSide);
  const diagonalScale = Math.max(1, ...matrix.diagonal.map((value) => Math.abs(value)));
  const diagonalTolerance = tolerance(profile, 'choleskyPivot', diagonalScale);
  const minimumDiagonal = Math.min(...matrix.diagonal);
  if (!(minimumDiagonal > diagonalTolerance)) {
    throw solverError('JACOBI_EQUILIBRATION_DIAGONAL_INVALID', minimumDiagonal);
  }
  const inverseSqrtDiagonal = matrix.diagonal.map((value) => 1 / Math.sqrt(value));
  const scaledRightHandSide = rightHandSide.map(
    (value, index) => value * inverseSqrtDiagonal[index],
  );
  const residualScale = Math.max(1, maxAbs(rightHandSide));
  const residualTolerance = tolerance(profile, 'freeDofResidual', residualScale);
  const convergenceTarget = residualTolerance / 10;
  const iterationLimit = Math.min(50000, Math.max(1000, matrix.size * 16));

  const scaledSolution = Array(matrix.size).fill(0);
  const scaledSolutionCompensation = Array(matrix.size).fill(0);
  const scaledResidualCompensation = Array(matrix.size).fill(0);
  let residual = [...scaledRightHandSide];
  let direction = [...residual];
  let rho = compensatedDot(residual, residual);
  let iterations = 0;
  let reliableResidualReplacements = 0;
  let originalResidualInfinity = maxAbs(rightHandSide);

  while (iterations < iterationLimit) {
    const unscaledDirection = direction.map(
      (value, index) => value * inverseSqrtDiagonal[index],
    );
    const unscaledAction = sparseMatrixVectorRaw(matrix, unscaledDirection);
    const scaledAction = unscaledAction.map(
      (value, index) => value * inverseSqrtDiagonal[index],
    );
    const curvature = compensatedDot(direction, scaledAction);
    if (!(curvature > 0) || !Number.isFinite(curvature)) {
      throw solverError('JACOBI_EQUILIBRATED_CG_NONPOSITIVE_CURVATURE', curvature);
    }
    const alpha = rho / curvature;
    for (let index = 0; index < matrix.size; index += 1) {
      kahanAdd(scaledSolution, scaledSolutionCompensation, index, alpha * direction[index]);
      kahanAdd(residual, scaledResidualCompensation, index, -alpha * scaledAction[index]);
    }
    iterations += 1;

    const recursiveResidualInfinity = maxAbs(residual);
    const reliableResidualDue = iterations % RELIABLE_RESIDUAL_INTERVAL === 0;
    if (reliableResidualDue || recursiveResidualInfinity <= convergenceTarget) {
      const solution = unscaleSolution(scaledSolution, inverseSqrtDiagonal);
      const exact = exactOriginalResidual(matrix, rightHandSide, solution);
      originalResidualInfinity = maxAbs(exact);
      if (originalResidualInfinity <= convergenceTarget) {
        return result(
          solution,
          iterations,
          iterationLimit,
          residualScale,
          residualTolerance,
          convergenceTarget,
          originalResidualInfinity,
          diagonalScale,
          diagonalTolerance,
          matrix.diagonal,
          reliableResidualReplacements,
          terminalEvidence(COMPENSATED_CSR_RESIDUAL, 0, [originalResidualInfinity]),
        );
      }

      // Preserve the mainline reliable-residual semantics in the symmetric
      // Jacobi-scaled system. The exact original-coordinate residual is mapped
      // back to scaled coordinates, and CG restarts from that residual. This
      // changes no matrix, load, tolerance or iteration budget.
      const scaledExact = exact.map(
        (value, index) => value * inverseSqrtDiagonal[index],
      );
      residual = scaledExact;
      scaledResidualCompensation.fill(0);
      direction = [...residual];
      rho = compensatedDot(residual, residual);
      reliableResidualReplacements += 1;
      if (!(rho > 0) || !Number.isFinite(rho)) {
        throw solverError('JACOBI_EQUILIBRATED_CG_RELIABLE_UPDATE_INVALID', rho);
      }
      continue;
    }

    const nextRho = compensatedDot(residual, residual);
    if (!(nextRho > 0) || !Number.isFinite(nextRho)) {
      throw solverError('JACOBI_EQUILIBRATED_CG_RESIDUAL_PRODUCT_INVALID', nextRho);
    }
    const beta = nextRho / rho;
    rho = nextRho;
    for (let index = 0; index < matrix.size; index += 1) {
      direction[index] = residual[index] + beta * direction[index];
    }
  }

  let solution = unscaleSolution(scaledSolution, inverseSqrtDiagonal);
  let exact = exactOriginalResidualDoubleDouble(matrix, rightHandSide, solution);
  originalResidualInfinity = maxAbs(exact);
  const refinementHistory = [originalResidualInfinity];
  let refinementSteps = 0;

  while (originalResidualInfinity > convergenceTarget
    && refinementSteps < POST_CAP_REFINEMENT_LIMIT) {
    // Work in the same Jacobi-scaled coordinates used by CG. The direction is
    // the current exact residual and alpha is the one-dimensional minimizer of
    // ||r_hat - alpha A_hat r_hat||_2. No matrix, load, tolerance or iteration
    // budget is changed; candidate steps are retained only when the independent
    // error-free-product residual oracle strictly decreases.
    const scaledExact = exact.map(
      (value, index) => value * inverseSqrtDiagonal[index],
    );
    const unscaledRefinementDirection = scaledExact.map(
      (value, index) => value * inverseSqrtDiagonal[index],
    );
    const unscaledAction = sparseMatrixVectorRaw(matrix, unscaledRefinementDirection);
    const scaledAction = unscaledAction.map(
      (value, index) => value * inverseSqrtDiagonal[index],
    );
    const numerator = compensatedDot(scaledAction, scaledExact);
    const denominator = compensatedDot(scaledAction, scaledAction);
    if (!(denominator > 0) || !Number.isFinite(denominator)
      || !Number.isFinite(numerator)) {
      throw solverError(
        'JACOBI_EQUILIBRATED_CG_REFINEMENT_INVALID',
        `${numerator}/${denominator}`,
      );
    }
    const alpha = numerator / denominator;
    if (!Number.isFinite(alpha)) {
      throw solverError('JACOBI_EQUILIBRATED_CG_REFINEMENT_ALPHA_INVALID', alpha);
    }

    const candidateScaled = scaledSolution.map(
      (value, index) => value + alpha * scaledExact[index],
    );
    const candidateSolution = unscaleSolution(candidateScaled, inverseSqrtDiagonal);
    const candidateExact = exactOriginalResidualDoubleDouble(
      matrix,
      rightHandSide,
      candidateSolution,
    );
    const candidateInfinity = maxAbs(candidateExact);
    if (!(candidateInfinity < originalResidualInfinity)) break;

    for (let index = 0; index < scaledSolution.length; index += 1) {
      scaledSolution[index] = candidateScaled[index];
    }
    solution = candidateSolution;
    exact = candidateExact;
    originalResidualInfinity = candidateInfinity;
    refinementSteps += 1;
    refinementHistory.push(candidateInfinity);
  }

  if (originalResidualInfinity > convergenceTarget) {
    throw solverError(
      'JACOBI_EQUILIBRATED_CG_DID_NOT_CONVERGE',
      `${originalResidualInfinity} > ${convergenceTarget} after ${iterations} iterations, ${reliableResidualReplacements} reliable residual replacements and ${refinementSteps} post-cap minimum-residual steps; history=${refinementHistory.join(',')}`,
    );
  }
  return result(
    solution,
    iterations,
    iterationLimit,
    residualScale,
    residualTolerance,
    convergenceTarget,
    originalResidualInfinity,
    diagonalScale,
    diagonalTolerance,
    matrix.diagonal,
    reliableResidualReplacements,
    terminalEvidence(ERROR_FREE_PRODUCT_RESIDUAL, refinementSteps, refinementHistory),
  );
}

function result(
  solution,
  iterations,
  iterationLimit,
  residualScale,
  residualTolerance,
  convergenceTarget,
  finalResidualInfinity,
  diagonalScale,
  diagonalTolerance,
  diagonal,
  reliableResidualReplacements,
  terminal,
) {
  const minimumDiagonal = Math.min(...diagonal);
  const maximumDiagonal = Math.max(...diagonal);
  return {
    solution: solution.map((value) => canonicalNumber(value, 'equilibrated CG displacement')),
    evidence: {
      method: 'DETERMINISTIC_JACOBI_PCG',
      algorithm: 'SYMMETRIC_JACOBI_EQUILIBRATED_CG_RELIABLE_RESIDUAL_V2',
      preconditioner: 'JACOBI',
      iterationLimit,
      iterations,
      reliableResidualInterval: RELIABLE_RESIDUAL_INTERVAL,
      reliableResidualReplacements,
      residualScale: canonicalNumber(residualScale),
      finalResidualInfinity: canonicalNumber(finalResidualInfinity),
      convergenceTarget: canonicalNumber(convergenceTarget),
      residualTolerance: canonicalNumber(residualTolerance),
      diagonalScale: canonicalNumber(diagonalScale),
      diagonalTolerance: canonicalNumber(diagonalTolerance),
      minimumDiagonal: canonicalNumber(minimumDiagonal),
      maximumDiagonal: canonicalNumber(maximumDiagonal),
      diagonalRatio: canonicalNumber(minimumDiagonal / maximumDiagonal),
      terminalResidualArithmetic: terminal.residualArithmetic,
      postCapRefinementMethod: terminal.refinementSteps > 0
        ? POST_CAP_REFINEMENT_METHOD
        : 'NOT_REQUIRED',
      postCapRefinementLimit: POST_CAP_REFINEMENT_LIMIT,
      postCapRefinementSteps: terminal.refinementSteps,
      postCapResidualHistory: terminal.residualHistory,
      accepted: true,
    },
  };
}

function terminalEvidence(residualArithmetic, refinementSteps, residualHistory) {
  return Object.freeze({
    residualArithmetic,
    refinementSteps,
    residualHistory: Object.freeze(residualHistory.map((value) => canonicalNumber(value))),
  });
}

function unscaleSolution(scaledSolution, inverseSqrtDiagonal) {
  return scaledSolution.map((value, index) => value * inverseSqrtDiagonal[index]);
}

function exactOriginalResidual(matrix, rightHandSide, solution) {
  const action = sparseMatrixVectorCompensatedRaw(matrix, solution);
  return rightHandSide.map((value, index) => value - action[index]);
}

function exactOriginalResidualDoubleDouble(matrix, rightHandSide, solution) {
  const action = sparseMatrixVectorDoubleDoubleRaw(matrix, solution);
  return rightHandSide.map((value, index) => value - action[index]);
}

function compensatedDot(left, right) {
  let sum = 0;
  let compensation = 0;
  for (let index = 0; index < left.length; index += 1) {
    const term = left[index] * right[index];
    const next = sum + term;
    compensation += Math.abs(sum) >= Math.abs(term)
      ? (sum - next) + term
      : (term - next) + sum;
    sum = next;
  }
  return sum + compensation;
}

function kahanAdd(values, compensation, index, increment) {
  const corrected = increment - compensation[index];
  const next = values[index] + corrected;
  compensation[index] = (next - values[index]) - corrected;
  values[index] = next;
}

function solverError(code, value) {
  const error = new Error(`${code}: ${value}`);
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
    throw new TypeError('Jacobi-equilibrated CG requires the local-continuum CSR system contract.');
  }
}