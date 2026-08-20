#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const casePath = 'scripts/lafea-pr1270-source-remesh-case.mjs';
const original = fs.readFileSync(casePath, 'utf8');
const candidate = makeContinuousDelaunayCandidate(makeObservationFirst(original));
const family = 'T3';
const globalTarget = 30;
const acceptanceGrowth = 1.5;
const localTargets = [15, 7.5];
const scenarios = [
  { name: 'CENTER', width: 200, height: 120, xf: 0.50, yf: 0.50 },
  { name: 'NEAR_EDGE', width: 200, height: 120, xf: 0.15, yf: 0.50 },
  { name: 'NEAR_CORNER', width: 200, height: 120, xf: 0.15, yf: 0.15 },
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
  check: 'PR1270_CONTINUOUS_LIPSCHITZ_DELAUNAY_REDUCED_V1',
  architecture: 'SOURCE_BOUNDARY_ONLY_PLUS_WORST_TRIANGLE_CONTINUOUS_SIZE_REFINEMENT',
  sizeField: 'H(D)=MIN(H_GLOBAL,H_LOCAL+(1-1/G_MAX)*D)',
  family,
  globalTarget,
  acceptanceGrowth,
  fieldSlope: 1 - 1 / acceptanceGrowth,
  transitionRadiusByLocalTarget: Object.fromEntries(localTargets.map((h) => [h, (globalTarget - h) / (1 - 1 / acceptanceGrowth)])),
  caseCount: rows.length,
  passCount: rows.length - failures.length,
  failCount: failures.length,
  worstMaximumObserved: observed.length ? Math.max(...observed) : null,
  minimumAcceptanceMargin: observed.length ? acceptanceGrowth - Math.max(...observed) : null,
  maximumChildNodes: maxFinite(rows.map((row) => row.childNodes)),
  maximumChildElements: maxFinite(rows.map((row) => row.childElements)),
  maximumInsertedPointCount: maxFinite(rows.map((row) => row.insertedPointCount)),
  minimumLocalCornerGain: minFinite(rows.map((row) => row.localCornerGain)),
  replayFailureCaseIds: rows.filter((row) => row.replayEqual !== true || row.replayInsertionCountEqual !== true).map((row) => row.caseId),
  qualityBlockCaseIds: rows.filter((row) => row.qualityWorstStatus === 'BLOCK').map((row) => row.caseId),
  adjacencyFailureCaseIds: rows.filter((row) => !(row.maximumObserved <= acceptanceGrowth + 1e-12) || row.violatingAdjacencyCount !== 0).map((row) => row.caseId),
  deliveryFailureCaseIds: rows.filter((row) => !(row.insertedPointCount > 0) || !(row.localCornerGain > 0)).map((row) => row.caseId),
  failureCaseIds: failures.map((row) => row.caseId),
  qualification: failures.length ? 'BLOCK' : 'PASS',
  rows,
};
fs.mkdirSync('test-results', { recursive: true });
fs.writeFileSync('test-results/pr1270-lipschitz-delaunay-matrix.json', `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`PR1270_LIPSCHITZ_DELAUNAY_MATRIX=${JSON.stringify(receipt)}`);
assert.equal(failures.length, 0, `continuous Lipschitz Delaunay candidate failed ${failures.length}/${rows.length} reduced cases`);

function makeContinuousDelaunayCandidate(source) {
  const importFrom = "import { lawsonFlip, upgradeToT6, edgeKey } from '../src/core/lafea-meshing/constrained-delaunay-t6.js';";
  const importTo = "import { lawsonFlip, upgradeToT6, edgeKey, triangulateRegionAsIndexTriples } from '../src/core/lafea-meshing/constrained-delaunay-t6.js';";
  assert.ok(source.includes(importFrom), 'continuous import anchor missing');
  let patched = source.replace(importFrom, importTo);

  const transitionStart = patched.indexOf('function buildTransition(');
  const subdivisionStart = patched.indexOf('function subdivideLineGeometryForSizeField(', transitionStart);
  assert.ok(transitionStart >= 0 && subdivisionStart > transitionStart, 'continuous transition anchors missing');
  const transitionReplacement = String.raw`function buildTransition(local, global, adjacentRatio, minimumElements) {
  void minimumElements;
  const fieldSlope = 1 - 1 / adjacentRatio;
  assert.ok(fieldSlope > 0 && fieldSlope < 1, 'continuous field slope invalid');
  const influenceRadius = (global - local) / fieldSlope;
  return Object.freeze({
    localTarget: local,
    globalTarget: global,
    levels: Object.freeze([local, global]),
    bands: Object.freeze([]),
    influenceRadius,
    adjacentRatio,
    fieldSlope,
    fieldFormula: 'H(D)=MIN(H_GLOBAL,H_LOCAL+(1-1/G_MAX)*D)',
  });
}

function sizeAtDistance(distance, transition) {
  return Math.min(
    transition.globalTarget,
    transition.localTarget + transition.fieldSlope * Math.max(0, distance),
  );
}

`;
  patched = patched.slice(0, transitionStart) + transitionReplacement + patched.slice(subdivisionStart);

  const generationStart = patched.indexOf('function generateSourceRemesh(');
  const candidatesStart = patched.indexOf('function gradedCandidates(', generationStart);
  assert.ok(generationStart >= 0 && candidatesStart > generationStart, 'continuous generation anchors missing');
  const generationReplacement = String.raw`function generateSourceRemesh(geometryValue, targets, transition, meshProfile, elementFamily, policy) {
  const adapter = buildLafeaMeshTopology(geometryValue);
  const boundaryBase = triangulateRefinedRegionAsIndexTriples(
    adapter.topology, LAFEA_MESH_TOPOLOGY_REGION_ID,
    {
      targetSize: transition.globalTarget,
      chordErrorLimit: Math.max(1e-9, transition.globalTarget * 1e-6),
      adjacentSizeRatioMax: transition.adjacentRatio,
    },
  );
  const seed = triangulateRegionAsIndexTriples(boundaryBase.ringCorners);
  const points = seed.points.map((point) => ({ x: point.x, y: point.y }));
  let triangles = seed.triangleTriples.map((row) => [...row]);
  const constraints = new Set(seed.boundaryEdgeKeys);
  const fixed = new Set(points.map((_, index) => index));
  let insertedPointCount = 0;
  const maximumInsertions = 2000;
  for (; insertedPointCount < maximumInsertions; insertedPointCount += 1) {
    const worst = worstContinuousSizeViolation(points, triangles, targets, transition);
    if (!worst || worst.oversizeRatio <= 1 + 1e-12) break;
    if (!insertInteriorPoint(points, triangles, constraints, worst.centroid)) {
      throw new Error('PR1270_CONTINUOUS_CENTROID_INSERTION_FAILED');
    }
    triangles = lawsonFlip(points, triangles, constraints);
  }
  if (insertedPointCount >= maximumInsertions) {
    throw new Error('PR1270_CONTINUOUS_REFINEMENT_INSERTION_LIMIT');
  }
  triangles = lawsonFlip(points, triangles, constraints);
  for (let round = 0; round < policy.smoothingRounds; round += 1) {
    const working = triangles.map((row) => [...row]);
    smoothInteriorPoints(points, working, fixed);
    triangles = lawsonFlip(points, working, constraints);
  }
  const coreElements = elementFamily === 'T6'
    ? upgradeToT6(points, boundaryBase.ringCorners, triangles, boundaryBase.edgesByCornerPair)
    : triangles.map((triple, elementIndex) => Object.freeze({
      elementIndex, elementType: 'T3',
      nodes: Object.freeze(triple.map((index) => ({ x: points[index].x, y: points[index].y }))),
    }));
  return Object.freeze({ mesh: weld(coreElements, elementFamily), insertedPointCount });
}

function worstContinuousSizeViolation(points, triangles, targets, transition) {
  let worst = null;
  for (let triangleIndex = 0; triangleIndex < triangles.length; triangleIndex += 1) {
    const triangle = triangles[triangleIndex];
    const a = points[triangle[0]]; const b = points[triangle[1]]; const c = points[triangle[2]];
    const centroid = { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 };
    const distance = Math.min(...targets.map((target) => Math.hypot(centroid.x - target.x, centroid.y - target.y)));
    const desired = sizeAtDistance(distance, transition);
    const longest = Math.max(
      Math.hypot(b.x - a.x, b.y - a.y),
      Math.hypot(c.x - b.x, c.y - b.y),
      Math.hypot(a.x - c.x, a.y - c.y),
    );
    const oversizeRatio = longest / desired;
    const row = { triangleIndex, centroid, desired, longest, oversizeRatio };
    if (!worst || oversizeRatio > worst.oversizeRatio + 1e-12
      || (Math.abs(oversizeRatio - worst.oversizeRatio) <= 1e-12 && triangleIndex < worst.triangleIndex)) {
      worst = row;
    }
  }
  return worst;
}

`;
  patched = patched.slice(0, generationStart) + generationReplacement + patched.slice(candidatesStart);
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
      "  replayEqual, replayInsertionCountEqual,\n  fieldSlope: transition.fieldSlope, fieldFormula: transition.fieldFormula,\n  qualityWorstStatus: quality.worstStatus,",
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
  const caseId = `LIPSCHITZ_T3_H${String(localTarget).replace('.', '_')}_${scenario.name}`;
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
    fieldSlope: parsed?.fieldSlope ?? null,
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
    error: text.match(/(?:TypeError|Error|AssertionError)[^:]*:\s*([^\n]+)/u)?.[1]?.trim() ?? null,
  };
}

function maxFinite(values) { const rows = values.filter(Number.isFinite); return rows.length ? Math.max(...rows) : null; }
function minFinite(values) { const rows = values.filter(Number.isFinite); return rows.length ? Math.min(...rows) : null; }
