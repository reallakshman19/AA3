import { createCorrelationProfile } from './profile.js';

export const CORRELATION_METHOD_REGISTRY_SCHEMA = 'local-attachment-correlation-method-registry/v1';

export function createEngineeringCorrelationRegistry(profileInputs = []) {
  if (!Array.isArray(profileInputs)) fail('CORRELATION_REGISTRY_PROFILES_ARRAY_REQUIRED', 'profiles');
  const profiles = profileInputs.map((input, index) => {
    const profile = createCorrelationProfile(input);
    if (profile.authority.engineeringUseAuthorized !== true) {
      fail('CORRELATION_ENGINEERING_PROFILE_NOT_AUTHORIZED', `profiles[${index}].authority`);
    }
    if (profile.provenance.licenseAuthority === 'INTERNAL_TEST_DATA') {
      fail('CORRELATION_ENGINEERING_PROFILE_TEST_DATA_FORBIDDEN', `profiles[${index}].provenance.licenseAuthority`);
    }
    return profile;
  });
  const identities = new Set();
  profiles.forEach((profile, index) => {
    const identity = methodKey(profile.methodIdentity, profile.methodEdition);
    if (identities.has(identity)) fail('CORRELATION_ENGINEERING_PROFILE_DUPLICATE', `profiles[${index}]`);
    identities.add(identity);
  });
  return freeze({
    schema: CORRELATION_METHOD_REGISTRY_SCHEMA,
    profiles: profiles.sort((a, b) => compare(methodKey(a.methodIdentity, a.methodEdition),
      methodKey(b.methodIdentity, b.methodEdition))),
  });
}

export function requireEngineeringCorrelationProfile(registry, methodIdentity, methodEdition) {
  if (!registry || registry.schema !== CORRELATION_METHOD_REGISTRY_SCHEMA
    || !Array.isArray(registry.profiles)) {
    fail('CORRELATION_ENGINEERING_REGISTRY_INVALID', 'registry');
  }
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
  if (!registry || registry.schema !== CORRELATION_METHOD_REGISTRY_SCHEMA
    || !Array.isArray(registry.profiles)) {
    fail('CORRELATION_ENGINEERING_REGISTRY_INVALID', 'registry');
  }
  return registry.profiles.map((profile) => freeze({
    methodIdentity: profile.methodIdentity,
    methodEdition: profile.methodEdition,
    coefficientDatasetId: profile.coefficientDatasetId,
    coefficientDatasetHash: profile.coefficientDatasetHash,
    applicabilityProfileId: profile.applicabilityProfileId,
    sourceReference: profile.provenance.sourceReference,
    sourceEdition: profile.provenance.sourceEdition,
    licenseAuthority: profile.provenance.licenseAuthority,
  }));
}

export const EMPTY_ENGINEERING_CORRELATION_REGISTRY = createEngineeringCorrelationRegistry([]);

function methodKey(methodIdentity, methodEdition) { return `${methodIdentity}@@${methodEdition}`; }
function requiredString(value, path) { if (typeof value !== 'string' || !value) fail('CORRELATION_STRING_REQUIRED', path); return value; }
function compare(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function fail(code, path) { const error = new Error(code); error.code = code; error.path = path; throw error; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
