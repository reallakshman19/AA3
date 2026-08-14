/** Preserve historical qualification while assessing present-policy eligibility. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_MESH_RECOVERY_ASSESSMENT_V3_SCHEMA = 'lafea-mesh-recovery-assessment/v3';
const KEYS = Object.freeze([
  'schema', 'stageId', 'importedMeshContentHash', 'historicalEvidenceHash',
  'historicalQualificationHash', 'historicalStatus', 'currentMeshDependencyHash',
  'currentQualificationHash', 'currentStatus', 'currentAuthorityReceiptHash',
]);

export function createLafeaMeshRecoveryAssessmentV3(value) {
  exact(value, KEYS, 'LAFEA_MESH_RECOVERY_V3_KEYS_INVALID');
  const currentStatus = enumValue(value.currentStatus, ['PASS', 'BLOCK'], 'CURRENT_STATUS');
  const record = freeze({
    schema: exactText(value.schema, LAFEA_MESH_RECOVERY_ASSESSMENT_V3_SCHEMA, 'SCHEMA'),
    stageId: enumValue(value.stageId, ['LAFEA.3', 'LAFEA.4', 'LAFEA.5'], 'STAGE_ID'),
    importedMeshContentHash: sha(value.importedMeshContentHash, 'IMPORTED_MESH_CONTENT_HASH'),
    historicalEvidenceHash: sha(value.historicalEvidenceHash, 'HISTORICAL_EVIDENCE_HASH'),
    historicalQualificationHash: sha(value.historicalQualificationHash, 'HISTORICAL_QUALIFICATION_HASH'),
    historicalStatus: enumValue(value.historicalStatus, ['PASS', 'BLOCK'], 'HISTORICAL_STATUS'),
    currentMeshDependencyHash: sha(value.currentMeshDependencyHash, 'CURRENT_MESH_DEPENDENCY_HASH'),
    currentQualificationHash: sha(value.currentQualificationHash, 'CURRENT_QUALIFICATION_HASH'),
    currentStatus,
    currentAuthorityReceiptHash: optionalSha(value.currentAuthorityReceiptHash, 'CURRENT_AUTHORITY_RECEIPT_HASH'),
  });
  const eligibleForAuthorityPromotion = currentStatus === 'PASS'
    && record.currentAuthorityReceiptHash !== null;
  return freeze({
    ...record,
    eligibleForAuthorityPromotion,
    engineeringAuthority: false,
    assessmentHash: canonicalLafeaSha256({
      schema: 'lafea-mesh-recovery-assessment-hash-input/v3',
      record,
      eligibleForAuthorityPromotion,
    }),
  });
}
function exact(value, keys, errorCode) { if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(errorCode); }
function text(value, field) { if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_MESH_RECOVERY_V3_${field}_INVALID`); return value.trim(); }
function exactText(value, expected, field) { if (value !== expected) fail(`LAFEA_MESH_RECOVERY_V3_${field}_INVALID`); return value; }
function sha(value, field) { const out = text(value, field); if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_MESH_RECOVERY_V3_${field}_INVALID`); return out; }
function optionalSha(value, field) { return value === null ? null : sha(value, field); }
function enumValue(value, allowed, field) { if (!allowed.includes(value)) fail(`LAFEA_MESH_RECOVERY_V3_${field}_INVALID`); return value; }
function fail(errorCode) { const error = new TypeError(errorCode); error.code = errorCode; throw error; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
