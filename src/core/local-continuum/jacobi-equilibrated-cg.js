import { canonicalNumber, maxAbs, tolerance } from './numeric.js';
import {
  sparseMatrixVectorCompensatedRaw,
  sparseMatrixVectorDoubleDoubleRaw,
  sparseMatrixVectorRaw,
} from './sparse-matrix.js';

const POST_CAP_REFINEMENT_LIMIT = 3;
const POST_CAP_REFINEMENT_METHOD = 'JACOBI_SCALED_DD_INFINITY_SELECTED_MINIMUM_RESIDUAL';
const POST_CAP_KRYLOV2_MIN_DETERMINANT = 4096 * Number.EPSILON;
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
          terminalEvidence(COMPENSATED_CSR_RESIDUAL, 0, [originalResidualInfinity], []),
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

  let solution = unscaleSolution(scaledSolution, inverseSqrtDiagonal);
  let exact = exactOriginalResidualDoubleDouble(matrix, rightHandSide, solution);
  originalResidualInfinity = maxAbs(exact);
  const refinementHistory = [originalResidualInfinity];
  const refinementDimensions = [];
  let refinementSteps = 0;

  while (originalResidualInfinity > convergenceTarget
    && refinementSteps < POST_CAP_REFINEMENT_LIMIT) {
    // Generate both the historical one-dimensional minimum-residual correction
    // and, when independent, the K2 correction in the Jacobi-scaled space.
    // The scaled 2-norm calculation only proposes candidates; acceptance is
    // governed by the independent error-free-product residual in original
    // coordinates. Choosing the smallest DD infinity residual guarantees that
    // adding K2 cannot suppress a better historical K1 correction.
    const candidates = minimumResidualCandidates(
      matrix,
      scaledSolution,
      exact,
      inverseSqrtDiagonal,
    );
    const evaluated = candidates.map((candidate) => evaluateRefinementCandidate(
      matrix,
      rightHandSide,
      candidate,
      inverseSqrtDiagonal,
    ));
    const best = evaluated.reduce((selected, candidate) => (
      selected === null || candidate.residualInfinity < selected.residualInfinity
        ? candidate
        : selected
    ), null);
    if (!best || !(best.residualInfinity < originalResidualInfinity)) break;

    for (let index = 0; index < scaledSolution.length; index += 1) {
      scaledSolution[index] = best.scaledSolution[index];
    }
    solution = best.solution;
    exact = best.exactResidual;
    originalResidualInfinity = best.residualInfinity;
    refinementSteps += 1;
    refinementHistory.push(originalResidualInfinity);
    refinementDimensions.push(best.dimension);
  }

  if (originalResidualInfinity > convergenceTarget) {
    throw solverError(
      'JACOBI_EQUILIBRATED_CG_DID_NOT_CONVERGE',
      `${originalResidualInfinity} > ${convergenceTarget} after ${iterations} iterations and ${refinementSteps} post-cap DD-selected minimum-residual steps; history=${refinementHistory.join(',')}; dimensions=${refinementDimensions.join(',')}`,
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
    terminalEvidence(
      ERROR_FREE_PRODUCT_RESIDUAL,
      refinementSteps,
      refinementHistory,
      refinementDimensions,
    ),
  );
}

