#!/usr/bin/env node
import assert from 'node:assert/strict';

import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { createLafeaMockDocument } from '../src/workspace/advanced-mock-data.js';
import { normalizeLafeaStageDocument } from '../src/workspace/lafea-workbench-model.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { createLafeaSimulatedShellMidsurfaceEvidence } from '../src/workspace/lafea-simulated-shell-midsurface-provider.js';
import { LAFEA_SHELL_ELEMENT } from '../src/workspace/lafea-shell-mesh-producer.js';
import { createLafeaWorkbenchOrchestratorStore } from '../src/workspace/lafea-workbench-orchestrator-store.js';
import {
  previewLafea4ShellProductRefinement,
} from '../src/workspace/lafea4-shell-product-refinement-adapter.js';
import {
  evaluateLafea4ShellProductRefinementAcceptance,
  requireLafea4ShellProductRefinementCandidatePass,
  validateLafea4ShellProductRefinementAcceptance,
} from '../src/workspace/lafea4-shell-product-refinement-acceptance.js';
import {
  LAFEA4_SHELL_PRODUCT_REFINEMENT_PENDING_CODE,
} from '../src/workspace/lafea4-shell-product-refinement-contract.js';

const stageId = 'LAFEA.4';
const document = normalizeLafeaStageDocument(stageId, createLafeaMockDocument(stageId));
const sourceAuthority = issueLafeaSourceAuthority(stageId, document, 'TECH13C-ATOMIC-GATE');
const midsurface = createLafeaSimulatedShellMidsurfaceEvidence(
  stageId, sourceAuthority.sourceHash, document,
);
const profile = canonicalProfile(PROFILE_KINDS.MESH, {
  schema: 'lafea-mesh-profile/v1',
  profileIdentity: 'TECH13C_SAMPLE_CURVED_TRI3',
  sourceRevision: 'TECH13C-V1',
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
  initialSourceHash: sourceAuthority.sourceHash,
});
assert.equal(workbench.registerShellMidsurfaceEvidence(midsurface, stageId)?.changed, true);
assert.equal(workbench.bindAnalysisMeshProfile(profile, stageId)?.changed, true);
const generated = workbench.generateAnalysisMesh({}, stageId);
assert.equal(generated?.evidence.qualification, 'PASS');
const parent = workbench.selectRetainedAnalysisMeshEvidenceV2(stageId);
assert.ok(parent);
const parentArtifactHash = parent.artifactHash;
const target = parent.mesh.elements[Math.floor(parent.mesh.elements.length / 2)];
const request = {
  commandId: 'TECH13C-SAMPLE-REFINE',
  targetType: 'ELEMENT',
  targetIds: [target.elementId],
  targetElementLength: 7.5,
  lengthUnit: midsurface.geometry.lengthUnit,
  reason: 'TECH13C atomic product-candidate qualification fixture',
};
let stage = workbench.getState().stages[stageId];
const adapter = previewLafea4ShellProductRefinement({
  stage,
  parentEvidence: parent,
  midsurfaceEvidence: midsurface,
  meshProfile: profile,
  request,
});
const acceptance = evaluateLafea4ShellProductRefinementAcceptance({
  stage,
  parentEvidence: parent,
  midsurfaceEvidence: midsurface,
  meshProfile: profile,
  adapterResult: adapter,
});
validateLafea4ShellProductRefinementAcceptance(acceptance);
requireLafea4ShellProductRefinementCandidatePass(acceptance);
assert.equal(acceptance.qualification, 'PASS');
assert.equal(acceptance.candidateRetentionEligible, true);
assert.equal(acceptance.productRetentionAuthorized, false);
assert.equal(acceptance.uiBindingAuthorized, false);
assert.equal(acceptance.releaseQualified, false);
assert.deepEqual(acceptance.blockingReasons, []);
assert.ok(acceptance.quality.aspectRatio.value < 10);
assert.ok(acceptance.quality.scaledJacobian.value > 0.2);
assert.ok(acceptance.quality.minimumAngleDegrees.value > 11.536959032815489 - 1e-12);
assert.ok(acceptance.quality.adjacentSizeRatio.value <= 1.5 + 64 * Number.EPSILON);
assert.equal(acceptance.quality.shellOrientationTopology.status, 'OK');
assert.equal(acceptance.parentNormal.qualification, 'PASS');
assert.equal(acceptance.parentNormal.blockedElementCount, 0);
assert.ok(acceptance.parentNormal.minimumParentDirectedJacobian
  > acceptance.parentNormal.roundoffEnvelope);

