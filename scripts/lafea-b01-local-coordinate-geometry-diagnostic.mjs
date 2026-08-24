#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { MODEL_SCHEMA, QUALIFICATION_PROFILE } from '../src/core/local-continuum/index.js';
import { assembleMesh } from '../src/core/local-continuum/assembly.js';
import { buildElementEvidence } from '../src/core/local-continuum/element.js';
import { assembleLoadCase } from '../src/core/local-continuum/loads.js';
import { matrixVector, multiply, scaleMatrix, transpose, zeros } from '../src/core/local-continuum/matrix.js';
import { solvePartitioned } from '../src/core/local-continuum/solver.js';
import { T6_GAUSS_POINTS, t6ShapeFunctionsAndDerivatives } from '../src/core/local-continuum/t6-element.js';
import { Q8_GAUSS_POINTS, q8ShapeFunctionsAndDerivatives } from '../src/core/local-continuum/q8-element.js';
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
  schema: 'lafea-b01-local-coordinate-geometry-diagnostic/v1',
  issue: 1100,
  exactHead: git(['rev-parse', 'HEAD']),
  purpose: 'Evidence-only translation-stable geometry evaluation. T3 area is recomputed from edge vectors relative to one corner; T6/Q8 Jacobians are formed from node coordinates translated to one element-local origin before the unchanged physical-derivative, quadrature and stiffness operations. No mesh, material, load, solver or tolerance changes are made.',
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
    const currentElements = buildElementEvidence(model);
    const currentMesh = assembleMesh(model, currentElements);
    if (currentMesh.globalStiffnessStorage !== 'DENSE') {
      return { family: meshRow.family, meshId: meshRow.meshId, status: 'NOT_APPLICABLE' };
    }
    const local = localizeElements(currentElements, nodeMap);
    const localizedMesh = assembleMesh(model, local.elements);
    const loadCase = model.loadCases.find((row) => row.loadCaseId === 'AFFINE');
    const load = assembleLoadCase(model, localizedMesh, local.elements, loadCase);
    const solution = solvePartitioned(model, localizedMesh, load);
    const partition = partitionIndices(model, localizedMesh.dofOrdering, load.imposedDisplacements);
    const exact = exactDisplacement(model, localizedMesh.dofOrdering);
    const currentExact = evaluateAction(currentMesh.globalStiffnessMatrix, exact, load.forceVector, partition);
    const localizedExact = evaluateAction(localizedMesh.globalStiffnessMatrix, exact, load.forceVector, partition);
    const localizedSolved = solutionResidual(solution, load);
    return {
      family: meshRow.family,
      meshId: meshRow.meshId,
      status: 'EVALUATED',
      currentExactRigidAction: currentExact,
      localizedExactRigidAction: localizedExact,
      localizedSolvedResidual: localizedSolved,
      localizedSolvedQualifies: localizedSolved.normalizedFreeResidual <= GATE,
      maximumAreaRelativeChange: local.maximumAreaRelativeChange,
      maximumJacobianRelativeChange: local.maximumJacobianRelativeChange,
      maximumBAbsoluteChange: local.maximumBAbsoluteChange,
      maximumRelativeElementStiffnessChange: local.maximumRelativeStiffnessChange,
      maximumAffineEnergyRelativeChange: local.maximumAffineEnergyRelativeChange,
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

function localizeElements(elements, nodeMap) {
  let maximumAreaRelativeChange = 0;
  let maximumJacobianRelativeChange = 0;
  let maximumBAbsoluteChange = 0;
  let maximumRelativeStiffnessChange = 0;
  let maximumAffineEnergyRelativeChange = 0;
  const localized = elements.map((element) => {
    const nodes = element.nodeIds.map((nodeId) => nodeMap.get(nodeId));
    let replacement;
    if (element.elementType === 'T3') {
      const area = stableTriangleArea(nodes);
      const B = t3BMatrix(nodes, area);
      const stiffness = scaleMatrix(
        multiply(multiply(transpose(B), element.dMatrix), B),
        element.thickness * area,
      );
      maximumAreaRelativeChange = Math.max(
        maximumAreaRelativeChange,
        Math.abs(area - element.canonicalArea) / Math.max(1, Math.abs(element.canonicalArea)),
      );
      maximumBAbsoluteChange = Math.max(maximumBAbsoluteChange, matrixDifference(B, element.bMatrix));
      replacement = { ...element, canonicalArea: area, bMatrix: B, localStiffnessMatrix: stiffness };
    } else {
      const points = element.elementType === 'T6' ? T6_GAUSS_POINTS : Q8_GAUSS_POINTS;
      const shape = element.elementType === 'T6'
        ? t6ShapeFunctionsAndDerivatives
        : q8ShapeFunctionsAndDerivatives;
      const gaussEvidence = [];
      let stiffness = zeros(element.localStiffnessMatrix.length, element.localStiffnessMatrix.length);
      for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
        const gp = points[pointIndex];
        const localizedPoint = localizedBAt(nodes, gp.xi, gp.eta, shape);
        const currentPoint = element.gaussEvidence[pointIndex];
        maximumJacobianRelativeChange = Math.max(
          maximumJacobianRelativeChange,
          Math.abs(localizedPoint.jacobianDeterminant - currentPoint.jacobianDeterminant)
            / Math.max(1, Math.abs(currentPoint.jacobianDeterminant)),
        );
        maximumBAbsoluteChange = Math.max(
          maximumBAbsoluteChange,
          matrixDifference(localizedPoint.B, currentPoint.B),
        );
        const contribution = scaleMatrix(
          multiply(multiply(transpose(localizedPoint.B), element.dMatrix), localizedPoint.B),
          element.thickness * localizedPoint.jacobianDeterminant * gp.weight,
        );
        stiffness = stiffness.map((row, i) => row.map((value, j) => value + contribution[i][j]));
        gaussEvidence.push({
          ...currentPoint,
          jacobianDeterminant: localizedPoint.jacobianDeterminant,
          B: localizedPoint.B,
        });
      }
      replacement = { ...element, gaussEvidence, localStiffnessMatrix: stiffness };
    }
    maximumRelativeStiffnessChange = Math.max(
      maximumRelativeStiffnessChange,
      matrixDifference(replacement.localStiffnessMatrix, element.localStiffnessMatrix)
        / Math.max(1, matrixMaximum(element.localStiffnessMatrix)),
    );
    maximumAffineEnergyRelativeChange = Math.max(
      maximumAffineEnergyRelativeChange,
      affineEnergyChange(element.localStiffnessMatrix, replacement.localStiffnessMatrix, nodes),
    );
    return replacement;
  });
  return {
    elements: localized,
    maximumAreaRelativeChange,
    maximumJacobianRelativeChange,
    maximumBAbsoluteChange,
    maximumRelativeStiffnessChange,
    maximumAffineEnergyRelativeChange,
  };
}

