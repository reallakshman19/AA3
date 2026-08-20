#!/usr/bin/env node
import assert from 'node:assert/strict';
import { calculateLocalAttachmentFoundation } from '../src/core/local-stress/index.js';
import { semanticHash } from '../src/core/shared-primitives/canonical-json.js';
import {
  EMP1_WRC537_GAMMA5_ZERO_DP_ORCHESTRATION_REQUEST_SCHEMA,
  createEmp1RetainedFoundationLayer,
  emp1Wrc537Gamma5ZeroDpOrchestrationQualification,
  prepareEmp1Wrc537Gamma5ZeroDpLocalSource,
  runEmp1,
  runEmp1Wrc537Gamma5ZeroDpLocalCorrelation,
} from '../src/core/emp1/index.js';
import { canonicalFixture } from './lafea.1-fixtures.mjs';

const qualification = emp1Wrc537Gamma5ZeroDpOrchestrationQualification();
const success = await executeScenario();
assert.equal(success.error, null);
assert.deepEqual(success.calls, { a: 1, b: 1, c: 1, prepare: 1 });
assert.equal(success.result.loadTransfer.qualification, 'PASS');
assert.equal(success.result.sectionScreening.qualification, 'PASS');
assert.equal(success.result.sectionScreening.decision, 'ESCALATE');
assert.equal(success.result.localCorrelation.state, 'EVALUATED_AUTHORIZED_BOUNDED_GAMMA5_ZERO_DP_ROUTE');
assert.equal(success.result.localCorrelation.productionRouteAuthority, true);
assert.equal(success.result.localCorrelation.globalEmp1CRouteAuthority, false);
assert.equal(success.result.localCorrelation.methodGate.state, 'METHOD_QUALIFIED');
assert.equal(success.result.localCorrelation.methodGate.scopeStatus, 'PASS_BOUNDED_SCOPE');
assert.equal(success.result.localCorrelation.numerics.loadCustody.productionRouteInputAuthorized, true);
assert.deepEqual(success.result.localCorrelation.numerics.wrcLoads, {
  P: -1000, Vc: 250, Vl: -400, Mc: 500000, Ml: -600000, Mt: 700000,
});
assert.equal(success.result.assessment.decision, 'ESCALATE',
  'WRC stress calculation does not invent a code-compliance PASS decision');
assert.match(success.result.loadTransfer.resultHash, /^fnv1a64:[a-f0-9]{16}$/u);
assert.match(success.result.sectionScreening.resultHash, /^fnv1a64:[a-f0-9]{16}$/u);
assert.match(success.result.localCorrelation.resultHash, /^fnv1a64:[a-f0-9]{16}$/u);
assert.equal(new Set([
  success.result.loadTransfer.resultHash,
  success.result.sectionScreening.resultHash,
  success.result.localCorrelation.resultHash,
]).size, 3, 'A/B/C evidence hashes must remain distinct');
assert.deepEqual(success.result.assessment.parents, {
  sourceHash: success.sourceHash,
  loadTransferResultHash: success.result.loadTransfer.resultHash,
  sectionScreeningResultHash: success.result.sectionScreening.resultHash,
  localCorrelationResultHash: success.result.localCorrelation.resultHash,
});

// No engineering change: all three previously qualified layers remain reusable.
const reused = await executeScenario({ previous: success.result, changeClasses: [] });
assert.equal(reused.error, null);
assert.deepEqual(reused.calls, { a: 0, b: 0, c: 0, prepare: 1 });
assert.equal(reused.result.loadTransfer.resultHash, success.result.loadTransfer.resultHash);
assert.equal(reused.result.sectionScreening.resultHash, success.result.sectionScreening.resultHash);
assert.equal(reused.result.localCorrelation.resultHash, success.result.localCorrelation.resultHash);

// Local-method-only change: A/B remain reusable, C alone is recomputed.
const localOnly = await executeScenario({ previous: success.result, changeClasses: ['LOCAL_METHOD'] });
assert.equal(localOnly.error, null);
assert.deepEqual(localOnly.calls, { a: 0, b: 0, c: 1, prepare: 1 });
assert.equal(localOnly.result.loadTransfer.resultHash, success.result.loadTransfer.resultHash);
assert.equal(localOnly.result.sectionScreening.resultHash, success.result.sectionScreening.resultHash);
assert.equal(localOnly.result.localCorrelation.resultHash, success.result.localCorrelation.resultHash,
  'deterministic C recomputation must preserve its semantic hash when engineering inputs are unchanged');

