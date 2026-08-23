#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  COMMON_ENRICHED_CANDIDATE_SCHEMA,
  COMMON_ENRICHED_CANDIDATE_STATUS,
  createCommonEnrichedPropertiesCandidate,
} from '../src/core/common-enriched-properties/candidate.js';
import { COMMON_ENRICHED_FIELD_SCHEMA } from '../src/core/common-enriched-properties/field.js';
import {
  COMMON_ENRICHED_TARGET_RECORD_SCHEMA,
  createCommonEnrichedTargetRecord,
} from '../src/core/common-enriched-properties/target-record.js';
import {
  COMMON_ENRICHED_TARGET_INVENTORY_SCHEMA,
  createCommonEnrichedTargetInventory,
} from '../src/core/common-enriched-properties/target-inventory.js';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  authorityFromCommonEnrichedSourceKind,
} from '../src/workspace/engineering-loads/authorized-empirical-effective-value-ledger.js';
import {
  composeCommonEnrichedCandidateWithConfiguredDefaults,
  createNonFeaCommonEnrichedConfiguredDefaultOverlay,
} from '../src/workspace/project-data/non-fea-common-enriched-configured-default-overlay.js';
import {
  composeCommonEnrichedCandidateWithProductDefaults,
  createNonFeaCommonEnrichedProductDefaultOverlay,
} from '../src/workspace/project-data/non-fea-common-enriched-product-default-overlay.js';
import {
  createProductEngineeringDefaultProfile,
} from '../src/workspace/project-data/non-fea-product-engineering-default-profile.js';

const sourceModel = makeSourceModel();
const inventory = createCommonEnrichedTargetInventory({
  schema: COMMON_ENRICHED_TARGET_INVENTORY_SCHEMA,
  inventoryId: 'INV-ISSUE1321-EFFECTIVE-DEFAULTS',
  sharedModel: sourceModel,
});
const baseCandidate = makeCandidate(inventory);

const projectProfile = approvedProjectProfile([
  projectDefault('PROJECT-OD', 'PIPE_OUTER_DIAMETER', 100, 'mm', { lineIds: ['L-1'] }),
  projectDefault('PROJECT-C1-MASS', 'COMPONENT_WEIGHT', 10, 'kg', { entityIds: ['C1'] }),
]);
const projectOverlay = createNonFeaCommonEnrichedConfiguredDefaultOverlay({
  profile: projectProfile,
  sourceModel,
  inventory,
});
assert.deepEqual(projectOverlay.blockers, []);
const projectComposition = composeCommonEnrichedCandidateWithConfiguredDefaults({
  candidate: baseCandidate,
  overlay: projectOverlay,
  candidateId: 'CAND-ISSUE1321-PROJECT-DEFAULTED',
  revision: 2,
  createdAt: '2026-08-22T12:20:00.000Z',
});

const productProfile = createProductEngineeringDefaultProfile({
  profileId: 'PRODUCT-ENGINEERING-TABLE-ISSUE1321',
  version: 1,
  defaults: [
    productDefault('PRODUCT-OD', 'PIPE_OUTER_DIAMETER', 110, 'mm', { lineIds: ['L-1'] }),
    productDefault('PRODUCT-WALL', 'PIPE_WALL_THICKNESS', 5, 'mm', { lineIds: ['L-1'] }),
    productDefault('PRODUCT-MATERIAL-DENSITY', 'MATERIAL_DENSITY', 7850, 'kg/m3', { lineIds: ['L-1'] }),
    productDefault('PRODUCT-C1-MASS', 'COMPONENT_WEIGHT', 15, 'kg', { entityIds: ['C1'] }),
    productDefault('PRODUCT-C2-MASS', 'COMPONENT_WEIGHT', 20, 'kg', { entityIds: ['C2'] }),
  ],
});
const productOverlay = createNonFeaCommonEnrichedProductDefaultOverlay({
  defaultProfile: productProfile,
  sourceModel,
  inventory,
});
assert.deepEqual(productOverlay.blockers, []);
assert.ok(productOverlay.sourceBinding);

const finalComposition = composeCommonEnrichedCandidateWithProductDefaults({
  candidate: projectComposition.candidate,
  overlay: productOverlay,
  candidateId: 'CAND-ISSUE1321-EFFECTIVE-DEFAULTED',
  revision: 3,
  createdAt: '2026-08-22T12:21:00.000Z',
});

