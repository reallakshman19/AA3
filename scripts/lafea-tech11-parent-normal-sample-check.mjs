#!/usr/bin/env node
import assert from 'node:assert/strict';

import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { createLafeaMockDocument } from '../src/workspace/advanced-mock-data.js';
import { normalizeLafeaStageDocument } from '../src/workspace/lafea-workbench-model.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { createLafeaSimulatedShellMidsurfaceEvidence } from '../src/workspace/lafea-simulated-shell-midsurface-provider.js';
import { produceLafeaShellAnalysisMesh } from '../src/workspace/lafea-shell-mesh-producer.js';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import { lafeaAnalysisMeshContentHash } from '../src/workspace/lafea-analysis-mesh-contract.js';
import {
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
  LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
  createLafeaAnalysisMeshEvidenceV2,
} from '../src/workspace/lafea-analysis-mesh-evidence-v2.js';
import {
  qualifyLafea4ShellParentNormalOrientation,
  validateLafea4ShellParentNormalQualification,
} from '../src/workspace/lafea4-shell-parent-normal-qualification.js';

const document = normalizeLafeaStageDocument('LAFEA.4', createLafeaMockDocument('LAFEA.4'));
const authority = issueLafeaSourceAuthority('LAFEA.4', document, 'TECH11-SAMPLE-PARENT-NORMAL');
const midsurface = createLafeaSimulatedShellMidsurfaceEvidence(
  'LAFEA.4', authority.sourceHash, document,
);
const profile = canonicalProfile(PROFILE_KINDS.MESH, {
  schema: 'lafea-mesh-profile/v1',
  profileIdentity: 'TECH11_SAMPLE_CURVATURE_GOVERNED',
  sourceRevision: 'TECH11-SAMPLE-V1',
  semanticHash: undefined,
  fields: {
    continuumElement: 'T3',
    shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
    globalTargetSize: 100,
    adjacentSizeRatioMax: 1.5,
    aspectRatioWarn: 5,
    aspectRatioBlock: 10,
    scaledJacobianWarn: 0.5,
    scaledJacobianBlock: 0.2,
    adaptiveLevels: 3,
  },
});
const generated = produceLafeaShellAnalysisMesh({
  midsurfaceEvidence: midsurface,
  meshProfile: profile,
});
assert.equal(generated.evidence.qualification, 'PASS');
assert.equal(generated.evidence.quality.shellOrientationTopology.qualification, 'PASS');

const qualification = qualifyLafea4ShellParentNormalOrientation({
  meshEvidence: generated.evidence,
  midsurfaceEvidence: midsurface,
});
validateLafea4ShellParentNormalQualification(qualification);
assert.equal(qualification.qualification, 'PASS');
assert.equal(qualification.blockedElementCount, 0);
assert.equal(qualification.negativeElementCount, 0);
assert.equal(qualification.roundoffBandElementCount, 0);
assert.ok(qualification.minimumParentDirectedJacobian > qualification.witness.roundoffEnvelope);
const minimumExpectedAlignment = Math.cos(7.5 * Math.PI / 180);
assert.ok(qualification.minimumAlignmentCosine >= minimumExpectedAlignment - 1e-12,
  `minimum parent alignment ${qualification.minimumAlignmentCosine} < cos(7.5deg)`);
assert.ok(qualification.witness.angularSpanDegrees <= 15 + 1e-10);
assert.equal(qualification.sourceHash, authority.sourceHash);
assert.equal(qualification.analysisDomainHash, midsurface.analysisDomainHash);
assert.equal(qualification.analysisGeometryHash, midsurface.analysisGeometryHash);
assert.equal(qualification.meshArtifactHash, generated.evidence.artifactHash);
assert.equal(qualification.meshHash, generated.evidence.meshHash);
assert.equal(qualification.meshProfileHash, profile.semanticHash);
assert.equal(qualification.midsurfaceEvidenceHash, midsurface.semanticHash);
assert.equal(qualification.productionBindingAuthorized, false);
assert.equal(qualification.releaseQualified, false);

