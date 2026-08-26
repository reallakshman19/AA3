#!/usr/bin/env node

import assert from 'node:assert/strict';
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
  createProductionGovernedEmpiricalProjection,
  rebuildProductionGovernedEmpiricalProjection,
} from '../src/workspace/engineering-loads/production-governed-empirical-projection.js';
import {
  EMPIRICAL_LOAD_METHOD,
} from '../src/workspace/engineering-loads/support-load-distribution-v3.js';
import {
  createEmptyProjectDataProfile,
} from '../src/workspace/project-data/project-data-contract.js';
import {
  createNonFeaProductDefaultProvider,
} from '../src/workspace/project-data/non-fea-product-default-profile.js';
import {
  NON_FEA_GRAVITY_METHOD_AUTO,
} from '../src/workspace/project-data/non-fea-gravity-method-authority.js';

const HASHES = Object.freeze({
  dataset: '1'.repeat(64),
  lineList: '2'.repeat(64),
  pipingClass: '3'.repeat(64),
  componentWeight: '4'.repeat(64),
});
const rawProfile = Object.freeze({
  ...createEmptyProjectDataProfile(),
  projectId: 'PROJECT-PRODUCTION-GOVERNED-CUTOVER',
  revision: 1,
});
const provider = createNonFeaProductDefaultProvider({ profile: rawProfile });
const effectiveProfile = provider.effectiveProfile;
const dataset = Object.freeze({
  datasetId: 'DATASET-PRODUCTION-GOVERNED-CUTOVER',
  version: 7,
  sourceSha256: HASHES.dataset,
  entities: [],
  sharedModel: Object.freeze({
    schema: 'shared-piping-model/v1',
    units: Object.freeze({ length: 'mm' }),
    components: Object.freeze([]),
  }),
});
const supportSiteModel = Object.freeze({
  schema: 'support-site-model/v1',
  datasetId: dataset.datasetId,
  sites: Object.freeze([]),
});
const routePartitionModel = Object.freeze({
  schema: 'route-partition-model/v1',
  datasetId: dataset.datasetId,
  routes: Object.freeze([]),
  edges: Object.freeze([]),
});
const masterData = Object.freeze({
  lineList: Object.freeze({ sourceHash: HASHES.lineList }),
  pipingClass: Object.freeze({ sourceHash: HASHES.pipingClass }),
  weight: Object.freeze({ sourceHash: HASHES.componentWeight }),
});
const authorizedInput = makeAuthorizedInput(rawProfile.projectId);
const currentBindings = Object.freeze({
  projectId: rawProfile.projectId,
  datasetId: dataset.datasetId,
  datasetVersion: dataset.version,
  sourceDatasetHash: HASHES.dataset,
  sharedModelSemanticHash: semanticHash(dataset.sharedModel),
  supportSiteModelSemanticHash: semanticHash(supportSiteModel),
  routePartitionModelSemanticHash: semanticHash(routePartitionModel),
  projectDataProfileSemanticHash: semanticHash(rawProfile),
  masterSourceHashes: HASHES,
});
const legacyRuntimePackage = sealAuthorizedEmpiricalRuntimePackage({
  schema: AUTHORIZED_EMPIRICAL_RUNTIME_PACKAGE_SCHEMA,
  packageId: 'PACKAGE-PRODUCTION-GOVERNED-CUTOVER',
  configuredAt: '2026-08-26T08:00:00.000Z',
  executionId: 'EXECUTION-PRODUCTION-GOVERNED-CUTOVER',
  executedAt: '2026-08-26T08:01:00.000Z',
  authorizedInput,
  bindings: currentBindings,
});

const projection = createProductionGovernedEmpiricalProjection({
  legacyRuntimePackage,
  dataset,
  effectiveProfile,
  supportSiteModel,
  routePartitionModel,
  masterData,
});

assert.equal(
  projection.governedSelection.gravityMethodAuthority.requestedMethod,
  NON_FEA_GRAVITY_METHOD_AUTO,
  'Routine effective Product-default Project Data must govern the production request as AUTO.',
);
assert.equal(
  projection.governedSelection.gravityMethodAuthority.effectiveAuthority,
  'PRODUCT_DEFAULT',
);
assert.equal(
  projection.governedSelection.selection.selectedMethod,
  EMPIRICAL_LOAD_METHOD,
  'No component CoG fidelity gain should deterministically select V2.',
);
assert.equal(projection.runtimePackage.method, EMPIRICAL_LOAD_METHOD);
assert.notEqual(projection.runtimePackage.method, NON_FEA_GRAVITY_METHOD_AUTO);
assert.equal(projection.runtimePackage.packageId, legacyRuntimePackage.packageId);
assert.equal(projection.runtimePackage.configuredAt, legacyRuntimePackage.configuredAt);
assert.equal(projection.runtimePackage.executionId, legacyRuntimePackage.executionId);
assert.equal(projection.runtimePackage.executedAt, legacyRuntimePackage.executedAt);
assert.equal(
  projection.runtimePackage.authorizedInput.semanticHash,
  legacyRuntimePackage.authorizedInput.semanticHash,
);
assert.equal(
  projection.runtimePackage.bindings.projectDataProfileSemanticHash,
  semanticHash(effectiveProfile),
  'V2 runtime package must bind the effective Product-default Project Data profile.',
);
assert.notEqual(
  projection.runtimePackage.bindings.projectDataProfileSemanticHash,
  legacyRuntimePackage.bindings.projectDataProfileSemanticHash,
  'The raw Project Data binding is the one intentional binding upgrade.',
);

