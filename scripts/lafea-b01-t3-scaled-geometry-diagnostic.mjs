#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { MODEL_SCHEMA, QUALIFICATION_PROFILE } from '../src/core/local-continuum/index.js';
import { assembleMesh } from '../src/core/local-continuum/assembly.js';
import { buildElementEvidence } from '../src/core/local-continuum/element.js';
import { assembleLoadCase } from '../src/core/local-continuum/loads.js';
import { matrixVector, multiply, scaleMatrix, transpose } from '../src/core/local-continuum/matrix.js';
import { solvePartitioned } from '../src/core/local-continuum/solver.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { runPython } from './lib/python-interpreter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const B01 = path.join(ROOT, 'validation/lafea-benchmark-data/B01');
const CASES = readJson(path.join(B01, 'oracle/cases.json'));
const RIGID = CASES.cases.find((row) => row.caseId === 'LAFEA3-AFFINE-RIGID-04');
const MESH_ROWS = readJson(path.join(B01, 'meshes/mesh-generation-summary.json')).meshes
  .filter((row) => row.family === 'T3');
const MESH_GENERATOR = path.join(B01, 'mesh-generator.py');
const COMPOSITION = requireLafeaStageComposition('LAFEA.3');
const GATE = 1e-10;

if (!RIGID) throw new Error('Missing frozen rigid B01 case.');

const diagnostics = MESH_ROWS.map(diagnoseMesh);
process.stdout.write(`${JSON.stringify({
  schema: 'lafea-b01-t3-scaled-local-geometry-diagnostic/v1',
  issue: 1100,
  exactHead: git(['rev-parse', 'HEAD']),
  purpose: 'Evidence-only T3 geometry conditioning. Each triangle is translated to one corner and nondimensionalized by its maximum edge before area and B are evaluated; B is then rescaled by 1/L and area by L^2. This is analytically identical to CST in physical coordinates and changes no mesh, material, load, solver or tolerance.',
  productionMechanicsChangedByDiagnostic: false,
  frozenGate: GATE,
  diagnostics,
}, null, 2)}\n`);

function diagnoseMesh(meshRow) {
  try {
    const compact = JSON.parse(runPython([MESH_GENERATOR, '--emit', '--family', 'T3', '--mesh', meshRow.meshId],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
    ));
    if (compact.meshSemanticHash !== meshRow.meshSemanticHash) {
      throw new Error(`Mesh semantic hash mismatch for ${meshRow.meshId}.`);
    }
    const physical = materializeMesh(compact, RIGID);
    const model = COMPOSITION.canonicalize(COMPOSITION.normalizeDocument(createSource(RIGID, physical)));
    const nodeMap = new Map(model.nodes.map((row) => [row.nodeId, row]));
    const currentElements = buildElementEvidence(model);
    const currentMesh = assembleMesh(model, currentElements);
    const scaled = scaleT3Elements(currentElements, nodeMap);
    const scaledMesh = assembleMesh(model, scaled.elements);
    const loadCase = model.loadCases.find((row) => row.loadCaseId === 'AFFINE');
    const load = assembleLoadCase(model, scaledMesh, scaled.elements, loadCase);
    const solution = solvePartitioned(model, scaledMesh, load);
    const partition = partitionIndices(model, scaledMesh.dofOrdering, load.imposedDisplacements);
    const exact = exactDisplacement(model, scaledMesh.dofOrdering);
    return {
      family: 'T3',
      meshId: meshRow.meshId,
      status: 'EVALUATED',
      currentExactRigidAction: evaluateAction(currentMesh.globalStiffnessMatrix, exact, load.forceVector, partition),
      scaledExactRigidAction: evaluateAction(scaledMesh.globalStiffnessMatrix, exact, load.forceVector, partition),
      scaledSolvedResidual: solutionResidual(solution, load),
      maximumScale: scaled.maximumScale,
      minimumScale: scaled.minimumScale,
      maximumBAbsoluteChange: scaled.maximumBAbsoluteChange,
      maximumRelativeElementStiffnessChange: scaled.maximumRelativeStiffnessChange,
      maximumAffineEnergyRelativeChange: scaled.maximumAffineEnergyRelativeChange,
    };
  } catch (error) {
    return {
      family: 'T3',
      meshId: meshRow.meshId,
      status: 'DIAGNOSTIC_FAILURE',
      error: { code: error?.code ?? error?.name ?? 'ERROR', path: error?.path ?? 'diagnostic', message: error instanceof Error ? error.message : String(error) },
    };
  }
}

