#!/usr/bin/env node
import assert from 'node:assert/strict';

import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { createLafeaMockDocument } from '../src/workspace/advanced-mock-data.js';
import { generationSection } from '../src/workspace/lafea-discretization-generation-panel.js';
import { buildLafeaDiscretizationViewModel } from '../src/workspace/lafea-discretization-view-model.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { createLafeaSimulatedShellMidsurfaceEvidence } from '../src/workspace/lafea-simulated-shell-midsurface-provider.js';
import { LAFEA_SHELL_ELEMENT } from '../src/workspace/lafea-shell-mesh-producer.js';
import { normalizeLafeaStageDocument } from '../src/workspace/lafea-workbench-model.js';
import { createLafeaWorkbenchOrchestratorStore } from '../src/workspace/lafea-workbench-orchestrator-store.js';
import { LAFEA4_SHELL_PRODUCT_REFINEMENT_PENDING_CODE } from '../src/workspace/lafea4-shell-product-refinement-contract.js';
import { FakeDocument } from './lafea-u4g-fixtures.mjs';

const stageId = 'LAFEA.4';
const document = normalizeLafeaStageDocument(stageId, createLafeaMockDocument(stageId));
const authority = issueLafeaSourceAuthority(stageId, document, 'TECH13D-WORKBENCH-UI');
const midsurface = createLafeaSimulatedShellMidsurfaceEvidence(
  stageId, authority.sourceHash, document,
);
const profile = canonicalProfile(PROFILE_KINDS.MESH, {
  schema: 'lafea-mesh-profile/v1',
  profileIdentity: 'TECH13D_SAMPLE_CURVED_TRI3',
  sourceRevision: 'TECH13D-V1',
  semanticHash: undefined,
  fields: {
    continuumElement: 'T3',
    shellElement: LAFEA_SHELL_ELEMENT,
    globalTargetSize: 15,
    adjacentSizeRatioMax: 1.5,
    aspectRatioWarn: 5,
    aspectRatioBlock: 10,
    scaledJacobianWarn: 0.5,
    scaledJacobianBlock: 0.2,
    adaptiveLevels: 3,
  },
});
const workbench = createLafeaWorkbenchOrchestratorStore({
  initialStage: stageId,
  initialDocument: document,
  initialSourceHash: authority.sourceHash,
});
workbench.registerShellMidsurfaceEvidence(midsurface, stageId);
workbench.bindAnalysisMeshProfile(profile, stageId);
const generated = workbench.generateAnalysisMesh({}, stageId);
assert.equal(generated?.evidence.qualification, 'PASS');

let stage = workbench.getState().stages[stageId];
const vm = buildLafeaDiscretizationViewModel(stage);
assert.equal(vm.state, 'CURRENT_PASS');
assert.equal(vm.refinement.schema, 'lafea4-shell-product-refinement-ui-policy/v1');
assert.equal(vm.refinement.applicable, true);
assert.equal(vm.refinement.scopeEligible, true);
assert.equal(vm.refinement.productQualified, false);
assert.equal(vm.refinement.canRefine, false);
assert.equal(vm.refinement.reason, LAFEA4_SHELL_PRODUCT_REFINEMENT_PENDING_CODE);
assert.equal(vm.refinement.surfaceKind, 'CYLINDRICAL');
assert.equal(vm.refinement.elementFamily, LAFEA_SHELL_ELEMENT);
assert.deepEqual(vm.refinement.allowedTargetTypes, ['ELEMENT']);
assert.equal(vm.refinement.currentParent.artifactHash, generated.evidence.artifactHash);
assert.equal(vm.refinement.currentParent.meshHash, generated.evidence.meshHash);
assert.equal(vm.refinement.currentParent.nodeCount, generated.evidence.mesh.nodes.length);
assert.equal(vm.refinement.currentParent.elementCount, generated.evidence.mesh.elements.length);
assert.equal(vm.refinement.sizing.globalTargetElementLength, 15);
assert.equal(vm.refinement.sizing.adjacentSizeRatioMax, 1.5);
assert.equal(vm.refinement.qualityPolicy.aspectRatioBlock, 10);
assert.equal(vm.refinement.qualityPolicy.scaledJacobianBlock, 0.2);
assert.ok(Math.abs(vm.refinement.qualityPolicy.minimumAngleBlockDegrees
  - 11.536959032815489) < 1e-12);
