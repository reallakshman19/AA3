/** Immutable LAFEA.4 -> LAFEA.5 mesh-content transfer attestation. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_MESH_TRANSFER_EVIDENCE_V3_SCHEMA = 'lafea-mesh-transfer-evidence/v3';
const KEYS = Object.freeze([
  'schema', 'sourceStageId', 'targetStageId', 'sourceMeshEvidenceHash',
  'sourceMeshContentHash', 'targetMeshDependencyHash', 'transferPolicyHash',
  'capabilityHash', 'qualificationHash', 'targetAdapterId', 'targetAdapterRevision',
]);

export function createLafeaMeshTransferEvidenceV3(value) {
  exact(value, KEYS, 'LAFEA_MESH_TRANSFER_V3_KEYS_INVALID');
  const record = freeze({
    schema: exactText(value.schema, LAFEA_MESH_TRANSFER_EVIDENCE_V3_SCHEMA, 'SCHEMA'),
    sourceStageId: exactText(value.sourceStageId, 'LAFEA.4', 'SOURCE_STAGE_ID'),
    targetStageId: exactText(value.targetStageId, 'LAFEA.5', 'TARGET_STAGE_ID'),
    sourceMeshEvidenceHash: sha256(value.sourceMeshEvidenceHash, 'SOURCE_MESH_EVIDENCE_HASH'),
    sourceMeshContentHash: sha256(value.sourceMeshContentHash, 'SOURCE_MESH_CONTENT_HASH'),
    targetMeshDependencyHash: sha256(value.targetMeshDependencyHash, 'TARGET_MESH_DEPENDENCY_HASH'),
    transferPolicyHash: sha256(value.transferPolicyHash, 'TRANSFER_POLICY_HASH'),
    capabilityHash: sha256(value.capabilityHash, 'CAPABILITY_HASH'),
    qualificationHash: sha256(value.qualificationHash, 'QUALIFICATION_HASH'),
    targetAdapterId: text(value.targetAdapterId, 'TARGET_ADAPTER_ID'),
    targetAdapterRevision: text(value.targetAdapterRevision, 'TARGET_ADAPTER_REVISION'),
  });
  return freeze({
    ...record,
    transferHash: canonicalLafeaSha256({ schema: 'lafea-mesh-transfer-hash-input/v3', record }),
    engineeringAuthority: false,
  });
}

export function validateLafeaMeshTransferEvidenceV3(value) {
  const { transferHash, engineeringAuthority, ...input } = value || {};
  const rebuilt = createLafeaMeshTransferEvidenceV3(input);
  if (transferHash !== rebuilt.transferHash) fail('LAFEA_MESH_TRANSFER_V3_HASH_INVALID');
  if (engineeringAuthority !== false) fail('LAFEA_MESH_TRANSFER_V3_AUTHORITY_INVALID');
  return rebuilt;
}

export function requireLafeaMeshTransferForTargetV3(value, expected) {
  const transfer = validateLafeaMeshTransferEvidenceV3(value);
  for (const [key, expectedValue] of Object.entries(expected || {})) {
    if (!KEYS.includes(key) && key !== 'transferHash') fail('LAFEA_MESH_TRANSFER_V3_EXPECTED_FIELD_INVALID');
    if (transfer[key] !== expectedValue) fail(`LAFEA_MESH_TRANSFER_V3_${code(key)}_MISMATCH`);
  }
  return transfer;
}
function exact(value, keys, errorCode) { if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(errorCode); }
function text(value, field) { if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_MESH_TRANSFER_V3_${field}_INVALID`); return value.trim(); }
function exactText(value, expected, field) { if (value !== expected) fail(`LAFEA_MESH_TRANSFER_V3_${field}_INVALID`); return value; }
function sha256(value, field) { const out = text(value, field); if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_MESH_TRANSFER_V3_${field}_INVALID`); return out; }
function code(value) { return value.replace(/([a-z0-9])([A-Z])/gu, '$1_$2').toUpperCase(); }
function fail(errorCode) { const error = new TypeError(errorCode); error.code = errorCode; throw error; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
