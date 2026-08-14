/**
 * Structural envelope for a trusted-authority receipt.
 *
 * IMPORTANT: this module validates canonical receipt bytes only. It does not
 * verify the digital signature and therefore never grants engineering
 * authority. Signature verification and issuance belong to a protected trust
 * boundary that ordinary client code cannot impersonate.
 */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import { LAFEA_MESH_WORKSPACE_AUTHORITY_VERSION } from './lafea-mesh-workspace-v3.js';

export const LAFEA_AUTHORITY_RECEIPT_V3_SCHEMA = 'lafea-authority-receipt/v3';
const STAGES = Object.freeze(['LAFEA.3', 'LAFEA.4', 'LAFEA.5']);
const KEYS = Object.freeze([
  'schema', 'stageId', 'authorityVersion', 'authorityEvidenceHash',
  'meshContentHash', 'meshDependencyHash', 'issuerId', 'issuerKeyId',
  'signatureAlgorithm', 'signatureBase64', 'issuedAt',
]);

export function createLafeaAuthorityReceiptV3(value) {
  exact(value, KEYS, 'LAFEA_AUTHORITY_RECEIPT_V3_KEYS_INVALID');
  const record = freeze({
    schema: exactText(value.schema, LAFEA_AUTHORITY_RECEIPT_V3_SCHEMA, 'SCHEMA'),
    stageId: enumValue(value.stageId, STAGES, 'STAGE_ID'),
    authorityVersion: exactText(
      value.authorityVersion,
      LAFEA_MESH_WORKSPACE_AUTHORITY_VERSION,
      'AUTHORITY_VERSION',
    ),
    authorityEvidenceHash: sha256(value.authorityEvidenceHash, 'AUTHORITY_EVIDENCE_HASH'),
    meshContentHash: sha256(value.meshContentHash, 'MESH_CONTENT_HASH'),
    meshDependencyHash: sha256(value.meshDependencyHash, 'MESH_DEPENDENCY_HASH'),
    issuerId: text(value.issuerId, 'ISSUER_ID'),
    issuerKeyId: text(value.issuerKeyId, 'ISSUER_KEY_ID'),
    signatureAlgorithm: exactText(value.signatureAlgorithm, 'Ed25519', 'SIGNATURE_ALGORITHM'),
    signatureBase64: base64(value.signatureBase64),
    issuedAt: rfc3339(value.issuedAt),
  });
  return freeze({
    ...record,
    receiptHash: canonicalLafeaSha256({
      schema: 'lafea-authority-receipt-hash-input/v3', record,
    }),
    trustStatus: 'STRUCTURALLY_VALID_UNVERIFIED',
    engineeringAuthority: false,
  });
}

export function validateLafeaAuthorityReceiptV3(value) {
  const { receiptHash, trustStatus, engineeringAuthority, ...input } = value || {};
  const rebuilt = createLafeaAuthorityReceiptV3(input);
  if (receiptHash !== rebuilt.receiptHash) fail('LAFEA_AUTHORITY_RECEIPT_V3_HASH_INVALID');
  if (trustStatus !== 'STRUCTURALLY_VALID_UNVERIFIED' || engineeringAuthority !== false) {
    fail('LAFEA_AUTHORITY_RECEIPT_V3_TRUST_LAUNDERING_INVALID');
  }
  return rebuilt;
}

function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code);
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_AUTHORITY_RECEIPT_V3_${field}_INVALID`);
  return value.trim();
}
function exactText(value, expected, field) {
  if (value !== expected) fail(`LAFEA_AUTHORITY_RECEIPT_V3_${field}_INVALID`);
  return value;
}
function sha256(value, field) {
  const out = text(value, field);
  if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_AUTHORITY_RECEIPT_V3_${field}_INVALID`);
  return out;
}
function base64(value) {
  const out = text(value, 'SIGNATURE_BASE64');
  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(out) || out.length % 4 !== 0) {
    fail('LAFEA_AUTHORITY_RECEIPT_V3_SIGNATURE_BASE64_INVALID');
  }
  return out;
}
function rfc3339(value) {
  const out = text(value, 'ISSUED_AT');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(out)
    || Number.isNaN(Date.parse(out))) fail('LAFEA_AUTHORITY_RECEIPT_V3_ISSUED_AT_INVALID');
  return out;
}
function enumValue(value, allowed, field) {
  if (!allowed.includes(value)) fail(`LAFEA_AUTHORITY_RECEIPT_V3_${field}_INVALID`);
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
