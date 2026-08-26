#!/usr/bin/env node
import assert from 'node:assert/strict';

import { buildLafeaViewportModePresentation } from '../src/workspace/lafea-workbench-content.js';

const stage = Object.freeze({ document: Object.freeze({ modelIdentity: 'TEST' }) });

const unsupported = byId(buildLafeaViewportModePresentation(
  { mode: 'SOURCE_AUTHORING', renderer: 'Canvas2D' },
  null,
  stage,
  { meshApplicable: false, executionSupported: false },
));
assert.equal(unsupported.geometry.value, 'Available');
assert.equal(unsupported.geometry.active, true);
assert.equal(unsupported.mesh.value, 'Not applicable');
assert.equal(unsupported.mesh.active, false);
assert.equal(unsupported.result.value, 'Not applicable');
assert.equal(unsupported.result.active, false);

const analytical = byId(buildLafeaViewportModePresentation(
  { mode: 'SOURCE_AUTHORING', renderer: 'Canvas2D' },
  null,
  stage,
  { meshApplicable: false, executionSupported: true },
));
assert.equal(analytical.mesh.value, 'Not applicable');
assert.equal(analytical.result.value, 'Waiting for qualified result');
assert.equal(analytical.result.active, false);

const feaBeforeMesh = byId(buildLafeaViewportModePresentation(
  { mode: 'SOURCE_AUTHORING', renderer: 'Canvas2D' },
  null,
  stage,
  { meshApplicable: true, executionSupported: true },
));
assert.equal(feaBeforeMesh.mesh.value, 'Not generated');
assert.equal(feaBeforeMesh.mesh.active, false);
assert.equal(feaBeforeMesh.result.value, 'Waiting for qualified result');

const feaQualified = byId(buildLafeaViewportModePresentation(
  { mode: 'QUALIFIED_RESULT', renderer: 'Canvas2D' },
  { mesh: { elements: [{ id: 'E1' }, { id: 'E2' }] } },
  stage,
  { meshApplicable: true, executionSupported: true },
));
assert.equal(feaQualified.mesh.value, '2 elements');
assert.equal(feaQualified.mesh.active, true);
assert.equal(feaQualified.result.value, 'Ready · Canvas2D');
assert.equal(feaQualified.result.active, true);

assert.throws(
  () => buildLafeaViewportModePresentation({}, null, stage, {}),
  /LAFEA_VIEWPORT_APPLICABILITY_REQUIRED/u,
);

console.log(JSON.stringify({
  check: 'lafea-viewport-applicability',
  status: 'PASS',
  unsupportedMesh: unsupported.mesh.value,
  unsupportedResult: unsupported.result.value,
  analyticalMesh: analytical.mesh.value,
  feaBeforeMesh: feaBeforeMesh.mesh.value,
  feaQualifiedMesh: feaQualified.mesh.value,
  feaQualifiedResult: feaQualified.result.value,
  engineeringAuthorityChanged: false,
}, null, 2));

function byId(items) {
  return Object.fromEntries(items.map((item) => [item.modeId, item]));
}
