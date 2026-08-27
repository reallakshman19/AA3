#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  ENGINEERING_MODEL_EVENTS,
  EngineeringModelController,
} from '../src/workspace/engineering-model-controller.js';
import { engineeringModelStore } from '../src/workspace/engineering-model-store.js';
import { MODEL_LOAD_EVENTS } from '../src/workspace/model-load-events.js';
import {
  isRoutineRunAttemptAvailable,
  isRoutineRunReady,
  renderEngineeringLoadPane,
} from '../src/workspace/load-calc-current-system-view.js';
import { nonFeaCommonInputStore } from '../src/workspace/non-fea-common-input-store.js';
import { SUPPORT_RESTRAINT_EVENTS } from '../src/workspace/support-restraint-events.js';
import { TOPOLOGY_EVENTS } from '../src/workspace/topology-events.js';

const CURRENT = 'CURRENT_COMMON_INPUT_SYSTEM_RUN';
const READY_REPORT = Object.freeze({
  packageState: 'READY',
  readyMethodIds: Object.freeze(['WEIGHT_AND_GRAVITY']),
  blockedMethodIds: Object.freeze([]),
});
const READY_COMMON_INPUT = Object.freeze({
  packageState: 'READY',
  sealedMethodIds: Object.freeze(['WEIGHT_AND_GRAVITY']),
  blockedMethodIds: Object.freeze([]),
});

assert.equal(isRoutineRunReady({ report: READY_REPORT, error: null }), true,
  'READY report must establish validated routine readiness before a manual seal exists');
assert.equal(isRoutineRunReady({
  commonInput: READY_COMMON_INPUT,
  staleness: { stale: false },
  error: null,
}), true, 'current READY sealed Common Input must remain validated routine-ready');
assert.equal(isRoutineRunReady({
  commonInput: READY_COMMON_INPUT,
  staleness: { stale: true },
  report: READY_REPORT,
  error: null,
}), true, 'a fresh READY checker report must allow the runtime to reseal stale retained evidence');
for (const state of [
  { report: { ...READY_REPORT, packageState: 'PARTIALLY_READY' }, error: null },
  { report: { ...READY_REPORT, blockedMethodIds: ['SUSTAINED_REACTIONS'] }, error: null },
  { report: { ...READY_REPORT, readyMethodIds: [] }, error: null },
  { commonInput: READY_COMMON_INPUT, staleness: { stale: true }, error: null },
  { commonInput: { ...READY_COMMON_INPUT, sealedMethodIds: [] }, staleness: { stale: false }, error: null },
  { report: READY_REPORT, error: { code: 'CHECK_FAILED' } },
]) assert.equal(isRoutineRunReady(state), false, 'non-current/non-READY state must not be labelled READY');

assert.equal(isRoutineRunAttemptAvailable({
  workflowReadiness: { datasetReady: true, topologyCheckReady: true },
}), true, 'structurally-ready model must allow one-click Run before checker evaluation');
for (const state of [
  { workflowReadiness: { datasetReady: false, topologyCheckReady: true } },
  { workflowReadiness: { datasetReady: true, topologyCheckReady: false } },
  { workflowReadiness: {} },
  {},
]) assert.equal(isRoutineRunAttemptAvailable(state), false,
  'one-click Run attempt must remain unavailable until dataset and canonical topology are ready');

