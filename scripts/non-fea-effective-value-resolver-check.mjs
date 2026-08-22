#!/usr/bin/env node

import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  PRODUCT_DEFAULT_AUTHORITY,
  createNonFeaEffectiveValueCandidate,
  resolveNonFeaEffectiveValue,
  resolveNonFeaEffectiveValues,
} from '../src/workspace/project-data/non-fea-effective-value-resolver.js';

const productEvidence = Object.freeze({
  defaultId: 'PD-ELASTIC-THERMAL',
  defaultSemanticHash: 'fnv1a64:1111111111111111',
  productDefaultProfileSemanticHash: 'fnv1a64:2222222222222222',
});

const sourceOd = candidate({
  candidateId: 'SRC-OD',
  fieldId: 'PIPE_OUTER_DIAMETER',
  value: 168.3,
  unit: 'mm',
  authority: 'SOURCE_EXPLICIT',
  sourceId: 'SJSON:/PIPE-1/OD',
});
const masterOd = candidate({
  candidateId: 'MASTER-OD',
  fieldId: 'PIPE_OUTER_DIAMETER',
  value: 168.3,
  unit: 'mm',
  authority: 'EXACT_APPROVED_MASTER',
  sourceId: 'PCL:CS150:6IN',
});
const productOd = candidate({
  candidateId: 'PD-OD',
  fieldId: 'PIPE_OUTER_DIAMETER',
  value: 114.3,
  unit: 'mm',
  authority: PRODUCT_DEFAULT_AUTHORITY,
  sourceId: 'LOAD_CALC_STANDARD_DEFAULTS_TEST',
  evidence: {
    defaultId: 'PD-TEST-OD',
    defaultSemanticHash: 'fnv1a64:3333333333333333',
    productDefaultProfileSemanticHash: 'fnv1a64:4444444444444444',
  },
});

const sourceWins = resolveNonFeaEffectiveValue([productOd, masterOd, sourceOd]);
assert.equal(sourceWins.status, 'RESOLVED');
assert.equal(sourceWins.selected.candidateId, 'SRC-OD');
assert.equal(sourceWins.selected.value, 168.3);
assert.deepEqual(sourceWins.shadowedCandidateIds, ['MASTER-OD', 'PD-OD']);

const masterWins = resolveNonFeaEffectiveValue([
  candidate({
    candidateId: 'PROJECT-DEFAULT-DENSITY',
    fieldId: 'MATERIAL_DENSITY',
    value: 7800,
    unit: 'kg/m3',
    authority: 'PROJECT_CONFIGURED_DEFAULT',
    sourceId: 'PROJECT:DEFAULT:DENSITY',
  }),
  candidate({
    candidateId: 'MASTER-DENSITY',
    fieldId: 'MATERIAL_DENSITY',
    value: 7850,
    unit: 'kg/m3',
    authority: 'EXACT_APPROVED_MASTER',
    sourceId: 'PCL:MAT:A106B',
  }),
]);
assert.equal(masterWins.selected.candidateId, 'MASTER-DENSITY');
assert.equal(masterWins.selected.value, 7850);

const productElastic = candidate({
  candidateId: 'PD-E',
  fieldId: 'ELASTIC_MODULUS',
  value: 2.0e11,
  unit: 'Pa',
  authority: PRODUCT_DEFAULT_AUTHORITY,
  sourceId: 'LOAD_CALC_STANDARD_DEFAULTS_V1',
  evidence: productEvidence,
});
const productAlpha = candidate({
  candidateId: 'PD-ALPHA',
  fieldId: 'THERMAL_EXPANSION_COEFFICIENT',
  value: 12e-6,
  unit: '1/K',
  authority: PRODUCT_DEFAULT_AUTHORITY,
  sourceId: 'LOAD_CALC_STANDARD_DEFAULTS_V1',
  evidence: productEvidence,
});
const productOnly = resolveNonFeaEffectiveValues({
  candidates: [productAlpha, productElastic],
  sourceModelSemanticHash: 'fnv1a64:aaaaaaaaaaaaaaaa',
  enrichmentResolutionSemanticHash: 'fnv1a64:bbbbbbbbbbbbbbbb',
  projectDataProfileSemanticHash: 'fnv1a64:cccccccccccccccc',
  productDefaultProviderSemanticHash: 'fnv1a64:dddddddddddddddd',
});
assert.equal(productOnly.status, 'RESOLVED');
assert.equal(productOnly.summary.productDefaultSelectedCount, 2);
assert.equal(productOnly.summary.resolvedCount, 2);
assert.equal(productOnly.rows.find((row) => row.fieldId === 'ELASTIC_MODULUS').selected.value, 2e11);
assert.equal(productOnly.rows.find((row) => row.fieldId === 'THERMAL_EXPANSION_COEFFICIENT').selected.value, 12e-6);

