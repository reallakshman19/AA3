#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { createLafeaMockDocument } from '../src/workspace/advanced-mock-data.js';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import { lafeaAnalysisMeshContentHash } from '../src/workspace/lafea-analysis-mesh-contract.js';
import {
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
  LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
  createLafeaAnalysisMeshEvidenceV2,
} from '../src/workspace/lafea-analysis-mesh-evidence-v2.js';
import { LAFEA_SHELL_ELEMENT } from '../src/workspace/lafea-shell-mesh-producer.js';
import { createLafeaSimulatedShellMidsurfaceEvidence } from '../src/workspace/lafea-simulated-shell-midsurface-provider.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import {
  LAFEA4_RETAINED_MESH_PARENT_NORMAL_COMPANION_AUTHORITY,
  LAFEA4_RETAINED_MESH_PARENT_NORMAL_HARD_GATE,
  validateLafea4RetainedMeshParentNormalCompanion,
} from '../src/workspace/lafea4-shell-retained-mesh-parent-normal-companion.js';
import { normalizeLafeaStageDocument } from '../src/workspace/lafea-workbench-model.js';
import { createLafeaWorkbenchOrchestratorStore } from '../src/workspace/lafea-workbench-orchestrator-store.js';

const definition = JSON.parse(fs.readFileSync(
  new URL('../validation/lafea4-refinement/retained-parent-normal-companion-v1.json', import.meta.url),
  'utf8',
));
assert.equal(definition.productionBindingAuthorized, false);
assert.equal(definition.releaseQualified, false);

const stageId = 'LAFEA.4';
const document = normalizeLafeaStageDocument(stageId, createLafeaMockDocument(stageId));
const sourceAuthority = issueLafeaSourceAuthority(
  stageId,
  document,
  'TECH12B-RETAINED-COMPANION-SOURCE',
);
const sourceHash = sourceAuthority.sourceHash;
const midsurface = createLafeaSimulatedShellMidsurfaceEvidence(stageId, sourceHash, document);
const profile1 = shellProfile('TECH12B_SAMPLE_H100', 'TECH12B-R1', 100);
const profile2 = shellProfile('TECH12B_SAMPLE_H80', 'TECH12B-R2', 80);

// Real generated Sample: the returned companion, selector, export and validator
// must all identify the same deterministic artifact derived from current mesh +
// current midsurface. The companion is required custody, but still shadow-only.
const workbench = createWorkbench(document, sourceHash);
assert.equal(workbench.registerShellMidsurfaceEvidence(midsurface, stageId)?.changed, true);
assert.equal(workbench.bindAnalysisMeshProfile(profile1, stageId)?.changed, true);
const generated1 = workbench.generateAnalysisMesh({}, stageId);
assert.equal(generated1?.evidence.qualification, 'PASS');
assert.equal(generated1?.evidence.quality.shellOrientationTopology.qualification, 'PASS');
const companion1 = generated1?.parentNormalCompanion;
assert.ok(companion1, 'generated cylindrical Sample must carry TECH-12B companion');
validateCompanion(companion1, generated1.evidence, profile1, 'PASS');
assert.equal(companion1.authority, LAFEA4_RETAINED_MESH_PARENT_NORMAL_COMPANION_AUTHORITY);
assert.equal(companion1.hardGateStatus, LAFEA4_RETAINED_MESH_PARENT_NORMAL_HARD_GATE);
assert.equal(companion1.companionRequiredForRetainedCustody, true);
assert.equal(companion1.retainedMeshAcceptanceChanged, false);
assert.equal(companion1.productionBindingAuthorized, false);
assert.equal(companion1.releaseQualified, false);

const selected1 = workbench.selectRetainedAnalysisMeshParentNormalCompanion(stageId);
const exported1 = workbench.exportRetainedAnalysisMeshParentNormalCompanion(stageId);
const validated1 = workbench.validateRetainedAnalysisMeshParentNormalCompanion(companion1, stageId);
assert.equal(selected1.semanticHash, companion1.semanticHash);
assert.equal(exported1.semanticHash, companion1.semanticHash);
assert.equal(validated1.semanticHash, companion1.semanticHash);
assert.equal(selected1.meshArtifactHash, generated1.evidence.artifactHash);
assert.equal(selected1.midsurfaceEvidenceHash, midsurface.semanticHash);

