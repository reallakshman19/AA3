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
  NON_FEA_FLUID_FILL_POLICY_SCHEMA,
  resolveNonFeaFluidFillPolicy,
  validateNonFeaFluidFillPolicy,
} from '../src/workspace/project-data/non-fea-fluid-fill-policy.js';
import { getNonFeaFieldDefinition } from '../src/workspace/project-data/non-fea-field-registry.js';

const product = createNonFeaProductDefaultProvider({
  profile: createEmptyProjectDataProfile(),
});
const productProfile = product.effectiveProfile;
const productEntry = productProfile.thermoMechanicalBasis.fluidPhaseAndFillState;
assert.equal(productEntry.evidence.authority, 'PRODUCT_DEFAULT');
assert.equal(productEntry.value.schema, NON_FEA_FLUID_FILL_POLICY_SCHEMA);

const empty = resolveNonFeaFluidFillPolicy({
  profile: productProfile,
  lineKey: 'L-1',
  loadCaseId: 'EMPTY',
});
const ope = resolveNonFeaFluidFillPolicy({
  profile: productProfile,
  lineKey: 'L-1',
  loadCaseId: 'OPE',
});
const hyd = resolveNonFeaFluidFillPolicy({
  profile: productProfile,
  lineKey: 'L-1',
  loadCaseId: 'HYD',
});
assert.equal(empty.fillFraction, 0);
assert.equal(empty.phase, 'EMPTY');
assert.equal(ope.fillFraction, 1);
assert.equal(ope.phase, 'UNSPECIFIED');
assert.equal(hyd.fillFraction, 1);
assert.equal(hyd.phase, 'LIQUID');

let projectProfile = replaceProjectDataValue(
  createEmptyProjectDataProfile(),
  'thermoMechanicalBasis.fluidPhaseAndFillState',
  {
    schema: NON_FEA_FLUID_FILL_POLICY_SCHEMA,
    cases: {
      OPE: { fillFraction: 0.8, phase: 'MIXED' },
      HYD: 'LIQUID_FULL',
    },
    lines: {
      'L-1': {
        OPE: { fillFraction: 0.6, phase: 'MIXED' },
      },
    },
  },
  { source: 'PROJECT_FILL_POLICY', authority: 'PROJECT_POLICY' },
  true,
);
projectProfile = createNonFeaProductDefaultProvider({ profile: projectProfile }).effectiveProfile;
const lineOpe = resolveNonFeaFluidFillPolicy({
  profile: projectProfile,
  lineKey: 'L-1',
  loadCaseId: 'OPE',
});
const otherOpe = resolveNonFeaFluidFillPolicy({
  profile: projectProfile,
  lineKey: 'L-2',
  loadCaseId: 'OPE',
});
assert.equal(lineOpe.fillFraction, 0.6);
assert.equal(lineOpe.selector, 'LINE:L-1:OPE');
assert.equal(otherOpe.fillFraction, 0.8);
assert.equal(otherOpe.selector, 'CASE:OPE');
assert.notEqual(lineOpe.semanticHash, otherOpe.semanticHash);

let legacyProfile = replaceProjectDataValue(
  createEmptyProjectDataProfile(),
  'thermoMechanicalBasis.fluidPhaseAndFillState',
  { DEFAULT: 'LIQUID_FULL' },
  { source: 'LEGACY_1885S_FILL_POLICY', authority: 'PROJECT_POLICY' },
  true,
);
legacyProfile = createNonFeaProductDefaultProvider({ profile: legacyProfile }).effectiveProfile;
const legacyOpe = resolveNonFeaFluidFillPolicy({
  profile: legacyProfile,
  lineKey: '1885S',
  loadCaseId: 'OPE',
});
const legacyHyd = resolveNonFeaFluidFillPolicy({
  profile: legacyProfile,
  lineKey: '1885S',
  loadCaseId: 'HYD',
});
const legacyEmpty = resolveNonFeaFluidFillPolicy({
  profile: legacyProfile,
  lineKey: '1885S',
  loadCaseId: 'EMPTY',
});
assert.equal(legacyOpe.fillFraction, 1);
assert.equal(legacyHyd.fillFraction, 1);
assert.equal(legacyEmpty.fillFraction, 0);
assert.equal(legacyEmpty.selector, 'CANONICAL:EMPTY');

const field = getNonFeaFieldDefinition('FLUID_PHASE_AND_FILL_STATE');
assert.ok(field);
assert.equal(field.defaultEligible, true);
assert.ok(field.authorityPath.includes('PRODUCT_DEFAULT'));
assert.ok(field.authorityPath.includes('PROJECT_CONFIGURED_DEFAULT'));
assert.ok(field.methods.includes('WEIGHT_AND_GRAVITY'));

assert.equal(validateNonFeaFluidFillPolicy({
  schema: NON_FEA_FLUID_FILL_POLICY_SCHEMA,
  cases: { OPE: { fillFraction: 0.5, phase: 'MIXED' } },
}).valid, true);
assert.equal(validateNonFeaFluidFillPolicy({
  schema: NON_FEA_FLUID_FILL_POLICY_SCHEMA,
  cases: { OPE: { fillFraction: 1.2, phase: 'MIXED' } },
}).valid, false);

const zeroOpe = resolveNonFeaFluidFillPolicy({
  profile: effectivePolicy({ cases: { OPE: { fillFraction: 0, phase: 'EMPTY' } } }),
  lineKey: 'L-1',
  loadCaseId: 'OPE',
});
assert.equal(zeroOpe.fillFraction, 0);
assert.equal(zeroOpe.phase, 'EMPTY');
assert.equal(zeroOpe.loadCaseId, 'OPE');
assert.equal(zeroOpe.selector, 'CASE:OPE');
expectCode(
  () => resolveNonFeaFluidFillPolicy({
    profile: effectivePolicy({ cases: { EMPTY: 'LIQUID_FULL' } }),
    lineKey: 'L-1',
    loadCaseId: 'EMPTY',
  }),
  'EMPIRICAL_FLUID_EMPTY_CASE_NONZERO_UNSUPPORTED',
);

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_FLUID_FILL_POLICY',
  productDefault: { EMPTY: empty.fillFraction, OPE: ope.fillFraction, HYD: hyd.fillFraction },
  lineCasePrecedence: lineOpe.fillFraction,
  casePrecedence: otherOpe.fillFraction,
  legacyDefaultOpe: legacyOpe.fillFraction,
  legacyDefaultEmpty: legacyEmpty.fillFraction,
  zeroOpeGoverned: zeroOpe.fillFraction === 0,
  nonzeroEmptyFailClosed: true,
}, null, 2));

function effectivePolicy(value) {
  const profile = replaceProjectDataValue(
    createEmptyProjectDataProfile(),
    'thermoMechanicalBasis.fluidPhaseAndFillState',
    { schema: NON_FEA_FLUID_FILL_POLICY_SCHEMA, ...value },
    { source: 'TEST_POLICY', authority: 'PROJECT_POLICY' },
    true,
  );
  return createNonFeaProductDefaultProvider({ profile }).effectiveProfile;
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.equal(error?.code, code);
    return true;
  });
}
