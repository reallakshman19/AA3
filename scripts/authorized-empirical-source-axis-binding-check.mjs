#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createEvidenceValue } from '../src/workspace/project-data/project-data-contract.js';
import {
  bindAuthorizedEmpiricalSourceAxis,
} from '../src/workspace/engineering-loads/authorized-empirical-source-axis-binding.js';

const distribution = {
  schema: 'support-load-distribution/v3',
  method: 'CHAINAGE_TRIBUTARY_SPAN_V2',
  sourceAxisBasis: 'Z_UP',
  loadCases: [{
    loadCaseId: 'EMPTY',
    status: 'CALCULATED',
    supportResults: [{ supportSiteId: 'S1', sourceAxisBasis: 'Z_UP', verticalForceN: 1000 }],
  }],
};

const xProfile = profile('X', {
  source: 'SOURCE_METADATA',
  authority: 'SOURCE_EXPLICIT',
  sourceHash: 'sha256:axis-x',
});
const xBound = bindAuthorizedEmpiricalSourceAxis({ distribution, profile: xProfile });
assert.equal(xBound.sourceAxisBasis, 'X_UP');
assert.equal(xBound.loadCases[0].supportResults[0].sourceAxisBasis, 'X_UP');
assert.equal(xBound.sourceAxisAuthority.sourceUpAxis, 'X');
assert.equal(xBound.sourceAxisAuthority.evidence.authority, 'SOURCE_EXPLICIT');
assert.equal(distribution.sourceAxisBasis, 'Z_UP', 'Source distribution was mutated.');

const yProfile = profile('Y', {
  source: 'Load Calc built-in product default',
  authority: 'PRODUCT_DEFAULT',
  defaultId: 'PD-SOURCE-UP-AXIS',
  defaultSemanticHash: 'fnv1a64:1111111111111111',
});
const yBound = bindAuthorizedEmpiricalSourceAxis({ distribution, profile: yProfile });
assert.equal(yBound.sourceAxisBasis, 'Y_UP');
assert.equal(yBound.sourceAxisAuthority.evidence.authority, 'PRODUCT_DEFAULT');

expectCode(
  () => bindAuthorizedEmpiricalSourceAxis({ distribution, profile: profile('Q', { source: 'bad' }) }),
  'EMPIRICAL_SOURCE_AXIS_INVALID',
);
expectCode(
  () => bindAuthorizedEmpiricalSourceAxis({ distribution, profile: profile('Z', null) }),
  'EMPIRICAL_SOURCE_AXIS_AUTHORITY_INVALID',
);

console.log(JSON.stringify({
  status: 'PASS',
  sourceExplicitAxisRebound: 'X_UP',
  productDefaultAxisRebound: 'Y_UP',
  invalidAxisRejected: true,
  missingAuthorityRejected: true,
  legacyKernelPayloadNotMutated: true,
}, null, 2));

function profile(axis, evidence) {
  return {
    schema: 'project-data-profile/v1',
    projectId: 'PROJECT-AXIS-CHECK',
    revision: 1,
    updatedAt: '2026-08-22T13:10:00.000Z',
    sourcesAndUnits: {
      sourceUpAxis: createEvidenceValue(axis, evidence, true),
    },
  };
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.equal(error?.code, code);
    return true;
  });
}
