#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createEmptyProjectDataProfile } from '../src/workspace/project-data/project-data-contract.js';
import {
  createNonFeaProductDefaultProvider,
  LOAD_CALC_STANDARD_DEFAULTS_V1,
} from '../src/workspace/project-data/non-fea-product-default-profile.js';
import { createNonFeaLoadCaseAuthority } from '../src/workspace/project-data/non-fea-load-case-authority.js';
import { renderLoadCaseAuthorityDisclosure } from '../src/workspace/non-fea-method-basis-view.js';

const empty = createEmptyProjectDataProfile();
const provider = createNonFeaProductDefaultProvider({ profile: empty });
const productAuthority = createNonFeaLoadCaseAuthority(provider.effectiveProfile);
assert.equal(productAuthority.state, 'READY');
assert.equal(productAuthority.effectiveAuthority, 'PRODUCT_DEFAULT');

const productMarkup = renderLoadCaseAuthorityDisclosure(productAuthority);
assert.match(productMarkup, /data-effective-load-case-authority="PRODUCT_DEFAULT"/u);
assert.match(productMarkup, />PRODUCT_DEFAULT</u);
assert.match(productMarkup, /PD-ACTIVE-CASES/u);
assert.match(productMarkup, new RegExp(`${LOAD_CALC_STANDARD_DEFAULTS_V1.profileId}@${LOAD_CALC_STANDARD_DEFAULTS_V1.version}`, 'u'));
assert.match(productMarkup, /Load Calc built-in product default/u);
assert.match(productMarkup, /Canonical built-in Load Calc case set\./u);
assert.doesNotMatch(productMarkup, /AUTHORIZED_HANDOFF|SOURCE_EXPLICIT|EXACT_APPROVED_MASTER/u,
  'Product-default presentation must not masquerade as legacy/source/master evidence');

const projectProfile = structuredClone(createEmptyProjectDataProfile());
projectProfile.loadCalculation.activeLoadCases = {
  value: ['OPE'],
  evidence: {
    source: 'PROJECT-CASE-BASIS',
    authority: 'PROJECT_CONFIGURED_DEFAULT',
  },
  approved: true,
};
const projectAuthority = createNonFeaLoadCaseAuthority(projectProfile);
assert.equal(projectAuthority.state, 'READY');
const projectMarkup = renderLoadCaseAuthorityDisclosure(projectAuthority);
assert.match(projectMarkup, /data-effective-load-case-authority="PROJECT_CONFIGURED_DEFAULT"/u);
assert.match(projectMarkup, /PROJECT-CASE-BASIS/u);
assert.doesNotMatch(projectMarkup, /PD-ACTIVE-CASES|LOAD_CALC_STANDARD_DEFAULTS_V1/u,
  'Project authority must not acquire Product-default provenance');

const blockedAuthority = createNonFeaLoadCaseAuthority(createEmptyProjectDataProfile());
assert.equal(blockedAuthority.state, 'BLOCKED');
const blockedMarkup = renderLoadCaseAuthorityDisclosure(blockedAuthority);
assert.match(blockedMarkup, /data-effective-load-case-authority="BLOCKED"/u);
assert.match(blockedMarkup, />BLOCKED</u);

const viewSource = await readFile(
  new URL('../src/workspace/non-fea-method-basis-view.js', import.meta.url),
  'utf8',
);
assert.doesNotMatch(viewSource, /Project Data-approved load cases/u,
  'Method Basis must not claim that only raw Project Data approves active cases');
assert.doesNotMatch(viewSource, /Project Data owns the active load-case set/u,
  'Method Basis must not claim exclusive raw Project Data ownership');
assert.doesNotMatch(viewSource, /Approve active Load Cases in Project Data before selecting calculation cases/u,
  'blocked copy must refer to effective authority rather than raw Project Data approval');
assert.match(viewSource, /Effective active load cases/u);
assert.match(viewSource, /renderLoadCaseAuthorityDisclosure\(loadCaseAuthority\)/u);
assert.match(viewSource, /Manual sealing remains available for audit; routine Run may create the READY system snapshot\./u,
  'Method Basis must match the merged one-click Run/seal boundary');

console.log(JSON.stringify({
  check: 'non-fea-method-basis-effective-load-case-authority',
  status: 'PASS',
  productDefaultAuthorityDisclosed: true,
  productDefaultProvenanceDisclosed: true,
  projectAuthorityDistinct: true,
  blockedAuthorityVisible: true,
  exclusiveProjectDataOwnershipCopyRemoved: true,
  mechanicsChanged: false,
}, null, 2));
