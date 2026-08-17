import assert from 'node:assert/strict';
import {
  EMPTY_ENGINEERING_CORRELATION_REGISTRY,
  createEngineeringCorrelationRegistry,
  engineeringCorrelationMethods,
  requireEngineeringCorrelationProfile,
  syntheticCorrelationProfile,
} from '../src/core/local-attachment-correlation/index.js';

assert.deepEqual(engineeringCorrelationMethods(EMPTY_ENGINEERING_CORRELATION_REGISTRY), []);
assert.throws(
  () => requireEngineeringCorrelationProfile(
    EMPTY_ENGINEERING_CORRELATION_REGISTRY,
    'NOT-REGISTERED',
    '1',
  ),
  (error) => error?.code === 'CORRELATION_ENGINEERING_PROFILE_NOT_REGISTERED',
);

const synthetic = syntheticCorrelationProfile();
assert.throws(
  () => createEngineeringCorrelationRegistry([synthetic]),
  (error) => error?.code === 'CORRELATION_ENGINEERING_PROFILE_NOT_AUTHORIZED',
);

const falselyAuthorizedTestData = structuredClone(synthetic);
falselyAuthorizedTestData.authority.engineeringUseAuthorized = true;
falselyAuthorizedTestData.authority.authorizationBasis = 'TEST-TAMPER';
assert.throws(
  () => createEngineeringCorrelationRegistry([falselyAuthorizedTestData]),
  (error) => error?.code === 'CORRELATION_ENGINEERING_PROFILE_TEST_DATA_FORBIDDEN',
);

console.log(JSON.stringify({
  check: 'lafea-correlation-engineering-registry-authority',
  status: 'PASS',
  registeredEngineeringMethods: 0,
  syntheticProfileRejected: true,
  testDataCannotBePromotedByAuthorityFlag: true,
  missingMethodFailsClosed: true,
}));
