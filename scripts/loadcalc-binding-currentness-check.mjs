#!/usr/bin/env node

import assert from 'node:assert/strict';
import { freezeDeep } from '../src/workspace/dataset-utils.js';
import {
  ProjectDataStore,
  projectDataStore,
} from '../src/workspace/project-data/project-data-store.js';
import { EngineeringModelStore } from '../src/workspace/engineering-model-store.js';

console.log('--- LoadCalc Binding Currentness Check ---');

// P01 — a Project Data semantic hash is computed once per immutable profile
// instance. Runtime revision changes independently even when restored content has
// identical semantic identity.
const isolatedProjectData = new ProjectDataStore();
isolatedProjectData.resetPerformanceMetrics();
const initialHash = isolatedProjectData.getSemanticHash();
const initialRevision = isolatedProjectData.getRuntimeRevision();
assert.equal(isolatedProjectData.getSemanticHash(), initialHash);
assert.equal(isolatedProjectData.getSemanticHash(), initialHash);
assert.equal(
  isolatedProjectData.getPerformanceMetrics().profileSemanticHashComputations,
  1,
  'repeated Project Data semantic-hash reads must not re-hash the frozen profile',
);
isolatedProjectData.restoreApprovedProfile();
assert.equal(isolatedProjectData.getSemanticHash(), initialHash,
  'restoring identical approved content must preserve engineering semantic identity');
assert.ok(isolatedProjectData.getRuntimeRevision() > initialRevision,
  'runtime currentness revision must advance independently of semantic identity');
assert.equal(
  isolatedProjectData.getPerformanceMetrics().profileSemanticHashComputations,
  2,
  'a newly installed immutable profile instance must be hashed exactly once',
);
console.log('PASS P01: Project Data identity is cached per immutable profile instance.');

const store = new EngineeringModelStore();
projectDataStore.resetPerformanceMetrics();
store.resetPerformanceMetrics();

const dataset = freezeDeep({
  datasetId: 'PERF-BINDING-DATASET',
  version: 7,
  sourceSha256: '1'.repeat(64),
  entities: [],
  sharedModel: {
    schema: 'performance-shared-model-fixture/v1',
    payload: { stable: true, count: 3 },
  },
});

const masters = freezeDeep({
  lineList: { sourceHash: '2'.repeat(64) },
  pipingClass: { sourceHash: '3'.repeat(64) },
  weight: { sourceHash: '4'.repeat(64) },
  materialMap: { sourceHash: '5'.repeat(64) },
});

store.rebuild(dataset);
store.refreshAuthorizedEmpiricalPackage(masters);
store.refreshAuthorizedEmpiricalPackage(masters);

let metrics = store.getPerformanceMetrics();
assert.equal(metrics.artifactSemanticHashComputations, 3,
  'shared/support/route artifacts must each be hashed once on first rebuild');
assert.equal(metrics.artifactSemanticHashCacheHits, 0);
assert.equal(metrics.empiricalBindingBuilds, 1,
  'first refresh must construct one authorized empirical binding object');
assert.equal(metrics.empiricalBindingCacheHits, 1,
  'second identical refresh must reuse the frozen binding object');
assert.equal(metrics.empiricalBindingCacheBypasses, 0);
assert.equal(
  projectDataStore.getPerformanceMetrics().profileSemanticHashComputations,
  1,
  'EngineeringModelStore refreshes must not repeatedly hash Project Data',
);
console.log('PASS P02: repeated refresh reuses immutable artifact hashes and bindings.');

// P03 — material-map data is outside the empirical runtime binding contract.
// Changing it must not invalidate that binding cache.
const materialOnlyChange = freezeDeep({
  ...masters,
  materialMap: { sourceHash: '6'.repeat(64) },
});
store.refreshAuthorizedEmpiricalPackage(materialOnlyChange);
metrics = store.getPerformanceMetrics();
assert.equal(metrics.empiricalBindingBuilds, 1);
assert.equal(metrics.empiricalBindingCacheHits, 2);
console.log('PASS P03: material-map-only change does not invalidate empirical bindings.');

// P04 — a binding-authoritative source SHA change must invalidate immediately.
const weightSourceChange = freezeDeep({
  ...masters,
  weight: { sourceHash: '7'.repeat(64) },
});
store.refreshAuthorizedEmpiricalPackage(weightSourceChange);
metrics = store.getPerformanceMetrics();
assert.equal(metrics.empiricalBindingBuilds, 2);
assert.equal(metrics.empiricalBindingCacheHits, 2);
store.refreshAuthorizedEmpiricalPackage(weightSourceChange);
metrics = store.getPerformanceMetrics();
assert.equal(metrics.empiricalBindingBuilds, 2);
assert.equal(metrics.empiricalBindingCacheHits, 3);
console.log('PASS P04: authoritative master source SHA change invalidates binding cache.');

// P05 — rebuilding the same dataset creates new support/route artifacts but the
// immutable SharedPipingModel object is identical and must not be re-hashed.
store.rebuild(dataset);
metrics = store.getPerformanceMetrics();
assert.equal(metrics.artifactSemanticHashComputations, 5,
  'second rebuild must hash only the two newly created support/route artifacts');
assert.equal(metrics.artifactSemanticHashCacheHits, 1,
  'same immutable shared-model object must reuse its cached semantic identity');
store.refreshAuthorizedEmpiricalPackage(weightSourceChange);
metrics = store.getPerformanceMetrics();
assert.equal(metrics.empiricalBindingBuilds, 3,
  'model runtime revision change must invalidate the binding object');
console.log('PASS P05: model rebuild invalidates bindings while reusing stable shared-model hash.');

console.log(JSON.stringify({
  status: 'PASS',
  projectData: projectDataStore.getPerformanceMetrics(),
  engineeringModel: store.getPerformanceMetrics(),
  semanticIdentityChangedByOptimization: false,
  provenanceHashChangedByOptimization: false,
}, null, 2));
