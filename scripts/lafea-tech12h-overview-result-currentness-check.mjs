#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildLafeaEngineeringOverview } from '../src/workspace/lafea-engineering-overview.js';
import {
  LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD,
} from '../src/workspace/lafea4-parent-normal-production-activation.js';
import {
  LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCK_CODE,
} from '../src/workspace/lafea4-parent-normal-production-gate.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const definition = JSON.parse(fs.readFileSync(
  path.join(repoRoot, 'validation/lafea4-refinement/parent-normal-overview-result-currentness-v1.json'),
  'utf8',
));

assert.equal(LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD, null);
assert.equal(definition.currentTrustRoot, 'NULL');

const registry4 = {
  stageId: 'LAFEA.4',
  enginePackage: 'local-shell',
  authority: 'CST_DKT_TRI3_THIN_SHELL_V1',
  engineState: 'QUALIFIED_ROUTE_REGISTERED',
  presenterRole: 'LOCAL_SHELL_RESULT_EVIDENCE',
};
const baseResult = {
  qualification: { state: 'ACCEPTED', accepted: true },
  loadCaseResults: [{
    totalStrainEnergy: 12.5,
    nodalDisplacements: [
      { nodeId: 'N1', ux: 0.3, uy: 0.4 },
      { nodeId: 'N2', ux: 0.1, uy: 0 },
    ],
    elementResults: [{
      elementId: 'E1',
      vonMises: 90,
      stress: { sigmaX: -80 },
      gaussPointResults: [{ stress: { sigmaX: 100 }, vonMises: 95 }],
    }],
  }],
};
const governedStage = {
  stageId: 'LAFEA.4',
  shellMidsurfaceProfileActive: true,
  document: {
    modelIdentity: 'TECH12H-SHELL',
    units: { length: 'mm', stress: 'MPa', force: 'N' },
    materials: [{ materialId: 'MAT1' }],
    nodes: [{ nodeId: 'N1' }, { nodeId: 'N2' }, { nodeId: 'N3' }],
    elements: [{ elementId: 'E1', elementType: 'CST_DKT_TRI3_THIN_SHELL_V1' }],
    constraints: [],
    loadCases: [{ loadCaseId: 'LC1' }],
    qualificationProfile: { identity: 'LAFEA4-SHELL' },
  },
  retainedAnalysisMeshEvidenceV2: {
    qualification: 'PASS',
    meshProfile: { profileIdentity: 'TECH12H-H15' },
    mesh: {
      nodes: [{ nodeId: 'N1' }, { nodeId: 'N2' }, { nodeId: 'N3' }],
      elements: [{ elementId: 'E1', elementType: 'CST_DKT_TRI3_THIN_SHELL_V1' }],
    },
  },
  analysisMeshCustodyProjection: {
    state: 'CURRENT_PASS',
    usableForRun: true,
    runBlockingReasons: [],
  },
  orchestration: {
    sections: { AUTHORIZATION: { state: 'READY', reasons: [] } },
  },
  lifecycleReadiness: {
    calculationState: 'CALCULATION_ACCEPTED_BY_STAGE_CONTRACT',
    resultReady: true,
    blockingReasons: [],
  },
  execution: {
    status: 'QUALIFIED',
    result: structuredClone(baseResult),
  },
};

const current = buildLafeaEngineeringOverview(governedStage, registry4);
assert.equal(current.mesh.state, 'CURRENT_PASS');
assert.equal(current.execution.status, 'QUALIFIED');
assert.equal(current.execution.authorized, true);
assert.equal(current.execution.accepted, true);
assert.equal(current.execution.loadCaseCount, 1);
assert.ok(current.execution.metrics.length > 0);
const historicalMetrics = structuredClone(current.execution.metrics);

