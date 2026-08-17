#!/usr/bin/env node
import assert from 'node:assert/strict';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { buildLafeaDiscretizationViewModel } from '../src/workspace/lafea-discretization-view-model.js';
import {
  canReuseLafeaWorkbenchViewport,
  createLafeaWorkbenchViewportDependencies,
} from '../src/workspace/lafea-workbench-viewport-lifecycle.js';
import {
  createLafeaMockDocument,
  createLafeaMockDomainAndGeometryEvidence,
  createLafeaMockMeshProfile,
  LAFEA3_SIMULATED_MESH_ELEMENT_FAMILY,
  LAFEA3_SIMULATED_MESH_TARGET_MM,
} from '../src/workspace/lafea-simulated-source-provider.js';
import { createLafeaWorkbenchStore } from '../src/workspace/lafea-workbench.js';

const STAGE_ID = 'LAFEA.3';
const source = await createLafeaMockDocument(STAGE_ID);
const composition = requireLafeaStageComposition(STAGE_ID);
const normalizedSource = composition.normalizeDocument(source);
const authority = issueLafeaSourceAuthority(
  STAGE_ID,
  normalizedSource,
  'LAFEA3_SAMPLE_GENERATE_RETAIN_CHECK',
);
const parent = await createLafeaMockDomainAndGeometryEvidence(STAGE_ID, authority.sourceHash);
const profile = createLafeaMockMeshProfile(STAGE_ID);
assert.ok(parent?.domain && parent?.geometryEvidence, 'Sample must supply governed domain/geometry');
assert.equal(profile.fields.continuumElement, LAFEA3_SIMULATED_MESH_ELEMENT_FAMILY);
assert.equal(profile.fields.globalTargetSize, LAFEA3_SIMULATED_MESH_TARGET_MM);

const store = createLafeaWorkbenchStore({
  initialStage: STAGE_ID,
  initialDocument: normalizedSource,
  initialSourceHash: authority.sourceHash,
});

try {
  store.activateDomainFirstProfile();
  const domainRegistration = store.registerAnalysisDomain(parent.domain);
  assert.equal(domainRegistration.projection.state, 'CURRENT_PASS');
  const geometryRegistration = store.registerAnalysisGeometryEvidence(parent.geometryEvidence);
  assert.equal(geometryRegistration.projection.state, 'CURRENT_PASS');
  store.bindAnalysisMeshProfile(profile);

  const before = store.getState().stages[STAGE_ID];
  const beforeVm = buildLafeaDiscretizationViewModel(before);
  assert.equal(before.retainedAnalysisMeshEvidenceV2, null);
  assert.equal(beforeVm.generation.available, true);
  assert.equal(beforeVm.generation.meshProfileBound, true);
  assert.equal(beforeVm.generation.declaredElementFamily, 'T6');
  assert.equal(beforeVm.generation.targetElementLength, 30);
  assert.equal(beforeVm.actions.canGenerateMesh, true);

  const beforeViewport = createLafeaWorkbenchViewportDependencies({
    stageId: STAGE_ID,
    stage: before,
    sceneRevision: 1,
    renderPacket: null,
  });
  assert.equal(beforeViewport.retainedMeshEvidence, null);

  const generated = store.generateAnalysisMesh();
  assert.ok(generated?.evidence, 'Generate Mesh must return retained v2 evidence');
  assert.equal(generated.evidence.qualification, 'PASS');
  assert.equal(generated.evidence.stageId, STAGE_ID);
  assert.equal(generated.evidence.meshProfileHash, profile.semanticHash);
  assert.equal(generated.evidence.quality.blockingElementIds.length, 0);
  assert.ok(generated.evidence.mesh.nodes.length > 0);
  assert.ok(generated.evidence.mesh.elements.length > 0);
  assert.equal(
    generated.evidence.mesh.elements.every((row) => row.elementType === 'T6'),
    true,
    'Sample generation must retain a uniform T6 element family',
  );

  const after = store.getState().stages[STAGE_ID];
  assert.equal(after.retainedAnalysisMeshEvidenceV2?.meshHash, generated.evidence.meshHash);
  assert.equal(after.retainedAnalysisMeshEvidenceV2?.artifactHash, generated.evidence.artifactHash);
  assert.ok(['CURRENT_PASS', 'CURRENT_WARNING'].includes(after.analysisMeshCustodyProjection.state));
  assert.equal(after.analysisMeshCustodyProjection.canView, true);
  assert.equal(after.analysisMeshCustodyProjection.blockingElementIds.length, 0);
  assert.notEqual(after.lastAnalysisMeshPlan?.resourceDisposition, 'BLOCK');
  assert.ok(after.lastAnalysisMeshPlan?.characteristicLengthMax <= 30 + 1e-9);

  const afterVm = buildLafeaDiscretizationViewModel(after);
  assert.equal(afterVm.evidence.present, true);
  assert.equal(afterVm.evidence.meshHash, generated.evidence.meshHash);
  assert.equal(afterVm.evidence.elementFamily, 'T6');
  assert.equal(afterVm.preview.retainedNodeCount, generated.evidence.mesh.nodes.length);
  assert.equal(afterVm.preview.retainedElementCount, generated.evidence.mesh.elements.length);

  const afterViewport = createLafeaWorkbenchViewportDependencies({
    stageId: STAGE_ID,
    stage: after,
    sceneRevision: 1,
    renderPacket: null,
  });
  assert.equal(afterViewport.retainedMeshEvidence?.meshHash, generated.evidence.meshHash);
  assert.equal(
    canReuseLafeaWorkbenchViewport(beforeViewport, afterViewport),
    false,
    'retaining a new mesh must remount the viewport with the new evidence',
  );

  const preflight = store.prepareContinuumForRun();
  assert.equal(preflight.projection.state, 'CURRENT_PASS');
  assert.equal(preflight.projection.usableForAuthorization, true);

  console.log(JSON.stringify({
    check: 'lafea3-sample-generate-retain',
    status: 'PASS',
    stageId: STAGE_ID,
    elementFamily: profile.fields.continuumElement,
    targetElementLengthMm: profile.fields.globalTargetSize,
    custodyState: after.analysisMeshCustodyProjection.state,
    nodeCount: generated.evidence.mesh.nodes.length,
    elementCount: generated.evidence.mesh.elements.length,
    characteristicLengthMax: after.lastAnalysisMeshPlan.characteristicLengthMax,
    blockingElementCount: generated.evidence.quality.blockingElementIds.length,
    viewportRemountRequired: true,
    continuumPreflight: preflight.projection.state,
  }));
} finally {
  store.destroy();
}
