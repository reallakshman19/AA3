#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  createLafeaLifecycleProducerBatch,
  createLafeaWorkbenchStore,
  issueLafeaSourceAuthority,
} from '../src/workspace/lafea-workbench.js';
import { lafeaAnalysisMeshContentHash } from '../src/workspace/lafea-analysis-mesh-contract.js';
import { createLafeaContinuumSourceAnalysisMesh } from '../src/workspace/lafea-continuum-source-mesh.js';
import { clone, triangleSource } from './lafea.3-fixtures.mjs';

const baseline = qualify(triangleSource());
const baselineSourceMesh = createLafeaContinuumSourceAnalysisMesh(
  baseline.execution.canonicalInput,
);
assert.equal(
  baseline.meshRecord.artifactHash,
  lafeaAnalysisMeshContentHash(baselineSourceMesh),
);
assert.equal(
  baselineSourceMesh.meshIdentity,
  `LAFEA.3/SOURCE_AUTHORED/${baseline.geometryRecord.artifactHash}`,
  'source-authored mesh identity must bind the exact canonical geometry identity',
);
assert.ok(
  baselineSourceMesh.nodes.every((row) => row.z === 0),
  'LAFEA.3 source-authored mesh must remain exactly planar at z=0',
);
assert.notEqual(
  baseline.meshRecord.artifactHash,
  baseline.geometryRecord.artifactHash,
  'mesh content identity must remain distinct from geometry identity',
);
assert.equal(
  baseline.meshRecord.parentHashes.analysisGeometryHash,
  baseline.geometryRecord.artifactHash,
);
assert.equal(
  baseline.executionRecord.parentHashes.meshHash,
  baseline.meshRecord.artifactHash,
);

const material = qualify(triangleSource({ elasticModulus: 210000 }));
assertStableMesh(baseline, material, 'material');

const section = qualify(triangleSource({ thickness: 12.5 }));
assertStableMesh(baseline, section, 'section');

const loadEdit = clone(triangleSource());
loadEdit.loadCases[0].nodalForces[0].fx = 1750;
const load = qualify(loadEdit);
assertStableMesh(baseline, load, 'load');

const bcEdit = clone(triangleSource());
bcEdit.constraints[0].value = 0.125;
const bc = qualify(bcEdit);
assertStableMesh(baseline, bc, 'boundary-condition');

const provenanceEdit = clone(triangleSource());
provenanceEdit.elements[0].sourceReference = 'ELEMENT#E1/REVISED-PROVENANCE';
const provenance = qualify(provenanceEdit);
assertStableMesh(baseline, provenance, 'provenance');

const coordinateEdit = clone(triangleSource());
coordinateEdit.nodes.find((row) => row.nodeId === 'B').x = 125;
const coordinate = qualify(coordinateEdit);
assertChangedMesh(baseline, coordinate, 'node-coordinate');

const topologyEdit = clone(triangleSource());
const nodeC = topologyEdit.nodes.find((row) => row.nodeId === 'C');
nodeC.nodeId = 'D';
nodeC.sourceReference = 'NODE#D';
topologyEdit.elements[0].nodeIds = topologyEdit.elements[0].nodeIds
  .map((nodeId) => nodeId === 'C' ? 'D' : nodeId);
const topology = qualify(topologyEdit);
assertChangedMesh(baseline, topology, 'node/topology-identity');

console.log(JSON.stringify({
  schema: 'lafea-continuum-mesh-identity-check/v1',
  check: 'lafea-continuum-mesh-identity',
  status: 'PASS',
  stageId: 'LAFEA.3',
  stableAcross: ['material', 'section', 'load', 'boundary-condition', 'provenance'],
  changesFor: ['node-coordinate', 'node/topology-identity'],
  deterministicMeshIdentity: true,
  planarZBinding: true,
  geometryAndMeshHashesDistinct: true,
  executionStillBindsPhysics: true,
  meshCurrentnessChanged: false,
  releaseAuthorityChanged: false,
}));

function qualify(document) {
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
      'CONTINUUM-MESH-IDENTITY-CHECK',
    );
    const batch = createLafeaLifecycleProducerBatch({
      stageId: 'LAFEA.3',
      sourceAuthority: authority,
      execution: stage.execution,
    });
    return {
      authority,
      execution: stage.execution,
      batch,
      modelRecord: record(batch, 'CANONICAL_MODEL'),
      geometryRecord: record(batch, 'ANALYSIS_GEOMETRY'),
      meshRecord: record(batch, 'ANALYSIS_MESH'),
      executionRecord: record(batch, 'EXECUTION'),
    };
  } finally {
    store.destroy();
  }
}

function assertStableMesh(baselineValue, changedValue, label) {
  assert.equal(
    changedValue.geometryRecord.artifactHash,
    baselineValue.geometryRecord.artifactHash,
    `${label} edit must leave canonical geometry identity unchanged`,
  );
  assert.equal(
    changedValue.meshRecord.artifactHash,
    baselineValue.meshRecord.artifactHash,
    `${label} edit must leave canonical mesh content identity unchanged`,
  );
  assert.notEqual(
    changedValue.authority.sourceHash,
    baselineValue.authority.sourceHash,
    `${label} edit must still change exact source authority`,
  );
  assert.notEqual(
    changedValue.modelRecord.artifactHash,
    baselineValue.modelRecord.artifactHash,
    `${label} edit must still change canonical-model evidence`,
  );
  assert.notEqual(
    changedValue.executionRecord.artifactHash,
    baselineValue.executionRecord.artifactHash,
    `${label} edit must still change execution evidence`,
  );
  assert.equal(
    changedValue.meshRecord.parentHashes.analysisGeometryHash,
    changedValue.geometryRecord.artifactHash,
  );
  assert.equal(
    changedValue.executionRecord.parentHashes.meshHash,
    changedValue.meshRecord.artifactHash,
  );
  assert.equal(changedValue.batch.releaseQualified, false);
}

function assertChangedMesh(baselineValue, changedValue, label) {
  assert.notEqual(
    changedValue.geometryRecord.artifactHash,
    baselineValue.geometryRecord.artifactHash,
    `${label} edit must change geometry identity`,
  );
  assert.notEqual(
    changedValue.meshRecord.artifactHash,
    baselineValue.meshRecord.artifactHash,
    `${label} edit must change mesh content identity`,
  );
}

function record(batch, kind) {
  const value = batch.records.find((row) => row.kind === kind);
  assert.ok(value, `${kind} record is required`);
  return value;
}
