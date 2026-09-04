import { semanticHash } from '../shared-primitives/canonical-json.js';

export const EMP1_ENGINEERING_REVIEW_RECORD_SCHEMA = 'emp1-engineering-review-record/v1';
export const EMP1_ENGINEERING_REVIEW_BINDING_SCHEMA = 'emp1-engineering-review-binding/v1';
export const EMP1_ENGINEERING_REVIEW_STATE_SCHEMA = 'emp1-engineering-review-state/v1';
export const EMP1_ENGINEERING_REVIEW_DISPOSITIONS = Object.freeze(['ACCEPTED', 'REJECTED']);
export const EMP1_ENGINEERING_REVIEW_STATES = Object.freeze({
  NOT_REVIEWED: 'NOT_REVIEWED',
  ACCEPTED: 'REVIEW_ACCEPTED',
  REJECTED: 'REVIEW_REJECTED',
  STALE: 'REVIEW_STALE',
});

const ASSESSMENT_SCHEMA = 'emp1-assessment/v1';
const BINDING_KEYS = Object.freeze([
  'sourceHash',
  'loadTransferResultHash',
  'sectionScreeningResultHash',
  'localCorrelationResultHash',
  'assessmentSemanticHash',
  'routeAuthorityHash',
]);

/** Immutable human engineering-review attestation over one exact EMP.1 evidence set. */
export function createEmp1EngineeringReviewRecord(input = {}) {
  const normalized = {
    schema: EMP1_ENGINEERING_REVIEW_RECORD_SCHEMA,
    productId: 'EMP.1',
    disposition: disposition(input.disposition),
    reviewer: reviewer(input.reviewer),
    reviewedAt: text(input.reviewedAt, 'EMP1_ENGINEERING_REVIEW_REVIEWED_AT_REQUIRED'),
    basisCode: text(input.basisCode, 'EMP1_ENGINEERING_REVIEW_BASIS_CODE_REQUIRED'),
    comment: optionalText(input.comment),
    evidenceBinding: bindEmp1EngineeringReviewEvidence(input.evidence),
    interpretation: interpretationBoundary(),
  };
  const reviewSemanticHash = semanticHash(reviewSemanticProjection(normalized));
  return deepFreeze({
    ...normalized,
    reviewId: `emp1-engineering-review:${hashSuffix(reviewSemanticHash)}`,
    semanticHash: reviewSemanticHash,
  });
}

export function requireEmp1EngineeringReviewRecord(value) {
  const source = object(value, 'EMP1_ENGINEERING_REVIEW_RECORD_REQUIRED');
  if (source.schema !== EMP1_ENGINEERING_REVIEW_RECORD_SCHEMA || source.productId !== 'EMP.1') {
    throw reviewError('EMP1_ENGINEERING_REVIEW_RECORD_SCHEMA_INVALID');
  }
  const normalized = {
    schema: source.schema,
    productId: source.productId,
    disposition: disposition(source.disposition),
    reviewer: reviewer(source.reviewer),
    reviewedAt: text(source.reviewedAt, 'EMP1_ENGINEERING_REVIEW_REVIEWED_AT_REQUIRED'),
    basisCode: text(source.basisCode, 'EMP1_ENGINEERING_REVIEW_BASIS_CODE_REQUIRED'),
    comment: optionalText(source.comment),
    evidenceBinding: binding(source.evidenceBinding),
    interpretation: interpretation(source.interpretation),
  };
  const expectedHash = semanticHash(reviewSemanticProjection(normalized));
  const expectedId = `emp1-engineering-review:${hashSuffix(expectedHash)}`;
  if (source.semanticHash !== expectedHash || source.reviewId !== expectedId) {
    throw reviewError('EMP1_ENGINEERING_REVIEW_RECORD_IDENTITY_MISMATCH');
  }
  return deepFreeze({ ...normalized, reviewId: expectedId, semanticHash: expectedHash });
}

/**
 * Bind the review to existing retained identities. Existing hashes are consumed,
 * never regenerated. The exact assessment receives only a review-local semantic
 * identity because emp1-assessment/v1 currently exposes parent hashes, not its own hash.
 */
