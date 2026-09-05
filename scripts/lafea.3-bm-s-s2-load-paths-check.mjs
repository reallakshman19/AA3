#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  calculateLocalContinuum,
  createCanonicalLocalContinuumModel,
  QUALIFICATION_PROFILE,
  QUALIFICATION_STATES,
} from '../src/core/local-continuum/index.js';
import { clone, patchSource, triangleSource } from './lafea.3-fixtures.mjs';
import { semanticHashes, writeBmSCaseEvidence } from './lib/lafea.3-bm-s-evidence.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORACLE_PATH = path.join(
  ROOT,
  'validation/lafea-benchmark-data/B02/oracle/load-path-expected-values.json',
);
const oracle = JSON.parse(fs.readFileSync(ORACLE_PATH, 'utf8'));
assert.equal(oracle.schema, 'lafea-b02-s2-load-path-expected-values/v1');
assert.equal(oracle.authority.productionOutputUsed, false);
assert.equal(oracle.authority.productionOutputMayModifyExpectedValues, false);
const expectedById = new Map(oracle.cases.map((row) => [row.caseId, row]));

const caseResults = [
  capture('LOAD-EDGE-TRACTION-01', runEdgeTraction),
  capture('LOAD-PRESSURE-01', runPressure),
  capture('LOAD-BODY-FORCE-01', runBodyForce),
  capture('LOAD-TEMPERATURE-01', runTemperature),
  capture('LOAD-IMPOSED-DISPLACEMENT-01', runImposedDisplacement),
];
const evidence = {
  schema: 'lafea3-bm-s-s2-load-path-evidence/v1',
  benchmarkStage: 'S2',
  authority: {
    class: oracle.authority.class,
    productionOutputUsedToDefineExpectedValues: false,
    productionOutputMayModifyAcceptance: false,
  },
  acceptance: oracle.acceptance,
  caseResults,
  stageStatus: caseResults.every((row) => row.status === 'PASS') ? 'PASS' : 'FAIL',
};
writeBmSCaseEvidence('LAFEA_BM_S_S2_REPORT_PATH', evidence);
console.log(JSON.stringify(evidence));
assert.equal(
  evidence.stageStatus,
  'PASS',
  `S2 load-path failures: ${caseResults.filter((row) => row.status !== 'PASS').map((row) => row.caseId).join(', ')}`,
);

function capture(caseId, execute) {
  try {
    const expected = expectedById.get(caseId);
    assert.ok(expected, `missing S2 oracle ${caseId}`);
    const value = execute(expected);
    return { caseId, loadType: expected.loadType, ...value };
  } catch (error) {
    return {
      caseId,
      loadType: expectedById.get(caseId)?.loadType ?? 'UNKNOWN',
      status: 'FAIL',
      error: { name: error?.name ?? 'Error', code: error?.code ?? null, message: String(error?.message ?? error) },
    };
  }
}

function runEdgeTraction(expected) {
  const model = patchSource({ sigma: expected.inputs.tractionXMPa });
  model.resultRequests = { loadCaseIds: ['TRACTION'] };
  const result = solve(model);
  return affinePatchEvidence(result, model, 'TRACTION', expected, expected.inputs.tractionXMPa);
}

function runPressure(expected) {
  const model = clone(patchSource());
  model.loadCases = [{
    loadCaseId: 'PRESSURE', nodalForces: [], edgeTractions: [],
    pressureLoads: [{
      pressureLoadId: 'P1', elementId: 'E2', edgeNodeIds: ['B', 'C'],
      pressure: expected.inputs.pressureMPa, sourceReference: 'PRESSURE#P1',
    }],
    bodyForces: [], temperatureLoads: [], imposedDisplacements: [], sourceReference: 'CASE#PRESSURE',
  }];
  model.resultRequests = { loadCaseIds: ['PRESSURE'] };
  const result = solve(model);
  return affinePatchEvidence(result, model, 'PRESSURE', expected, -expected.inputs.pressureMPa);
}

function runImposedDisplacement(expected) {
  const model = clone(patchSource());
  const delta = expected.inputs.rightEdgeUxMm;
  model.loadCases = [{
    loadCaseId: 'IMPOSED', nodalForces: [], edgeTractions: [], pressureLoads: [], bodyForces: [], temperatureLoads: [],
    imposedDisplacements: [
      { imposedDisplacementId: 'D-B', nodeId: 'B', dof: 'UX', value: delta, sourceReference: 'IMPOSED#D-B' },
      { imposedDisplacementId: 'D-C', nodeId: 'C', dof: 'UX', value: delta, sourceReference: 'IMPOSED#D-C' },
    ],
    sourceReference: 'CASE#IMPOSED',
  }];
  model.resultRequests = { loadCaseIds: ['IMPOSED'] };
  const result = solve(model);
  return affinePatchEvidence(
    result,
    model,
    'IMPOSED',
    expected,
    expected.inputs.elasticModulusMPa * delta / expected.inputs.widthMm,
  );
}

