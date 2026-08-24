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
const evaluated = diagnostics.filter((row) => row.status === 'EVALUATED');
const currentPassCount = evaluated.filter((row) => row.currentResidual.passesGate).length;
const shiftedPassCount = evaluated.filter((row) => row.shiftedInvariantResidual.passesGate).length;
const rigidRows = evaluated.filter((row) => row.caseId === 'LAFEA3-AFFINE-RIGID-04');

process.stdout.write(`${JSON.stringify({
  schema: 'lafea-b01-t3-rigid-reference-partition-diagnostic/v1',
  issue: 1100,
  exactHead: git(['rev-parse', 'HEAD']),
  purpose: 'Evidence-only pre-solve conditioning of imposed displacements. A least-squares 2D rigid translation/rotation is fitted from prescribed boundary values, subtracted before the existing partition solve, and added back to the solved displacement afterward. Loads, stiffness, constitutive law, mesh, Cholesky solver and tolerances are unchanged. Because K*r=0 analytically, solving the correction field is mechanically equivalent while avoiding a cancellation-dominated RHS for rigid motion.',
  productionMechanicsChangedByDiagnostic: false,
  frozenBenchmarkChanged: false,
  tolerancesChanged: false,
  frozenGate: GATE,
  evaluatedCount: evaluated.length,
  currentPassCount,
  shiftedPassCount,
  rigidSummary: rigidRows.map((row) => ({
    meshId: row.meshId,
    currentNormalizedResidual: row.currentResidual.normalizedFreeResidual,
    shiftedNormalizedResidual: row.shiftedInvariantResidual.normalizedFreeResidual,
    maximumShiftedBoundaryMagnitude: row.maximumShiftedBoundaryMagnitude,
    reconstructedDisplacementError: row.maximumReconstructedDisplacementError,
  })),
  maximumEnergyRelativeDifference: maxAbs(evaluated.map((row) => row.energyRelativeDifference)),
  maximumNonRigidReactionRelativeDifference: maxAbs(evaluated
    .filter((row) => row.caseId !== 'LAFEA3-AFFINE-RIGID-04')
    .map((row) => row.reactionRelativeDifference)),
  maximumReconstructedDisplacementError: maxAbs(evaluated.map((row) => row.maximumReconstructedDisplacementError)),
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
    const baseSource = createSource(caseDef, physical, null);
    const baseModel = COMPOSITION.canonicalize(COMPOSITION.normalizeDocument(baseSource));
    const baseElements = buildElementEvidence(baseModel);
    const baseMesh = assembleMesh(baseModel, baseElements);
    const baseLoadCase = baseModel.loadCases.find((row) => row.loadCaseId === 'AFFINE');
    const baseLoad = assembleLoadCase(baseModel, baseMesh, baseElements, baseLoadCase);
    const baseSolution = solvePartitioned(baseModel, baseMesh, baseLoad);

    const rigid = fitBoundaryRigidMotion(baseModel, baseLoad.imposedDisplacements);
    const shiftedSource = createSource(caseDef, physical, rigid);
    const shiftedModel = COMPOSITION.canonicalize(COMPOSITION.normalizeDocument(shiftedSource));
    const shiftedElements = buildElementEvidence(shiftedModel);
    const shiftedMesh = assembleMesh(shiftedModel, shiftedElements);
    const shiftedLoadCase = shiftedModel.loadCases.find((row) => row.loadCaseId === 'AFFINE');
    const shiftedLoad = assembleLoadCase(shiftedModel, shiftedMesh, shiftedElements, shiftedLoadCase);
    const shiftedSolution = solvePartitioned(shiftedModel, shiftedMesh, shiftedLoad);

    const rigidVector = rigidVectorForDofs(baseModel, baseMesh.dofOrdering, rigid);
    const reconstructed = shiftedSolution.displacementVector
      .map((value, position) => value + rigidVector[position]);
    const exact = exactDisplacement(baseModel, baseMesh.dofOrdering, caseDef);
    const currentResidual = residualSummary(baseSolution, baseLoad);
    const shiftedInvariantResidual = residualSummary(shiftedSolution, shiftedLoad);
    const currentEnergy = 0.5 * compensatedDot(
      baseSolution.displacementVector,
      matrixVector(baseMesh.globalStiffnessMatrix, baseSolution.displacementVector),
    );
    const shiftedEnergy = 0.5 * compensatedDot(
      shiftedSolution.displacementVector,
      matrixVector(shiftedMesh.globalStiffnessMatrix, shiftedSolution.displacementVector),
    );
    const energyRelativeDifference = Math.abs(shiftedEnergy - currentEnergy)
      / Math.max(1, Math.abs(currentEnergy));
    const reactionRelativeDifference = compareReactions(
      baseSolution.reactions,
      shiftedSolution.reactions,
    );
    const maximumStrainDifference = compareElementStrains(
      baseElements,
      baseMesh.dofOrdering,
      baseSolution.displacementVector,
      shiftedSolution.displacementVector,
    );
    return {
      caseId: caseDef.caseId,
      family: 'T3',
      meshId: meshRow.meshId,
      status: 'EVALUATED',
      fittedRigidMotion: rigid,
      maximumShiftedBoundaryMagnitude: maxAbs(shiftedLoad.imposedDisplacements.map((row) => row.value)),
      currentResidual,
      shiftedInvariantResidual,
      currentEnergy,
      shiftedCorrectionEnergy: shiftedEnergy,
      energyRelativeDifference,
      reactionRelativeDifference,
      maximumStrainDifference,
      maximumReconstructedDisplacementError: maxAbs(
        reconstructed.map((value, position) => value - exact[position]),
      ),
      shiftedImprovesResidual:
        shiftedInvariantResidual.normalizedFreeResidual < currentResidual.normalizedFreeResidual,
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

function fitBoundaryRigidMotion(model, imposedDisplacements) {
  const byNode = new Map();
  for (const row of imposedDisplacements) {
    const record = byNode.get(row.nodeId) ?? { ux: null, uy: null };
    if (row.dof === 'UX') record.ux = row.value;
    if (row.dof === 'UY') record.uy = row.value;
    byNode.set(row.nodeId, record);
  }
  const nodeMap = new Map(model.nodes.map((row) => [row.nodeId, row]));
  const rows = [...byNode.entries()].map(([nodeId, displacement]) => {
    const node = nodeMap.get(nodeId);
    if (!node || displacement.ux === null || displacement.uy === null) {
      throw new Error(`Rigid fit requires UX/UY imposed values for ${nodeId}.`);
    }
    return { node, ux: displacement.ux, uy: displacement.uy };
  });
  if (rows.length < 2) throw new Error('Rigid fit requires at least two prescribed nodes.');
  const centroidX = compensatedSum(rows.map((row) => row.node.x)) / rows.length;
  const centroidY = compensatedSum(rows.map((row) => row.node.y)) / rows.length;
  const translationXAtCentroid = compensatedSum(rows.map((row) => row.ux)) / rows.length;
  const translationYAtCentroid = compensatedSum(rows.map((row) => row.uy)) / rows.length;
  const numerator = compensatedSum(rows.map((row) => {
    const dx = row.node.x - centroidX;
    const dy = row.node.y - centroidY;
    return -dy * (row.ux - translationXAtCentroid)
      + dx * (row.uy - translationYAtCentroid);
  }));
  const denominator = compensatedSum(rows.map((row) => {
    const dx = row.node.x - centroidX;
    const dy = row.node.y - centroidY;
    return dx * dx + dy * dy;
  }));
  if (!(denominator > 0)) throw new Error('Rigid fit denominator must be positive.');
  return {
    centroidX,
    centroidY,
    translationXAtCentroid,
    translationYAtCentroid,
    infinitesimalRotation: numerator / denominator,
  };
}

function rigidAt(rigid, x, y) {
  const dx = x - rigid.centroidX;
  const dy = y - rigid.centroidY;
  return {
    ux: rigid.translationXAtCentroid - rigid.infinitesimalRotation * dy,
    uy: rigid.translationYAtCentroid + rigid.infinitesimalRotation * dx,
  };
}

function rigidVectorForDofs(model, dofOrdering, rigid) {
  const nodes = new Map(model.nodes.map((row) => [row.nodeId, row]));
  return dofOrdering.map((identity) => {
    const split = identity.lastIndexOf(':');
    const node = nodes.get(identity.slice(0, split));
    const dof = identity.slice(split + 1);
    const value = rigidAt(rigid, node.x, node.y);
    return dof === 'UX' ? value.ux : value.uy;
  });
}

function residualSummary(solution, load) {
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

function compareReactions(current, shifted) {
  const currentMap = new Map(current.map((row) => [row.dofIdentity, row.value]));
  let maximumDifference = 0;
  let scale = 1;
  for (const row of shifted) {
    const currentValue = currentMap.get(row.dofIdentity) ?? 0;
    maximumDifference = Math.max(maximumDifference, Math.abs(row.value - currentValue));
    scale = Math.max(scale, Math.abs(currentValue), Math.abs(row.value));
  }
  return maximumDifference / scale;
}

function compareElementStrains(elements, dofOrdering, current, correction) {
  const dofIndex = new Map(dofOrdering.map((identity, position) => [identity, position]));
  let maximum = 0;
  for (const element of elements) {
    const indices = element.localDofOrdering.map((identity) => dofIndex.get(identity));
    const currentLocal = indices.map((index) => current[index]);
    const correctionLocal = indices.map((index) => correction[index]);
    const currentStrain = matrixVector(element.bMatrix, currentLocal);
    const correctionStrain = matrixVector(element.bMatrix, correctionLocal);
    maximum = Math.max(
      maximum,
      maxAbs(currentStrain.map((value, component) => value - correctionStrain[component])),
    );
  }
  return maximum;
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

function createSource(caseDef, physicalMesh, rigid) {
  const affine = numericRecord(caseDef.affine);
  const imposedDisplacements = physicalMesh.nodes
    .filter((node) => node.boundarySides.length)
    .flatMap((node, index) => {
      const displacement = affineAt(affine, node.x, node.y);
      const removed = rigid ? rigidAt(rigid, node.x, node.y) : { ux: 0, uy: 0 };
      const ordinal = String(index + 1).padStart(4, '0');
      return [
        {
          imposedDisplacementId: `ID-${ordinal}-UX`,
          nodeId: node.nodeId,
          dof: 'UX',
          value: displacement.ux - removed.ux,
          sourceReference: `B01#${caseDef.caseId}#${physicalMesh.meshId}#AFFINE_BOUNDARY`,
        },
        {
          imposedDisplacementId: `ID-${ordinal}-UY`,
          nodeId: node.nodeId,
          dof: 'UY',
          value: displacement.uy - removed.uy,
          sourceReference: `B01#${caseDef.caseId}#${physicalMesh.meshId}#AFFINE_BOUNDARY`,
        },
      ];
    });
  return {
    schema: MODEL_SCHEMA,
    modelIdentity: `${rigid ? 'B01_T3_RIGID_SHIFT' : 'B01_T3_BASE'}_${caseDef.caseId}_${physicalMesh.meshId}`,
    modelVersion: '1',
    sourceAncestry: {
      sourceModelIdentity: caseDef.caseId,
      sourceVersion: CASES.schema,
      adapterIdentity: rigid
        ? 'LAFEA3_B01_T3_RIGID_REFERENCE_PARTITION_DIAGNOSTIC'
        : 'LAFEA3_B01_T3_RIGID_REFERENCE_BASELINE',
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
      'B01_T3_RIGID_REFERENCE_PARTITION_DIAGNOSTIC_ONLY',
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
