/** Hash-only v3 mesh evidence. Authority exists only after trusted receipt issuance. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import { validateLafeaMeshValidationBundleV3 } from './lafea-mesh-validation-bundle-v3.js';

export const LAFEA_ANALYSIS_MESH_EVIDENCE_V3_SCHEMA = 'lafea-analysis-mesh-evidence/v3';
const KEYS = Object.freeze([
  'schema', 'stageId', 'sourceHash', 'meshDependencyHash', 'meshContentHash',
  'meshArtifactHash', 'meshProfileHash', 'adapterCapabilityHash',
  'producerCapabilityHash', 'producerQualificationHash', 'producerId',
  'producerRevision', 'planHash', 'outputHash', 'validationHash', 'transferHash',
]);

export function createLafeaAnalysisMeshEvidenceV3(value, validationBundleValue, policyValue) {
  exact(value, KEYS, 'LAFEA_ANALYSIS_MESH_V3_KEYS_INVALID');
  const validation = validateLafeaMeshValidationBundleV3(validationBundleValue, policyValue);
  const stageId = enumValue(value.stageId, ['LAFEA.3', 'LAFEA.4', 'LAFEA.5'], 'STAGE_ID');
  const meshDependencyHash = sha(value.meshDependencyHash, 'MESH_DEPENDENCY_HASH');
  const meshContentHash = sha(value.meshContentHash, 'MESH_CONTENT_HASH');
  if (validation.stageId !== stageId || validation.meshDependencyHash !== meshDependencyHash
    || validation.meshContentHash !== meshContentHash || validation.validationHash !== value.validationHash) {
    fail('LAFEA_ANALYSIS_MESH_V3_VALIDATION_PARENT_MISMATCH');
  }
  const transferHash = optionalSha(value.transferHash, 'TRANSFER_HASH');
  if (transferHash !== null && stageId !== 'LAFEA.5') {
    fail('LAFEA_ANALYSIS_MESH_V3_TRANSFER_STAGE_INVALID');
  }
  const record = freeze({
    schema: exactText(value.schema, LAFEA_ANALYSIS_MESH_EVIDENCE_V3_SCHEMA, 'SCHEMA'),
    stageId,
    sourceHash: sha(value.sourceHash, 'SOURCE_HASH'),
    meshDependencyHash,
    meshContentHash,
    meshArtifactHash: sha(value.meshArtifactHash, 'MESH_ARTIFACT_HASH'),
    meshProfileHash: text(value.meshProfileHash, 'MESH_PROFILE_HASH'),
    adapterCapabilityHash: sha(value.adapterCapabilityHash, 'ADAPTER_CAPABILITY_HASH'),
    producerCapabilityHash: sha(value.producerCapabilityHash, 'PRODUCER_CAPABILITY_HASH'),
    producerQualificationHash: sha(value.producerQualificationHash, 'PRODUCER_QUALIFICATION_HASH'),
    producerId: text(value.producerId, 'PRODUCER_ID'),
    producerRevision: text(value.producerRevision, 'PRODUCER_REVISION'),
    planHash: sha(value.planHash, 'PLAN_HASH'),
    outputHash: sha(value.outputHash, 'OUTPUT_HASH'),
    validationHash: validation.validationHash,
    transferHash,
    qualification: validation.qualification,
    status: validation.qualification === 'BLOCK' ? 'BLOCKED' : 'QUALIFIED_PENDING_TRUSTED_AUTHORITY',
  });
  return freeze({
    ...record,
    evidenceHash: canonicalLafeaSha256({
      schema: 'lafea-analysis-mesh-evidence-hash-input/v3', evidence: record,
    }),
    engineeringAuthority: false,
  });
}

function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code);
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_ANALYSIS_MESH_V3_${field}_INVALID`);
  return value.trim();
}
function exactText(value, expected, field) {
  if (value !== expected) fail(`LAFEA_ANALYSIS_MESH_V3_${field}_INVALID`);
  return value;
}
function sha(value, field) {
  const out = text(value, field);
  if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_ANALYSIS_MESH_V3_${field}_INVALID`);
  return out;
}
function optionalSha(value, field) { return value === null ? null : sha(value, field); }
function enumValue(value, allowed, field) {
  if (!allowed.includes(value)) fail(`LAFEA_ANALYSIS_MESH_V3_${field}_INVALID`);
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