function minimumResidualCandidates(
  matrix,
  scaledSolution,
  exactResidual,
  inverseSqrtDiagonal,
) {
  const scaledResidual = exactResidual.map(
    (value, index) => value * inverseSqrtDiagonal[index],
  );
  const action1 = scaledMatrixAction(matrix, scaledResidual, inverseSqrtDiagonal);
  const action1NormSquared = compensatedDot(action1, action1);
  if (!(action1NormSquared > 0) || !Number.isFinite(action1NormSquared)) {
    throw solverError(
      'JACOBI_EQUILIBRATED_CG_REFINEMENT_ACTION_INVALID',
      action1NormSquared,
    );
  }

  const oneDimensional = oneDimensionalMinimumResidualCandidate(
    scaledSolution,
    scaledResidual,
    action1,
    action1NormSquared,
  );
  const action2 = scaledMatrixAction(matrix, action1, inverseSqrtDiagonal);
  const action2NormSquared = compensatedDot(action2, action2);
  if (!(action2NormSquared > 0) || !Number.isFinite(action2NormSquared)) {
    return Object.freeze([oneDimensional]);
  }

  const action1Norm = Math.sqrt(action1NormSquared);
  const action2Norm = Math.sqrt(action2NormSquared);
  const normalizedCross = compensatedDot(action1, action2) / (action1Norm * action2Norm);
  if (!Number.isFinite(normalizedCross)) {
    throw solverError(
      'JACOBI_EQUILIBRATED_CG_REFINEMENT_KRYLOV2_CROSS_INVALID',
      normalizedCross,
    );
  }
  const determinant = 1 - normalizedCross * normalizedCross;
  if (!(determinant > POST_CAP_KRYLOV2_MIN_DETERMINANT)) {
    return Object.freeze([oneDimensional]);
  }

  const rhs1 = compensatedDot(action1, scaledResidual) / action1Norm;
  const rhs2 = compensatedDot(action2, scaledResidual) / action2Norm;
  if (!Number.isFinite(rhs1) || !Number.isFinite(rhs2)) {
    throw solverError(
      'JACOBI_EQUILIBRATED_CG_REFINEMENT_KRYLOV2_RHS_INVALID',
      `${rhs1}/${rhs2}`,
    );
  }
  const normalizedCoefficient1 = (rhs1 - normalizedCross * rhs2) / determinant;
  const normalizedCoefficient2 = (rhs2 - normalizedCross * rhs1) / determinant;
  const alpha = normalizedCoefficient1 / action1Norm;
  const beta = normalizedCoefficient2 / action2Norm;
  if (!Number.isFinite(alpha) || !Number.isFinite(beta)) {
    throw solverError(
      'JACOBI_EQUILIBRATED_CG_REFINEMENT_KRYLOV2_COEFFICIENT_INVALID',
      `${alpha}/${beta}`,
    );
  }

  const twoDimensional = Object.freeze({
    dimension: 2,
    scaledSolution: scaledSolution.map(
      (value, index) => value + alpha * scaledResidual[index] + beta * action1[index],
    ),
  });
  return Object.freeze([oneDimensional, twoDimensional]);
}

function oneDimensionalMinimumResidualCandidate(
  scaledSolution,
  scaledResidual,
  action,
  actionNormSquared,
) {
  const numerator = compensatedDot(action, scaledResidual);
  if (!Number.isFinite(numerator)) {
    throw solverError(
      'JACOBI_EQUILIBRATED_CG_REFINEMENT_KRYLOV1_RHS_INVALID',
      numerator,
    );
  }
  const alpha = numerator / actionNormSquared;
  if (!Number.isFinite(alpha)) {
    throw solverError('JACOBI_EQUILIBRATED_CG_REFINEMENT_ALPHA_INVALID', alpha);
  }
  return Object.freeze({
    dimension: 1,
    scaledSolution: scaledSolution.map(
      (value, index) => value + alpha * scaledResidual[index],
    ),
  });
}

function evaluateRefinementCandidate(
  matrix,
  rightHandSide,
  candidate,
  inverseSqrtDiagonal,
) {
  const solution = unscaleSolution(candidate.scaledSolution, inverseSqrtDiagonal);
  const exactResidual = exactOriginalResidualDoubleDouble(matrix, rightHandSide, solution);
  return Object.freeze({
    dimension: candidate.dimension,
    scaledSolution: candidate.scaledSolution,
    solution,
    exactResidual,
    residualInfinity: maxAbs(exactResidual),
  });
}

function scaledMatrixAction(matrix, scaledVector, inverseSqrtDiagonal) {
  const unscaledVector = scaledVector.map(
    (value, index) => value * inverseSqrtDiagonal[index],
  );
  const unscaledAction = sparseMatrixVectorRaw(matrix, unscaledVector);
  return unscaledAction.map(
    (value, index) => value * inverseSqrtDiagonal[index],
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
  terminal,
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
      terminalResidualArithmetic: terminal.residualArithmetic,
      postCapRefinementMethod: terminal.refinementSteps > 0
        ? POST_CAP_REFINEMENT_METHOD
        : 'NOT_REQUIRED',
      postCapRefinementLimit: POST_CAP_REFINEMENT_LIMIT,
      postCapRefinementSteps: terminal.refinementSteps,
      postCapRefinementDimensions: terminal.refinementDimensions,
      postCapResidualHistory: terminal.residualHistory,
      accepted: true,
    },
  };
}

function terminalEvidence(
  residualArithmetic,
  refinementSteps,
  residualHistory,
  refinementDimensions,
) {
  return Object.freeze({
    residualArithmetic,
    refinementSteps,
    residualHistory: Object.freeze(residualHistory.map((value) => canonicalNumber(value))),
    refinementDimensions: Object.freeze([...refinementDimensions]),
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
