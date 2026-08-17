#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LAFEA_HOLE_FRONT_LEGACY_GROWTH,
  lafeaHoleFrontCharacteristicRatio,
  lafeaHoleFrontGradingPolicy,
} from '../src/core/lafea-meshing/hole-front-grading-policy.js';

const ADJACENT_LIMIT = 1.5;
const expectedGrowth = (2 / Math.sqrt(3)) * Math.sqrt(ADJACENT_LIMIT ** 2 - 1);
const legacyCharacteristicRatio = lafeaHoleFrontCharacteristicRatio(LAFEA_HOLE_FRONT_LEGACY_GROWTH);
const naiveCharacteristicRatio = lafeaHoleFrontCharacteristicRatio(ADJACENT_LIMIT);
const governed = lafeaHoleFrontGradingPolicy(ADJACENT_LIMIT);
const legacy = lafeaHoleFrontGradingPolicy();

assert.equal(LAFEA_HOLE_FRONT_LEGACY_GROWTH, 1.6);
assert.ok(Math.abs(legacyCharacteristicRatio - 1.7088007490635064) < 1e-14);
assert.ok(legacyCharacteristicRatio > ADJACENT_LIMIT);
assert.ok(Math.abs(naiveCharacteristicRatio - 1.6393596310755) < 1e-14);
assert.ok(naiveCharacteristicRatio > ADJACENT_LIMIT,
  'equating layer growth to the adjacency ratio is not conservative for longest-edge custody');
assert.ok(Math.abs(expectedGrowth - 1.2909944487358058) < 1e-14);
assert.deepEqual(legacy, {
  mode: 'LEGACY_UNGOVERNED',
  adjacentSizeRatioMax: null,
  activationRatio: 1.6,
  layerGrowth: 1.6,
  idealStripCharacteristicRatio: legacyCharacteristicRatio,
});
assert.equal(governed.mode, 'ADJACENT_SIZE_GOVERNED');
assert.equal(governed.adjacentSizeRatioMax, ADJACENT_LIMIT);
assert.equal(governed.activationRatio, ADJACENT_LIMIT);
assert.ok(Math.abs(governed.layerGrowth - expectedGrowth) < 1e-14);
assert.ok(governed.layerGrowth < ADJACENT_LIMIT);
assert.ok(governed.idealStripCharacteristicRatio <= ADJACENT_LIMIT + 8 * Number.EPSILON);
assert.throws(
  () => lafeaHoleFrontGradingPolicy(1),
  (error) => error?.code === 'LAFEA_HOLE_FRONT_ADJACENT_SIZE_RATIO_INVALID',
);
assert.throws(
  () => lafeaHoleFrontGradingPolicy(Number.NaN),
  (error) => error?.code === 'LAFEA_HOLE_FRONT_ADJACENT_SIZE_RATIO_INVALID',
);

const coreSource = fs.readFileSync(new URL(
  '../src/core/lafea-meshing/interior-refinement-t6.js', import.meta.url,
), 'utf8');
const executorSource = fs.readFileSync(new URL(
  '../src/workspace/lafea4-shell-graded-refinement-executor.js', import.meta.url,
), 'utf8');
assert.match(coreSource, /lafeaHoleFrontGradingPolicy\(options\?\.adjacentSizeRatioMax\)/u);
assert.match(coreSource, /gradingPolicy\.activationRatio/u);
assert.match(coreSource, /gradingPolicy\.layerGrowth/u);
assert.match(executorSource, /adjacentSizeRatioMax:\s*plan\.adjacentSizeRatioMax/u);
assert.match(executorSource, /LAFEA4_GRADED_REFINEMENT_ADJACENT_SIZE_GATE_FAILED/u,
  'construction policy must not replace the measured child adjacency gate');

console.log(JSON.stringify({
  schema: 'lafea4-tech9-hole-front-policy-check/v1',
  check: 'lafea4-tech9-hole-front-policy',
  status: 'PASS',
  retainedAdjacentSizeRatioMax: ADJACENT_LIMIT,
  legacyLayerGrowth: LAFEA_HOLE_FRONT_LEGACY_GROWTH,
  legacyIdealStripCharacteristicRatio: legacyCharacteristicRatio,
  naiveLayerGrowthAtAdjacentLimit: ADJACENT_LIMIT,
  naiveIdealStripCharacteristicRatio: naiveCharacteristicRatio,
  governedLayerGrowth: governed.layerGrowth,
  governedIdealStripCharacteristicRatio: governed.idealStripCharacteristicRatio,
  activationRatio: governed.activationRatio,
  measuredChildGateStillRequired: true,
  legacyDefaultPreservedForUnspecifiedCallers: true,
}));
