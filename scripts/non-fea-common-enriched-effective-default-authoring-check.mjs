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
  authorCommonEnrichedCandidateWithEffectiveDefaults,
} from '../src/workspace/enrichment/non-fea-common-enriched-effective-default-authoring.js';
import {
  LOAD_CALC_ENGINEERING_PRODUCT_DEFAULTS_EMPTY_V1,
  createProductEngineeringDefaultProfile,
} from '../src/workspace/project-data/non-fea-product-engineering-default-profile.js';

const sourceModel = makeSourceModel();
const inventory = createCommonEnrichedTargetInventory({
  schema: COMMON_ENRICHED_TARGET_INVENTORY_SCHEMA,
  inventoryId: 'INV-EFFECTIVE-DEFAULT-AUTHORING',
  sharedModel: sourceModel,
});

const exactCandidate = makeCandidate(inventory);
const projectProfile = projectDataProfile([
  configuredDefault('PROJECT-OD', 'PIPE_OUTER_DIAMETER', 100, 'mm', { lineIds: ['L-1'] }),
  configuredDefault('PROJECT-C1-MASS', 'COMPONENT_WEIGHT', 10, 'kg', { entityIds: ['C1'] }),
]);
const productProfile = createProductEngineeringDefaultProfile({
  profileId: 'PRODUCT-TABLE-AUTHORING-V1',
  version: 1,
  defaults: [
    productDefault('PRODUCT-OD', 'PIPE_OUTER_DIAMETER', 110, 'mm', { lineIds: ['L-1'] }),
    productDefault('PRODUCT-WALL', 'PIPE_WALL_THICKNESS', 5, 'mm', { lineIds: ['L-1'] }),
    productDefault('PRODUCT-C1-MASS', 'COMPONENT_WEIGHT', 15, 'kg', { entityIds: ['C1'] }),
    productDefault('PRODUCT-C2-MASS', 'COMPONENT_WEIGHT', 20, 'kg', { entityIds: ['C2'] }),
  ],
});

const authored = authorCommonEnrichedCandidateWithEffectiveDefaults({
  exactCandidate,
  sourceModel,
  inventory,
  projectDataProfile: projectProfile,
  productEngineeringDefaultProfile: productProfile,
  requestedMethods: ['WEIGHT_AND_GRAVITY'],
  projectCompositionIdentity: {
    candidateId: 'CAND-AUTHORING-PROJECT',
    revision: 2,
    createdAt: '2026-08-22T12:30:00.000Z',
  },
  finalCompositionIdentity: {
    candidateId: 'CAND-AUTHORING-EFFECTIVE',
    revision: 3,
    createdAt: '2026-08-22T12:31:00.000Z',
  },
});

assert.deepEqual(authored.authorityOrder, [
  'EXACT_SOURCE_MASTER_CANDIDATE',
  'PROJECT_CONFIGURED_DEFAULT',
  'PRODUCT_DEFAULT',
]);
assert.equal(authored.publicationAuthorityGranted, false,
  'default authoring must not grant publication authority');
assert.equal(authored.sourceCandidateSemanticHash, exactCandidate.semanticHash);
assert.equal(authored.finalCandidate.semanticHash, authored.productDefaultComposition.candidate.semanticHash);

const line = authored.finalCandidate.targetRecords.find((row) => row.targetKind === 'LINE');
assert.equal(field(line, 'pipe.outsideDiameterMm').value, 100);
assert.equal(field(line, 'pipe.outsideDiameterMm').sourceKind, 'PROJECT_CONFIGURED_DEFAULT');
assert.equal(field(line, 'pipe.wallThicknessMm').value, 5);
assert.equal(field(line, 'pipe.wallThicknessMm').sourceKind, 'PRODUCT_DEFAULT');

