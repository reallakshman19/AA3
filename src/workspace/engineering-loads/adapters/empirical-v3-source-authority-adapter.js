import { semanticHash } from '../../../core/empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../../../core/shared-primitives/immutable.js';
import {
  ENGINEERING_QUANTITY_AUTHORITY_SCHEMA,
  sealEngineeringQuantityAuthority,
} from '../../../core/empirical-v3-safety/quantity-authority.js';
import {
  ENGINEERING_RISK_FINDING_SCHEMA,
  sealEngineeringRiskFinding,
} from '../../../core/empirical-v3-safety/risk-finding.js';

const LEGACY_INFERENCE_SOURCES = new Set([
  'CONFIG_DEFAULT',
  'HEURISTIC',
  'FUZZY_MATCH',
  'LEGACY_FALLBACK',
  'SERVICE_FALLBACK',
  'SCREENING_TABLE',
  'INTERPOLATED_UNAPPROVED',
  'EXTRAPOLATED',
  'XML_FALLBACK',
]);

const MISSING_VALUE_FLAGS = new Set([
  '_missingComponentWeight',
  'MISSING_COMPONENT_WEIGHT',
]);

const INFERENCE_FLAGS = new Set([
  '_deducedFluidDensity',
  '_deducedFluidDensityHyd',
  '_deducedMetalDensity',
  '_deducedWallThickness',
  '_deducedInsulationDensity',
]);

/**
 * Converts one legacy numeric resolver observation into the governed V3
 * quantity/risk pair. Legacy finite values never become exact merely because
 * they are finite. Missing required values remain UNRESOLVED with HIGH_BLOCK.
 */
export function adaptLegacyNumericResolution(input) {
  const basis = normalizeLegacyBasis(input);
  const sourceType = classifyLegacySourceType(basis);
  const unresolved = basis.value === null
    || basis.flags.some((flag) => MISSING_VALUE_FLAGS.has(flag))
    || (sourceType === 'DEFAULT_ZERO' && basis.required === true);

  if (unresolved) {
    const risk = buildRisk(basis, {
      riskCode: 'EMP_V3_REQUIRED_QUANTITY_UNRESOLVED',
      riskClass: 'HIGH_BLOCK',
      reasonCode: sourceType === 'DEFAULT_ZERO'
        ? 'DEFAULT_ZERO_NOT_ENGINEERING_AUTHORITY'
        : 'REQUIRED_ENGINEERING_QUANTITY_MISSING',
      authorityClass: 'UNRESOLVED',
      value: null,
    });
    const quantity = sealEngineeringQuantityAuthority({
      schema: ENGINEERING_QUANTITY_AUTHORITY_SCHEMA,
      quantityId: basis.quantityId,
      quantityKind: basis.quantityKind,
      scopeRef: basis.scopeRef,
      value: null,
      unit: basis.unit,
      authorityClass: 'UNRESOLVED',
      sourceBinding: null,
      derivation: null,
      riskRefs: [risk.riskId],
      confirmationRef: null,
    });
    return deepFreeze({ quantity, risk, disposition: 'BLOCKED_UNRESOLVED' });
  }

  const exactMaster = basis.exactMasterApproved
    && sourceType === 'APPROVED_PIPING_CLASS_MASTER'
    && basis.needsReview === false;
  const exactSource = basis.exactSourceApproved
    && sourceType === 'SEALED_EXACT_SOURCE'
    && basis.needsReview === false;

  if (exactMaster || exactSource) {
    const authorityClass = exactMaster ? 'APPROVED_MASTER_EXACT' : 'SOURCE_EXACT';
    const quantity = sealEngineeringQuantityAuthority({
      schema: ENGINEERING_QUANTITY_AUTHORITY_SCHEMA,
      quantityId: basis.quantityId,
      quantityKind: basis.quantityKind,
      scopeRef: basis.scopeRef,
      value: basis.value,
      unit: basis.unit,
      authorityClass,
      sourceBinding: sourceBinding(basis, sourceType),
      derivation: null,
      riskRefs: [],
      confirmationRef: null,
    });
    return deepFreeze({ quantity, risk: null, disposition: authorityClass });
  }

  const risk = buildRisk(basis, {
    riskCode: riskCodeForSource(sourceType),
    riskClass: 'HIGH_CONFIRM',
    reasonCode: reasonCodeForSource(sourceType, basis),
    authorityClass: 'INFERRED_REVIEW_REQUIRED',
    value: basis.value,
  });
  const quantity = sealEngineeringQuantityAuthority({
    schema: ENGINEERING_QUANTITY_AUTHORITY_SCHEMA,
    quantityId: basis.quantityId,
    quantityKind: basis.quantityKind,
    scopeRef: basis.scopeRef,
    value: basis.value,
    unit: basis.unit,
    authorityClass: 'INFERRED_REVIEW_REQUIRED',
    sourceBinding: sourceBinding(basis, sourceType),
    derivation: null,
    riskRefs: [risk.riskId],
    confirmationRef: null,
  });
  return deepFreeze({ quantity, risk, disposition: 'REVIEW_REQUIRED' });
}

