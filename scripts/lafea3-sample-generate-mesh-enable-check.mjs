#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  qualifiedMeshQualityPolicyForStage,
} from '../src/core/lafea-profile-contract/index.js';
import {
  LAFEA3_SIMULATED_MESH_ELEMENT_FAMILY,
  LAFEA3_SIMULATED_MESH_PROFILE_ID,
  LAFEA3_SIMULATED_MESH_TARGET_MM,
  createLafeaMockDocument,
  createLafeaMockMeshProfile,
} from '../src/workspace/lafea-simulated-source-provider.js';
import {
  buildLafeaDiscretizationViewModel,
} from '../src/workspace/lafea-discretization-view-model.js';

const profile = createLafeaMockMeshProfile('LAFEA.3');
const policy = qualifiedMeshQualityPolicyForStage('LAFEA.3');
assert.ok(profile);
assert.equal(profile.profileIdentity, LAFEA3_SIMULATED_MESH_PROFILE_ID);
assert.equal(profile.fields.continuumElement, LAFEA3_SIMULATED_MESH_ELEMENT_FAMILY);
assert.equal(profile.fields.continuumElement, 'T6');
assert.equal(profile.fields.globalTargetSize, LAFEA3_SIMULATED_MESH_TARGET_MM);
assert.equal(profile.fields.globalTargetSize, 30);
assert.equal(profile.fields.adjacentSizeRatioMax, policy.fields.adjacentSizeRatioMax);
assert.equal(profile.fields.aspectRatioWarn, policy.fields.aspectRatioWarn);
assert.equal(profile.fields.aspectRatioBlock, policy.fields.aspectRatioBlock);
assert.equal(profile.fields.scaledJacobianWarn, policy.fields.scaledJacobianWarn);
assert.equal(profile.fields.scaledJacobianBlock, policy.fields.scaledJacobianBlock);
assert.equal(profile.fields.adaptiveLevels, policy.fields.adaptiveLevelsMinimum);
assert.equal(createLafeaMockMeshProfile('LAFEA.4'), null);
assert.equal(createLafeaMockDocument.meshProfileFactory, createLafeaMockMeshProfile);

const enabled = buildLafeaDiscretizationViewModel(stage(profile));
assert.equal(enabled.stageId, 'LAFEA.3');
assert.equal(enabled.generation.producerQualified, true);
assert.equal(enabled.generation.parentReady, true);
assert.equal(enabled.generation.meshProfileBound, true);
assert.equal(enabled.generation.available, true);
assert.equal(enabled.generation.unavailableReason, null);
assert.equal(enabled.generation.declaredElementFamily, 'T6');
assert.equal(enabled.generation.targetElementLength, 30);
assert.equal(enabled.actions.automaticMeshEnabled, true);
assert.equal(enabled.actions.canGenerateMesh, true);
assert.ok(['READY_TO_PLAN', 'PLAN_AVAILABLE'].includes(enabled.uiPhase));

// General engineering inputs remain fail-closed without an explicit profile.
const unbound = buildLafeaDiscretizationViewModel(stage(null));
assert.equal(unbound.generation.parentReady, true);
assert.equal(unbound.generation.meshProfileBound, false);
assert.equal(unbound.generation.available, false);
assert.equal(unbound.generation.unavailableReason, 'ANALYSIS_MESH_PROFILE_BINDING_REQUIRED');
assert.equal(unbound.actions.canGenerateMesh, false);
assert.equal(unbound.uiPhase, 'PROFILE_REQUIRED');

// Sample loading must establish geometry custody before the simulated profile is bound.
const controllerSource = fs.readFileSync(
  new URL('../src/workspace/lafea-workbench-controller.js', import.meta.url),
  'utf8',
);
const domainIndex = controllerSource.indexOf('this.store.registerAnalysisDomain(mockEv.domain)');
const geometryIndex = controllerSource.indexOf(
  'this.store.registerAnalysisGeometryEvidence(mockEv.geometryEvidence)',
);
const profileFactoryIndex = controllerSource.indexOf(
  'this.mockDocumentFactory?.meshProfileFactory',
);
const profileBindIndex = controllerSource.indexOf(
  'this.store.bindAnalysisMeshProfile(meshProfile, stageId)',
);
assert.ok(domainIndex >= 0);
assert.ok(geometryIndex > domainIndex);
assert.ok(profileFactoryIndex > geometryIndex);
assert.ok(profileBindIndex > profileFactoryIndex);

console.log(JSON.stringify({
  check: 'lafea3-sample-generate-mesh-enable',
  status: 'PASS',
  sampleProfile: {
    profileIdentity: profile.profileIdentity,
    elementFamily: profile.fields.continuumElement,
    targetElementLengthMm: profile.fields.globalTargetSize,
    adjacentSizeRatioMax: profile.fields.adjacentSizeRatioMax,
    aspectRatioWarn: profile.fields.aspectRatioWarn,
    aspectRatioBlock: profile.fields.aspectRatioBlock,
    scaledJacobianWarn: profile.fields.scaledJacobianWarn,
    scaledJacobianBlock: profile.fields.scaledJacobianBlock,
    adaptiveLevels: profile.fields.adaptiveLevels,
  },
  generateEnabledAfterSampleProfile: enabled.actions.canGenerateMesh,
  importedUnboundModelStillFailClosed: !unbound.actions.canGenerateMesh,
}, null, 2));

function stage(meshProfile) {
  const sourceHash = hash('source');
  return {
    stageId: 'LAFEA.3',
    document: {},
    lifecycle: {
      profileId: 'FEA_MESH_RECOVERY_V1',
      source: { sourceHash },
    },
    lifecycleBinding: { status: 'CURRENT' },
    lifecycleReadiness: { sourceCurrent: true },
    sourceAuthority: { stageId: 'LAFEA.3', sourceHash },
    domainFirstProfileActive: true,
    analysisDomainProjection: {
      state: 'CURRENT_PASS',
      analysisDomainHash: hash('domain'),
    },
    analysisGeometryProjection: {
      state: 'CURRENT_PASS',
      analysisGeometryHash: hash('geometry'),
    },
    retainedAnalysisGeometryEvidence: {
      geometry: { lengthUnit: 'mm' },
    },
    retainedAnalysisMeshProfile: meshProfile,
    analysisMeshProfileHash: meshProfile?.semanticHash ?? null,
    analysisMeshCustodyProjection: {
      schema: 'lafea-domain-first-mesh-custody/v1',
      stageId: 'LAFEA.3',
      state: 'ABSENT',
      usableForAdvance: false,
      usableForAuthorization: false,
      usableForRun: false,
      canView: false,
      canFocusFindings: false,
      gateResults: [],
      warningElementIds: [],
      blockingElementIds: [],
      staleReasons: [],
      invalidReasons: [],
      absenceReasons: ['ANALYSIS_MESH_EVIDENCE_ABSENT'],
    },
    retainedAnalysisMeshEvidenceV2: null,
    lastAnalysisMeshPlan: null,
  };
}

function hash(seed) {
  return `sha256:${seed.padEnd(64, '0').slice(0, 64)}`;
}
