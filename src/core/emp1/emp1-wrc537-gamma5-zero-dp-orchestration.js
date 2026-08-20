import {
  EMP1_A_WRC_ZERO_DP_PRODUCER_QUALIFICATION_SHA256,
  createEmp1AZeroDpWrcQualifiedLoadCustody,
  deriveEmp1AZeroDpWrcLoadPackageCandidate,
} from './emp1-a-wrc-zero-dp-load-producer.js';
import {
  EMP1_WRC537_BOUNDED_DATASET_HASH,
  EMP1_WRC537_BOUNDED_GAMMA,
  EMP1_WRC537_BOUNDED_SOURCE_SHA256,
  EMP1_WRC537_BOUNDED_VARIANT,
} from './emp1-wrc537-cylindrical-bounded-domain.js';
import { deriveEmp1Wrc537CylindricalBoundedGeometry } from './emp1-wrc537-cylindrical-bounded-adapter.js';
import { buildEmp1Wrc537CylindricalFrame } from './emp1-wrc537-cylindrical-frame.js';
import {
  EMP1_WRC537_GAMMA5_ZERO_DP_BENCHMARK_QUALIFICATION,
  EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION,
  runEmp1Wrc537Gamma5ZeroDpRoute,
} from './emp1-wrc537-gamma5-zero-dp-route.js';

export const EMP1_WRC537_GAMMA5_ZERO_DP_ORCHESTRATION_REQUEST_SCHEMA =
  'emp1-wrc537-gamma5-zero-dp-orchestration-request/v1';
export const EMP1_WRC537_GAMMA5_ZERO_DP_LOAD_LAYER_SCHEMA =
  'emp1-a-retained-foundation-layer/v1';

const REQUEST_KEYS = Object.freeze([
  'schema',
  'loadCaseIdentity',
  'pressureResultIdentity',
  'wrcReferencePointGlobal',
  'geometry',
  'axes',
  'stressConcentration',
]);
const EXACT_GAMMA_POLICY = 'EXACT_SOURCE_TABULATED_GAMMA_ONLY';

/**
 * Wrap a retained LAFEA.1 result for the unified EMP.1 orchestrator without
 * altering the retained result contract. The WRC preparer independently
 * revalidates the nested result hashes before creating load custody.
 */
export function createEmp1RetainedFoundationLayer(foundationResult) {
  if (!record(foundationResult)
    || foundationResult.schema !== 'local-attachment-foundation-result/v1'
    || foundationResult.qualification?.state !== 'ACCEPTED') {
    throw orchestrationError('EMP1_WRC537_ZERO_DP_FOUNDATION_RESULT_NOT_QUALIFIED');
  }
  const resultHash = foundationResult.semanticHashes?.resultPayloadSemanticHash;
  if (typeof resultHash !== 'string' || !resultHash.trim()) {
    throw orchestrationError('EMP1_WRC537_ZERO_DP_FOUNDATION_RESULT_HASH_REQUIRED');
  }
  return deepFreeze({
    schema: EMP1_WRC537_GAMMA5_ZERO_DP_LOAD_LAYER_SCHEMA,
    qualification: 'PASS',
    resultHash,
    reasons: [],
    foundationResult,
  });
}

/**
 * Build the runtime local-method source only from caller geometry/axis intent
 * plus the actual qualified EMP.1.A result. Caller-authored authority hashes,
 * load custody and policy flags are deliberately outside the accepted request.
 */
export function prepareEmp1Wrc537Gamma5ZeroDpLocalSource({ source, loadTransfer } = {}) {
  if (!record(source)) throw orchestrationError('EMP1_WRC537_ZERO_DP_ORCHESTRATION_SOURCE_REQUIRED');
  const request = requireRequest(source?.localMethod?.routeRequest);
  const foundationResult = requireFoundationResult(loadTransfer);
  const geometry = deriveEmp1Wrc537CylindricalBoundedGeometry(request.geometry);
  requireUnityStressConcentration(request.stressConcentration);
  buildEmp1Wrc537CylindricalFrame(request.axes);

  const loadCandidate = deriveEmp1AZeroDpWrcLoadPackageCandidate({
    result: foundationResult,
    loadCaseIdentity: request.loadCaseIdentity,
    pressureResultIdentity: request.pressureResultIdentity,
    wrcReferencePointGlobal: request.wrcReferencePointGlobal,
    productionObservationUsedToSetAuthority: false,
  });
  const loadCustody = createEmp1AZeroDpWrcQualifiedLoadCustody(loadCandidate);

  const prepared = structuredClone(source);
  prepared.localMethod = {
    requested: true,
    routeRequest: structuredClone(request),
    sourceSha256: EMP1_WRC537_BOUNDED_SOURCE_SHA256,
    datasetHash: EMP1_WRC537_BOUNDED_DATASET_HASH,
    shellFamily: 'CYLINDRICAL',
    attachmentShape: 'ROUND',
    gammaSelectionPolicy: EXACT_GAMMA_POLICY,
    sourceParameterResolved: true,
    interpolationUsed: false,
    extrapolationFallbackUsed: false,
    variant: EMP1_WRC537_BOUNDED_VARIANT,
    gamma: geometry.gamma,
    sourceGamma: EMP1_WRC537_BOUNDED_GAMMA,
    beta: geometry.beta,
    loadCustody,
  };
  return deepFreeze(prepared);
}

