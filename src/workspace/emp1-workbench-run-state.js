import { semanticHash } from '../core/shared-primitives/canonical-json.js';

export const EMP1_WORKBENCH_RUN_INPUT_SCHEMA = 'emp1-workbench-run-input/v2';
export const EMP1_WORKBENCH_PRODUCT_EXECUTION_SCHEMA = 'emp1-workbench-product-execution/v2';
export const EMP1_WORKBENCH_BOUNDED_ROUTE_REQUEST_SCHEMA =
  'emp1-wrc537-gamma5-zero-dp-orchestration-request/v2';
export const EMP1_WORKBENCH_EXECUTION_CURRENTNESS = Object.freeze({
  NOT_RUN: 'NOT_RUN',
  CURRENT: 'CURRENT',
  STALE: 'STALE',
});

const RUN_INPUT_KEYS = Object.freeze(['schema', 'localMethod']);
const LOCAL_METHOD_KEYS = Object.freeze(['routeRequest', 'attachmentGeometry']);
const ATTACHMENT_GEOMETRY_KEYS = Object.freeze([
  'geometryIdentity', 'attachmentDiameter', 'unit', 'sourceReference',
]);
const ROUTE_REQUEST_KEYS = Object.freeze([
  'schema', 'loadCaseIdentity', 'pressureResultIdentity',
]);

/** Lightweight source-state contract. This module intentionally imports no WRC executor/data. */
export function normalizeEmp1WorkbenchRunInput(value) {
  const input = exactRecord(value, RUN_INPUT_KEYS, 'EMP1_WORKBENCH_RUN_INPUT_KEYS_INVALID');
  if (input.schema !== EMP1_WORKBENCH_RUN_INPUT_SCHEMA) {
    throw workbenchError('EMP1_WORKBENCH_RUN_INPUT_SCHEMA_INVALID');
  }
  return deepFreeze({
    schema: EMP1_WORKBENCH_RUN_INPUT_SCHEMA,
    localMethod: normalizeLocalMethod(input.localMethod),
  });
}

export function emp1WorkbenchRunInputHash(value) {
  return semanticHash(normalizeEmp1WorkbenchRunInput(value));
}

export function emp1WorkbenchInputHashes({ aDocument, bDocument, runInput } = {}) {
  const normalized = normalizeEmp1WorkbenchRunInput(runInput);
  return deepFreeze({
    loadTransferDocument: semanticHash(requireRecord(
      aDocument,
      'EMP1_WORKBENCH_A_DOCUMENT_REQUIRED',
    )),
    sectionScreeningDocument: semanticHash(requireRecord(
      bDocument,
      'EMP1_WORKBENCH_B_DOCUMENT_REQUIRED',
    )),
    attachmentGeometry: semanticHash(normalized.localMethod.attachmentGeometry),
    localRoute: semanticHash(normalized.localMethod.routeRequest),
  });
}

export function reconcileEmp1WorkbenchChangeClasses(declared, previousHashes, nextHashes) {
  const classes = new Set(Array.isArray(declared) ? declared : []);
  if (!previousHashes) classes.add('SOURCE_IDENTITY');
  else {
    if (previousHashes.loadTransferDocument !== nextHashes.loadTransferDocument) {
      classes.add('SOURCE_IDENTITY');
    }
    if (previousHashes.sectionScreeningDocument !== nextHashes.sectionScreeningDocument
      || previousHashes.attachmentGeometry !== nextHashes.attachmentGeometry) {
      classes.add('SECTION');
    }
    if (previousHashes.localRoute !== nextHashes.localRoute) classes.add('LOCAL_METHOD');
  }
  return deepFreeze([...classes]);
}

export function projectEmp1WorkbenchRunReadiness({ aDocument, bDocument, runInput } = {}) {
  const reasons = [];
  if (!record(aDocument)) reasons.push('EMP1_WORKBENCH_A_DOCUMENT_REQUIRED');
  if (!record(bDocument)) reasons.push('EMP1_WORKBENCH_B_DOCUMENT_REQUIRED');
  try {
    normalizeEmp1WorkbenchRunInput(runInput);
  } catch (error) {
    reasons.push(error?.code ?? 'EMP1_WORKBENCH_RUN_INPUT_INVALID');
  }
  return deepFreeze({
    schema: 'emp1-workbench-run-readiness/v1',
    state: reasons.length ? 'BLOCKED' : 'READY',
    runAuthorized: reasons.length === 0,
    reasons: [...new Set(reasons)],
  });
}

