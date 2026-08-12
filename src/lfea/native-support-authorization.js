import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { deepFreeze } from '../core/shared-piping-model/immutable.js';
import { lfeaNativeSupportError } from './native-support-authority-contract.js';

export const LFEA_NATIVE_SUPPORT_AUTHORIZATION_SCHEMA =
  'lfea-native-support-authorization/v1';

const APPROVAL_KEYS = Object.freeze([
  'reviewerIdentity',
  'reason',
  'acceptedAuthoritySemanticHash',
]);
const RECORD_KEYS = Object.freeze([
  'schema',
  'supportAuthoritySemanticHash',
  'parentSourceBundleSemanticHash',
  'parentModelSemanticHash',
  'parentCompilationSemanticHash',
  'reviewerIdentity',
  'reason',
  'semanticHash',
]);

export function sealLfeaNativeSupportAuthorization(authority, approval) {
  requireAuthority(authority);
  requireExactKeys(approval, APPROVAL_KEYS, 'supportApproval');
  const reviewerIdentity = requiredText(approval.reviewerIdentity, 'supportApproval.reviewerIdentity');
  const reason = requiredText(approval.reason, 'supportApproval.reason');
  requireHash(approval.acceptedAuthoritySemanticHash, 'supportApproval.acceptedAuthoritySemanticHash');
  if (approval.acceptedAuthoritySemanticHash !== authority.semanticHash) {
    throw lfeaNativeSupportError(
      'LFEA_NATIVE_SUPPORT_REVIEW_AUTHORITY_MISMATCH',
      'Support review acceptance does not bind the staged support authority.',
    );
  }
  const base = {
    schema: LFEA_NATIVE_SUPPORT_AUTHORIZATION_SCHEMA,
    supportAuthoritySemanticHash: authority.semanticHash,
    parentSourceBundleSemanticHash: authority.parentSourceBundleSemanticHash,
    parentModelSemanticHash: authority.parentModelSemanticHash,
    parentCompilationSemanticHash: authority.parentCompilationSemanticHash,
    reviewerIdentity,
    reason,
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

export function requireLfeaNativeSupportAuthorization(value, authority) {
  requireAuthority(authority);
  requireExactKeys(value, RECORD_KEYS, 'supportAuthorization');
  if (value.schema !== LFEA_NATIVE_SUPPORT_AUTHORIZATION_SCHEMA) {
    throw lfeaNativeSupportError(
      'LFEA_NATIVE_SUPPORT_REVIEW_INVALID',
      'Support authorization schema is invalid.',
    );
  }
  for (const field of [
    'supportAuthoritySemanticHash',
    'parentSourceBundleSemanticHash',
    'parentModelSemanticHash',
    'parentCompilationSemanticHash',
    'semanticHash',
  ]) requireHash(value[field], `supportAuthorization.${field}`);
  requiredText(value.reviewerIdentity, 'supportAuthorization.reviewerIdentity');
  requiredText(value.reason, 'supportAuthorization.reason');
  const expected = {
    supportAuthoritySemanticHash: authority.semanticHash,
    parentSourceBundleSemanticHash: authority.parentSourceBundleSemanticHash,
    parentModelSemanticHash: authority.parentModelSemanticHash,
    parentCompilationSemanticHash: authority.parentCompilationSemanticHash,
  };
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (value[field] !== expectedValue) {
      throw lfeaNativeSupportError(
        'LFEA_NATIVE_SUPPORT_REVIEW_STALE',
        `Support authorization ${field} is stale against the staged authority.`,
      );
    }
  }
  const { semanticHash: _semanticHash, ...base } = value;
  if (value.semanticHash !== semanticHash(base)) {
    throw lfeaNativeSupportError(
      'LFEA_NATIVE_SUPPORT_REVIEW_HASH_MISMATCH',
      'Support authorization semantic hash is stale.',
    );
  }
  return deepFreeze({ ...value });
}

function requireAuthority(authority) {
  if (!authority || authority.schema !== 'lfea-native-support-authority/v1') {
    throw lfeaNativeSupportError(
      'LFEA_NATIVE_SUPPORT_AUTHORITY_REQUIRED',
      'A staged native support authority is required.',
    );
  }
  requireHash(authority.semanticHash, 'supportAuthority.semanticHash');
}
function requireExactKeys(value, expectedKeys, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw lfeaNativeSupportError('LFEA_NATIVE_SUPPORT_REVIEW_INVALID', `${field} must be a record.`);
  }
  const actual = Object.keys(value).sort(compareAscii);
  const expected = [...expectedKeys].sort(compareAscii);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw lfeaNativeSupportError('LFEA_NATIVE_SUPPORT_REVIEW_INVALID', `${field} keys are invalid.`);
  }
}
function requireHash(value, field) {
  if (typeof value !== 'string' || !/^fnv1a64:[0-9a-f]{16}$/u.test(value)) {
    throw lfeaNativeSupportError('LFEA_NATIVE_SUPPORT_REVIEW_INVALID', `${field} must be a semantic hash.`);
  }
}
function requiredText(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw lfeaNativeSupportError('LFEA_NATIVE_SUPPORT_REVIEW_INVALID', `${field} is required.`);
  return text;
}
function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
