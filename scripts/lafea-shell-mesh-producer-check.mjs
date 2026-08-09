#!/usr/bin/env node
import assert from 'node:assert/strict';

import { BASE_LIMITATIONS } from '../src/core/local-shell/constants.js';
import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { buildLafeaDiscretizationViewModel } from '../src/workspace/lafea-discretization-view-model.js';
import { lafeaMeshCapabilities } from '../src/workspace/lafea-mesh-capabilities.js';
import { requireLafeaStageAnalysisAdapter } from '../src/workspace/lafea-stage-analysis-adapter.js';
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
import {
  LAFEA_SHELL_ELEMENT,
  planLafeaShellAnalysisMesh,
  produceLafeaShellAnalysisMesh,
} from '../src/workspace/lafea-shell-mesh-producer.js';
import { createLafeaWorkbenchOrchestratorStore } from '../src/workspace/lafea-workbench-orchestrator-store.js';

const SOURCE_HASH = `sha256:${'e'.repeat(64)}`;
const STALE_SOURCE_HASH = `sha256:${'f'.repeat(64)}`;
const ROOT2 = Math.sqrt(0.5);
const geometryTemplate = {
  schema: LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
  stageId: 'LAFEA.4',
  geometryId: 'P2-8-TILTED-PLATE',
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
};

assert.ok(BASE_LIMITATIONS.includes('NO_AUTOMATIC_OR_ADAPTIVE_MESHING'));

