#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  MODEL_SCHEMA,
  QUALIFICATION_PROFILE,
} from '../src/core/local-continuum/index.js';
import { assembleMesh } from '../src/core/local-continuum/assembly.js';
import { buildElementEvidence } from '../src/core/local-continuum/element.js';
import { assembleLoadCase } from '../src/core/local-continuum/loads.js';
import {
  matrixVector,
  multiply,
  scaleMatrix,
  transpose,
  zeros,
} from '../src/core/local-continuum/matrix.js';
import { solvePartitioned } from '../src/core/local-continuum/solver.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { runPython } from './lib/python-interpreter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const B01 = path.join(ROOT, 'validation/lafea-benchmark-data/B01');
const CASES = readJson(path.join(B01, 'oracle/cases.json'));
const RIGID = CASES.cases.find((row) => row.caseId === 'LAFEA3-AFFINE-RIGID-04');
const MESH_ROWS = readJson(path.join(B01, 'meshes/mesh-generation-summary.json')).meshes;
const MESH_GENERATOR = path.join(B01, 'mesh-generator.py');
const COMPOSITION = requireLafeaStageComposition('LAFEA.3');
const GATE = 1e-10;

if (!RIGID) throw new Error('Missing frozen rigid B01 case.');

const diagnostics = MESH_ROWS.map(diagnoseMesh);
process.stdout.write(`${JSON.stringify({
  schema: 'lafea-b01-affine-completeness-stiffness-diagnostic/v1',
  issue: 1100,
  exactHead: git(['rev-parse', 'HEAD']),
  purpose: 'Evidence-only closure of the derivative partition-of-unity and linear-reproduction identities at each T3/T6/Q8 B matrix before stiffness construction. Three well-conditioned derivative entries are reconstructed from the exact affine-completeness constraints; all other derivative entries, quadrature, constitutive data, meshes, loads, solver settings and tolerances remain unchanged.',
  productionMechanicsChangedByDiagnostic: false,
  frozenGate: GATE,
  diagnostics,
}, null, 2)}\n`);

