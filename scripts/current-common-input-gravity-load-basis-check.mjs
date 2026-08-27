#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  createEmptyProjectDataProfile,
  projectDataEntry,
  replaceProjectDataValue,
} from '../src/workspace/project-data/project-data-contract.js';
import {
  createNonFeaProductDefaultProvider,
} from '../src/workspace/project-data/non-fea-product-default-profile.js';
import {
  createCurrentCommonInputGravityLoadBasis,
  requireCurrentCommonInputGravityLoadBasis,
} from '../src/workspace/engineering-loads/current-common-input-gravity-load-basis.js';

const productProfile = productDefaultProfile();
const productInput = commonInput(productProfile, '1', '2');
const productBasis = createCurrentCommonInputGravityLoadBasis({ commonInput: productInput });

assert.equal(productBasis.gravity.value, 9.80665);
assert.equal(productBasis.gravity.unit, 'm/s²');
assert.equal(productBasis.gravity.authority, 'PRODUCT_DEFAULT');
assert.equal(productBasis.gravity.evidence.projectDataEvidence.defaultId, 'PD-GRAVITY');
assert.equal(productBasis.loadFactor.value, 1);
assert.equal(productBasis.loadFactor.authority, 'PRODUCT_DEFAULT');
assert.equal(productBasis.loadFactor.evidence.projectDataEvidence.defaultId, 'PD-LOAD-FACTOR');
assert.equal(productBasis.forceFormula, 'massKg * gravityMPerS2 * loadFactor');
assert.equal(productBasis.commonInputSemanticHash, productInput.semanticHash);
assert.equal(productBasis.commonInputSealSemanticHash, productInput.seal.semanticHash);
assert.equal(productBasis.projectDataProfileSemanticHash, semanticHash(productProfile));
assert.equal(productBasis.profile.loadCalculation.gravityMPerS2.value, 9.80665);
assert.equal(
  productBasis.profile.loadCalculation.gravityMPerS2.evidence.gravityLoadBasisBindingSemanticHash,
  productBasis.bindingSemanticHash,
);
assert.equal(
  productBasis.profile.loadCalculation.loadFactor.evidence.gravityLoadBasisBindingSemanticHash,
  productBasis.bindingSemanticHash,
);
requireCurrentCommonInputGravityLoadBasis(productBasis, { commonInput: productInput });

const projectProfile = replaceProjectDataValue(
  replaceProjectDataValue(
    productProfile,
    'loadCalculation.gravityMPerS2',
    9.7,
    {
      source: 'PR1495 project gravity fixture',
      authority: 'PROJECT_POLICY',
      basis: 'Project-specific approved gravity basis.',
    },
    true,
  ),
  'loadCalculation.loadFactor',
  1.15,
  {
    source: 'PR1495 project load-factor fixture',
    authority: 'PROJECT_POLICY',
    basis: 'Project-specific screening load factor.',
  },
  true,
);
const projectBasis = createCurrentCommonInputGravityLoadBasis({
  commonInput: commonInput(projectProfile, '3', '4'),
});
assert.equal(projectBasis.gravity.value, 9.7);
assert.equal(projectBasis.gravity.authority, 'PROJECT_POLICY');
assert.equal(projectBasis.gravity.evidence.authorityMigration, null);
assert.equal(projectBasis.loadFactor.value, 1.15);
assert.equal(projectBasis.loadFactor.authority, 'PROJECT_POLICY');
assert.equal(projectBasis.loadFactor.evidence.authorityMigration, null);

const legacyProfile = replaceProjectDataValue(
  replaceProjectDataValue(
    productProfile,
    'loadCalculation.gravityMPerS2',
    9.81,
    { source: 'Legacy approved Project Data gravity' },
    true,
  ),
  'loadCalculation.loadFactor',
  1.05,
  { source: 'Legacy approved Project Data load factor' },
  true,
);
const legacyBasis = createCurrentCommonInputGravityLoadBasis({
  commonInput: commonInput(legacyProfile, '5', '6'),
});
assert.equal(legacyBasis.gravity.authority, 'PROJECT_POLICY');
assert.deepEqual(legacyBasis.gravity.evidence.authorityMigration, {
  from: 'PROJECT_DATA_APPROVED',
  to: 'PROJECT_POLICY',
  reason: 'Legacy approved project-owned scalar field had no explicit authority token.',
});
assert.equal(legacyBasis.loadFactor.authority, 'PROJECT_POLICY');
assert.equal(legacyBasis.loadFactor.evidence.authorityMigration.to, 'PROJECT_POLICY');

