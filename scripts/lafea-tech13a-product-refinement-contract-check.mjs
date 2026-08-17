#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

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
  LAFEA4_SHELL_PRODUCT_REFINEMENT_PENDING_CODE,
  evaluateLafea4ShellProductRefinementScope,
  validateLafea4ShellProductRefinementScope,
} from '../src/workspace/lafea4-shell-product-refinement-contract.js';

const document = normalizeLafeaStageDocument('LAFEA.4', createLafeaMockDocument('LAFEA.4'));
const authority = issueLafeaSourceAuthority('LAFEA.4', document, 'TECH13A-PRODUCT-REFINEMENT');
const midsurface = createLafeaSimulatedShellMidsurfaceEvidence(
  'LAFEA.4', authority.sourceHash, document,
);
const profile = canonicalProfile(PROFILE_KINDS.MESH, {
  schema: 'lafea-mesh-profile/v1',
  profileIdentity: 'TECH13A_SAMPLE_CURVED_TRI3',
  sourceRevision: 'TECH13A-V1',
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

const stage = {
  stageId: 'LAFEA.4',
  lifecycleBinding: { status: 'CURRENT' },
};
const request = {
  targetType: 'ELEMENT',
  targetIds: [parent.mesh.elements[0].elementId],
  targetElementLength: 7.5,
  lengthUnit: midsurface.geometry.lengthUnit,
};
const scope = evaluateLafea4ShellProductRefinementScope({
  stage,
  parentEvidence: parent,
  midsurfaceEvidence: midsurface,
  meshProfile: profile,
  request,
});
validateLafea4ShellProductRefinementScope(scope);
assert.equal(scope.stageId, 'LAFEA.4');
assert.equal(scope.surfaceKind, 'CYLINDRICAL');
assert.equal(scope.elementFamily, LAFEA_SHELL_ELEMENT);
assert.equal(scope.parentMeshHash, parent.meshHash);
assert.equal(scope.midsurfaceEvidenceHash, midsurface.semanticHash);
assert.equal(scope.targetElementLength, 7.5);
assert.equal(scope.globalTargetElementLength, 15);
assert.equal(scope.adjacentSizeRatioMax, 1.5);
assert.equal(scope.aspectRatioBlock, 10);
assert.equal(scope.scaledJacobianBlock, 0.2);
assert.equal(scope.currentParentRequired, true);
assert.equal(scope.exactMidsurfaceParentRequired, true);
assert.equal(scope.conformingTri3Required, true);
assert.equal(scope.parentNormalQualificationRequired, true);
assert.equal(scope.atomicPublicationRequired, true);
assert.equal(scope.executionAuthorized, false);
assert.equal(scope.productBindingAuthorized, false);
assert.equal(scope.uiBindingAuthorized, false);
assert.equal(scope.releaseQualified, false);
assert.equal(scope.diagnosticCode, LAFEA4_SHELL_PRODUCT_REFINEMENT_PENDING_CODE);

assert.throws(() => evaluateLafea4ShellProductRefinementScope({
  stage: { ...stage, lifecycleBinding: { status: 'STALE_DOCUMENT_REVISION' } },
  parentEvidence: parent, midsurfaceEvidence: midsurface, meshProfile: profile, request,
}), /LAFEA4_SHELL_PRODUCT_REFINEMENT_SOURCE_BINDING_NOT_CURRENT/u);
assert.throws(() => evaluateLafea4ShellProductRefinementScope({
  stage, parentEvidence: parent, midsurfaceEvidence: midsurface, meshProfile: profile,
  request: { ...request, targetType: 'NODE' },
}), /LAFEA4_SHELL_PRODUCT_REFINEMENT_TARGET_TYPE_NOT_QUALIFIED/u);
assert.throws(() => evaluateLafea4ShellProductRefinementScope({
  stage, parentEvidence: parent, midsurfaceEvidence: midsurface, meshProfile: profile,
  request: { ...request, targetElementLength: 15 },
}), /LAFEA4_SHELL_PRODUCT_REFINEMENT_TARGET_NOT_SMALLER_THAN_GLOBAL/u);

const definition = JSON.parse(fs.readFileSync(
  new URL('../validation/lafea4-refinement/product-refinement-scope-v1.json', import.meta.url),
  'utf8',
));
assert.deepEqual(definition.authorizedSurfaceKinds, ['CYLINDRICAL', 'CYLINDRICAL_HOLES']);
assert.deepEqual(definition.authorizedTargetTypes, ['ELEMENT']);
assert.equal(definition.executionAuthorized, false);
assert.equal(definition.productBindingAuthorized, false);
assert.equal(definition.uiBindingAuthorized, false);
assert.equal(definition.releaseQualified, false);
assert.equal(definition.tech7AuthorityMayBeReinterpretedAsProductAuthority, false);

console.log(JSON.stringify({
  check: 'lafea-tech13a-product-refinement-contract',
  status: 'PASS',
  scopeId: scope.scopeId,
  surfaceKind: scope.surfaceKind,
  parentNodes: parent.mesh.nodes.length,
  parentElements: parent.mesh.elements.length,
  globalTargetMm: scope.globalTargetElementLength,
  requestedLocalTargetMm: scope.targetElementLength,
  adjacentSizeRatioMax: scope.adjacentSizeRatioMax,
  aspectRatioBlock: scope.aspectRatioBlock,
  scaledJacobianBlock: scope.scaledJacobianBlock,
  executionAuthorized: scope.executionAuthorized,
  productBindingAuthorized: scope.productBindingAuthorized,
  uiBindingAuthorized: scope.uiBindingAuthorized,
  releaseQualified: scope.releaseQualified,
}, null, 2));
