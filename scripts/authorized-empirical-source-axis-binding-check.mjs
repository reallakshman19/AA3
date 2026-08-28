#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createEvidenceValue } from '../src/workspace/project-data/project-data-contract.js';
import {
  bindAuthorizedEmpiricalSourceAxis,
  requireAuthorizedEmpiricalSourceBasis,
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

for (const axis of ['X', 'Y', 'Z']) {
  const sourceProfile = profile(axis, 'mm', {
    source: 'SOURCE_METADATA',
    authority: 'SOURCE_EXPLICIT',
    sourceHash: `sha256:axis-${axis.toLowerCase()}-mm`,
  });
  const basis = requireAuthorizedEmpiricalSourceBasis(sourceProfile);
  assert.equal(basis.sourceUpAxis, axis);
  assert.equal(basis.sourceAxisBasis, `${axis}_UP`);
  assert.equal(basis.lengthUnit, 'mm');
  assert.equal(basis.mechanicsScope, 'SOURCE_AXIS_GENERAL_MM_SCALAR_VERTICAL_GRAVITY');
  assert.equal(
    basis.axisInvarianceBasis,
    'XYZ_PERMUTATION_INVARIANT_EUCLIDEAN_ROUTE_CHAINAGE_SCALAR_GRAVITY',
  );

  const bound = bindAuthorizedEmpiricalSourceAxis({ distribution, profile: sourceProfile });
  assert.equal(bound.sourceAxisBasis, `${axis}_UP`);
  assert.equal(bound.loadCases[0].supportResults[0].sourceAxisBasis, `${axis}_UP`);
  assert.equal(bound.sourceAxisAuthority.sourceUpAxis, axis);
  assert.equal(bound.sourceAxisAuthority.lengthUnit, 'mm');
  assert.equal(bound.sourceAxisAuthority.mechanicsScope, 'SOURCE_AXIS_GENERAL_MM_SCALAR_VERTICAL_GRAVITY');
  assert.equal(bound.sourceAxisAuthority.legacyScalarKernelBasis, 'Z_UP');
  assert.equal(bound.sourceAxisAuthority.sourceAxisEvidence.authority, 'SOURCE_EXPLICIT');
}

assert.equal(distribution.sourceAxisBasis, 'Z_UP', 'source distribution was mutated');
expectCode(
  () => requireAuthorizedEmpiricalSourceBasis(profile('Z', 'm', {
    source: 'SOURCE_METADATA',
    authority: 'SOURCE_EXPLICIT',
  })),
  'EMPIRICAL_SOURCE_LENGTH_UNIT_UNSUPPORTED',
);
expectCode(
  () => requireAuthorizedEmpiricalSourceBasis(profile('Q', 'mm', { source: 'bad' })),
  'EMPIRICAL_SOURCE_AXIS_INVALID',
);
expectCode(
  () => requireAuthorizedEmpiricalSourceBasis(profile('Z', 'mm', null)),
  'EMPIRICAL_SOURCE_AXIS_AUTHORITY_INVALID',
);
expectCode(
  () => bindAuthorizedEmpiricalSourceAxis({
    distribution: { ...structuredClone(distribution), sourceAxisBasis: 'Y_UP' },
    profile: profile('Y', 'mm', { source: 'SOURCE_METADATA', authority: 'SOURCE_EXPLICIT' }),
  }),
  'EMPIRICAL_SOURCE_AXIS_KERNEL_BASIS_MISMATCH',
);

console.log(JSON.stringify({
  status: 'PASS',
  implementedMechanics: 'SOURCE_AXIS_GENERAL_MM_SCALAR_VERTICAL_GRAVITY',
  xUpBound: true,
  yUpBound: true,
  zUpBound: true,
  metreSourceRejectedAsUnimplementedConversion: true,
  invalidAxisRejected: true,
  missingAuthorityRejected: true,
  mismatchedLegacyKernelBasisRejected: true,
  legacyKernelPayloadNotMutated: true,
}, null, 2));

function profile(axis, lengthUnit, evidence) {
  return {
    schema: 'project-data-profile/v1',
    projectId: 'PROJECT-AXIS-CHECK',
    revision: 1,
    updatedAt: '2026-08-22T13:10:00.000Z',
    sourcesAndUnits: {
      sourceUpAxis: createEvidenceValue(axis, evidence, true),
      lengthUnit: createEvidenceValue(lengthUnit, evidence, true),
    },
  };
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.equal(error?.code, code);
    return true;
  });
}
