import {
  EMP1_WRC537_BOUNDED_BETA_MAX,
  EMP1_WRC537_BOUNDED_BETA_MIN,
  EMP1_WRC537_BOUNDED_DATASET_HASH,
  EMP1_WRC537_BOUNDED_GAMMA,
  EMP1_WRC537_BOUNDED_SOURCE_SHA256,
  EMP1_WRC537_BOUNDED_VARIANT,
  evaluateEmp1Wrc537BoundedDomain,
} from './emp1-wrc537-cylindrical-bounded-domain.js';
import { requireEmp1Wrc537QualifiedLoadCustody } from './emp1-wrc537-load-custody.js';

const SHA256_HEX = /^[a-f0-9]{64}$/u;
const EXACT_GAMMA_POLICY = 'EXACT_SOURCE_TABULATED_GAMMA_ONLY';
const EXACT_GAMMA_SCOPE = 'CYLINDRICAL_EXACT_SOURCE_TABULATED_GAMMA';
const GAMMA5_TABLE5_SCOPE = 'CYLINDRICAL_ORIGINAL_GAMMA5_TABLE5_BOUNDED';
const VARIANTS = Object.freeze(['ORIGINAL','EXTRAPOLATED']);
const WRC_LOAD_REFERENCE='WRC_ATTACHMENT_REFERENCE_POINT';
const UPSTREAM_PRESSURE_DISPOSITION='PRESSURE_THRUST_RESOLVED_UPSTREAM';

export function evaluateEmp1LocalMethodScope(method, source) {
  const scope = method?.scopeContract ?? null;
  if (!scope) return freeze({ status: 'PASS_NO_SCOPE_CONTRACT', bounded: false, reasons: [] });
  const reasons = [];
  if (scope.schema !== 'emp1-local-method-scope/v1') reasons.push('EMP1_LOCAL_METHOD_SCOPE_SCHEMA_INVALID');
  if (![EXACT_GAMMA_SCOPE,GAMMA5_TABLE5_SCOPE].includes(scope.type)) reasons.push('EMP1_LOCAL_METHOD_SCOPE_TYPE_UNSUPPORTED');
  if (scope.gammaSelectionPolicy !== EXACT_GAMMA_POLICY) reasons.push('EMP1_LOCAL_METHOD_SCOPE_GAMMA_POLICY_INVALID');
  if (scope.nonTabulatedGamma !== 'BLOCKED') reasons.push('EMP1_LOCAL_METHOD_SCOPE_NON_TABULATED_POLICY_INVALID');
  if (scope.interpolationAllowed !== false) reasons.push('EMP1_LOCAL_METHOD_SCOPE_INTERPOLATION_MUST_BE_FALSE');
  if (scope.crossVariantFallbackAllowed !== false) reasons.push('EMP1_LOCAL_METHOD_SCOPE_VARIANT_FALLBACK_MUST_BE_FALSE');
  if (!Number.isFinite(scope.machineRoundOffRelativeTolerance) || scope.machineRoundOffRelativeTolerance <= 0 || scope.machineRoundOffRelativeTolerance > 1e-12) reasons.push('EMP1_LOCAL_METHOD_SCOPE_ROUNDOFF_TOLERANCE_INVALID');
  if (!SHA256_HEX.test(scope.sourceDocumentSha256 ?? '') || scope.sourceDocumentSha256 !== method.sourceDocumentSha256) reasons.push('EMP1_LOCAL_METHOD_SCOPE_SOURCE_SHA_MISMATCH');
  if (!nonEmpty(scope.scopeContractHash)) reasons.push('EMP1_LOCAL_METHOD_SCOPE_HASH_REQUIRED');
  if(scope.type===GAMMA5_TABLE5_SCOPE) validateGamma5ScopeContract(method,scope,reasons);

  const local = source?.localMethod;
  if (!source || !local || typeof local !== 'object') reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_SOURCE_REQUIRED');
  else {
    validateCommonRuntime(scope,local,reasons);
    if(scope.type===GAMMA5_TABLE5_SCOPE) validateGamma5Runtime(scope,local,reasons);
  }

  return freeze({
    status: reasons.length ? 'BLOCKED_SCOPE_MISMATCH' : 'PASS_BOUNDED_SCOPE',
    bounded: true,scopeType: scope.type,gammaSelectionPolicy: EXACT_GAMMA_POLICY,reasons: unique(reasons),
  });
}