// Upstream Fx edit: LOADS invalidates A -> B -> C and changes every evidence hash.
const loadChanged = await executeScenario({
  previous: success.result,
  changeClasses: ['LOADS'],
  mutateFoundation: (source) => { source.loadCases[0].force.value[0] = -401; },
});
assert.equal(loadChanged.error, null);
assert.deepEqual(loadChanged.calls, { a: 1, b: 1, c: 1, prepare: 1 });
assert.notEqual(loadChanged.result.loadTransfer.resultHash, success.result.loadTransfer.resultHash);
assert.notEqual(loadChanged.result.sectionScreening.resultHash, success.result.sectionScreening.resultHash);
assert.notEqual(loadChanged.result.localCorrelation.resultHash, success.result.localCorrelation.resultHash);
assert.equal(loadChanged.result.localCorrelation.numerics.wrcLoads.Vl, -401);
assert.ok(loadChanged.result.invalidated.includes('EMP.1.A'));
assert.ok(loadChanged.result.invalidated.includes('EMP.1.B'));
assert.ok(loadChanged.result.invalidated.includes('EMP.1.C'));

const falsifiers = [];
await blockedGate('gamma15', {
  mutateRequest: (request) => {
    request.geometry.meanRadius = 300;
    request.geometry.attachmentRadius = 53.142857142857146;
    request.geometry.gamma = 15;
  },
}, 'EMP1_LOCAL_METHOD_SCOPED_RUNTIME_NON_TABULATED_GAMMA');
await blockedGate('beta-high', {
  mutateRequest: (request) => {
    request.geometry.attachmentRadius = 60;
    request.geometry.beta = 0.525;
  },
}, 'EMP1_LOCAL_METHOD_GAMMA5_RUNTIME_DOMAIN:EMP1_WRC537_BOUNDED_BETA');
await rejectedBeforeC('nonzero-dp', {
  mutateFoundation: (source) => source.pressureDefinitions.forEach((row) => {
    row.internalPressure.value = 1;
    row.externalPressure.value = 0;
  }),
}, 'EMP1_A_WRC_ZERO_DP_NONZERO_DIFFERENTIAL_PRESSURE');
await rejectedBeforeC('nonunity-kn', {
  mutateRequest: (request) => { request.stressConcentration.Kn = 1.01; },
}, 'EMP1_WRC537_GAMMA5_ZERO_DP_UNITY_STRESS_CONCENTRATION_REQUIRED');
await rejectedBeforeC('nonunity-kb', {
  mutateRequest: (request) => { request.stressConcentration.Kb = 0.99; },
}, 'EMP1_WRC537_GAMMA5_ZERO_DP_UNITY_STRESS_CONCENTRATION_REQUIRED');
await rejectedBeforeC('reference-mismatch', {
  mutateRequest: (request) => { request.wrcReferencePointGlobal = [0, 0, 1]; },
}, 'EMP1_A_WRC_ZERO_DP_REFERENCE_POINT_MISMATCH');
await rejectedBeforeC('authority-field-injection', {
  mutateRequest: (request) => { request.sourceDocumentSha256 = '0'.repeat(64); },
}, 'EMP1_WRC537_ZERO_DP_REQUEST_UNSUPPORTED_FIELD:sourceDocumentSha256');
await rejectedBeforeC('retained-layer-hash-drift', {
  tamperLoadLayer: (layer) => ({ ...layer, resultHash: 'fnv1a64:0000000000000000' }),
}, 'EMP1_WRC537_ZERO_DP_FOUNDATION_LAYER_HASH_MISMATCH');
await rejectedBeforeC('nonorthogonal-frame', {
  mutateRequest: (request) => { request.axes.nozzleCenterlineGlobal = [1, 0, 1]; },
}, 'EMP1_WRC537_FRAME_NON_ORTHOGONAL');

