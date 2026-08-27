#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  canonicalProfile,
  defaultProfileFields,
  PROFILE_KINDS,
} from '../src/core/lafea-profile-contract/index.js';
import { createLafeaAnalysisGeometry } from '../src/workspace/lafea-analysis-geometry-contract.js';
import { createLafeaAnalysisGeometryEvidence } from '../src/workspace/lafea-analysis-geometry-evidence.js';
import { createLafeaContinuumAnalysisDomain } from '../src/workspace/lafea-continuum-analysis-domain.js';
import {
  LAFEA_B02D_POLAR_V2_PROFILE_SOURCE_REVISION,
  LAFEA_B02D_POLAR_PROFILE_SOURCE_REVISION,
  b02dProfileIdentity,
  b02dProfileIdentityV2,
  lafeaMeshGenerationConfiguration,
  planLafeaAnalysisMesh,
  produceLafeaAnalysisMeshEvidence,
} from '../src/workspace/lafea-mesh-producer-binding.js';

const stage = stageFor(annulusGeometry());

const v2Profile = meshProfile('T6', 20, 'V2');
const v2Config = lafeaMeshGenerationConfiguration(v2Profile);
const firstV2 = produceLafeaAnalysisMeshEvidence(stage, v2Config);
const secondV2 = produceLafeaAnalysisMeshEvidence(stage, v2Config);

assert.equal(firstV2.planned.generated.strategy, 'B02D_PROBE_STABLE_POLAR_V2');
assert.equal(firstV2.planned.generated.policyId, 'B02D_PROBE_STABLE_POLAR_POLICY_V2');
assert.equal(firstV2.planned.generated.elementFamily, 'T6');
assert.equal(firstV2.planned.intent.targetElementLength, 20);
assert.deepEqual(firstV2.planned.intent.refinementFeatureIds, []);
assert.equal(firstV2.evidence.qualification, 'PASS');
assert.equal(firstV2.evidence.releaseQualified, false);
assert.equal(firstV2.evidence.meshHash, secondV2.evidence.meshHash);
assert.equal(JSON.stringify(firstV2.evidence.mesh), JSON.stringify(secondV2.evidence.mesh));

const v1 = produceLafeaAnalysisMeshEvidence(
  stage,
  lafeaMeshGenerationConfiguration(meshProfile('T6', 20, 'V1')),
);
assert.equal(v1.planned.generated.strategy, 'B02D_PROBE_STABLE_POLAR');
assert.equal(v1.planned.generated.policyId, 'B02D_PROBE_STABLE_POLAR_POLICY_V1');
assert.notEqual(v1.evidence.meshHash, firstV2.evidence.meshHash);

const generic = planLafeaAnalysisMesh(
  stage,
  lafeaMeshGenerationConfiguration(meshProfile('T6', 20, 'GENERIC')),
);
assert.notEqual(generic.generated.strategy, 'B02D_PROBE_STABLE_POLAR_V2');
assert.notEqual(generic.generated.strategy, 'B02D_PROBE_STABLE_POLAR');

assert.throws(
  () => planLafeaAnalysisMesh(
    stage,
    lafeaMeshGenerationConfiguration(meshProfile('T6', 30, 'V2')),
  ),
  (error) => error?.code === 'LAFEA_B02D_POLAR_V2_TARGET_H_NOT_FROZEN_LEVEL',
);

const rectangleStage = stageFor(rectangleGeometry());
assert.throws(
  () => planLafeaAnalysisMesh(
    rectangleStage,
    lafeaMeshGenerationConfiguration(meshProfile('T6', 20, 'V2')),
  ),
  (error) => error?.code === 'LAFEA_B02D_POLAR_GEOMETRY_NOT_QUALIFIED',
);

const withRefinement = {
  ...v2Config,
  refinementFeatureIds: Object.freeze(['FORBIDDEN-FEATURE']),
};
assert.throws(
  () => planLafeaAnalysisMesh(stage, withRefinement),
  (error) => error?.code === 'LAFEA_B02D_POLAR_V2_REFINEMENT_FEATURES_MUST_REMAIN_EMPTY',
);

const wrongRevision = planLafeaAnalysisMesh(
  stage,
  lafeaMeshGenerationConfiguration(profileWith(
    'T6',
    20,
    b02dProfileIdentityV2('T6', 20),
    LAFEA_B02D_POLAR_PROFILE_SOURCE_REVISION,
  )),
);
assert.notEqual(wrongRevision.generated.strategy, 'B02D_PROBE_STABLE_POLAR_V2');

console.log(JSON.stringify({
  schema: 'lafea-b02d-v2-producer-binding-check/v1',
  status: 'PASS',
  v2OptInStrategy: firstV2.planned.generated.strategy,
  v2PolicyId: firstV2.planned.generated.policyId,
  v2MeshHash: firstV2.evidence.meshHash,
  v1StrategyPreserved: v1.planned.generated.strategy,
  v1MeshHash: v1.evidence.meshHash,
  genericFallbackPreserved: true,
  deterministicReplay: true,
  frozenLevelRejection: true,
  geometryRejection: true,
  refinementFeatureRejection: true,
  profileRevisionDoubleKeyed: true,
  responseSolverChanged: false,
  b02NumericalAuthorityGranted: false,
  releaseAuthorityGranted: false,
  trustAuthorityGranted: false,
}, null, 2));

