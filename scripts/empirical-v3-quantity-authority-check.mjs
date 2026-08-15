import assert from 'node:assert/strict';
import {
  ENGINEERING_QUANTITY_AUTHORITY_SCHEMA,
  deriveEngineeringQuantityAuthority,
  requireEngineeringQuantityAuthority,
  sealEngineeringQuantityAuthority,
} from '../src/core/empirical-v3-safety/quantity-authority.js';

function sourceQuantity({
  quantityId,
  quantityKind,
  value,
  unit,
  authorityClass = 'SOURCE_EXACT',
  sourceType = 'SOURCE_FIELD',
  riskRefs = [],
  confirmationRef = null,
}) {
  return sealEngineeringQuantityAuthority({
    schema: ENGINEERING_QUANTITY_AUTHORITY_SCHEMA,
    quantityId,
    quantityKind,
    scopeRef: 'component:P-001',
    value,
    unit,
    authorityClass,
    sourceBinding: {
      sourceType,
      sourceReference: `/components/P-001/${quantityKind}`,
      sourceSemanticHash: `fnv1a64:${quantityId.padEnd(16, '0').slice(0, 16)}`,
      evidenceRef: `source:${quantityId}`,
      evidenceHash: `fnv1a64:${quantityId.padStart(16, '0').slice(-16)}`,
    },
    derivation: null,
    riskRefs,
    confirmationRef,
  });
}

const od = sourceQuantity({ quantityId: 'od', quantityKind: 'OD', value: 168.3, unit: 'mm' });
const exactWall = sourceQuantity({ quantityId: 'wt', quantityKind: 'WT', value: 7.11, unit: 'mm' });
const density = sourceQuantity({ quantityId: 'rho', quantityKind: 'METAL_DENSITY', value: 7850, unit: 'kg/m3' });

assert.equal(requireEngineeringQuantityAuthority(od).authorityClass, 'SOURCE_EXACT');

assert.throws(() => sourceQuantity({
  quantityId: 'wall-fallback',
  quantityKind: 'WT',
  value: 7.11,
  unit: 'mm',
  sourceType: 'LEGACY_FALLBACK',
}), /cannot be promoted to SOURCE_EXACT/);

const inferredWall = sourceQuantity({
  quantityId: 'wall-inferred',
  quantityKind: 'WT',
  value: 7.11,
  unit: 'mm',
  authorityClass: 'INFERRED_REVIEW_REQUIRED',
  sourceType: 'HEURISTIC',
  riskRefs: ['risk:wall-assumption'],
});
assert.equal(inferredWall.authorityClass, 'INFERRED_REVIEW_REQUIRED');

const exactArea = deriveEngineeringQuantityAuthority({
  quantityId: 'pipe-area-exact',
  quantityKind: 'AREA',
  scopeRef: 'component:P-001',
  value: 0.0036,
  unit: 'm2',
  formulaId: 'EMP-SEC-001',
  parents: [od, exactWall],
});
assert.equal(exactArea.authorityClass, 'DERIVED_EXACT');

const exactMass = deriveEngineeringQuantityAuthority({
  quantityId: 'pipe-mass-exact',
  quantityKind: 'MASS_PER_LENGTH',
  scopeRef: 'component:P-001',
  value: 28.26,
  unit: 'kg/m',
  formulaId: 'EMP-WGT-001',
  parents: [exactArea, density],
});
assert.equal(exactMass.authorityClass, 'DERIVED_EXACT');

const inferredArea = deriveEngineeringQuantityAuthority({
  quantityId: 'pipe-area-inferred',
  quantityKind: 'AREA',
  scopeRef: 'component:P-001',
  value: 0.0036,
  unit: 'm2',
  formulaId: 'EMP-SEC-001',
  parents: [od, inferredWall],
});
assert.equal(inferredArea.authorityClass, 'INFERRED_REVIEW_REQUIRED');
assert.deepEqual(inferredArea.riskRefs, ['risk:wall-assumption']);