export function bindEmp1EngineeringReviewEvidence(value = {}) {
  const evidence = object(value, 'EMP1_ENGINEERING_REVIEW_EVIDENCE_REQUIRED');
  const run = object(evidence.result, 'EMP1_ENGINEERING_REVIEW_RESULT_REQUIRED');
  if (run.productId !== 'EMP.1') throw reviewError('EMP1_ENGINEERING_REVIEW_PRODUCT_INVALID');
  const assessment = object(run.assessment, 'EMP1_ENGINEERING_REVIEW_ASSESSMENT_REQUIRED');
  if (assessment.schema !== ASSESSMENT_SCHEMA) {
    throw reviewError('EMP1_ENGINEERING_REVIEW_ASSESSMENT_SCHEMA_INVALID');
  }
  const parents = object(
    assessment.parents,
    'EMP1_ENGINEERING_REVIEW_ASSESSMENT_PARENTS_REQUIRED',
  );
  const sourceHash = hash(evidence.sourceHash, 'EMP1_ENGINEERING_REVIEW_SOURCE_HASH_REQUIRED');
  const loadTransferResultHash = resultHash(
    run.loadTransfer,
    'EMP1_ENGINEERING_REVIEW_LOAD_TRANSFER_HASH_REQUIRED',
  );
  const sectionScreeningResultHash = resultHash(
    run.sectionScreening,
    'EMP1_ENGINEERING_REVIEW_SECTION_SCREENING_HASH_REQUIRED',
  );
  const localCorrelationResultHash = resultHash(
    run.localCorrelation,
    'EMP1_ENGINEERING_REVIEW_LOCAL_CORRELATION_HASH_REQUIRED',
  );
  const routeAuthorityHash = hash(
    evidence.routeAuthorityHash,
    'EMP1_ENGINEERING_REVIEW_ROUTE_AUTHORITY_HASH_REQUIRED',
  );
  const routeAuthoritySnapshot = object(
    evidence.routeAuthoritySnapshot,
    'EMP1_ENGINEERING_REVIEW_ROUTE_AUTHORITY_SNAPSHOT_REQUIRED',
  );
  if (hash(
    routeAuthoritySnapshot.semanticHash,
    'EMP1_ENGINEERING_REVIEW_ROUTE_AUTHORITY_SNAPSHOT_HASH_REQUIRED',
  ) !== routeAuthorityHash) {
    throw reviewError('EMP1_ENGINEERING_REVIEW_ROUTE_AUTHORITY_HASH_MISMATCH');
  }

  parent('SOURCE', sourceHash, parents.sourceHash);
  parent('LOAD_TRANSFER', loadTransferResultHash, parents.loadTransferResultHash);
  parent('SECTION_SCREENING', sectionScreeningResultHash, parents.sectionScreeningResultHash);
  parent('LOCAL_CORRELATION', localCorrelationResultHash, parents.localCorrelationResultHash);

  return deepFreeze({
    schema: EMP1_ENGINEERING_REVIEW_BINDING_SCHEMA,
    sourceHash,
    loadTransferResultHash,
    sectionScreeningResultHash,
    localCorrelationResultHash,
    assessmentSemanticHash: semanticHash(assessment),
    routeAuthorityHash,
  });
}

/** Any changed bound identity makes the prior review stale, regardless of disposition. */
export function projectEmp1EngineeringReviewState({ reviewRecord, evidence } = {}) {
  if (reviewRecord == null) return notReviewed();
  const review = requireEmp1EngineeringReviewRecord(reviewRecord);
  const currentEvidenceBinding = bindEmp1EngineeringReviewEvidence(evidence);
  const changedBindings = BINDING_KEYS.filter(
    (key) => review.evidenceBinding[key] !== currentEvidenceBinding[key],
  );
  const current = changedBindings.length === 0;
  const state = !current
    ? EMP1_ENGINEERING_REVIEW_STATES.STALE
    : review.disposition === 'ACCEPTED'
      ? EMP1_ENGINEERING_REVIEW_STATES.ACCEPTED
      : EMP1_ENGINEERING_REVIEW_STATES.REJECTED;
  return deepFreeze({
    schema: EMP1_ENGINEERING_REVIEW_STATE_SCHEMA,
    productId: 'EMP.1',
    state,
    reviewed: true,
    current,
    disposition: review.disposition,
    reviewId: review.reviewId,
    reviewSemanticHash: review.semanticHash,
    reviewer: review.reviewer,
    reviewedAt: review.reviewedAt,
    basisCode: review.basisCode,
    comment: review.comment,
    changedBindings,
    evidenceBinding: review.evidenceBinding,
    currentEvidenceBinding,
    authorityBoundary: stateBoundary(),
  });
}

export function isEmp1EngineeringReviewCurrent(reviewRecord, evidence) {
  return projectEmp1EngineeringReviewState({ reviewRecord, evidence }).current === true;
}

export function reviewSemanticProjection(value) {
  return {
    schema: value.schema,
    productId: value.productId,
    disposition: value.disposition,
    reviewer: value.reviewer,
    reviewedAt: value.reviewedAt,
    basisCode: value.basisCode,
    comment: value.comment,
    evidenceBinding: value.evidenceBinding,
    interpretation: value.interpretation,
  };
}

