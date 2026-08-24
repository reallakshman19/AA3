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
import { solvePartitioned } from '../src/core/local-continuum/solver.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { runPython } from './lib/python-interpreter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const B01 = path.join(ROOT, 'validation/lafea-benchmark-data/B01');
const CASES = readJson(path.join(B01, 'oracle/cases.json'));
const MESH_ROWS = readJson(path.join(B01, 'meshes/mesh-generation-summary.json')).meshes
  .filter((row) => row.family === 'T3');
const MESH_GENERATOR = path.join(B01, 'mesh-generator.py');
const COMPOSITION = requireLafeaStageComposition('LAFEA.3');
const GATE = 1e-10;

const diagnostics = CASES.cases.flatMap((caseDef) => MESH_ROWS.map((meshRow) => diagnose(caseDef, meshRow)));
const currentPassCount = diagnostics.filter((row) => row.status === 'EVALUATED' && row.currentSolvedResidual.passesGate).length;
const factorizedPassCount = diagnostics.filter((row) => row.status === 'EVALUATED' && row.factorizedSolvedResidual.passesGate).length;
const rigidRows = diagnostics.filter((row) => row.caseId === 'LAFEA3-AFFINE-RIGID-04');

process.stdout.write(`${JSON.stringify({
  schema: 'lafea-b01-t3-factorized-deformation-action-diagnostic/v1',
  issue: 1100,
  exactHead: git(['rev-parse', 'HEAD']),
  purpose: 'Evidence-only T3 operator diagnostic. The solver and assembled stiffness remain unchanged. Residual reconstruction is recomputed elementwise as B^T D epsilon A t, where epsilon is formed from normalized edge displacement differences before any stiffness action. In exact arithmetic this equals K*u but translation is removed before strain formation, avoiding cancellation of large absolute-displacement stiffness terms.',
  productionMechanicsChangedByDiagnostic: false,
  frozenBenchmarkChanged: false,
  tolerancesChanged: false,
  frozenGate: GATE,
  evaluatedCount: diagnostics.filter((row) => row.status === 'EVALUATED').length,
  currentPassCount,
  factorizedPassCount,
  rigidSummary: rigidRows.map((row) => ({
    meshId: row.meshId,
    currentSolvedNormalizedResidual: row.currentSolvedResidual.normalizedFreeResidual,
    factorizedSolvedNormalizedResidual: row.factorizedSolvedResidual.normalizedFreeResidual,
    factorizedExactNormalizedResidual: row.factorizedExactResidual.normalizedFreeResidual,
  })),
  diagnostics,
}, null, 2)}\n`);

