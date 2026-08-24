#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  MODEL_SCHEMA,
  QUALIFICATION_PROFILE,
} from '../src/core/local-continuum/index.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { runPython } from './lib/python-interpreter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const B01 = path.join(ROOT, 'validation/lafea-benchmark-data/B01');
const CASES_PATH = path.join(B01, 'oracle/cases.json');
const MESH_GENERATOR = path.join(B01, 'mesh-generator.py');
const MESH_SUMMARY_PATH = path.join(B01, 'meshes/mesh-generation-summary.json');
const RIGID_CASE_ID = 'LAFEA3-AFFINE-RIGID-04';

const cases = readJson(CASES_PATH);
const rigid = cases.cases.find((row) => row.caseId === RIGID_CASE_ID);
if (!rigid) throw new Error(`Missing frozen rigid case ${RIGID_CASE_ID}.`);
const meshRows = readJson(MESH_SUMMARY_PATH).meshes;
const composition = requireLafeaStageComposition('LAFEA.3');
const gitHead = git(['rev-parse', 'HEAD']);

const diagnostics = meshRows.map((meshRow) => diagnoseMesh(meshRow));
const payload = {
  schema: 'lafea-b01-rigid-solver-diagnostic/v1',
  issue: 1100,
  exactHead: gitHead,
  caseId: RIGID_CASE_ID,
  purpose: 'Evidence-only separation of reduced dense solve accuracy from full-system residual/reaction reconstruction. Does not alter B01 pass/fail semantics.',
  route: {
    compositionRootId: composition.compositionRootId,
    registryAuthority: composition.registryEntry.authority,
    enginePackage: composition.registryEntry.enginePackage,
  },
  frozenAcceptance: {
    normalizedFreeDofInfinityResidualMaximum: 1e-10,
    note: 'Diagnostic only; source value remains governance/fem-semantics.json.',
  },
  diagnostics,
};
process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);

function diagnoseMesh(meshRow) {
  try {
    const compact = JSON.parse(runPython([MESH_GENERATOR, '--emit', '--family', meshRow.family, '--mesh', meshRow.meshId],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
    ));
    if (compact.meshSemanticHash !== meshRow.meshSemanticHash) {
      throw new Error(`Mesh semantic hash mismatch for ${meshRow.meshId}.`);
    }
    const mesh = materializeMesh(compact, rigid);
    const source = createSource(rigid, mesh);
    const normalized = composition.normalizeDocument(source);
    const model = composition.canonicalize(normalized);
    const result = composition.calculate(model);
    const accepted = composition.acceptResult(result);
    if (!accepted) {
      return {
        family: meshRow.family,
        meshId: meshRow.meshId,
        registeredAccepted: false,
        qualificationState: result?.qualification?.state ?? null,
        diagnostics: result?.diagnostics ?? [],
      };
    }
    const loadCase = result.loadCaseResults?.find((row) => row.loadCaseId === 'AFFINE');
    if (!loadCase) throw new Error(`Accepted ${meshRow.meshId} result is missing AFFINE load case.`);
    const freeInfinity = maxAbs(loadCase.freeDofResiduals?.map((row) => row.value) ?? []);
    const reactionInfinity = maxAbs(loadCase.supportReactions?.map((row) => row.value) ?? []);
    const appliedInfinity = maxAbs(loadCase.forceEvidence?.forceVector ?? []);
    const normalizationScale = Math.max(1, reactionInfinity, appliedInfinity);
    const refinement = loadCase.solverEvidence?.iterativeRefinement ?? null;
    return {
      family: meshRow.family,
      meshId: meshRow.meshId,
      registeredAccepted: true,
      qualificationState: result.qualification.state,
      solverMethod: loadCase.solverEvidence?.method ?? null,
      globalStiffnessStorage: result.meshEvidence?.globalStiffnessStorage ?? 'DENSE',
      iterativeRefinement: refinement,
      productionEquilibrium: loadCase.equilibrium ?? null,
      fullSystemFreeDofInfinityResidual: freeInfinity,
      reactionInfinity,
      appliedForceInfinity: appliedInfinity,
      harnessNormalizationScale: normalizationScale,
      harnessNormalizedFreeDofInfinityResidual: freeInfinity / normalizationScale,
      reducedVsFullResidualRatio: refinement && refinement.finalResidualInfinity !== null
        ? freeInfinity / Math.max(Number.MIN_VALUE, refinement.finalResidualInfinity)
        : null,
    };
  } catch (error) {
    return {
      family: meshRow.family,
      meshId: meshRow.meshId,
      registeredAccepted: false,
      diagnosticFailure: {
        code: error?.code ?? error?.name ?? 'ERROR',
        path: error?.path ?? 'diagnostic',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
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
    modelIdentity: `B01_DIAGNOSTIC_${caseDef.caseId}_${physicalMesh.meshId}`,
    modelVersion: '1',
    sourceAncestry: {
      sourceModelIdentity: caseDef.caseId,
      sourceVersion: cases.schema,
      adapterIdentity: 'LAFEA3_B01_RIGID_SOLVER_DIAGNOSTIC',
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
      'B01_RIGID_SOLVER_DIAGNOSTIC_ONLY',
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
