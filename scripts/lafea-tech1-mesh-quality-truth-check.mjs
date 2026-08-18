#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { qualifyLafeaAnalysisMesh } from '../src/workspace/lafea-analysis-mesh-quality.js';
import { buildMeshQualityPanel } from '../src/workspace/lafea-mesh-quality-panel.js';

const profile = Object.freeze({
  profileIdentity: 'TECH1_LAFEA4_QUALITY_PROFILE',
  semanticHash: 'fnv1a64:0000000000000001',
  fields: Object.freeze({
    adjacentSizeRatioMax: 1.5,
    aspectRatioWarn: 5.0,
    aspectRatioBlock: 10.0,
    scaledJacobianWarn: 0.5,
    scaledJacobianBlock: 0.2,
    adaptiveLevels: 3,
  }),
});

const blocked = qualifyLafeaAnalysisMesh('LAFEA.4', meshWithSecondHeight(2), profile);
const adjacent = blocked.gateResults.find((row) => row.metric === 'ADJACENT_SIZE_RATIO');
const angle = blocked.gateResults.find((row) => row.metric === 'MINIMUM_ANGLE_DEGREES');
const expectedRatio = Math.sqrt(4.25);

assert.ok(adjacent);
assert.equal(adjacent.status, 'BLOCK');
assert.equal(adjacent.maximum, 1.5);
assert.ok(Math.abs(adjacent.value - expectedRatio) < 1e-12);
assert.equal(blocked.adjacentSizeRatio.definition,
  'MAX_LONGEST_CORNER_EDGE_RATIO_ACROSS_SHARED_CORNER_EDGE_V1');
assert.equal(blocked.adjacentSizeRatio.adjacentEdgeCount, 1);
assert.equal(blocked.adjacentSizeRatio.violatingAdjacencyCount, 1);
assert.ok(Math.abs(blocked.adjacentSizeRatio.maximumObserved - expectedRatio) < 1e-12);
assert.deepEqual(blocked.blockingElementIds, ['E1', 'E2']);
assert.equal(blocked.worstStatus, 'BLOCK');

assert.ok(angle);
assert.ok(Math.abs(angle.warningThreshold - 30) < 1e-12);
assert.ok(Math.abs(angle.blockingThreshold - 11.536959032815489) < 1e-12);
assert.ok(angle.value > angle.blockingThreshold);
assert.ok(angle.value < angle.warningThreshold);
assert.equal(angle.status, 'WARNING');

const panel = buildMeshQualityPanel(blocked.gateResults, {
  stageId: 'LAFEA.4',
  meshProfileIdentity: profile.profileIdentity,
});
assert.equal(panel.blocksAdvance, true);
assert.equal(panel.rows.find((row) => row.metric === 'ADJACENT_SIZE_RATIO')?.threshold,
  'maximum=1.5');
assert.equal(panel.rows.find((row) => row.metric === 'MINIMUM_ANGLE_DEGREES')?.unit, 'deg');

const accepted = qualifyLafeaAnalysisMesh('LAFEA.4', meshWithSecondHeight(Math.sqrt(3) / 2), profile);
const acceptedAdjacent = accepted.gateResults.find((row) => row.metric === 'ADJACENT_SIZE_RATIO');
assert.equal(acceptedAdjacent.status, 'OK');
assert.ok(Math.abs(acceptedAdjacent.value - 1) < 1e-12);
assert.equal(accepted.adjacentSizeRatio.violatingAdjacencyCount, 0);
assert.equal(accepted.worstStatus, 'OK');
assert.deepEqual(accepted.blockingElementIds, []);

// The adjacent-size authority is deliberately scoped to LAFEA.4 in this
// increment. Existing LAFEA.3 qualification and LAFEA.5 source-mesh adoption
// are not silently reclassified by this PR.
const continuum = qualifyLafeaAnalysisMesh('LAFEA.3', meshWithSecondHeight(2), profile);
assert.equal(continuum.gateResults.some((row) => row.metric === 'ADJACENT_SIZE_RATIO'), false);
assert.equal(continuum.adjacentSizeRatio, null);

const qualitySource = read('../src/workspace/lafea-analysis-mesh-quality.js');
assert.match(qualitySource, /stageId === 'LAFEA\.4'/u);
assert.match(qualitySource, /adjacentSizeRatioMax/u);
assert.match(qualitySource, /MAX_LONGEST_CORNER_EDGE_RATIO_ACROSS_SHARED_CORNER_EDGE_V1/u);
assert.doesNotMatch(qualitySource, /adjacentSizeRatioMax\s*=\s*1\.5/u);

console.log(JSON.stringify({
  check: 'lafea-tech1-mesh-quality-truth',
  status: 'PASS',
  handCalculation: {
    firstCharacteristicLength: 1,
    secondCharacteristicLength: expectedRatio,
    adjacentSizeRatio: expectedRatio,
    declaredMaximum: 1.5,
    expectedDisposition: 'BLOCK',
  },
  derivedAngleThresholdsDegrees: {
    warning: angle.warningThreshold,
    blocking: angle.blockingThreshold,
  },
  blockedElementIds: blocked.blockingElementIds,
}, null, 2));

function meshWithSecondHeight(height) {
  return Object.freeze({
    schema: 'lafea-analysis-mesh/v1',
    meshIdentity: `TECH1-H${height}`,
    nodes: Object.freeze([
      Object.freeze({ nodeId: 'N1', x: 0, y: 0, z: 0 }),
      Object.freeze({ nodeId: 'N2', x: 1, y: 0, z: 0 }),
      Object.freeze({ nodeId: 'N3', x: 0.5, y: Math.sqrt(3) / 2, z: 0 }),
      Object.freeze({ nodeId: 'N4', x: 0.5, y: -height, z: 0 }),
    ]),
    elements: Object.freeze([
      Object.freeze({
        elementId: 'E1',
        elementType: 'CST_DKT_TRI3_THIN_SHELL_V1',
        nodeIds: Object.freeze(['N1', 'N2', 'N3']),
      }),
      Object.freeze({
        elementId: 'E2',
        elementType: 'CST_DKT_TRI3_THIN_SHELL_V1',
        nodeIds: Object.freeze(['N2', 'N1', 'N4']),
      }),
    ]),
  });
}

function read(relative) {
  return fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
}