function diagnose(caseDef, meshRow) {
  try {
    const compact = JSON.parse(runPython([MESH_GENERATOR, '--emit', '--family', 'T3', '--mesh', meshRow.meshId],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
    ));
    if (compact.meshSemanticHash !== meshRow.meshSemanticHash) {
      throw new Error(`Mesh semantic hash mismatch for ${meshRow.meshId}.`);
    }
    const physical = materializeMesh(compact, caseDef);
    const model = COMPOSITION.canonicalize(COMPOSITION.normalizeDocument(createSource(caseDef, physical)));
    const elements = buildElementEvidence(model);
    const mesh = assembleMesh(model, elements);
    const loadCase = model.loadCases.find((row) => row.loadCaseId === 'AFFINE');
    const load = assembleLoadCase(model, mesh, elements, loadCase);
    const solution = solvePartitioned(model, mesh, load);
    const partition = partitionIndices(model, mesh.dofOrdering, load.imposedDisplacements);
    const exact = exactDisplacement(model, mesh.dofOrdering, caseDef);
    const solved = solution.displacementVector;
    const currentExactAction = matrixVector(mesh.globalStiffnessMatrix, exact);
    const currentSolvedAction = matrixVector(mesh.globalStiffnessMatrix, solved);
    const factorizedExact = factorizedAction(model, elements, mesh.dofOrdering, exact);
    const factorizedSolved = factorizedAction(model, elements, mesh.dofOrdering, solved);
    const currentExactResidual = evaluateResidual(currentExactAction, load.forceVector, partition);
    const currentSolvedResidual = evaluateResidual(currentSolvedAction, load.forceVector, partition);
    const factorizedExactResidual = evaluateResidual(factorizedExact.action, load.forceVector, partition);
    const factorizedSolvedResidual = evaluateResidual(factorizedSolved.action, load.forceVector, partition);
    const currentSolvedEnergy = 0.5 * compensatedDot(solved, currentSolvedAction);
    const factorizedSolvedEnergy = factorizedSolved.energy;
    const energyRelativeDifference = Math.abs(factorizedSolvedEnergy - currentSolvedEnergy)
      / Math.max(1, Math.abs(currentSolvedEnergy));
    return {
      caseId: caseDef.caseId,
      family: 'T3',
      meshId: meshRow.meshId,
      status: 'EVALUATED',
      currentExactResidual,
      currentSolvedResidual,
      factorizedExactResidual,
      factorizedSolvedResidual,
      maximumExactElementStrain: factorizedExact.maximumElementStrain,
      maximumSolvedElementStrain: factorizedSolved.maximumElementStrain,
      currentSolvedEnergy,
      factorizedSolvedEnergy,
      energyRelativeDifference,
      factorizedImprovesSolvedResidual:
        factorizedSolvedResidual.normalizedFreeResidual < currentSolvedResidual.normalizedFreeResidual,
    };
  } catch (error) {
    return {
      caseId: caseDef.caseId,
      family: 'T3',
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

function factorizedAction(model, elements, dofOrdering, displacement) {
  const dofIndex = new Map(dofOrdering.map((identity, position) => [identity, position]));
  const nodeMap = new Map(model.nodes.map((row) => [row.nodeId, row]));
  const action = Array(dofOrdering.length).fill(0);
  let energy = 0;
  let maximumElementStrain = 0;
  for (const element of elements) {
    const nodes = element.nodeIds.map((id) => nodeMap.get(id));
    const indices = element.localDofOrdering.map((identity) => dofIndex.get(identity));
    const ue = indices.map((index) => displacement[index]);
    const strain = stableT3Strain(nodes, ue);
    maximumElementStrain = Math.max(maximumElementStrain, maxAbs(strain));
    const stress = matrixTimesVector(element.dMatrix, strain);
    const scale = element.thickness * element.canonicalArea;
    const localForce = Array(ue.length).fill(0);
    for (let column = 0; column < ue.length; column += 1) {
      let value = 0;
      for (let component = 0; component < 3; component += 1) {
        value += element.bMatrix[component][column] * stress[component];
      }
      localForce[column] = value * scale;
    }
    indices.forEach((globalIndex, localIndex) => {
      action[globalIndex] += localForce[localIndex];
    });
    energy += 0.5 * compensatedDot(strain, stress) * scale;
  }
  return { action, energy, maximumElementStrain };
}

function stableT3Strain(nodes, ue) {
  const [a, b, c] = nodes;
  const scale = Math.max(
    Math.hypot(b.x - a.x, b.y - a.y),
    Math.hypot(c.x - b.x, c.y - b.y),
    Math.hypot(a.x - c.x, a.y - c.y),
  );
  if (!(scale > 0)) throw new Error('T3 element scale must be positive.');
  const x1 = (b.x - a.x) / scale;
  const y1 = (b.y - a.y) / scale;
  const x2 = (c.x - a.x) / scale;
  const y2 = (c.y - a.y) / scale;
  const determinant = x1 * y2 - x2 * y1;
  if (!(determinant > 0)) throw new Error(`T3 normalized determinant ${determinant} must be positive.`);
  const du1 = (ue[2] - ue[0]) / scale;
  const dv1 = (ue[3] - ue[1]) / scale;
  const du2 = (ue[4] - ue[0]) / scale;
  const dv2 = (ue[5] - ue[1]) / scale;
  const duDx = (du1 * y2 - du2 * y1) / determinant;
  const duDy = (-du1 * x2 + du2 * x1) / determinant;
  const dvDx = (dv1 * y2 - dv2 * y1) / determinant;
  const dvDy = (-dv1 * x2 + dv2 * x1) / determinant;
  return [duDx, dvDy, duDy + dvDx];
}

function evaluateResidual(action, forceVector, partition) {
  const residual = action.map((value, position) => value - forceVector[position]);
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

function partitionIndices(model, dofOrdering, imposedDisplacements) {
  const index = new Map(dofOrdering.map((identity, position) => [identity, position]));
  const constrained = [
    ...model.constraints.map((row) => index.get(`${row.nodeId}:${row.dof}`)),
    ...imposedDisplacements.map((row) => index.get(`${row.nodeId}:${row.dof}`)),
  ].sort((left, right) => left - right);
  const set = new Set(constrained);
  return {
    constrained,
    free: Array.from({ length: dofOrdering.length }, (_, position) => position)
      .filter((position) => !set.has(position)),
  };
}

function exactDisplacement(model, dofOrdering, caseDef) {
  const affine = numericRecord(caseDef.affine);
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
          imposedDisplacementId: `ID-${ordinal}-UX`,
          nodeId: node.nodeId,
          dof: 'UX',
          value: displacement.ux,
          sourceReference: `B01#${caseDef.caseId}#${physicalMesh.meshId}#AFFINE_BOUNDARY`,
        },
        {
          imposedDisplacementId: `ID-${ordinal}-UY`,
          nodeId: node.nodeId,
          dof: 'UY',
          value: displacement.uy,
          sourceReference: `B01#${caseDef.caseId}#${physicalMesh.meshId}#AFFINE_BOUNDARY`,
        },
      ];
    });
  return {
    schema: MODEL_SCHEMA,
    modelIdentity: `B01_T3_FACTORIZED_${caseDef.caseId}_${physicalMesh.meshId}`,
    modelVersion: '1',
    sourceAncestry: {
      sourceModelIdentity: caseDef.caseId,
      sourceVersion: CASES.schema,
      adapterIdentity: 'LAFEA3_B01_T3_FACTORIZED_DEFORMATION_ACTION_DIAGNOSTIC',
      adapterVersion: '1',
    },
    units: { length: 'mm', force: 'N', stress: 'MPa', modulus: 'MPa' },
    formulation: caseDef.formulation,
    materials: [{
      materialId: 'MAT',
      elasticModulus: Number(caseDef.material.elasticModulus),
      poissonRatio: Number(caseDef.material.poissonRatio),
      sourceReference: `B01#${caseDef.caseId}#MATERIAL`,
    }],
    nodes: physicalMesh.nodes.map((node) => ({
      nodeId: node.nodeId,
      x: node.x,
      y: node.y,
      sourceReference: `B01#${physicalMesh.meshId}#${node.nodeId}`,
    })),
    elements: physicalMesh.elements.map((element) => ({
      elementId: element.elementId,
      elementType: 'T3',
      nodeIds: element.nodeIds,
      materialId: 'MAT',
      thickness: Number(caseDef.geometry.thickness),
      sourceReference: `B01#${physicalMesh.meshId}#${element.elementId}`,
    })),
    elementTypePolicy: {
      allowT3Fallback: true,
      sourceReference: 'B01#REGISTERED_T3_FALLBACK',
    },
    constraints: [],
    loadCases: [{
      loadCaseId: 'AFFINE',
      nodalForces: [],
      edgeTractions: [],
      pressureLoads: [],
      bodyForces: [],
      temperatureLoads: [],
      imposedDisplacements,
      sourceReference: `B01#${caseDef.caseId}#AFFINE`,
    }],
    resultRequests: { loadCaseIds: ['AFFINE'] },
    qualificationProfile: JSON.parse(JSON.stringify(QUALIFICATION_PROFILE)),
    limitations: [
      'B01_AFFINE_CODE_VERIFICATION_ONLY',
      'B01_T3_FACTORIZED_DEFORMATION_ACTION_DIAGNOSTIC_ONLY',
      'NO_RELEASE_AUTHORITY_FROM_B01',
    ],
  };
}

function materializeMesh(mesh, caseDef) {
  const width = Number(caseDef.geometry.width);
  const height = Number(caseDef.geometry.height);
  return {
    meshId: mesh.meshId,
    nodes: mesh.nodes.map((row) => ({
      nodeId: row[0],
      x: Number(row[1]) * width,
      y: Number(row[2]) * height,
      boundarySides: row[3],
    })),
    elements: mesh.elements.map((row) => ({
      elementId: row[0],
      nodeIds: row[1],
    })),
  };
}

function matrixTimesVector(matrix, vector) {
  return matrix.map((row) => compensatedDot(row, vector));
}
function compensatedDot(left, right) {
  let sum = 0;
  let correction = 0;
  for (let index = 0; index < left.length; index += 1) {
    const term = left[index] * right[index];
    const next = sum + term;
    correction += Math.abs(sum) >= Math.abs(term)
      ? (sum - next) + term
      : (term - next) + sum;
    sum = next;
  }
  return sum + correction;
}
function numericRecord(value) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, Number(item)]));
}
function affineAt(a, x, y) {
  return {
    ux: a.u0 + a.ux * x + a.uy * y,
    uy: a.v0 + a.vx * x + a.vy * y,
  };
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
