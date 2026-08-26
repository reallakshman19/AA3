#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  computeAuthorizedEmpiricalLoadInputSemanticHash,
  requireAuthorizedEmpiricalLoadInput,
} from '../src/workspace/engineering-loads/authorized-empirical-load-input.js';
import {
  AUTHORIZED_EMPIRICAL_RUNTIME_PACKAGE_SCHEMA,
  sealAuthorizedEmpiricalRuntimePackage,
} from '../src/workspace/engineering-loads/authorized-empirical-runtime-package.js';
import {
  AUTHORIZED_EMPIRICAL_CONSUMER_REQUEST_SCHEMA,
  AuthorizedEnrichmentConsumerController,
} from '../src/workspace/enrichment/authorized-enrichment-consumer-controller.js';

const masterData = Object.freeze({ marker: 'MASTER-PRODUCTION-CUTOVER' });
const legacyRuntimePackage = makeRuntimePackage();
const initialProjection = Object.freeze({
  schema: 'governed-empirical-runtime-package-projection/v1',
  semanticHash: 'fnv1a64:aaaaaaaaaaaaaaaa',
  runtimePackage: Object.freeze({
    packageId: legacyRuntimePackage.packageId,
    executionId: legacyRuntimePackage.executionId,
    executedAt: legacyRuntimePackage.executedAt,
    method: 'CHAINAGE_TRIBUTARY_SPAN_V2',
  }),
});
const currentProjection = Object.freeze({
  ...initialProjection,
  semanticHash: 'fnv1a64:bbbbbbbbbbbbbbbb',
});
const execution = Object.freeze({
  schema: 'authorized-empirical-load-execution/v2',
  executionId: legacyRuntimePackage.executionId,
  executedAt: legacyRuntimePackage.executedAt,
  semanticHash: 'fnv1a64:cccccccccccccccc',
  distribution: Object.freeze({
    status: 'CALCULATED',
    semanticHash: 'fnv1a64:dddddddddddddddd',
  }),
});

const legacyCalls = [];
const legacyStore = {
  configureAuthorizedEmpiricalPackage(value, actualMasterData) {
    legacyCalls.push({ kind: 'V1_CONFIGURE', value, actualMasterData });
    return Object.freeze({ state: 'AUTHORIZED_CURRENT', calculationEligible: true });
  },
  executeConfiguredAuthorized(actualMasterData) {
    legacyCalls.push({ kind: 'V1_EXECUTE', actualMasterData });
    return Object.freeze({ ...execution, schema: 'authorized-empirical-load-execution/v1' });
  },
  refreshAuthorizedEmpiricalPackage(actualMasterData) {
    legacyCalls.push({ kind: 'V1_REFRESH', actualMasterData });
    return Object.freeze({ state: 'AUTHORIZED_CURRENT', calculationEligible: true });
  },
  markEmpiricalStale(reason, datasetVersion) {
    legacyCalls.push({ kind: 'V1_STALE', reason, datasetVersion });
    return Object.freeze({ state: 'AUTHORIZED_STALE', calculationEligible: false, reasonCode: reason });
  },
  getEmpiricalAuthorizationState() {
    return Object.freeze({ state: 'AUTHORIZED_CURRENT', calculationEligible: true });
  },
  getAuthorizedEmpiricalPackage() {
    // Deliberately expose a residual V1 package to prove governed production
    // never falls back to it.
    return legacyRuntimePackage;
  },
};

const governedCalls = [];
let configuredProjection = null;
const governedController = {
  configureGoverned(value, actualMasterData) {
    configuredProjection = value;
    governedCalls.push({ kind: 'V2_CONFIGURE_GOVERNED', value, actualMasterData });
    return Object.freeze({ state: 'AUTHORIZED_CURRENT', calculationEligible: true, method: value.runtimePackage.method });
  },
  refreshGoverned(value, actualMasterData) {
    governedCalls.push({ kind: 'V2_REFRESH_GOVERNED', value, actualMasterData });
    return value
      ? Object.freeze({ state: 'AUTHORIZED_CURRENT', calculationEligible: true })
      : Object.freeze({ state: 'AWAITING_AUTHORIZATION', calculationEligible: false });
  },
  executeGoverned(value, actualMasterData) {
    governedCalls.push({ kind: 'V2_EXECUTE_GOVERNED', value, actualMasterData });
    return execution;
  },
  getGovernedProjection() { return configuredProjection; },
  getState() {
    return configuredProjection
      ? Object.freeze({ state: 'AUTHORIZED_CURRENT', calculationEligible: true })
      : Object.freeze({ state: 'AWAITING_AUTHORIZATION', calculationEligible: false });
  },
  markStale(reason, datasetVersion) {
    governedCalls.push({ kind: 'V2_STALE', reason, datasetVersion });
    return Object.freeze({ state: 'AUTHORIZED_STALE', calculationEligible: false, reasonCode: reason });
  },
};
const providerCalls = [];
const governedProjectionProvider = {
  createFromLegacy(value, actualMasterData) {
    providerCalls.push({ kind: 'CREATE_FROM_LEGACY', value, actualMasterData });
    return initialProjection;
  },
  rebuild(value, actualMasterData) {
    providerCalls.push({ kind: 'REBUILD', value, actualMasterData });
    return currentProjection;
  },
};

