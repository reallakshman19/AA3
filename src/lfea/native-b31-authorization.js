import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { deepFreeze } from '../core/shared-piping-model/immutable.js';
import {
  LFEA_NATIVE_B31_AUTHORITY_SCHEMA,
  lfeaNativeB31Error,
} from './native-b31-authority-contract.js';

export const LFEA_NATIVE_B31_AUTHORIZATION_SCHEMA =
  'lfea-native-b31-authorization/v1';

const APPROVAL_KEYS = Object.freeze([
  'reviewerIdentity',
  'reason',
  'acceptedAuthoritySemanticHash',
]);

export function sealLfeaNativeB31Authorization(authority, approval) {
  requireAuthority(authority);
  exactKeys(approval, APPROVAL_KEYS, 'b31Approval');
  const reviewerIdentity = requiredText(approval.reviewerIdentity, 'b31Approval.reviewerIdentity');
  const reason = requiredText(approval.reason, 'b31Approval.reason');
  if (approval.acceptedAuthoritySemanticHash !== authority.semanticHash) {
    throw lfeaNativeB31Error(
      'LFEA_NATIVE_B31_REVIEW_AUTHORITY_MISMATCH',
      'B31 review acceptance does not bind the staged authority.',
    );
  }
  const base = {
    schema: LFEA_NATIVE_B31_AUTHORIZATION_SCHEMA,
    b31AuthoritySemanticHash: authority.semanticHash,
    parentSourceBundleSemanticHash: authority.parentSourceBundleSemanticHash,
    parentModelSemanticHash: authority.parentModelSemanticHash,
    parentCompilationSemanticHash: authority.parentCompilationSemanticHash,
    codeProfileSemanticHash: authority.codeProfile.semanticHash,
    editionDatasetSemanticHash: authority.editionDataset.semanticHash,
    reviewerIdentity,
    reason,
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

export function requireLfeaNativeB31Authorization(value, authority) {
  requireAuthority(authority);
  if (!value || value.schema !== LFEA_NATIVE_B31_AUTHORIZATION_SCHEMA) {
    throw lfeaNativeB31Error('LFEA_NATIVE_B31_REVIEW_INVALID', 'B31 authorization is invalid.');
  }
  const expected = {
    b31AuthoritySemanticHash: authority.semanticHash,
    parentSourceBundleSemanticHash: authority.parentSourceBundleSemanticHash,
    parentModelSemanticHash: authority.parentModelSemanticHash,
    parentCompilationSemanticHash: authority.parentCompilationSemanticHash,
    codeProfileSemanticHash: authority.codeProfile.semanticHash,
    editionDatasetSemanticHash: authority.editionDataset.semanticHash,
  };
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (value[field] !== expectedValue) {
      throw lfeaNativeB31Error(
        'LFEA_NATIVE_B31_REVIEW_STALE',
        `B31 authorization ${field} is stale against the staged authority.`,
      );
    }
  }
  requiredText(value.reviewerIdentity, 'b31Authorization.reviewerIdentity');
  requiredText(value.reason, 'b31Authorization.reason');
  const { semanticHash: retainedHash, ...base } = value;
  if (retainedHash !== semanticHash(base)) {
    throw lfeaNativeB31Error(
      'LFEA_NATIVE_B31_REVIEW_HASH_MISMATCH',
      'B31 authorization semantic hash is stale.',
    );
  }
  return value;
}

function requireAuthority(authority) {
  if (!authority || authority.schema !== LFEA_NATIVE_B31_AUTHORITY_SCHEMA) {
    throw lfeaNativeB31Error(
      'LFEA_NATIVE_B31_AUTHORITY_REQUIRED',
      'A staged native B31 authority is required.',
    );
  }
}
function exactKeys(value, expectedKeys, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw lfeaNativeB31Error('LFEA_NATIVE_B31_REVIEW_INVALID', `${field} must be a record.`);
  }
  const actual = Object.keys(value).sort(compareAscii);
  const expected = [...expectedKeys].sort(compareAscii);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw lfeaNativeB31Error('LFEA_NATIVE_B31_REVIEW_INVALID', `${field} keys are invalid.`);
  }
}
function requiredText(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw lfeaNativeB31Error('LFEA_NATIVE_B31_REVIEW_INVALID', `${field} is required.`);
  return text;
}
function compareAscii(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
