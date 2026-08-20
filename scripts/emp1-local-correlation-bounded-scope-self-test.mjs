#!/usr/bin/env node
import assert from 'node:assert/strict';
import { evaluateEmp1LocalCorrelationGate } from '../src/core/emp1/emp1-local-correlation-gate.js';

const sha = '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';
const method = {
  engineeringUseAuthorized: true,
  methodIdentity: 'WRC537_2013_CYLINDRICAL_EXACT_GAMMA',
  methodEdition: '2013',
  sourceDocumentSha256: sha,
  datasetHash: 'sha256:dataset-qualified-placeholder',
  qualificationRecordHash: 'sha256:method-qualified-placeholder',
  scopeContract: {
    schema: 'emp1-local-method-scope/v1',
    type: 'CYLINDRICAL_EXACT_SOURCE_TABULATED_GAMMA',
    gammaSelectionPolicy: 'EXACT_SOURCE_TABULATED_GAMMA_ONLY',
    nonTabulatedGamma: 'BLOCKED',
    interpolationAllowed: false,
    crossVariantFallbackAllowed: false,
    machineRoundOffRelativeTolerance: 1e-12,
    sourceDocumentSha256: sha,
    scopeContractHash: 'sha256:scope-contract-placeholder',
  },
};
const benchmark = { status:'PASS', benchmarkHash:'sha256:frozen-benchmark-placeholder' };
const source = {
  localMethod: {
    requested:true,
    sourceSha256:sha,
    shellFamily:'CYLINDRICAL',
    gammaSelectionPolicy:'EXACT_SOURCE_TABULATED_GAMMA_ONLY',
    sourceParameterResolved:true,
    interpolationUsed:false,
    extrapolationFallbackUsed:false,
    variant:'ORIGINAL',
    gamma:5,
    sourceGamma:5,
  },
};

const pass = evaluateEmp1LocalCorrelationGate({methodQualification:method,benchmarkQualification:benchmark,source});
assert.equal(pass.state,'METHOD_QUALIFIED');
assert.equal(pass.engineeringUseAuthorized,true);
assert.equal(pass.boundedScope,true);
assert.equal(pass.scopeStatus,'PASS_BOUNDED_SCOPE');
assert.equal(pass.scopeType,'CYLINDRICAL_EXACT_SOURCE_TABULATED_GAMMA');
assert.equal(pass.gammaSelectionPolicy,'EXACT_SOURCE_TABULATED_GAMMA_ONLY');

function expectBlocked(mutator, reason) {
  const m=structuredClone(method); const s=structuredClone(source); const b=structuredClone(benchmark);
  mutator({method:m,source:s,benchmark:b});
  const gate=evaluateEmp1LocalCorrelationGate({methodQualification:m,benchmarkQualification:b,source:s});
  assert.equal(gate.state,'BLOCKED',reason);
  assert(gate.reasons.includes(reason),`${reason}: ${gate.reasons.join(',')}`);
}
expectBlocked(({source:s})=>{s.localMethod.gamma=7.5;},'EMP1_LOCAL_METHOD_SCOPED_RUNTIME_NON_TABULATED_GAMMA');
expectBlocked(({source:s})=>{s.localMethod.interpolationUsed=true;},'EMP1_LOCAL_METHOD_SCOPED_RUNTIME_INTERPOLATION_PROHIBITED');
expectBlocked(({source:s})=>{s.localMethod.extrapolationFallbackUsed=true;},'EMP1_LOCAL_METHOD_SCOPED_RUNTIME_VARIANT_FALLBACK_PROHIBITED');
expectBlocked(({source:s})=>{s.localMethod.sourceParameterResolved=false;},'EMP1_LOCAL_METHOD_SCOPED_RUNTIME_SOURCE_PARAMETER_UNRESOLVED');
expectBlocked(({source:s})=>{s.localMethod.variant='AUTO';},'EMP1_LOCAL_METHOD_SCOPED_RUNTIME_VARIANT_INVALID');
expectBlocked(({source:s})=>{s.localMethod.sourceSha256='0'.repeat(64);},'EMP1_LOCAL_METHOD_SCOPED_RUNTIME_SOURCE_SHA_MISMATCH');
expectBlocked(({method:m})=>{m.scopeContract.interpolationAllowed=true;},'EMP1_LOCAL_METHOD_SCOPE_INTERPOLATION_MUST_BE_FALSE');
expectBlocked(({method:m})=>{m.scopeContract.machineRoundOffRelativeTolerance=1e-6;},'EMP1_LOCAL_METHOD_SCOPE_ROUNDOFF_TOLERANCE_INVALID');

// Backward-compatibility proof: a pre-existing unscoped qualified method retains
// the legacy gate behavior; only methods that claim a bounded scope are subject
// to the new scope contract. This avoids silently changing unrelated methods.
const unscoped=structuredClone(method); delete unscoped.scopeContract;
const legacy=evaluateEmp1LocalCorrelationGate({methodQualification:unscoped,benchmarkQualification:benchmark});
assert.equal(legacy.state,'METHOD_QUALIFIED');
assert.equal(legacy.boundedScope,false);
assert.equal(legacy.scopeStatus,'PASS_NO_SCOPE_CONTRACT');

console.log(JSON.stringify({
  schema:'emp1-local-correlation-bounded-scope-self-test/v1',
  status:'PASS',
  validBoundedScope:'PASS',
  negativeProofs:[
    'NON_TABULATED_GAMMA_BLOCKED_BY_GATE',
    'INTERPOLATION_BLOCKED_BY_GATE',
    'CROSS_VARIANT_FALLBACK_BLOCKED_BY_GATE',
    'UNRESOLVED_SOURCE_PARAMETER_BLOCKED_BY_GATE',
    'INVALID_VARIANT_BLOCKED_BY_GATE',
    'SOURCE_SHA_SUBSTITUTION_BLOCKED_BY_GATE',
    'SCOPE_INTERPOLATION_AUTHORITY_ESCALATION_BLOCKED',
    'ENGINEERING_TOLERANCE_AS_ROUNDOFF_BLOCKED'
  ],
  unrelatedLegacyGateBehaviorPreserved:true,
},null,2));
