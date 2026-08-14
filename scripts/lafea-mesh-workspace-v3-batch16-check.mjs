#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  LAFEA_MESH_TRANSITION_QUALITY_V3_SCHEMA,
  qualifyLafeaMeshTransitionQualityV3,
} from '../src/workspace/lafea-mesh-transition-quality-v3.js';

const continuum = {
  schema: LAFEA_MESH_TRANSITION_QUALITY_V3_SCHEMA,
  stageId: 'LAFEA.3', meshContentHash: hash('M2'), ancestryHash: hash('A'),
  interpolationPolicyHash: hash('INTERP'), maximumAdjacentSizeRatio: 1.4,
  sizeRatioWarningThreshold: 1.5, sizeRatioBlockingThreshold: 2,
  incompatibleInterfaceCount: 0, hangingNodeCount: 0,
  maximumShellNormalTransitionDegrees: null,
  shellNormalWarningThresholdDegrees: null, shellNormalBlockingThresholdDegrees: null,
};
assert.equal(qualifyLafeaMeshTransitionQualityV3(continuum).qualification, 'PASS');
assert.equal(qualifyLafeaMeshTransitionQualityV3({
  ...continuum, maximumAdjacentSizeRatio: 2.1,
}).qualification, 'BLOCK');
assert.equal(qualifyLafeaMeshTransitionQualityV3({
  ...continuum, incompatibleInterfaceCount: 1,
}).qualification, 'BLOCK');
assert.equal(qualifyLafeaMeshTransitionQualityV3({
  ...continuum, hangingNodeCount: 1,
}).qualification, 'BLOCK');

const shell = qualifyLafeaMeshTransitionQualityV3({
  ...continuum, stageId: 'LAFEA.4', maximumShellNormalTransitionDegrees: 7,
  shellNormalWarningThresholdDegrees: 5, shellNormalBlockingThresholdDegrees: 10,
});
assert.equal(shell.qualification, 'PASS');
assert.equal(shell.hasWarnings, true);
assert.equal(qualifyLafeaMeshTransitionQualityV3({
  ...continuum, stageId: 'LAFEA.4', maximumShellNormalTransitionDegrees: 12,
  shellNormalWarningThresholdDegrees: 5, shellNormalBlockingThresholdDegrees: 10,
}).qualification, 'BLOCK');

console.log(JSON.stringify({
  check: 'lafea-mesh-workspace-v3-batch16', status: 'PASS',
  sizeGradingHasGovernedWarningAndBlockThresholds: true,
  interpolationIncompatibilityBlocks: true,
  hangingNodesBlock: true,
  shellNormalTransitionIsSeparatelyGoverned: true,
  thresholdsAreEvidenceInputsNotHiddenConstants: true,
}));

function hash(value) {
  const hex = Buffer.from(value).toString('hex').padEnd(64, '0').slice(0, 64);
  return `sha256:${hex}`;
}
