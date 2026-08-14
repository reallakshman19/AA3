/** One-way authority-model activation record; legacy evidence remains historical/read-only. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import { LAFEA_MESH_WORKSPACE_AUTHORITY_VERSION } from './lafea-mesh-workspace-v3.js';

export const LAFEA_MESH_AUTHORITY_MIGRATION_V3_SCHEMA = 'lafea-mesh-authority-migration/v3';
const KEYS = Object.freeze([
  'schema', 'stageId', 'legacyAuthorityVersion', 'legacyEvidenceHash',
  'v3EvidenceHash', 'v3AuthorityReceiptHash', 'migrationMode',
  'legacyDisposition', 'activatedAuthorityVersion',
]);

export function createLafeaMeshAuthorityMigrationV3(value) {
  exact(value, KEYS, 'LAFEA_MESH_AUTHORITY_MIGRATION_V3_KEYS_INVALID');
  const record = freeze({
    schema: exactText(value.schema, LAFEA_MESH_AUTHORITY_MIGRATION_V3_SCHEMA, 'SCHEMA'),
    stageId: enumValue(value.stageId, ['LAFEA.3', 'LAFEA.4', 'LAFEA.5'], 'STAGE_ID'),
    legacyAuthorityVersion: enumValue(value.legacyAuthorityVersion, ['V1', 'V2'], 'LEGACY_AUTHORITY_VERSION'),
    legacyEvidenceHash: sha(value.legacyEvidenceHash, 'LEGACY_EVIDENCE_HASH'),
    v3EvidenceHash: sha(value.v3EvidenceHash, 'V3_EVIDENCE_HASH'),
    v3AuthorityReceiptHash: sha(value.v3AuthorityReceiptHash, 'V3_AUTHORITY_RECEIPT_HASH'),
    migrationMode: exactText(value.migrationMode, 'REPLAY_AND_REQUALIFY', 'MIGRATION_MODE'),
    legacyDisposition: exactText(
      value.legacyDisposition,
      'FROZEN_HISTORICAL_READ_ONLY',
      'LEGACY_DISPOSITION',
    ),
    activatedAuthorityVersion: exactText(
      value.activatedAuthorityVersion,
      LAFEA_MESH_WORKSPACE_AUTHORITY_VERSION,
      'ACTIVATED_AUTHORITY_VERSION',
    ),
  });
  return freeze({
    ...record,
    dualCurrentAuthorityAllowed: false,
    engineeringAuthority: false,
    migrationHash: canonicalLafeaSha256({
      schema: 'lafea-mesh-authority-migration-hash-input/v3', migration: record,
    }),
  });
}

function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code);
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_MESH_AUTHORITY_MIGRATION_V3_${field}_INVALID`);
  return value.trim();
}
function exactText(value, expected, field) {
  if (value !== expected) fail(`LAFEA_MESH_AUTHORITY_MIGRATION_V3_${field}_INVALID`);
  return value;
}
function sha(value, field) {
  const out = text(value, field);
  if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_MESH_AUTHORITY_MIGRATION_V3_${field}_INVALID`);
  return out;
}
function enumValue(value, allowed, field) {
  if (!allowed.includes(value)) fail(`LAFEA_MESH_AUTHORITY_MIGRATION_V3_${field}_INVALID`);
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
