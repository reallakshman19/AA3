import assert from 'node:assert/strict';
import {
  createEmptyProjectDataProfile,
} from '../src/workspace/project-data/project-data-contract.js';
import {
  createNonFeaProductDefaultProvider,
} from '../src/workspace/project-data/non-fea-product-default-profile.js';
import {
  assertEmpiricalCaseConfigurationsAuthorized,
  assertRequestedLoadCasesAuthorized,
  createNonFeaLoadCaseAuthority,
} from '../src/workspace/project-data/non-fea-load-case-authority.js';

const readyProfile = profile(['HYD', 'EMPTY', 'OPE']);
const authorityA = createNonFeaLoadCaseAuthority(readyProfile);
const authorityB = createNonFeaLoadCaseAuthority(structuredClone(readyProfile));

assert.equal(authorityA.state, 'READY');
assert.deepEqual(authorityA.approvedLoadCases, ['EMPTY', 'OPE', 'HYD']);
assert.equal(authorityA.effectiveAuthority, 'PROJECT_DATA_APPROVED');
assert.equal(authorityA.provenance.source, 'PROJECT-DATA-LOAD-CASE-BASIS');
assert.equal(authorityA.provenance.defaultId, null);
assert.equal(authorityA.semanticHash, authorityB.semanticHash, 'load-case authority must be deterministic');
assert.deepEqual(assertRequestedLoadCasesAuthorized(authorityA, ['OPE', 'EMPTY']), ['EMPTY', 'OPE']);
assert.throws(
  () => assertRequestedLoadCasesAuthorized(authorityA, ['OPE', 'STARTUP']),
  (error) => error?.code === 'LOAD_CASE_NOT_PROJECT_DATA_APPROVED',
);

assert.deepEqual(assertEmpiricalCaseConfigurationsAuthorized(authorityA, [
  { loadCaseId: 'W-COLD', weightPrimitiveCaseId: 'EMPTY' },
  { loadCaseId: 'OPERATING', weightPrimitiveCaseId: 'OPE' },
  { loadCaseId: 'THERMAL-ONLY', weightPrimitiveCaseId: null },
]), ['EMPTY', 'OPE']);
assert.throws(
  () => assertEmpiricalCaseConfigurationsAuthorized(authorityA, [
    { loadCaseId: 'BAD', weightPrimitiveCaseId: 'STARTUP' },
  ]),
  (error) => error?.code === 'LOAD_CASE_NOT_PROJECT_DATA_APPROVED',
);

const rawEmptyProfile = createEmptyProjectDataProfile();
const rawEmptyAuthority = createNonFeaLoadCaseAuthority(rawEmptyProfile);
assert.equal(rawEmptyAuthority.state, 'BLOCKED', 'raw empty Project Data must remain fail-closed');
assert.ok(rawEmptyAuthority.blockers.some((row) => row.code === 'ACTIVE_LOAD_CASES_EMPTY'));

const productProvider = createNonFeaProductDefaultProvider({ profile: rawEmptyProfile });
const productAuthority = createNonFeaLoadCaseAuthority(productProvider.effectiveProfile);
assert.equal(productAuthority.state, 'READY');
assert.deepEqual(productAuthority.approvedLoadCases, ['EMPTY', 'OPE', 'HYD']);
assert.equal(productAuthority.effectiveAuthority, 'PRODUCT_DEFAULT');
assert.equal(productAuthority.provenance.source, 'Load Calc built-in product default');
assert.equal(productAuthority.provenance.defaultId, 'PD-ACTIVE-CASES');
assert.equal(productAuthority.provenance.profileId, 'LOAD_CALC_STANDARD_DEFAULTS_V1');
assert.equal(productAuthority.provenance.profileVersion, 4);
assert.ok(productAuthority.provenance.defaultSemanticHash);
assert.ok(productAuthority.provenance.productDefaultProfileSemanticHash);
assert.ok(productProvider.usageRows.some((row) => row.defaultId === 'PD-ACTIVE-CASES'));

const projectShadowProfile = createEmptyProjectDataProfile();
projectShadowProfile.loadCalculation.activeLoadCases = {
  value: ['OPE'],
  evidence: {
    source: 'PROJECT-CASE-BASIS',
    authority: 'PROJECT_CONFIGURED_DEFAULT',
  },
  approved: true,
};
const shadowProvider = createNonFeaProductDefaultProvider({ profile: projectShadowProfile });
const projectAuthority = createNonFeaLoadCaseAuthority(shadowProvider.effectiveProfile);
assert.equal(projectAuthority.state, 'READY');
assert.deepEqual(projectAuthority.approvedLoadCases, ['OPE']);
assert.equal(projectAuthority.effectiveAuthority, 'PROJECT_CONFIGURED_DEFAULT');
assert.equal(projectAuthority.provenance.defaultId, null);
assert.ok(shadowProvider.shadowedRows.some((row) => row.defaultId === 'PD-ACTIVE-CASES'));
assert.equal(shadowProvider.usageRows.some((row) => row.defaultId === 'PD-ACTIVE-CASES'), false,
  'Product default must not overwrite an explicit project case set');

