#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const families = ['T3', 'T6'];
const localTargets = [22.5, 15, 11.25, 7.5];
const scenarios = [
  { name: 'CENTER', width: 200, height: 120, xf: 0.50, yf: 0.50 },
  { name: 'NEAR_EDGE', width: 200, height: 120, xf: 0.15, yf: 0.50 },
  { name: 'NEAR_CORNER', width: 200, height: 120, xf: 0.15, yf: 0.15 },
  { name: 'ELONGATED', width: 300, height: 90, xf: 0.50, yf: 0.50 },
];
const rows = [];
for (const family of families) {
  for (const localTarget of localTargets) {
    for (const scenario of scenarios) rows.push(runCase(family, localTarget, scenario));
  }
}
const passes = rows.filter((row) => row.exitCode === 0 && row.qualification === 'PASS');
const failures = rows.filter((row) => row.exitCode !== 0 || row.qualification !== 'PASS');
const observed = passes.map((row) => row.maximumObserved).filter(Number.isFinite);
console.log(`PR1270_SOURCE_REMESH_MATRIX=${JSON.stringify({
  caseCount: rows.length, passCount: passes.length, failCount: failures.length,
  worstPassingMaximumObserved: observed.length ? Math.max(...observed) : null,
  minimumPassingAdjacencyMargin: observed.length ? 1.5 - Math.max(...observed) : null,
  minimumLocalCornerGain: passes.length ? Math.min(...passes.map((row) => row.localCornerGain)) : null,
  maximumBoundarySegments: passes.length ? Math.max(...passes.map((row) => row.subdividedBoundarySegmentCount)) : null,
  failureCaseIds: failures.map((row) => row.caseId), rows,
})}`);
assert.equal(failures.length, 0, `source-remesh candidate failed ${failures.length}/${rows.length} cases`);

function runCase(family, localTarget, scenario) {
  const caseId = `SRC_${family}_H${String(localTarget).replace('.', '_')}_${scenario.name}`;
  const run = spawnSync(process.execPath, ['scripts/lafea-pr1270-source-remesh-case.mjs'], {
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
    maximumObserved: parsed?.maximumObserved ?? null,
    localCornerGain: parsed?.localCornerGain ?? null,
    insertedPointCount: parsed?.insertedPointCount ?? null,
    childNodes: parsed?.childNodes ?? null,
    childElements: parsed?.childElements ?? null,
    subdividedBoundarySegmentCount: parsed?.subdividedBoundarySegmentCount ?? null,
    localStats: parsed?.localStats ?? null,
    qualityWorstStatus: parsed?.qualityWorstStatus ?? null,
    error,
  };
}