const callerAuthorityIgnored = await executeScenario({
  mutateSource: (source) => {
    source.localMethod.sourceSha256 = '0'.repeat(64);
    source.localMethod.datasetHash = '1'.repeat(64);
    source.localMethod.loadCustody = { spoofed: true };
    source.localMethod.engineeringUseAuthorized = true;
  },
});
assert.equal(callerAuthorityIgnored.error, null);
assert.equal(callerAuthorityIgnored.calls.c, 1);
assert.equal(callerAuthorityIgnored.preparedSource.localMethod.sourceSha256,
  qualification.methodQualification.sourceDocumentSha256);
assert.equal(callerAuthorityIgnored.preparedSource.localMethod.datasetHash,
  qualification.methodQualification.datasetHash);
assert.equal(callerAuthorityIgnored.preparedSource.localMethod.loadCustody.status,
  'PASS_QUALIFIED_UPSTREAM_LOAD_PACKAGE');
assert.equal(callerAuthorityIgnored.preparedSource.localMethod.loadCustody.producerQualification.qualificationRecordHash,
  qualification.loadProducerQualificationSha256);

// Backward compatibility: an unscoped method still executes exactly as before.
const unscoped = await runEmp1({
  source: { localMethod: { requested: true } },
  methodQualification: {
    engineeringUseAuthorized: true,
    methodIdentity: 'UNSCOPED-COMPATIBILITY-PROBE',
    methodEdition: 'TEST',
    sourceDocumentSha256: 'source-sha-present',
    datasetHash: 'dataset-hash-present',
    qualificationRecordHash: 'qualification-hash-present',
  },
  benchmarkQualification: { status: 'PASS', benchmarkHash: 'benchmark-hash-present' },
  adapters: {
    runLoadTransfer: () => ({ qualification: 'PASS', resultHash: 'A', reasons: [] }),
    runSectionScreening: () => ({ qualification: 'PASS', decision: 'ESCALATE', resultHash: 'B', reasons: [] }),
    runLocalCorrelation: () => ({ state: 'EVALUATED', decision: 'PASS', resultHash: 'C', reasons: [] }),
  },
});
assert.equal(unscoped.localCorrelation.state, 'EVALUATED');
assert.equal(unscoped.assessment.decision, 'PASS');

console.log(JSON.stringify({
  schema: 'emp1-wrc537-gamma5-zero-dp-orchestration-qualification/v2',
  status: 'PASS_RUN_EMP1_BOUNDED_ROUTE_END_TO_END_WITH_CURRENTNESS',
  engineeringAuthority: true,
  boundedProductionRouteAuthority: true,
  globalEmp1CRouteAuthority: false,
  methodQualificationSha256: qualification.methodQualification.qualificationRecordHash,
  loadProducerQualificationSha256: qualification.loadProducerQualificationSha256,
  success: {
    invocations: success.calls,
    localCorrelationState: success.result.localCorrelation.state,
    methodGateState: success.result.localCorrelation.methodGate.state,
    scopeStatus: success.result.localCorrelation.methodGate.scopeStatus,
    wrcLoads: success.result.localCorrelation.numerics.wrcLoads,
    stressOutputCount: stressCount(success.result.localCorrelation.stresses),
    evidenceHashes: success.result.assessment.parents,
    assessmentDecision: success.result.assessment.decision,
  },
  currentness: {
    unchangedReuse: reused.calls,
    localMethodInvalidation: localOnly.calls,
    loadsInvalidation: loadChanged.calls,
    changedVl: loadChanged.result.localCorrelation.numerics.wrcLoads.Vl,
  },
  falsifiersPassed: falsifiers.length,
  falsifiers,
  callerAuthorityInjection: 'IGNORED_AND_REBUILT_FROM_PINNED_ROUTE_AND_ACTUAL_A_RESULT',
  legacyUnscopedOrchestratorCompatibility: 'PASS',
  remainingBlocked: {
    nonzeroDifferentialPressure: true,
    nonUnityStressConcentration: true,
    gammaOtherThan5: true,
    betaOutsideQualifiedDomain: true,
    globalEmp1CRoute: true,
  },
}, null, 2));

