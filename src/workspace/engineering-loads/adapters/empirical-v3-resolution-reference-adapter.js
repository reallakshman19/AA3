import { semanticHash } from '../../../core/empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../../../core/shared-primitives/immutable.js';
import {
  ENGINEERING_RISK_FINDING_SCHEMA,
  sealEngineeringRiskFinding,
} from '../../../core/empirical-v3-safety/risk-finding.js';

export const EMPIRICAL_V3_ADAPTED_RESOLUTION_SCHEMA =
  'empirical-v3-adapted-resolution-reference/v1';

/**
 * Adapts a non-numeric branch/common resolver result such as piping class or
 * material mapping. Exactness must be explicitly established by the caller;
 * fuzzy/ambiguous/defaulted matches become review-required, and missing refs
 * become blockers.
 */
export function adaptResolutionReference(input) {
  const basis = normalizeBasis(input);
  let authorityClass = 'INFERRED_REVIEW_REQUIRED';
  if (!basis.ref) authorityClass = 'UNRESOLVED';
  else if (basis.exactMasterApproved && basis.sourceSemanticHash && !basis.needsReview) authorityClass = 'APPROVED_MASTER_EXACT';
  else if (basis.exactSourceApproved && basis.sourceSemanticHash && !basis.needsReview) authorityClass = 'SOURCE_EXACT';

  const material = {
    schema: EMPIRICAL_V3_ADAPTED_RESOLUTION_SCHEMA,
    kind: basis.kind,
    ref: basis.ref || `unresolved:${basis.kind.toLowerCase()}`,
    authorityClass,
    source: basis.source,
    sourceSemanticHash: basis.sourceSemanticHash,
    matchMethod: basis.matchMethod,
    needsReview: authorityClass === 'SOURCE_EXACT' || authorityClass === 'APPROVED_MASTER_EXACT'
      ? false
      : true,
  };
  validateResolutionSemantics(material);
  const record = deepFreeze({ ...material, semanticHash: semanticHash(material) });
  const risk = buildRisk(record, basis);
  return deepFreeze({ record, risk, disposition: authorityClass });
}

export function requireAdaptedResolutionReference(value) {
  if (!value || value.schema !== EMPIRICAL_V3_ADAPTED_RESOLUTION_SCHEMA) {
    throw new TypeError(`Expected schema ${EMPIRICAL_V3_ADAPTED_RESOLUTION_SCHEMA}.`);
  }
  const material = {
    schema: value.schema,
    kind: requireText(value.kind, 'kind'),
    ref: requireText(value.ref, 'ref'),
    authorityClass: requireAuthorityClass(value.authorityClass),
    source: requireText(value.source, 'source'),
    sourceSemanticHash: optionalText(value.sourceSemanticHash),
    matchMethod: requireText(value.matchMethod, 'matchMethod'),
    needsReview: value.needsReview === true,
  };
  validateResolutionSemantics(material);
  const expected = semanticHash(material);
  if (value.semanticHash !== expected) throw new Error('Adapted resolution reference hash mismatch.');
  return deepFreeze({ ...material, semanticHash: expected });
}

export function branchCommonAuthorityRef(kind, adaptedValue) {
  const adapted = requireAdaptedResolutionReference(adaptedValue);
  const expectedKind = requireText(kind, 'kind').toUpperCase();
  if (adapted.kind !== expectedKind) {
    throw new Error(`Resolution kind ${adapted.kind} cannot satisfy ${expectedKind}.`);
  }
  return deepFreeze({
    kind: expectedKind,
    ref: adapted.ref,
    semanticHash: adapted.semanticHash,
  });
}

function buildRisk(record, basis) {
  if (record.authorityClass === 'SOURCE_EXACT' || record.authorityClass === 'APPROVED_MASTER_EXACT') {
    return null;
  }
  const blocked = record.authorityClass === 'UNRESOLVED';
  return sealEngineeringRiskFinding({
    schema: ENGINEERING_RISK_FINDING_SCHEMA,
    riskCode: blocked
      ? 'EMP_V3_BRANCH_AUTHORITY_UNRESOLVED'
      : 'EMP_V3_BRANCH_AUTHORITY_REVIEW_REQUIRED',
    riskClass: blocked ? 'HIGH_BLOCK' : 'HIGH_CONFIRM',
    runId: basis.runId,
    scope: { branchId: null, entityIds: basis.entityIds, quantityIds: [] },
    reasonCode: blocked
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

function normalizeBasis(input) {
  const ref = optionalText(input?.ref);
  const sourceSemanticHash = optionalText(input?.sourceSemanticHash);
  const exactRequested = input?.exactMasterApproved === true || input?.exactSourceApproved === true;
  const missingExactEvidence = exactRequested && !sourceSemanticHash;
  return {
    runId: requireText(input?.runId, 'runId'),
    kind: requireText(input?.kind, 'kind').toUpperCase(),
    ref,
    source: requireText(input?.source || 'unresolved', 'source'),
    sourceSemanticHash,
    matchMethod: normalizeMatchMethod(input?.matchMethod || 'none'),
    needsReview: !ref || missingExactEvidence || inferNeedsReview(input),
    exactMasterApproved: input?.exactMasterApproved === true,
    exactSourceApproved: input?.exactSourceApproved === true,
    entityIds: uniqueTexts(input?.entityIds ?? []),
  };
}

function validateResolutionSemantics(value) {
  const exact = value.authorityClass === 'SOURCE_EXACT' || value.authorityClass === 'APPROVED_MASTER_EXACT';
  if (exact && !value.sourceSemanticHash) {
    throw new Error(`${value.authorityClass} requires an immutable source semantic hash.`);
  }
  if (exact && value.needsReview) {
    throw new Error(`${value.authorityClass} cannot remain review-required.`);
  }
  if (!exact && value.needsReview !== true) {
    throw new Error(`${value.authorityClass} must remain review-required.`);
  }
}

function inferNeedsReview(input) {
  if (input?.needsReview === true) return true;
  const method = normalizeMatchMethod(input?.matchMethod || 'none');
  if (method.includes('FUZZY') || method.includes('AMBIGUOUS') || method.includes('PREFIX')) return true;
  return input?.needsReview !== false;
}

function normalizeMatchMethod(value) {
  return String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_') || 'NONE';
}
function requireAuthorityClass(value) {
  const allowed = ['SOURCE_EXACT', 'APPROVED_MASTER_EXACT', 'INFERRED_REVIEW_REQUIRED', 'UNRESOLVED'];
  if (!allowed.includes(value)) throw new TypeError('authorityClass is invalid.');
  return value;
}
function uniqueTexts(value) {
  if (!Array.isArray(value)) throw new TypeError('entityIds must be an array.');
  return [...new Set(value.map((item) => requireText(item, 'entityId')))].sort();
}
function optionalText(value) { const text = String(value ?? '').trim(); return text || null; }
function requireText(value, fieldName) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${fieldName} is required.`);
  return text;
}
