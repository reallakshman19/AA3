#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  createEmptyProjectDataProfile,
  replaceProjectDataValue,
} from '../src/workspace/project-data/project-data-contract.js';
import {
  createNonFeaProductDefaultProvider,
} from '../src/workspace/project-data/non-fea-product-default-profile.js';
import {
  IMPLEMENTED_GRAVITY_CONVENTIONS,
  bindAuthorizedEmpiricalGravityConventions,
  requireAuthorizedEmpiricalGravityConventions,
} from '../src/workspace/engineering-loads/authorized-empirical-gravity-convention-binding.js';

const product = createNonFeaProductDefaultProvider({
  profile: createEmptyProjectDataProfile(),
}).effectiveProfile;
const authority = requireAuthorizedEmpiricalGravityConventions(product);
assert.deepEqual(authority.conventions, IMPLEMENTED_GRAVITY_CONVENTIONS);
assert.equal(authority.rows.length, 4);
assert(authority.rows.every((row) => row.sourceAuthority === 'PRODUCT_DEFAULT'));

const distribution = {
  schema: 'support-load-distribution/v3',
  method: 'CHAINAGE_TRIBUTARY_SPAN_V2',
  sourceAxisBasis: 'Z_UP',
  verticalForceConvention: 'positive reaction opposes source-axis gravity',
  loadCases: [{
    loadCaseId: 'EMPTY',
    equilibrium: {
      momentReference: 'PER_ROUTE_CHAINAGE_ORIGIN_WITH_AGGREGATE_DIAGNOSTIC',
    },
    supportResults: [],
  }],
};
const bound = bindAuthorizedEmpiricalGravityConventions({
  distribution,
  profile: product,
});
assert.equal(bound.forceOutputConvention,
  IMPLEMENTED_GRAVITY_CONVENTIONS.forceOutputConvention);
assert.equal(bound.momentOutputConvention,
  IMPLEMENTED_GRAVITY_CONVENTIONS.momentOutputConvention);
assert.equal(bound.analysisBasis,
  IMPLEMENTED_GRAVITY_CONVENTIONS.analysisBasis);
assert.equal(bound.resultSignConvention,
  IMPLEMENTED_GRAVITY_CONVENTIONS.resultSignConvention);
assert.equal(bound.gravityConventionAuthority.semanticHash, authority.semanticHash);
assert.equal(Object.hasOwn(distribution, 'gravityConventionAuthority'), false,
  'source distribution must remain immutable');

expectUnsupported('forceOutputConvention', 'SIGNED_SOURCE_AXIS_FORCE',
  'EMPIRICAL_GRAVITY_FORCE_OUTPUT_CONVENTION_UNSUPPORTED');
expectUnsupported('momentOutputConvention', 'ABSOLUTE_ROUTE_MOMENT',
  'EMPIRICAL_GRAVITY_MOMENT_OUTPUT_CONVENTION_UNSUPPORTED');
expectUnsupported('analysisBasis', 'GLOBAL_XZ_PLANE',
  'EMPIRICAL_GRAVITY_ANALYSIS_BASIS_UNSUPPORTED');
expectUnsupported('resultSignConvention', 'DOWNWARD_POSITIVE',
  'EMPIRICAL_GRAVITY_RESULT_SIGN_CONVENTION_UNSUPPORTED');

assert.throws(
  () => bindAuthorizedEmpiricalGravityConventions({
    distribution: {
      ...distribution,
      verticalForceConvention: 'downward positive',
    },
    profile: product,
  }),
  (error) => error?.code === 'EMPIRICAL_GRAVITY_FORCE_KERNEL_CONVENTION_MISMATCH',
);
assert.throws(
  () => bindAuthorizedEmpiricalGravityConventions({
    distribution: {
      ...distribution,
      loadCases: [{
        ...distribution.loadCases[0],
        equilibrium: { momentReference: 'GLOBAL_ORIGIN' },
      }],
    },
    profile: product,
  }),
  (error) => error?.code === 'EMPIRICAL_GRAVITY_MOMENT_KERNEL_CONVENTION_MISMATCH',
);

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_GRAVITY_OUTPUT_CONVENTION_BINDING',
  implemented: IMPLEMENTED_GRAVITY_CONVENTIONS,
  productDefaultsAccepted: true,
  unsupportedAlternativesFailClosed: true,
  kernelForceConventionCrossChecked: true,
  kernelMomentReferenceCrossChecked: true,
  authorityReceiptBound: true,
}, null, 2));

function expectUnsupported(field, value, code) {
  let profile = createEmptyProjectDataProfile();
  profile = replaceProjectDataValue(
    profile,
    `loadCalculation.${field}`,
    value,
    { source: 'UNSUPPORTED_CONVENTION_FIXTURE', authority: 'PROJECT_POLICY' },
    true,
  );
  profile = createNonFeaProductDefaultProvider({ profile }).effectiveProfile;
  assert.throws(
    () => requireAuthorizedEmpiricalGravityConventions(profile),
    (error) => error?.code === code,
  );
}