const rebuilt = rebuildProductionGovernedEmpiricalProjection({
  configuredProjection: projection,
  dataset,
  effectiveProfile,
  supportSiteModel,
  routePartitionModel,
  masterData,
});
assert.equal(rebuilt.semanticHash, projection.semanticHash,
  'Unchanged live authority must rebuild the identical governed projection.');

const staleDatasetPackage = sealAuthorizedEmpiricalRuntimePackage({
  schema: AUTHORIZED_EMPIRICAL_RUNTIME_PACKAGE_SCHEMA,
  packageId: legacyRuntimePackage.packageId,
  configuredAt: legacyRuntimePackage.configuredAt,
  executionId: legacyRuntimePackage.executionId,
  executedAt: legacyRuntimePackage.executedAt,
  authorizedInput,
  bindings: {
    ...currentBindings,
    datasetVersion: 6,
  },
});
assert.throws(
  () => createProductionGovernedEmpiricalProjection({
    legacyRuntimePackage: staleDatasetPackage,
    dataset,
    effectiveProfile,
    supportSiteModel,
    routePartitionModel,
    masterData,
  }),
  (error) => error?.code === 'EMPIRICAL_PRODUCTION_GOVERNED_UPGRADE_BINDING_MISMATCH'
    && error.details?.some((row) => row.field === 'datasetVersion'),
  'Stale dataset/model/master authorization context must not be upgraded merely by replacing Project Data binding.',
);

const staleMasterPackage = sealAuthorizedEmpiricalRuntimePackage({
  schema: AUTHORIZED_EMPIRICAL_RUNTIME_PACKAGE_SCHEMA,
  packageId: legacyRuntimePackage.packageId,
  configuredAt: legacyRuntimePackage.configuredAt,
  executionId: legacyRuntimePackage.executionId,
  executedAt: legacyRuntimePackage.executedAt,
  authorizedInput,
  bindings: {
    ...currentBindings,
    masterSourceHashes: {
      ...currentBindings.masterSourceHashes,
      lineList: '9'.repeat(64),
    },
  },
});
assert.throws(
  () => createProductionGovernedEmpiricalProjection({
    legacyRuntimePackage: staleMasterPackage,
    dataset,
    effectiveProfile,
    supportSiteModel,
    routePartitionModel,
    masterData,
  }),
  (error) => error?.code === 'EMPIRICAL_PRODUCTION_GOVERNED_UPGRADE_BINDING_MISMATCH'
    && error.details?.some((row) => row.field === 'masterSourceHashes.lineList'),
  'Stale master authority must block production upgrade.',
);

console.log(JSON.stringify({
  check: 'production-governed-empirical-projection',
  status: 'PASS',
  publicAuthorizationContextSchema: legacyRuntimePackage.schema,
  effectiveAuthority: projection.governedSelection.gravityMethodAuthority.effectiveAuthority,
  requestedMethod: projection.governedSelection.gravityMethodAuthority.requestedMethod,
  selectedMethod: projection.runtimePackage.method,
  rawProjectDataHash: legacyRuntimePackage.bindings.projectDataProfileSemanticHash,
  effectiveProjectDataHash: projection.runtimePackage.bindings.projectDataProfileSemanticHash,
  staleDatasetUpgradeBlocked: true,
  staleMasterUpgradeBlocked: true,
  unchangedRebuildStable: true,
}, null, 2));

function makeAuthorizedInput(projectId) {
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
    intakeId: 'INTAKE-PRODUCTION-GOVERNED-CUTOVER',
    projectId,
    baselineId: 'BASELINE-PRODUCTION-GOVERNED-CUTOVER',
    baselineRevision: 1,
    baselineSemanticHash: 'fnv1a64:1111111111111111',
    readinessEvaluationSemanticHash: 'fnv1a64:2222222222222222',
    readinessSemanticHash: 'fnv1a64:3333333333333333',
    handoffSemanticHash: 'fnv1a64:4444444444444444',
    projectionPayloadSemanticHash: 'fnv1a64:5555555555555555',
    adapterVersion: 'empirical-adapter/1.0.0',
    configurationHash: 'fnv1a64:6666666666666666',
    createdAt: '2026-08-26T07:59:00.000Z',
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
