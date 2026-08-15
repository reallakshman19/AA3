#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  createLafeaLifecycleProducerBatch,
  createLafeaWorkbenchStore,
  issueLafeaSourceAuthority,
} from '../src/workspace/lafea-workbench.js';
import { triangleSource } from './lafea.3-fixtures.mjs';

for (const edit of [
  {
    label: 'material',
    descriptorId: 'LAFEA.3.material.elasticModulus',
    entityId: 'MAT',
    value: '210000',
    changeClass: 'MATERIAL_PROPERTY',
  },
  {
    label: 'section',
    descriptorId: 'LAFEA.3.element.thickness',
    entityId: 'E1',
    value: '12.5',
    changeClass: 'SECTION_PROPERTY',
  },
  {
    label: 'boundary-condition',
    descriptorId: 'LAFEA.3.constraint.value',
    entityId: 'C3',
    value: '0.125',
    changeClass: 'LOAD_OR_BC',
  },
]) {
  assertRevalidation(edit);
}

assertGeometryEditRejected();
assertTopologyEditRejected();

console.log(JSON.stringify({
  schema: 'lafea-continuum-revalidation-check/v1',
  check: 'lafea-continuum-revalidation',
  status: 'PASS',
  stageId: 'LAFEA.3',
  revalidatedChangeClasses: [
    'MATERIAL_PROPERTY', 'SECTION_PROPERTY', 'LOAD_OR_BC',
  ],
  canonicalModelReboundToCurrentSource: true,
  geometryIdentityReDerived: true,
  meshIdentityReDerived: true,
  producerSemanticsCrossChecked: true,
  solverExecutedByRevalidation: false,
  executionRecoveryRemainStale: true,
  geometryChangesRejected: true,
  topologyChangesRejected: true,
  releaseAuthorityChanged: false,
}));

function assertRevalidation(edit) {
  const store = createLafeaWorkbenchStore({
    initialStage: 'LAFEA.3',
    initialDocument: triangleSource(),
  });
  try {
    let state = store.run();
    let stage = state.stages['LAFEA.3'];
    assert.equal(stage.execution.status, 'QUALIFIED');
    const baseline = snapshot(stage.lifecycle);

    state = store.setScalar(
      edit.descriptorId,
      edit.entityId,
      edit.value,
      `CONTINUUM-REVALIDATION-${edit.label.toUpperCase()}`,
    );
    stage = state.stages['LAFEA.3'];
    assert.notEqual(state.status, 'FAILED');
    assert.equal(stage.lastSourceAuthorityEvent.changeClass, edit.changeClass);
    assert.equal(stage.lifecycleBinding.status, 'CURRENT');
    assert.equal(stage.execution, null, 'source edit must clear the base calculation result');
    assert.equal(stage.lifecycle.artifacts.CANONICAL_MODEL.status, 'STALE');
    assert.equal(stage.lifecycle.artifacts.ANALYSIS_GEOMETRY.status, 'REVALIDATION_REQUIRED');
    assert.equal(stage.lifecycle.artifacts.ANALYSIS_MESH.status, 'REVALIDATION_REQUIRED');
    assert.equal(stage.lifecycle.artifacts.EXECUTION.status, 'STALE');
    assert.equal(stage.lifecycle.artifacts.RECOVERY.status, 'STALE');

    const editedDocument = store.exportDocument();
    const reference = qualifiedProducerBatch(editedDocument);
    const result = store.revalidateContinuumGeometryMesh();
    assert.equal(result.status, 'PASS');
    assert.equal(result.calculationState, 'CALCULATION_NOT_RUN');
    assert.equal(result.releaseQualified, false);

    state = store.getState();
    stage = state.stages['LAFEA.3'];
    assert.equal(stage.execution, null, 'revalidation must not create a calculation result');
    assert.equal(stage.lifecycle.artifacts.CANONICAL_MODEL.status, 'CURRENT');
    assert.equal(stage.lifecycle.artifacts.ANALYSIS_GEOMETRY.status, 'CURRENT');
    assert.equal(stage.lifecycle.artifacts.ANALYSIS_MESH.status, 'CURRENT');
    assert.equal(stage.lifecycle.artifacts.EXECUTION.status, 'STALE');
    assert.equal(stage.lifecycle.artifacts.RECOVERY.status, 'STALE');
    assert.notEqual(
      stage.lifecycle.artifacts.CANONICAL_MODEL.artifactHash,
      baseline.canonicalModelHash,
      `${edit.label} edit must establish new canonical-model evidence`,
    );
    assert.equal(
      stage.lifecycle.artifacts.ANALYSIS_GEOMETRY.artifactHash,
      baseline.analysisGeometryHash,
      `${edit.label} edit must re-derive the same geometry identity`,
    );
    assert.equal(
      stage.lifecycle.artifacts.ANALYSIS_MESH.artifactHash,
      baseline.meshHash,
      `${edit.label} edit must re-derive the same mesh identity`,
    );
    assert.equal(
      stage.lifecycle.artifacts.ANALYSIS_GEOMETRY.parentHashes.sourceHash,
      stage.lifecycle.source.sourceHash,
    );
    assert.equal(
      stage.lifecycle.artifacts.ANALYSIS_GEOMETRY.parentHashes.canonicalModelHash,
      stage.lifecycle.artifacts.CANONICAL_MODEL.artifactHash,
    );
    assert.equal(
      stage.lifecycle.artifacts.ANALYSIS_MESH.parentHashes.analysisGeometryHash,
      stage.lifecycle.artifacts.ANALYSIS_GEOMETRY.artifactHash,
    );
    assert.equal(stage.lifecycleReadiness.releaseState, 'RELEASE_NOT_QUALIFIED');

    for (const kind of ['CANONICAL_MODEL', 'ANALYSIS_GEOMETRY', 'ANALYSIS_MESH']) {
      assert.equal(
        stage.lifecycle.artifacts[kind].artifactHash,
        record(reference, kind).artifactHash,
        `${edit.label} revalidation ${kind} hash must match the normal qualified producer`,
      );
      assert.deepEqual(
        stage.lifecycle.artifacts[kind].parentHashes,
        record(reference, kind).parentHashes,
        `${edit.label} revalidation ${kind} parents must match the normal qualified producer`,
      );
    }

    assert.throws(
      () => store.revalidateContinuumGeometryMesh(),
      (error) => error?.code === 'LAFEA_CONTINUUM_REVALIDATION_CANONICAL_MODEL_STALE_REQUIRED',
      'already-current lifecycle must not be revalidated a second time',
    );
  } finally {
    store.destroy();
  }
}

