#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const casePath = 'scripts/lafea-pr1270-source-remesh-case.mjs';
const original = fs.readFileSync(casePath, 'utf8');
const candidate = makeBisectionCandidate(makeObservationFirst(original));
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
  check: 'PR1270_LIPSCHITZ_LONGEST_EDGE_BISECTION_REDUCED_V1',
  architecture: 'CONTINUOUS_SIZE_FIELD_PLUS_CONFORMING_LONGEST_EDGE_BISECTION_NO_FLIP_NO_SMOOTH',
  sizeField: 'H(D)=MIN(H_GLOBAL,H_LOCAL+(1-1/G_MAX)*D)',
  family, globalTarget, acceptanceGrowth,
  fieldSlope: 1 - 1 / acceptanceGrowth,
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
  qualification: failures.length ? 'BLOCK' : 'PASS', rows,
};
fs.mkdirSync('test-results', { recursive: true });
fs.writeFileSync('test-results/pr1270-lipschitz-bisection-matrix.json', `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`PR1270_LIPSCHITZ_BISECTION_MATRIX=${JSON.stringify(receipt)}`);
assert.equal(failures.length, 0, `Lipschitz longest-edge bisection failed ${failures.length}/${rows.length} reduced cases`);

function makeBisectionCandidate(source) {
  const importFrom = "import { lawsonFlip, upgradeToT6, edgeKey } from '../src/core/lafea-meshing/constrained-delaunay-t6.js';";
  const importTo = "import { lawsonFlip, upgradeToT6, edgeKey, triangulateRegionAsIndexTriples } from '../src/core/lafea-meshing/constrained-delaunay-t6.js';";
  assert.ok(source.includes(importFrom), 'bisection import anchor missing');
  let patched = source.replace(importFrom, importTo);

  const transitionStart = patched.indexOf('function buildTransition(');
  const subdivisionStart = patched.indexOf('function subdivideLineGeometryForSizeField(', transitionStart);
  assert.ok(transitionStart >= 0 && subdivisionStart > transitionStart, 'bisection transition anchors missing');
  const transitionReplacement = String.raw`function buildTransition(local, global, adjacentRatio, minimumElements) {
  void minimumElements;
  const fieldSlope = 1 - 1 / adjacentRatio;
  const influenceRadius = (global - local) / fieldSlope;
  return Object.freeze({
    localTarget: local, globalTarget: global,
    levels: Object.freeze([local, global]), bands: Object.freeze([]),
    influenceRadius, adjacentRatio, fieldSlope,
    fieldFormula: 'H(D)=MIN(H_GLOBAL,H_LOCAL+(1-1/G_MAX)*D)',
  });
}
function sizeAtDistance(distance, transition) {
  return Math.min(transition.globalTarget,
    transition.localTarget + transition.fieldSlope * Math.max(0, distance));
}

`;
  patched = patched.slice(0, transitionStart) + transitionReplacement + patched.slice(subdivisionStart);

  const generationStart = patched.indexOf('function generateSourceRemesh(');
  const candidatesStart = patched.indexOf('function gradedCandidates(', generationStart);
  assert.ok(generationStart >= 0 && candidatesStart > generationStart, 'bisection generation anchors missing');
  const generationReplacement = String.raw`function generateSourceRemesh(geometryValue, targets, transition, meshProfile, elementFamily, policy) {
  void meshProfile; void policy;
  if (elementFamily !== 'T3') throw new Error('PR1270_BISECTION_T3_DIAGNOSTIC_ONLY');
  const adapter = buildLafeaMeshTopology(geometryValue);
  const boundaryBase = triangulateRefinedRegionAsIndexTriples(
    adapter.topology, LAFEA_MESH_TOPOLOGY_REGION_ID,
    { targetSize: transition.globalTarget,
      chordErrorLimit: Math.max(1e-9, transition.globalTarget * 1e-6),
      adjacentSizeRatioMax: transition.adjacentRatio },
  );
  const seed = triangulateRegionAsIndexTriples(boundaryBase.ringCorners);
  const points = seed.points.map((point) => ({ x: point.x, y: point.y }));
  const triangles = seed.triangleTriples.map((row) => [...row]);
  const constraints = new Set(seed.boundaryEdgeKeys);
  let insertedPointCount = 0;
  const maximumSizeInsertions = 4000;
  for (let step = 0; step < maximumSizeInsertions; step += 1) {
    const worst = worstBisectionSizeViolation(points, triangles, targets, transition);
    if (!worst || worst.oversizeRatio <= 1 + 1e-12) break;
    bisectGovernedEdge(points, triangles, constraints, worst.longestEdge);
    insertedPointCount += 1;
    if (step === maximumSizeInsertions - 1) throw new Error('PR1270_BISECTION_SIZE_INSERTION_LIMIT');
  }
  const maximumClosureInsertions = 4000;
  for (let step = 0; step < maximumClosureInsertions; step += 1) {
    const worst = worstRawAdjacency(points, triangles, transition.adjacentRatio);
    if (!worst) break;
    bisectGovernedEdge(points, triangles, constraints, worst.largerLongestEdge);
    insertedPointCount += 1;
    if (step === maximumClosureInsertions - 1) throw new Error('PR1270_BISECTION_ADJACENCY_CLOSURE_LIMIT');
  }
  const coreElements = triangles.map((triple, elementIndex) => Object.freeze({
    elementIndex, elementType: 'T3',
    nodes: Object.freeze(triple.map((index) => ({ x: points[index].x, y: points[index].y }))),
  }));
  return Object.freeze({ mesh: weld(coreElements, elementFamily), insertedPointCount });
}

function worstBisectionSizeViolation(points, triangles, targets, transition) {
  let worst = null;
  for (let triangleIndex = 0; triangleIndex < triangles.length; triangleIndex += 1) {
    const triangle = triangles[triangleIndex];
    const a = points[triangle[0]], b = points[triangle[1]], c = points[triangle[2]];
    const centroid = { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 };
    const distance = Math.min(...targets.map((target) => Math.hypot(centroid.x - target.x, centroid.y - target.y)));
    const desired = sizeAtDistance(distance, transition);
    const edges = [
      { a: triangle[0], b: triangle[1], length: Math.hypot(b.x - a.x, b.y - a.y) },
      { a: triangle[1], b: triangle[2], length: Math.hypot(c.x - b.x, c.y - b.y) },
      { a: triangle[2], b: triangle[0], length: Math.hypot(a.x - c.x, a.y - c.y) },
    ].sort((left, right) => right.length - left.length || edgeKey(left.a, left.b).localeCompare(edgeKey(right.a, right.b)));
    const row = { triangleIndex, oversizeRatio: edges[0].length / desired, longestEdge: [edges[0].a, edges[0].b] };
    if (!worst || row.oversizeRatio > worst.oversizeRatio + 1e-12
      || (Math.abs(row.oversizeRatio - worst.oversizeRatio) <= 1e-12 && triangleIndex < worst.triangleIndex)) worst = row;
  }
  return worst;
}

function worstRawAdjacency(points, triangles, maximumAllowed) {
  const lengths = triangles.map((triangle) => triangleLongest(points, triangle));
  const owners = new Map();
  triangles.forEach((triangle, triangleIndex) => {
    for (let edge = 0; edge < 3; edge += 1) {
      const key = edgeKey(triangle[edge], triangle[(edge + 1) % 3]);
      const rows = owners.get(key) ?? []; rows.push(triangleIndex); owners.set(key, rows);
    }
  });
  let worst = null;
  for (const [sharedEdgeKey, edgeOwners] of owners) {
    if (edgeOwners.length !== 2) continue;
    const [left, right] = edgeOwners;
    const minimum = Math.min(lengths[left], lengths[right]);
    const maximum = Math.max(lengths[left], lengths[right]);
    const ratio = maximum / minimum;
    if (ratio <= maximumAllowed + 1e-12) continue;
    const larger = lengths[left] >= lengths[right] ? left : right;
    const largerLongestEdge = triangleLongestEdge(points, triangles[larger]);
    const row = { ratio, sharedEdgeKey, largerTriangleIndex: larger, largerLongestEdge };
    if (!worst || row.ratio > worst.ratio + 1e-12
      || (Math.abs(row.ratio - worst.ratio) <= 1e-12 && sharedEdgeKey.localeCompare(worst.sharedEdgeKey) < 0)) worst = row;
  }
  return worst;
}

function bisectGovernedEdge(points, triangles, constraints, pair) {
  const [a, b] = pair;
  const key = edgeKey(a, b);
  const owners = [];
  for (let index = 0; index < triangles.length; index += 1) {
    const triangle = triangles[index];
    if (triangle.includes(a) && triangle.includes(b)) owners.push(index);
  }
  if (constraints.has(key)) {
    if (owners.length !== 1) throw new Error('PR1270_BISECTION_BOUNDARY_OWNER_INVALID');
    const midpointIndex = points.length;
    points.push({ x: (points[a].x + points[b].x) / 2, y: (points[a].y + points[b].y) / 2 });
    const ownerIndex = owners[0];
    const triangle = triangles[ownerIndex];
    const opposite = triangle.find((index) => index !== a && index !== b);
    const first = positiveTriangle(points, [a, midpointIndex, opposite]);
    const second = positiveTriangle(points, [midpointIndex, b, opposite]);
    triangles[ownerIndex] = first;
    triangles.push(second);
    constraints.delete(key);
    constraints.add(edgeKey(a, midpointIndex));
    constraints.add(edgeKey(midpointIndex, b));
    return;
  }
  if (owners.length !== 2) throw new Error('PR1270_BISECTION_INTERIOR_OWNER_INVALID');
  const midpoint = { x: (points[a].x + points[b].x) / 2, y: (points[a].y + points[b].y) / 2 };
  if (!insertInteriorPoint(points, triangles, constraints, midpoint)) {
    throw new Error('PR1270_BISECTION_INTERIOR_INSERT_FAILED');
  }
}

function positiveTriangle(points, triangle) {
  const [a, b, c] = triangle.map((index) => points[index]);
  const orientation = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  if (Math.abs(orientation) <= 1e-14) throw new Error('PR1270_BISECTION_DEGENERATE_TRIANGLE');
  return orientation > 0 ? triangle : [triangle[0], triangle[2], triangle[1]];
}
function triangleLongest(points, triangle) {
  return Math.max(...triangle.map((index, edge) => {
    const next = triangle[(edge + 1) % 3];
    return Math.hypot(points[next].x - points[index].x, points[next].y - points[index].y);
  }));
}
function triangleLongestEdge(points, triangle) {
  return triangle.map((index, edge) => {
    const next = triangle[(edge + 1) % 3];
    return { pair: [index, next], length: Math.hypot(points[next].x - points[index].x, points[next].y - points[index].y) };
  }).sort((left, right) => right.length - left.length || edgeKey(left.pair[0], left.pair[1]).localeCompare(edgeKey(right.pair[0], right.pair[1])))[0].pair;
}

`;
  patched = patched.slice(0, generationStart) + generationReplacement + patched.slice(candidatesStart);
  return patched;
}

function makeObservationFirst(source) {
  const replacements = [
    ["assert.equal(JSON.stringify(second.mesh), JSON.stringify(first.mesh), 'source remesh replay must be byte-identical');\nassert.equal(second.insertedPointCount, first.insertedPointCount);",
      "const replayEqual = JSON.stringify(second.mesh) === JSON.stringify(first.mesh);\nconst replayInsertionCountEqual = second.insertedPointCount === first.insertedPointCount;"],
    ["assert.notEqual(quality.worstStatus, 'BLOCK');\nassert.equal(adjacency.qualification, 'PASS');\nassert.equal(adjacency.violatingAdjacencyCount, 0);\nassert.ok(first.insertedPointCount > 0, 'graded source remesh inserted no interior points');\nassert.ok(childLocalCorners > parentLocalCorners,\n  `local corner density did not increase: ${parentLocalCorners} -> ${childLocalCorners}`);\nassert.equal(boundary.offGeometryCornerCount, 0);\nassert.equal(boundary.offGeometryMidsideCount, 0);\nassert.equal(boundary.nonManifoldBoundaryOwnerCount, 0);",
      "const acceptancePass = replayEqual && replayInsertionCountEqual\n  && quality.worstStatus !== 'BLOCK' && adjacency.qualification === 'PASS'\n  && adjacency.violatingAdjacencyCount === 0 && first.insertedPointCount > 0\n  && childLocalCorners > parentLocalCorners && boundary.offGeometryCornerCount === 0\n  && boundary.offGeometryMidsideCount === 0 && boundary.nonManifoldBoundaryOwnerCount === 0;"],
    ["  qualityWorstStatus: quality.worstStatus,",
      "  replayEqual, replayInsertionCountEqual,\n  fieldSlope: transition.fieldSlope, fieldFormula: transition.fieldFormula,\n  qualityWorstStatus: quality.worstStatus,"],
    ["  violatingAdjacencyCount: adjacency.violatingAdjacencyCount,\n  boundary,\n  qualification: 'PASS',",
      "  violatingAdjacencyCount: adjacency.violatingAdjacencyCount,\n  boundary,\n  qualification: acceptancePass ? 'PASS' : 'BLOCK',"],
  ];
  let patched = source;
  for (const [from, to] of replacements) {
    assert.ok(patched.includes(from), `observation patch anchor missing: ${from.slice(0, 48)}`);
    patched = patched.replace(from, to);
  }
  return patched;
}

function runCase(localTarget, scenario) {
  const caseId = `BISECT_T3_H${String(localTarget).replace('.', '_')}_${scenario.name}`;
  const run = spawnSync(process.execPath, [casePath], { encoding: 'utf8', env: {
    ...process.env, PR1270_CASE_ID: caseId, PR1270_FAMILY: family,
    PR1270_HGLOBAL: String(globalTarget), PR1270_HLOCAL: String(localTarget),
    PR1270_WIDTH: String(scenario.width), PR1270_HEIGHT: String(scenario.height),
    PR1270_XF: String(scenario.xf), PR1270_YF: String(scenario.yf),
  }});
  const text = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
  const match = text.match(/PR1270_SOURCE_REMESH_CASE=(\{[^\n]+\})/u);
  const p = match ? JSON.parse(match[1]) : null;
  return { caseId, localTarget, targetRatio: localTarget / globalTarget, scenario: scenario.name,
    exitCode: run.status, qualification: p?.qualification ?? 'NOT_REACHED', replayEqual: p?.replayEqual ?? null,
    replayInsertionCountEqual: p?.replayInsertionCountEqual ?? null, fieldSlope: p?.fieldSlope ?? null,
    influenceRadius: p?.influenceRadius ?? null, maximumObserved: p?.maximumObserved ?? null,
    violatingAdjacencyCount: p?.violatingAdjacencyCount ?? null, qualityWorstStatus: p?.qualityWorstStatus ?? null,
    qualityBlockingElementCount: p?.qualityBlockingElementCount ?? null, qualityWarningElementCount: p?.qualityWarningElementCount ?? null,
    localCornerGain: p?.localCornerGain ?? null, insertedPointCount: p?.insertedPointCount ?? null,
    parentNodes: p?.parentNodes ?? null, childNodes: p?.childNodes ?? null,
    parentElements: p?.parentElements ?? null, childElements: p?.childElements ?? null,
    subdividedBoundarySegmentCount: p?.subdividedBoundarySegmentCount ?? null, localStats: p?.localStats ?? null,
    boundary: p?.boundary ?? null,
    error: text.match(/(?:TypeError|Error|AssertionError)[^:]*:\s*([^\n]+)/u)?.[1]?.trim() ?? null };
}
function maxFinite(values) { const rows = values.filter(Number.isFinite); return rows.length ? Math.max(...rows) : null; }
function minFinite(values) { const rows = values.filter(Number.isFinite); return rows.length ? Math.min(...rows) : null; }
