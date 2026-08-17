#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LAFEA4_SHELL_GRADED_TRANSITION_POLICY,
  buildLafea4ShellGradedTransitionPlan,
  lafea4ShellGradedSizeAt,
} from '../src/workspace/lafea4-shell-graded-transition-plan.js';

const definition = JSON.parse(fs.readFileSync(
  new URL('../validation/lafea4-refinement/graded-transition-plan-v1.json', import.meta.url),
  'utf8',
));
assert.equal(definition.stageId, 'LAFEA.4');
assert.equal(definition.benchmarkQualified, false);
assert.equal(definition.releaseQualified, false);
assert.equal(LAFEA4_SHELL_GRADED_TRANSITION_POLICY.productionBindingAuthorized, false);

const target = Object.freeze({ targetId: 'FIXED-UV-TARGET', u: 0, v: 0 });
const nearEdge = Object.freeze({
  parentBoundaryEdgeId: 'HOLE-NEAR', role: 'HOLE',
  start: { u: -15, v: 0 }, end: { u: 15, v: 0 },
});
const farEdge = Object.freeze({
  parentBoundaryEdgeId: 'OUTER-FAR', role: 'OUTER',
  start: { u: -15, v: 100 }, end: { u: 15, v: 100 },
});

const rows = [];
for (const expected of definition.cases) {
  const plan = buildLafea4ShellGradedTransitionPlan({
    globalTargetElementLength: definition.globalTargetElementLengthMm,
    localTargetElementLength: expected.localTargetElementLengthMm,
    adjacentSizeRatioMax: definition.adjacentSizeRatioMax,
    minimumElementsPerTransitionBand: definition.minimumElementsPerTransitionBand,
    targets: [target],
    boundaryEdges: expected.boundaryChecks ? [farEdge, nearEdge] : [],
  });

  assert.equal(plan.executionScope, 'QUALIFICATION_HARNESS_ONLY');
  assert.equal(plan.productionBindingAuthorized, false);
  assert.equal(plan.releaseQualified, false);
  assert.equal(plan.transitionLevelCount, expected.expectedTransitionLevelCount);
  assert.equal(plan.theoreticalMinimumTransitionLevelCount, expected.expectedTransitionLevelCount);
  arrayClose(plan.levels, expected.expectedLevelsMm);
  arrayClose(plan.levelRatios, expected.expectedLevelRatios);
  arrayClose(plan.bands.map((band) => band.width), expected.expectedBandWidthsMm);
  close(plan.influenceRadius, expected.expectedInfluenceRadiusMm);
  assert.ok(plan.maximumPlannedGrowthRatio <= definition.adjacentSizeRatioMax + 64 * Number.EPSILON);
  plan.bands.forEach((band) => {
    assert.equal(band.elementsAcrossBand, definition.minimumElementsPerTransitionBand);
    assert.ok(band.growthToNext <= definition.adjacentSizeRatioMax + 64 * Number.EPSILON);
  });

  if (expected.boundaryChecks) {
    const near = plan.boundarySubdivisions.find((edge) => edge.parentBoundaryEdgeId === 'HOLE-NEAR');
    const far = plan.boundarySubdivisions.find((edge) => edge.parentBoundaryEdgeId === 'OUTER-FAR');
    assert.ok(near && far);
    assert.equal(near.segmentCount, expected.boundaryChecks.expectedNearSegmentCount);
    close(near.segmentLength, expected.boundaryChecks.expectedNearSegmentLengthMm);
    assert.equal(near.splitFractions.length, near.segmentCount - 1);
    assert.deepEqual(near.splitFractions, [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]);
    assert.equal(near.parentIdentityPreserved, true);
    assert.equal(far.segmentCount, expected.boundaryChecks.expectedFarSegmentCount);
    close(far.segmentLength, expected.boundaryChecks.expectedFarSegmentLengthMm);
    assert.deepEqual(far.splitFractions, [0.5]);
    assert.equal(far.parentIdentityPreserved, true);

    // Frozen size-field checks for the 15 -> 3.75 mm case.
    close(lafea4ShellGradedSizeAt(plan, 0, 0), 3.75);
    close(lafea4ShellGradedSizeAt(plan, 7.5, 0), 3.75);
    close(lafea4ShellGradedSizeAt(plan, 7.500001, 0), 5.625);
    close(lafea4ShellGradedSizeAt(plan, 18.75, 0), 5.625);
    close(lafea4ShellGradedSizeAt(plan, 18.750001, 0), 8.4375);
    close(lafea4ShellGradedSizeAt(plan, 35.625001, 0), 12.65625);
    close(lafea4ShellGradedSizeAt(plan, 60.937501, 0), 15);
  }

  // Canonical ordering makes semantic evidence independent of caller order.
  const replay = buildLafea4ShellGradedTransitionPlan({
    globalTargetElementLength: definition.globalTargetElementLengthMm,
    localTargetElementLength: expected.localTargetElementLengthMm,
    adjacentSizeRatioMax: definition.adjacentSizeRatioMax,
    minimumElementsPerTransitionBand: definition.minimumElementsPerTransitionBand,
    targets: [{ ...target }],
    boundaryEdges: expected.boundaryChecks ? [nearEdge, farEdge] : [],
  });
  assert.equal(replay.semanticHash, plan.semanticHash);
  assert.equal(JSON.stringify(replay), JSON.stringify(plan));

  rows.push({
    caseId: expected.caseId,
    levelsMm: plan.levels,
    levelRatios: plan.levelRatios,
    transitionLevelCount: plan.transitionLevelCount,
    influenceRadiusMm: plan.influenceRadius,
    boundarySubdivisions: plan.boundarySubdivisions.map((edge) => ({
      parentBoundaryEdgeId: edge.parentBoundaryEdgeId,
      requestedTargetElementLength: edge.requestedTargetElementLength,
      segmentCount: edge.segmentCount,
      segmentLength: edge.segmentLength,
    })),
    semanticHash: plan.semanticHash,
  });
}

assert.throws(
  () => buildLafea4ShellGradedTransitionPlan({
    globalTargetElementLength: 15,
    localTargetElementLength: 15,
    adjacentSizeRatioMax: 1.5,
    targets: [target],
  }),
  (error) => error?.code === 'LAFEA4_GRADED_TRANSITION_LOCAL_NOT_SMALLER_THAN_GLOBAL',
);
assert.throws(
  () => buildLafea4ShellGradedTransitionPlan({
    globalTargetElementLength: 15,
    localTargetElementLength: 7.5,
    adjacentSizeRatioMax: 1,
    targets: [target],
  }),
  (error) => error?.code === 'LAFEA4_GRADED_TRANSITION_GROWTH_MUST_EXCEED_ONE',
);

console.log(JSON.stringify({
  check: 'lafea-tech6-graded-transition-plan',
  status: 'PASS',
  qualificationId: definition.qualificationId,
  adjacentSizeRatioMax: definition.adjacentSizeRatioMax,
  rows,
  productionBindingAuthorized: false,
  releaseQualified: false,
}, null, 2));

function arrayClose(actual, expected) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => close(value, expected[index]));
}
function close(actual, expected, tolerance = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    `${actual} != ${expected}`,
  );
}
