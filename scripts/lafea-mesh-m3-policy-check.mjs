#!/usr/bin/env node
/**
 * Exercise the v2 gate using a retained public-runner M3 audit. CLI inputs are
 * the M3 audit path and a new evidence output path. Explicitly corrupted copies
 * are negative controls, never engineering inputs or expected solver results.
 * Assertions fail loudly; evidence output refuses overwrite and has no fallback.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { M3_POLICY_ID, qualifyM3MeasuredRefinement } from './lib/lafea-mesh-benchmark-m3.mjs';
import { finalizeAuditRecord } from './lib/lafea-benchmark-audit.mjs';

const [auditPath, outputPath] = process.argv.slice(2);
assert.ok(auditPath && outputPath, 'Usage: node scripts/lafea-mesh-m3-policy-check.mjs <M3 audit> <new output JSON>');
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
assert.equal(audit.recordHash, finalizeAuditRecord(audit).recordHash);
assert.equal(audit.stageId, 'M3');
assert.equal(audit.caseStatus, 'PASS');
assert.equal(audit.methodResults[0].evidence.acceptancePolicyId, M3_POLICY_ID);
const observations = audit.methodResults[0].evidence.observations;
assert.equal(observations.length, 4);
for (const row of observations) {
  assert.equal(qualifyM3MeasuredRefinement(row.levels, row.stageId).status, 'PASS');
  if (row.ladderId === 'L3-T6' || row.ladderId === 'L4-CST-DKT') {
    assert.equal(row.legacyV1Status, 'FAIL');
    assert.equal(row.diagnosticStatus, 'FAIL');
  }
}
const shell = observations.find((row) => row.ladderId === 'L4-CST-DKT');
/** @typedef {Array<Parameters<typeof qualifyM3MeasuredRefinement>[0][number]>} Levels */
/** @type {Array<{id:string, corrupt:(levels:Levels)=>void}>} */
const cases = [
  { id: 'UNCHANGED_ACTUAL_SIZE', corrupt: (levels) => { levels[1].meshEvidence.measuredLengths.maximum = levels[0].meshEvidence.measuredLengths.maximum; } },
  { id: 'NONFINITE_LENGTH', corrupt: (levels) => { levels[1].meshEvidence.measuredLengths.maximum = Infinity; } },
  { id: 'ZERO_LENGTH', corrupt: (levels) => { levels[1].meshEvidence.measuredLengths.minimum = 0; } },
  { id: 'NEGATIVE_LENGTH', corrupt: (levels) => { levels[1].meshEvidence.measuredLengths.minimum = -1; } },
  { id: 'MISSING_EVIDENCE', corrupt: (levels) => { delete levels[1].meshEvidence; } },
  { id: 'INCOMPLETE_EVIDENCE', corrupt: (levels) => { levels[1].meshEvidence.complete = false; } },
  { id: 'WRONG_SAMPLE_COUNT', corrupt: (levels) => { levels[1].meshEvidence.measuredLengths.sampleCount -= 1; } },
  { id: 'QUALITY_BLOCK', corrupt: (levels) => { levels[1].qualityWorstStatus = 'BLOCK'; } },
  { id: 'MISSING_QUALITY_STATUS', corrupt: (levels) => { delete levels[1].qualityWorstStatus; } },
  { id: 'BROKEN_SEAM', corrupt: (levels) => { levels[1].seamConforming = false; } },
  { id: 'MISSING_SEAM_DISTANCE', corrupt: (levels) => { levels[1].maximumSeamPairDistance = null; } },
  { id: 'SEAM_GAP', corrupt: (levels) => { levels[1].maximumSeamPairDistance = 1; } },
  { id: 'ADJACENCY_BLOCK', corrupt: (levels) => { levels[1].adjacentSizeRatio.qualification = 'BLOCK'; } },
  { id: 'MISSING_ADJACENCY', corrupt: (levels) => { levels[1].adjacentSizeRatio = null; } },
  { id: 'DUPLICATE_MESH', corrupt: (levels) => { levels[1].meshHash = levels[0].meshHash; } },
  { id: 'RESOURCE_LIMIT', corrupt: (levels) => { levels[1].resourceDisposition = 'BLOCK'; } },
  { id: 'INSUFFICIENT_LEVELS', corrupt: (levels) => { levels.pop(); } },
];
const negativeControls = cases.map(({ id, corrupt }) => {
  const copy = structuredClone(shell.levels);
  corrupt(copy);
  const result = qualifyM3MeasuredRefinement(copy, 'LAFEA.4');
  assert.equal(result.status, 'FAIL', `${id} must fail M3 advancement`);
  return { id, status: 'PASS', observedGateStatus: result.status };
});

const t6 = observations.find((row) => row.ladderId === 'L3-T6');
const mappingChecks = t6.levels.map((level) => {
  const worst = level.meshEvidence.worstElements.find((row) => row.selectedByMetric === 'SCALED_JACOBIAN');
  assert.ok(worst.t6Mapping.midsideOffsets.every((offset) => offset < 1e-12));
  const [a, b, c] = worst.nodes;
  const expectedDeterminant = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  assert.ok(expectedDeterminant > 0);
  for (const cycle of worst.t6Mapping.cyclicMappings) {
    for (const sample of cycle.samples) {
      assert.ok(Math.abs(sample.determinant - expectedDeterminant) < 1e-12);
    }
  }
  return { levelId: level.levelId, elementId: worst.element.elementId, expectedDeterminant,
    cyclicMinimumScaledJacobians: worst.t6Mapping.cyclicMappings.map((cycle) => cycle.minimumScaledJacobian), status: 'PASS' };
});
const evidence = {
  schema: 'lafea-mesh-m3-policy-check/v1',
  policyId: M3_POLICY_ID,
  exactHeadSha: audit.exactHeadSha,
  inputAuditHash: audit.recordHash,
  inputBasis: '[SIMULATED] public production-mesh fixture run; negative controls corrupt copies only',
  status: 'PASS',
  negativeControls,
  mappingChecks,
  sourcePinNegative: 'SEPARATE_ISOLATED_PUBLIC_RUN_REQUIRED',
  solverExecutionAuthorizedByThisCheck: false,
};
fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { flag: 'wx' });
process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
