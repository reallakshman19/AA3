#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  createCommonEnrichedTargetInventory,
} from '../src/core/common-enriched-properties/target-inventory.js';
import {
  createSharedPipingModel,
} from '../src/core/shared-piping-model/index.js';
import {
  createEmptyProjectDataProfile,
  createEvidenceValue,
} from '../src/workspace/project-data/project-data-contract.js';
import {
  createNonFeaCommonEnrichedConfiguredDefaultOverlay,
} from '../src/workspace/project-data/non-fea-common-enriched-configured-default-overlay.js';
import {
  createNonFeaCommonEnrichedProductDefaultOverlay,
} from '../src/workspace/project-data/non-fea-common-enriched-product-default-overlay.js';
import {
  createProductEngineeringDefaultProfile,
} from '../src/workspace/project-data/non-fea-product-engineering-default-profile.js';

const sourceModel = makeSourceModel();
const inventory = createCommonEnrichedTargetInventory({
  schema: 'common-enriched-target-inventory/v1',
  inventoryId: 'ANCILLARY-DEFAULT-INVENTORY',
  sharedModel: sourceModel,
});
assert.equal(inventory.lineTargets.length, 1);
assert.equal(inventory.lineTargets[0].sourceRecordIds.length, 2);

const configured = createNonFeaCommonEnrichedConfiguredDefaultOverlay({
  profile: projectProfile([
    configuredDefault('PROJECT-CLADDING', 'CLADDING_WEIGHT', 2, { lineIds: ['L-1'] }),
    configuredDefault('PROJECT-TRACING', 'TRACING_WEIGHT', 1, { lineIds: ['L-1'] }),
  ]),
  sourceModel,
  inventory,
  requestedMethods: ['WEIGHT_AND_GRAVITY'],
});
assert.deepEqual(configured.blockers, []);
assert.equal(configured.targetRecords.length, 1);
assertLineField(configured.targetRecords[0], 'permanent.claddingWeightKgPerM', 2, 'PROJECT_CONFIGURED_DEFAULT');
assertLineField(configured.targetRecords[0], 'permanent.tracingWeightKgPerM', 1, 'PROJECT_CONFIGURED_DEFAULT');

const productProfile = createProductEngineeringDefaultProfile({
  profileId: 'ANCILLARY-PRODUCT-DEFAULTS',
  version: 1,
  defaults: [
    productDefault('PRODUCT-CLADDING', 'CLADDING_WEIGHT', 2, { lineIds: ['L-1'] }),
    productDefault('PRODUCT-TRACING', 'TRACING_WEIGHT', 1, { lineIds: ['L-1'] }),
  ],
});
const product = createNonFeaCommonEnrichedProductDefaultOverlay({
  defaultProfile: productProfile,
  sourceModel,
  inventory,
  requestedMethods: ['WEIGHT_AND_GRAVITY'],
});
assert.deepEqual(product.blockers, []);
assert.equal(product.targetRecords.length, 1);
assertLineField(product.targetRecords[0], 'permanent.claddingWeightKgPerM', 2, 'PRODUCT_DEFAULT');
assertLineField(product.targetRecords[0], 'permanent.tracingWeightKgPerM', 1, 'PRODUCT_DEFAULT');

const partial = createNonFeaCommonEnrichedConfiguredDefaultOverlay({
  profile: projectProfile([
    configuredDefault('PARTIAL-CLADDING', 'CLADDING_WEIGHT', 2, { entityIds: ['PIPE-A'] }),
  ]),
  sourceModel,
  inventory,
  requestedMethods: ['WEIGHT_AND_GRAVITY'],
});
assert.ok(partial.blockers.some((row) => (
  row.code === 'CONFIGURED_DEFAULT_LINE_PARTIAL_COVERAGE'
  && row.path.endsWith(':CLADDING_WEIGHT')
)));
assert.equal(
  partial.targetRecords.some((record) => (
    record.fields.some((field) => field.field === 'permanent.claddingWeightKgPerM')
  )),
  false,
  'partial component coverage must not promote to one LINE cladding value',
);

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_ANCILLARY_DEFAULT_AUTHORITY',
  lineTargetId: inventory.lineTargets[0].targetId,
  sourceComponentCount: inventory.lineTargets[0].sourceRecordIds.length,
  configuredDefaultsPromoted: true,
  productDefaultsPromoted: true,
  partialCoverageFailsClosed: true,
  sourceColumnAliasesAdded: false,
}, null, 2));

function projectProfile(defaults) {
  const empty = createEmptyProjectDataProfile();
  return {
    ...empty,
    projectId: 'ANCILLARY-DEFAULT-PROJECT',
    revision: 1,
    updatedAt: '2026-08-25T14:50:00.000Z',
    qualificationPolicy: {
      ...empty.qualificationPolicy,
      configuredDefaults: createEvidenceValue({
        schema: 'non-fea-configured-default-policy/v1',
        defaults,
      }, {
        source: 'Focused ancillary configured-default qualification',
      }, true),
    },
  };
}

function configuredDefault(defaultId, fieldId, value, scope) {
  return {
    defaultId,
    fieldId,
    value,
    unit: 'kg/m',
    basis: 'Declared permanent ancillary distributed-mass screening input.',
    allowedMethods: ['WEIGHT_AND_GRAVITY'],
    scope,
  };
}

function productDefault(defaultId, fieldId, value, scope) {
  return {
    defaultId,
    fieldId,
    value,
    unit: 'kg/m',
    basis: 'Versioned product ancillary distributed-mass screening input.',
    allowedMethods: ['WEIGHT_AND_GRAVITY'],
    scope,
  };
}

function assertLineField(record, fieldName, expectedValue, sourceKind) {
  const field = record.fields.find((row) => row.field === fieldName);
  assert.ok(field, `${fieldName} must be promoted to LINE target`);
  assert.equal(field.value, expectedValue);
  assert.equal(field.unit, 'kg/m');
  assert.equal(field.status, 'RESOLVED_DERIVED');
  assert.equal(field.sourceKind, sourceKind);
  assert.equal(field.approved, true);
}

function makeSourceModel() {
  return createSharedPipingModel({
    project: {
      datasetId: 'ANCILLARY-DEFAULT-DATASET',
      name: 'Ancillary defaults',
      sourceName: 'fixture',
    },
    units: { length: 'mm', force: 'N', mass: 'kg' },
    sourceSnapshotRef: {
      schema: 'source-package-snapshot/v1',
      datasetId: 'ANCILLARY-DEFAULT-DATASET',
      sourceSchema: 'fixture/v1',
      sourceSemanticHash: 'fnv1a64:1111111111111111',
      sourceByteHash: null,
    },
    components: [
      component('PIPE-A', 'SRC-A', 0, 1000),
      component('PIPE-B', 'SRC-B', 1000, 2000),
    ],
    supports: [],
    sourceReferences: { nodes: [] },
    diagnostics: [],
  });
}

function component(componentKey, sourceEntityId, x1, x2) {
  return {
    componentKey,
    sourceEntityId,
    type: 'PIPE',
    identity: {
      lineId: 'L-1',
      branchId: 'B-1',
      systemId: 'SYS-1',
      pipingClass: 'C1',
    },
    geometry: {
      ports: [
        { portKey: `${componentKey}-A`, role: 'A', position: { x: x1, y: 0, z: 0 } },
        { portKey: `${componentKey}-B`, role: 'B', position: { x: x2, y: 0, z: 0 } },
      ],
    },
    engineeringProperties: {},
  };
}
