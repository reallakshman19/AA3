#!/usr/bin/env node
import assert from 'node:assert/strict';
import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import {
  createLafeaAnalysisGeometry,
  LAFEA_ANALYSIS_GEOMETRY_ORIENTATION_POLICY,
  LAFEA_ANALYSIS_GEOMETRY_SCHEMA,
} from '../src/workspace/lafea-analysis-geometry-contract.js';
import {
  createLafeaAnalysisGeometryEvidence,
  LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_PROFILE,
  LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_SCHEMA,
} from '../src/workspace/lafea-analysis-geometry-evidence.js';
import {
  createLafeaContinuumAnalysisDomain,
  LAFEA_CONTINUUM_ANALYSIS_DOMAIN_SCHEMA,
} from '../src/workspace/lafea-continuum-analysis-domain.js';
import { createLafeaWorkbenchMeshGenerationState } from '../src/workspace/lafea-workbench-mesh-generation-state.js';

const SOURCE_HASH = `sha256:${'c'.repeat(64)}`;
const geometry = plate();
const domain = domainFor(geometry);
const geometryEvidence = geometryEvidenceFor(domain, geometry);
const stage = stageFor(domain, geometryEvidence);
const meshState = createLafeaWorkbenchMeshGenerationState(['LAFEA.3']);

const t6 = meshProfile('T6', 40);
assert.equal(meshState.bindMeshProfile(t6, 'LAFEA.3').changed, true);
const generatedT6 = meshState.generateMesh(stage);
assert.equal(generatedT6.evidence.qualification, 'PASS');
let fields = meshState.fields('LAFEA.3');
assert.equal(fields.retainedAnalysisMeshEvidenceV2.meshHash, generatedT6.evidence.meshHash);
assert.equal(fields.retainedAnalysisMeshCandidateV3.status, 'VALIDATED_PENDING_TRUSTED_AUTHORITY');
assert.equal(fields.retainedAnalysisMeshCandidateV3.workspaceState.custodyState, 'CURRENT_BLOCK');
assert.equal(fields.retainedAnalysisMeshCandidateV3.workspaceState.retainedAuthorityReceiptHash, null);
assert.equal(fields.retainedAnalysisMeshCandidateV3.executionAuthorized, false);
assert.equal(fields.retainedAnalysisMeshCandidateV3.validation.qualification, 'PASS');
assert.equal(fields.retainedAnalysisMeshCandidateV3.gates.highOrder.qualification, 'PASS');

// Rebinding the exact same profile is a no-op and must not discard custody.
const firstCandidateHash = fields.retainedAnalysisMeshCandidateV3.candidateHash;
assert.equal(meshState.bindMeshProfile(t6, 'LAFEA.3').changed, false);
assert.equal(meshState.fields('LAFEA.3').retainedAnalysisMeshCandidateV3.candidateHash, firstCandidateHash);

// A material profile change invalidates both current v2 mesh and parallel v3 candidate.
const q8 = meshProfile('Q8', 40);
assert.equal(meshState.bindMeshProfile(q8, 'LAFEA.3').changed, true);
fields = meshState.fields('LAFEA.3');
assert.equal(fields.retainedAnalysisMeshEvidenceV2, null);
assert.equal(fields.retainedAnalysisMeshCandidateV3, null);

const generatedQ8 = meshState.generateMesh(stage);
assert.equal(generatedQ8.evidence.qualification, 'PASS');
fields = meshState.fields('LAFEA.3');
assert.equal(fields.retainedAnalysisMeshCandidateV3.validation.qualification, 'PASS');
assert.equal(fields.retainedAnalysisMeshCandidateV3.gates.highOrder.qualification, 'PASS');

// Any lifecycle invalidation discards both descendants while keeping the bound profile.
assert.equal(meshState.invalidate('LAFEA.3'), true);
fields = meshState.fields('LAFEA.3');
assert.equal(fields.retainedAnalysisMeshEvidenceV2, null);
assert.equal(fields.retainedAnalysisMeshCandidateV3, null);
assert.equal(fields.retainedAnalysisMeshProfile.semanticHash, q8.semanticHash);

// Clear removes all mesh-generation custody.
meshState.clear('LAFEA.3');
fields = meshState.fields('LAFEA.3');
assert.equal(fields.retainedAnalysisMeshProfile, null);
assert.equal(fields.retainedAnalysisMeshEvidenceV2, null);
assert.equal(fields.retainedAnalysisMeshCandidateV3, null);

