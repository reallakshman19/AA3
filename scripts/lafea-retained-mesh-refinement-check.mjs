#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  canonicalProfile,
  defaultProfileFields,
  PROFILE_KINDS,
} from '../src/core/lafea-profile-contract/index.js';
import { createLafeaAnalysisGeometry } from '../src/workspace/lafea-analysis-geometry-contract.js';
import { createLafeaAnalysisGeometryEvidence } from '../src/workspace/lafea-analysis-geometry-evidence.js';
import { createLafeaContinuumAnalysisDomain } from '../src/workspace/lafea-continuum-analysis-domain.js';
import { buildLafeaDiscretizationViewModel } from '../src/workspace/lafea-discretization-view-model.js';
import { buildLafeaDomainFirstMeshCustodyProjection } from '../src/workspace/lafea-domain-first-mesh-custody.js';
import { lafeaMeshCapabilities } from '../src/workspace/lafea-mesh-capabilities.js';
import {
  LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_SCHEMA,
  createLafeaRetainedMeshRefinementCommand,
} from '../src/workspace/lafea-mesh-refinement-command.js';
import {
  lafeaMeshGenerationConfiguration,
  produceLafeaAnalysisMeshEvidence,
} from '../src/workspace/lafea-mesh-producer-binding.js';
import {
  planLafeaRetainedMeshRefinement,
  produceLafeaRetainedMeshRefinement,
} from '../src/workspace/lafea-retained-mesh-refinement.js';
import { createLafeaWorkbenchMeshGenerationState } from '../src/workspace/lafea-workbench-mesh-generation-state.js';

const SOURCE_HASH = `sha256:${'c'.repeat(64)}`;
const geometry = plate(200, 120);
const stage = stageFor(geometry);
const t6Profile = meshProfileFor('T6', 30);
const parent = produceLafeaAnalysisMeshEvidence(
  stage,
  lafeaMeshGenerationConfiguration(t6Profile),
).evidence;
assert.equal(parent.qualification, 'PASS');

const capabilities = lafeaMeshCapabilities('LAFEA.3');
assert.equal(capabilities.manualRefinementQualified, true);
assert.deepEqual(capabilities.localRefinementElementFamilies, ['T3', 'T6']);
assert.ok(capabilities.reasons.includes('GOVERNED_RETAINED_MESH_REFINEMENT_AVAILABLE'));

const targetElementId = nearestElement(parent.mesh, { x: 100, y: 60 });
const command = createLafeaRetainedMeshRefinementCommand({
  schema: LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_SCHEMA,
  commandId: 'P2-9-CENTRAL-T6-REFINEMENT',
  stageId: 'LAFEA.3',
  parentMeshArtifactHash: parent.artifactHash,
  parentMeshHash: parent.meshHash,
  kind: 'TARGET_LENGTH',
  targetType: 'ELEMENT',
  targetIds: [targetElementId],
  targetElementLength: 15,
  lengthUnit: 'mm',
  reason: 'P2-9 retained-mesh local refinement qualification',
});
assert.equal(command.status, 'READY');
assert.equal(command.executionAuthorized, true);

const plan = planLafeaRetainedMeshRefinement({
  stage, meshProfile: t6Profile, parentEvidence: parent, command,
});
assert.equal(plan.generationMode, 'REFINEMENT_REGENERATION');
assert.equal(plan.parentMeshArtifactHash, parent.artifactHash);
assert.equal(plan.parentMeshHash, parent.meshHash);
assert.equal(plan.targetType, 'ELEMENT');
assert.deepEqual(plan.targetIds, [targetElementId]);
assert.equal(plan.targetElementLength, 15);
assert.equal(plan.globalTargetElementLength, 30);
assert.equal(plan.elementFamily, 'T6');

const refined = produceLafeaRetainedMeshRefinement({
  stage, meshProfile: t6Profile, parentEvidence: parent, command,
});
assert.equal(refined.qualification, 'PASS');
assert.equal(refined.evidence.quality.blockingElementIds.length, 0);
assert.equal(refined.evidence.authority.planHash, plan.planHash);
assert.equal(refined.evidence.sourceHash, parent.sourceHash);
assert.equal(refined.evidence.analysisDomainHash, parent.analysisDomainHash);
assert.equal(refined.evidence.analysisGeometryHash, parent.analysisGeometryHash);
assert.equal(refined.evidence.meshProfileHash, parent.meshProfileHash);
assert.notEqual(refined.evidence.meshHash, parent.meshHash);
assert.ok(refined.localPointCount > 0);
assert.ok(refined.evidence.mesh.nodes.length > parent.mesh.nodes.length);
assert.ok(refined.evidence.mesh.elements.length > parent.mesh.elements.length);

