import {
  partitionSparseSystem,
  solveDeterministicJacobiPcg,
  sparseMultiply,
} from '../lafea-linear-solve/index.js';
import { FORMULA_IDS } from './constants.js';
import { ShellNumericalError, ShellSingularSystemError } from './errors.js';
import { generalizedTotals } from './loads.js';
import { zeros } from './matrix.js';
import { cleanNumber, maxAbs, qualification, tolerance } from './numeric.js';
import {
  globalStiffnessAction,
  SPARSE_SHELL_STIFFNESS_STORAGE,
} from './assembly.js';
import { add } from './vector.js';

const STRUCTURAL_PCG_FAILURES = new Set([
  'PCG_INDEFINITE_DIAGONAL',
  'PCG_SINGULAR_DIAGONAL',
  'PCG_NON_POSITIVE_INITIAL_PRODUCT',
  'PCG_NON_POSITIVE_CURVATURE',
  'PCG_NON_POSITIVE_RELIABLE_PRODUCT',
  'PCG_NON_POSITIVE_RESIDUAL_PRODUCT',
]);

export function solveLoadCase(model, assembly, loadEvidence) {
  const partition = buildPartition(model, assembly);
  const solved = partition.freeIndices.length === 0
    ? fullyConstrainedEvidence()
    : solvePartitionedSystem(model, assembly, loadEvidence.forceVector, partition);
  const displacement = reconstructDisplacement(partition, solved.solution, assembly.dofOrdering.length);
  const reaction = globalStiffnessAction(assembly, displacement)
    .map((value, index) => cleanNumber(value - loadEvidence.forceVector[index]));
  const residualEvidence = freeResidualEvidence(reaction, partition, loadEvidence.forceVector, model.qualificationProfile.freeDofResidual);
  const equilibrium = equilibriumEvidence(model, reaction, partition, loadEvidence, model.qualificationProfile);
  const solverFormula = formulaIdForSolver(solved.evidence.method);
  return {
    displacement,
    reaction,
    freeDofIdentities: partition.freeIndices.map((index) => assembly.dofOrdering[index]),
    constrainedDofIdentities: partition.constrainedIndices.map((index) => assembly.dofOrdering[index]),
    prescribedValues: partition.constrainedValues,
    solverEvidence: solved.evidence,
    freeDofResiduals: residualEvidence.values,
    freeDofResidualQualification: residualEvidence.qualification,
    forceEquilibrium: equilibrium.force,
    momentEquilibrium: equilibrium.moment,
    formulaIds: [FORMULA_IDS.PARTITION, ...(solverFormula ? [solverFormula] : []), FORMULA_IDS.REACTION],
  };
}

function buildPartition(model, assembly) {
  const prescribed = new Map(model.constraints.map((item) => [`${item.nodeId}:${item.dof}`, item.value]));
  const freeIndices = [];
  const constrainedIndices = [];
  const constrainedValues = [];
  const prescribedMap = new Map();
  assembly.dofOrdering.forEach((identity, index) => {
    if (prescribed.has(identity)) {
      const value = prescribed.get(identity);
      constrainedIndices.push(index);
      constrainedValues.push(value);
      prescribedMap.set(index, value);
    } else freeIndices.push(index);
  });
  return { freeIndices, constrainedIndices, constrainedValues, prescribedMap };
}

function solvePartitionedSystem(model, assembly, force, partition) {
  if (assembly.stiffnessStorage === SPARSE_SHELL_STIFFNESS_STORAGE) {
    return sparseSolve(assembly.stiffness, force, partition, model.qualificationProfile);
  }
  const rightHandSide = effectiveRightHandSide(assembly.stiffness, force, partition);
  return denseCholeskySolve(
    partitionedMatrix(assembly.stiffness, partition.freeIndices),
    rightHandSide,
    model.qualificationProfile.choleskyPivot,
  );
}

