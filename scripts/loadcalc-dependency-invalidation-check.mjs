#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  EngineeringModelController,
  ENGINEERING_MODEL_EVENTS,
  projectDataTopologyModelBasis,
} from '../src/workspace/engineering-model-controller.js';
import { engineeringModelStore } from '../src/workspace/engineering-model-store.js';
import { nonFeaCommonInputStore } from '../src/workspace/non-fea-common-input-store.js';
import { LoadCalcConsumerController } from '../src/workspace/load-calc-consumer-controller.js';

const DATASET = Object.freeze({ datasetId: 'PERF-DEP-1', version: 7 });

function entry(value) {
  return { value, evidence: { source: 'DEPENDENCY_FIXTURE' }, approved: true };
}

function profile(overrides = {}) {
  return {
    topology: {
      supportSiteGroupingToleranceMm: entry(overrides.supportSiteGroupingToleranceMm ?? 1),
      portMatchToleranceMm: entry(overrides.portMatchToleranceMm ?? 2),
      autoCarrierCoincidenceToleranceMm: entry(overrides.autoCarrierCoincidenceToleranceMm ?? 3),
      routeJoiningRules: entry(overrides.routeJoiningRules ?? { mode: 'EXACT', options: { a: 1, b: 2 } }),
    },
    loadCalculation: {
      gravityMPerS2: entry(overrides.gravityMPerS2 ?? 9.81),
    },
  };
}

const baseProfile = profile();
const loadOnlyProfile = profile({ gravityMPerS2: 9.80665 });
assert.equal(
  projectDataTopologyModelBasis(baseProfile),
  projectDataTopologyModelBasis(loadOnlyProfile),
  'load-only Project Data must not invalidate support/route derived models',
);

for (const [field, changed] of [
  ['supportSiteGroupingToleranceMm', 1.5],
  ['portMatchToleranceMm', 2.5],
  ['autoCarrierCoincidenceToleranceMm', 3.5],
  ['routeJoiningRules', { mode: 'EXACT', options: { a: 1, b: 3 } }],
]) {
  assert.notEqual(
    projectDataTopologyModelBasis(baseProfile),
    projectDataTopologyModelBasis(profile({ [field]: changed })),
    `${field} must invalidate support/route derived models`,
  );
}

assert.equal(
  projectDataTopologyModelBasis(baseProfile),
  projectDataTopologyModelBasis(profile({ routeJoiningRules: { options: { b: 2, a: 1 }, mode: 'EXACT' } })),
  'object key order must not create a false topology-model invalidation',
);

const original = {
  markEmpiricalStale: engineeringModelStore.markEmpiricalStale,
  rebuild: engineeringModelStore.rebuild,
  markCommonStale: nonFeaCommonInputStore.markStale,
};

let rebuilds = 0;
let empiricalStales = 0;
let commonStales = 0;
let empiricalRefreshes = 0;
const published = [];

engineeringModelStore.markEmpiricalStale = () => { empiricalStales += 1; return {}; };
engineeringModelStore.rebuild = () => { rebuilds += 1; };
nonFeaCommonInputStore.markStale = () => { commonStales += 1; return {}; };

const eventBus = {
  publish(topic, payload) { published.push({ topic, payload }); },
  subscribe() { return () => {}; },
};
const workspaceState = {
  getSnapshot() { return { status: 'ready', dataset: DATASET }; },
};
const authorizedConsumer = {
  executeEmpirical() { return { distribution: null }; },
  refreshEmpirical() { empiricalRefreshes += 1; return {}; },
};
const controller = new EngineeringModelController(eventBus, workspaceState, authorizedConsumer);
controller.projectTopologyModelBasis = projectDataTopologyModelBasis(baseProfile);

try {
  controller.handleProjectDataChanged({ profile: loadOnlyProfile });
  assert.equal(rebuilds, 0, 'load-only Project Data change must not rebuild support/route models');
  assert.equal(empiricalRefreshes, 1, 'load-only Project Data change must refresh empirical authority once');
  assert.equal(empiricalStales, 1);
  assert.equal(commonStales, 1);
  assert.deepEqual(published.at(-1), {
    topic: ENGINEERING_MODEL_EVENTS.CHANGED,
    payload: {
      reason: 'project-data-changed',
      topologyCheckAffected: false,
      topologyModelRebuilt: false,
    },
  });

  controller.handleProjectDataChanged({ profile: profile({ portMatchToleranceMm: 2.5 }) });
  assert.equal(rebuilds, 1, 'topology-policy Project Data change must rebuild support/route models once');
  assert.equal(empiricalRefreshes, 2, 'topology-policy Project Data change must refresh empirical authority once');
  assert.deepEqual(published.at(-1).payload, {
    reason: 'project-data-changed',
    topologyCheckAffected: false,
    topologyModelRebuilt: true,
  });

  controller.handleMasterDataChanged();
  assert.equal(rebuilds, 1, 'master-data change must not rebuild support/route models');
  assert.equal(empiricalRefreshes, 3, 'master-data change must refresh empirical authority once');
  assert.deepEqual(published.at(-1).payload, {
    reason: 'master-data-changed',
    topologyCheckAffected: false,
  });

  let topologyRefreshRequests = 0;
  let renders = 0;
  const loadCalc = new LoadCalcConsumerController({}, { getContext: () => null }, eventBus);
  loadCalc.render = () => { renders += 1; };
  loadCalc.refreshTopologyCheck = async () => { topologyRefreshRequests += 1; };

  loadCalc.handleEngineeringChange('project-data-changed', null, false);
  assert.equal(renders, 1, 'dependency-routed governing change must still refresh LoadCalc presentation');
  assert.equal(topologyRefreshRequests, 0, 'explicitly unaffected project change must not request canonical topology refresh');

  loadCalc.handleEngineeringChange('master-data-changed', null, false);
  assert.equal(renders, 2, 'dependency-routed master change must still refresh LoadCalc presentation');
  assert.equal(topologyRefreshRequests, 0, 'explicitly unaffected master change must not request canonical topology refresh');

  loadCalc.handleEngineeringChange('project-data-changed');
  assert.equal(topologyRefreshRequests, 1, 'legacy project-data publisher without dependency metadata must retain fail-safe topology refresh');

  console.log(JSON.stringify({
    status: 'PASS',
    masterData: { topologyRefreshRequests: 0, derivedModelRebuilds: 0, empiricalRefreshes: 1 },
    loadOnlyProjectData: { topologyRefreshRequests: 0, derivedModelRebuilds: 0, empiricalRefreshes: 1 },
    topologyPolicyProjectData: { topologyRefreshRequests: 0, derivedModelRebuilds: 1, empiricalRefreshes: 1 },
    legacyPublisherFallback: { topologyRefreshRequests: 1 },
    topologyInputsUnchanged: true,
    numericalMethodChanged: false,
  }, null, 2));
} finally {
  engineeringModelStore.markEmpiricalStale = original.markEmpiricalStale;
  engineeringModelStore.rebuild = original.rebuild;
  nonFeaCommonInputStore.markStale = original.markCommonStale;
}