const c1 = authored.finalCandidate.targetRecords.find((row) => row.sourceRecordId === 'C1');
const c2 = authored.finalCandidate.targetRecords.find((row) => row.sourceRecordId === 'C2');
assert.equal(field(c1, 'component.weightKg').value, 10);
assert.equal(field(c1, 'component.weightKg').sourceKind, 'PROJECT_CONFIGURED_DEFAULT');
assert.equal(field(c2, 'component.weightKg').value, 20);
assert.equal(field(c2, 'component.weightKg').sourceKind, 'PRODUCT_DEFAULT');
assert.equal(authored.productDefaultComposition.shadowedRows.length, 2,
  'lower Product OD and C1 mass should remain visible as shadowed defaults');

const shippedEmpty = authorCommonEnrichedCandidateWithEffectiveDefaults({
  exactCandidate,
  sourceModel,
  inventory,
  projectDataProfile: projectDataProfile([]),
  productEngineeringDefaultProfile: LOAD_CALC_ENGINEERING_PRODUCT_DEFAULTS_EMPTY_V1,
  requestedMethods: ['WEIGHT_AND_GRAVITY'],
  projectCompositionIdentity: {
    candidateId: 'CAND-EMPTY-PROJECT',
    revision: 2,
    createdAt: '2026-08-22T12:32:00.000Z',
  },
  finalCompositionIdentity: {
    candidateId: 'CAND-EMPTY-PRODUCT',
    revision: 3,
    createdAt: '2026-08-22T12:33:00.000Z',
  },
});
assert.equal(shippedEmpty.productDefaultOverlay.targetRecords.length, 0,
  'shipped product engineering table must invent zero entity values');
assert.equal(shippedEmpty.productDefaultOverlay.sourceBinding, null);
assert.equal(field(
  shippedEmpty.finalCandidate.targetRecords.find((row) => row.targetKind === 'LINE'),
  'pipe.wallThicknessMm',
).status, 'BLOCKED_MISSING');

const changedProductProfile = createProductEngineeringDefaultProfile({
  profileId: 'PRODUCT-TABLE-AUTHORING-V1',
  version: 2,
  defaults: [
    productDefault('PRODUCT-OD', 'PIPE_OUTER_DIAMETER', 110, 'mm', { lineIds: ['L-1'] }),
    productDefault('PRODUCT-WALL', 'PIPE_WALL_THICKNESS', 6, 'mm', { lineIds: ['L-1'] }),
    productDefault('PRODUCT-C1-MASS', 'COMPONENT_WEIGHT', 15, 'kg', { entityIds: ['C1'] }),
    productDefault('PRODUCT-C2-MASS', 'COMPONENT_WEIGHT', 20, 'kg', { entityIds: ['C2'] }),
  ],
});
const changed = authorCommonEnrichedCandidateWithEffectiveDefaults({
  exactCandidate,
  sourceModel,
  inventory,
  projectDataProfile: projectProfile,
  productEngineeringDefaultProfile: changedProductProfile,
  requestedMethods: ['WEIGHT_AND_GRAVITY'],
  projectCompositionIdentity: {
    candidateId: 'CAND-AUTHORING-PROJECT',
    revision: 2,
    createdAt: '2026-08-22T12:30:00.000Z',
  },
  finalCompositionIdentity: {
    candidateId: 'CAND-AUTHORING-EFFECTIVE',
    revision: 3,
    createdAt: '2026-08-22T12:31:00.000Z',
  },
});
assert.notEqual(changed.semanticHash, authored.semanticHash,
  'changing an applied product default must stale the authoring receipt');
assert.notEqual(changed.finalCandidate.semanticHash, authored.finalCandidate.semanticHash,
  'changing an applied product default must stale the candidate');
assert.equal(field(
  changed.finalCandidate.targetRecords.find((row) => row.targetKind === 'LINE'),
  'pipe.wallThicknessMm',
).value, 6);