const overrideDoesNotEraseSource = resolveNonFeaEffectiveValue([
  candidate({
    candidateId: 'SRC-WALL',
    fieldId: 'PIPE_WALL_THICKNESS',
    value: 7.11,
    unit: 'mm',
    authority: 'SOURCE_EXPLICIT',
    sourceId: 'SJSON:/PIPE-1/WALL',
  }),
  candidate({
    candidateId: 'OVERRIDE-WALL',
    fieldId: 'PIPE_WALL_THICKNESS',
    value: 6.35,
    unit: 'mm',
    authority: 'ACCEPTED_OVERRIDE',
    sourceId: 'OVERRIDE:WALL:1',
  }),
]);
assert.equal(overrideDoesNotEraseSource.selected.candidateId, 'SRC-WALL');

const conflict = resolveNonFeaEffectiveValue([
  candidate({
    candidateId: 'MASTER-A',
    fieldId: 'COMPONENT_WEIGHT',
    value: 120,
    unit: 'kg',
    authority: 'EXACT_APPROVED_MASTER',
    sourceId: 'WEIGHT-MASTER:A',
  }),
  candidate({
    candidateId: 'MASTER-B',
    fieldId: 'COMPONENT_WEIGHT',
    value: 125,
    unit: 'kg',
    authority: 'EXACT_APPROVED_MASTER',
    sourceId: 'WEIGHT-MASTER:B',
  }),
]);
assert.equal(conflict.status, 'BLOCKED');
assert.equal(conflict.selected, null);
assert.equal(conflict.blockers[0].code, 'EFFECTIVE_VALUE_SAME_AUTHORITY_CONFLICT');

const identicalSameAuthority = resolveNonFeaEffectiveValue([
  candidate({
    candidateId: 'MASTER-C',
    fieldId: 'COMPONENT_WEIGHT',
    value: 120,
    unit: 'kg',
    authority: 'EXACT_APPROVED_MASTER',
    sourceId: 'WEIGHT-MASTER:C',
  }),
  candidate({
    candidateId: 'MASTER-D',
    fieldId: 'COMPONENT_WEIGHT',
    value: 120,
    unit: 'kg',
    authority: 'EXACT_APPROVED_MASTER',
    sourceId: 'WEIGHT-MASTER:D',
  }),
]);
assert.equal(identicalSameAuthority.status, 'RESOLVED');
assert.equal(identicalSameAuthority.selected.value, 120);
assert.equal(identicalSameAuthority.shadowedCandidateIds.length, 1);

assert.throws(() => candidate({
  candidateId: 'BAD-PD-SUPPORT-SENSITIVITY',
  fieldId: 'SUPPORT_AVAILABILITY_SENSITIVITY',
  value: 'USER-DECLARED SUPPORT-UNAVAILABLE SENSITIVITY',
  unit: 'policy',
  authority: PRODUCT_DEFAULT_AUTHORITY,
  sourceId: 'BAD',
  evidence: productEvidence,
}), /PRODUCT_DEFAULT is not permitted/u);

assert.throws(() => candidate({
  candidateId: 'BAD-PD-NO-HASH',
  fieldId: 'ELASTIC_MODULUS',
  value: 2e11,
  unit: 'Pa',
  authority: PRODUCT_DEFAULT_AUTHORITY,
  sourceId: 'BAD',
  evidence: { defaultId: 'PD-E' },
}), /requires default ID and semantic-hash evidence/u);

const deterministicA = resolveNonFeaEffectiveValues({ candidates: [productOd, sourceOd, masterOd] });
const deterministicB = resolveNonFeaEffectiveValues({ candidates: [masterOd, productOd, sourceOd] });
assert.deepEqual(deterministicA, deterministicB);
assert.equal(deterministicA.semanticHash, semanticHash({
  schema: deterministicA.schema,
  status: deterministicA.status,
  bindings: deterministicA.bindings,
  rows: deterministicA.rows,
  summary: deterministicA.summary,
}));

const changed = resolveNonFeaEffectiveValues({
  candidates: [
    sourceOd,
    candidate({
      candidateId: 'PD-OD',
      fieldId: 'PIPE_OUTER_DIAMETER',
      value: 219.1,
      unit: 'mm',
      authority: PRODUCT_DEFAULT_AUTHORITY,
      sourceId: 'LOAD_CALC_STANDARD_DEFAULTS_TEST',
      evidence: {
        defaultId: 'PD-TEST-OD',
        defaultSemanticHash: 'fnv1a64:5555555555555555',
        productDefaultProfileSemanticHash: 'fnv1a64:4444444444444444',
      },
    }),
  ],
});
assert.notEqual(changed.semanticHash, deterministicA.semanticHash,
  'shadowed default changes must remain hash-visible even when source stays selected');

console.log(JSON.stringify({
  status: 'PASS',
  sourcePrecedenceSelected: sourceWins.selected.candidateId,
  masterPrecedenceSelected: masterWins.selected.candidateId,
  productDefaultSelectedCount: productOnly.summary.productDefaultSelectedCount,
  sameAuthorityConflict: conflict.blockers[0].code,
  deterministicSemanticHash: deterministicA.semanticHash,
}, null, 2));

function candidate(overrides) {
  return createNonFeaEffectiveValueCandidate({
    targetKind: 'ENTITY',
    targetId: 'PIPE-1',
    ...overrides,
  });
}
