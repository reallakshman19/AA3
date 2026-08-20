#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const casePath = 'scripts/lafea-pr1270-source-remesh-case.mjs';
const originalCaseSource = fs.readFileSync(casePath, 'utf8');
const observedCaseSource = makeGovernedFlipCandidate(makeObservationFirst(originalCaseSource));
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
  candidate: 'SOURCE_OWNED_REMESH_PLUS_GOVERNED_EDGE_FLIPS_V1',
  caseCount: rows.length, passCount: passes.length, failCount: failures.length,
  worstObserved: observed.length ? Math.max(...observed) : null,
  worstPassingMaximumObserved: passes.length ? Math.max(...passes.map((row) => row.maximumObserved)) : null,
  minimumPassingAdjacencyMargin: passes.length ? 1.5 - Math.max(...passes.map((row) => row.maximumObserved)) : null,
  minimumLocalCornerGain: passes.length ? Math.min(...passes.map((row) => row.localCornerGain)) : null,
  maximumBoundarySegments: rows.length ? Math.max(...rows.map((row) => row.subdividedBoundarySegmentCount ?? 0)) : null,
  maximumAcceptedFlipCount: rows.length ? Math.max(...rows.map((row) => row.acceptedFlipCount ?? 0)) : null,
  replayFailureCaseIds: rows.filter((row) => row.replayEqual === false || row.replayInsertionCountEqual === false).map((row) => row.caseId),
  adjacencyFailureCaseIds: rows.filter((row) => row.maximumObserved > 1.5 || row.violatingAdjacencyCount > 0).map((row) => row.caseId),
  qualityBlockCaseIds: rows.filter((row) => row.qualityWorstStatus === 'BLOCK').map((row) => row.caseId),
  optimizerStalledCaseIds: rows.filter((row) => row.optimizerQualification === 'STALLED').map((row) => row.caseId),
  failureCaseIds: failures.map((row) => row.caseId), rows,
})}`);
assert.equal(failures.length, 0, `governed-edge-flip candidate failed ${failures.length}/${rows.length} cases`);

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

function makeGovernedFlipCandidate(source) {
  const callAnchor = "  const coreElements = elementFamily === 'T6'\n";
  assert.ok(source.includes(callAnchor), 'governed-flip call anchor missing');
  let patched = source.replace(callAnchor, `  const governedOptimization = optimizeAdjacencyByGovernedEdgeFlips({\n    points, triangles, constrainedEdgeKeys: constraints,\n    maximumAdjacentRatio: transition.adjacentRatio,\n  });\n  triangles = governedOptimization.triangles;\n  console.error('PR1270_GOVERNED_FLIPS=' + JSON.stringify({\n    qualification: governedOptimization.qualification,\n    acceptedFlipCount: governedOptimization.acceptedFlipCount,\n    attemptedFlipCount: governedOptimization.attemptedFlipCount,\n    initialMaximumObserved: governedOptimization.initial.maximumObserved,\n    initialViolatingAdjacencyCount: governedOptimization.initial.violatingAdjacencyCount,\n    finalMaximumObserved: governedOptimization.final.maximumObserved,\n    finalViolatingAdjacencyCount: governedOptimization.final.violatingAdjacencyCount,\n    finalViolationExcessSum: governedOptimization.final.violationExcessSum,\n  }));\n\n${callAnchor}`);
  patched += String.raw`

function optimizeAdjacencyByGovernedEdgeFlips({
  points,
  triangles,
  constrainedEdgeKeys,
  maximumAdjacentRatio,
  maximumAcceptedFlips = Math.max(64, triangles.length * 8),
}) {
  let working = triangles.map((triangle) => [...triangle]);
  const initial = rawAdjacencyObjective(points, working, maximumAdjacentRatio);
  let current = initial;
  let acceptedFlipCount = 0;
  let attemptedFlipCount = 0;

  while (current.qualification !== 'PASS' && acceptedFlipCount < maximumAcceptedFlips) {
    let improved = false;
    for (const violation of current.violations) {
      if (constrainedEdgeKeys.has(violation.sharedEdgeKey)) continue;
      const trial = trialGovernedEdgeFlip(points, working, violation, constrainedEdgeKeys);
      if (!trial) continue;
      attemptedFlipCount += 1;
      const candidate = rawAdjacencyObjective(points, trial, maximumAdjacentRatio);
      if (!rawAdjacencyObjectiveImproves(candidate, current)) continue;
      working = trial;
      current = candidate;
      acceptedFlipCount += 1;
      improved = true;
      break;
    }
    if (!improved) break;
  }

  const final = rawAdjacencyObjective(points, working, maximumAdjacentRatio);
  return {
    triangles: working,
    initial,
    final,
    acceptedFlipCount,
    attemptedFlipCount,
    qualification: final.qualification === 'PASS' ? 'PASS' : 'STALLED',
  };
}

