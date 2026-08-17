import assert from 'node:assert/strict';
import {
  createCorrelationDatasetPackage,
  createEngineeringCorrelationRegistry,
  syntheticCorrelationProfile,
  unqualifiedCorrelationProfileFromDatasetPackage,
  validateCorrelationDatasetPackage,
} from '../src/core/local-attachment-correlation/index.js';

const synthetic = syntheticCorrelationProfile();
const sourcePackage = {
  schema: 'local-attachment-correlation-dataset-package/v1',
  packageIdentity: 'DATASET-INTAKE-QUALIFICATION-001',
  packageVersion: '1',
  methodIdentity: 'INGESTED-METHOD-QUALIFICATION',
  methodEdition: 'SOURCE-EDITION-1',
  coefficientDatasetId: synthetic.coefficientDatasetId,
  applicabilityProfileId: synthetic.applicabilityProfileId,
  provenance: {
    sourceReference: 'USER-SUPPLIED-LICENSED-SOURCE-CLAIM',
    sourceEdition: 'SOURCE-EDITION-1',
    dataExtraction: 'DIGITIZED-TABLE-CLAIM',
    licenseAuthority: 'USER-SUPPLIED-LICENSE-CLAIM',
  },
  axes: structuredClone(synthetic.axes),
  targets: structuredClone(synthetic.targets),
  responses: structuredClone(synthetic.responses),
  uncertainty: structuredClone(synthetic.uncertainty),
};

const first = createCorrelationDatasetPackage(sourcePackage);
const second = createCorrelationDatasetPackage(sourcePackage);
assert.deepEqual(first, second);
assert.match(first.coefficientDatasetHash, /^fnv1a64:[0-9a-f]{16}$/u);
assert.match(first.packageSemanticHash, /^fnv1a64:[0-9a-f]{16}$/u);
assert.deepEqual(validateCorrelationDatasetPackage(first), first);

const profile = unqualifiedCorrelationProfileFromDatasetPackage(first);
assert.equal(profile.methodIdentity, sourcePackage.methodIdentity);
assert.equal(profile.methodEdition, sourcePackage.methodEdition);
assert.equal(profile.coefficientDatasetHash, first.coefficientDatasetHash);
assert.equal(profile.authority.engineeringUseAuthorized, false);
assert.equal(
  profile.authority.authorizationBasis,
  'DATASET_PACKAGE_INGESTED_NOT_ENGINEERING_QUALIFIED',
);
assert.throws(
  () => createEngineeringCorrelationRegistry([profile]),
  (error) => error?.code === 'CORRELATION_ENGINEERING_PROFILE_NOT_AUTHORIZED',
);

const tampered = structuredClone(first);
tampered.responses.find((row) => row.responseId === 'FX-SIGMA-X-MEMBRANE')
  .coefficients[0][0] += 0.001;
assert.throws(
  () => validateCorrelationDatasetPackage(tampered),
  (error) => [
    'CORRELATION_DATASET_PACKAGE_COEFFICIENT_HASH_MISMATCH',
    'CORRELATION_DATASET_PACKAGE_HASH_MISMATCH',
  ].includes(error?.code),
);

const unknownField = { ...sourcePackage, silentlyTrusted: true };
assert.throws(
  () => createCorrelationDatasetPackage(unknownField),
  (error) => error?.code === 'CORRELATION_EXACT_KEYS_MISMATCH',
);

console.log(JSON.stringify({
  check: 'lafea-correlation-dataset-intake',
  status: 'PASS',
  packageIdentity: first.packageIdentity,
  coefficientDatasetHash: first.coefficientDatasetHash,
  packageSemanticHash: first.packageSemanticHash,
  deterministicReplay: true,
  claimedLicenseDoesNotCreateAuthority: true,
  ingestedProfileEngineeringUseAuthorized: profile.authority.engineeringUseAuthorized,
  coefficientTamperRejected: true,
  unknownTrustFieldRejected: true,
}));