export function runEmp1Wrc537Gamma5ZeroDpLocalCorrelation({ source, loadTransfer, gate } = {}) {
  if (gate?.state !== 'METHOD_QUALIFIED' || gate?.engineeringUseAuthorized !== true) {
    throw orchestrationError('EMP1_WRC537_ZERO_DP_ORCHESTRATION_GATE_NOT_QUALIFIED');
  }
  const request = requireRequest(source?.localMethod?.routeRequest);
  return runEmp1Wrc537Gamma5ZeroDpRoute({
    loadTransferResult: requireFoundationResult(loadTransfer),
    loadCaseIdentity: request.loadCaseIdentity,
    pressureResultIdentity: request.pressureResultIdentity,
    wrcReferencePointGlobal: request.wrcReferencePointGlobal,
    geometry: request.geometry,
    axes: request.axes,
    stressConcentration: request.stressConcentration,
  });
}

export function createEmp1Wrc537Gamma5ZeroDpOrchestrationAdapters({
  runLoadTransfer,
  runSectionScreening,
} = {}) {
  if (typeof runLoadTransfer !== 'function') {
    throw orchestrationError('EMP1_WRC537_ZERO_DP_LOAD_TRANSFER_ADAPTER_REQUIRED');
  }
  if (typeof runSectionScreening !== 'function') {
    throw orchestrationError('EMP1_WRC537_ZERO_DP_SECTION_SCREENING_ADAPTER_REQUIRED');
  }
  return deepFreeze({
    runLoadTransfer,
    runSectionScreening,
    prepareLocalCorrelationSource: prepareEmp1Wrc537Gamma5ZeroDpLocalSource,
    runLocalCorrelation: runEmp1Wrc537Gamma5ZeroDpLocalCorrelation,
  });
}

export function emp1Wrc537Gamma5ZeroDpOrchestrationQualification() {
  return deepFreeze({
    methodQualification: EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION,
    benchmarkQualification: EMP1_WRC537_GAMMA5_ZERO_DP_BENCHMARK_QUALIFICATION,
    loadProducerQualificationSha256: EMP1_A_WRC_ZERO_DP_PRODUCER_QUALIFICATION_SHA256,
  });
}

function requireFoundationResult(value) {
  if (value?.schema === 'local-attachment-foundation-result/v1') return value;
  if (value?.schema !== EMP1_WRC537_GAMMA5_ZERO_DP_LOAD_LAYER_SCHEMA
    || value?.qualification !== 'PASS'
    || value?.foundationResult?.schema !== 'local-attachment-foundation-result/v1') {
    throw orchestrationError('EMP1_WRC537_ZERO_DP_RETAINED_FOUNDATION_LAYER_REQUIRED');
  }
  if (value.resultHash !== value.foundationResult.semanticHashes?.resultPayloadSemanticHash) {
    throw orchestrationError('EMP1_WRC537_ZERO_DP_FOUNDATION_LAYER_HASH_MISMATCH');
  }
  return value.foundationResult;
}

function requireRequest(value) {
  if (!record(value)) throw orchestrationError('EMP1_WRC537_ZERO_DP_REQUEST_REQUIRED');
  if (value.schema !== EMP1_WRC537_GAMMA5_ZERO_DP_ORCHESTRATION_REQUEST_SCHEMA) {
    throw orchestrationError('EMP1_WRC537_ZERO_DP_REQUEST_SCHEMA');
  }
  const unsupported = Object.keys(value).filter((key) => !REQUEST_KEYS.includes(key));
  if (unsupported.length) {
    throw orchestrationError(`EMP1_WRC537_ZERO_DP_REQUEST_UNSUPPORTED_FIELD:${unsupported.sort().join(',')}`);
  }
  requiredString(value.loadCaseIdentity, 'LOAD_CASE_IDENTITY');
  requiredString(value.pressureResultIdentity, 'PRESSURE_RESULT_IDENTITY');
  vector3(value.wrcReferencePointGlobal, 'WRC_REFERENCE_POINT');
  if (!record(value.geometry)) throw orchestrationError('EMP1_WRC537_ZERO_DP_GEOMETRY_REQUIRED');
  if (!record(value.axes)) throw orchestrationError('EMP1_WRC537_ZERO_DP_AXES_REQUIRED');
  if (!record(value.stressConcentration)) throw orchestrationError('EMP1_WRC537_ZERO_DP_STRESS_CONCENTRATION_REQUIRED');
  return deepFreeze(structuredClone(value));
}

function requireUnityStressConcentration(value) {
  if (!record(value) || value.Kn !== 1 || value.Kb !== 1) {
    throw orchestrationError('EMP1_WRC537_GAMMA5_ZERO_DP_UNITY_STRESS_CONCENTRATION_REQUIRED');
  }
}
function requiredString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw orchestrationError(`EMP1_WRC537_ZERO_DP_${label}_REQUIRED`);
  return value.trim();
}
function vector3(value, label) {
  if (!Array.isArray(value) || value.length !== 3 || value.some((item) => !Number.isFinite(item))) {
    throw orchestrationError(`EMP1_WRC537_ZERO_DP_${label}_INVALID`);
  }
  return value.map(Number);
}
function record(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function orchestrationError(code) { const error = new TypeError(code); error.code = code; return error; }
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