function meshProfile(method, h, mode) {
  if (mode === 'V2') {
    return profileWith(
      method,
      h,
      b02dProfileIdentityV2(method, h),
      LAFEA_B02D_POLAR_V2_PROFILE_SOURCE_REVISION,
    );
  }
  if (mode === 'V1') {
    return profileWith(
      method,
      h,
      b02dProfileIdentity(method, h),
      LAFEA_B02D_POLAR_PROFILE_SOURCE_REVISION,
    );
  }
  return profileWith(method, h, `GENERIC_${method}_${h}`, 'GENERIC-TEST');
}

function profileWith(method, h, profileIdentity, sourceRevision) {
  const fields = defaultProfileFields(PROFILE_KINDS.MESH);
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity,
    sourceRevision,
    semanticHash: undefined,
    fields: {
      ...fields,
      continuumElement: method,
      globalTargetSize: h,
    },
  });
}

function stageFor(geometry) {
  const sourceHash = `sha256:${'8'.repeat(64)}`;
  const domain = createLafeaContinuumAnalysisDomain({
    schema: 'lafea-continuum-analysis-domain/v1',
    stageId: 'LAFEA.3',
    sourceHash,
    applicationRef: 'B02D-V2-BINDING-QUALIFICATION',
    units: { length: 'mm', force: 'N', stress: 'MPa', temperature: 'C' },
    formulation: 'PLANE_STRESS',
    region: { regionId: 'R1', materialRef: 'MAT' },
    physicalCases: [{ caseId: 'LC1' }],
    attachments: [],
  }, geometry);
  const geometryEvidence = createLafeaAnalysisGeometryEvidence({
    schema: 'lafea-analysis-geometry-evidence/v1',
    stageId: 'LAFEA.3',
    sourceHash,
    analysisDomain: domain,
    geometry,
    producerRef: 'B02D-V2-BINDING-QUALIFICATION',
    profileId: 'LAFEA3_DOMAIN_FIRST_GEOMETRY_V1',
  });
  return {
    stageId: 'LAFEA.3',
    sourceAuthority: { stageId: 'LAFEA.3', sourceHash },
    retainedAnalysisGeometryEvidence: geometryEvidence,
    analysisDomainProjection: {
      state: 'CURRENT_PASS',
      analysisDomainHash: domain.semanticHash,
    },
    analysisGeometryProjection: {
      state: 'CURRENT_PASS',
      analysisGeometryHash: geometry.semanticHash,
    },
  };
}

function annulusGeometry() {
  return createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1',
    stageId: 'LAFEA.3',
    geometryId: 'B02D-V2-ANNULUS',
    coordinateSystemId: 'GLOBAL_XY',
    lengthUnit: 'mm',
    orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices: [
      v('OE', 100, 0), v('ON', 0, 100), v('OW', -100, 0), v('OS', 0, -100),
      v('HE', 20, 0), v('HN', 0, 20), v('HW', -20, 0), v('HS', 0, -20),
    ],
    segments: [
      arc('O1', 'OE', 'ON', 100, 'CCW'),
      arc('O2', 'ON', 'OW', 100, 'CCW'),
      arc('O3', 'OW', 'OS', 100, 'CCW'),
      arc('O4', 'OS', 'OE', 100, 'CCW'),
      arc('H1', 'HE', 'HS', 20, 'CW'),
      arc('H2', 'HS', 'HW', 20, 'CW'),
      arc('H3', 'HW', 'HN', 20, 'CW'),
      arc('H4', 'HN', 'HE', 20, 'CW'),
    ],
    loops: [
      { loopId: 'OUTER', role: 'OUTER', segmentIds: ['O1', 'O2', 'O3', 'O4'] },
      { loopId: 'HOLE', role: 'HOLE', segmentIds: ['H1', 'H2', 'H3', 'H4'] },
    ],
  });
}

function rectangleGeometry() {
  return createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1',
    stageId: 'LAFEA.3',
    geometryId: 'RECT',
    coordinateSystemId: 'GLOBAL_XY',
    lengthUnit: 'mm',
    orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices: [v('A', 0, 0), v('B', 100, 0), v('C', 100, 100), v('D', 0, 100)],
    segments: [
      line('S1', 'A', 'B'),
      line('S2', 'B', 'C'),
      line('S3', 'C', 'D'),
      line('S4', 'D', 'A'),
    ],
    loops: [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3', 'S4'] }],
  });
}

function v(vertexId, x, y) {
  return { vertexId, x, y };
}

function line(segmentId, startVertexId, endVertexId) {
  return { segmentId, type: 'LINE', startVertexId, endVertexId };
}

function arc(segmentId, startVertexId, endVertexId, radius, sweep) {
  return {
    segmentId,
    type: 'CIRCULAR_ARC',
    startVertexId,
    endVertexId,
    centerX: 0,
    centerY: 0,
    radius,
    sweep,
  };
}
