#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  LAFEA3_QUALIFIED_MESH_QUALITY_POLICY,
  PROFILE_KINDS,
  canonicalProfile,
  defaultProfileFields,
} from '../src/core/lafea-profile-contract/index.js';
import {
  requireLafeaAnalysisMeshQualifiedQualityPolicy,
} from '../src/workspace/lafea-analysis-mesh-contract.js';

const policy = LAFEA3_QUALIFIED_MESH_QUALITY_POLICY;
const baseline = defaultProfileFields(PROFILE_KINDS.MESH);

assert.equal(baseline.adjacentSizeRatioMax, policy.fields.adjacentSizeRatioMax);
assert.equal(baseline.aspectRatioWarn, policy.fields.aspectRatioWarn);
assert.equal(baseline.aspectRatioBlock, policy.fields.aspectRatioBlock);
assert.equal(baseline.scaledJacobianWarn, policy.fields.scaledJacobianWarn);
assert.equal(baseline.scaledJacobianBlock, policy.fields.scaledJacobianBlock);
assert.equal(baseline.adaptiveLevels, policy.fields.adaptiveLevelsMinimum);

const baselineProfile = profile({});
assert.equal(
  requireLafeaAnalysisMeshQualifiedQualityPolicy('LAFEA.3', baselineProfile),
  baselineProfile,
);

const weakened = [
  ['adjacentSizeRatioMax', policy.fields.adjacentSizeRatioMax + 0.1],
  ['aspectRatioWarn', policy.fields.aspectRatioWarn + 0.1],
  ['aspectRatioBlock', policy.fields.aspectRatioBlock + 0.1],
  ['scaledJacobianWarn', policy.fields.scaledJacobianWarn - 0.01],
  ['scaledJacobianBlock', policy.fields.scaledJacobianBlock - 0.01],
];
for (const [field, value] of weakened) {
  const candidate = profile({ [field]: value });
  assert.throws(
    () => requireLafeaAnalysisMeshQualifiedQualityPolicy('LAFEA.3', candidate),
    (error) => error?.code === 'LAFEA3_MESH_QUALITY_POLICY_WEAKENING_NOT_QUALIFIED',
    `${field} weakening must fail closed`,
  );
}

const tightened = profile({
  adjacentSizeRatioMax: 1.4,
  aspectRatioWarn: 2.5,
  aspectRatioBlock: 9,
  scaledJacobianWarn: 0.6,
  scaledJacobianBlock: 0.3,
  adaptiveLevels: 4,
});
assert.equal(
  requireLafeaAnalysisMeshQualifiedQualityPolicy('LAFEA.3', tightened),
  tightened,
);

// The stage-specific gate must not change unrelated stage semantics.
assert.equal(
  requireLafeaAnalysisMeshQualifiedQualityPolicy('LAFEA.4', baselineProfile),
  baselineProfile,
);

console.log(JSON.stringify({
  check: 'lafea3-qualified-mesh-policy',
  status: 'PASS',
  policyId: policy.policyId,
  policyRevision: policy.revision,
  weakeningRule: policy.weakeningRule,
  weakenedVariantsRejected: weakened.length,
  tightenedProfileAccepted: true,
  unrelatedStagePolicyChanged: false,
}));

function profile(overrides) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: 'LAFEA3-POLICY-TEST-T6',
    sourceRevision: 'TEST-2026-08-15',
    semanticHash: undefined,
    fields: {
      ...baseline,
      continuumElement: 'T6',
      shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
      globalTargetSize: 10,
      ...overrides,
    },
  });
}
