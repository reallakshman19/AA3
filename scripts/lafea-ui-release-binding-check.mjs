#!/usr/bin/env node
import assert from 'node:assert/strict';
import { sourceFixture } from './lafea.1-fixtures.mjs';
import { createTemplateReleaseRecordV2 } from '../src/core/lafea-application-templates/release-record-v2.js';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import { createLafeaLifecycle } from '../src/workspace/lafea-lifecycle.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { createCurrentLafeaTargetAuthoritySnapshot } from '../src/workspace/lafea-target-compatibility-authority.js';
import {
  LAFEA_WORKBENCH_RELEASE_BINDING_SCHEMA,
  createLafeaWorkbenchReleaseState,
  projectLafeaWorkbenchReleaseBinding,
} from '../src/workspace/lafea-workbench-release-binding.js';

const STAGE_ID = 'LAFEA.1';
const SHA = 'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const HEAD = '8c8f0f5937afc53d546ee3d554bda2b4b7ccafd8';

const document = sourceFixture();
const authority = issueLafeaSourceAuthority(STAGE_ID, document, 'STAGE7/TEST');
const stage = currentStage(document, authority);
const releaseRecord = qualifiedRecord(stage, authority);

const absent = projectLafeaWorkbenchReleaseBinding(stage, null);
assert.equal(absent.schema, LAFEA_WORKBENCH_RELEASE_BINDING_SCHEMA);
assert.equal(absent.bindingStatus, 'ABSENT');
assert.equal(absent.releaseQualified, false);
assert.deepEqual(absent.reasons, ['RELEASE_RECORD_ABSENT']);

const current = projectLafeaWorkbenchReleaseBinding(stage, releaseRecord);
assert.equal(current.bindingStatus, 'CURRENT');
assert.equal(current.releaseQualified, true);
assert.equal(current.authorityState, 'RELEASE_QUALIFIED');
assert.deepEqual(current.reasons, []);

const releaseState = createLafeaWorkbenchReleaseState([STAGE_ID]);
const importedJson = JSON.parse(JSON.stringify(releaseRecord));
const registered = releaseState.register(importedJson, stage);
assert.equal(registered.changed, true);
assert.equal(registered.projection.releaseQualified, true);
assert.equal(Object.isFrozen(registered.record), true);
assert.equal(releaseState.select(STAGE_ID).evidenceHash, releaseRecord.evidenceHash);

const changedDocument = sourceFixture((source) => {
  source.pipeGeometry.outsideDiameter.value += 1;
});
const changedAuthority = issueLafeaSourceAuthority(STAGE_ID, changedDocument, 'STAGE7/CHANGED');
const stale = projectLafeaWorkbenchReleaseBinding(
  currentStage(changedDocument, changedAuthority),
  releaseRecord,
);
assert.equal(stale.bindingStatus, 'STALE');
assert.equal(stale.releaseQualified, false);
assert.ok(stale.reasons.includes('RELEASE_RECORD_SOURCE_HASH_STALE'));
assert.ok(stale.reasons.includes('RELEASE_RECORD_SOURCE_AUTHORITY_HASH_STALE'));
assert.ok(stale.reasons.includes('RELEASE_RECORD_DOCUMENT_REVISION_STALE'));

const tampered = structuredClone(releaseRecord);
tampered.semanticHash = SHA;
const invalid = projectLafeaWorkbenchReleaseBinding(stage, tampered);
assert.equal(invalid.bindingStatus, 'STALE');
assert.equal(invalid.releaseQualified, false);
assert.deepEqual(invalid.reasons, ['RELEASE_RECORD_INVALID']);

console.log(JSON.stringify({
  check: 'lafea-ui-release-binding',
  status: 'PASS',
  importedJsonAcceptedAfterGovernedFreeze: true,
  sourceChangeInvalidatesRelease: true,
  tamperedRecordRejected: true,
  githubActionsWorkflowAdded: false,
}));

function currentStage(documentValue, sourceAuthority) {
  return {
    stageId: STAGE_ID,
    document: documentValue,
    lifecycle: createLafeaLifecycle(STAGE_ID, sourceAuthority.sourceHash),
    lifecycleBinding: {
      status: 'CURRENT',
      boundDocumentDigest: sourceAuthority.documentRevisionDigest,
      currentDocumentDigest: sourceAuthority.documentRevisionDigest,
    },
    sourceAuthority,
  };
}

