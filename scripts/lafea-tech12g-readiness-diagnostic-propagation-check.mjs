#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LAFEA_DOMAIN_FIRST_MESH_CUSTODY_SCHEMA,
  bindLafeaShellMeshCustodyToSolverModel,
} from '../src/workspace/lafea-domain-first-mesh-custody.js';
import {
  LAFEA4_PARENT_NORMAL_REQUIRED_ENGINEERING_STEP_IDS,
} from '../src/workspace/lafea4-parent-normal-activation-record.js';
import {
  LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCK_CODE,
} from '../src/workspace/lafea4-parent-normal-production-gate.js';
import {
  LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD,
} from '../src/workspace/lafea4-parent-normal-production-activation.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const definition = readJson(
  'validation/lafea4-refinement/parent-normal-readiness-propagation-v1.json',
);
const activationDefinition = readJson(
  'validation/lafea4-refinement/parent-normal-activation-record-v1.json',
);
const plan = readJson('validation/lafea-independent-qualification/plan-v1.json');

assert.equal(definition.stageId, 'LAFEA.4');
assert.equal(LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD, null);
assert.equal(definition.currentNullTrustRoot.hardGateActivated, false);

const meshHash = `sha256:${'1'.repeat(64)}`;
const profileHash = `sha256:${'2'.repeat(64)}`;
const solverModelHash = `sha256:${'3'.repeat(64)}`;
const solverBindingHash = `sha256:${'4'.repeat(64)}`;
const baseCustody = Object.freeze({
  schema: LAFEA_DOMAIN_FIRST_MESH_CUSTODY_SCHEMA,
  stageId: 'LAFEA.4',
  state: 'CURRENT_PASS',
  usableForAdvance: true,
  usableForAuthorization: true,
  usableForRun: false,
  canView: true,
  canFocusFindings: false,
  advancePolicy: 'ALLOW',
  authorizationPolicy: 'ALLOW',
  runPolicy: 'DENY',
  runBlockingReasons: ['SHELL_RETAINED_MESH_NOT_BOUND_TO_SOLVER_MODEL'],
  staleReasons: [],
  invalidReasons: [],
  absenceReasons: [],
  meshHash,
  meshProfileHash: profileHash,
  analysisDomainHash: `sha256:${'5'.repeat(64)}`,
  analysisGeometryHash: `sha256:${'6'.repeat(64)}`,
  producerRef: 'TECH12G-QUALIFICATION-FIXTURE',
  gateResults: [],
  shellOrientationTopology: { qualification: 'PASS' },
  warningElementIds: [],
  blockingElementIds: [],
  solverModelHash: null,
  solverModelBindingHash: null,
});
const originalKeys = Object.keys(baseCustody).sort();

// Current/inactive or future active PASS: normal solver binding remains the
// established CURRENT_PASS shell custody path and preserves projection shape.
const normalBinding = Object.freeze({
  state: 'CURRENT_PASS',
  usableForRun: true,
  reasons: [],
  meshHash,
  solverModelHash,
  solverModelBindingHash: solverBindingHash,
});
const allowed = bindLafeaShellMeshCustodyToSolverModel(baseCustody, normalBinding);
assert.deepEqual(Object.keys(allowed).sort(), originalKeys);
assert.equal(allowed.state, 'CURRENT_PASS');
assert.equal(allowed.usableForAdvance, true);
assert.equal(allowed.usableForAuthorization, true);
assert.equal(allowed.usableForRun, true);
assert.equal(allowed.runPolicy, 'ALLOW');
assert.equal(allowed.meshHash, meshHash);
assert.equal(allowed.meshProfileHash, profileHash);
assert.equal(allowed.solverModelHash, solverModelHash);
assert.equal(allowed.solverModelBindingHash, solverBindingHash);

// An unrelated solver-model compilation failure must continue to deny only Run;
// it must not be misrepresented as a parent-normal retained-mesh block.
const genericFailure = bindLafeaShellMeshCustodyToSolverModel(baseCustody, {
  state: 'BLOCKED',
  usableForRun: false,
  reasons: ['LAFEA4_SHELL_SOLVER_THICKNESS_REGION_MAPPING_REQUIRED'],
  meshHash,
  solverModelHash: null,
  solverModelBindingHash: null,
});
assert.deepEqual(Object.keys(genericFailure).sort(), originalKeys);
assert.equal(genericFailure.state, definition.genericSolverBindingFailure.custodyStateMustRemain);
assert.equal(genericFailure.usableForAdvance, true);
assert.equal(genericFailure.usableForAuthorization, true);
assert.equal(genericFailure.usableForRun, definition.genericSolverBindingFailure.usableForRun);
assert.deepEqual(genericFailure.runBlockingReasons, [
  'LAFEA4_SHELL_SOLVER_THICKNESS_REGION_MAPPING_REQUIRED',
]);