const controller = new AuthorizedEnrichmentConsumerController({
  engineeringModelStore: legacyStore,
  masterDataController: { getMasterData: () => masterData },
  governedEmpiricalController: governedController,
  governedProjectionProvider,
});
const request = Object.freeze({
  schema: AUTHORIZED_EMPIRICAL_CONSUMER_REQUEST_SCHEMA,
  runtimePackage: legacyRuntimePackage,
});

const configured = controller.configureEmpirical(request);
assert.equal(configured.state, 'AUTHORIZED_CURRENT');
assert.equal(configuredProjection.semanticHash, initialProjection.semanticHash);
assert.deepEqual(legacyCalls, [],
  'Governed production configure must not configure the legacy V1 runtime store.');
assert.deepEqual(
  providerCalls.map((row) => row.kind),
  ['CREATE_FROM_LEGACY'],
);
assert.deepEqual(
  governedCalls.map((row) => row.kind),
  ['V2_CONFIGURE_GOVERNED'],
);

const result = controller.executeEmpirical();
assert.equal(result.schema, 'authorized-empirical-load-execution/v2');
assert.deepEqual(
  providerCalls.map((row) => row.kind),
  ['CREATE_FROM_LEGACY', 'REBUILD'],
  'Ordinary Run must rebuild the current governed receipt before execution.',
);
assert.deepEqual(
  governedCalls.map((row) => row.kind),
  ['V2_CONFIGURE_GOVERNED', 'V2_EXECUTE_GOVERNED'],
);
assert.deepEqual(legacyCalls, [],
  'Ordinary Run must not execute the V1 path after production cutover.');

const refreshed = controller.refreshEmpirical();
assert.equal(refreshed.state, 'AUTHORIZED_CURRENT');
assert.equal(providerCalls.at(-1).kind, 'REBUILD');
assert.equal(governedCalls.at(-1).kind, 'V2_REFRESH_GOVERNED');
assert.deepEqual(legacyCalls, []);
assert.equal(controller.getEmpiricalAuthorizationState().state, 'AUTHORIZED_CURRENT');
assert.equal(controller.markEmpiricalStale('PROJECT_DATA_CHANGED', 7).reasonCode,
  'PROJECT_DATA_CHANGED');
assert.equal(governedCalls.at(-1).kind, 'V2_STALE');
assert.deepEqual(legacyCalls, []);

configuredProjection = null;
assert.throws(
  () => controller.executeEmpirical(),
  (error) => error?.code === 'AUTHORIZED_ENRICHMENT_GOVERNED_AUTHORIZATION_REQUIRED',
  'Governed production Run must not fall back to a residual V1 authorization.',
);
assert.deepEqual(legacyCalls, [],
  'Residual V1 package must remain unreachable in governed production mode.');
assert.equal(controller.refreshEmpirical().state, 'AWAITING_AUTHORIZATION');
assert.equal(governedCalls.at(-1).kind, 'V2_REFRESH_GOVERNED');

const legacyOnlyCalls = [];
const legacyOnlyStore = {
  ...legacyStore,
  configureAuthorizedEmpiricalPackage(value, actualMasterData) {
    legacyOnlyCalls.push('CONFIGURE');
    return legacyStore.configureAuthorizedEmpiricalPackage(value, actualMasterData);
  },
  executeConfiguredAuthorized(actualMasterData) {
    legacyOnlyCalls.push('EXECUTE');
    return legacyStore.executeConfiguredAuthorized(actualMasterData);
  },
  refreshAuthorizedEmpiricalPackage(actualMasterData) {
    legacyOnlyCalls.push('REFRESH');
    return legacyStore.refreshAuthorizedEmpiricalPackage(actualMasterData);
  },
};
const legacyOnlyController = new AuthorizedEnrichmentConsumerController({
  engineeringModelStore: legacyOnlyStore,
  masterDataController: { getMasterData: () => masterData },
});
legacyOnlyController.configureEmpirical(request);
legacyOnlyController.executeEmpirical();
legacyOnlyController.refreshEmpirical();
assert.deepEqual(legacyOnlyCalls, ['CONFIGURE', 'EXECUTE', 'REFRESH'],
  'Legacy/focused controller composition without governed dependencies must remain compatible.');