function effectiveRightHandSide(stiffness, force, partition) {
  return partition.freeIndices.map((row) => {
    let value = force[row];
    for (let index = 0; index < partition.constrainedIndices.length; index += 1) {
      value -= stiffness[row][partition.constrainedIndices[index]] * partition.constrainedValues[index];
    }
    return cleanNumber(value);
  });
}

function partitionedMatrix(stiffness, indices) {
  return indices.map((row) => indices.map((column) => stiffness[row][column]));
}

function sparseSolve(stiffness, force, partition, profile) {
  const reduced = partitionSparseSystem(stiffness, force, partition.prescribedMap);
  if (!sameIndices(reduced.freeIndices, partition.freeIndices)) {
    throw new ShellSingularSystemError('Sparse partition changed free-DOF ordering unexpectedly.');
  }
  const diagonal = reduced.freeMatrix.rows.map((row, index) => row.get(index) ?? 0);
  const diagonalScale = Math.max(1, ...diagonal.map((value) => Math.abs(value)));
  const diagonalTolerance = tolerance(profile.choleskyPivot, diagonalScale);
  const residualScale = Math.max(1, maxAbs(reduced.rightHandSide));
  const residualTolerance = tolerance(profile.freeDofResidual, residualScale);
  let solved;
  try {
    solved = solveDeterministicJacobiPcg({
      size: reduced.freeMatrix.size,
      diagonal,
      rightHandSide: [...reduced.rightHandSide],
      multiply: (vector) => sparseMultiply(reduced.freeMatrix, vector),
      diagonalTolerance,
      residualTolerance,
    });
  } catch (error) {
    mapPcgFailure(error);
  }
  return {
    solution: solved.solution.map((value) => cleanNumber(value)),
    evidence: pcgEvidence(solved.evidence),
    executed: true,
  };
}

function mapPcgFailure(error) {
  if (STRUCTURAL_PCG_FAILURES.has(error?.code)) {
    throw new ShellSingularSystemError(
      'Free sparse stiffness system is singular, indefinite or under-constrained',
      error.evidence,
    );
  }
  if (error?.code === 'PCG_DID_NOT_CONVERGE') {
    throw new ShellNumericalError('Sparse PCG did not converge within its qualified residual target', error.evidence);
  }
  throw error;
}

function pcgEvidence(evidence) {
  return {
    method: evidence.method,
    algorithmRevision: evidence.algorithmRevision,
    pivotScale: null,
    pivotTolerance: null,
    pivots: [],
    minimumPivot: null,
    maximumPivot: null,
    pivotRatio: null,
    preconditioner: evidence.preconditioner,
    iterationLimit: evidence.iterationLimit,
    iterations: evidence.iterations,
    reliableResidualInterval: evidence.reliableResidualInterval,
    reliableResidualReplacements: evidence.reliableResidualReplacements,
    residualScale: cleanNumber(evidence.residualScale),
    initialResidualInfinity: cleanNumber(evidence.initialResidualInfinity),
    finalResidualInfinity: cleanNumber(evidence.finalResidualInfinity),
    convergenceTarget: cleanNumber(evidence.convergenceTarget),
    residualTolerance: cleanNumber(evidence.residualTolerance),
    diagonalScale: cleanNumber(evidence.diagonalScale),
    diagonalTolerance: cleanNumber(evidence.diagonalTolerance),
    minimumDiagonal: cleanNumber(evidence.minimumDiagonal),
    maximumDiagonal: cleanNumber(evidence.maximumDiagonal),
    diagonalRatio: cleanNumber(evidence.diagonalRatio),
    accepted: evidence.accepted === true,
  };
}

function denseCholeskySolve(matrix, rhs, rule) {
  const size = matrix.length;
  const lower = zeros(size, size);
  const pivots = [];
  const scale = Math.max(1, ...matrix.map((row, index) => Math.abs(row[index])));
  const pivotTolerance = tolerance(rule, scale);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      let value = matrix[row][column];
      for (let inner = 0; inner < column; inner += 1) value -= lower[row][inner] * lower[column][inner];
      if (row === column) {
        pivots.push(cleanNumber(value));
        if (!(value > pivotTolerance)) throw new ShellSingularSystemError('Free stiffness system is singular, indefinite or under-constrained', { pivots, scale, pivotTolerance });
        lower[row][column] = Math.sqrt(value);
      } else lower[row][column] = value / lower[column][column];
    }
  }
  const solution = backwardSubstitution(lower, forwardSubstitution(lower, rhs));
  return {
    solution,
    evidence: pivotEvidence(pivots, scale, pivotTolerance, 'DETERMINISTIC_DENSE_CHOLESKY'),
    executed: true,
  };
}

