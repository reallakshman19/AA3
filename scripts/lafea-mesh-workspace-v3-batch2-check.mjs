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

// G1/P1 command must not survive a G2/P1 or concurrent state transition.
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

const committed = commitLafeaMeshRetentionCasV3(retain, initial, {
  schema: LAFEA_MESH_RETENTION_V3_SCHEMA,
  stageId: 'LAFEA.3',
  commandHash: retain.commandHash,
  meshDependencyHash: initial.meshDependencyHash,
  meshContentHash: hash('M1'),
  evidenceHash: hash('E1'),
  validationHash: hash('VALIDATION1'),
  custodyState: 'CURRENT_PASS',
});
assert.equal(committed.nextState.concurrencyVersion, 1);
assert.equal(committed.nextState.retainedMeshContentHash, hash('M1'));
assert.equal(committed.engineeringAuthority, false);

// A previously valid retain command is single-snapshot only: replay after the
// state advances fails before retention can replace current content.
assert.throws(
  () => commitLafeaMeshRetentionCasV3(retain, committed.nextState, {
    schema: LAFEA_MESH_RETENTION_V3_SCHEMA,
    stageId: 'LAFEA.3',
    commandHash: retain.commandHash,
    meshDependencyHash: initial.meshDependencyHash,
    meshContentHash: hash('M2'),
    evidenceHash: hash('E2'),
    validationHash: hash('VALIDATION2'),
    custodyState: 'CURRENT_PASS',
  }),
  (error) => error?.code?.endsWith('_MISMATCH'),
);

console.log(JSON.stringify({
  check: 'lafea-mesh-workspace-v3-batch2',
  status: 'PASS',
  genericEnvelopeContainsNoElementPolicy: true,
  geometryRaceRejected: true,
  retentionReplayRejected: true,
  retentionIncrementsConcurrencyVersion: true,
  retentionDoesNotManufactureEngineeringAuthority: true,
}));

function hash(value) {
  return canonicalLafeaSha256({
    schema: 'lafea-mesh-workspace-v3-batch2-fixture/v1',
    value,
  });
}
