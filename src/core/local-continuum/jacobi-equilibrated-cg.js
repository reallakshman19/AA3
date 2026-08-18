import { canonicalNumber, maxAbs, tolerance } from './numeric.js';
import {
  sparseMatrixVectorCompensatedRaw,
  sparseMatrixVectorDoubleDoubleRaw,
  sparseMatrixVectorRaw,
} from './sparse-matrix.js';

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

    if (iterations % 100 === 0 || maxAbs(residual) <= convergenceTarget) {
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
        );
      }
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

  const solution = unscaleSolution(scaledSolution, inverseSqrtDiagonal);
  originalResidualInfinity = maxAbs(exactOriginalResidual(matrix, rightHandSide, solution));
  if (originalResidualInfinity > convergenceTarget) {
    throw solverError(
      'JACOBI_EQUILIBRATED_CG_DID_NOT_CONVERGE',
      `${originalResidualInfinity} > ${convergenceTarget} after ${iterations}`,
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
) {
  const minimumDiagonal = Math.min(...diagonal);
  const maximumDiagonal = Math.max(...diagonal);
  return {
    solution: solution.map((value) => canonicalNumber(value, 'equilibrated CG displacement')),
    evidence: {
      method: 'DETERMINISTIC_JACOBI_PCG',
      algorithm: 'SYMMETRIC_JACOBI_EQUILIBRATED_CG',
      preconditioner: 'JACOBI',
      iterationLimit,
      iterations,
      residualScale: canonicalNumber(residualScale),
      finalResidualInfinity: canonicalNumber(finalResidualInfinity),
      convergenceTarget: canonicalNumber(convergenceTarget),
      residualTolerance: canonicalNumber(residualTolerance),
      diagonalScale: canonicalNumber(diagonalScale),
      diagonalTolerance: canonicalNumber(diagonalTolerance),
      minimumDiagonal: canonicalNumber(minimumDiagonal),
      maximumDiagonal: canonicalNumber(maximumDiagonal),
      diagonalRatio: canonicalNumber(minimumDiagonal / maximumDiagonal),
      accepted: true,
    },
  };
}

function unscaleSolution(scaledSolution, inverseSqrtDiagonal) {
  return scaledSolution.map((value, index) => value * inverseSqrtDiagonal[index]);
}

function exactOriginalResidual(matrix, rightHandSide, solution) {
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
