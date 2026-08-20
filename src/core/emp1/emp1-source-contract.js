import { EMP1_PRODUCT_ID, EMP1_SCHEMAS } from './emp1-identity.js';
import { normalizeEmp1Wrc537LoadCustody } from './emp1-wrc537-load-custody.js';

const SHA256_HEX = /^[a-f0-9]{64}$/u;

export function createEmp1Source(value) {
  if (!isRecord(value)) throw emp1SourceError('EMP1_SOURCE_REQUIRED');
  requireString(value.sourceId, 'sourceId');
  requireString(value.canonicalUnitSystem, 'canonicalUnitSystem');
  requireRecord(value.geometry, 'geometry');
  requireRecord(value.section, 'section');
  requireRecord(value.loadReference, 'loadReference');
  requireArray(value.loadCases, 'loadCases');

  const source = structuredClone(value);
  source.schema = EMP1_SCHEMAS.SOURCE;
  source.productId = EMP1_PRODUCT_ID;
  source.localMethod = normalizeLocalMethod(source.localMethod);
  source.benchmark = normalizeBenchmark(source.benchmark);
  return deepFreeze(source);
}

export function validateEmp1Source(value) {
  const source = createEmp1Source(value);
  if (source.schema !== EMP1_SCHEMAS.SOURCE || source.productId !== EMP1_PRODUCT_ID) throw emp1SourceError('EMP1_SOURCE_IDENTITY_INVALID');
  return source;
}

function normalizeLocalMethod(value) {
  if (value == null) return { requested: false, qualificationState: 'NOT_REQUESTED', sourceSha256: null };
  requireRecord(value, 'localMethod');
  const result = structuredClone(value);
  result.requested = Boolean(result.requested);
  if (result.sourceSha256 != null && !SHA256_HEX.test(result.sourceSha256)) throw emp1SourceError('EMP1_LOCAL_METHOD_SOURCE_SHA256_INVALID');
  if (result.datasetHash != null && !SHA256_HEX.test(result.datasetHash)) throw emp1SourceError('EMP1_LOCAL_METHOD_DATASET_SHA256_INVALID');
  if (result.loadCustody != null) {
    try { result.loadCustody = normalizeEmp1Wrc537LoadCustody(result.loadCustody); }
    catch (error) {
      const wrapped=emp1SourceError(`EMP1_LOCAL_METHOD_LOAD_CUSTODY_INVALID:${error.code??error.message}`);
      wrapped.cause=error;throw wrapped;
    }
  }
  return result;
}

function normalizeBenchmark(value) {
  if (value == null) return null;
  requireRecord(value, 'benchmark');
  if (value.sourceSha256 != null && !SHA256_HEX.test(value.sourceSha256)) throw emp1SourceError('EMP1_BENCHMARK_SOURCE_SHA256_INVALID');
  return structuredClone(value);
}
function requireRecord(value, path) { if (!isRecord(value)) throw emp1SourceError(`EMP1_SOURCE_FIELD_INVALID:${path}`); }
function requireArray(value, path) { if (!Array.isArray(value)) throw emp1SourceError(`EMP1_SOURCE_FIELD_INVALID:${path}`); }
function requireString(value, path) { if (typeof value !== 'string' || !value.trim()) throw emp1SourceError(`EMP1_SOURCE_FIELD_INVALID:${path}`); }
function isRecord(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function emp1SourceError(code) { const error = new TypeError(code); error.code = code; return error; }
function deepFreeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(deepFreeze); return Object.freeze(value); }
