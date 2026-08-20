#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const casePath = 'scripts/lafea-pr1270-source-remesh-case.mjs';
const originalCaseSource = fs.readFileSync(casePath, 'utf8');
const screeningCaseSource = makeConstructionGrowthCandidate(makeObservationFirst(originalCaseSource));

const acceptanceGrowth = 1.5;
const constructionGrowthCandidates = [Math.sqrt(1.5), 1.20, 1.15];
const family = 'T3';
const localTargets = [22.5, 15, 11.25, 7.5];
const scenarios = [
  { name: 'CENTER', width: 200, height: 120, xf: 0.50, yf: 0.50 },
  { name: 'NEAR_EDGE', width: 200, height: 120, xf: 0.15, yf: 0.50 },
  { name: 'NEAR_CORNER', width: 200, height: 120, xf: 0.15, yf: 0.15 },
  { name: 'ELONGATED', width: 300, height: 90, xf: 0.50, yf: 0.50 },
];
const rows = [];

try {
  fs.writeFileSync(casePath, screeningCaseSource);
  for (const constructionGrowth of constructionGrowthCandidates) {
    for (const localTarget of localTargets) {
      for (const scenario of scenarios) {
        rows.push(runCase({ constructionGrowth, localTarget, scenario }));
      }
    }
  }
} finally {
  fs.writeFileSync(casePath, originalCaseSource);
}

const summaries = constructionGrowthCandidates.map((constructionGrowth) => summarizeGrowth(
  constructionGrowth,
  rows.filter((row) => sameNumber(row.constructionGrowth, constructionGrowth)),
));
const fullyPassing = summaries.filter((summary) => summary.qualification === 'PASS');
const preferred = fullyPassing.length
  ? [...fullyPassing].sort((a, b) => b.constructionGrowth - a.constructionGrowth)[0]
  : null;

console.log(`PR1270_CONSTRUCTION_GROWTH_SCREEN=${JSON.stringify({
  check: 'PR1270_SOURCE_REMESH_CONSTRUCTION_GROWTH_SCREEN_V1',
  family,
  acceptanceGrowth,
  acceptanceDefinition: 'MAX_LONGEST_CORNER_EDGE_RATIO_ACROSS_SHARED_CORNER_EDGE_V1',
  constructionGrowthCandidates,
  caseCount: rows.length,
  caseCountPerCandidate: localTargets.length * scenarios.length,
  localTargets,
  targetRatios: localTargets.map((value) => value / 30),
  scenarios,
  summaries,
  fullyPassingConstructionGrowths: fullyPassing.map((row) => row.constructionGrowth),
  preferredConstructionGrowth: preferred?.constructionGrowth ?? null,
  rows,
})}`);

assert.ok(
  fullyPassing.length > 0,
  `no construction-growth candidate passed all ${localTargets.length * scenarios.length} T3 screening cases`,
);

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
      "  replayEqual, replayInsertionCountEqual,\n  constructionGrowth: growth,\n  acceptanceGrowth: profile.fields.adjacentSizeRatioMax,\n  qualityWorstStatus: quality.worstStatus,",
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

function makeConstructionGrowthCandidate(source) {
  const anchor = 'const growth = 1.5;';
  assert.ok(source.includes(anchor), 'construction-growth anchor missing');
  return source.replace(
    anchor,
    "const growth = positive(process.env.PR1270_CONSTRUCTION_GROWTH, 'construction growth');\n"
      + "assert.ok(growth > 1 && growth <= 1.5, 'construction growth must be in (1, 1.5]');",
  );
}

