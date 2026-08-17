#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LAFEA4_PARENT_NORMAL_REQUIRED_ENGINEERING_STEP_IDS,
} from '../src/workspace/lafea4-parent-normal-activation-record.js';
import {
  LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_POLICY,
  LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD,
} from '../src/workspace/lafea4-parent-normal-production-activation.js';
import {
  LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCK_CODE,
  LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_INACTIVE_CODE,
  currentLafea4ParentNormalProductionAuthority,
  qualificationEvaluateLafea4ParentNormalProductionGateDecisionKernel,
  validateLafea4ParentNormalProductionAuthority,
} from '../src/workspace/lafea4-parent-normal-production-gate.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const policy = readJson('validation/lafea4-refinement/parent-normal-dormant-production-gate-v1.json');
const activationDefinition = readJson('validation/lafea4-refinement/parent-normal-activation-record-v1.json');
const independentPlan = readJson('validation/lafea-independent-qualification/plan-v1.json');

assert.equal(LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD, null);
assert.equal(
  LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_POLICY,
  'CODE_OWNED_TRUST_ROOT_ONLY_AFTER_EXACT_HEAD_TECH8_PASS_V1',
);
const authority = validateLafea4ParentNormalProductionAuthority(
  currentLafea4ParentNormalProductionAuthority(),
);
assert.equal(authority.status, 'INACTIVE_PENDING_TRUSTED_TECH12D_RECORD');
assert.equal(authority.activationRecordHash, null);
assert.equal(authority.activationExpectedHead, null);
assert.equal(authority.activationEvidenceDigest, null);
assert.equal(authority.hardGateActivated, false);
assert.equal(authority.productionBindingAuthorized, false);

const inactivePass = qualificationEvaluateLafea4ParentNormalProductionGateDecisionKernel({
  candidateQualification: 'PASS',
  hardGateActivated: false,
});
const inactiveBlock = qualificationEvaluateLafea4ParentNormalProductionGateDecisionKernel({
  candidateQualification: 'BLOCK',
  hardGateActivated: false,
});
for (const row of [inactivePass, inactiveBlock]) {
  assert.equal(row.gateDisposition, 'NOT_ENFORCED');
  assert.equal(row.retainedMeshAccepted, true);
  assert.equal(row.solverExecutionAuthorized, true);
  assert.equal(row.diagnosticCode, LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_INACTIVE_CODE);
}

const activePass = qualificationEvaluateLafea4ParentNormalProductionGateDecisionKernel({
  candidateQualification: 'PASS',
  hardGateActivated: true,
});
assert.deepEqual(activePass, {
  gateDisposition: 'ALLOW',
  retainedMeshAccepted: true,
  solverExecutionAuthorized: true,
  diagnosticCode: null,
});
const activeBlock = qualificationEvaluateLafea4ParentNormalProductionGateDecisionKernel({
  candidateQualification: 'BLOCK',
  hardGateActivated: true,
});
assert.deepEqual(activeBlock, {
  gateDisposition: 'BLOCK',
  retainedMeshAccepted: false,
  solverExecutionAuthorized: false,
  diagnosticCode: LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCK_CODE,
});
assert.throws(
  () => qualificationEvaluateLafea4ParentNormalProductionGateDecisionKernel({
    candidateQualification: 'WARNING', hardGateActivated: true,
  }),
  (error) => error?.code === 'LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_DECISION_INPUT_INVALID',
);

assert.equal(policy.stageId, 'LAFEA.4');
assert.equal(policy.activationTrustRoot.currentRecord, null);
assert.equal(policy.activationTrustRoot.currentHardGateActivated, false);
assert.equal(policy.activationTrustRoot.callerSuppliedActivationAuthorityAccepted, false);
assert.equal(policy.activationTrustRoot.policy, LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_POLICY);
assert.equal(policy.inactiveDecision.candidatePass, 'NOT_ENFORCED');
assert.equal(policy.inactiveDecision.candidateBlock, 'NOT_ENFORCED');
assert.equal(policy.futureActiveDecision.candidatePass, 'ALLOW');
assert.equal(policy.futureActiveDecision.candidateBlock, 'BLOCK');
assert.equal(policy.currentProductEffect.hardGateActivated, false);
assert.equal(policy.currentProductEffect.productionBindingAuthorized, false);
assert.equal(policy.currentProductEffect.releaseQualified, false);