const target = plan.targets[0];
const parentLocal = localCornerCount(parent.mesh, target, plan.influenceRadius);
const childLocal = localCornerCount(refined.evidence.mesh, target, plan.influenceRadius);
assert.ok(childLocal > parentLocal, `Expected local corner density to increase: ${parentLocal} -> ${childLocal}`);

// Deterministic replay must be byte-identical at mesh/evidence level.
const replay = produceLafeaRetainedMeshRefinement({
  stage, meshProfile: t6Profile, parentEvidence: parent, command,
});
assert.equal(replay.plan.planHash, refined.plan.planHash);
assert.equal(replay.output.outputHash, refined.output.outputHash);
assert.equal(replay.evidence.meshHash, refined.evidence.meshHash);
assert.equal(replay.evidence.artifactHash, refined.evidence.artifactHash);
assert.equal(JSON.stringify(replay.evidence.mesh), JSON.stringify(refined.evidence.mesh));

// Workbench custody replacement is atomic and derives parent hashes internally.
const custodyState = createLafeaWorkbenchMeshGenerationState(['LAFEA.3']);
custodyState.bindMeshProfile(t6Profile, 'LAFEA.3');
custodyState.recoverEvidence(parent, 'LAFEA.3');
const retainedResult = custodyState.refineMesh(stage, {
  commandId: 'P2-9-CUSTODY-REFINEMENT',
  kind: 'TARGET_LENGTH',
  targetType: 'ELEMENT',
  targetIds: [targetElementId],
  targetElementLength: 15,
  lengthUnit: 'mm',
  reason: 'P2-9 atomic custody qualification',
});
assert.equal(retainedResult.parentEvidence.artifactHash, parent.artifactHash);
assert.equal(retainedResult.command.parentMeshArtifactHash, parent.artifactHash);
assert.equal(retainedResult.command.parentMeshHash, parent.meshHash);
assert.equal(custodyState.selectEvidence('LAFEA.3').artifactHash, retainedResult.evidence.artifactHash);
assert.equal(custodyState.selectPlan('LAFEA.3').generationMode, 'REFINEMENT_REGENERATION');
assert.equal(custodyState.selectPlan('LAFEA.3').parentMeshHash, parent.meshHash);

const rejectedState = createLafeaWorkbenchMeshGenerationState(['LAFEA.3']);
rejectedState.bindMeshProfile(t6Profile, 'LAFEA.3');
rejectedState.recoverEvidence(parent, 'LAFEA.3');
assert.throws(
  () => rejectedState.refineMesh(stage, {
    commandId: 'P2-9-ATOMIC-REJECTION', kind: 'TARGET_LENGTH', targetType: 'ELEMENT',
    targetIds: ['E999999'], targetElementLength: 15, lengthUnit: 'mm',
  }),
  (error) => error?.code === 'LAFEA_RETAINED_MESH_REFINEMENT_TARGET_ELEMENT_NOT_FOUND',
);
assert.equal(rejectedState.selectEvidence('LAFEA.3').artifactHash, parent.artifactHash);
assert.equal(rejectedState.selectEvidence('LAFEA.3').meshHash, parent.meshHash);

const staleCommand = createLafeaRetainedMeshRefinementCommand({
  schema: LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_SCHEMA,
  commandId: 'P2-9-STALE-PARENT',
  stageId: 'LAFEA.3',
  parentMeshArtifactHash: `sha256:${'d'.repeat(64)}`,
  parentMeshHash: parent.meshHash,
  kind: 'TARGET_LENGTH', targetType: 'ELEMENT', targetIds: [targetElementId],
  targetElementLength: 15, lengthUnit: 'mm', reason: 'adversarial stale parent',
});
assert.throws(
  () => planLafeaRetainedMeshRefinement({ stage, meshProfile: t6Profile, parentEvidence: parent, command: staleCommand }),
  (error) => error?.code === 'LAFEA_RETAINED_MESH_REFINEMENT_PARENT_MESH_STALE',
);

const missingTarget = createLafeaRetainedMeshRefinementCommand({
  schema: LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_SCHEMA,
  commandId: 'P2-9-MISSING-TARGET', stageId: 'LAFEA.3',
  parentMeshArtifactHash: parent.artifactHash, parentMeshHash: parent.meshHash,
  kind: 'TARGET_LENGTH', targetType: 'ELEMENT', targetIds: ['E999999'],
  targetElementLength: 15, lengthUnit: 'mm', reason: 'adversarial unknown target',
});
assert.throws(
  () => planLafeaRetainedMeshRefinement({ stage, meshProfile: t6Profile, parentEvidence: parent, command: missingTarget }),
  (error) => error?.code === 'LAFEA_RETAINED_MESH_REFINEMENT_TARGET_ELEMENT_NOT_FOUND',
);

