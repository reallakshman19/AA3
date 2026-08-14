#!/usr/bin/env node
import assert from 'node:assert/strict';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import {
  LAFEA_CONTINUUM_MESH_ADAPTER_PAYLOAD_V3_SCHEMA,
  LAFEA_SHELL_MESH_ADAPTER_PAYLOAD_V3_SCHEMA,
  lafeaMeshAdapterCapabilityV3,
} from '../src/workspace/lafea-mesh-adapter-capability-v3.js';
import {
  createLafeaContinuumMeshAdapterPayloadV3,
  createLafeaShellMeshAdapterPayloadV3,
} from '../src/workspace/lafea-mesh-adapter-payload-v3.js';

for (const stageId of ['LAFEA.3', 'LAFEA.4', 'LAFEA.5']) {
  const capability = lafeaMeshAdapterCapabilityV3(stageId);
  assert.deepEqual(capability.allowedSizingModes, ['ISOTROPIC_SCALAR_ONLY']);
  assert.equal(capability.localRefinementAuthorized, false);
  assert.equal(capability.adaptiveRefinementAuthorized, false);
  assert.equal(capability.anisotropicSizingAuthorized, false);
  assert.equal(capability.convergenceAutomationAuthorized, false);
  assert.equal(capability.crossStageHostReuseAuthorized, false);
}

const continuum = createLafeaContinuumMeshAdapterPayloadV3({
  schema: LAFEA_CONTINUUM_MESH_ADAPTER_PAYLOAD_V3_SCHEMA,
  stageId: 'LAFEA.3', meshDependencyHash: hash('D3'), meshProfileHash: 'fnv1a64:profile',
  elementFamily: 'T6', sizingMode: 'ISOTROPIC_SCALAR_ONLY', targetElementLength: 10,
  lengthUnit: 'mm', curvatureToleranceDegrees: 10, growthLimit: 1.4, fallbackPolicy: 'T3_ONLY',
});
assert.equal(continuum.elementFamily, 'T6');
assert.equal(continuum.engineeringAuthority, false);
assert.throws(() => createLafeaContinuumMeshAdapterPayloadV3({
  schema: LAFEA_CONTINUUM_MESH_ADAPTER_PAYLOAD_V3_SCHEMA,
  stageId: 'LAFEA.3', meshDependencyHash: hash('D3'), meshProfileHash: 'fnv1a64:profile',
  elementFamily: 'T6', sizingMode: 'ANISOTROPIC_TENSOR', targetElementLength: 10,
  lengthUnit: 'mm', curvatureToleranceDegrees: 10, growthLimit: 1.4, fallbackPolicy: 'NONE',
}), (error) => error?.code === 'LAFEA_MESH_ADAPTER_V3_SIZING_MODE_INVALID');

const shell = createLafeaShellMeshAdapterPayloadV3({
  schema: LAFEA_SHELL_MESH_ADAPTER_PAYLOAD_V3_SCHEMA,
  stageId: 'LAFEA.5', meshDependencyHash: hash('D5'), meshProfileHash: 'fnv1a64:profile',
  midsurfaceEvidenceHash: hash('MID'), elementFamily: 'CST_DKT_TRI3_THIN_SHELL_V1',
  sizingMode: 'ISOTROPIC_SCALAR_ONLY', targetElementLength: 8, lengthUnit: 'mm',
  curvatureToleranceDegrees: 10, growthLimit: 1.4, generationMode: 'GENERATE_NEW',
  hostTransferHash: null,
});
assert.equal(shell.generationMode, 'GENERATE_NEW');
assert.throws(() => createLafeaShellMeshAdapterPayloadV3({
  schema: LAFEA_SHELL_MESH_ADAPTER_PAYLOAD_V3_SCHEMA,
  stageId: 'LAFEA.5', meshDependencyHash: hash('D5'), meshProfileHash: 'fnv1a64:profile',
  midsurfaceEvidenceHash: hash('MID'), elementFamily: 'CST_DKT_TRI3_THIN_SHELL_V1',
  sizingMode: 'ISOTROPIC_SCALAR_ONLY', targetElementLength: 8, lengthUnit: 'mm',
  curvatureToleranceDegrees: 10, growthLimit: 1.4, generationMode: 'GENERATE_NEW',
  hostTransferHash: hash('T45'),
}), (error) => error?.code === 'LAFEA_SHELL_MESH_ADAPTER_V3_CROSS_STAGE_REUSE_NOT_AUTHORIZED');

assert.throws(() => createLafeaContinuumMeshAdapterPayloadV3({
  schema: LAFEA_CONTINUUM_MESH_ADAPTER_PAYLOAD_V3_SCHEMA,
  stageId: 'LAFEA.3', meshDependencyHash: hash('D3'), meshProfileHash: 'fnv1a64:profile',
  elementFamily: 'T6', sizingMode: 'ISOTROPIC_SCALAR_ONLY', targetElementLength: 10,
  lengthUnit: 'mm', curvatureToleranceDegrees: 10, growthLimit: 1.4, fallbackPolicy: 'NONE',
  anisotropicMetric: [[1, 0], [0, 1]],
}), (error) => error?.code === 'LAFEA_CONTINUUM_MESH_ADAPTER_V3_KEYS_INVALID');

console.log(JSON.stringify({
  check: 'lafea-mesh-workspace-v3-batch7', status: 'PASS',
  genericPolicyStaysOutsideAdapterPayloads: true,
  continuumFamiliesAreStageOwned: true,
  shellFamilyIsStageOwned: true,
  anisotropicSizingRejected: true,
  adaptiveAndLocalRefinementNotAdvertised: true,
  crossStageReuseContractExistsButExecutionNotAdvertised: true,
}));

function hash(value) {
  return canonicalLafeaSha256({ schema: 'lafea-mesh-workspace-v3-batch7-fixture/v1', value });
}
