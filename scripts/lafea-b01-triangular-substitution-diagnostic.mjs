#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { MODEL_SCHEMA, QUALIFICATION_PROFILE } from '../src/core/local-continuum/index.js';
import { assembleMesh } from '../src/core/local-continuum/assembly.js';
import { buildElementEvidence } from '../src/core/local-continuum/element.js';
import { assembleLoadCase } from '../src/core/local-continuum/loads.js';
import { matrixVector } from '../src/core/local-continuum/matrix.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { runPython } from './lib/python-interpreter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const B01 = path.join(ROOT, 'validation/lafea-benchmark-data/B01');
const CASES_PATH = path.join(B01, 'oracle/cases.json');
const MESH_GENERATOR = path.join(B01, 'mesh-generator.py');
const MESH_SUMMARY_PATH = path.join(B01, 'meshes/mesh-generation-summary.json');
const RIGID_CASE_ID = 'LAFEA3-AFFINE-RIGID-04';
const REFINEMENT_STEPS = 3;
const VARIANTS = [
  ['NAIVE', false, false],
  ['COMPENSATED_FORWARD', true, false],
  ['COMPENSATED_BACKWARD', false, true],
  ['COMPENSATED_BOTH', true, true],
];

const cases = readJson(CASES_PATH);
const rigid = cases.cases.find((row) => row.caseId === RIGID_CASE_ID);
if (!rigid) throw new Error(`Missing frozen rigid case ${RIGID_CASE_ID}.`);
const meshRows = readJson(MESH_SUMMARY_PATH).meshes;
const composition = requireLafeaStageComposition('LAFEA.3');
const exactHead = git(['rev-parse', 'HEAD']);
const diagnostics = meshRows.map((meshRow) => diagnose(meshRow));

process.stdout.write(`${JSON.stringify({
  schema: 'lafea-b01-triangular-substitution-diagnostic/v1',
  issue: 1100,
  exactHead,
  caseId: RIGID_CASE_ID,
  purpose: 'Evidence-only test of triangular forward/back substitution accumulation. Cholesky factorization, global assembly, benchmark definitions, tolerances, production solver and recovery are unchanged.',
  productionMechanicsChangedByDiagnostic: false,
  factorization: 'NAIVE_CURRENT_PRODUCTION_CHOLESKY_REIMPLEMENTATION_FOR_DIAGNOSTIC_ONLY',
  reducedResidual: 'Neumaier-compensated Kff*u-rhs, matching current dense refinement residual arithmetic.',
  fullResidual: 'Current production matrixVector over the same assembled global stiffness matrix.',
  refinementSteps: REFINEMENT_STEPS,
  variants: VARIANTS.map(([variant, compensatedForward, compensatedBackward]) => ({
    variant, compensatedForward, compensatedBackward,
  })),
  diagnostics,
}, null, 2)}\n`);

