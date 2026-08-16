#!/usr/bin/env node
import assert from 'node:assert/strict';

import { createLafeaMockDocument } from '../src/workspace/advanced-mock-data.js';
import { createLafeaSimulatedShellMidsurfaceEvidence } from '../src/workspace/lafea-simulated-shell-midsurface-provider.js';
import { cylindricalShellUvAtPoint3d } from '../src/workspace/lafea-shell-curved-midsurface-contract.js';

const SOURCE_HASH = `sha256:${'c'.repeat(64)}`;

const lafea4 = createLafeaMockDocument('LAFEA.4');
const parent4 = createLafeaSimulatedShellMidsurfaceEvidence('LAFEA.4', SOURCE_HASH, lafea4);
assert.equal(lafea4.modelIdentity, 'CYLINDRICAL_PIPE_SHELL_BENCHMARK');
assert.equal(lafea4.nodes.length, 26);
assert.equal(lafea4.elements.length, 24);
assert.equal(parent4.stageId, 'LAFEA.4');
assert.equal(parent4.sourceHash, SOURCE_HASH);
assert.equal(parent4.qualification, 'PASS');
assert.equal(parent4.geometry.surface.kind, 'CYLINDER');
assert.equal(parent4.geometry.surface.radius, 100);
for (const node of lafea4.nodes) {
  const uv = cylindricalShellUvAtPoint3d(parent4.geometry, {
    x: node.position[0], y: node.position[1], z: node.position[2],
  });
  assert.ok(Number.isFinite(uv.u));
  assert.ok(Number.isFinite(uv.v));
}

const lafea5 = createLafeaMockDocument('LAFEA.5');
const parent5 = createLafeaSimulatedShellMidsurfaceEvidence('LAFEA.5', SOURCE_HASH, lafea5);
assert.equal(lafea5.workflowIdentity, 'TRUNNION-WORKFLOW-1');
assert.equal(lafea5.shellTemplate.nodes.length, 24);
assert.equal(lafea5.shellTemplate.elements.length, 24);
assert.equal(parent5, null);

console.log(JSON.stringify({
  schema: 'lafea-shell-sample-parent-check/v1',
  status: 'PASS',
  lafea4: {
    sampleGeometry: 'CYLINDRICAL_PIPE_SHELL_BENCHMARK',
    sampleNodes: lafea4.nodes.length,
    sampleElements: lafea4.elements.length,
    surface: parent4.geometry.surface.kind,
    radius: parent4.geometry.surface.radius,
    axialLength: 50,
    angularSpanDegrees: 60,
    shellParentRegistered: true,
  },
  lafea5: {
    sampleGeometry: 'TRUNNION_FOOTPRINT_CALLER_AUTHORED_SHELL_TEMPLATE',
    sampleNodes: lafea5.shellTemplate.nodes.length,
    sampleElements: lafea5.shellTemplate.elements.length,
    shellParentRegistered: false,
    disposition: 'FOOTPRINT_BAND_SURFACE_OR_SOURCE_MESH_ADOPTION_NOT_YET_QUALIFIED',
  },
}, null, 2));
