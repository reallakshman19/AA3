#!/usr/bin/env node
import assert from 'node:assert/strict';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import {
  LAFEA_MESH_WORKSPACE_CAPABILITY_V3_SCHEMA,
  LAFEA_MESH_WORKSPACE_STATE_V3_SCHEMA,
  LAFEA_MESH_WORKSPACE_COMMAND_V3_SCHEMA,
  LAFEA_MESH_WORKSPACE_AUTHORITY_VERSION,
  createLafeaMeshWorkspaceCapabilityV3,
  createLafeaMeshWorkspaceStateV3,
  createLafeaMeshWorkspaceCommandV3,
  expectedLafeaMeshCommandParentsV3,
  assertLafeaMeshCommandParentsV3,
} from '../src/workspace/lafea-mesh-workspace-v3.js';
import {
  LAFEA_MESH_RETENTION_V3_SCHEMA,
  commitLafeaMeshRetentionCasV3,
} from '../src/workspace/lafea-mesh-retention-cas-v3.js';

const capability = createLafeaMeshWorkspaceCapabilityV3({
  schema: LAFEA_MESH_WORKSPACE_CAPABILITY_V3_SCHEMA,
  stageId: 'LAFEA.3',
  adapterId: 'LAFEA_MESH_ADAPTER:LAFEA.3:V3',
  adapterRevision: '3',
  adapterCapabilityHash: hash('ADAPTER_CAPABILITY'),
  qualificationHash: hash('QUALIFICATION'),
  allowedCommands: ['PLAN', 'GENERATE', 'RETAIN'],
});
const initial = createLafeaMeshWorkspaceStateV3({
  schema: LAFEA_MESH_WORKSPACE_STATE_V3_SCHEMA,
  stageId: 'LAFEA.3',
  authorityVersion: LAFEA_MESH_WORKSPACE_AUTHORITY_VERSION,
  custodyState: 'ABSENT',
  meshDependencyHash: hash('G1/P1'),
  retainedMeshContentHash: null,
  retainedEvidenceHash: null,
  retainedAuthorityReceiptHash: null,
  capabilityHash: capability.capabilityHash,
  qualificationHash: hash('QUALIFICATION'),
  adapterId: 'LAFEA_MESH_ADAPTER:LAFEA.3:V3',
  adapterRevision: '3',
  concurrencyVersion: 0,
});
const retain = createLafeaMeshWorkspaceCommandV3({
  schema: LAFEA_MESH_WORKSPACE_COMMAND_V3_SCHEMA,
  commandId: 'RETAIN/M1',
  commandKind: 'RETAIN',
  stageId: 'LAFEA.3',
  expectedParents: expectedLafeaMeshCommandParentsV3(initial),
  adapterId: initial.adapterId,
  adapterRevision: initial.adapterRevision,
  payloadHash: hash('M1_OUTPUT'),
});
assert.doesNotThrow(() => assertLafeaMeshCommandParentsV3(retain, initial));
const { workspaceStateHash: ignoredInitialHash, ...initialInput } = initial;
const geometryEdited = createLafeaMeshWorkspaceStateV3({
  ...initialInput,
  meshDependencyHash: hash('G2/P1'),
  concurrencyVersion: 1,
});
assert.throws(
  () => assertLafeaMeshCommandParentsV3(retain, geometryEdited),
  (error) => error?.code?.endsWith('_MISMATCH'),
);

assert.throws(
  () => commitLafeaMeshRetentionCasV3(retain, initial, retention(null)),
  (error) => error?.code === 'LAFEA_MESH_RETENTION_V3_CURRENT_PASS_AUTHORITY_RECEIPT_REQUIRED',
);
const receiptHash = hash('TRUSTED_RECEIPT');
const committed = commitLafeaMeshRetentionCasV3(retain, initial, retention(receiptHash));
assert.equal(committed.nextState.concurrencyVersion, 1);
assert.equal(committed.nextState.retainedMeshContentHash, hash('M1'));
assert.equal(committed.nextState.retainedAuthorityReceiptHash, receiptHash);
assert.equal(committed.engineeringAuthority, false);
assert.throws(
  () => commitLafeaMeshRetentionCasV3(retain, committed.nextState, retention(hash('OTHER_RECEIPT'))),
  (error) => error?.code?.endsWith('_MISMATCH'),
);

console.log(JSON.stringify({
  check: 'lafea-mesh-workspace-v3-batch2',
  status: 'PASS',
  genericEnvelopeContainsNoElementPolicy: true,
  geometryRaceRejected: true,
  retentionReplayRejected: true,
  currentPassRequiresAuthorityReceipt: true,
  retentionIncrementsConcurrencyVersion: true,
  retentionDoesNotManufactureEngineeringAuthority: true,
}));

function retention(authorityReceiptHash) {
  return {
    schema: LAFEA_MESH_RETENTION_V3_SCHEMA,
    stageId: 'LAFEA.3',
    commandHash: retain.commandHash,
    meshDependencyHash: initial.meshDependencyHash,
    meshContentHash: hash('M1'),
    evidenceHash: hash('E1'),
    validationHash: hash('VALIDATION1'),
    authorityReceiptHash,
    custodyState: 'CURRENT_PASS',
  };
}
function hash(value) {
  return canonicalLafeaSha256({
    schema: 'lafea-mesh-workspace-v3-batch2-fixture/v1', value,
  });
}