function diagnoseMesh(meshRow) {
  try {
    const compact = JSON.parse(runPython([MESH_GENERATOR, '--emit', '--family', meshRow.family, '--mesh', meshRow.meshId],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
    ));
    if (compact.meshSemanticHash !== meshRow.meshSemanticHash) {
      throw new Error(`Mesh semantic hash mismatch for ${meshRow.meshId}.`);
    }
    const physical = materializeMesh(compact, RIGID);
    const source = createSource(RIGID, physical);
    const model = COMPOSITION.canonicalize(COMPOSITION.normalizeDocument(source));
    const nodeMap = new Map(model.nodes.map((row) => [row.nodeId, row]));
    const originalElements = buildElementEvidence(model);
    const originalMesh = assembleMesh(model, originalElements);
    if (originalMesh.globalStiffnessStorage !== 'DENSE') {
      return { family: meshRow.family, meshId: meshRow.meshId, status: 'NOT_APPLICABLE' };
    }
    const correction = correctElements(originalElements, nodeMap);
    const correctedMesh = assembleMesh(model, correction.elements);
    const loadCase = model.loadCases.find((row) => row.loadCaseId === 'AFFINE');
    const correctedLoad = assembleLoadCase(model, correctedMesh, correction.elements, loadCase);
    const correctedSolution = solvePartitioned(model, correctedMesh, correctedLoad);
    const partition = partitionIndices(model, correctedMesh.dofOrdering, correctedLoad.imposedDisplacements);
    const exact = exactDisplacement(model, correctedMesh.dofOrdering);
    const currentExact = evaluateAction(
      originalMesh.globalStiffnessMatrix,
      exact,
      correctedLoad.forceVector,
      partition,
    );
    const correctedExact = evaluateAction(
      correctedMesh.globalStiffnessMatrix,
      exact,
      correctedLoad.forceVector,
      partition,
    );
    const correctedSolved = currentSolutionResidual(correctedSolution, correctedLoad);
    return {
      family: meshRow.family,
      meshId: meshRow.meshId,
      status: 'EVALUATED',
      currentExactRigidAction: currentExact,
      correctedExactRigidAction: correctedExact,
      correctedSolvedResidual: correctedSolved,
      correctedSolvedQualifies: correctedSolved.normalizedFreeResidual <= GATE,
      maximumDerivativeAbsoluteChange: correction.maximumDerivativeAbsoluteChange,
      maximumAffineCompletenessResidualBefore: correction.maximumCompletenessResidualBefore,
      maximumAffineCompletenessResidualAfter: correction.maximumCompletenessResidualAfter,
      maximumRelativeElementStiffnessChange: correction.maximumRelativeStiffnessChange,
      maximumAffineEnergyRelativeChange: correction.maximumAffineEnergyRelativeChange,
      pivotNodePatterns: correction.pivotNodePatterns,
    };
  } catch (error) {
    return {
      family: meshRow.family,
      meshId: meshRow.meshId,
      status: 'DIAGNOSTIC_FAILURE',
      error: {
        code: error?.code ?? error?.name ?? 'ERROR',
        path: error?.path ?? 'diagnostic',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function correctElements(elements, nodeMap) {
  let maximumDerivativeAbsoluteChange = 0;
  let maximumCompletenessResidualBefore = 0;
  let maximumCompletenessResidualAfter = 0;
  let maximumRelativeStiffnessChange = 0;
  let maximumAffineEnergyRelativeChange = 0;
  const pivotNodePatterns = new Set();
  const corrected = elements.map((element) => {
    const nodes = element.nodeIds.map((nodeId) => nodeMap.get(nodeId));
    if (element.gaussEvidence?.length) {
      let stiffness = zeros(element.localStiffnessMatrix.length, element.localStiffnessMatrix.length);
      for (const gp of element.gaussEvidence) {
        const closed = closeBMatrix(gp.B, nodes);
        maximumDerivativeAbsoluteChange = Math.max(maximumDerivativeAbsoluteChange, closed.maximumChange);
        maximumCompletenessResidualBefore = Math.max(maximumCompletenessResidualBefore, closed.beforeResidual);
        maximumCompletenessResidualAfter = Math.max(maximumCompletenessResidualAfter, closed.afterResidual);
        pivotNodePatterns.add(closed.pivotNodes.join(','));
        const contribution = scaleMatrix(
          multiply(multiply(transpose(closed.B), element.dMatrix), closed.B),
          element.thickness * gp.jacobianDeterminant * gp.weight,
        );
        stiffness = stiffness.map((row, i) => row.map((value, j) => value + contribution[i][j]));
      }
      maximumRelativeStiffnessChange = Math.max(
        maximumRelativeStiffnessChange,
        matrixDifference(stiffness, element.localStiffnessMatrix)
          / Math.max(1, matrixMaximum(element.localStiffnessMatrix)),
      );
      maximumAffineEnergyRelativeChange = Math.max(
        maximumAffineEnergyRelativeChange,
        affineEnergyChange(element.localStiffnessMatrix, stiffness, nodes),
      );
      return { ...element, localStiffnessMatrix: stiffness };
    }
    const closed = closeBMatrix(element.bMatrix, nodes);
    maximumDerivativeAbsoluteChange = Math.max(maximumDerivativeAbsoluteChange, closed.maximumChange);
    maximumCompletenessResidualBefore = Math.max(maximumCompletenessResidualBefore, closed.beforeResidual);
    maximumCompletenessResidualAfter = Math.max(maximumCompletenessResidualAfter, closed.afterResidual);
    pivotNodePatterns.add(closed.pivotNodes.join(','));
    const stiffness = scaleMatrix(
      multiply(multiply(transpose(closed.B), element.dMatrix), closed.B),
      element.thickness * element.canonicalArea,
    );
    maximumRelativeStiffnessChange = Math.max(
      maximumRelativeStiffnessChange,
      matrixDifference(stiffness, element.localStiffnessMatrix)
        / Math.max(1, matrixMaximum(element.localStiffnessMatrix)),
    );
    maximumAffineEnergyRelativeChange = Math.max(
      maximumAffineEnergyRelativeChange,
      affineEnergyChange(element.localStiffnessMatrix, stiffness, nodes),
    );
    return { ...element, bMatrix: closed.B, localStiffnessMatrix: stiffness };
  });
  return {
    elements: corrected,
    maximumDerivativeAbsoluteChange,
    maximumCompletenessResidualBefore,
    maximumCompletenessResidualAfter,
    maximumRelativeStiffnessChange,
    maximumAffineEnergyRelativeChange,
    pivotNodePatterns: [...pivotNodePatterns].sort(),
  };
}

function closeBMatrix(B, nodes) {
  const count = nodes.length;
  const dNdx = Array.from({ length: count }, (_, index) => B[0][2 * index]);
  const dNdy = Array.from({ length: count }, (_, index) => B[1][2 * index + 1]);
  const scale = Math.max(
    1,
    ...nodes.flatMap((node) => [Math.abs(node.x), Math.abs(node.y)]),
  );
  const centroidX = compensatedSum(nodes.map((node) => node.x)) / count;
  const centroidY = compensatedSum(nodes.map((node) => node.y)) / count;
  const coordinates = nodes.map((node) => ({
    x: (node.x - centroidX) / scale,
    y: (node.y - centroidY) / scale,
  }));
  const pivots = selectPivots(coordinates);
  const correctedDx = closeDerivative(dNdx, coordinates, pivots, [0, 1 / scale, 0]);
  const correctedDy = closeDerivative(dNdy, coordinates, pivots, [0, 0, 1 / scale]);
  const output = zeros(3, 2 * count);
  for (let index = 0; index < count; index += 1) {
    output[0][2 * index] = correctedDx[index];
    output[1][2 * index + 1] = correctedDy[index];
    output[2][2 * index] = correctedDy[index];
    output[2][2 * index + 1] = correctedDx[index];
  }
  const beforeResidual = Math.max(
    derivativeResidual(dNdx, coordinates, [0, 1 / scale, 0]),
    derivativeResidual(dNdy, coordinates, [0, 0, 1 / scale]),
  );
  const afterResidual = Math.max(
    derivativeResidual(correctedDx, coordinates, [0, 1 / scale, 0]),
    derivativeResidual(correctedDy, coordinates, [0, 0, 1 / scale]),
  );
  return {
    B: output,
    maximumChange: Math.max(
      maxAbs(correctedDx.map((value, index) => value - dNdx[index])),
      maxAbs(correctedDy.map((value, index) => value - dNdy[index])),
    ),
    beforeResidual,
    afterResidual,
    pivotNodes: pivots.map((index) => nodes[index].nodeId),
  };
}

function closeDerivative(values, coordinates, pivots, target) {
  const pivotSet = new Set(pivots);
  const rhs = [...target];
  for (let index = 0; index < values.length; index += 1) {
    if (pivotSet.has(index)) continue;
    const row = [1, coordinates[index].x, coordinates[index].y];
    rhs[0] -= row[0] * values[index];
    rhs[1] -= row[1] * values[index];
    rhs[2] -= row[2] * values[index];
  }
  const matrix = [
    pivots.map(() => 1),
    pivots.map((index) => coordinates[index].x),
    pivots.map((index) => coordinates[index].y),
  ];
  const solved = solve3(matrix, rhs);
  const output = [...values];
  pivots.forEach((index, position) => { output[index] = solved[position]; });
  return output;
}

function selectPivots(coordinates) {
  let best = null;
  let bestDeterminant = -1;
  for (let i = 0; i < coordinates.length - 2; i += 1) {
    for (let j = i + 1; j < coordinates.length - 1; j += 1) {
      for (let k = j + 1; k < coordinates.length; k += 1) {
        const matrix = [
          [1, 1, 1],
          [coordinates[i].x, coordinates[j].x, coordinates[k].x],
          [coordinates[i].y, coordinates[j].y, coordinates[k].y],
        ];
        const determinant = Math.abs(det3(matrix));
        if (determinant > bestDeterminant) {
          bestDeterminant = determinant;
          best = [i, j, k];
        }
      }
    }
  }
  if (!(bestDeterminant > 0) || !best) throw new Error('No affine-completeness pivot triple.');
  return best;
}

function solve3(matrix, rhs) {
  const augmented = matrix.map((row, index) => [...row, rhs[index]]);
  for (let column = 0; column < 3; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < 3; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (!(Math.abs(augmented[pivot][column]) > 0)) throw new Error('Singular affine-completeness closure.');
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    for (let entry = column; entry < 4; entry += 1) augmented[column][entry] /= divisor;
    for (let row = 0; row < 3; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let entry = column; entry < 4; entry += 1) {
        augmented[row][entry] -= factor * augmented[column][entry];
      }
    }
  }
  return augmented.map((row) => row[3]);
}

function det3(matrix) {
  return matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1])
    - matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0])
    + matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);
}