function notReviewed() {
  return deepFreeze({
    schema: EMP1_ENGINEERING_REVIEW_STATE_SCHEMA,
    productId: 'EMP.1',
    state: EMP1_ENGINEERING_REVIEW_STATES.NOT_REVIEWED,
    reviewed: false,
    current: false,
    disposition: null,
    reviewId: null,
    reviewSemanticHash: null,
    reviewer: null,
    reviewedAt: null,
    basisCode: null,
    comment: null,
    changedBindings: [],
    evidenceBinding: null,
    currentEvidenceBinding: null,
    authorityBoundary: stateBoundary(),
  });
}

function binding(value) {
  const row = object(value, 'EMP1_ENGINEERING_REVIEW_BINDING_REQUIRED');
  if (row.schema !== EMP1_ENGINEERING_REVIEW_BINDING_SCHEMA) {
    throw reviewError('EMP1_ENGINEERING_REVIEW_BINDING_SCHEMA_INVALID');
  }
  return deepFreeze({
    schema: row.schema,
    sourceHash: hash(row.sourceHash, 'EMP1_ENGINEERING_REVIEW_SOURCE_HASH_REQUIRED'),
    loadTransferResultHash: hash(row.loadTransferResultHash,
      'EMP1_ENGINEERING_REVIEW_LOAD_TRANSFER_HASH_REQUIRED'),
    sectionScreeningResultHash: hash(row.sectionScreeningResultHash,
      'EMP1_ENGINEERING_REVIEW_SECTION_SCREENING_HASH_REQUIRED'),
    localCorrelationResultHash: hash(row.localCorrelationResultHash,
      'EMP1_ENGINEERING_REVIEW_LOCAL_CORRELATION_HASH_REQUIRED'),
    assessmentSemanticHash: hash(row.assessmentSemanticHash,
      'EMP1_ENGINEERING_REVIEW_ASSESSMENT_HASH_REQUIRED'),
    routeAuthorityHash: hash(row.routeAuthorityHash,
      'EMP1_ENGINEERING_REVIEW_ROUTE_AUTHORITY_HASH_REQUIRED'),
  });
}

function reviewer(value) {
  const row = object(value, 'EMP1_ENGINEERING_REVIEW_REVIEWER_REQUIRED');
  return deepFreeze({
    identity: text(row.identity, 'EMP1_ENGINEERING_REVIEW_REVIEWER_IDENTITY_REQUIRED'),
    role: optionalText(row.role),
  });
}

function disposition(value) {
  if (!EMP1_ENGINEERING_REVIEW_DISPOSITIONS.includes(value)) {
    throw reviewError(`EMP1_ENGINEERING_REVIEW_DISPOSITION_UNSUPPORTED:${String(value)}`);
  }
  return value;
}

function interpretation(value) {
  const row = object(value, 'EMP1_ENGINEERING_REVIEW_INTERPRETATION_REQUIRED');
  const expected = interpretationBoundary();
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (row[key] !== expectedValue) {
      throw reviewError(`EMP1_ENGINEERING_REVIEW_INTERPRETATION_INVALID:${key}`);
    }
  }
  return expected;
}

function interpretationBoundary() {
  return deepFreeze({
    engineeringReviewAttestation: true,
    cryptographicSignature: false,
    professionalDigitalSeal: false,
    acceptanceIsCodeCompliance: false,
    acceptanceIsReleaseQualification: false,
    acceptanceCreatesMethodAuthority: false,
    acceptanceCreatesApplicabilityAuthority: false,
    acceptanceCreatesNumericalAuthority: false,
  });
}

function stateBoundary() {
  return deepFreeze({
    reviewStateOnly: true,
    createsSourceAuthority: false,
    createsMethodAuthority: false,
    createsApplicabilityAuthority: false,
    createsNumericalAuthority: false,
    createsCodeCompliance: false,
    createsReleaseAuthority: false,
    createsCryptographicSeal: false,
  });
}

function resultHash(value, code) { return hash(object(value, code).resultHash, code); }
function parent(label, retained, expected) {
  if (retained !== hash(expected, `EMP1_ENGINEERING_REVIEW_${label}_ASSESSMENT_PARENT_REQUIRED`)) {
    throw reviewError(`EMP1_ENGINEERING_REVIEW_${label}_ASSESSMENT_PARENT_MISMATCH`);
  }
}
function hash(value, code) { return text(value, code); }
function hashSuffix(value) { return value.startsWith('fnv1a64:') ? value.slice(8) : value; }
function text(value, code) {
  if (typeof value !== 'string' || !value.trim()) throw reviewError(code);
  return value.trim();
}
function optionalText(value) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}
function object(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw reviewError(code);
  return value;
}
function reviewError(code) { const error = new TypeError(code); error.code = code; return error; }
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
