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

export const EMPIRICAL_V3_ADAPTED_RESOLUTION_SCHEMA =
  'empirical-v3-adapted-resolution-reference/v1';

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

/**
 * Adapts a current sealed DECLARED field. This is the narrow direct-source
 * route; inherited/missing or unsealed fields cannot be promoted here.
 */
export function adaptSealedDeclaredNumericField(input) {
  const field = input?.field;
  const authorityRef = normalizeAuthorityRef(input?.authorityRef, 'authorityRef');
  if (!field || field.status !== 'DECLARED' || !Number.isFinite(field.value)) {
    throw new Error('Only a finite DECLARED field can enter as sealed source-exact authority.');
  }
  if (!Array.isArray(field.evidence) || field.evidence.length === 0) {
    throw new Error('Declared source-exact field requires source evidence.');
  }
  const evidenceHash = semanticHash(field.evidence);
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
      evidenceHash,
    },
    derivation: null,
    riskRefs: [],
    confirmationRef: null,
  });
}

/**
 * Non-numeric branch/common resolver result (piping class, material mapping,
 * etc.). The semantic hash carries the authority class so downstream branch
 * identity changes when an approximate result is replaced by exact authority.
 */
export function adaptResolutionReference(input) {
  const basis = normalizeReferenceBasis(input);
  let authorityClass = 'INFERRED_REVIEW_REQUIRED';
  let risk = null;
  if (!basis.ref) authorityClass = 'UNRESOLVED';
  else if (basis.exactMasterApproved && !basis.needsReview) authorityClass = 'APPROVED_MASTER_EXACT';
  else if (basis.exactSourceApproved && !basis.needsReview) authorityClass = 'SOURCE_EXACT';

  const material = {
    schema: EMPIRICAL_V3_ADAPTED_RESOLUTION_SCHEMA,
    kind: basis.kind,
    ref: basis.ref || `unresolved:${basis.kind.toLowerCase()}`,
    authorityClass,
    source: basis.source,
    sourceSemanticHash: basis.sourceSemanticHash,
    matchMethod: basis.matchMethod,
    needsReview: basis.needsReview,
  };
  const record = deepFreeze({ ...material, semanticHash: semanticHash(material) });

  if (authorityClass === 'UNRESOLVED' || authorityClass === 'INFERRED_REVIEW_REQUIRED') {
    risk = sealEngineeringRiskFinding({
      schema: ENGINEERING_RISK_FINDING_SCHEMA,
      riskCode: authorityClass === 'UNRESOLVED'
        ? 'EMP_V3_BRANCH_AUTHORITY_UNRESOLVED'
        : 'EMP_V3_BRANCH_AUTHORITY_REVIEW_REQUIRED',
      riskClass: authorityClass === 'UNRESOLVED' ? 'HIGH_BLOCK' : 'HIGH_CONFIRM',
      runId: basis.runId,
      scope: { branchId: null, entityIds: basis.entityIds, quantityIds: [] },
      reasonCode: authorityClass === 'UNRESOLVED'
        ? 'REQUIRED_BRANCH_AUTHORITY_MISSING'
        : 'APPROXIMATE_OR_INFERRED_BRANCH_AUTHORITY',
      messageParameters: {
        kind: basis.kind,
        source: basis.source,
        matchMethod: basis.matchMethod,
      },
      valueSnapshot: null,
      authorityRefs: [{ ref: record.ref, semanticHash: record.semanticHash }],
      sourceRefs: basis.sourceSemanticHash
        ? [{ ref: basis.source, semanticHash: basis.sourceSemanticHash }]
        : [],
      governingDependencyRefs: [{
        ref: `resolution:${basis.kind}:${record.ref}`,
        semanticHash: record.semanticHash,
      }],
    });
  }
  return deepFreeze({ record, risk, disposition: authorityClass });
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

function normalizeReferenceBasis(input) {
  return {
    runId: requireText(input?.runId, 'runId'),
    kind: requireText(input?.kind, 'kind').toUpperCase(),
    ref: optionalText(input?.ref),
    source: requireText(input?.source || 'unresolved', 'source'),
    sourceSemanticHash: optionalText(input?.sourceSemanticHash),
    matchMethod: normalizeToken(input?.matchMethod || 'none'),
    needsReview: input?.needsReview !== false,
    exactMasterApproved: input?.exactMasterApproved === true,
    exactSourceApproved: input?.exactSourceApproved === true,
    entityIds: uniqueTexts(input?.entityIds ?? []),
  };
}

function classifyLegacySourceType(basis) {
  if (basis.flags.some((flag) => INFERENCE_FLAGS.has(flag))) return 'LEGACY_FALLBACK';
  if (basis.flags.some((flag) => MISSING_VALUE_FLAGS.has(flag))) return 'DEFAULT_ZERO';
  if (basis.exactMasterApproved && basis.source === 'PIPING-CLASS-MASTER') return 'APPROVED_PIPING_CLASS_MASTER';
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
