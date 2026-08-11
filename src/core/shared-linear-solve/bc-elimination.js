import { LinearSolvePrimitiveError } from './errors.js';

export function partitionSparseSystem(matrix, forceVector, prescribedMap) {
  const { size, rows } = matrix;
  const freeIndices = [];
  for (let i = 0; i < size; i += 1) if (!prescribedMap.has(i)) freeIndices.push(i);
  const globalToFree = new Map(freeIndices.map((globalIndex, freeIndex) => [globalIndex, freeIndex]));
  const freeRows = freeIndices.map(() => new Map());
  const rhs = freeIndices.map((globalIndex) => forceVector[globalIndex]);

  for (let row = 0; row < size; row += 1) {
    for (const [column, value] of rows[row]) {
      const rowFree = globalToFree.get(row);
      const columnFree = globalToFree.get(column);
      if (rowFree !== undefined && columnFree !== undefined) {
        freeRows[rowFree].set(columnFree, (freeRows[rowFree].get(columnFree) ?? 0) + value);
      } else if (rowFree !== undefined && columnFree === undefined) {
        rhs[rowFree] -= value * (prescribedMap.get(column) ?? 0);
      } else if (columnFree !== undefined && rowFree === undefined && row !== column) {
        rhs[columnFree] -= value * (prescribedMap.get(row) ?? 0);
      }
    }
  }
  const freeMatrix = Object.freeze({
    size: freeIndices.length,
    rows: Object.freeze(freeRows.map((row) => Object.freeze(row))),
  });
  return Object.freeze({
    freeMatrix,
    freeIndices: Object.freeze(freeIndices),
    rightHandSide: Object.freeze(rhs),
  });
}

export function reconstructFullDisplacement(size, freeIndices, freeSolution, prescribedMap) {
  if (freeIndices.length !== freeSolution.length) {
    throw new LinearSolvePrimitiveError(
      'freeIndices and freeSolution length mismatch',
      'INVALID_RECONSTRUCTION',
    );
  }
  const full = new Array(size).fill(0);
  freeIndices.forEach((globalIndex, freeIndex) => { full[globalIndex] = freeSolution[freeIndex]; });
  for (const [globalIndex, value] of prescribedMap) full[globalIndex] = value;
  return full;
}

export function springContribution(dofIndex, stiffness) {
  if (!(stiffness >= 0)) {
    throw new LinearSolvePrimitiveError(
      'Spring stiffness must be non-negative',
      'INVALID_SPRING_STIFFNESS',
    );
  }
  return Object.freeze({
    indices: Object.freeze([dofIndex]),
    localMatrix: Object.freeze([Object.freeze([stiffness])]),
  });
}
