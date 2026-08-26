#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  ENGINEERING_MODEL_EVENTS,
  EngineeringModelController,
} from '../src/workspace/engineering-model-controller.js';
import {
  isRoutineRunReady,
  renderEngineeringLoadPane,
  renderLoadCalcConsumer,
} from '../src/workspace/load-calc-current-system-view.js';

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
  'READY report must enable the routine system Run before a manual seal exists');
assert.equal(isRoutineRunReady({
  commonInput: READY_COMMON_INPUT,
  staleness: { stale: false },
  error: null,
}), true, 'current READY sealed Common Input must remain routine-run eligible');
for (const state of [
  { report: { ...READY_REPORT, packageState: 'PARTIALLY_READY' }, error: null },
  { report: { ...READY_REPORT, blockedMethodIds: ['SUSTAINED_REACTIONS'] }, error: null },
  { report: { ...READY_REPORT, readyMethodIds: [] }, error: null },
  { commonInput: READY_COMMON_INPUT, staleness: { stale: true }, error: null },
  { commonInput: { ...READY_COMMON_INPUT, sealedMethodIds: [] }, staleness: { stale: false }, error: null },
  { report: READY_REPORT, error: { code: 'CHECK_FAILED' } },
]) assert.equal(isRoutineRunReady(state), false, 'non-current/non-READY state must fail closed');

{
  const button = { disabled: true, title: '', textContent: '', removeAttribute() {} };
  const pills = [
    { dataset: {}, textContent: '' },
    { dataset: {}, textContent: '' },
    { dataset: {}, textContent: '' },
  ];
  const section = {
    className: '',
    dataset: {},
    innerHTML: '',
    querySelector(selector) { return selector === '[data-load-calc-run]' ? button : null; },
    querySelectorAll() { return pills; },
  };
  const documentRef = { createElement() { return section; } };
  renderLoadCalcConsumer(documentRef, {
    activeTab: 'verify',
    distribution: null,
    authorizationState: {
      state: 'NOT_CONFIGURED',
      calculationEligible: false,
      reasonCode: 'EMPIRICAL_PACKAGE_REQUIRED',
    },
    empiricalScenarioState: { calculationEligible: false, state: 'NOT_CONFIGURED' },
    commonInputState: { report: READY_REPORT, error: null },
    workflowReadiness: {},
  });
  assert.equal(button.disabled, false, 'READY Common Input must enable ordinary Run without legacy authorization');
  assert.match(button.textContent, /Run Load Calc — Gravity/u);
  assert.equal(pills[1].dataset.pillStatus, 'ok');
  assert.equal(pills[1].textContent, 'Routine run ready ✓');
}

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
  assert.equal(currentExecutions, 1, 'current-system event must execute #1478 exactly once');
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
const modelControllerSource = await readFile(
  new URL('../src/workspace/engineering-model-controller.js', import.meta.url),
  'utf8',
);
const modelStoreSource = await readFile(
  new URL('../src/workspace/engineering-model-store.js', import.meta.url),
  'utf8',
);
const presenterSource = await readFile(
  new URL('../src/workspace/sequential-sketcher/support-load-presenter.js', import.meta.url),
  'utf8',
);
assert.match(controllerSource, /CURRENT_COMMON_INPUT_CALCULATE_REQUESTED/u);
assert.match(controllerSource, /load-calc-current-system-view\.js/u);
assert.match(modelControllerSource, /executeCurrentCommonInputEmpiricalRun/u);
assert.match(modelControllerSource, /calculateCurrentCommonInput/u);
assert.match(modelStoreSource, /CURRENT_COMMON_INPUT_SYSTEM_RUN/u);
assert.match(modelStoreSource, /getCurrentCommonInputExecution/u);
assert.match(presenterSource, /CURRENT_COMMON_INPUT_SYSTEM_RUN/u);
assert.doesNotMatch(modelControllerSource,
  /calculateCurrentCommonInput\([\s\S]*?catch[\s\S]*?this\.calculate\(/u,
  'current-system failure path must not retry through legacy calculate');

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_CURRENT_COMMON_INPUT_RUN_CUTOVER',
  readyReportEnablesRun: true,
  manualSealPrerequisite: false,
  legacyAuthorizationPrerequisite: false,
  currentRuntimeExecutionsPerRequest: 1,
  failureFallbackToLegacy: false,
  currentSystemAuthorityDistinct: true,
  legacyExplicitEventRetained: true,
}, null, 2));