const tooFine = createLafeaRetainedMeshRefinementCommand({
  schema: LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_SCHEMA,
  commandId: 'P2-9-BELOW-RATIO', stageId: 'LAFEA.3',
  parentMeshArtifactHash: parent.artifactHash, parentMeshHash: parent.meshHash,
  kind: 'TARGET_LENGTH', targetType: 'ELEMENT', targetIds: [targetElementId],
  targetElementLength: 7, lengthUnit: 'mm', reason: 'adversarial unqualified size ratio',
});
assert.throws(
  () => planLafeaRetainedMeshRefinement({ stage, meshProfile: t6Profile, parentEvidence: parent, command: tooFine }),
  (error) => error?.code === 'LAFEA_RETAINED_MESH_REFINEMENT_TARGET_RATIO_BELOW_QUALIFIED_LIMIT',
);

// Q8 remains explicitly outside local-refinement authority.
const q8Profile = meshProfileFor('Q8', 30);
const q8Parent = produceLafeaAnalysisMeshEvidence(
  stage,
  lafeaMeshGenerationConfiguration(q8Profile),
).evidence;
const q8Command = createLafeaRetainedMeshRefinementCommand({
  schema: LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_SCHEMA,
  commandId: 'P2-9-Q8-FAIL-CLOSED', stageId: 'LAFEA.3',
  parentMeshArtifactHash: q8Parent.artifactHash, parentMeshHash: q8Parent.meshHash,
  kind: 'TARGET_LENGTH', targetType: 'ELEMENT', targetIds: [q8Parent.mesh.elements[0].elementId],
  targetElementLength: 15, lengthUnit: 'mm', reason: 'prove Q8 is not falsely qualified',
});
assert.throws(
  () => planLafeaRetainedMeshRefinement({ stage, meshProfile: q8Profile, parentEvidence: q8Parent, command: q8Command }),
  (error) => error?.code === 'LAFEA_RETAINED_MESH_REFINEMENT_Q8_NOT_QUALIFIED',
);

// Discretization exposes refinement only for current qualified T3/T6 evidence.
const refinedStage = stageWithEvidence(
  stage,
  t6Profile,
  refined.evidence,
  custodyState.selectPlan('LAFEA.3'),
);
const refinedView = buildLafeaDiscretizationViewModel(refinedStage);
assert.equal(refinedView.actions.manualRefinementEnabled, true);
assert.equal(refinedView.actions.canRefineMesh, true);
assert.equal(refinedView.evidence.elementFamily, 'T6');
assert.equal(refinedView.generation.lengthUnit, 'mm');
assert.deepEqual(refinedView.generation.localRefinementElementFamilies, ['T3', 'T6']);
assert.equal(
  refinedView.configuration.modes.find((row) => row.mode === 'MANUAL_REFINEMENT')?.enabled,
  true,
);

const q8View = buildLafeaDiscretizationViewModel(stageWithEvidence(stage, q8Profile, q8Parent, null));
assert.equal(q8View.actions.canRefineMesh, false);
assert.equal(
  q8View.configuration.modes.find((row) => row.mode === 'MANUAL_REFINEMENT')?.reason,
  'Q8_LOCAL_REFINEMENT_NOT_QUALIFIED',
);

// Source guards prove the visible surface reaches the governed controller/API.
const generationPanelSource = fs.readFileSync(
  'src/workspace/lafea-discretization-generation-panel.js', 'utf8',
);
const contentSource = fs.readFileSync('src/workspace/lafea-workbench-content.js', 'utf8');
const controllerSource = fs.readFileSync('src/workspace/lafea-workbench-controller.js', 'utf8');
const apiSource = fs.readFileSync('src/workspace/lafea-workbench-orchestrator-api.js', 'utf8');
assert.match(generationPanelSource, /data\.role = 'lafea-refinement-submit'|dataset\.role = 'lafea-refinement-submit'/u);
assert.match(generationPanelSource, /handlers\.onRefineMesh/u);
assert.match(generationPanelSource, /Q8 local refinement is not qualified/u);
assert.match(contentSource, /onRefineMesh: options\.handlers\.onRefineMesh/u);
assert.match(controllerSource, /onRefineMesh: \(request\) => this\.refineAnalysisMesh\(request\)/u);
assert.match(apiSource, /refineAnalysisMesh: c\.refineAnalysisMesh/u);

