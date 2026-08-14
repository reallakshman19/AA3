/** Runtime-authoritative resource admission for Mesh Workspace v3. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_MESH_RESOURCE_CEILING_V3_SCHEMA = 'lafea-mesh-resource-ceiling/v3';
export const LAFEA_MESH_RESOURCE_PLAN_ASSESSMENT_V3_SCHEMA =
  'lafea-mesh-resource-plan-assessment/v3';
export const LAFEA_MESH_RUNTIME_RESOURCE_RECEIPT_V3_SCHEMA =
  'lafea-mesh-runtime-resource-receipt/v3';
const CEILING_KEYS = Object.freeze([
  'schema', 'maximumNodes', 'maximumElements', 'maximumDofs',
  'maximumResidentBytes', 'maximumExecutionMilliseconds', 'warningFraction',
]);
const RUNTIME_KEYS = Object.freeze([
  'schema', 'ceilingHash', 'observedNodes', 'observedElements', 'observedDofs',
  'peakResidentBytes', 'elapsedMilliseconds', 'termination',
  'partialOutputDisposition',
]);

export function createLafeaMeshResourceCeilingV3(value) {
  exact(value, CEILING_KEYS, 'LAFEA_MESH_RESOURCE_V3_CEILING_KEYS_INVALID');
  const record = freeze({
    schema: exactText(value.schema, LAFEA_MESH_RESOURCE_CEILING_V3_SCHEMA, 'CEILING_SCHEMA'),
    maximumNodes: positiveInteger(value.maximumNodes, 'MAXIMUM_NODES'),
    maximumElements: positiveInteger(value.maximumElements, 'MAXIMUM_ELEMENTS'),
    maximumDofs: positiveInteger(value.maximumDofs, 'MAXIMUM_DOFS'),
    maximumResidentBytes: positiveInteger(value.maximumResidentBytes, 'MAXIMUM_RESIDENT_BYTES'),
    maximumExecutionMilliseconds: positiveInteger(
      value.maximumExecutionMilliseconds,
      'MAXIMUM_EXECUTION_MILLISECONDS',
    ),
    warningFraction: fraction(value.warningFraction, 'WARNING_FRACTION'),
  });
  return freeze({
    ...record,
    ceilingHash: canonicalLafeaSha256({
      schema: 'lafea-mesh-resource-ceiling-hash-input/v3', record,
    }),
  });
}

export function assessLafeaMeshResourcePlanV3(value, ceilingValue) {
  const ceiling = validateCeiling(ceilingValue);
  const estimates = freeze({
    estimatedNodes: positiveInteger(value?.estimatedNodes, 'ESTIMATED_NODES'),
    estimatedElements: positiveInteger(value?.estimatedElements, 'ESTIMATED_ELEMENTS'),
    estimatedDofs: positiveInteger(value?.estimatedDofs, 'ESTIMATED_DOFS'),
    estimatedResidentBytes: positiveInteger(value?.estimatedResidentBytes, 'ESTIMATED_RESIDENT_BYTES'),
    estimatedExecutionMilliseconds: positiveInteger(
      value?.estimatedExecutionMilliseconds,
      'ESTIMATED_EXECUTION_MILLISECONDS',
    ),
  });
  const ratios = freeze([
    estimates.estimatedNodes / ceiling.maximumNodes,
    estimates.estimatedElements / ceiling.maximumElements,
    estimates.estimatedDofs / ceiling.maximumDofs,
    estimates.estimatedResidentBytes / ceiling.maximumResidentBytes,
    estimates.estimatedExecutionMilliseconds / ceiling.maximumExecutionMilliseconds,
  ]);
  const maximumUtilization = Math.max(...ratios);
  const disposition = maximumUtilization > 1
    ? 'BLOCK'
    : maximumUtilization >= ceiling.warningFraction ? 'WARNING' : 'WITHIN_LIMITS';
  const core = freeze({
    schema: LAFEA_MESH_RESOURCE_PLAN_ASSESSMENT_V3_SCHEMA,
    ceilingHash: ceiling.ceilingHash,
    estimates,
    maximumUtilization,
    disposition,
    engineeringAuthority: false,
  });
  return freeze({
    ...core,
    assessmentHash: canonicalLafeaSha256({
      schema: 'lafea-mesh-resource-plan-assessment-hash-input/v3', assessment: core,
    }),
  });
}

export function createLafeaMeshRuntimeResourceReceiptV3(value, ceilingValue) {
  const ceiling = validateCeiling(ceilingValue);
  exact(value, RUNTIME_KEYS, 'LAFEA_MESH_RESOURCE_V3_RUNTIME_KEYS_INVALID');
  if (value.ceilingHash !== ceiling.ceilingHash) fail('LAFEA_MESH_RESOURCE_V3_CEILING_HASH_MISMATCH');
  const observed = freeze({
    observedNodes: nonNegativeInteger(value.observedNodes, 'OBSERVED_NODES'),
    observedElements: nonNegativeInteger(value.observedElements, 'OBSERVED_ELEMENTS'),
    observedDofs: nonNegativeInteger(value.observedDofs, 'OBSERVED_DOFS'),
    peakResidentBytes: nonNegativeInteger(value.peakResidentBytes, 'PEAK_RESIDENT_BYTES'),
    elapsedMilliseconds: nonNegativeInteger(value.elapsedMilliseconds, 'ELAPSED_MILLISECONDS'),
  });
  const violations = freeze([
    limit('NODES', observed.observedNodes, ceiling.maximumNodes),
    limit('ELEMENTS', observed.observedElements, ceiling.maximumElements),
    limit('DOFS', observed.observedDofs, ceiling.maximumDofs),
    limit('RESIDENT_BYTES', observed.peakResidentBytes, ceiling.maximumResidentBytes),
    limit('EXECUTION_MILLISECONDS', observed.elapsedMilliseconds, ceiling.maximumExecutionMilliseconds),
  ].filter((row) => row.exceeded));
  const termination = enumValue(
    value.termination,
    ['COMPLETED', 'ABORTED_RESOURCE_LIMIT', 'CANCELLED_USER', 'FAILED_PRODUCER'],
    'TERMINATION',
  );
  const partialOutputDisposition = enumValue(
    value.partialOutputDisposition,
    ['NONE', 'DESTROYED', 'QUARANTINED_NONRETAINABLE'],
    'PARTIAL_OUTPUT_DISPOSITION',
  );
  if (violations.length && termination !== 'ABORTED_RESOURCE_LIMIT') {
    fail('LAFEA_MESH_RESOURCE_V3_LIMIT_EXCEEDED_WITHOUT_ABORT');
  }
  if (termination === 'ABORTED_RESOURCE_LIMIT' && !violations.length) {
    fail('LAFEA_MESH_RESOURCE_V3_RESOURCE_ABORT_WITHOUT_VIOLATION');
  }
  if (termination === 'COMPLETED' && partialOutputDisposition !== 'NONE') {
    fail('LAFEA_MESH_RESOURCE_V3_COMPLETED_PARTIAL_DISPOSITION_INVALID');
  }
  if (termination !== 'COMPLETED' && partialOutputDisposition === 'NONE') {
    fail('LAFEA_MESH_RESOURCE_V3_NONCOMPLETED_PARTIAL_OUTPUT_UNGOVERNED');
  }
  const retainable = termination === 'COMPLETED' && violations.length === 0;
  const core = freeze({
    schema: LAFEA_MESH_RUNTIME_RESOURCE_RECEIPT_V3_SCHEMA,
    ceilingHash: ceiling.ceilingHash,
    ...observed,
    termination,
    partialOutputDisposition,
    violations,
    retainable,
    engineeringAuthority: false,
  });
  return freeze({
    ...core,
    receiptHash: canonicalLafeaSha256({
      schema: 'lafea-mesh-runtime-resource-receipt-hash-input/v3', receipt: core,
    }),
  });
}

function validateCeiling(value) {
  const { ceilingHash, ...input } = value || {};
  const rebuilt = createLafeaMeshResourceCeilingV3(input);
  if (ceilingHash !== rebuilt.ceilingHash) fail('LAFEA_MESH_RESOURCE_V3_CEILING_HASH_INVALID');
  return rebuilt;
}
function limit(metric, value, maximum) { return freeze({ metric, value, maximum, exceeded: value > maximum }); }
function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code);
}
function exactText(value, expected, field) {
  if (value !== expected) fail(`LAFEA_MESH_RESOURCE_V3_${field}_INVALID`);
  return value;
}
function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) fail(`LAFEA_MESH_RESOURCE_V3_${field}_INVALID`);
  return value;
}
function nonNegativeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) fail(`LAFEA_MESH_RESOURCE_V3_${field}_INVALID`);
  return value;
}
function fraction(value, field) {
  if (!Number.isFinite(value) || value <= 0 || value > 1) fail(`LAFEA_MESH_RESOURCE_V3_${field}_INVALID`);
  return value;
}
function enumValue(value, allowed, field) {
  if (!allowed.includes(value)) fail(`LAFEA_MESH_RESOURCE_V3_${field}_INVALID`);
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
