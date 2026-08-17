#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  LAFEA4_QUALIFIED_MESH_QUALITY_POLICY,
  qualifiedMeshQualityPolicyForStage,
} from '../src/core/lafea-profile-contract/index.js';
import {
  LAFEA_MESH_UI_PHASES,
  lafeaMeshUiPhase,
} from '../src/workspace/lafea-discretization-view-model.js';

const shellPolicy = qualifiedMeshQualityPolicyForStage('LAFEA.4');
assert.equal(shellPolicy, LAFEA4_QUALIFIED_MESH_QUALITY_POLICY);
assert.equal(shellPolicy.policyId, 'LAFEA4_SHELL_MESH_QUALITY_POLICY_V1');
assert.equal(shellPolicy.formulation, 'CST_DKT_TRI3_THIN_SHELL_V1');
assert.equal(shellPolicy.fields.aspectRatioWarn, 5.0);
assert.equal(shellPolicy.fields.aspectRatioBlock, 10.0);
assert.equal(shellPolicy.fields.scaledJacobianWarn, 0.5);
assert.equal(shellPolicy.fields.scaledJacobianBlock, 0.2);
assert.equal(shellPolicy.fields.adjacentSizeRatioMax, 1.5);
assert.equal(shellPolicy.fields.adaptiveLevelsMinimum, 3);
assert.equal(qualifiedMeshQualityPolicyForStage('LAFEA.1'), null);
assert.equal(qualifiedMeshQualityPolicyForStage('LAFEA.6'), null);

const phase = (custodyState, generation, applicable = true) => lafeaMeshUiPhase({
  applicable,
  custodyState,
  generation,
});
const base = {
  producerQualified: true,
  parentReady: true,
  meshProfileBound: false,
  available: false,
  plan: null,
};

assert.equal(phase('NOT_APPLICABLE', base, false), 'NOT_APPLICABLE');
assert.equal(phase('ABSENT', { ...base, producerQualified: false }), 'PRODUCER_UNAVAILABLE');
assert.equal(phase('ABSENT', { ...base, parentReady: false }), 'PARENT_REQUIRED');
assert.equal(phase('ABSENT', base), 'PROFILE_REQUIRED');
assert.equal(phase('ABSENT', { ...base, meshProfileBound: true, available: true }), 'READY_TO_PLAN');
assert.equal(phase('ABSENT', {
  ...base,
  meshProfileBound: true,
  available: true,
  plan: { resourceDisposition: 'PASS' },
}), 'PLAN_AVAILABLE');
assert.equal(phase('ABSENT', {
  ...base,
  meshProfileBound: true,
  available: true,
  plan: { resourceDisposition: 'BLOCK' },
}), 'PLAN_BLOCKED');
assert.equal(phase('CURRENT_PASS', base), 'MESH_CURRENT_PASS');
assert.equal(phase('CURRENT_WARNING', base), 'MESH_CURRENT_WARNING');
assert.equal(phase('CURRENT_BLOCK', base), 'MESH_CURRENT_BLOCK');
assert.equal(phase('STALE', base), 'MESH_STALE');
assert.equal(phase('INVALID', base), 'MESH_INVALID');
assert.ok(LAFEA_MESH_UI_PHASES.includes('PROFILE_REQUIRED'));
assert.ok(LAFEA_MESH_UI_PHASES.includes('PLAN_AVAILABLE'));

const generationPanel = read('../src/workspace/lafea-discretization-generation-panel.js');
const workbenchContent = read('../src/workspace/lafea-workbench-content.js');

assert.match(generationPanel, /Bind mesh profile/u);
assert.match(generationPanel, /qualifiedQualityPolicy/u);
assert.match(generationPanel, /LAFEA4_SHELL_MESH_QUALITY_POLICY_V1|stage-qualified/u);
assert.doesNotMatch(
  generationPanel,
  /handlers\.onBindMeshProfile\?\.\(profileEnvelope\);\s*handlers\.onGenerateMesh/usu,
  'Binding a profile must never auto-generate a mesh from the presentation layer.',
);
assert.doesNotMatch(workbenchContent, /QUICK_MESH_TARGET_LENGTH|quickMeshProfile|preferredQuickMeshFamily/u);
assert.doesNotMatch(workbenchContent, /defaultProfileFields|semanticHash/u);
assert.match(workbenchContent, /does not bind a profile or generate a mesh/u);
assert.match(workbenchContent, /navigateTo\(shell, 'discretization'\)/u);

console.log(JSON.stringify({
  check: 'lafea-ui1-state-orchestration',
  status: 'PASS',
  policyAuthority: shellPolicy.policyId,
  profileBindingSeparatedFromGeneration: true,
  quickMeshPresentationSideEffectRemoved: true,
  explicitMeshUiPhases: LAFEA_MESH_UI_PHASES.length,
}, null, 2));

function read(relative) {
  return fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
}
