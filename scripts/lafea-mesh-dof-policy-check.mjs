#!/usr/bin/env node
import assert from 'node:assert/strict';

import { DOFS as LOCAL_SHELL_DOFS } from '../src/core/local-shell/constants.js';
import { createLafeaAnalysisGeometry } from '../src/workspace/lafea-analysis-geometry-contract.js';
import {
  estimateLafeaMeshDofs,
  lafeaMeshDofsPerNode,
} from '../src/workspace/lafea-mesh-dof-policy.js';
import { buildLafeaMeshTopology } from '../src/workspace/lafea-mesh-geometry-topology-adapter.js';
import { generateLafeaAnalysisMesh } from '../src/workspace/lafea-mesh-producer-engine.js';
import { lafeaMeshStageAdapter } from '../src/workspace/lafea-mesh-stage-adapter.js';
import { requireLafeaStageAnalysisAdapter } from '../src/workspace/lafea-stage-analysis-adapter.js';

assert.deepEqual(LOCAL_SHELL_DOFS, ['UX', 'UY', 'UZ', 'R1', 'R2']);
assert.equal(lafeaMeshDofsPerNode('LAFEA.3'), 2);
assert.equal(lafeaMeshDofsPerNode('LAFEA.4'), LOCAL_SHELL_DOFS.length);
assert.equal(lafeaMeshDofsPerNode('LAFEA.5'), LOCAL_SHELL_DOFS.length);
assert.equal(estimateLafeaMeshDofs('LAFEA.3', 17), 34);
assert.equal(estimateLafeaMeshDofs('LAFEA.4', 17), 85);
assert.equal(estimateLafeaMeshDofs('LAFEA.5', 17), 85);

for (const [stageId, expected] of [
  ['LAFEA.3', 2], ['LAFEA.4', 5], ['LAFEA.5', 5],
]) {
  assert.equal(requireLafeaStageAnalysisAdapter(stageId).discretization.dofsPerNode, expected);
  assert.equal(lafeaMeshStageAdapter(stageId).dofsPerNode, expected);
}

assert.throws(
  () => lafeaMeshDofsPerNode('LAFEA.2'),
  (error) => error?.code === 'LAFEA_MESH_DOF_POLICY_STAGE_NOT_SUPPORTED',
);
assert.throws(
  () => estimateLafeaMeshDofs('LAFEA.3', -1),
  (error) => error?.code === 'LAFEA_MESH_DOF_POLICY_NODE_COUNT_INVALID',
);

const geometry = createLafeaAnalysisGeometry({
  schema: 'lafea-analysis-geometry/v1',
  stageId: 'LAFEA.3',
  geometryId: 'DOF-POLICY-CHECK',
  coordinateSystemId: 'GLOBAL',
  lengthUnit: 'mm',
  orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
  vertices: [
    { vertexId: 'V1', x: 0, y: 0 },
    { vertexId: 'V2', x: 100, y: 0 },
    { vertexId: 'V3', x: 100, y: 60 },
    { vertexId: 'V4', x: 0, y: 60 },
  ],
  segments: [
    line('S1', 'V1', 'V2'), line('S2', 'V2', 'V3'),
    line('S3', 'V3', 'V4'), line('S4', 'V4', 'V1'),
  ],
  loops: [{ loopId: 'L_OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3', 'S4'] }],
});
const topologyAdapter = buildLafeaMeshTopology(geometry);
assert.equal(topologyAdapter.stageId, 'LAFEA.3');
const generated = generateLafeaAnalysisMesh(topologyAdapter, {
  targetElementLength: 20,
  curvatureToleranceDegrees: 15,
  elementFamily: 'T6',
});
assert.equal(generated.estimatedDofs, generated.nodeCount * 2);

console.log(JSON.stringify({
  status: 'PASS',
  policy: 'lafea-mesh-dof-policy/v1',
  dofsPerNode: { 'LAFEA.3': 2, 'LAFEA.4': 5, 'LAFEA.5': 5 },
  shellBasis: LOCAL_SHELL_DOFS,
  engineEstimate: { nodes: generated.nodeCount, dofs: generated.estimatedDofs },
}, null, 2));

function line(segmentId, startVertexId, endVertexId) {
  return { segmentId, type: 'LINE', startVertexId, endVertexId };
}
