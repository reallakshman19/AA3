/** Optimistic-concurrency retention boundary for the policy-free v3 workspace. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import {
  LAFEA_MESH_WORKSPACE_STATE_V3_SCHEMA,
  LAFEA_MESH_WORKSPACE_AUTHORITY_VERSION,
  assertLafeaMeshCommandParentsV3,
  createLafeaMeshWorkspaceStateV3,
} from './lafea-mesh-workspace-v3.js';

export const LAFEA_MESH_RETENTION_V3_SCHEMA = 'lafea-mesh-retention/v3';
const RETENTION_KEYS = Object.freeze([
  'schema', 'stageId', 'commandHash', 'meshDependencyHash', 'meshContentHash',
  'evidenceHash', 'validationHash', 'custodyState',
]);

export function commitLafeaMeshRetentionCasV3(commandValue, currentStateValue, retentionValue) {
  const { command, state } = assertLafeaMeshCommandParentsV3(commandValue, currentStateValue);
  if (command.commandKind !== 'RETAIN') fail('LAFEA_MESH_RETENTION_V3_COMMAND_KIND_INVALID');
  exact(retentionValue, RETENTION_KEYS, 'LAFEA_MESH_RETENTION_V3_KEYS_INVALID');
  const retention = freeze({
    schema: exactText(retentionValue.schema, LAFEA_MESH_RETENTION_V3_SCHEMA, 'SCHEMA'),
    stageId: exactText(retentionValue.stageId, state.stageId, 'STAGE_ID'),
    commandHash: exactText(retentionValue.commandHash, command.commandHash, 'COMMAND_HASH'),
    meshDependencyHash: exactText(
      sha256(retentionValue.meshDependencyHash, 'MESH_DEPENDENCY_HASH'),
      state.meshDependencyHash,
      'MESH_DEPENDENCY_HASH',
    ),
    meshContentHash: sha256(retentionValue.meshContentHash, 'MESH_CONTENT_HASH'),
    evidenceHash: sha256(retentionValue.evidenceHash, 'EVIDENCE_HASH'),
    validationHash: sha256(retentionValue.validationHash, 'VALIDATION_HASH'),
    custodyState: enumValue(retentionValue.custodyState, ['CURRENT_BLOCK', 'CURRENT_PASS'], 'CUSTODY_STATE'),
  });
  const next = createLafeaMeshWorkspaceStateV3({
    schema: LAFEA_MESH_WORKSPACE_STATE_V3_SCHEMA,
    stageId: state.stageId,
    authorityVersion: LAFEA_MESH_WORKSPACE_AUTHORITY_VERSION,
    custodyState: retention.custodyState,
    meshDependencyHash: state.meshDependencyHash,
    retainedMeshContentHash: retention.meshContentHash,
    retainedEvidenceHash: retention.evidenceHash,
    capabilityHash: state.capabilityHash,
    qualificationHash: state.qualificationHash,
    adapterId: state.adapterId,
    adapterRevision: state.adapterRevision,
    concurrencyVersion: state.concurrencyVersion + 1,
  });
  return freeze({
    schema: 'lafea-mesh-retention-commit/v3',
    previousWorkspaceStateHash: state.workspaceStateHash,
    commandHash: command.commandHash,
    validationHash: retention.validationHash,
    nextState: next,
    commitHash: canonicalLafeaSha256({
      schema: 'lafea-mesh-retention-commit-hash-input/v3',
      previousWorkspaceStateHash: state.workspaceStateHash,
      commandHash: command.commandHash,
      retention,
      nextWorkspaceStateHash: next.workspaceStateHash,
    }),
    engineeringAuthority: false,
  });
}

function exact(value, keys, code) { if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code); }
function exactText(value, expected, field) { if (value !== expected) fail(`LAFEA_MESH_RETENTION_V3_${field}_MISMATCH`); return value; }
function text(value, field) { if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_MESH_RETENTION_V3_${field}_INVALID`); return value.trim(); }
function sha256(value, field) { const out = text(value, field); if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_MESH_RETENTION_V3_${field}_INVALID`); return out; }
function enumValue(value, allowed, field) { if (!allowed.includes(value)) fail(`LAFEA_MESH_RETENTION_V3_${field}_INVALID`); return value; }
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