const rows = [];
for (const stageId of ['LAFEA.4', 'LAFEA.5']) {
  const { geometry, domain, midsurfaceEvidence } = shellParent(stageId, SOURCE_HASH);
  const meshProfile = shellProfile(stageId, 30);
  const capabilities = lafeaMeshCapabilities(stageId);
  assert.equal(capabilities.automaticMeshProducerQualified, true, stageId);
  assert.equal(capabilities.generationExecutionAuthorized, true, stageId);
  assert.equal(capabilities.manualRefinementQualified, false, stageId);
  assert.deepEqual(capabilities.allowedElementFamilies, [LAFEA_SHELL_ELEMENT]);
  assert.equal(
    requireLafeaStageAnalysisAdapter(stageId).discretization.qualifiedProducerId !== null,
    true,
    stageId,
  );

  const plan = planLafeaShellAnalysisMesh({ midsurfaceEvidence, meshProfile });
  assert.equal(plan.stageId, stageId);
  assert.equal(plan.elementFamily, LAFEA_SHELL_ELEMENT);
  assert.equal(plan.resourceDisposition, 'WITHIN_LIMITS');
  assert.equal(plan.estimatedDofs, plan.nodeCount * 5);
  assert.ok(plan.nodeCount > 4);
  assert.ok(plan.elementCount > 2);
  assert.ok(Number.isFinite(plan.characteristicLengthMin));
  assert.ok(Number.isFinite(plan.characteristicLengthMedian));
  assert.ok(Number.isFinite(plan.characteristicLengthMax));
  assert.ok(plan.characteristicLengthMin <= plan.characteristicLengthMedian);
  assert.ok(plan.characteristicLengthMedian <= plan.characteristicLengthMax);

  // The global target is a size-field/point-spacing control, not a hard cap on
  // every Delaunay diagonal. Qualify deterministic sizing response instead.
  const fineProfile = shellProfile(stageId, 15);
  const finePlan = planLafeaShellAnalysisMesh({ midsurfaceEvidence, meshProfile: fineProfile });
  assert.equal(finePlan.resourceDisposition, 'WITHIN_LIMITS');
  assert.equal(finePlan.estimatedDofs, finePlan.nodeCount * 5);
  assert.ok(finePlan.nodeCount > plan.nodeCount);
  assert.ok(finePlan.elementCount > plan.elementCount);
  assert.ok(finePlan.characteristicLengthMedian < plan.characteristicLengthMedian);

  const produced = produceLafeaShellAnalysisMesh({ midsurfaceEvidence, meshProfile, plan });
  const fineProduced = produceLafeaShellAnalysisMesh({
    midsurfaceEvidence, meshProfile: fineProfile, plan: finePlan,
  });
  for (const candidate of [produced, fineProduced]) {
    assert.equal(candidate.output.lifecycleAuthority, false);
    assert.equal(candidate.evidence.stageId, stageId);
    assert.equal(candidate.evidence.qualification, 'PASS');
    assert.equal(candidate.evidence.quality.blockingElementIds.length, 0);
    assert.equal(candidate.evidence.mesh.elements.every(
      (element) => element.elementType === LAFEA_SHELL_ELEMENT && element.nodeIds.length === 3,
    ), true);
    assert.equal(candidate.evidence.sourceHash, SOURCE_HASH);
    assert.equal(candidate.evidence.analysisDomainHash, domain.semanticHash);
    assert.equal(candidate.evidence.analysisGeometryHash, geometry.semanticHash);
  }

  // Every node lies exactly on the declared tilted midsurface plane.
  for (const node of produced.evidence.mesh.nodes) {
    const dx = node.x - geometry.origin.x;
    const dy = node.y - geometry.origin.y;
    const dz = node.z - geometry.origin.z;
    const normal = {
      x: geometry.axisU.y * geometry.axisV.z - geometry.axisU.z * geometry.axisV.y,
      y: geometry.axisU.z * geometry.axisV.x - geometry.axisU.x * geometry.axisV.z,
      z: geometry.axisU.x * geometry.axisV.y - geometry.axisU.y * geometry.axisV.x,
    };
    assert.ok(Math.abs(dx * normal.x + dy * normal.y + dz * normal.z) <= 1e-9);
  }

  const replay = produceLafeaShellAnalysisMesh({ midsurfaceEvidence, meshProfile });
  assert.equal(replay.plan.planHash, produced.plan.planHash);
  assert.equal(replay.output.outputHash, produced.output.outputHash);
  assert.equal(replay.evidence.meshHash, produced.evidence.meshHash);
  assert.equal(replay.evidence.artifactHash, produced.evidence.artifactHash);
  assert.equal(JSON.stringify(replay.evidence.mesh), JSON.stringify(produced.evidence.mesh));

  // Public workbench route: source authority -> shell midsurface parent ->
  // profile -> plan -> generate -> governed v2 custody -> Discretization.
  const workbench = createLafeaWorkbenchOrchestratorStore();
  workbench.selectStage(stageId);
  workbench.initializeLifecycle(SOURCE_HASH, `P2-8-${stageId}-SOURCE`);

  const beforeParent = buildLafeaDiscretizationViewModel(workbench.getState().stages[stageId]);
  assert.equal(beforeParent.generation.available, false);
  assert.equal(
    beforeParent.generation.unavailableReason,
    'ANALYSIS_MESH_GENERATION_REQUIRES_SHELL_MIDSURFACE_EVIDENCE',
  );

  const registered = workbench.registerShellMidsurfaceEvidence(midsurfaceEvidence, stageId);
  assert.equal(registered?.changed, true);
  const replayRegistration = workbench.registerShellMidsurfaceEvidence(midsurfaceEvidence, stageId);
  assert.equal(replayRegistration?.changed, false);
  assert.equal(
    workbench.selectRetainedShellMidsurfaceEvidence(stageId)?.semanticHash,
    midsurfaceEvidence.semanticHash,
  );

  workbench.bindAnalysisMeshProfile(meshProfile, stageId);
  const readyVm = buildLafeaDiscretizationViewModel(workbench.getState().stages[stageId]);
  assert.equal(readyVm.generation.available, true);
  assert.equal(readyVm.actions.automaticMeshEnabled, true);
  assert.equal(readyVm.actions.canPlanMesh, true);
  assert.equal(readyVm.actions.canGenerateMesh, true);
  assert.equal(readyVm.generation.declaredElementFamily, LAFEA_SHELL_ELEMENT);
  assert.equal(readyVm.generation.lengthUnit, 'mm');

  const workbenchPlan = workbench.planAnalysisMesh({}, stageId);
  assert.equal(workbenchPlan?.summary.strategy, 'PLANAR_SHELL_MIDSURFACE_TRIANGULATION');
  assert.equal(workbenchPlan?.summary.elementFamily, LAFEA_SHELL_ELEMENT);
  assert.equal(workbenchPlan?.summary.estimatedDofs, workbenchPlan?.summary.nodeCount * 5);

  const workbenchGenerated = workbench.generateAnalysisMesh({}, stageId);
  assert.equal(workbenchGenerated?.evidence.qualification, 'PASS');
  const generatedStage = workbench.getState().stages[stageId];
  assert.equal(generatedStage.analysisMeshCustodyProjection.state, 'CURRENT_PASS');
  assert.equal(generatedStage.analysisMeshCustodyProjection.usableForRun, true);
  const generatedVm = buildLafeaDiscretizationViewModel(generatedStage);
  assert.equal(generatedVm.evidence.present, true);
  assert.equal(generatedVm.evidence.elementFamily, LAFEA_SHELL_ELEMENT);
  assert.equal(generatedVm.actions.canAdvance, true);
  assert.equal(generatedVm.actions.manualRefinementEnabled, false);
  assert.equal(generatedVm.actions.canRefineMesh, false);
  const shellRefinementMode = generatedVm.configuration.modes
    .find((entry) => entry.mode === 'MANUAL_REFINEMENT');
  assert.equal(shellRefinementMode?.enabled, false);
  assert.equal(shellRefinementMode?.reason, 'SHELL_LOCAL_REFINEMENT_NOT_QUALIFIED');

  const retainedArtifactHash = workbench
    .selectRetainedAnalysisMeshEvidenceV2(stageId)?.artifactHash;
  const refinementRejected = workbench.refineAnalysisMesh({
    targetType: 'ELEMENT', targetIds: ['E000001'],
    targetElementLength: 15, lengthUnit: 'mm',
  }, stageId);
  assert.equal(refinementRejected, null);
  assert.equal(
    workbench.selectRetainedAnalysisMeshEvidenceV2(stageId)?.artifactHash,
    retainedArtifactHash,
  );
  assert.equal(workbench.getState().diagnostics?.[0]?.code, 'LAFEA_SHELL_LOCAL_REFINEMENT_NOT_QUALIFIED');

  // Re-initializing source authority is a source change: shell parent and child
  // are invalidated rather than silently carried to the new engineering source.
  workbench.initializeLifecycle(STALE_SOURCE_HASH, `P2-8-${stageId}-SOURCE-CHANGE`);
  const invalidatedStage = workbench.getState().stages[stageId];
  assert.equal(invalidatedStage.shellMidsurfaceProfileActive, false);
  assert.equal(invalidatedStage.retainedShellMidsurfaceEvidence, null);
  assert.equal(invalidatedStage.retainedAnalysisMeshEvidenceV2, null);
  workbench.destroy();

  rows.push({
    stageId,
    nodeCount: plan.nodeCount,
    elementCount: plan.elementCount,
    estimatedDofs: plan.estimatedDofs,
    characteristicLengthMedian: plan.characteristicLengthMedian,
    fineNodeCount: finePlan.nodeCount,
    fineElementCount: finePlan.elementCount,
    fineEstimatedDofs: finePlan.estimatedDofs,
    fineCharacteristicLengthMedian: finePlan.characteristicLengthMedian,
    meshHash: produced.evidence.meshHash,
    artifactHash: produced.evidence.artifactHash,
    minimumScaledJacobian: produced.evidence.quality.minimumScaledJacobian,
    maximumAspectRatio: produced.evidence.quality.maximumAspectRatio,
    workbenchRouteQualified: true,
  });
}