// Product path is still dormant. The real workbench may generate and gate the
// pure candidate, but it must retain the exact parent and return the explicit
// pending TECH-13E diagnostic rather than publish the child.
const rejected = workbench.refineAnalysisMesh(request, stageId);
assert.equal(rejected, null);
assert.equal(workbench.getState().diagnostics?.[0]?.code,
  LAFEA4_SHELL_PRODUCT_REFINEMENT_PENDING_CODE);
assert.equal(workbench.selectRetainedAnalysisMeshEvidenceV2(stageId)?.artifactHash,
  parentArtifactHash);
assert.equal(workbench.selectRetainedAnalysisMeshEvidenceV2(stageId)?.meshHash,
  parent.meshHash);

// A live-authority change blocks the candidate even though the numerical child
// is unchanged; retained parent evidence is still not mutated.
const staleAcceptance = evaluateLafea4ShellProductRefinementAcceptance({
  stage: { ...stage, lifecycleBinding: { ...stage.lifecycleBinding, status: 'STALE_DOCUMENT_REVISION' } },
  parentEvidence: parent,
  midsurfaceEvidence: midsurface,
  meshProfile: profile,
  adapterResult: adapter,
});
assert.equal(staleAcceptance.qualification, 'BLOCK');
assert.equal(staleAcceptance.candidateRetentionEligible, false);
assert.ok(staleAcceptance.blockingReasons.includes('SOURCE_BINDING_NOT_CURRENT'));
assert.throws(() => requireLafea4ShellProductRefinementCandidatePass(staleAcceptance),
  /LAFEA4_SHELL_PRODUCT_REFINEMENT_CANDIDATE_BLOCKED/u);
assert.equal(workbench.selectRetainedAnalysisMeshEvidenceV2(stageId)?.artifactHash,
  parentArtifactHash);

const tampered = structuredClone(acceptance);
tampered.quality.adjacentSizeRatio.value = 99;
assert.throws(() => validateLafea4ShellProductRefinementAcceptance(tampered),
  /LAFEA4_SHELL_PRODUCT_REFINEMENT_ACCEPTANCE_TAMPERED/u);

console.log(JSON.stringify({
  check: 'lafea-tech13c-product-refinement-acceptance',
  status: 'PASS',
  parent: {
    artifactHash: parentArtifactHash,
    meshHash: parent.meshHash,
    nodeCount: parent.mesh.nodes.length,
    elementCount: parent.mesh.elements.length,
  },
  candidate: {
    artifactHash: adapter.productEvidence.artifactHash,
    meshHash: adapter.productEvidence.meshHash,
    nodeCount: adapter.productEvidence.mesh.nodes.length,
    elementCount: adapter.productEvidence.mesh.elements.length,
    retentionEligible: acceptance.candidateRetentionEligible,
    retentionAuthorized: acceptance.productRetentionAuthorized,
  },
  measuredQuality: acceptance.quality,
  parentNormal: acceptance.parentNormal,
  atomicCustody: {
    workbenchRefinementResult: null,
    diagnostic: LAFEA4_SHELL_PRODUCT_REFINEMENT_PENDING_CODE,
    retainedParentArtifactHashAfterAttempt:
      workbench.selectRetainedAnalysisMeshEvidenceV2(stageId)?.artifactHash,
    parentUnchanged: true,
  },
  staleAuthorityBlocked: true,
  releaseQualified: false,
}, null, 2));

workbench.destroy();
