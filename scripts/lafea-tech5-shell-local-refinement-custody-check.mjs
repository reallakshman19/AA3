#!/usr/bin/env node
import assert from 'node:assert/strict';
import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { createLafeaSimulatedShellMidsurfaceEvidence } from '../src/workspace/lafea-simulated-shell-midsurface-provider.js';
import { LAFEA_SHELL_ELEMENT } from '../src/workspace/lafea-shell-mesh-producer.js';
import { cylindricalShellUvAtPoint3d } from '../src/workspace/lafea-shell-curved-midsurface-contract.js';
import { createLafeaWorkbenchMeshGenerationState } from '../src/workspace/lafea-workbench-mesh-generation-state.js';
import {
  LAFEA4_SHELL_REFINEMENT_COMMAND_SCHEMA,
  LAFEA4_SHELL_REFINEMENT_PRODUCER_REF,
} from '../src/workspace/lafea4-shell-refinement-authority.js';
import { cylindricalSource } from './lafea.4-fixtures.mjs';

const source = cylindricalSource(12);
source.modelIdentity = 'CYLINDRICAL_PIPE_SHELL_BENCHMARK';
const authority = issueLafeaSourceAuthority('LAFEA.4', source, 'TECH5-CUSTODY');
const midsurface = createLafeaSimulatedShellMidsurfaceEvidence(
  'LAFEA.4', authority.sourceHash, source,
);
const profile = canonicalProfile(PROFILE_KINDS.MESH, {
  schema: 'lafea-mesh-profile/v1',
  profileIdentity: 'LAFEA4_TECH5_CUSTODY_H15',
  sourceRevision: 'TECH5-CUSTODY-V1',
  semanticHash: undefined,
  fields: {
    continuumElement: 'T3',
    shellElement: LAFEA_SHELL_ELEMENT,
    globalTargetSize: 15,
    adjacentSizeRatioMax: 1.5,
    aspectRatioWarn: 5,
    aspectRatioBlock: 10,
    scaledJacobianWarn: 0.5,
    scaledJacobianBlock: 0.2,
    adaptiveLevels: 3,
  },
});
const stage = Object.freeze({
  stageId: 'LAFEA.4',
  lifecycleBinding: Object.freeze({ status: 'CURRENT' }),
  sourceAuthority: authority,
});

const state = createLafeaWorkbenchMeshGenerationState(['LAFEA.4', 'LAFEA.5']);
state.bindMeshProfile(profile, 'LAFEA.4');
const registration = state.registerShellMidsurface(midsurface, stage);
assert.equal(registration.changed, true);

const generated = state.generateMesh(stage);
assert.equal(generated.changed, true);
assert.equal(generated.evidence.qualification, 'PASS');
const parent = generated.evidence;
const target = nearestElementToUv(parent.mesh, midsurface.geometry, { u: 0, v: 25 });

const refined = state.refineMesh(stage, {
  commandId: 'TECH5-CUSTODY-REFINE',
  kind: 'TARGET_LENGTH',
  targetType: 'ELEMENT',
  targetIds: [target.elementId],
  targetElementLength: 11.25,
  lengthUnit: 'mm',
  reason: 'TECH5 workbench custody route qualification',
});
assert.equal(refined.changed, true);
assert.equal(refined.command.schema, LAFEA4_SHELL_REFINEMENT_COMMAND_SCHEMA);
assert.equal(refined.command.executionAuthorized, true);
assert.equal(refined.evidence.qualification, 'PASS');
assert.equal(refined.summary.generationMode, 'REFINEMENT_REGENERATION');
assert.equal(refined.summary.strategy, 'SHELL_UV_RETAINED_LOCAL_REFINEMENT');
assert.equal(refined.summary.producerRef, LAFEA4_SHELL_REFINEMENT_PRODUCER_REF);
assert.notEqual(refined.evidence.meshHash, parent.meshHash);
assert.equal(state.selectEvidence('LAFEA.4').meshHash, refined.evidence.meshHash);
assert.equal(state.selectEvidence('LAFEA.4').artifactHash, refined.evidence.artifactHash);
assert.equal(state.selectMeshProfile('LAFEA.4').semanticHash, profile.semanticHash);
assert.equal(state.selectShellMidsurface('LAFEA.4').semanticHash, midsurface.semanticHash);

// A failed deep-refinement request must not mutate retained child custody.
const retainedBeforeFailure = state.selectEvidence('LAFEA.4');
assert.throws(
  () => state.refineMesh(stage, {
    commandId: 'TECH5-CUSTODY-DEEP-REFINE',
    kind: 'TARGET_LENGTH',
    targetType: 'ELEMENT',
    targetIds: [refined.evidence.mesh.elements[0].elementId],
    targetElementLength: 9.9,
    lengthUnit: 'mm',
    reason: 'TECH5 failed refinement must preserve custody',
  }),
  (error) => error?.code === 'LAFEA4_SHELL_REFINEMENT_TARGET_REQUIRES_GRADED_TRANSITION',
);
const retainedAfterFailure = state.selectEvidence('LAFEA.4');
assert.equal(retainedAfterFailure.meshHash, retainedBeforeFailure.meshHash);
assert.equal(retainedAfterFailure.artifactHash, retainedBeforeFailure.artifactHash);

console.log(JSON.stringify({
  check: 'lafea-tech5-shell-local-refinement-custody',
  status: 'PASS',
  parentMeshHash: parent.meshHash,
  childMeshHash: refined.evidence.meshHash,
  childArtifactHash: refined.evidence.artifactHash,
  commandSchema: refined.command.schema,
  producerRef: refined.summary.producerRef,
  parentNodes: parent.mesh.nodes.length,
  childNodes: refined.evidence.mesh.nodes.length,
  parentElements: parent.mesh.elements.length,
  childElements: refined.evidence.mesh.elements.length,
  failedRequestPreservedChildCustody: true,
}, null, 2));

function nearestElementToUv(mesh, geometry, targetUv) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  let best = null;
  for (const element of mesh.elements) {
    const corners = element.nodeIds.map((id) => (
      cylindricalShellUvAtPoint3d(geometry, nodeById.get(id))
    ));
    const u = corners.reduce((sum, row) => sum + row.u, 0) / corners.length;
    const v = corners.reduce((sum, row) => sum + row.v, 0) / corners.length;
    const distance = Math.hypot(u - targetUv.u, v - targetUv.v);
    if (!best || distance < best.distance) best = { elementId: element.elementId, distance };
  }
  return best;
}