const unresolvedWeight = sealEngineeringQuantityAuthority({
  schema: ENGINEERING_QUANTITY_AUTHORITY_SCHEMA,
  quantityId: 'valve-weight',
  quantityKind: 'COMPONENT_WEIGHT',
  scopeRef: 'component:V-001',
  value: null,
  unit: 'kg',
  authorityClass: 'UNRESOLVED',
  sourceBinding: null,
  derivation: null,
  riskRefs: ['risk:missing-component-weight'],
  confirmationRef: null,
});
assert.equal(unresolvedWeight.value, null);

assert.throws(() => sealEngineeringQuantityAuthority({
  schema: ENGINEERING_QUANTITY_AUTHORITY_SCHEMA,
  quantityId: 'valve-weight-zero',
  quantityKind: 'COMPONENT_WEIGHT',
  scopeRef: 'component:V-001',
  value: 0,
  unit: 'kg',
  authorityClass: 'UNRESOLVED',
  sourceBinding: null,
  derivation: null,
  riskRefs: ['risk:missing-component-weight'],
  confirmationRef: null,
}), /must be null for unresolved quantity/);

assert.throws(() => sourceQuantity({
  quantityId: 'zero-fallback',
  quantityKind: 'COMPONENT_WEIGHT',
  value: 0,
  unit: 'kg',
  sourceType: 'DEFAULT_ZERO',
}), /cannot be promoted to SOURCE_EXACT/);

const confirmedWall = sourceQuantity({
  quantityId: 'wall-confirmed',
  quantityKind: 'WT',
  value: 7.11,
  unit: 'mm',
  authorityClass: 'ASSUMED_CONFIRMED',
  sourceType: 'HEURISTIC',
  riskRefs: ['risk:wall-assumption'],
  confirmationRef: 'confirmation:wall-assumption:1',
});
const confirmedArea = deriveEngineeringQuantityAuthority({
  quantityId: 'pipe-area-confirmed',
  quantityKind: 'AREA',
  scopeRef: 'component:P-001',
  value: 0.0036,
  unit: 'm2',
  formulaId: 'EMP-SEC-001',
  parents: [od, confirmedWall],
});
assert.equal(confirmedArea.authorityClass, 'ASSUMED_CONFIRMED');
assert.equal(confirmedArea.confirmationRef, 'confirmation:wall-assumption:1');
assert.deepEqual(confirmedArea.riskRefs, ['risk:wall-assumption']);

const unresolvedDerived = deriveEngineeringQuantityAuthority({
  quantityId: 'derived-unresolved-weight',
  quantityKind: 'TOTAL_COMPONENT_WEIGHT',
  scopeRef: 'component:V-001',
  unit: 'kg',
  formulaId: 'EMP-WGT-099',
  parents: [unresolvedWeight],
});
assert.equal(unresolvedDerived.authorityClass, 'UNRESOLVED');
assert.equal(unresolvedDerived.value, null);

const tampered = { ...exactMass, value: exactMass.value + 1 };
assert.throws(() => requireEngineeringQuantityAuthority(tampered), /semantic hash mismatch/);

assert.throws(() => sealEngineeringQuantityAuthority({
  schema: ENGINEERING_QUANTITY_AUTHORITY_SCHEMA,
  quantityId: 'source-no-evidence',
  quantityKind: 'WT',
  scopeRef: 'component:P-001',
  value: 7.11,
  unit: 'mm',
  authorityClass: 'SOURCE_EXACT',
  sourceBinding: {
    sourceType: 'SOURCE_FIELD',
    sourceReference: '/components/P-001/WT',
    sourceSemanticHash: 'fnv1a64:1111111111111111',
    evidenceRef: null,
    evidenceHash: null,
  },
  derivation: null,
  riskRefs: [],
  confirmationRef: null,
}), /requires immutable source evidence reference and hash/);

console.log('PASS empirical V3 engineering quantity authority contract');
