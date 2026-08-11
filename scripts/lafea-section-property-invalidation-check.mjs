#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  LAFEA_INVALIDATION_CLASSES,
  requireLafeaInputDescriptor,
} from '../src/workspace/lafea-stage-input-descriptors.js';
import {
  LAFEA_LIFECYCLE_CHANGE_CLASSES,
  applyLafeaLifecycleEvent,
  createLafeaArtifactRecord,
  createLafeaLifecycle,
  createLafeaLifecycleEvent,
  registerLafeaArtifact,
} from '../src/workspace/lafea-lifecycle.js';
import {
  requireLafeaLifecycleProfileForStage,
} from '../src/workspace/lafea-lifecycle-profiles.js';
import { createLafeaWorkbenchStore } from '../src/workspace/lafea-workbench.js';
import { triangleSource } from './lafea.3-fixtures.mjs';

assert.ok(LAFEA_INVALIDATION_CLASSES.includes('SECTION_PROPERTY'));
assert.ok(LAFEA_LIFECYCLE_CHANGE_CLASSES.includes('SECTION_PROPERTY'));

for (const [stageId, descriptorId] of [
  ['LAFEA.3', 'LAFEA.3.element.thickness'],
  ['LAFEA.4', 'LAFEA.4.element.thickness'],
  ['LAFEA.5', 'LAFEA.5.shell.element.thickness'],
]) {
  const descriptor = requireLafeaInputDescriptor(stageId, descriptorId);
  assert.equal(descriptor.invalidation.invalidationClass, 'SECTION_PROPERTY');
  assert.ok(descriptor.invalidation.descendants.includes('CANONICAL_MODEL'));
  assert.ok(descriptor.invalidation.descendants.includes('EXECUTION'));
  assert.ok(!descriptor.invalidation.descendants.includes('MESH'));
  assert.ok(requireLafeaLifecycleProfileForStage(stageId)
    .engineeringChangeClasses.includes('SECTION_PROPERTY'));
}

for (const descriptorId of [
  'LAFEA.1.thickness.nominal',
  'LAFEA.1.thickness.corrosionAllowance',
]) {
  const descriptor = requireLafeaInputDescriptor('LAFEA.1', descriptorId);
  assert.equal(descriptor.invalidation.invalidationClass, 'GEOMETRY');
  assert.ok(descriptor.invalidation.descendants.includes('MESH'));
}

assert.ok(!requireLafeaLifecycleProfileForStage('LAFEA.1')
  .engineeringChangeClasses.includes('SECTION_PROPERTY'));
assert.ok(!requireLafeaLifecycleProfileForStage('LAFEA.2')
  .engineeringChangeClasses.includes('SECTION_PROPERTY'));
assert.ok(!requireLafeaLifecycleProfileForStage('LAFEA.6')
  .engineeringChangeClasses.includes('SECTION_PROPERTY'));

const sourceA = 'source-a';
const sourceB = 'source-b';
let lifecycle = createLafeaLifecycle('LAFEA.3', sourceA);
lifecycle = registerCurrentPass(lifecycle, 'CANONICAL_MODEL', 'model-a', {
  sourceHash: sourceA,
});
lifecycle = registerCurrentPass(lifecycle, 'ANALYSIS_GEOMETRY', 'geometry-a', {
  sourceHash: sourceA,
  canonicalModelHash: 'model-a',
});
lifecycle = registerCurrentPass(lifecycle, 'ANALYSIS_MESH', 'mesh-a', {
  analysisGeometryHash: 'geometry-a',
  meshProfileHash: 'mesh-profile-a',
});
lifecycle = registerCurrentPass(lifecycle, 'EXECUTION', 'execution-a', {
  canonicalModelHash: 'model-a',
  meshHash: 'mesh-a',
  physicalLoadCaseHash: 'load-case-a',
  solverProfileHash: 'solver-profile-a',
});
lifecycle = registerCurrentPass(lifecycle, 'RECOVERY', 'recovery-a', {
  executionHash: 'execution-a',
  meshHash: 'mesh-a',
  recoveryProfileHash: 'recovery-profile-a',
});
lifecycle = registerCurrentPass(lifecycle, 'CONVERGENCE', 'convergence-a', {
  recoveryHash: 'recovery-a',
  recoverySetHash: 'recovery-set-a',
  convergenceProfileHash: 'convergence-profile-a',
});

