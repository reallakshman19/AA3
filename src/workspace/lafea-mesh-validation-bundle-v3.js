/** Stage-owned qualification policy plus sealed v3 validation bundle. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_MESH_VALIDATION_POLICY_V3_SCHEMA = 'lafea-mesh-validation-policy/v3';
export const LAFEA_MESH_VALIDATION_BUNDLE_V3_SCHEMA = 'lafea-mesh-validation-bundle/v3';
const SHELL_TRI3 = 'CST_DKT_TRI3_THIN_SHELL_V1';
const BUNDLE_KEYS = Object.freeze([
  'schema', 'stageId', 'meshContentHash', 'meshDependencyHash', 'policyHash', 'gates',
]);
const GATE_KEYS = Object.freeze(['gateId', 'evidenceHash', 'status']);

export function lafeaMeshValidationPolicyV3(stageId, elementFamily) {
  let requiredGateIds;
  if (stageId === 'LAFEA.3') {
    if (!['T3', 'T6', 'Q8'].includes(elementFamily)) fail('LAFEA_MESH_VALIDATION_V3_ELEMENT_FAMILY_INVALID');
    requiredGateIds = ['GLOBAL_TOPOLOGY', 'LOCAL_ELEMENT_QUALITY', 'RUNTIME_RESOURCES'];
    if (elementFamily === 'T6' || elementFamily === 'Q8') requiredGateIds.push('HIGH_ORDER_MAPPING');
  } else if (stageId === 'LAFEA.4' || stageId === 'LAFEA.5') {
    if (elementFamily !== SHELL_TRI3) fail('LAFEA_MESH_VALIDATION_V3_ELEMENT_FAMILY_INVALID');
    requiredGateIds = [
      'GLOBAL_TOPOLOGY', 'LOCAL_ELEMENT_QUALITY', 'RUNTIME_RESOURCES',
      'SHELL_MIDSURFACE_GEOMETRY', 'SHELL_ORIENTATION',
    ];
  } else {
    fail('LAFEA_MESH_VALIDATION_V3_STAGE_INVALID');
  }
  requiredGateIds.sort();
  const record = freeze({
    schema: LAFEA_MESH_VALIDATION_POLICY_V3_SCHEMA,
    stageId,
    elementFamily,
    requiredGateIds: Object.freeze(requiredGateIds),
  });
  return freeze({
    ...record,
    policyHash: canonicalLafeaSha256({
      schema: 'lafea-mesh-validation-policy-hash-input/v3', policy: record,
    }),
  });
}

export function createLafeaMeshValidationBundleV3(value, policyValue) {
  exact(value, BUNDLE_KEYS, 'LAFEA_MESH_VALIDATION_V3_BUNDLE_KEYS_INVALID');
  const policy = validatePolicy(policyValue);
  if (value.stageId !== policy.stageId) fail('LAFEA_MESH_VALIDATION_V3_POLICY_STAGE_MISMATCH');
  if (value.policyHash !== policy.policyHash) fail('LAFEA_MESH_VALIDATION_V3_POLICY_HASH_MISMATCH');
  const gates = canonicalGates(value.gates);
  const gateIds = gates.map((gate) => gate.gateId);
  if (JSON.stringify(gateIds) !== JSON.stringify(policy.requiredGateIds)) {
    fail('LAFEA_MESH_VALIDATION_V3_REQUIRED_GATE_SET_MISMATCH');
  }
  const hasBlock = gates.some((gate) => gate.status === 'BLOCK');
  const hasWarnings = gates.some((gate) => gate.status === 'WARNING');
  const record = freeze({
    schema: exactText(value.schema, LAFEA_MESH_VALIDATION_BUNDLE_V3_SCHEMA, 'BUNDLE_SCHEMA'),
    stageId: value.stageId,
    meshContentHash: sha(value.meshContentHash, 'MESH_CONTENT_HASH'),
    meshDependencyHash: sha(value.meshDependencyHash, 'MESH_DEPENDENCY_HASH'),
    policyHash: policy.policyHash,
    gates,
    qualification: hasBlock ? 'BLOCK' : 'PASS',
    hasWarnings,
  });
  return freeze({
    ...record,
    validationHash: canonicalLafeaSha256({
      schema: 'lafea-mesh-validation-bundle-hash-input/v3', validation: record,
    }),
    engineeringAuthority: false,
  });
}

export function validateLafeaMeshValidationBundleV3(value, policyValue) {
  const { validationHash, engineeringAuthority, qualification, hasWarnings, ...input } = value || {};
  const rebuilt = createLafeaMeshValidationBundleV3(input, policyValue);
  if (validationHash !== rebuilt.validationHash || qualification !== rebuilt.qualification
    || hasWarnings !== rebuilt.hasWarnings) fail('LAFEA_MESH_VALIDATION_V3_BUNDLE_TAMPERED');
  if (engineeringAuthority !== false) fail('LAFEA_MESH_VALIDATION_V3_AUTHORITY_INVALID');
  return rebuilt;
}
function validatePolicy(value) {
  const rebuilt = lafeaMeshValidationPolicyV3(value?.stageId, value?.elementFamily);
  if (value?.policyHash !== rebuilt.policyHash
    || JSON.stringify(value?.requiredGateIds) !== JSON.stringify(rebuilt.requiredGateIds)) {
    fail('LAFEA_MESH_VALIDATION_V3_POLICY_INVALID');
  }
  return rebuilt;
}
function canonicalGates(value) {
  if (!Array.isArray(value) || !value.length) fail('LAFEA_MESH_VALIDATION_V3_GATES_INVALID');
  const out = value.map((gate) => {
    exact(gate, GATE_KEYS, 'LAFEA_MESH_VALIDATION_V3_GATE_KEYS_INVALID');
    return freeze({
      gateId: text(gate.gateId, 'GATE_ID'),
      evidenceHash: sha(gate.evidenceHash, 'GATE_EVIDENCE_HASH'),
      status: enumValue(gate.status, ['PASS', 'WARNING', 'BLOCK'], 'GATE_STATUS'),
    });
  }).sort((a, b) => a.gateId.localeCompare(b.gateId));
  if (new Set(out.map((gate) => gate.gateId)).size !== out.length) fail('LAFEA_MESH_VALIDATION_V3_GATE_DUPLICATE');
  return Object.freeze(out);
}
function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code);
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_MESH_VALIDATION_V3_${field}_INVALID`);
  return value.trim();
}
function exactText(value, expected, field) {
  if (value !== expected) fail(`LAFEA_MESH_VALIDATION_V3_${field}_INVALID`);
  return value;
}
function sha(value, field) {
  const out = text(value, field);
  if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_MESH_VALIDATION_V3_${field}_INVALID`);
  return out;
}
function enumValue(value, allowed, field) {
  if (!allowed.includes(value)) fail(`LAFEA_MESH_VALIDATION_V3_${field}_INVALID`);
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
