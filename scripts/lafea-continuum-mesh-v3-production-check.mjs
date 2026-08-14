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
import { buildLafeaContinuumMeshCandidateV3 } from '../src/workspace/lafea-continuum-mesh-v3-production.js';
import {
  lafeaMeshGenerationConfiguration,
  produceLafeaAnalysisMeshEvidence,
} from '../src/workspace/lafea-mesh-producer-binding.js';
import {
  createLafeaMeshWorkspaceStateV3,
  LAFEA_MESH_WORKSPACE_STATE_V3_SCHEMA,
  LAFEA_MESH_WORKSPACE_AUTHORITY_VERSION,
} from '../src/workspace/lafea-mesh-workspace-v3.js';

const SOURCE_HASH = `sha256:${'b'.repeat(64)}`;
const straight = plate(100, 100);
const straightDomain = domainFor(straight);
const straightEvidence = geometryEvidenceFor(straightDomain, straight);

for (const [family, target] of [['T3', 50], ['T6', 50], ['Q8', 50]]) {
  const profile = meshProfile(family, target);
  const stage = stageFor(straightDomain, straightEvidence);
  const produced = produceLafeaAnalysisMeshEvidence(
    stage,
    lafeaMeshGenerationConfiguration(profile),
  );
  assert.equal(produced.evidence.qualification, 'PASS', family);
  const candidate = buildLafeaContinuumMeshCandidateV3({ stage, meshProfile: profile, produced });
  assert.equal(candidate.validation.qualification, 'PASS', family);
  assert.equal(candidate.status, 'VALIDATED_PENDING_TRUSTED_AUTHORITY', family);
  assert.equal(candidate.workspaceState.custodyState, 'CURRENT_BLOCK', family);
  assert.equal(candidate.workspaceState.retainedAuthorityReceiptHash, null, family);
  assert.equal(candidate.artifactLifecycle.state, 'RETAINED', family);
  assert.equal(candidate.evidence.status, 'QUALIFIED_PENDING_TRUSTED_AUTHORITY', family);
  assert.equal(candidate.engineeringAuthority, false, family);
  assert.equal(candidate.executionAuthorized, false, family);
  assert.equal(candidate.gates.topology.qualification, 'PASS', family);
  assert.equal(candidate.gates.domain.evidence.qualification, 'PASS', family);
  assert.ok(
    Math.abs(candidate.gates.domain.evidence.coveredDomainMeasure - 10000) <= 1e-5,
    family,
  );
  if (family === 'T6' || family === 'Q8') {
    assert.equal(candidate.gates.highOrder.qualification, 'PASS', family);
    assert.ok(candidate.validation.gates.some((gate) => gate.gateId === 'HIGH_ORDER_MAPPING'));
  } else {
    assert.equal(candidate.validation.gates.some((gate) => gate.gateId === 'HIGH_ORDER_MAPPING'), false);
  }
  const replay = buildLafeaContinuumMeshCandidateV3({ stage, meshProfile: profile, produced });
  assert.deepEqual(replay, candidate, `${family} v3 candidate must replay deterministically`);

  const { workspaceStateHash: ignored, ...stateInput } = candidate.workspaceState;
  assert.throws(
    () => createLafeaMeshWorkspaceStateV3({
      ...stateInput,
      schema: LAFEA_MESH_WORKSPACE_STATE_V3_SCHEMA,
      authorityVersion: LAFEA_MESH_WORKSPACE_AUTHORITY_VERSION,
      custodyState: 'CURRENT_PASS',
      retainedAuthorityReceiptHash: null,
    }),
    (error) => error?.code === 'LAFEA_MESH_WORKSPACE_V3_CURRENT_PASS_AUTHORITY_RECEIPT_REQUIRED',
    `${family} must not self-promote without trusted receipt`,
  );
}

const curved = filletedPlate();
const curvedDomain = domainFor(curved);
const curvedEvidence = geometryEvidenceFor(curvedDomain, curved);
const curvedStage = stageFor(curvedDomain, curvedEvidence);
const curvedProfile = meshProfile('T6', 15);
const curvedProduced = produceLafeaAnalysisMeshEvidence(
  curvedStage,
  lafeaMeshGenerationConfiguration(curvedProfile),
);
assert.equal(curvedProduced.evidence.qualification, 'PASS');
const curvedCandidate = buildLafeaContinuumMeshCandidateV3({
  stage: curvedStage,
  meshProfile: curvedProfile,
  produced: curvedProduced,
});
assert.equal(curvedCandidate.validation.qualification, 'BLOCK');
assert.equal(curvedCandidate.status, 'BLOCKED_VALIDATION');
assert.equal(curvedCandidate.artifactLifecycle.state, 'QUARANTINED');
assert.equal(curvedCandidate.retentionCommitHash, null);
assert.equal(
  curvedCandidate.gates.domain.code,
  'LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_CURVED_BOUNDARY_NOT_QUALIFIED',
);