const invalidExplicitProfile = createEmptyProjectDataProfile();
invalidExplicitProfile.loadCalculation.activeLoadCases = {
  value: ['EMPTY', 'STARTUP'],
  evidence: { source: 'INVALID-PROJECT-CASE-BASIS' },
  approved: true,
};
const invalidExplicitProvider = createNonFeaProductDefaultProvider({ profile: invalidExplicitProfile });
const invalidExplicitAuthority = createNonFeaLoadCaseAuthority(invalidExplicitProvider.effectiveProfile);
assert.equal(invalidExplicitAuthority.state, 'BLOCKED');
assert.ok(invalidExplicitAuthority.blockers.some((row) => row.code === 'ACTIVE_LOAD_CASE_UNKNOWN'));
assert.ok(invalidExplicitProvider.shadowedRows.some((row) => row.defaultId === 'PD-ACTIVE-CASES'));
assert.equal(invalidExplicitProvider.usageRows.some((row) => row.defaultId === 'PD-ACTIVE-CASES'), false,
  'Invalid explicit project cases must never be silently repaired by Product default');

const malformedProduct = createEmptyProjectDataProfile();
malformedProduct.loadCalculation.activeLoadCases = {
  value: ['EMPTY', 'OPE', 'HYD'],
  evidence: {
    source: 'FORGED-PRODUCT-DEFAULT',
    authority: 'PRODUCT_DEFAULT',
    defaultId: 'PD-ACTIVE-CASES',
  },
  approved: true,
};
const malformedProductAuthority = createNonFeaLoadCaseAuthority(malformedProduct);
assert.equal(malformedProductAuthority.state, 'BLOCKED');
assert.ok(malformedProductAuthority.blockers.some((row) => row.code === 'ACTIVE_LOAD_CASES_PRODUCT_DEFAULT_EVIDENCE_INVALID'));

const unapproved = profile(['EMPTY']);
unapproved.loadCalculation.activeLoadCases.approved = false;
const unapprovedAuthority = createNonFeaLoadCaseAuthority(unapproved);
assert.equal(unapprovedAuthority.state, 'BLOCKED');
assert.ok(unapprovedAuthority.blockers.some((row) => row.code === 'ACTIVE_LOAD_CASES_NOT_APPROVED'));
assert.throws(
  () => assertRequestedLoadCasesAuthorized(unapprovedAuthority, ['EMPTY']),
  (error) => error?.code === 'LOAD_CASE_AUTHORITY_NOT_READY',
);

const missingAuthority = createNonFeaLoadCaseAuthority({ revision: 1, loadCalculation: {} });
assert.equal(missingAuthority.state, 'BLOCKED');
assert.ok(missingAuthority.blockers.some((row) => row.code === 'ACTIVE_LOAD_CASES_MISSING'));

const unknownAuthority = createNonFeaLoadCaseAuthority(profile(['EMPTY', 'STARTUP']));
assert.equal(unknownAuthority.state, 'BLOCKED');
assert.ok(unknownAuthority.blockers.some((row) => row.code === 'ACTIVE_LOAD_CASE_UNKNOWN'));

console.log(JSON.stringify({
  check: 'non-fea-load-case-authority',
  status: 'PASS',
  effectiveAuthorityOwnsCanonicalSet: true,
  canonicalCases: authorityA.approvedLoadCases,
  productDefaultCanonicalCases: productAuthority.approvedLoadCases,
  productDefaultId: productAuthority.provenance.defaultId,
  projectAuthorityShadowsProductDefault: true,
  invalidExplicitDoesNotFallBack: true,
  malformedProductDefaultEvidenceBlocked: true,
  requestedSubsetEnforced: true,
  empiricalPrimitiveCaseSubsetEnforced: true,
  scenarioCaseIdsRemainMethodSpecific: true,
  nullPrimitiveCaseAllowed: true,
  rawEmptyAuthorityBlocked: true,
  unapprovedAuthorityBlocked: true,
  unknownCaseBlocked: true,
  deterministic: true,
}, null, 2));

function profile(activeLoadCases) {
  return {
    revision: 11,
    loadCalculation: {
      activeLoadCases: {
        value: activeLoadCases,
        evidence: { source: 'PROJECT-DATA-LOAD-CASE-BASIS', sourceHash: 'fixture' },
        approved: true,
      },
    },
  };
}