function validateCommonRuntime(scope,local,reasons){
  if (local.requested !== true) reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_NOT_REQUESTED');
  if (local.sourceSha256 !== scope.sourceDocumentSha256) reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_SOURCE_SHA_MISMATCH');
  if (local.shellFamily !== 'CYLINDRICAL') reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_SHELL_FAMILY_INVALID');
  if (local.gammaSelectionPolicy !== EXACT_GAMMA_POLICY) reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_GAMMA_POLICY_INVALID');
  if (local.sourceParameterResolved !== true) reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_SOURCE_PARAMETER_UNRESOLVED');
  if (local.interpolationUsed !== false) reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_INTERPOLATION_PROHIBITED');
  if (local.extrapolationFallbackUsed !== false) reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_VARIANT_FALLBACK_PROHIBITED');
  if (!VARIANTS.includes(local.variant)) reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_VARIANT_INVALID');
  if (!positiveFinite(local.gamma) || !positiveFinite(local.sourceGamma)) reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_GAMMA_INVALID');
  else if (!roundOffEquivalent(local.gamma, local.sourceGamma, scope.machineRoundOffRelativeTolerance)) reasons.push('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_NON_TABULATED_GAMMA');
}
function validateGamma5ScopeContract(method,scope,reasons){
  if(method.sourceDocumentSha256!==EMP1_WRC537_BOUNDED_SOURCE_SHA256||scope.sourceDocumentSha256!==EMP1_WRC537_BOUNDED_SOURCE_SHA256) reasons.push('EMP1_LOCAL_METHOD_GAMMA5_SOURCE_SHA_INVALID');
  if(method.datasetHash!==EMP1_WRC537_BOUNDED_DATASET_HASH||scope.datasetHash!==EMP1_WRC537_BOUNDED_DATASET_HASH) reasons.push('EMP1_LOCAL_METHOD_GAMMA5_DATASET_HASH_INVALID');
  if(scope.shellFamily!=='CYLINDRICAL') reasons.push('EMP1_LOCAL_METHOD_GAMMA5_SHELL_FAMILY_INVALID');
  if(scope.attachmentShape!=='ROUND') reasons.push('EMP1_LOCAL_METHOD_GAMMA5_ATTACHMENT_SHAPE_INVALID');
  if(scope.variant!==EMP1_WRC537_BOUNDED_VARIANT) reasons.push('EMP1_LOCAL_METHOD_GAMMA5_VARIANT_INVALID');
  if(!roundOffEquivalent(scope.gamma,EMP1_WRC537_BOUNDED_GAMMA,scope.machineRoundOffRelativeTolerance)) reasons.push('EMP1_LOCAL_METHOD_GAMMA5_GAMMA_INVALID');
  if(scope.betaMinimum!==EMP1_WRC537_BOUNDED_BETA_MIN||scope.betaMaximum!==EMP1_WRC537_BOUNDED_BETA_MAX) reasons.push('EMP1_LOCAL_METHOD_GAMMA5_BETA_DOMAIN_INVALID');
  if(scope.loadReference!==WRC_LOAD_REFERENCE) reasons.push('EMP1_LOCAL_METHOD_GAMMA5_LOAD_REFERENCE_INVALID');
  if(scope.pressureThrustDisposition!==UPSTREAM_PRESSURE_DISPOSITION) reasons.push('EMP1_LOCAL_METHOD_GAMMA5_PRESSURE_DISPOSITION_INVALID');
  if(!SHA256_HEX.test(scope.loadProducerQualificationHash??'')) reasons.push('EMP1_LOCAL_METHOD_GAMMA5_LOAD_PRODUCER_QUALIFICATION_HASH_REQUIRED');
}
function validateGamma5Runtime(scope,local,reasons){
  if(local.attachmentShape!=='ROUND') reasons.push('EMP1_LOCAL_METHOD_GAMMA5_RUNTIME_ATTACHMENT_SHAPE_INVALID');
  if(local.datasetHash!==EMP1_WRC537_BOUNDED_DATASET_HASH) reasons.push('EMP1_LOCAL_METHOD_GAMMA5_RUNTIME_DATASET_HASH_INVALID');
  if(local.variant!==EMP1_WRC537_BOUNDED_VARIANT) reasons.push('EMP1_LOCAL_METHOD_GAMMA5_RUNTIME_VARIANT_INVALID');
  if(!Number.isFinite(local.beta)) reasons.push('EMP1_LOCAL_METHOD_GAMMA5_RUNTIME_BETA_INVALID');
  if(!reasons.includes('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_GAMMA_INVALID')){
    const domain=evaluateEmp1Wrc537BoundedDomain({
      shellFamily:local.shellFamily,attachmentShape:local.attachmentShape,
      sourceDocumentSha256:local.sourceSha256,datasetHash:local.datasetHash,
      variant:local.variant,gamma:local.gamma,beta:local.beta,
    });
    if(domain.status!=='PASS_BOUNDED_DOMAIN') for(const reason of domain.reasons) reasons.push(`EMP1_LOCAL_METHOD_GAMMA5_RUNTIME_DOMAIN:${reason}`);
  }
  try{
    const custody=requireEmp1Wrc537QualifiedLoadCustody(local.loadCustody,{expectedProducerQualificationHash:scope.loadProducerQualificationHash});
    if(custody.loadReference!==scope.loadReference) reasons.push('EMP1_LOCAL_METHOD_GAMMA5_RUNTIME_LOAD_REFERENCE_INVALID');
    if(custody.pressureThrustDisposition!==scope.pressureThrustDisposition) reasons.push('EMP1_LOCAL_METHOD_GAMMA5_RUNTIME_PRESSURE_DISPOSITION_INVALID');
  }catch(error){
    reasons.push(`EMP1_LOCAL_METHOD_GAMMA5_RUNTIME_LOAD_CUSTODY:${error.code??error.message}`);
  }
}
function roundOffEquivalent(actual, source, relativeTolerance) {return Number.isFinite(actual)&&Number.isFinite(source)&&Math.abs(actual-source)<=Math.max(1,Math.abs(source))*relativeTolerance;}
function positiveFinite(value) { return Number.isFinite(value) && value > 0; }
function nonEmpty(value) { return typeof value === 'string' && value.trim().length > 0; }
function unique(values){return [...new Set(values)];}
function freeze(value) { Object.values(value).forEach((child) => { if (child && typeof child === 'object') Object.freeze(child); }); return Object.freeze(value); }