{
  const subscriptions = new Map();
  const published = [];
  let currentExecutions = 0;
  let legacyExecutions = 0;
  const eventBus = {
    subscribe(topic, handler) {
      subscriptions.set(topic, handler);
      return () => subscriptions.delete(topic);
    },
    publish(topic, payload) { published.push({ topic, payload }); },
  };
  const legacyConsumer = {
    executeEmpirical() {
      legacyExecutions += 1;
      return { distribution: { method: 'LEGACY', loadCases: [] } };
    },
    refreshEmpirical() { return {}; },
  };
  const controller = new EngineeringModelController(
    eventBus,
    { getSnapshot: () => ({ status: 'empty', dataset: null }) },
    legacyConsumer,
    {
      currentCommonInputExecutor() {
        currentExecutions += 1;
        return {
          supportExecution: {
            executedMethod: 'CHAINAGE_TRIBUTARY_SPAN_V3_COG',
            distribution: { method: 'CHAINAGE_TRIBUTARY_SPAN_V3_COG', loadCases: [] },
          },
        };
      },
    },
  );
  controller.init();
  subscriptions.get(ENGINEERING_MODEL_EVENTS.CURRENT_COMMON_INPUT_CALCULATE_REQUESTED)?.({});
  assert.equal(currentExecutions, 1, 'current-system event must execute current runtime exactly once');
  assert.equal(legacyExecutions, 0, 'current-system event must not invoke legacy explicit execution');
  assert.deepEqual(published.at(-1), {
    topic: ENGINEERING_MODEL_EVENTS.CHANGED,
    payload: {
      reason: 'calculated',
      distribution: { method: 'CHAINAGE_TRIBUTARY_SPAN_V3_COG', loadCases: [] },
      execution: {
        executedMethod: 'CHAINAGE_TRIBUTARY_SPAN_V3_COG',
        distribution: { method: 'CHAINAGE_TRIBUTARY_SPAN_V3_COG', loadCases: [] },
      },
      currentCommonInputRuntime: {
        supportExecution: {
          executedMethod: 'CHAINAGE_TRIBUTARY_SPAN_V3_COG',
          distribution: { method: 'CHAINAGE_TRIBUTARY_SPAN_V3_COG', loadCases: [] },
        },
      },
      authority: CURRENT,
    },
  });
  subscriptions.get(ENGINEERING_MODEL_EVENTS.CALCULATE_REQUESTED)?.({});
  assert.equal(legacyExecutions, 1, 'historical explicit calculation event must remain supported');
  controller.destroy();
}

{
  const published = [];
  let legacyExecutions = 0;
  const controller = new EngineeringModelController(
    { publish(topic, payload) { published.push({ topic, payload }); }, subscribe() { return () => {}; } },
    { getSnapshot: () => ({ status: 'empty', dataset: null }) },
    {
      executeEmpirical() { legacyExecutions += 1; return { distribution: null }; },
      refreshEmpirical() { return {}; },
    },
    {
      currentCommonInputExecutor() {
        const error = new Error('current system execution blocked');
        error.code = 'CURRENT_SYSTEM_BLOCKED';
        throw error;
      },
    },
  );
  assert.equal(controller.calculateCurrentCommonInput(), null);
  assert.equal(legacyExecutions, 0, 'current-system failure must not fall back to legacy execution');
  assert.deepEqual(published.at(-1), {
    topic: ENGINEERING_MODEL_EVENTS.FAILED,
    payload: {
      message: 'current system execution blocked',
      code: 'CURRENT_SYSTEM_BLOCKED',
      authority: CURRENT,
    },
  });
}

{
  const originalConfiguration = structuredClone(nonFeaCommonInputStore.getSnapshot().configuration);
  const published = [];
  let refreshes = 0;
  const controller = new EngineeringModelController(
    {
      subscribe() { return () => {}; },
      publish(topic, payload) { published.push({ topic, payload }); },
    },
    { getSnapshot: () => ({ status: 'empty', dataset: null }) },
    {
      executeEmpirical() { return { distribution: null }; },
      refreshEmpirical() { refreshes += 1; return {}; },
    },
    { currentCommonInputExecutor() { throw new Error('not used'); } },
  );
  controller.init();
  const changedMethods = originalConfiguration.requestedMethods.length === 1
    && originalConfiguration.requestedMethods[0] === 'WEIGHT_AND_GRAVITY'
    ? ['SUSTAINED_REACTIONS', 'WEIGHT_AND_GRAVITY']
    : ['WEIGHT_AND_GRAVITY'];
  nonFeaCommonInputStore.configure({
    ...originalConfiguration,
    requestedMethods: changedMethods,
  });
  assert.ok(published.some((row) => (
    row.topic === ENGINEERING_MODEL_EVENTS.CHANGED
    && row.payload?.reason === 'common-input-configuration-changed'
  )), 'method/load-case/qualification configuration changes must publish engineering-result invalidation');
  const invalidationCount = published.filter((row) => (
    row.topic === ENGINEERING_MODEL_EVENTS.CHANGED
    && row.payload?.reason === 'common-input-configuration-changed'
  )).length;
  nonFeaCommonInputStore.configure({
    ...originalConfiguration,
    requestedMethods: changedMethods,
  });
  assert.equal(published.filter((row) => (
    row.topic === ENGINEERING_MODEL_EVENTS.CHANGED
    && row.payload?.reason === 'common-input-configuration-changed'
  )).length, invalidationCount,
  'reapplying identical Common Input configuration must not stale results again');
  assert.ok(refreshes >= 1, 'configuration invalidation must refresh explicit legacy package currentness too');
  controller.destroy();
  nonFeaCommonInputStore.configure(originalConfiguration);
}

