/** Governed binding of template release authority into one current LAFEA workbench stage. */
import {
  validateTemplateReleaseRecordV2,
} from '../core/lafea-application-templates/release-record-v2.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import { createCurrentLafeaTargetAuthoritySnapshot } from './lafea-target-compatibility-authority.js';

export const LAFEA_WORKBENCH_RELEASE_BINDING_SCHEMA =
  'lafea-workbench-release-binding/v1';
export const LAFEA_WORKBENCH_RELEASE_BINDING_STATUSES = Object.freeze([
  'ABSENT', 'CURRENT', 'STALE',
]);

export function createLafeaWorkbenchReleaseState(stageIds) {
  const ids = requireStageIds(stageIds);
  const records = Object.fromEntries(ids.map((stageId) => [stageId, null]));

  function fields(stageId) {
    requireKnownStage(records, stageId);
    return freeze({ retainedTemplateReleaseRecord: records[stageId] });
  }

  function register(recordValue, stageValue) {
    const stage = requireStage(stageValue);
    requireKnownStage(records, stage.stageId);
    const record = normalizeReleaseRecord(recordValue);
    if (record.targetStage.stageId !== stage.stageId) {
      throw releaseError('RELEASE_RECORD_TARGET_STAGE_MISMATCH');
    }
    const projection = projectLafeaWorkbenchReleaseBinding(stage, record);
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

export function projectLafeaWorkbenchReleaseBinding(stageValue, recordValue = null) {
  const stage = requireStage(stageValue);
  if (!recordValue) return projection(stage.stageId, {
    bindingStatus: 'ABSENT',
    releaseQualified: false,
    authorityState: null,
    recordValidity: null,
    recordId: null,
    semanticHash: null,
    evidenceHash: null,
    reasons: ['RELEASE_RECORD_ABSENT'],
  });

  let record;
  try {
    record = normalizeReleaseRecord(recordValue);
  } catch {
    return projection(stage.stageId, {
      bindingStatus: 'STALE',
      releaseQualified: false,
      authorityState: null,
      recordValidity: null,
      recordId: null,
      semanticHash: null,
      evidenceHash: null,
      reasons: ['RELEASE_RECORD_INVALID'],
    });
  }

  const reasons = currentBindingReasons(stage, record);
  if (reasons.length) return projection(stage.stageId, {
    bindingStatus: 'STALE',
    releaseQualified: false,
    authorityState: record.releaseState.authorityState,
    recordValidity: record.releaseState.validity,
    recordId: record.recordId,
    semanticHash: record.semanticHash,
    evidenceHash: record.evidenceHash,
    reasons,
  });

  const releaseQualified = record.releaseState.authorityState === 'RELEASE_QUALIFIED'
    && record.releaseState.validity === 'CURRENT'
    && record.releaseState.releaseQualified === true;
  const nonQualifiedReasons = releaseQualified ? [] : [
    ...(record.releaseState.validity === 'CURRENT'
      ? [] : ['RELEASE_RECORD_VALIDITY_NOT_CURRENT']),
    'RELEASE_RECORD_NOT_QUALIFIED',
  ];
  return projection(stage.stageId, {
    bindingStatus: 'CURRENT',
    releaseQualified,
    authorityState: record.releaseState.authorityState,
    recordValidity: record.releaseState.validity,
    recordId: record.recordId,
    semanticHash: record.semanticHash,
    evidenceHash: record.evidenceHash,
    reasons: nonQualifiedReasons,
  });
}

function currentBindingReasons(stage, record) {
  const reasons = [];
  const snapshot = createCurrentLafeaTargetAuthoritySnapshot(stage.stageId);
  if (record.targetStage.stageId !== stage.stageId) {
    reasons.push('RELEASE_RECORD_TARGET_STAGE_MISMATCH');
  }
  if (record.targetStage.stageEntryHash !== snapshot.targetStage.registryEntryHash) {
    reasons.push('RELEASE_RECORD_STAGE_REGISTRY_STALE');
  }
  if (record.compositionRoot.compositionRootHash
    !== snapshot.compositionRoot.compositionRootHash
    || record.compositionRoot.releaseStateBinding
      !== snapshot.compositionRoot.releaseStateBinding) {
    reasons.push('RELEASE_RECORD_COMPOSITION_STALE');
  }
  if (record.lifecycleProfile.profileId !== snapshot.lifecycleProfile.profileId
    || record.lifecycleProfile.profileHash !== snapshot.lifecycleProfile.profileHash) {
    reasons.push('RELEASE_RECORD_LIFECYCLE_PROFILE_STALE');
  }

  if (!stage.lifecycle) {
    reasons.push('RELEASE_RECORD_LIFECYCLE_NOT_INITIALIZED');
    return unique(reasons);
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
    return unique(reasons);
  }
  if (record.sourceAuthority.requiredSchema !== snapshot.sourceContract.sourceAuthoritySchema
    || record.sourceAuthority.requiredSchema !== authority.schema
    || record.sourceAuthority.requiredRole !== snapshot.sourceContract.sourceAuthorityRole
    || record.sourceAuthority.requiredRole !== authority.role
    || record.sourceAuthority.canonicalizationProfile
      !== snapshot.sourceContract.canonicalizationProfile
    || record.sourceAuthority.canonicalizationProfile
      !== authority.canonicalizationProfile) {
    reasons.push('RELEASE_RECORD_SOURCE_AUTHORITY_CONTRACT_STALE');
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
  return unique(reasons);
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

function projection(stageId, value) {
  if (!LAFEA_WORKBENCH_RELEASE_BINDING_STATUSES.includes(value.bindingStatus)) {
    throw new TypeError('LAFEA_WORKBENCH_RELEASE_BINDING_STATUS_INVALID');
  }
  return freeze({
    schema: LAFEA_WORKBENCH_RELEASE_BINDING_SCHEMA,
    stageId,
    bindingStatus: value.bindingStatus,
    releaseQualified: value.releaseQualified,
    authorityState: value.authorityState,
    recordValidity: value.recordValidity,
    recordId: value.recordId,
    semanticHash: value.semanticHash,
    evidenceHash: value.evidenceHash,
    reasons: unique(value.reasons),
  });
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
