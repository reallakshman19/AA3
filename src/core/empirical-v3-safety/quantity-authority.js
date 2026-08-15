import { semanticHash } from '../empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../shared-primitives/immutable.js';

export const ENGINEERING_QUANTITY_AUTHORITY_SCHEMA = 'engineering-quantity-authority/v1';

export const ENGINEERING_QUANTITY_AUTHORITY_CLASSES = Object.freeze([
  'SOURCE_EXACT',
  'APPROVED_MASTER_EXACT',
  'DERIVED_EXACT',
  'INFERRED_REVIEW_REQUIRED',
  'ASSUMED_CONFIRMED',
  'UNRESOLVED',
]);

const EXACT_PARENT_CLASSES = new Set(['SOURCE_EXACT', 'APPROVED_MASTER_EXACT', 'DERIVED_EXACT']);
const NON_EXACT_SOURCE_TYPES = new Set([
  'LEGACY_FALLBACK',
  'CONFIG_DEFAULT',
  'DEFAULT_ZERO',
  'HEURISTIC',
  'FUZZY_MATCH',
  'SERVICE_FALLBACK',
  'SCREENING_TABLE',
  'INTERPOLATED_UNAPPROVED',
  'EXTRAPOLATED',
]);

export function sealEngineeringQuantityAuthority(input) {
  const normalized = normalizeQuantityAuthority(input, false);
  validateAuthoritySemantics(normalized);
  const sealed = {
    ...normalized,
    semanticHash: semanticHash(quantitySemanticProjection(normalized)),
  };
  sealed.evidenceHash = semanticHash(quantityEvidenceProjection(sealed));
  return deepFreeze(sealed);
}

export function requireEngineeringQuantityAuthority(value) {
  const normalized = normalizeQuantityAuthority(value, true);
  validateAuthoritySemantics(normalized);
  const expectedSemanticHash = semanticHash(quantitySemanticProjection(normalized));
  if (normalized.semanticHash !== expectedSemanticHash) {
    throw new Error('Engineering quantity authority semantic hash mismatch.');
  }
  const expectedEvidenceHash = semanticHash(quantityEvidenceProjection(normalized));
  if (normalized.evidenceHash !== expectedEvidenceHash) {
    throw new Error('Engineering quantity authority evidence hash mismatch.');
  }
  return deepFreeze(normalized);
}

export function deriveEngineeringQuantityAuthority(input) {
  const parents = requireParents(input.parents);
  const authorityClass = deriveAuthorityClassFromParents(parents);
  const unresolved = authorityClass === 'UNRESOLVED';
  return sealEngineeringQuantityAuthority({
    schema: ENGINEERING_QUANTITY_AUTHORITY_SCHEMA,
    quantityId: requireText(input.quantityId, 'quantityId'),
    quantityKind: requireText(input.quantityKind, 'quantityKind'),
    scopeRef: requireText(input.scopeRef, 'scopeRef'),
    value: unresolved ? null : requireFinite(input.value, 'value'),
    unit: requireText(input.unit, 'unit'),
    authorityClass,
    sourceBinding: null,
    derivation: {
      formulaId: requireText(input.formulaId, 'formulaId'),
      formulaVersion: requireText(input.formulaVersion ?? '1', 'formulaVersion'),
      parentQuantityRefs: parents.map((parent) => ({
        quantityId: parent.quantityId,
        semanticHash: parent.semanticHash,
        authorityClass: parent.authorityClass,
      })),
    },
    riskRefs: uniqueTextList([
      ...(input.riskRefs ?? []),
      ...parents.flatMap((parent) => parent.riskRefs),
    ], 'riskRefs'),
    confirmationRef: deriveConfirmationRef(parents, input.confirmationRef),
  });
}

export function deriveAuthorityClassFromParents(parents) {
  const accepted = requireParents(parents);
  if (accepted.some((parent) => parent.authorityClass === 'UNRESOLVED')) return 'UNRESOLVED';
  if (accepted.some((parent) => parent.authorityClass === 'INFERRED_REVIEW_REQUIRED')) {
    return 'INFERRED_REVIEW_REQUIRED';
  }
  if (accepted.some((parent) => parent.authorityClass === 'ASSUMED_CONFIRMED')) {
    return 'ASSUMED_CONFIRMED';
  }
  if (accepted.every((parent) => EXACT_PARENT_CLASSES.has(parent.authorityClass))) return 'DERIVED_EXACT';
  throw new Error('Unsupported parent authority class combination.');
}