/** Narrow direct-source route for a current sealed DECLARED numeric field. */
export function adaptSealedDeclaredNumericField(input) {
  const field = input?.field;
  const authorityRef = normalizeAuthorityRef(input?.authorityRef, 'authorityRef');
  if (!field || field.status !== 'DECLARED' || !Number.isFinite(field.value)) {
    throw new Error('Only a finite DECLARED field can enter as sealed source-exact authority.');
  }
  if (!Array.isArray(field.evidence) || field.evidence.length === 0) {
    throw new Error('Declared source-exact field requires source evidence.');
  }
  return sealEngineeringQuantityAuthority({
    schema: ENGINEERING_QUANTITY_AUTHORITY_SCHEMA,
    quantityId: requireText(input.quantityId, 'quantityId'),
    quantityKind: requireText(input.quantityKind, 'quantityKind'),
    scopeRef: requireText(input.scopeRef, 'scopeRef'),
    value: field.value,
    unit: requireText(input.unit ?? field.unit, 'unit'),
    authorityClass: 'SOURCE_EXACT',
    sourceBinding: {
      sourceType: 'SEALED_DECLARED_SOURCE',
      sourceReference: `${authorityRef.ref}:${requireText(input.fieldName, 'fieldName')}`,
      sourceSemanticHash: authorityRef.semanticHash,
      evidenceRef: `${authorityRef.ref}:evidence`,
      evidenceHash: semanticHash(field.evidence),
    },
    derivation: null,
    riskRefs: [],
    confirmationRef: null,
  });
}

function normalizeLegacyBasis(input) {
  const numeric = Number(input?.value);
  return {
    runId: requireText(input?.runId, 'runId'),
    quantityId: requireText(input?.quantityId, 'quantityId'),
    quantityKind: requireText(input?.quantityKind, 'quantityKind'),
    scopeRef: requireText(input?.scopeRef, 'scopeRef'),
    value: input?.value === null || input?.value === undefined || !Number.isFinite(numeric)
      ? null
      : numeric,
    unit: requireText(input?.unit, 'unit'),
    source: normalizeToken(input?.source || 'legacy-fallback'),
    sourceReference: requireText(input?.sourceReference || input?.source || 'legacy-fallback', 'sourceReference'),
    sourceSemanticHash: optionalText(input?.sourceSemanticHash),
    evidenceRef: optionalText(input?.evidenceRef),
    evidenceHash: optionalText(input?.evidenceHash),
    flags: uniqueTexts(input?.flags ?? []),
    needsReview: input?.needsReview !== false,
    matchMethod: normalizeToken(input?.matchMethod || 'none'),
    required: input?.required !== false,
    exactMasterApproved: input?.exactMasterApproved === true,
    exactSourceApproved: input?.exactSourceApproved === true,
  };
}

function classifyLegacySourceType(basis) {
  if (basis.flags.some((flag) => INFERENCE_FLAGS.has(flag))) return 'LEGACY_FALLBACK';
  if (basis.flags.some((flag) => MISSING_VALUE_FLAGS.has(flag))) return 'DEFAULT_ZERO';
  if (basis.exactMasterApproved && basis.source === 'PIPING_CLASS_MASTER') return 'APPROVED_PIPING_CLASS_MASTER';
  if (basis.exactSourceApproved) return 'SEALED_EXACT_SOURCE';
  if (basis.matchMethod.includes('FUZZY') || basis.matchMethod.includes('AMBIGUOUS')) return 'FUZZY_MATCH';
  const token = basis.source.replaceAll('-', '_');
  if (token.includes('SERVICE')) return 'SERVICE_FALLBACK';
  if (token === 'CONFIG_DEFAULT') return 'CONFIG_DEFAULT';
  if (token === 'DEFAULT_ZERO') return 'DEFAULT_ZERO';
  if (token.includes('XML') && token.includes('FALLBACK')) return 'XML_FALLBACK';
  if (token.includes('INTERPOL')) return 'INTERPOLATED_UNAPPROVED';
  if (token.includes('EXTRAPOL')) return 'EXTRAPOLATED';
  return LEGACY_INFERENCE_SOURCES.has(token) ? token : 'LEGACY_FALLBACK';
}

