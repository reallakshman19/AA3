#!/usr/bin/env node
import assert from 'node:assert/strict';

import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { buildLafeaDiscretizationViewModel } from '../src/workspace/lafea-discretization-view-model.js';
import {
  LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_INTAKE_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_ORIENTATION,
  LAFEA_SHELL_MIDSURFACE_TOPOLOGY,
  createLafeaShellAnalysisDomain,
  createLafeaShellMidsurfaceEvidence,
  createLafeaShellMidsurfaceGeometry,
} from '../src/workspace/lafea-shell-midsurface-contract.js';
import { LAFEA_SHELL_ELEMENT } from '../src/workspace/lafea-shell-mesh-producer.js';
import { createLafeaWorkbenchOrchestratorStore } from '../src/workspace/lafea-workbench-orchestrator-store.js';
import { triangleSource as shellFixture } from './lafea.4-fixtures.mjs';
import { workflowSource as trunnionFixture } from './lafea.5-fixtures.mjs';

const SOURCE_HASH = `sha256:${'e'.repeat(64)}`;
const NEXT_SOURCE_HASH = `sha256:${'f'.repeat(64)}`;
const ROOT2 = Math.sqrt(0.5);
const SHELL_RUN_BLOCK = 'SHELL_RETAINED_MESH_NOT_BOUND_TO_SOLVER_MODEL';
const fixtureByStage = { 'LAFEA.4': shellFixture, 'LAFEA.5': trunnionFixture };
const rows = [];

for (const stageId of ['LAFEA.4', 'LAFEA.5']) {
  const parent = shellParent(stageId, SOURCE_HASH);
  const profile = shellProfile(stageId, 30);
  const workbench = createLafeaWorkbenchOrchestratorStore({
    initialStage: stageId,
    initialDocument: fixtureByStage[stageId](),
    initialSourceHash: SOURCE_HASH,
  });

  let stage = workbench.getState().stages[stageId];
  assert.equal(stage.lifecycleBinding.status, 'CURRENT');
  assert.equal(stage.lifecycle.source.sourceHash, SOURCE_HASH);

  const beforeParent = buildLafeaDiscretizationViewModel(stage);
  assert.equal(beforeParent.generation.available, false);
  assert.equal(
    beforeParent.generation.unavailableReason,
    'ANALYSIS_MESH_GENERATION_REQUIRES_SHELL_MIDSURFACE_EVIDENCE',
  );

  const registered = workbench.registerShellMidsurfaceEvidence(parent, stageId);
  assert.equal(registered?.changed, true);
  assert.equal(
    workbench.selectRetainedShellMidsurfaceEvidence(stageId)?.semanticHash,
    parent.semanticHash,
  );
  assert.equal(workbench.registerShellMidsurfaceEvidence(parent, stageId)?.changed, false);

  const bound = workbench.bindAnalysisMeshProfile(profile, stageId);
  assert.equal(bound?.changed, true);
  stage = workbench.getState().stages[stageId];
  assert.equal(stage.retainedAnalysisMeshProfile?.semanticHash, profile.semanticHash);

  const ready = buildLafeaDiscretizationViewModel(stage);
  assert.equal(ready.generation.available, true);
  assert.equal(ready.generation.declaredElementFamily, LAFEA_SHELL_ELEMENT);
  assert.equal(ready.generation.lengthUnit, 'mm');
  assert.equal(ready.actions.canPlanMesh, true);
  assert.equal(ready.actions.canGenerateMesh, true);

  const planned = workbench.planAnalysisMesh({}, stageId);
  assert.equal(planned?.summary.strategy, 'PLANAR_SHELL_MIDSURFACE_TRIANGULATION');
  assert.equal(planned?.summary.elementFamily, LAFEA_SHELL_ELEMENT);
  assert.equal(planned?.summary.estimatedDofs, planned?.summary.nodeCount * 5);

  const generated = workbench.generateAnalysisMesh({}, stageId);
  assert.equal(generated?.evidence.qualification, 'PASS');
  assert.equal(generated?.evidence.quality.shellOrientationTopology?.qualification, 'PASS');
  stage = workbench.getState().stages[stageId];
  assert.equal(stage.analysisMeshCustodyProjection.state, 'CURRENT_PASS');
  assert.equal(stage.analysisMeshCustodyProjection.usableForAdvance, true);
  assert.equal(stage.analysisMeshCustodyProjection.usableForAuthorization, true);
  assert.equal(stage.analysisMeshCustodyProjection.usableForRun, false);
  assert.deepEqual(stage.analysisMeshCustodyProjection.runBlockingReasons, [SHELL_RUN_BLOCK]);
  assert.equal(stage.orchestration.sections.AUTHORIZATION.state, 'BLOCKED');
  assert.ok(stage.orchestration.sections.AUTHORIZATION.reasons.includes(SHELL_RUN_BLOCK));

  const generatedVm = buildLafeaDiscretizationViewModel(stage);
  assert.equal(generatedVm.evidence.present, true);
  assert.equal(generatedVm.evidence.elementFamily, LAFEA_SHELL_ELEMENT);
  assert.equal(generatedVm.actions.canAdvance, true);
  assert.equal(generatedVm.actions.canRun, false);
  assert.equal(generatedVm.actions.manualRefinementEnabled, false);
  assert.equal(generatedVm.actions.canRefineMesh, false);
  const refineMode = generatedVm.configuration.modes.find((row) => row.mode === 'MANUAL_REFINEMENT');
  assert.equal(refineMode?.reason, 'SHELL_LOCAL_REFINEMENT_NOT_QUALIFIED');

  const retainedHash = workbench.selectRetainedAnalysisMeshEvidenceV2(stageId)?.artifactHash;
  const rejected = workbench.refineAnalysisMesh({
    targetType: 'ELEMENT',
    targetIds: ['E000001'],
    targetElementLength: 15,
    lengthUnit: 'mm',
  }, stageId);
  assert.equal(rejected, null);
  assert.equal(workbench.getState().diagnostics?.[0]?.code, 'LAFEA_SHELL_LOCAL_REFINEMENT_NOT_QUALIFIED');
  assert.equal(workbench.selectRetainedAnalysisMeshEvidenceV2(stageId)?.artifactHash, retainedHash);

  // P0 execution-custody gate: legacy shell documents must not be solved after
  // a different governed mesh has been generated/adopted. Run is reopened only
  // when a future compiler binds retained meshHash -> solverModelHash.
  const beforeRunExecution = workbench.getState().stages[stageId].execution ?? null;
  workbench.run();
  stage = workbench.getState().stages[stageId];
  assert.equal(workbench.getState().status, 'FAILED');
  assert.equal(workbench.getState().diagnostics?.[0]?.code, SHELL_RUN_BLOCK);
  assert.deepEqual(stage.execution ?? null, beforeRunExecution);

  workbench.initializeLifecycle(NEXT_SOURCE_HASH, `P2-8-${stageId}-SOURCE-CHANGE`);
  stage = workbench.getState().stages[stageId];
  assert.equal(stage.lifecycleBinding.status, 'CURRENT');
  assert.equal(stage.lifecycle.source.sourceHash, NEXT_SOURCE_HASH);
  assert.equal(stage.shellMidsurfaceProfileActive, false);
  assert.equal(stage.retainedShellMidsurfaceEvidence, null);
  assert.equal(stage.retainedAnalysisMeshEvidenceV2, null);

  rows.push({
    stageId,
    artifactHash: retainedHash,
    nodeCount: generated.evidence.mesh.nodes.length,
    elementCount: generated.evidence.mesh.elements.length,
    meshRouteQualified: true,
    solverMeshBindingQualified: false,
    shellRunFailClosed: true,
    shellLocalRefinementQualified: false,
    sourceChangeInvalidatesParentAndChild: true,
  });
  workbench.destroy();
}