{
  const originals = {
    getDistribution: engineeringModelStore.getDistribution,
    markEmpiricalStale: engineeringModelStore.markEmpiricalStale,
    markCommonStale: nonFeaCommonInputStore.markStale,
  };
  const subscriptions = new Map();
  const resultStales = [];
  const commonStales = [];
  let refreshes = 0;
  engineeringModelStore.getDistribution = () => ({ freshness: { status: 'CURRENT' } });
  engineeringModelStore.markEmpiricalStale = (code) => { resultStales.push(code); return {}; };
  nonFeaCommonInputStore.markStale = (code, path) => { commonStales.push({ code, path }); return {}; };
  const controller = new EngineeringModelController(
    {
      subscribe(topic, handler) { subscriptions.set(topic, handler); return () => subscriptions.delete(topic); },
      publish() {},
    },
    { getSnapshot: () => ({ status: 'ready', dataset: { datasetId: 'AUTH-CHANGE', version: 3 } }) },
    {
      executeEmpirical() { return { distribution: null }; },
      refreshEmpirical() { refreshes += 1; return {}; },
    },
    { currentCommonInputExecutor() { throw new Error('not used'); } },
  );
  try {
    controller.init();
    subscriptions.get(TOPOLOGY_EVENTS.CHANGED)?.({});
    subscriptions.get(SUPPORT_RESTRAINT_EVENTS.CHANGED)?.({});
    subscriptions.get(MODEL_LOAD_EVENTS.CHANGED)?.({});
    assert.deepEqual(resultStales, [
      'TOPOLOGY_AUTHORITY_CHANGED',
      'SUPPORT_RESTRAINT_AUTHORITY_CHANGED',
      'MODEL_LOAD_AUTHORITY_CHANGED',
    ], 'each bound authority-contract change must stale a current numerical result');
    assert.deepEqual(commonStales, [
      { code: 'TOPOLOGY_AUTHORITY_CHANGED', path: 'authorityContracts.topologyGraph' },
      { code: 'SUPPORT_RESTRAINT_AUTHORITY_CHANGED', path: 'authorityContracts.supportAttachmentModel' },
      { code: 'MODEL_LOAD_AUTHORITY_CHANGED', path: 'authorityContracts.loadPrimitiveSet' },
    ], 'each bound authority-contract change must stale the retained Common Input seal');
    assert.equal(refreshes, 3, 'each authority-contract change must refresh explicit package currentness');
  } finally {
    controller.destroy();
    engineeringModelStore.getDistribution = originals.getDistribution;
    engineeringModelStore.markEmpiricalStale = originals.markEmpiricalStale;
    nonFeaCommonInputStore.markStale = originals.markCommonStale;
  }
}

{
  const distribution = {
    status: 'CALCULATED',
    method: 'CHAINAGE_TRIBUTARY_SPAN_V3_COG',
    freshness: { status: 'CURRENT' },
    blockers: [],
    loadCases: [],
  };
  const currentExecution = {
    requestedMethod: distribution.method,
    executedMethod: distribution.method,
    projectId: null,
    datasetId: 'DATASET-1481',
    commonInputSemanticHash: 'fnv1a64:1111111111111111',
    commonInputSealSemanticHash: 'fnv1a64:2222222222222222',
    runAuthorizationSemanticHash: 'fnv1a64:3333333333333333',
    massProjectionSemanticHash: 'fnv1a64:4444444444444444',
    distributionSemanticHash: 'fnv1a64:5555555555555555',
    semanticHash: 'fnv1a64:6666666666666666',
  };
  const pane = { innerHTML: '' };
  renderEngineeringLoadPane(
    pane,
    distribution,
    { status: 'READY', blockers: [], sites: [] },
    { status: 'READY', blockers: [] },
    null,
    { state: 'NOT_CONFIGURED', calculationEligible: false, details: [] },
    currentExecution,
  );
  assert.match(pane.innerHTML, /data-empirical-authority="CURRENT_COMMON_INPUT_SYSTEM_RUN"/u);
  assert.match(pane.innerHTML, /System-generated routine Run evidence/u);
  for (const hash of [
    currentExecution.commonInputSemanticHash,
    currentExecution.commonInputSealSemanticHash,
    currentExecution.runAuthorizationSemanticHash,
    currentExecution.massProjectionSemanticHash,
    currentExecution.distributionSemanticHash,
    currentExecution.semanticHash,
  ]) assert.ok(pane.innerHTML.includes(hash), `missing current-system receipt hash ${hash}`);
  assert.doesNotMatch(pane.innerHTML, /data-empirical-authority="AUTHORIZED_HANDOFF"/u);
  assert.doesNotMatch(pane.innerHTML, /Baseline<\/dt>|Handoff<\/dt>/u,
    'current-system evidence must not synthesize legacy baseline/handoff fields');
}

