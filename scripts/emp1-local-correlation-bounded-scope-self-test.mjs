#!/usr/bin/env node
import assert from 'node:assert/strict';
import { evaluateEmp1LocalCorrelationGate } from '../src/core/emp1/emp1-local-correlation-gate.js';

const sha = '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';
const datasetHash='fb440a292f8794430977f60f5365a678a9aff62a4dae3397621902964a0db73c';
const method = {
  engineeringUseAuthorized: true,
  methodIdentity: 'WRC537_2013_CYLINDRICAL_ORIGINAL_GAMMA5_TABLE5_BOUNDED',
  methodEdition: '2013',
  sourceDocumentSha256: sha,
  datasetHash,
  qualificationRecordHash: 'sha256:method-qualified-placeholder',
  scopeContract: {
    schema: 'emp1-local-method-scope/v1',
    type: 'CYLINDRICAL_ORIGINAL_GAMMA5_TABLE5_BOUNDED',
    gammaSelectionPolicy: 'EXACT_SOURCE_TABULATED_GAMMA_ONLY',
    nonTabulatedGamma: 'BLOCKED',
    interpolationAllowed: false,
    crossVariantFallbackAllowed: false,
    machineRoundOffRelativeTolerance: 1e-12,
    sourceDocumentSha256: sha,
    datasetHash,
    shellFamily:'CYLINDRICAL',
    attachmentShape:'ROUND',
    variant:'ORIGINAL',
    gamma:5,
    betaMinimum:0.05,
    betaMaximum:0.5,
    loadReference:'WRC_ATTACHMENT_REFERENCE_POINT',
    pressureThrustDisposition:'PRESSURE_THRUST_RESOLVED_UPSTREAM',
    scopeContractHash: 'sha256:scope-contract-placeholder',
  },
};
const benchmark = { status:'PASS', benchmarkHash:'sha256:frozen-benchmark-placeholder' };
const source = {
  localMethod: {
    requested:true,
    sourceSha256:sha,
    datasetHash,
    shellFamily:'CYLINDRICAL',
    attachmentShape:'ROUND',
    gammaSelectionPolicy:'EXACT_SOURCE_TABULATED_GAMMA_ONLY',
    sourceParameterResolved:true,
    interpolationUsed:false,
    extrapolationFallbackUsed:false,
    variant:'ORIGINAL',
    gamma:5,
    sourceGamma:5,
    beta:0.155,
    loadReference:'WRC_ATTACHMENT_REFERENCE_POINT',
    pressureThrustDisposition:'PRESSURE_THRUST_RESOLVED_UPSTREAM',
    sourceLoadCustodyHash:'sha256:qualified-upstream-load-custody',
  },
};

const pass = evaluateEmp1LocalCorrelationGate({methodQualification:method,benchmarkQualification:benchmark,source});
assert.equal(pass.state,'METHOD_QUALIFIED');
assert.equal(pass.engineeringUseAuthorized,true);
assert.equal(pass.boundedScope,true);
assert.equal(pass.scopeStatus,'PASS_BOUNDED_SCOPE');
assert.equal(pass.scopeType,'CYLINDRICAL_ORIGINAL_GAMMA5_TABLE5_BOUNDED');
assert.equal(pass.gammaSelectionPolicy,'EXACT_SOURCE_TABULATED_GAMMA_ONLY');

