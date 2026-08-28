#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  createNonFeaEnrichmentSidecar,
  migrateFirstCutEnrichment,
  resolveNonFeaEnrichment,
} from '../src/core/non-fea-enrichment/index.js';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  createNonFeaEffectiveCommonInputProjection,
} from '../src/workspace/project-data/non-fea-effective-common-input-projection.js';
import { buildStraightFixture } from './w10.5-screening-fixtures.mjs';

const fixture = buildStraightFixture({
  lengthsM: [2],
  pipeMassKgM: 10,
  opeFluidKgM: 2,
  hydFluidKgM: 3,
});
const sourceModel = fixture.sharedModel;
const component = sourceModel.components[0];
const componentKey = component.componentKey;
const sourceProperty = component.engineeringProperties.unitPipeWeightKgPerM;
const sourceModelHashBefore = sourceModel.semanticHash;
const sourceComponentBefore = JSON.stringify(component);
const sourceTopologyHash = topologyHash(sourceModel);

assert.equal(sourceProperty.value, 10);
assert.equal(sourceProperty.unit, 'kg/m');

const overrideSidecar = createNonFeaEnrichmentSidecar({
  sourceSemanticHash: sourceModel.semanticHash,
  records: [record({
    recordId: 'OVERRIDE-PIPE-WEIGHT-EFFECTIVE',
    authority: 'ACCEPTED_OVERRIDE',
    value: 99,
    sourceId: 'ENGINEER-REVIEW',
    revision: '1',
    evidence: {
      source: 'Focused Issue #1321 effective-projection discriminator.',
      acceptanceBasis: 'Reviewed replacement of explicit source weight for the active calculation.',
    },
  })],
});
const coreOverrideLedger = resolveNonFeaEnrichment({
  sourceModel,
  sidecar: overrideSidecar,
});
assert.equal(coreOverrideLedger.status, 'READY');
const legacyOverrideRow = rowFor(coreOverrideLedger);
assert.equal(legacyOverrideRow.selected.authority, 'SOURCE_EXPLICIT',
  'legacy CORE source-first selection is the historical divergence this bridge must correct');
assert.equal(legacyOverrideRow.selected.value, 10);

const effectiveOverride = createNonFeaEffectiveCommonInputProjection({
  sourceModel,
  candidateResolutionLedger: coreOverrideLedger,
});
const effectiveOverrideRow = rowFor(effectiveOverride.resolutionLedger);
assert.equal(effectiveOverrideRow.selected.authority, 'ACCEPTED_OVERRIDE');
assert.equal(effectiveOverrideRow.selected.value, 99);
assert.equal(
  effectiveOverrideRow.effectiveSelection.resolverSemanticHash,
  effectiveOverride.effectiveValueResolutionLedger.semanticHash,
  'effective resolver receipt must be hash-bound into the downstream row',
);
assert.equal(
  effectiveOverride.enrichedProjection.enrichedModel.components[0]
    .engineeringProperties.unitPipeWeightKgPerM.value,
  99,
  'Common Input projected model must consume the effective winner, not legacy CORE selected source',
);
assert.equal(
  effectiveOverride.enrichedProjection.enrichedModel.components[0]
    .engineeringProperties.unitPipeWeightKgPerM.sourceKind,
  'ACCEPTED_OVERRIDE',
);
assert.equal(topologyHash(effectiveOverride.enrichedProjection.enrichedModel), sourceTopologyHash,
  'effective value projection must not alter governed topology/geometry');

const lowerAuthoritySidecar = createNonFeaEnrichmentSidecar({
  sourceSemanticHash: sourceModel.semanticHash,
  records: [
    record({
      recordId: 'MASTER-PIPE-WEIGHT-LOWER',
      authority: 'EXACT_APPROVED_MASTER',
      value: 20,
      sourceId: 'APPROVED-MASTER',
      revision: '7',
      evidence: { source: 'Exact approved master fixture.' },
    }),
    record({
      recordId: 'PROJECT-PIPE-WEIGHT-LOWER',
      authority: 'PROJECT_CONFIGURED_DEFAULT',
      value: 30,
      sourceId: 'PROJECT-DATA',
      revision: '8',
      evidence: {
        source: 'Project configured default fixture.',
        defaultId: 'CFG-UNIT-PIPE-WEIGHT',
        scope: { kind: 'ENTITY', key: componentKey },
        basis: 'Focused precedence discriminator.',
      },
    }),
    record({
      recordId: 'PRODUCT-PIPE-WEIGHT-LOWER',
      authority: 'PRODUCT_DEFAULT',
      value: 40,
      sourceId: 'LOAD_CALC_STANDARD_DEFAULTS_TEST',
      revision: '9',
      evidence: {
        source: 'Product engineering default fixture.',
        defaultId: 'PD-UNIT-PIPE-WEIGHT',
        defaultSemanticHash: 'fnv1a64:1111111111111111',
        productDefaultProfileSemanticHash: 'fnv1a64:2222222222222222',
      },
    }),
  ],
});
const coreLowerLedger = resolveNonFeaEnrichment({ sourceModel, sidecar: lowerAuthoritySidecar });
assert.equal(coreLowerLedger.status, 'READY');
const effectiveLower = createNonFeaEffectiveCommonInputProjection({
  sourceModel,
  candidateResolutionLedger: coreLowerLedger,
});
const lowerRow = rowFor(effectiveLower.resolutionLedger);
assert.equal(lowerRow.selected.authority, 'SOURCE_EXPLICIT');
assert.equal(lowerRow.selected.value, 10,
  'master/configured/Product defaults must not displace an explicit source value');
