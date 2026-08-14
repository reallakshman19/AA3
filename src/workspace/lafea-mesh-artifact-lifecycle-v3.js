/** Storage lifecycle for generated/recovered mesh artifacts; separate from engineering custody. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_SCHEMA = 'lafea-mesh-artifact-lifecycle/v3';
export const LAFEA_MESH_ARTIFACT_STATES_V3 = Object.freeze([
  'TEMPORARY', 'GENERATED_UNVERIFIED', 'QUARANTINED', 'VALIDATED', 'RETAINED',
]);
const KEYS = Object.freeze([
  'schema', 'artifactHash', 'sourceCommandHash', 'state', 'partial',
  'validationHash', 'quarantineReasonHash', 'previousStateHash',
]);
const TRANSITIONS = Object.freeze({
  TEMPORARY: Object.freeze(['GENERATED_UNVERIFIED', 'QUARANTINED']),
  GENERATED_UNVERIFIED: Object.freeze(['VALIDATED', 'QUARANTINED']),
  QUARANTINED: Object.freeze(['VALIDATED']),
  VALIDATED: Object.freeze(['RETAINED']),
  RETAINED: Object.freeze([]),
});

export function createLafeaMeshArtifactLifecycleV3(value) {
  exact(value, KEYS, 'LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_KEYS_INVALID');
  const state = enumValue(value.state, LAFEA_MESH_ARTIFACT_STATES_V3, 'STATE');
  const record = freeze({
    schema: exactText(value.schema, LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_SCHEMA, 'SCHEMA'),
    artifactHash: sha(value.artifactHash, 'ARTIFACT_HASH'),
    sourceCommandHash: sha(value.sourceCommandHash, 'SOURCE_COMMAND_HASH'),
    state,
    partial: boolean(value.partial, 'PARTIAL'),
    validationHash: optionalSha(value.validationHash, 'VALIDATION_HASH'),
    quarantineReasonHash: optionalSha(value.quarantineReasonHash, 'QUARANTINE_REASON_HASH'),
    previousStateHash: optionalSha(value.previousStateHash, 'PREVIOUS_STATE_HASH'),
  });
  enforceState(record);
  return freeze({
    ...record,
    stateHash: canonicalLafeaSha256({
      schema: 'lafea-mesh-artifact-lifecycle-state-hash-input/v3', state: record,
    }),
    engineeringAuthority: false,
  });
}

export function transitionLafeaMeshArtifactLifecycleV3(currentValue, targetValue) {
  const current = validateLifecycle(currentValue);
  const target = createLafeaMeshArtifactLifecycleV3(targetValue);
  if (target.artifactHash !== current.artifactHash
    || target.sourceCommandHash !== current.sourceCommandHash) {
    fail('LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_IDENTITY_CHANGED');
  }
  if (target.previousStateHash !== current.stateHash) {
    fail('LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_PREVIOUS_STATE_MISMATCH');
  }
  if (!TRANSITIONS[current.state].includes(target.state)) {
    fail('LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_TRANSITION_NOT_ALLOWED');
  }
  if (current.partial && target.state === 'VALIDATED') {
    fail('LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_PARTIAL_CANNOT_VALIDATE');
  }
  return target;
}

export function createLafeaRecoveredArtifactQuarantineV3(value) {
  return createLafeaMeshArtifactLifecycleV3({
    schema: LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_SCHEMA,
    artifactHash: sha(value?.artifactHash, 'ARTIFACT_HASH'),
    sourceCommandHash: sha(value?.recoveryCommandHash, 'RECOVERY_COMMAND_HASH'),
    state: 'QUARANTINED',
    partial: boolean(value?.partial, 'PARTIAL'),
    validationHash: null,
    quarantineReasonHash: sha(value?.importBundleHash, 'IMPORT_BUNDLE_HASH'),
    previousStateHash: null,
  });
}

export function validateLafeaMeshArtifactLifecycleV3(value) {
  return validateLifecycle(value);
}
function validateLifecycle(value) {
  const { stateHash, engineeringAuthority, ...input } = value || {};
  const rebuilt = createLafeaMeshArtifactLifecycleV3(input);
  if (stateHash !== rebuilt.stateHash) fail('LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_HASH_INVALID');
  if (engineeringAuthority !== false) fail('LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_AUTHORITY_INVALID');
  return rebuilt;
}
function enforceState(record) {
  if ((record.state === 'TEMPORARY' || record.state === 'GENERATED_UNVERIFIED')
    && (record.validationHash !== null || record.quarantineReasonHash !== null)) {
    fail('LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_UNVERIFIED_METADATA_INVALID');
  }
  if (record.state === 'GENERATED_UNVERIFIED' && record.partial) {
    fail('LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_PARTIAL_GENERATION_MUST_QUARANTINE');
  }
  if (record.state === 'QUARANTINED' && record.quarantineReasonHash === null) {
    fail('LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_QUARANTINE_REASON_REQUIRED');
  }
  if ((record.state === 'VALIDATED' || record.state === 'RETAINED')
    && (record.partial || record.validationHash === null || record.quarantineReasonHash !== null)) {
    fail('LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_VALIDATED_STATE_INVALID');
  }
}
function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code);
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_${field}_INVALID`);
  return value.trim();
}
function exactText(value, expected, field) {
  if (value !== expected) fail(`LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_${field}_INVALID`);
  return value;
}
function sha(value, field) {
  const out = text(value, field);
  if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_${field}_INVALID`);
  return out;
}
function optionalSha(value, field) { return value === null ? null : sha(value, field); }
function boolean(value, field) {
  if (typeof value !== 'boolean') fail(`LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_${field}_INVALID`);
  return value;
}
function enumValue(value, allowed, field) {
  if (!allowed.includes(value)) fail(`LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_${field}_INVALID`);
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