function derivativeResidual(values, coordinates, target) {
  const actual = [
    compensatedSum(values),
    compensatedSum(values.map((value, index) => value * coordinates[index].x)),
    compensatedSum(values.map((value, index) => value * coordinates[index].y)),
  ];
  return maxAbs(actual.map((value, index) => value - target[index]));
}

function currentSolutionResidual(solution, load) {
  const freeMaximum = maxAbs(solution.freeDofResiduals.map((row) => row.value));
  const reactionMaximum = maxAbs(solution.reactions.map((row) => row.value));
  const scale = Math.max(1, reactionMaximum, maxAbs(load.forceVector));
  return {
    freeDofInfinityResidual: freeMaximum,
    normalizationScale: scale,
    normalizedFreeResidual: freeMaximum / scale,
    passesGate: freeMaximum / scale <= GATE,
  };
}

function evaluateAction(matrix, displacement, forceVector, partition) {
  const residual = matrixVector(matrix, displacement)
    .map((value, position) => value - forceVector[position]);
  const freeMaximum = maxAbs(partition.free.map((position) => residual[position]));
  const reactionMaximum = maxAbs(partition.constrained.map((position) => residual[position]));
  const scale = Math.max(1, reactionMaximum, maxAbs(forceVector));
  return {
    freeDofInfinityResidual: freeMaximum,
    normalizationScale: scale,
    normalizedFreeResidual: freeMaximum / scale,
    passesGate: freeMaximum / scale <= GATE,
  };
}

