/** Custody-state operation policy. Visibility never implies execution authority. */

export const LAFEA_MESH_OPERATION_POLICY_V3_SCHEMA = 'lafea-mesh-operation-policy/v3';
export const LAFEA_MESH_OPERATIONS_V3 = Object.freeze([
  'VIEW', 'SELECT', 'QUALITY_INSPECT', 'EXPORT', 'REFINE', 'SOLVER_RUN',
  'CONVERGENCE_ANCESTRY', 'RESULT_OVERLAY',
]);
const CUSTODY = Object.freeze([
  'ABSENT', 'INVALID', 'STALE', 'CURRENT_BLOCK', 'CURRENT_PASS',
]);

export function buildLafeaMeshOperationPolicyV3(custodyState) {
  if (!CUSTODY.includes(custodyState)) fail('LAFEA_MESH_OPERATION_POLICY_V3_CUSTODY_INVALID');
  const rules = policy(custodyState);
  return freeze({
    schema: LAFEA_MESH_OPERATION_POLICY_V3_SCHEMA,
    custodyState,
    rules: freeze(LAFEA_MESH_OPERATIONS_V3.map((operation) => freeze({
      operation,
      disposition: rules[operation],
    }))),
  });
}

export function requireLafeaMeshOperationV3(custodyState, operation, context = {}) {
  if (!LAFEA_MESH_OPERATIONS_V3.includes(operation)) {
    fail('LAFEA_MESH_OPERATION_POLICY_V3_OPERATION_INVALID');
  }
  const row = buildLafeaMeshOperationPolicyV3(custodyState).rules
    .find((candidate) => candidate.operation === operation);
  if (row.disposition.startsWith('DENY')) fail(`LAFEA_MESH_OPERATION_V3_${operation}_DENIED`);
  if (row.disposition === 'ALLOW_EXACT_MESH_MATCH_ONLY') {
    const meshContentHash = sha256(context.meshContentHash, 'MESH_CONTENT_HASH');
    const resultMeshContentHash = sha256(context.resultMeshContentHash, 'RESULT_MESH_CONTENT_HASH');
    if (meshContentHash !== resultMeshContentHash) {
      fail('LAFEA_MESH_OPERATION_V3_RESULT_OVERLAY_MESH_MISMATCH');
    }
  }
  return row;
}

function policy(state) {
  if (state === 'ABSENT') return all('DENY_NO_MESH');
  if (state === 'INVALID') return {
    ...all('DENY_INVALID_EVIDENCE'),
    VIEW: 'ALLOW_FORENSIC_ONLY',
    EXPORT: 'ALLOW_FORENSIC_ONLY',
  };
  if (state === 'STALE') return {
    VIEW: 'ALLOW_HISTORICAL',
    SELECT: 'ALLOW_HISTORICAL',
    QUALITY_INSPECT: 'ALLOW_HISTORICAL',
    EXPORT: 'ALLOW_HISTORICAL_STALE_LABELED',
    REFINE: 'DENY_STALE',
    SOLVER_RUN: 'DENY_STALE',
    CONVERGENCE_ANCESTRY: 'DENY_STALE',
    RESULT_OVERLAY: 'ALLOW_EXACT_MESH_MATCH_ONLY',
  };
  if (state === 'CURRENT_BLOCK') return {
    VIEW: 'ALLOW',
    SELECT: 'ALLOW',
    QUALITY_INSPECT: 'ALLOW',
    EXPORT: 'ALLOW_BLOCKED_LABELED',
    REFINE: 'DENY_QUALITY_BLOCK',
    SOLVER_RUN: 'DENY_QUALITY_BLOCK',
    CONVERGENCE_ANCESTRY: 'DENY_QUALITY_BLOCK',
    RESULT_OVERLAY: 'ALLOW_EXACT_MESH_MATCH_ONLY',
  };
  return {
    VIEW: 'ALLOW',
    SELECT: 'ALLOW',
    QUALITY_INSPECT: 'ALLOW',
    EXPORT: 'ALLOW',
    REFINE: 'ALLOW_IF_CAPABILITY',
    SOLVER_RUN: 'ALLOW_IF_AUTHORIZED',
    CONVERGENCE_ANCESTRY: 'ALLOW_IF_AUTHORIZED',
    RESULT_OVERLAY: 'ALLOW_EXACT_MESH_MATCH_ONLY',
  };
}
function all(disposition) {
  return Object.fromEntries(LAFEA_MESH_OPERATIONS_V3.map((operation) => [operation, disposition]));
}
function sha256(value, field) {
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value)) {
    fail(`LAFEA_MESH_OPERATION_POLICY_V3_${field}_INVALID`);
  }
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