assert.equal(vm.refinement.requiredAcceptance.parentNormalPass, true);
assert.equal(vm.refinement.requiredAcceptance.exactParentCustody, true);
assert.equal(vm.refinement.exactHeadQualificationRequired, true);
assert.equal(vm.refinement.uiBindingAuthorized, false);
assert.equal(vm.refinement.productRetentionAuthorized, false);
assert.equal(vm.refinement.releaseQualified, false);
assert.equal(vm.actions.manualRefinementEnabled, false);
assert.equal(vm.actions.canRefineMesh, false);
const mode = vm.configuration.modes.find((row) => row.mode === 'MANUAL_REFINEMENT');
assert.equal(mode?.enabled, false);
assert.equal(mode?.reason, LAFEA4_SHELL_PRODUCT_REFINEMENT_PENDING_CODE);

// Verify the engineer can actually see the quantitative pending qualification
// evidence. The visible submit remains present but disabled; there are no
// editable refinement target controls before TECH-13E promotion.
const fakeDocument = new FakeDocument();
const rendered = generationSection(fakeDocument, vm, {});
const refinement = rendered.querySelector('[data-role="lafea-retained-mesh-refinement"]');
assert.ok(refinement);
assert.equal(refinement.dataset.productScopeEligible, 'true');
assert.equal(refinement.dataset.productQualified, 'false');
const evidencePanel = refinement.querySelector('[data-role="lafea-product-refinement-qualification-evidence"]');
assert.ok(evidencePanel);
const visibleText = evidencePanel.textContent;
for (const expected of [
  'Product scope', 'Parent nodes / elements', 'Parent artifact hash', 'Parent mesh hash',
  'Global target', 'Adjacent size ratio max', 'Aspect ratio warning / block',
  'Scaled Jacobian warning / block', 'Minimum angle block', 'Parent-normal gate',
  'PENDING EXACT-HEAD TECH-13E',
]) assert.ok(visibleText.includes(expected), `missing visible TECH13D evidence: ${expected}`);
const submit = refinement.querySelector('[data-role="lafea-refinement-submit"]');
assert.ok(submit);
assert.equal(submit.disabled, true);
assert.equal(refinement.querySelector('[data-role="lafea-refinement-target-ids"]'), null);
assert.equal(refinement.querySelector('[data-role="lafea-refinement-target-length"]'), null);

// A stale parent must stop being scope-eligible without enabling the control.
stage = {
  ...stage,
  lifecycleBinding: { ...stage.lifecycleBinding, status: 'STALE_DOCUMENT_REVISION' },
};
const stale = buildLafeaDiscretizationViewModel(stage);
assert.equal(stale.refinement.scopeEligible, false);
assert.equal(stale.refinement.canRefine, false);
assert.equal(stale.actions.canRefineMesh, false);
assert.equal(stale.refinement.reason, 'LAFEA4_REFINEMENT_SOURCE_BINDING_NOT_CURRENT');

// LAFEA.5 remains outside TECH-13's product scope. No shell TRI3 capability is
// silently added to the globally qualified local-refinement registry.
const lafea5 = buildLafeaDiscretizationViewModel({
  ...workbench.getState().stages[stageId],
  stageId: 'LAFEA.5',
  analysisMeshCustodyProjection: {
    ...workbench.getState().stages[stageId].analysisMeshCustodyProjection,
    stageId: 'LAFEA.5',
  },
});
assert.equal(lafea5.refinement.applicable, false);
assert.equal(lafea5.refinement.scopeEligible, false);
assert.equal(lafea5.actions.canRefineMesh, false);

console.log(JSON.stringify({
  check: 'lafea-tech13d-product-refinement-workbench-ui',
  status: 'PASS',
  stageId,
  surfaceKind: vm.refinement.surfaceKind,
  scopeEligible: vm.refinement.scopeEligible,
  productQualified: vm.refinement.productQualified,
  canRefineMesh: vm.actions.canRefineMesh,
  disabledReason: mode.reason,
  parent: vm.refinement.currentParent,
  sizing: vm.refinement.sizing,
  qualityPolicy: vm.refinement.qualityPolicy,
  requiredAcceptance: vm.refinement.requiredAcceptance,
  visibleQualificationEvidence: true,
  visibleDisabledRefineControl: true,
  editableTargetControlsExposedBeforeQualification: false,
  staleScopeEligible: stale.refinement.scopeEligible,
  lafea5ProductRefinementApplicable: lafea5.refinement.applicable,
  uiBindingAuthorized: vm.refinement.uiBindingAuthorized,
  productRetentionAuthorized: vm.refinement.productRetentionAuthorized,
  releaseQualified: vm.refinement.releaseQualified,
}, null, 2));

workbench.destroy();