const line = finalComposition.candidate.targetRecords.find((row) => row.targetKind === 'LINE');
const od = field(line, 'pipe.outsideDiameterMm');
const wall = field(line, 'pipe.wallThicknessMm');
const density = field(line, 'material.densityKgM3');
assert.equal(od.value, 100);
assert.equal(od.sourceKind, 'PROJECT_CONFIGURED_DEFAULT',
  'Project configured default must shadow lower PRODUCT_DEFAULT OD');
assert.equal(wall.value, 5);
assert.equal(wall.sourceKind, 'PRODUCT_DEFAULT');
assert.equal(density.value, 7850);
assert.equal(density.sourceKind, 'PRODUCT_DEFAULT');
assert.equal(authorityFromCommonEnrichedSourceKind(od.sourceKind), 'PROJECT_CONFIGURED_DEFAULT');
assert.equal(authorityFromCommonEnrichedSourceKind(wall.sourceKind), 'PRODUCT_DEFAULT');
assert.equal(wall.policyHash, productProfile.semanticHash,
  'product field must bind the versioned product profile hash');
assert.match(wall.sourceHash, /^fnv1a64:[0-9a-f]{16}$/u,
  'product field must bind the selected product default row hash');
assert.notEqual(wall.sourceHash, wall.policyHash,
  'row hash and product-profile hash are separate custody identities');

const c1 = finalComposition.candidate.targetRecords.find((row) => row.sourceRecordId === 'C1');
const c2 = finalComposition.candidate.targetRecords.find((row) => row.sourceRecordId === 'C2');
assert.equal(field(c1, 'component.weightKg').value, 10);
assert.equal(field(c1, 'component.weightKg').sourceKind, 'PROJECT_CONFIGURED_DEFAULT',
  'Project component mass must shadow lower product component mass');
assert.equal(field(c2, 'component.weightKg').value, 20);
assert.equal(field(c2, 'component.weightKg').sourceKind, 'PRODUCT_DEFAULT');

assert.equal(finalComposition.appliedRows.length, 3,
  'product wall, material density and C2 mass should be applied');
assert.equal(finalComposition.shadowedRows.length, 2,
  'product OD and C1 mass should be shadowed by Project defaults');
assert.ok(finalComposition.candidate.sourceSnapshots.some((row) => (
  row.sourceKey === projectOverlay.sourceBinding.sourceKey
)));
assert.ok(finalComposition.candidate.sourceSnapshots.some((row) => (
  row.sourceKey === productOverlay.sourceBinding.sourceKey
)));

const productOnlyMissing = createNonFeaCommonEnrichedProductDefaultOverlay({
  defaultProfile: createProductEngineeringDefaultProfile({
    profileId: 'PRODUCT-PARTIAL-LINE-REJECT',
    version: 1,
    defaults: [
      productDefault('PRODUCT-OD-C1-ONLY', 'PIPE_OUTER_DIAMETER', 114.3, 'mm', { entityIds: ['C1'] }),
    ],
  }),
  sourceModel,
  inventory,
});
assert.ok(productOnlyMissing.blockers.some((row) => row.code === 'PRODUCT_DEFAULT_LINE_PARTIAL_COVERAGE'));

const ambiguous = makeCandidate(inventory, 'BLOCKED_AMBIGUOUS');
assert.throws(
  () => composeCommonEnrichedCandidateWithProductDefaults({
    candidate: ambiguous,
    overlay: productOverlay,
    candidateId: 'CAND-PRODUCT-MUST-NOT-MASK-AMBIGUOUS',
    revision: 2,
    createdAt: '2026-08-22T12:22:00.000Z',
  }),
  (error) => error?.code === 'PRODUCT_DEFAULT_COMMON_NON_MISSING_BLOCKER',
);

console.log(JSON.stringify({
  status: 'PASS',
  authorityOrder: 'PROJECT_CONFIGURED_DEFAULT > PRODUCT_DEFAULT',
  productAppliedOnlyToStillMissingFields: true,
  productRowAndProfileHashesPreserved: true,
  distinctComponentMassAuthorityPreserved: true,
  partialProductLineCoverageBlocked: true,
  ambiguousEvidenceCannotBeMasked: true,
  builtInEngineeringAssumptionInvented: false,
}, null, 2));

