import { semanticHash } from '../shared-primitives/canonical-json.js';
import { CORRELATION_PROFILE_SCHEMA } from './constants.js';
import { createCorrelationProfile } from './profile.js';

export const CORRELATION_DATASET_PACKAGE_SCHEMA = 'local-attachment-correlation-dataset-package/v1';

export function createCorrelationDatasetPackage(input) {
  const source = structuredClone(input);
  exactKeys(source, [
    'schema', 'packageIdentity', 'packageVersion', 'methodIdentity', 'methodEdition',
    'coefficientDatasetId', 'applicabilityProfileId', 'provenance', 'axes',
    'targets', 'responses', 'uncertainty',
  ], 'datasetPackage');
  if (source.schema !== CORRELATION_DATASET_PACKAGE_SCHEMA) {
    fail('CORRELATION_DATASET_PACKAGE_SCHEMA_MISMATCH', 'datasetPackage.schema');
  }
  requiredString(source.packageIdentity, 'datasetPackage.packageIdentity');
  requiredString(source.packageVersion, 'datasetPackage.packageVersion');
  const profile = unqualifiedProfile(source);
  const base = {
    ...source,
    coefficientDatasetHash: profile.coefficientDatasetHash,
  };
  return freeze({ ...base, packageSemanticHash: semanticHash(base) });
}

export function validateCorrelationDatasetPackage(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('CORRELATION_DATASET_PACKAGE_OBJECT_REQUIRED', 'datasetPackage');
  }
  exactKeys(value, [
    'schema', 'packageIdentity', 'packageVersion', 'methodIdentity', 'methodEdition',
    'coefficientDatasetId', 'coefficientDatasetHash', 'applicabilityProfileId',
    'provenance', 'axes', 'targets', 'responses', 'uncertainty',
    'packageSemanticHash',
  ], 'datasetPackage');
  const { coefficientDatasetHash, packageSemanticHash, ...source } = value;
  const reconstructed = createCorrelationDatasetPackage(source);
  if (coefficientDatasetHash !== reconstructed.coefficientDatasetHash) {
    fail('CORRELATION_DATASET_PACKAGE_COEFFICIENT_HASH_MISMATCH',
      'datasetPackage.coefficientDatasetHash');
  }
  if (packageSemanticHash !== reconstructed.packageSemanticHash) {
    fail('CORRELATION_DATASET_PACKAGE_HASH_MISMATCH', 'datasetPackage.packageSemanticHash');
  }
  return reconstructed;
}

export function unqualifiedCorrelationProfileFromDatasetPackage(packageInput) {
  const retained = validateCorrelationDatasetPackage(packageInput);
  return unqualifiedProfile(retained);
}

function unqualifiedProfile(source) {
  return createCorrelationProfile({
    schema: CORRELATION_PROFILE_SCHEMA,
    methodIdentity: source.methodIdentity,
    methodEdition: source.methodEdition,
    coefficientDatasetId: source.coefficientDatasetId,
    coefficientDatasetHash: source.coefficientDatasetHash ?? null,
    interpolationPolicyId: 'BILINEAR_NO_EXTRAPOLATION',
    applicabilityProfileId: source.applicabilityProfileId,
    provenance: structuredClone(source.provenance),
    authority: {
      engineeringUseAuthorized: false,
      authorizationBasis: 'DATASET_PACKAGE_INGESTED_NOT_ENGINEERING_QUALIFIED',
    },
    axes: structuredClone(source.axes),
    targets: structuredClone(source.targets),
    responses: structuredClone(source.responses),
    uncertainty: structuredClone(source.uncertainty),
  });
}

function requiredString(value, path) {
  if (typeof value !== 'string' || !value) fail('CORRELATION_STRING_REQUIRED', path);
  return value;
}
function exactKeys(value, expected, path) {
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(required)) {
    fail('CORRELATION_EXACT_KEYS_MISMATCH', path);
  }
}
function fail(code, path) { const error = new Error(code); error.code = code; error.path = path; throw error; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