function affineEnergyChange(original, corrected, nodes) {
  const fields = [
    nodes.flatMap((node) => [node.x, 0]),
    nodes.flatMap((node) => [0, node.y]),
    nodes.flatMap((node) => [node.y / 2, node.x / 2]),
  ];
  let maximum = 0;
  for (const field of fields) {
    const current = 0.5 * compensatedDot(field, matrixVector(original, field));
    const candidate = 0.5 * compensatedDot(field, matrixVector(corrected, field));
    maximum = Math.max(
      maximum,
      Math.abs(candidate - current) / Math.max(1, Math.abs(current)),
    );
  }
  return maximum;
}

function matrixDifference(left, right) {
  let maximum = 0;
  for (let i = 0; i < left.length; i += 1) {
    for (let j = 0; j < left[i].length; j += 1) {
      maximum = Math.max(maximum, Math.abs(left[i][j] - right[i][j]));
    }
  }
  return maximum;
}

function matrixMaximum(matrix) {
  return matrix.reduce((maximum, row) => Math.max(maximum, maxAbs(row)), 0);
}

function partitionIndices(model, dofOrdering, imposedDisplacements) {
  const index = new Map(dofOrdering.map((identity, position) => [identity, position]));
  const constrained = [
    ...model.constraints.map((row) => index.get(`${row.nodeId}:${row.dof}`)),
    ...imposedDisplacements.map((row) => index.get(`${row.nodeId}:${row.dof}`)),
  ].sort((left, right) => left - right);
  const constrainedSet = new Set(constrained);
  return {
    constrained,
    free: Array.from({ length: dofOrdering.length }, (_, position) => position)
      .filter((position) => !constrainedSet.has(position)),
  };
}

function exactDisplacement(model, dofOrdering) {
  const affine = numericRecord(RIGID.affine);
  const nodes = new Map(model.nodes.map((row) => [row.nodeId, row]));
  return dofOrdering.map((identity) => {
    const split = identity.lastIndexOf(':');
    const node = nodes.get(identity.slice(0, split));
    const dof = identity.slice(split + 1);
    const value = affineAt(affine, node.x, node.y);
    return dof === 'UX' ? value.ux : value.uy;
  });
}

