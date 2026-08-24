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
import { matrixVector, transpose } from '../src/core/local-continuum/matrix.js';
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
  schema: 'lafea-b01-internal-force-residual-diagnostic/v1',
  issue: 1100,
  exactHead: git(['rev-parse', 'HEAD']),
  purpose: 'Evidence-only comparison of the current global K*u residual with a mechanically equivalent element-internal-force residual assembled directly from B^T*sigma quadrature on both the exact rigid field and the actual solved field.',
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
    const normalized = COMPOSITION.normalizeDocument(source);
    const model = COMPOSITION.canonicalize(normalized);
    const elements = buildElementEvidence(model);
    const mesh = assembleMesh(model, elements);
    const loadCase = model.loadCases.find((row) => row.loadCaseId === 'AFFINE');
    const load = assembleLoadCase(model, mesh, elements, loadCase);
    const solution = solvePartitioned(model, mesh, load);
    const index = new Map(mesh.dofOrdering.map((identity, position) => [identity, position]));
    const partition = partitionIndices(model, mesh.dofOrdering, load.imposedDisplacements);
    const exact = exactDisplacement(model, mesh.dofOrdering);
    const solved = solution.displacementVector;
    const current = currentResidual(solution, load);
    const exactDirect = directResidual(elements, exact, index, partition, load);
    const solvedDirect = directResidual(elements, solved, index, partition, load);
    return {
      family: meshRow.family,
      meshId: meshRow.meshId,
      status: 'EVALUATED',
      solverMethod: solution.solverEvidence?.method ?? null,
      maximumSolvedDisplacementDifferenceFromExact: maxAbs(
        solved.map((value, position) => value - exact[position]),
      ),
      current,
      directFromExactRigidField: exactDirect,
      directFromSolvedField: solvedDirect,
      directSolvedQualifies: solvedDirect.normalizedFreeResidual <= GATE,
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

function currentResidual(solution, load) {
  const freeMaximum = maxAbs(solution.freeDofResiduals.map((row) => row.value));
  const reactionMaximum = maxAbs(solution.reactions.map((row) => row.value));
  const scale = Math.max(1, reactionMaximum, maxAbs(load.forceVector));
  return {
    method: 'GLOBAL_STIFFNESS_ACTION',
    freeDofInfinityResidual: freeMaximum,
    normalizationScale: scale,
    normalizedFreeResidual: freeMaximum / scale,
    passesGate: freeMaximum / scale <= GATE,
  };
}

function directResidual(elements, displacement, index, partition, load) {
  const sums = Array(displacement.length).fill(0);
  const compensations = Array(displacement.length).fill(0);
  let maximumLocalInternalForce = 0;
  let maximumGaussStrain = 0;
  for (const element of elements) {
    const local = element.localDofOrdering.map((identity) => displacement[index.get(identity)]);
    const internal = elementInternalForce(element, local);
    maximumLocalInternalForce = Math.max(maximumLocalInternalForce, maxAbs(internal.force));
    maximumGaussStrain = Math.max(maximumGaussStrain, internal.maximumStrain);
    element.localDofOrdering.forEach((identity, localIndex) => {
      compensatedAdd(
        sums,
        compensations,
        index.get(identity),
        internal.force[localIndex],
      );
    });
  }
  const internalForce = sums.map((value, position) => value + compensations[position]);
  const residual = internalForce.map((value, position) => value - load.forceVector[position]);
  const freeMaximum = maxAbs(partition.free.map((position) => residual[position]));
  const reactionMaximum = maxAbs(partition.constrained.map((position) => residual[position]));
  const scale = Math.max(1, reactionMaximum, maxAbs(load.forceVector));
  return {
    method: 'QUADRATURE_INTERNAL_FORCE_B_TRANSPOSE_SIGMA',
    maximumGaussStrain,
    maximumLocalInternalForce,
    freeDofInfinityResidual: freeMaximum,
    constrainedReactionInfinity: reactionMaximum,
    normalizationScale: scale,
    normalizedFreeResidual: freeMaximum / scale,
    passesGate: freeMaximum / scale <= GATE,
  };
}

function elementInternalForce(element, displacement) {
  const sums = Array(displacement.length).fill(0);
  const compensations = Array(displacement.length).fill(0);
  let maximumStrain = 0;
  if (element.gaussEvidence?.length) {
    for (const gp of element.gaussEvidence) {
      const strain = matrixVector(gp.B, displacement);
      maximumStrain = Math.max(maximumStrain, maxAbs(strain));
      const stress = matrixVector(element.dMatrix, strain);
      const nodal = matrixVector(transpose(gp.B), stress);
      const factor = element.thickness * gp.jacobianDeterminant * gp.weight;
      nodal.forEach((value, position) => {
        compensatedAdd(sums, compensations, position, value * factor);
      });
    }
  } else {
    const strain = matrixVector(element.bMatrix, displacement);
    maximumStrain = maxAbs(strain);
    const stress = matrixVector(element.dMatrix, strain);
    const nodal = matrixVector(transpose(element.bMatrix), stress);
    const factor = element.thickness * element.canonicalArea;
    nodal.forEach((value, position) => {
      compensatedAdd(sums, compensations, position, value * factor);
    });
  }
  return {
    force: sums.map((value, position) => value + compensations[position]),
    maximumStrain,
  };
}

function compensatedAdd(sums, compensations, position, term) {
  const sum = sums[position];
  const next = sum + term;
  compensations[position] += Math.abs(sum) >= Math.abs(term)
    ? (sum - next) + term
    : (term - next) + sum;
  sums[position] = next;
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
    modelIdentity: `B01_INTERNAL_FORCE_${caseDef.caseId}_${physicalMesh.meshId}`,
    modelVersion: '1',
    sourceAncestry: {
      sourceModelIdentity: caseDef.caseId,
      sourceVersion: CASES.schema,
      adapterIdentity: 'LAFEA3_B01_INTERNAL_FORCE_RESIDUAL_DIAGNOSTIC',
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
      elementType: element.elementType,
      nodeIds: element.nodeIds,
      materialId: 'MAT',
      thickness: Number(caseDef.geometry.thickness),
      sourceReference: `B01#${physicalMesh.meshId}#${element.elementId}`,
    })),
    elementTypePolicy: {
      allowT3Fallback: physicalMesh.family === 'T3',
      sourceReference: physicalMesh.family === 'T3'
        ? 'B01#REGISTERED_T3_FALLBACK'
        : 'B01#REGISTERED_PRODUCTION_ELEMENT',
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
      'B01_INTERNAL_FORCE_RESIDUAL_DIAGNOSTIC_ONLY',
      'NO_RELEASE_AUTHORITY_FROM_B01',
    ],
  };
}

function materializeMesh(mesh, caseDef) {
  const width = Number(caseDef.geometry.width);
  const height = Number(caseDef.geometry.height);
  return {
    meshId: mesh.meshId,
    family: mesh.family,
    nodes: mesh.nodes.map((row) => ({
      nodeId: row[0],
      x: Number(row[1]) * width,
      y: Number(row[2]) * height,
      boundarySides: row[3],
    })),
    elements: mesh.elements.map((row) => ({
      elementId: row[0],
      elementType: mesh.family,
      nodeIds: row[1],
    })),
  };
}

function numericRecord(value) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, Number(item)]));
}

function affineAt(affine, x, y) {
  return {
    ux: affine.u0 + affine.ux * x + affine.uy * y,
    uy: affine.v0 + affine.vx * x + affine.vy * y,
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