function scaleT3Elements(elements, nodeMap) {
  let maximumScale = 0;
  let minimumScale = Infinity;
  let maximumBAbsoluteChange = 0;
  let maximumRelativeStiffnessChange = 0;
  let maximumAffineEnergyRelativeChange = 0;
  const corrected = elements.map((element) => {
    const nodes = element.nodeIds.map((nodeId) => nodeMap.get(nodeId));
    const local = scaledT3B(nodes);
    maximumScale = Math.max(maximumScale, local.scale);
    minimumScale = Math.min(minimumScale, local.scale);
    maximumBAbsoluteChange = Math.max(maximumBAbsoluteChange, matrixDifference(local.B, element.bMatrix));
    const stiffness = scaleMatrix(
      multiply(multiply(transpose(local.B), element.dMatrix), local.B),
      element.thickness * local.area,
    );
    maximumRelativeStiffnessChange = Math.max(
      maximumRelativeStiffnessChange,
      matrixDifference(stiffness, element.localStiffnessMatrix) / Math.max(1, matrixMaximum(element.localStiffnessMatrix)),
    );
    maximumAffineEnergyRelativeChange = Math.max(
      maximumAffineEnergyRelativeChange,
      affineEnergyChange(element.localStiffnessMatrix, stiffness, nodes),
    );
    return { ...element, canonicalArea: local.area, bMatrix: local.B, localStiffnessMatrix: stiffness };
  });
  return { elements: corrected, maximumScale, minimumScale, maximumBAbsoluteChange, maximumRelativeStiffnessChange, maximumAffineEnergyRelativeChange };
}

function scaledT3B(nodes) {
  const [a, b, c] = nodes;
  const scale = Math.max(
    Math.hypot(b.x - a.x, b.y - a.y),
    Math.hypot(c.x - b.x, c.y - b.y),
    Math.hypot(a.x - c.x, a.y - c.y),
  );
  if (!(scale > 0)) throw new Error('T3 scale must be positive.');
  const local = nodes.map((node) => ({ x: (node.x - a.x) / scale, y: (node.y - a.y) / scale }));
  const [la, lb, lc] = local;
  const doubleArea = (lb.x - la.x) * (lc.y - la.y) - (lc.x - la.x) * (lb.y - la.y);
  const normalizedArea = Math.abs(doubleArea) / 2;
  if (!(normalizedArea > 0)) throw new Error('Scaled T3 area must be positive.');
  const beta = [lb.y - lc.y, lc.y - la.y, la.y - lb.y];
  const gamma = [lc.x - lb.x, la.x - lc.x, lb.x - la.x];
  const factor = 1 / (2 * normalizedArea * scale);
  const B = [
    [beta[0] * factor, 0, beta[1] * factor, 0, beta[2] * factor, 0],
    [0, gamma[0] * factor, 0, gamma[1] * factor, 0, gamma[2] * factor],
    [gamma[0] * factor, beta[0] * factor, gamma[1] * factor, beta[1] * factor, gamma[2] * factor, beta[2] * factor],
  ];
  return { B, area: normalizedArea * scale * scale, scale };
}

function solutionResidual(solution, load) {
  const freeMaximum = maxAbs(solution.freeDofResiduals.map((row) => row.value));
  const reactionMaximum = maxAbs(solution.reactions.map((row) => row.value));
  const scale = Math.max(1, reactionMaximum, maxAbs(load.forceVector));
  return { freeDofInfinityResidual: freeMaximum, normalizationScale: scale, normalizedFreeResidual: freeMaximum / scale, passesGate: freeMaximum / scale <= GATE };
}

function evaluateAction(matrix, displacement, forceVector, partition) {
  const residual = matrixVector(matrix, displacement).map((value, position) => value - forceVector[position]);
  const freeMaximum = maxAbs(partition.free.map((position) => residual[position]));
  const reactionMaximum = maxAbs(partition.constrained.map((position) => residual[position]));
  const scale = Math.max(1, reactionMaximum, maxAbs(forceVector));
  return { freeDofInfinityResidual: freeMaximum, normalizationScale: scale, normalizedFreeResidual: freeMaximum / scale, passesGate: freeMaximum / scale <= GATE };
}

function affineEnergyChange(original, candidate, nodes) {
  const fields = [nodes.flatMap((node) => [node.x, 0]), nodes.flatMap((node) => [0, node.y]), nodes.flatMap((node) => [node.y / 2, node.x / 2])];
  let maximum = 0;
  for (const field of fields) {
    const current = 0.5 * compensatedDot(field, matrixVector(original, field));
    const next = 0.5 * compensatedDot(field, matrixVector(candidate, field));
    maximum = Math.max(maximum, Math.abs(next - current) / Math.max(1, Math.abs(current)));
  }
  return maximum;
}

function matrixDifference(left, right) {
  let maximum = 0;
  for (let i = 0; i < left.length; i += 1) for (let j = 0; j < left[i].length; j += 1) maximum = Math.max(maximum, Math.abs(left[i][j] - right[i][j]));
  return maximum;
}
function matrixMaximum(matrix) { return matrix.reduce((maximum, row) => Math.max(maximum, maxAbs(row)), 0); }
function compensatedDot(left, right) { return compensatedSum(left.map((value, index) => value * right[index])); }
function compensatedSum(values) { let sum = 0; let correction = 0; for (const term of values) { const next = sum + term; correction += Math.abs(sum) >= Math.abs(term) ? (sum - next) + term : (term - next) + sum; sum = next; } return sum + correction; }