function qualifiedRecord(stageValue, sourceAuthority) {
  const snapshot = createCurrentLafeaTargetAuthoritySnapshot(STAGE_ID);
  const product = snapshot.productAdapter;
  return createTemplateReleaseRecordV2({
    recordId: 'LAFEA.RELEASE.ALG-WORKBENCH-RELEASE/V2',
    candidateHeadSha: HEAD,
    template: {
      templateId: 'ALG-WORKBENCH-RELEASE',
      templateRevision: 1,
      templateSemanticHash: SHA,
      templateRegistryHash: SHA,
      bucketId: 'ANALYTICAL_ENGINEERING',
    },
    parameterSchema: { schemaId: 'ALG-WORKBENCH-RELEASE.PARAMETERS/V1', schemaHash: SHA },
    parameterSet: {
      applicability: 'REQUIRED', parameterSetHash: SHA, validationResultHash: SHA,
    },
    compiler: {
      applicability: 'REQUIRED',
      bindingSchema: 'lafea-template-compiler-binding/v1',
      bindingHash: SHA,
      compilerVersion: '1',
      geometryCompilerId: 'GEOM-1',
      loadCompilerId: 'LOAD-1',
      boundaryCompilerId: 'BOUNDARY-1',
      meshRequestCompilerId: null,
    },
    handoff: {
      applicability: 'REQUIRED',
      handoffSchema: 'lafea-template-handoff/v1',
      compilationHash: SHA,
      handoffHash: SHA,
      entryStageId: STAGE_ID,
      stageSourceHash: SHA,
      handoffStatus: 'IMPORTED_FOR_EDITING',
    },
    targetStage: {
      registrySchema: snapshot.targetStage.registrySchema,
      stageId: snapshot.targetStage.stageId,
      stageEntryHash: snapshot.targetStage.registryEntryHash,
      engineState: snapshot.targetStage.engineState,
      enginePackage: snapshot.targetStage.enginePackage,
      stageAuthority: snapshot.targetStage.stageAuthority,
      inputContractRole: snapshot.targetStage.inputContractRole,
      resultContractRole: snapshot.targetStage.resultContractRole,
    },
    compositionRoot: {
      compositionSchema: snapshot.compositionRoot.compositionSchema,
      compositionRootId: snapshot.compositionRoot.compositionRootId,
      compositionRootHash: snapshot.compositionRoot.compositionRootHash,
      componentIdsHash: snapshot.compositionRoot.componentIdsHash,
      releaseStateBinding: snapshot.compositionRoot.releaseStateBinding,
      compatibilityReceiptHash: SHA,
    },
    lifecycleProfile: { ...snapshot.lifecycleProfile },
    sourceAuthority: {
      applicability: 'REQUIRED',
      requiredSchema: snapshot.sourceContract.sourceAuthoritySchema,
      requiredRole: snapshot.sourceContract.sourceAuthorityRole,
      authorityHash: canonicalLafeaSha256(sourceAuthority),
      sourceHash: sourceAuthority.sourceHash,
      canonicalizationProfile: snapshot.sourceContract.canonicalizationProfile,
      documentRevisionDigest: sourceAuthority.documentRevisionDigest,
      originRef: sourceAuthority.originRef,
    },
    unitProjection: {
      sourceUnitContractHash: SHA,
      handoffUnitContractHash: SHA,
      targetUnitContractHash: snapshot.unitProjection.targetUnitContractHash,
      projectionProfileHash: SHA,
    },
    meshAuthority: {
      applicability: 'NOT_APPLICABLE',
      authoritySchema: null,
      authorityRole: null,
      authorityStatus: null,
      authorityHash: null,
      sourceHash: null,
      canonicalModelHash: null,
      analysisGeometryHash: null,
      meshProfileHash: null,
      meshHash: null,
      qualityEvidenceHash: null,
    },
    recoveryAuthority: {
      applicability: 'NOT_APPLICABLE',
      recoveryProfileHash: null,
      recoveryEvidenceHash: null,
      convergenceProfileHash: null,
      convergenceEvidenceHash: null,
    },
    benchmarkManifests: {
      bindingState: snapshot.benchmarkBindings.bindingState,
      manifestIds: [...snapshot.benchmarkBindings.manifestIds],
      manifestHashes: [...snapshot.benchmarkBindings.manifestHashes],
      expectedResultHashes: [SHA],
      benchmarkResultHashes: [SHA],
      independentEvidenceBasisHashes: [SHA],
    },
    productAdapter: product.applicability === 'REQUIRED'
      ? {
          applicability: 'REQUIRED',
          componentId: product.componentId,
          componentHash: product.componentHash,
          productProfileHash: product.productProfileHash,
          productEvidenceHash: SHA,
          productQualification: 'PASS',
        }
      : {
          applicability: 'NOT_APPLICABLE',
          componentId: null,
          componentHash: null,
          productProfileHash: null,
          productEvidenceHash: null,
          productQualification: null,
        },
    executionEvidence: {
      applicability: 'REQUIRED',
      requestHash: SHA,
      receiptHash: SHA,
      stageExecutionEvidenceHash: SHA,
      lifecycleProducerBatchHash: SHA,
      resultEvidenceHash: SHA,
      calculationAccepted: true,
      resultReady: true,
      assessmentReady: true,
      codeReady: true,
    },
    qualificationEvidence: {
      exactHeadArtifactHash: SHA,
      buildEvidenceHash: SHA,
      browserEvidenceHash: SHA,
      performanceEvidenceHash: SHA,
      accessibilityEvidenceHash: SHA,
      independentReviewHash: SHA,
      repositoryIntegrationEvidenceHash: SHA,
    },
    releaseState: {
      authorityState: 'RELEASE_QUALIFIED',
      validity: 'CURRENT',
      releaseQualified: true,
      blockedReasons: [],
    },
    diagnostics: [],
  });
}
