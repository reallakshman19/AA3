import test from 'node:test';
import assert from 'node:assert/strict';
import { LoadCalcConsumerController } from '../src/workspace/load-calc-consumer-controller.js';

function harness() {
  const eventBus = { publish() {}, subscribe() { return () => {}; } };
  const controller = new LoadCalcConsumerController({}, { getContext: () => null }, eventBus);
  const calls = { renders: 0, topologyRefreshes: 0 };
  controller.render = () => { calls.renders += 1; };
  controller.refreshTopologyCheck = async () => { calls.topologyRefreshes += 1; };
  return { controller, calls };
}

test('explicit topologyCheckAffected=false suppresses false Project Data topology refresh', () => {
  const state = harness();
  state.controller.handleEngineeringChange('project-data-changed', null, false);
  assert.equal(state.calls.renders, 1);
  assert.equal(state.calls.topologyRefreshes, 0);
  assert.match(state.controller.message, /Project Data changed/u);
});

test('explicit topologyCheckAffected=false suppresses false Master Data topology refresh', () => {
  const state = harness();
  state.controller.handleEngineeringChange('master-data-changed', null, false);
  assert.equal(state.calls.renders, 1);
  assert.equal(state.calls.topologyRefreshes, 0);
  assert.match(state.controller.message, /Master data changed/u);
});

test('legacy Project Data event without dependency metadata retains fail-safe topology refresh', () => {
  const state = harness();
  state.controller.handleEngineeringChange('project-data-changed');
  assert.equal(state.calls.renders, 1);
  assert.equal(state.calls.topologyRefreshes, 1);
});

test('explicit topologyCheckAffected=true retains topology refresh', () => {
  const state = harness();
  state.controller.handleEngineeringChange('project-data-changed', null, true);
  assert.equal(state.calls.renders, 1);
  assert.equal(state.calls.topologyRefreshes, 1);
});