function affinePatchEvidence(result, model, loadCaseId, expected, sigmaX) {
  const checks = [];
  const loadCase = caseBy(result, loadCaseId);
  const e = expected.inputs.elasticModulusMPa;
  const nu = expected.inputs.poissonRatio;
  const nodes = new Map(model.nodes.map((row) => [row.nodeId, row]));
  for (const displacement of loadCase.nodalDisplacements) {
    const node = nodes.get(displacement.nodeId);
    compare(checks, `${displacement.nodeId}.ux`, displacement.ux, sigmaX * node.x / e);
    compare(checks, `${displacement.nodeId}.uy`, displacement.uy, -nu * sigmaX * node.y / e);
  }
  for (const element of loadCase.elementResults) {
    compare(checks, `${element.elementId}.sigmaX`, element.stress.sigmaX, expected.derived.sigmaXMPa);
    compare(checks, `${element.elementId}.sigmaY`, element.stress.sigmaY, expected.derived.sigmaYMPa);
    compare(checks, `${element.elementId}.tauXY`, element.stress.tauXY, expected.derived.tauXYMPa);
  }
  return finalize(result, checks, {
    field: 'AFFINE_UNIAXIAL_PLANE_STRESS',
    rightEdgeUxMm: expected.derived.rightEdgeUxMm,
    topEdgeUyMm: expected.derived.topEdgeUyMm,
  });
}

function runTemperature(expected) {
  const model = triangleSource({ elasticModulus: expected.inputs.elasticModulusMPa });
  model.materials[0].poissonRatio = expected.inputs.poissonRatio;
  model.loadCases = [{
    loadCaseId: 'THERMAL', nodalForces: [], edgeTractions: [], pressureLoads: [], bodyForces: [],
    temperatureLoads: [{
      temperatureLoadId: 'T1', elementId: 'E1', thermalStrain: expected.inputs.thermalStrain, sourceReference: 'THERMAL#T1',
    }],
    imposedDisplacements: [], sourceReference: 'CASE#THERMAL',
  }];
  model.resultRequests = { loadCaseIds: ['THERMAL'] };
  const result = solve(model);
  const loadCase = caseBy(result, 'THERMAL');
  const element = loadCase.elementResults[0];
  const nodes = new Map(model.nodes.map((row) => [row.nodeId, row]));
  const checks = [];
  for (const displacement of loadCase.nodalDisplacements) {
    const node = nodes.get(displacement.nodeId);
    compare(checks, `${displacement.nodeId}.ux`, displacement.ux, expected.inputs.thermalStrain * node.x);
    compare(checks, `${displacement.nodeId}.uy`, displacement.uy, expected.inputs.thermalStrain * node.y);
  }
  compare(checks, 'sigmaX', element.stress.sigmaX, 0);
  compare(checks, 'sigmaY', element.stress.sigmaY, 0);
  compare(checks, 'sigmaZ', element.stress.sigmaZ, 0);
  compare(checks, 'tauXY', element.stress.tauXY, 0);
  compare(checks, 'strainEnergy', loadCase.totalStrainEnergy, 0);
  return finalize(result, checks, {
    field: 'FREE_UNIFORM_THERMAL_EXPANSION',
    thermalStrain: expected.inputs.thermalStrain,
  });
}

function runBodyForce(expected) {
  const model = manufacturedBodyForceModel(expected);
  const result = solve(model);
  const loadCase = caseBy(result, 'MANUFACTURED');
  const checks = [];
  const { elasticModulusMPa: e, poissonRatio: nu, quadraticCoefficientPerMm: a, widthMm: width, heightMm: height } = expected.inputs;
  const nodes = new Map(model.nodes.map((row) => [row.nodeId, row]));
  for (const displacement of loadCase.nodalDisplacements) {
    const node = nodes.get(displacement.nodeId);
    compare(checks, `${displacement.nodeId}.ux`, displacement.ux, a * (node.x ** 2 + nu * node.y ** 2));
    compare(checks, `${displacement.nodeId}.uy`, displacement.uy, -2 * nu * a * node.x * node.y);
  }
  const element = loadCase.elementResults[0];
  for (const gp of element.gaussPointResults) {
    const x = width * (1 + gp.xi) / 2;
    compare(checks, `${gp.pointId}.sigmaX`, gp.stress.sigmaX, 2 * e * a * x);
    compare(checks, `${gp.pointId}.sigmaY`, gp.stress.sigmaY, 0);
    compare(checks, `${gp.pointId}.tauXY`, gp.stress.tauXY, 0);
  }
  const probe = expected.derived.fixedProbe;
  compare(checks, 'fixedProbe.ux', a * (probe.xMm ** 2 + nu * probe.yMm ** 2), probe.uxMm);
  compare(checks, 'fixedProbe.uy', -2 * nu * a * probe.xMm * probe.yMm, probe.uyMm);
  compare(checks, 'bodyForceX', -2 * e * a, expected.derived.bodyForceX);
  compare(checks, 'rightEdgeTractionX', 2 * e * a * width, expected.derived.rightEdgeTractionXMPa);
  return finalize(result, checks, {
    field: 'MANUFACTURED_QUADRATIC_Q8_BODY_FORCE',
    physicalProbeMm: { x: probe.xMm, y: probe.yMm },
    domainMm: { width, height },
  });
}