function buildRisk(basis, disposition) {
  const dependencyHash = semanticHash({
    source: basis.source,
    sourceReference: basis.sourceReference,
    sourceSemanticHash: basis.sourceSemanticHash,
    flags: basis.flags,
    matchMethod: basis.matchMethod,
    value: disposition.value,
    unit: basis.unit,
  });
  return sealEngineeringRiskFinding({
    schema: ENGINEERING_RISK_FINDING_SCHEMA,
    riskCode: disposition.riskCode,
    riskClass: disposition.riskClass,
    runId: basis.runId,
    scope: { branchId: null, entityIds: [basis.scopeRef], quantityIds: [basis.quantityId] },
    reasonCode: disposition.reasonCode,
    messageParameters: {
      source: basis.source,
      sourceType: classifyLegacySourceType(basis),
      matchMethod: basis.matchMethod,
      flags: basis.flags,
    },
    valueSnapshot: {
      value: disposition.value,
      unit: basis.unit,
      authorityClass: disposition.authorityClass,
    },
    authorityRefs: [],
    sourceRefs: basis.sourceSemanticHash
      ? [{ ref: basis.sourceReference, semanticHash: basis.sourceSemanticHash }]
      : [],
    governingDependencyRefs: [{ ref: `legacy-resolution:${basis.quantityId}`, semanticHash: dependencyHash }],
  });
}

function sourceBinding(basis, sourceType) {
  const sourceSemanticHash = basis.sourceSemanticHash || semanticHash({
    source: basis.source,
    sourceReference: basis.sourceReference,
    flags: basis.flags,
    matchMethod: basis.matchMethod,
  });
  return {
    sourceType,
    sourceReference: basis.sourceReference,
    sourceSemanticHash,
    evidenceRef: basis.evidenceRef,
    evidenceHash: basis.evidenceHash,
  };
}

function riskCodeForSource(sourceType) {
  if (sourceType === 'FUZZY_MATCH') return 'EMP_V3_APPROXIMATE_CLASS_OR_MASTER_MATCH';
  if (sourceType === 'SERVICE_FALLBACK') return 'EMP_V3_SERVICE_PROCESS_FALLBACK';
  if (sourceType === 'DEFAULT_ZERO') return 'EMP_V3_DEFAULT_ZERO_ASSUMPTION';
  return 'EMP_V3_INFERRED_ENGINEERING_QUANTITY';
}
function reasonCodeForSource(sourceType, basis) {
  if (sourceType === 'FUZZY_MATCH') return 'FUZZY_OR_AMBIGUOUS_MATCH_REQUIRES_REVIEW';
  if (sourceType === 'SERVICE_FALLBACK') return 'SERVICE_DERIVED_PROCESS_VALUE_REQUIRES_REVIEW';
  if (basis.flags.length) return 'LEGACY_DEDUCED_VALUE_REQUIRES_REVIEW';
  return 'NON_EXACT_SOURCE_REQUIRES_REVIEW';
}
function normalizeAuthorityRef(value, fieldName) {
  if (!value || typeof value !== 'object') throw new TypeError(`${fieldName} must be an object.`);
  return {
    ref: requireText(value.ref, `${fieldName}.ref`),
    semanticHash: requireText(value.semanticHash, `${fieldName}.semanticHash`),
    evidenceHash: requireText(value.evidenceHash, `${fieldName}.evidenceHash`),
  };
}
function normalizeToken(value) {
  return String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}
function uniqueTexts(value) {
  if (!Array.isArray(value)) throw new TypeError('Expected an array.');
  return [...new Set(value.map((item) => requireText(item, 'array item')))].sort();
}
function optionalText(value) { const text = String(value ?? '').trim(); return text || null; }
function requireText(value, fieldName) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${fieldName} is required.`);
  return text;
}
