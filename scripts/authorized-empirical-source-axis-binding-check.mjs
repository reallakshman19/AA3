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

const zProfile = profile('Z', {
  source: 'SOURCE_METADATA',
  authority: 'SOURCE_EXPLICIT',
  sourceHash: 'sha256:axis-z',
});
const bound = bindAuthorizedEmpiricalSourceAxis({ distribution, profile: zProfile });
assert.equal(bound.sourceAxisBasis, 'Z_UP');
assert.equal(bound.loadCases[0].supportResults[0].sourceAxisBasis, 'Z_UP');
assert.equal(bound.sourceAxisAuthority.sourceUpAxis, 'Z');
assert.equal(bound.sourceAxisAuthority.mechanicsScope, 'SOURCE_Z_UP_SCALAR_VERTICAL_GRAVITY');
assert.equal(bound.sourceAxisAuthority.evidence.authority, 'SOURCE_EXPLICIT');
assert.equal(distribution.sourceAxisBasis, 'Z_UP', 'source distribution was mutated');

for (const axis of ['X', 'Y']) {
  expectCode(
    () => bindAuthorizedEmpiricalSourceAxis({
      distribution,
      profile: profile(axis, {
        source: 'SOURCE_METADATA',
        authority: 'SOURCE_EXPLICIT',
      }),
    }),
    'EMPIRICAL_SOURCE_AXIS_MECHANICS_UNSUPPORTED',
  );
}
expectCode(
  () => bindAuthorizedEmpiricalSourceAxis({ distribution, profile: profile('Q', { source: 'bad' }) }),
  'EMPIRICAL_SOURCE_AXIS_INVALID',
);
expectCode(
  () => bindAuthorizedEmpiricalSourceAxis({ distribution, profile: profile('Z', null) }),
  'EMPIRICAL_SOURCE_AXIS_AUTHORITY_INVALID',
);
expectCode(
  () => bindAuthorizedEmpiricalSourceAxis({
    distribution: { ...structuredClone(distribution), sourceAxisBasis: 'Y_UP' },
    profile: zProfile,
  }),
  'EMPIRICAL_SOURCE_AXIS_KERNEL_BASIS_MISMATCH',
);

console.log(JSON.stringify({
  status: 'PASS',
  implementedMechanics: 'SOURCE_Z_UP_SCALAR_VERTICAL_GRAVITY',
  sourceZUpBound: true,
  xUpRejectedAsUnimplementedMechanics: true,
  yUpRejectedAsUnimplementedMechanics: true,
  invalidAxisRejected: true,
  missingAuthorityRejected: true,
  mismatchedKernelBasisRejected: true,
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
