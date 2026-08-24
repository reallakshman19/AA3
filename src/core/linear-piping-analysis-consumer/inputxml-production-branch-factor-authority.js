import { EDITION_PROFILE_IDS } from '../linear-fea-b31-factor-calculator/index.js';
import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { deepFreeze, isPlainRecord } from '../shared-piping-model/immutable.js';

export const INPUTXML_PRODUCTION_BRANCH_FACTOR_AUTHORITY_SCHEMA =
  'lfea-production-branch-factor-authority/v1';

const AUTHORITY_KEYS = Object.freeze([
  'schema', 'authorityId', 'editionProfileId', 'sourceEvidence', 'semanticHash',
]);
const SOURCE_KEYS = Object.freeze(['sourceId', 'sourceRevision']);

export function sealInputXmlProductionBranchFactorAuthority(input) {
  requireRecord(input, 'branchFactorAuthorityInput');
  requireExactKeys(input, [
    'authorityId', 'editionProfileId', 'sourceId', 'sourceRevision',
  ], 'branchFactorAuthorityInput');
  const draft = {
    schema: INPUTXML_PRODUCTION_BRANCH_FACTOR_AUTHORITY_SCHEMA,
    authorityId: requireText(input.authorityId, 'branchFactorAuthorityInput.authorityId'),
    editionProfileId: requireEdition(input.editionProfileId),
    sourceEvidence: {
      sourceId: requireText(input.sourceId, 'branchFactorAuthorityInput.sourceId'),
      sourceRevision: requireText(input.sourceRevision, 'branchFactorAuthorityInput.sourceRevision'),
    },
    semanticHash: '',
  };
  draft.semanticHash = semanticHash(authorityProjection(draft));
  return requireInputXmlProductionBranchFactorAuthority(draft);
}

export function requireInputXmlProductionBranchFactorAuthority(value) {
  requireRecord(value, 'branchFactorAuthority');
  requireExactKeys(value, AUTHORITY_KEYS, 'branchFactorAuthority');
  if (value.schema !== INPUTXML_PRODUCTION_BRANCH_FACTOR_AUTHORITY_SCHEMA) {
    fail('BRANCH_FACTOR_AUTHORITY_SCHEMA_INVALID', 'Production branch factor authority schema is invalid.');
  }
  requireText(value.authorityId, 'branchFactorAuthority.authorityId');
  requireEdition(value.editionProfileId);
  requireRecord(value.sourceEvidence, 'branchFactorAuthority.sourceEvidence');
  requireExactKeys(value.sourceEvidence, SOURCE_KEYS, 'branchFactorAuthority.sourceEvidence');
  requireText(value.sourceEvidence.sourceId, 'branchFactorAuthority.sourceEvidence.sourceId');
  requireText(value.sourceEvidence.sourceRevision, 'branchFactorAuthority.sourceEvidence.sourceRevision');
  const expected = semanticHash(authorityProjection(value));
  if (value.semanticHash !== expected) {
    fail('BRANCH_FACTOR_AUTHORITY_HASH_INVALID', 'Production branch factor authority semantic hash is stale.', {
      expected, actual: value.semanticHash,
    });
  }
  return deepFreeze(structuredClone(value));
}

function authorityProjection(value) {
  return {
    schema: value.schema,
    authorityId: value.authorityId,
    editionProfileId: value.editionProfileId,
    sourceEvidence: value.sourceEvidence,
  };
}

function requireEdition(value) {
  if (!EDITION_PROFILE_IDS.includes(value)) {
    fail('BRANCH_FACTOR_EDITION_AUTHORITY_UNRESOLVED',
      `Production branch factor edition ${String(value)} is not an implemented B31 factor profile.`, {
        supplied: value, allowed: EDITION_PROFILE_IDS,
      });
  }
  return value;
}

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail('BRANCH_FACTOR_AUTHORITY_TEXT_INVALID', `${field} must be a non-empty string.`);
  }
  return value.trim();
}

function requireRecord(value, field) {
  if (!isPlainRecord(value)) {
    fail('BRANCH_FACTOR_AUTHORITY_RECORD_INVALID', `${field} must be a record.`);
  }
  return value;
}

function requireExactKeys(value, expected, field) {
  const actual = Object.keys(value).sort(compareAscii);
  const required = [...expected].sort(compareAscii);
  if (actual.length !== required.length
    || actual.some((key, index) => key !== required[index])) {
    fail('BRANCH_FACTOR_AUTHORITY_KEYS_INVALID', `${field} keys are invalid.`, { actual, required });
  }
}

function fail(code, message, data) {
  const error = new TypeError(message);
  error.code = code;
  error.data = data ?? null;
  error.analysisStage = 'INPUTXML_BRANCH_FACTOR_AUTHORITY';
  throw error;
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