export function quantitySemanticProjection(value) {
  return {
    schema: value.schema,
    quantityId: value.quantityId,
    quantityKind: value.quantityKind,
    scopeRef: value.scopeRef,
    value: value.value,
    unit: value.unit,
    authorityClass: value.authorityClass,
    sourceBinding: value.sourceBinding ? {
      sourceType: value.sourceBinding.sourceType,
      sourceReference: value.sourceBinding.sourceReference,
      sourceSemanticHash: value.sourceBinding.sourceSemanticHash,
    } : null,
    derivation: value.derivation,
    riskRefs: value.riskRefs,
    confirmationRef: value.confirmationRef,
  };
}

export function quantityEvidenceProjection(value) {
  return {
    semanticHash: value.semanticHash,
    sourceEvidence: value.sourceBinding ? {
      evidenceRef: value.sourceBinding.evidenceRef,
      evidenceHash: value.sourceBinding.evidenceHash,
    } : null,
  };
}

function normalizeQuantityAuthority(input, sealed) {
  if (!input || typeof input !== 'object') throw new TypeError('Engineering quantity authority must be an object.');
  const authorityClass = requireEnum(input.authorityClass, ENGINEERING_QUANTITY_AUTHORITY_CLASSES, 'authorityClass');
  return {
    schema: requireSchema(input.schema),
    quantityId: requireText(input.quantityId, 'quantityId'),
    quantityKind: requireText(input.quantityKind, 'quantityKind'),
    scopeRef: requireText(input.scopeRef, 'scopeRef'),
    value: authorityClass === 'UNRESOLVED' ? normalizeNull(input.value, 'value') : requireFinite(input.value, 'value'),
    unit: requireText(input.unit, 'unit'),
    authorityClass,
    sourceBinding: normalizeSourceBinding(input.sourceBinding),
    derivation: normalizeDerivation(input.derivation),
    riskRefs: uniqueTextList(input.riskRefs ?? [], 'riskRefs'),
    confirmationRef: optionalText(input.confirmationRef),
    semanticHash: sealed ? requireText(input.semanticHash, 'semanticHash') : '',
    evidenceHash: sealed ? requireText(input.evidenceHash, 'evidenceHash') : '',
  };
}

function validateAuthoritySemantics(value) {
  const exactSource = value.authorityClass === 'SOURCE_EXACT' || value.authorityClass === 'APPROVED_MASTER_EXACT';
  if (exactSource) {
    if (!value.sourceBinding) throw new Error(`${value.authorityClass} requires source binding.`);
    if (NON_EXACT_SOURCE_TYPES.has(value.sourceBinding.sourceType)) {
      throw new Error(`${value.sourceBinding.sourceType} cannot be promoted to ${value.authorityClass}.`);
    }
    if (!value.sourceBinding.evidenceRef || !value.sourceBinding.evidenceHash) {
      throw new Error(`${value.authorityClass} requires immutable source evidence reference and hash.`);
    }
    if (value.derivation) throw new Error(`${value.authorityClass} cannot also claim a derivation.`);
  }

  if (value.authorityClass === 'DERIVED_EXACT') {
    requireExactDerivation(value.derivation);
    if (value.sourceBinding) throw new Error('DERIVED_EXACT cannot claim direct source authority.');
  }

  if (value.authorityClass === 'INFERRED_REVIEW_REQUIRED' && value.riskRefs.length === 0) {
    throw new Error('INFERRED_REVIEW_REQUIRED requires at least one risk reference.');
  }

  if (value.authorityClass === 'ASSUMED_CONFIRMED') {
    if (value.riskRefs.length === 0) throw new Error('ASSUMED_CONFIRMED requires at least one risk reference.');
    if (!value.confirmationRef) throw new Error('ASSUMED_CONFIRMED requires an immutable confirmation reference.');
  }

  if (value.authorityClass === 'UNRESOLVED') {
    if (value.value !== null) throw new Error('UNRESOLVED quantity must not carry a scalar value.');
    if (value.confirmationRef) throw new Error('UNRESOLVED quantity cannot carry a confirmation reference.');
    if (value.riskRefs.length === 0) throw new Error('UNRESOLVED quantity requires at least one blocking risk reference.');
  }
}

