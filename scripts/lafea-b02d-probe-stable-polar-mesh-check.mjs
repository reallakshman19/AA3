#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  canonicalProfile,
  defaultProfileFields,
  PROFILE_KINDS,
} from '../src/core/lafea-profile-contract/index.js';
import { lafeaB02dProbeStablePolarPolicy } from '../src/core/lafea-meshing/b02d-probe-stable-polar-mesh.js';
import { createLafeaAnalysisGeometry } from '../src/workspace/lafea-analysis-geometry-contract.js';
import { createLafeaAnalysisGeometryEvidence } from '../src/workspace/lafea-analysis-geometry-evidence.js';
import { createLafeaContinuumAnalysisDomain } from '../src/workspace/lafea-continuum-analysis-domain.js';
import {
  b02dProfileIdentity,
  lafeaCoreMeshProducerCapability,
  lafeaCoreMeshProducerQualification,
  lafeaMeshGenerationConfiguration,
  planLafeaAnalysisMesh,
  produceLafeaAnalysisMeshEvidence,
} from '../src/workspace/lafea-mesh-producer-binding.js';
import { qualifyLafeaHighOrderJacobiansV3 } from '../src/workspace/lafea-high-order-jacobian-qualification-v3.js';
import { qualifyLafeaMeshTopologyV3 } from '../src/workspace/lafea-mesh-topology-qualification-v3.js';

const frozen = JSON.parse(fs.readFileSync('validation/lafea-b02-definitions/B02D-lug-pinhole.json', 'utf8'));
const design = JSON.parse(fs.readFileSync('validation/bucket-01/13-probe-stable-polar-mesh-design.json', 'utf8'));
const policy = lafeaB02dProbeStablePolarPolicy();
assert.ok(frozen.fixedProbeMeshPolicy.designAuthority.startsWith(policy.designId));
assert.equal(policy.designId, design.designId);
assert.deepEqual(policy.geometry, { centerX: 0, centerY: 0, holeRadius: 20, outerRadius: 100 });
assert.deepEqual(policy.radialAxis.anchors.map((row) => row.value), frozen.fixedProbeMeshPolicy.radialAxis.anchors);
assert.deepEqual(policy.radialAxis.protectedBreakpoints, frozen.fixedProbeMeshPolicy.radialAxis.protectedBreakpoints);
assert.equal(policy.radialAxis.targetPhase, frozen.fixedProbeMeshPolicy.radialAxis.targetPhase);
assert.equal(policy.radialAxis.backgroundBaseDivisions, frozen.fixedProbeMeshPolicy.radialAxis.backgroundBaseDivisions);
assert.deepEqual(policy.circumferentialAxis.anchors.map((row) => row.value), frozen.fixedProbeMeshPolicy.circumferentialAxis.anchorsDegrees);
assert.deepEqual(policy.circumferentialAxis.protectedBreakpoints, frozen.fixedProbeMeshPolicy.circumferentialAxis.protectedBreakpointsDegrees);
assert.equal(policy.circumferentialAxis.targetPhase, frozen.fixedProbeMeshPolicy.circumferentialAxis.targetPhase);
assert.equal(policy.circumferentialAxis.backgroundBaseDivisions, frozen.fixedProbeMeshPolicy.circumferentialAxis.backgroundBaseDivisions);
assert.deepEqual(policy.levels.map((row) => row.h), frozen.globalResponseLadder.levels.map((row) => row.h));
assert.deepEqual(frozen.globalResponseLadder.commonRequestPolicy.refinementFeatureIds, []);

const capability = lafeaCoreMeshProducerCapability();
const qualification = lafeaCoreMeshProducerQualification();
assert.equal(capability.producerRevision, 'LAFEA.10.T6Q8.SHELL.POLAR.V10');
assert.equal(qualification.qualificationRevision, 'R11');
assert.equal(qualification.capabilityHash, capability.capabilityHash);

