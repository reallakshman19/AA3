#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const casePath = 'scripts/lafea-pr1270-source-remesh-case.mjs';
const original = fs.readFileSync(casePath, 'utf8');
const candidate = makeBoundaryOnlySeed(makeObservationFirst(original));
const family = 'T3';
const globalTarget = 30;
const acceptanceGrowth = 1.5;
const localTargets = [22.5, 15, 11.25, 7.5];
const scenarios = [
  { name: 'CENTER', width: 200, height: 120, xf: 0.50, yf: 0.50 },
  { name: 'NEAR_EDGE', width: 200, height: 120, xf: 0.15, yf: 0.50 },
  { name: 'NEAR_CORNER', width: 200, height: 120, xf: 0.15, yf: 0.15 },
  { name: 'ELONGATED', width: 300, height: 90, xf: 0.50, yf: 0.50 },
];
const rows = [];

try {
  fs.writeFileSync(casePath, candidate);
  for (const localTarget of localTargets) {
    for (const scenario of scenarios) rows.push(runCase(localTarget, scenario));
  }
} finally {
  fs.writeFileSync(casePath, original);
}

const failures = rows.filter((row) => (
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
const observed = rows.map((row) => row.maximumObserved).filter(Number.isFinite);
const receipt = {
  check: 'PR1270_SOURCE_REMESH_BOUNDARY_ONLY_SEED_V1',
  architecture: 'SOURCE_BOUNDARY_ONLY_THEN_GRADED_STEINER_INSERTION',
  family,
  globalTarget,
  acceptanceGrowth,
  acceptanceDefinition: 'MAX_LONGEST_CORNER_EDGE_RATIO_ACROSS_SHARED_CORNER_EDGE_V1',
  caseCount: rows.length,
  passCount: rows.length - failures.length,
  failCount: failures.length,
  worstMaximumObserved: observed.length ? Math.max(...observed) : null,
  minimumAcceptanceMargin: observed.length ? acceptanceGrowth - Math.max(...observed) : null,
  maximumChildNodes: Math.max(...rows.map((row) => row.childNodes).filter(Number.isFinite)),
  maximumChildElements: Math.max(...rows.map((row) => row.childElements).filter(Number.isFinite)),
  minimumLocalCornerGain: Math.min(...rows.map((row) => row.localCornerGain).filter(Number.isFinite)),
  replayFailureCaseIds: rows.filter((row) => row.replayEqual !== true || row.replayInsertionCountEqual !== true).map((row) => row.caseId),
  qualityBlockCaseIds: rows.filter((row) => row.qualityWorstStatus === 'BLOCK').map((row) => row.caseId),
  adjacencyFailureCaseIds: rows.filter((row) => !(row.maximumObserved <= acceptanceGrowth + 1e-12) || row.violatingAdjacencyCount !== 0).map((row) => row.caseId),
  deliveryFailureCaseIds: rows.filter((row) => !(row.insertedPointCount > 0) || !(row.localCornerGain > 0)).map((row) => row.caseId),
  failureCaseIds: failures.map((row) => row.caseId),
  qualification: failures.length ? 'BLOCK' : 'PASS',
  rows,
};
fs.mkdirSync('test-results', { recursive: true });
fs.writeFileSync('test-results/pr1270-boundary-only-seed-matrix.json', `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`PR1270_BOUNDARY_ONLY_SEED_MATRIX=${JSON.stringify(receipt)}`);
assert.equal(failures.length, 0, `boundary-only source-remesh candidate failed ${failures.length}/${rows.length} cases`);

function makeBoundaryOnlySeed(source) {
  const importFrom = "import { lawsonFlip, upgradeToT6, edgeKey } from '../src/core/lafea-meshing/constrained-delaunay-t6.js';";
  const importTo = "import { lawsonFlip, upgradeToT6, edgeKey, triangulateRegionAsIndexTriples } from '../src/core/lafea-meshing/constrained-delaunay-t6.js';";
  assert.ok(source.includes(importFrom), 'boundary-only import anchor missing');
  let patched = source.replace(importFrom, importTo);
  const seedFrom = "  const points = base.points.map((point) => ({ x: point.x, y: point.y }));\n  let triangles = base.triangleTriples.map((row) => [...row]);\n  const constraints = new Set(base.boundaryEdgeKeys);\n  const fixed = new Set(base.boundaryRings.flatMap((ring) => ring.globalIndices));";
  const seedTo = "  const boundarySeed = triangulateRegionAsIndexTriples(base.ringCorners);\n  const points = boundarySeed.points.map((point) => ({ x: point.x, y: point.y }));\n  let triangles = boundarySeed.triangleTriples.map((row) => [...row]);\n  const constraints = new Set(boundarySeed.boundaryEdgeKeys);\n  const fixed = new Set(points.map((_, index) => index));";
  assert.ok(patched.includes(seedFrom), 'boundary-only seed anchor missing');
  patched = patched.replace(seedFrom, seedTo);
  return patched;
}

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

function runCase(localTarget, scenario) {
  const caseId = `BOUNDARY_SEED_T3_H${String(localTarget).replace('.', '_')}_${scenario.name}`;
  const run = spawnSync(process.execPath, [casePath], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PR1270_CASE_ID: caseId,
      PR1270_FAMILY: family,
      PR1270_HGLOBAL: String(globalTarget),
      PR1270_HLOCAL: String(localTarget),
      PR1270_WIDTH: String(scenario.width),
      PR1270_HEIGHT: String(scenario.height),
      PR1270_XF: String(scenario.xf),
      PR1270_YF: String(scenario.yf),
    },
  });
  const text = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
  const match = text.match(/PR1270_SOURCE_REMESH_CASE=(\{[^\n]+\})/u);
  const parsed = match ? JSON.parse(match[1]) : null;
  return {
    caseId,
    localTarget,
    targetRatio: localTarget / globalTarget,
    scenario: scenario.name,
    exitCode: run.status,
    qualification: parsed?.qualification ?? 'NOT_REACHED',
    replayEqual: parsed?.replayEqual ?? null,
    replayInsertionCountEqual: parsed?.replayInsertionCountEqual ?? null,
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
    error: text.match(/(?:TypeError|Error|AssertionError)[^:]*:\s*([^\n]+)/u)?.[1]?.trim() ?? null,
  };
}