function runCase({ constructionGrowth, localTarget, scenario }) {
  const growthToken = String(constructionGrowth).replace(/[^0-9]+/gu, '_');
  const caseId = `GROWTH_${growthToken}_T3_H${String(localTarget).replace('.', '_')}_${scenario.name}`;
  const run = spawnSync(process.execPath, [casePath], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PR1270_CASE_ID: caseId,
      PR1270_FAMILY: family,
      PR1270_HGLOBAL: '30',
      PR1270_HLOCAL: String(localTarget),
      PR1270_WIDTH: String(scenario.width),
      PR1270_HEIGHT: String(scenario.height),
      PR1270_XF: String(scenario.xf),
      PR1270_YF: String(scenario.yf),
      PR1270_CONSTRUCTION_GROWTH: String(constructionGrowth),
    },
  });
  const text = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
  const match = text.match(/PR1270_SOURCE_REMESH_CASE=(\{[^\n]+\})/u);
  const parsed = match ? JSON.parse(match[1]) : null;
  const error = text.match(/(?:TypeError|Error|AssertionError)[^:]*:\s*([^\n]+)/u)?.[1]?.trim() ?? null;
  return {
    caseId,
    family,
    constructionGrowth,
    acceptanceGrowth,
    localTarget,
    targetRatio: localTarget / 30,
    scenario: scenario.name,
    width: scenario.width,
    height: scenario.height,
    xf: scenario.xf,
    yf: scenario.yf,
    exitCode: run.status,
    qualification: parsed?.qualification ?? 'NOT_REACHED',
    replayEqual: parsed?.replayEqual ?? null,
    replayInsertionCountEqual: parsed?.replayInsertionCountEqual ?? null,
    transitionLevels: parsed?.transitionLevels ?? null,
    influenceRadius: parsed?.influenceRadius ?? null,
    maximumObserved: parsed?.maximumObserved ?? null,
    violatingAdjacencyCount: parsed?.violatingAdjacencyCount ?? null,
    qualityWorstStatus: parsed?.qualityWorstStatus ?? null,
    qualityBlockingElementCount: parsed?.qualityBlockingElementCount ?? null,
    qualityWarningElementCount: parsed?.qualityWarningElementCount ?? null,
    localCornerGain: parsed?.localCornerGain ?? null,
    insertedPointCount: parsed?.insertedPointCount ?? null,
    parentNodes: parsed?.parentNodes ?? null,
    childNodes: parsed?.childNodes ?? null,
    parentElements: parsed?.parentElements ?? null,
    childElements: parsed?.childElements ?? null,
    subdividedBoundarySegmentCount: parsed?.subdividedBoundarySegmentCount ?? null,
    localStats: parsed?.localStats ?? null,
    boundary: parsed?.boundary ?? null,
    error,
  };
}

function summarizeGrowth(constructionGrowth, factorRows) {
  const expectedCaseCount = localTargets.length * scenarios.length;
  assert.equal(factorRows.length, expectedCaseCount);
  const failures = factorRows.filter((row) => (
    row.exitCode !== 0
    || row.qualification !== 'PASS'
    || row.replayEqual !== true
    || row.replayInsertionCountEqual !== true
    || row.qualityWorstStatus === 'BLOCK'
    || row.violatingAdjacencyCount !== 0
    || !(row.maximumObserved <= acceptanceGrowth + 1e-12)
    || !(row.insertedPointCount > 0)
    || !(row.localCornerGain > 0)
  ));
  const observed = factorRows.map((row) => row.maximumObserved).filter(Number.isFinite);
  const nodes = factorRows.map((row) => row.childNodes).filter(Number.isFinite);
  const elements = factorRows.map((row) => row.childElements).filter(Number.isFinite);
  const inserted = factorRows.map((row) => row.insertedPointCount).filter(Number.isFinite);
  const boundarySegments = factorRows
    .map((row) => row.subdividedBoundarySegmentCount)
    .filter(Number.isFinite);
  const localGains = factorRows.map((row) => row.localCornerGain).filter(Number.isFinite);
  const radii = factorRows.map((row) => row.influenceRadius).filter(Number.isFinite);
  const worstMaximumObserved = observed.length ? Math.max(...observed) : null;
  return {
    constructionGrowth,
    caseCount: factorRows.length,
    passingCaseCount: factorRows.length - failures.length,
    failingCaseCount: failures.length,
    worstMaximumObserved,
    minimumAcceptanceMargin: Number.isFinite(worstMaximumObserved)
      ? acceptanceGrowth - worstMaximumObserved
      : null,
    minimumAcceptanceMarginPercent: Number.isFinite(worstMaximumObserved)
      ? ((acceptanceGrowth - worstMaximumObserved) / acceptanceGrowth) * 100
      : null,
    maximumChildNodes: nodes.length ? Math.max(...nodes) : null,
    maximumChildElements: elements.length ? Math.max(...elements) : null,
    maximumInsertedPointCount: inserted.length ? Math.max(...inserted) : null,
    maximumSubdividedBoundarySegmentCount: boundarySegments.length
      ? Math.max(...boundarySegments)
      : null,
    minimumLocalCornerGain: localGains.length ? Math.min(...localGains) : null,
    maximumInfluenceRadius: radii.length ? Math.max(...radii) : null,
    replayFailureCaseIds: factorRows
      .filter((row) => row.replayEqual !== true || row.replayInsertionCountEqual !== true)
      .map((row) => row.caseId),
    qualityBlockCaseIds: factorRows
      .filter((row) => row.qualityWorstStatus === 'BLOCK')
      .map((row) => row.caseId),
    adjacencyFailureCaseIds: factorRows
      .filter((row) => !(row.maximumObserved <= acceptanceGrowth + 1e-12)
        || row.violatingAdjacencyCount !== 0)
      .map((row) => row.caseId),
    deliveryFailureCaseIds: factorRows
      .filter((row) => !(row.insertedPointCount > 0) || !(row.localCornerGain > 0))
      .map((row) => row.caseId),
    failureCaseIds: failures.map((row) => row.caseId),
    qualification: failures.length ? 'BLOCK' : 'PASS',
  };
}

function sameNumber(left, right) {
  return Math.abs(left - right) <= 1e-12 * Math.max(1, Math.abs(left), Math.abs(right));
}