const stage = stageFor(annulusGeometry());
const records = [];
for (const method of ['T3', 'T6', 'Q8']) {
  for (const level of frozen.globalResponseLadder.levels) {
    const profile = meshProfile(method, level.h, true);
    const configuration = lafeaMeshGenerationConfiguration(profile, {
      curvatureToleranceDegrees: level.curvatureToleranceDegrees,
    });
    const first = produceLafeaAnalysisMeshEvidence(stage, configuration);
    const second = produceLafeaAnalysisMeshEvidence(stage, configuration);
    assert.deepEqual(first.planned.intent.refinementFeatureIds, [], `${method}/${level.levelId} frozen request`);
    assert.equal(first.planned.intent.targetElementLength, level.targetElementLength);
    assert.equal(first.planned.intent.growthLimit, frozen.globalResponseLadder.commonRequestPolicy.growthLimit);
    assert.equal(first.evidence.qualification, 'PASS', `${method}/${level.levelId}`);
    assert.equal(first.evidence.releaseQualified, false);
    assert.equal(first.planned.generated.strategy, 'B02D_PROBE_STABLE_POLAR');
    assert.equal(first.planned.generated.policyId, 'B02D_PROBE_STABLE_POLAR_POLICY_V1');
    assert.equal(first.planned.generated.elementFamily, method);
    assert.equal(first.evidence.mesh.elements.every((row) => row.elementType === method), true);
    assert.equal(first.evidence.meshHash, second.evidence.meshHash, `${method}/${level.levelId} determinism`);
    assert.equal(JSON.stringify(first.evidence.mesh), JSON.stringify(second.evidence.mesh));
    assert.equal(qualifyLafeaMeshTopologyV3(first.evidence.mesh).qualification, 'PASS');
    if (method !== 'T3') {
      assert.equal(qualifyLafeaHighOrderJacobiansV3(first.evidence.mesh).qualification, 'PASS');
      assertPhysicalCircularMidsides(first.evidence.mesh, method);
    }
    const map = first.planned.generated.featureMapping;
    assert.equal(map.radialStart, 20);
    assert.equal(map.radialEnd, 60);
    assert.equal(map.loadAngleDegrees, 0);
    assert.equal(map.restraintAngleDegrees, 180);
    assert.equal(map.exactEndpointNodes, true);
    assert.equal(map.physicalCoordinateSelection, true);
    assert.equal(map.indexScaledSelectionUsed, false);
    assertPath(first.evidence.mesh, map.loadNodeIds, 0);
    assertPath(first.evidence.mesh, map.restraintNodeIds, 180);
    records.push({
      method,
      levelId: level.levelId,
      h: level.h,
      nodes: first.evidence.mesh.nodes.length,
      elements: first.evidence.mesh.elements.length,
      meshHash: first.evidence.meshHash,
      minScaledJacobian: first.evidence.quality.minimumScaledJacobian,
      maxAspectRatio: first.evidence.quality.maximumAspectRatio,
    });
  }
}

assert.throws(
  () => planLafeaAnalysisMesh(stage, lafeaMeshGenerationConfiguration(meshProfile('T6', 30, true))),
  (error) => error?.code === 'LAFEA_B02D_POLAR_TARGET_H_NOT_FROZEN_LEVEL',
);
const rectangleStage = stageFor(rectangleGeometry());
assert.throws(
  () => planLafeaAnalysisMesh(rectangleStage, lafeaMeshGenerationConfiguration(meshProfile('T6', 20, true))),
  (error) => error?.code === 'LAFEA_B02D_POLAR_GEOMETRY_NOT_QUALIFIED',
);
const genericAnnulus = planLafeaAnalysisMesh(stage, lafeaMeshGenerationConfiguration(meshProfile('T6', 20, false)));
assert.notEqual(genericAnnulus.generated.strategy, 'B02D_PROBE_STABLE_POLAR');

console.log(JSON.stringify({
  schema: 'lafea-b02d-probe-stable-polar-mesh-qualification/v1',
  status: 'PASS',
  producerRevision: capability.producerRevision,
  qualificationRevision: qualification.qualificationRevision,
  policyId: policy.policyId,
  frozenDefinitionsMatched: true,
  frozenRefinementFeatureIdsRemainEmpty: true,
  strategySelectedByQualifiedProfileIdentity: true,
  registeredEvidencePath: true,
  t3T6Q8AllFourFrozenLevels: true,
  deterministicReplay: true,
  topologyQualified: true,
  fullParentHighOrderJacobianQualified: true,
  exactPhysicalFeatureWindows: true,
  misuseFailsClosed: true,
  records,
  releaseAuthorityGranted: false,
}, null, 2));