const sectionEvent = createLafeaLifecycleEvent({
  eventId: 'SECTION-CHANGE-001',
  stageId: 'LAFEA.3',
  changeClass: 'SECTION_PROPERTY',
  previousSourceHash: sourceA,
  currentSourceHash: sourceB,
  originRef: 'section-property-check',
});
const updated = applyLafeaLifecycleEvent(lifecycle, sectionEvent);
assert.equal(updated.source.sourceHash, sourceB);
assert.equal(updated.artifacts.CANONICAL_MODEL.status, 'STALE');
assert.equal(updated.artifacts.ANALYSIS_GEOMETRY.status, 'REVALIDATION_REQUIRED');
assert.equal(updated.artifacts.ANALYSIS_MESH.status, 'REVALIDATION_REQUIRED');
assert.equal(updated.artifacts.EXECUTION.status, 'STALE');
assert.equal(updated.artifacts.RECOVERY.status, 'STALE');
assert.equal(updated.artifacts.CONVERGENCE.status, 'STALE');

const analyticalLifecycle = createLafeaLifecycle('LAFEA.1', 'foundation-source-a');
const analyticalEvent = createLafeaLifecycleEvent({
  eventId: 'SECTION-CHANGE-ANALYTICAL',
  stageId: 'LAFEA.1',
  changeClass: 'SECTION_PROPERTY',
  previousSourceHash: 'foundation-source-a',
  currentSourceHash: 'foundation-source-b',
  originRef: 'section-property-check',
});
assert.throws(
  () => applyLafeaLifecycleEvent(analyticalLifecycle, analyticalEvent),
  (error) => error?.code === 'LAFEA_CHANGE_CLASS_NOT_AUTHORIZED_FOR_PROFILE',
);

const workbench = createLafeaWorkbenchStore({
  initialStage: 'LAFEA.3',
  initialDocument: triangleSource(),
});
let workbenchState = workbench.run();
let workbenchStage = workbenchState.stages['LAFEA.3'];
assert.equal(workbenchStage.execution.status, 'QUALIFIED');
const previousWorkbenchSourceHash = workbenchStage.lifecycle.source.sourceHash;
const element = workbenchStage.document.elements[0];
workbenchState = workbench.setScalar(
  'LAFEA.3.element.thickness',
  element.elementId,
  String(element.thickness * 1.1),
  'SECTION-PROPERTY-WORKBENCH-CHECK',
);
workbenchStage = workbenchState.stages['LAFEA.3'];
assert.notEqual(workbenchState.status, 'FAILED');
assert.equal(workbenchStage.lastSourceAuthorityEvent.changeClass, 'SECTION_PROPERTY');
assert.equal(workbenchStage.lifecycleBinding.status, 'CURRENT');
assert.notEqual(workbenchStage.lifecycle.source.sourceHash, previousWorkbenchSourceHash);
assert.equal(workbenchStage.lifecycle.artifacts.CANONICAL_MODEL.status, 'STALE');
assert.equal(workbenchStage.lifecycle.artifacts.ANALYSIS_GEOMETRY.status, 'REVALIDATION_REQUIRED');
assert.equal(workbenchStage.lifecycle.artifacts.ANALYSIS_MESH.status, 'REVALIDATION_REQUIRED');
assert.equal(workbenchStage.lifecycle.artifacts.EXECUTION.status, 'STALE');
assert.equal(workbenchStage.lifecycle.artifacts.RECOVERY.status, 'STALE');
assert.equal(workbenchStage.lifecycleReadiness.releaseState, 'RELEASE_NOT_QUALIFIED');
workbench.destroy();

console.log(JSON.stringify({
  schema: 'lafea-section-property-invalidation-check/v2',
  check: 'lafea-section-property-invalidation',
  status: 'PASS',
  feStages: ['LAFEA.3', 'LAFEA.4', 'LAFEA.5'],
  analyticalPipeThicknessRemainsGeometry: true,
  liveWorkbenchTransitionQualified: true,
  meshCurrentPromoted: false,
  currentStatusPolicyRetained: true,
  releaseAuthorityChanged: false,
}));

function registerCurrentPass(lifecycleValue, kind, artifactHash, parentHashes) {
  const record = createLafeaArtifactRecord({
    stageId: lifecycleValue.stageId,
    kind,
    status: 'CURRENT',
    artifactHash,
    parentHashes,
    qualification: 'PASS',
    producerRef: `section-property-check/${kind}`,
    diagnostics: [],
  });
  return registerLafeaArtifact(
    lifecycleValue,
    record,
    `REGISTER-${kind}`,
  );
}
