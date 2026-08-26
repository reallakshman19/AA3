#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ENGINEERING_MODEL_EVENTS } from '../src/workspace/engineering-model-controller.js';
import { LoadCalcConsumerController } from '../src/workspace/load-calc-consumer-controller.js';
import {
  EMPIRICAL_LOAD_CALC_SCENARIO_EVENTS,
} from '../src/workspace/engineering-loads/empirical-load-calc-scenario-controller.js';
import {
  empiricalLoadCalcScenarioStore,
} from '../src/workspace/engineering-loads/empirical-load-calc-scenario-store.js';

const originalScenarioSnapshot = empiricalLoadCalcScenarioStore.getSnapshot;

function runCase({
  scenario,
  readyProvider = () => ({ commonInput: { packageState: 'READY' } }),
  authorization = { calculationEligible: false, state: 'AWAITING_AUTHORIZATION' },
}) {
  const events = [];
  let readyCalls = 0;
  let authorizationRefreshCalls = 0;
  let renders = 0;

  empiricalLoadCalcScenarioStore.getSnapshot = () => scenario;
  const controller = new LoadCalcConsumerController(
    {},
    { getContext: () => null },
    {
      publish(topic, payload) { events.push({ topic, payload }); },
      subscribe() { return () => {}; },
    },
    {
      readyCalculationSnapshotProvider() {
        readyCalls += 1;
        return readyProvider();
      },
      empiricalAuthorizationController: {
        refreshEmpirical() {
          authorizationRefreshCalls += 1;
          return authorization;
        },
      },
    },
  );
  controller.render = () => { renders += 1; };
  controller.runCurrentCalculation();
  return {
    controller,
    events,
    readyCalls,
    authorizationRefreshCalls,
    renders,
  };
}

