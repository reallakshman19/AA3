import { EDITION_PROFILE_IDS } from '../linear-fea-b31-factor-calculator/index.js';
import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { deepFreeze, isPlainRecord } from '../shared-piping-model/immutable.js';

export const INPUTXML_PRODUCTION_BEND_FACTOR_AUTHORITY_SCHEMA =
  'lfea-production-bend-factor-authority/v1';

const AUTHORITY_KEYS = Object.freeze([
  'schema',
  'authorityId',
  'editionProfileId',
  'smooth90FlexibilityCorrection',
  'sourceEvidence',
  'semanticHash',
]);
const SOURCE_KEYS = Object.freeze(['sourceId', 'sourceRevision']);

/**
 * Seal the engineering choice that determines which implemented B31/B31J
 * factor edition a production bend solve is allowed to use. The edition is
 * never inferred from CAESAR version, wall geometry, current year or a prior
 * benchmark. The source fields identify the project/engineer authority that
 * made the selection; the calculator separately retains the standard-table
 * source identity used to calculate k/SIF values.
 */
export function sealInputXmlProductionBendFactorAuthority(input) {
  requireRecord(input, 'bendFactorAuthorityInput');
  requireExactKeys(input, [
    'authorityId',
    'editionProfileId',
    'smooth90FlexibilityCorrection',
    'sourceId',
    'sourceRevision',
  ], 'bendFactorAuthorityInput');
  const draft = {
    schema: INPUTXML_PRODUCTION_BEND_FACTOR_AUTHORITY_SCHEMA,
    authorityId: requireText(input.authorityId, 'bendFactorAuthorityInput.authorityId'),
    editionProfileId: requireEdition(input.editionProfileId),
    smooth90FlexibilityCorrection: requireBoolean(
      input.smooth90FlexibilityCorrection,
      'bendFactorAuthorityInput.smooth90FlexibilityCorrection',
    ),
    sourceEvidence: {
      sourceId: requireText(input.sourceId, 'bendFactorAuthorityInput.sourceId'),
      sourceRevision: requireText(input.sourceRevision, 'bendFactorAuthorityInput.sourceRevision'),
    },
    semanticHash: '',
  };
  draft.semanticHash = semanticHash(authorityProjection(draft));
  return requireInputXmlProductionBendFactorAuthority(draft);
}

export function requireInputXmlProductionBendFactorAuthority(value) {
  requireRecord(value, 'bendFactorAuthority');
  requireExactKeys(value, AUTHORITY_KEYS, 'bendFactorAuthority');
  if (value.schema !== INPUTXML_PRODUCTION_BEND_FACTOR_AUTHORITY_SCHEMA) {
    fail('BEND_FACTOR_AUTHORITY_SCHEMA_INVALID', 'Production bend factor authority schema is invalid.');
  }
  requireText(value.authorityId, 'bendFactorAuthority.authorityId');
  requireEdition(value.editionProfileId);
  requireBoolean(value.smooth90FlexibilityCorrection, 'bendFactorAuthority.smooth90FlexibilityCorrection');
  requireRecord(value.sourceEvidence, 'bendFactorAuthority.sourceEvidence');
  requireExactKeys(value.sourceEvidence, SOURCE_KEYS, 'bendFactorAuthority.sourceEvidence');
  requireText(value.sourceEvidence.sourceId, 'bendFactorAuthority.sourceEvidence.sourceId');
  requireText(value.sourceEvidence.sourceRevision, 'bendFactorAuthority.sourceEvidence.sourceRevision');
  const expected = semanticHash(authorityProjection(value));
  if (value.semanticHash !== expected) {
    fail(
      'BEND_FACTOR_AUTHORITY_HASH_INVALID',
      'Production bend factor authority semantic hash is stale.',
      { expected, actual: value.semanticHash },
    );
  }
  return deepFreeze(structuredClone(value));
}

export function bendFactorAuthorityProjection(value) {
  return authorityProjection(value);
}

function authorityProjection(value) {
  return {
    schema: value.schema,
    authorityId: value.authorityId,
    editionProfileId: value.editionProfileId,
    smooth90FlexibilityCorrection: value.smooth90FlexibilityCorrection,
    sourceEvidence: value.sourceEvidence,
  };
}

function requireEdition(value) {
  if (!EDITION_PROFILE_IDS.includes(value)) {
    fail(
      'BEND_FACTOR_EDITION_AUTHORITY_UNRESOLVED',
      `Production bend factor edition ${String(value)} is not an implemented B31 factor profile.`,
      { supplied: value, allowed: EDITION_PROFILE_IDS },
    );
  }
  return value;
}

function requireBoolean(value, field) {
  if (typeof value !== 'boolean') {
    fail('BEND_FACTOR_AUTHORITY_BOOLEAN_INVALID', `${field} must be boolean.`);
  }
  return value;
}

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail('BEND_FACTOR_AUTHORITY_TEXT_INVALID', `${field} must be a non-empty string.`);
  }
  return value.trim();
}

function requireRecord(value, field) {
  if (!isPlainRecord(value)) {
    fail('BEND_FACTOR_AUTHORITY_RECORD_INVALID', `${field} must be a record.`);
  }
  return value;
}

function requireExactKeys(value, expected, field) {
  const actual = Object.keys(value).sort(compareAscii);
  const required = [...expected].sort(compareAscii);
  if (actual.length !== required.length
    || actual.some((key, index) => key !== required[index])) {
    fail(
      'BEND_FACTOR_AUTHORITY_KEYS_INVALID',
      `${field} keys are invalid.`,
      { actual, required },
    );
  }
}

function fail(code, message, data) {
  const error = new TypeError(message);
  error.code = code;
  error.data = data ?? null;
  error.analysisStage = 'INPUTXML_BEND_FACTOR_AUTHORITY';
  throw error;
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
