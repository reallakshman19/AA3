#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  LAFEA_MESH_RESOURCE_CEILING_V3_SCHEMA,
  LAFEA_MESH_RUNTIME_RESOURCE_RECEIPT_V3_SCHEMA,
  createLafeaMeshResourceCeilingV3,
  assessLafeaMeshResourcePlanV3,
  createLafeaMeshRuntimeResourceReceiptV3,
} from '../src/workspace/lafea-mesh-resource-admission-v3.js';
import {
  buildLafeaMeshOperationPolicyV3,
  requireLafeaMeshOperationV3,
} from '../src/workspace/lafea-mesh-operation-policy-v3.js';

const ceiling = createLafeaMeshResourceCeilingV3({
  schema: LAFEA_MESH_RESOURCE_CEILING_V3_SCHEMA,
  maximumNodes: 1000, maximumElements: 1500, maximumDofs: 6000,
  maximumResidentBytes: 200_000_000, maximumExecutionMilliseconds: 60_000,
  warningFraction: .8,
});
const optimisticPlan = assessLafeaMeshResourcePlanV3({
  estimatedNodes: 100, estimatedElements: 150, estimatedDofs: 600,
  estimatedResidentBytes: 10_000_000, estimatedExecutionMilliseconds: 1000,
}, ceiling);
assert.equal(optimisticPlan.disposition, 'WITHIN_LIMITS');
const aborted = createLafeaMeshRuntimeResourceReceiptV3({
  schema: LAFEA_MESH_RUNTIME_RESOURCE_RECEIPT_V3_SCHEMA,
  ceilingHash: ceiling.ceilingHash,
  observedNodes: 1001, observedElements: 1400, observedDofs: 5900,
  peakResidentBytes: 150_000_000, elapsedMilliseconds: 10_000,
  termination: 'ABORTED_RESOURCE_LIMIT',
  partialOutputDisposition: 'DESTROYED',
}, ceiling);
assert.equal(aborted.retainable, false);
assert.equal(aborted.violations[0].metric, 'NODES');
assert.throws(() => createLafeaMeshRuntimeResourceReceiptV3({
  schema: LAFEA_MESH_RUNTIME_RESOURCE_RECEIPT_V3_SCHEMA,
  ceilingHash: ceiling.ceilingHash,
  observedNodes: 1001, observedElements: 1400, observedDofs: 5900,
  peakResidentBytes: 150_000_000, elapsedMilliseconds: 10_000,
  termination: 'COMPLETED', partialOutputDisposition: 'NONE',
}, ceiling), (error) => error?.code === 'LAFEA_MESH_RESOURCE_V3_LIMIT_EXCEEDED_WITHOUT_ABORT');

const stale = buildLafeaMeshOperationPolicyV3('STALE');
assert.equal(stale.rules.find((row) => row.operation === 'SOLVER_RUN').disposition, 'DENY_STALE');
assert.equal(stale.rules.find((row) => row.operation === 'VIEW').disposition, 'ALLOW_HISTORICAL');
assert.doesNotThrow(() => requireLafeaMeshOperationV3('STALE', 'RESULT_OVERLAY', {
  meshContentHash: hash('M1'), resultMeshContentHash: hash('M1'),
}));
assert.throws(() => requireLafeaMeshOperationV3('STALE', 'RESULT_OVERLAY', {
  meshContentHash: hash('M1'), resultMeshContentHash: hash('M2'),
}), (error) => error?.code === 'LAFEA_MESH_OPERATION_V3_RESULT_OVERLAY_MESH_MISMATCH');
assert.throws(() => requireLafeaMeshOperationV3('STALE', 'SOLVER_RUN'),
  (error) => error?.code === 'LAFEA_MESH_OPERATION_V3_SOLVER_RUN_DENIED');

console.log(JSON.stringify({
  check: 'lafea-mesh-workspace-v3-batch8', status: 'PASS',
  optimisticEstimatesDoNotOverrideRuntimeCeilings: true,
  resourceAbortIsNonretainable: true,
  partialOutputDispositionGoverned: true,
  staleMeshRemainsInspectableButNotRunnable: true,
  staleResultOverlayRequiresExactMeshIdentity: true,
}));

function hash(value) { return `sha256:${value.padEnd(64, '0').slice(0, 64).replace(/[^0-9a-f]/gu, 'a')}`; }
