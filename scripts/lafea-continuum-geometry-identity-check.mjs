#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  createLafeaLifecycleProducerBatch,
  createLafeaWorkbenchStore,
  issueLafeaSourceAuthority,
} from '../src/workspace/lafea-workbench.js';
import { createLafeaContinuumGeometryProjection } from '../src/workspace/lafea-continuum-geometry-projection.js';
import { clone, triangleSource } from './lafea.3-fixtures.mjs';

const baseline = qualify(triangleSource());
assert.equal(
  baseline.geometryRecord.artifactHash,
  createLafeaContinuumGeometryProjection(baseline.execution.canonicalInput).semanticHash,
);
assert.equal(baseline.geometryRecord.parentHashes.sourceHash, baseline.authority.sourceHash);
assert.equal(
  baseline.geometryRecord.parentHashes.canonicalModelHash,
  baseline.modelRecord.artifactHash,
);

const materialEdit = triangleSource({ elasticModulus: 210000 });
const material = qualify(materialEdit);
assertStableGeometry(baseline, material, 'material');

const sectionEdit = triangleSource({ thickness: 12.5 });
const section = qualify(sectionEdit);
assertStableGeometry(baseline, section, 'section');

const loadEdit = clone(triangleSource());
loadEdit.loadCases[0].nodalForces[0].fx = 1750;
const load = qualify(loadEdit);
assertStableGeometry(baseline, load, 'load');

const bcEdit = clone(triangleSource());
bcEdit.constraints[0].value = 0.125;
const bc = qualify(bcEdit);
assertStableGeometry(baseline, bc, 'boundary-condition');

const provenanceEdit = clone(triangleSource());
provenanceEdit.nodes[0].sourceReference = 'NODE#A/REVISED-PROVENANCE';
const provenance = qualify(provenanceEdit);
assertStableGeometry(baseline, provenance, 'provenance');

const coordinateEdit = clone(triangleSource());
coordinateEdit.nodes.find((row) => row.nodeId === 'B').x = 125;
const coordinate = qualify(coordinateEdit);
assert.notEqual(
  coordinate.geometryRecord.artifactHash,
  baseline.geometryRecord.artifactHash,
  'node-coordinate edit must change canonical geometry identity',
);

const topologyEdit = clone(triangleSource());
const nodeC = topologyEdit.nodes.find((row) => row.nodeId === 'C');
nodeC.nodeId = 'D';
nodeC.sourceReference = 'NODE#D';
topologyEdit.elements[0].nodeIds = topologyEdit.elements[0].nodeIds
  .map((nodeId) => nodeId === 'C' ? 'D' : nodeId);
const topology = qualify(topologyEdit);
assert.notEqual(
  topology.geometryRecord.artifactHash,
  baseline.geometryRecord.artifactHash,
  'stable node/topology identity edit must change canonical geometry identity',
);

console.log(JSON.stringify({
  schema: 'lafea-continuum-geometry-identity-check/v1',
  check: 'lafea-continuum-geometry-identity',
  status: 'PASS',
  stageId: 'LAFEA.3',
  stableAcross: ['material', 'section', 'load', 'boundary-condition', 'provenance'],
  changesFor: ['node-coordinate', 'node/topology-identity'],
  lifecycleParentsRemainExact: true,
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
      'CONTINUUM-GEOMETRY-IDENTITY-CHECK',
    );
    const batch = createLafeaLifecycleProducerBatch({
      stageId: 'LAFEA.3',
      sourceAuthority: authority,
      execution: stage.execution,
    });
    const geometryRecord = record(batch, 'ANALYSIS_GEOMETRY');
    const modelRecord = record(batch, 'CANONICAL_MODEL');
    return {
      authority,
      execution: stage.execution,
      geometryRecord,
      modelRecord,
    };
  } finally {
    store.destroy();
  }
}

function assertStableGeometry(baselineValue, changedValue, label) {
  assert.equal(
    changedValue.geometryRecord.artifactHash,
    baselineValue.geometryRecord.artifactHash,
    `${label} edit must not change canonical geometry identity`,
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
  assert.equal(
    changedValue.geometryRecord.parentHashes.sourceHash,
    changedValue.authority.sourceHash,
  );
  assert.equal(
    changedValue.geometryRecord.parentHashes.canonicalModelHash,
    changedValue.modelRecord.artifactHash,
  );
}

function record(batch, kind) {
  const value = batch.records.find((row) => row.kind === kind);
  assert.ok(value, `${kind} record is required`);
  return value;
}