function rawAdjacencyObjective(points, triangles, maximumAdjacentRatio) {
  const characteristicLengths = triangles.map((triangle) => rawTriangleCharacteristicLength(points, triangle));
  const owners = new Map();
  triangles.forEach((triangle, triangleIndex) => {
    for (let edge = 0; edge < 3; edge += 1) {
      const key = edgeKey(triangle[edge], triangle[(edge + 1) % 3]);
      const rows = owners.get(key) ?? [];
      rows.push(triangleIndex);
      owners.set(key, rows);
    }
  });
  let maximumObserved = 1;
  let adjacentEdgeCount = 0;
  let violationExcessSum = 0;
  let nonManifoldEdgeCount = 0;
  const violations = [];
  for (const [sharedEdgeKey, edgeOwners] of owners) {
    if (edgeOwners.length > 2) {
      nonManifoldEdgeCount += 1;
      continue;
    }
    if (edgeOwners.length !== 2) continue;
    adjacentEdgeCount += 1;
    const [left, right] = edgeOwners;
    const leftLength = characteristicLengths[left];
    const rightLength = characteristicLengths[right];
    const minimum = Math.min(leftLength, rightLength);
    const maximum = Math.max(leftLength, rightLength);
    const ratio = maximum / minimum;
    maximumObserved = Math.max(maximumObserved, ratio);
    if (ratio <= maximumAdjacentRatio + 1e-12) continue;
    violationExcessSum += ratio - maximumAdjacentRatio;
    violations.push({
      sharedEdgeKey,
      ownerTriangleIndices: [left, right],
      ratio,
      minimumCharacteristicLength: minimum,
      maximumCharacteristicLength: maximum,
    });
  }
  violations.sort((a, b) => b.ratio - a.ratio
    || a.sharedEdgeKey.localeCompare(b.sharedEdgeKey)
    || a.ownerTriangleIndices[0] - b.ownerTriangleIndices[0]);
  return {
    maximumAllowed: maximumAdjacentRatio,
    maximumObserved,
    adjacentEdgeCount,
    violatingAdjacencyCount: violations.length,
    violationExcessSum,
    nonManifoldEdgeCount,
    violations,
    qualification: nonManifoldEdgeCount === 0 && violations.length === 0 ? 'PASS' : 'BLOCK',
  };
}

function trialGovernedEdgeFlip(points, triangles, violation, constrainedEdgeKeys) {
  const [leftIndex, rightIndex] = violation.ownerTriangleIndices;
  const left = triangles[leftIndex];
  const right = triangles[rightIndex];
  if (!left || !right) return null;
  const [a, b] = violation.sharedEdgeKey.split(':').map(Number);
  if (!left.includes(a) || !left.includes(b) || !right.includes(a) || !right.includes(b)) return null;
  const oppositeLeft = left.find((index) => index !== a && index !== b);
  const oppositeRight = right.find((index) => index !== a && index !== b);
  if (!Number.isInteger(oppositeLeft) || !Number.isInteger(oppositeRight) || oppositeLeft === oppositeRight) return null;
  const newEdgeKey = edgeKey(oppositeLeft, oppositeRight);
  if (constrainedEdgeKeys.has(newEdgeKey)) return null;
  if (rawEdgeAlreadyOwnedOutsidePair(triangles, oppositeLeft, oppositeRight, leftIndex, rightIndex)) return null;
  if (!rawConvexFlipGeometry(points, a, b, oppositeLeft, oppositeRight)) return null;

  const first = rawPositiveTriangle(points, [oppositeLeft, oppositeRight, a]);
  const second = rawPositiveTriangle(points, [oppositeRight, oppositeLeft, b]);
  if (!first || !second) return null;
  const trial = triangles.map((triangle) => [...triangle]);
  trial[leftIndex] = first;
  trial[rightIndex] = second;
  return trial;
}