const requiredId = 'TECH12E_DORMANT_PRODUCTION_GATE';
assert.ok(LAFEA4_PARENT_NORMAL_REQUIRED_ENGINEERING_STEP_IDS.includes(requiredId));
assert.ok(activationDefinition.requiredEngineeringStepIds.includes(requiredId));
const planRows = independentPlan.steps.filter((row) => row.id === requiredId);
assert.equal(planRows.length, 1);
assert.equal(planRows[0].classification, 'ENGINEERING');
assert.equal(planRows[0].required, true);
assert.deepEqual(planRows[0].args, ['scripts/lafea-tech12e-dormant-production-gate-check.mjs']);
const planIds = independentPlan.steps.map((row) => row.id);
assert.ok(planIds.indexOf('TECH12D_ACTIVATION_RECORD_POLICY') < planIds.indexOf(requiredId));
assert.ok(planIds.indexOf(requiredId) < planIds.indexOf('TECH7_GRADED_REFINEMENT_EXECUTOR'));

const activationSource = readText('src/workspace/lafea4-parent-normal-production-activation.js');
assert.match(
  activationSource,
  /LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD\s*=\s*null\s*;/u,
);
const gateSource = readText('src/workspace/lafea4-parent-normal-production-gate.js');
assert.match(gateSource, /currentLafea4ParentNormalProductionAuthority\(\)/u);
assert.match(gateSource, /const candidate = LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD;/u);
assert.match(gateSource, /evaluateLafea4ParentNormalProductionGate\(\{ companion \}\)/u);
assert.ok(!gateSource.includes('callerActivationRecord'));
assert.ok(!gateSource.includes('callerAuthority'));

const meshActions = readText('src/workspace/lafea-workbench-mesh-generation-actions.js');
assert.match(meshActions, /evaluateLafea4ParentNormalProductionGate/u);
assert.match(meshActions, /selectRetainedAnalysisMeshParentNormalProductionGate/u);
assert.match(meshActions, /exportRetainedAnalysisMeshParentNormalProductionGate/u);
assert.match(meshActions, /requireProductionGateAllowsRetention\(parentNormalProductionGate\)/u);
const recovery = sliceBetween(
  meshActions,
  'function recoverAnalysisMeshEvidenceV2(',
  'function selectRetainedAnalysisMeshParentNormalCompanion(',
);
const preGateIndex = recovery.indexOf('requireProductionGateAllowsRetention(prevalidatedProductionGate);');
const profileIndex = recovery.indexOf('const currentProfile = meshGeneration.selectMeshProfile(stageId);');
const recoverIndex = recovery.indexOf('const result = meshGeneration.recoverEvidence(validated, stageId);');
assert.ok(preGateIndex >= 0 && profileIndex > preGateIndex && recoverIndex > profileIndex);
assert.match(recovery, /LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_RECOVERY_REPLAY_MISMATCH/u);
assert.match(meshActions, /rollbackCompanionCustody\(stageId, currentMidsurface\)/u);

const solverCustody = readText('src/workspace/lafea4-shell-solver-companion-custody.js');
assert.match(solverCustody, /evaluateLafea4ParentNormalProductionGate/u);
assert.match(solverCustody, /productionGate\.solverExecutionAuthorized !== true/u);
assert.match(solverCustody, /parentNormalProductionGateHash/u);
assert.match(solverCustody, /productionGate,/u);

const solverCompiler = readText('src/workspace/lafea-shell-solver-model.js');
assert.match(solverCompiler, /createLafea4ShellSolverCompanionCustody/u);
assert.ok(!solverCompiler.includes('lafea4-parent-normal-production-activation'));
const runActions = readText('src/workspace/lafea-workbench-shell-run-actions.js');
assert.match(runActions, /compileLafeaShellSolverModel/u);
assert.ok(!runActions.includes('lafea4-parent-normal-production-activation'));

const api = readText('src/workspace/lafea-workbench-orchestrator-api.js');
assert.match(api, /selectRetainedAnalysisMeshParentNormalProductionGate/u);
assert.match(api, /exportRetainedAnalysisMeshParentNormalProductionGate/u);

console.log(JSON.stringify({
  check: 'lafea-tech12e-dormant-production-gate',
  status: 'PASS',
  trustRootStatus: authority.status,
  hardGateActivated: authority.hardGateActivated,
  productionBindingAuthorized: authority.productionBindingAuthorized,
  inactiveCandidatePass: inactivePass,
  inactiveCandidateBlock: inactiveBlock,
  qualifiedFutureActivePass: activePass,
  qualifiedFutureActiveBlock: activeBlock,
  enforcement: {
    generatedMeshBeforePublication: true,
    recoveryBeforeProfileMutation: true,
    recoveryReplay: true,
    solverCompilationRecheck: true,
  },
  releaseQualified: false,
}, null, 2));

function readJson(relative) {
  return JSON.parse(readText(relative));
}
function readText(relative) {
  return fs.readFileSync(path.join(repoRoot, relative), 'utf8');
}
function sliceBetween(text, start, end) {
  const startIndex = text.indexOf(start);
  const endIndex = text.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `Unable to slice ${start} -> ${end}`);
  return text.slice(startIndex, endIndex);
}
