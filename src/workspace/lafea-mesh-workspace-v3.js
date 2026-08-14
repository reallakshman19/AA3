/** Policy-free Mesh Workspace v3 state/capability/command contracts. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_MESH_WORKSPACE_CAPABILITY_V3_SCHEMA = 'lafea-mesh-workspace-capability/v3';
export const LAFEA_MESH_WORKSPACE_STATE_V3_SCHEMA = 'lafea-mesh-workspace-state/v3';
export const LAFEA_MESH_WORKSPACE_COMMAND_V3_SCHEMA = 'lafea-mesh-workspace-command/v3';
export const LAFEA_MESH_WORKSPACE_AUTHORITY_VERSION = 'LAFEA_MESH_AUTHORITY_V3';
export const LAFEA_MESH_WORKSPACE_COMMAND_KINDS = Object.freeze([
  'PLAN', 'GENERATE', 'REFINE', 'RECOVER', 'RETAIN', 'INSPECT', 'EXPORT',
]);
export const LAFEA_MESH_WORKSPACE_CUSTODY_STATES = Object.freeze([
  'ABSENT', 'INVALID', 'STALE', 'CURRENT_BLOCK', 'CURRENT_PASS',
]);
const STAGES = Object.freeze(['LAFEA.3', 'LAFEA.4', 'LAFEA.5']);
const CAPABILITY_KEYS = Object.freeze([
  'schema', 'stageId', 'adapterId', 'adapterRevision', 'adapterCapabilityHash',
  'qualificationHash', 'allowedCommands',
]);
const STATE_KEYS = Object.freeze([
  'schema', 'stageId', 'authorityVersion', 'custodyState', 'meshDependencyHash',
  'retainedMeshContentHash', 'retainedEvidenceHash', 'retainedAuthorityReceiptHash',
  'capabilityHash', 'qualificationHash', 'adapterId', 'adapterRevision',
  'concurrencyVersion',
]);
const COMMAND_KEYS = Object.freeze([
  'schema', 'commandId', 'commandKind', 'stageId', 'expectedParents',
  'adapterId', 'adapterRevision', 'payloadHash',
]);
const PARENT_KEYS = Object.freeze([
  'workspaceStateHash', 'meshDependencyHash', 'retainedMeshContentHash',
  'retainedEvidenceHash', 'retainedAuthorityReceiptHash', 'capabilityHash',
  'qualificationHash', 'concurrencyVersion',
]);

export function createLafeaMeshWorkspaceCapabilityV3(value) {
  exact(value, CAPABILITY_KEYS, 'LAFEA_MESH_WORKSPACE_V3_CAPABILITY_KEYS_INVALID');
  const record = freeze({
    schema: exactText(value.schema, LAFEA_MESH_WORKSPACE_CAPABILITY_V3_SCHEMA, 'CAPABILITY_SCHEMA'),
    stageId: stage(value.stageId),
    adapterId: text(value.adapterId, 'ADAPTER_ID'),
    adapterRevision: text(value.adapterRevision, 'ADAPTER_REVISION'),
    adapterCapabilityHash: sha256(value.adapterCapabilityHash, 'ADAPTER_CAPABILITY_HASH'),
    qualificationHash: sha256(value.qualificationHash, 'QUALIFICATION_HASH'),
    allowedCommands: commands(value.allowedCommands),
  });
  return freeze({
    ...record,
    capabilityHash: canonicalLafeaSha256({
      schema: 'lafea-mesh-workspace-capability-hash-input/v3', record,
    }),
  });
}

export function createLafeaMeshWorkspaceStateV3(value) {
  exact(value, STATE_KEYS, 'LAFEA_MESH_WORKSPACE_V3_STATE_KEYS_INVALID');
  const record = freeze({
    schema: exactText(value.schema, LAFEA_MESH_WORKSPACE_STATE_V3_SCHEMA, 'STATE_SCHEMA'),
    stageId: stage(value.stageId),
    authorityVersion: exactText(
      value.authorityVersion,
      LAFEA_MESH_WORKSPACE_AUTHORITY_VERSION,
      'AUTHORITY_VERSION',
    ),
    custodyState: enumValue(value.custodyState, LAFEA_MESH_WORKSPACE_CUSTODY_STATES, 'CUSTODY_STATE'),
    meshDependencyHash: sha256(value.meshDependencyHash, 'MESH_DEPENDENCY_HASH'),
    retainedMeshContentHash: optionalSha256(value.retainedMeshContentHash, 'RETAINED_MESH_CONTENT_HASH'),
    retainedEvidenceHash: optionalSha256(value.retainedEvidenceHash, 'RETAINED_EVIDENCE_HASH'),
    retainedAuthorityReceiptHash: optionalSha256(
      value.retainedAuthorityReceiptHash,
      'RETAINED_AUTHORITY_RECEIPT_HASH',
    ),
    capabilityHash: sha256(value.capabilityHash, 'CAPABILITY_HASH'),
    qualificationHash: sha256(value.qualificationHash, 'QUALIFICATION_HASH'),
    adapterId: text(value.adapterId, 'ADAPTER_ID'),
    adapterRevision: text(value.adapterRevision, 'ADAPTER_REVISION'),
    concurrencyVersion: nonNegativeInteger(value.concurrencyVersion, 'CONCURRENCY_VERSION'),
  });
  if ((record.retainedMeshContentHash === null) !== (record.retainedEvidenceHash === null)) {
    fail('LAFEA_MESH_WORKSPACE_V3_RETAINED_PAIR_INVALID');
  }
  if (record.custodyState === 'ABSENT'
    && (record.retainedMeshContentHash !== null || record.retainedAuthorityReceiptHash !== null)) {
    fail('LAFEA_MESH_WORKSPACE_V3_ABSENT_RETAINED_INVALID');
  }
  if (record.custodyState !== 'ABSENT' && record.retainedMeshContentHash === null) {
    fail('LAFEA_MESH_WORKSPACE_V3_CUSTODY_REQUIRES_RETAINED');
  }
  if (record.custodyState === 'CURRENT_PASS' && record.retainedAuthorityReceiptHash === null) {
    fail('LAFEA_MESH_WORKSPACE_V3_CURRENT_PASS_AUTHORITY_RECEIPT_REQUIRED');
  }
  return freeze({
    ...record,
    workspaceStateHash: canonicalLafeaSha256({
      schema: 'lafea-mesh-workspace-state-hash-input/v3', record,
    }),
  });
}

export function createLafeaMeshWorkspaceCommandV3(value) {
  exact(value, COMMAND_KEYS, 'LAFEA_MESH_WORKSPACE_V3_COMMAND_KEYS_INVALID');
  const expectedParents = parents(value.expectedParents);
  const record = freeze({
    schema: exactText(value.schema, LAFEA_MESH_WORKSPACE_COMMAND_V3_SCHEMA, 'COMMAND_SCHEMA'),
    commandId: text(value.commandId, 'COMMAND_ID'),
    commandKind: enumValue(value.commandKind, LAFEA_MESH_WORKSPACE_COMMAND_KINDS, 'COMMAND_KIND'),
    stageId: stage(value.stageId),
    expectedParents,
    adapterId: text(value.adapterId, 'ADAPTER_ID'),
    adapterRevision: text(value.adapterRevision, 'ADAPTER_REVISION'),
    payloadHash: sha256(value.payloadHash, 'PAYLOAD_HASH'),
  });
  return freeze({
    ...record,
    commandHash: canonicalLafeaSha256({
      schema: 'lafea-mesh-workspace-command-hash-input/v3', record,
    }),
    engineeringAuthority: false,
  });
}

export function expectedLafeaMeshCommandParentsV3(stateValue) {
  const state = validateLafeaMeshWorkspaceStateV3(stateValue);
  return freeze({
    workspaceStateHash: state.workspaceStateHash,
    meshDependencyHash: state.meshDependencyHash,
    retainedMeshContentHash: state.retainedMeshContentHash,
    retainedEvidenceHash: state.retainedEvidenceHash,
    retainedAuthorityReceiptHash: state.retainedAuthorityReceiptHash,
    capabilityHash: state.capabilityHash,
    qualificationHash: state.qualificationHash,
    concurrencyVersion: state.concurrencyVersion,
  });
}

export function assertLafeaMeshCommandParentsV3(commandValue, stateValue) {
  const command = validateLafeaMeshWorkspaceCommandV3(commandValue);
  const state = validateLafeaMeshWorkspaceStateV3(stateValue);
  if (command.stageId !== state.stageId) fail('LAFEA_MESH_WORKSPACE_V3_STAGE_MISMATCH');
  if (command.adapterId !== state.adapterId || command.adapterRevision !== state.adapterRevision) {
    fail('LAFEA_MESH_WORKSPACE_V3_ADAPTER_MISMATCH');
  }
  const expected = expectedLafeaMeshCommandParentsV3(state);
  for (const key of PARENT_KEYS) {
    if (command.expectedParents[key] !== expected[key]) {
      fail(`LAFEA_MESH_WORKSPACE_V3_EXPECTED_${camelToCode(key)}_MISMATCH`);
    }
  }
  return freeze({ command, state });
}

export function validateLafeaMeshWorkspaceCapabilityV3(value) {
  const { capabilityHash, ...input } = value || {};
  const rebuilt = createLafeaMeshWorkspaceCapabilityV3(input);
  if (capabilityHash !== rebuilt.capabilityHash) {
    fail('LAFEA_MESH_WORKSPACE_V3_CAPABILITY_HASH_INVALID');
  }
  return rebuilt;
}

export function validateLafeaMeshWorkspaceStateV3(value) {
  const { workspaceStateHash, ...input } = value || {};
  const rebuilt = createLafeaMeshWorkspaceStateV3(input);
  if (workspaceStateHash !== rebuilt.workspaceStateHash) {
    fail('LAFEA_MESH_WORKSPACE_V3_STATE_HASH_INVALID');
  }
  return rebuilt;
}

export function validateLafeaMeshWorkspaceCommandV3(value) {
  const { commandHash, engineeringAuthority, ...input } = value || {};
  const rebuilt = createLafeaMeshWorkspaceCommandV3(input);
  if (commandHash !== rebuilt.commandHash) fail('LAFEA_MESH_WORKSPACE_V3_COMMAND_HASH_INVALID');
  if (engineeringAuthority !== false) fail('LAFEA_MESH_WORKSPACE_V3_COMMAND_AUTHORITY_INVALID');
  return rebuilt;
}

function parents(value) {
  exact(value, PARENT_KEYS, 'LAFEA_MESH_WORKSPACE_V3_PARENT_KEYS_INVALID');
  return freeze({
    workspaceStateHash: sha256(value.workspaceStateHash, 'WORKSPACE_STATE_HASH'),
    meshDependencyHash: sha256(value.meshDependencyHash, 'MESH_DEPENDENCY_HASH'),
    retainedMeshContentHash: optionalSha256(value.retainedMeshContentHash, 'RETAINED_MESH_CONTENT_HASH'),
    retainedEvidenceHash: optionalSha256(value.retainedEvidenceHash, 'RETAINED_EVIDENCE_HASH'),
    retainedAuthorityReceiptHash: optionalSha256(
      value.retainedAuthorityReceiptHash,
      'RETAINED_AUTHORITY_RECEIPT_HASH',
    ),
    capabilityHash: sha256(value.capabilityHash, 'CAPABILITY_HASH'),
    qualificationHash: sha256(value.qualificationHash, 'QUALIFICATION_HASH'),
    concurrencyVersion: nonNegativeInteger(value.concurrencyVersion, 'CONCURRENCY_VERSION'),
  });
}
function commands(value) {
  if (!Array.isArray(value) || !value.length) {
    fail('LAFEA_MESH_WORKSPACE_V3_ALLOWED_COMMANDS_INVALID');
  }
  const out = [...new Set(value.map((row) => enumValue(
    row,
    LAFEA_MESH_WORKSPACE_COMMAND_KINDS,
    'ALLOWED_COMMAND',
  )))].sort();
  if (out.length !== value.length) fail('LAFEA_MESH_WORKSPACE_V3_ALLOWED_COMMANDS_DUPLICATE');
  return Object.freeze(out);
}
function stage(value) { return enumValue(value, STAGES, 'STAGE_ID'); }
function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code);
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    fail(`LAFEA_MESH_WORKSPACE_V3_${field}_INVALID`);
  }
  return value.trim();
}
function exactText(value, expected, field) {
  if (value !== expected) fail(`LAFEA_MESH_WORKSPACE_V3_${field}_INVALID`);
  return value;
}
function sha256(value, field) {
  const out = text(value, field);
  if (!/^sha256:[0-9a-f]{64}$/u.test(out)) {
    fail(`LAFEA_MESH_WORKSPACE_V3_${field}_INVALID`);
  }
  return out;
}
function optionalSha256(value, field) { return value === null ? null : sha256(value, field); }
function nonNegativeInteger(value, field) {
  if (!Number.isInteger(value) || value < 0) fail(`LAFEA_MESH_WORKSPACE_V3_${field}_INVALID`);
  return value;
}
function enumValue(value, allowed, field) {
  if (!allowed.includes(value)) fail(`LAFEA_MESH_WORKSPACE_V3_${field}_INVALID`);
  return value;
}
function camelToCode(value) {
  return value.replace(/([a-z0-9])([A-Z])/gu, '$1_$2').toUpperCase();
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
