#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const casePath = 'scripts/lafea-pr1270-source-remesh-case.mjs';
const originalCaseSource = fs.readFileSync(casePath, 'utf8');
const observedCaseSource = makeObservationFirst(originalCaseSource);
const families = ['T3', 'T6'];
const localTargets = [22.5, 15, 11.25, 7.5];
const scenarios = [
  { name: 'CENTER', width: 200, height: 120, xf: 0.50, yf: 0.50 },
  { name: 'NEAR_EDGE', width: 200, height: 120, xf: 0.15, yf: 0.50 },
  { name: 'NEAR_CORNER', width: 200, height: 120, xf: 0.15, yf: 0.15 },
  { name: 'ELONGATED', width: 300, height: 90, xf: 0.50, yf: 0.50 },
];
const rows = [];
try {
  fs.writeFileSync(casePath, observedCaseSource);
  for (const family of families) {
    for (const localTarget of localTargets) {
      for (const scenario of scenarios) rows.push(runCase(family, localTarget, scenario));
    }
  }
} finally {
  fs.writeFileSync(casePath, originalCaseSource);
}
const passes = rows.filter((row) => row.exitCode === 0 && row.qualification === 'PASS');
const failures = rows.filter((row) => row.exitCode !== 0 || row.qualification !== 'PASS');
const observed = rows.map((row) => row.maximumObserved).filter(Number.isFinite);
console.log(`PR1270_SOURCE_REMESH_MATRIX=${JSON.stringify({
  caseCount: rows.length, passCount: passes.length, failCount: failures.length,
  worstObserved: observed.length ? Math.max(...observed) : null,
  worstPassingMaximumObserved: passes.length ? Math.max(...passes.map((row) => row.maximumObserved)) : null,
  minimumPassingAdjacencyMargin: passes.length ? 1.5 - Math.max(...passes.map((row) => row.maximumObserved)) : null,
  minimumLocalCornerGain: passes.length ? Math.min(...passes.map((row) => row.localCornerGain)) : null,
  maximumBoundarySegments: rows.length ? Math.max(...rows.map((row) => row.subdividedBoundarySegmentCount ?? 0)) : null,
  replayFailureCaseIds: rows.filter((row) => row.replayEqual === false || row.replayInsertionCountEqual === false).map((row) => row.caseId),
  adjacencyFailureCaseIds: rows.filter((row) => row.maximumObserved > 1.5 || row.violatingAdjacencyCount > 0).map((row) => row.caseId),
  qualityBlockCaseIds: rows.filter((row) => row.qualityWorstStatus === 'BLOCK').map((row) => row.caseId),
  failureCaseIds: failures.map((row) => row.caseId), rows,
})}`);
assert.equal(failures.length, 0, `source-remesh candidate failed ${failures.length}/${rows.length} cases`);

function makeObservationFirst(source) {
  const replacements = [
    [
      "assert.equal(JSON.stringify(second.mesh), JSON.stringify(first.mesh), 'source remesh replay must be byte-identical');\nassert.equal(second.insertedPointCount, first.insertedPointCount);",
      "const replayEqual = JSON.stringify(second.mesh) === JSON.stringify(first.mesh);\nconst replayInsertionCountEqual = second.insertedPointCount === first.insertedPointCount;",
    ],
    [
      "assert.notEqual(quality.worstStatus, 'BLOCK');\nassert.equal(adjacency.qualification, 'PASS');\nassert.equal(adjacency.violatingAdjacencyCount, 0);\nassert.ok(first.insertedPointCount > 0, 'graded source remesh inserted no interior points');\nassert.ok(childLocalCorners > parentLocalCorners,\n  `local corner density did not increase: ${parentLocalCorners} -> ${childLocalCorners}`);\nassert.equal(boundary.offGeometryCornerCount, 0);\nassert.equal(boundary.offGeometryMidsideCount, 0);\nassert.equal(boundary.nonManifoldBoundaryOwnerCount, 0);",
      "const acceptancePass = replayEqual\n  && replayInsertionCountEqual\n  && quality.worstStatus !== 'BLOCK'\n  && adjacency.qualification === 'PASS'\n  && adjacency.violatingAdjacencyCount === 0\n  && first.insertedPointCount > 0\n  && childLocalCorners > parentLocalCorners\n  && boundary.offGeometryCornerCount === 0\n  && boundary.offGeometryMidsideCount === 0\n  && boundary.nonManifoldBoundaryOwnerCount === 0;",
    ],
    [
      "  qualityWorstStatus: quality.worstStatus,",
      "  replayEqual, replayInsertionCountEqual,\n  qualityWorstStatus: quality.worstStatus,",
    ],
    [
      "  violatingAdjacencyCount: adjacency.violatingAdjacencyCount,\n  boundary,\n  qualification: 'PASS',",
      "  violatingAdjacencyCount: adjacency.violatingAdjacencyCount,\n  boundary,\n  qualification: acceptancePass ? 'PASS' : 'BLOCK',",
    ],
  ];
  let patched = source;
  for (const [from, to] of replacements) {
    assert.ok(patched.includes(from), `observation patch anchor missing: ${from.slice(0, 48)}`);
    patched = patched.replace(from, to);
  }
  return patched;
}

function runCase(family, localTarget, scenario) {
  const caseId = `SRC_${family}_H${String(localTarget).replace('.', '_')}_${scenario.name}`;
  const run = spawnSync(process.execPath, [casePath], {
    encoding: 'utf8',
    env: {
      ...process.env, PR1270_CASE_ID: caseId, PR1270_FAMILY: family,
      PR1270_HGLOBAL: '30', PR1270_HLOCAL: String(localTarget),
      PR1270_WIDTH: String(scenario.width), PR1270_HEIGHT: String(scenario.height),
      PR1270_XF: String(scenario.xf), PR1270_YF: String(scenario.yf),
    },
  });
  const text = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
  const match = text.match(/PR1270_SOURCE_REMESH_CASE=(\{[^\n]+\})/u);
  const parsed = match ? JSON.parse(match[1]) : null;
  const error = text.match(/(?:TypeError|Error|AssertionError)[^:]*:\s*([^\n]+)/u)?.[1]?.trim() ?? null;
  return {
    caseId, family, localTarget, ratio: localTarget / 30, scenario: scenario.name,
    exitCode: run.status, qualification: parsed?.qualification ?? 'NOT_REACHED',
    replayEqual: parsed?.replayEqual ?? null,
    replayInsertionCountEqual: parsed?.replayInsertionCountEqual ?? null,
    maximumObserved: parsed?.maximumObserved ?? null,
    violatingAdjacencyCount: parsed?.violatingAdjacencyCount ?? null,
    localCornerGain: parsed?.localCornerGain ?? null,
    insertedPointCount: parsed?.insertedPointCount ?? null,
    childNodes: parsed?.childNodes ?? null,
    childElements: parsed?.childElements ?? null,
    subdividedBoundarySegmentCount: parsed?.subdividedBoundarySegmentCount ?? null,
    localStats: parsed?.localStats ?? null,
    qualityWorstStatus: parsed?.qualityWorstStatus ?? null,
    qualityBlockingElementCount: parsed?.qualityBlockingElementCount ?? null,
    qualityWarningElementCount: parsed?.qualityWarningElementCount ?? null,
    boundary: parsed?.boundary ?? null,
    error,
  };
}