// The same declared patch must yield the same mesh density response in both
// shell stages; only stage-scoped mesh identity/evidence lineage may differ.
assert.equal(rows[0].nodeCount, rows[1].nodeCount);
assert.equal(rows[0].elementCount, rows[1].elementCount);
assert.equal(rows[0].estimatedDofs, rows[1].estimatedDofs);
assert.equal(rows[0].fineNodeCount, rows[1].fineNodeCount);
assert.equal(rows[0].fineElementCount, rows[1].fineElementCount);
assert.equal(rows[0].fineEstimatedDofs, rows[1].fineEstimatedDofs);

// Fail closed on a non-orthogonal declared basis; never best-fit it.
assert.throws(
  () => createLafeaShellMidsurfaceGeometry({
    ...geometryTemplate,
    axisV: { x: ROOT2, y: ROOT2, z: 0 },
  }),
  (error) => error?.code === 'LAFEA_SHELL_MIDSURFACE_BASIS_NOT_ORTHOGONAL',
);

// Fail closed on multiple loops/holes in this first shell qualification.
assert.throws(
  () => createLafeaShellMidsurfaceGeometry({
    ...geometryTemplate,
    loops: [
      geometryTemplate.loops[0],
      { loopId: 'HOLE', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3', 'S4'] },
    ],
  }),
  (error) => error?.code === 'LAFEA_SHELL_MIDSURFACE_SINGLE_OUTER_LOOP_REQUIRED',
);

console.log(JSON.stringify({
  schema: 'lafea-shell-mesh-producer-check/v1',
  status: 'PASS',
  solverInternalMeshingAuthorized: false,
  externalShellProducerQualified: true,
  publicWorkbenchRouteQualified: true,
  scope: 'PLANAR_SINGLE_PATCH_STRAIGHT_PERIMETER_CST_DKT_TRI3',
  sizingQualification: 'TARGET_HALVING_INCREASES_DENSITY_AND_REDUCES_MEDIAN_CHARACTERISTIC_LENGTH',
  rows,
  exclusions: [
    'HOLES', 'MULTI_PATCH_SEAMS', 'CURVED_MIDSURFACE',
    'OFFSET_SURFACE_GENERATION', 'THICKNESS_TRANSITION_MESHING',
    'SHELL_LOCAL_REFINEMENT',
  ],
}, null, 2));

function shellParent(stageId, sourceHash) {
  const geometry = createLafeaShellMidsurfaceGeometry({ ...geometryTemplate, stageId });
  const domain = createLafeaShellAnalysisDomain({
    schema: LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA,
    stageId,
    domainId: `P2-8-${stageId}-DOMAIN`,
    sourceHash,
    midsurfaceGeometryHash: geometry.semanticHash,
    lengthUnit: 'mm',
    topologyClass: LAFEA_SHELL_MIDSURFACE_TOPOLOGY,
  });
  const midsurfaceEvidence = createLafeaShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_MIDSURFACE_INTAKE_SCHEMA,
    stageId,
    sourceHash,
    analysisDomain: domain,
    geometry,
    producerRef: 'P2-8-DECLARED-MIDSURFACE',
  });
  return { geometry, domain, midsurfaceEvidence };
}

function shellProfile(stageId, globalTargetSize) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `P2_8_${stageId.replace('.', '_')}_SHELL_${globalTargetSize}`,
    sourceRevision: 'R6', semanticHash: undefined,
    fields: {
      continuumElement: 'T3',
      shellElement: LAFEA_SHELL_ELEMENT,
      globalTargetSize,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 5, aspectRatioBlock: 10,
      scaledJacobianWarn: 0.6, scaledJacobianBlock: 0.2,
      adaptiveLevels: 3,
    },
  });
}