console.log(JSON.stringify({
  schema: 'lafea-retained-mesh-refinement-check/v1',
  status: 'PASS',
  parentMeshHash: parent.meshHash,
  refinedMeshHash: refined.evidence.meshHash,
  parentNodes: parent.mesh.nodes.length,
  refinedNodes: refined.evidence.mesh.nodes.length,
  parentElements: parent.mesh.elements.length,
  refinedElements: refined.evidence.mesh.elements.length,
  localPointCount: refined.localPointCount,
  targetElementId,
  parentLocalCorners: parentLocal,
  refinedLocalCorners: childLocal,
  atomicCustodyReplacement: true,
  atomicRejectionPreservesParent: true,
  discretizationRouteQualified: true,
  minimumQualifiedLocalTargetRatio: 0.25,
  q8RefinementQualified: false,
}, null, 2));

function plate(width, height) {
  return createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1',
    stageId: 'LAFEA.3', geometryId: 'P2-9-PLATE', coordinateSystemId: 'GLOBAL',
    lengthUnit: 'mm', orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices: [
      { vertexId: 'V1', x: 0, y: 0 }, { vertexId: 'V2', x: width, y: 0 },
      { vertexId: 'V3', x: width, y: height }, { vertexId: 'V4', x: 0, y: height },
    ],
    segments: [
      line('S1', 'V1', 'V2'), line('S2', 'V2', 'V3'),
      line('S3', 'V3', 'V4'), line('S4', 'V4', 'V1'),
    ],
    loops: [{ loopId: 'L_OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3', 'S4'] }],
  });
}
function line(segmentId, startVertexId, endVertexId) {
  return { segmentId, type: 'LINE', startVertexId, endVertexId };
}
function meshProfileFor(continuumElement, globalTargetSize) {
  const defaults = defaultProfileFields(PROFILE_KINDS.MESH);
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `P2_9_${continuumElement}_${globalTargetSize}`,
    sourceRevision: 'R6', semanticHash: undefined,
    fields: {
      ...defaults,
      continuumElement,
      shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
      globalTargetSize,
    },
  });
}
function stageFor(geometryValue) {
  const domain = createLafeaContinuumAnalysisDomain({
    schema: 'lafea-continuum-analysis-domain/v1',
    stageId: 'LAFEA.3', sourceHash: SOURCE_HASH, applicationRef: 'P2-9',
    units: { length: 'mm', force: 'N', stress: 'MPa', temperature: 'C' },
    formulation: 'PLANE_STRESS',
    region: { regionId: 'R1', materialRef: 'MAT_A' },
    physicalCases: [{ caseId: 'C1' }], attachments: [],
  }, geometryValue);
  const geometryEvidence = createLafeaAnalysisGeometryEvidence({
    schema: 'lafea-analysis-geometry-evidence/v1', stageId: 'LAFEA.3',
    sourceHash: SOURCE_HASH, analysisDomain: domain, geometry: geometryValue,
    producerRef: 'P2-9-GEOMETRY', profileId: 'LAFEA3_DOMAIN_FIRST_GEOMETRY_V1',
  });
  return {
    stageId: 'LAFEA.3', domainFirstProfileActive: true,
    sourceAuthority: { stageId: 'LAFEA.3', sourceHash: SOURCE_HASH },
    retainedAnalysisGeometryEvidence: geometryEvidence,
    analysisDomainProjection: { state: 'CURRENT_PASS', analysisDomainHash: domain.semanticHash },
    analysisGeometryProjection: { state: 'CURRENT_PASS', analysisGeometryHash: geometryValue.semanticHash },
  };
}
function stageWithEvidence(baseStage, profile, evidence, lastPlan) {
  const custody = buildLafeaDomainFirstMeshCustodyProjection(baseStage, evidence);
  return {
    ...baseStage,
    retainedAnalysisMeshProfile: profile,
    analysisMeshProfileHash: profile.semanticHash,
    retainedAnalysisMeshEvidenceV2: evidence,
    lastAnalysisMeshPlan: lastPlan,
    analysisMeshCustodyProjection: custody,
  };
}
function nearestElement(mesh, point) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  return mesh.elements.map((element) => {
    const corners = element.nodeIds.slice(0, 3).map((id) => nodeById.get(id));
    const centroid = {
      x: corners.reduce((sum, node) => sum + node.x, 0) / 3,
      y: corners.reduce((sum, node) => sum + node.y, 0) / 3,
    };
    return { elementId: element.elementId, distance: Math.hypot(centroid.x - point.x, centroid.y - point.y) };
  }).sort((a, b) => a.distance - b.distance || a.elementId.localeCompare(b.elementId))[0].elementId;
}
function localCornerCount(mesh, target, radius) {
  const ids = new Set(mesh.elements.flatMap((element) => element.nodeIds.slice(0, 3)));
  return mesh.nodes.filter((node) => ids.has(node.nodeId)
    && Math.hypot(node.x - target.x, node.y - target.y) <= radius).length;
}
