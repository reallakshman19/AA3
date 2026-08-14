/** Immutable compare-and-dispatch snapshot; does not itself grant execution authority. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_SOLVER_AUTHORIZATION_SNAPSHOT_V3_SCHEMA =
  'lafea-solver-authorization-snapshot/v3';
const STAGES = Object.freeze(['LAFEA.3', 'LAFEA.4', 'LAFEA.5']);
const KEYS = Object.freeze([
  'schema', 'stageId', 'workspaceStateHash', 'meshContentHash', 'meshAuthorityHash',
  'meshDependencyHash', 'materialSectionHash', 'loadBcHash', 'solverCapabilityHash',
  'solverQualificationHash', 'authorityReceiptHash', 'concurrencyVersion',
]);

export function createLafeaSolverAuthorizationSnapshotV3(value) {
  exact(value, KEYS, 'LAFEA_SOLVER_AUTHORIZATION_V3_KEYS_INVALID');
  const record = freeze({
    schema: exactText(value.schema, LAFEA_SOLVER_AUTHORIZATION_SNAPSHOT_V3_SCHEMA, 'SCHEMA'),
    stageId: enumValue(value.stageId, STAGES, 'STAGE_ID'),
    workspaceStateHash: sha(value.workspaceStateHash, 'WORKSPACE_STATE_HASH'),
    meshContentHash: sha(value.meshContentHash, 'MESH_CONTENT_HASH'),
    meshAuthorityHash: sha(value.meshAuthorityHash, 'MESH_AUTHORITY_HASH'),
    meshDependencyHash: sha(value.meshDependencyHash, 'MESH_DEPENDENCY_HASH'),
    materialSectionHash: sha(value.materialSectionHash, 'MATERIAL_SECTION_HASH'),
    loadBcHash: sha(value.loadBcHash, 'LOAD_BC_HASH'),
    solverCapabilityHash: sha(value.solverCapabilityHash, 'SOLVER_CAPABILITY_HASH'),
    solverQualificationHash: sha(value.solverQualificationHash, 'SOLVER_QUALIFICATION_HASH'),
    authorityReceiptHash: sha(value.authorityReceiptHash, 'AUTHORITY_RECEIPT_HASH'),
    concurrencyVersion: nonNegative(value.concurrencyVersion, 'CONCURRENCY_VERSION'),
  });
  return freeze({
    ...record,
    authorizationHash: canonicalLafeaSha256({
      schema: 'lafea-solver-authorization-snapshot-hash-input/v3', record,
    }),
    engineeringAuthority: false,
    executionAuthorized: false,
  });
}

export function validateLafeaSolverAuthorizationSnapshotV3(value) {
  const { authorizationHash, engineeringAuthority, executionAuthorized, ...input } = value || {};
  const rebuilt = createLafeaSolverAuthorizationSnapshotV3(input);
  if (authorizationHash !== rebuilt.authorizationHash) fail('LAFEA_SOLVER_AUTHORIZATION_V3_HASH_INVALID');
  if (engineeringAuthority !== false || executionAuthorized !== false) {
    fail('LAFEA_SOLVER_AUTHORIZATION_V3_AUTHORITY_INVALID');
  }
  return rebuilt;
}

export function assertLafeaSolverDispatchSnapshotCurrentV3(snapshotValue, current) {
  const snapshot = validateLafeaSolverAuthorizationSnapshotV3(snapshotValue);
  exact(current, KEYS, 'LAFEA_SOLVER_DISPATCH_V3_CURRENT_KEYS_INVALID');
  const normalized = createLafeaSolverAuthorizationSnapshotV3(current);
  for (const key of KEYS) {
    if (normalized[key] !== snapshot[key]) {
      fail(`LAFEA_SOLVER_DISPATCH_V3_${code(key)}_MISMATCH`);
    }
  }
  return snapshot;
}
function exact(value, keys, errorCode) { if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(errorCode); }
function text(value, field) { if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_SOLVER_AUTHORIZATION_V3_${field}_INVALID`); return value.trim(); }
function exactText(value, expected, field) { if (value !== expected) fail(`LAFEA_SOLVER_AUTHORIZATION_V3_${field}_INVALID`); return value; }
function sha(value, field) { const out = text(value, field); if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_SOLVER_AUTHORIZATION_V3_${field}_INVALID`); return out; }
function nonNegative(value, field) { if (!Number.isInteger(value) || value < 0) fail(`LAFEA_SOLVER_AUTHORIZATION_V3_${field}_INVALID`); return value; }
function enumValue(value, allowed, field) { if (!allowed.includes(value)) fail(`LAFEA_SOLVER_AUTHORIZATION_V3_${field}_INVALID`); return value; }
function code(value) { return value.replace(/([a-z0-9])([A-Z])/gu, '$1_$2').toUpperCase(); }
function fail(errorCode) { const error = new TypeError(errorCode); error.code = errorCode; throw error; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