console.log(JSON.stringify({
  check: 'lafea-continuum-mesh-v3-production',
  status: 'PASS',
  straightBoundaryFamilies: ['T3', 'T6', 'Q8'],
  existingV2ProducerReused: true,
  semanticDependencyBound: true,
  globalTopologyBound: true,
  domainAreaAndBoundaryProofBound: true,
  highOrderFullDomainJacobianBound: true,
  validationBundleBound: true,
  quarantineLifecycleBound: true,
  retentionCasBound: true,
  trustedAuthorityStillRequired: true,
  curvedBoundaryFailsClosedWithoutChangingV2Qualification: true,
}));

function stageFor(domain, geometryEvidence) {
  return {
    stageId: 'LAFEA.3',
    domainFirstProfileActive: true,
    sourceAuthority: { stageId: 'LAFEA.3', sourceHash: SOURCE_HASH },
    retainedAnalysisDomain: domain,
    retainedAnalysisGeometryEvidence: geometryEvidence,
    analysisDomainProjection: { state: 'CURRENT_PASS', analysisDomainHash: domain.semanticHash },
    analysisGeometryProjection: {
      state: 'CURRENT_PASS',
      analysisDomainHash: domain.semanticHash,
      analysisGeometryHash: geometryEvidence.analysisGeometryHash,
      evidenceHash: geometryEvidence.semanticHash,
    },
  };
}

function domainFor(geometry) {
  return createLafeaContinuumAnalysisDomain({
    schema: LAFEA_CONTINUUM_ANALYSIS_DOMAIN_SCHEMA,
    stageId: 'LAFEA.3',
    sourceHash: SOURCE_HASH,
    applicationRef: 'LAFEA3/V3/VERTICAL-SLICE',
    units: { length: 'mm', force: 'N', stress: 'MPa', temperature: 'C' },
    formulation: 'PLANE_STRESS',
    region: { regionId: 'REGION-1', materialRef: 'MAT-1' },
    physicalCases: [{ caseId: 'L1' }],
    attachments: [
      attachment('FIX', 'RESTRAINT', 'VERTEX', geometry.vertices[0].vertexId, { ux: true, uy: true }),
      attachment('LOAD', 'CONCENTRATED_LOAD', 'VERTEX', geometry.vertices[1].vertexId, {
        fx: 1000, fy: 0, unit: 'N',
      }),
    ],
  }, geometry);
}

function geometryEvidenceFor(domain, geometry) {
  return createLafeaAnalysisGeometryEvidence({
    schema: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_SCHEMA,
    stageId: 'LAFEA.3',
    sourceHash: SOURCE_HASH,
    analysisDomain: domain,
    geometry,
    producerRef: 'LAFEA3/V3/VERTICAL-SLICE/GEOMETRY',
    profileId: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_PROFILE,
  });
}

function plate(width, height) {
  return createLafeaAnalysisGeometry({
    schema: LAFEA_ANALYSIS_GEOMETRY_SCHEMA,
    stageId: 'LAFEA.3', geometryId: 'V3-PLATE', coordinateSystemId: 'GLOBAL_XY',
    lengthUnit: 'mm', orientationPolicy: LAFEA_ANALYSIS_GEOMETRY_ORIENTATION_POLICY,
    vertices: [
      { vertexId: 'V1', x: 0, y: 0 },
      { vertexId: 'V2', x: width, y: 0 },
      { vertexId: 'V3', x: width, y: height },
      { vertexId: 'V4', x: 0, y: height },
    ],
    segments: [
      line('S1', 'V1', 'V2'), line('S2', 'V2', 'V3'),
      line('S3', 'V3', 'V4'), line('S4', 'V4', 'V1'),
    ],
    loops: [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3', 'S4'] }],
  });
}

function filletedPlate() {
  return createLafeaAnalysisGeometry({
    schema: LAFEA_ANALYSIS_GEOMETRY_SCHEMA,
    stageId: 'LAFEA.3', geometryId: 'V3-FILLET', coordinateSystemId: 'GLOBAL_XY',
    lengthUnit: 'mm', orientationPolicy: LAFEA_ANALYSIS_GEOMETRY_ORIENTATION_POLICY,
    vertices: [
      { vertexId: 'V1', x: 0, y: 0 }, { vertexId: 'V2', x: 200, y: 0 },
      { vertexId: 'VF1', x: 200, y: 100 }, { vertexId: 'VF2', x: 180, y: 120 },
      { vertexId: 'V4', x: 0, y: 120 },
    ],
    segments: [
      line('S1', 'V1', 'V2'), line('S2', 'V2', 'VF1'),
      arc('SF', 'VF1', 'VF2', 180, 100, 20, 'CCW'),
      line('S3', 'VF2', 'V4'), line('S4', 'V4', 'V1'),
    ],
    loops: [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'SF', 'S3', 'S4'] }],
  });
}

function meshProfile(continuumElement, globalTargetSize) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `LAFEA3-V3-${continuumElement}-${globalTargetSize}`,
    sourceRevision: 'V3-VERTICAL-SLICE',
    semanticHash: undefined,
    fields: {
      continuumElement,
      shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
      globalTargetSize,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 5,
      aspectRatioBlock: 10,
      scaledJacobianWarn: 0.6,
      scaledJacobianBlock: 0.2,
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
function arc(segmentId, startVertexId, endVertexId, centerX, centerY, radius, sweep) {
  return { segmentId, type: 'CIRCULAR_ARC', startVertexId, endVertexId, centerX, centerY, radius, sweep };
}