function stageFor(geometry) {
  const sourceHash = `sha256:${'7'.repeat(64)}`;
  const domain = createLafeaContinuumAnalysisDomain({
    schema: 'lafea-continuum-analysis-domain/v1', stageId: 'LAFEA.3', sourceHash,
    applicationRef: 'B02D-MESH-QUALIFICATION',
    units: { length: 'mm', force: 'N', stress: 'MPa', temperature: 'C' },
    formulation: 'PLANE_STRESS', region: { regionId: 'R1', materialRef: 'MAT' },
    physicalCases: [{ caseId: 'LC1' }], attachments: [],
  }, geometry);
  const geometryEvidence = createLafeaAnalysisGeometryEvidence({
    schema: 'lafea-analysis-geometry-evidence/v1', stageId: 'LAFEA.3', sourceHash,
    analysisDomain: domain, geometry, producerRef: 'B02D-MESH-QUALIFICATION',
    profileId: 'LAFEA3_DOMAIN_FIRST_GEOMETRY_V1',
  });
  return {
    stageId: 'LAFEA.3', sourceAuthority: { stageId: 'LAFEA.3', sourceHash },
    retainedAnalysisGeometryEvidence: geometryEvidence,
    analysisDomainProjection: { state: 'CURRENT_PASS', analysisDomainHash: domain.semanticHash },
    analysisGeometryProjection: { state: 'CURRENT_PASS', analysisGeometryHash: geometry.semanticHash },
  };
}
function meshProfile(method, h, polar) {
  const fields = defaultProfileFields(PROFILE_KINDS.MESH);
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: polar ? b02dProfileIdentity(method, h) : `GENERIC_${method}_${h}`,
    sourceRevision: polar ? 'B02D-FROZEN-POLAR-V1' : 'GENERIC-TEST',
    semanticHash: undefined,
    fields: { ...fields, continuumElement: method, globalTargetSize: h },
  });
}
function annulusGeometry() {
  return createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1', stageId: 'LAFEA.3', geometryId: 'B02D-ANNULUS',
    coordinateSystemId: 'GLOBAL_XY', lengthUnit: 'mm', orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices: [v('OE',100,0),v('ON',0,100),v('OW',-100,0),v('OS',0,-100),v('HE',20,0),v('HN',0,20),v('HW',-20,0),v('HS',0,-20)],
    segments: [arc('O1','OE','ON',100,'CCW'),arc('O2','ON','OW',100,'CCW'),arc('O3','OW','OS',100,'CCW'),arc('O4','OS','OE',100,'CCW'),arc('H1','HE','HS',20,'CW'),arc('H2','HS','HW',20,'CW'),arc('H3','HW','HN',20,'CW'),arc('H4','HN','HE',20,'CW')],
    loops: [{loopId:'OUTER',role:'OUTER',segmentIds:['O1','O2','O3','O4']},{loopId:'HOLE',role:'HOLE',segmentIds:['H1','H2','H3','H4']}],
  });
}
function rectangleGeometry() {
  return createLafeaAnalysisGeometry({
    schema:'lafea-analysis-geometry/v1',stageId:'LAFEA.3',geometryId:'RECT',coordinateSystemId:'GLOBAL_XY',lengthUnit:'mm',orientationPolicy:'OUTER_CCW_HOLES_CW_V1',
    vertices:[v('A',0,0),v('B',100,0),v('C',100,100),v('D',0,100)],
    segments:[line('S1','A','B'),line('S2','B','C'),line('S3','C','D'),line('S4','D','A')],loops:[{loopId:'OUTER',role:'OUTER',segmentIds:['S1','S2','S3','S4']}],
  });
}
function assertPath(mesh, ids, angleDegrees) {
  const nodes = new Map(mesh.nodes.map((row) => [row.nodeId,row])); const theta = angleDegrees*Math.PI/180; const ux=Math.cos(theta),uy=Math.sin(theta);
  const radii=ids.map((id)=>{const node=nodes.get(id);assert.ok(node,id);const cross=node.x*uy-node.y*ux;assert.ok(Math.abs(cross)<=1e-9*Math.max(1,Math.hypot(node.x,node.y)));return node.x*ux+node.y*uy;});
  assert.ok(Math.abs(radii[0]-20)<=1e-9); assert.ok(Math.abs(radii.at(-1)-60)<=1e-9); for(let i=1;i<radii.length;i+=1)assert.ok(radii[i]>radii[i-1]);
}
function assertPhysicalCircularMidsides(mesh, method) {
  const nodes=new Map(mesh.nodes.map((row)=>[row.nodeId,row]));let count=0;
  for(const element of mesh.elements){const corners=element.nodeIds.slice(0,method==='Q8'?4:3);const mids=element.nodeIds.slice(method==='Q8'?4:3);const edges=method==='Q8'?[[0,1,0],[1,2,1],[2,3,2],[3,0,3]]:[[0,1,0],[1,2,1],[2,0,2]];for(const[ia,ib,im]of edges){const a=nodes.get(corners[ia]),b=nodes.get(corners[ib]),m=nodes.get(mids[im]);const ra=Math.hypot(a.x,a.y),rb=Math.hypot(b.x,b.y);if(Math.abs(ra-rb)<=1e-10&&(Math.abs(ra-20)<=1e-10||Math.abs(ra-100)<=1e-10)){assert.ok(Math.abs(Math.hypot(m.x,m.y)-ra)<=1e-9);count+=1;}}}assert.ok(count>0);
}
function v(vertexId,x,y){return{vertexId,x,y};}
function line(segmentId,startVertexId,endVertexId){return{segmentId,type:'LINE',startVertexId,endVertexId};}
function arc(segmentId,startVertexId,endVertexId,radius,sweep){return{segmentId,type:'CIRCULAR_ARC',startVertexId,endVertexId,centerX:0,centerY:0,radius,sweep};}