function expectBlocked(mutator, reason) {
  const m=structuredClone(method); const s=structuredClone(source); const b=structuredClone(benchmark);
  mutator({method:m,source:s,benchmark:b});
  const gate=evaluateEmp1LocalCorrelationGate({methodQualification:m,benchmarkQualification:b,source:s});
  assert.equal(gate.state,'BLOCKED',reason);
  assert(gate.reasons.includes(reason),`${reason}: ${gate.reasons.join(',')}`);
}
expectBlocked(({source:s})=>{s.localMethod.gamma=15;s.localMethod.sourceGamma=15;},'EMP1_LOCAL_METHOD_GAMMA5_RUNTIME_DOMAIN:EMP1_WRC537_BOUNDED_GAMMA');
expectBlocked(({source:s})=>{s.localMethod.beta=0.5001;},'EMP1_LOCAL_METHOD_GAMMA5_RUNTIME_DOMAIN:EMP1_WRC537_BOUNDED_BETA');
expectBlocked(({source:s})=>{s.localMethod.interpolationUsed=true;},'EMP1_LOCAL_METHOD_SCOPED_RUNTIME_INTERPOLATION_PROHIBITED');
expectBlocked(({source:s})=>{s.localMethod.extrapolationFallbackUsed=true;},'EMP1_LOCAL_METHOD_SCOPED_RUNTIME_VARIANT_FALLBACK_PROHIBITED');
expectBlocked(({source:s})=>{s.localMethod.sourceParameterResolved=false;},'EMP1_LOCAL_METHOD_SCOPED_RUNTIME_SOURCE_PARAMETER_UNRESOLVED');
expectBlocked(({source:s})=>{s.localMethod.variant='EXTRAPOLATED';},'EMP1_LOCAL_METHOD_GAMMA5_RUNTIME_VARIANT_INVALID');
expectBlocked(({source:s})=>{s.localMethod.attachmentShape='RECTANGULAR';},'EMP1_LOCAL_METHOD_GAMMA5_RUNTIME_ATTACHMENT_SHAPE_INVALID');
expectBlocked(({source:s})=>{s.localMethod.datasetHash='0'.repeat(64);},'EMP1_LOCAL_METHOD_GAMMA5_RUNTIME_DATASET_HASH_INVALID');
expectBlocked(({source:s})=>{s.localMethod.sourceSha256='0'.repeat(64);},'EMP1_LOCAL_METHOD_SCOPED_RUNTIME_SOURCE_SHA_MISMATCH');
expectBlocked(({source:s})=>{s.localMethod.loadReference='NOZZLE_FACE';},'EMP1_LOCAL_METHOD_GAMMA5_RUNTIME_LOAD_REFERENCE_INVALID');
expectBlocked(({source:s})=>{s.localMethod.pressureThrustDisposition='UNRESOLVED';},'EMP1_LOCAL_METHOD_GAMMA5_RUNTIME_PRESSURE_DISPOSITION_INVALID');
expectBlocked(({source:s})=>{s.localMethod.sourceLoadCustodyHash='';},'EMP1_LOCAL_METHOD_GAMMA5_RUNTIME_LOAD_CUSTODY_HASH_REQUIRED');
expectBlocked(({method:m})=>{m.scopeContract.interpolationAllowed=true;},'EMP1_LOCAL_METHOD_SCOPE_INTERPOLATION_MUST_BE_FALSE');
expectBlocked(({method:m})=>{m.scopeContract.machineRoundOffRelativeTolerance=1e-6;},'EMP1_LOCAL_METHOD_SCOPE_ROUNDOFF_TOLERANCE_INVALID');
expectBlocked(({method:m})=>{m.scopeContract.datasetHash='0'.repeat(64);},'EMP1_LOCAL_METHOD_GAMMA5_DATASET_HASH_INVALID');
expectBlocked(({method:m})=>{m.scopeContract.betaMaximum=0.6;},'EMP1_LOCAL_METHOD_GAMMA5_BETA_DOMAIN_INVALID');

// Compatibility proof: the previously introduced generic exact-tabulated-gamma
// scope remains available for unrelated qualified methods; gamma5 narrowing is
// applied only when the method explicitly claims the gamma5 Table-5 scope.
const genericMethod=structuredClone(method);
genericMethod.scopeContract.type='CYLINDRICAL_EXACT_SOURCE_TABULATED_GAMMA';
const genericSource=structuredClone(source);
genericSource.localMethod.gamma=15;
genericSource.localMethod.sourceGamma=15;
const generic=evaluateEmp1LocalCorrelationGate({methodQualification:genericMethod,benchmarkQualification:benchmark,source:genericSource});
assert.equal(generic.state,'METHOD_QUALIFIED');
assert.equal(generic.scopeType,'CYLINDRICAL_EXACT_SOURCE_TABULATED_GAMMA');

// Backward-compatibility proof: pre-existing unscoped qualified methods retain
// the legacy gate behavior; only scoped methods are subject to scope contracts.
const unscoped=structuredClone(method); delete unscoped.scopeContract;
const legacy=evaluateEmp1LocalCorrelationGate({methodQualification:unscoped,benchmarkQualification:benchmark});
assert.equal(legacy.state,'METHOD_QUALIFIED');
assert.equal(legacy.boundedScope,false);
assert.equal(legacy.scopeStatus,'PASS_NO_SCOPE_CONTRACT');

console.log(JSON.stringify({
  schema:'emp1-local-correlation-bounded-scope-self-test/v2',
  status:'PASS',
  validGamma5Table5BoundedScope:'PASS',
  boundedDomain:{gamma:5,betaMinimum:0.05,betaMaximum:0.5,variant:'ORIGINAL'},
  negativeProofs:[
    'HIGHER_GAMMA_BLOCKED_BY_BOUNDED_GATE',
    'OUT_OF_RANGE_BETA_BLOCKED_BY_BOUNDED_GATE',
    'INTERPOLATION_BLOCKED_BY_GATE',
    'CROSS_VARIANT_FALLBACK_BLOCKED_BY_GATE',
    'UNRESOLVED_SOURCE_PARAMETER_BLOCKED_BY_GATE',
    'NON_ORIGINAL_VARIANT_BLOCKED_BY_BOUNDED_GATE',
    'NON_ROUND_ATTACHMENT_BLOCKED_BY_BOUNDED_GATE',
    'DATASET_SUBSTITUTION_BLOCKED_BY_BOUNDED_GATE',
    'SOURCE_SHA_SUBSTITUTION_BLOCKED_BY_GATE',
    'LOAD_REFERENCE_MISMATCH_BLOCKED',
    'PRESSURE_THRUST_UNRESOLVED_BLOCKED',
    'LOAD_CUSTODY_HASH_REQUIRED',
    'SCOPE_INTERPOLATION_AUTHORITY_ESCALATION_BLOCKED',
    'ENGINEERING_TOLERANCE_AS_ROUNDOFF_BLOCKED',
    'SCOPE_DATASET_SUBSTITUTION_BLOCKED',
    'SCOPE_BETA_DOMAIN_WIDENING_BLOCKED'
  ],
  genericExactGammaScopePreserved:true,
  unrelatedLegacyGateBehaviorPreserved:true,
},null,2));