assert.throws(
  () => new AuthorizedEnrichmentConsumerController({
    engineeringModelStore: legacyStore,
    masterDataController: { getMasterData: () => masterData },
    governedEmpiricalController: governedController,
  }),
  (error) => error?.code === 'AUTHORIZED_ENRICHMENT_GOVERNED_EMPIRICAL_DEPENDENCY_INVALID',
);

const runtimeRootSource = await readFile(
  new URL('../src/workspace/enrichment/authorized-enrichment-runtime.js', import.meta.url),
  'utf8',
);
assert.equal(runtimeRootSource.includes('ConfiguredEmpiricalMethodControllerV2'), true);
assert.equal(runtimeRootSource.includes('authorizedEmpiricalRuntimeStoreV2'), true);
assert.equal(runtimeRootSource.includes('getCurrentNonFeaProductDefaultProvider'), true);
assert.equal(runtimeRootSource.includes('governedProjectionProvider'), true);

console.log(JSON.stringify({
  check: 'authorized-enrichment-governed-production-cutover',
  status: 'PASS',
  publicRequestSchema: AUTHORIZED_EMPIRICAL_CONSUMER_REQUEST_SCHEMA,
  explicitAuthorizationPreserved: true,
  productionConfigurePath: 'V2_CONFIGURE_GOVERNED',
  productionRunPath: 'V2_EXECUTE_GOVERNED',
  productionRefreshPath: 'V2_REFRESH_GOVERNED',
  v1FallbackInGovernedMode: false,
  legacyFocusedCompatibility: true,
  effectiveProductDefaultCompositionRoot: true,
}, null, 2));

function makeRuntimePackage() {
  const authorizedInput = makeAuthorizedInput();
  return sealAuthorizedEmpiricalRuntimePackage({
    schema: AUTHORIZED_EMPIRICAL_RUNTIME_PACKAGE_SCHEMA,
    packageId: 'PACKAGE-PRODUCTION-CUTOVER-CONTROLLER',
    configuredAt: '2026-08-26T08:10:00.000Z',
    executionId: 'EXECUTION-PRODUCTION-CUTOVER-CONTROLLER',
    executedAt: '2026-08-26T08:11:00.000Z',
    authorizedInput,
    bindings: {
      projectId: authorizedInput.projectId,
      datasetId: 'DATASET-PRODUCTION-CUTOVER-CONTROLLER',
      datasetVersion: 7,
      sourceDatasetHash: '1'.repeat(64),
      sharedModelSemanticHash: 'fnv1a64:1111111111111111',
      supportSiteModelSemanticHash: 'fnv1a64:2222222222222222',
      routePartitionModelSemanticHash: 'fnv1a64:3333333333333333',
      projectDataProfileSemanticHash: 'fnv1a64:4444444444444444',
      masterSourceHashes: {
        dataset: '1'.repeat(64),
        lineList: '2'.repeat(64),
        pipingClass: '3'.repeat(64),
        componentWeight: '4'.repeat(64),
      },
    },
  });
}

function makeAuthorizedInput() {
  const overlay = {
    pipeSectionProperties: {},
    materialDensitiesKgPerM3: {},
    operatingFluidDensitiesKgPerM3: {},
    hydroFluidDensitiesKgPerM3: {},
    insulationDensitiesKgPerM3: {},
    componentWeightsKg: {},
  };
  const draft = {
    schema: 'authorized-empirical-load-input/v1',
    intakeId: 'INTAKE-PRODUCTION-CUTOVER-CONTROLLER',
    projectId: 'PROJECT-PRODUCTION-CUTOVER-CONTROLLER',
    baselineId: 'BASELINE-PRODUCTION-CUTOVER-CONTROLLER',
    baselineRevision: 1,
    baselineSemanticHash: 'fnv1a64:5555555555555555',
    readinessEvaluationSemanticHash: 'fnv1a64:6666666666666666',
    readinessSemanticHash: 'fnv1a64:7777777777777777',
    handoffSemanticHash: 'fnv1a64:8888888888888888',
    projectionPayloadSemanticHash: 'fnv1a64:9999999999999999',
    adapterVersion: 'empirical-adapter/1.0.0',
    configurationHash: 'fnv1a64:aaaaaaaaaaaaaaaa',
    createdAt: '2026-08-26T08:09:00.000Z',
    lineBindings: [],
    componentBindings: [],
    loadCalculationOverlay: overlay,
    overlaySemanticHash: semanticHash(overlay),
    summary: {
      lineCount: 0,
      componentCount: 0,
      materialCodeCount: 0,
      insulationCodeCount: 0,
      componentCatalogCount: 0,
    },
    semanticHash: 'fnv1a64:0000000000000000',
  };
  return requireAuthorizedEmpiricalLoadInput({
    ...draft,
    semanticHash: computeAuthorizedEmpiricalLoadInputSemanticHash(draft),
  });
}