function partitionIndices(model, dofOrdering, imposedDisplacements) {
  const index = new Map(dofOrdering.map((identity, position) => [identity, position]));
  const constrained = [...model.constraints.map((row) => index.get(`${row.nodeId}:${row.dof}`)), ...imposedDisplacements.map((row) => index.get(`${row.nodeId}:${row.dof}`))].sort((left, right) => left - right);
  const set = new Set(constrained);
  return { constrained, free: Array.from({ length: dofOrdering.length }, (_, position) => position).filter((position) => !set.has(position)) };
}

function exactDisplacement(model, dofOrdering) {
  const affine = numericRecord(RIGID.affine);
  const nodes = new Map(model.nodes.map((row) => [row.nodeId, row]));
  return dofOrdering.map((identity) => {
    const split = identity.lastIndexOf(':'); const node = nodes.get(identity.slice(0, split)); const dof = identity.slice(split + 1); const value = affineAt(affine, node.x, node.y); return dof === 'UX' ? value.ux : value.uy;
  });
}

function createSource(caseDef, physicalMesh) {
  const affine = numericRecord(caseDef.affine);
  const imposedDisplacements = physicalMesh.nodes.filter((node) => node.boundarySides.length).flatMap((node, index) => {
    const displacement = affineAt(affine, node.x, node.y); const ordinal = String(index + 1).padStart(4, '0');
    return [
      { imposedDisplacementId: `ID-${ordinal}-UX`, nodeId: node.nodeId, dof: 'UX', value: displacement.ux, sourceReference: `B01#${caseDef.caseId}#${physicalMesh.meshId}#AFFINE_BOUNDARY` },
      { imposedDisplacementId: `ID-${ordinal}-UY`, nodeId: node.nodeId, dof: 'UY', value: displacement.uy, sourceReference: `B01#${caseDef.caseId}#${physicalMesh.meshId}#AFFINE_BOUNDARY` },
    ];
  });
  return {
    schema: MODEL_SCHEMA, modelIdentity: `B01_T3_SCALED_${caseDef.caseId}_${physicalMesh.meshId}`, modelVersion: '1',
    sourceAncestry: { sourceModelIdentity: caseDef.caseId, sourceVersion: CASES.schema, adapterIdentity: 'LAFEA3_B01_T3_SCALED_GEOMETRY_DIAGNOSTIC', adapterVersion: '1' },
    units: { length: 'mm', force: 'N', stress: 'MPa', modulus: 'MPa' }, formulation: caseDef.formulation,
    materials: [{ materialId: 'MAT', elasticModulus: Number(caseDef.material.elasticModulus), poissonRatio: Number(caseDef.material.poissonRatio), sourceReference: `B01#${caseDef.caseId}#MATERIAL` }],
    nodes: physicalMesh.nodes.map((node) => ({ nodeId: node.nodeId, x: node.x, y: node.y, sourceReference: `B01#${physicalMesh.meshId}#${node.nodeId}` })),
    elements: physicalMesh.elements.map((element) => ({ elementId: element.elementId, elementType: 'T3', nodeIds: element.nodeIds, materialId: 'MAT', thickness: Number(caseDef.geometry.thickness), sourceReference: `B01#${physicalMesh.meshId}#${element.elementId}` })),
    elementTypePolicy: { allowT3Fallback: true, sourceReference: 'B01#REGISTERED_T3_FALLBACK' }, constraints: [],
    loadCases: [{ loadCaseId: 'AFFINE', nodalForces: [], edgeTractions: [], pressureLoads: [], bodyForces: [], temperatureLoads: [], imposedDisplacements, sourceReference: `B01#${caseDef.caseId}#AFFINE` }],
    resultRequests: { loadCaseIds: ['AFFINE'] }, qualificationProfile: JSON.parse(JSON.stringify(QUALIFICATION_PROFILE)),
    limitations: ['B01_AFFINE_CODE_VERIFICATION_ONLY', 'B01_T3_SCALED_GEOMETRY_DIAGNOSTIC_ONLY', 'NO_RELEASE_AUTHORITY_FROM_B01'],
  };
}

function materializeMesh(mesh, caseDef) {
  const width = Number(caseDef.geometry.width); const height = Number(caseDef.geometry.height);
  return { meshId: mesh.meshId, nodes: mesh.nodes.map((row) => ({ nodeId: row[0], x: Number(row[1]) * width, y: Number(row[2]) * height, boundarySides: row[3] })), elements: mesh.elements.map((row) => ({ elementId: row[0], nodeIds: row[1] })) };
}
function numericRecord(value) { return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, Number(item)])); }
function affineAt(a, x, y) { return { ux: a.u0 + a.ux * x + a.uy * y, uy: a.v0 + a.vx * x + a.vy * y }; }
function maxAbs(values) { return values.reduce((maximum, value) => Math.max(maximum, Math.abs(value ?? 0)), 0); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function git(parameters) { return execFileSync('git', parameters, { cwd: ROOT, encoding: 'utf8' }).trim(); }