function manufacturedBodyForceModel(expected) {
  const { widthMm: w, heightMm: h, thicknessMm: t, elasticModulusMPa: e, poissonRatio: nu, quadraticCoefficientPerMm: a } = expected.inputs;
  const bodyForceX = -2 * e * a;
  const rightTraction = 2 * e * a * w;
  return {
    schema: 'local-continuum-model/v1', modelIdentity: 'BM_S_S2_BODY_FORCE', modelVersion: '1',
    sourceAncestry: { sourceModelIdentity: 'BM-S-B02', sourceVersion: '1', adapterIdentity: 'S2_MANUFACTURED_BVP', adapterVersion: '1' },
    units: { length: 'mm', force: 'N', stress: 'MPa', modulus: 'MPa' }, formulation: 'PLANE_STRESS',
    materials: [{ materialId: 'MAT', elasticModulus: e, poissonRatio: nu, sourceReference: 'MATERIAL#MAT' }],
    nodes: [n('A',0,0),n('B',w,0),n('C',w,h),n('D',0,h),n('E',w/2,0),n('F',w,h/2),n('G',w/2,h),n('H',0,h/2)],
    elements: [{ elementId: 'E1', elementType: 'Q8', nodeIds: ['A','B','C','D','E','F','G','H'], materialId: 'MAT', thickness: t, sourceReference: 'ELEMENT#E1' }],
    elementTypePolicy: { allowT3Fallback: false, sourceReference: 'Q8_EXACT_MANUFACTURED_FIELD' },
    constraints: [c('A-UX','A','UX'), c('A-UY','A','UY'), c('B-UY','B','UY')],
    loadCases: [{
      loadCaseId: 'MANUFACTURED', nodalForces: [],
      edgeTractions: [{ tractionId: 'RIGHT', elementId: 'E1', edgeNodeIds: ['B','F','C'], tx: rightTraction, ty: 0, sourceReference: 'TRACTION#RIGHT' }],
      pressureLoads: [], bodyForces: [{ bodyForceId: 'BF', elementId: 'E1', bx: bodyForceX, by: 0, sourceReference: 'BODYFORCE#BF' }],
      temperatureLoads: [], imposedDisplacements: [], sourceReference: 'CASE#MANUFACTURED',
    }],
    resultRequests: { loadCaseIds: ['MANUFACTURED'] },
    qualificationProfile: structuredClone(QUALIFICATION_PROFILE), limitations: [],
  };
}

function solve(model) {
  const result = calculateLocalContinuum(createCanonicalLocalContinuumModel(model));
  assert.equal(result.qualification.state, QUALIFICATION_STATES.ACCEPTED);
  return result;
}

function finalize(result, checks, observation) {
  const failed = checks.filter((row) => !row.accepted);
  return {
    status: failed.length === 0 ? 'PASS' : 'FAIL',
    levels: [{ levelId: 'EXACT-BVP', observation, checks }],
    maximumAbsoluteError: Math.max(0, ...checks.map((row) => row.absoluteError)),
    failedCheckCount: failed.length,
    semanticHashes: semanticHashes(result),
  };
}

function compare(checks, label, actual, expected) {
  const absoluteError = Math.abs(actual - expected);
  const limit = oracle.acceptance.absoluteTolerance
    + oracle.acceptance.relativeTolerance * Math.max(1, Math.abs(expected));
  checks.push({ label, actual, expected, absoluteError, limit, accepted: absoluteError <= limit });
}

function caseBy(result, loadCaseId) {
  const row = result.loadCaseResults.find((item) => item.loadCaseId === loadCaseId);
  assert.ok(row, `missing load case ${loadCaseId}`);
  return row;
}
function n(nodeId, x, y) { return { nodeId, x, y, sourceReference: `NODE#${nodeId}` }; }
function c(constraintId, nodeId, dof) { return { constraintId, nodeId, dof, value: 0, sourceReference: `CONSTRAINT#${constraintId}` }; }