function diagnose(meshRow) {
  try {
    const compact = JSON.parse(runPython([MESH_GENERATOR, '--emit', '--family', meshRow.family, '--mesh', meshRow.meshId],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
    ));
    if (compact.meshSemanticHash !== meshRow.meshSemanticHash) {
      throw new Error(`Mesh semantic hash mismatch for ${meshRow.meshId}.`);
    }
    const physicalMesh = materializeMesh(compact, rigid);
    const source = createSource(rigid, physicalMesh);
    const normalized = composition.normalizeDocument(source);
    const model = composition.canonicalize(normalized);
    const elements = buildElementEvidence(model);
    const mesh = assembleMesh(model, elements);
    const loadCase = model.loadCases.find((row) => row.loadCaseId === 'AFFINE');
    const load = assembleLoadCase(model, mesh, elements, loadCase);
    if (mesh.globalStiffnessStorage !== 'DENSE') {
      return {
        family: meshRow.family,
        meshId: meshRow.meshId,
        status: 'NOT_APPLICABLE',
        globalStiffnessStorage: mesh.globalStiffnessStorage,
        reason: 'This diagnostic isolates dense Cholesky triangular substitution only.',
      };
    }
    const partition = partitionData(model, mesh, load);
    const freeStiffness = submatrix(mesh.globalStiffnessMatrix, partition.free, partition.free);
    const coupling = submatrix(mesh.globalStiffnessMatrix, partition.free, partition.constrained);
    const rightHandSide = partition.free.map((globalIndex, row) => (
      load.forceVector[globalIndex]
        - compensatedProductSum(coupling[row], partition.prescribedValues)
    ));
    const lower = factorCholeskyNaive(freeStiffness);
    const variants = VARIANTS.map(([variant, compensatedForward, compensatedBackward]) => (
      evaluateVariant({
        variant,
        compensatedForward,
        compensatedBackward,
        freeStiffness,
        lower,
        rightHandSide,
        mesh,
        model,
        load,
        partition,
      })
    ));
    return {
      family: meshRow.family,
      meshId: meshRow.meshId,
      status: 'EVALUATED',
      globalStiffnessStorage: mesh.globalStiffnessStorage,
      freeDofCount: partition.free.length,
      constrainedDofCount: partition.constrained.length,
      variants,
      bestByFullNormalizedResidual: [...variants]
        .sort((left, right) => left.fullNormalizedFreeResidual - right.fullNormalizedFreeResidual)[0].variant,
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

function evaluateVariant({
  variant,
  compensatedForward,
  compensatedBackward,
  freeStiffness,
  lower,
  rightHandSide,
  mesh,
  model,
  load,
  partition,
}) {
  const solveCorrection = (rhs) => backward(
    lower,
    forward(lower, rhs, compensatedForward),
    compensatedBackward,
  );
  let solution = solveCorrection(rightHandSide);
  let reducedResidual = denseResidual(freeStiffness, rightHandSide, solution);
  const residualHistory = [maxAbs(reducedResidual)];
  let refinementStepsPerformed = 0;
  for (let step = 0; step < REFINEMENT_STEPS; step += 1) {
    if (residualHistory.at(-1) === 0) break;
    const correction = solveCorrection(reducedResidual);
    const candidate = solution.map((value, index) => value + correction[index]);
    const candidateResidual = denseResidual(freeStiffness, rightHandSide, candidate);
    const candidateInfinity = maxAbs(candidateResidual);
    if (!(candidateInfinity < residualHistory.at(-1))) break;
    solution = candidate;
    reducedResidual = candidateResidual;
    residualHistory.push(candidateInfinity);
    refinementStepsPerformed += 1;
  }
  const displacement = [...partition.prescribedVector];
  solution.forEach((value, position) => {
    displacement[partition.free[position]] = value;
  });
  const action = matrixVector(mesh.globalStiffnessMatrix, displacement);
  const fullResidual = action.map((value, index) => value - load.forceVector[index]);
  const freeFullResidual = partition.free.map((index) => fullResidual[index]);
  const constrainedResidual = partition.constrained.map((index) => fullResidual[index]);
  const scale = Math.max(1, maxAbs(constrainedResidual), maxAbs(load.forceVector));
  return {
    variant,
    compensatedForward,
    compensatedBackward,
    refinementStepsPerformed,
    reducedResidualHistory: residualHistory,
    reducedResidualInfinity: maxAbs(reducedResidual),
    fullFreeResidualInfinity: maxAbs(freeFullResidual),
    reactionInfinity: maxAbs(constrainedResidual),
    normalizationScale: scale,
    fullNormalizedFreeResidual: maxAbs(freeFullResidual) / scale,
    maximumFreeDisplacementDifferenceFromExactRigidField: maximumRigidFreeDofError(
      model,
      mesh,
      partition.free,
      displacement,
    ),
  };
}

function partitionData(model, mesh, load) {
  const dofIndex = new Map(mesh.dofOrdering.map((identity, index) => [identity, index]));
  const rows = [
    ...model.constraints.map((row) => ({
      index: dofIndex.get(`${row.nodeId}:${row.dof}`), value: row.value,
    })),
    ...load.imposedDisplacements.map((row) => ({
      index: dofIndex.get(`${row.nodeId}:${row.dof}`), value: row.value,
    })),
  ].sort((left, right) => left.index - right.index);
  const constrained = rows.map((row) => row.index);
  const prescribedValues = rows.map((row) => row.value);
  const constrainedSet = new Set(constrained);
  const free = Array.from({ length: mesh.dofOrdering.length }, (_, index) => index)
    .filter((index) => !constrainedSet.has(index));
  const prescribedVector = Array(mesh.dofOrdering.length).fill(0);
  rows.forEach((row) => { prescribedVector[row.index] = row.value; });
  return { free, constrained, prescribedValues, prescribedVector };
}

function factorCholeskyNaive(matrix) {
  const lower = Array.from({ length: matrix.length }, () => Array(matrix.length).fill(0));
  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      let value = matrix[row][column];
      for (let index = 0; index < column; index += 1) {
        value -= lower[row][index] * lower[column][index];
      }
      if (row === column) {
        if (!(value > 0) || !Number.isFinite(value)) {
          throw new Error(`Diagnostic Cholesky pivot ${value} is not positive at ${row}.`);
        }
        lower[row][row] = Math.sqrt(value);
      } else {
        lower[row][column] = value / lower[column][column];
      }
    }
  }
  return lower;
}

function forward(lower, rightHandSide, compensated) {
  const output = Array(rightHandSide.length).fill(0);
  for (let row = 0; row < rightHandSide.length; row += 1) {
    if (compensated) {
      const terms = Array.from({ length: row }, (_, column) => (
        lower[row][column] * output[column]
      ));
      output[row] = (rightHandSide[row] - compensatedSum(terms)) / lower[row][row];
    } else {
      let value = rightHandSide[row];
      for (let column = 0; column < row; column += 1) {
        value -= lower[row][column] * output[column];
      }
      output[row] = value / lower[row][row];
    }
  }
  return output;
}

function backward(lower, rightHandSide, compensated) {
  const output = Array(rightHandSide.length).fill(0);
  for (let row = rightHandSide.length - 1; row >= 0; row -= 1) {
    if (compensated) {
      const terms = [];
      for (let column = row + 1; column < rightHandSide.length; column += 1) {
        terms.push(lower[column][row] * output[column]);
      }
      output[row] = (rightHandSide[row] - compensatedSum(terms)) / lower[row][row];
    } else {
      let value = rightHandSide[row];
      for (let column = row + 1; column < rightHandSide.length; column += 1) {
        value -= lower[column][row] * output[column];
      }
      output[row] = value / lower[row][row];
    }
  }
  return output;
}

function denseResidual(matrix, rightHandSide, solution) {
  return matrix.map((row, index) => (
    rightHandSide[index] - compensatedProductSum(row, solution)
  ));
}

function compensatedProductSum(left, right) {
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

function compensatedSum(values) {
  let sum = 0;
  let compensation = 0;
  for (const term of values) {
    const next = sum + term;
    compensation += Math.abs(sum) >= Math.abs(term)
      ? (sum - next) + term
      : (term - next) + sum;
    sum = next;
  }
  return sum + compensation;
}

function maximumRigidFreeDofError(model, mesh, free, displacement) {
  const affine = numericRecord(rigid.affine);
  const nodeById = new Map(model.nodes.map((node) => [node.nodeId, node]));
  return free.reduce((maximum, index) => {
    const dofIdentity = mesh.dofOrdering[index];
    const split = dofIdentity.lastIndexOf(':');
    const node = nodeById.get(dofIdentity.slice(0, split));
    const dof = dofIdentity.slice(split + 1);
    const exact = affineAt(affine, node.x, node.y);
    const expected = dof === 'UX' ? exact.ux : exact.uy;
    return Math.max(maximum, Math.abs(displacement[index] - expected));
  }, 0);
}

function createSource(caseDef, physicalMesh) {
  const affine = numericRecord(caseDef.affine);
  const imposedDisplacements = physicalMesh.nodes
    .filter((node) => node.boundarySides.length)
    .flatMap((node, index) => {
      const displacement = affineAt(affine, node.x, node.y);
      const ordinal = String(index + 1).padStart(4, '0');
      return [
        { imposedDisplacementId: `ID-${ordinal}-UX`, nodeId: node.nodeId, dof: 'UX', value: displacement.ux, sourceReference: `B01#${caseDef.caseId}#${physicalMesh.meshId}#AFFINE_BOUNDARY` },
        { imposedDisplacementId: `ID-${ordinal}-UY`, nodeId: node.nodeId, dof: 'UY', value: displacement.uy, sourceReference: `B01#${caseDef.caseId}#${physicalMesh.meshId}#AFFINE_BOUNDARY` },
      ];
    });
  return {
    schema: MODEL_SCHEMA,
    modelIdentity: `B01_TRIANGULAR_DIAGNOSTIC_${caseDef.caseId}_${physicalMesh.meshId}`,
    modelVersion: '1',
    sourceAncestry: { sourceModelIdentity: caseDef.caseId, sourceVersion: cases.schema, adapterIdentity: 'LAFEA3_B01_TRIANGULAR_SUBSTITUTION_DIAGNOSTIC', adapterVersion: '1' },
    units: { length: 'mm', force: 'N', stress: 'MPa', modulus: 'MPa' },
    formulation: caseDef.formulation,
    materials: [{ materialId: 'MAT', elasticModulus: Number(caseDef.material.elasticModulus), poissonRatio: Number(caseDef.material.poissonRatio), sourceReference: `B01#${caseDef.caseId}#MATERIAL` }],
    nodes: physicalMesh.nodes.map((node) => ({ nodeId: node.nodeId, x: node.x, y: node.y, sourceReference: `B01#${physicalMesh.meshId}#${node.nodeId}` })),
    elements: physicalMesh.elements.map((element) => ({ elementId: element.elementId, elementType: element.elementType, nodeIds: element.nodeIds, materialId: 'MAT', thickness: Number(caseDef.geometry.thickness), sourceReference: `B01#${physicalMesh.meshId}#${element.elementId}` })),
    elementTypePolicy: { allowT3Fallback: physicalMesh.family === 'T3', sourceReference: physicalMesh.family === 'T3' ? 'B01#REGISTERED_T3_FALLBACK' : 'B01#REGISTERED_PRODUCTION_ELEMENT' },
    constraints: [],
    loadCases: [{ loadCaseId: 'AFFINE', nodalForces: [], edgeTractions: [], pressureLoads: [], bodyForces: [], temperatureLoads: [], imposedDisplacements, sourceReference: `B01#${caseDef.caseId}#AFFINE` }],
    resultRequests: { loadCaseIds: ['AFFINE'] },
    qualificationProfile: JSON.parse(JSON.stringify(QUALIFICATION_PROFILE)),
    limitations: ['B01_AFFINE_CODE_VERIFICATION_ONLY', 'B01_TRIANGULAR_SUBSTITUTION_DIAGNOSTIC_ONLY', 'NO_RELEASE_AUTHORITY_FROM_B01'],
  };
}

function materializeMesh(mesh, caseDef) {
  const width = Number(caseDef.geometry.width);
  const height = Number(caseDef.geometry.height);
  return {
    meshId: mesh.meshId,
    family: mesh.family,
    nodes: mesh.nodes.map((row) => ({ nodeId: row[0], x: Number(row[1]) * width, y: Number(row[2]) * height, boundarySides: row[3] })),
    elements: mesh.elements.map((row) => ({ elementId: row[0], elementType: mesh.family, nodeIds: row[1] })),
  };
}

function submatrix(matrix, rows, columns) {
  return rows.map((row) => columns.map((column) => matrix[row][column]));
}
function numericRecord(value) { return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, Number(item)])); }
function affineAt(a, x, y) { return { ux: a.u0 + a.ux * x + a.uy * y, uy: a.v0 + a.vx * x + a.vy * y }; }
function maxAbs(values) { return values.reduce((maximum, value) => Math.max(maximum, Math.abs(value ?? 0)), 0); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function git(parameters) { return execFileSync('git', parameters, { cwd: ROOT, encoding: 'utf8' }).trim(); }
