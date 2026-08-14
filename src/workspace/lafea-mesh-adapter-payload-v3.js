/** Strict stage-specific engineering payloads behind the generic v3 command envelope. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import {
  LAFEA_CONTINUUM_MESH_ADAPTER_PAYLOAD_V3_SCHEMA,
  LAFEA_SHELL_MESH_ADAPTER_PAYLOAD_V3_SCHEMA,
  lafeaMeshAdapterCapabilityV3,
} from './lafea-mesh-adapter-capability-v3.js';

const CONTINUUM_KEYS = Object.freeze([
  'schema', 'stageId', 'meshDependencyHash', 'meshProfileHash', 'elementFamily',
  'sizingMode', 'targetElementLength', 'lengthUnit', 'curvatureToleranceDegrees',
  'growthLimit', 'fallbackPolicy',
]);
const SHELL_KEYS = Object.freeze([
  'schema', 'stageId', 'meshDependencyHash', 'meshProfileHash',
  'midsurfaceEvidenceHash', 'elementFamily', 'sizingMode', 'targetElementLength',
  'lengthUnit', 'curvatureToleranceDegrees', 'growthLimit', 'generationMode',
  'hostTransferHash',
]);
const SHELL_TRI3 = 'CST_DKT_TRI3_THIN_SHELL_V1';

export function createLafeaContinuumMeshAdapterPayloadV3(value) {
  exact(value, CONTINUUM_KEYS, 'LAFEA_CONTINUUM_MESH_ADAPTER_V3_KEYS_INVALID');
  const capability = lafeaMeshAdapterCapabilityV3('LAFEA.3');
  const record = freeze({
    schema: exactText(value.schema, LAFEA_CONTINUUM_MESH_ADAPTER_PAYLOAD_V3_SCHEMA, 'SCHEMA'),
    stageId: exactText(value.stageId, 'LAFEA.3', 'STAGE_ID'),
    meshDependencyHash: sha256(value.meshDependencyHash, 'MESH_DEPENDENCY_HASH'),
    meshProfileHash: text(value.meshProfileHash, 'MESH_PROFILE_HASH'),
    elementFamily: enumValue(value.elementFamily, capability.allowedElementFamilies, 'ELEMENT_FAMILY'),
    sizingMode: exactText(value.sizingMode, 'ISOTROPIC_SCALAR_ONLY', 'SIZING_MODE'),
    targetElementLength: positive(value.targetElementLength, 'TARGET_ELEMENT_LENGTH'),
    lengthUnit: text(value.lengthUnit, 'LENGTH_UNIT'),
    curvatureToleranceDegrees: positive(value.curvatureToleranceDegrees, 'CURVATURE_TOLERANCE_DEGREES'),
    growthLimit: positive(value.growthLimit, 'GROWTH_LIMIT'),
    fallbackPolicy: enumValue(value.fallbackPolicy, ['NONE', 'T3_ONLY'], 'FALLBACK_POLICY'),
  });
  if (record.elementFamily === 'T3' && record.fallbackPolicy !== 'NONE') {
    fail('LAFEA_CONTINUUM_MESH_ADAPTER_V3_REDUNDANT_T3_FALLBACK_INVALID');
  }
  return payload(record, capability.capabilityHash, 'lafea-continuum-mesh-adapter-payload-hash-input/v3');
}

export function createLafeaShellMeshAdapterPayloadV3(value) {
  exact(value, SHELL_KEYS, 'LAFEA_SHELL_MESH_ADAPTER_V3_KEYS_INVALID');
  if (value.stageId !== 'LAFEA.4' && value.stageId !== 'LAFEA.5') {
    fail('LAFEA_SHELL_MESH_ADAPTER_V3_STAGE_ID_INVALID');
  }
  const capability = lafeaMeshAdapterCapabilityV3(value.stageId);
  const record = freeze({
    schema: exactText(value.schema, LAFEA_SHELL_MESH_ADAPTER_PAYLOAD_V3_SCHEMA, 'SCHEMA'),
    stageId: value.stageId,
    meshDependencyHash: sha256(value.meshDependencyHash, 'MESH_DEPENDENCY_HASH'),
    meshProfileHash: text(value.meshProfileHash, 'MESH_PROFILE_HASH'),
    midsurfaceEvidenceHash: sha256(value.midsurfaceEvidenceHash, 'MIDSURFACE_EVIDENCE_HASH'),
    elementFamily: exactText(value.elementFamily, SHELL_TRI3, 'ELEMENT_FAMILY'),
    sizingMode: exactText(value.sizingMode, 'ISOTROPIC_SCALAR_ONLY', 'SIZING_MODE'),
    targetElementLength: positive(value.targetElementLength, 'TARGET_ELEMENT_LENGTH'),
    lengthUnit: text(value.lengthUnit, 'LENGTH_UNIT'),
    curvatureToleranceDegrees: positive(value.curvatureToleranceDegrees, 'CURVATURE_TOLERANCE_DEGREES'),
    growthLimit: positive(value.growthLimit, 'GROWTH_LIMIT'),
    generationMode: exactText(value.generationMode, 'GENERATE_NEW', 'GENERATION_MODE'),
    hostTransferHash: optionalSha256(value.hostTransferHash, 'HOST_TRANSFER_HASH'),
  });
  if (record.hostTransferHash !== null) {
    fail('LAFEA_SHELL_MESH_ADAPTER_V3_CROSS_STAGE_REUSE_NOT_AUTHORIZED');
  }
  return payload(record, capability.capabilityHash, 'lafea-shell-mesh-adapter-payload-hash-input/v3');
}

function payload(record, adapterCapabilityHash, schema) {
  return freeze({
    ...record,
    adapterCapabilityHash,
    payloadHash: canonicalLafeaSha256({ schema, record, adapterCapabilityHash }),
    engineeringAuthority: false,
  });
}
function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code);
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_MESH_ADAPTER_V3_${field}_INVALID`);
  return value.trim();
}
function exactText(value, expected, field) {
  if (value !== expected) fail(`LAFEA_MESH_ADAPTER_V3_${field}_INVALID`);
  return value;
}
function sha256(value, field) {
  const out = text(value, field);
  if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_MESH_ADAPTER_V3_${field}_INVALID`);
  return out;
}
function optionalSha256(value, field) { return value === null ? null : sha256(value, field); }
function positive(value, field) {
  if (!Number.isFinite(value) || value <= 0) fail(`LAFEA_MESH_ADAPTER_V3_${field}_INVALID`);
  return value;
}
function enumValue(value, allowed, field) {
  if (!allowed.includes(value)) fail(`LAFEA_MESH_ADAPTER_V3_${field}_INVALID`);
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