function makeSourceModel() {
  const base = {
    schema: 'shared-piping-model/v1',
    components: [
      component('C1', 'SRC-C1', 'L-1'),
      component('C2', 'SRC-C2', 'L-1'),
    ],
    supports: [],
  };
  return Object.freeze({ ...base, semanticHash: semanticHash(base) });
}

function component(componentKey, sourceEntityId, lineId) {
  return {
    componentKey,
    sourceEntityId,
    type: 'VALVE',
    nominalBoreMm: 100,
    pipingClass: 'CLASS-A',
    identity: {
      lineId,
      branchId: 'B-1',
      systemId: 'SYS-1',
      zoneId: 'ZONE-1',
      pipingClass: 'CLASS-A',
      nominalBoreMm: 100,
    },
  };
}

function approvedProjectProfile(defaults) {
  return {
    revision: 21,
    qualificationPolicy: {
      configuredDefaults: {
        value: {
          schema: 'non-fea-configured-default-policy/v1',
          defaults,
        },
        evidence: { source: 'PROJECT-DATA-DEFAULT-POLICY', sourceHash: 'fixture' },
        approved: true,
      },
    },
  };
}

function projectDefault(defaultId, fieldId, value, unit, scope) {
  return {
    defaultId,
    fieldId,
    value,
    unit,
    basis: `Approved Project Data basis for ${defaultId}`,
    allowedMethods: ['WEIGHT_AND_GRAVITY'],
    scope,
  };
}

function productDefault(defaultId, fieldId, value, unit, scope) {
  return {
    defaultId,
    fieldId,
    value,
    unit,
    basis: `Versioned product engineering basis for ${defaultId}`,
    allowedMethods: ['WEIGHT_AND_GRAVITY'],
    scope,
  };
}

function makeCandidate(targetInventory, lineOdStatus = 'BLOCKED_MISSING') {
  const line = targetInventory.lineTargets[0];
  const targetRecords = [
    createCommonEnrichedTargetRecord({
      schema: COMMON_ENRICHED_TARGET_RECORD_SCHEMA,
      targetId: line.targetId,
      targetKind: 'LINE',
      sourceModelHash: targetInventory.sourceModelHash,
      sourceRecordId: line.targetId,
      lineKey: line.lineKey,
      fields: [
        blockedField('material.densityKgM3', 'kg/m3', 'BLOCKED_MISSING'),
        blockedField('pipe.outsideDiameterMm', 'mm', lineOdStatus),
        blockedField('pipe.wallThicknessMm', 'mm', 'BLOCKED_MISSING'),
      ].sort((a, b) => a.field.localeCompare(b.field)),
    }),
    ...targetInventory.componentTargets.map((target) => createCommonEnrichedTargetRecord({
      schema: COMMON_ENRICHED_TARGET_RECORD_SCHEMA,
      targetId: target.targetId,
      targetKind: 'COMPONENT',
      sourceModelHash: targetInventory.sourceModelHash,
      sourceRecordId: target.sourceRecordId,
      lineKey: target.lineKey,
      fields: [blockedField('component.weightKg', 'kg', 'BLOCKED_MISSING')],
    })),
  ].sort((a, b) => a.targetId.localeCompare(b.targetId));
  return createCommonEnrichedPropertiesCandidate({
    schema: COMMON_ENRICHED_CANDIDATE_SCHEMA,
    candidateId: `CAND-EFFECTIVE-${lineOdStatus}`,
    projectId: 'PROJECT-ISSUE1321',
    revision: 1,
    createdAt: '2026-08-22T12:19:00.000Z',
    status: COMMON_ENRICHED_CANDIDATE_STATUS,
    sourceModelHash: targetInventory.sourceModelHash,
    sourceSnapshots: [],
    targetRecords,
    reviewLedgerHash: semanticHash({ review: lineOdStatus }),
  });
}

function blockedField(name, unit, status) {
  return {
    schema: COMMON_ENRICHED_FIELD_SCHEMA,
    field: name,
    value: null,
    unit,
    status,
    sourceKind: 'NONE',
    sourceKey: null,
    sourceHash: null,
    locator: null,
    matchMethod: 'NONE',
    confidence: 0,
    policyId: null,
    policyHash: null,
    reviewEventId: null,
    approved: false,
    diagnostics: [],
  };
}

function field(record, name) {
  const result = record.fields.find((row) => row.field === name);
  assert.ok(result, `missing ${record.targetId}:${name}`);
  return result;
}