function stableTriangleArea(nodes) {
  const [a, b, c] = nodes;
  return Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
}

function t3BMatrix(nodes, area) {
  const [a, b, c] = nodes;
  const beta = [b.y - c.y, c.y - a.y, a.y - b.y];
  const gamma = [c.x - b.x, a.x - c.x, b.x - a.x];
  const factor = 1 / (2 * area);
  return [
    [beta[0] * factor, 0, beta[1] * factor, 0, beta[2] * factor, 0],
    [0, gamma[0] * factor, 0, gamma[1] * factor, 0, gamma[2] * factor],
    [gamma[0] * factor, beta[0] * factor, gamma[1] * factor, beta[1] * factor, gamma[2] * factor, beta[2] * factor],
  ];
}

function localizedBAt(nodes, xi, eta, shapeFunction) {
  const { dNdXi, dNdEta } = shapeFunction(xi, eta);
  const origin = nodes[0];
  let dxDxi = 0;
  let dyDxi = 0;
  let dxDeta = 0;
  let dyDeta = 0;
  for (let index = 0; index < nodes.length; index += 1) {
    const x = nodes[index].x - origin.x;
    const y = nodes[index].y - origin.y;
    dxDxi += dNdXi[index] * x;
    dyDxi += dNdXi[index] * y;
    dxDeta += dNdEta[index] * x;
    dyDeta += dNdEta[index] * y;
  }
  const determinant = dxDxi * dyDeta - dxDeta * dyDxi;
  if (!(determinant > 0)) throw new Error(`Localized Jacobian ${determinant} is not positive.`);
  const invDet = 1 / determinant;
  const B = zeros(3, 2 * nodes.length);
  for (let index = 0; index < nodes.length; index += 1) {
    const dNdx = invDet * (dyDeta * dNdXi[index] - dyDxi * dNdEta[index]);
    const dNdy = invDet * (-dxDeta * dNdXi[index] + dxDxi * dNdEta[index]);
    B[0][2 * index] = dNdx;
    B[1][2 * index + 1] = dNdy;
    B[2][2 * index] = dNdy;
    B[2][2 * index + 1] = dNdx;
  }
  return { B, jacobianDeterminant: determinant };
}

function solutionResidual(solution, load) {
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

function affineEnergyChange(original, localized, nodes) {
  const fields = [
    nodes.flatMap((node) => [node.x, 0]),
    nodes.flatMap((node) => [0, node.y]),
    nodes.flatMap((node) => [node.y / 2, node.x / 2]),
  ];
  let maximum = 0;
  for (const field of fields) {
    const current = 0.5 * compensatedDot(field, matrixVector(original, field));
    const candidate = 0.5 * compensatedDot(field, matrixVector(localized, field));
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
        { imposedDisplacementId: `ID-${ordinal}-UX`, nodeId: node.nodeId, dof: 'UX', value: displacement.ux, sourceReference: `B01#${caseDef.caseId}#${physicalMesh.meshId}#AFFINE_BOUNDARY` },
        { imposedDisplacementId: `ID-${ordinal}-UY`, nodeId: node.nodeId, dof: 'UY', value: displacement.uy, sourceReference: `B01#${caseDef.caseId}#${physicalMesh.meshId}#AFFINE_BOUNDARY` },
      ];
    });
  return {
    schema: MODEL_SCHEMA,
    modelIdentity: `B01_LOCAL_GEOMETRY_${caseDef.caseId}_${physicalMesh.meshId}`,
    modelVersion: '1',
    sourceAncestry: {
      sourceModelIdentity: caseDef.caseId,
      sourceVersion: CASES.schema,
      adapterIdentity: 'LAFEA3_B01_LOCAL_COORDINATE_GEOMETRY_DIAGNOSTIC',
      adapterVersion: '1',
    },
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
    limitations: ['B01_AFFINE_CODE_VERIFICATION_ONLY', 'B01_LOCAL_COORDINATE_GEOMETRY_DIAGNOSTIC_ONLY', 'NO_RELEASE_AUTHORITY_FROM_B01'],
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