console.log(JSON.stringify({
  check: 'lafea-continuum-mesh-v3-workbench-state',
  status: 'PASS',
  existingV2EvidenceStillRetained: true,
  v3CandidateRetainedInParallel: true,
  trustedAuthorityStillRequired: true,
  sameProfileNoOpPreservesCandidate: true,
  profileChangeInvalidatesBothVersions: true,
  lifecycleInvalidatesBothVersions: true,
  runAuthorityChanged: false,
}));

function stageFor(retainedAnalysisDomain, retainedAnalysisGeometryEvidence) {
  return {
    stageId: 'LAFEA.3',
    domainFirstProfileActive: true,
    lifecycleBinding: { status: 'CURRENT' },
    sourceAuthority: { stageId: 'LAFEA.3', sourceHash: SOURCE_HASH },
    retainedAnalysisDomain,
    retainedAnalysisGeometryEvidence,
    analysisDomainProjection: {
      state: 'CURRENT_PASS',
      analysisDomainHash: retainedAnalysisDomain.semanticHash,
      analysisGeometryHash: retainedAnalysisDomain.region.analysisGeometryHash,
    },
    analysisGeometryProjection: {
      state: 'CURRENT_PASS',
      analysisDomainHash: retainedAnalysisDomain.semanticHash,
      analysisGeometryHash: retainedAnalysisGeometryEvidence.analysisGeometryHash,
      evidenceHash: retainedAnalysisGeometryEvidence.semanticHash,
    },
  };
}

function domainFor(geometryValue) {
  return createLafeaContinuumAnalysisDomain({
    schema: LAFEA_CONTINUUM_ANALYSIS_DOMAIN_SCHEMA,
    stageId: 'LAFEA.3', sourceHash: SOURCE_HASH,
    applicationRef: 'LAFEA3/V3/WORKBENCH-STATE-CHECK',
    units: { length: 'mm', force: 'N', stress: 'MPa', temperature: 'C' },
    formulation: 'PLANE_STRESS',
    region: { regionId: 'REGION-1', materialRef: 'MAT-1' },
    physicalCases: [{ caseId: 'L1' }],
    attachments: [
      attachment('FIX', 'RESTRAINT', 'VERTEX', 'V1', { ux: true, uy: true }),
      attachment('LOAD', 'CONCENTRATED_LOAD', 'VERTEX', 'V2', { fx: 1000, fy: 0, unit: 'N' }),
    ],
  }, geometryValue);
}

function geometryEvidenceFor(domainValue, geometryValue) {
  return createLafeaAnalysisGeometryEvidence({
    schema: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_SCHEMA,
    stageId: 'LAFEA.3', sourceHash: SOURCE_HASH,
    analysisDomain: domainValue, geometry: geometryValue,
    producerRef: 'LAFEA3/V3/WORKBENCH-STATE-CHECK/GEOMETRY',
    profileId: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_PROFILE,
  });
}

function plate() {
  return createLafeaAnalysisGeometry({
    schema: LAFEA_ANALYSIS_GEOMETRY_SCHEMA,
    stageId: 'LAFEA.3', geometryId: 'V3-WORKBENCH-PLATE', coordinateSystemId: 'GLOBAL_XY',
    lengthUnit: 'mm', orientationPolicy: LAFEA_ANALYSIS_GEOMETRY_ORIENTATION_POLICY,
    vertices: [
      { vertexId: 'V1', x: 0, y: 0 }, { vertexId: 'V2', x: 120, y: 0 },
      { vertexId: 'V3', x: 120, y: 80 }, { vertexId: 'V4', x: 0, y: 80 },
    ],
    segments: [
      line('S1', 'V1', 'V2'), line('S2', 'V2', 'V3'),
      line('S3', 'V3', 'V4'), line('S4', 'V4', 'V1'),
    ],
    loops: [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3', 'S4'] }],
  });
}

function meshProfile(continuumElement, globalTargetSize) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `LAFEA3-V3-WORKBENCH-${continuumElement}`,
    sourceRevision: 'V3-WORKBENCH-STATE-CHECK', semanticHash: undefined,
    fields: {
      continuumElement,
      shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
      globalTargetSize,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 5, aspectRatioBlock: 10,
      scaledJacobianWarn: 0.6, scaledJacobianBlock: 0.2,
      adaptiveLevels: 3,
    },
  });
}
function attachment(attachmentId, kind, targetType, targetId, payload) {
  return { attachmentId, kind, targetType, targetId, physicalCaseIds: ['L1'], payload };
}
function line(segmentId, startVertexId, endVertexId) {
  return { segmentId, type: 'LINE', startVertexId, endVertexId };
}