async function blockedGate(name, options, reasonPrefix) {
  const observed = await executeScenario(options);
  assert.equal(observed.error, null, `${name}: expected gate block, got error ${observed.error?.code}`);
  assert.equal(observed.calls.c, 0, `${name}: WRC C must not be invoked`);
  assert.equal(observed.result.localCorrelation.state, 'BLOCKED');
  assert.ok(observed.result.localCorrelation.reasons.some((reason) => reason.startsWith(reasonPrefix)),
    `${name}: reasons=${observed.result.localCorrelation.reasons.join(',')}`);
  falsifiers.push(name);
}

async function rejectedBeforeC(name, options, codePrefix) {
  const observed = await executeScenario(options);
  assert.ok(observed.error, `${name}: expected rejection`);
  assert.equal(observed.calls.c, 0, `${name}: WRC C must not be invoked`);
  assert.ok(String(observed.error.code ?? observed.error.message).startsWith(codePrefix),
    `${name}: actual=${observed.error.code ?? observed.error.message}`);
  falsifiers.push(name);
}

async function executeScenario(options = {}) {
  const calls = { a: 0, b: 0, c: 0, prepare: 0 };
  let preparedSource = null;
  const source = sourceFixture(options.mutateRequest);
  options.mutateSource?.(source);
  const sourceHash = semanticHash(source);
  const foundationSource = routeFoundationFixture(options.mutateFoundation);
  const rawFoundation = calculateLocalAttachmentFoundation(foundationSource);
  let loadLayer = createEmp1RetainedFoundationLayer(rawFoundation);
  if (options.tamperLoadLayer) loadLayer = options.tamperLoadLayer(loadLayer);
  const adapters = {
    runLoadTransfer: () => {
      calls.a += 1;
      return loadLayer;
    },
    runSectionScreening: ({ loadTransfer }) => {
      calls.b += 1;
      const payload = {
        schema: 'emp1-b-orchestration-qualification-layer/v1',
        qualification: 'PASS',
        decision: 'ESCALATE',
        parentLoadTransferResultHash: loadTransfer.resultHash,
        reasons: [],
      };
      return { ...payload, resultHash: semanticHash(payload) };
    },
    prepareLocalCorrelationSource: (context) => {
      calls.prepare += 1;
      preparedSource = prepareEmp1Wrc537Gamma5ZeroDpLocalSource(context);
      return preparedSource;
    },
    runLocalCorrelation: (context) => {
      calls.c += 1;
      return runEmp1Wrc537Gamma5ZeroDpLocalCorrelation(context);
    },
  };
  try {
    const result = await runEmp1({
      source,
      sourceHash,
      previous: options.previous,
      changeClasses: options.changeClasses,
      methodQualification: qualification.methodQualification,
      benchmarkQualification: qualification.benchmarkQualification,
      adapters,
    });
    return { result, error: null, calls, preparedSource, sourceHash };
  } catch (error) {
    return { result: null, error, calls, preparedSource, sourceHash };
  }
}

function sourceFixture(mutateRequest) {
  const request = {
    schema: EMP1_WRC537_GAMMA5_ZERO_DP_ORCHESTRATION_REQUEST_SCHEMA,
    loadCaseIdentity: 'LC-1',
    pressureResultIdentity: 'PR-1',
    wrcReferencePointGlobal: [0, 0, 0],
    geometry: {
      meanRadius: 100,
      shellThickness: 20,
      attachmentRadius: 17.714285714285715,
      gamma: 5,
      beta: 0.155,
    },
    axes: {
      vesselCenterlineGlobal: [1, 0, 0],
      nozzleCenterlineGlobal: [0, 0, 1],
    },
    stressConcentration: { Kn: 1, Kb: 1 },
  };
  mutateRequest?.(request);
  return { sourceId: 'EMP1-ORCHESTRATION-QUALIFICATION', localMethod: { requested: true, routeRequest: request } };
}

function routeFoundationFixture(mutator) {
  return canonicalFixture((source) => {
    source.loadCases[0].force.value = [-400, -250, -1000];
    source.loadCases[0].moment.value = [-750000, 1000000, -700000];
    source.pressureDefinitions.forEach((row) => {
      row.internalPressure.value = 0;
      row.externalPressure.value = 0;
    });
    mutator?.(source);
  });
}

function stressCount(stresses) {
  return ['circumferential', 'longitudinal', 'shear', 'stressIntensity']
    .reduce((count, key) => count + (Array.isArray(stresses?.[key]) ? stresses[key].length : 0), 0);
}
