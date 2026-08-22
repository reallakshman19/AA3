#!/usr/bin/env node

import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  createEmptyProjectDataProfile,
  replaceProjectDataValue,
} from '../src/workspace/project-data/project-data-contract.js';
import {
  createNonFeaProductDefaultProvider,
} from '../src/workspace/project-data/non-fea-product-default-profile.js';
import {
  bindAuthorizedEmpiricalSupportCapabilities,
  bindAuthorizedEmpiricalSupportCapabilityResult,
  resolveSupportCapability,
} from '../src/workspace/engineering-loads/authorized-empirical-support-capability-binding.js';

const supportModel = {
  schema: 'support-site-model/v1',
  sites: [
    site('S-UNKNOWN', 'UNKNOWN_KIND'),
    site('S-REST', 'REST'),
  ],
};

const product = createNonFeaProductDefaultProvider({
  profile: createEmptyProjectDataProfile(),
}).effectiveProfile;
const productBinding = bindAuthorizedEmpiricalSupportCapabilities({
  profile: product,
  supportSiteModel: supportModel,
});
const unknownProduct = row(productBinding, 'S-UNKNOWN');
assert.equal(unknownProduct.selector, 'DEFAULT');
assert.equal(unknownProduct.fallbackUsed, true);
assert.equal(unknownProduct.vertical, false,
  'Product DEFAULT must never invent vertical capacity for an unknown support kind');
assert.deepEqual(
  productBinding.profile.topology.supportTypeCapabilities.value.UNKNOWN_KIND,
  { vertical: false },
  'execution profile must expand governed Product DEFAULT for the active unknown kind',
);
assert.equal(product.topology.supportTypeCapabilities.value.UNKNOWN_KIND, undefined,
  'source effective profile must remain immutable');

const projectDefaultTrue = withSupportPolicy({
  DEFAULT: { vertical: true },
  REST: { vertical: false },
});
const projectBinding = bindAuthorizedEmpiricalSupportCapabilities({
  profile: projectDefaultTrue,
  supportSiteModel: supportModel,
});
const unknownProject = row(projectBinding, 'S-UNKNOWN');
const restProject = row(projectBinding, 'S-REST');
assert.equal(unknownProject.selector, 'DEFAULT');
assert.equal(unknownProject.resolutionAuthority, 'GOVERNED_DEFAULT_SUPPORT_KIND');
assert.equal(unknownProject.vertical, true,
  'explicit Project DEFAULT may grant screening vertical capability');
assert.equal(restProject.selector, 'REST');
assert.equal(restProject.fallbackUsed, false);
assert.equal(restProject.vertical, false,
  'exact support-kind rule must shadow DEFAULT');
assert.deepEqual(projectBinding.profile.topology.supportTypeCapabilities.value.UNKNOWN_KIND, { vertical: true });
assert.deepEqual(projectBinding.profile.topology.supportTypeCapabilities.value.REST, { vertical: false });
assert.notEqual(projectBinding.bindingSemanticHash, productBinding.bindingSemanticHash,
  'support policy change must change binding identity');

const noDefault = withSupportPolicy({ REST: { vertical: true } });
const noDefaultBinding = bindAuthorizedEmpiricalSupportCapabilities({
  profile: noDefault,
  supportSiteModel: supportModel,
});
const unresolved = row(noDefaultBinding, 'S-UNKNOWN');
assert.equal(unresolved.selector, null);
assert.equal(unresolved.resolutionAuthority, 'UNRESOLVED_NON_BEARING');
assert.equal(unresolved.vertical, false);
assert.equal(
  Object.hasOwn(noDefaultBinding.profile.topology.supportTypeCapabilities.value, 'UNKNOWN_KIND'),
  false,
  'missing exact and DEFAULT capability must not synthesize a bearing rule',
);

assert.deepEqual(resolveSupportCapability({ DEFAULT: { vertical: false } }, 'X'), {
  selector: 'DEFAULT',
  resolutionAuthority: 'GOVERNED_DEFAULT_SUPPORT_KIND',
  fallbackUsed: true,
  vertical: false,
  rule: { vertical: false },
});

const distribution = {
  schema: 'support-load-distribution/v3',
  method: 'CHAINAGE_TRIBUTARY_SPAN_V2',
  loadCases: [],
};
const boundResult = bindAuthorizedEmpiricalSupportCapabilityResult({
  distribution,
  binding: projectBinding,
});
assert.equal(boundResult.supportCapabilityAuthority.bindingSemanticHash, projectBinding.bindingSemanticHash);
assert.equal(boundResult.supportCapabilityAuthority.rows.length, 2);
assert.equal(boundResult.supportCapabilityAuthority.rows.find((item) => item.supportSiteId === 'S-UNKNOWN').fallbackUsed, true);
assert.equal(semanticHash(distribution), semanticHash({
  schema: 'support-load-distribution/v3',
  method: 'CHAINAGE_TRIBUTARY_SPAN_V2',
  loadCases: [],
}), 'source result fixture must remain unchanged');

assert.throws(
  () => resolveSupportCapability({ DEFAULT: { vertical: 'yes' } }, 'UNKNOWN_KIND'),
  (error) => error?.code === 'EMPIRICAL_SUPPORT_CAPABILITY_VERTICAL_INVALID',
);

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_SUPPORT_DEFAULT_CAPABILITY_BINDING',
  productUnknownVertical: unknownProduct.vertical,
  projectDefaultUnknownVertical: unknownProject.vertical,
  exactRestShadowsDefault: restProject.vertical === false,
  unresolvedWithoutDefaultIsNonBearing: unresolved.vertical === false,
  resultReceiptBound: true,
}, null, 2));

function withSupportPolicy(value) {
  let profile = createEmptyProjectDataProfile();
  profile = replaceProjectDataValue(
    profile,
    'topology.supportTypeCapabilities',
    value,
    { source: 'SUPPORT_POLICY_FIXTURE', authority: 'PROJECT_POLICY' },
    true,
  );
  return createNonFeaProductDefaultProvider({ profile }).effectiveProfile;
}

function site(siteId, sourceType) {
  return {
    siteId,
    tags: [siteId],
    positionMm: { x: 0, y: 0, z: 0 },
    assemblies: [{ members: [{ sourceType }] }],
  };
}

function row(binding, supportSiteId) {
  const selected = binding.rows.find((item) => item.supportSiteId === supportSiteId);
  assert.ok(selected, `missing support capability binding row: ${supportSiteId}`);
  return selected;
}
