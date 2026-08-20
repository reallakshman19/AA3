#!/usr/bin/env node
import assert from 'node:assert/strict';
import { calculateLocalAttachmentFoundation } from '../src/core/local-stress/index.js';
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
assert.equal(success.cCalls, 1);
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
await rejectedBeforeC('reference-mismatch', {
  mutateRequest: (request) => { request.wrcReferencePointGlobal = [0, 0, 1]; },
}, 'EMP1_A_WRC_ZERO_DP_REFERENCE_POINT_MISMATCH');
await rejectedBeforeC('authority-field-injection', {
  mutateRequest: (request) => {
    request.sourceDocumentSha256 = '0'.repeat(64);
  },
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
assert.equal(callerAuthorityIgnored.cCalls, 1);
assert.equal(callerAuthorityIgnored.preparedSource.localMethod.sourceSha256,
  qualification.methodQualification.sourceDocumentSha256);
assert.equal(callerAuthorityIgnored.preparedSource.localMethod.datasetHash,
  qualification.methodQualification.datasetHash);
assert.equal(callerAuthorityIgnored.preparedSource.localMethod.loadCustody.status,
  'PASS_QUALIFIED_UPSTREAM_LOAD_PACKAGE');
assert.equal(callerAuthorityIgnored.preparedSource.localMethod.loadCustody.producerQualification.qualificationRecordHash,
  qualification.loadProducerQualificationSha256);

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
  schema: 'emp1-wrc537-gamma5-zero-dp-orchestration-qualification/v1',
  status: 'PASS_RUN_EMP1_BOUNDED_ROUTE_END_TO_END',
  engineeringAuthority: true,
  boundedProductionRouteAuthority: true,
  globalEmp1CRouteAuthority: false,
  methodQualificationSha256: qualification.methodQualification.qualificationRecordHash,
  loadProducerQualificationSha256: qualification.loadProducerQualificationSha256,
  success: {
    cInvocations: success.cCalls,
    localCorrelationState: success.result.localCorrelation.state,
    methodGateState: success.result.localCorrelation.methodGate.state,
    scopeStatus: success.result.localCorrelation.methodGate.scopeStatus,
    wrcLoads: success.result.localCorrelation.numerics.wrcLoads,
    stressOutputCount: stressCount(success.result.localCorrelation.stresses),
    assessmentDecision: success.result.assessment.decision,
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
  assert.equal(observed.cCalls, 0, `${name}: WRC C must not be invoked`);
  assert.equal(observed.result.localCorrelation.state, 'BLOCKED');
  assert.ok(observed.result.localCorrelation.reasons.some((reason) => reason.startsWith(reasonPrefix)),
    `${name}: reasons=${observed.result.localCorrelation.reasons.join(',')}`);
  falsifiers.push(name);
}

async function rejectedBeforeC(name, options, codePrefix) {
  const observed = await executeScenario(options);
  assert.ok(observed.error, `${name}: expected rejection`);
  assert.equal(observed.cCalls, 0, `${name}: WRC C must not be invoked`);
  assert.ok(String(observed.error.code ?? observed.error.message).startsWith(codePrefix),
    `${name}: actual=${observed.error.code ?? observed.error.message}`);
  falsifiers.push(name);
}

async function executeScenario(options = {}) {
  let cCalls = 0;
  let preparedSource = null;
  const source = sourceFixture(options.mutateRequest);
  options.mutateSource?.(source);
  const foundationSource = routeFoundationFixture(options.mutateFoundation);
  const rawFoundation = calculateLocalAttachmentFoundation(foundationSource);
  let loadLayer = createEmp1RetainedFoundationLayer(rawFoundation);
  if (options.tamperLoadLayer) loadLayer = options.tamperLoadLayer(loadLayer);
  const adapters = {
    runLoadTransfer: () => loadLayer,
    runSectionScreening: () => ({
      schema: 'emp1-b-test-layer/v1', qualification: 'PASS', decision: 'ESCALATE', resultHash: 'B', reasons: [],
    }),
    prepareLocalCorrelationSource: (context) => {
      preparedSource = prepareEmp1Wrc537Gamma5ZeroDpLocalSource(context);
      return preparedSource;
    },
    runLocalCorrelation: (context) => {
      cCalls += 1;
      return runEmp1Wrc537Gamma5ZeroDpLocalCorrelation(context);
    },
  };
  try {
    const result = await runEmp1({
      source,
      methodQualification: qualification.methodQualification,
      benchmarkQualification: qualification.benchmarkQualification,
      adapters,
    });
    return { result, error: null, cCalls, preparedSource };
  } catch (error) {
    return { result: null, error, cCalls, preparedSource };
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