const ambiguousCandidate = makeCandidate(inventory, 'BLOCKED_AMBIGUOUS');
assert.throws(
  () => authorCommonEnrichedCandidateWithEffectiveDefaults({
    exactCandidate: ambiguousCandidate,
    sourceModel,
    inventory,
    projectDataProfile: projectDataProfile([]),
    productEngineeringDefaultProfile: productProfile,
    requestedMethods: ['WEIGHT_AND_GRAVITY'],
    projectCompositionIdentity: {
      candidateId: 'CAND-AMBIGUOUS-PROJECT',
      revision: 2,
      createdAt: '2026-08-22T12:34:00.000Z',
    },
    finalCompositionIdentity: {
      candidateId: 'CAND-AMBIGUOUS-PRODUCT',
      revision: 3,
      createdAt: '2026-08-22T12:35:00.000Z',
    },
  }),
  (error) => error?.code === 'PRODUCT_DEFAULT_COMMON_NON_MISSING_BLOCKER',
  'lower defaults must not mask unresolved ambiguity',
);

assert.throws(
  () => authorCommonEnrichedCandidateWithEffectiveDefaults({
    exactCandidate,
    sourceModel,
    inventory,
    projectDataProfile: projectProfile,
    productEngineeringDefaultProfile: productProfile,
    projectCompositionIdentity: {
      candidateId: 'CAND-BAD-ORDER-PROJECT',
      revision: 3,
      createdAt: '2026-08-22T12:36:00.000Z',
    },
    finalCompositionIdentity: {
      candidateId: 'CAND-BAD-ORDER-FINAL',
      revision: 3,
      createdAt: '2026-08-22T12:37:00.000Z',
    },
  }),
  (error) => error?.code === 'EFFECTIVE_DEFAULT_AUTHORING_REVISION_ORDER_INVALID',
);

console.log(JSON.stringify({
  status: 'PASS',
  singleAuthoringOrder: authored.authorityOrder,
  projectBeatsProduct: true,
  shippedProductEngineeringTableEmpty: true,
  appliedProductDefaultChangesCandidateHash: true,
  ambiguousEvidenceCannotBeMasked: true,
  publicationAuthorityGranted: authored.publicationAuthorityGranted,
}, null, 2));

function makeSourceModel() {
  const base = {
    schema: 'shared-piping-model/v1',
    components: [component('C1', 'SRC-C1'), component('C2', 'SRC-C2')],
    supports: [],
  };
  return Object.freeze({ ...base, semanticHash: semanticHash(base) });
}

function component(componentKey, sourceEntityId) {
  return {
    componentKey,
    sourceEntityId,
    type: 'VALVE',
    nominalBoreMm: 100,
    pipingClass: 'CLASS-A',
    identity: {
      lineId: 'L-1',
      branchId: 'B-1',
      systemId: 'SYS-1',
      zoneId: 'ZONE-1',
      pipingClass: 'CLASS-A',
      nominalBoreMm: 100,
    },
  };
}

function projectDataProfile(defaults) {
  return {
    revision: 31,
    qualificationPolicy: {
      configuredDefaults: {
        value: { schema: 'non-fea-configured-default-policy/v1', defaults },
        evidence: { source: 'PROJECT-DATA-DEFAULT-POLICY', sourceHash: 'fixture' },
        approved: true,
      },
    },
  };
}

function configuredDefault(defaultId, fieldId, value, unit, scope) {
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
    basis: `Versioned product basis for ${defaultId}`,
    allowedMethods: ['WEIGHT_AND_GRAVITY'],
    scope,
  };
}

function makeCandidate(targetInventory, odStatus = 'BLOCKED_MISSING') {
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
        blockedField('pipe.outsideDiameterMm', 'mm', odStatus),
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
    candidateId: `CAND-EXACT-${odStatus}`,
    projectId: 'PROJECT-ISSUE1321',
    revision: 1,
    createdAt: '2026-08-22T12:29:00.000Z',
    status: COMMON_ENRICHED_CANDIDATE_STATUS,
    sourceModelHash: targetInventory.sourceModelHash,
    sourceSnapshots: [],
    targetRecords,
    reviewLedgerHash: semanticHash({ review: odStatus }),
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