function forwardSubstitution(lower, rhs) {
  const result = Array(rhs.length).fill(0);
  for (let row = 0; row < rhs.length; row += 1) {
    let value = rhs[row];
    for (let column = 0; column < row; column += 1) value -= lower[row][column] * result[column];
    result[row] = value / lower[row][row];
  }
  return result;
}

function backwardSubstitution(lower, rhs) {
  const result = Array(rhs.length).fill(0);
  for (let row = rhs.length - 1; row >= 0; row -= 1) {
    let value = rhs[row];
    for (let column = row + 1; column < rhs.length; column += 1) value -= lower[column][row] * result[column];
    result[row] = cleanNumber(value / lower[row][row]);
  }
  return result;
}

function reconstructDisplacement(partition, freeValues, size) {
  const result = Array(size).fill(0);
  partition.freeIndices.forEach((index, order) => { result[index] = cleanNumber(freeValues[order]); });
  partition.constrainedIndices.forEach((index, order) => { result[index] = cleanNumber(partition.constrainedValues[order]); });
  return result;
}

function freeResidualEvidence(reaction, partition, force, rule) {
  const values = partition.freeIndices.map((index) => cleanNumber(reaction[index]));
  const scale = Math.max(1, maxAbs(force), maxAbs(reaction));
  return { values, qualification: qualification(maxAbs(values), scale, rule) };
}

function equilibriumEvidence(model, reaction, partition, loads, profile) {
  const support = Array(reaction.length).fill(0);
  partition.constrainedIndices.forEach((index) => { support[index] = reaction[index]; });
  const supportTotals = generalizedTotals(model.nodes, support);
  const forceResidual = add(loads.appliedForce, supportTotals.force);
  const momentResidual = add(loads.appliedMomentAboutOrigin, supportTotals.moment);
  const forceScale = Math.max(1, maxAbs(loads.appliedForce), maxAbs(supportTotals.force));
  const momentScale = Math.max(1, maxAbs(loads.appliedMomentAboutOrigin), maxAbs(supportTotals.moment));
  return {
    force: { residual: forceResidual, qualification: qualification(maxAbs(forceResidual), forceScale, profile.forceEquilibrium) },
    moment: { residual: momentResidual, qualification: qualification(maxAbs(momentResidual), momentScale, profile.momentEquilibrium) },
  };
}

function pivotEvidence(pivots, scale, pivotTolerance, method) {
  const minimumPivot = Math.min(...pivots);
  const maximumPivot = Math.max(...pivots);
  return {
    method,
    pivots: pivots.map((value) => cleanNumber(value)),
    pivotScale: scale,
    pivotTolerance,
    minimumPivot: cleanNumber(minimumPivot),
    maximumPivot: cleanNumber(maximumPivot),
    pivotRatio: cleanNumber(minimumPivot / maximumPivot),
  };
}

function fullyConstrainedEvidence() {
  return {
    solution: [],
    evidence: {
      method: 'FULLY_CONSTRAINED_NO_FREE_SOLVE',
      pivots: [],
      pivotScale: 0,
      pivotTolerance: 0,
      minimumPivot: null,
      maximumPivot: null,
      pivotRatio: null,
    },
    executed: false,
  };
}

function formulaIdForSolver(method) {
  if (method === 'DETERMINISTIC_DENSE_CHOLESKY') return FORMULA_IDS.CHOLESKY;
  if (method === 'DETERMINISTIC_JACOBI_PCG') return FORMULA_IDS.PCG;
  return null;
}

function sameIndices(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