function rawAdjacencyObjectiveImproves(candidate, current) {
  if (candidate.nonManifoldEdgeCount !== 0) return false;
  const scale = Math.max(1, candidate.maximumObserved, current.maximumObserved);
  const tolerance = 1e-12 * scale;
  if (candidate.maximumObserved < current.maximumObserved - tolerance) return true;
  if (candidate.maximumObserved > current.maximumObserved + tolerance) return false;
  if (candidate.violatingAdjacencyCount < current.violatingAdjacencyCount) return true;
  if (candidate.violatingAdjacencyCount > current.violatingAdjacencyCount) return false;
  return candidate.violationExcessSum < current.violationExcessSum - tolerance;
}

function rawConvexFlipGeometry(points, a, b, oppositeLeft, oppositeRight) {
  const oldSideLeft = rawOrient(points[a], points[b], points[oppositeLeft]);
  const oldSideRight = rawOrient(points[a], points[b], points[oppositeRight]);
  const newSideA = rawOrient(points[oppositeLeft], points[oppositeRight], points[a]);
  const newSideB = rawOrient(points[oppositeLeft], points[oppositeRight], points[b]);
  const scale = Math.max(
    1,
    rawDistance(points[a], points[b]) ** 2,
    rawDistance(points[oppositeLeft], points[oppositeRight]) ** 2,
  );
  const tolerance = 1e-12 * scale;
  return oldSideLeft * oldSideRight < -tolerance * tolerance
    && newSideA * newSideB < -tolerance * tolerance;
}

function rawPositiveTriangle(points, triangle) {
  const orientation = rawOrient(points[triangle[0]], points[triangle[1]], points[triangle[2]]);
  const scale = Math.max(
    1,
    rawDistance(points[triangle[0]], points[triangle[1]]) ** 2,
    rawDistance(points[triangle[1]], points[triangle[2]]) ** 2,
    rawDistance(points[triangle[2]], points[triangle[0]]) ** 2,
  );
  if (Math.abs(orientation) <= 1e-12 * scale) return null;
  return orientation > 0 ? triangle : [triangle[0], triangle[2], triangle[1]];
}

function rawEdgeAlreadyOwnedOutsidePair(triangles, a, b, leftIndex, rightIndex) {
  const key = edgeKey(a, b);
  for (let triangleIndex = 0; triangleIndex < triangles.length; triangleIndex += 1) {
    if (triangleIndex === leftIndex || triangleIndex === rightIndex) continue;
    const triangle = triangles[triangleIndex];
    for (let edge = 0; edge < 3; edge += 1) {
      if (edgeKey(triangle[edge], triangle[(edge + 1) % 3]) === key) return true;
    }
  }
  return false;
}

function rawTriangleCharacteristicLength(points, triangle) {
  return Math.max(
    rawDistance(points[triangle[0]], points[triangle[1]]),
    rawDistance(points[triangle[1]], points[triangle[2]]),
    rawDistance(points[triangle[2]], points[triangle[0]]),
  );
}
function rawDistance(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }
function rawOrient(a, b, c) { return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x); }
`;
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
  const optimizerMatches = [...text.matchAll(/PR1270_GOVERNED_FLIPS=(\{[^\n]+\})/gu)];
  const optimizer = optimizerMatches.length ? JSON.parse(optimizerMatches[0][1]) : null;
  const error = text.match(/(?:TypeError|Error|AssertionError)[^:]*:\s*([^\n]+)/u)?.[1]?.trim() ?? null;
  return {
    caseId, family, localTarget, ratio: localTarget / 30, scenario: scenario.name,
    exitCode: run.status, qualification: parsed?.qualification ?? 'NOT_REACHED',
    replayEqual: parsed?.replayEqual ?? null,
    replayInsertionCountEqual: parsed?.replayInsertionCountEqual ?? null,
    maximumObserved: parsed?.maximumObserved ?? optimizer?.finalMaximumObserved ?? null,
    violatingAdjacencyCount: parsed?.violatingAdjacencyCount ?? optimizer?.finalViolatingAdjacencyCount ?? null,
    optimizerQualification: optimizer?.qualification ?? null,
    acceptedFlipCount: optimizer?.acceptedFlipCount ?? null,
    attemptedFlipCount: optimizer?.attemptedFlipCount ?? null,
    initialOptimizerMaximumObserved: optimizer?.initialMaximumObserved ?? null,
    initialOptimizerViolatingAdjacencyCount: optimizer?.initialViolatingAdjacencyCount ?? null,
    finalViolationExcessSum: optimizer?.finalViolationExcessSum ?? null,
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
