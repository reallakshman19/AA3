import { createCorrelationProfile } from './profile.js';
import {
  qualificationRecordMatchesProfile,
  validateCorrelationQualificationRecord,
} from './qualification-record.js';
import { correlationApprovalAuthorityTrusted } from './trusted-authorities.js';

export const CORRELATION_METHOD_REGISTRY_SCHEMA = 'local-attachment-correlation-method-registry/v1';

export function createEngineeringCorrelationRegistry(
  profileInputs = [], qualificationRecordInputs = [],
) {
  if (!Array.isArray(profileInputs)) fail('CORRELATION_REGISTRY_PROFILES_ARRAY_REQUIRED', 'profiles');
  if (!Array.isArray(qualificationRecordInputs)) {
    fail('CORRELATION_REGISTRY_QUALIFICATION_RECORDS_ARRAY_REQUIRED', 'qualificationRecords');
  }
  const profiles = profileInputs.map((input, index) => validateEngineeringProfile(input, index));
  const records = qualificationRecordInputs.map((input) =>
    validateCorrelationQualificationRecord(input));
  assertUnique(profiles, (profile) => methodKey(profile.methodIdentity, profile.methodEdition),
    'CORRELATION_ENGINEERING_PROFILE_DUPLICATE', 'profiles');
  assertUnique(records, (record) => record.recordIdentity,
    'CORRELATION_QUALIFICATION_RECORD_DUPLICATE', 'qualificationRecords');

  const retainedRecords = profiles.map((profile, index) => {
    const matches = records.filter((record) => qualificationRecordMatchesProfile(record, profile));
    if (matches.length !== 1) {
      fail(matches.length
        ? 'CORRELATION_ENGINEERING_QUALIFICATION_RECORD_AMBIGUOUS'
        : 'CORRELATION_ENGINEERING_QUALIFICATION_RECORD_MISSING',
      `profiles[${index}]`);
    }
    const [record] = matches;
    if (record.engineeringUseApproved !== true) {
      fail('CORRELATION_ENGINEERING_QUALIFICATION_NOT_APPROVED',
        `qualificationRecords[recordIdentity=${record.recordIdentity}]`);
    }
    if (!correlationApprovalAuthorityTrusted(record.approvalAuthorityId)) {
      fail('CORRELATION_APPROVAL_AUTHORITY_NOT_TRUSTED',
        `qualificationRecords[recordIdentity=${record.recordIdentity}].approvalAuthorityId`);
    }
    return record;
  });

  const paired = profiles.map((profile, index) => ({ profile, record: retainedRecords[index] }))
    .sort((a, b) => compare(methodKey(a.profile.methodIdentity, a.profile.methodEdition),
      methodKey(b.profile.methodIdentity, b.profile.methodEdition)));
  return freeze({
    schema: CORRELATION_METHOD_REGISTRY_SCHEMA,
    profiles: paired.map((row) => row.profile),
    qualificationRecords: paired.map((row) => row.record),
  });
}

export function requireEngineeringCorrelationProfile(registry, methodIdentity, methodEdition) {
  validateRegistryShape(registry);
  const key = methodKey(requiredString(methodIdentity, 'methodIdentity'),
    requiredString(methodEdition, 'methodEdition'));
  const matches = registry.profiles.filter((profile) =>
    methodKey(profile.methodIdentity, profile.methodEdition) === key);
  if (matches.length !== 1) {
    fail(matches.length ? 'CORRELATION_ENGINEERING_PROFILE_DUPLICATE'
      : 'CORRELATION_ENGINEERING_PROFILE_NOT_REGISTERED', key);
  }
  return matches[0];
}

export function engineeringCorrelationMethods(registry) {
  validateRegistryShape(registry);
  return registry.profiles.map((profile, index) => {
    const record = registry.qualificationRecords[index];
    return freeze({
      methodIdentity: profile.methodIdentity,
      methodEdition: profile.methodEdition,
      coefficientDatasetId: profile.coefficientDatasetId,
      coefficientDatasetHash: profile.coefficientDatasetHash,
      applicabilityProfileId: profile.applicabilityProfileId,
      sourceReference: profile.provenance.sourceReference,
      sourceEdition: profile.provenance.sourceEdition,
      licenseAuthority: profile.provenance.licenseAuthority,
      qualificationRecordIdentity: record.recordIdentity,
      qualificationRecordHash: record.semanticHash,
      qualificationEvidenceHash: record.qualificationEvidenceHash,
      approvalAuthorityId: record.approvalAuthorityId,
      approvalReference: record.approvalReference,
    });
  });
}

export const EMPTY_ENGINEERING_CORRELATION_REGISTRY =
  createEngineeringCorrelationRegistry([], []);

function validateEngineeringProfile(input, index) {
  const profile = createCorrelationProfile(input);
  if (profile.authority.engineeringUseAuthorized !== true) {
    fail('CORRELATION_ENGINEERING_PROFILE_NOT_AUTHORIZED', `profiles[${index}].authority`);
  }
  if (profile.provenance.licenseAuthority === 'INTERNAL_TEST_DATA') {
    fail('CORRELATION_ENGINEERING_PROFILE_TEST_DATA_FORBIDDEN',
      `profiles[${index}].provenance.licenseAuthority`);
  }
  return profile;
}
function validateRegistryShape(registry) {
  if (!registry || registry.schema !== CORRELATION_METHOD_REGISTRY_SCHEMA
    || !Array.isArray(registry.profiles)
    || !Array.isArray(registry.qualificationRecords)
    || registry.profiles.length !== registry.qualificationRecords.length) {
    fail('CORRELATION_ENGINEERING_REGISTRY_INVALID', 'registry');
  }
}
function assertUnique(values, identity, code, path) {
  const seen = new Set();
  values.forEach((row, index) => {
    const key = identity(row);
    if (seen.has(key)) fail(code, `${path}[${index}]`);
    seen.add(key);
  });
}
function methodKey(methodIdentity, methodEdition) { return `${methodIdentity}@@${methodEdition}`; }
function requiredString(value, path) { if (typeof value !== 'string' || !value) fail('CORRELATION_STRING_REQUIRED', path); return value; }
function compare(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function fail(code, path) { const error = new Error(code); error.code = code; error.path = path; throw error; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