// Reverse every retained TRI3 while preserving coordinates, source, geometry
// and profile. Existing unsigned shape metrics and neighbor-consistency topology
// should remain nonblocking; TECH-11 must detect the global parent-normal flip.
const reversedMesh = {
  ...structuredClone(generated.evidence.mesh),
  meshIdentity: `${generated.evidence.mesh.meshIdentity}:TECH11-GLOBAL-REVERSE`,
  elements: generated.evidence.mesh.elements.map((element) => ({
    ...structuredClone(element),
    nodeIds: [element.nodeIds[0], element.nodeIds[2], element.nodeIds[1]],
  })),
};
const reversedMeshHash = lafeaAnalysisMeshContentHash(reversedMesh);
const reversedEvidence = createLafeaAnalysisMeshEvidenceV2({
  schema: LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
  stageId: 'LAFEA.4',
  sourceHash: authority.sourceHash,
  analysisDomainHash: midsurface.analysisDomainHash,
  analysisGeometryHash: midsurface.analysisGeometryHash,
  meshProfile: profile,
  mesh: reversedMesh,
  authority: {
    schema: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
    stageId: 'LAFEA.4',
    authorityRole: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
    status: 'ACCEPTED_BY_STAGE_CONTRACT',
    producerRef: 'TECH11-SAMPLE-GLOBAL-REVERSE-QUALIFICATION-FIXTURE',
    sourceHash: authority.sourceHash,
    analysisDomainHash: midsurface.analysisDomainHash,
    analysisGeometryHash: midsurface.analysisGeometryHash,
    meshProfileHash: profile.semanticHash,
    meshHash: reversedMeshHash,
    capabilityHash: canonicalLafeaSha256({ schema: 'tech11-sample-reverse-capability/v1' }),
    qualificationHash: canonicalLafeaSha256({ schema: 'tech11-sample-reverse-upstream/v1' }),
    planHash: canonicalLafeaSha256({ schema: 'tech11-sample-reverse-plan/v1' }),
  },
});
assert.equal(reversedEvidence.quality.shellOrientationTopology.qualification, 'PASS');
assert.equal(reversedEvidence.qualification, 'PASS',
  'pre-TECH11 shell quality intentionally lacks analytic-parent normal custody');
const reversedQualification = qualifyLafea4ShellParentNormalOrientation({
  meshEvidence: reversedEvidence,
  midsurfaceEvidence: midsurface,
});
validateLafea4ShellParentNormalQualification(reversedQualification);
assert.equal(reversedQualification.qualification, 'BLOCK');
assert.equal(reversedQualification.negativeElementCount, reversedEvidence.mesh.elements.length);
assert.equal(reversedQualification.roundoffBandElementCount, 0);
assert.equal(reversedQualification.blockedElementCount, reversedEvidence.mesh.elements.length);
assert.equal(reversedQualification.blockingElementIds.length, reversedEvidence.mesh.elements.length);
assert.ok(reversedQualification.minimumParentDirectedJacobian < 0);
assert.ok(reversedQualification.minimumAlignmentCosine < -minimumExpectedAlignment + 1e-12);

console.log(JSON.stringify({
  check: 'lafea-tech11-parent-normal-sample',
  status: 'PASS',
  source: {
    sourceHash: authority.sourceHash,
    sourceElements: document.elements.length,
    radiusMm: midsurface.geometry.surface.radius,
  },
  generatedMesh: {
    nodes: generated.evidence.mesh.nodes.length,
    elements: generated.evidence.mesh.elements.length,
    meshHash: generated.evidence.meshHash,
    existingMeshQualification: generated.evidence.qualification,
    existingOrientationTopology: generated.evidence.quality.shellOrientationTopology.qualification,
    parentNormalQualification: qualification.qualification,
    minimumParentDirectedJacobian: qualification.minimumParentDirectedJacobian,
    minimumAlignmentCosine: qualification.minimumAlignmentCosine,
    witnessAngularSpanDegrees: qualification.witness.angularSpanDegrees,
  },
  globalReverseFixture: {
    existingMeshQualification: reversedEvidence.qualification,
    existingOrientationTopology: reversedEvidence.quality.shellOrientationTopology.qualification,
    parentNormalQualification: reversedQualification.qualification,
    negativeElementCount: reversedQualification.negativeElementCount,
    blockedElementCount: reversedQualification.blockedElementCount,
    minimumParentDirectedJacobian: reversedQualification.minimumParentDirectedJacobian,
    minimumAlignmentCosine: reversedQualification.minimumAlignmentCosine,
  },
  productionBindingAuthorized: false,
  releaseQualified: false,
}, null, 2));
