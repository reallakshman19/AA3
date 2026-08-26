#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  createNonFeaEnrichmentRecord,
} from '../src/core/non-fea-enrichment/index.js';
import {
  createCommonEnrichedTargetInventory,
} from '../src/core/common-enriched-properties/target-inventory.js';
import {
  createSharedPipingModel,
} from '../src/core/shared-piping-model/index.js';
import {
  ENGINEERING_PROPERTY_SPECS,
} from '../src/core/shared-piping-model/property-specs.js';
import {
  createEmptyProjectDataProfile,
  createEvidenceValue,
} from '../src/workspace/project-data/project-data-contract.js';
import {
  getNonFeaFieldDefinition,
} from '../src/workspace/project-data/non-fea-field-registry.js';
import {
  createNonFeaCommonEnrichedConfiguredDefaultOverlay,
} from '../src/workspace/project-data/non-fea-common-enriched-configured-default-overlay.js';
import {
  createNonFeaCommonEnrichedProductDefaultOverlay,
} from '../src/workspace/project-data/non-fea-common-enriched-product-default-overlay.js';
import {
  createProductEngineeringDefaultProfile,
} from '../src/workspace/project-data/non-fea-product-engineering-default-profile.js';

assert.deepEqual(ENGINEERING_PROPERTY_SPECS.componentFluidWeightOpeKg.aliases, [],
  'component OPE content must not infer arbitrary source columns');
assert.deepEqual(ENGINEERING_PROPERTY_SPECS.componentFluidWeightHydKg.aliases, [],
  'component HYD content must not infer arbitrary source columns');
for (const fieldId of ['COMPONENT_OPERATING_FLUID_WEIGHT', 'COMPONENT_HYDRO_FLUID_WEIGHT']) {
  const definition = getNonFeaFieldDefinition(fieldId);
  assert.ok(definition);
  assert.deepEqual(definition.authorityPath, [
    'PROJECT_CONFIGURED_DEFAULT',
    'PRODUCT_DEFAULT',
  ], `${fieldId} must not advertise an unwired source/master/manual authority`);
  for (const authority of ['SOURCE_EXPLICIT', 'SOURCE_INHERITED', 'EXACT_APPROVED_MASTER', 'ACCEPTED_OVERRIDE']) {
    assert.throws(
      () => createNonFeaEnrichmentRecord({
        recordId: `FORBIDDEN-${fieldId}-${authority}`,
        selectorKind: 'ENTITY',
        selectorKey: 'VALVE-1',
        fieldId,
        value: 1,
        unit: 'kg',
        authority,
        sourceId: 'FORBIDDEN-CONTENT-AUTHORITY',
        revision: '1',
      }),
      new RegExp(`${authority} is not permitted for ${fieldId}`),
      `${fieldId} must reject unwired ${authority} enrichment authority`,
    );
  }
}

const sourceModel = makeSourceModel();
const inventory = createCommonEnrichedTargetInventory({
  schema: 'common-enriched-target-inventory/v1',
  inventoryId: 'COMPONENT-CONTENT-DEFAULT-INVENTORY',
  sharedModel: sourceModel,
});
assert.equal(inventory.componentTargets.length, 1);
const targetId = inventory.componentTargets[0].targetId;

const configured = createNonFeaCommonEnrichedConfiguredDefaultOverlay({
  profile: projectProfile([
    configuredDefault('PROJECT-OPE-CONTENT', 'COMPONENT_OPERATING_FLUID_WEIGHT', 8),
    configuredDefault('PROJECT-HYD-CONTENT', 'COMPONENT_HYDRO_FLUID_WEIGHT', 10),
  ]),
  sourceModel,
  inventory,
  requestedMethods: ['WEIGHT_AND_GRAVITY'],
});
assert.deepEqual(configured.blockers, []);
assert.equal(configured.targetRecords.length, 1);
assert.equal(configured.targetRecords[0].targetId, targetId);
assertComponentField(configured.targetRecords[0], 'component.fluidWeightOpeKg', 8, 'PROJECT_CONFIGURED_DEFAULT');
assertComponentField(configured.targetRecords[0], 'component.fluidWeightHydKg', 10, 'PROJECT_CONFIGURED_DEFAULT');

const zeroConfigured = createNonFeaCommonEnrichedConfiguredDefaultOverlay({
  profile: projectProfile([
    configuredDefault('PROJECT-OPE-CONTENT-ZERO', 'COMPONENT_OPERATING_FLUID_WEIGHT', 0),
    configuredDefault('PROJECT-HYD-CONTENT-ZERO', 'COMPONENT_HYDRO_FLUID_WEIGHT', 0),
  ]),
  sourceModel,
  inventory,
  requestedMethods: ['WEIGHT_AND_GRAVITY'],
});
assert.deepEqual(zeroConfigured.blockers, []);
assertComponentField(zeroConfigured.targetRecords[0], 'component.fluidWeightOpeKg', 0, 'PROJECT_CONFIGURED_DEFAULT');
assertComponentField(zeroConfigured.targetRecords[0], 'component.fluidWeightHydKg', 0, 'PROJECT_CONFIGURED_DEFAULT');