const controllerSource = await readFile(
  new URL('../src/workspace/load-calc-consumer-controller.js', import.meta.url),
  'utf8',
);
const currentViewSource = await readFile(
  new URL('../src/workspace/load-calc-current-system-view.js', import.meta.url),
  'utf8',
);
const modelControllerSource = await readFile(
  new URL('../src/workspace/engineering-model-controller.js', import.meta.url),
  'utf8',
);
const modelStoreSource = await readFile(
  new URL('../src/workspace/engineering-model-store.js', import.meta.url),
  'utf8',
);
const supportStoreSource = await readFile(
  new URL('../src/workspace/engineering-loads/engineering-support-load-store.js', import.meta.url),
  'utf8',
);
const runRuntimeSource = await readFile(
  new URL('../src/workspace/engineering-loads/current-common-input-empirical-run-runtime.js', import.meta.url),
  'utf8',
);
const presenterSource = await readFile(
  new URL('../src/workspace/sequential-sketcher/support-load-presenter.js', import.meta.url),
  'utf8',
);
assert.match(controllerSource, /CURRENT_COMMON_INPUT_CALCULATE_REQUESTED/u);
assert.match(controllerSource, /load-calc-current-system-view\.js/u);
assert.match(currentViewSource, /isRoutineRunAttemptAvailable/u);
assert.match(currentViewSource, /Run will validate & authorize/u,
  'pre-evaluation clickable Run must disclose deferred validation rather than claim READY');
assert.match(currentViewSource, /Non-READY input fails closed/u,
  'one-click presentation must preserve fail-closed semantics');
assert.match(modelControllerSource, /executeCurrentCommonInputEmpiricalRun/u);
assert.match(modelControllerSource, /calculateCurrentCommonInput/u);
assert.match(modelControllerSource, /nonFeaCommonInputStore\.subscribe/u,
  'engineering model controller must observe Common Input configuration changes centrally');
assert.match(modelControllerSource, /TOPOLOGY_EVENTS\.CHANGED/u);
assert.match(modelControllerSource, /SUPPORT_RESTRAINT_EVENTS\.CHANGED/u);
assert.match(modelControllerSource, /MODEL_LOAD_EVENTS\.CHANGED/u);
assert.match(modelControllerSource, /COMMON_INPUT_CONFIGURATION_CHANGED/u);
assert.match(modelStoreSource, /CURRENT_COMMON_INPUT_SYSTEM_RUN/u);
assert.match(modelStoreSource, /getCurrentCommonInputExecution/u);
assert.match(supportStoreSource,
  /markStale\([\s\S]*?#currentCommonInputExecution = null;[\s\S]*?freshness: \{ status: 'STALE'/u,
  'engineering result store must clear current-system receipt and publish STALE freshness on invalidation');
assert.match(runRuntimeSource, /sealCurrentReadyNonFeaCalculationSnapshot/u,
  'ordinary backend Run must still own READY-only current snapshot creation');
assert.match(runRuntimeSource, /authorizeCurrentNonFeaEmpiricalRun/u,
  'ordinary backend Run must still create auditable system authorization receipts');
assert.match(presenterSource, /CURRENT_COMMON_INPUT_SYSTEM_RUN/u);
assert.doesNotMatch(modelControllerSource,
  /calculateCurrentCommonInput\([\s\S]*?catch[\s\S]*?this\.calculate\(/u,
  'current-system failure path must not retry through legacy calculate');
assert.doesNotMatch(currentViewSource, /sealCurrentReadyNonFeaCalculationSnapshot|authorizeCurrentNonFeaEmpiricalRun/u,
  'presentation may enable the attempt but must not perform sealing/authorization itself');

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_CURRENT_COMMON_INPUT_ONE_CLICK_RUN',
  structuralAttemptBeforeEvaluation: true,
  readyLabelStillCheckerOwned: true,
  manualSealPrerequisite: false,
  legacyAuthorizationPrerequisite: false,
  backendReadyOnlySnapshotRetained: true,
  backendAuthorizationReceiptRetained: true,
  currentRuntimeExecutionsPerRequest: 1,
  failureFallbackToLegacy: false,
  commonInputConfigurationStalesResults: true,
  boundAuthorityContractsStaleSealAndResults: true,
  identicalConfigurationNoRepeatInvalidation: true,
  currentSystemAuthorityDistinct: true,
  legacyExplicitEventRetained: true,
}, null, 2));