const productGravityEntry = projectDataEntry(productProfile, 'loadCalculation.gravityMPerS2');
const forgedProductProfile = replaceProjectDataValue(
  productProfile,
  'loadCalculation.gravityMPerS2',
  8.0,
  productGravityEntry.evidence,
  true,
);
assert.throws(
  () => createCurrentCommonInputGravityLoadBasis({
    commonInput: commonInput(forgedProductProfile, '7', '8'),
  }),
  (error) => error?.code === 'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_PRODUCT_DEFAULT_MISMATCH',
  'a Product-default authority token must not authorize a value that differs from the exact catalog row',
);

const unsupportedAuthorityProfile = replaceProjectDataValue(
  productProfile,
  'loadCalculation.gravityMPerS2',
  9.81,
  { source: 'Fake master', authority: 'EXACT_APPROVED_MASTER' },
  true,
);
assert.throws(
  () => createCurrentCommonInputGravityLoadBasis({
    commonInput: commonInput(unsupportedAuthorityProfile, '9', 'a'),
  }),
  (error) => error?.code === 'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_AUTHORITY_INVALID',
  'gravity/load factor are project-owned fields and must not gain an unsupported authority tier',
);

const zeroGravityProfile = replaceProjectDataValue(
  productProfile,
  'loadCalculation.gravityMPerS2',
  0,
  { source: 'Invalid fixture', authority: 'PROJECT_POLICY' },
  true,
);
assert.throws(
  () => createCurrentCommonInputGravityLoadBasis({
    commonInput: commonInput(zeroGravityProfile, 'b', 'c'),
  }),
  (error) => error?.code === 'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_VALUE_INVALID',
  'invalid force multipliers must fail closed rather than be repaired',
);

assert.throws(
  () => requireCurrentCommonInputGravityLoadBasis(productBasis, {
    commonInput: commonInput(productProfile, 'd', '2'),
  }),
  (error) => error?.code === 'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_COMMON_INPUT_MISMATCH',
  'a receipt from a different Common Input semantic identity must fail closed',
);

const wrapperSource = await readFile(
  new URL('../src/workspace/engineering-loads/current-common-input-empirical-support-load-execution.js', import.meta.url),
  'utf8',
);
const kernelSource = await readFile(
  new URL('../src/workspace/engineering-loads/support-load-distribution-v3.js', import.meta.url),
  'utf8',
);
assert.match(wrapperSource, /createCurrentCommonInputGravityLoadBasis\(\{ commonInput \}\)/u);
assert.match(wrapperSource, /profile: gravityLoadBasis\.profile/u,
  'support capability projection must start from the receipt-bound gravity/load execution profile');
assert.match(wrapperSource, /gravityLoadBasisSemanticHash: gravityLoadBasis\.semanticHash/u);
assert.match(wrapperSource, /unboundProjectDataGravityLoadConsumed: false/u);
assert.match(kernelSource,
  /const forceN = mass\.massKg\s*\n\s*\* projectDataValue\(input\.profile, 'loadCalculation\.gravityMPerS2'\)\s*\n\s*\* projectDataValue\(input\.profile, 'loadCalculation\.loadFactor'\);/u,
  'the existing scalar force formula must remain unchanged in the legacy kernel');
assert.doesNotMatch(kernelSource, /current-common-input-gravity-load-basis|gravityLoadBasis/u,
  'the non-authorizing statics kernel must not acquire current Common Input authority logic');

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_CURRENT_COMMON_INPUT_EFFECTIVE_GRAVITY_LOAD_BASIS',
  productDefaultGravity: productBasis.gravity.value,
  productDefaultLoadFactor: productBasis.loadFactor.value,
  productDefaultAuthorityPreserved: true,
  projectPolicyAuthorityPreserved: true,
  legacyProjectAuthorityMigrationVisible: true,
  forgedProductDefaultFailsClosed: true,
  unsupportedAuthorityFailsClosed: true,
  invalidValueFailsClosed: true,
  staleCommonInputFailsClosed: true,
  forceFormulaChanged: false,
  allocationMechanicsChanged: false,
  sourceAxisMechanicsChanged: false,
}, null, 2));

function productDefaultProfile() {
  const empty = createEmptyProjectDataProfile();
  const project = {
    ...empty,
    projectId: 'PR1495-PROJECT',
    revision: 1,
    updatedAt: '2026-08-27T17:35:00.000Z',
  };
  return createNonFeaProductDefaultProvider({ profile: project }).effectiveProfile;
}

function commonInput(profile, commonDigit, sealDigit) {
  return {
    packageState: 'READY',
    semanticHash: `fnv1a64:${String(commonDigit).repeat(16)}`,
    seal: { semanticHash: `fnv1a64:${String(sealDigit).repeat(16)}` },
    projectDataProfile: profile,
  };
}
