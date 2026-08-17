#!/usr/bin/env node
import assert from 'node:assert/strict';

import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { createLafeaMockDocument } from '../src/workspace/advanced-mock-data.js';
import { normalizeLafeaStageDocument } from '../src/workspace/lafea-workbench-model.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { createLafeaSimulatedShellMidsurfaceEvidence } from '../src/workspace/lafea-simulated-shell-midsurface-provider.js';
import { LAFEA_SHELL_ELEMENT } from '../src/workspace/lafea-shell-mesh-producer.js';
import { createLafeaWorkbenchOrchestratorStore } from '../src/workspace/lafea-workbench-orchestrator-store.js';
import { createLafeaWorkbenchMeshGenerationState } from '../src/workspace/lafea-workbench-mesh-generation-state.js';
import { createLafeaMeshGenerationActions } from '../src/workspace/lafea-workbench-mesh-generation-actions.js';
import { buildLafea4ShellProductRefinementUiPolicy } from '../src/workspace/lafea4-shell-product-refinement-ui-policy.js';
import {
  LAFEA4_SHELL_PRODUCT_REFINEMENT_CAPABILITY,
  LAFEA4_SHELL_PRODUCT_REFINEMENT_QUALIFICATION,
} from '../src/workspace/lafea4-shell-product-refinement-adapter.js';
import {
  LAFEA4_SHELL_PRODUCT_REFINEMENT_EXACT_HEAD_QUALIFICATION_ID,
  LAFEA4_SHELL_PRODUCT_REFINEMENT_PROMOTION_RECORD,
  LAFEA4_SHELL_PRODUCT_REFINEMENT_PROMOTION_SCHEMA,
  createLafea4ShellProductRefinementPromotionRecord,
} from '../src/workspace/lafea4-shell-product-refinement-promotion.js';
import { LAFEA4_SHELL_PRODUCT_REFINEMENT_PENDING_CODE } from '../src/workspace/lafea4-shell-product-refinement-contract.js';

