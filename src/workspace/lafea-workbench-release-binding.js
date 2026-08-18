/** Governed binding of template release authority into one current LAFEA workbench stage. */
import {
  validateTemplateReleaseRecordV2,
} from '../core/lafea-application-templates/release-record-v2.js';
import {
  evaluateTemplateTargetCompatibility,
} from '../core/lafea-application-templates/target-compatibility.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import { createCurrentLafeaTargetAuthoritySnapshot } from './lafea-target-compatibility-authority.js';

export const LAFEA_WORKBENCH_RELEASE_BINDING_SCHEMA =
  'lafea-workbench-release-binding/v1';
export const LAFEA_WORKBENCH_RELEASE_BINDING_STATUSES = Object.freeze([
  'ABSENT', 'CURRENT', 'STALE',
]);
export const LAFEA_RELEASE_GOVERNED_RESULT_NOT_CURRENT =
  'RELEASE_GOVERNED_RESULT_NOT_CURRENT';

export function createLafeaWorkbenchReleaseState(stageIds, options = {}) {
  const ids = requireStageIds(stageIds);
  const currentCandidateHeadSha = optionalCandidateHead(options.currentCandidateHeadSha);
  const authorizedReleaseEvidenceHashes = authorizedEvidenceHashSet(
    options.authorizedReleaseEvidenceHashes,
  );
  const records = Object.fromEntries(ids.map((stageId) => [stageId, null]));

  function fields(stageId) {
    requireKnownStage(records, stageId);
    return freeze({
      retainedTemplateReleaseRecord: records[stageId],
      releaseCandidateHeadSha: currentCandidateHeadSha,
      releaseAuthorizedEvidenceHashes: [...authorizedReleaseEvidenceHashes],
    });
  }

  function register(recordValue, stageValue) {
    const stage = requireStage(stageValue);
    requireKnownStage(records, stage.stageId);
    if (isGovernedMeshStage(stage) && stage.lifecycleReadiness?.resultReady !== true) {
      throw releaseError(LAFEA_RELEASE_GOVERNED_RESULT_NOT_CURRENT);
    }
    const record = normalizeReleaseRecord(recordValue);
    if (record.targetStage.stageId !== stage.stageId) {
      throw releaseError('RELEASE_RECORD_TARGET_STAGE_MISMATCH');
    }
    const projection = projectLafeaWorkbenchReleaseBinding(stage, record, {
      currentCandidateHeadSha,
      authorizedReleaseEvidenceHashes: [...authorizedReleaseEvidenceHashes],
    });
    if (projection.bindingStatus !== 'CURRENT') {
      throw releaseError(projection.reasons[0] ?? 'RELEASE_RECORD_BINDING_NOT_CURRENT');
    }
    const previous = records[stage.stageId];
    const changed = previous?.evidenceHash !== record.evidenceHash;
    records[stage.stageId] = record;
    return freeze({ changed, record, projection });
  }

  function select(stageId) {
    requireKnownStage(records, stageId);
    return records[stageId];
  }

  return Object.freeze({ fields, register, select });
}