console.log(JSON.stringify({
  schema: 'lafea-shell-workbench-route-check/v2',
  status: 'PASS',
  rows,
  exclusions: [
    'SHELL_RETAINED_MESH_TO_SOLVER_MODEL_COMPILER',
    'HOLES', 'MULTI_PATCH_SEAMS', 'CURVED_MIDSURFACE',
    'OFFSET_SURFACE_GENERATION', 'THICKNESS_TRANSITION_MESHING',
    'SHELL_LOCAL_REFINEMENT',
  ],
}, null, 2));

function shellParent(stageId, sourceHash) {
  const geometry = createLafeaShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId,
    geometryId: `P2-8-${stageId}-TILTED-PLATE`,
    lengthUnit: 'mm',
    origin: { x: 10, y: -20, z: 30 },
    axisU: { x: ROOT2, y: ROOT2, z: 0 },
    axisV: { x: 0, y: 0, z: 1 },
    orientationPolicy: LAFEA_SHELL_MIDSURFACE_ORIENTATION,
    vertices: [
      { vertexId: 'V1', u: 0, v: 0 },
      { vertexId: 'V2', u: 200, v: 0 },
      { vertexId: 'V3', u: 200, v: 120 },
      { vertexId: 'V4', u: 0, v: 120 },
    ],
    segments: [
      { segmentId: 'S1', startVertexId: 'V1', endVertexId: 'V2' },
      { segmentId: 'S2', startVertexId: 'V2', endVertexId: 'V3' },
      { segmentId: 'S3', startVertexId: 'V3', endVertexId: 'V4' },
      { segmentId: 'S4', startVertexId: 'V4', endVertexId: 'V1' },
    ],
    loops: [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3', 'S4'] }],
  });
  const domain = createLafeaShellAnalysisDomain({
    schema: LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA,
    stageId,
    domainId: `P2-8-${stageId}-DOMAIN`,
    sourceHash,
    midsurfaceGeometryHash: geometry.semanticHash,
    lengthUnit: 'mm',
    topologyClass: LAFEA_SHELL_MIDSURFACE_TOPOLOGY,
  });
  return createLafeaShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_MIDSURFACE_INTAKE_SCHEMA,
    stageId,
    sourceHash,
    analysisDomain: domain,
    geometry,
    producerRef: 'P2-8-DECLARED-MIDSURFACE',
  });
}

function shellProfile(stageId, globalTargetSize) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `P2_8_${stageId.replace('.', '_')}_SHELL_${globalTargetSize}`,
    sourceRevision: 'R8',
    semanticHash: undefined,
    fields: {
      continuumElement: 'T3',
      shellElement: LAFEA_SHELL_ELEMENT,
      globalTargetSize,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 3,
      aspectRatioBlock: 10,
      scaledJacobianWarn: 0.6,
      scaledJacobianBlock: 0.2,
      adaptiveLevels: 3,
    },
  });
}
