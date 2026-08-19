import { EMP1_SCHEMAS } from './emp1-identity.js';

export function evaluateEmp1LocalCorrelationGate(options = {}) {
  const method = options.methodQualification ?? null;
  const benchmark = options.benchmarkQualification ?? null;
  const reasons = [];

  if (!method) reasons.push('EMP1_LOCAL_METHOD_QUALIFICATION_REQUIRED');
  if (method && method.engineeringUseAuthorized !== true) {
    reasons.push('EMP1_LOCAL_METHOD_ENGINEERING_AUTHORITY_REQUIRED');
  }
  if (method && !nonEmpty(method.datasetHash)) {
    reasons.push('EMP1_LOCAL_METHOD_DATASET_HASH_REQUIRED');
  }
  if (method && !nonEmpty(method.qualificationRecordHash)) {
    reasons.push('EMP1_LOCAL_METHOD_QUALIFICATION_RECORD_REQUIRED');
  }
  if (method && !nonEmpty(method.sourceDocumentSha256)) {
    reasons.push('EMP1_LOCAL_METHOD_SOURCE_SHA256_REQUIRED');
  }
  if (!benchmark || benchmark.status !== 'PASS') {
    reasons.push('EMP1_LOCAL_METHOD_BENCHMARK_PASS_REQUIRED');
  }
  if (benchmark && !nonEmpty(benchmark.benchmarkHash)) {
    reasons.push('EMP1_LOCAL_METHOD_BENCHMARK_HASH_REQUIRED');
  }

  if (reasons.length) {
    return deepFreeze({
      schema: EMP1_SCHEMAS.LOCAL_CORRELATION_RESULT,
      state: 'BLOCKED',
      engineeringUseAuthorized: false,
      reasons,
      result: null,
    });
  }

  return deepFreeze({
    schema: EMP1_SCHEMAS.LOCAL_CORRELATION_RESULT,
    state: 'METHOD_QUALIFIED',
    engineeringUseAuthorized: true,
    methodIdentity: method.methodIdentity,
    methodEdition: method.methodEdition,
    sourceDocumentSha256: method.sourceDocumentSha256,
    datasetHash: method.datasetHash,
    qualificationRecordHash: method.qualificationRecordHash,
    benchmarkHash: benchmark.benchmarkHash,
    result: null,
    reasons: [],
  });
}

export function requireEmp1LocalCorrelationExecutionAuthority(gate) {
  if (!gate || gate.state !== 'METHOD_QUALIFIED' || gate.engineeringUseAuthorized !== true) {
    const error = new TypeError('EMP1_LOCAL_CORRELATION_NOT_AUTHORIZED');
    error.code = 'EMP1_LOCAL_CORRELATION_NOT_AUTHORIZED';
    error.reasons = gate?.reasons ?? [];
    throw error;
  }
  return gate;
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
