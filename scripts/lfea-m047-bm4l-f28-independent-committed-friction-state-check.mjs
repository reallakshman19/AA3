import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  buildCommittedTangentialFrictionReplay,
  verifyZeroFrictionTangentialControl,
} from '../src/core/nonlinear-restraint-friction/caesar-committed-friction-load-replay.js';

const authority = JSON.parse(fs.readFileSync(
  new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-f28-independent-committed-friction-state.json', import.meta.url),
  'utf8',
));

assert.equal(authority.schema, 'm047-bm4l-f28-independent-committed-friction-state/v1');
assert.equal(authority.benchmarkId, 'BM4_L');
assert.equal(authority.casePair.frictionCase.caseNumber, 17);
assert.equal(authority.casePair.zeroFrictionControl.caseNumber, 19);
assert.equal(authority.casePair.frictionCase.formula, 'SUS W+P1');
assert.equal(authority.casePair.zeroFrictionControl.formula, 'SUS W+P1');
assert.equal(authority.casePair.samePhysicalFormula, true);
assert.equal(authority.sourceFrictionInventory.positiveFrictionNodeCount, 26);
assert.equal(authority.sourceFrictionInventory.positiveFrictionNodeIds.length, 26);
assert.equal(authority.case17YRows.length, 29);
assert.equal(authority.case19YRows.length, 29);

const control = verifyZeroFrictionTangentialControl({
  rows: authority.case19YRows,
  expectedCaseNumber: 19,
  expectedType: 'Rigid Y',
  normalUnit: authority.reactionConvention.normalUnit,
});
assert.equal(control.status, 'PASS');
assert.equal(control.rowCount, 29);

const replay = buildCommittedTangentialFrictionReplay({
  rows: authority.case17YRows,
  frictionNodeIds: authority.sourceFrictionInventory.positiveFrictionNodeIds,
  expectedCaseNumber: 17,
  expectedType: 'Rigid Y',
  normalUnit: authority.reactionConvention.normalUnit,
});
assert.equal(replay.frictionNodeCount, 26);
assert.deepEqual(replay.frictionNodeIds, authority.sourceFrictionInventory.positiveFrictionNodeIds);
assert.deepEqual(replay.ignoredSameTypeNonFrictionNodeIds, ['20300', '20640', '21640']);
assert.equal(replay.policy.tangentialComponentsOnly, true);
assert.equal(replay.policy.normalSupportOperatorUnchanged, true);
assert.equal(replay.policy.stateClassificationInferredFromOutput, false);
assert.equal(replay.policy.iterationHistoryInferredFromOutput, false);
assert.equal(replay.policy.comparatorOrReferenceUsedByReplay, false);

for (const row of replay.loads) {
  assert.equal(row.appliedTangentialLoadN[1], 0);
  const source = authority.case17YRows.find((candidate) => candidate.nodeId === row.nodeId);
  assert.ok(source);
  assert.ok(Math.abs(row.appliedTangentialLoadN[0] + source.forceN[0]) < 1e-12);
  assert.ok(Math.abs(row.appliedTangentialLoadN[2] + source.forceN[2]) < 1e-12);
}

const q = authority.qualification;
assert.deepEqual([q.baseline.passed, q.baseline.failed, q.baseline.total], [1719, 195, 1914]);
assert.deepEqual(
  [q.committedStateReplay.passed, q.committedStateReplay.failed, q.committedStateReplay.total],
  [1884, 30, 1914],
);
assert.ok(q.committedStateReplay.accuracyPercent > q.baseline.accuracyPercent);
assert.equal(q.delta.passedRows, 165);
assert.ok(q.delta.accuracyPercentagePoints > 8.62);
assert.equal(q.sameGovernedDenominator, true);
assert.equal(q.comparatorChanged, false);
assert.equal(q.referenceRowsChanged, false);
assert.equal(q.responseFittingUsed, false);
assert.ok(q.maximumGlobalEquilibriumResidual < 1e-5);

assert.equal(authority.authorityBoundary.genericIterationHistoryReconstructed, false);
assert.equal(authority.authorityBoundary.genericNonlinearSolverAuthorized, false);
assert.equal(authority.authorityBoundary.bm4lL13CommittedStateReplayAuthorized, true);
assert.equal(authority.authorityBoundary.l7ReplayAuthorized, false);

const serialized = JSON.stringify(authority);
assert.equal(serialized.includes('referenceValue'), false);
assert.equal(serialized.includes('actualValue'), false);
assert.equal(serialized.includes('rawRelativeError'), false);

console.log(JSON.stringify({
  check: 'm047-bm4l-f28-independent-committed-friction-state',
  status: 'PASS',
  independentSourceCase: 17,
  zeroFrictionControlCase: 19,
  committedFrictionLoadCount: replay.frictionNodeCount,
  presentAccuracyPercent: q.baseline.accuracyPercent,
  revisedAccuracyPercent: q.committedStateReplay.accuracyPercent,
  accuracyDeltaPercentagePoints: q.delta.accuracyPercentagePoints,
  governedRows: q.committedStateReplay.total,
  genericIterationHistoryReconstructed: false,
}, null, 2));
