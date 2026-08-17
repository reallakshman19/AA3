#!/usr/bin/env node
import assert from 'node:assert/strict';

import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { createLafeaMockDocument } from '../src/workspace/advanced-mock-data.js';
import { normalizeLafeaStageDocument } from '../src/workspace/lafea-workbench-model.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { createLafeaSimulatedShellMidsurfaceEvidence } from '../src/workspace/lafea-simulated-shell-midsurface-provider.js';
import {
  LAFEA_SHELL_ELEMENT,
  produceLafeaShellAnalysisMesh,
} from '../src/workspace/lafea-shell-mesh-producer.js';
import {
  LAFEA4_GRADED_REFINEMENT_QUALIFICATION,
} from '../src/workspace/lafea4-shell-graded-refinement-authority.js';
import {
  LAFEA4_SHELL_PRODUCT_REFINEMENT_PRODUCER_REF,
  LAFEA4_SHELL_PRODUCT_REFINEMENT_QUALIFICATION,
  previewLafea4ShellProductRefinement,
  validateLafea4ShellProductRefinementAdapterResult,
} from '../src/workspace/lafea4-shell-product-refinement-adapter.js';

const document = normalizeLafeaStageDocument('LAFEA.4', createLafeaMockDocument('LAFEA.4'));
const authority = issueLafeaSourceAuthority('LAFEA.4', document, 'TECH13B-PRODUCT-ADAPTER');
const midsurface = createLafeaSimulatedShellMidsurfaceEvidence(
  'LAFEA.4', authority.sourceHash, document,
);
const profile = canonicalProfile(PROFILE_KINDS.MESH, {
  schema: 'lafea-mesh-profile/v1',
  profileIdentity: 'TECH13B_SAMPLE_CURVED_TRI3',
  sourceRevision: 'TECH13B-V1',
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
const parent = produceLafeaShellAnalysisMesh({
  midsurfaceEvidence: midsurface,
  meshProfile: profile,
}).evidence;
assert.equal(parent.qualification, 'PASS');

const target = parent.mesh.elements[Math.floor(parent.mesh.elements.length / 2)];
const input = {
  stage: { stageId: 'LAFEA.4', lifecycleBinding: { status: 'CURRENT' } },
  parentEvidence: parent,
  midsurfaceEvidence: midsurface,
  meshProfile: profile,
  request: {
    commandId: 'TECH13B-SAMPLE-REFINE',
    targetType: 'ELEMENT',
    targetIds: [target.elementId],
    targetElementLength: 7.5,
    lengthUnit: midsurface.geometry.lengthUnit,
    reason: 'TECH13B product adapter qualification fixture',
  },
};

const result = previewLafea4ShellProductRefinement(input);
validateLafea4ShellProductRefinementAdapterResult(result);
const replay = previewLafea4ShellProductRefinement(input);
validateLafea4ShellProductRefinementAdapterResult(replay);

assert.equal(LAFEA4_GRADED_REFINEMENT_QUALIFICATION.productionBindingAuthorized, false);
assert.equal(LAFEA4_GRADED_REFINEMENT_QUALIFICATION.releaseQualified, false);
assert.equal(LAFEA4_SHELL_PRODUCT_REFINEMENT_QUALIFICATION.productBindingAuthorized, false);
assert.equal(LAFEA4_SHELL_PRODUCT_REFINEMENT_QUALIFICATION.uiBindingAuthorized, false);
assert.equal(LAFEA4_SHELL_PRODUCT_REFINEMENT_QUALIFICATION.releaseQualified, false);
assert.equal(result.plan.reusedKernelProducerRef.includes('LAFEA4_SHELL_UV_GRADED_REFINER'), true);
assert.equal(result.plan.producerRef, LAFEA4_SHELL_PRODUCT_REFINEMENT_PRODUCER_REF);
assert.notEqual(result.plan.producerRef, result.plan.reusedKernelProducerRef);
assert.equal(result.productEvidence.authority.producerRef,
  LAFEA4_SHELL_PRODUCT_REFINEMENT_PRODUCER_REF);
assert.equal(result.productEvidence.authority.qualificationHash,
  LAFEA4_SHELL_PRODUCT_REFINEMENT_QUALIFICATION.qualificationHash);
assert.equal(result.productEvidence.meshHash, result.kernelEvidenceMeshHash);
assert.notEqual(result.productEvidence.artifactHash, result.kernelEvidenceArtifactHash,
  'same child mesh must have a distinct product-candidate authority artifact');
assert.equal(JSON.stringify(result.productEvidence.mesh), JSON.stringify(replay.productEvidence.mesh));
assert.equal(result.productEvidence.meshHash, replay.productEvidence.meshHash);
assert.equal(result.productEvidence.artifactHash, replay.productEvidence.artifactHash);
assert.equal(result.plan.planHash, replay.plan.planHash);
assert.equal(result.productRetentionAuthorized, false);
assert.equal(result.uiBindingAuthorized, false);
assert.equal(result.releaseQualified, false);

console.log(JSON.stringify({
  check: 'lafea-tech13b-product-refinement-adapter',
  status: 'PASS',
  parent: {
    nodes: parent.mesh.nodes.length,
    elements: parent.mesh.elements.length,
    meshHash: parent.meshHash,
  },
  child: {
    nodes: result.productEvidence.mesh.nodes.length,
    elements: result.productEvidence.mesh.elements.length,
    meshHash: result.productEvidence.meshHash,
    productArtifactHash: result.productEvidence.artifactHash,
    kernelArtifactHash: result.kernelEvidenceArtifactHash,
    qualification: result.productEvidence.qualification,
  },
  adapter: {
    producerRef: result.plan.producerRef,
    reusedKernelProducerRef: result.plan.reusedKernelProducerRef,
    reusedKernelPlanHash: result.kernelPlanHash,
    insertedGradedPointCount: result.insertedGradedPointCount,
    boundaryMatchesPlan: result.boundaryMatchesPlan,
    maximumSurfaceRoundTripUvError: result.maximumSurfaceRoundTripUvError,
  },
  tech7ProductionBindingAuthorized: false,
  productRetentionAuthorized: false,
  uiBindingAuthorized: false,
  releaseQualified: false,
  deterministicReplay: true,
}, null, 2));