// Future trusted active parent-normal BLOCK: qualification of the pure derived
// state mapping only. The product activation trust root remains null.
const parentNormalBlocked = bindLafeaShellMeshCustodyToSolverModel(baseCustody, {
  state: 'BLOCKED',
  usableForRun: false,
  reasons: [LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCK_CODE],
  meshHash,
  solverModelHash: null,
  solverModelBindingHash: null,
});
assert.deepEqual(Object.keys(parentNormalBlocked).sort(), originalKeys);
assert.equal(parentNormalBlocked.state, definition.futureTrustedActiveBlock.derivedCustodyState);
assert.equal(parentNormalBlocked.usableForAdvance, definition.futureTrustedActiveBlock.usableForAdvance);
assert.equal(
  parentNormalBlocked.usableForAuthorization,
  definition.futureTrustedActiveBlock.usableForAuthorization,
);
assert.equal(parentNormalBlocked.usableForRun, definition.futureTrustedActiveBlock.usableForRun);
assert.equal(parentNormalBlocked.advancePolicy, definition.futureTrustedActiveBlock.advancePolicy);
assert.equal(
  parentNormalBlocked.authorizationPolicy,
  definition.futureTrustedActiveBlock.authorizationPolicy,
);
assert.equal(parentNormalBlocked.runPolicy, definition.futureTrustedActiveBlock.runPolicy);
assert.deepEqual(parentNormalBlocked.runBlockingReasons, [
  LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCK_CODE,
]);
assert.equal(parentNormalBlocked.meshHash, meshHash);
assert.equal(parentNormalBlocked.meshProfileHash, profileHash);
assert.deepEqual(parentNormalBlocked.gateResults, baseCustody.gateResults);
assert.deepEqual(parentNormalBlocked.blockingElementIds, baseCustody.blockingElementIds);
assert.equal(parentNormalBlocked.solverModelHash, null);
assert.equal(parentNormalBlocked.solverModelBindingHash, null);

// Source-level propagation audit. Readiness defines shell mesh qualification by
// CURRENT_PASS custody, so derived CURRENT_BLOCK necessarily maps meshQualified=false.
const readinessSource = readText('src/workspace/lafea-workbench-readiness.js');
assert.match(
  readinessSource,
  /const shellMeshCurrent = shellMidsurface && custody\?\.state === 'CURRENT_PASS';/u,
);
assert.match(readinessSource, /custody\?\.runBlockingReasons/u);
assert.match(readinessSource, /solverProjection\?\.reasons/u);

// Orchestration must block discretization/authorization/execution progression
// whenever custody is no longer CURRENT_PASS / authorized / runnable.
const orchestrationSource = readText('src/workspace/lafea-workbench-orchestration-projection.js');
assert.match(orchestrationSource, /if \(custody\.state === 'CURRENT_PASS'\)/u);
assert.match(
  orchestrationSource,
  /adapter\.discretization\.applicable && custody\?\.usableForAuthorization !== true/u,
);
assert.match(orchestrationSource, /custody\?\.runBlockingReasons/u);
assert.match(orchestrationSource, /custody\?\.usableForRun === true/u);
assert.match(orchestrationSource, /runnable \? \['RUN_SOLVE'\] : \[\]/u);

const custodySource = readText('src/workspace/lafea-domain-first-mesh-custody.js');
assert.match(custodySource, /LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCK_CODE/u);
assert.match(custodySource, /state: 'CURRENT_BLOCK'/u);
assert.match(custodySource, /usableForAdvance: false/u);
assert.match(custodySource, /usableForAuthorization: false/u);
assert.ok(!custodySource.includes('parentNormalProductionGateBlocked'));
assert.ok(!custodySource.includes('parentNormalProductionGateDiagnostic'));
assert.ok(!custodySource.includes('blockingReasons:'));

// TECH-12G is a mandatory promotion prerequisite, but it does not activate
// production authority by itself.
const requiredId = 'TECH12G_ACTIVE_GATE_READINESS_PROPAGATION';
assert.ok(LAFEA4_PARENT_NORMAL_REQUIRED_ENGINEERING_STEP_IDS.includes(requiredId));
assert.ok(activationDefinition.requiredEngineeringStepIds.includes(requiredId));
assert.equal(activationDefinition.authorizationRequirements.tech12gReadinessPropagationMustPass, true);
const planRows = plan.steps.filter((row) => row.id === requiredId);
assert.equal(planRows.length, 1);
assert.equal(planRows[0].classification, 'ENGINEERING');
assert.equal(planRows[0].required, true);
assert.deepEqual(
  planRows[0].args,
  ['scripts/lafea-tech12g-readiness-diagnostic-propagation-check.mjs'],
);
const planIds = plan.steps.map((row) => row.id);
assert.ok(planIds.indexOf('TECH12F_TRUST_ROOT_PROMOTION_PROTOCOL') < planIds.indexOf(requiredId));
assert.ok(planIds.indexOf(requiredId) < planIds.indexOf('TECH7_GRADED_REFINEMENT_EXECUTOR'));

const activationSource = readText('src/workspace/lafea4-parent-normal-production-activation.js');
assert.match(
  activationSource,
  /LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD\s*=\s*null\s*;/u,
);

console.log(JSON.stringify({
  check: 'lafea-tech12g-readiness-diagnostic-propagation',
  status: 'PASS',
  currentTrustRoot: 'NULL',
  custodySchemaShapePreserved: true,
  normalBinding: {
    custodyState: allowed.state,
    usableForRun: allowed.usableForRun,
  },
  genericSolverFailure: {
    custodyState: genericFailure.state,
    usableForRun: genericFailure.usableForRun,
    runBlockingReasons: genericFailure.runBlockingReasons,
  },
  futureTrustedParentNormalBlock: {
    underlyingMeshHashPreserved: parentNormalBlocked.meshHash === baseCustody.meshHash,
    derivedCustodyState: parentNormalBlocked.state,
    usableForAdvance: parentNormalBlocked.usableForAdvance,
    usableForAuthorization: parentNormalBlocked.usableForAuthorization,
    usableForRun: parentNormalBlocked.usableForRun,
    diagnostic: parentNormalBlocked.runBlockingReasons[0],
  },
  productionBindingAuthorized: false,
  releaseQualified: false,
}, null, 2));

function readJson(relative) {
  return JSON.parse(readText(relative));
}
function readText(relative) {
  return fs.readFileSync(path.join(repoRoot, relative), 'utf8');
}
