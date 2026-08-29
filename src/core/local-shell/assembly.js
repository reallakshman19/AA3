import {
  assembleSparseSymmetric,
  sparseMultiply,
  sparseNonzeroCount,
} from '../lafea-linear-solve/index.js';
import { DOFS } from './constants.js';
import { matrixScale, matrixVector, symmetryResidual, zeros } from './matrix.js';
import { qualification } from './numeric.js';

export const DENSE_SHELL_STIFFNESS_DOF_LIMIT = 1536;
export const SPARSE_SHELL_STIFFNESS_SCHEMA = 'local-shell-symmetric-sparse-stiffness/v1';
export const SPARSE_SHELL_STIFFNESS_STORAGE = 'SPARSE_LOWER_SYMMETRIC';

export function assembleGlobalSystem(model, elements) {
  const dofCount = model.nodes.length * DOFS.length;
  return dofCount > DENSE_SHELL_STIFFNESS_DOF_LIMIT
    ? assembleSparseGlobalSystem(model, elements)
    : assembleDenseGlobalSystem(model, elements);
}

export function assembleDenseGlobalSystem(model, elements) {
  const context = assemblyContext(model);
  const stiffness = zeros(context.dofOrdering.length, context.dofOrdering.length);
  const elementAssembly = [];
  for (const element of elements) {
    const indices = elementIndices(element, context.dofIndex);
    assembleDenseElement(stiffness, element.globalStiffness, indices);
    elementAssembly.push({ elementId: element.elementId, globalDofIndices: indices });
  }
  return {
    ...context,
    stiffness,
    retainedStiffness: stiffness,
    stiffnessStorage: 'DENSE',
    elementAssembly,
    symmetry: qualification(
      symmetryResidual(stiffness),
      matrixScale(stiffness),
      model.qualificationProfile.globalStiffnessSymmetry,
    ),
  };
}

export function assembleSparseGlobalSystem(model, elements) {
  const context = assemblyContext(model);
  const elementAssembly = elements.map((element) => ({
    elementId: element.elementId,
    globalDofIndices: elementIndices(element, context.dofIndex),
  }));
  const contributions = elements.map((element, index) => ({
    indices: elementAssembly[index].globalDofIndices,
    localMatrix: element.globalStiffness,
  }));
  const stiffness = assembleSparseSymmetric(context.dofOrdering.length, contributions);
  const scale = sparseMatrixScale(stiffness);
  const residual = Math.max(
    0,
    ...elements.map((element) => element.qualification.globalStiffnessSymmetry.actual),
  );
  return {
    ...context,
    stiffness,
    retainedStiffness: retainedSparseStiffness(stiffness),
    stiffnessStorage: SPARSE_SHELL_STIFFNESS_STORAGE,
    elementAssembly,
    symmetry: qualification(
      residual,
      scale,
      model.qualificationProfile.globalStiffnessSymmetry,
    ),
  };
}

export function globalStiffnessAction(assembly, vector) {
  return assembly.stiffnessStorage === SPARSE_SHELL_STIFFNESS_STORAGE
    ? sparseMultiply(assembly.stiffness, vector)
    : matrixVector(assembly.stiffness, vector);
}

function assemblyContext(model) {
  const dofOrdering = model.nodes.flatMap((node) =>
    DOFS.map((dof) => `${node.nodeId}:${dof}`));
  return {
    dofOrdering,
    dofIndex: new Map(dofOrdering.map((identity, index) => [identity, index])),
  };
}

function elementIndices(element, dofIndex) {
  const indices = element.globalDofOrdering.map((identity) => dofIndex.get(identity));
  if (indices.some((index) => !Number.isInteger(index))) {
    throw new TypeError(`Element ${element.elementId} references an unknown global DOF.`);
  }
  return indices;
}

function assembleDenseElement(global, local, indices) {
  for (let row = 0; row < indices.length; row += 1) {
    for (let column = 0; column < indices.length; column += 1) {
      global[indices[row]][indices[column]] += local[row][column];
    }
  }
}

function sparseMatrixScale(matrix) {
  let scale = 0;
  for (const row of matrix.rows) {
    for (const value of row.values()) scale = Math.max(scale, Math.abs(value));
  }
  return scale;
}

function retainedSparseStiffness(matrix) {
  return {
    schema: SPARSE_SHELL_STIFFNESS_SCHEMA,
    storage: SPARSE_SHELL_STIFFNESS_STORAGE,
    size: matrix.size,
    nonzeroCount: sparseNonzeroCount(matrix),
    lowerTriangleRows: matrix.rows.map((row) => [...row.entries()]),
  };
}