function createSource(caseDef, physicalMesh) {
  const affine = numericRecord(caseDef.affine);
  const imposedDisplacements = physicalMesh.nodes
    .filter((node) => node.boundarySides.length)
    .flatMap((node, index) => {
      const displacement = affineAt(affine, node.x, node.y);
      const ordinal = String(index + 1).padStart(4, '0');
      return [
        {
          imposedDisplacementId: `ID-${ordinal}-UX`, nodeId: node.nodeId, dof: 'UX', value: displacement.ux,
          sourceReference: `B01#${caseDef.caseId}#${physicalMesh.meshId}#AFFINE_BOUNDARY`,
        },
        {
          imposedDisplacementId: `ID-${ordinal}-UY`, nodeId: node.nodeId, dof: 'UY', value: displacement.uy,
          sourceReference: `B01#${caseDef.caseId}#${physicalMesh.meshId}#AFFINE_BOUNDARY`,
        },
      ];
    });
  return {
    schema: MODEL_SCHEMA,
    modelIdentity: `B01_AFFINE_COMPLETENESS_${caseDef.caseId}_${physicalMesh.meshId}`,
    modelVersion: '1',
    sourceAncestry: {
      sourceModelIdentity: caseDef.caseId,
      sourceVersion: CASES.schema,
      adapterIdentity: 'LAFEA3_B01_AFFINE_COMPLETENESS_STIFFNESS_DIAGNOSTIC',
      adapterVersion: '1',
    },
    units: { length: 'mm', force: 'N', stress: 'MPa', modulus: 'MPa' },
    formulation: caseDef.formulation,
    materials: [{
      materialId: 'MAT', elasticModulus: Number(caseDef.material.elasticModulus),
      poissonRatio: Number(caseDef.material.poissonRatio), sourceReference: `B01#${caseDef.caseId}#MATERIAL`,
    }],
    nodes: physicalMesh.nodes.map((node) => ({
      nodeId: node.nodeId, x: node.x, y: node.y, sourceReference: `B01#${physicalMesh.meshId}#${node.nodeId}`,
    })),
    elements: physicalMesh.elements.map((element) => ({
      elementId: element.elementId, elementType: element.elementType, nodeIds: element.nodeIds,
      materialId: 'MAT', thickness: Number(caseDef.geometry.thickness),
      sourceReference: `B01#${physicalMesh.meshId}#${element.elementId}`,
    })),
    elementTypePolicy: {
      allowT3Fallback: physicalMesh.family === 'T3',
      sourceReference: physicalMesh.family === 'T3' ? 'B01#REGISTERED_T3_FALLBACK' : 'B01#REGISTERED_PRODUCTION_ELEMENT',
    },
    constraints: [],
    loadCases: [{
      loadCaseId: 'AFFINE', nodalForces: [], edgeTractions: [], pressureLoads: [], bodyForces: [],
      temperatureLoads: [], imposedDisplacements, sourceReference: `B01#${caseDef.caseId}#AFFINE`,
    }],
    resultRequests: { loadCaseIds: ['AFFINE'] },
    qualificationProfile: JSON.parse(JSON.stringify(QUALIFICATION_PROFILE)),
    limitations: ['B01_AFFINE_CODE_VERIFICATION_ONLY', 'B01_AFFINE_COMPLETENESS_DIAGNOSTIC_ONLY', 'NO_RELEASE_AUTHORITY_FROM_B01'],
  };
}

function materializeMesh(mesh, caseDef) {
  const width = Number(caseDef.geometry.width);
  const height = Number(caseDef.geometry.height);
  return {
    meshId: mesh.meshId,
    family: mesh.family,
    nodes: mesh.nodes.map((row) => ({
      nodeId: row[0], x: Number(row[1]) * width, y: Number(row[2]) * height, boundarySides: row[3],
    })),
    elements: mesh.elements.map((row) => ({ elementId: row[0], elementType: mesh.family, nodeIds: row[1] })),
  };
}

function compensatedDot(left, right) {
  return compensatedSum(left.map((value, index) => value * right[index]));
}

function compensatedSum(values) {
  let sum = 0;
  let compensation = 0;
  for (const term of values) {
    const next = sum + term;
    compensation += Math.abs(sum) >= Math.abs(term) ? (sum - next) + term : (term - next) + sum;
    sum = next;
  }
  return sum + compensation;
}

function numericRecord(value) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, Number(item)]));
}

function affineAt(affine, x, y) {
  return { ux: affine.u0 + affine.ux * x + affine.uy * y, uy: affine.v0 + affine.vx * x + affine.vy * y };
}

function maxAbs(values) {
  return values.reduce((maximum, value) => Math.max(maximum, Math.abs(value ?? 0)), 0);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function git(parameters) {
  return execFileSync('git', parameters, { cwd: ROOT, encoding: 'utf8' }).trim();
}