assert.equal(
  effectiveLower.enrichedProjection.enrichedModel.components[0]
    .engineeringProperties.unitPipeWeightKgPerM.value,
  10,
);

assert.throws(() => createNonFeaEnrichmentSidecar({
  sourceSemanticHash: sourceModel.semanticHash,
  records: [
    record({ recordId: 'OVERRIDE-CONFLICT-A', authority: 'ACCEPTED_OVERRIDE', value: 91 }),
    record({ recordId: 'OVERRIDE-CONFLICT-B', authority: 'ACCEPTED_OVERRIDE', value: 92 }),
  ],
}), /Ambiguous same-authority/u,
'same-authority conflicts must fail before projection');

const legacyBase = {
  selectorKind: 'ENTITY',
  selectorKey: componentKey,
  fieldId: 'unitPipeWeightKgPerM',
  unit: 'kg/m',
  sourceId: 'LEGACY',
  revision: '1',
};
const migration = migrateFirstCutEnrichment({
  sourceSemanticHash: sourceModel.semanticHash,
  masterData: {
    schema: 'first-cut-master-data/v1',
    sourceId: 'MASTER',
    revision: '1',
    records: [{ ...legacyBase, recordId: 'LEGACY-MASTER', value: 20 }],
  },
  bindings: [{
    ...legacyBase,
    recordId: 'LEGACY-OVERRIDE',
    value: 99,
    authorityLevel: 'ACCEPTED_OVERRIDE',
  }],
});
assert.equal(migration.status, 'BLOCKED');
assert.ok(migration.blockers.some((row) => row.code === 'LEGACY_PRECEDENCE_CHANGE_REQUIRES_DECISION'));
const migrationSidecar = createNonFeaEnrichmentSidecar({
  sourceSemanticHash: sourceModel.semanticHash,
  records: migration.records,
});
const blockedMigrationLedger = resolveNonFeaEnrichment({
  sourceModel,
  sidecar: migrationSidecar,
});
assert.equal(blockedMigrationLedger.status, 'BLOCKED');
assert.throws(() => createNonFeaEffectiveCommonInputProjection({
  sourceModel,
  candidateResolutionLedger: blockedMigrationLedger,
}), /blocked CORE candidate-resolution ledger/u,
'legacy migration precedence blockers must remain fail-closed');

assert.equal(sourceModel.semanticHash, sourceModelHashBefore, 'source semantic hash changed');
assert.equal(JSON.stringify(sourceModel.components[0]), sourceComponentBefore, 'source component mutated');
assert.equal(topologyHash(sourceModel), sourceTopologyHash, 'source topology changed');

console.log(JSON.stringify({
  status: 'PASS',
  legacyCoreWinner: `${legacyOverrideRow.selected.authority}:${legacyOverrideRow.selected.value}`,
  effectiveWinner: `${effectiveOverrideRow.selected.authority}:${effectiveOverrideRow.selected.value}`,
  lowerAuthorityWinner: `${lowerRow.selected.authority}:${lowerRow.selected.value}`,
  sourceImmutable: true,
  topologyUnchanged: true,
  sameAuthorityConflictFailClosed: true,
  migrationPrecedenceBlockerFailClosed: true,
  effectiveResolverSemanticHash: effectiveOverride.effectiveValueResolutionLedger.semanticHash,
  downstreamResolutionSemanticHash: effectiveOverride.resolutionLedger.semanticHash,
  enrichedProjectionSemanticHash: effectiveOverride.enrichedProjection.semanticHash,
}, null, 2));

function record({
  recordId,
  authority,
  value,
  sourceId = 'TEST',
  revision = '1',
  evidence = { source: 'Focused Issue #1321 fixture.' },
}) {
  return {
    recordId,
    selectorKind: 'ENTITY',
    selectorKey: componentKey,
    fieldId: 'UNIT_PIPE_WEIGHT',
    value,
    unit: 'kg/m',
    authority,
    sourceId,
    revision,
    evidence,
  };
}

function rowFor(ledger) {
  const row = ledger.rows.find((item) => (
    item.targetKind === 'COMPONENT'
    && item.targetId === componentKey
    && item.fieldId === 'UNIT_PIPE_WEIGHT'
  ));
  assert.ok(row, 'UNIT_PIPE_WEIGHT resolution row is required');
  return row;
}

function topologyHash(model) {
  return semanticHash({
    project: model.project,
    units: model.units,
    sourceSnapshotRef: model.sourceSnapshotRef,
    components: model.components.map((row) => ({
      componentKey: row.componentKey,
      sourceEntityId: row.sourceEntityId,
      type: row.type,
      identity: row.identity,
      geometry: row.geometry,
      ports: row.ports,
    })),
    supports: model.supports.map((row) => ({
      supportKey: row.supportKey,
      sourceEntityId: row.sourceEntityId,
      type: row.type,
      position: row.position,
      attachment: row.attachment,
      hostComponentKey: row.hostComponentKey,
      hostPortKey: row.hostPortKey,
    })),
  });
}