const productProfile = createProductEngineeringDefaultProfile({
  profileId: 'COMPONENT-CONTENT-PRODUCT-DEFAULTS',
  version: 1,
  defaults: [
    productDefault('PRODUCT-OPE-CONTENT', 'COMPONENT_OPERATING_FLUID_WEIGHT', 8),
    productDefault('PRODUCT-HYD-CONTENT', 'COMPONENT_HYDRO_FLUID_WEIGHT', 10),
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
assertComponentField(product.targetRecords[0], 'component.fluidWeightOpeKg', 8, 'PRODUCT_DEFAULT');
assertComponentField(product.targetRecords[0], 'component.fluidWeightHydKg', 10, 'PRODUCT_DEFAULT');

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_COMPONENT_CONTENT_DEFAULT_AUTHORITY',
  targetId,
  projectConfiguredOpeKg: 8,
  projectConfiguredHydKg: 10,
  productConfiguredOpeKg: 8,
  productConfiguredHydKg: 10,
  explicitZeroPreserved: true,
  sourceColumnAliasesAdded: false,
  unwiredEnrichmentAuthoritiesRejected: true,
  authorityBoundary: 'PROJECT_CONFIGURED_DEFAULT_OR_PRODUCT_DEFAULT_ONLY',
}, null, 2));

function projectProfile(defaults) {
  const empty = createEmptyProjectDataProfile();
  return {
    ...empty,
    projectId: 'COMPONENT-CONTENT-DEFAULT-PROJECT',
    revision: 1,
    updatedAt: '2026-08-25T17:31:00.000Z',
    qualificationPolicy: {
      ...empty.qualificationPolicy,
      configuredDefaults: createEvidenceValue({
        schema: 'non-fea-configured-default-policy/v1',
        defaults,
      }, {
        source: 'Focused component-content configured-default qualification',
      }, true),
    },
  };
}

function configuredDefault(defaultId, fieldId, value) {
  return {
    defaultId,
    fieldId,
    value,
    unit: 'kg',
    basis: 'Declared component-contained fluid mass by load case.',
    allowedMethods: ['WEIGHT_AND_GRAVITY'],
    scope: { entityIds: ['VALVE-1'] },
  };
}

function productDefault(defaultId, fieldId, value) {
  return {
    defaultId,
    fieldId,
    value,
    unit: 'kg',
    basis: 'Versioned product component-contained fluid screening input.',
    allowedMethods: ['WEIGHT_AND_GRAVITY'],
    scope: { entityIds: ['VALVE-1'] },
  };
}

function assertComponentField(record, fieldName, expectedValue, sourceKind) {
  assert.equal(record.targetKind, 'COMPONENT');
  const field = record.fields.find((row) => row.field === fieldName);
  assert.ok(field, `${fieldName} must be published on the COMPONENT target`);
  assert.equal(field.value, expectedValue);
  assert.equal(field.unit, 'kg');
  assert.equal(field.status, 'RESOLVED_DERIVED');
  assert.equal(field.sourceKind, sourceKind);
  assert.equal(field.approved, true);
}

function makeSourceModel() {
  return createSharedPipingModel({
    project: {
      datasetId: 'COMPONENT-CONTENT-DEFAULT-DATASET',
      name: 'Component content defaults',
      sourceName: 'fixture',
    },
    units: { length: 'mm', force: 'N', mass: 'kg' },
    sourceSnapshotRef: {
      schema: 'source-package-snapshot/v1',
      datasetId: 'COMPONENT-CONTENT-DEFAULT-DATASET',
      sourceSchema: 'fixture/v1',
      sourceSemanticHash: 'fnv1a64:1111111111111111',
      sourceByteHash: null,
    },
    components: [{
      componentKey: 'VALVE-1',
      sourceEntityId: 'SRC-VALVE-1',
      type: 'VALVE',
      identity: {
        lineId: 'L-1',
        branchId: 'B-1',
        systemId: 'SYS-1',
        pipingClass: 'C1',
      },
      geometry: {
        ports: [
          { portKey: 'VALVE-1-A', role: 'A', position: { x: 500, y: 0, z: 0 } },
          { portKey: 'VALVE-1-B', role: 'B', position: { x: 500, y: 0, z: 0 } },
        ],
      },
      engineeringProperties: {},
    }],
    supports: [],
    sourceReferences: { nodes: [] },
    diagnostics: [],
  });
}