// Rebinding the mesh profile invalidates retained mesh custody. A regenerated
// mesh has a new profile/artifact identity, so an otherwise internally valid
// old companion must fail exact-current-parent validation.
assert.equal(workbench.bindAnalysisMeshProfile(profile2, stageId)?.changed, true);
assert.equal(workbench.selectRetainedAnalysisMeshEvidenceV2(stageId), null);
assert.equal(workbench.selectRetainedAnalysisMeshParentNormalCompanion(stageId), null);
const generated2 = workbench.generateAnalysisMesh({}, stageId);
assert.equal(generated2?.evidence.qualification, 'PASS');
assert.ok(generated2?.parentNormalCompanion);
assert.notEqual(generated2.parentNormalCompanion.semanticHash, companion1.semanticHash);
assert.notEqual(generated2.parentNormalCompanion.meshProfileHash, companion1.meshProfileHash);
assert.throws(
  () => workbench.validateRetainedAnalysisMeshParentNormalCompanion(companion1, stageId),
  (error) => error?.code === definition.staleCompanion.expectedRejectionCode,
);
const current2 = workbench.selectRetainedAnalysisMeshParentNormalCompanion(stageId);
assert.equal(current2.semanticHash, generated2.parentNormalCompanion.semanticHash);

// Build a globally reversed retained Sample with the same source/domain/
// geometry/profile. Existing unsigned shell quality and topology still PASS.
// A fresh workbench must construct the companion BEFORE recovery custody is
// mutated, retain the mesh, and expose candidate BLOCK without changing current
// mesh acceptance because the final hard gate is deliberately disabled.
const reversedMesh = {
  ...structuredClone(generated1.evidence.mesh),
  meshIdentity: `${generated1.evidence.mesh.meshIdentity}:TECH12B-GLOBAL-REVERSE`,
  elements: generated1.evidence.mesh.elements.map((element) => ({
    ...structuredClone(element),
    nodeIds: [element.nodeIds[0], element.nodeIds[2], element.nodeIds[1]],
  })),
};
const reversedMeshHash = lafeaAnalysisMeshContentHash(reversedMesh);
const reversedEvidence = createLafeaAnalysisMeshEvidenceV2({
  schema: LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
  stageId,
  sourceHash,
  analysisDomainHash: midsurface.analysisDomainHash,
  analysisGeometryHash: midsurface.analysisGeometryHash,
  meshProfile: profile1,
  mesh: reversedMesh,
  authority: {
    schema: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
    stageId,
    authorityRole: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
    status: 'ACCEPTED_BY_STAGE_CONTRACT',
    producerRef: 'TECH12B-GLOBAL-REVERSE-RECOVERY-FIXTURE',
    sourceHash,
    analysisDomainHash: midsurface.analysisDomainHash,
    analysisGeometryHash: midsurface.analysisGeometryHash,
    meshProfileHash: profile1.semanticHash,
    meshHash: reversedMeshHash,
    capabilityHash: canonicalLafeaSha256({ schema: 'tech12b-reverse-capability/v1' }),
    qualificationHash: canonicalLafeaSha256({ schema: 'tech12b-reverse-upstream/v1' }),
    planHash: canonicalLafeaSha256({ schema: 'tech12b-reverse-plan/v1' }),
  },
});
assert.equal(reversedEvidence.qualification, definition.reversedRetainedMesh.existingMeshQualification);
assert.equal(
  reversedEvidence.quality.shellOrientationTopology.qualification,
  definition.reversedRetainedMesh.existingOrientationTopology,
);

const recoveryWorkbench = createWorkbench(document, sourceHash);
assert.equal(recoveryWorkbench.registerShellMidsurfaceEvidence(midsurface, stageId)?.changed, true);
const recovered = recoveryWorkbench.recoverAnalysisMeshEvidenceV2(reversedEvidence, stageId);
assert.ok(recovered, 'reversed retained mesh recovery must remain allowed while hard gate is disabled');
assert.equal(recovered.evidence.qualification, 'PASS');
assert.ok(recovered.parentNormalCompanion);
validateCompanion(recovered.parentNormalCompanion, reversedEvidence, profile1, 'BLOCK');
assert.equal(recovered.parentNormalCompanion.wouldBlockIfActivated, true);
assert.equal(recovered.parentNormalCompanion.retainedMeshAcceptanceChanged, false);
assert.equal(
  recovered.parentNormalCompanion.shadowGate.blockedElementCount,
  reversedEvidence.mesh.elements.length,
);
const recoveredSelected = recoveryWorkbench.selectRetainedAnalysisMeshParentNormalCompanion(stageId);
assert.equal(recoveredSelected.semanticHash, recovered.parentNormalCompanion.semanticHash);
const recoveredStage = recoveryWorkbench.getState().stages[stageId];
assert.equal(
  recoveredStage.analysisMeshCustodyProjection.state,
  definition.reversedRetainedMesh.currentMeshCustodyStateMustRemain,
);
assert.equal(recoveredStage.analysisMeshCustodyProjection.usableForAdvance, true);

