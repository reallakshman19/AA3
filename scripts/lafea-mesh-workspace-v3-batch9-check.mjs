#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  LAFEA_SELECTION_REFERENCE_V3_SCHEMA,
  createLafeaSelectionReferenceV3,
  classifyLafeaSelectionTransitionV3,
} from '../src/workspace/lafea-selection-reference-v3.js';
import {
  LAFEA_RENDER_PROXY_V3_SCHEMA,
  createLafeaRenderProxyV3,
  resolveLafeaRenderProxyElementSelectionV3,
} from '../src/workspace/lafea-render-proxy-v3.js';

const meshHash = hash('M1');
const elementSelection = createLafeaSelectionReferenceV3({
  schema: LAFEA_SELECTION_REFERENCE_V3_SCHEMA,
  kind: 'MESH_ELEMENT', stageId: 'LAFEA.4',
  locator: { meshContentHash: meshHash, elementId: 'E10' },
});
assert.equal(classifyLafeaSelectionTransitionV3(elementSelection, {
  stageId: 'LAFEA.4', meshContentHash: meshHash,
}), 'PRESERVE_EXACT_MESH');
assert.equal(classifyLafeaSelectionTransitionV3(elementSelection, {
  stageId: 'LAFEA.4', meshContentHash: hash('M2'),
}), 'INVALIDATE_MESH_CHANGED');

const proxy = createLafeaRenderProxyV3({
  schema: LAFEA_RENDER_PROXY_V3_SCHEMA,
  stageId: 'LAFEA.4', meshContentHash: meshHash, renderLodHash: hash('LOD'),
  proxyId: 'DECIMATED-T17', authoritativeElementIds: ['E10', 'E11', 'E12'],
});
assert.throws(() => resolveLafeaRenderProxyElementSelectionV3(proxy, {
  expectedMeshContentHash: meshHash,
}), (error) => error?.code === 'LAFEA_RENDER_PROXY_V3_AMBIGUOUS_PICK');
const resolved = resolveLafeaRenderProxyElementSelectionV3(proxy, {
  expectedMeshContentHash: meshHash, exactElementId: 'E11',
});
assert.equal(resolved.locator.elementId, 'E11');
assert.equal(resolved.locator.meshContentHash, meshHash);
assert.throws(() => resolveLafeaRenderProxyElementSelectionV3(proxy, {
  expectedMeshContentHash: hash('M2'), exactElementId: 'E11',
}), (error) => error?.code === 'LAFEA_RENDER_PROXY_V3_MESH_MISMATCH');

const feature = createLafeaSelectionReferenceV3({
  schema: LAFEA_SELECTION_REFERENCE_V3_SCHEMA,
  kind: 'GEOMETRY_FEATURE', stageId: 'LAFEA.4',
  locator: { analysisGeometryHash: hash('G1'), featureId: 'HOLE-1' },
});
assert.equal(classifyLafeaSelectionTransitionV3(feature, {
  stageId: 'LAFEA.4', analysisGeometryHash: hash('G2'),
}), 'TRANSFORM_REQUIRES_PROVEN_ANCESTRY');

console.log(JSON.stringify({
  check: 'lafea-mesh-workspace-v3-batch9', status: 'PASS',
  meshSelectionInvalidatesOnRemesh: true,
  geometrySelectionRequiresAncestryOnGeometryChange: true,
  ambiguousLodPickCannotBecomeEngineeringSelection: true,
  exactLodPickResolvesToRetainedMeshNamespace: true,
  staleRenderProxyCannotResolveAgainstDifferentMesh: true,
}));

function hash(value) {
  const hex = Buffer.from(value).toString('hex').padEnd(64, '0').slice(0, 64);
  return `sha256:${hex}`;
}