export function projectLafeaWorkbenchReleaseBinding(
  stageValue,
  recordValue = null,
  options = {},
) {
  const stage = requireStage(stageValue);
  const candidateHeadSha = options.currentCandidateHeadSha === undefined
    ? optionalCandidateHead(stage.releaseCandidateHeadSha)
    : optionalCandidateHead(options.currentCandidateHeadSha);
  const authorizedReleaseEvidenceHashes = authorizedEvidenceHashSet(
    options.authorizedReleaseEvidenceHashes === undefined
      ? stage.releaseAuthorizedEvidenceHashes
      : options.authorizedReleaseEvidenceHashes,
  );
  if (!recordValue) return projection(stage.stageId, candidateHeadSha, {
    bindingStatus: 'ABSENT',
    releaseQualified: false,
    authorityState: null,
    recordValidity: null,
    recordId: null,
    semanticHash: null,
    evidenceHash: null,
    evidenceAuthorizationStatus: authorizedReleaseEvidenceHashes.size
      ? 'AVAILABLE' : 'UNAVAILABLE',
    targetCompatibilityStatus: null,
    targetCompatibilityReasons: [],
    reasons: ['RELEASE_RECORD_ABSENT'],
  });

  let record;
  try {
    record = normalizeReleaseRecord(recordValue);
  } catch {
    return projection(stage.stageId, candidateHeadSha, {
      bindingStatus: 'STALE',
      releaseQualified: false,
      authorityState: null,
      recordValidity: null,
      recordId: null,
      semanticHash: null,
      evidenceHash: null,
      evidenceAuthorizationStatus: 'INVALID_RECORD',
      targetCompatibilityStatus: null,
      targetCompatibilityReasons: [],
      reasons: ['RELEASE_RECORD_INVALID'],
    });
  }

  const assessment = currentBindingAssessment(
    stage,
    record,
    candidateHeadSha,
    authorizedReleaseEvidenceHashes,
  );
  if (assessment.reasons.length) return projection(stage.stageId, candidateHeadSha, {
    bindingStatus: 'STALE',
    releaseQualified: false,
    authorityState: record.releaseState.authorityState,
    recordValidity: record.releaseState.validity,
    recordId: record.recordId,
    semanticHash: record.semanticHash,
    evidenceHash: record.evidenceHash,
    evidenceAuthorizationStatus: assessment.evidenceAuthorizationStatus,
    targetCompatibilityStatus: assessment.compatibility.status,
    targetCompatibilityReasons: assessment.compatibility.reasons,
    reasons: assessment.reasons,
  });

  const releaseQualified = record.releaseState.authorityState === 'RELEASE_QUALIFIED'
    && record.releaseState.validity === 'CURRENT'
    && record.releaseState.releaseQualified === true;
  const nonQualifiedReasons = releaseQualified ? [] : [
    ...(record.releaseState.validity === 'CURRENT'
      ? [] : ['RELEASE_RECORD_VALIDITY_NOT_CURRENT']),
    'RELEASE_RECORD_NOT_QUALIFIED',
  ];
  return projection(stage.stageId, candidateHeadSha, {
    bindingStatus: 'CURRENT',
    releaseQualified,
    authorityState: record.releaseState.authorityState,
    recordValidity: record.releaseState.validity,
    recordId: record.recordId,
    semanticHash: record.semanticHash,
    evidenceHash: record.evidenceHash,
    evidenceAuthorizationStatus: assessment.evidenceAuthorizationStatus,
    targetCompatibilityStatus: assessment.compatibility.status,
    targetCompatibilityReasons: assessment.compatibility.reasons,
    reasons: nonQualifiedReasons,
  });
}

/**
 * Release-record provenance may remain retained after a governed result loses
 * current authority. Reclassify only the workbench binding; never mutate the
 * release record itself.
 */
export function governLafeaWorkbenchReleaseBindingForResultCurrentness(
  bindingValue,
  { governedMesh, resultReady },
) {
  const binding = bindingValue;
  if (!binding || binding.schema !== LAFEA_WORKBENCH_RELEASE_BINDING_SCHEMA) {
    throw releaseError('RELEASE_BINDING_CURRENTNESS_INPUT_INVALID');
  }
  if (!governedMesh || resultReady === true || binding.bindingStatus === 'ABSENT') {
    return binding;
  }
  return freeze({
    ...binding,
    bindingStatus: 'STALE',
    releaseQualified: false,
    reasons: unique([...binding.reasons, LAFEA_RELEASE_GOVERNED_RESULT_NOT_CURRENT]),
  });
}

function currentBindingAssessment(
  stage,
  record,
  candidateHeadSha,
  authorizedReleaseEvidenceHashes,
) {
  const reasons = [];
  const snapshot = createCurrentLafeaTargetAuthoritySnapshot(stage.stageId);
  const compatibility = evaluateTemplateTargetCompatibility(record, snapshot);
  let evidenceAuthorizationStatus = 'AUTHORIZED';
  if (!authorizedReleaseEvidenceHashes.size) {
    evidenceAuthorizationStatus = 'UNAVAILABLE';
    reasons.push('RELEASE_RECORD_TRUST_ANCHOR_UNAVAILABLE');
  } else if (!authorizedReleaseEvidenceHashes.has(record.evidenceHash)) {
    evidenceAuthorizationStatus = 'UNAUTHORIZED';
    reasons.push('RELEASE_RECORD_EVIDENCE_NOT_AUTHORIZED');
  }
  if (!candidateHeadSha) {
    reasons.push('RELEASE_RECORD_CANDIDATE_HEAD_UNAVAILABLE');
  } else if (record.candidateHeadSha !== candidateHeadSha) {
    reasons.push('RELEASE_RECORD_CANDIDATE_HEAD_STALE');
  }
  if (compatibility.status === 'STALE') {
    reasons.push('RELEASE_RECORD_TARGET_COMPATIBILITY_STALE');
  } else if (compatibility.status === 'BLOCKED') {
    reasons.push('RELEASE_RECORD_TARGET_COMPATIBILITY_BLOCKED');
  }
  if (!stage.lifecycle) {
    reasons.push('RELEASE_RECORD_LIFECYCLE_NOT_INITIALIZED');
    return { reasons: unique(reasons), compatibility, evidenceAuthorizationStatus };
  }
  if (stage.lifecycleBinding?.status !== 'CURRENT') {
    reasons.push('RELEASE_RECORD_LIFECYCLE_BINDING_NOT_CURRENT');
  }
  if (record.lifecycleProfile.profileId !== stage.lifecycle.profileId) {
    reasons.push('RELEASE_RECORD_LIFECYCLE_PROFILE_STALE');
  }
  if (record.sourceAuthority.sourceHash !== stage.lifecycle.source?.sourceHash) {
    reasons.push('RELEASE_RECORD_SOURCE_HASH_STALE');
  }

  const authority = stage.sourceAuthority;
  if (!authority) {
    reasons.push('RELEASE_RECORD_SOURCE_AUTHORITY_ABSENT');
    return { reasons: unique(reasons), compatibility, evidenceAuthorizationStatus };
  }
  if (record.sourceAuthority.sourceHash !== authority.sourceHash) {
    reasons.push('RELEASE_RECORD_SOURCE_HASH_STALE');
  }
  if (record.sourceAuthority.authorityHash !== canonicalLafeaSha256(authority)) {
    reasons.push('RELEASE_RECORD_SOURCE_AUTHORITY_HASH_STALE');
  }
  if (record.sourceAuthority.documentRevisionDigest !== authority.documentRevisionDigest
    || record.sourceAuthority.documentRevisionDigest
      !== stage.lifecycleBinding?.currentDocumentDigest) {
    reasons.push('RELEASE_RECORD_DOCUMENT_REVISION_STALE');
  }
  return { reasons: unique(reasons), compatibility, evidenceAuthorizationStatus };
}

function normalizeReleaseRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw releaseError('RELEASE_RECORD_INVALID');
  }
  const record = freeze(structuredClone(value));
  const validation = validateTemplateReleaseRecordV2(record);
  if (!validation.ok) {
    throw releaseError('RELEASE_RECORD_INVALID', validation.errors.join(' '));
  }
  return record;
}

function projection(stageId, candidateHeadSha, value) {
  if (!LAFEA_WORKBENCH_RELEASE_BINDING_STATUSES.includes(value.bindingStatus)) {
    throw new TypeError('LAFEA_WORKBENCH_RELEASE_BINDING_STATUS_INVALID');
  }
  return freeze({
    schema: LAFEA_WORKBENCH_RELEASE_BINDING_SCHEMA,
    stageId,
    candidateHeadSha,
    bindingStatus: value.bindingStatus,
    releaseQualified: value.releaseQualified,
    authorityState: value.authorityState,
    recordValidity: value.recordValidity,
    recordId: value.recordId,
    semanticHash: value.semanticHash,
    evidenceHash: value.evidenceHash,
    evidenceAuthorizationStatus: value.evidenceAuthorizationStatus,
    targetCompatibilityStatus: value.targetCompatibilityStatus,
    targetCompatibilityReasons: unique(value.targetCompatibilityReasons),
    reasons: unique(value.reasons),
  });
}

function isGovernedMeshStage(stage) {
  return stage?.domainFirstProfileActive === true || stage?.shellMidsurfaceProfileActive === true;
}
function authorizedEvidenceHashSet(value) {
  if (value === null || value === undefined) return new Set();
  if (!Array.isArray(value)) throw releaseError('RELEASE_EVIDENCE_ALLOWLIST_INVALID');
  const hashes = value.map((hash) => evidenceHash(hash));
  return new Set(hashes);
}
function evidenceHash(value) {
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value)) {
    throw releaseError('RELEASE_EVIDENCE_HASH_INVALID');
  }
  return value;
}
function optionalCandidateHead(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/u.test(value)) {
    throw releaseError('RELEASE_CANDIDATE_HEAD_INVALID');
  }
  return value;
}
function requireStageIds(value) {
  if (!Array.isArray(value) || !value.length
    || value.some((stageId) => typeof stageId !== 'string' || !stageId)) {
    throw new TypeError('LAFEA_WORKBENCH_RELEASE_STAGE_IDS_REQUIRED');
  }
  return [...new Set(value)];
}
function requireKnownStage(records, stageId) {
  if (!Object.hasOwn(records, stageId)) throw releaseError('LAFEA_WORKBENCH_RELEASE_STAGE_NOT_FOUND');
}
function requireStage(value) {
  if (!value || typeof value !== 'object' || typeof value.stageId !== 'string') {
    throw new TypeError('LAFEA_WORKBENCH_RELEASE_STAGE_REQUIRED');
  }
  return value;
}
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function releaseError(code, message = code) {
  const error = new TypeError(message);
  error.code = code;
  return error;
}
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