function assertGeometryEditRejected() {
  const store = createLafeaWorkbenchStore({
    initialStage: 'LAFEA.3',
    initialDocument: triangleSource(),
  });
  try {
    store.run();
    const node = store.getState().stages['LAFEA.3'].document.nodes
      .find((row) => row.nodeId === 'B');
    store.moveNode('nodes', 'B', node.x + 25, node.y);
    const before = store.getState().stages['LAFEA.3'];
    assert.equal(before.lastSourceAuthorityEvent.changeClass, 'GEOMETRY');
    assert.equal(before.lifecycle.artifacts.ANALYSIS_GEOMETRY.status, 'STALE');
    assert.equal(before.lifecycle.artifacts.ANALYSIS_MESH.status, 'STALE');
    assert.throws(
      () => store.revalidateContinuumGeometryMesh(),
      (error) => error?.code === 'LAFEA_CONTINUUM_REVALIDATION_CHANGE_CLASS_NOT_ELIGIBLE',
    );
    const after = store.getState().stages['LAFEA.3'];
    assert.equal(after.lifecycle.artifacts.ANALYSIS_GEOMETRY.status, 'STALE');
    assert.equal(after.lifecycle.artifacts.ANALYSIS_MESH.status, 'STALE');
  } finally {
    store.destroy();
  }
}

function assertTopologyEditRejected() {
  const store = createLafeaWorkbenchStore({
    initialStage: 'LAFEA.3',
    initialDocument: triangleSource(),
  });
  try {
    store.run();
    const payload = structuredClone(store.exportDocument());
    const document = payload.document ?? payload;
    const nodeC = document.nodes.find((row) => row.nodeId === 'C');
    nodeC.nodeId = 'D';
    nodeC.sourceReference = 'NODE#D';
    document.elements[0].nodeIds = document.elements[0].nodeIds
      .map((nodeId) => nodeId === 'C' ? 'D' : nodeId);
    store.replaceDocument(document, 'CONTINUUM-REVALIDATION-TOPOLOGY');
    const before = store.getState().stages['LAFEA.3'];
    assert.equal(before.lastSourceAuthorityEvent.changeClass, 'GEOMETRY');
    assert.throws(
      () => store.revalidateContinuumGeometryMesh(),
      (error) => error?.code === 'LAFEA_CONTINUUM_REVALIDATION_CHANGE_CLASS_NOT_ELIGIBLE',
    );
    const after = store.getState().stages['LAFEA.3'];
    assert.equal(after.lifecycle.artifacts.CANONICAL_MODEL.status, 'STALE');
    assert.equal(after.lifecycle.artifacts.ANALYSIS_GEOMETRY.status, 'STALE');
    assert.equal(after.lifecycle.artifacts.ANALYSIS_MESH.status, 'STALE');
  } finally {
    store.destroy();
  }
}

function qualifiedProducerBatch(document) {
  const store = createLafeaWorkbenchStore({
    initialStage: 'LAFEA.3',
    initialDocument: document,
  });
  try {
    store.run();
    const stage = store.getState().stages['LAFEA.3'];
    assert.equal(stage.execution.status, 'QUALIFIED');
    const authority = issueLafeaSourceAuthority(
      'LAFEA.3',
      stage.document,
      'CONTINUUM-REVALIDATION-REFERENCE',
    );
    return createLafeaLifecycleProducerBatch({
      stageId: 'LAFEA.3',
      sourceAuthority: authority,
      execution: stage.execution,
    });
  } finally {
    store.destroy();
  }
}

function snapshot(lifecycle) {
  return {
    canonicalModelHash: lifecycle.artifacts.CANONICAL_MODEL.artifactHash,
    analysisGeometryHash: lifecycle.artifacts.ANALYSIS_GEOMETRY.artifactHash,
    meshHash: lifecycle.artifacts.ANALYSIS_MESH.artifactHash,
  };
}

function record(batch, kind) {
  const value = batch.records.find((row) => row.kind === kind);
  assert.ok(value, `${kind} record is required`);
  return value;
}
