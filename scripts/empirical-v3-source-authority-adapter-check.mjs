import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/empirical-piping-mechanics/identity.js';
import {
  adaptLegacyNumericResolution,
  adaptSealedDeclaredNumericField,
} from '../src/workspace/engineering-loads/adapters/empirical-v3-source-authority-adapter.js';
import {
  adaptResolutionReference,
  requireAdaptedResolutionReference,
} from '../src/workspace/engineering-loads/adapters/empirical-v3-resolution-reference-adapter.js';

const runId = 'RUN:V3:SOURCE-ADAPTER';
const h = (value) => semanticHash({ value });

const fallbackWall = adaptLegacyNumericResolution({
  runId,
  quantityId: 'Q:P1:WT',
  quantityKind: 'WALL_THICKNESS',
  scopeRef: 'P1',
  value: 7.11,
  unit: 'mm',
  source: 'legacy-fallback',
  sourceReference: 'fallbackResolver.wallThicknessMm',
  flags: ['_deducedWallThickness'],
  required: true,
});
assert.equal(fallbackWall.quantity.authorityClass, 'INFERRED_REVIEW_REQUIRED');
assert.equal(fallbackWall.risk.riskClass, 'HIGH_CONFIRM');
assert.notEqual(fallbackWall.quantity.authorityClass, 'SOURCE_EXACT');
assert.notEqual(fallbackWall.quantity.authorityClass, 'APPROVED_MASTER_EXACT');

const missingWeight = adaptLegacyNumericResolution({
  runId,
  quantityId: 'Q:V1:WEIGHT',
  quantityKind: 'COMPONENT_WEIGHT',
  scopeRef: 'V1',
  value: 0,
  unit: 'kg',
  source: 'default-zero',
  sourceReference: 'fallbackResolver.componentWeightKg',
  flags: ['_missingComponentWeight'],
  required: true,
});
assert.equal(missingWeight.quantity.authorityClass, 'UNRESOLVED');
assert.equal(missingWeight.quantity.value, null);
assert.equal(missingWeight.risk.riskClass, 'HIGH_BLOCK');

const defaultInsulation = adaptLegacyNumericResolution({
  runId,
  quantityId: 'Q:BR1:INS-THK',
  quantityKind: 'INSULATION_THICKNESS',
  scopeRef: 'BR1',
  value: 0,
  unit: 'mm',
  source: 'default-zero',
  sourceReference: 'fallbackResolver.insulationThicknessMm',
  required: false,
});
assert.equal(defaultInsulation.quantity.authorityClass, 'INFERRED_REVIEW_REQUIRED');
assert.equal(defaultInsulation.risk.riskClass, 'HIGH_CONFIRM');

const exactWall = adaptLegacyNumericResolution({
  runId,
  quantityId: 'Q:P1:WT:MASTER',
  quantityKind: 'WALL_THICKNESS',
  scopeRef: 'P1',
  value: 7.11,
  unit: 'mm',
  source: 'piping-class-master',
  sourceReference: 'master:class-row:DN150:SCH40',
  sourceSemanticHash: h('master-row'),
  evidenceRef: 'master-row-evidence',
  evidenceHash: h('master-evidence'),
  exactMasterApproved: true,
  needsReview: false,
  matchMethod: 'exact',
  required: true,
});
assert.equal(exactWall.quantity.authorityClass, 'APPROVED_MASTER_EXACT');
assert.equal(exactWall.risk, null);

const exactDeclared = adaptSealedDeclaredNumericField({
  quantityId: 'Q:BR1:TOP',
  quantityKind: 'OPERATING_TEMPERATURE',
  scopeRef: 'E:PIPE-1',
  fieldName: 'operatingTemperature',
  authorityRef: {
    ref: 'staged-process:E:PIPE-1',
    semanticHash: h('process-authority'),
    evidenceHash: h('process-authority-evidence'),
  },
  field: {
    status: 'DECLARED',
    value: 393.15,
    unit: 'K',
    evidence: [{ source: 'staged-json', locator: '/entities/0/Tope', sourceSemanticHash: h('source') }],
  },
});
assert.equal(exactDeclared.authorityClass, 'SOURCE_EXACT');

const fuzzyClass = adaptResolutionReference({
  runId,
  kind: 'PIPING_CLASS',
  ref: '91261M7',
  source: 'piping-class-resolver',
  sourceSemanticHash: h('class-index'),
  matchMethod: 'fuzzy-ratio',
  needsReview: false,
  entityIds: ['P1'],
});
assert.equal(fuzzyClass.record.authorityClass, 'INFERRED_REVIEW_REQUIRED');
assert.equal(fuzzyClass.record.needsReview, true);
assert.equal(fuzzyClass.risk.riskClass, 'HIGH_CONFIRM');

const exactClass = adaptResolutionReference({
  runId,
  kind: 'PIPING_CLASS',
  ref: '91261M7',
  source: 'approved-piping-class-master',
  sourceSemanticHash: h('class-index'),
  matchMethod: 'exact',
  needsReview: false,
  exactMasterApproved: true,
  entityIds: ['P1'],
});
assert.equal(exactClass.record.authorityClass, 'APPROVED_MASTER_EXACT');
assert.equal(exactClass.record.needsReview, false);
assert.equal(exactClass.risk, null);

const exactWithoutSourceHash = adaptResolutionReference({
  runId,
  kind: 'PIPING_CLASS',
  ref: '91261M7',
  source: 'approved-piping-class-master',
  matchMethod: 'exact',
  needsReview: false,
  exactMasterApproved: true,
  entityIds: ['P1'],
});
assert.equal(exactWithoutSourceHash.record.authorityClass, 'INFERRED_REVIEW_REQUIRED');
assert.equal(exactWithoutSourceHash.record.needsReview, true);
assert.equal(exactWithoutSourceHash.risk.riskClass, 'HIGH_CONFIRM');

const forgedExactMaterial = {
  schema: exactClass.record.schema,
  kind: exactClass.record.kind,
  ref: exactClass.record.ref,
  authorityClass: 'APPROVED_MASTER_EXACT',
  source: exactClass.record.source,
  sourceSemanticHash: null,
  matchMethod: exactClass.record.matchMethod,
  needsReview: false,
};
const forgedExact = {
  ...forgedExactMaterial,
  semanticHash: semanticHash(forgedExactMaterial),
};
assert.throws(
  () => requireAdaptedResolutionReference(forgedExact),
  /requires an immutable source semantic hash/,
);

const missingMaterial = adaptResolutionReference({
  runId,
  kind: 'MATERIAL_MAPPING',
  ref: null,
  source: 'material-resolver',
  matchMethod: 'none',
  needsReview: false,
  entityIds: ['P1'],
});
assert.equal(missingMaterial.record.authorityClass, 'UNRESOLVED');
assert.equal(missingMaterial.record.needsReview, true);
assert.equal(missingMaterial.risk.riskClass, 'HIGH_BLOCK');

console.log('PASS empirical-v3-source-authority-adapter-check');