const stageId = 'LAFEA.4';
const document = normalizeLafeaStageDocument(stageId, createLafeaMockDocument(stageId));
const sourceAuthority = issueLafeaSourceAuthority(stageId, document, 'TECH13F-DORMANT-ACTIVATION');
const midsurface = createLafeaSimulatedShellMidsurfaceEvidence(
  stageId, sourceAuthority.sourceHash, document,
);
const profile = canonicalProfile(PROFILE_KINDS.MESH, {
  schema: 'lafea-mesh-profile/v1',
  profileIdentity: 'TECH13F_SAMPLE_CURVED_TRI3',
  sourceRevision: 'TECH13F-V1',
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

// Production path: real orchestrator, real null trust root, still dormant.
assert.equal(LAFEA4_SHELL_PRODUCT_REFINEMENT_PROMOTION_RECORD, null);
const workbench = createLafeaWorkbenchOrchestratorStore({
  initialStage: stageId,
  initialDocument: document,
  initialSourceHash: sourceAuthority.sourceHash,
});
assert.equal(workbench.registerShellMidsurfaceEvidence(midsurface, stageId)?.changed, true);
assert.equal(workbench.bindAnalysisMeshProfile(profile, stageId)?.changed, true);
assert.equal(workbench.generateAnalysisMesh({}, stageId)?.evidence.qualification, 'PASS');
const parent = workbench.selectRetainedAnalysisMeshEvidenceV2(stageId);
assert.ok(parent);
const stage = workbench.getState().stages[stageId];
const target = parent.mesh.elements[Math.floor(parent.mesh.elements.length / 2)];
const request = {
  commandId: 'TECH13F-SAMPLE-REFINE',
  targetType: 'ELEMENT',
  targetIds: [target.elementId],
  targetElementLength: 7.5,
  lengthUnit: midsurface.geometry.lengthUnit,
  reason: 'TECH13F dormant future-active product refinement fixture',
};
const dormantUi = buildLafea4ShellProductRefinementUiPolicy(stage);
assert.equal(dormantUi.scopeEligible, true);
assert.equal(dormantUi.productQualified, false);
assert.equal(dormantUi.canRefine, false);
assert.equal(dormantUi.reason, LAFEA4_SHELL_PRODUCT_REFINEMENT_PENDING_CODE);
const productionAttempt = workbench.refineAnalysisMesh(request, stageId);
assert.equal(productionAttempt, null);
assert.equal(workbench.getState().diagnostics?.[0]?.code,
  LAFEA4_SHELL_PRODUCT_REFINEMENT_PENDING_CODE);
assert.equal(workbench.selectRetainedAnalysisMeshEvidenceV2(stageId)?.artifactHash, parent.artifactHash);

const syntheticPromotion = createSyntheticPromotion();
const activeUi = buildLafea4ShellProductRefinementUiPolicy(stage, syntheticPromotion);
assert.equal(activeUi.scopeEligible, true);
assert.equal(activeUi.productQualified, true);
assert.equal(activeUi.canRefine, true);
assert.deepEqual(activeUi.allowedTargetTypes, ['ELEMENT']);
assert.equal(activeUi.productRetentionAuthorized, true);
assert.equal(activeUi.uiBindingAuthorized, true);
assert.equal(activeUi.releaseQualified, false);

// Qualification seam: exact future-active action using actual mesh state and
// the synthetic promotion record, without modifying the production trust root.
const successHarness = createActionHarness({ stage, parent, promotionRecord: syntheticPromotion });
const activeResult = successHarness.actions.refineAnalysisMesh(request, stageId);
assert.ok(activeResult);
assert.equal(activeResult.productRefinement, true);
assert.equal(activeResult.productRetentionAuthorized, true);
assert.equal(activeResult.uiBindingAuthorized, true);
assert.equal(activeResult.releaseQualified, false);
assert.notEqual(activeResult.evidence.artifactHash, parent.artifactHash);
assert.notEqual(activeResult.evidence.meshHash, parent.meshHash);
assert.equal(successHarness.meshGeneration.selectEvidence(stageId)?.artifactHash,
  activeResult.evidence.artifactHash);
assert.equal(successHarness.diagnostic(), null);

// Atomic rollback proof: force only child recovery to reject. The action must
// publish failure only after the exact parent has been restored internally.
const rollbackHarness = createActionHarness({
  stage,
  parent,
  promotionRecord: syntheticPromotion,
  failChildRecovery: true,
});
const failedResult = rollbackHarness.actions.refineAnalysisMesh(request, stageId);
assert.equal(failedResult, null);
assert.equal(rollbackHarness.meshGeneration.selectEvidence(stageId)?.artifactHash, parent.artifactHash);
assert.equal(rollbackHarness.meshGeneration.selectEvidence(stageId)?.meshHash, parent.meshHash);
assert.ok(rollbackHarness.diagnostic());

console.log(JSON.stringify({
  check: 'lafea-tech13f-dormant-product-refinement-activation',
  status: 'PASS',
  production: {
    trustRoot: 'NULL',
    canRefine: dormantUi.canRefine,
    retainedParentArtifactHash: parent.artifactHash,
    diagnostic: LAFEA4_SHELL_PRODUCT_REFINEMENT_PENDING_CODE,
  },
  syntheticFutureActive: {
    canRefine: activeUi.canRefine,
    targetTypes: activeUi.allowedTargetTypes,
    childArtifactHash: activeResult.evidence.artifactHash,
    childMeshHash: activeResult.evidence.meshHash,
    parentReplaced: activeResult.evidence.artifactHash !== parent.artifactHash,
  },
  forcedFailureRollback: {
    parentArtifactHashRestored: rollbackHarness.meshGeneration.selectEvidence(stageId)?.artifactHash,
    parentMeshHashRestored: rollbackHarness.meshGeneration.selectEvidence(stageId)?.meshHash,
  },
  syntheticRecordIsProductionEvidence: false,
  releaseQualified: false,
}, null, 2));

workbench.destroy();

function createActionHarness({ stage: sourceStage, parent: sourceParent, promotionRecord, failChildRecovery = false }) {
  const meshGeneration = createLafeaWorkbenchMeshGenerationState([stageId]);
  meshGeneration.bindMeshProfile(profile, stageId);
  meshGeneration.registerShellMidsurface(midsurface, sourceStage);
  meshGeneration.recoverEvidence(sourceParent, stageId);
  const originalRecover = meshGeneration.recoverEvidence.bind(meshGeneration);
  const wrappedMeshGeneration = failChildRecovery
    ? Object.freeze({
      ...meshGeneration,
      recoverEvidence(value, id) {
        if (value.artifactHash !== sourceParent.artifactHash) {
          const error = new TypeError('TECH13F_FORCED_CHILD_RECOVERY_FAILURE');
          error.code = 'TECH13F_FORCED_CHILD_RECOVERY_FAILURE';
          throw error;
        }
        return originalRecover(value, id);
      },
    })
    : meshGeneration;
  let diagnostic = null;
  const readStageState = () => ({
    ...sourceStage,
    retainedAnalysisMeshProfile: profile,
    retainedShellMidsurfaceEvidence: wrappedMeshGeneration.selectShellMidsurface(stageId),
    retainedAnalysisMeshEvidenceV2: wrappedMeshGeneration.selectEvidence(stageId),
    shellMidsurfaceProfileActive: true,
  });
  const storeError = (code) => {
    const error = new TypeError(code);
    error.code = code;
    return error;
  };
  const actions = createLafeaMeshGenerationActions({
    meshGeneration: wrappedMeshGeneration,
    mesh: {},
    continuumPreflight: { clear() {} },
    rawStage: readStageState,
    readStageState,
    deriveStage: readStageState,
    publish: () => ({ stages: { [stageId]: readStageState() } }),
    invokeRetained() {},
    getRetainedState: () => ({ activeStageId: stageId, status: 'READY', stages: { [stageId]: {} } }),
    clearOrchestratorDiagnostic: () => { diagnostic = null; },
    failOrchestrator: (error, fallback) => {
      diagnostic = error?.code ?? fallback;
    },
    clearDomainFirstExecution() {},
    storeError,
    productRefinementPromotionRecord: promotionRecord,
  });
  return {
    actions,
    meshGeneration: wrappedMeshGeneration,
    diagnostic: () => diagnostic,
  };
}

function createSyntheticPromotion() {
  return createLafea4ShellProductRefinementPromotionRecord({
    schema: LAFEA4_SHELL_PRODUCT_REFINEMENT_PROMOTION_SCHEMA,
    stageId,
    exactHeadQualificationId: LAFEA4_SHELL_PRODUCT_REFINEMENT_EXACT_HEAD_QUALIFICATION_ID,
    qualifiedHead: 'b'.repeat(40),
    bundleEvidenceSha256: '1'.repeat(64),
    bundlePlanSha256: '2'.repeat(64),
    bundleRunnerSha256: '3'.repeat(64),
    capabilityHash: LAFEA4_SHELL_PRODUCT_REFINEMENT_CAPABILITY.capabilityHash,
    qualificationHash: LAFEA4_SHELL_PRODUCT_REFINEMENT_QUALIFICATION.qualificationHash,
    qualificationClassification: 'PASS',
    qualificationComplete: true,
    futurePromotionReviewEligible: true,
    productRetentionAuthorized: true,
    uiBindingAuthorized: true,
    releaseQualified: false,
  });
}