try {
  const scenarioEligible = runCase({
    scenario: { calculationEligible: true, state: 'AUTHORIZED_CURRENT' },
    readyProvider: () => { throw new Error('scenario path must not ask for READY snapshot'); },
    authorization: { calculationEligible: false },
  });
  assert.equal(scenarioEligible.readyCalls, 0,
    'scenario-ready Run must not invoke the ordinary READY snapshot provider');
  assert.equal(scenarioEligible.authorizationRefreshCalls, 0,
    'scenario-ready Run must not refresh ordinary empirical authorization');
  assert.deepEqual(scenarioEligible.events, [{
    topic: EMPIRICAL_LOAD_CALC_SCENARIO_EVENTS.CALCULATE_REQUESTED,
    payload: {},
  }]);

  const ordinaryCurrent = runCase({
    scenario: { calculationEligible: false, state: 'DRAFT_READY' },
    authorization: { calculationEligible: true, state: 'AUTHORIZED_CURRENT' },
  });
  assert.equal(ordinaryCurrent.readyCalls, 1,
    'ordinary Run must obtain/reuse the READY snapshot exactly once');
  assert.equal(ordinaryCurrent.authorizationRefreshCalls, 1,
    'ordinary Run must refresh authorization only after the READY snapshot operation');
  assert.deepEqual(ordinaryCurrent.events, [{
    topic: ENGINEERING_MODEL_EVENTS.CALCULATE_REQUESTED,
    payload: { source: 'load-calc' },
  }]);

  for (const authorization of [
    { calculationEligible: false, state: 'AWAITING_AUTHORIZATION' },
    { calculationEligible: false, state: 'AUTHORIZED_STALE' },
  ]) {
    const blocked = runCase({
      scenario: { calculationEligible: false, state: 'DRAFT_READY' },
      authorization,
    });
    assert.equal(blocked.readyCalls, 1);
    assert.equal(blocked.authorizationRefreshCalls, 1);
    assert.deepEqual(blocked.events, [],
      `${authorization.state} must publish no calculation request`);
    assert.equal(blocked.controller.message, 'Explicit empirical authorization still required.');
    assert.equal(blocked.renders, 1);
  }

  const evaluationFailure = runCase({
    scenario: { calculationEligible: false, state: 'DRAFT_READY' },
    readyProvider() {
      const error = new Error('Current Common Input is not READY.');
      error.code = 'COMMON_INPUT_PRODUCT_SCREENING_SNAPSHOT_NOT_READY';
      throw error;
    },
    authorization: { calculationEligible: true, state: 'AUTHORIZED_CURRENT' },
  });
  assert.equal(evaluationFailure.readyCalls, 1);
  assert.equal(evaluationFailure.authorizationRefreshCalls, 0,
    'authorization must not be consulted after READY snapshot failure');
  assert.deepEqual(evaluationFailure.events, [],
    'READY snapshot failure must execute nothing even when a stale fixture says authorization is eligible');
  assert.equal(evaluationFailure.controller.message, 'Current Common Input is not READY.');
  assert.equal(evaluationFailure.renders, 1);

  const partialFailure = runCase({
    scenario: { calculationEligible: false, state: 'DRAFT_BLOCKED' },
    readyProvider() {
      const error = new Error('PARTIALLY_READY is not routine screening authority.');
      error.code = 'COMMON_INPUT_PRODUCT_SCREENING_SNAPSHOT_NOT_READY';
      throw error;
    },
    authorization: { calculationEligible: true, state: 'AUTHORIZED_CURRENT' },
  });
  assert.deepEqual(partialFailure.events, [],
    'PARTIALLY_READY rejection from the upstream helper must remain fail-closed');
  assert.equal(partialFailure.authorizationRefreshCalls, 0);

  const source = await readFile(
    new URL('../src/workspace/load-calc-consumer-controller.js', import.meta.url),
    'utf8',
  );
  assert.match(source, /readyCalculationSnapshotProvider\s*=\s*sealCurrentReadyNonFeaCalculationSnapshot/u,
    'production constructor must default to the merged READY-only snapshot helper');
  assert.match(source, /if \(event\.target\.closest\('\[data-load-calc-run\]'\)\) \{\s*this\.runCurrentCalculation\(\);/u,
    'Run click must delegate to the focused routing method');

  const runBody = source.match(/\n  runCurrentCalculation\(\) \{([\s\S]*?)\n  \}\n\n  handleClick\(event\)/u)?.[1];
  assert.ok(runBody, 'focused Run routing method must remain discoverable by the regression');
  const scenarioIndex = runBody.indexOf('snap?.calculationEligible');
  const readyIndex = runBody.indexOf('this.readyCalculationSnapshotProvider()');
  const refreshIndex = runBody.indexOf('this.empiricalAuthorizationController.refreshEmpirical()');
  const executeIndex = runBody.indexOf('ENGINEERING_MODEL_EVENTS.CALCULATE_REQUESTED');
  assert.ok(scenarioIndex >= 0 && readyIndex > scenarioIndex,
    'scenario currentness must be checked before ordinary READY snapshot creation');
  assert.ok(refreshIndex > readyIndex,
    'authorization currentness must be refreshed after READY snapshot creation/reuse');
  assert.ok(executeIndex > refreshIndex,
    'ordinary calculation request must be downstream of refreshed authorization currentness');
  assert.doesNotMatch(runBody, /sealCurrentNonFeaCommonInput/u,
    'ordinary Run must never invoke the manual human-style seal transaction');
  assert.doesNotMatch(runBody, /AUTHORIZE_REQUESTED/u,
    'ordinary Run must not manufacture empirical or scenario authorization');
  assert.match(runBody, /Explicit empirical authorization still required\./u);

  console.log(JSON.stringify({
    status: 'PASS',
    scenarioPathUnchanged: true,
    ordinaryReadySnapshotCalls: 1,
    readySnapshotFailurePublishesCalculation: false,
    absentAuthorizationPublishesCalculation: false,
    staleAuthorizationPublishesCalculation: false,
    partialReadyPublishesCalculation: false,
    manualSealCalledByRun: false,
    autoAuthorizationCalledByRun: false,
  }, null, 2));
} finally {
  empiricalLoadCalcScenarioStore.getSnapshot = originalScenarioSnapshot;
}