// Future trusted active gate after an execution was produced: retain the run as
// historical evidence, but current readiness has revoked its authority.
const blockedStage = structuredClone(governedStage);
blockedStage.analysisMeshCustodyProjection.state = 'CURRENT_BLOCK';
blockedStage.analysisMeshCustodyProjection.usableForRun = false;
blockedStage.analysisMeshCustodyProjection.runBlockingReasons = [
  LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCK_CODE,
];
blockedStage.orchestration.sections.AUTHORIZATION = {
  state: 'BLOCKED',
  reasons: [LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCK_CODE],
};
blockedStage.lifecycleReadiness.calculationState = 'CALCULATION_NOT_ACCEPTED_BY_STAGE_CONTRACT';
blockedStage.lifecycleReadiness.resultReady = false;
blockedStage.lifecycleReadiness.blockingReasons = [
  LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCK_CODE,
];

const historical = buildLafeaEngineeringOverview(blockedStage, registry4);
assert.equal(historical.mesh.state, 'CURRENT_BLOCK');
assert.equal(historical.mesh.qualification, 'PASS');
assert.equal(historical.execution.status, 'QUALIFIED_NOT_CURRENT');
assert.equal(historical.execution.authorized, false);
assert.equal(historical.execution.accepted, false);
assert.equal(historical.execution.loadCaseCount, 1);
assert.deepEqual(historical.execution.metrics, historicalMetrics);
assert.deepEqual(blockedStage.execution.result, baseResult);
assert.equal(blockedStage.execution.status, 'QUALIFIED');

// Legacy/non-governed presentation remains backward compatible. The existing
// Grade/LAFEA.3-style overview fixture has no governed route or readiness layer.
const legacyStage = {
  stageId: 'LAFEA.3',
  document: {
    modelIdentity: 'TECH12H-LEGACY',
    formulation: 'PLANE_STRESS',
    units: { length: 'mm', stress: 'MPa' },
    materials: [{ materialId: 'MAT' }],
    nodes: [{ nodeId: 'N1' }, { nodeId: 'N2' }],
    elements: [{ elementId: 'E1', elementType: 'T6' }],
    constraints: [],
    loadCases: [{ loadCaseId: 'LC1' }],
    qualificationProfile: { identity: 'B01_PROFILE' },
  },
  analysisMeshCustodyProjection: { state: 'CURRENT' },
  retainedAnalysisMeshEvidenceV2: governedStage.retainedAnalysisMeshEvidenceV2,
  execution: { status: 'QUALIFIED', result: structuredClone(baseResult) },
};
const registry3 = {
  stageId: 'LAFEA.3',
  enginePackage: 'local-continuum',
  authority: 'T3_T6_Q8_LINEAR_CONTINUUM',
  engineState: 'QUALIFIED_ROUTE_REGISTERED',
  presenterRole: 'CONTINUUM_RESULT_EVIDENCE',
};
const legacy = buildLafeaEngineeringOverview(legacyStage, registry3);
assert.equal(legacy.execution.status, 'QUALIFIED');
assert.equal(legacy.execution.accepted, true);

const source = fs.readFileSync(
  path.join(repoRoot, 'src/workspace/lafea-engineering-overview.js'),
  'utf8',
);
for (const token of [
  'const governedRoute = stage.domainFirstProfileActive === true',
  "stage.lifecycleReadiness?.calculationState === 'CALCULATION_ACCEPTED_BY_STAGE_CONTRACT'",
  'stage.lifecycleReadiness?.resultReady === true',
  "? 'QUALIFIED_NOT_CURRENT'",
  'metrics: continuumMetrics(result, source?.units)',
]) assert.ok(source.includes(token), token);
assert.ok(!source.includes('LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD'));
assert.ok(!source.includes('evaluateLafea4ParentNormalProductionGate'));

console.log(JSON.stringify({
  check: 'lafea-tech12h-overview-result-currentness',
  status: 'PASS',
  currentTrustRoot: 'NULL',
  currentGovernedResult: {
    status: current.execution.status,
    accepted: current.execution.accepted,
  },
  historicalAfterFutureGateBlock: {
    meshState: historical.mesh.state,
    underlyingMeshQualification: historical.mesh.qualification,
    resultStatus: historical.execution.status,
    accepted: historical.execution.accepted,
    historicalMetricsRetained: true,
    retainedResultMutated: false,
  },
  legacyCompatibility: {
    status: legacy.execution.status,
    accepted: legacy.execution.accepted,
  },
  productionBindingAuthorized: false,
  releaseQualified: false,
}, null, 2));