function requireExactDerivation(derivation) {
  if (!derivation || derivation.parentQuantityRefs.length === 0) {
    throw new Error('DERIVED_EXACT requires formula and parent quantity references.');
  }
  for (const parent of derivation.parentQuantityRefs) {
    if (!EXACT_PARENT_CLASSES.has(parent.authorityClass)) {
      throw new Error(`DERIVED_EXACT parent ${parent.quantityId} is not exact.`);
    }
  }
}

function normalizeSourceBinding(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') throw new TypeError('sourceBinding must be an object or null.');
  return {
    sourceType: requireText(value.sourceType, 'sourceBinding.sourceType'),
    sourceReference: requireText(value.sourceReference, 'sourceBinding.sourceReference'),
    sourceSemanticHash: requireText(value.sourceSemanticHash, 'sourceBinding.sourceSemanticHash'),
    evidenceRef: optionalText(value.evidenceRef),
    evidenceHash: optionalText(value.evidenceHash),
  };
}

function normalizeDerivation(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') throw new TypeError('derivation must be an object or null.');
  const refs = Array.isArray(value.parentQuantityRefs) ? value.parentQuantityRefs : [];
  return {
    formulaId: requireText(value.formulaId, 'derivation.formulaId'),
    formulaVersion: requireText(value.formulaVersion, 'derivation.formulaVersion'),
    parentQuantityRefs: refs.map((ref, index) => ({
      quantityId: requireText(ref?.quantityId, `derivation.parentQuantityRefs[${index}].quantityId`),
      semanticHash: requireText(ref?.semanticHash, `derivation.parentQuantityRefs[${index}].semanticHash`),
      authorityClass: requireEnum(
        ref?.authorityClass,
        ENGINEERING_QUANTITY_AUTHORITY_CLASSES,
        `derivation.parentQuantityRefs[${index}].authorityClass`,
      ),
    })),
  };
}

function requireParents(value) {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError('parents must contain at least one quantity authority.');
  return value.map(requireEngineeringQuantityAuthority);
}

function deriveConfirmationRef(parents, explicit) {
  const inherited = uniqueTextList(
    parents.map((parent) => parent.confirmationRef).filter(Boolean),
    'parent confirmation refs',
  );
  const supplied = optionalText(explicit);
  if (supplied) return supplied;
  if (inherited.length > 1) {
    throw new Error('Derived assumed quantity with multiple confirmations requires an explicit bundle confirmation reference.');
  }
  return inherited[0] ?? null;
}

function requireSchema(value) {
  if (value !== ENGINEERING_QUANTITY_AUTHORITY_SCHEMA) {
    throw new TypeError(`Expected schema ${ENGINEERING_QUANTITY_AUTHORITY_SCHEMA}.`);
  }
  return value;
}

function requireEnum(value, allowed, fieldName) {
  if (!allowed.includes(value)) throw new TypeError(`${fieldName} is invalid.`);
  return value;
}

function requireFinite(value, fieldName) {
  if (!Number.isFinite(value)) throw new TypeError(`${fieldName} must be finite.`);
  return Object.is(value, -0) ? 0 : value;
}

function normalizeNull(value, fieldName) {
  if (value !== null && value !== undefined) throw new TypeError(`${fieldName} must be null for unresolved quantity.`);
  return null;
}

function requireText(value, fieldName) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${fieldName} is required.`);
  return text;
}

function optionalText(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

function uniqueTextList(value, fieldName) {
  if (!Array.isArray(value)) throw new TypeError(`${fieldName} must be an array.`);
  return [...new Set(value.map((item, index) => requireText(item, `${fieldName}[${index}]`)))].sort();
}