// Source invalidation clears both retained mesh and retained midsurface. Since
// companion selection derives from current parents rather than a mutable cache,
// no stale companion can survive invalidation.
const nextSourceHash = `sha256:${'c'.repeat(64)}`;
recoveryWorkbench.initializeLifecycle(nextSourceHash, 'TECH12B-SOURCE-INVALIDATION');
assert.equal(recoveryWorkbench.selectRetainedAnalysisMeshEvidenceV2(stageId), null);
assert.equal(recoveryWorkbench.selectRetainedShellMidsurfaceEvidence(stageId), null);
assert.equal(recoveryWorkbench.selectRetainedAnalysisMeshParentNormalCompanion(stageId), null);

console.log(JSON.stringify({
  check: 'lafea-tech12b-retained-parent-normal-companion',
  status: 'PASS',
  qualificationId: definition.qualificationId,
  generatedSample: {
    meshHash: generated1.evidence.meshHash,
    meshArtifactHash: generated1.evidence.artifactHash,
    companionHash: companion1.semanticHash,
    candidateQualification: companion1.candidateQualification,
    custodyStatus: companion1.custodyStatus,
  },
  profileRebind: {
    originalCompanionHash: companion1.semanticHash,
    currentCompanionHash: current2.semanticHash,
    staleCompanionRejected: true,
    rejectionCode: definition.staleCompanion.expectedRejectionCode,
  },
  reversedRecovery: {
    retainedMeshQualification: recovered.evidence.qualification,
    existingOrientationTopology: recovered.evidence.quality.shellOrientationTopology.qualification,
    companionCandidateQualification: recovered.parentNormalCompanion.candidateQualification,
    blockedElementCount: recovered.parentNormalCompanion.shadowGate.blockedElementCount,
    meshCustodyState: recoveredStage.analysisMeshCustodyProjection.state,
    retainedMeshAcceptanceChanged: recovered.parentNormalCompanion.retainedMeshAcceptanceChanged,
  },
  sourceInvalidation: {
    retainedMeshCleared: true,
    retainedMidsurfaceCleared: true,
    derivedCompanionCleared: true,
  },
  hardGateStatus: LAFEA4_RETAINED_MESH_PARENT_NORMAL_HARD_GATE,
  productionBindingAuthorized: false,
  releaseQualified: false,
}, null, 2));

workbench.destroy();
recoveryWorkbench.destroy();

function createWorkbench(initialDocument, initialSourceHash) {
  return createLafeaWorkbenchOrchestratorStore({
    initialStage: stageId,
    initialDocument,
    initialSourceHash,
  });
}

function shellProfile(profileIdentity, sourceRevision, globalTargetSize) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity,
    sourceRevision,
    semanticHash: undefined,
    fields: {
      continuumElement: 'T3',
      shellElement: LAFEA_SHELL_ELEMENT,
      globalTargetSize,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 5,
      aspectRatioBlock: 10,
      scaledJacobianWarn: 0.5,
      scaledJacobianBlock: 0.2,
      adaptiveLevels: 3,
    },
  });
}

function validateCompanion(companion, meshEvidence, profile, candidateQualification) {
  const validated = validateLafea4RetainedMeshParentNormalCompanion(companion);
  assert.equal(validated.sourceHash, sourceHash);
  assert.equal(validated.analysisDomainHash, midsurface.analysisDomainHash);
  assert.equal(validated.analysisGeometryHash, midsurface.analysisGeometryHash);
  assert.equal(validated.meshArtifactHash, meshEvidence.artifactHash);
  assert.equal(validated.meshHash, meshEvidence.meshHash);
  assert.equal(validated.meshProfileHash, profile.semanticHash);
  assert.equal(validated.midsurfaceEvidenceHash, midsurface.semanticHash);
  assert.equal(validated.candidateQualification, candidateQualification);
  assert.equal(validated.wouldBlockIfActivated, candidateQualification === 'BLOCK');
  assert.equal(validated.companionRequiredForRetainedCustody, true);
  assert.equal(validated.retainedMeshAcceptanceChanged, false);
}