export function classifyEmp1WorkbenchExecutionCurrentness({
  execution,
  aDocument,
  bDocument,
  runInput,
} = {}) {
  if (!execution) {
    return deepFreeze({ state: EMP1_WORKBENCH_EXECUTION_CURRENTNESS.NOT_RUN, reasons: [] });
  }
  if (execution.schema !== EMP1_WORKBENCH_PRODUCT_EXECUTION_SCHEMA || !execution.inputHashes) {
    return deepFreeze({
      state: EMP1_WORKBENCH_EXECUTION_CURRENTNESS.STALE,
      reasons: ['EMP1_WORKBENCH_EXECUTION_SCHEMA_OR_HASHES_INVALID'],
    });
  }
  try {
    const current = emp1WorkbenchInputHashes({ aDocument, bDocument, runInput });
    const reasons = Object.keys(current)
      .filter((key) => current[key] !== execution.inputHashes[key])
      .map((key) => `EMP1_WORKBENCH_${key.toUpperCase()}_CHANGED`);
    return deepFreeze({
      state: reasons.length
        ? EMP1_WORKBENCH_EXECUTION_CURRENTNESS.STALE
        : EMP1_WORKBENCH_EXECUTION_CURRENTNESS.CURRENT,
      reasons,
    });
  } catch (error) {
    return deepFreeze({
      state: EMP1_WORKBENCH_EXECUTION_CURRENTNESS.STALE,
      reasons: [error?.code ?? 'EMP1_WORKBENCH_CURRENTNESS_INPUT_INVALID'],
    });
  }
}

export function normalizeEmp1AttachmentGeometry(value) {
  const source = exactRecord(value, ATTACHMENT_GEOMETRY_KEYS,
    'EMP1_WORKBENCH_ATTACHMENT_GEOMETRY_KEYS_INVALID');
  return deepFreeze({
    geometryIdentity: requiredText(
      source.geometryIdentity,
      'EMP1_WORKBENCH_GEOMETRY_IDENTITY_REQUIRED',
    ),
    attachmentDiameter: positive(
      source.attachmentDiameter,
      'EMP1_WORKBENCH_ATTACHMENT_DIAMETER_INVALID',
    ),
    unit: requiredText(source.unit, 'EMP1_WORKBENCH_ATTACHMENT_UNIT_REQUIRED'),
    sourceReference: requiredText(
      source.sourceReference,
      'EMP1_WORKBENCH_ATTACHMENT_SOURCE_REFERENCE_REQUIRED',
    ),
  });
}

function normalizeLocalMethod(value) {
  const source = exactRecord(value, LOCAL_METHOD_KEYS,
    'EMP1_WORKBENCH_LOCAL_METHOD_KEYS_INVALID');
  const routeRequest = exactRecord(source.routeRequest, ROUTE_REQUEST_KEYS,
    'EMP1_WORKBENCH_ROUTE_REQUEST_KEYS_INVALID');
  if (routeRequest.schema !== EMP1_WORKBENCH_BOUNDED_ROUTE_REQUEST_SCHEMA) {
    throw workbenchError('EMP1_WORKBENCH_ROUTE_REQUEST_SCHEMA_INVALID');
  }
  return {
    routeRequest: deepFreeze({
      schema: EMP1_WORKBENCH_BOUNDED_ROUTE_REQUEST_SCHEMA,
      loadCaseIdentity: requiredText(
        routeRequest.loadCaseIdentity,
        'EMP1_WORKBENCH_LOAD_CASE_IDENTITY_REQUIRED',
      ),
      pressureResultIdentity: requiredText(
        routeRequest.pressureResultIdentity,
        'EMP1_WORKBENCH_PRESSURE_RESULT_IDENTITY_REQUIRED',
      ),
    }),
    attachmentGeometry: normalizeEmp1AttachmentGeometry(source.attachmentGeometry),
  };
}

function exactRecord(value, keys, code) {
  requireRecord(value, code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw workbenchError(code);
  return structuredClone(value);
}
function requireRecord(value, code) {
  if (!record(value)) throw workbenchError(code);
  return value;
}
function record(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function requiredText(value, code) {
  if (typeof value !== 'string' || !value.trim()) throw workbenchError(code);
  return value.trim();
}
function positive(value, code) {
  if (!Number.isFinite(value) || value <= 0) throw workbenchError(code);
  return Number(value);
}
function workbenchError(code) { const error = new TypeError(code); error.code = code; return error; }
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
